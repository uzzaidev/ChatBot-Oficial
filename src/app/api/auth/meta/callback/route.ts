/**
 * Meta OAuth - Callback Endpoint
 *
 * Receives authorization code from Meta → exchanges for token →
 * fetches WABA details → creates client → redirects to onboarding
 */

import {
  exchangeCodeForToken,
  fetchMetaUserId,
  fetchWABADetails,
  registerPhoneNumber,
  subscribeAppToWABA,
} from "@/lib/meta-oauth";
import { createServerClient } from "@/lib/supabase-server";
import { createOrUpdateSecret, generateSecureToken } from "@/lib/vault";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_SYSTEM_PROMPT = `Você é um assistente virtual inteligente integrado ao WhatsApp Business.

Seu objetivo é ajudar os clientes de forma eficiente, amigável e profissional.

Diretrizes:
- Seja sempre cortês e prestativo
- Responda de forma clara e objetiva
- Se não souber algo, seja honesto
- Use emojis moderadamente para tornar a conversa mais amigável
- Mantenha o tom profissional mas acolhedor

Lembre-se: você está representando uma empresa, então mantenha sempre a qualidade do atendimento.`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorReason = searchParams.get("error_reason");
    const errorDescription = searchParams.get("error_description");

    // 1. Handle OAuth errors
    if (error) {
      console.error("[Meta OAuth Callback] OAuth error:", {
        error,
        reason: errorReason,
        description: errorDescription,
      });

      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_URL}/onboarding?error=oauth_failed&reason=${error}`,
      );
    }

    // 2. Validate required parameters
    if (!code || !state) {
      console.error("[Meta OAuth Callback] Missing code or state");
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_URL}/onboarding?error=invalid_callback`,
      );
    }

    // 3. Validate CSRF token
    const cookieStore = await cookies();
    const storedState = cookieStore.get("meta_oauth_state")?.value;

    if (!storedState || storedState !== state) {
      console.error("[Meta OAuth Callback] Invalid state (CSRF protection)");
      console.error("  Stored:", storedState?.substring(0, 20));
      console.error("  Received:", state.substring(0, 20));
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_URL}/onboarding?error=csrf_failed`,
      );
    }

    // 4. Clear state cookie and read client_id + migration mode
    cookieStore.delete("meta_oauth_state");
    const existingClientId = cookieStore.get("meta_oauth_client_id")?.value;
    cookieStore.delete("meta_oauth_client_id");
    const isMigration =
      cookieStore.get("meta_oauth_migration")?.value === "true";
    cookieStore.delete("meta_oauth_migration");

    console.log(
      "[Meta OAuth Callback] ✅ State validated, exchanging code for token",
    );

    // 5. Exchange code for access token (server-side redirect flow needs redirect_uri)
    const baseUrl = process.env.NEXT_PUBLIC_URL || "https://uzzapp.uzzai.com.br";
    const accessToken = await exchangeCodeForToken(code, `${baseUrl}/api/auth/meta/callback`);

    console.log(
      "[Meta OAuth Callback] ✅ Token received, fetching WABA details",
    );

    // 5b. Fetch Meta user ID (for deauth handler later)
    const metaUserId = await fetchMetaUserId(accessToken);
    console.log("[Meta OAuth Callback] Meta user ID:", metaUserId);

    // 6. Fetch WABA details
    const { wabaId, phoneNumberId, displayPhone, businessId } =
      await fetchWABADetails(accessToken);

    console.log("[Meta OAuth Callback] ✅ WABA details:", {
      wabaId,
      phoneNumberId,
      displayPhone,
      businessId,
    });

    // 7. Check if WABA already exists (on a different client)
    const supabase = await createServerClient();

    const { data: wabaClient } = await supabase
      .from("clients")
      .select("id, name")
      .eq("meta_waba_id", wabaId)
      .single();

    if (wabaClient && wabaClient.id !== existingClientId) {
      console.warn(
        "[Meta OAuth Callback] WABA already connected to another client:",
        wabaId,
      );
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_URL}/onboarding?error=waba_already_connected&client=${wabaClient.name}`,
      );
    }

    console.log("[Meta OAuth Callback] ✅ WABA is new, configuring client");

    // 8. Store Meta access token in Vault (upsert to handle retries)
    const metaTokenSecretId = await createOrUpdateSecret(
      accessToken,
      `meta_token_${wabaId}`,
      `Meta access token from OAuth (WABA: ${wabaId})`,
    );

    // 8b. Create/update verify token in Vault (needed for getClientSecrets)
    const verifyToken = generateSecureToken();
    const verifyTokenSecretId = await createOrUpdateSecret(
      verifyToken,
      `meta_verify_${wabaId}`,
      `Meta verify token (WABA: ${wabaId})`,
    );

    let client: { id: string };

    if (existingClientId) {
      // 9a. Update existing client (created during registration or migration)
      console.log(
        `[Meta OAuth Callback] Updating existing client: ${existingClientId} (migration: ${isMigration})`,
      );

      const { data: updated, error: updateError } = await supabase
        .from("clients")
        .update({
          status: "active",
          meta_waba_id: wabaId,
          meta_phone_number_id: phoneNumberId,
          meta_display_phone: displayPhone,
          meta_access_token_secret_id: metaTokenSecretId,
          meta_verify_token_secret_id: verifyTokenSecretId,
          meta_user_id: metaUserId,
          webhook_routing_mode: "waba",
          auto_provisioned: true,
          provisioned_at: new Date().toISOString(),
        })
        .eq("id", existingClientId)
        .select("id")
        .single();

      if (updateError || !updated) {
        console.error(
          "[Meta OAuth Callback] Failed to update client:",
          updateError,
        );
        throw updateError ?? new Error("Client not found");
      }

      client = updated;
      console.log("[Meta OAuth Callback] ✅ Client updated:", client.id);
    } else {
      // 9b. Create new client (standalone OAuth flow without prior registration)
      const openaiKeySecretId = await createOrUpdateSecret(
        "CONFIGURE_IN_SETTINGS",
        `openai_${wabaId}`,
        "Placeholder - configure in dashboard",
      );

      const groqKeySecretId = await createOrUpdateSecret(
        "CONFIGURE_IN_SETTINGS",
        `groq_${wabaId}`,
        "Placeholder - configure in dashboard",
      );

      const { data: created, error: createError } = await supabase
        .from("clients")
        .insert({
          name: `WhatsApp (${displayPhone})`,
          slug: `wa-${wabaId.slice(-6)}-${Date.now()}`,
          status: "active",
          plan: "free",
          plan_name: "free",
          plan_status: "free",
          meta_waba_id: wabaId,
          meta_phone_number_id: phoneNumberId,
          meta_display_phone: displayPhone,
          meta_access_token_secret_id: metaTokenSecretId,
          openai_api_key_secret_id: openaiKeySecretId,
          groq_api_key_secret_id: groqKeySecretId,
          primary_model_provider: "openai",
          openai_model: "gpt-4o-mini",
          groq_model: "llama-3.3-70b-versatile",
          system_prompt: DEFAULT_SYSTEM_PROMPT,
          meta_user_id: metaUserId,
          webhook_routing_mode: "waba",
          auto_provisioned: true,
          provisioned_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (createError || !created) {
        console.error(
          "[Meta OAuth Callback] Failed to create client:",
          createError,
        );
        throw createError ?? new Error("Failed to create client");
      }

      client = created;
      console.log("[Meta OAuth Callback] ✅ Client created:", client.id);
    }

    // 10. Subscribe UzzApp to client's WABA (so we receive webhook events)
    console.log("[Meta OAuth Callback] 🔧 Provisioning details:", {
      wabaId,
      phoneNumberId,
      tokenPrefix: accessToken.substring(0, 12) + "...",
      clientId: client.id,
    });

    const subscribeResult = await subscribeAppToWABA(wabaId, accessToken);
    if (!subscribeResult.success) {
      console.error(
        "[Meta OAuth Callback] ⚠️ WABA subscription failed (non-blocking):",
        subscribeResult.error,
      );
    } else {
      console.log("[Meta OAuth Callback] ✅ App subscribed to WABA:", wabaId);
    }

    // 12. Register phone number with Cloud API
    const registerResult = await registerPhoneNumber(
      phoneNumberId,
      accessToken,
    );
    if (!registerResult.success) {
      console.error(
        "[Meta OAuth Callback] ⚠️ Phone registration failed (non-blocking):",
        {
          error: registerResult.error,
          phoneNumberId,
          wabaId,
          tokenPrefix: accessToken.substring(0, 12) + "...",
        },
      );
    } else {
      console.log("[Meta OAuth Callback] ✅ Phone registered:", phoneNumberId);
    }

    // 12b. Update provisioning status (include failure reason if any)
    await supabase
      .from("clients")
      .update({
        provisioning_status: {
          waba_subscribed: subscribeResult.success,
          phone_registered: registerResult.success,
          ...(registerResult.error === "2FA_ENABLED"
            ? { phone_register_error: "2FA_ENABLED" }
            : !registerResult.success && registerResult.error
            ? { phone_register_error: registerResult.error }
            : {}),
          provisioned_at: new Date().toISOString(),
        },
      })
      .eq("id", client.id);

    // 13. Redirect based on flow type
    if (isMigration) {
      // Migration: redirect back to dashboard settings with success message
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_URL}/dashboard/settings?migration=success&waba=${wabaId}`,
      );
    }

    // Onboarding: redirect to WhatsApp connected confirmation step
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_URL}/onboarding?step=whatsapp-connected&client_id=${client.id}&success=true`,
    );
  } catch (error) {
    console.error("[Meta OAuth Callback] Error:", error);

    return NextResponse.redirect(
      `${
        process.env.NEXT_PUBLIC_URL
      }/onboarding?error=oauth_processing_failed&message=${
        error instanceof Error ? encodeURIComponent(error.message) : "unknown"
      }`,
    );
  }
}

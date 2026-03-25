/**
 * Embedded Signup Endpoint (JS SDK)
 *
 * Receives authorization code + session data from the EmbeddedSignupButton
 * frontend component (Facebook JS SDK popup flow).
 *
 * Supports coexistence mode: WhatsApp Business App + Cloud API on same number
 * when event_type === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"
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

interface EmbeddedSignupBody {
  code: string;
  waba_id?: string | null;
  phone_number_id?: string | null;
  business_id?: string | null;
  event_type?: string;
  client_id?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate request body
    const body: EmbeddedSignupBody = await request.json();

    if (!body.code) {
      return NextResponse.json(
        { error: "Missing authorization code" },
        { status: 400 },
      );
    }

    const { code, event_type = "FINISH", client_id: existingClientId } = body;

    const isCoexistence =
      event_type === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING";

    console.log("[Embedded Signup] Processing:", {
      event_type,
      isCoexistence,
      hasClientId: !!existingClientId,
      hasSessionWaba: !!body.waba_id,
    });

    // 2. Verify user session (must be authenticated)
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Não autenticado. Faça login primeiro." },
        { status: 401 },
      );
    }

    // 3. Exchange code for access token
    const accessToken = await exchangeCodeForToken(code);
    console.log("[Embedded Signup] ✅ Token received");

    // 4. Fetch Meta user ID
    const metaUserId = await fetchMetaUserId(accessToken);

    // 5. Fetch WABA details (or use session data as hints)
    const { wabaId, phoneNumberId, displayPhone, businessId } =
      await fetchWABADetails(accessToken);

    console.log("[Embedded Signup] ✅ WABA details:", {
      wabaId,
      phoneNumberId,
      displayPhone,
      isCoexistence,
    });

    // 6. Check if WABA already exists (on a different client)
    const { data: wabaClient } = await supabase
      .from("clients")
      .select("id, name")
      .eq("meta_waba_id", wabaId)
      .single();

    if (wabaClient && wabaClient.id !== existingClientId) {
      return NextResponse.json(
        {
          error: `Este WhatsApp Business já está conectado ao cliente "${wabaClient.name}". Desconecte primeiro antes de reconectar.`,
          code: "WABA_ALREADY_CONNECTED",
        },
        { status: 409 },
      );
    }

    // 7. Store Meta access token in Vault
    const metaTokenSecretId = await createOrUpdateSecret(
      accessToken,
      `meta_token_${wabaId}`,
      `Meta access token from Embedded Signup (WABA: ${wabaId})`,
    );

    // 7b. Create/update verify token in Vault
    const verifyToken = generateSecureToken();
    const verifyTokenSecretId = await createOrUpdateSecret(
      verifyToken,
      `meta_verify_${wabaId}`,
      `Meta verify token (WABA: ${wabaId})`,
    );

    const onboardingType = isCoexistence ? "coexistence" : "cloud_api";

    let client: { id: string };

    if (existingClientId) {
      // 8a. Update existing client
      console.log(
        `[Embedded Signup] Updating existing client: ${existingClientId}`,
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
          onboarding_type: onboardingType,
        })
        .eq("id", existingClientId)
        .select("id")
        .single();

      if (updateError || !updated) {
        console.error(
          "[Embedded Signup] Failed to update client:",
          updateError,
        );
        throw updateError ?? new Error("Client not found");
      }

      client = updated;
    } else {
      // 8b. Create new client
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
          meta_verify_token_secret_id: verifyTokenSecretId,
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
          onboarding_type: onboardingType,
        })
        .select("id")
        .single();

      if (createError || !created) {
        console.error(
          "[Embedded Signup] Failed to create client:",
          createError,
        );
        throw createError ?? new Error("Failed to create client");
      }

      client = created;
    }

    console.log(
      `[Embedded Signup] ✅ Client ${
        existingClientId ? "updated" : "created"
      }: ${client.id}`,
    );

    // 9. Subscribe app to WABA (so we receive webhook events)
    const subscribeResult = await subscribeAppToWABA(wabaId, accessToken);
    if (!subscribeResult.success) {
      console.error(
        "[Embedded Signup] ⚠️ WABA subscription failed (non-blocking):",
        subscribeResult.error,
      );
    }

    // 10. Register phone number with Cloud API
    const registerResult = await registerPhoneNumber(
      phoneNumberId,
      accessToken,
    );
    if (!registerResult.success) {
      console.error(
        "[Embedded Signup] ⚠️ Phone registration failed (non-blocking):",
        registerResult.error,
      );
    }

    // 11. Update provisioning status
    await supabase
      .from("clients")
      .update({
        provisioning_status: {
          waba_subscribed: subscribeResult.success,
          phone_registered: registerResult.success,
          onboarding_type: onboardingType,
          ...(registerResult.error === "2FA_ENABLED"
            ? { phone_register_error: "2FA_ENABLED" }
            : !registerResult.success && registerResult.error
            ? { phone_register_error: registerResult.error }
            : {}),
          provisioned_at: new Date().toISOString(),
        },
      })
      .eq("id", client.id);

    // 12. Return JSON response (not redirect, since called via fetch)
    return NextResponse.json({
      success: true,
      client_id: client.id,
      waba_id: wabaId,
      display_phone: displayPhone,
      onboarding_type: onboardingType,
      provisioning: {
        waba_subscribed: subscribeResult.success,
        phone_registered: registerResult.success,
      },
    });
  } catch (error) {
    console.error("[Embedded Signup] Error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao processar embedded signup",
      },
      { status: 500 },
    );
  }
}

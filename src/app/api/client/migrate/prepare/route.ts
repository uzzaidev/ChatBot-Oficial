/**
 * POST /api/client/migrate/prepare
 *
 * Prepares legacy client migration by unsubscribing the old app from the WABA.
 * After this, the WABA will appear in the Embedded Signup flow for the new app.
 *
 * Flow: Button click → this API (unsubscribe old app) → redirect to /api/auth/meta/init
 */

import {
  createRouteHandlerClient,
  createServerClient,
} from "@/lib/supabase-server";
import { getSecret } from "@/lib/vault";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  console.log("[Migration Prepare] === START ===");

  try {
    // 1. Authenticate user
    const supabase = await createRouteHandlerClient(request);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log("[Migration Prepare] Auth failed:", authError?.message);
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    console.log("[Migration Prepare] User:", user.id);

    // 2. Get user's client_id
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("client_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.client_id) {
      console.log(
        "[Migration Prepare] Profile not found:",
        profileError?.message,
      );
      return NextResponse.json(
        { error: "Perfil não encontrado" },
        { status: 404 },
      );
    }

    const clientId = profile.client_id;
    console.log("[Migration Prepare] Client ID:", clientId);

    // 3. Get client details (need WABA ID and token secret ID)
    const adminSupabase = await createServerClient();
    const { data: client, error: clientError } = await adminSupabase
      .from("clients")
      .select(
        "id, meta_waba_id, meta_phone_number_id, meta_access_token_secret_id, webhook_routing_mode, auto_provisioned",
      )
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      console.log(
        "[Migration Prepare] Client not found:",
        clientError?.message,
      );
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 },
      );
    }

    console.log("[Migration Prepare] Client details:", {
      waba_id: client.meta_waba_id,
      phone_number_id: client.meta_phone_number_id,
      has_token_secret: !!client.meta_access_token_secret_id,
      token_secret_id: client.meta_access_token_secret_id,
      webhook_routing_mode: client.webhook_routing_mode,
      auto_provisioned: client.auto_provisioned,
    });

    // 4. Check if migration is needed
    if (client.auto_provisioned && client.webhook_routing_mode === "waba") {
      console.log("[Migration Prepare] Client already migrated, skipping");
      return NextResponse.json({
        success: true,
        message: "Cliente já está no Embedded Signup",
        already_migrated: true,
      });
    }

    // 5. Get old Meta token from Vault
    if (!client.meta_access_token_secret_id) {
      console.log(
        "[Migration Prepare] No token secret ID, skipping unsubscribe",
      );
      return NextResponse.json({
        success: true,
        message: "Sem token antigo, prosseguir com Embedded Signup",
        unsubscribed: false,
      });
    }

    const oldToken = await getSecret(client.meta_access_token_secret_id);

    if (!oldToken) {
      console.log(
        "[Migration Prepare] Token not found in Vault for secret:",
        client.meta_access_token_secret_id,
      );
      return NextResponse.json({
        success: true,
        message: "Token antigo não encontrado no Vault, prosseguir",
        unsubscribed: false,
      });
    }

    console.log(
      "[Migration Prepare] Got token from Vault, length:",
      oldToken.length,
      "prefix:",
      oldToken.substring(0, 10) + "...",
    );

    // 6. Resolve WABA ID (from DB or auto-discover from phone number)
    let wabaId = client.meta_waba_id;

    if (!wabaId && client.meta_phone_number_id) {
      console.log(
        "[Migration Prepare] No WABA ID, discovering from phone number:",
        client.meta_phone_number_id,
      );

      try {
        const phoneRes = await fetch(
          `https://graph.facebook.com/v22.0/${client.meta_phone_number_id}?fields=whatsapp_business_account&access_token=${oldToken}`,
        );
        const phoneData = await phoneRes.json();
        console.log(
          "[Migration Prepare] Phone lookup response:",
          phoneRes.status,
          JSON.stringify(phoneData),
        );

        if (phoneData.whatsapp_business_account?.id) {
          wabaId = phoneData.whatsapp_business_account.id;
          console.log("[Migration Prepare] Discovered WABA ID:", wabaId);

          // Save discovered WABA ID to DB for future use
          await adminSupabase
            .from("clients")
            .update({ meta_waba_id: wabaId })
            .eq("id", clientId);
          console.log("[Migration Prepare] Saved WABA ID to client record");
        }
      } catch (discoverErr) {
        console.error("[Migration Prepare] WABA discovery failed:", discoverErr);
      }
    }

    // 7. Unsubscribe old app from WABA
    if (wabaId) {
      const url = `https://graph.facebook.com/v22.0/${wabaId}/subscribed_apps`;
      console.log("[Migration Prepare] DELETE", url);

      const unsubResponse = await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${oldToken}`,
        },
      });

      const unsubData = await unsubResponse.json();
      console.log(
        "[Migration Prepare] Unsubscribe response:",
        unsubResponse.status,
        JSON.stringify(unsubData),
      );

      if (!unsubResponse.ok) {
        console.error("[Migration Prepare] Unsubscribe failed:", unsubData);
        return NextResponse.json({
          success: true,
          message: `Desinscrição falhou (${
            unsubData.error?.message || "unknown"
          }), mas pode tentar o Embedded Signup mesmo assim`,
          unsubscribed: false,
          error_detail: unsubData.error?.message,
        });
      }

      console.log(
        `[Migration Prepare] ✅ Old app unsubscribed from WABA ${wabaId}`,
      );
    } else {
      console.log(
        "[Migration Prepare] No WABA ID found (DB or discovery), skipping unsubscribe",
      );
    }

    console.log("[Migration Prepare] === DONE ===");
    return NextResponse.json({
      success: true,
      message: wabaId
        ? "App antigo desinscrito. Prossiga com o Embedded Signup."
        : "WABA não encontrado, prossiga com o Embedded Signup.",
      unsubscribed: !!wabaId,
      waba_id: wabaId,
      client_id: clientId,
    });
  } catch (error) {
    console.error("[Migration Prepare] Error:", error);
    return NextResponse.json(
      {
        error: "Erro ao preparar migração",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

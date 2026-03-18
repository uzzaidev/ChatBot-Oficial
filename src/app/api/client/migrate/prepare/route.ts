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
  try {
    // 1. Authenticate user
    const supabase = await createRouteHandlerClient(request);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // 2. Get user's client_id
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("client_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.client_id) {
      return NextResponse.json(
        { error: "Perfil não encontrado" },
        { status: 404 },
      );
    }

    const clientId = profile.client_id;

    // 3. Get client details (need WABA ID and token secret ID)
    const adminSupabase = await createServerClient();
    const { data: client, error: clientError } = await adminSupabase
      .from("clients")
      .select(
        "id, meta_waba_id, meta_access_token_secret_id, webhook_routing_mode, auto_provisioned",
      )
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 },
      );
    }

    // 4. Check if migration is needed
    if (client.auto_provisioned && client.webhook_routing_mode === "waba") {
      return NextResponse.json({
        success: true,
        message: "Cliente já está no Embedded Signup",
        already_migrated: true,
      });
    }

    // 5. Get old Meta token from Vault
    if (!client.meta_access_token_secret_id) {
      // No token stored - just proceed to Embedded Signup
      return NextResponse.json({
        success: true,
        message: "Sem token antigo, prosseguir com Embedded Signup",
        unsubscribed: false,
      });
    }

    const oldToken = await getSecret(client.meta_access_token_secret_id);

    if (!oldToken) {
      return NextResponse.json({
        success: true,
        message: "Token antigo não encontrado no Vault, prosseguir",
        unsubscribed: false,
      });
    }

    // 6. Unsubscribe old app from WABA (if WABA ID exists)
    if (client.meta_waba_id) {
      console.log(
        `[Migration Prepare] Unsubscribing old app from WABA ${client.meta_waba_id} for client ${clientId}`,
      );

      const unsubResponse = await fetch(
        `https://graph.facebook.com/v22.0/${client.meta_waba_id}/subscribed_apps`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${oldToken}`,
          },
        },
      );

      const unsubData = await unsubResponse.json();

      if (!unsubResponse.ok) {
        console.error("[Migration Prepare] Unsubscribe failed:", unsubData);

        // Non-blocking: even if unsubscribe fails, the WABA might still appear
        // Common errors: token expired, app already unsubscribed
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
        `[Migration Prepare] ✅ Old app unsubscribed from WABA ${client.meta_waba_id}`,
      );
    }

    return NextResponse.json({
      success: true,
      message: "App antigo desinscrito. Prossiga com o Embedded Signup.",
      unsubscribed: true,
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

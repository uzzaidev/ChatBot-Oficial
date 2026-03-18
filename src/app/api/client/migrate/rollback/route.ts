/**
 * POST /api/client/migrate/rollback
 *
 * Re-subscribes the old app to the WABA if migration was interrupted.
 * Safety net: restores WhatsApp connectivity if Embedded Signup fails.
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

    // 3. Get client details
    const adminSupabase = await createServerClient();
    const { data: client, error: clientError } = await adminSupabase
      .from("clients")
      .select("id, meta_waba_id, meta_access_token_secret_id")
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 },
      );
    }

    if (!client.meta_waba_id || !client.meta_access_token_secret_id) {
      return NextResponse.json(
        { error: "WABA ou token não configurados. Não é possível reverter." },
        { status: 400 },
      );
    }

    // 4. Get token from Vault
    const token = await getSecret(client.meta_access_token_secret_id);

    if (!token) {
      return NextResponse.json(
        { error: "Token não encontrado no Vault" },
        { status: 400 },
      );
    }

    // 5. Re-subscribe old app to WABA
    console.log(
      `[Migration Rollback] Re-subscribing app to WABA ${client.meta_waba_id} for client ${clientId}`,
    );

    const subResponse = await fetch(
      `https://graph.facebook.com/v22.0/${client.meta_waba_id}/subscribed_apps`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const subData = await subResponse.json();

    if (!subResponse.ok) {
      console.error("[Migration Rollback] Re-subscribe failed:", subData);
      return NextResponse.json(
        {
          error: `Falha ao reconectar: ${subData.error?.message || "erro desconhecido"}`,
        },
        { status: 502 },
      );
    }

    console.log(
      `[Migration Rollback] ✅ App re-subscribed to WABA ${client.meta_waba_id}`,
    );

    return NextResponse.json({
      success: true,
      message: "WhatsApp reconectado ao app anterior com sucesso.",
    });
  } catch (error) {
    console.error("[Migration Rollback] Error:", error);
    return NextResponse.json(
      {
        error: "Erro ao reverter migração",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

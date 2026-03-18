/**
 * POST /api/client/register-phone
 *
 * Registers (activates) the client's phone number on the WhatsApp Cloud API.
 * This is needed when the phone shows "Pendente" (Pending) status in Meta Dashboard.
 *
 * Uses the client's access token from Vault to call POST /{phone_id}/register.
 */

import {
  createRouteHandlerClient,
  createServerClient,
} from "@/lib/supabase-server";
import { getSecret } from "@/lib/vault";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  console.log("[Register Phone] === START ===");

  try {
    // 1. Authenticate user
    const supabase = await createRouteHandlerClient(request);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log("[Register Phone] Auth failed:", authError?.message);
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    console.log("[Register Phone] User:", user.id);

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
    console.log("[Register Phone] Client ID:", clientId);

    // 3. Get client details
    const adminSupabase = await createServerClient();
    const { data: client, error: clientError } = await adminSupabase
      .from("clients")
      .select(
        "id, meta_phone_number_id, meta_access_token_secret_id, provisioning_status",
      )
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 },
      );
    }

    if (!client.meta_phone_number_id) {
      return NextResponse.json(
        { error: "Nenhum número de telefone configurado para este cliente" },
        { status: 400 },
      );
    }

    if (!client.meta_access_token_secret_id) {
      return NextResponse.json(
        { error: "Token de acesso Meta não configurado" },
        { status: 400 },
      );
    }

    console.log(
      "[Register Phone] Phone Number ID:",
      client.meta_phone_number_id,
    );

    // 4. Get access token from Vault
    const accessToken = await getSecret(client.meta_access_token_secret_id);
    if (!accessToken) {
      return NextResponse.json(
        { error: "Não foi possível recuperar o token de acesso" },
        { status: 500 },
      );
    }

    // 5. Call Meta API to register phone number
    console.log(
      "[Register Phone] Calling POST /" +
        client.meta_phone_number_id +
        "/register",
    );

    const response = await fetch(
      `https://graph.facebook.com/v22.0/${client.meta_phone_number_id}/register`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          pin: "000000",
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      // Error 100 = already registered — treat as success
      if (data.error?.code === 100) {
        console.log("[Register Phone] Phone already registered (OK)");

        // Update provisioning_status
        await adminSupabase
          .from("clients")
          .update({
            provisioning_status: {
              ...(client.provisioning_status || {}),
              phone_registered: true,
            },
          })
          .eq("id", clientId);

        return NextResponse.json({
          success: true,
          already_registered: true,
          message: "Telefone já estava registrado.",
        });
      }

      console.error("[Register Phone] Meta API error:", data);
      return NextResponse.json(
        {
          error:
            data.error?.message ||
            "Erro ao registrar telefone na API do WhatsApp",
        },
        { status: 400 },
      );
    }

    console.log("[Register Phone] ✅ Phone registered successfully:", data);

    // 6. Update provisioning_status in DB
    await adminSupabase
      .from("clients")
      .update({
        provisioning_status: {
          ...(client.provisioning_status || {}),
          phone_registered: true,
        },
      })
      .eq("id", clientId);

    return NextResponse.json({
      success: true,
      message: "Telefone registrado com sucesso! Agora pode enviar e receber mensagens.",
    });
  } catch (error) {
    console.error("[Register Phone] Exception:", error);
    return NextResponse.json(
      { error: "Erro interno ao registrar telefone" },
      { status: 500 },
    );
  }
}

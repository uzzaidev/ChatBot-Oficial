/**
 * DELETE /api/auth/meta/disconnect
 *
 * Disconnects WhatsApp Business from a client.
 * Clears Meta credentials, WABA data, and Vault secrets.
 * Also deregisters the phone number from Cloud API.
 */

import { createServerClient } from "@/lib/supabase-server";
import { deleteSecret } from "@/lib/vault";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest) {
  try {
    // 1. Authenticate
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // 2. Get client_id from user profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("client_id")
      .eq("id", user.id)
      .single();

    if (!profile?.client_id) {
      return NextResponse.json(
        { error: "Perfil não encontrado" },
        { status: 404 },
      );
    }

    const clientId = profile.client_id;

    // 3. Fetch current client data to get Vault secret IDs and phone info
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select(
        "meta_access_token_secret_id, meta_verify_token_secret_id, meta_phone_number_id, meta_waba_id, meta_display_phone",
      )
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 },
      );
    }

    // 4. Try to deregister phone number from Cloud API (best-effort)
    if (client.meta_phone_number_id && client.meta_access_token_secret_id) {
      try {
        const { getSecret } = await import("@/lib/vault");
        const accessToken = await getSecret(
          client.meta_access_token_secret_id,
        );

        if (accessToken) {
          const deregRes = await fetch(
            `https://graph.facebook.com/v22.0/${client.meta_phone_number_id}/deregister`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ messaging_product: "whatsapp" }),
            },
          );

          if (deregRes.ok) {
            console.log(
              `[Meta Disconnect] Phone deregistered: ${client.meta_phone_number_id}`,
            );
          } else {
            const err = await deregRes.json().catch(() => ({}));
            console.warn(
              `[Meta Disconnect] Phone deregister failed (non-blocking):`,
              err,
            );
          }
        }
      } catch (err) {
        console.warn(
          "[Meta Disconnect] Deregister error (non-blocking):",
          err,
        );
      }
    }

    // 5. Delete Vault secrets
    if (client.meta_access_token_secret_id) {
      await deleteSecret(client.meta_access_token_secret_id).catch(() => {});
    }
    if (client.meta_verify_token_secret_id) {
      await deleteSecret(client.meta_verify_token_secret_id).catch(() => {});
    }

    // 6. Clear all Meta/WhatsApp fields on the client
    const { error: updateError } = await supabase
      .from("clients")
      .update({
        meta_waba_id: null,
        meta_phone_number_id: null,
        meta_display_phone: null,
        meta_access_token_secret_id: null,
        meta_verify_token_secret_id: null,
        meta_user_id: null,
        webhook_routing_mode: null,
        auto_provisioned: false,
        provisioned_at: null,
        onboarding_type: null,
        provisioning_status: null,
      })
      .eq("id", clientId);

    if (updateError) {
      console.error("[Meta Disconnect] Update error:", updateError);
      throw new Error(updateError.message);
    }

    console.log(
      `[Meta Disconnect] WhatsApp disconnected for client: ${clientId} (was: ${client.meta_display_phone}, WABA: ${client.meta_waba_id})`,
    );

    return NextResponse.json({
      success: true,
      disconnected: {
        phone: client.meta_display_phone,
        waba_id: client.meta_waba_id,
      },
    });
  } catch (error) {
    console.error("[Meta Disconnect] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao desconectar WhatsApp",
      },
      { status: 500 },
    );
  }
}

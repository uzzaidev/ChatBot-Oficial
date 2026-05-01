import { query } from "@/lib/postgres";
import { getClientIdFromSession } from "@/lib/supabase-server";
import { getSecret } from "@/lib/vault";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const META_API_VERSION = "v22.0";

export async function GET(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request as any);
    if (!clientId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const clientResult = await query<{
      meta_phone_number_id: string | null;
      meta_access_token_secret_id: string | null;
      meta_waba_id: string | null;
    }>(
      `SELECT meta_phone_number_id, meta_access_token_secret_id, meta_waba_id
       FROM clients WHERE id = $1 LIMIT 1`,
      [clientId],
    );

    const client = clientResult.rows[0];
    if (!client) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 },
      );
    }

    // Last webhook received from our DB
    const lastWebhookResult = await query<{
      received_at: string;
      webhook_field: string | null;
    }>(
      `SELECT received_at, webhook_field
       FROM meta_webhook_events
       WHERE client_id = $1
       ORDER BY received_at DESC
       LIMIT 1`,
      [clientId],
    );
    const lastWebhook = lastWebhookResult.rows[0] ?? null;

    // If no phone or token, return early with only DB info
    if (!client.meta_phone_number_id || !client.meta_access_token_secret_id) {
      return NextResponse.json({
        phoneStatus: null,
        lastWebhook: lastWebhook
          ? {
              receivedAt: lastWebhook.received_at,
              field: lastWebhook.webhook_field,
            }
          : null,
        error: "Credenciais Meta não configuradas",
      });
    }

    // Fetch phone number status from Meta Graph API
    let accessToken: string | null = null;
    try {
      accessToken = await getSecret(client.meta_access_token_secret_id);
    } catch {
      return NextResponse.json({
        phoneStatus: null,
        lastWebhook: lastWebhook
          ? {
              receivedAt: lastWebhook.received_at,
              field: lastWebhook.webhook_field,
            }
          : null,
        error: "Não foi possível recuperar o token Meta do Vault",
      });
    }

    let phoneStatus: Record<string, unknown> | null = null;
    let metaError: string | null = null;

    try {
      const url = `https://graph.facebook.com/${META_API_VERSION}/${client.meta_phone_number_id}?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status,messaging_limit_tier&access_token=${accessToken}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || data.error) {
        metaError = data.error?.message ?? `HTTP ${res.status}`;
      } else {
        phoneStatus = {
          phoneNumberId: data.id,
          displayPhone: data.display_phone_number,
          verifiedName: data.verified_name,
          qualityRating: data.quality_rating,
          verificationStatus: data.code_verification_status,
          messagingLimitTier: data.messaging_limit_tier,
        };
      }
    } catch (fetchError) {
      metaError =
        fetchError instanceof Error
          ? fetchError.message
          : "Erro ao contatar Meta API";
    }

    return NextResponse.json({
      phoneStatus,
      lastWebhook: lastWebhook
        ? {
            receivedAt: lastWebhook.received_at,
            field: lastWebhook.webhook_field,
          }
        : null,
      error: metaError,
    });
  } catch (error) {
    console.error("[WhatsApp Health] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 },
    );
  }
}

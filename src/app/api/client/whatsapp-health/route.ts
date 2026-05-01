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
      whatsapp_business_account_id: string | null;
    }>(
      `SELECT meta_phone_number_id, meta_access_token_secret_id, meta_waba_id, whatsapp_business_account_id
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
      // Strategy 1: GET /{waba-id}/phone_numbers - works with business_management scope
      // Strategy 2: GET /{phone-number-id} - also requires whatsapp_business_management
      //
      // Embedded Signup tokens may only have whatsapp_business_messaging (send/receive),
      // not whatsapp_business_management (read metadata). If both fail, we still report
      // webhook health from our own DB.
      let fetched = false;

      // Resolve WABA ID — stored in either meta_waba_id or the older whatsapp_business_account_id column
      const wabaId = client.meta_waba_id || client.whatsapp_business_account_id;

      if (wabaId) {
        const wabaUrl = `https://graph.facebook.com/${META_API_VERSION}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status,messaging_limit_tier&access_token=${accessToken}`;
        const wabaRes = await fetch(wabaUrl, { cache: "no-store" });
        const wabaData = await wabaRes.json();

        if (wabaData.error) {
          console.error(
            "[WhatsApp Health] WABA API error:",
            JSON.stringify(wabaData.error),
          );
          // Store for potential exposure in response
          metaError = `Meta API: ${wabaData.error.message} (código ${wabaData.error.code})`;
        }

        if (wabaRes.ok && !wabaData.error && Array.isArray(wabaData.data)) {
          const match =
            wabaData.data.find(
              (p: { id: string }) => p.id === client.meta_phone_number_id,
            ) ?? wabaData.data[0];

          if (match) {
            phoneStatus = {
              phoneNumberId: match.id,
              displayPhone: match.display_phone_number,
              verifiedName: match.verified_name,
              qualityRating: match.quality_rating,
              verificationStatus: match.code_verification_status,
              messagingLimitTier: match.messaging_limit_tier,
            };
            fetched = true;
          }
        }
      }

      // Fallback: direct phone number ID lookup
      if (!fetched) {
        const url = `https://graph.facebook.com/${META_API_VERSION}/${client.meta_phone_number_id}?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status,messaging_limit_tier&access_token=${accessToken}`;
        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json();

        if (!res.ok || data.error) {
          console.error(
            "[WhatsApp Health] Phone ID API error:",
            JSON.stringify(data.error),
          );
          const errCode = data.error?.code;
          const errSubcode = data.error?.error_subcode;
          const errMsg = data.error?.message ?? "Erro desconhecido";
          if (errCode === 190) {
            metaError = `Token Meta expirado — é necessário reconectar via Embedded Signup. (Meta: ${errMsg})`;
          } else if (errCode === 10 || errCode === 200) {
            metaError =
              "Token sem permissão de leitura de metadados (whatsapp_business_management). " +
              "Isso não afeta o funcionamento do bot — use o último webhook abaixo como indicador de saúde.";
          } else if (errCode === 100 && errSubcode === 33) {
            metaError =
              "IDs de WABA/número salvos no banco não correspondem ao escopo do token atual. " +
              "O bot pode estar funcionando normalmente — verifique o último webhook abaixo. " +
              "Se o bot parou de responder, refaça o Embedded Signup para atualizar as credenciais.";
          } else {
            metaError = `Erro Meta API (código ${errCode ?? "?"}): ${errMsg}`;
          }
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

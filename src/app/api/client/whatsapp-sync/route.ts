import {
  type CoexistenceSyncType,
  getCoexistenceSyncState,
  requestCoexistenceSync,
} from "@/lib/coexistence-sync";
import { query } from "@/lib/postgres";
import { getClientIdFromSession } from "@/lib/supabase-server";
import { getSecret } from "@/lib/vault";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const VALID_SYNC_TYPES = new Set<CoexistenceSyncType>(["contacts", "history"]);

export async function POST(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request as any);

    if (!clientId) {
      console.warn("[WhatsApp Sync] Unauthorized request");
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      sync_type?: string;
    };
    const syncType = body.sync_type as CoexistenceSyncType | undefined;

    if (!syncType || !VALID_SYNC_TYPES.has(syncType)) {
      console.warn("[WhatsApp Sync] Invalid sync_type", {
        clientId,
        syncType: body.sync_type,
      });
      return NextResponse.json(
        { error: "sync_type inválido. Use 'contacts' ou 'history'." },
        { status: 400 },
      );
    }

    console.log("[WhatsApp Sync] Request received", {
      clientId,
      syncType,
    });

    const clientResult = await query<{
      id: string;
      meta_phone_number_id: string | null;
      meta_access_token_secret_id: string | null;
      auto_provisioned: boolean | null;
      onboarding_type: string | null;
      provisioned_at: string | null;
      provisioning_status: Record<string, any> | null;
    }>(
      `SELECT
         id,
         meta_phone_number_id,
         meta_access_token_secret_id,
         auto_provisioned,
         onboarding_type,
         provisioned_at,
         provisioning_status
       FROM clients
       WHERE id = $1
       LIMIT 1`,
      [clientId],
    );

    const client = clientResult.rows[0];
    if (!client) {
      console.warn("[WhatsApp Sync] Client not found", { clientId, syncType });
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 },
      );
    }

    if (!client.auto_provisioned || client.onboarding_type !== "coexistence") {
      console.warn(
        "[WhatsApp Sync] Proceeding without local coexistence eligibility gate",
        {
          clientId,
          syncType,
          autoProvisioned: client.auto_provisioned,
          onboardingType: client.onboarding_type,
          phoneNumberId: client.meta_phone_number_id,
        },
      );
    }

    if (!client.meta_phone_number_id || !client.meta_access_token_secret_id) {
      console.warn("[WhatsApp Sync] Missing Meta credentials", {
        clientId,
        syncType,
        hasPhoneNumberId: Boolean(client.meta_phone_number_id),
        hasTokenSecretId: Boolean(client.meta_access_token_secret_id),
      });
      return NextResponse.json(
        { error: "Credenciais Meta incompletas para este cliente" },
        { status: 400 },
      );
    }

    const accessToken = await getSecret(client.meta_access_token_secret_id);
    if (!accessToken) {
      console.error("[WhatsApp Sync] Failed to load access token from vault", {
        clientId,
        syncType,
        tokenSecretId: client.meta_access_token_secret_id,
      });
      return NextResponse.json(
        { error: "Não foi possível recuperar o token Meta do cliente" },
        { status: 500 },
      );
    }

    const result = await requestCoexistenceSync({
      clientId,
      phoneNumberId: client.meta_phone_number_id,
      accessToken,
      syncType,
      provisionedAt: client.provisioned_at,
      provisioningStatus: client.provisioning_status,
    });

    console.log("[WhatsApp Sync] Request accepted by Meta", {
      clientId,
      syncType,
      requestId: result.requestId,
      phoneNumberId: client.meta_phone_number_id,
    });

    return NextResponse.json({
      success: true,
      sync_type: syncType,
      request_id: result.requestId,
      sync_state: getCoexistenceSyncState(result.provisioningStatus, syncType),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao solicitar sync";
    const status =
      message.includes("já foi solicitada")
        ? 409
        : message.includes("janela de 24h expirou")
          ? 400
          : 500;

    console.error("[WhatsApp Sync] Request failed", {
      error: message,
      status,
    });

    return NextResponse.json(
      { error: message },
      { status },
    );
  }
}

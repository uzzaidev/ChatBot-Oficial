import { query } from "@/lib/postgres";

export type CoexistenceSyncType = "contacts" | "history";

export interface CoexistenceSyncState {
  status?: "requested" | "completed" | "declined" | "failed";
  request_id?: string | null;
  requested_at?: string | null;
  completed_at?: string | null;
  last_webhook_at?: string | null;
  progress?: number | null;
  phase?: number | null;
  chunk_order?: number | null;
  error_code?: number | null;
  error_message?: string | null;
  error_details?: string | null;
}

type ProvisioningStatus = Record<string, any> | null | undefined;

const META_API_VERSION = "v22.0";
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export const getSyncKey = (syncType: CoexistenceSyncType): string =>
  `${syncType}_sync`;

export const getCoexistenceSyncState = (
  provisioningStatus: ProvisioningStatus,
  syncType: CoexistenceSyncType,
): CoexistenceSyncState | null => {
  if (!provisioningStatus || typeof provisioningStatus !== "object") {
    return null;
  }

  const state = provisioningStatus[getSyncKey(syncType)];
  if (!state || typeof state !== "object") {
    return null;
  }

  return state as CoexistenceSyncState;
};

export const isSyncLocked = (
  state: CoexistenceSyncState | null | undefined,
): boolean => {
  if (!state) return false;
  if (state.request_id) return true;

  return (
    state.status === "requested" ||
    state.status === "completed" ||
    state.status === "declined"
  );
};

export async function updateClientProvisioningStatus(
  clientId: string,
  updater: (current: Record<string, any>) => Record<string, any>,
): Promise<Record<string, any>> {
  const currentResult = await query<{ provisioning_status: Record<string, any> }>(
    `SELECT provisioning_status
     FROM clients
     WHERE id = $1
     LIMIT 1`,
    [clientId],
  );

  const current =
    (currentResult.rows[0]?.provisioning_status as Record<string, any>) || {};
  const next = updater(current);

  await query(
    `UPDATE clients
     SET provisioning_status = $2::jsonb,
         updated_at = NOW()
     WHERE id = $1`,
    [clientId, JSON.stringify(next)],
  );

  return next;
}

const formatAbsoluteTimestamp = (value: string | Date): string => {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toISOString();
};

export async function requestCoexistenceSync(input: {
  clientId: string;
  phoneNumberId: string;
  accessToken: string;
  syncType: CoexistenceSyncType;
  provisionedAt?: string | null;
  provisioningStatus?: ProvisioningStatus;
}): Promise<{
  requestId: string | null;
  response: Record<string, any>;
  provisioningStatus: Record<string, any>;
}> {
  const {
    clientId,
    phoneNumberId,
    accessToken,
    syncType,
    provisionedAt,
    provisioningStatus,
  } = input;

  const existingState = getCoexistenceSyncState(provisioningStatus, syncType);
  if (isSyncLocked(existingState)) {
    throw new Error(
      `A sincronização de ${syncType} já foi solicitada anteriormente.`,
    );
  }

  if (provisionedAt) {
    const provisionedAtDate = new Date(provisionedAt);
    if (!Number.isNaN(provisionedAtDate.getTime())) {
      const expiresAt = new Date(provisionedAtDate.getTime() + TWENTY_FOUR_HOURS_MS);
      if (Date.now() > expiresAt.getTime()) {
        throw new Error(
          `A janela de 24h expirou. Onboarding em ${formatAbsoluteTimestamp(
            provisionedAtDate,
          )}; expiração em ${formatAbsoluteTimestamp(expiresAt)}.`,
        );
      }
    }
  }

  const response = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/${phoneNumberId}/smb_app_data`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        sync_type: syncType,
      }),
    },
  );

  const payload = (await response.json().catch(() => ({}))) as Record<
    string,
    any
  >;

  if (!response.ok) {
    await updateClientProvisioningStatus(clientId, (current) => ({
      ...current,
      [getSyncKey(syncType)]: {
        ...(current[getSyncKey(syncType)] || {}),
        status: "failed",
        error_code: payload?.error?.code ?? null,
        error_message: payload?.error?.message || "Falha ao solicitar sync",
        error_details: payload?.error?.error_data?.details || null,
        last_webhook_at: new Date().toISOString(),
      },
    }));

    throw new Error(payload?.error?.message || "Falha ao solicitar sync");
  }

  const requestId =
    typeof payload.request_id === "string" ? payload.request_id : null;
  const nextProvisioningStatus = await updateClientProvisioningStatus(
    clientId,
    (current) => ({
      ...current,
      [getSyncKey(syncType)]: {
        ...(current[getSyncKey(syncType)] || {}),
        status: "requested",
        request_id: requestId,
        requested_at: new Date().toISOString(),
        error_code: null,
        error_message: null,
        error_details: null,
      },
    }),
  );

  return {
    requestId,
    response: payload,
    provisioningStatus: nextProvisioningStatus,
  };
}

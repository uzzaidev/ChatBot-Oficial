import { query } from "@/lib/postgres";
import { createServiceRoleClient } from "@/lib/supabase";
import {
  classifyPendingBucket,
  isFailedWhatsAppStatus,
  isSuccessfulWhatsAppStatus,
  normalizePhoneDigits,
  type PendingBucket,
} from "@/lib/trace-status";

type TraceRow = {
  id: string;
  client_id: string;
  phone: string;
  status: string;
  whatsapp_message_id: string | null;
  webhook_received_at: string | null;
  generation_started_at: string | null;
  generation_completed_at: string | null;
  sent_at: string | null;
  agent_response: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type HistoryRow = {
  id: string;
  session_id: string | null;
  wamid: string | null;
  status: string | null;
  message: {
    type?: string;
    content?: string;
  } | null;
  created_at: string;
};

type HistoryMatch = {
  source: "wamid" | "phone";
  history: HistoryRow;
};

export interface ReconcileTracesOptions {
  clientId?: string;
  lookbackHours?: number;
  limit?: number;
  dryRun?: boolean;
}

export interface ReconcileTracesResult {
  scanned: number;
  changed: number;
  statusToSuccess: number;
  statusToFailed: number;
  pendingBucketUpdated: number;
  unchanged: number;
  errors: number;
  buckets: Record<PendingBucket, number>;
}

const DEFAULT_RESULT: ReconcileTracesResult = {
  scanned: 0,
  changed: 0,
  statusToSuccess: 0,
  statusToFailed: 0,
  pendingBucketUpdated: 0,
  unchanged: 0,
  errors: 0,
  buckets: {
    nao_chegou_na_geracao: 0,
    geracao_iniciada_nao_concluida: 0,
    geracao_concluida_sem_envio: 0,
    enviado_sem_status: 0,
    erro_ia: 0,
    outro_pending: 0,
  },
};

const getMessageContent = (row: HistoryRow): string | null => {
  const content = row.message?.content;
  return typeof content === "string" && content.trim().length > 0 ? content : null;
};

const isAiMessage = (row: HistoryRow): boolean => {
  const type = row.message?.type;
  return type === "ai";
};

const shouldTrackTrace = (status: string): boolean => {
  return status === "pending" || status === "failed";
};

const pickBestHistoryByPhone = (trace: TraceRow, rows: HistoryRow[]): HistoryRow | null => {
  if (!rows.length) return null;
  const traceTs = new Date(trace.created_at).getTime();
  const lowerBound = traceTs - 5 * 60 * 1000;
  const upperBound = traceTs + 25 * 60 * 1000;

  let best: HistoryRow | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const row of rows) {
    if (!isAiMessage(row)) continue;
    const rowTs = new Date(row.created_at).getTime();
    if (!Number.isFinite(rowTs) || rowTs < lowerBound || rowTs > upperBound) continue;

    const distance = Math.abs(rowTs - traceTs);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = row;
    }
  }

  return best;
};

const buildPatch = (
  trace: TraceRow,
  pendingBucket: PendingBucket,
  historyMatch: HistoryMatch | null,
): Record<string, unknown> => {
  const patch: Record<string, unknown> = {};
  const metadata = ((trace.metadata ?? {}) as Record<string, unknown>) || {};
  const metadataPatch: Record<string, unknown> = { ...metadata };

  const previousBucket =
    typeof metadata.pending_bucket === "string" ? metadata.pending_bucket : null;
  if (previousBucket !== pendingBucket) {
    metadataPatch.pending_bucket = pendingBucket;
    patch.metadata = metadataPatch;
  }

  if (!historyMatch) {
    return patch;
  }

  const historyStatus = (historyMatch.history.status ?? "").toLowerCase();
  const historyCreatedAt = historyMatch.history.created_at;
  const historyContent = getMessageContent(historyMatch.history);

  if (trace.status === "pending") {
    if (isSuccessfulWhatsAppStatus(historyStatus) || trace.sent_at) {
      patch.status = "success";
      if (!trace.sent_at) patch.sent_at = historyCreatedAt;
    } else if (isFailedWhatsAppStatus(historyStatus)) {
      patch.status = "failed";
    }
  }

  if (!trace.agent_response && historyContent) {
    patch.agent_response = historyContent;
  }

  metadataPatch.reconciliation = {
    ...(typeof metadata.reconciliation === "object" && metadata.reconciliation
      ? (metadata.reconciliation as Record<string, unknown>)
      : {}),
    source: historyMatch.source,
    history_status: historyStatus || null,
    history_wamid: historyMatch.history.wamid ?? null,
    history_id: historyMatch.history.id,
    reconciled_at: new Date().toISOString(),
  };
  patch.metadata = metadataPatch;

  return patch;
};

export async function reconcileTraces(
  options: ReconcileTracesOptions = {},
): Promise<ReconcileTracesResult> {
  const result: ReconcileTracesResult = { ...DEFAULT_RESULT, buckets: { ...DEFAULT_RESULT.buckets } };
  const lookbackHours = Math.max(1, Math.min(options.lookbackHours ?? 24, 168));
  const limit = Math.max(10, Math.min(options.limit ?? 300, 2000));
  const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString();

  const supabase = createServiceRoleClient() as any;
  let traceQuery = supabase
    .from("message_traces")
    .select(
      "id, client_id, phone, status, whatsapp_message_id, webhook_received_at, generation_started_at, generation_completed_at, sent_at, agent_response, metadata, created_at",
    )
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options.clientId) {
    traceQuery = traceQuery.eq("client_id", options.clientId);
  }

  const { data: tracesRaw, error: traceError } = await traceQuery;
  if (traceError) {
    throw new Error(`trace_query_failed: ${traceError.message}`);
  }

  const traces = ((tracesRaw ?? []) as TraceRow[]).filter((row) =>
    shouldTrackTrace(row.status),
  );
  result.scanned = traces.length;
  if (!traces.length) {
    return result;
  }

  const phones = Array.from(
    new Set(
      traces
        .map((trace) => normalizePhoneDigits(trace.phone))
        .filter((phone) => phone.length > 0),
    ),
  );
  const wamids = Array.from(
    new Set(
      traces
        .map((trace) => trace.whatsapp_message_id)
        .filter((wamid): wamid is string => !!wamid),
    ),
  );

  let historyByPhone = new Map<string, HistoryRow[]>();
  let historyByWamid = new Map<string, HistoryRow>();

  if (phones.length > 0) {
    let historyQuery = supabase
      .from("n8n_chat_histories")
      .select("id, session_id, wamid, status, message, created_at")
      .gte("created_at", new Date(Date.now() - (lookbackHours + 2) * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(Math.max(limit * 8, 500));

    if (options.clientId) {
      historyQuery = historyQuery.eq("client_id", options.clientId);
    }

    historyQuery = historyQuery.in("session_id", phones);
    const { data: historyRowsRaw, error: historyError } = await historyQuery;
    if (historyError) {
      throw new Error(`history_query_failed: ${historyError.message}`);
    }

    for (const row of (historyRowsRaw ?? []) as HistoryRow[]) {
      const phone = normalizePhoneDigits(row.session_id ?? "");
      if (!phone) continue;
      const items = historyByPhone.get(phone) ?? [];
      items.push(row);
      historyByPhone.set(phone, items);
    }
  }

  if (wamids.length > 0) {
    let wamidQuery = supabase
      .from("n8n_chat_histories")
      .select("id, session_id, wamid, status, message, created_at")
      .in("wamid", wamids)
      .limit(wamids.length + 50);

    if (options.clientId) {
      wamidQuery = wamidQuery.eq("client_id", options.clientId);
    }

    const { data: byWamidRaw, error: wamidError } = await wamidQuery;
    if (wamidError) {
      throw new Error(`history_wamid_query_failed: ${wamidError.message}`);
    }

    for (const row of (byWamidRaw ?? []) as HistoryRow[]) {
      if (row.wamid) historyByWamid.set(row.wamid, row);
    }
  }

  for (const trace of traces) {
    const pendingBucket = classifyPendingBucket(trace);
    result.buckets[pendingBucket] += 1;

    let historyMatch: HistoryMatch | null = null;
    if (trace.whatsapp_message_id) {
      const row = historyByWamid.get(trace.whatsapp_message_id);
      if (row) historyMatch = { source: "wamid", history: row };
    }

    if (!historyMatch) {
      const phoneRows = historyByPhone.get(normalizePhoneDigits(trace.phone)) ?? [];
      const best = pickBestHistoryByPhone(trace, phoneRows);
      if (best) historyMatch = { source: "phone", history: best };
    }

    const patch = buildPatch(trace, pendingBucket, historyMatch);
    const hasChanges = Object.keys(patch).length > 0;
    if (!hasChanges) {
      result.unchanged += 1;
      continue;
    }

    result.changed += 1;
    if (patch.status === "success") result.statusToSuccess += 1;
    if (patch.status === "failed") result.statusToFailed += 1;
    if ((patch.metadata as Record<string, unknown> | undefined)?.pending_bucket) {
      result.pendingBucketUpdated += 1;
    }

    if (options.dryRun) continue;

    const { error: updateError } = await supabase
      .from("message_traces")
      .update(patch)
      .eq("id", trace.id)
      .eq("client_id", trace.client_id);

    if (updateError) {
      result.errors += 1;
      console.error("[trace-reconciliation] failed to update trace", {
        traceId: trace.id,
        clientId: trace.client_id,
        error: updateError.message,
      });
    }
  }

  return result;
}

export async function reconcileTraceForWhatsAppStatus(input: {
  clientId: string;
  wamid: string;
  whatsappStatus: "sent" | "delivered" | "read" | "failed";
  timestampIso?: string | null;
}): Promise<void> {
  const statusLower = input.whatsappStatus.toLowerCase();
  const isSuccess = isSuccessfulWhatsAppStatus(statusLower);
  const isFailure = isFailedWhatsAppStatus(statusLower);
  if (!isSuccess && !isFailure) return;

  const nowIso = input.timestampIso ?? new Date().toISOString();
  try {
    await query(
      `
      UPDATE message_traces
      SET
        status = CASE
          WHEN $3::text IN ('sent', 'delivered', 'read') THEN 'success'
          WHEN $3::text = 'failed' THEN 'failed'
          ELSE status
        END,
        sent_at = CASE
          WHEN $3::text IN ('sent', 'delivered', 'read')
            THEN COALESCE(sent_at, $4::timestamptz)
          ELSE sent_at
        END,
        metadata = COALESCE(metadata, '{}'::jsonb)
          || jsonb_build_object(
            'whatsapp_status', $3::text,
            'whatsapp_status_updated_at', $4::text
          )
      WHERE client_id = $1::uuid
        AND whatsapp_message_id = $2
        AND status IN ('pending', 'success', 'failed')
      `,
      [input.clientId, input.wamid, statusLower, nowIso],
    );
  } catch (error) {
    console.warn("[trace-reconciliation] wamid reconcile failed", {
      clientId: input.clientId,
      wamid: input.wamid,
      status: statusLower,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

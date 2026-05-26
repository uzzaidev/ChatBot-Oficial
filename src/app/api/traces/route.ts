import { query as pgQuery } from "@/lib/postgres";
import { createServiceRoleClient } from "@/lib/supabase";
import { getClientIdFromSession } from "@/lib/supabase-server";
import { classifyPendingBucket, normalizePhoneDigits, type PendingBucket } from "@/lib/trace-status";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const emptyPendingBuckets = (): Record<PendingBucket, number> => ({
  nao_chegou_na_geracao: 0,
  geracao_iniciada_nao_concluida: 0,
  geracao_concluida_sem_envio: 0,
  enviado_sem_status: 0,
  erro_ia: 0,
  outro_pending: 0,
});

// GET /api/traces?from=ISO&to=ISO&phone=X&status=Y&limit=50&offset=0
export async function GET(request: NextRequest) {
  let clientId: string | null = null;

  try {
    const { searchParams } = request.nextUrl;

    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const phone = searchParams.get("phone");
    const status = searchParams.get("status");
    const reviewed = searchParams.get("reviewed") === "true";
    const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 200);
    const offset = Number(searchParams.get("offset") ?? "0");

    // Auth: resolve client_id (supports cookie + bearer token)
    clientId = await getClientIdFromSession(request);
    if (!clientId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Use service-role client to avoid RLS + session-refresh issues on the read path
    const supabase = createServiceRoleClient();

    let query = (supabase as any)
      .from("message_traces")
      .select(
        `id, phone, status, user_message, agent_response, model_used,
         tokens_input, tokens_output, cost_usd,
         latency_total_ms, latency_generation_ms, latency_retrieval_ms, latency_embedding_ms,
         webhook_received_at, generation_started_at, generation_completed_at, sent_at, metadata, created_at`
      )
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);
    if (phone) query = query.eq("phone", phone);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) {
      const message = String(error.message ?? "").toLowerCase();
      if (
        message.includes("does not exist") ||
        message.includes("relation") ||
        message.includes("undefined")
      ) {
        return NextResponse.json(
          {
            error: "traces_tables_missing",
            hint: "Run: supabase db push (migration 20260422130000_create_observability_traces.sql not applied)",
          },
          { status: 503 },
        );
      }
      console.error("[GET /api/traces] DB error:", error);
      return NextResponse.json(
        { error: "db_error", detail: error.message },
        { status: 500 }
      );
    }

    // Cost aggregation for the current day
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: costData } = await (supabase as any)
      .from("message_traces")
      .select("cost_usd")
      .eq("client_id", clientId)
      .gte("created_at", today.toISOString());

    const costToday = (costData ?? []).reduce(
      (sum: number, row: { cost_usd: number | null }) =>
        sum + (row.cost_usd ?? 0),
      0
    );

    const pendingBuckets = emptyPendingBuckets();
    for (const row of data ?? []) {
      if (row.status !== "pending") continue;
      const bucket = classifyPendingBucket({
        status: row.status,
        generation_started_at: row.generation_started_at,
        generation_completed_at: row.generation_completed_at,
        sent_at: row.sent_at,
        metadata: row.metadata,
      });
      pendingBuckets[bucket] += 1;
    }

    const statusCounts = (data ?? []).reduce(
      (acc: Record<string, number>, row: { status: string }) => {
        acc[row.status] = (acc[row.status] ?? 0) + 1;
        return acc;
      },
      {},
    );

    let rows = data ?? [];

    const normalizedPhones = Array.from(
      new Set(
        rows
          .map((row: { phone: string }) => normalizePhoneDigits(row.phone))
          .filter((phone: string) => phone.length > 0),
      ),
    );

    let contactNamesByPhone = new Map<string, string>();
    let feedbackByTraceId = new Map<string, number>();

    let metadataCoverage: {
      contatos_no_periodo: number;
      com_email: number;
      com_cpf: number;
      com_objetivo: number;
      com_experiencia: number;
      com_periodo_ou_dia: number;
    } | null = null;

    if (normalizedPhones.length > 0) {
      try {
        const coverage = await pgQuery<{
          contatos_no_periodo: number;
          com_email: number;
          com_cpf: number;
          com_objetivo: number;
          com_experiencia: number;
          com_periodo_ou_dia: number;
        }>(
          `
          WITH phones AS (
            SELECT UNNEST($1::text[]) AS phone
          ),
          contacts AS (
            SELECT
              regexp_replace(telefone::text, '\\D', '', 'g') AS phone,
              metadata
            FROM clientes_whatsapp
            WHERE client_id = $2
          )
          SELECT
            COUNT(*)::int AS contatos_no_periodo,
            COUNT(*) FILTER (WHERE NULLIF(COALESCE(c.metadata->>'email', ''), '') IS NOT NULL)::int AS com_email,
            COUNT(*) FILTER (WHERE NULLIF(COALESCE(c.metadata->>'cpf', ''), '') IS NOT NULL)::int AS com_cpf,
            COUNT(*) FILTER (WHERE NULLIF(COALESCE(c.metadata->>'objetivo', ''), '') IS NOT NULL)::int AS com_objetivo,
            COUNT(*) FILTER (
              WHERE NULLIF(COALESCE(c.metadata->>'experiencia', c.metadata->>'experiencia_yoga', ''), '') IS NOT NULL
            )::int AS com_experiencia,
            COUNT(*) FILTER (
              WHERE NULLIF(COALESCE(c.metadata->>'periodo_preferido', c.metadata->>'dia_preferido', ''), '') IS NOT NULL
            )::int AS com_periodo_ou_dia
          FROM phones p
          LEFT JOIN contacts c ON c.phone = p.phone
          `,
          [normalizedPhones, clientId],
        );
        metadataCoverage = coverage.rows[0] ?? null;
      } catch (coverageError) {
        console.warn("[GET /api/traces] metadata coverage query failed", {
          clientId,
          error:
            coverageError instanceof Error
              ? coverageError.message
              : String(coverageError),
        });
      }

      try {
        const contacts = await pgQuery<{
          phone: string;
          name: string | null;
        }>(
          `
          SELECT DISTINCT ON (regexp_replace(telefone::text, '\\D', '', 'g'))
            regexp_replace(telefone::text, '\\D', '', 'g') AS phone,
            nome AS name
          FROM clientes_whatsapp
          WHERE client_id = $2
            AND regexp_replace(telefone::text, '\\D', '', 'g') = ANY($1::text[])
          ORDER BY regexp_replace(telefone::text, '\\D', '', 'g'), updated_at DESC NULLS LAST
          `,
          [normalizedPhones, clientId],
        );
        contactNamesByPhone = new Map(
          contacts.rows
            .filter((row) => row.phone)
            .map((row) => [row.phone, row.name?.trim() || "Sem nome"]),
        );
      } catch (contactsError) {
        console.warn("[GET /api/traces] contact names query failed", {
          clientId,
          error:
            contactsError instanceof Error
              ? contactsError.message
              : String(contactsError),
        });
      }
    }

    const traceIds = rows.map((row: { id: string }) => row.id);
    if (traceIds.length > 0) {
      try {
        const feedback = await pgQuery<{ trace_id: string; count: number }>(
          `
          SELECT trace_id, COUNT(*)::int AS count
          FROM public.message_feedback
          WHERE client_id = $1
            AND trace_id = ANY($2::uuid[])
          GROUP BY trace_id
          `,
          [clientId, traceIds],
        );
        feedbackByTraceId = new Map(
          feedback.rows.map((row) => [row.trace_id, Number(row.count) || 0]),
        );
      } catch (feedbackError) {
        const msg =
          feedbackError instanceof Error
            ? feedbackError.message
            : String(feedbackError);
        if (!msg.toLowerCase().includes("message_feedback")) {
          console.warn("[GET /api/traces] feedback query failed", {
            clientId,
            error: msg,
          });
        }
      }
    }

    rows = rows.map((row: { id: string; phone: string }) => {
      const normalizedPhone = normalizePhoneDigits(row.phone);
      const feedbackCount = feedbackByTraceId.get(row.id) ?? 0;
      return {
        ...row,
        contact_name: contactNamesByPhone.get(normalizedPhone) ?? null,
        feedback_count: feedbackCount,
        has_feedback: feedbackCount > 0,
      };
    });

    if (reviewed) {
      rows = rows.filter((row: { has_feedback?: boolean }) => row.has_feedback);
    }

    return NextResponse.json({
      data: rows,
      meta: {
        limit,
        offset,
        costTodayUsd: Number(costToday.toFixed(6)),
        statusCounts,
        pendingBuckets,
        metadataCoverage,
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[GET /api/traces] Unexpected error (clientId=%s):", clientId, error);
    return NextResponse.json(
      { error: "internal_server_error", detail },
      { status: 500 }
    );
  }
}

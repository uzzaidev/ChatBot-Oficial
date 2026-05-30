import { getCurrentUserRole } from "@/lib/auth-helpers";
import { query } from "@/lib/postgres";
import { getClientIdFromSession } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const VALID_FEEDBACK = ["like", "dislike", "bug"] as const;
type FeedbackType = (typeof VALID_FEEDBACK)[number];

const normalizePhone = (phone: string) => phone.replace(/\D/g, "");

const resolveTraceId = async ({
  clientId,
  phone,
  wamid,
  timestamp,
}: {
  clientId: string;
  phone: string;
  wamid?: string | null;
  timestamp?: string | null;
}) => {
  if (wamid) {
    const byWamid = await query<{ id: string }>(
      `
      SELECT id
      FROM public.message_traces
      WHERE client_id = $1
        AND whatsapp_message_id = $2
      LIMIT 1
      `,
      [clientId, wamid],
    );
    if (byWamid.rows[0]?.id) return byWamid.rows[0].id;
  }

  if (!timestamp) return null;

  const byTime = await query<{ id: string }>(
    `
    SELECT id
    FROM public.message_traces
    WHERE client_id = $1
      AND regexp_replace(phone::text, '\\D', '', 'g') = $2
      AND created_at BETWEEN ($3::timestamptz - interval '10 minutes')
                         AND ($3::timestamptz + interval '10 minutes')
    ORDER BY ABS(EXTRACT(EPOCH FROM (created_at - $3::timestamptz))) ASC
    LIMIT 1
    `,
    [clientId, normalizePhone(phone), timestamp],
  );

  return byTime.rows[0]?.id ?? null;
};

export async function GET(request: NextRequest) {
  const roleResult = await getCurrentUserRole(request as any);
  if (roleResult.ok === false) {
    return roleResult.response;
  }

  const { role, clientId } = roleResult.context;
  const isSuperAdmin = role === "admin";

  if (!isSuperAdmin && !clientId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "all";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)),
  );
  const offset = (page - 1) * limit;

  try {
    const whereConditions: string[] = [];
    const countParams: (string | number)[] = [];

    if (!isSuperAdmin) {
      countParams.push(clientId!);
      whereConditions.push(`mf.client_id = $${countParams.length}`);
    }

    if (type !== "all" && VALID_FEEDBACK.includes(type as FeedbackType)) {
      countParams.push(type);
      whereConditions.push(`mf.feedback = $${countParams.length}`);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    const countResult = await query<{ total: string }>(
      `SELECT COUNT(*) as total FROM public.message_feedback mf ${whereClause}`,
      countParams,
    );
    const total = parseInt(countResult.rows[0]?.total ?? "0", 10);

    const dataParams = [...countParams, limit, offset];
    const dataResult = await query<Record<string, unknown>>(
      `
      SELECT
        mf.id,
        mf.client_id,
        mf.trace_id,
        mf.phone,
        mf.message_id,
        mf.wamid,
        mf.message_content,
        mf.message_direction,
        mf.feedback,
        mf.observations,
        mf.created_at,
        mf.updated_at
        ${isSuperAdmin ? ", c.name as client_name" : ""}
      FROM public.message_feedback mf
      ${isSuperAdmin ? "LEFT JOIN public.clients c ON c.id = mf.client_id" : ""}
      ${whereClause}
      ORDER BY mf.created_at DESC
      LIMIT $${countParams.length + 1} OFFSET $${countParams.length + 2}
      `,
      dataParams,
    );

    return NextResponse.json({
      data: dataResult.rows,
      total,
      page,
      limit,
      is_super_admin: isSuperAdmin,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[GET /api/message-feedback]", error);
    return NextResponse.json(
      { error: "Erro ao buscar feedbacks.", detail },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const clientId = await getClientIdFromSession(request as any);
  if (!clientId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    messageId?: string;
    wamid?: string | null;
    phone?: string;
    content?: string;
    direction?: string;
    traceId?: string | null;
    timestamp?: string | null;
    feedback?: string;
    observations?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body invalido." }, { status: 400 });
  }

  if (!body.messageId?.trim()) {
    return NextResponse.json(
      { error: "messageId e obrigatorio." },
      { status: 400 },
    );
  }

  if (!body.phone?.trim()) {
    return NextResponse.json(
      { error: "phone e obrigatorio." },
      { status: 400 },
    );
  }

  if (!body.content?.trim()) {
    return NextResponse.json(
      { error: "content e obrigatorio." },
      { status: 400 },
    );
  }

  if (!VALID_FEEDBACK.includes(body.feedback as FeedbackType)) {
    return NextResponse.json(
      { error: "feedback deve ser 'like', 'dislike' ou 'bug'." },
      { status: 400 },
    );
  }

  try {
    const traceId =
      body.traceId ??
      (await resolveTraceId({
        clientId,
        phone: body.phone,
        wamid: body.wamid,
        timestamp: body.timestamp,
      }));

    const result = await query<{ id: string; trace_id: string | null }>(
      `
      INSERT INTO public.message_feedback (
        client_id,
        trace_id,
        message_id,
        wamid,
        phone,
        message_content,
        message_direction,
        feedback,
        observations,
        metadata,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULLIF($9, ''), $10::jsonb, NOW())
      ON CONFLICT (client_id, message_id)
      DO UPDATE SET
        trace_id = COALESCE(EXCLUDED.trace_id, public.message_feedback.trace_id),
        wamid = COALESCE(EXCLUDED.wamid, public.message_feedback.wamid),
        message_content = EXCLUDED.message_content,
        message_direction = EXCLUDED.message_direction,
        feedback = EXCLUDED.feedback,
        observations = EXCLUDED.observations,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING id, trace_id
      `,
      [
        clientId,
        traceId,
        body.messageId,
        body.wamid ?? null,
        body.phone,
        body.content.trim(),
        body.direction ?? "outgoing",
        body.feedback,
        body.observations?.trim() ?? "",
        JSON.stringify({
          source: "conversation_ui",
          timestamp: body.timestamp ?? null,
        }),
      ],
    );

    return NextResponse.json({
      id: result.rows[0]?.id,
      trace_id: result.rows[0]?.trace_id ?? traceId,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[POST /api/message-feedback]", error);
    return NextResponse.json(
      { error: "Erro ao salvar feedback.", detail },
      { status: 500 },
    );
  }
}

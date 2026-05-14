/**
 * POST /api/assistant/feedback
 *   Saves user feedback (like / dislike / bug) on an AI assistant response.
 *   Body: { conversationId?, question?, sqlQuery?, response, feedback, observations? }
 *
 * PATCH /api/assistant/feedback
 *   Updates an existing feedback record (change kind or observations).
 *   Body: { id, feedback, observations? }
 *
 * GET /api/assistant/feedback
 *   Returns paginated feedback list.
 *   - For regular users: filtered by their client_id.
 *   - For super admin (role === "admin"): returns ALL clients with client_name column.
 *   Query params: type (like|dislike|bug|all), page, limit
 */

import { NextRequest, NextResponse } from "next/server";

import { getCurrentUserRole } from "@/lib/auth-helpers";
import {
  createServiceClient,
  getClientIdFromSession,
} from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const VALID_FEEDBACK = ["like", "dislike", "bug"] as const;
type FeedbackType = (typeof VALID_FEEDBACK)[number];

export async function POST(request: NextRequest) {
  const clientId = await getClientIdFromSession(request);
  if (!clientId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    conversationId?: string;
    question?: string;
    sqlQuery?: string;
    response?: string;
    feedback?: string;
    observations?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const {
    conversationId,
    question,
    sqlQuery,
    response,
    feedback,
    observations,
  } = body;

  if (!response?.trim()) {
    return NextResponse.json(
      { error: "response é obrigatório." },
      { status: 400 },
    );
  }

  if (!VALID_FEEDBACK.includes(feedback as FeedbackType)) {
    return NextResponse.json(
      { error: "feedback deve ser 'like', 'dislike' ou 'bug'." },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any;

  const { data, error } = await supabaseAny
    .from("assistant_feedback")
    .insert({
      client_id: clientId,
      conversation_id: conversationId ?? null,
      question: question?.trim() ?? null,
      sql_query: sqlQuery ?? null,
      response: response.trim(),
      feedback,
      observations: observations?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[assistant/feedback]", error);
    return NextResponse.json(
      { error: "Erro ao salvar feedback." },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: data.id });
}

export async function PATCH(request: NextRequest) {
  const clientId = await getClientIdFromSession(request);
  if (!clientId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { id?: string; feedback?: string; observations?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const { id, feedback, observations } = body;

  if (!id?.trim()) {
    return NextResponse.json({ error: "id é obrigatório." }, { status: 400 });
  }

  if (!VALID_FEEDBACK.includes(feedback as FeedbackType)) {
    return NextResponse.json(
      { error: "feedback deve ser 'like', 'dislike' ou 'bug'." },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any;

  const { error } = await supabaseAny
    .from("assistant_feedback")
    .update({
      feedback,
      observations: observations?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    // Ensure users can only update their own client's feedback
    .eq("id", id)
    .eq("client_id", clientId);

  if (error) {
    console.error("[assistant/feedback PATCH]", error);
    return NextResponse.json(
      { error: "Erro ao atualizar feedback." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  // Detect role — super admin sees all clients
  const roleResult = await getCurrentUserRole(request);
  if (roleResult.ok === false) {
    return roleResult.response;
  }

  const { role, clientId } = roleResult.context;
  const isSuperAdmin = role === "admin";

  // Non-admin must have a clientId
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
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const supabase = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any;

  // Super admin: join clients table for name; regular user: filter by client_id
  const selectCols = isSuperAdmin
    ? "id, feedback, question, response, sql_query, observations, conversation_id, created_at, client_id, clients(name)"
    : "id, feedback, question, response, sql_query, observations, conversation_id, created_at";

  let query = supabaseAny
    .from("assistant_feedback")
    .select(selectCols, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (!isSuperAdmin) {
    query = query.eq("client_id", clientId);
  }

  if (type !== "all" && VALID_FEEDBACK.includes(type as FeedbackType)) {
    query = query.eq("feedback", type);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("[assistant/feedback GET]", error);
    return NextResponse.json(
      { error: "Erro ao buscar feedbacks." },
      { status: 500 },
    );
  }

  // Flatten clients(name) → client_name for easier consumption
  const rows = (data ?? []).map(
    (row: Record<string, unknown> & { clients?: { name?: string } | null }) => {
      const { clients, ...rest } = row;
      return { ...rest, client_name: clients?.name ?? null };
    },
  );

  return NextResponse.json({
    data: rows,
    total: count ?? 0,
    page,
    limit,
    is_super_admin: isSuperAdmin,
  });
}

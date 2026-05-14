/**
 * POST /api/assistant/feedback
 *   Saves user feedback (like / dislike / bug) on an AI assistant response.
 *   Body: { conversationId?, question?, sqlQuery?, response, feedback, observations? }
 *
 * GET /api/assistant/feedback
 *   Returns paginated feedback list for the authenticated client.
 *   Query params: type (like|dislike|bug|all), page, limit
 */

import { NextRequest, NextResponse } from "next/server";

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

export async function GET(request: NextRequest) {
  const clientId = await getClientIdFromSession(request);
  if (!clientId) {
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

  let query = supabaseAny
    .from("assistant_feedback")
    .select(
      "id, feedback, question, response, sql_query, observations, conversation_id, created_at",
      { count: "exact" },
    )
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .range(from, to);

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

  return NextResponse.json({ data, total: count ?? 0, page, limit });
}

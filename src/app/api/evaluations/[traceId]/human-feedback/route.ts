import { generateEmbedding } from "@/lib/openai";
import {
  createRouteHandlerClient,
  getClientIdFromSession,
} from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  verdict: z.enum(["correct", "incorrect", "partial"]),
  correction_text: z.string().trim().max(10000).optional(),
  reason: z.string().trim().max(500).optional(),
  error_category: z
    .enum([
      "wrong_chunk",
      "bad_generation",
      "missing_info",
      "hallucination",
      "gt_outdated",
      "other",
    ])
    .optional(),
  promote_to_ground_truth: z.boolean().default(false),
});

const getUserIdFromRequest = async (request: NextRequest) => {
  const supabase = await createRouteHandlerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
};

const toEmbeddingLiteral = (embedding: number[]) => `[${embedding.join(",")}]`;

const submitLegacy = async ({
  supabase,
  traceId,
  clientId,
  userId,
  body,
  trace,
  embedding,
}: {
  supabase: any;
  traceId: string;
  clientId: string;
  userId: string;
  body: z.infer<typeof BodySchema>;
  trace: { user_message: string };
  embedding: number[] | null;
}) => {
  const { data: evaluation } = await (supabase as any)
    .from("agent_evaluations")
    .select("id")
    .eq("trace_id", traceId)
    .eq("client_id", clientId)
    .maybeSingle();

  let groundTruthId: string | null = null;
  if (body.promote_to_ground_truth && body.correction_text) {
    const { data: gt, error: gtError } = await (supabase as any)
      .from("ground_truth")
      .insert({
        client_id: clientId,
        user_query: trace.user_message,
        expected_response: body.correction_text,
        query_embedding: embedding,
        source: "operator_correction",
        source_trace_id: traceId,
        created_by: userId,
        confidence: 0.85,
        version: 1,
        metadata: {
          promoted_from_human_feedback: true,
          feedback_reason: body.reason ?? null,
          feedback_error_category: body.error_category ?? null,
        },
      })
      .select("id")
      .single();

    if (gtError || !gt) throw gtError;
    groundTruthId = gt.id;
  }

  const { data: feedback, error: feedbackError } = await (supabase as any)
    .from("human_feedback")
    .upsert(
      {
        trace_id: traceId,
        evaluation_id: evaluation?.id ?? null,
        client_id: clientId,
        operator_id: userId,
        verdict: body.verdict,
        correction_text: body.correction_text ?? null,
        reason: body.reason ?? null,
        error_category: body.error_category ?? null,
        marked_as_ground_truth: body.promote_to_ground_truth,
        ground_truth_id: groundTruthId,
        metadata: {},
      },
      { onConflict: "trace_id,operator_id" },
    )
    .select("*")
    .single();

  if (feedbackError || !feedback) throw feedbackError;

  await (supabase as any)
    .from("message_traces")
    .update({ status: "human_reviewed" })
    .eq("id", traceId)
    .eq("client_id", clientId);

  return feedback;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ traceId: string }> },
) {
  try {
    const { traceId } = await params;
    const clientId = await getClientIdFromSession(request);
    const userId = await getUserIdFromRequest(request);
    if (!clientId || !userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = BodySchema.parse(await request.json());
    if (body.promote_to_ground_truth && !body.correction_text) {
      return NextResponse.json(
        { error: "correction_text_required_for_promote" },
        { status: 400 },
      );
    }

    const supabase = await createRouteHandlerClient(request);

    const { data: trace, error: traceError } = await (supabase as any)
      .from("message_traces")
      .select("id, user_message")
      .eq("id", traceId)
      .eq("client_id", clientId)
      .single();

    if (traceError || !trace) {
      return NextResponse.json({ error: "trace_not_found" }, { status: 404 });
    }

    let embedding: number[] | null = null;
    let embeddingLiteral: string | null = null;
    if (body.promote_to_ground_truth && body.correction_text) {
      const generated = await generateEmbedding(
        trace.user_message ?? "",
        undefined,
        clientId,
      );
      embedding = generated.embedding;

      if (!Array.isArray(embedding) || embedding.length !== 1536) {
        return NextResponse.json(
          { error: "invalid_embedding_dimensions" },
          { status: 500 },
        );
      }

      embeddingLiteral = toEmbeddingLiteral(embedding);
    }

    let feedback: any | null = null;

    if (typeof (supabase as any).rpc === "function") {
      const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
        "submit_human_feedback_atomic",
        {
          p_trace_id: traceId,
          p_client_id: clientId,
          p_operator_id: userId,
          p_verdict: body.verdict,
          p_correction_text: body.correction_text ?? null,
          p_reason: body.reason ?? null,
          p_error_category: body.error_category ?? null,
          p_promote_to_ground_truth: body.promote_to_ground_truth,
          p_ground_truth_expected_response: body.correction_text ?? null,
          p_query_embedding_text: embeddingLiteral,
          p_metadata: {
            promoted_from_human_feedback: body.promote_to_ground_truth,
            feedback_reason: body.reason ?? null,
            feedback_error_category: body.error_category ?? null,
          },
        },
      );

      if (!rpcError && rpcData) {
        feedback = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      } else if (rpcError) {
        const rpcMessage = String(rpcError.message ?? "").toLowerCase();
        if (
          rpcMessage.includes("function") &&
          rpcMessage.includes("does not exist")
        ) {
          console.warn(
            "[human-feedback] submit_human_feedback_atomic RPC not found, using legacy path",
          );
        } else if (rpcMessage.includes("trace_not_found")) {
          return NextResponse.json({ error: "trace_not_found" }, { status: 404 });
        } else {
          throw rpcError;
        }
      }
    }

    if (!feedback) {
      feedback = await submitLegacy({
        supabase,
        traceId,
        clientId,
        userId,
        body,
        trace,
        embedding,
      });
    }

    return NextResponse.json({ data: feedback });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "invalid_body", details: error.flatten() },
        { status: 400 },
      );
    }

    const message = String((error as any)?.message ?? "").toLowerCase();
    if (message.includes("does not exist") || message.includes("relation")) {
      return NextResponse.json(
        {
          error: "human_feedback_table_missing",
          hint: "Apply migrations 20260513120000_create_human_feedback.sql and 20260513123000_add_submit_human_feedback_atomic_rpc.sql",
        },
        { status: 503 },
      );
    }

    console.error("[POST /api/evaluations/[traceId]/human-feedback]", error);
    return NextResponse.json({ error: "internal_server_error" }, { status: 500 });
  }
}

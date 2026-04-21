import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createRouteHandlerClient,
  getClientIdFromSession,
} from "@/lib/supabase-server";
import { generateEmbedding } from "@/lib/openai";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  trace_id: z.string().uuid(),
  expected_response: z.string().trim().min(1).max(10000),
  category: z.string().trim().max(80).optional(),
  subcategory: z.string().trim().max(80).optional(),
  tags: z.array(z.string().trim().max(40)).max(20).default([]),
  confidence: z.number().min(0).max(1).default(0.8),
});

const getUserIdFromRequest = async (request: NextRequest) => {
  const supabase = await createRouteHandlerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
};

export async function POST(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request);
    const userId = await getUserIdFromRequest(request);
    if (!clientId || !userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = BodySchema.parse(await request.json());
    const supabase = await createRouteHandlerClient(request);

    const { data: trace, error: traceError } = await (supabase as any)
      .from("message_traces")
      .select("id, user_message, client_id")
      .eq("id", body.trace_id)
      .eq("client_id", clientId)
      .single();

    if (traceError || !trace) {
      return NextResponse.json({ error: "trace_not_found" }, { status: 404 });
    }

    const query = String(trace.user_message ?? "").trim();
    if (!query) {
      return NextResponse.json(
        { error: "trace_has_no_user_message" },
        { status: 400 },
      );
    }

    const { embedding } = await generateEmbedding(query, undefined, clientId);
    if (embedding.length !== 1536) {
      return NextResponse.json(
        { error: "invalid_embedding_dimensions" },
        { status: 500 },
      );
    }

    const { data, error } = await (supabase as any)
      .from("ground_truth")
      .insert({
        client_id: clientId,
        user_query: query,
        expected_response: body.expected_response,
        query_embedding: embedding,
        category: body.category ?? null,
        subcategory: body.subcategory ?? null,
        tags: body.tags,
        confidence: body.confidence,
        source: "operator_correction",
        source_trace_id: body.trace_id,
        metadata: { from_trace: true },
        created_by: userId,
        version: 1,
      })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "invalid_body", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("[POST /api/ground-truth/from-trace]", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 },
    );
  }
}

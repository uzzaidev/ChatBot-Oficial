import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createRouteHandlerClient,
  getClientIdFromSession,
} from "@/lib/supabase-server";
import { generateEmbedding } from "@/lib/openai";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  user_query: z.string().trim().min(1).max(2000).optional(),
  expected_response: z.string().trim().min(1).max(10000).optional(),
  category: z.string().trim().max(80).nullable().optional(),
  subcategory: z.string().trim().max(80).nullable().optional(),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
  confidence: z.number().min(0).max(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const getUserIdFromRequest = async (request: NextRequest) => {
  const supabase = await createRouteHandlerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const clientId = await getClientIdFromSession(request);
    const userId = await getUserIdFromRequest(request);
    if (!clientId || !userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const payload = PatchSchema.parse(await request.json());
    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: "empty_patch" }, { status: 400 });
    }

    const supabase = await createRouteHandlerClient(request);
    const { data: original, error: getError } = await (supabase as any)
      .from("ground_truth")
      .select("*")
      .eq("id", id)
      .eq("client_id", clientId)
      .single();

    if (getError || !original) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const nextUserQuery = payload.user_query ?? original.user_query;
    const nextExpectedResponse =
      payload.expected_response ?? original.expected_response;
    const nextCategory =
      payload.category !== undefined ? payload.category : original.category;
    const nextSubcategory =
      payload.subcategory !== undefined
        ? payload.subcategory
        : original.subcategory;
    const nextTags = payload.tags ?? original.tags ?? [];
    const nextConfidence = payload.confidence ?? original.confidence;
    const nextMetadata = payload.metadata ?? original.metadata ?? {};

    let nextEmbedding = original.query_embedding;
    if (payload.user_query && payload.user_query !== original.user_query) {
      const embeddingResult = await generateEmbedding(
        nextUserQuery,
        undefined,
        clientId,
      );
      if (embeddingResult.embedding.length !== 1536) {
        return NextResponse.json(
          { error: "invalid_embedding_dimensions" },
          { status: 500 },
        );
      }
      nextEmbedding = embeddingResult.embedding;
    }

    const { data: newVersion, error: insertError } = await (supabase as any)
      .from("ground_truth")
      .insert({
        client_id: clientId,
        user_query: nextUserQuery,
        expected_response: nextExpectedResponse,
        query_embedding: nextEmbedding,
        category: nextCategory,
        subcategory: nextSubcategory,
        tags: nextTags,
        confidence: nextConfidence,
        source: "manual",
        source_trace_id: original.source_trace_id ?? null,
        metadata: nextMetadata,
        created_by: userId,
        version: Number(original.version ?? 1) + 1,
        parent_id: original.id,
      })
      .select("*")
      .single();

    if (insertError || !newVersion) throw insertError;

    const { error: updateError } = await (supabase as any)
      .from("ground_truth")
      .update({
        is_active: false,
        superseded_by: newVersion.id,
      })
      .eq("id", original.id)
      .eq("client_id", clientId);

    if (updateError) throw updateError;

    return NextResponse.json({ data: newVersion });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "invalid_body", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("[PATCH /api/ground-truth/[id]]", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const clientId = await getClientIdFromSession(request);
    if (!clientId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const supabase = await createRouteHandlerClient(request);
    const { error } = await (supabase as any)
      .from("ground_truth")
      .update({ is_active: false })
      .eq("id", id)
      .eq("client_id", clientId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/ground-truth/[id]]", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 },
    );
  }
}

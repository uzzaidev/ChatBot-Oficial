import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createRouteHandlerClient,
  getClientIdFromSession,
} from "@/lib/supabase-server";
import { generateEmbedding } from "@/lib/openai";

export const dynamic = "force-dynamic";

const ItemSchema = z.object({
  trace_id: z.string().uuid(),
  expected_response: z.string().trim().min(1).max(10000).optional(),
  category: z.string().trim().max(80).optional(),
  subcategory: z.string().trim().max(80).optional(),
  tags: z.array(z.string().trim().max(40)).max(20).default([]),
  confidence: z.number().min(0).max(1).default(0.8),
});

const BodySchema = z.object({
  items: z.array(ItemSchema).min(1).max(30),
});

type BulkItem = z.infer<typeof ItemSchema>;

export async function POST(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request);
    if (!clientId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const routeClient = await createRouteHandlerClient(request);
    const {
      data: { user },
    } = await routeClient.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = BodySchema.parse(await request.json());
    const traceIds = Array.from(new Set(body.items.map((item) => item.trace_id)));

    const { data: traces, error: traceError } = await (routeClient as any)
      .from("message_traces")
      .select("id, user_message, agent_response, client_id")
      .in("id", traceIds)
      .eq("client_id", clientId);

    if (traceError) throw traceError;

    const { data: existingGtRows, error: existingError } = await (routeClient as any)
      .from("ground_truth")
      .select("source_trace_id")
      .eq("client_id", clientId)
      .in("source_trace_id", traceIds);

    if (existingError) throw existingError;

    const traceMap = new Map<string, { id: string; user_message: string | null; agent_response: string | null }>(
      (traces ?? []).map((trace: any) => [
        trace.id,
        {
          id: trace.id,
          user_message: trace.user_message ?? null,
          agent_response: trace.agent_response ?? null,
        },
      ]),
    );
    const existingTraceIds = new Set(
      (existingGtRows ?? [])
        .map((row: any) => row.source_trace_id)
        .filter((id: string | null): id is string => Boolean(id)),
    );

    const batchId = crypto.randomUUID();
    const created: Array<{ trace_id: string; ground_truth_id: string }> = [];
    const skipped: Array<{ trace_id: string; reason: string }> = [];
    const failed: Array<{ trace_id: string; reason: string }> = [];

    for (const item of body.items as BulkItem[]) {
      const trace = traceMap.get(item.trace_id);
      if (!trace) {
        skipped.push({ trace_id: item.trace_id, reason: "trace_not_found" });
        continue;
      }
      if (existingTraceIds.has(item.trace_id)) {
        skipped.push({ trace_id: item.trace_id, reason: "already_promoted" });
        continue;
      }

      const userQuery = String(trace.user_message ?? "").trim();
      if (!userQuery) {
        skipped.push({ trace_id: item.trace_id, reason: "trace_has_no_user_message" });
        continue;
      }

      const expectedResponse = String(
        item.expected_response ?? trace.agent_response ?? "",
      ).trim();
      if (!expectedResponse) {
        skipped.push({ trace_id: item.trace_id, reason: "missing_expected_response" });
        continue;
      }

      try {
        const { embedding } = await generateEmbedding(userQuery, undefined, clientId);
        if (embedding.length !== 1536) {
          failed.push({ trace_id: item.trace_id, reason: "invalid_embedding_dimensions" });
          continue;
        }

        const { data: inserted, error: insertError } = await (routeClient as any)
          .from("ground_truth")
          .insert({
            client_id: clientId,
            user_query: userQuery,
            expected_response: expectedResponse,
            query_embedding: embedding,
            category: item.category ?? null,
            subcategory: item.subcategory ?? null,
            tags: item.tags ?? [],
            confidence: item.confidence ?? 0.8,
            source: "operator_correction",
            source_trace_id: item.trace_id,
            metadata: {
              from_trace: true,
              from_trace_bulk: true,
              batch_id: batchId,
            },
            created_by: user.id,
            version: 1,
          })
          .select("id")
          .single();

        if (insertError) {
          failed.push({ trace_id: item.trace_id, reason: insertError.message });
          continue;
        }

        created.push({
          trace_id: item.trace_id,
          ground_truth_id: inserted.id,
        });
      } catch (error) {
        failed.push({
          trace_id: item.trace_id,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return NextResponse.json({
      success: true,
      batch_id: batchId,
      summary: {
        requested: body.items.length,
        created: created.length,
        skipped: skipped.length,
        failed: failed.length,
      },
      created,
      skipped,
      failed,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "invalid_body", details: error.flatten() },
        { status: 400 },
      );
    }

    console.error("[POST /api/ground-truth/from-trace/bulk]", error);
    return NextResponse.json(
      {
        error: "internal_server_error",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

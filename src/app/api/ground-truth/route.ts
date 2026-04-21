import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase";
import { getClientIdFromSession } from "@/lib/supabase-server";
import { generateEmbedding } from "@/lib/openai";

export const dynamic = "force-dynamic";

const ListSchema = z.object({
  category: z.string().trim().min(1).optional(),
  active: z.enum(["true", "false"]).optional(),
  search: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const CreateSchema = z.object({
  user_query: z.string().trim().min(1).max(2000),
  expected_response: z.string().trim().min(1).max(10000),
  category: z.string().trim().max(80).optional(),
  subcategory: z.string().trim().max(80).optional(),
  tags: z.array(z.string().trim().max(40)).max(20).default([]),
  confidence: z.number().min(0).max(1).default(0.7),
  source: z
    .enum(["manual", "mined", "synthetic", "operator_correction"])
    .default("manual"),
  source_trace_id: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const getUserIdFromRequest = async (request: NextRequest) => {
  const supabase = createServiceRoleClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
};

export async function GET(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request);
    if (!clientId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
    const params = ListSchema.parse(Object.fromEntries(request.nextUrl.searchParams));

    let query = (supabase as any)
      .from("ground_truth")
      .select("*", { count: "exact" })
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .range(params.offset, params.offset + params.limit - 1);

    if (params.category) query = query.eq("category", params.category);
    if (params.active) query = query.eq("is_active", params.active === "true");
    if (params.search) {
      query = query.or(
        `user_query.ilike.%${params.search}%,expected_response.ilike.%${params.search}%`,
      );
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({
      data: data ?? [],
      meta: {
        total: count ?? 0,
        limit: params.limit,
        offset: params.offset,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "invalid_query_params", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("[GET /api/ground-truth]", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request);
    if (!clientId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = CreateSchema.parse(await request.json());
    const { embedding } = await generateEmbedding(
      body.user_query,
      undefined,
      clientId,
    );
    if (embedding.length !== 1536) {
      return NextResponse.json(
        { error: "invalid_embedding_dimensions" },
        { status: 500 },
      );
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await (supabase as any)
      .from("ground_truth")
      .insert({
        client_id: clientId,
        user_query: body.user_query,
        expected_response: body.expected_response,
        query_embedding: embedding,
        category: body.category ?? null,
        subcategory: body.subcategory ?? null,
        tags: body.tags,
        confidence: body.confidence,
        source: body.source,
        source_trace_id: body.source_trace_id ?? null,
        metadata: body.metadata ?? {},
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
    console.error("[POST /api/ground-truth]", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 },
    );
  }
}

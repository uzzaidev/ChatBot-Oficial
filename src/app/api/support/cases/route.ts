import { getClientIdFromSession } from "@/lib/supabase-server";
import {
  classifySupportCase,
  isLikelySupportMessage,
  upsertSupportCase,
} from "@/lib/support-cases";
import { createServiceRoleClient } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  trace_id: z.string().uuid().optional(),
  conversation_id: z.string().uuid().optional(),
  phone: z.string().min(3),
  user_message: z.string().trim().min(1),
  agent_response: z.string().trim().optional(),
  detected_intent: z.string().trim().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request);
    if (!clientId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const sp = request.nextUrl.searchParams;
    const status = sp.get("status");
    const severity = sp.get("severity");
    const rootCause = sp.get("rootCause");
    const search = sp.get("search");
    const limit = Math.min(Number(sp.get("limit") ?? "50"), 200);
    const offset = Number(sp.get("offset") ?? "0");

    const supabase = createServiceRoleClient() as any;
    let query = supabase
      .from("support_cases")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (severity) query = query.eq("severity", severity);
    if (rootCause) query = query.eq("root_cause_type", rootCause);
    if (search && search.trim().length > 0) {
      const safeSearch = search.trim();
      query = query.or(
        `user_message.ilike.%${safeSearch}%,recommended_action.ilike.%${safeSearch}%`,
      );
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      data: data ?? [],
      meta: { limit, offset },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "internal_server_error", detail: String(error) },
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

    const body = CreateSchema.parse(await request.json());
    const shouldCreate = isLikelySupportMessage(
      body.user_message,
      body.detected_intent,
    );

    if (!shouldCreate) {
      return NextResponse.json({ created: false, reason: "not_support" });
    }

    const classification = classifySupportCase({
      userMessage: body.user_message,
      agentResponse: body.agent_response,
      intent: body.detected_intent,
      flowMetadata: body.metadata,
    });

    const result = await upsertSupportCase({
      client_id: clientId,
      trace_id: body.trace_id ?? null,
      conversation_id: body.conversation_id ?? null,
      phone: body.phone,
      user_message: body.user_message,
      agent_response: body.agent_response ?? null,
      detected_intent: body.detected_intent ?? null,
      severity: classification.severity,
      root_cause_type: classification.rootCause,
      confidence: classification.confidence,
      recommended_action: classification.recommendedAction,
      metadata: body.metadata ?? {},
    });

    return NextResponse.json({ created: Boolean(result), id: result?.id ?? null });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "invalid_body", details: error.flatten() },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "internal_server_error", detail: String(error) },
      { status: 500 },
    );
  }
}

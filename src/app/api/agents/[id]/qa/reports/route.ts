/**
 * API Route: /api/agents/[id]/qa/reports
 *
 * Persists and lists QA reports for an agent. A QA report is a battery of
 * questions plus how the agent answered each one — saved so it can be reviewed
 * later and fed to a prompt evaluator.
 *
 * Running the questions themselves is done client-side by looping over the
 * existing /api/agents/[id]/test endpoint (one isolated turn per question);
 * this route only stores/reads the assembled report.
 */

import { createServerClient } from "@/lib/supabase";
import type { AgentQAResultItem } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface AuthContext {
  userId: string;
  clientId: string;
}

/**
 * Resolves the authenticated user's client_id. Returns a NextResponse on
 * failure (caller should return it), or an AuthContext on success.
 */
const resolveClientId = async (
  supabase: Awaited<ReturnType<typeof createServerClient>>,
): Promise<AuthContext | NextResponse> => {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("client_id")
    .eq("id", user.id)
    .single();

  if (!profile?.client_id) {
    return NextResponse.json(
      { error: "User profile not found" },
      { status: 404 },
    );
  }

  return { userId: user.id, clientId: profile.client_id };
};

/**
 * GET /api/agents/[id]/qa/reports?limit=20
 * List saved QA reports for the agent (most recent first).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();

    const auth = await resolveClientId(supabase);
    if (auth instanceof NextResponse) return auth;

    const limit = Math.min(
      Number(request.nextUrl.searchParams.get("limit")) || 20,
      100,
    );

    const { data: reports, error } = await supabase
      .from("agent_qa_reports")
      .select("*")
      .eq("agent_id", id)
      .eq("client_id", auth.clientId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[GET qa/reports] Error:", error);
      return NextResponse.json(
        { error: "Failed to load QA reports" },
        { status: 500 },
      );
    }

    return NextResponse.json({ reports: reports || [] });
  } catch (error) {
    console.error("[GET qa/reports] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/agents/[id]/qa/reports
 * Save a QA report.
 *
 * Body:
 *  - label?: string
 *  - provider?: string
 *  - model_used?: string
 *  - agent_snapshot?: object (config that produced these answers)
 *  - results: AgentQAResultItem[]
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();

    const auth = await resolveClientId(supabase);
    if (auth instanceof NextResponse) return auth;

    // Verify the agent belongs to this client
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id")
      .eq("id", id)
      .eq("client_id", auth.clientId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const body = await request.json();
    const results: AgentQAResultItem[] = Array.isArray(body.results)
      ? body.results
      : [];

    if (results.length === 0) {
      return NextResponse.json(
        { error: "Nenhum resultado para salvar" },
        { status: 400 },
      );
    }

    const totalLatency = results.reduce(
      (sum, r) => sum + (typeof r.latencyMs === "number" ? r.latencyMs : 0),
      0,
    );

    const { data: report, error } = await supabase
      .from("agent_qa_reports")
      .insert({
        client_id: auth.clientId,
        agent_id: id,
        label:
          typeof body.label === "string" && body.label.trim()
            ? body.label.trim()
            : null,
        agent_snapshot: body.agent_snapshot || {},
        provider: body.provider || null,
        model_used: body.model_used || null,
        results,
        question_count: results.length,
        total_latency_ms: totalLatency || null,
        created_by: auth.userId,
      })
      .select()
      .single();

    if (error) {
      console.error("[POST qa/reports] Error:", error);
      return NextResponse.json(
        { error: "Failed to save QA report", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, report }, { status: 201 });
  } catch (error) {
    console.error("[POST qa/reports] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

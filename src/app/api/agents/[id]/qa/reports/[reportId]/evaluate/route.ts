/**
 * API Route: /api/agents/[id]/qa/reports/[reportId]/evaluate
 *
 * POST - Run an AI QA review of a saved report: judges each question/answer
 *        and proposes applyable prompt fixes. Persists the evaluation onto the
 *        report (agent_qa_reports.evaluation) and returns it.
 */

import { evaluateQAReport } from "@/lib/qa-evaluator";
import { createServerClient } from "@/lib/supabase";
import type { Agent, AgentQAResultItem } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string; reportId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: agentId, reportId } = await params;
    const supabase = await createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("client_id")
      .eq("id", user.id)
      .single();

    if (!profile?.client_id) {
      return NextResponse.json(
        { error: "Perfil não encontrado" },
        { status: 404 },
      );
    }

    const clientId = profile.client_id as string;

    // Load the report (tenant-scoped)
    const { data: report, error: reportError } = await supabase
      .from("agent_qa_reports")
      .select("*")
      .eq("id", reportId)
      .eq("agent_id", agentId)
      .eq("client_id", clientId)
      .single();

    if (reportError || !report) {
      return NextResponse.json(
        { error: "Relatório não encontrado" },
        { status: 404 },
      );
    }

    // Load the agent
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .eq("client_id", clientId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: "Agente não encontrado" },
        { status: 404 },
      );
    }

    const results: AgentQAResultItem[] = Array.isArray(report.results)
      ? report.results
      : [];

    if (results.length === 0) {
      return NextResponse.json(
        { error: "Relatório sem resultados para avaliar" },
        { status: 400 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      provider?: "openai" | "groq";
      model?: string;
      focus?: string | null;
    };

    // Reflect the config that actually produced these answers: merge the
    // report's snapshot (prompt-affecting fields) over the saved agent.
    const mergedAgent = {
      ...(agent as Agent),
      ...(report.agent_snapshot || {}),
    } as Agent;

    const provider: "openai" | "groq" =
      body.provider === "groq" ? "groq" : "openai";
    const model =
      body.model?.trim() ||
      (provider === "openai" ? mergedAgent.openai_model : mergedAgent.groq_model) ||
      "gpt-4o-mini";

    const result = await evaluateQAReport({
      clientId,
      agent: mergedAgent,
      provider,
      model,
      results,
      focus: body.focus ?? null,
    });

    const { error: saveError } = await supabase
      .from("agent_qa_reports")
      .update({
        evaluation: result,
        evaluator_model: result.evaluatorModel,
        evaluated_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    if (saveError) {
      console.error("[POST qa/evaluate] Save error:", saveError);
      // Still return the analysis so it isn't lost.
      return NextResponse.json({ evaluation: result, persisted: false });
    }

    return NextResponse.json({ evaluation: result, persisted: true });
  } catch (error) {
    console.error("[POST qa/evaluate] Unexpected:", error);
    const message =
      error instanceof Error ? error.message : "Erro ao avaliar relatório";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

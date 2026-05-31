/**
 * API Route: /api/agents/[id]/evaluate-prompt
 *
 * POST - Run an AI "prompt engineer" review of the agent's compiled prompt.
 *        Optionally grounded on a real message (body.traceId). Persists the
 *        review to `agent_prompt_evaluations` and returns the result.
 * GET  - List past prompt evaluations for the agent.
 */

import { evaluateAgentPrompt } from "@/lib/prompt-evaluator";
import { createServerClient } from "@/lib/supabase";
import type { Agent } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface AuthContext {
  supabase: Awaited<ReturnType<typeof createServerClient>>;
  clientId: string;
  userId: string;
  agent: Agent;
}

const authorize = async (
  agentId: string,
): Promise<AuthContext | NextResponse> => {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("client_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.client_id) {
    return NextResponse.json(
      { error: "Perfil não encontrado" },
      { status: 404 },
    );
  }

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("*")
    .eq("id", agentId)
    .eq("client_id", profile.client_id)
    .single();

  if (agentError || !agent) {
    return NextResponse.json(
      { error: "Agente não encontrado" },
      { status: 404 },
    );
  }

  return {
    supabase,
    clientId: profile.client_id,
    userId: user.id,
    agent: agent as Agent,
  };
};

// GET - list past evaluations
export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> => {
  try {
    const { id: agentId } = await params;
    const auth = await authorize(agentId);
    if (auth instanceof NextResponse) return auth;

    const { data, error } = await auth.supabase
      .from("agent_prompt_evaluations")
      .select(
        `
        id,
        trace_id,
        evaluator_provider,
        evaluator_model,
        overall_assessment,
        overall_score,
        suggestions,
        status,
        tokens_input,
        tokens_output,
        duration_ms,
        created_at
      `,
      )
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("[GET evaluate-prompt] Error:", error);
      return NextResponse.json(
        { error: "Erro ao buscar avaliações" },
        { status: 500 },
      );
    }

    return NextResponse.json({ evaluations: data ?? [] });
  } catch (error) {
    console.error("[GET evaluate-prompt] Unexpected:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
};

// POST - run a new evaluation
export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> => {
  try {
    const { id: agentId } = await params;
    const auth = await authorize(agentId);
    if (auth instanceof NextResponse) return auth;

    const { supabase, clientId, userId, agent } = auth;

    const body = (await request.json().catch(() => ({}))) as {
      provider?: "openai" | "groq";
      model?: string;
      traceId?: string | null;
      focus?: string | null;
    };

    const provider: "openai" | "groq" =
      body.provider === "groq" ? "groq" : "openai";
    const model =
      body.model?.trim() ||
      (provider === "openai" ? agent.openai_model : agent.groq_model) ||
      "gpt-4o-mini";

    // Optional message-grounded mode: load the referenced trace.
    let trace = null as {
      userMessage: string;
      agentResponse: string;
      modelUsed: string | null;
    } | null;

    if (body.traceId) {
      const { data: traceRow, error: traceError } = await supabase
        .from("message_traces")
        .select("user_message, agent_response, model_used")
        .eq("id", body.traceId)
        .eq("client_id", clientId)
        .single();

      if (traceError || !traceRow) {
        return NextResponse.json(
          { error: "Mensagem de referência não encontrada" },
          { status: 404 },
        );
      }

      trace = {
        userMessage: traceRow.user_message ?? "",
        agentResponse: traceRow.agent_response ?? "",
        modelUsed: traceRow.model_used ?? null,
      };
    }

    const result = await evaluateAgentPrompt({
      clientId,
      agent,
      provider,
      model,
      trace,
      focus: body.focus ?? null,
    });

    const { data: saved, error: saveError } = await supabase
      .from("agent_prompt_evaluations")
      .insert({
        client_id: clientId,
        agent_id: agentId,
        trace_id: body.traceId ?? null,
        evaluator_provider: result.evaluatorProvider,
        evaluator_model: result.evaluatorModel,
        prompt_snapshot: result.promptSnapshot,
        overall_assessment: result.overallAssessment,
        overall_score: result.overallScore,
        suggestions: result.suggestions,
        status: "open",
        tokens_input: result.usage.tokensInput,
        tokens_output: result.usage.tokensOutput,
        duration_ms: result.durationMs,
        created_by: userId,
      })
      .select("id, created_at")
      .single();

    if (saveError) {
      console.error("[POST evaluate-prompt] Save error:", saveError);
      // Still return the result so the user doesn't lose the analysis.
      return NextResponse.json({
        evaluation: { ...result, id: null, persisted: false },
      });
    }

    return NextResponse.json({
      evaluation: {
        ...result,
        id: saved.id,
        createdAt: saved.created_at,
        persisted: true,
      },
    });
  } catch (error) {
    console.error("[POST evaluate-prompt] Unexpected:", error);
    const message =
      error instanceof Error ? error.message : "Erro ao avaliar prompt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};

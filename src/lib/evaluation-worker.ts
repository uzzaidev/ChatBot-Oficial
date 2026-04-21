import { getBotConfig } from "@/lib/config";
import { evaluateAgentResponse } from "@/lib/evaluation-engine";
import { findSimilarGroundTruth } from "@/lib/ground-truth-matcher";
import { createServiceRoleClient } from "@/lib/supabase";
import { checkBudgetAvailable } from "@/lib/unified-tracking";

const DEFAULT_SAMPLE_RATE = Number.parseFloat(
  process.env.EVALUATION_SAMPLING_RATE ?? "0.2",
);
const DEFAULT_MAX_DAILY_USD = Number.parseFloat(
  process.env.EVALUATION_MAX_DAILY_USD ?? "10",
);

export interface EnqueueEvaluationInput {
  traceId: string;
  clientId: string;
  userMessage: string;
  agentResponse: string;
  phone?: string;
  retrievedChunks?: Array<{
    id: string;
    content?: string;
    similarity: number;
  }>;
}

const clampRate = (value: number): number => {
  if (!Number.isFinite(value)) return DEFAULT_SAMPLE_RATE;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
};

const normalizeSampleRate = async (clientId: string): Promise<number> => {
  const cfg = await getBotConfig(clientId, "quality:sampling_rate");
  const parsed = cfg != null ? Number(cfg) : DEFAULT_SAMPLE_RATE;
  return clampRate(parsed);
};

const hashToUnitInterval = (value: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  // Convert uint32 to [0,1)
  return (hash >>> 0) / 0x1_0000_0000;
};

export const shouldSample = async (
  clientId: string,
  traceId: string,
): Promise<boolean> => {
  const rate = await normalizeSampleRate(clientId);
  if (rate <= 0) return false;
  if (rate >= 1) return true;

  const hash = hashToUnitInterval(traceId);
  return hash < rate;
};

const getTodayEvaluationCostUsd = async (clientId: string): Promise<number> => {
  const supabase = createServiceRoleClient() as any;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("agent_evaluations")
    .select("cost_usd")
    .eq("client_id", clientId)
    .gte("evaluated_at", today.toISOString());

  if (error) {
    console.warn("[evaluation-worker] failed to fetch daily evaluation cost", {
      clientId,
      error: error.message,
    });
    return 0;
  }

  return (data ?? []).reduce(
    (sum: number, row: { cost_usd: number | null }) => sum + (row.cost_usd ?? 0),
    0,
  );
};

const isEvaluationBudgetAvailable = async (clientId: string): Promise<boolean> => {
  if (!Number.isFinite(DEFAULT_MAX_DAILY_USD) || DEFAULT_MAX_DAILY_USD <= 0) {
    return true;
  }

  const todayCost = await getTodayEvaluationCostUsd(clientId);
  return todayCost < DEFAULT_MAX_DAILY_USD;
};

export const runEvaluation = async (
  input: EnqueueEvaluationInput,
): Promise<void> => {
  const supabase = createServiceRoleClient() as any;

  // Idempotency: one evaluation per trace_id
  const { data: existing, error: existingError } = await supabase
    .from("agent_evaluations")
    .select("id")
    .eq("trace_id", input.traceId)
    .maybeSingle();

  if (existingError) {
    console.warn("[evaluation-worker] failed to check existing evaluation", {
      traceId: input.traceId,
      error: existingError.message,
    });
  }

  if (existing) {
    return;
  }

  if (!(await shouldSample(input.clientId, input.traceId))) {
    return;
  }

  const budgetAvailable = await checkBudgetAvailable(input.clientId);
  if (!budgetAvailable) {
    console.warn("[evaluation-worker] skipped due to main AI budget limit", {
      clientId: input.clientId,
      traceId: input.traceId,
    });
    return;
  }

  if (!(await isEvaluationBudgetAvailable(input.clientId))) {
    console.warn("[evaluation-worker] skipped due to evaluation daily budget", {
      clientId: input.clientId,
      traceId: input.traceId,
      maxDailyUsd: DEFAULT_MAX_DAILY_USD,
    });
    return;
  }

  const gt = await findSimilarGroundTruth(input.clientId, input.userMessage);

  const result = await evaluateAgentResponse({
    traceId: input.traceId,
    clientId: input.clientId,
    userMessage: input.userMessage,
    agentResponse: input.agentResponse,
    retrievedChunks: input.retrievedChunks,
    groundTruthExpected: gt?.expected_response ?? null,
  });

  const { error: insertErr } = await supabase.from("agent_evaluations").insert({
    trace_id: input.traceId,
    client_id: input.clientId,
    ground_truth_id: gt?.id ?? null,
    judge_model: result.judgeModel,
    judge_prompt_version: result.promptVersion,
    alignment_score: result.alignmentScore,
    relevance_score: result.relevanceScore,
    finality_score: result.finalityScore,
    safety_score: result.safetyScore,
    composite_score: result.compositeScore,
    alignment_reasoning: result.reasoning.alignment,
    relevance_reasoning: result.reasoning.relevance,
    finality_reasoning: result.reasoning.finality,
    safety_reasoning: result.reasoning.safety,
    verdict: result.verdict,
    tokens_input: result.cost.tokensInput,
    tokens_output: result.cost.tokensOutput,
    cost_usd: result.cost.costUsd,
    duration_ms: result.durationMs,
    metadata: {
      source: "automatic_judge",
      trace_id: input.traceId,
      phone: input.phone ?? null,
      has_ground_truth: !!gt,
      has_retrieval_chunks: (input.retrievedChunks?.length ?? 0) > 0,
    },
  });

  if (insertErr) {
    // Unique violation = another worker won the race -> ignore
    if (String(insertErr.code) === "23505") {
      return;
    }

    throw new Error(`[evaluation-worker] insert failed: ${insertErr.message}`);
  }

  const newStatus = result.verdict === "FAIL" ? "needs_review" : "evaluated";
  const { error: updateError } = await supabase
    .from("message_traces")
    .update({ status: newStatus })
    .eq("id", input.traceId)
    .eq("client_id", input.clientId);

  if (updateError) {
    console.warn("[evaluation-worker] failed to update message_traces status", {
      traceId: input.traceId,
      clientId: input.clientId,
      error: updateError.message,
    });
  }
};

export const enqueueEvaluation = (input: EnqueueEvaluationInput): void => {
  try {
    setImmediate(async () => {
      try {
        await runEvaluation(input);
      } catch (error) {
        console.error("[evaluation-worker] failed", {
          traceId: input.traceId,
          clientId: input.clientId,
          error: error instanceof Error ? error.message : "unknown_error",
        });
      }
    });
  } catch (error) {
    console.error("[evaluation-worker] enqueue failed", {
      traceId: input.traceId,
      clientId: input.clientId,
      error: error instanceof Error ? error.message : "unknown_error",
    });
  }
};


import { createServiceRoleClient } from "@/lib/supabase";

// ─── Stage types ────────────────────────────────────────────────────────────

export type TraceStage =
  | "webhook_received"
  | "normalized"
  | "context_loaded"
  | "embedding_started"
  | "embedding_completed"
  | "retrieval_started"
  | "retrieval_completed"
  | "generation_started"
  | "generation_completed"
  | "sent"
  | "evaluation_enqueued";

// ─── Input/output data shapes ────────────────────────────────────────────────

export interface GenerationData {
  model: string;
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
  response: string;
}

export interface RetrievalData {
  chunkIds: string[];
  similarityScores: number[];
  topK: number;
  threshold: number;
  strategy?: string;
}

export interface ToolCallLogInput {
  toolName: string;
  toolCallId?: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  status: "success" | "error" | "rejected" | "fallback_triggered";
  errorMessage?: string;
  source: "agent" | "fallback" | "system";
  startedAt: Date;
  completedAt: Date;
  sequenceIndex?: number;
}

export interface TraceLoggerInput {
  clientId: string;
  phone: string;
  userMessage: string;
  whatsappMessageId?: string;
  conversationId?: string;
}

// ─── Logger interface ────────────────────────────────────────────────────────

export interface MessageTraceLogger {
  traceId: string;
  markStage(stage: TraceStage, metadata?: Record<string, unknown>): void;
  setGenerationData(data: GenerationData): void;
  setRetrievalData(data: RetrievalData): void;
  logToolCall(input: ToolCallLogInput): void;
  setError(error: string): void;
  finish(): Promise<string>;
}

// ─── PII sanitization ────────────────────────────────────────────────────────

const PII_REGEXES = [
  { re: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, mask: "[CPF_REDACTED]" },
  {
    re: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    mask: "[CARD_REDACTED]",
  },
  { re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, mask: "[EMAIL_REDACTED]" },
] as const;

export const sanitizePII = (text: string): string => {
  if (process.env.PII_SANITIZATION_ENABLED === "false") return text;
  return PII_REGEXES.reduce((acc, { re, mask }) => acc.replace(re, mask), text);
};

const TRACE_SCHEMA_HINT =
  "Check migration supabase/migrations/20260422130000_create_observability_traces.sql";
let missingTraceTablesWarned = false;

const isMissingRelationError = (message: string): boolean => {
  const msg = message.toLowerCase();
  return (
    msg.includes("does not exist") ||
    msg.includes("relation") ||
    msg.includes("undefined")
  );
};

const warnMissingTraceTablesOnce = (tableName: string): void => {
  if (missingTraceTablesWarned) return;
  missingTraceTablesWarned = true;
  console.warn(
    `[trace-logger] Table "${tableName}" not found or unavailable. ${TRACE_SCHEMA_HINT}`,
  );
};

// ─── crypto.randomUUID shim ──────────────────────────────────────────────────

const generateId = (): string => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older Node runtimes
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

// ─── Factory ─────────────────────────────────────────────────────────────────

export const createTraceLogger = (
  input: TraceLoggerInput
): MessageTraceLogger => {
  const traceId = generateId();
  const startedAt = Date.now();

  const stageTimes: Partial<Record<TraceStage, Date>> = {};
  const stageMetadata: Partial<Record<TraceStage, Record<string, unknown>>> =
    {};
  const toolCallBuffer: ToolCallLogInput[] = [];

  let generationData: GenerationData | null = null;
  let retrievalData: RetrievalData | null = null;
  let errorMsg: string | null = null;

  const markStage = (
    stage: TraceStage,
    metadata?: Record<string, unknown>
  ): void => {
    stageTimes[stage] = new Date();
    if (metadata) stageMetadata[stage] = metadata;
  };

  const setGenerationData = (data: GenerationData): void => {
    generationData = data;
  };

  const setRetrievalData = (data: RetrievalData): void => {
    retrievalData = data;
  };

  const logToolCall = (toolInput: ToolCallLogInput): void => {
    toolCallBuffer.push(toolInput);
  };

  const setError = (error: string): void => {
    errorMsg = error;
  };

  const finish = async (): Promise<string> => {
    const now = Date.now();
    const totalMs = now - startedAt;
    const supabase = createServiceRoleClient() as ReturnType<
      typeof createServiceRoleClient
    >;

    // ── Build message_traces row ──────────────────────────────────────────
    const traceRow = {
      id: traceId,
      client_id: input.clientId,
      phone: input.phone,
      whatsapp_message_id: input.whatsappMessageId ?? null,
      conversation_id: input.conversationId ?? null,

      // Stage timestamps
      webhook_received_at: stageTimes.webhook_received ?? null,
      normalized_at: stageTimes.normalized ?? null,
      context_loaded_at: stageTimes.context_loaded ?? null,
      embedding_started_at: stageTimes.embedding_started ?? null,
      embedding_completed_at: stageTimes.embedding_completed ?? null,
      retrieval_started_at: stageTimes.retrieval_started ?? null,
      retrieval_completed_at: stageTimes.retrieval_completed ?? null,
      generation_started_at: stageTimes.generation_started ?? null,
      generation_completed_at: stageTimes.generation_completed ?? null,
      sent_at: stageTimes.sent ?? null,
      evaluation_enqueued_at: stageTimes.evaluation_enqueued ?? null,

      // Computed latencies
      latency_total_ms: totalMs,
      latency_embedding_ms:
        stageTimes.embedding_started && stageTimes.embedding_completed
          ? stageTimes.embedding_completed.getTime() -
            stageTimes.embedding_started.getTime()
          : null,
      latency_retrieval_ms:
        stageTimes.retrieval_started && stageTimes.retrieval_completed
          ? stageTimes.retrieval_completed.getTime() -
            stageTimes.retrieval_started.getTime()
          : null,
      latency_generation_ms:
        stageTimes.generation_started && stageTimes.generation_completed
          ? stageTimes.generation_completed.getTime() -
            stageTimes.generation_started.getTime()
          : null,

      // Message content (sanitized)
      user_message: sanitizePII(input.userMessage).slice(0, 100_000),
      agent_response: generationData
        ? sanitizePII(generationData.response).slice(0, 100_000)
        : null,

      // Model + cost
      model_used: generationData?.model ?? null,
      tokens_input: generationData?.tokensInput ?? null,
      tokens_output: generationData?.tokensOutput ?? null,
      cost_usd: generationData?.costUsd ?? null,

      // Status
      status: errorMsg ? "failed" : "pending",

      // Flexible metadata
      metadata: {
        stages: stageMetadata,
        error: errorMsg ?? null,
      },
    };

    // Insert message_traces
    const { error: traceError } = await (supabase as any)
      .from("message_traces")
      .upsert(traceRow, { onConflict: "id" });

    if (traceError) {
      const message = String(traceError.message ?? "");
      if (isMissingRelationError(message)) {
        warnMissingTraceTablesOnce("message_traces");
      } else {
        console.error("[trace-logger] message_traces insert error:", traceError.message);
      }
    }

    // ── Insert retrieval_traces row ───────────────────────────────────────
    if (retrievalData) {
      const { error: retError } = await (supabase as any)
        .from("retrieval_traces")
        .insert({
          trace_id: traceId,
          client_id: input.clientId,
          chunk_ids: retrievalData.chunkIds,
          similarity_scores: retrievalData.similarityScores,
          top_k: retrievalData.topK,
          threshold: retrievalData.threshold,
          retrieval_strategy: retrievalData.strategy ?? "cosine_top_k",
        });

      if (retError) {
        const message = String(retError.message ?? "");
        if (isMissingRelationError(message)) {
          warnMissingTraceTablesOnce("retrieval_traces");
        } else {
          console.error("[trace-logger] retrieval_traces insert error:", retError.message);
        }
      }
    }

    // ── Flush tool_call_traces buffer ─────────────────────────────────────
    if (toolCallBuffer.length > 0) {
      const toolRows = toolCallBuffer.map((tc, i) => ({
        trace_id: traceId,
        client_id: input.clientId,
        tool_name: tc.toolName,
        tool_call_id: tc.toolCallId ?? null,
        arguments: tc.arguments,
        result: tc.result !== undefined ? tc.result : null,
        status: tc.status,
        error_message: tc.errorMessage ?? null,
        sequence_index: tc.sequenceIndex ?? i,
        source: tc.source,
        started_at: tc.startedAt.toISOString(),
        completed_at: tc.completedAt.toISOString(),
        latency_ms:
          tc.completedAt.getTime() - tc.startedAt.getTime(),
      }));

      const { error: toolError } = await (supabase as any)
        .from("tool_call_traces")
        .insert(toolRows);

      if (toolError) {
        const message = String(toolError.message ?? "");
        if (isMissingRelationError(message)) {
          warnMissingTraceTablesOnce("tool_call_traces");
        } else {
          console.error("[trace-logger] tool_call_traces insert error:", toolError.message);
        }
      }
    }

    return traceId;
  };

  return {
    traceId,
    markStage,
    setGenerationData,
    setRetrievalData,
    logToolCall,
    setError,
    finish,
  };
};

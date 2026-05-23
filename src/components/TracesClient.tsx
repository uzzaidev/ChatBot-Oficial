"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  MessageSquare,
  RefreshCw,
  Search,
  Server,
  Sparkles,
  Terminal,
  Wrench,
  XCircle,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TraceRow {
  id: string;
  phone: string;
  status: string;
  user_message: string;
  agent_response: string | null;
  model_used: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  cost_usd: number | null;
  latency_total_ms: number | null;
  latency_generation_ms: number | null;
  latency_retrieval_ms: number | null;
  latency_embedding_ms: number | null;
  webhook_received_at: string | null;
  generation_started_at: string | null;
  generation_completed_at: string | null;
  sent_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  contact_name?: string | null;
  feedback_count?: number;
  has_feedback?: boolean;
}

interface ToolCall {
  tool_name: string;
  tool_call_id: string | null;
  arguments: Record<string, unknown>;
  result: unknown;
  status: string;
  error_message: string | null;
  sequence_index: number;
  source: string;
  latency_ms: number | null;
  started_at: string;
  completed_at: string | null;
}

interface Retrieval {
  chunk_ids: string[];
  similarity_scores: number[];
  top_k: number;
  threshold: number;
  retrieval_strategy: string;
  created_at: string;
}

interface TraceDetail extends TraceRow {
  retrieval: Retrieval | null;
  tool_calls: ToolCall[];
}

interface TracesMeta {
  costTodayUsd: number;
  statusCounts?: Record<string, number>;
  pendingBuckets?: Record<string, number>;
  metadataCoverage?: {
    contatos_no_periodo: number;
    com_email: number;
    com_cpf: number;
    com_objetivo: number;
    com_experiencia: number;
    com_periodo_ou_dia: number;
  } | null;
}

interface QualityAlertsResponse {
  data?: {
    alerts?: Array<{
      code: string;
      severity: "critical" | "warning" | "info";
      message: string;
      value: number;
      threshold: number;
    }>;
    window15m?: {
      total: number;
      pending: number;
      failed: number;
      pendingRatioPct: number;
      failedRatioPct: number;
      avgLatencyMs: number;
    };
  };
}

type AssistedVerdict = "suggest_good" | "suggest_bad";

interface AssistedSuggestion {
  verdict: AssistedVerdict;
  confidence: number;
  reasons: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const maskPhone = (phone: string) =>
  phone.length < 7 ? phone : `${phone.slice(0, 4)}••••${phone.slice(-2)}`;

const formatMs = (ms: number | null) => {
  if (ms == null) return "—";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
};

const formatCost = (usd: number | null) =>
  usd == null ? "—" : `$${usd.toFixed(5)}`;

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s atrás`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}min atrás`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h atrás`;
  return new Date(iso).toLocaleDateString("pt-BR");
};

const formatFullDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const getAssistedSuggestion = (trace: TraceDetail): AssistedSuggestion => {
  const reasons: string[] = [];
  let score = 0;

  if (trace.status === "failed") {
    score -= 3;
    reasons.push("status de processamento falhou");
  }

  if (!trace.agent_response || trace.agent_response.trim().length === 0) {
    score -= 2;
    reasons.push("sem resposta registrada do bot");
  }

  if ((trace.latency_total_ms ?? 0) > 12000) {
    score -= 1;
    reasons.push("latência total acima de 12s");
  }

  if (trace.status === "success" || trace.status === "evaluated") {
    score += 2;
    reasons.push("status final de sucesso");
  }

  if ((trace.cost_usd ?? 0) > 0 && (trace.tokens_output ?? 0) > 0) {
    score += 1;
    reasons.push("resposta com custo/tokens contabilizados");
  }

  if ((trace.tool_calls?.length ?? 0) > 0) {
    const hasToolError = trace.tool_calls.some((tc) => tc.status === "error");
    if (hasToolError) {
      score -= 1;
      reasons.push("houve erro em tool call");
    }
  }

  const verdict: AssistedVerdict = score >= 1 ? "suggest_good" : "suggest_bad";
  const confidence = Math.min(95, Math.max(55, 65 + Math.abs(score) * 8));

  return {
    verdict,
    confidence,
    reasons,
  };
};

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS = {
  pending: {
    label: "Pendente",
    color: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
    dot: "bg-yellow-500",
    icon: AlertCircle,
  },
  success: {
    label: "Concluido",
    color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
  },
  evaluated: {
    label: "Avaliado",
    color: "bg-green-500/15 text-green-600 border-green-500/30",
    dot: "bg-green-500",
    icon: CheckCircle2,
  },
  failed: {
    label: "Falhou",
    color: "bg-red-500/15 text-red-600 border-red-500/30",
    dot: "bg-red-500",
    icon: XCircle,
  },
  needs_review: {
    label: "Revisão",
    color: "bg-orange-500/15 text-orange-600 border-orange-500/30",
    dot: "bg-orange-500",
    icon: AlertTriangle,
  },
  human_reviewed: {
    label: "Revisado",
    color: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    dot: "bg-blue-500",
    icon: CheckCircle2,
  },
} as const;

type StatusKey = keyof typeof STATUS;

const TOOL_STATUS = {
  success: { color: "text-green-500", bg: "bg-green-500/10", label: "Sucesso" },
  error: { color: "text-red-500", bg: "bg-red-500/10", label: "Erro" },
  rejected: {
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    label: "Rejeitado",
  },
  fallback_triggered: {
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    label: "Fallback",
  },
  pending: {
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    label: "Pendente",
  },
} as const;

const TOOL_ICONS: Record<string, React.FC<{ className?: string }>> = {
  registrar_dado_cadastral: ({ className }) => (
    <Sparkles className={className} />
  ),
  transferir_atendimento: ({ className }) => (
    <ArrowRight className={className} />
  ),
  buscar_documento: ({ className }) => <Search className={className} />,
  verificar_agenda: ({ className }) => <Clock className={className} />,
  criar_evento_agenda: ({ className }) => (
    <CheckCircle2 className={className} />
  ),
  cancelar_evento_agenda: ({ className }) => <XCircle className={className} />,
  enviar_resposta_em_audio: ({ className }) => <Zap className={className} />,
};

const TOOL_LABELS: Record<string, string> = {
  registrar_dado_cadastral: "Salvar Dado Cadastral",
  transferir_atendimento: "Transferir para Humano",
  buscar_documento: "Buscar na Base de Conhecimento",
  verificar_agenda: "Verificar Agenda",
  criar_evento_agenda: "Criar Evento na Agenda",
  cancelar_evento_agenda: "Cancelar Evento",
  enviar_resposta_em_audio: "Enviar Áudio",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS[status as StatusKey] ?? STATUS.pending;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        cfg.color,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.FC<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="metric-card flex items-start gap-3 py-4 px-5">
      <div className={cn("mt-0.5 rounded-lg p-2", accent ?? "bg-primary/10")}>
        <Icon className="h-4 w-4 text-uzz-mint" />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        <p className="text-xl font-bold font-poppins text-foreground mt-0.5">
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function EmptyDetail() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-4 p-8">
      <div className="rounded-full bg-muted/60 p-6">
        <Terminal className="h-10 w-10 text-muted-foreground/40" />
      </div>
      <div>
        <p className="font-semibold text-foreground">Selecione uma mensagem</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Clique em qualquer linha à esquerda para ver o detalhe completo —
          estágios do pipeline, tool calls e RAG.
        </p>
      </div>
    </div>
  );
}

function EmptyList({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 text-center gap-3 p-8">
      <div className="rounded-full bg-muted/60 p-5">
        <Activity className="h-8 w-8 text-muted-foreground/40" />
      </div>
      <div>
        <p className="font-semibold text-foreground text-sm">
          {filtered ? "Nenhum resultado" : "Sem traces ainda"}
        </p>
        <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
          {filtered
            ? "Tente ajustar os filtros aplicados."
            : "Envie uma mensagem pelo WhatsApp para gerar o primeiro trace."}
        </p>
      </div>
    </div>
  );
}

// ─── Detail panel tabs ────────────────────────────────────────────────────────

type DetailTab = "prompt" | "toolcalls" | "overview" | "rag";

function PipelineTimeline({ trace }: { trace: TraceDetail }) {
  const stages = [
    { label: "Webhook recebido", ts: trace.webhook_received_at, icon: Server },
    {
      label: "Embedding",
      ts: trace.latency_embedding_ms != null ? trace.webhook_received_at : null,
      latency: trace.latency_embedding_ms,
      icon: Zap,
    },
    {
      label: "RAG / Retrieval",
      ts: trace.latency_retrieval_ms != null ? trace.webhook_received_at : null,
      latency: trace.latency_retrieval_ms,
      icon: Search,
    },
    {
      label: "Geração LLM",
      ts:
        trace.latency_generation_ms != null ? trace.webhook_received_at : null,
      latency: trace.latency_generation_ms,
      icon: Bot,
    },
    { label: "Resposta enviada", ts: trace.sent_at, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-1">
      {stages.map((s, i) => {
        const reached = s.ts != null || s.latency != null;
        const Icon = s.icon;
        return (
          <div key={i} className="flex items-center gap-3">
            <div
              className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center shrink-0",
                reached
                  ? "bg-uzz-mint/20 text-uzz-mint"
                  : "bg-muted text-muted-foreground/40",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>
            {i < stages.length - 1 && (
              <div
                className={cn(
                  "absolute ml-3 mt-7 h-4 w-px",
                  reached ? "bg-uzz-mint/30" : "bg-border",
                )}
              />
            )}
            <div className="flex-1 flex items-center justify-between">
              <span
                className={cn(
                  "text-xs font-medium",
                  reached ? "text-foreground" : "text-muted-foreground/50",
                )}
              >
                {s.label}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {s.latency != null
                  ? formatMs(s.latency)
                  : s.ts
                  ? formatFullDate(s.ts)
                  : "—"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OverviewTab({
  trace,
  onPromote,
  promoting,
  onSubmitFeedback,
  feedbackSubmitting,
  feedbackDone,
}: {
  trace: TraceDetail;
  onPromote: (trace: TraceDetail) => void;
  promoting: boolean;
  onSubmitFeedback: (params: {
    trace: TraceDetail;
    verdict: "correct" | "incorrect" | "partial";
  }) => Promise<void>;
  feedbackSubmitting: boolean;
  feedbackDone: "correct" | "incorrect" | "partial" | null;
}) {
  const assisted = getAssistedSuggestion(trace);

  return (
    <div className="space-y-5 p-5">
      <div className="rounded-xl border border-border/50 bg-card/60 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Supervisão Assistida
          </p>
          <span
            className={cn(
              "text-[10px] px-2 py-0.5 rounded-full border font-medium",
              assisted.verdict === "suggest_good"
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                : "bg-amber-500/10 text-amber-600 border-amber-500/30",
            )}
          >
            Sugestão automática:{" "}
            {assisted.verdict === "suggest_good" ? "OK" : "Revisar"} (
            {assisted.confidence}%)
          </span>
        </div>

        <p className="text-xs text-muted-foreground">
          Assistente usa heurísticas para sugerir qualidade. A decisão final é
          humana.
        </p>

        {assisted.reasons.length > 0 && (
          <div className="rounded-lg bg-muted/40 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
              Sinais usados
            </p>
            <p className="text-xs text-foreground/80">
              {assisted.reasons.join(" • ")}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => onSubmitFeedback({ trace, verdict: "correct" })}
            disabled={feedbackSubmitting}
            className="gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4" />
            OK
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSubmitFeedback({ trace, verdict: "incorrect" })}
            disabled={feedbackSubmitting}
            className="gap-1.5"
          >
            <XCircle className="h-4 w-4" />X (Resposta ruim)
          </Button>
          {feedbackDone && (
            <span className="text-xs text-muted-foreground ml-1">
              Feedback salvo:{" "}
              {feedbackDone === "correct"
                ? "OK"
                : feedbackDone === "incorrect"
                ? "Ruim"
                : "Parcial"}
            </span>
          )}
        </div>
      </div>

      {/* Status + timing */}
      <div className="rounded-xl border border-border/50 bg-card/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Status
          </span>
          <StatusBadge status={trace.status} />
        </div>
        {trace.status === "failed" &&
          (trace.metadata as Record<string, unknown>)?.error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
              <p className="text-xs text-red-500 font-mono">
                {String((trace.metadata as Record<string, unknown>).error)}
              </p>
            </div>
          )}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {[
            {
              label: "Latência total",
              value: formatMs(trace.latency_total_ms),
            },
            {
              label: "Geração LLM",
              value: formatMs(trace.latency_generation_ms),
            },
            { label: "RAG", value: formatMs(trace.latency_retrieval_ms) },
            { label: "Embedding", value: formatMs(trace.latency_embedding_ms) },
          ].map((item) => (
            <div key={item.label} className="rounded-lg bg-muted/40 px-3 py-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {item.label}
              </p>
              <p className="text-sm font-bold font-mono text-foreground mt-0.5">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline timeline */}
      <div className="rounded-xl border border-border/50 bg-card/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Pipeline
        </p>
        <PipelineTimeline trace={trace} />
      </div>

      {/* Model + cost */}
      <div className="rounded-xl border border-border/50 bg-card/60 p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Modelo & Custo
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Modelo", value: trace.model_used ?? "—" },
            { label: "Custo", value: formatCost(trace.cost_usd) },
            {
              label: "Tokens entrada",
              value: trace.tokens_input?.toLocaleString("pt-BR") ?? "—",
            },
            {
              label: "Tokens saída",
              value: trace.tokens_output?.toLocaleString("pt-BR") ?? "—",
            },
          ].map((item) => (
            <div key={item.label} className="rounded-lg bg-muted/40 px-3 py-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {item.label}
              </p>
              <p className="text-sm font-mono text-foreground mt-0.5 break-all">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Message + response */}
      <div className="rounded-xl border border-border/50 bg-card/60 p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Conversa
        </p>
        <div className="space-y-2">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
              Usuário enviou
            </p>
            <div className="rounded-lg bg-muted/40 p-3 text-xs text-foreground leading-relaxed">
              {trace.user_message || "—"}
            </div>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
              Bot respondeu
            </p>
            <div className="rounded-lg bg-uzz-mint/5 border border-uzz-mint/20 p-3 text-xs text-foreground leading-relaxed">
              {trace.agent_response || (
                <span className="italic text-muted-foreground">
                  Sem resposta registrada
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPromote(trace)}
            disabled={promoting}
          >
            {promoting ? "Promovendo..." : "Promover para Ground Truth"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ToolCallsTab({ toolCalls }: { toolCalls: ToolCall[] }) {
  if (toolCalls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3 p-6">
        <Wrench className="h-8 w-8 text-muted-foreground/30" />
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Nenhuma tool foi chamada
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            O agente respondeu diretamente, sem acionar ferramentas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-3">
      <p className="text-xs text-muted-foreground">
        {toolCalls.length} tool call{toolCalls.length > 1 ? "s" : ""} executada
        {toolCalls.length > 1 ? "s" : ""} nesta mensagem
      </p>
      {toolCalls.map((tc, i) => {
        const statusCfg =
          TOOL_STATUS[tc.status as keyof typeof TOOL_STATUS] ??
          TOOL_STATUS.pending;
        const ToolIcon =
          TOOL_ICONS[tc.tool_name] ??
          (({ className }: { className?: string }) => (
            <Wrench className={className} />
          ));
        const label = TOOL_LABELS[tc.tool_name] ?? tc.tool_name;
        const isAgent = tc.source === "agent";

        return (
          <div
            key={i}
            className="rounded-xl border border-border/50 bg-card/60 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-muted/30">
              <div className={cn("rounded-lg p-1.5", statusCfg.bg)}>
                <ToolIcon className={cn("h-4 w-4", statusCfg.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {label}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  {tc.tool_name}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full border font-medium",
                    isAgent
                      ? "bg-purple-500/10 text-purple-500 border-purple-500/20"
                      : "bg-blue-500/10 text-blue-500 border-blue-500/20",
                  )}
                >
                  {isAgent ? "🤖 agente" : "🔄 fallback"}
                </span>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full border font-medium",
                    statusCfg.bg,
                    statusCfg.color,
                    "border-current/20",
                  )}
                >
                  {statusCfg.label}
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  {formatMs(tc.latency_ms)}
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="px-4 py-3 space-y-3">
              {/* Arguments */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Input (o que o LLM enviou)
                </p>
                <pre className="text-xs bg-muted/40 rounded-lg p-3 overflow-x-auto text-foreground/80 font-mono leading-relaxed">
                  {JSON.stringify(tc.arguments, null, 2)}
                </pre>
              </div>

              {/* Result */}
              {tc.result != null && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Output (resultado da tool)
                  </p>
                  <pre className="text-xs bg-uzz-mint/5 border border-uzz-mint/20 rounded-lg p-3 overflow-x-auto text-foreground/80 font-mono leading-relaxed">
                    {JSON.stringify(tc.result, null, 2)}
                  </pre>
                </div>
              )}

              {/* Error */}
              {tc.error_message && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-red-500 mb-1">
                    Erro
                  </p>
                  <p className="text-xs text-red-400 font-mono">
                    {tc.error_message}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RagTab({ retrieval }: { retrieval: Retrieval | null }) {
  if (!retrieval) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3 p-6">
        <Search className="h-8 w-8 text-muted-foreground/30" />
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">
            RAG não foi utilizado
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Esta mensagem foi respondida sem busca na base de conhecimento.
          </p>
        </div>
      </div>
    );
  }

  const maxScore = Math.max(...retrieval.similarity_scores, 0.01);

  return (
    <div className="p-5 space-y-4">
      {/* Config */}
      <div className="rounded-xl border border-border/50 bg-card/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Configuração da Busca
        </p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Estratégia", value: retrieval.retrieval_strategy },
            { label: "Top K", value: String(retrieval.top_k) },
            { label: "Threshold", value: retrieval.threshold.toFixed(2) },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg bg-muted/40 px-3 py-2 text-center"
            >
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {item.label}
              </p>
              <p className="text-sm font-bold font-mono text-foreground mt-0.5">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Chunks */}
      <div className="rounded-xl border border-border/50 bg-card/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {retrieval.chunk_ids.length} chunk
          {retrieval.chunk_ids.length !== 1 ? "s" : ""} retornado
          {retrieval.chunk_ids.length !== 1 ? "s" : ""}
        </p>
        {retrieval.chunk_ids.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Nenhum chunk passou o threshold de {retrieval.threshold.toFixed(2)}.
          </p>
        ) : (
          <div className="space-y-3">
            {retrieval.chunk_ids.map((id, i) => {
              const score = retrieval.similarity_scores[i] ?? 0;
              const pct = Math.round((score / maxScore) * 100);
              const quality =
                score >= 0.85
                  ? "text-green-500"
                  : score >= 0.75
                  ? "text-yellow-500"
                  : "text-orange-500";
              return (
                <div key={id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">
                      {id}
                    </span>
                    <span
                      className={cn("text-xs font-bold font-mono", quality)}
                    >
                      {score.toFixed(4)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        score >= 0.85
                          ? "bg-green-500"
                          : score >= 0.75
                          ? "bg-yellow-500"
                          : "bg-orange-500",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <p className="text-[10px] text-muted-foreground pt-1">
              Barra mostra score relativo ao chunk mais relevante. Verde ≥ 0.85
              · Amarelo ≥ 0.75 · Laranja abaixo disso.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Prompt / LLM Context tab ─────────────────────────────────────────────────

interface RequestPayloadShape {
  messages: Array<{ role: string; content: string; charCount: number }>;
  tools: Array<{
    name: string;
    description: string;
    descriptionCharCount: number;
  }>;
  settings: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    reasoningEffort?: string;
  };
  totals: {
    messageCount: number;
    systemMessageCount: number;
    historyMessageCount: number;
    toolCount: number;
    promptCharCount: number;
    toolsCharCount: number;
    estimatedInputTokens: number;
  };
}

// Block bg/border only — content text always uses text-foreground for contrast.
const roleBlock = (role: string) => {
  if (role === "user" || role === "human")
    return "bg-blue-500/5 border-blue-500/30 dark:bg-blue-500/10";
  if (role === "assistant" || role === "ai")
    return "bg-uzz-mint/5 border-uzz-mint/30 dark:bg-uzz-mint/10";
  if (role === "system")
    return "bg-amber-500/5 border-amber-500/30 dark:bg-amber-500/10";
  if (role === "tool")
    return "bg-purple-500/5 border-purple-500/30 dark:bg-purple-500/10";
  return "bg-muted/40 border-border";
};

// Accent color for the small role label — works on both light and dark theme.
const roleLabel = (role: string) => {
  if (role === "user" || role === "human")
    return "text-blue-700 dark:text-blue-300";
  if (role === "assistant" || role === "ai")
    return "text-emerald-700 dark:text-uzz-mint";
  if (role === "system")
    return "text-amber-700 dark:text-amber-300";
  if (role === "tool")
    return "text-purple-700 dark:text-purple-300";
  return "text-muted-foreground";
};

function PromptTab({ trace }: { trace: TraceDetail }) {
  const stages = (trace.metadata as Record<string, any>)?.stages ?? {};
  const completedStage = stages.generation_completed as
    | Record<string, any>
    | undefined;
  const startedStage = stages.generation_started as
    | Record<string, any>
    | undefined;

  const requestPayload: RequestPayloadShape | null =
    (completedStage?.requestPayload as RequestPayloadShape | null) ?? null;
  const reasoning: string | null = completedStage?.reasoning ?? null;
  const reasoningTokens: number | null = completedStage?.reasoningTokens ?? null;
  const finalResponse: string =
    completedStage?.finalResponse ?? trace.agent_response ?? "";
  const toolCallsList: Array<{ name: string; arguments: string }> =
    completedStage?.toolCalls ?? [];

  // Fallback for legacy traces (pre-2026-05-07) — still show what we can
  const legacySystemPrompt: string = startedStage?.systemPrompt ?? "";
  const legacyHistory: Array<{ role: string; content: string }> =
    startedStage?.historyMessages ?? [];
  const legacyRag: string = startedStage?.ragContext ?? "";
  const legacyUser: string = startedStage?.userMessage ?? trace.user_message ?? "";

  const isLegacy = !requestPayload;
  const hasLegacyData =
    legacySystemPrompt || legacyHistory.length > 0 || legacyRag;

  if (isLegacy && !hasLegacyData) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3 p-6">
        <Bot className="h-8 w-8 text-muted-foreground/30" />
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Dados de prompt indisponíveis
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Este trace foi criado antes da observabilidade de prompt ser
            ativada.
          </p>
        </div>
      </div>
    );
  }

  // Legacy fallback — render the old-style minimal panels
  if (isLegacy) {
    return (
      <div className="p-5 space-y-5">
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="text-xs text-amber-300/90">
            Trace antigo (pré-snapshot completo). Mostrando apenas o prompt-base
            do tenant + histórico truncado.
          </p>
        </div>

        {legacySystemPrompt && (
          <div className="rounded-xl border border-border/50 bg-card/60 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border/40">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                System Prompt (base do tenant)
              </p>
              <span className="text-[10px] font-mono text-muted-foreground">
                {legacySystemPrompt.length} chars
              </span>
            </div>
            <pre className="text-xs p-4 overflow-x-auto whitespace-pre-wrap break-words text-foreground/80 font-mono leading-relaxed max-h-72 overflow-y-auto">
              {legacySystemPrompt}
            </pre>
          </div>
        )}

        {legacyUser && (
          <div className="rounded-xl border border-border/50 bg-card/60 overflow-hidden">
            <div className="px-4 py-2.5 bg-muted/30 border-b border-border/40">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Mensagem do usuário
              </p>
            </div>
            <div className="p-4 text-xs whitespace-pre-wrap">{legacyUser}</div>
          </div>
        )}

        {legacyHistory.length > 0 && (
          <div className="rounded-xl border border-border/50 bg-card/60 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border/40">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Histórico
              </p>
              <span className="text-[10px] font-mono text-muted-foreground">
                {legacyHistory.length} msgs
              </span>
            </div>
            <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
              {legacyHistory.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-lg border px-3 py-2",
                    roleBlock(m.role),
                  )}
                >
                  <p
                    className={cn(
                      "text-[10px] font-bold uppercase mb-1",
                      roleLabel(m.role),
                    )}
                  >
                    {m.role}
                  </p>
                  <p className="text-xs whitespace-pre-wrap break-words text-foreground">
                    {m.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {legacyRag && (
          <div className="rounded-xl border border-border/50 bg-card/60 overflow-hidden">
            <div className="px-4 py-2.5 bg-muted/30 border-b border-border/40">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Contexto RAG (truncado a 3k chars)
              </p>
            </div>
            <pre className="text-xs p-4 whitespace-pre-wrap break-words font-mono max-h-60 overflow-y-auto">
              {legacyRag}
            </pre>
          </div>
        )}
      </div>
    );
  }

  // Full snapshot mode
  const totals = requestPayload.totals;
  const settings = requestPayload.settings;
  const actualPromptTokens = trace.tokens_input ?? null;
  const tokenDelta =
    actualPromptTokens != null
      ? actualPromptTokens - totals.estimatedInputTokens
      : null;

  return (
    <div className="p-5 space-y-5">
      {/* Totals strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-lg border border-border/50 bg-card/60 px-3 py-2">
          <p className="text-[10px] uppercase text-muted-foreground tracking-wider">
            Mensagens
          </p>
          <p className="text-sm font-mono">
            {totals.messageCount}
            <span className="text-[10px] text-muted-foreground ml-1">
              ({totals.systemMessageCount}sys+{totals.historyMessageCount}hist)
            </span>
          </p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/60 px-3 py-2">
          <p className="text-[10px] uppercase text-muted-foreground tracking-wider">
            Tools expostas
          </p>
          <p className="text-sm font-mono">
            {totals.toolCount}
            <span className="text-[10px] text-muted-foreground ml-1">
              ({totals.toolsCharCount} chars)
            </span>
          </p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/60 px-3 py-2">
          <p className="text-[10px] uppercase text-muted-foreground tracking-wider">
            Prompt total
          </p>
          <p className="text-sm font-mono">
            {totals.promptCharCount.toLocaleString("pt-BR")} chars
          </p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/60 px-3 py-2">
          <p className="text-[10px] uppercase text-muted-foreground tracking-wider">
            Tokens (est. / real)
          </p>
          <p className="text-sm font-mono">
            ~{totals.estimatedInputTokens.toLocaleString("pt-BR")} /{" "}
            {actualPromptTokens != null
              ? actualPromptTokens.toLocaleString("pt-BR")
              : "—"}
            {tokenDelta != null && (
              <span
                className={cn(
                  "text-[10px] ml-1",
                  Math.abs(tokenDelta) > totals.estimatedInputTokens * 0.3
                    ? "text-amber-400"
                    : "text-muted-foreground",
                )}
              >
                ({tokenDelta >= 0 ? "+" : ""}
                {tokenDelta})
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Settings */}
      <div className="rounded-xl border border-border/50 bg-card/60 overflow-hidden">
        <div className="px-4 py-2 bg-muted/30 border-b border-border/40">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Settings da chamada
          </p>
        </div>
        <div className="p-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono">
          <span>
            <span className="text-muted-foreground">model:</span>{" "}
            {trace.model_used ?? "—"}
          </span>
          {settings.temperature != null && (
            <span>
              <span className="text-muted-foreground">temp:</span>{" "}
              {settings.temperature}
            </span>
          )}
          {settings.maxTokens != null && (
            <span>
              <span className="text-muted-foreground">maxTokens:</span>{" "}
              {settings.maxTokens}
            </span>
          )}
          {settings.reasoningEffort && (
            <span>
              <span className="text-muted-foreground">reasoningEffort:</span>{" "}
              {settings.reasoningEffort}
            </span>
          )}
          {settings.topP != null && (
            <span>
              <span className="text-muted-foreground">topP:</span>{" "}
              {settings.topP}
            </span>
          )}
          {reasoningTokens != null && reasoningTokens > 0 && (
            <span>
              <span className="text-muted-foreground">reasoningTokens:</span>{" "}
              {reasoningTokens}
            </span>
          )}
        </div>
      </div>

      {/* Full message stack */}
      <div className="rounded-xl border border-border/50 bg-card/60 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border/40">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Mensagens enviadas ao LLM (ordem real)
          </p>
          <span className="text-[10px] font-mono text-muted-foreground">
            {requestPayload.messages.length} blocos
          </span>
        </div>
        <div className="p-3 space-y-2 max-h-[600px] overflow-y-auto">
          {requestPayload.messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "rounded-lg border px-3 py-2",
                roleBlock(m.role),
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <p
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wide",
                    roleLabel(m.role),
                  )}
                >
                  #{i + 1} · {m.role}
                </p>
                <p className="text-[10px] font-mono text-muted-foreground">
                  {m.charCount.toLocaleString("pt-BR")} chars
                </p>
              </div>
              <pre className="text-xs whitespace-pre-wrap break-words font-mono leading-relaxed text-foreground">
                {m.content}
              </pre>
            </div>
          ))}
        </div>
      </div>

      {/* Tools list */}
      {requestPayload.tools.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card/60 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border/40">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tools expostas ao LLM (descriptions)
            </p>
            <span className="text-[10px] font-mono text-muted-foreground">
              {requestPayload.tools.length} tools
            </span>
          </div>
          <div className="p-3 space-y-2 max-h-72 overflow-y-auto">
            {requestPayload.tools.map((t) => (
              <div
                key={t.name}
                className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-mono font-semibold">{t.name}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">
                    {t.descriptionCharCount} chars
                  </p>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
                  {t.description || "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reasoning */}
      {reasoning && reasoning.length > 0 && (
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-purple-500/10 border-b border-purple-500/20">
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-300">
              Chain-of-thought / Reasoning
            </p>
            <span className="text-[10px] font-mono text-purple-300/70">
              {reasoning.length.toLocaleString("pt-BR")} chars
              {reasoningTokens ? ` · ${reasoningTokens} tokens` : ""}
            </span>
          </div>
          <pre className="text-xs p-4 whitespace-pre-wrap break-words font-mono leading-relaxed max-h-72 overflow-y-auto text-purple-100/90">
            {reasoning}
          </pre>
        </div>
      )}

      {/* Tool calls emitted */}
      {toolCallsList.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card/60 overflow-hidden">
          <div className="px-4 py-2.5 bg-muted/30 border-b border-border/40">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tool calls emitidas pelo LLM
            </p>
          </div>
          <div className="p-3 space-y-2">
            {toolCallsList.map((tc, i) => (
              <div
                key={i}
                className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2"
              >
                <p className="text-xs font-mono font-semibold mb-1">
                  {tc.name}
                </p>
                <pre className="text-[11px] whitespace-pre-wrap break-words font-mono text-muted-foreground leading-relaxed">
                  {tc.arguments}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final response */}
      {finalResponse && (
        <div className="rounded-xl border border-uzz-mint/30 bg-uzz-mint/5 overflow-hidden">
          <div className="px-4 py-2.5 bg-uzz-mint/10 border-b border-uzz-mint/20">
            <p className="text-xs font-semibold uppercase tracking-wider text-uzz-mint">
              Resposta final do LLM
            </p>
          </div>
          <pre className="text-xs p-4 whitespace-pre-wrap break-words font-mono leading-relaxed text-foreground">
            {finalResponse}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { key: "all", label: "Todas" },
  { key: "pending", label: "Pendentes" },
  { key: "success", label: "Concluidas" },
  { key: "failed", label: "Falhas" },
  { key: "needs_review", label: "Revisão" },
  { key: "evaluated", label: "Avaliadas" },
  { key: "reviewed", label: "Com review" },
] as const;

interface TraceClientGroup {
  key: string;
  name: string;
  phone: string;
  latestTrace: TraceRow;
  traces: TraceRow[];
  total: number;
  feedbackCount: number;
}

interface TracesClientProps {
  initialTraceId?: string;
}

export function TracesClient({ initialTraceId }: TracesClientProps = {}) {
  const [traces, setTraces] = useState<TraceRow[]>([]);
  const [meta, setMeta] = useState<TracesMeta | null>(null);
  const [selected, setSelected] = useState<TraceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tab, setTab] = useState<DetailTab>("prompt");
  const [refreshing, setRefreshing] = useState(false);
  const [promotingTraceId, setPromotingTraceId] = useState<string | null>(null);
  const [feedbackSubmittingTraceId, setFeedbackSubmittingTraceId] = useState<
    string | null
  >(null);
  const [feedbackByTraceId, setFeedbackByTraceId] = useState<
    Record<string, "correct" | "incorrect" | "partial">
  >({});
  const [alertCount, setAlertCount] = useState(0);
  const [criticalAlertCount, setCriticalAlertCount] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const initialTraceFetchedRef = useRef(false);

  const fetchTraces = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setListError(null);
    try {
      const [tracesRes, alertsRes] = await Promise.all([
        fetch("/api/traces?limit=100"),
        fetch("/api/quality/alerts"),
      ]);

      if (!tracesRes.ok) {
        const reason = await tracesRes.text().catch(() => "");
        throw new Error(
          `Falha ao carregar traces (${tracesRes.status})${
            reason ? `: ${reason.slice(0, 180)}` : ""
          }`,
        );
      }
      const json = await tracesRes.json();
      setTraces(json.data ?? []);
      setMeta(json.meta ?? null);

      if (alertsRes.ok) {
        const alertsJson = (await alertsRes.json()) as QualityAlertsResponse;
        const alerts = alertsJson.data?.alerts ?? [];
        setAlertCount(alerts.length);
        setCriticalAlertCount(
          alerts.filter((alert) => alert.severity === "critical").length,
        );
      } else {
        setAlertCount(0);
        setCriticalAlertCount(0);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar traces";
      setListError(message);
      setTraces([]);
      setMeta(null);
      setAlertCount(0);
      setCriticalAlertCount(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTraces();
  }, [fetchTraces]);

  useEffect(() => {
    if (!initialTraceId || initialTraceFetchedRef.current) return;
    initialTraceFetchedRef.current = true;
    void fetchDetail(initialTraceId);
  }, [initialTraceId]);

  const fetchDetail = async (id: string) => {
    setDetailLoading(true);
    setDetailError(null);
    setTab("prompt");
    try {
      const res = await fetch(`/api/traces/${id}`);
      if (!res.ok) {
        const reason = await res.text().catch(() => "");
        throw new Error(
          `Falha ao carregar detalhe (${res.status})${
            reason ? `: ${reason.slice(0, 180)}` : ""
          }`,
        );
      }
      const json = await res.json();
      setSelected(json.data);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao carregar detalhe do trace";
      setDetailError(message);
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const promoteToGroundTruth = async (trace: TraceDetail) => {
    try {
      const suggested = (trace.agent_response ?? "").trim();
      const expectedResponse = window.prompt(
        "Resposta esperada para Ground Truth:",
        suggested || "",
      );
      if (!expectedResponse || !expectedResponse.trim()) {
        return;
      }

      setPromotingTraceId(trace.id);
      const res = await fetch("/api/ground-truth/from-trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trace_id: trace.id,
          expected_response: expectedResponse.trim(),
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? `HTTP ${res.status}`);
      }

      await res.json().catch(() => ({}));
      alert("Trace promovido para Ground Truth com sucesso.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      alert(`Nao foi possivel promover para Ground Truth: ${message}`);
    } finally {
      setPromotingTraceId(null);
    }
  };

  const submitHumanFeedback = async ({
    trace,
    verdict,
  }: {
    trace: TraceDetail;
    verdict: "correct" | "incorrect" | "partial";
  }) => {
    try {
      setFeedbackSubmittingTraceId(trace.id);

      const reasonDefault =
        verdict === "correct"
          ? "Resposta aprovada pelo operador"
          : verdict === "incorrect"
          ? "Resposta marcada como ruim pelo operador"
          : "Resposta parcialmente correta";

      const reasonInput =
        verdict === "correct"
          ? reasonDefault
          : window.prompt("Motivo rápido da avaliação:", reasonDefault) ??
            reasonDefault;

      let correctionText: string | undefined;
      let promoteToGroundTruth = false;

      if (verdict === "incorrect") {
        const correction = window.prompt(
          "Opcional: qual seria a resposta ideal? (ajuda no treino)",
          (trace.agent_response ?? "").trim(),
        );

        const normalized = correction?.trim();
        if (normalized) {
          correctionText = normalized;
          promoteToGroundTruth = window.confirm(
            "Promover essa correção para Ground Truth agora?",
          );
        }
      }

      const res = await fetch(`/api/evaluations/${trace.id}/human-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verdict,
          reason: reasonInput,
          correction_text: correctionText,
          promote_to_ground_truth: promoteToGroundTruth,
          error_category:
            verdict === "incorrect" ? "bad_generation" : undefined,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? `HTTP ${res.status}`);
      }

      setFeedbackByTraceId((prev) => ({
        ...prev,
        [trace.id]: verdict,
      }));

      setSelected((prev) => {
        if (!prev || prev.id !== trace.id) return prev;
        return {
          ...prev,
          status: "human_reviewed",
        };
      });

      setTraces((prev) =>
        prev.map((row) =>
          row.id === trace.id
            ? {
                ...row,
                status: "human_reviewed",
              }
            : row,
        ),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      alert(`Nao foi possivel salvar feedback: ${message}`);
    } finally {
      setFeedbackSubmittingTraceId(null);
    }
  };

  // Filtered traces
  const filtered = traces.filter((t) => {
    if (statusFilter === "reviewed" && !t.has_feedback) return false;
    if (
      statusFilter !== "all" &&
      statusFilter !== "reviewed" &&
      t.status !== statusFilter
    ) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        t.phone.includes(q) ||
        (t.contact_name ?? "").toLowerCase().includes(q) ||
        (t.user_message ?? "").toLowerCase().includes(q) ||
        (t.agent_response ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const grouped = filtered.reduce((acc, trace) => {
    const key = trace.phone || trace.id;
    const existing = acc.get(key);
    if (existing) {
      existing.traces.push(trace);
      existing.total += 1;
      existing.feedbackCount += trace.feedback_count ?? 0;
      if (
        new Date(trace.created_at).getTime() >
        new Date(existing.latestTrace.created_at).getTime()
      ) {
        existing.latestTrace = trace;
      }
      return acc;
    }

    acc.set(key, {
      key,
      name: trace.contact_name?.trim() || maskPhone(trace.phone),
      phone: trace.phone,
      latestTrace: trace,
      traces: [trace],
      total: 1,
      feedbackCount: trace.feedback_count ?? 0,
    });
    return acc;
  }, new Map<string, TraceClientGroup>());

  const clientGroups = Array.from(grouped.values()).sort(
    (a, b) =>
      new Date(b.latestTrace.created_at).getTime() -
      new Date(a.latestTrace.created_at).getTime(),
  );

  // Stats
  const totalToday = traces.length;
  const failedToday = traces.filter((t) => t.status === "failed").length;
  const avgLatency = traces.length
    ? Math.round(
        traces.reduce((s, t) => s + (t.latency_total_ms ?? 0), 0) /
          traces.length,
      )
    : 0;
  const costToday = meta?.costTodayUsd ?? 0;
  const coverage = meta?.metadataCoverage ?? null;
  const experienciaPct =
    coverage && coverage.contatos_no_periodo > 0
      ? Math.round(
          (coverage.com_experiencia / coverage.contatos_no_periodo) * 100,
        )
      : 0;
  const periodoDiaPct =
    coverage && coverage.contatos_no_periodo > 0
      ? Math.round(
          (coverage.com_periodo_ou_dia / coverage.contatos_no_periodo) * 100,
        )
      : 0;
  const pendingBucketMain =
    meta?.pendingBuckets &&
    Object.entries(meta.pendingBuckets).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-background">
      {/* ── Top stats bar ─────────────────────────────────────────────── */}
      <div className="border-b border-border/50 bg-card/60 px-4 py-3 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-5 w-5 text-uzz-mint" />
          <h1 className="text-lg font-bold font-poppins text-foreground">
            Traces de Mensagens
          </h1>
          <span className="text-xs text-muted-foreground ml-1">
            — rastreio completo de cada mensagem processada
          </span>
          <div className="ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchTraces(true)}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", refreshing && "animate-spin")}
              />
              Atualizar
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-7">
          <StatCard
            icon={MessageSquare}
            label="Mensagens hoje"
            value={String(totalToday)}
            sub="total processado"
          />
          <StatCard
            icon={DollarSign}
            label="Custo hoje"
            value={`$${costToday.toFixed(4)}`}
            sub="USD acumulado"
          />
          <StatCard
            icon={Clock}
            label="Latência média"
            value={formatMs(avgLatency || null)}
            sub="tempo total"
          />
          <StatCard
            icon={AlertCircle}
            label="Falhas"
            value={String(failedToday)}
            sub={`${
              totalToday ? Math.round((failedToday / totalToday) * 100) : 0
            }% do total`}
            accent={failedToday > 0 ? "bg-red-500/10" : undefined}
          />
          <StatCard
            icon={Sparkles}
            label="Cobertura Experiência"
            value={`${experienciaPct}%`}
            sub={
              coverage
                ? `${coverage.com_experiencia}/${coverage.contatos_no_periodo} contatos`
                : "sem dados"
            }
          />
          <StatCard
            icon={Clock}
            label="Cobertura Período/Dia"
            value={`${periodoDiaPct}%`}
            sub={
              coverage
                ? `${coverage.com_periodo_ou_dia}/${coverage.contatos_no_periodo} contatos`
                : "sem dados"
            }
          />
          <StatCard
            icon={AlertTriangle}
            label="Alertas 15m"
            value={String(alertCount)}
            sub={
              criticalAlertCount > 0
                ? `${criticalAlertCount} crítico(s)`
                : "sem críticos"
            }
            accent={criticalAlertCount > 0 ? "bg-red-500/10" : undefined}
          />
        </div>
        {pendingBucketMain && pendingBucketMain[1] > 0 && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Principal bucket de pending:{" "}
            <span className="font-mono">{pendingBucketMain[0]}</span> (
            {pendingBucketMain[1]})
          </p>
        )}
      </div>

      {/* ── Body: list + detail ────────────────────────────────────────── */}
      {listError && (
        <div className="mx-4 mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {listError}
        </div>
      )}

      {detailError && (
        <div className="mx-4 mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
          {detailError}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT — list ──────────────────────────────────────────────────── */}
        <div className="w-full max-w-sm shrink-0 flex flex-col border-r border-border/50 bg-card/40">
          {/* Filters */}
          <div className="p-3 space-y-2 border-b border-border/40 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                ref={searchRef}
                placeholder="Buscar por cliente, telefone ou mensagem..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors",
                    statusFilter === f.key
                      ? "bg-uzz-mint/20 text-uzz-mint border-uzz-mint/40"
                      : "bg-muted/40 text-muted-foreground border-border/50 hover:bg-muted/70",
                  )}
                >
                  {f.label}
                  {f.key !== "all" && f.key !== "reviewed" && (
                    <span className="ml-1 opacity-60">
                      {traces.filter((t) => t.status === f.key).length}
                    </span>
                  )}
                  {f.key === "reviewed" && (
                    <span className="ml-1 opacity-60">
                      {traces.filter((t) => t.has_feedback).length}
                    </span>
                  )}
                  {f.key === "all" && (
                    <span className="ml-1 opacity-60">{traces.length}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : clientGroups.length === 0 ? (
              <EmptyList
                filtered={search.length > 0 || statusFilter !== "all"}
              />
            ) : (
              clientGroups.map((group) => (
                <TraceClientGroupItem
                  key={group.key}
                  group={group}
                  selectedId={selected?.id ?? null}
                  onTraceClick={fetchDetail}
                />
              ))
            )}
          </div>
        </div>

        {/* RIGHT — detail ───────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {detailLoading ? (
            <div className="flex items-center justify-center flex-1">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : !selected ? (
            <EmptyDetail />
          ) : (
            <>
              {/* Detail header */}
              <div className="border-b border-border/50 bg-card/60 px-5 py-3 shrink-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground">
                        {selected.contact_name || maskPhone(selected.phone)}
                      </span>
                      {selected.contact_name && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {maskPhone(selected.phone)}
                        </span>
                      )}
                    </div>
                    <StatusBadge status={selected.status} />
                    {selected.has_feedback && (
                      <span className="rounded-full border border-uzz-mint/40 bg-uzz-mint/10 px-1.5 py-0.5 text-[10px] font-medium text-uzz-mint">
                        review
                      </span>
                    )}
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                  <span className="text-xs text-muted-foreground font-mono truncate max-w-[180px]">
                    {selected.id}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {timeAgo(selected.created_at)}
                  </span>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-border/40 bg-card/40 px-5 shrink-0">
                <div className="flex gap-0">
                  {(
                    [
                      {
                        key: "prompt",
                        label: "Prompt & Historico",
                        icon: FileText,
                      },
                      {
                        key: "toolcalls",
                        label: `Tool Calls ${
                          selected.tool_calls.length > 0
                            ? `(${selected.tool_calls.length})`
                            : ""
                        }`,
                        icon: Wrench,
                      },
                      { key: "overview", label: "Resumo", icon: Activity },
                      { key: "rag", label: "RAG", icon: Search },
                    ] as {
                      key: DetailTab;
                      label: string;
                      icon: React.FC<{ className?: string }>;
                    }[]
                  ).map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className={cn(
                        "flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors",
                        tab === t.key
                          ? "border-uzz-mint text-uzz-mint"
                          : "border-transparent text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <t.icon className="h-3.5 w-3.5" />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto">
                {tab === "overview" && (
                  <OverviewTab
                    trace={selected}
                    onPromote={promoteToGroundTruth}
                    promoting={promotingTraceId === selected.id}
                    onSubmitFeedback={submitHumanFeedback}
                    feedbackSubmitting={
                      feedbackSubmittingTraceId === selected.id
                    }
                    feedbackDone={feedbackByTraceId[selected.id] ?? null}
                  />
                )}
                {tab === "toolcalls" && (
                  <ToolCallsTab toolCalls={selected.tool_calls} />
                )}
                {tab === "rag" && <RagTab retrieval={selected.retrieval} />}
                {tab === "prompt" && <PromptTab trace={selected} />}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Trace list item ──────────────────────────────────────────────────────────

function TraceClientGroupItem({
  group,
  selectedId,
  onTraceClick,
}: {
  group: TraceClientGroup;
  selectedId: string | null;
  onTraceClick: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const latest = group.latestTrace;
  const cfg = STATUS[latest.status as StatusKey] ?? STATUS.pending;
  const StatusIcon = cfg.icon;

  return (
    <div className="border-b border-border/40">
      <button
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "w-full px-4 py-3 text-left transition-colors hover:bg-muted/40",
          group.traces.some((trace) => trace.id === selectedId) &&
            "bg-primary/5",
        )}
      >
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-foreground">
                {group.name}
              </span>
              {group.feedbackCount > 0 && (
                <span className="rounded-full border border-uzz-mint/40 bg-uzz-mint/10 px-1.5 py-0.5 text-[10px] font-medium text-uzz-mint">
                  review
                </span>
              )}
            </div>
            <p className="font-mono text-[10px] text-muted-foreground">
              {maskPhone(group.phone)}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
              cfg.color,
            )}
          >
            <StatusIcon className="h-2.5 w-2.5" />
            {cfg.label}
          </span>
          <ChevronRight
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-90",
            )}
          />
        </div>
        <p className="mt-2 truncate text-xs text-muted-foreground">
          {latest.user_message?.slice(0, 92) || "sem mensagem"}
        </p>
        <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
          <span>{group.total} mensagem{group.total !== 1 ? "s" : ""}</span>
          <span>{timeAgo(latest.created_at)}</span>
          {group.feedbackCount > 0 && <span>{group.feedbackCount} review</span>}
        </div>
      </button>

      {open && (
        <div className="border-t border-border/30 bg-background/30">
          {group.traces.map((trace) => (
            <TraceListItem
              key={trace.id}
              trace={trace}
              isSelected={selectedId === trace.id}
              onClick={() => onTraceClick(trace.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TraceListItem({
  trace,
  isSelected,
  onClick,
}: {
  trace: TraceRow;
  isSelected: boolean;
  onClick: () => void;
}) {
  const cfg = STATUS[trace.status as StatusKey] ?? STATUS.pending;
  const StatusIcon = cfg.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left flex flex-col gap-1.5 px-4 py-3 border-b border-border/40 transition-all duration-150",
        isSelected
          ? "bg-gradient-to-r from-primary/10 to-transparent border-l-2 border-l-uzz-mint"
          : "hover:bg-muted/40 border-l-2 border-l-transparent",
      )}
    >
      {/* Row 1: phone + status + time */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-semibold text-foreground">
          {maskPhone(trace.phone)}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
            cfg.color,
          )}
        >
          <StatusIcon className="h-2.5 w-2.5" />
          {cfg.label}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
          {timeAgo(trace.created_at)}
        </span>
      </div>

      {/* Row 2: message preview */}
      <p className="text-xs text-muted-foreground truncate leading-snug">
        {trace.user_message?.slice(0, 70) || <em>sem mensagem</em>}
      </p>

      {/* Row 3: metrics */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-0.5">
          <Clock className="h-2.5 w-2.5" />
          {formatMs(trace.latency_total_ms)}
        </span>
        <span className="flex items-center gap-0.5">
          <DollarSign className="h-2.5 w-2.5" />
          {formatCost(trace.cost_usd)}
        </span>
        {trace.model_used && (
          <span className="font-mono truncate max-w-[90px]">
            {trace.model_used.split("/").pop()}
          </span>
        )}
      </div>
    </button>
  );
}

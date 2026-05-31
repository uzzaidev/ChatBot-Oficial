"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import {
  buildSystemPromptSegments,
  type PromptApplyTarget,
  type PromptSegment,
} from "@/lib/prompt-builder";
import type { Agent } from "@/lib/types";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageSquare,
  Sparkles,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { AgentEditorTab } from "./RawPromptPreview";

type Severity = "high" | "medium" | "low";

interface Suggestion {
  id: string;
  sectionTag: string;
  sectionLabel: string;
  title: string;
  severity: Severity;
  rationale: string;
  currentExcerpt: string | null;
  suggestedValue: string | null;
  apply: PromptApplyTarget;
  status: "open" | "applied" | "dismissed";
}

interface EvaluationResult {
  id: string | null;
  overallScore: number;
  overallAssessment: string;
  suggestions: Suggestion[];
  evaluatorProvider: string;
  evaluatorModel: string;
  usage: { tokensInput: number; tokensOutput: number };
  durationMs: number;
  persisted?: boolean;
}

interface TraceRow {
  id: string;
  phone: string;
  user_message: string | null;
  agent_response: string | null;
  model_used: string | null;
  created_at: string;
  contact_name?: string | null;
}

interface PromptEvaluatorPanelProps {
  /** Agent id; null when creating a new (unsaved) agent → evaluation disabled. */
  agentId: string | null;
  agent: Partial<Agent>;
  /** Writes an accepted suggestion back into the editor form. */
  onApply: (target: PromptApplyTarget, value: string) => void;
  /** Navigate to the editor field that controls a section. */
  onNavigate: (tab: AgentEditorTab, fieldId?: string) => void;
}

const EVALUATOR_MODELS: Array<{
  provider: "openai" | "groq";
  value: string;
  label: string;
}> = [
  { provider: "openai", value: "gpt-5.4-mini", label: "GPT-5.4 Mini" },
  { provider: "openai", value: "gpt-5.4", label: "GPT-5.4" },
  { provider: "openai", value: "gpt-4o", label: "GPT-4o" },
  { provider: "openai", value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { provider: "openai", value: "gpt-4.1", label: "GPT-4.1" },
  {
    provider: "groq",
    value: "llama-3.3-70b-versatile",
    label: "Llama 3.3 70B (Groq)",
  },
];

const severityStyles: Record<Severity, string> = {
  high: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  medium:
    "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  low: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
};

const severityLabel: Record<Severity, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

const scoreColor = (score: number): string => {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
};

export const PromptEvaluatorPanel = ({
  agentId,
  agent,
  onApply,
  onNavigate,
}: PromptEvaluatorPanelProps) => {
  const [model, setModel] = useState<string>("gpt-5.4-mini");
  const [focus, setFocus] = useState<string>("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);

  const [showTracePicker, setShowTracePicker] = useState(false);
  const [traces, setTraces] = useState<TraceRow[]>([]);
  const [tracesLoading, setTracesLoading] = useState(false);
  const [selectedTrace, setSelectedTrace] = useState<TraceRow | null>(null);

  // Map each section tag back to the editor tab/field for "edit manually".
  const navByTag = useMemo(() => {
    const map = new Map<string, { tab: AgentEditorTab; fieldId?: string }>();
    const segments: PromptSegment[] = buildSystemPromptSegments(agent as Agent);
    for (const segment of segments) {
      if (segment.source.editable) {
        map.set(segment.tag, {
          tab: segment.source.tab as AgentEditorTab,
          fieldId: segment.source.fieldId,
        });
      }
    }
    return map;
  }, [agent]);

  const selectedModel = EVALUATOR_MODELS.find((m) => m.value === model);
  const provider = selectedModel?.provider ?? "openai";

  const loadTraces = async () => {
    if (!agentId) return;
    setTracesLoading(true);
    try {
      const res = await apiFetch("/api/traces?limit=15");
      if (!res.ok) throw new Error("Falha ao buscar mensagens");
      const json = (await res.json()) as { data?: TraceRow[] };
      setTraces(json.data ?? []);
    } catch (error) {
      toast({
        title: "Erro ao buscar mensagens",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setTracesLoading(false);
    }
  };

  const handleToggleTracePicker = () => {
    const next = !showTracePicker;
    setShowTracePicker(next);
    if (next && traces.length === 0) {
      void loadTraces();
    }
  };

  const handleEvaluate = async () => {
    if (!agentId) return;
    setIsEvaluating(true);
    try {
      const res = await apiFetch(`/api/agents/${agentId}/evaluate-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          model,
          traceId: selectedTrace?.id ?? null,
          focus: focus.trim() || null,
        }),
      });
      const json = (await res.json()) as {
        evaluation?: EvaluationResult;
        error?: string;
      };
      if (!res.ok || !json.evaluation) {
        throw new Error(json.error ?? "Falha ao avaliar o prompt");
      }
      setResult(json.evaluation);
      toast({
        title: "Avaliação concluída",
        description: `${json.evaluation.suggestions.length} sugestão(ões) gerada(s).`,
      });
    } catch (error) {
      toast({
        title: "Erro na avaliação",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const updateSuggestionStatus = (id: string, status: Suggestion["status"]) => {
    setResult((prev) =>
      prev
        ? {
            ...prev,
            suggestions: prev.suggestions.map((s) =>
              s.id === id ? { ...s, status } : s,
            ),
          }
        : prev,
    );
  };

  const handleApply = (suggestion: Suggestion) => {
    if (suggestion.apply.kind === "advisory" || !suggestion.suggestedValue) {
      return;
    }
    onApply(suggestion.apply, suggestion.suggestedValue);
    updateSuggestionStatus(suggestion.id, "applied");
    toast({
      title: "Sugestão aplicada",
      description: `"${suggestion.title}" foi preenchida no editor. Salve para confirmar.`,
    });
  };

  const handleNavigate = (suggestion: Suggestion) => {
    const nav = navByTag.get(suggestion.sectionTag);
    if (nav) {
      onNavigate(nav.tab, nav.fieldId);
    }
  };

  if (!agentId) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        <Sparkles className="mx-auto mb-2 h-5 w-5 opacity-60" />
        Salve o agente primeiro para liberar a avaliação do prompt por IA.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">
            Avaliar prompt com especialista de IA
          </h3>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Um engenheiro de prompts (IA) revisa o prompt compilado e sugere
          melhorias por seção. Você aprova e aplica cada sugestão.
        </p>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground">
            Modelo avaliador:
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            {EVALUATOR_MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToggleTracePicker}
            className="h-8 gap-1 text-xs"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {selectedTrace ? "Mensagem referenciada" : "Referenciar mensagem"}
            {showTracePicker ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {selectedTrace && (
          <div className="mb-3 flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">
            <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {selectedTrace.contact_name ?? selectedTrace.phone}
              </p>
              <p className="truncate text-muted-foreground">
                {selectedTrace.user_message ?? "(sem texto)"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedTrace(null)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Remover referência"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {showTracePicker && (
          <div className="mb-3 max-h-52 overflow-y-auto rounded-md border border-border">
            {tracesLoading ? (
              <div className="flex items-center justify-center gap-2 p-4 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Carregando mensagens...
              </div>
            ) : traces.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                Nenhuma mensagem encontrada.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {traces.map((trace) => (
                  <li key={trace.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTrace(trace);
                        setShowTracePicker(false);
                      }}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-muted/50"
                    >
                      <p className="truncate font-medium">
                        {trace.contact_name ?? trace.phone}
                      </p>
                      <p className="truncate text-muted-foreground">
                        {trace.user_message ?? "(sem texto)"}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <Textarea
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          placeholder="Opcional: foco da avaliação (ex: reduzir alucinação, melhorar tom comercial)..."
          className="mb-3 min-h-[60px] text-xs"
        />

        <Button
          type="button"
          onClick={handleEvaluate}
          disabled={isEvaluating}
          className="gap-2"
          size="sm"
        >
          {isEvaluating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isEvaluating ? "Avaliando..." : "Avaliar com IA"}
        </Button>
      </div>

      {result && (
        <div className="space-y-3">
          <div className="rounded-lg border border-border p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">Avaliação geral</span>
              <span
                className={`text-2xl font-bold ${scoreColor(
                  result.overallScore,
                )}`}
              >
                {result.overallScore}
                <span className="text-sm text-muted-foreground">/100</span>
              </span>
            </div>
            {result.overallAssessment && (
              <p className="text-sm text-muted-foreground">
                {result.overallAssessment}
              </p>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">
              {result.evaluatorProvider} · {result.evaluatorModel} ·{" "}
              {result.usage.tokensInput + result.usage.tokensOutput} tokens ·{" "}
              {(result.durationMs / 1000).toFixed(1)}s
              {result.persisted === false && " · (não salvo)"}
            </p>
          </div>

          {result.suggestions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              Nenhuma sugestão — o prompt está bem estruturado.
            </div>
          ) : (
            result.suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                canNavigate={navByTag.has(suggestion.sectionTag)}
                onApply={() => handleApply(suggestion)}
                onDismiss={() =>
                  updateSuggestionStatus(suggestion.id, "dismissed")
                }
                onNavigate={() => handleNavigate(suggestion)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

interface SuggestionCardProps {
  suggestion: Suggestion;
  canNavigate: boolean;
  onApply: () => void;
  onDismiss: () => void;
  onNavigate: () => void;
}

const SuggestionCard = ({
  suggestion,
  canNavigate,
  onApply,
  onDismiss,
  onNavigate,
}: SuggestionCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const isAdvisory =
    suggestion.apply.kind === "advisory" || !suggestion.suggestedValue;
  const dismissed = suggestion.status === "dismissed";
  const applied = suggestion.status === "applied";

  return (
    <div
      className={`rounded-lg border p-3 transition-opacity ${
        dismissed ? "border-border opacity-50" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={`text-[10px] ${severityStyles[suggestion.severity]}`}
            >
              {severityLabel[suggestion.severity]}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {suggestion.sectionLabel}
            </Badge>
            {applied && (
              <Badge className="gap-1 bg-emerald-500/15 text-[10px] text-emerald-600 dark:text-emerald-400">
                <Check className="h-3 w-3" /> Aplicada
              </Badge>
            )}
            {isAdvisory && !applied && (
              <Badge variant="secondary" className="text-[10px]">
                Apenas orientação
              </Badge>
            )}
          </div>
          <p className="text-sm font-medium">{suggestion.title}</p>
        </div>
      </div>

      {suggestion.rationale && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {suggestion.rationale}
        </p>
      )}

      {!isAdvisory && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
        >
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
          {expanded ? "Ocultar comparação" : "Ver antes / depois"}
        </button>
      )}

      {expanded && !isAdvisory && (
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <div className="rounded-md border border-red-500/30 bg-red-500/5 p-2">
            <p className="mb-1 text-[10px] font-semibold uppercase text-red-600 dark:text-red-400">
              Atual
            </p>
            <pre className="whitespace-pre-wrap break-words text-[11px] text-muted-foreground">
              {suggestion.currentExcerpt ?? "(vazio)"}
            </pre>
          </div>
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2">
            <p className="mb-1 text-[10px] font-semibold uppercase text-emerald-600 dark:text-emerald-400">
              Sugerido
            </p>
            <pre className="whitespace-pre-wrap break-words text-[11px]">
              {suggestion.suggestedValue}
            </pre>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {!isAdvisory && !applied && !dismissed && (
          <Button
            type="button"
            size="sm"
            onClick={onApply}
            className="h-7 gap-1 text-xs"
          >
            <Check className="h-3.5 w-3.5" /> Aplicar
          </Button>
        )}
        {canNavigate && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onNavigate}
            className="h-7 text-xs"
          >
            Editar manualmente
          </Button>
        )}
        {!dismissed && !applied && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onDismiss}
            className="h-7 gap-1 text-xs text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" /> Descartar
          </Button>
        )}
      </div>
    </div>
  );
};

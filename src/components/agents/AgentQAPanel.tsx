"use client";

import {
  PromptSuggestionCard,
  type SuggestionView,
} from "@/components/agents/PromptSuggestionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import {
  buildSystemPromptSegments,
  type PromptApplyTarget,
  type PromptSegment,
} from "@/lib/prompt-builder";
import type {
  Agent,
  AgentQAEvaluation,
  AgentQAQuestion,
  AgentQAQuestionReview,
  AgentQAReport,
  AgentQAResultItem,
} from "@/lib/types";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Loader2,
  Play,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { AgentEditorTab } from "./RawPromptPreview";

interface AgentQAPanelProps {
  /** Agent id; null when creating a new (unsaved) agent → QA disabled. */
  agentId: string | null;
  /** Current form values (used as liveConfig so QA tests unsaved edits too). */
  agent: Partial<Agent>;
  /** Writes the edited question battery back into the editor form. */
  onQuestionsChange: (questions: AgentQAQuestion[]) => void;
  /** Applies an evaluation suggestion back into the editor form. */
  onApplySuggestion: (target: PromptApplyTarget, value: string) => void;
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
  {
    provider: "groq",
    value: "llama-3.3-70b-versatile",
    label: "Llama 3.3 70B (Groq)",
  },
];

const newId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const scoreColor = (score: number): string => {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
};

const verdictStyles: Record<AgentQAQuestionReview["verdict"], string> = {
  good: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  partial:
    "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  bad: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
};

const verdictLabel: Record<AgentQAQuestionReview["verdict"], string> = {
  good: "Boa",
  partial: "Parcial",
  bad: "Ruim",
};

export const AgentQAPanel = ({
  agentId,
  agent,
  onQuestionsChange,
  onApplySuggestion,
  onNavigate,
}: AgentQAPanelProps) => {
  const questions: AgentQAQuestion[] = agent.qa_questions ?? [];

  const [bulkText, setBulkText] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({
    done: 0,
    total: 0,
  });
  const [results, setResults] = useState<AgentQAResultItem[]>([]);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedThisRun, setSavedThisRun] = useState(false);

  // History of saved reports
  const [reports, setReports] = useState<AgentQAReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(true);

  // Map each editable section tag → editor tab/field, for "edit manually".
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

  const loadReports = async () => {
    if (!agentId) return;
    setReportsLoading(true);
    try {
      const res = await apiFetch(`/api/agents/${agentId}/qa/reports?limit=20`);
      const data = await res.json();
      if (res.ok) setReports(data.reports || []);
    } catch (err) {
      console.warn("Failed to load QA reports", err);
    } finally {
      setReportsLoading(false);
    }
  };

  useEffect(() => {
    if (agentId) void loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  // ── Question battery editing ──────────────────────────────────────────────
  const updateQuestion = (id: string, text: string) => {
    onQuestionsChange(questions.map((q) => (q.id === id ? { ...q, text } : q)));
  };

  const addQuestion = () => {
    onQuestionsChange([...questions, { id: newId(), text: "" }]);
  };

  const removeQuestion = (id: string) => {
    onQuestionsChange(questions.filter((q) => q.id !== id));
  };

  const importBulk = () => {
    const lines = bulkText
      .split("\n")
      .map((l) => l.replace(/^\s*\d+[.)\-]\s*/, "").trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    onQuestionsChange([
      ...questions,
      ...lines.map((text) => ({ id: newId(), text })),
    ]);
    setBulkText("");
    toast({
      title: "Perguntas importadas",
      description: `${lines.length} pergunta(s) adicionada(s) à bateria.`,
    });
  };

  // ── Run the battery ───────────────────────────────────────────────────────
  const handleRun = async () => {
    if (!agentId) return;
    const valid = questions.filter((q) => q.text.trim());
    if (valid.length === 0) {
      toast({
        title: "Bateria vazia",
        description: "Adicione pelo menos uma pergunta antes de rodar.",
        variant: "destructive",
      });
      return;
    }

    setRunning(true);
    setSavedThisRun(false);
    setResults([]);
    setProgress({ done: 0, total: valid.length });

    const collected: AgentQAResultItem[] = [];

    for (let i = 0; i < valid.length; i++) {
      const q = valid[i];
      try {
        const res = await apiFetch(`/api/agents/${agentId}/test`, {
          method: "POST",
          body: JSON.stringify({
            message: q.text,
            liveConfig: agent,
            // No history: each question is answered individually/in isolation.
          }),
        });
        const data = await res.json();

        const item: AgentQAResultItem = res.ok
          ? {
              id: q.id,
              question: q.text,
              response: data.response ?? "",
              error: null,
              latencyMs:
                typeof data.latencyMs === "number" ? data.latencyMs : null,
              model: data.model ?? data.meta?.modelUsed ?? null,
              provider: data.provider ?? data.meta?.primaryProvider ?? null,
              toolCallNames: Array.isArray(data.meta?.toolCallNames)
                ? data.meta.toolCallNames
                : [],
              ragChunkCount: data.meta?.ragChunkCount ?? 0,
              historySource: data.meta?.historySource ?? null,
            }
          : {
              id: q.id,
              question: q.text,
              response: null,
              error: data.error || "Falha ao gerar resposta",
              latencyMs: null,
              model: null,
              provider: null,
              toolCallNames: [],
              ragChunkCount: 0,
              historySource: null,
            };

        collected.push(item);
      } catch (err) {
        collected.push({
          id: q.id,
          question: q.text,
          response: null,
          error: err instanceof Error ? err.message : "Erro de rede",
          latencyMs: null,
          model: null,
          provider: null,
          toolCallNames: [],
          ragChunkCount: 0,
          historySource: null,
        });
      }

      setResults([...collected]);
      setProgress({ done: i + 1, total: valid.length });
    }

    setRunning(false);
    toast({
      title: "Bateria concluída",
      description: `${valid.length} pergunta(s) respondida(s).`,
    });
  };

  // ── Save report ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!agentId || results.length === 0) return;
    setSaving(true);
    try {
      const provider = results.find((r) => r.provider)?.provider ?? null;
      const model = results.find((r) => r.model)?.model ?? null;

      const res = await apiFetch(`/api/agents/${agentId}/qa/reports`, {
        method: "POST",
        body: JSON.stringify({
          label: label.trim() || null,
          provider,
          model_used: model,
          agent_snapshot: {
            name: agent.name,
            primary_provider: agent.primary_provider,
            openai_model: agent.openai_model,
            groq_model: agent.groq_model,
            temperature: agent.temperature,
            reasoning_effort: agent.reasoning_effort,
            enable_rag: agent.enable_rag,
            enable_tools: agent.enable_tools,
            role_description: agent.role_description,
            primary_goal: agent.primary_goal,
            prompt_sections: agent.prompt_sections,
          },
          results,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao salvar relatório");

      setSavedThisRun(true);
      setLabel("");
      toast({
        title: "Relatório salvo",
        description: "Disponível no histórico abaixo. Avalie com IA quando quiser.",
      });
      void loadReports();
    } catch (err) {
      toast({
        title: "Erro ao salvar",
        description: err instanceof Error ? err.message : "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!agentId) return;
    try {
      const res = await apiFetch(
        `/api/agents/${agentId}/qa/reports/${reportId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error();
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      toast({ title: "Relatório excluído" });
    } catch {
      toast({ title: "Erro ao excluir relatório", variant: "destructive" });
    }
  };

  const handleEvaluated = (
    reportId: string,
    evaluation: AgentQAEvaluation,
  ) => {
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              evaluation,
              evaluator_model: evaluation.evaluatorModel,
              evaluated_at: new Date().toISOString(),
            }
          : r,
      ),
    );
  };

  if (!agentId) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        <ClipboardList className="mx-auto mb-2 h-5 w-5 opacity-60" />
        Salve o agente primeiro para liberar a bateria de QA.
      </div>
    );
  }

  const validCount = questions.filter((q) => q.text.trim()).length;

  return (
    <div className="space-y-6">
      {/* ── Question battery ── */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <div className="mb-1 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Bateria de perguntas</h3>
          <Badge variant="outline" className="ml-auto text-[10px]">
            {validCount} pergunta(s)
          </Badge>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Cada pergunta é respondida individualmente pelo agente (sem histórico
          entre elas), usando a configuração atual do formulário. Salve o agente
          para guardar esta bateria.
        </p>

        <div className="space-y-2">
          {questions.map((q, i) => (
            <div key={q.id} className="flex items-start gap-2">
              <span className="mt-2 w-5 shrink-0 text-right text-xs text-muted-foreground">
                {i + 1}.
              </span>
              <Textarea
                value={q.text}
                onChange={(e) => updateQuestion(q.id, e.target.value)}
                placeholder="Ex: Vocês fazem entrega no mesmo dia?"
                rows={1}
                className="min-h-[38px] resize-y text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-0.5 h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeQuestion(q.id)}
                aria-label="Remover pergunta"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addQuestion}
          className="mt-3 gap-1 text-xs"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar pergunta
        </Button>

        {/* Bulk import */}
        <div className="mt-4 space-y-2 border-t border-border pt-3">
          <Label className="text-xs text-muted-foreground">
            Importar várias (uma por linha)
          </Label>
          <Textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={"Cole aqui sua lista de perguntas,\numa por linha..."}
            rows={3}
            className="text-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={importBulk}
            disabled={!bulkText.trim()}
            className="gap-1 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Importar para a bateria
          </Button>
        </div>

        {/* Run */}
        <div className="mt-4 flex items-center gap-3 border-t border-border pt-3">
          <Button
            type="button"
            onClick={handleRun}
            disabled={running || validCount === 0}
            size="sm"
            className="gap-2"
          >
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {running
              ? `Rodando ${progress.done}/${progress.total}...`
              : "Rodar bateria"}
          </Button>
          {running && (
            <span className="text-xs text-muted-foreground">
              Aguarde — uma pergunta por vez.
            </span>
          )}
        </div>
      </div>

      {/* ── Current run results ── */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">
              Relatório da execução atual
            </h3>
            <div className="flex items-center gap-2">
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Rótulo (opcional)"
                className="h-8 w-44 text-xs"
                disabled={running}
              />
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={saving || running || savedThisRun}
                className="gap-1.5 text-xs"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {savedThisRun ? "Salvo" : "Salvar relatório"}
              </Button>
            </div>
          </div>
          {savedThisRun && (
            <p className="text-xs text-muted-foreground">
              Relatório salvo no histórico abaixo — abra-o para avaliar com IA.
            </p>
          )}

          {results.map((r, i) => (
            <QAResultCard key={r.id} index={i} result={r} />
          ))}
        </div>
      )}

      {/* ── Saved reports history ── */}
      <div className="rounded-lg border border-border">
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="flex w-full items-center justify-between p-3 text-sm font-medium"
        >
          <span className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            Relatórios salvos ({reports.length})
          </span>
          {showHistory ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {showHistory && (
          <div className="space-y-2 border-t border-border p-3">
            {reportsLoading ? (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando...
              </div>
            ) : reports.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Nenhum relatório salvo ainda.
              </p>
            ) : (
              reports.map((report) => (
                <SavedReportCard
                  key={report.id}
                  agentId={agentId}
                  report={report}
                  navByTag={navByTag}
                  onDelete={() => handleDeleteReport(report.id)}
                  onApplySuggestion={onApplySuggestion}
                  onNavigate={onNavigate}
                  onEvaluated={(evaluation) =>
                    handleEvaluated(report.id, evaluation)
                  }
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// =====================================================
// RESULT CARD (question + answer, optional verdict)
// =====================================================

const QAResultCard = ({
  index,
  result,
  review,
}: {
  index: number;
  result: AgentQAResultItem;
  review?: AgentQAQuestionReview;
}) => {
  return (
    <div
      className={`rounded-lg border p-3 ${
        result.error ? "border-red-500/40 bg-red-500/5" : "border-border"
      }`}
    >
      <div className="mb-1 flex items-start gap-2">
        <Badge variant="outline" className="shrink-0 text-[10px]">
          {index + 1}
        </Badge>
        <p className="flex-1 text-sm font-medium">{result.question}</p>
        {review && (
          <Badge
            variant="outline"
            className={`shrink-0 text-[10px] ${verdictStyles[review.verdict]}`}
          >
            {verdictLabel[review.verdict]} · {review.score}
          </Badge>
        )}
      </div>

      {result.error ? (
        <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
          <AlertTriangle className="h-3.5 w-3.5" /> {result.error}
        </p>
      ) : (
        <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-2 text-sm">
          {result.response || "(resposta vazia)"}
        </p>
      )}

      {review?.issue && (
        <p className="mt-1.5 text-xs italic text-muted-foreground">
          💬 {review.issue}
        </p>
      )}

      {!result.error && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
          {result.model && (
            <span>
              <code>{result.model}</code>
            </span>
          )}
          {result.latencyMs !== null && <span>{result.latencyMs}ms</span>}
          {result.ragChunkCount > 0 && (
            <span>RAG: {result.ragChunkCount} chunks</span>
          )}
          {result.toolCallNames.length > 0 && (
            <span className="text-amber-600 dark:text-amber-400">
              🔧 {result.toolCallNames.join(", ")}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// =====================================================
// SAVED REPORT CARD (history + AI evaluation)
// =====================================================

const SavedReportCard = ({
  agentId,
  report,
  navByTag,
  onDelete,
  onApplySuggestion,
  onNavigate,
  onEvaluated,
}: {
  agentId: string;
  report: AgentQAReport;
  navByTag: Map<string, { tab: AgentEditorTab; fieldId?: string }>;
  onDelete: () => void;
  onApplySuggestion: (target: PromptApplyTarget, value: string) => void;
  onNavigate: (tab: AgentEditorTab, fieldId?: string) => void;
  onEvaluated: (evaluation: AgentQAEvaluation) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [model, setModel] = useState("gpt-5.4-mini");
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<AgentQAEvaluation | null>(
    report.evaluation,
  );
  // Local suggestion status (applied/dismissed) keyed by suggestion id.
  const [suggestionStatus, setSuggestionStatus] = useState<
    Record<string, "open" | "applied" | "dismissed">
  >({});

  const date = new Date(report.created_at).toLocaleString("pt-BR");
  const avgLatency =
    report.total_latency_ms && report.question_count
      ? Math.round(report.total_latency_ms / report.question_count)
      : null;

  const reviewById = useMemo(() => {
    const map = new Map<string, AgentQAQuestionReview>();
    (evaluation?.questionReviews || []).forEach((r) => map.set(r.id, r));
    return map;
  }, [evaluation]);

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      const selected = EVALUATOR_MODELS.find((m) => m.value === model);
      const provider = selected?.provider ?? "openai";
      const res = await apiFetch(
        `/api/agents/${agentId}/qa/reports/${report.id}/evaluate`,
        {
          method: "POST",
          body: JSON.stringify({ provider, model }),
        },
      );
      const data = await res.json();
      if (!res.ok || !data.evaluation) {
        throw new Error(data.error || "Falha ao avaliar relatório");
      }
      setEvaluation(data.evaluation as AgentQAEvaluation);
      setSuggestionStatus({});
      onEvaluated(data.evaluation as AgentQAEvaluation);
      toast({
        title: "Avaliação concluída",
        description: `${data.evaluation.suggestions.length} sugestão(ões) de prompt.`,
      });
    } catch (err) {
      toast({
        title: "Erro na avaliação",
        description: err instanceof Error ? err.message : "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setEvaluating(false);
    }
  };

  const statusOf = (s: SuggestionView) =>
    suggestionStatus[s.id] ?? s.status ?? "open";

  return (
    <div className="rounded-md border border-border">
      <div className="flex items-center gap-2 p-2.5">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate text-xs font-medium">
              {report.label || `Relatório de ${date}`}
              {evaluation && (
                <span className={`font-bold ${scoreColor(evaluation.overallScore)}`}>
                  {evaluation.overallScore}/100
                </span>
              )}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">
              {date} · {report.question_count} pergunta(s)
              {report.model_used && ` · ${report.model_used}`}
              {avgLatency !== null && ` · ${avgLatency}ms/média`}
            </p>
          </div>
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          aria-label="Excluir relatório"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {expanded && (
        <div className="space-y-3 border-t border-border p-2.5">
          {/* Evaluation control */}
          <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted/30 p-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium">Avaliar com IA:</span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="h-7 rounded-md border border-input bg-background px-2 text-xs"
              disabled={evaluating}
            >
              {EVALUATOR_MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              onClick={handleEvaluate}
              disabled={evaluating}
              className="h-7 gap-1.5 text-xs"
            >
              {evaluating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {evaluating
                ? "Avaliando..."
                : evaluation
                ? "Reavaliar"
                : "Avaliar"}
            </Button>
          </div>

          {/* Overall assessment */}
          {evaluation?.overallAssessment && (
            <div className="rounded-md border border-border p-2.5">
              <p className="text-xs text-muted-foreground">
                {evaluation.overallAssessment}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {evaluation.evaluatorProvider} · {evaluation.evaluatorModel} ·{" "}
                {(evaluation.usage.tokensInput + evaluation.usage.tokensOutput)}{" "}
                tokens · {(evaluation.durationMs / 1000).toFixed(1)}s
              </p>
            </div>
          )}

          {/* Per-question results (with verdict if evaluated) */}
          {report.results.map((r, i) => (
            <QAResultCard
              key={r.id || i}
              index={i}
              result={r}
              review={reviewById.get(r.id)}
            />
          ))}

          {/* Prompt suggestions */}
          {evaluation && evaluation.suggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold">
                Sugestões de ajuste no prompt
              </p>
              {(evaluation.suggestions as SuggestionView[]).map((s) => {
                const status = statusOf(s);
                return (
                  <PromptSuggestionCard
                    key={s.id}
                    suggestion={{ ...s, status }}
                    canNavigate={navByTag.has(s.sectionTag)}
                    onApply={() => {
                      if (s.apply.kind === "advisory" || !s.suggestedValue)
                        return;
                      onApplySuggestion(s.apply, s.suggestedValue);
                      setSuggestionStatus((prev) => ({
                        ...prev,
                        [s.id]: "applied",
                      }));
                      toast({
                        title: "Sugestão aplicada",
                        description:
                          "Preenchida no editor. Salve o agente para confirmar.",
                      });
                    }}
                    onDismiss={() =>
                      setSuggestionStatus((prev) => ({
                        ...prev,
                        [s.id]: "dismissed",
                      }))
                    }
                    onNavigate={() => {
                      const nav = navByTag.get(s.sectionTag);
                      if (nav) onNavigate(nav.tab, nav.fieldId);
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PromptApplyTarget } from "@/lib/prompt-builder";
import { Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { useMemo, useState } from "react";

export type Severity = "high" | "medium" | "low";

// =====================================================
// WORD-LEVEL DIFF (no dependency) — git-style before/after
// =====================================================

type DiffPart = { type: "equal" | "added" | "removed"; value: string };

/** Split into runs of non-space / space so reconstruction reads naturally. */
const tokenize = (s: string): string[] => s.match(/\S+|\s+/g) ?? [];

/**
 * LCS-based word diff between two strings. Returns ordered parts marking what
 * stayed, what was removed (old only) and what was added (new only).
 */
const diffWords = (oldStr: string, newStr: string): DiffPart[] => {
  const a = tokenize(oldStr);
  const b = tokenize(newStr);
  const n = a.length;
  const m = b.length;

  // Guard against pathological inputs (lazy: only runs when expanded).
  if (n * m > 2_000_000) {
    const parts: DiffPart[] = [];
    if (oldStr) parts.push({ type: "removed", value: oldStr });
    if (newStr) parts.push({ type: "added", value: newStr });
    return parts;
  }

  // LCS length table.
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        a[i] === b[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const parts: DiffPart[] = [];
  const push = (type: DiffPart["type"], value: string) => {
    const last = parts[parts.length - 1];
    if (last && last.type === type) last.value += value;
    else parts.push({ type, value });
  };

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push("equal", a[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push("removed", a[i]);
      i++;
    } else {
      push("added", b[j]);
      j++;
    }
  }
  while (i < n) push("removed", a[i++]);
  while (j < m) push("added", b[j++]);

  return parts;
};

/**
 * Structural shape of a prompt suggestion the card needs to render.
 * Compatible with PromptSuggestion (src/lib/prompt-evaluator.ts).
 */
export interface SuggestionView {
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

export const severityStyles: Record<Severity, string> = {
  high: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  medium:
    "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  low: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
};

export const severityLabel: Record<Severity, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

interface PromptSuggestionCardProps {
  suggestion: SuggestionView;
  canNavigate: boolean;
  onApply: () => void;
  onDismiss: () => void;
  onNavigate: () => void;
}

export const PromptSuggestionCard = ({
  suggestion,
  canNavigate,
  onApply,
  onDismiss,
  onNavigate,
}: PromptSuggestionCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [showSplit, setShowSplit] = useState(false);
  const isAdvisory =
    suggestion.apply.kind === "advisory" || !suggestion.suggestedValue;
  const dismissed = suggestion.status === "dismissed";
  const applied = suggestion.status === "applied";

  const diffParts = useMemo(
    () =>
      diffWords(
        suggestion.currentExcerpt ?? "",
        suggestion.suggestedValue ?? "",
      ),
    [suggestion.currentExcerpt, suggestion.suggestedValue],
  );

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
          {expanded ? "Ocultar mudanças" : "Ver o que mudou"}
        </button>
      )}

      {expanded && !isAdvisory && (
        <div className="mt-2 space-y-2">
          {/* Legend + view toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-3 rounded-sm bg-red-500/25 line-through" />
                removido
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-3 rounded-sm bg-emerald-500/25" />
                adicionado
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowSplit((v) => !v)}
              className="text-[10px] text-primary hover:underline"
            >
              {showSplit ? "Ver como diff" : "Ver lado a lado"}
            </button>
          </div>

          {showSplit ? (
            // Side-by-side (old behavior)
            <div className="grid gap-2 md:grid-cols-2">
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
          ) : (
            // Inline git-style word diff
            <pre className="whitespace-pre-wrap break-words rounded-md border border-border bg-muted/20 p-2 text-[11px] leading-relaxed">
              {diffParts.map((part, idx) => {
                if (part.type === "equal") {
                  return (
                    <span key={idx} className="text-muted-foreground">
                      {part.value}
                    </span>
                  );
                }
                if (part.type === "removed") {
                  return (
                    <span
                      key={idx}
                      className="rounded-sm bg-red-500/15 text-red-600 line-through decoration-red-500/60 dark:text-red-400"
                    >
                      {part.value}
                    </span>
                  );
                }
                return (
                  <span
                    key={idx}
                    className="rounded-sm bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  >
                    {part.value}
                  </span>
                );
              })}
            </pre>
          )}
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

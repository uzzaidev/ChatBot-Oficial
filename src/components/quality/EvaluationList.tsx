"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EvaluationItem, UseEvaluationsFilters } from "@/hooks/useEvaluations";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { ScoreBadge } from "./ScoreBadge";

interface EvaluationListProps {
  items: EvaluationItem[];
  loading: boolean;
  error: string | null;
  filters: UseEvaluationsFilters;
  setFilters: Dispatch<SetStateAction<UseEvaluationsFilters>>;
  selectedTraceId?: string | null;
  onSelect: (item: EvaluationItem) => void;
}

export function EvaluationList({
  items,
  loading,
  error,
  filters,
  setFilters,
  selectedTraceId,
  onSelect,
}: EvaluationListProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const sortedItems = useMemo(() => {
    const priority: Record<EvaluationItem["verdict"], number> = {
      FAIL: 0,
      REVIEW: 1,
      PASS: 2,
    };
    return [...items].sort((a, b) => {
      const byVerdict = priority[a.verdict] - priority[b.verdict];
      if (byVerdict !== 0) return byVerdict;
      return new Date(b.evaluated_at).getTime() - new Date(a.evaluated_at).getTime();
    });
  }, [items]);

  useEffect(() => {
    const selectedIndex = sortedItems.findIndex(
      (item) => item.trace_id === selectedTraceId,
    );
    if (selectedIndex >= 0) {
      setActiveIndex(selectedIndex);
      return;
    }
    setActiveIndex(0);
  }, [selectedTraceId, sortedItems]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName.toUpperCase())
      ) {
        return;
      }

      if (event.key.toLowerCase() === "j") {
        event.preventDefault();
        if (sortedItems.length === 0) return;
        const nextIndex = Math.min(activeIndex + 1, sortedItems.length - 1);
        setActiveIndex(nextIndex);
        onSelect(sortedItems[nextIndex]);
      }

      if (event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (sortedItems.length === 0) return;
        const nextIndex = Math.max(activeIndex - 1, 0);
        setActiveIndex(nextIndex);
        onSelect(sortedItems[nextIndex]);
      }

      if (event.key === "Enter") {
        if (sortedItems.length === 0) return;
        onSelect(sortedItems[activeIndex]);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, onSelect, sortedItems]);

  return (
    <div className="rounded-lg border p-3 h-full flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Avaliações</p>
        <p className="text-xs text-muted-foreground">J/K para navegar</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={!filters.verdict ? "default" : "outline"}
          onClick={() => setFilters((prev) => ({ ...prev, verdict: undefined }))}
        >
          Todos
        </Button>
        <Button
          size="sm"
          variant={filters.verdict === "FAIL" ? "default" : "outline"}
          onClick={() => setFilters((prev) => ({ ...prev, verdict: "FAIL" }))}
        >
          FAIL
        </Button>
        <Button
          size="sm"
          variant={filters.verdict === "REVIEW" ? "default" : "outline"}
          onClick={() => setFilters((prev) => ({ ...prev, verdict: "REVIEW" }))}
        >
          REVIEW
        </Button>
        <Button
          size="sm"
          variant={filters.verdict === "PASS" ? "default" : "outline"}
          onClick={() => setFilters((prev) => ({ ...prev, verdict: "PASS" }))}
        >
          PASS
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          type="number"
          min={0}
          max={10}
          step={0.1}
          value={filters.minScore ?? ""}
          placeholder="Score min"
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              minScore: e.target.value === "" ? undefined : Number(e.target.value),
            }))
          }
        />
        <Input
          type="number"
          min={0}
          max={10}
          step={0.1}
          value={filters.maxScore ?? ""}
          placeholder="Score max"
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              maxScore: e.target.value === "" ? undefined : Number(e.target.value),
            }))
          }
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="overflow-auto flex-1 space-y-2 pr-1">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : sortedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem avaliações para os filtros atuais.</p>
        ) : (
          sortedItems.map((item, index) => {
            const isSelected = item.trace_id === selectedTraceId || index === activeIndex;
            return (
              <button
                key={item.id}
                type="button"
                data-testid="eval-item"
                onClick={() => onSelect(item)}
                className={`w-full text-left border rounded-md p-3 transition ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <ScoreBadge score={item.composite_score} verdict={item.verdict} />
                  <span className="text-xs text-muted-foreground">
                    {item.has_human_feedback ? "Revisado" : "Pendente"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Trace {item.trace_id.slice(0, 10)}...
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(item.evaluated_at).toLocaleString()}
                </p>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

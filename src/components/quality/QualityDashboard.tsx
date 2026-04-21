"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEvaluations } from "@/hooks/useEvaluations";

const verdictColor = (verdict: "PASS" | "REVIEW" | "FAIL") => {
  if (verdict === "PASS") return "text-green-600";
  if (verdict === "REVIEW") return "text-amber-600";
  return "text-red-600";
};

export function QualityDashboard() {
  const { items, stats, filters, setFilters, loading, error, refetch } =
    useEvaluations();

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold">Qualidade</h1>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Atualizar
        </Button>
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
          variant={filters.verdict === "PASS" ? "default" : "outline"}
          onClick={() => setFilters((prev) => ({ ...prev, verdict: "PASS" }))}
        >
          PASS
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
          variant={filters.verdict === "FAIL" ? "default" : "outline"}
          onClick={() => setFilters((prev) => ({ ...prev, verdict: "FAIL" }))}
        >
          FAIL
        </Button>
        <Input
          className="w-28"
          type="number"
          min={0}
          max={10}
          step={0.1}
          placeholder="Min"
          value={filters.minScore ?? ""}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              minScore: e.target.value === "" ? undefined : Number(e.target.value),
            }))
          }
        />
        <Input
          className="w-28"
          type="number"
          min={0}
          max={10}
          step={0.1}
          placeholder="Max"
          value={filters.maxScore ?? ""}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              maxScore: e.target.value === "" ? undefined : Number(e.target.value),
            }))
          }
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {stats && (
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Média de score</p>
            <p className="text-2xl font-semibold">{stats.averageScore.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Total de avaliações</p>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Custo total (USD)</p>
            <p className="text-2xl font-semibold">${stats.totalCostUsd.toFixed(4)}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Duração média</p>
            <p className="text-2xl font-semibold">{stats.averageDurationMs.toFixed(0)}ms</p>
          </div>
        </div>
      )}

      {stats && (
        <div className="rounded-lg border p-4 grid gap-2 md:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">PASS</p>
            <p className="text-xl font-semibold text-green-600">{stats.verdicts.PASS}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">REVIEW</p>
            <p className="text-xl font-semibold text-amber-600">{stats.verdicts.REVIEW}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">FAIL</p>
            <p className="text-xl font-semibold text-red-600">{stats.verdicts.FAIL}</p>
          </div>
        </div>
      )}

      <div className="rounded-lg border p-4">
        <p className="text-sm font-medium mb-3">Últimas avaliações</p>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma avaliação encontrada.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center gap-2 text-sm border-b pb-2">
                <span className={`font-semibold ${verdictColor(item.verdict)}`}>
                  {item.verdict}
                </span>
                <span className="text-muted-foreground">score {item.composite_score.toFixed(2)}</span>
                <span className="text-muted-foreground">trace {item.trace_id.slice(0, 8)}...</span>
                <span className="text-muted-foreground">{new Date(item.evaluated_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


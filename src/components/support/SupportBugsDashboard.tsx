"use client";

import { Button } from "@/components/ui/button";
import { useSupportCases } from "@/hooks/useSupportCases";
import { Input } from "@/components/ui/input";

const colorBySeverity = {
  low: "text-slate-600",
  medium: "text-blue-600",
  high: "text-amber-600",
  critical: "text-red-600",
} as const;

export function SupportBugsDashboard() {
  const {
    items,
    loading,
    error,
    filters,
    setFilters,
    refetch,
    updateCase,
    convertCaseToTask,
  } = useSupportCases();

  const normalizeForGroup = (value: string): string =>
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .slice(0, 8)
      .join(" ");

  const groupedCases = items.reduce<Record<string, { label: string; count: number }>>(
    (acc, item) => {
      const key = `${item.root_cause_type}:${normalizeForGroup(item.user_message)}`;
      if (!acc[key]) {
        acc[key] = {
          label: `${item.root_cause_type} - ${item.user_message.slice(0, 90)}`,
          count: 0,
        };
      }
      acc[key].count += 1;
      return acc;
    },
    {},
  );

  const sortedGroups = Object.entries(groupedCases)
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">Suporte e Bugs</h1>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Atualizar
        </Button>
      </div>

      <div className="grid gap-2 md:grid-cols-4">
        <select
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={filters.status ?? "all"}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, status: e.target.value as any }))
          }
        >
          <option value="all">Todos os status</option>
          <option value="new">new</option>
          <option value="triaged">triaged</option>
          <option value="in_progress">in_progress</option>
          <option value="resolved">resolved</option>
          <option value="dismissed">dismissed</option>
        </select>
        <select
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={filters.severity ?? "all"}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, severity: e.target.value as any }))
          }
        >
          <option value="all">Todas severidades</option>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="critical">critical</option>
        </select>
        <select
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={filters.rootCause ?? "all"}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, rootCause: e.target.value as any }))
          }
        >
          <option value="all">Todas causas</option>
          <option value="prompt">prompt</option>
          <option value="flow">flow</option>
          <option value="system">system</option>
          <option value="unknown">unknown</option>
        </select>
        <Input
          placeholder="Buscar por mensagem/ação..."
          value={filters.search ?? ""}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, search: e.target.value }))
          }
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {sortedGroups.length > 0 && (
        <div className="rounded-lg border p-4">
          <p className="text-sm font-medium mb-3">Casos similares (top 5)</p>
          <div className="space-y-2">
            {sortedGroups.map((group) => (
              <div key={group.key} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{group.label}</span>
                <span className="font-semibold">{group.count} casos</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border p-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum caso de suporte detectado.
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="border-b pb-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={`font-semibold ${colorBySeverity[item.severity]}`}>
                    {item.severity.toUpperCase()}
                  </span>
                  <span className="text-muted-foreground">
                    causa: {item.root_cause_type}
                  </span>
                  <span className="text-muted-foreground">
                    confiança: {(item.confidence * 100).toFixed(0)}%
                  </span>
                  <span className="text-muted-foreground">status: {item.status}</span>
                </div>
                <p className="mt-2 text-sm">{item.user_message}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ação sugerida: {item.recommended_action}
                </p>
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateCase(item.id, { status: "triaged" })}
                  >
                    Marcar Triaged
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateCase(item.id, { status: "resolved" })}
                  >
                    Resolver
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => convertCaseToTask(item.id)}
                  >
                    Converter em tarefa
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

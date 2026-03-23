"use client";

import { useCallback, useEffect, useState } from "react";
import { AnalyticsShell } from "@/components/AnalyticsShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { RefreshCw, Download } from "lucide-react";

interface UsageRecord {
  aggregation_timestamp: number;
  date: string;
  n_requests: number;
  n_context_tokens_total: number;
  n_generated_tokens_total: number;
  total_tokens: number;
  operation: string;
  snapshot_id: string;
  estimated_cost_usd: number;
  project_id?: string;
}

interface AnalyticsStats {
  total_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  estimated_total_cost: number;
  models_used: string[];
  operations_used: string[];
  date_range: { start: string; end: string };
}

function formatDateTick(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function shortModelName(model: string) {
  return model.replace(/^gpt-/, "").replace(/^o\d+-/, "o").split("-").slice(0, 2).join("-");
}

export default function OpenAIAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [data, setData] = useState<UsageRecord[]>([]);
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [projectId, setProjectId] = useState("");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const syncMedia = () => setIsMobile(mediaQuery.matches);

    syncMedia();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", syncMedia);
      return () => mediaQuery.removeEventListener("change", syncMedia);
    }

    mediaQuery.addListener(syncMedia);
    return () => mediaQuery.removeListener(syncMedia);
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      });
      if (projectId) params.append("project_id", projectId);

      const response = await fetch(`/api/openai-billing/detailed?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch analytics");
      }

      setData(result.data);
      setStats(result.stats);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [endDate, projectId, startDate]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const exportToCSV = () => {
    const csv = [
      ["Date", "Model", "Operation", "Requests", "Input Tokens", "Output Tokens", "Total Tokens", "Cost (USD)"].join(","),
      ...data.map((record) =>
        [
          record.date,
          record.snapshot_id,
          record.operation,
          record.n_requests,
          record.n_context_tokens_total,
          record.n_generated_tokens_total,
          record.total_tokens,
          record.estimated_cost_usd.toFixed(4),
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `openai-analytics-${startDate}-to-${endDate}.csv`;
    anchor.click();
  };

  const dailyUsageChart = data.reduce((acc, record) => {
    const existing = acc.find((item) => item.date === record.date);
    if (existing) {
      existing.requests += record.n_requests;
      existing.tokens += record.total_tokens;
      existing.cost += record.estimated_cost_usd;
    } else {
      acc.push({
        date: record.date,
        requests: record.n_requests,
        tokens: record.total_tokens,
        cost: record.estimated_cost_usd,
      });
    }
    return acc;
  }, [] as Array<{ date: string; requests: number; tokens: number; cost: number }>);

  const modelUsageChart = data.reduce((acc, record) => {
    const existing = acc.find((item) => item.model === record.snapshot_id);
    if (existing) {
      existing.requests += record.n_requests;
      existing.tokens += record.total_tokens;
    } else {
      acc.push({
        model: record.snapshot_id,
        requests: record.n_requests,
        tokens: record.total_tokens,
      });
    }
    return acc;
  }, [] as Array<{ model: string; requests: number; tokens: number }>);

  const xAxisInterval = isMobile
    ? Math.max(0, Math.ceil(Math.max(dailyUsageChart.length, 1) / 4) - 1)
    : Math.max(0, Math.ceil(Math.max(dailyUsageChart.length, 1) / 7) - 1);
  const commonMargin = isMobile
    ? { top: 8, right: 8, left: -18, bottom: 0 }
    : { top: 10, right: 12, left: -6, bottom: 0 };
  const colors = ["#1ABC9C", "#2E86AB", "#F59E0B", "#EF4444", "#8B5CF6"];

  if (error) {
    return (
      <div className="container mx-auto space-y-6 p-4 sm:p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Erro ao carregar analytics</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="analytics-shell-kicker">openai analytics</div>
          <h1 className="text-3xl font-bold tracking-tight">OpenAI Analytics</h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-[15px]">
            Dashboard refeito para dar mais área útil aos gráficos e leitura rápida em mobile e desktop.
          </p>
        </div>
        <Button onClick={fetchAnalytics} disabled={loading} className="w-full sm:w-auto">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <AnalyticsShell
        title="Filtros"
        description="Ajuste o período e o projeto antes de recalcular os gráficos."
        kicker="controles"
        plotClassName="p-4 sm:p-5"
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">Data Início</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date">Data Fim</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-id">Project ID (opcional)</Label>
            <Input
              id="project-id"
              type="text"
              placeholder="proj_xxxx"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={fetchAnalytics} className="w-full">
              Aplicar Filtros
            </Button>
          </div>
        </div>
      </AnalyticsShell>

      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="analytics-kpi-panel">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Total de Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_requests.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="analytics-kpi-panel">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Total de Tokens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_tokens.toLocaleString()}</div>
              <p className="mt-2 text-xs text-muted-foreground">
                Input: {stats.total_input_tokens.toLocaleString()} | Output: {stats.total_output_tokens.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card className="analytics-kpi-panel">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Custo Estimado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.estimated_total_cost.toFixed(2)}</div>
              <p className="mt-2 text-xs text-muted-foreground">Baseado em pricing público</p>
            </CardContent>
          </Card>

          <Card className="analytics-kpi-panel">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Modelos Usados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.models_used.length}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {stats.models_used.slice(0, 3).map((model) => (
                  <Badge key={model} variant="secondary" className="text-xs">
                    {shortModelName(model)}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="analytics-grid-hero md:grid-cols-2">
        <div className="xl:col-span-7">
          <AnalyticsShell
            title="Uso Diário (Tokens)"
            description="Linha principal com consumo agregado por dia."
            kicker="main chart"
            variant="hero"
          >
            <div className="h-[280px] w-full sm:h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyUsageChart} margin={commonMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDateTick}
                    tick={{ fontSize: isMobile ? 10 : 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={isMobile ? 24 : 14}
                    interval={xAxisInterval}
                  />
                  <YAxis
                    tick={{ fontSize: isMobile ? 10 : 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    width={isMobile ? 42 : 56}
                  />
                  <Tooltip />
                  {!isMobile && <Legend />}
                  <Line type="monotone" dataKey="tokens" stroke="#2E86AB" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </AnalyticsShell>
        </div>

        <div className="xl:col-span-5">
          <AnalyticsShell
            title="Distribuição por Modelo"
            description="Requests por modelo com leitura simplificada no mobile."
            kicker="breakdown"
          >
            <div className="h-[280px] w-full sm:h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={modelUsageChart}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={
                      isMobile
                        ? false
                        : ({ payload, percent }: any) =>
                            `${shortModelName(String(payload?.model || ""))} ${((percent || 0) * 100).toFixed(0)}%`
                    }
                    innerRadius={isMobile ? 42 : 54}
                    outerRadius={isMobile ? 76 : 92}
                    dataKey="requests"
                  >
                    {modelUsageChart.map((entry, index) => (
                      <Cell key={`${entry.model}-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, _name, item) => [
                      value.toLocaleString(),
                      shortModelName(String(item.payload.model)),
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </AnalyticsShell>
        </div>

        <div className="xl:col-span-5">
          <AnalyticsShell
            title="Custo Diário (USD)"
            description="Barras com custo estimado por dia."
            kicker="finance"
          >
            <div className="h-[250px] w-full sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyUsageChart} margin={commonMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDateTick}
                    tick={{ fontSize: isMobile ? 10 : 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={isMobile ? 24 : 14}
                    interval={xAxisInterval}
                  />
                  <YAxis
                    tick={{ fontSize: isMobile ? 10 : 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    width={isMobile ? 42 : 56}
                  />
                  <Tooltip />
                  {!isMobile && <Legend />}
                  <Bar dataKey="cost" fill="#1ABC9C" name="Custo (USD)" radius={[8, 8, 3, 3]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AnalyticsShell>
        </div>

        <div className="xl:col-span-7">
          <AnalyticsShell
            title="Tokens por Modelo"
            description="Comparação horizontal de volume por modelo."
            kicker="volume"
          >
            <div className="h-[250px] w-full sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modelUsageChart} margin={commonMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" vertical={false} />
                  <XAxis
                    dataKey="model"
                    tickFormatter={shortModelName}
                    tick={{ fontSize: isMobile ? 10 : 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={isMobile ? -18 : 0}
                    textAnchor={isMobile ? "end" : "middle"}
                    height={isMobile ? 44 : 30}
                  />
                  <YAxis
                    tick={{ fontSize: isMobile ? 10 : 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    width={isMobile ? 42 : 56}
                  />
                  <Tooltip />
                  {!isMobile && <Legend />}
                  <Bar dataKey="tokens" fill="#8B5CF6" name="Tokens" radius={[8, 8, 3, 3]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AnalyticsShell>
        </div>
      </div>

      <AnalyticsShell
        title="Dados Detalhados"
        description="Todos os campos da API oficial da OpenAI."
        kicker="table"
        actions={
          <Button onClick={exportToCSV} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        }
        plotClassName="p-0"
      >
        <div className="overflow-x-auto rounded-[20px] border border-border/70">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Operação</TableHead>
                <TableHead className="text-right">Requests</TableHead>
                <TableHead className="text-right">Input Tokens</TableHead>
                <TableHead className="text-right">Output Tokens</TableHead>
                <TableHead className="text-right">Total Tokens</TableHead>
                <TableHead className="text-right">Custo (USD)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {Array.from({ length: 8 }).map((_, cellIndex) => (
                      <TableCell key={cellIndex}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Nenhum dado encontrado para o período selecionado
                  </TableCell>
                </TableRow>
              ) : (
                data.map((record, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{record.date}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{record.snapshot_id}</Badge>
                    </TableCell>
                    <TableCell>{record.operation}</TableCell>
                    <TableCell className="text-right">{record.n_requests}</TableCell>
                    <TableCell className="text-right">
                      {record.n_context_tokens_total.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {record.n_generated_tokens_total.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {record.total_tokens.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      ${record.estimated_cost_usd.toFixed(4)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </AnalyticsShell>
    </div>
  );
}

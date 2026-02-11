"use client";

import { useEffect, useState } from "react";
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
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { RefreshCw, Download, Filter, TrendingUp, DollarSign, Zap, Calendar } from "lucide-react";

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

export default function OpenAIAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UsageRecord[]>([]);
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [projectId, setProjectId] = useState("");

  const fetchAnalytics = async () => {
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
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const exportToCSV = () => {
    const csv = [
      ["Date", "Model", "Operation", "Requests", "Input Tokens", "Output Tokens", "Total Tokens", "Cost (USD)"].join(","),
      ...data.map((r) =>
        [
          r.date,
          r.snapshot_id,
          r.operation,
          r.n_requests,
          r.n_context_tokens_total,
          r.n_generated_tokens_total,
          r.total_tokens,
          r.estimated_cost_usd.toFixed(4),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `openai-analytics-${startDate}-to-${endDate}.csv`;
    a.click();
  };

  // Prepare chart data
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

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  if (error) {
    return (
      <div className="container mx-auto p-6">
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">OpenAI Analytics</h1>
          <p className="text-muted-foreground">
            Dados oficiais direto da API da OpenAI (sincronizado)
          </p>
        </div>
        <Button onClick={fetchAnalytics} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_requests.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Tokens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_tokens.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Input: {stats.total_input_tokens.toLocaleString()} | Output: {stats.total_output_tokens.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Custo Estimado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.estimated_total_cost.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Baseado em pricing público
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Modelos Usados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.models_used.length}</div>
              <div className="flex flex-wrap gap-1 mt-2">
                {stats.models_used.slice(0, 3).map((model) => (
                  <Badge key={model} variant="secondary" className="text-xs">
                    {model.split("-")[0]}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Usage Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Uso Diário (Tokens)</CardTitle>
            <CardDescription>Tokens consumidos por dia</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyUsageChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="tokens" stroke="#8884d8" name="Tokens" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Model Usage Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Modelo</CardTitle>
            <CardDescription>Requests por modelo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={modelUsageChart}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.payload.model.split("-")[0]}: ${(entry.percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="requests"
                >
                  {modelUsageChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily Cost Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Custo Diário (USD)</CardTitle>
            <CardDescription>Custo estimado por dia</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyUsageChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="cost" fill="#82ca9d" name="Custo (USD)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Model Tokens Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Tokens por Modelo</CardTitle>
            <CardDescription>Consumo de tokens por modelo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={modelUsageChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="model" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="tokens" fill="#8884d8" name="Tokens" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Dados Detalhados</CardTitle>
              <CardDescription>
                Todos os campos da API oficial da OpenAI
              </CardDescription>
            </div>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
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
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
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
        </CardContent>
      </Card>
    </div>
  );
}

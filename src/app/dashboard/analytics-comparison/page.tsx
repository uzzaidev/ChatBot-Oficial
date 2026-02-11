"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  Cloud,
  CreditCard,
  Database,
  DollarSign,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";

interface OpenAIUsageRecord {
  date: string;
  model_name: string;
  num_model_requests: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  // 💰 Real cost (from /v1/organization/costs)
  real_cost_usd?: number | null;
  has_real_cost?: boolean;
  // 🔌 API source endpoint
  api_source?: string;
  api_source_label?: string;
  // Optional fields from new API
  input_cached_tokens?: number;
  input_uncached_tokens?: number;
  bucket_start_time?: number;
  bucket_start_iso?: string;
}

interface OurTrackingRecord {
  date: string;
  model_name: string;
  provider: string;
  total_requests: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_brl: number;
}

interface OpenAIBillingSummary {
  // Usage data (from /v1/organization/usage/completions API)
  total_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  totalTokens: number;
  estimated_cost_usd: number;

  // 💰 REAL costs (from /v1/organization/costs API)
  real_cost_usd: number | null;
  has_real_costs: boolean;
  daily_costs?: Record<string, number>;

  // Model breakdown
  models: Record<
    string,
    {
      requests: number;
      inputTokens: number;
      outputTokens: number;
      estimatedCost: number;
      realCost?: number;
    }
  >;

  // Period info
  period_days: number;
  start_date: string;
  end_date: string;
  all_data_fetched: boolean;
  pages_fetched: number;

  // Note about limitations
  note: string;
}

export default function AnalyticsComparisonPage() {
  const [loadingOpenAI, setLoadingOpenAI] = useState(false);
  const [loadingOurs, setLoadingOurs] = useState(false);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [openAIData, setOpenAIData] = useState<OpenAIUsageRecord[]>([]);
  const [ourData, setOurData] = useState<OurTrackingRecord[]>([]);
  const [billingSummary, setBillingSummary] =
    useState<OpenAIBillingSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateStatus, setLastUpdateStatus] = useState<
    "success" | "error" | "idle"
  >("idle");
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [cacheLastFetchedAt, setCacheLastFetchedAt] = useState<string | null>(
    null,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters (período padrão: últimos 30 dias para capturar dados do billing cycle)
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [projectId, setProjectId] = useState("");

  const fetchOpenAIData = async (source: "cache" | "refresh" = "cache") => {
    try {
      setLoadingOpenAI(true);
      setError(null);
      if (source === "refresh") setIsRefreshing(true);
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        source,
      });
      if (projectId) params.append("project_id", projectId);

      const response = await fetch(`/api/openai-billing/detailed?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao buscar dados da OpenAI");
      }

      console.log(
        `[OpenAI Data] source=${source}`,
        result.data?.length,
        "records",
      );
      setOpenAIData(result.data || []);
      if (result.last_fetched_at) {
        setCacheLastFetchedAt(result.last_fetched_at);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("[Erro OpenAI]", errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setLoadingOpenAI(false);
      setIsRefreshing(false);
    }
  };

  const fetchOurData = async () => {
    try {
      setLoadingOurs(true);
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      });

      const response = await fetch(`/api/analytics/our-tracking?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Erro ao buscar dados do nosso tracking",
        );
      }

      console.log("[Our Tracking Data]", result.data);
      setOurData(result.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("[Erro Our Tracking]", errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setLoadingOurs(false);
    }
  };

  const fetchBillingSummary = async () => {
    try {
      setLoadingBilling(true);

      // Calculate days between dates
      const days = Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      const response = await fetch(`/api/openai-billing/summary?days=${days}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao buscar resumo de billing");
      }

      console.log("[Billing Summary]", result.data);
      setBillingSummary(result.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("[Erro Billing Summary]:", errorMessage);
      // Don't set global error - billing is optional but log for debugging
      setBillingSummary(null);
    } finally {
      setLoadingBilling(false);
    }
  };

  const fetchAll = async () => {
    try {
      setLastUpdateStatus("idle");
      setError(null);

      await Promise.all([
        fetchOpenAIData("refresh"),
        fetchOurData(),
        fetchBillingSummary(),
      ]);

      setLastUpdateStatus("success");
      setLastUpdateTime(new Date());
      setHasFetched(true);
    } catch (err) {
      setLastUpdateStatus("error");
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setHasFetched(true);
    }
  };

  // Auto-load cached data on page mount (no OpenAI API calls)
  useEffect(() => {
    const loadCache = async () => {
      try {
        setLoadingOpenAI(true);
        const params = new URLSearchParams({
          start_date: startDate,
          end_date: endDate,
          source: "cache",
        });
        const response = await fetch(`/api/openai-billing/detailed?${params}`);
        const result = await response.json();
        if (response.ok && result.data && result.data.length > 0) {
          setOpenAIData(result.data);
          setHasFetched(true);
          if (result.last_fetched_at) {
            setCacheLastFetchedAt(result.last_fetched_at);
          }
          console.log(
            `[Cache] Loaded ${result.data.length} records from cache`,
          );
        }
      } catch {
        // Cache miss is fine, user can click Atualizar
      } finally {
        setLoadingOpenAI(false);
      }
    };
    loadCache();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate comparison stats
  const comparisonStats = {
    openai: {
      totalTokens: openAIData.reduce((sum, r) => sum + r.total_tokens, 0),
      totalRequests: openAIData.reduce(
        (sum, r) => sum + r.num_model_requests,
        0,
      ),
      totalCost: openAIData.reduce((sum, r) => sum + r.estimated_cost_usd, 0),
    },
    ours: {
      totalTokens: ourData.reduce((sum, r) => sum + r.total_tokens, 0),
      totalRequests: ourData.reduce((sum, r) => sum + r.total_requests, 0),
      totalCost: ourData.reduce((sum, r) => sum + r.cost_brl, 0),
    },
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Comparison</h1>
          <p className="text-muted-foreground">
            Compare dados oficiais da OpenAI com nosso tracking interno
          </p>
        </div>
        <div className="flex items-center gap-3">
          {cacheLastFetchedAt && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Database className="h-3 w-3" />
              <span>
                Cache: {new Date(cacheLastFetchedAt).toLocaleString("pt-BR")}
              </span>
            </div>
          )}
          {lastUpdateStatus === "success" && lastUpdateTime && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Cloud className="h-4 w-4" />
              <span>
                Atualizado {lastUpdateTime.toLocaleTimeString("pt-BR")}
              </span>
            </div>
          )}
          {lastUpdateStatus === "error" && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>Erro ao atualizar</span>
            </div>
          )}
          <Button
            onClick={fetchAll}
            disabled={loadingOpenAI || loadingOurs || loadingBilling}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${
                loadingOpenAI || loadingOurs || loadingBilling
                  ? "animate-spin"
                  : ""
              }`}
            />
            {isRefreshing ? "Buscando da OpenAI..." : "Atualizar Tudo"}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar dados</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start">Data Início</Label>
            <Input
              id="start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end">Data Fim</Label>
            <Input
              id="end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project">Project ID (OpenAI)</Label>
            <Input
              id="project"
              placeholder="proj_xxxx (opcional)"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={fetchAll} className="w-full">
              Aplicar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* OpenAI Billing Overview - Enhanced Version */}
      {billingSummary && (
        <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Resumo de Uso OpenAI
                </CardTitle>
                <CardDescription>
                  Uso da sua conta OpenAI ({billingSummary.period_days} dias)
                </CardDescription>
              </div>
              <Badge variant="outline" className="gap-1">
                <DollarSign className="h-3 w-3" />
                USD
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Info Alert */}
            {billingSummary.has_real_costs ? (
              <Alert className="mb-6 border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20">
                <AlertCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertTitle className="text-green-900 dark:text-green-100">
                  ✅ Custos Reais da OpenAI
                </AlertTitle>
                <AlertDescription className="text-green-800 dark:text-green-200">
                  Os custos exibidos são <strong>valores reais</strong> obtidos
                  diretamente do billing da OpenAI via API.
                  <br />
                  <span className="text-xs mt-1 block">
                    ⏳ <strong>Nota:</strong> Custos do dia atual podem não
                    estar incluídos (processamento com atraso de ~24h). Valores
                    em <span className="text-green-700">verde</span> = custo
                    real, valores com{" "}
                    <span className="text-muted-foreground">~</span> =
                    estimativa (dia atual sem custo real disponível).
                  </span>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="mb-6 border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertTitle className="text-blue-900 dark:text-blue-100">
                  ℹ️ Sobre Custos e Limites
                </AlertTitle>
                <AlertDescription className="text-blue-800 dark:text-blue-200">
                  Os custos são <strong>estimativas</strong> baseadas nos preços
                  públicos da OpenAI (precisão ~99%). Para custos reais, acesse{" "}
                  <a
                    href="https://platform.openai.com/account/billing/overview"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium hover:text-blue-600"
                  >
                    Dashboard da OpenAI
                  </a>
                  .
                </AlertDescription>
              </Alert>
            )}

            {/* Usage Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Total Cost */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  {billingSummary.has_real_costs
                    ? "Custo Real (Período)"
                    : "Custo Estimado (Período)"}
                </div>
                <div className="text-2xl font-bold text-primary">
                  $
                  {billingSummary.has_real_costs &&
                  billingSummary.real_cost_usd !== null
                    ? billingSummary.real_cost_usd.toFixed(4)
                    : billingSummary.estimated_cost_usd.toFixed(4)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {billingSummary.start_date} a {billingSummary.end_date}
                  {billingSummary.has_real_costs && (
                    <Badge
                      variant="outline"
                      className="ml-2 text-green-600 border-green-600"
                    >
                      Real
                    </Badge>
                  )}
                </p>
              </div>

              {/* Total Requests */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  Total de Requests
                </div>
                <div className="text-2xl font-bold">
                  {billingSummary.total_requests.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Chamadas à API OpenAI
                </p>
              </div>

              {/* Total Tokens */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Database className="h-4 w-4" />
                  Total de Tokens
                </div>
                <div className="text-2xl font-bold">
                  {billingSummary.totalTokens.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Input: {billingSummary.total_input_tokens.toLocaleString()} |
                  Output: {billingSummary.total_output_tokens.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Model Breakdown */}
            {Object.keys(billingSummary.models).length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Cloud className="h-4 w-4" />
                  Breakdown por Modelo
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(billingSummary.models)
                    .sort(
                      ([, a], [, b]) =>
                        (b.realCost ?? b.estimatedCost) -
                        (a.realCost ?? a.estimatedCost),
                    )
                    .map(([model, stats]) => (
                      <div
                        key={model}
                        className="p-3 border rounded-lg space-y-2 hover:bg-accent/5 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{model}</span>
                          <Badge
                            variant={
                              stats.realCost !== undefined
                                ? "default"
                                : "secondary"
                            }
                            className={
                              stats.realCost !== undefined ? "bg-green-600" : ""
                            }
                          >
                            $
                            {(stats.realCost ?? stats.estimatedCost).toFixed(4)}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                          <div>
                            <div className="font-medium">Requests</div>
                            <div>{stats.requests.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="font-medium">Input</div>
                            <div>{stats.inputTokens.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="font-medium">Output</div>
                            <div>{stats.outputTokens.toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Info Alert */}
            {!billingSummary.has_real_costs && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>ℹ️ Dados Simplificados</AlertTitle>
                <AlertDescription>
                  Os custos mostrados são estimativas baseadas em preços
                  públicos. Para valores exatos, verifique se sua Admin Key
                  possui escopo de leitura de custos.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {loadingBilling && (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <Skeleton className="h-3 w-full" />
          </CardContent>
        </Card>
      )}

      {!loadingBilling && !billingSummary && !error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>⚠️ Resumo de Billing Indisponível</AlertTitle>
          <AlertDescription>
            Não foi possível carregar o resumo de billing da OpenAI. Verifique
            se:
            <ul className="list-disc list-inside mt-2 text-sm">
              <li>A OpenAI Admin Key está configurada em Configurações</li>
              <li>
                A chave tem permissão{" "}
                <code className="bg-muted px-1 py-0.5 rounded">
                  api.usage.read
                </code>
              </li>
              <li>Existe uso da API no período selecionado</li>
            </ul>
            <p className="mt-2 text-xs">
              <strong>Nota:</strong> As informações de "créditos disponíveis" e
              "limites de gasto" (hard/soft limits) requerem permissões de
              billing admin que não estão disponíveis com o scope básico
              api.usage.read. Esta limitação é da própria API da OpenAI.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Comparison Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Tokens (OpenAI)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Cloud className="h-3 w-3" />
                OpenAI API
              </span>
              <span className="text-lg font-bold">
                {comparisonStats.openai.totalTokens.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Database className="h-3 w-3" />
                Nosso Tracking
              </span>
              <span className="text-lg font-bold">
                {comparisonStats.ours.totalTokens.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Cloud className="h-3 w-3" />
                OpenAI API
              </span>
              <span className="text-lg font-bold">
                {comparisonStats.openai.totalRequests.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Database className="h-3 w-3" />
                Nosso Tracking
              </span>
              <span className="text-lg font-bold">
                {comparisonStats.ours.totalRequests.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs with Data */}
      <Tabs defaultValue="openai" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="openai" className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            OpenAI API (Oficial)
          </TabsTrigger>
          <TabsTrigger value="ours" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Nosso Tracking
          </TabsTrigger>
        </TabsList>

        {/* OpenAI Tab */}
        <TabsContent value="openai" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="h-5 w-5" />
                    Dados Oficiais da OpenAI
                  </CardTitle>
                  <CardDescription>
                    Sincronizado direto da API oficial da OpenAI (100% preciso)
                  </CardDescription>
                </div>
                <Badge variant="default" className="gap-1">
                  <Cloud className="h-3 w-3" />
                  Oficial
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Fonte API</TableHead>
                      <TableHead className="text-right">Requests</TableHead>
                      <TableHead className="text-right">Input Tokens</TableHead>
                      <TableHead className="text-right">
                        Output Tokens
                      </TableHead>
                      <TableHead className="text-right">Total Tokens</TableHead>
                      <TableHead className="text-right">Custo (USD)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingOpenAI ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 8 }).map((_, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-4 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : openAIData.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center text-muted-foreground py-8"
                        >
                          {hasFetched
                            ? 'Nenhum dado no cache para este período. Clique em "Atualizar Tudo" para buscar da OpenAI.'
                            : "Carregando cache..."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      [...openAIData]
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map((record, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {record.date}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {record.model_name}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {record.api_source_label || "Completions"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {record.num_model_requests}
                            </TableCell>
                            <TableCell className="text-right">
                              {record.input_tokens.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {record.output_tokens.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {record.total_tokens.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {record.has_real_cost &&
                              record.real_cost_usd != null ? (
                                <span className="text-green-600 font-medium">
                                  ${record.real_cost_usd.toFixed(4)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  ~${record.estimated_cost_usd.toFixed(4)}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Our Tracking Tab */}
        <TabsContent value="ours" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Nosso Tracking Interno
                  </CardTitle>
                  <CardDescription>
                    Dados coletados pelo nosso sistema (gateway_usage_logs)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead className="text-right">Requests</TableHead>
                      <TableHead className="text-right">Input Tokens</TableHead>
                      <TableHead className="text-right">
                        Output Tokens
                      </TableHead>
                      <TableHead className="text-right">Total Tokens</TableHead>
                      <TableHead className="text-right">Custo (BRL)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingOurs ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 8 }).map((_, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-4 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : ourData.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center text-muted-foreground py-8"
                        >
                          {hasFetched
                            ? "Nenhum dado encontrado para o período selecionado"
                            : 'Clique em "Atualizar Tudo" para carregar os dados'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      [...ourData]
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map((record, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {record.date}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {record.model_name}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge>{record.provider}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {record.total_requests}
                            </TableCell>
                            <TableCell className="text-right">
                              {record.input_tokens.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {record.output_tokens.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {record.total_tokens.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              R$ {record.cost_brl.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

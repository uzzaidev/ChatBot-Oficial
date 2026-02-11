"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, Download, AlertCircle, CheckCircle2, XCircle, Database, Cloud } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface OpenAIUsageRecord {
  date: string;
  snapshot_id: string;
  operation: string;
  n_requests: number;
  n_context_tokens_total: number;
  n_generated_tokens_total: number;
  total_tokens: number;
  estimated_cost_usd: number;
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

interface Discrepancy {
  client_id: string;
  usage_date: string;
  model_name: string;
  openai_input_tokens: number;
  openai_output_tokens: number;
  our_input_tokens: number;
  our_output_tokens: number;
  input_token_discrepancy_pct: number;
  output_token_discrepancy_pct: number;
}

export default function AnalyticsComparisonPage() {
  const [loadingOpenAI, setLoadingOpenAI] = useState(false);
  const [loadingOurs, setLoadingOurs] = useState(false);
  const [openAIData, setOpenAIData] = useState<OpenAIUsageRecord[]>([]);
  const [ourData, setOurData] = useState<OurTrackingRecord[]>([]);
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [projectId, setProjectId] = useState("");

  const fetchOpenAIData = async () => {
    try {
      setLoadingOpenAI(true);
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      });
      if (projectId) params.append("project_id", projectId);

      const response = await fetch(`/api/openai-billing/detailed?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch OpenAI data");
      }

      setOpenAIData(result.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    } finally {
      setLoadingOpenAI(false);
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
        throw new Error(result.error || "Failed to fetch our tracking data");
      }

      setOurData(result.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    } finally {
      setLoadingOurs(false);
    }
  };

  const fetchDiscrepancies = async () => {
    try {
      const response = await fetch(`/api/analytics/discrepancies?start_date=${startDate}&end_date=${endDate}`);
      const result = await response.json();

      if (response.ok) {
        setDiscrepancies(result.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch discrepancies:", err);
    }
  };

  const fetchAll = async () => {
    await Promise.all([
      fetchOpenAIData(),
      fetchOurData(),
      fetchDiscrepancies(),
    ]);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Calculate comparison stats
  const comparisonStats = {
    openai: {
      totalTokens: openAIData.reduce((sum, r) => sum + r.total_tokens, 0),
      totalRequests: openAIData.reduce((sum, r) => sum + r.n_requests, 0),
      totalCost: openAIData.reduce((sum, r) => sum + r.estimated_cost_usd, 0),
    },
    ours: {
      totalTokens: ourData.reduce((sum, r) => sum + r.total_tokens, 0),
      totalRequests: ourData.reduce((sum, r) => sum + r.total_requests, 0),
      totalCost: ourData.reduce((sum, r) => sum + r.cost_brl, 0),
    },
  };

  const tokenDiscrepancy = comparisonStats.openai.totalTokens > 0
    ? ((Math.abs(comparisonStats.ours.totalTokens - comparisonStats.openai.totalTokens) / comparisonStats.openai.totalTokens) * 100).toFixed(2)
    : "0";

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Comparison</h1>
          <p className="text-muted-foreground">
            Compare dados oficiais da OpenAI com nosso tracking interno
          </p>
        </div>
        <Button onClick={fetchAll} disabled={loadingOpenAI || loadingOurs}>
          <RefreshCw className={`mr-2 h-4 w-4 ${(loadingOpenAI || loadingOurs) ? "animate-spin" : ""}`} />
          Atualizar Tudo
        </Button>
      </div>

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

      {/* Comparison Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Tokens
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Cloud className="h-3 w-3" />
                OpenAI API
              </span>
              <span className="text-lg font-bold">{comparisonStats.openai.totalTokens.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Database className="h-3 w-3" />
                Nosso Tracking
              </span>
              <span className="text-lg font-bold">{comparisonStats.ours.totalTokens.toLocaleString()}</span>
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Discrepância</span>
                <Badge variant={parseFloat(tokenDiscrepancy) > 5 ? "destructive" : "default"}>
                  {tokenDiscrepancy}%
                </Badge>
              </div>
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
              <span className="text-lg font-bold">{comparisonStats.openai.totalRequests.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Database className="h-3 w-3" />
                Nosso Tracking
              </span>
              <span className="text-lg font-bold">{comparisonStats.ours.totalRequests.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Discrepâncias Detectadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {discrepancies.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Diferenças {">"} 5% detectadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Discrepancies Alert */}
      {discrepancies.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Atenção: Discrepâncias detectadas!</AlertTitle>
          <AlertDescription>
            Foram encontradas {discrepancies.length} discrepâncias significativas ({">"} 5%) entre nosso tracking e os dados oficiais da OpenAI.
            Verifique a aba "Discrepâncias" para mais detalhes.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs with Data */}
      <Tabs defaultValue="openai" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="openai" className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            OpenAI API (Oficial)
          </TabsTrigger>
          <TabsTrigger value="ours" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Nosso Tracking
          </TabsTrigger>
          <TabsTrigger value="discrepancies" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Discrepâncias {discrepancies.length > 0 && `(${discrepancies.length})`}
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
                  <CheckCircle2 className="h-3 w-3" />
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
                      <TableHead>Operação</TableHead>
                      <TableHead className="text-right">Requests</TableHead>
                      <TableHead className="text-right">Input Tokens</TableHead>
                      <TableHead className="text-right">Output Tokens</TableHead>
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
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          Nenhum dado encontrado para o período selecionado
                        </TableCell>
                      </TableRow>
                    ) : (
                      openAIData.map((record, index) => (
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
                      <TableHead className="text-right">Output Tokens</TableHead>
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
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          Nenhum dado encontrado para o período selecionado
                        </TableCell>
                      </TableRow>
                    ) : (
                      ourData.map((record, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{record.date}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{record.model_name}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge>{record.provider}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{record.total_requests}</TableCell>
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

        {/* Discrepancies Tab */}
        <TabsContent value="discrepancies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Discrepâncias Detectadas
              </CardTitle>
              <CardDescription>
                Comparação entre nosso tracking e dados oficiais da OpenAI (apenas {">"} 5%)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {discrepancies.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Tudo certo!</h3>
                  <p className="text-muted-foreground">
                    Não foram detectadas discrepâncias significativas entre nosso tracking e os dados da OpenAI.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Modelo</TableHead>
                        <TableHead className="text-right">OpenAI Input</TableHead>
                        <TableHead className="text-right">Nosso Input</TableHead>
                        <TableHead className="text-right">Diferença Input</TableHead>
                        <TableHead className="text-right">OpenAI Output</TableHead>
                        <TableHead className="text-right">Nosso Output</TableHead>
                        <TableHead className="text-right">Diferença Output</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {discrepancies.map((disc, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{disc.usage_date}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{disc.model_name}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {disc.openai_input_tokens.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {disc.our_input_tokens.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={disc.input_token_discrepancy_pct > 10 ? "destructive" : "secondary"}>
                              {disc.input_token_discrepancy_pct.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {disc.openai_output_tokens.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {disc.our_output_tokens.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={disc.output_token_discrepancy_pct > 10 ? "destructive" : "secondary"}>
                              {disc.output_token_discrepancy_pct.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

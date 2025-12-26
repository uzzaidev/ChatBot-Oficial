"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, RefreshCw, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

interface ValidationData {
  period: string;
  summary: {
    total_requests: number;
    total_cost_usd: number;
    total_cost_brl: number;
    by_provider: Record<string, {
      requests: number;
      cost_usd: number;
      cost_brl: number;
    }>;
    by_api_type: Record<string, {
      requests: number;
      cost_usd: number;
      cost_brl: number;
    }>;
  };
  breakdown: Array<{
    api_type: string;
    provider: string;
    model: string;
    requests: number;
    total_tokens: number;
    cached_tokens: number;
    cost_usd: number;
    cost_brl: number;
    cache_hit_rate: number;
  }>;
  validation: {
    has_discrepancies: boolean;
    warnings: string[];
    suggestions: string[];
  };
}

export default function ValidationPage() {
  const [period, setPeriod] = useState<string>("7d");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ValidationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchValidation = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/validate-billing?period=${period}`);
      if (!response.ok) {
        throw new Error("Failed to fetch validation data");
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchValidation();
  }, [period]);

  const formatCurrency = (value: number, currency: "USD" | "BRL") => {
    const symbol = currency === "USD" ? "$" : "R$";
    return `${symbol} ${value.toFixed(currency === "USD" ? 4 : 2)}`;
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("pt-BR").format(value);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Validação de Billing</h1>
          <p className="text-muted-foreground mt-2">
            Compare custos trackados com dashboards dos providers
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Últimas 24h</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={fetchValidation} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Validation Status */}
      {data && (
        <>
          {data.validation.has_discrepancies ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Discrepâncias Encontradas</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  {data.validation.warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Tracking Validado</AlertTitle>
              <AlertDescription>
                Todos os custos estão sendo trackados corretamente! ✅
              </AlertDescription>
            </Alert>
          )}

          {/* Suggestions */}
          {data.validation.suggestions.length > 0 && (
            <Alert>
              <AlertDescription>
                <strong>Sugestões:</strong>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  {data.validation.suggestions.map((suggestion, idx) => (
                    <li key={idx}>{suggestion}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </>
      )}

      {/* Summary Cards */}
      {data && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total de Requests</CardDescription>
              <CardTitle className="text-3xl">
                {formatNumber(data.summary.total_requests)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Últimos {period === "24h" ? "24 horas" : period === "7d" ? "7 dias" : period === "30d" ? "30 dias" : "90 dias"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Custo Total (USD)</CardDescription>
              <CardTitle className="text-3xl">
                {formatCurrency(data.summary.total_cost_usd, "USD")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Trackado em gateway_usage_logs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Custo Total (BRL)</CardDescription>
              <CardTitle className="text-3xl">
                {formatCurrency(data.summary.total_cost_brl, "BRL")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Convertido automaticamente
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* By Provider */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle>Breakdown por Provider</CardTitle>
            <CardDescription>
              Custos agrupados por provider de IA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">Custo USD</TableHead>
                  <TableHead className="text-right">Custo BRL</TableHead>
                  <TableHead className="text-right">% do Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(data.summary.by_provider).map(([provider, stats]) => {
                  const percentage = (stats.cost_usd / data.summary.total_cost_usd) * 100;
                  return (
                    <TableRow key={provider}>
                      <TableCell className="font-medium">
                        <Badge variant="outline">{provider}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(stats.requests)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(stats.cost_usd, "USD")}</TableCell>
                      <TableCell className="text-right">{formatCurrency(stats.cost_brl, "BRL")}</TableCell>
                      <TableCell className="text-right">{percentage.toFixed(1)}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* By API Type */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle>Breakdown por API Type</CardTitle>
            <CardDescription>
              Custos agrupados por tipo de API (Chat, Vision, Whisper, TTS, etc)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>API Type</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">Custo USD</TableHead>
                  <TableHead className="text-right">Custo BRL</TableHead>
                  <TableHead className="text-right">% do Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(data.summary.by_api_type).map(([apiType, stats]) => {
                  const percentage = (stats.cost_usd / data.summary.total_cost_usd) * 100;
                  return (
                    <TableRow key={apiType}>
                      <TableCell className="font-medium">
                        <Badge>{apiType || "chat"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(stats.requests)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(stats.cost_usd, "USD")}</TableCell>
                      <TableCell className="text-right">{formatCurrency(stats.cost_brl, "BRL")}</TableCell>
                      <TableCell className="text-right">{percentage.toFixed(1)}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Detailed Breakdown */}
      {data && data.breakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Breakdown Detalhado</CardTitle>
            <CardDescription>
              Análise detalhada por modelo e API type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>API Type</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Cache Hit %</TableHead>
                  <TableHead className="text-right">Custo USD</TableHead>
                  <TableHead className="text-right">Custo BRL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.breakdown.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Badge variant="outline">{row.api_type || "chat"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{row.provider}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.model}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.requests)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.total_tokens)}</TableCell>
                    <TableCell className="text-right">
                      {row.cache_hit_rate > 0 ? (
                        <Badge variant="default">{row.cache_hit_rate.toFixed(1)}%</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(row.cost_usd, "USD")}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.cost_brl, "BRL")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

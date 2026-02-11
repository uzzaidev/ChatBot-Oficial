"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, CreditCard, AlertCircle } from "lucide-react";

interface BillingSummary {
  hasPaymentMethod: boolean;
  isCanceled: boolean;
  hardLimitUSD: number;
  softLimitUSD: number;
  totalSpentUSD: number;
  remainingCreditsUSD: number;
  usagePercentage: number;
  dailyCosts: Array<{
    timestamp: number;
    line_items: Array<{ name: string; cost: number }>;
  }>;
  todayByModel: Record<string, {
    requests: number;
    inputTokens: number;
    outputTokens: number;
  }>;
  periodDays: number;
  startDate: string;
  endDate: string;
}

export function OpenAIBillingCard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<BillingSummary | null>(null);

  useEffect(() => {
    async function fetchBilling() {
      try {
        setLoading(true);
        const response = await fetch("/api/openai-billing/summary?days=30");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch billing data");
        }

        setSummary(data.data);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    fetchBilling();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Créditos OpenAI</CardTitle>
          <CardDescription>Carregando dados de billing...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Erro ao carregar billing
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  const getStatusColor = () => {
    if (summary.usagePercentage >= 90) return "destructive";
    if (summary.usagePercentage >= 75) return "secondary";
    return "default";
  };

  const getStatusText = () => {
    if (summary.usagePercentage >= 90) return "Crítico";
    if (summary.usagePercentage >= 75) return "Atenção";
    return "Normal";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Créditos OpenAI
            </CardTitle>
            <CardDescription>
              Últimos {summary.periodDays} dias ({summary.startDate} → {summary.endDate})
            </CardDescription>
          </div>
          <Badge variant={getStatusColor()}>{getStatusText()}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Credits Overview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Créditos restantes</span>
            <span className="font-bold text-xl">
              ${summary.remainingCreditsUSD.toFixed(2)}
            </span>
          </div>

          <Progress
            value={summary.usagePercentage}
            className="h-3"
          />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Gasto: ${summary.totalSpentUSD.toFixed(2)}
            </span>
            <span>
              Limite: ${summary.hardLimitUSD.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>Gasto Total</span>
            </div>
            <p className="text-2xl font-bold">
              ${summary.totalSpentUSD.toFixed(2)}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>Uso (%)</span>
            </div>
            <p className="text-2xl font-bold">
              {summary.usagePercentage.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Today's Usage by Model */}
        {Object.keys(summary.todayByModel).length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Uso de hoje por modelo</h4>
            <div className="space-y-2">
              {Object.entries(summary.todayByModel).map(([model, usage]) => (
                <div
                  key={model}
                  className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50"
                >
                  <span className="font-medium text-xs">{model}</span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{usage.requests} req</span>
                    <span>
                      {(usage.inputTokens + usage.outputTokens).toLocaleString()} tokens
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Status */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Método de pagamento</span>
          <Badge variant={summary.hasPaymentMethod ? "default" : "destructive"}>
            {summary.hasPaymentMethod ? "Configurado" : "Não configurado"}
          </Badge>
        </div>

        {summary.isCanceled && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive font-medium">
              ⚠️ Assinatura cancelada
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ============================================================================
// Types
// ============================================================================

interface TimeSeriesData {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  conversions: number;
  revenue: number;
  cpl: number;
  roi: number;
}

interface MetaAdsTrendChartsProps {
  dateFrom: string;
  dateTo: string;
}

// ============================================================================
// Main Component
// ============================================================================

export function MetaAdsTrendCharts({
  dateFrom,
  dateTo,
}: MetaAdsTrendChartsProps) {
  const [data, setData] = useState<TimeSeriesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState<"spend" | "leads" | "roi">(
    "spend",
  );
  const [attributionWindow, setAttributionWindow] = useState("7d_click");

  const fetchTimeSeries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/crm/meta-insights/time-series?date_from=${dateFrom}&date_to=${dateTo}&attribution=${attributionWindow}`,
      );
      const json = await res.json();
      setData(json.timeSeries || []);
    } catch (error) {
      console.error("Error fetching time series:", error);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, attributionWindow]);

  useEffect(() => {
    fetchTimeSeries();
  }, [fetchTimeSeries]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Nenhum dado disponível para o período selecionado
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Métrica:</span>
          <Select
            value={activeMetric}
            onValueChange={(v) =>
              setActiveMetric(v as "spend" | "leads" | "roi")
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="spend">Gasto</SelectItem>
              <SelectItem value="leads">Leads</SelectItem>
              <SelectItem value="roi">ROI</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Atribuição:</span>
          <Select
            value={attributionWindow}
            onValueChange={setAttributionWindow}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d_click">7 dias (click)</SelectItem>
              <SelectItem value="1d_click">1 dia (click)</SelectItem>
              <SelectItem value="1d_view">1 dia (view)</SelectItem>
              <SelectItem value="28d_click">28 dias (click)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            {activeMetric === "spend" && "Gasto Diário"}
            {activeMetric === "leads" && "Leads por Dia"}
            {activeMetric === "roi" && "ROI Diário"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            {activeMetric === "spend" ? (
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  className="text-xs"
                />
                <YAxis
                  tickFormatter={(v) => formatCurrency(v)}
                  className="text-xs"
                />
                <Tooltip
                  formatter={(value: number) => [
                    formatCurrency(value),
                    "Gasto",
                  ]}
                  labelFormatter={(label) => formatDate(label)}
                />
                <Area
                  type="monotone"
                  dataKey="spend"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                />
              </AreaChart>
            ) : activeMetric === "leads" ? (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatNumber(value),
                    name === "leads" ? "Leads" : "Conversões",
                  ]}
                  labelFormatter={(label) => formatDate(label)}
                />
                <Legend />
                <Bar dataKey="leads" name="Leads" fill="hsl(var(--primary))" />
                <Bar
                  dataKey="conversions"
                  name="Conversões"
                  fill="hsl(142 76% 36%)"
                />
              </BarChart>
            ) : (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  className="text-xs"
                />
                <YAxis tickFormatter={(v) => `${v}%`} className="text-xs" />
                <Tooltip
                  formatter={(value: number) => [`${value.toFixed(1)}%`, "ROI"]}
                  labelFormatter={(label) => formatDate(label)}
                />
                <Line
                  type="monotone"
                  dataKey="roi"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Secondary Charts - Spend vs Revenue */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Gasto vs Receita</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  className="text-xs"
                />
                <YAxis
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  className="text-xs"
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === "spend" ? "Gasto" : "Receita",
                  ]}
                  labelFormatter={(label) => formatDate(label)}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="spend"
                  name="Gasto"
                  stroke="hsl(0 84% 60%)"
                  fill="hsl(0 84% 60%)"
                  fillOpacity={0.2}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Receita"
                  stroke="hsl(142 76% 36%)"
                  fill="hsl(142 76% 36%)"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">CPL ao Longo do Tempo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  className="text-xs"
                />
                <YAxis
                  tickFormatter={(v) => formatCurrency(v)}
                  className="text-xs"
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "CPL"]}
                  labelFormatter={(label) => formatDate(label)}
                />
                <Line
                  type="monotone"
                  dataKey="cpl"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

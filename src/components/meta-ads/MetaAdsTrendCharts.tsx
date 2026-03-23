"use client";

import { AnalyticsShell } from "@/components/AnalyticsShell";
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

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function MetaAdsTrendCharts({
  dateFrom,
  dateTo,
}: MetaAdsTrendChartsProps) {
  const [data, setData] = useState<TimeSeriesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [activeMetric, setActiveMetric] = useState<"spend" | "leads" | "roi">(
    "spend",
  );
  const [attributionWindow, setAttributionWindow] = useState("7d_click");

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

  const xAxisInterval = isMobile
    ? Math.max(0, Math.ceil(Math.max(data.length, 1) / 4) - 1)
    : Math.max(0, Math.ceil(Math.max(data.length, 1) / 7) - 1);

  const controls = (
    <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap">
      <div className="flex flex-col gap-2">
        <span className="analytics-shell-kicker">métrica</span>
        <Select
          value={activeMetric}
          onValueChange={(value) =>
            setActiveMetric(value as "spend" | "leads" | "roi")
          }
        >
          <SelectTrigger className="w-full rounded-2xl border-border/80 bg-background/35 sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="spend">Gasto</SelectItem>
            <SelectItem value="leads">Leads</SelectItem>
            <SelectItem value="roi">ROI</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <span className="analytics-shell-kicker">atribuição</span>
        <Select
          value={attributionWindow}
          onValueChange={setAttributionWindow}
        >
          <SelectTrigger className="w-full rounded-2xl border-border/80 bg-background/35 sm:w-[180px]">
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
  );

  if (loading) {
    return (
      <AnalyticsShell
        title="Tendência de performance"
        description="Carregando a série histórica de Meta Ads."
        kicker="meta ads"
        controls={controls}
      >
        <Skeleton className="h-[260px] w-full rounded-[18px] sm:h-[320px]" />
      </AnalyticsShell>
    );
  }

  if (data.length === 0) {
    return (
      <AnalyticsShell
        title="Tendência de performance"
        description="Nenhum dado disponível para o período selecionado."
        kicker="meta ads"
        controls={controls}
      >
        <div className="analytics-empty-state">Nenhum dado disponível.</div>
      </AnalyticsShell>
    );
  }

  const commonMargin = isMobile
    ? { top: 8, right: 8, left: -20, bottom: 0 }
    : { top: 12, right: 12, left: -8, bottom: 0 };

  const commonXAxis = {
    dataKey: "date",
    tickFormatter: formatDate,
    tick: { fontSize: isMobile ? 10 : 11, fill: "hsl(var(--muted-foreground))" },
    tickLine: false,
    axisLine: false,
    minTickGap: isMobile ? 24 : 14,
    interval: xAxisInterval,
  };

  const commonYAxis = {
    tick: { fontSize: isMobile ? 10 : 11, fill: "hsl(var(--muted-foreground))" },
    tickLine: false,
    axisLine: false,
    width: isMobile ? 40 : 54,
  };

  return (
    <div className="space-y-4">
      <AnalyticsShell
        title={
          activeMetric === "spend"
            ? "Gasto Diário"
            : activeMetric === "leads"
              ? "Leads por Dia"
              : "ROI Diário"
        }
        description="Leitura principal de performance com prioridade visual para a série mais importante."
        kicker="meta ads"
        meta={
          <>
            <span className="analytics-inline-chip">
              {formatDate(dateFrom)} - {formatDate(dateTo)}
            </span>
            <span className="analytics-inline-chip">{attributionWindow}</span>
          </>
        }
        controls={controls}
        variant="hero"
      >
        <div className="h-[280px] w-full sm:h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            {activeMetric === "spend" ? (
              <AreaChart data={data} margin={commonMargin}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" vertical={false} />
                <XAxis {...commonXAxis} />
                <YAxis
                  {...commonYAxis}
                  tickFormatter={(value: number) => formatCurrency(value)}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "Gasto"]}
                  labelFormatter={(label) => formatDate(label)}
                />
                <Area
                  type="monotone"
                  dataKey="spend"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  strokeWidth={2.4}
                  fillOpacity={0.2}
                />
              </AreaChart>
            ) : activeMetric === "leads" ? (
              <BarChart data={data} margin={commonMargin}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" vertical={false} />
                <XAxis {...commonXAxis} />
                <YAxis {...commonYAxis} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatNumber(value),
                    name === "leads" ? "Leads" : "Conversões",
                  ]}
                  labelFormatter={(label) => formatDate(label)}
                />
                {!isMobile && <Legend />}
                <Bar dataKey="leads" name="Leads" fill="hsl(var(--primary))" radius={[8, 8, 3, 3]} />
                <Bar
                  dataKey="conversions"
                  name="Conversões"
                  fill="hsl(142 76% 36%)"
                  radius={[8, 8, 3, 3]}
                />
              </BarChart>
            ) : (
              <LineChart data={data} margin={commonMargin}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" vertical={false} />
                <XAxis {...commonXAxis} />
                <YAxis
                  {...commonYAxis}
                  tickFormatter={(value: number) => `${value}%`}
                />
                <Tooltip
                  formatter={(value: number) => [`${value.toFixed(1)}%`, "ROI"]}
                  labelFormatter={(label) => formatDate(label)}
                />
                <Line
                  type="monotone"
                  dataKey="roi"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.4}
                  dot={false}
                  activeDot={{ r: 5, fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </AnalyticsShell>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AnalyticsShell
          title="Gasto vs Receita"
          description="Comparação direta entre investimento e retorno no período."
          kicker="comparativo"
          plotClassName="p-3 sm:p-4"
        >
          <div className="h-[240px] w-full sm:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={commonMargin}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" vertical={false} />
                <XAxis {...commonXAxis} />
                <YAxis
                  {...commonYAxis}
                  tickFormatter={(value: number) => `R$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === "spend" ? "Gasto" : "Receita",
                  ]}
                  labelFormatter={(label) => formatDate(label)}
                />
                {!isMobile && <Legend />}
                <Area
                  type="monotone"
                  dataKey="spend"
                  name="Gasto"
                  stroke="hsl(0 84% 60%)"
                  fill="hsl(0 84% 60%)"
                  fillOpacity={0.18}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Receita"
                  stroke="hsl(142 76% 36%)"
                  fill="hsl(142 76% 36%)"
                  fillOpacity={0.16}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </AnalyticsShell>

        <AnalyticsShell
          title="CPL ao Longo do Tempo"
          description="Custo por lead ao longo da janela analisada."
          kicker="eficiência"
          plotClassName="p-3 sm:p-4"
        >
          <div className="h-[240px] w-full sm:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={commonMargin}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" vertical={false} />
                <XAxis {...commonXAxis} />
                <YAxis
                  {...commonYAxis}
                  tickFormatter={(value: number) => formatCurrency(value)}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "CPL"]}
                  labelFormatter={(label) => formatDate(label)}
                />
                <Line
                  type="monotone"
                  dataKey="cpl"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.4}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </AnalyticsShell>
      </div>
    </div>
  );
}

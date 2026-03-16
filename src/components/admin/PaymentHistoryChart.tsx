"use client";

import { centsToCurrency } from "@/lib/admin-helpers";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface MonthlySummaryPoint {
  month: string;
  total: number;
  count: number;
}

interface PaymentHistoryChartProps {
  data: MonthlySummaryPoint[];
}

const formatMonthLabel = (value: string): string => {
  const [year, month] = value.split("-");
  const parsedMonth = Number(month);
  const parsedYear = Number(year);

  if (!Number.isFinite(parsedMonth) || !Number.isFinite(parsedYear)) {
    return value;
  }

  const date = new Date(parsedYear, parsedMonth - 1, 1);
  return date.toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
  });
};

export function PaymentHistoryChart({ data }: PaymentHistoryChartProps) {
  const hasRevenue = data.some((point) => point.total > 0);

  if (!data.length || !hasRevenue) {
    return (
      <div className="h-64 rounded-lg border border-dashed border-border bg-muted/20 flex items-center justify-center text-sm text-muted-foreground">
        Sem receita processada nos ultimos 12 meses.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
          <XAxis
            dataKey="month"
            tickFormatter={formatMonthLabel}
            tick={{ fontSize: 12 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis
            tickFormatter={(value) => centsToCurrency(Number(value))}
            tick={{ fontSize: 12 }}
            width={90}
            stroke="hsl(var(--muted-foreground))"
          />
          <Tooltip
            formatter={(value: number) => centsToCurrency(value)}
            labelFormatter={(label: string) => formatMonthLabel(label)}
          />
          <Line
            type="monotone"
            dataKey="total"
            name="Receita"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}


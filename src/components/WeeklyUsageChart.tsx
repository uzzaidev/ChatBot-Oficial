'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { WeeklyUsage } from '@/lib/types'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface WeeklyUsageChartProps {
  data: WeeklyUsage[]
}

export function WeeklyUsageChart({ data }: WeeklyUsageChartProps) {
  // Transform data for chart
  const chartData = data.map((item) => ({
    week: `Semana ${item.week_number}`,
    OpenAI: Number(item.openai_tokens || 0),
    Groq: Number(item.groq_tokens || 0),
    Total: Number(item.total_tokens || 0),
    date: new Date(item.week_start).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    }),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução Semanal de Uso</CardTitle>
        <CardDescription>
          Tokens consumidos nas últimas 12 semanas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip
              formatter={(value: number) => value.toLocaleString('pt-BR')}
              labelFormatter={(label) => `Data: ${label}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="OpenAI"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Groq"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Total"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

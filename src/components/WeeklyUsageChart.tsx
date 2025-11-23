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
  console.log('[WeeklyUsageChart] Raw data received:', data.length, 'weeks')

  // Sort by week_start date (ascending - oldest to newest)
  const sortedData = [...data].sort((a, b) =>
    new Date(a.week_start).getTime() - new Date(b.week_start).getTime()
  )

  console.log('[WeeklyUsageChart] Week range:', {
    oldest: sortedData[0]?.week_start,
    newest: sortedData[sortedData.length - 1]?.week_start
  })

  // Transform data for chart
  const chartData = sortedData.map((item) => ({
    week: `Semana ${item.week_number}`,
    OpenAI: Number(item.openai_tokens || 0),
    Groq: Number(item.groq_tokens || 0),
    Total: Number(item.total_tokens || 0),
    date: new Date(item.week_start).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    }),
    timestamp: new Date(item.week_start).getTime()
  }))

  console.log('[WeeklyUsageChart] Final chartData:', chartData.map(d => ({
    date: d.date,
    total: d.Total
  })))

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

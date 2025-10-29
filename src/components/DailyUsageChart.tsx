'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { DailyUsage } from '@/lib/types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface DailyUsageChartProps {
  data: DailyUsage[]
  days?: number
}

export function DailyUsageChart({ data, days = 30 }: DailyUsageChartProps) {
  // Group data by date and aggregate by source
  const groupedData = data.reduce((acc: Record<string, any>, item) => {
    const date = new Date(item.date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    })
    
    if (!acc[date]) {
      acc[date] = { date, OpenAI: 0, Groq: 0, Total: 0 }
    }
    
    const tokens = Number(item.total_tokens || 0)
    if (item.source === 'openai') {
      acc[date].OpenAI += tokens
    } else if (item.source === 'groq') {
      acc[date].Groq += tokens
    }
    acc[date].Total += tokens
    
    return acc
  }, {})

  const chartData = Object.values(groupedData).reverse().slice(0, days)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Uso Diário</CardTitle>
        <CardDescription>
          Tokens consumidos por dia (últimos {days} dias)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip
              formatter={(value: number) => value.toLocaleString('pt-BR')}
            />
            <Legend />
            <Bar dataKey="OpenAI" fill="#10b981" />
            <Bar dataKey="Groq" fill="#8b5cf6" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

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
  console.log('[DailyUsageChart] Raw data received:', data.length, 'rows')

  // Sort data by date first (ascending)
  const sortedData = [...data].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  console.log('[DailyUsageChart] Date range:', {
    oldest: sortedData[0]?.date,
    newest: sortedData[sortedData.length - 1]?.date
  })

  // Group data by date and aggregate by source
  const groupedData = sortedData.reduce((acc: Record<string, any>, item) => {
    const dateObj = new Date(item.date)
    const dateKey = dateObj.toISOString().split('T')[0] // YYYY-MM-DD for unique key
    const dateLabel = dateObj.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    })

    if (!acc[dateKey]) {
      acc[dateKey] = { date: dateLabel, timestamp: dateObj.getTime(), OpenAI: 0, Groq: 0, Total: 0 }
    }

    const tokens = Number(item.total_tokens || 0)
    if (item.source === 'openai') {
      acc[dateKey].OpenAI += tokens
    } else if (item.source === 'groq') {
      acc[dateKey].Groq += tokens
    }
    acc[dateKey].Total += tokens

    return acc
  }, {})

  // Convert to array, sort by timestamp descending, take last N days
  const chartData = Object.values(groupedData)
    .sort((a: any, b: any) => b.timestamp - a.timestamp)
    .slice(0, days)
    .reverse() // Reverse to show oldest first (left to right)

  console.log('[DailyUsageChart] Final chartData:', chartData.map(d => ({
    date: d.date,
    total: d.Total
  })))

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

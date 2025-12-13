'use client'

/**
 * Provider Breakdown Chart Component
 * 
 * Pie chart showing distribution of requests by AI provider
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface ProviderBreakdownChartProps {
  data: Array<{
    provider: string
    requests: number
    percentage: number
  }>
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

export const ProviderBreakdownChart = ({ data }: ProviderBreakdownChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        Nenhum dado disponível
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(entry: any) => `${entry.provider}: ${entry.percentage.toFixed(1)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="requests"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: any, name: string, props: any) => [
            `${value.toLocaleString('pt-BR')} requests (${props.payload.percentage.toFixed(1)}%)`,
            props.payload.provider
          ]}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

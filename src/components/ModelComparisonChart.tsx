'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { MonthlyUsageByModel } from '@/lib/types'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'

interface ModelComparisonChartProps {
  data: MonthlyUsageByModel[]
}

const COLORS = {
  openai: '#10b981',
  groq: '#8b5cf6',
  meta: '#f59e0b',
  whisper: '#3b82f6',
}

export function ModelComparisonChart({ data }: ModelComparisonChartProps) {
  // Calculate totals by source
  const sourceData = data.reduce((acc: Record<string, number>, item) => {
    const source = item.source
    acc[source] = (acc[source] || 0) + Number(item.total_tokens || 0)
    return acc
  }, {})

  const chartData = Object.entries(sourceData).map(([name, value]) => ({
    name: name.toUpperCase(),
    value,
    color: COLORS[name as keyof typeof COLORS] || '#6b7280',
  }))

  // Calculate total cost by source
  const costData = data.reduce((acc: Record<string, number>, item) => {
    const source = item.source
    acc[source] = (acc[source] || 0) + Number(item.total_cost || 0)
    return acc
  }, {})

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparação OpenAI vs Groq</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium mb-4 text-center">
              Tokens por Provider
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: any) =>
                    `${props.name} (${(props.percent * 100).toFixed(0)}%)`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => value.toLocaleString('pt-BR')}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium mb-4">Estatísticas Detalhadas</h3>
            <div className="space-y-3">
              {data.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-3 bg-muted rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {item.source.toUpperCase()} - {item.model}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {Number(item.request_count || 0).toLocaleString('pt-BR')}{' '}
                      requisições
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {Number(item.total_tokens || 0).toLocaleString('pt-BR')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ${Number(item.total_cost || 0).toFixed(4)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Custo por Provider</h4>
              {Object.entries(costData).map(([source, cost]) => (
                <div key={source} className="flex justify-between text-sm py-1">
                  <span className="text-muted-foreground">
                    {source.toUpperCase()}:
                  </span>
                  <span className="font-medium">
                    ${Number(cost).toFixed(4)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

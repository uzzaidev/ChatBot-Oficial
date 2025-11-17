'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageCircle, Users, Clock, DollarSign } from 'lucide-react'
import type { DashboardMetrics } from '@/lib/types'
import { formatCurrencyUSD } from '@/lib/utils'

interface MetricsDashboardProps {
  metrics: DashboardMetrics
  loading: boolean
}

export const MetricsDashboard = ({ metrics, loading }: MetricsDashboardProps) => {
  const metricCards = [
    {
      title: 'Total de Conversas',
      value: metrics.total_conversations,
      icon: MessageCircle,
      description: 'Todas as conversas',
      color: 'text-brand-blue-600',
      bgColor: 'bg-brand-blue-50',
    },
    {
      title: 'Conversas Ativas',
      value: metrics.active_conversations,
      icon: Users,
      description: 'Com o bot',
      color: 'text-mint-600',
      bgColor: 'bg-mint-50',
    },
    {
      title: 'Aguardando Humano',
      value: metrics.waiting_human,
      icon: Clock,
      description: 'Na fila',
      color: 'text-gold-600',
      bgColor: 'bg-gold-50',
    },
    {
      title: 'Custo Mensal',
      value: formatCurrencyUSD(metrics.total_cost_month),
      icon: DollarSign,
      description: 'Estimado',
      color: 'text-erie-black-700',
      bgColor: 'bg-silver-100',
    },
  ]

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-silver-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-erie-black-700">
                Carregando...
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-silver-200 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metricCards.map((metric) => {
        const Icon = metric.icon
        return (
          <Card key={metric.title} className="border-silver-200 hover:border-mint-300 transition-colors hover:shadow-glow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-erie-black-700">
                {metric.title}
              </CardTitle>
              <div className={`h-8 w-8 rounded-lg ${metric.bgColor} flex items-center justify-center`}>
                <Icon className={`h-4 w-4 ${metric.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-erie-black-900">
                {typeof metric.value === 'number' ? metric.value : metric.value}
              </div>
              <p className="text-xs text-erie-black-600">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

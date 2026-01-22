'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClientBrowser } from '@/lib/supabase'
import type { DashboardMetricsData, ChartConfig, MetricDataPoint } from '@/lib/types/dashboard-metrics'

/**
 * Agrega dados por mês (YYYY-MM)
 */
function aggregateByMonth(data: MetricDataPoint[]): MetricDataPoint[] {
  const grouped = new Map<string, any>()
  
  data.forEach((item) => {
    const date = new Date(item.date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    
    if (!grouped.has(monthKey)) {
      const initial: any = { date: monthKey }
      Object.keys(item).forEach((key) => {
        if (key !== 'date') {
          initial[key] = 0
        }
      })
      grouped.set(monthKey, initial)
    }
    
    const existing = grouped.get(monthKey)!
    Object.keys(item).forEach((key) => {
      if (key !== 'date' && typeof item[key as keyof MetricDataPoint] === 'number') {
        existing[key] = (existing[key] || 0) + (item[key as keyof MetricDataPoint] as number)
      }
    })
  })
  
  return Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Agrega dados por semana (YYYY-WW)
 */
function aggregateByWeek(data: MetricDataPoint[]): MetricDataPoint[] {
  const grouped = new Map<string, any>()
  
  data.forEach((item) => {
    const date = new Date(item.date)
    // Calcular número da semana ISO
    const year = date.getFullYear()
    const d = new Date(Date.UTC(year, date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    const weekKey = `${year}-W${String(weekNum).padStart(2, '0')}`
    
    if (!grouped.has(weekKey)) {
      const initial: any = { date: weekKey }
      Object.keys(item).forEach((key) => {
        if (key !== 'date') {
          initial[key] = 0
        }
      })
      grouped.set(weekKey, initial)
    }
    
    const existing = grouped.get(weekKey)!
    Object.keys(item).forEach((key) => {
      if (key !== 'date' && typeof item[key as keyof MetricDataPoint] === 'number') {
        existing[key] = (existing[key] || 0) + (item[key as keyof MetricDataPoint] as number)
      }
    })
  })
  
  return Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Agrega dados por ano (YYYY)
 */
function aggregateByYear(data: MetricDataPoint[]): MetricDataPoint[] {
  const grouped = new Map<string, any>()
  
  data.forEach((item) => {
    const date = new Date(item.date)
    const yearKey = String(date.getFullYear())
    
    if (!grouped.has(yearKey)) {
      const initial: any = { date: yearKey }
      Object.keys(item).forEach((key) => {
        if (key !== 'date') {
          initial[key] = 0
        }
      })
      grouped.set(yearKey, initial)
    }
    
    const existing = grouped.get(yearKey)!
    Object.keys(item).forEach((key) => {
      if (key !== 'date' && typeof item[key as keyof MetricDataPoint] === 'number') {
        existing[key] = (existing[key] || 0) + (item[key as keyof MetricDataPoint] as number)
      }
    })
  })
  
  return Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date))
}

interface UseDashboardMetricsOptions {
  days?: number
  startDate?: Date
  endDate?: Date
  month?: number // 1-12
  year?: number
  refreshInterval?: number
}

interface UseDashboardMetricsReturn {
  metrics: DashboardMetricsData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  getMetricData: (metricType: ChartConfig['metricType']) => MetricDataPoint[]
}

/**
 * useDashboardMetrics Hook
 *
 * Hook para buscar e gerenciar métricas do dashboard customizável
 *
 * Features:
 * - Busca métricas da API
 * - Refresh automático (opcional)
 * - Transforma dados para cada tipo de métrica
 * - Loading e error states
 */
export function useDashboardMetrics({
  days,
  startDate,
  endDate,
  month,
  year,
  refreshInterval = 0,
}: UseDashboardMetricsOptions = {}): UseDashboardMetricsReturn {
  const [metrics, setMetrics] = useState<DashboardMetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = createClientBrowser()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('Not authenticated')
      }

      // Construir query params baseado no tipo de filtro
      const params = new URLSearchParams()
      
      if (startDate && endDate) {
        // Range customizado
        params.set('startDate', startDate.toISOString())
        params.set('endDate', endDate.toISOString())
      } else if (month && year) {
        // Mês/ano específico
        params.set('month', month.toString())
        params.set('year', year.toString())
      } else {
        // Fallback para days (legado)
        params.set('days', (days || 30).toString())
      }

      const response = await fetch(`/api/dashboard/metrics?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Failed to fetch metrics: ${errorData.error || response.statusText}`)
      }

      const data = await response.json()

      setMetrics(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [days, startDate, endDate, month, year])

  useEffect(() => {
    fetchMetrics()

    if (refreshInterval > 0) {
      const interval = setInterval(fetchMetrics, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [fetchMetrics, refreshInterval])

  const getMetricData = useCallback(
    (metricType: ChartConfig['metricType']): MetricDataPoint[] => {
      if (!metrics) return []

      switch (metricType) {
        case 'conversations_per_day':
          return metrics.conversations.map((item) => ({
            date: item.date,
            total: item.total,
            ativo: item.active,
            transferido: item.transferred,
            humano: item.human,
          }))

        case 'new_clients_per_day':
          return metrics.clients.map((item) => ({
            date: item.date,
            total: item.total,
            novos: item.new,
          }))

        case 'messages_per_day':
          return metrics.messages.map((item) => ({
            date: item.date,
            total: item.total,
            recebidas: item.incoming,
            enviadas: item.outgoing,
          }))

        case 'tokens_per_day':
          return metrics.tokens.map((item) => ({
            date: item.date,
            total: item.total,
            openai: item.openai,
            groq: item.groq,
          }))

        case 'cost_per_day':
          return metrics.cost.map((item) => ({
            date: item.date,
            total: Number(item.total.toFixed(4)),
            openai: Number(item.openai.toFixed(4)),
            groq: Number(item.groq.toFixed(4)),
          }))

        // Métricas por Semana - Agregar dados diários
        case 'conversations_per_week':
          return aggregateByWeek(metrics.conversations.map((item) => ({
            date: item.date,
            total: item.total,
            ativo: item.active,
            transferido: item.transferred,
            humano: item.human,
          })))

        case 'new_clients_per_week':
          return aggregateByWeek(metrics.clients.map((item) => ({
            date: item.date,
            total: item.total,
            novos: item.new,
          })))

        case 'messages_per_week':
          return aggregateByWeek(metrics.messages.map((item) => ({
            date: item.date,
            total: item.total,
            recebidas: item.incoming,
            enviadas: item.outgoing,
          })))

        case 'tokens_per_week':
          return aggregateByWeek(metrics.tokens.map((item) => ({
            date: item.date,
            total: item.total,
            openai: item.openai,
            groq: item.groq,
          })))

        case 'cost_per_week':
          return aggregateByWeek(metrics.cost.map((item) => ({
            date: item.date,
            total: Number(item.total.toFixed(4)),
            openai: Number(item.openai.toFixed(4)),
            groq: Number(item.groq.toFixed(4)),
          })))

        // Métricas por Mês - Agregar dados diários
        case 'conversations_per_month':
          return aggregateByMonth(metrics.conversations.map((item) => ({
            date: item.date,
            total: item.total,
            ativo: item.active,
            transferido: item.transferred,
            humano: item.human,
          })))

        case 'new_clients_per_month':
          return aggregateByMonth(metrics.clients.map((item) => ({
            date: item.date,
            total: item.total,
            novos: item.new,
          })))

        case 'messages_per_month':
          return aggregateByMonth(metrics.messages.map((item) => ({
            date: item.date,
            total: item.total,
            recebidas: item.incoming,
            enviadas: item.outgoing,
          })))

        case 'tokens_per_month':
          return aggregateByMonth(metrics.tokens.map((item) => ({
            date: item.date,
            total: item.total,
            openai: item.openai,
            groq: item.groq,
          })))

        case 'cost_per_month':
          return aggregateByMonth(metrics.cost.map((item) => ({
            date: item.date,
            total: Number(item.total.toFixed(4)),
            openai: Number(item.openai.toFixed(4)),
            groq: Number(item.groq.toFixed(4)),
          })))

        // Métricas por Ano - Agregar dados diários
        case 'conversations_per_year':
          return aggregateByYear(metrics.conversations.map((item) => ({
            date: item.date,
            total: item.total,
            ativo: item.active,
            transferido: item.transferred,
            humano: item.human,
          })))

        case 'new_clients_per_year':
          return aggregateByYear(metrics.clients.map((item) => ({
            date: item.date,
            total: item.total,
            novos: item.new,
          })))

        case 'messages_per_year':
          return aggregateByYear(metrics.messages.map((item) => ({
            date: item.date,
            total: item.total,
            recebidas: item.incoming,
            enviadas: item.outgoing,
          })))

        case 'tokens_per_year':
          return aggregateByYear(metrics.tokens.map((item) => ({
            date: item.date,
            total: item.total,
            openai: item.openai,
            groq: item.groq,
          })))

        case 'cost_per_year':
          return aggregateByYear(metrics.cost.map((item) => ({
            date: item.date,
            total: Number(item.total.toFixed(4)),
            openai: Number(item.openai.toFixed(4)),
            groq: Number(item.groq.toFixed(4)),
          })))

        case 'status_distribution':
          return metrics.statusDistribution.map((item) => ({
            date: item.status,
            value: item.count,
            label: item.status,
            percentage: Number(item.percentage.toFixed(1)),
          }))

        // Métricas avançadas - Performance
        case 'latency_per_day':
          return metrics.latency?.map((item) => ({
            date: item.date,
            average: item.average,
            p50: item.p50,
            p95: item.p95,
            p99: item.p99,
            min: item.min,
            max: item.max,
          })) || []

        case 'latency_per_week':
          return metrics.latency ? aggregateByWeek(metrics.latency.map((item) => ({
            date: item.date,
            average: item.average,
            p50: item.p50,
            p95: item.p95,
            p99: item.p99,
            min: item.min,
            max: item.max,
          }))) : []

        case 'latency_per_month':
          return metrics.latency ? aggregateByMonth(metrics.latency.map((item) => ({
            date: item.date,
            average: item.average,
            p50: item.p50,
            p95: item.p95,
            p99: item.p99,
            min: item.min,
            max: item.max,
          }))) : []

        case 'latency_per_year':
          return metrics.latency ? aggregateByYear(metrics.latency.map((item) => ({
            date: item.date,
            average: item.average,
            p50: item.p50,
            p95: item.p95,
            p99: item.p99,
            min: item.min,
            max: item.max,
          }))) : []

        case 'latency_p50':
          return metrics.latency?.map((item) => ({
            date: item.date,
            value: item.p50,
            label: 'P50',
          })) || []

        case 'latency_p95':
          return metrics.latency?.map((item) => ({
            date: item.date,
            value: item.p95,
            label: 'P95',
          })) || []

        case 'latency_p99':
          return metrics.latency?.map((item) => ({
            date: item.date,
            value: item.p99,
            label: 'P99',
          })) || []

        case 'cache_hit_rate':
          return metrics.cacheHitRate?.map((item) => ({
            date: item.date,
            value: Number(item.hitRate.toFixed(2)),
            hits: item.hits,
            misses: item.misses,
            total: item.total,
            savingsUSD: item.savingsUSD,
          })) || []

        case 'error_rate':
          return metrics.errorRate?.map((item) => ({
            date: item.date,
            value: Number(item.errorRate.toFixed(2)),
            errors: item.errors,
            total: item.total,
            byType: item.byType,
          })) || []

        case 'error_rate_by_type':
          // Transformar byType em array de pontos
          const errorByTypeData: MetricDataPoint[] = []
          metrics.errorRate?.forEach((item) => {
            Object.entries(item.byType || {}).forEach(([type, count]) => {
              errorByTypeData.push({
                date: item.date,
                label: type,
                value: Number(count),
              })
            })
          })
          return errorByTypeData

        // Métricas avançadas - Financeiras
        case 'cost_per_conversation':
          return metrics.costPerConversation?.map((item) => ({
            date: item.date,
            value: item.average,
            totalCost: item.totalCost,
            totalConversations: item.totalConversations,
          })) || []

        case 'cost_per_message':
          return metrics.costPerMessage?.map((item) => ({
            date: item.date,
            value: item.average,
            totalCost: item.totalCost,
            totalMessages: item.totalMessages,
          })) || []

        case 'cost_by_provider':
          const costByProviderData: MetricDataPoint[] = []
          metrics.costBreakdown?.forEach((item) => {
            Object.entries(item.byProvider || {}).forEach(([provider, cost]) => {
              costByProviderData.push({
                date: item.date,
                label: provider,
                value: Number(cost.toFixed(4)),
              })
            })
          })
          return costByProviderData

        case 'cost_by_model':
          const costByModelData: MetricDataPoint[] = []
          metrics.costBreakdown?.forEach((item) => {
            Object.entries(item.byModel || {}).forEach(([model, cost]) => {
              costByModelData.push({
                date: item.date,
                label: model,
                value: Number(cost.toFixed(4)),
              })
            })
          })
          return costByModelData

        case 'cost_by_api_type':
          const costByApiTypeData: MetricDataPoint[] = []
          metrics.costBreakdown?.forEach((item) => {
            Object.entries(item.byApiType || {}).forEach(([apiType, cost]) => {
              costByApiTypeData.push({
                date: item.date,
                label: apiType,
                value: Number(cost.toFixed(4)),
              })
            })
          })
          return costByApiTypeData

        // Métricas avançadas - Engajamento
        case 'messages_by_hour':
          return metrics.messagesByHour?.map((item) => ({
            date: item.hour,
            value: item.total,
            incoming: item.incoming,
            outgoing: item.outgoing,
            label: `${item.hour}:00`,
          })) || []

        case 'peak_hours':
          // Retornar top 5 horas com mais mensagens
          const sortedHours = [...(metrics.messagesByHour || [])]
            .sort((a, b) => b.total - a.total)
            .slice(0, 5)
          return sortedHours.map((item) => ({
            date: item.hour,
            value: item.total,
            label: `${item.hour}:00`,
          }))

        default:
          return []
      }
    },
    [metrics]
  )

  return {
    metrics,
    loading,
    error,
    refetch: fetchMetrics,
    getMetricData,
  }
}

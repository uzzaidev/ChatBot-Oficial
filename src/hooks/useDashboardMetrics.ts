'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClientBrowser } from '@/lib/supabase'
import type { DashboardMetricsData, ChartConfig, MetricDataPoint } from '@/lib/types/dashboard-metrics'

interface UseDashboardMetricsOptions {
  days?: number
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
  days = 30,
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

      const response = await fetch(`/api/dashboard/metrics?days=${days}`, {
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
      console.error('[useDashboardMetrics] Error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [days])

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

        case 'status_distribution':
          return metrics.statusDistribution.map((item) => ({
            date: item.status,
            value: item.count,
            label: item.status,
            percentage: Number(item.percentage.toFixed(1)),
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

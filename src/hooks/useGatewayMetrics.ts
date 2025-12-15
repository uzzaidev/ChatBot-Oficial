/**
 * useGatewayMetrics Hook
 * 
 * Custom hook for fetching AI Gateway metrics with automatic refresh
 */

import { useState, useEffect, useCallback } from 'react'

interface UseGatewayMetricsParams {
  period: '7d' | '30d' | '60d' | '90d'
  aggregated?: boolean
  clientId?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

interface GatewayMetricsData {
  totalRequests: number
  totalCostBRL: number
  cacheHitRate: number
  averageLatencyMs: number
  errorRate: number
  costByModel?: Array<{
    model: string
    provider: string
    cost: number
    requests: number
  }>
  [key: string]: any
}

export const useGatewayMetrics = ({
  period,
  aggregated = false,
  clientId,
  autoRefresh = false,
  refreshInterval = 300000, // 5 minutes
}: UseGatewayMetricsParams) => {
  const [data, setData] = useState<GatewayMetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ period })
      
      if (aggregated) {
        params.append('aggregated', 'true')
      }
      
      if (clientId) {
        params.append('clientId', clientId)
      }

      const endpoint = aggregated 
        ? '/api/ai-gateway/metrics'
        : '/api/analytics/gateway'

      const response = await fetch(`${endpoint}?${params}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch metrics')
      }

      const result = await response.json()
      setData(result)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [period, aggregated, clientId])

  useEffect(() => {
    fetchMetrics()

    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [fetchMetrics, autoRefresh, refreshInterval])

  return {
    data,
    loading,
    error,
    refetch: fetchMetrics,
  }
}

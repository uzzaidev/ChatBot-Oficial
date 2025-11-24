'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'
import type { AnalyticsData } from '@/lib/types'

interface UseAnalyticsOptions {
  days?: number
  type?: 'all' | 'daily' | 'weekly' | 'monthly' | 'conversation'
  refreshInterval?: number
}

interface UseAnalyticsReturn {
  analytics: AnalyticsData | null
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Custom hook to fetch analytics data
 *
 * Uses API route /api/analytics (works in web and mobile via apiFetch)
 *
 * @param options - Configuration options
 * @returns Analytics data, loading state, error, and refetch function
 */
export function useAnalytics(options: UseAnalyticsOptions = {}): UseAnalyticsReturn {
  const { days = 30, type = 'all', refreshInterval } = options

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        days: days.toString(),
        type,
      })

      // Use apiFetch (works in web and mobile)
      const response = await apiFetch(`/api/analytics?${params}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`)
      }

      const data = await response.json()
      setAnalytics(data.analytics)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('[useAnalytics] Error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()

    // Set up polling if refreshInterval is provided
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(fetchAnalytics, refreshInterval)
      return () => clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, type, refreshInterval])

  return {
    analytics,
    loading,
    error,
    refetch: fetchAnalytics,
  }
}

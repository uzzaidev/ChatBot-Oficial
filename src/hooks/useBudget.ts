/**
 * useBudget Hook
 * 
 * Custom hook for fetching and managing budget configuration and usage
 */

import { useState, useEffect, useCallback } from 'react'

interface UseBudgetParams {
  clientId: string
  autoRefresh?: boolean
  refreshInterval?: number
}

interface BudgetData {
  exists: boolean
  budgetType?: 'tokens' | 'brl' | 'usd'
  budgetLimit?: number
  budgetPeriod?: 'daily' | 'weekly' | 'monthly'
  currentUsage?: number
  percentage?: number
  remaining?: number
  isPaused?: boolean
  daysRemaining?: number
  projectedUsage?: number
  nextResetAt?: string
  alertThreshold80?: boolean
  alertThreshold90?: boolean
  alertThreshold100?: boolean
  pauseAtLimit?: boolean
}

export const useBudget = ({
  clientId,
  autoRefresh = true,
  refreshInterval = 300000, // 5 minutes
}: UseBudgetParams) => {
  const [config, setConfig] = useState<BudgetData | null>(null)
  const [usage, setUsage] = useState<BudgetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConfig = useCallback(async () => {
    try {
      const response = await fetch(`/api/budget/config?clientId=${clientId}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch budget config')
      }

      const data = await response.json()
      setConfig(data)
    } catch (err: any) {
      setError(err.message || 'An error occurred fetching config')
    }
  }, [clientId])

  const fetchUsage = useCallback(async () => {
    try {
      const response = await fetch(`/api/budget/current-usage?clientId=${clientId}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch budget usage')
      }

      const data = await response.json()
      setUsage(data)

      // Alert if approaching limit
      if (data.percentage >= 80 && data.percentage < 90) {
        console.warn(`[Budget Alert] Client ${clientId} at ${data.percentage.toFixed(1)}% usage`)
      } else if (data.percentage >= 90 && data.percentage < 100) {
        console.error(`[Budget Critical] Client ${clientId} at ${data.percentage.toFixed(1)}% usage`)
      } else if (data.percentage >= 100) {
        console.error(`[Budget Exceeded] Client ${clientId} exceeded budget limit!`)
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred fetching usage')
    }
  }, [clientId])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)

    await Promise.all([fetchConfig(), fetchUsage()])

    setLoading(false)
  }, [fetchConfig, fetchUsage])

  useEffect(() => {
    fetchAll()

    if (autoRefresh) {
      const interval = setInterval(fetchUsage, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [fetchAll, fetchUsage, autoRefresh, refreshInterval])

  const saveConfig = async (newConfig: Partial<BudgetData>) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/budget/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          ...newConfig,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save budget config')
      }

      await fetchAll()
      return true
    } catch (err: any) {
      setError(err.message || 'Failed to save config')
      return false
    } finally {
      setLoading(false)
    }
  }

  const resetConfig = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/budget/config', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to reset budget config')
      }

      await fetchAll()
      return true
    } catch (err: any) {
      setError(err.message || 'Failed to reset config')
      return false
    } finally {
      setLoading(false)
    }
  }

  return {
    config,
    usage,
    loading,
    error,
    refetch: fetchAll,
    saveConfig,
    resetConfig,
  }
}

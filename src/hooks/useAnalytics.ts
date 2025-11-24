'use client'

import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { createBrowserClient } from '@/lib/supabase-browser'
import type { AnalyticsData, AnalyticsSummary } from '@/lib/types'

interface UseAnalyticsOptions {
  days?: number
  type?: 'all' | 'daily' | 'weekly' | 'monthly' | 'conversation'
  refreshInterval?: number
  clientId?: string // Required for mobile (direct Supabase access)
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
 * Mobile-compatible: Uses Supabase RPC directly when in mobile (no API routes)
 * Web: Uses API route /api/analytics
 * 
 * @param options - Configuration options
 * @returns Analytics data, loading state, error, and refetch function
 */
export function useAnalytics(options: UseAnalyticsOptions = {}): UseAnalyticsReturn {
  const { days = 30, type = 'all', refreshInterval, clientId } = options
  const isMobile = Capacitor.isNativePlatform()
  
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Mobile: Fetch directly from Supabase using RPC functions
  const fetchAnalyticsMobile = async (finalClientId: string) => {
    try {
      const supabase = createBrowserClient()
      const analyticsData: AnalyticsData = {}

      // Fetch different types based on query
      if (type === 'all' || type === 'daily') {
        const { data: dailyData, error: dailyError } = await supabase.rpc('get_daily_usage', {
          p_client_id: finalClientId,
          p_days: days,
        })
        if (dailyError) throw dailyError
        analyticsData.daily = dailyData || []
      }

      if (type === 'all' || type === 'weekly') {
        const { data: weeklyData, error: weeklyError } = await supabase.rpc('get_weekly_evolution', {
          p_client_id: finalClientId,
          p_weeks: 12,
        })
        if (weeklyError) throw weeklyError
        analyticsData.weekly = weeklyData || []
      }

      if (type === 'all' || type === 'monthly') {
        const now = new Date()
        const { data: monthlyData, error: monthlyError } = await supabase.rpc('get_monthly_summary', {
          p_client_id: finalClientId,
          p_year: now.getFullYear(),
          p_month: now.getMonth() + 1,
        })
        if (monthlyError) throw monthlyError
        analyticsData.monthly = monthlyData || []
      }

      if (type === 'all' || type === 'conversation') {
        const { data: conversationData, error: conversationError } = await supabase.rpc('get_usage_by_conversation', {
          p_client_id: finalClientId,
          p_days: days,
          p_limit: 20,
        })
        if (conversationError) throw conversationError
        analyticsData.byConversation = conversationData || []
      }

      // Calculate summary statistics
      const { data: summaryData, error: summaryError } = await supabase
        .from('usage_logs')
        .select('phone, total_tokens, cost_usd, source')
        .eq('client_id', finalClientId)
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())

      if (summaryError) throw summaryError

      // Aggregate summary
      const summary: AnalyticsSummary = {
        unique_conversations: new Set(summaryData?.map((r: any) => r.phone) || []).size,
        total_tokens: summaryData?.reduce((sum: number, r: any) => sum + (r.total_tokens || 0), 0) || 0,
        total_cost: summaryData?.reduce((sum: number, r: any) => sum + (Number(r.cost_usd) || 0), 0) || 0,
        total_requests: summaryData?.length || 0,
        openai_tokens: summaryData?.filter((r: any) => r.source === 'openai').reduce((sum: number, r: any) => sum + (r.total_tokens || 0), 0) || 0,
        groq_tokens: summaryData?.filter((r: any) => r.source === 'groq').reduce((sum: number, r: any) => sum + (r.total_tokens || 0), 0) || 0,
        openai_cost: summaryData?.filter((r: any) => r.source === 'openai').reduce((sum: number, r: any) => sum + (Number(r.cost_usd) || 0), 0) || 0,
        groq_cost: summaryData?.filter((r: any) => r.source === 'groq').reduce((sum: number, r: any) => sum + (Number(r.cost_usd) || 0), 0) || 0,
      }

      analyticsData.summary = summary
      setAnalytics(analyticsData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('[useAnalytics Mobile] Error:', err)
      throw err
    }
  }

  // Web: Fetch from API route
  const fetchAnalyticsWeb = async () => {
    try {
      const params = new URLSearchParams({
        days: days.toString(),
        type,
      })

      const response = await fetch(`/api/analytics?${params}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`)
      }

      const data = await response.json()
      setAnalytics(data.analytics)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('[useAnalytics Web] Error:', err)
      throw err
    }
  }

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      if (isMobile) {
        // Mobile: Need clientId to fetch directly from Supabase
        if (!clientId) {
          // Try to get clientId from user profile
          const supabase = createBrowserClient()
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) {
            throw new Error('User not authenticated')
          }

          const { data: profile } = await supabase
            .from('user_profiles')
            .select('client_id')
            .eq('id', user.id)
            .single()

          if (!profile?.client_id) {
            throw new Error('Client ID not found')
          }

          await fetchAnalyticsMobile(profile.client_id)
        } else {
          await fetchAnalyticsMobile(clientId)
        }
      } else {
        // Web: Use API route
        await fetchAnalyticsWeb()
      }
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
  }, [days, type, refreshInterval, clientId, isMobile])

  return {
    analytics,
    loading,
    error,
    refetch: fetchAnalytics,
  }
}

/**
 * AI Gateway Metrics API Route (Admin Only)
 * 
 * GET /api/ai-gateway/metrics
 * Returns aggregated metrics for all clients using AI Gateway
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d'

    // Calculate date range
    const daysMap: Record<string, number> = {
      '7d': 7,
      '30d': 30,
      '60d': 60,
      '90d': 90,
    }
    
    const days = daysMap[period] || 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const supabase = await createServerClient()

    // Fetch aggregated metrics
    const { data: usageLogs, error: usageError } = await supabase
      .from('gateway_usage_logs')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (usageError) throw usageError

    // Calculate metrics
    const totalRequests = usageLogs?.length || 0
    const totalCostBRL = usageLogs?.reduce((sum, log) => sum + (log.cost_brl || 0), 0) || 0
    
    // Cache hit rate calculation
    const cachedRequests = usageLogs?.filter(log => log.was_cached).length || 0
    const cacheHitRate = totalRequests > 0 ? (cachedRequests / totalRequests) * 100 : 0

    // Average latency
    const totalLatency = usageLogs?.reduce((sum, log) => sum + (log.latency_ms || 0), 0) || 0
    const averageLatencyMs = totalRequests > 0 ? Math.round(totalLatency / totalRequests) : 0

    // Active clients
    const activeClients = new Set(usageLogs?.map(log => log.client_id)).size

    // Error rate
    const errors = usageLogs?.filter(log => log.error_message).length || 0
    const errorRate = totalRequests > 0 ? (errors / totalRequests) * 100 : 0

    // Top clients
    const clientUsage: Record<string, { requests: number; costBRL: number }> = {}
    
    for (const log of usageLogs || []) {
      if (!clientUsage[log.client_id]) {
        clientUsage[log.client_id] = { requests: 0, costBRL: 0 }
      }
      clientUsage[log.client_id].requests++
      clientUsage[log.client_id].costBRL += log.cost_brl || 0
    }

    // Fetch client names
    const clientIds = Object.keys(clientUsage)
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name')
      .in('id', clientIds)

    const clientMap = Object.fromEntries(
      (clients || []).map(c => [c.id, c.name])
    )

    const topClients = Object.entries(clientUsage)
      .map(([clientId, usage]) => ({
        clientId,
        clientName: clientMap[clientId] || 'Unknown',
        requests: usage.requests,
        costBRL: usage.costBRL,
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10)

    // Provider usage
    const providerUsage: Record<string, number> = {}
    
    for (const log of usageLogs || []) {
      const provider = log.provider || 'unknown'
      providerUsage[provider] = (providerUsage[provider] || 0) + 1
    }

    const providerUsageArray = Object.entries(providerUsage).map(([provider, requests]) => ({
      provider,
      requests,
      percentage: totalRequests > 0 ? (requests / totalRequests) * 100 : 0,
    }))

    return NextResponse.json({
      totalRequests,
      totalCostBRL,
      cacheHitRate,
      averageLatencyMs,
      activeClients,
      errorRate,
      topClients,
      providerUsage: providerUsageArray,
    })
  } catch (error: any) {
    console.error('Error fetching AI Gateway metrics:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}

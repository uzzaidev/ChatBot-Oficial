/**
 * AI GATEWAY - USAGE TRACKING
 *
 * Logs AI usage to gateway_usage_logs table
 * Updates budget usage and cache performance metrics
 */

import { createServerClient } from '@/lib/supabase-server'
import { convertUSDtoBRL, getExchangeRate } from '@/lib/currency'

// =====================================================
// TYPES
// =====================================================

export interface UsageLogParams {
  clientId: string
  conversationId?: string
  phone: string
  provider: string
  modelName: string
  inputTokens: number
  outputTokens: number
  cachedTokens?: number
  latencyMs: number
  wasCached: boolean
  wasFallback: boolean
  fallbackReason?: string
  requestId?: string
  metadata?: Record<string, any>
}

// =====================================================
// MAIN FUNCTION: Log Gateway Usage
// =====================================================

/**
 * Log AI usage to gateway_usage_logs table
 *
 * Steps:
 * 1. Get model pricing from ai_models_registry
 * 2. Calculate cost in USD
 * 3. Convert to BRL
 * 4. Insert log to gateway_usage_logs
 * 5. Update client budget usage
 * 6. Update cache performance metrics (if cached)
 */
export const logGatewayUsage = async (params: UsageLogParams): Promise<void> => {
  const {
    clientId,
    conversationId,
    phone,
    provider,
    modelName,
    inputTokens,
    outputTokens,
    cachedTokens = 0,
    latencyMs,
    wasCached,
    wasFallback,
    fallbackReason,
    requestId,
    metadata = {},
  } = params

  try {
    const supabase = createServerClient()

    // 1. Get model pricing from registry
    const { data: modelData, error: modelError } = await supabase
      .from('ai_models_registry')
      .select('id, input_price_per_million, output_price_per_million, cached_input_price_per_million')
      .eq('provider', provider)
      .eq('model_name', modelName)
      .single()

    if (modelError || !modelData) {
      console.error('[Usage Tracking] Model not found in registry:', provider, modelName)
      // Continue without pricing data
    }

    // 2. Calculate cost in USD
    const inputCostUSD = modelData
      ? (inputTokens / 1_000_000) * modelData.input_price_per_million
      : 0

    const outputCostUSD = modelData
      ? (outputTokens / 1_000_000) * modelData.output_price_per_million
      : 0

    // If tokens were cached, use cached pricing (Anthropic models)
    const cachedCostUSD =
      modelData?.cached_input_price_per_million && cachedTokens > 0
        ? (cachedTokens / 1_000_000) * modelData.cached_input_price_per_million
        : 0

    const totalCostUSD = inputCostUSD + outputCostUSD - cachedCostUSD

    // 3. Convert to BRL
    const usdToBrlRate = await getExchangeRate('USD', 'BRL')
    const totalCostBRL = await convertUSDtoBRL(totalCostUSD)

    // 4. Insert log to gateway_usage_logs
    const { error: logError } = await supabase.from('gateway_usage_logs').insert({
      client_id: clientId,
      conversation_id: conversationId,
      phone,
      request_id: requestId,
      model_registry_id: modelData?.id,
      provider,
      model_name: modelName,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cached_tokens: cachedTokens,
      total_tokens: inputTokens + outputTokens,
      latency_ms: latencyMs,
      was_cached: wasCached,
      was_fallback: wasFallback,
      fallback_reason: fallbackReason,
      cost_usd: totalCostUSD,
      cost_brl: totalCostBRL,
      usd_to_brl_rate: usdToBrlRate,
      metadata,
    })

    if (logError) {
      console.error('[Usage Tracking] Error inserting log:', logError)
      return
    }

    // 5. Update client budget usage
    await updateBudgetUsage(clientId, inputTokens + outputTokens, totalCostBRL)

    // 6. Update cache performance (if applicable)
    if (wasCached) {
      await updateCachePerformance(clientId, {
        tokensSaved: cachedTokens,
        costSavedUSD: cachedCostUSD,
        costSavedBRL: await convertUSDtoBRL(cachedCostUSD),
        latencyMs,
      })
    }

    console.log(`[Usage Tracking] Logged usage: ${inputTokens + outputTokens} tokens, R$ ${totalCostBRL.toFixed(4)}`)
  } catch (error) {
    console.error('[Usage Tracking] Error logging gateway usage:', error)
  }
}

// =====================================================
// BUDGET MANAGEMENT
// =====================================================

/**
 * Update client budget usage
 */
const updateBudgetUsage = async (
  clientId: string,
  tokens: number,
  costBRL: number
): Promise<void> => {
  try {
    const supabase = createServerClient()

    // Get client budget config
    const { data: budget, error: budgetError } = await supabase
      .from('client_budgets')
      .select('budget_type')
      .eq('client_id', clientId)
      .single()

    if (budgetError || !budget) {
      // No budget configured for this client
      return
    }

    // Determine amount to increment based on budget type
    let incrementAmount = 0

    if (budget.budget_type === 'tokens') {
      incrementAmount = tokens
    } else if (budget.budget_type === 'brl') {
      incrementAmount = costBRL
    } else if (budget.budget_type === 'usd') {
      const rate = await getExchangeRate('BRL', 'USD')
      incrementAmount = costBRL * rate
    }

    // Increment budget usage (using helper function from migration)
    const { error: incrementError } = await supabase.rpc('increment_budget_usage', {
      p_client_id: clientId,
      p_amount: incrementAmount,
    })

    if (incrementError) {
      console.error('[Budget] Error incrementing usage:', incrementError)
    }
  } catch (error) {
    console.error('[Budget] Error updating budget usage:', error)
  }
}

// =====================================================
// CACHE PERFORMANCE TRACKING
// =====================================================

/**
 * Update cache performance metrics
 */
const updateCachePerformance = async (
  clientId: string,
  stats: {
    tokensSaved: number
    costSavedUSD: number
    costSavedBRL: number
    latencyMs: number
  }
): Promise<void> => {
  try {
    const supabase = createServerClient()

    const now = new Date()
    const date = now.toISOString().split('T')[0] // YYYY-MM-DD
    const hour = now.getHours()

    // Upsert cache performance (hourly aggregation)
    const { error } = await supabase
      .from('gateway_cache_performance')
      .upsert(
        {
          client_id: clientId,
          date,
          hour,
          total_requests: 1,
          cache_hits: 1,
          cache_misses: 0,
          tokens_saved: stats.tokensSaved,
          cost_saved_usd: stats.costSavedUSD,
          cost_saved_brl: stats.costSavedBRL,
          avg_latency_cached_ms: stats.latencyMs,
        },
        {
          onConflict: 'client_id,date,hour',
          // Increment counters on conflict
        }
      )

    if (error) {
      console.error('[Cache Performance] Error updating metrics:', error)
    }
  } catch (error) {
    console.error('[Cache Performance] Error:', error)
  }
}

// =====================================================
// ANALYTICS HELPERS
// =====================================================

/**
 * Get usage summary for a date range
 */
export const getUsageSummary = async (
  clientId: string,
  startDate: string,
  endDate: string
) => {
  try {
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('gateway_usage_logs')
      .select('*')
      .eq('client_id', clientId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    if (error) {
      console.error('[Analytics] Error fetching usage summary:', error)
      return null
    }

    // Aggregate data
    const totalRequests = data.length
    const totalTokens = data.reduce((sum, log) => sum + log.total_tokens, 0)
    const totalCostBRL = data.reduce((sum, log) => sum + (log.cost_brl || 0), 0)
    const cacheHits = data.filter((log) => log.was_cached).length
    const fallbacks = data.filter((log) => log.was_fallback).length

    return {
      totalRequests,
      totalTokens,
      totalCostBRL,
      cacheHitRate: totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0,
      fallbackRate: totalRequests > 0 ? (fallbacks / totalRequests) * 100 : 0,
      avgLatencyMs:
        data.reduce((sum, log) => sum + (log.latency_ms || 0), 0) / totalRequests,
    }
  } catch (error) {
    console.error('[Analytics] Error:', error)
    return null
  }
}

/**
 * Get usage by provider
 */
export const getUsageByProvider = async (
  clientId: string,
  startDate: string,
  endDate: string
) => {
  try {
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('gateway_usage_logs')
      .select('provider, total_tokens, cost_brl')
      .eq('client_id', clientId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    if (error) {
      console.error('[Analytics] Error fetching provider usage:', error)
      return []
    }

    // Group by provider
    const providerStats = data.reduce(
      (acc, log) => {
        if (!acc[log.provider]) {
          acc[log.provider] = { tokens: 0, cost: 0, requests: 0 }
        }
        acc[log.provider].tokens += log.total_tokens
        acc[log.provider].cost += log.cost_brl || 0
        acc[log.provider].requests += 1
        return acc
      },
      {} as Record<string, { tokens: number; cost: number; requests: number }>
    )

    return Object.entries(providerStats).map(([provider, stats]) => ({
      provider,
      ...stats,
    }))
  } catch (error) {
    console.error('[Analytics] Error:', error)
    return []
  }
}

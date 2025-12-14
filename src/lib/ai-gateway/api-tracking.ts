/**
 * AI GATEWAY - UNIFIED API TRACKING
 *
 * Logs usage for ALL API types:
 * - Chat completions (tokens)
 * - Whisper (audio transcription in minutes)
 * - Vision (image analysis)
 * - Embeddings (vector generation)
 * - Image generation (future)
 *
 * Multi-dimensional budget tracking per API type
 */

import { createServerClient } from '@/lib/supabase-server'
import { convertUSDtoBRL, getExchangeRate } from '@/lib/currency'
import { trackUnifiedUsage } from '@/lib/unified-tracking'

// =====================================================
// TYPES
// =====================================================

export type APIType = 'chat' | 'whisper' | 'vision' | 'embeddings' | 'image-gen'

export interface APIUsageParams {
  // Common fields
  clientId: string
  conversationId?: string
  phone?: string
  apiType: APIType
  provider: string
  modelName: string

  // Token-based APIs (chat, embeddings)
  inputTokens?: number
  outputTokens?: number
  cachedTokens?: number

  // Unit-based APIs
  inputUnits?: number // Whisper: seconds of audio, Embeddings: number of texts
  outputUnits?: number // Vision: number of images analyzed, Image-gen: images created

  // Performance tracking
  latencyMs: number
  wasCached?: boolean
  wasFallback?: boolean
  fallbackReason?: string
  requestId?: string
  metadata?: Record<string, any>
}

// =====================================================
// PRICING CONSTANTS (Updated Dec 2025)
// =====================================================

/**
 * OpenAI API Pricing (USD)
 * Source: https://openai.com/api/pricing/
 */
const OPENAI_PRICING = {
  // Chat models (per 1M tokens)
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },

  // Whisper (per minute of audio)
  'whisper-1': { perMinute: 0.006 },

  // Vision (per image)
  'gpt-4o-vision': { perImage: 0.01275 }, // 1024x1024 detail=high
  'gpt-4-vision': { perImage: 0.01275 },

  // Embeddings (per 1M tokens)
  'text-embedding-3-small': { input: 0.02, output: 0 },
  'text-embedding-3-large': { input: 0.13, output: 0 },
  'text-embedding-ada-002': { input: 0.1, output: 0 },
} as const

/**
 * Anthropic API Pricing (USD)
 * Source: https://anthropic.com/pricing
 */
const ANTHROPIC_PRICING = {
  'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0, cachedInput: 0.3 },
  'claude-3-5-haiku-20241022': { input: 0.8, output: 4.0, cachedInput: 0.08 },
  'claude-3-opus': { input: 15.0, output: 75.0, cachedInput: 1.5 },
} as const

/**
 * Groq API Pricing (USD)
 * Source: https://groq.com/pricing/
 */
const GROQ_PRICING = {
  'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
  'llama-3.1-70b-versatile': { input: 0.59, output: 0.79 },
  'mixtral-8x7b-32768': { input: 0.24, output: 0.24 },
} as const

/**
 * Google Gemini Pricing (USD)
 * Source: https://ai.google.dev/pricing
 */
const GOOGLE_PRICING = {
  'gemini-2.0-flash-exp': { input: 0.0, output: 0.0 }, // Free preview
  'gemini-1.5-pro': { input: 1.25, output: 5.0 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },
} as const

// =====================================================
// MAIN FUNCTION: Log API Usage
// =====================================================

/**
 * Unified API usage logging for ALL API types
 *
 * Steps:
 * 1. Calculate cost in USD based on API type
 * 2. Convert to BRL
 * 3. Insert log to gateway_usage_logs
 * 4. Increment multi-dimensional budget
 * 5. Check budget limits (auto-pause if exceeded)
 */
export const logAPIUsage = async (params: APIUsageParams): Promise<void> => {
  const {
    clientId,
    conversationId,
    phone,
    apiType,
    provider,
    modelName,
    inputTokens = 0,
    outputTokens = 0,
    cachedTokens = 0,
    inputUnits = 0,
    outputUnits = 0,
    latencyMs,
    wasCached = false,
    wasFallback = false,
    fallbackReason,
    requestId,
    metadata = {},
  } = params

  try {
    const supabase = createServerClient()

    // 1. Calculate cost in USD based on API type
    const costUSD = calculateAPICost({
      apiType,
      provider,
      modelName,
      inputTokens,
      outputTokens,
      cachedTokens,
      inputUnits,
      outputUnits,
    })

    // 2. Convert to BRL
    const usdToBrlRate = await getExchangeRate('USD', 'BRL')
    const costBRL = await convertUSDtoBRL(costUSD)

    // 3. Insert log to gateway_usage_logs
    const { error: logError } = await supabase.from('gateway_usage_logs').insert({
      client_id: clientId,
      conversation_id: conversationId,
      phone,
      request_id: requestId,
      api_type: apiType,
      provider,
      model_name: modelName,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cached_tokens: cachedTokens,
      total_tokens: inputTokens + outputTokens,
      input_units: inputUnits,
      output_units: outputUnits,
      latency_ms: latencyMs,
      was_cached: wasCached,
      was_fallback: wasFallback,
      fallback_reason: fallbackReason,
      cost_usd: costUSD,
      cost_brl: costBRL,
      usd_to_brl_rate: usdToBrlRate,
      metadata,
    })

    if (logError) {
      console.error('[API Tracking] Error inserting log:', logError)
      return
    }

    // 4. Track unified usage (modular budget: tokens + BRL)
    await trackUnifiedUsage({
      clientId,
      conversationId,
      phone: phone || 'system',
      apiType,
      provider: provider as 'openai' | 'groq' | 'anthropic' | 'google',
      modelName,
      inputTokens: apiType === 'chat' || apiType === 'embeddings' ? inputTokens : undefined,
      outputTokens: apiType === 'chat' ? outputTokens : undefined,
      cachedTokens: apiType === 'chat' ? cachedTokens : undefined,
      seconds: apiType === 'whisper' ? inputUnits : undefined,
      images: apiType === 'vision' ? outputUnits : undefined,
      latencyMs,
      wasCached,
      wasFallback,
      fallbackReason,
      requestId,
      costUSD,
      metadata,
    })

    // 5. Check budget limits (auto-pause handled by database function)
    const budgetAvailable = await checkBudgetAvailable(clientId, apiType)

    if (!budgetAvailable) {
      console.warn(`[API Tracking] Budget limit reached for client ${clientId}, API: ${apiType}`)
    }

    console.log(
      `[API Tracking] Logged ${apiType} usage: ${formatUsageAmount(params)}, R$ ${costBRL.toFixed(4)}`
    )
  } catch (error) {
    console.error('[API Tracking] Error logging API usage:', error)
  }
}

// =====================================================
// COST CALCULATION
// =====================================================

/**
 * Calculate cost in USD based on API type and provider pricing
 */
export const calculateAPICost = (params: {
  apiType: APIType
  provider: string
  modelName: string
  inputTokens: number
  outputTokens: number
  cachedTokens: number
  inputUnits: number
  outputUnits: number
}): number => {
  const { apiType, provider, modelName, inputTokens, outputTokens, cachedTokens, inputUnits, outputUnits } =
    params

  switch (apiType) {
    case 'chat':
      return calculateChatCost(provider, modelName, inputTokens, outputTokens, cachedTokens)

    case 'whisper':
      return calculateWhisperCost(inputUnits)

    case 'vision':
      return calculateVisionCost(provider, modelName, outputUnits)

    case 'embeddings':
      return calculateEmbeddingsCost(provider, modelName, inputTokens)

    case 'image-gen':
      return calculateImageGenCost(provider, modelName, outputUnits)

    default:
      console.warn(`[API Tracking] Unknown API type: ${apiType}`)
      return 0
  }
}

/**
 * Calculate chat completion cost (token-based)
 */
const calculateChatCost = (
  provider: string,
  modelName: string,
  inputTokens: number,
  outputTokens: number,
  cachedTokens: number
): number => {
  let pricing: { input: number; output: number; cachedInput?: number } | undefined

  switch (provider) {
    case 'openai':
      pricing = OPENAI_PRICING[modelName as keyof typeof OPENAI_PRICING] as any
      break
    case 'anthropic':
      pricing = ANTHROPIC_PRICING[modelName as keyof typeof ANTHROPIC_PRICING] as any
      break
    case 'groq':
      pricing = GROQ_PRICING[modelName as keyof typeof GROQ_PRICING] as any
      break
    case 'google':
      pricing = GOOGLE_PRICING[modelName as keyof typeof GOOGLE_PRICING] as any
      break
  }

  if (!pricing) {
    console.warn(`[API Tracking] No pricing for ${provider}/${modelName}`)
    return 0
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.input
  const outputCost = (outputTokens / 1_000_000) * pricing.output

  // Anthropic cached pricing
  const cachedCost =
    pricing.cachedInput && cachedTokens > 0
      ? (cachedTokens / 1_000_000) * pricing.cachedInput
      : 0

  return inputCost + outputCost - cachedCost
}

/**
 * Calculate Whisper transcription cost (per minute)
 */
const calculateWhisperCost = (seconds: number): number => {
  const minutes = seconds / 60
  return minutes * (OPENAI_PRICING['whisper-1'].perMinute || 0.006)
}

/**
 * Calculate vision analysis cost (per image)
 */
const calculateVisionCost = (provider: string, modelName: string, images: number): number => {
  if (provider === 'openai') {
    // GPT-4o Vision pricing
    return images * (OPENAI_PRICING['gpt-4o-vision']?.perImage || 0.01275)
  }

  // Google Gemini Vision is free
  if (provider === 'google') {
    return 0
  }

  return 0
}

/**
 * Calculate embeddings cost (per token)
 */
const calculateEmbeddingsCost = (provider: string, modelName: string, tokens: number): number => {
  if (provider === 'openai') {
    const pricing = OPENAI_PRICING[modelName as keyof typeof OPENAI_PRICING] as any
    if (pricing?.input) {
      return (tokens / 1_000_000) * pricing.input
    }
  }

  return 0
}

/**
 * Calculate image generation cost (per image)
 */
const calculateImageGenCost = (provider: string, modelName: string, images: number): number => {
  // DALL-E 3: $0.040 per image (1024x1024 standard)
  if (provider === 'openai' && modelName.includes('dall-e')) {
    return images * 0.04
  }

  return 0
}

// =====================================================
// BUDGET MANAGEMENT
// =====================================================

/**
 * Check if client has budget available for API type
 */
export const checkBudgetAvailable = async (
  clientId: string,
  apiType: APIType
): Promise<boolean> => {
  try {
    const supabase = createServerClient()

    const { data, error } = await supabase.rpc('check_budget_available', {
      p_client_id: clientId,
      p_api_type: apiType,
    })

    if (error) {
      console.error('[Budget] Error checking budget:', error)
      return true // Allow on error (graceful degradation)
    }

    return data === true
  } catch (error) {
    console.error('[Budget] Error:', error)
    return true
  }
}

// =====================================================
// HELPERS
// =====================================================

/**
 * Format usage amount for logging
 */
const formatUsageAmount = (params: APIUsageParams): string => {
  switch (params.apiType) {
    case 'chat':
      return `${params.inputTokens! + params.outputTokens!} tokens`
    case 'whisper':
      return `${Math.ceil(params.inputUnits! / 60)} min audio`
    case 'vision':
      return `${params.outputUnits} images`
    case 'embeddings':
      return `${params.inputTokens} tokens`
    case 'image-gen':
      return `${params.outputUnits} images`
    default:
      return 'unknown'
  }
}

// =====================================================
// ANALYTICS HELPERS
// =====================================================

/**
 * Get usage summary by API type
 */
export const getUsageSummaryByAPI = async (
  clientId: string,
  startDate: string,
  endDate: string
) => {
  try {
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('gateway_usage_logs')
      .select('api_type, total_tokens, input_units, output_units, cost_brl')
      .eq('client_id', clientId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    if (error) {
      console.error('[Analytics] Error fetching API usage:', error)
      return []
    }

    // Group by API type
    const apiStats = data.reduce(
      (acc, log) => {
        if (!acc[log.api_type]) {
          acc[log.api_type] = {
            requests: 0,
            tokens: 0,
            units: 0,
            cost: 0,
          }
        }
        acc[log.api_type].requests += 1
        acc[log.api_type].tokens += log.total_tokens || 0
        acc[log.api_type].units += (log.input_units || 0) + (log.output_units || 0)
        acc[log.api_type].cost += log.cost_brl || 0
        return acc
      },
      {} as Record<string, { requests: number; tokens: number; units: number; cost: number }>
    )

    return Object.entries(apiStats).map(([apiType, stats]) => ({
      apiType,
      ...stats,
    }))
  } catch (error) {
    console.error('[Analytics] Error:', error)
    return []
  }
}

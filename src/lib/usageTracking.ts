import { query } from './postgres'

/**
 * Usage tracking utility for OpenAI and Groq API calls
 *
 * This module provides functions to log API usage to the database
 * for analytics and billing purposes.
 */

interface LogUsageParams {
  clientId: string
  conversationId?: string
  phone: string
  source: 'openai' | 'groq' | 'whisper' | 'meta'
  model?: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  metadata?: Record<string, unknown>
}

/**
 * Fetch pricing from database for a specific model
 * Returns default pricing if not found in database
 */
const getPricingFromDatabase = async (
  clientId: string,
  provider: string,
  model: string
): Promise<{ promptPrice: number; completionPrice: number; unit: string }> => {
  try {
    const result = await query(
      `SELECT prompt_price, completion_price, unit
       FROM pricing_config
       WHERE client_id = $1 AND provider = $2 AND model = $3
       LIMIT 1`,
      [clientId, provider, model]
    )

    if (result.rows.length > 0) {
      return {
        promptPrice: parseFloat(result.rows[0].prompt_price),
        completionPrice: parseFloat(result.rows[0].completion_price),
        unit: result.rows[0].unit,
      }
    }
  } catch (error) {
  }

  // Return default pricing if not found in database
  return getDefaultPricing(provider, model)
}

/**
 * Get default pricing when database lookup fails
 *
 * Default Pricing (fallback):
 * - OpenAI GPT-4: $0.03/1K prompt, $0.06/1K completion
 * - OpenAI GPT-4 Turbo: $0.01/1K prompt, $0.03/1K completion
 * - OpenAI GPT-4o: $0.005/1K prompt, $0.015/1K completion
 * - OpenAI GPT-3.5-turbo: $0.0015/1K prompt, $0.002/1K completion
 * - Groq: Free (rate limited)
 * - Whisper: $0.006/minute
 */
const getDefaultPricing = (
  provider: string,
  model: string
): { promptPrice: number; completionPrice: number; unit: string } => {
  const modelLower = model.toLowerCase()

  if (provider === 'openai') {
    if (modelLower.includes('gpt-4o')) {
      return { promptPrice: 0.005, completionPrice: 0.015, unit: 'per_1k_tokens' }
    } else if (modelLower.includes('gpt-4-turbo')) {
      return { promptPrice: 0.01, completionPrice: 0.03, unit: 'per_1k_tokens' }
    } else if (modelLower.includes('gpt-4')) {
      return { promptPrice: 0.03, completionPrice: 0.06, unit: 'per_1k_tokens' }
    } else if (modelLower.includes('gpt-3.5-turbo')) {
      return { promptPrice: 0.0015, completionPrice: 0.002, unit: 'per_1k_tokens' }
    }
    // Default OpenAI
    return { promptPrice: 0.0015, completionPrice: 0.002, unit: 'per_1k_tokens' }
  }

  if (provider === 'whisper') {
    return { promptPrice: 0.006, completionPrice: 0, unit: 'per_minute' }
  }

  // Groq and others are free
  return { promptPrice: 0, completionPrice: 0, unit: 'per_1k_tokens' }
}

/**
 * Calculate cost based on pricing configuration
 * Now uses database pricing when available
 */
const calculateCost = async (
  clientId: string,
  source: string,
  model: string | undefined,
  promptTokens: number,
  completionTokens: number
): Promise<number> => {
  const modelName = model || 'unknown'
  const pricing = await getPricingFromDatabase(clientId, source, modelName)

  // Calculate based on unit
  if (pricing.unit === 'per_minute') {
    // For audio (Whisper) - estimate minutes from tokens
    const estimatedMinutes = promptTokens / 1000
    return estimatedMinutes * pricing.promptPrice
  }

  // Default: per_1k_tokens
  return (
    (promptTokens / 1000) * pricing.promptPrice +
    (completionTokens / 1000) * pricing.completionPrice
  )
}

/**
 * Log API usage to database
 *
 * @param params Usage logging parameters
 */
export const logUsage = async (params: LogUsageParams): Promise<void> => {
  const {
    clientId,
    conversationId,
    phone,
    source,
    model,
    promptTokens,
    completionTokens,
    totalTokens,
    metadata,
  } = params

  try {
    const cost = await calculateCost(clientId, source, model, promptTokens, completionTokens)

    await query(
      `
      INSERT INTO usage_logs (
        client_id,
        conversation_id,
        phone,
        source,
        model,
        prompt_tokens,
        completion_tokens,
        total_tokens,
        cost_usd,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      [
        clientId,
        conversationId || null,
        phone,
        source,
        model || 'unknown',
        promptTokens,
        completionTokens,
        totalTokens,
        cost,
        metadata ? JSON.stringify(metadata) : null,
      ]
    )

  } catch (error) {
    // Don't throw error - usage tracking failure shouldn't break the flow
    console.error('[UsageTracking] Failed to log usage:', error)
  }
}

/**
 * Log OpenAI API usage from response
 * 
 * @param clientId Client ID
 * @param conversationId Optional conversation ID
 * @param phone Phone number
 * @param model Model name (e.g., 'gpt-4', 'gpt-3.5-turbo')
 * @param usage Usage object from OpenAI response
 */
export const logOpenAIUsage = async (
  clientId: string,
  conversationId: string | undefined,
  phone: string,
  model: string,
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
): Promise<void> => {
  await logUsage({
    clientId,
    conversationId,
    phone,
    source: 'openai',
    model,
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
  })
}

/**
 * Log Groq API usage from response
 * 
 * @param clientId Client ID
 * @param conversationId Optional conversation ID
 * @param phone Phone number
 * @param model Model name (e.g., 'llama-3.1-70b')
 * @param usage Usage object from Groq response
 */
export const logGroqUsage = async (
  clientId: string,
  conversationId: string | undefined,
  phone: string,
  model: string,
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    prompt_time?: number
    completion_time?: number
    total_time?: number
  }
): Promise<void> => {
  await logUsage({
    clientId,
    conversationId,
    phone,
    source: 'groq',
    model,
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
    metadata: {
      prompt_time: usage.prompt_time,
      completion_time: usage.completion_time,
      total_time: usage.total_time,
    },
  })
}

/**
 * Log Whisper API usage (audio transcription)
 * 
 * @param clientId Client ID
 * @param conversationId Optional conversation ID
 * @param phone Phone number
 * @param durationSeconds Audio duration in seconds
 * @param tokensEstimate Estimated tokens (optional)
 */
export const logWhisperUsage = async (
  clientId: string,
  conversationId: string | undefined,
  phone: string,
  durationSeconds: number,
  tokensEstimate?: number
): Promise<void> => {
  // Estimate tokens based on duration (rough estimate: 1000 tokens per minute)
  const estimatedTokens = tokensEstimate || Math.ceil((durationSeconds / 60) * 1000)

  await logUsage({
    clientId,
    conversationId,
    phone,
    source: 'openai', // Whisper é uma API da OpenAI
    model: 'whisper-1',
    promptTokens: estimatedTokens,
    completionTokens: 0,
    totalTokens: estimatedTokens,
    metadata: {
      duration_seconds: durationSeconds,
      api_type: 'whisper', // Identificar que é Whisper no metadata
    },
  })
}

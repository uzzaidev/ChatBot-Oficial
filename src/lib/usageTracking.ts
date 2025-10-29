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
 * Calculate cost based on provider and tokens
 * 
 * Pricing (updated regularly - verify current rates):
 * - OpenAI GPT-4: $0.03/1K prompt tokens, $0.06/1K completion tokens
 * - OpenAI GPT-3.5-turbo: $0.0015/1K prompt tokens, $0.002/1K completion tokens
 * - Groq: Free tier (rate limited)
 * - Whisper: $0.006/minute (estimated ~1000 tokens/minute for audio)
 */
const calculateCost = (
  source: string,
  model: string | undefined,
  promptTokens: number,
  completionTokens: number
): number => {
  // Groq is free (for now)
  if (source === 'groq') {
    return 0
  }

  // OpenAI pricing
  if (source === 'openai') {
    const modelLower = (model || '').toLowerCase()
    
    if (modelLower.includes('gpt-4')) {
      // GPT-4 pricing
      return (promptTokens / 1000) * 0.03 + (completionTokens / 1000) * 0.06
    } else if (modelLower.includes('gpt-3.5-turbo')) {
      // GPT-3.5-turbo pricing
      return (promptTokens / 1000) * 0.0015 + (completionTokens / 1000) * 0.002
    } else {
      // Default to GPT-3.5-turbo pricing
      return (promptTokens / 1000) * 0.0015 + (completionTokens / 1000) * 0.002
    }
  }

  // Whisper pricing (estimated)
  if (source === 'whisper') {
    // Whisper is charged per minute of audio
    // We estimate ~1000 tokens represent 1 minute of transcribed audio
    const estimatedMinutes = promptTokens / 1000
    return estimatedMinutes * 0.006
  }

  // Meta/WhatsApp API is typically free for messages
  if (source === 'meta') {
    return 0
  }

  return 0
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
    const cost = calculateCost(source, model, promptTokens, completionTokens)

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

    console.log(
      `[UsageTracking] Logged ${source} usage:`,
      {
        phone,
        model,
        tokens: totalTokens,
        cost: `$${cost.toFixed(6)}`,
      }
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
    source: 'whisper',
    model: 'whisper-1',
    promptTokens: estimatedTokens,
    completionTokens: 0,
    totalTokens: estimatedTokens,
    metadata: {
      duration_seconds: durationSeconds,
    },
  })
}

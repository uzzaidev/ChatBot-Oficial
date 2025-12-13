/**
 * AI GATEWAY - MAIN INTERFACE
 *
 * Unified interface for AI calls - abstracts gateway vs direct SDK
 * Supports: OpenAI, Groq, Anthropic, Google
 */

import { generateText, streamText } from 'ai'
import type { CoreMessage } from 'ai'
import { getGatewayProvider } from './providers'
import { getSharedGatewayConfig, shouldUseGateway } from './config'
import { logGatewayUsage } from './usage-tracking'

// =====================================================
// TYPES
// =====================================================

export interface AICallConfig {
  clientId: string
  clientConfig: {
    id: string
    name: string
    slug: string
    primaryModelProvider: string
    openaiModel?: string
    groqModel?: string
    systemPrompt?: string
  }
  messages: CoreMessage[]
  tools?: Record<string, any>
  settings?: {
    temperature?: number
    maxTokens?: number
    topP?: number
    frequencyPenalty?: number
    presencePenalty?: number
  }
  stream?: boolean
  // Optional fields for usage tracking
  conversationId?: string
  phone?: string
  skipUsageLogging?: boolean // Allow disabling logging if needed
}

export interface AIResponse {
  text: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    cachedTokens?: number
  }
  model: string
  provider: string
  wasCached: boolean
  wasFallback: boolean
  fallbackReason?: string
  latencyMs: number
  requestId?: string
  finishReason?: string
}

// =====================================================
// MAIN FUNCTION: callAI
// =====================================================

/**
 * Main abstraction layer for AI calls
 * Routes to gateway or direct SDK based on configuration
 */
export const callAI = async (config: AICallConfig): Promise<AIResponse> => {
  const startTime = Date.now()

  try {
    // Check if gateway should be used (env var + client flag)
    const useGateway = await shouldUseGateway(config.clientId)

    if (useGateway) {
      // Get SHARED gateway configuration
      const gatewayConfig = await getSharedGatewayConfig()

      if (!gatewayConfig) {
        console.warn('[AI Gateway] Gateway enabled but no config found, using direct SDK')
        return await callAIDirectly(config, startTime)
      }

      // Route through AI Gateway
      return await callAIViaGateway(config, gatewayConfig, startTime)
    } else {
      // Route through direct SDK (legacy path)
      return await callAIDirectly(config, startTime)
    }
  } catch (error) {
    console.error('[AI Gateway] Error in callAI:', error)
    throw error
  }
}

// =====================================================
// GATEWAY PATH
// =====================================================

const callAIViaGateway = async (
  config: AICallConfig,
  gatewayConfig: any,
  startTime: number
): Promise<AIResponse> => {
  const { messages, tools, settings = {} } = config

  try {
    // Determine which model to use (from client config)
    const primaryModel = config.clientConfig.openaiModel || config.clientConfig.groqModel || 'gpt-4o-mini'
    const provider = (config.clientConfig.primaryModelProvider || 'openai') as any

    // Get provider-specific API key (NOT gateway key!)
    const providerApiKey = gatewayConfig.providerKeys[provider]

    if (!providerApiKey) {
      throw new Error(`No API key configured for provider: ${provider}`)
    }

    // Get provider instance with provider-specific key
    const providerInstance = getGatewayProvider(provider, providerApiKey)

    // Generate response using Vercel AI SDK with telemetry
    const result = await generateText({
      model: providerInstance(primaryModel),
      messages,
      tools,
      temperature: settings.temperature ?? 0.7,
      experimental_telemetry: { isEnabled: true }, // ✅ Enable telemetry
    })

    const latencyMs = Date.now() - startTime

    // ✅ Extract gateway headers
    const headers = result.response?.headers || {}
    const wasCached = headers['x-vercel-cache'] === 'HIT' || headers['x-vercel-ai-cache-status'] === 'hit'
    const actualProvider = headers['x-vercel-ai-provider'] || provider
    const actualModel = headers['x-vercel-ai-model'] || primaryModel
    const requestId = headers['x-vercel-ai-data-stream-id'] || headers['x-vercel-ai-request-id']

    const usage = result.usage as any
    const response: AIResponse = {
      text: result.text,
      usage: {
        promptTokens: usage.promptTokens || 0,
        completionTokens: usage.completionTokens || 0,
        totalTokens: usage.totalTokens || 0,
        cachedTokens: wasCached ? (usage.promptTokens || 0) : 0,
      },
      model: actualModel,
      provider: actualProvider,
      wasCached,
      wasFallback: false,
      latencyMs,
      requestId,
      finishReason: result.finishReason,
    }

    // ✅ Log usage to database (async, don't block response)
    if (!config.skipUsageLogging) {
      logGatewayUsage({
        clientId: config.clientId,
        conversationId: config.conversationId,
        phone: config.phone || 'test-call',
        provider: actualProvider,
        modelName: actualModel,
        inputTokens: response.usage.promptTokens,
        outputTokens: response.usage.completionTokens,
        cachedTokens: response.usage.cachedTokens || 0,
        latencyMs: response.latencyMs,
        wasCached: response.wasCached,
        wasFallback: false,
        requestId: response.requestId,
        metadata: {
          source: 'ai-gateway',
          fallbackReason: undefined,
        },
      }).catch((error) => {
        console.error('[AI Gateway] Failed to log usage:', error)
      })
    }

    return response
  } catch (error: any) {
    // If primary model fails and fallback chain exists, try fallback
    if (gatewayConfig.defaultFallbackChain && gatewayConfig.defaultFallbackChain.length > 0) {
      console.warn('[AI Gateway] Primary model failed, trying fallback:', error.message)
      return await callAIWithFallback(config, gatewayConfig, startTime, error.message)
    }

    throw error
  }
}

// =====================================================
// FALLBACK LOGIC
// =====================================================

const callAIWithFallback = async (
  config: AICallConfig,
  gatewayConfig: any,
  startTime: number,
  primaryError: string
): Promise<AIResponse> => {
  const { messages, tools, settings = {} } = config

  // Try each model in fallback chain
  for (const fallbackModelIdentifier of gatewayConfig.defaultFallbackChain) {
    try {
      console.log(`[AI Gateway] Trying fallback model: ${fallbackModelIdentifier}`)

      // Parse provider and model from identifier (e.g., "openai/gpt-4o-mini")
      const [provider, model] = fallbackModelIdentifier.split('/')

      // Get provider-specific API key (NOT gateway key!)
      const providerApiKey = gatewayConfig.providerKeys[provider]

      if (!providerApiKey) {
        console.warn(`[AI Gateway] No API key for fallback provider: ${provider}`)
        continue // Skip to next fallback
      }

      // Get provider instance with provider-specific key
      const providerInstance = getGatewayProvider(provider, providerApiKey)

      // Generate response
      const result = await generateText({
        model: providerInstance(model),
        messages,
        tools,
        temperature: settings.temperature ?? 0.7,
      })

      const latencyMs = Date.now() - startTime
      const wasCached = result.response?.headers?.['x-vercel-ai-cache-status'] === 'hit'
      const usage = result.usage as any

      const response: AIResponse = {
        text: result.text,
        usage: {
          promptTokens: usage.promptTokens || 0,
          completionTokens: usage.completionTokens || 0,
          totalTokens: usage.totalTokens || 0,
          cachedTokens: wasCached ? (usage.promptTokens || 0) : 0,
        },
        model,
        provider,
        wasCached,
        wasFallback: true,
        fallbackReason: primaryError,
        latencyMs,
        requestId: result.response?.headers?.['x-vercel-ai-request-id'],
        finishReason: result.finishReason,
      }

      // ✅ Log usage to database (async, don't block response)
      if (!config.skipUsageLogging) {
        logGatewayUsage({
          clientId: config.clientId,
          conversationId: config.conversationId,
          phone: config.phone || 'test-call',
          provider,
          modelName: model,
          inputTokens: response.usage.promptTokens,
          outputTokens: response.usage.completionTokens,
          cachedTokens: response.usage.cachedTokens || 0,
          latencyMs: response.latencyMs,
          wasCached: response.wasCached,
          wasFallback: true,
          fallbackReason: primaryError,
          requestId: response.requestId,
          metadata: {
            source: 'ai-gateway',
            primaryError,
          },
        }).catch((error) => {
          console.error('[AI Gateway] Failed to log usage:', error)
        })
      }

      return response
    } catch (fallbackError: any) {
      console.warn(
        `[AI Gateway] Fallback model ${fallbackModelIdentifier} failed:`,
        fallbackError.message
      )
      // Continue to next fallback
      continue
    }
  }

  // All fallbacks failed
  throw new Error(`All models failed. Primary: ${primaryError}`)
}

// =====================================================
// DIRECT SDK PATH (Legacy)
// =====================================================

const callAIDirectly = async (
  config: AICallConfig,
  startTime: number
): Promise<AIResponse> => {
  // Legacy path disabled - use original generateAIResponse.ts instead
  throw new Error(
    'AI Gateway disabled. Enable ENABLE_AI_GATEWAY=true and configure at /dashboard/ai-gateway/setup'
  )
}

// =====================================================
// STREAMING SUPPORT (Future)
// =====================================================

/**
 * Stream AI response (for real-time chat interfaces)
 * TODO: Implement streaming support in Phase 3
 */
export const streamAI = async (config: AICallConfig) => {
  // Not implemented yet - return regular call for now
  return callAI(config)
}

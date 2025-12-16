/**
 * AI GATEWAY - PROVIDER FACTORY
 *
 * Factory functions for Vercel AI SDK providers
 * Supports: OpenAI, Anthropic, Groq, Google
 */

import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGroq } from '@ai-sdk/groq'
import { createGoogleGenerativeAI } from '@ai-sdk/google'

// =====================================================
// CONSTANTS
// =====================================================

/**
 * Vercel AI Gateway base URL
 * Routes requests through Vercel's gateway for cache, telemetry, and fallback
 */
const VERCEL_GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh/v1'

// =====================================================
// TYPES
// =====================================================

export type SupportedProvider = 'openai' | 'anthropic' | 'groq' | 'google'

// =====================================================
// PROVIDER FACTORY
// =====================================================

/**
 * Get provider instance for Vercel AI SDK (routes through Vercel AI Gateway)
 *
 * @param provider - Provider name ('openai', 'anthropic', 'groq', 'google')
 * @param apiKey - Provider-specific API key (sk-proj-..., gsk_..., sk-ant-..., etc.)
 * @returns Provider instance that can be called with model name
 *
 * @example
 * const provider = getGatewayProvider('openai', 'sk-proj-xxxxx')
 * const model = provider('openai/gpt-4o')  // Note: format is "provider/model"
 * const result = await generateText({ model, messages })
 *
 * IMPORTANTE: BYOK (Bring Your Own Keys) - Usa suas próprias provider keys
 * mas roteia através do Vercel AI Gateway para cache, telemetry e fallback.
 * - OpenAI: sk-proj-...
 * - Groq: gsk_...
 * - Anthropic: sk-ant-...
 * - Google: AIza...
 *
 * Requests → https://ai-gateway.vercel.sh/v1 → Provider API (with YOUR key)
 */
export const getGatewayProvider = (provider: SupportedProvider, apiKey: string) => {
  // BYOK: Routes through Vercel AI Gateway using provider-specific keys
  // Benefits: Cache (60-70% hit rate), telemetry, automatic fallback

  switch (provider) {
    case 'openai':
      return createOpenAI({
        apiKey, // sk-proj-... (YOUR OpenAI key)
        baseURL: VERCEL_GATEWAY_BASE_URL, // Routes through Vercel
      })

    case 'anthropic':
      return createAnthropic({
        apiKey, // sk-ant-... (YOUR Anthropic key)
        baseURL: VERCEL_GATEWAY_BASE_URL,
      })

    case 'groq':
      return createGroq({
        apiKey, // gsk_... (YOUR Groq key)
        baseURL: VERCEL_GATEWAY_BASE_URL,
      })

    case 'google':
      return createGoogleGenerativeAI({
        apiKey, // AIza... (YOUR Google key)
        baseURL: VERCEL_GATEWAY_BASE_URL,
      })

    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}

/**
 * Get direct SDK provider (without gateway)
 * Used when gateway is disabled
 */
export const getDirectProvider = (provider: SupportedProvider, apiKey: string) => {
  switch (provider) {
    case 'openai':
      return createOpenAI({ apiKey })

    case 'anthropic':
      return createAnthropic({ apiKey })

    case 'groq':
      return createGroq({ apiKey })

    case 'google':
      return createGoogleGenerativeAI({ apiKey })

    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}

// =====================================================
// PROVIDER METADATA
// =====================================================

/**
 * Get provider metadata (capabilities, default settings)
 */
export const getProviderMetadata = (provider: SupportedProvider) => {
  const metadata = {
    openai: {
      name: 'OpenAI',
      defaultModel: 'gpt-4o-mini',
      supportsVision: true,
      supportsTools: true,
      supportsStreaming: true,
      supportsCaching: false,
      maxContextWindow: 128000,
      maxOutputTokens: 16384,
    },
    anthropic: {
      name: 'Anthropic',
      defaultModel: 'claude-3-5-sonnet-20241022',
      supportsVision: true,
      supportsTools: true,
      supportsStreaming: true,
      supportsCaching: true, // Prompt caching
      maxContextWindow: 200000,
      maxOutputTokens: 8192,
    },
    groq: {
      name: 'Groq',
      defaultModel: 'llama-3.3-70b-versatile',
      supportsVision: false,
      supportsTools: true,
      supportsStreaming: true,
      supportsCaching: false,
      maxContextWindow: 131072,
      maxOutputTokens: 32768,
    },
    google: {
      name: 'Google',
      defaultModel: 'gemini-2.0-flash-exp',
      supportsVision: true,
      supportsTools: true,
      supportsStreaming: true,
      supportsCaching: false,
      maxContextWindow: 1000000,
      maxOutputTokens: 8192,
    },
  }

  return metadata[provider]
}

// =====================================================
// PROVIDER VALIDATION
// =====================================================

/**
 * Validate if a provider is supported
 */
export const isValidProvider = (provider: string): provider is SupportedProvider => {
  return ['openai', 'anthropic', 'groq', 'google'].includes(provider)
}

/**
 * Get list of all supported providers
 */
export const getSupportedProviders = (): SupportedProvider[] => {
  return ['openai', 'anthropic', 'groq', 'google']
}

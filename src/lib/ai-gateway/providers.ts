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
import { createGateway } from 'ai'

// =====================================================
// TYPES
// =====================================================

export type SupportedProvider = 'openai' | 'anthropic' | 'groq' | 'google'

// =====================================================
// PROVIDER FACTORY
// =====================================================

/**
 * Create Vercel AI Gateway instance
 *
 * @param gatewayApiKey - Vercel AI Gateway API key (vck_...)
 * @returns Gateway instance for use with generateText
 *
 * @example
 * const gateway = createGatewayInstance('vck_...')
 * const result = await generateText({
 *   model: gateway('openai/gpt-4o'),
 *   messages: [...]
 * })
 *
 * Benefits:
 * - ✅ Automatic cache (60-70% hit rate)
 * - ✅ Dashboard visibility
 * - ✅ Automatic fallback
 * - ✅ Provider keys managed in Vercel dashboard
 */
export const createGatewayInstance = (gatewayApiKey: string) => {
  return createGateway({
    apiKey: gatewayApiKey,
  })
}

/**
 * Get provider instance for DIRECT API calls (without gateway)
 * Used when gateway is disabled or as fallback
 */
export const getGatewayProvider = (provider: SupportedProvider, apiKey: string) => {
  switch (provider) {
    case 'openai':
      return createOpenAI({
        apiKey, // sk-proj-... OpenAI key
      })

    case 'anthropic':
      return createAnthropic({
        apiKey, // sk-ant-... Anthropic key
      })

    case 'groq':
      return createGroq({
        apiKey, // gsk_... Groq key
      })

    case 'google':
      return createGoogleGenerativeAI({
        apiKey, // AIza... Google key
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

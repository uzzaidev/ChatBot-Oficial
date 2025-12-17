// ============================================================================
// ⚠️ LEGACY CODE - NO LONGER USED - DO NOT USE
// ============================================================================
//
// This file has been REPLACED by AI Gateway (src/lib/ai-gateway/index.ts)
//
// ✅ MIGRATION COMPLETED:
// - classifyIntent.ts: Now uses callAI() from AI Gateway
// - test-model endpoint: Now uses callAI() from AI Gateway
//
// 🚀 NEW ARCHITECTURE:
// - All Groq calls now go through Vercel AI Gateway with shared configuration
// - Benefits: Prompt caching (60-70% savings), automatic fallback, unified tracking
// - Uses gateway_usage_logs for unified tracking instead of legacy tables
//
// 📝 WHY COMMENTED OUT:
// - Per-client API keys replaced by shared Gateway configuration
// - Direct SDK calls replaced by Gateway proxy with caching
// - Tracking migrated to unified gateway_usage_logs table
//
// 🗓️ COMMENTED OUT: 2024-12-17 (FASE 6 - Gateway Migration Complete)
//
// Kept for reference only. DO NOT USE.
// ============================================================================

/*
import Groq from 'groq-sdk'
import { AIResponse, ChatMessage } from './types'

const getRequiredEnvVariable = (key: string): string => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

let groqClient: Groq | null = null

export const getGroqClient = (apiKey?: string): Groq => {
  if (apiKey) {
    return new Groq({ apiKey })
  }

  if (groqClient) {
    return groqClient
  }

  const envApiKey = getRequiredEnvVariable('GROQ_API_KEY')

  groqClient = new Groq({
    apiKey: envApiKey,
  })

  return groqClient
}

const extractToolCallsFromResponse = (choice: any): AIResponse['toolCalls'] => {
  const toolCalls = choice.message?.tool_calls

  if (!toolCalls || toolCalls.length === 0) {
    return undefined
  }

  return toolCalls.map((call: any) => ({
    id: call.id,
    type: call.type,
    function: {
      name: call.function.name,
      arguments: call.function.arguments,
    },
  }))
}

export const generateChatCompletion = async (
  messages: ChatMessage[],
  tools?: any[],
  apiKey?: string,
  settings?: {
    temperature?: number
    max_tokens?: number
    model?: string
  }
): Promise<AIResponse> => {
  try {
    const client = getGroqClient(apiKey)

    const groqMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }))

    const completionParams: any = {
      model: settings?.model || 'llama-3.3-70b-versatile',
      messages: groqMessages,
      temperature: settings?.temperature ?? 0.7,
      max_tokens: settings?.max_tokens ?? 2048,
    }

    if (tools && tools.length > 0) {
      completionParams.tools = tools
      completionParams.tool_choice = 'auto'
    }

    const completion = await client.chat.completions.create(completionParams)

    const choice = completion.choices[0]
    if (!choice) {
      throw new Error('No completion choice returned from Groq')
    }

    const content = choice.message?.content || ''
    const toolCalls = extractToolCallsFromResponse(choice)
    const finished = choice.finish_reason === 'stop' || choice.finish_reason === 'tool_calls'

    const usage = completion.usage
      ? {
          prompt_tokens: completion.usage.prompt_tokens || 0,
          completion_tokens: completion.usage.completion_tokens || 0,
          total_tokens: completion.usage.total_tokens || 0,
        }
      : undefined


    return {
      content,
      toolCalls,
      finished,
      usage,
      model: completionParams.model,
      provider: 'groq',
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to generate chat completion with Groq: ${errorMessage}`)
  }
}
*/

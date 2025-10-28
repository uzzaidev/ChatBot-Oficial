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

/**
 * 🔐 Obtém cliente Groq com key dinâmica ou fallback para env
 *
 * @param apiKey - API key opcional (do config do cliente)
 * @returns Cliente Groq configurado
 */
export const getGroqClient = (apiKey?: string): Groq => {
  // Se apiKey fornecida, sempre criar novo client (não cachear)
  if (apiKey) {
    return new Groq({ apiKey })
  }

  // Fallback: usar client cacheado ou criar novo do env
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

/**
 * 🔐 Gera resposta com Groq usando key dinâmica
 *
 * @param messages - Mensagens do chat
 * @param tools - Ferramentas disponíveis
 * @param apiKey - API key opcional (do config do cliente)
 * @returns Resposta da IA
 */
export const generateChatCompletion = async (
  messages: ChatMessage[],
  tools?: any[],
  apiKey?: string // 🔐 Novo parâmetro opcional
): Promise<AIResponse> => {
  try {
    const client = getGroqClient(apiKey) // Usa key dinâmica se fornecida

    const groqMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }))

    const completionParams: any = {
      model: 'llama-3.3-70b-versatile',
      messages: groqMessages,
      temperature: 0.7,
      max_tokens: 2048,
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

    return {
      content,
      toolCalls,
      finished,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to generate chat completion with Groq: ${errorMessage}`)
  }
}

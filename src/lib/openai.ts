import OpenAI from 'openai'
import { AIResponse, ChatMessage } from './types'
import { logAPIUsage } from './ai-gateway/api-tracking'
import { getSharedGatewayConfig } from './ai-gateway/config'

const getRequiredEnvVariable = (key: string): string => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

let openaiClient: OpenAI | null = null

const getSharedOpenAIApiKey = async (): Promise<string> => {
  const sharedGatewayConfig = await getSharedGatewayConfig()
  const sharedOpenaiKey = sharedGatewayConfig?.providerKeys?.openai

  if (!sharedOpenaiKey) {
    throw new Error(
      'Shared OpenAI API key is not configured. ' +
        'Configure shared_openai_api_key in shared_gateway_config (Vault).'
    )
  }

  return sharedOpenaiKey
}

const resolveOpenAIApiKey = async (apiKey?: string): Promise<string> => {
  return apiKey || await getSharedOpenAIApiKey()
}

export const getOpenAIClient = (): OpenAI => {
  if (openaiClient) {
    return openaiClient
  }

  const apiKey = getRequiredEnvVariable('OPENAI_API_KEY')

  openaiClient = new OpenAI({
    apiKey,
  })

  return openaiClient
}

export const transcribeAudio = async (
  audioBuffer: Buffer,
  apiKey?: string,
  clientId?: string,
  phone?: string
): Promise<{
  text: string
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  model: string
  durationSeconds?: number
}> => {
  const startTime = Date.now()

  try {
    const resolvedApiKey = await resolveOpenAIApiKey(apiKey)
    const client = new OpenAI({ apiKey: resolvedApiKey })

    const uint8Array = new Uint8Array(audioBuffer)
    const blob = new Blob([uint8Array], { type: 'audio/ogg' })
    const transcriptionFile = new File([blob], 'audio.ogg', {
      type: 'audio/ogg',
    })

    const transcription = await client.audio.transcriptions.create({
      file: transcriptionFile,
      model: 'whisper-1',
      language: 'pt',
    })

    // Whisper cobra por minuto, não por token
    // Estimativa: áudio OGG tem ~1KB por segundo
    const estimatedDurationSeconds = Math.ceil(audioBuffer.length / 1024)

    // Whisper API não retorna tokens, mas estimamos baseado na duração
    // 1000 tokens por minuto de áudio (estimativa rough)
    const estimatedTokens = Math.ceil((estimatedDurationSeconds / 60) * 1000)

    const latencyMs = Date.now() - startTime

    // 📊 Log API usage for tracking and budgets
    if (clientId) {
      await logAPIUsage({
        clientId,
        phone,
        apiType: 'whisper',
        provider: 'openai',
        modelName: 'whisper-1',
        inputUnits: estimatedDurationSeconds, // seconds of audio
        latencyMs,
      }).catch(err => {
        console.error('[Whisper] Failed to log usage:', err)
        // Continue execution even if logging fails
      })
    }

    return {
      text: transcription.text,
      usage: {
        prompt_tokens: estimatedTokens,
        completion_tokens: 0,
        total_tokens: estimatedTokens,
      },
      model: 'whisper-1',
      durationSeconds: estimatedDurationSeconds
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to transcribe audio with Whisper: ${errorMessage}`)
  }
}

export const analyzeImage = async (
  imageUrl: string,
  prompt: string,
  apiKey?: string
): Promise<string> => {
  try {
    const resolvedApiKey = await resolveOpenAIApiKey(apiKey)
    const client = new OpenAI({ apiKey: resolvedApiKey })

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content returned from GPT-4o Vision')
    }

    return content
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to analyze image with GPT-4o Vision: ${errorMessage}`)
  }
}

export const analyzeImageFromBuffer = async (
  imageBuffer: Buffer,
  prompt: string,
  mimeType: string = 'image/jpeg',
  apiKey?: string,
  clientId?: string,
  phone?: string
): Promise<{
  text: string
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  model: string
}> => {
  const startTime = Date.now()

  try {
    const resolvedApiKey = await resolveOpenAIApiKey(apiKey)
    const client = new OpenAI({ apiKey: resolvedApiKey })

    // Converter buffer para base64
    const base64Image = imageBuffer.toString('base64')
    const dataUrl = `data:${mimeType};base64,${base64Image}`

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: dataUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content returned from GPT-4o Vision')
    }

    // Capturar usage data
    const usage = response.usage
      ? {
          prompt_tokens: response.usage.prompt_tokens || 0,
          completion_tokens: response.usage.completion_tokens || 0,
          total_tokens: response.usage.total_tokens || 0,
        }
      : { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }

    const latencyMs = Date.now() - startTime

    // 📊 Log API usage for tracking and budgets
    if (clientId) {
      await logAPIUsage({
        clientId,
        phone,
        apiType: 'vision',
        provider: 'openai',
        modelName: 'gpt-4o',
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        outputUnits: 1, // 1 image analyzed
        latencyMs,
      }).catch(err => {
        console.error('[Vision] Failed to log usage:', err)
        // Continue execution even if logging fails
      })
    }

    return {
      text: content,
      usage,
      model: 'gpt-4o'
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to analyze image with GPT-4o Vision: ${errorMessage}`)
  }
}

export const generateEmbedding = async (
  text: string,
  apiKey?: string,
  clientId?: string
): Promise<{
  embedding: number[]
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  model: string
}> => {
  const startTime = Date.now()

  try {
    const resolvedApiKey = await resolveOpenAIApiKey(apiKey)
    const client = new OpenAI({ apiKey: resolvedApiKey })

    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    })

    const embedding = response.data[0]?.embedding
    if (!embedding) {
      throw new Error('No embedding returned from OpenAI')
    }

    // Capturar usage data
    const usage = response.usage
      ? {
          prompt_tokens: response.usage.prompt_tokens || 0,
          completion_tokens: 0, // Embeddings não têm completion tokens
          total_tokens: response.usage.total_tokens || 0,
        }
      : { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }

    const latencyMs = Date.now() - startTime

    // 📊 Log API usage for tracking and budgets
    if (clientId) {
      await logAPIUsage({
        clientId,
        apiType: 'embeddings',
        provider: 'openai',
        modelName: 'text-embedding-3-small',
        inputTokens: usage.prompt_tokens,
        outputTokens: 0,
        latencyMs,
      }).catch(err => {
        console.error('[Embeddings] Failed to log usage:', err)
        // Continue execution even if logging fails
      })
    }

    return {
      embedding,
      usage,
      model: 'text-embedding-3-small'
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to generate embedding: ${errorMessage}`)
  }
}

export const extractTextFromPDF = async (pdfBuffer: Buffer): Promise<string> => {
  try {
    // 🔧 Import dinâmico: só carrega pdf-parse quando função é chamada
    // pdf-parse v1.1.0 uses function-based API with bundled pdf.js v1.9.426
    // Works in serverless environments without browser APIs like DOMMatrix
    const pdfParseModule = await import('pdf-parse')
    const pdfParse = (pdfParseModule as any).default || pdfParseModule
    const pdfData = await pdfParse(pdfBuffer)
    return pdfData.text
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to extract text from PDF: ${errorMessage}`)
  }
}

export const summarizePDFContent = async (
  pdfText: string,
  filename?: string,
  apiKey?: string,
  clientId?: string,
  phone?: string
): Promise<{
  content: string
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  model: string
}> => {
  try {
    const startTime = Date.now()

    const resolvedApiKey = await resolveOpenAIApiKey(apiKey)
    const client = new OpenAI({ apiKey: resolvedApiKey })

    const prompt = `Você recebeu um documento PDF${filename ? ` chamado "${filename}"` : ''}.
Analise o conteúdo e forneça um resumo detalhado em português, incluindo:
1. Tipo de documento (catálogo, contrato, relatório, etc.)
2. Principais informações e tópicos
3. Detalhes relevantes que podem ser importantes para a conversa

Conteúdo do PDF:
${pdfText.substring(0, 12000)}`

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1500,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content returned from GPT-4o')
    }

    // Capturar usage data
    const usage = response.usage
      ? {
          prompt_tokens: response.usage.prompt_tokens || 0,
          completion_tokens: response.usage.completion_tokens || 0,
          total_tokens: response.usage.total_tokens || 0,
        }
      : { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }

    const latencyMs = Date.now() - startTime

    if (clientId) {
      await logAPIUsage({
        clientId,
        phone,
        apiType: 'chat',
        provider: 'openai',
        modelName: 'gpt-4o',
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        latencyMs,
        metadata: {
          feature: 'pdf_summary',
          filename,
        },
      }).catch(err => {
        console.error('[PDF Summary] Failed to log usage:', err)
      })
    }


    return {
      content,
      usage,
      model: 'gpt-4o'
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to summarize PDF content: ${errorMessage}`)
  }
}

/**
 * 🔐 Gera resposta com OpenAI Chat Completion usando key dinâmica
 * 
 * Similar ao generateChatCompletion do Groq, mas usando OpenAI SDK.
 * Suporta function calling e configurações personalizadas.
 * 
 * @param messages - Mensagens do chat
 * @param tools - Ferramentas disponíveis (function calling)
 * @param apiKey - API key opcional (do config do cliente)
 * @param settings - Configurações opcionais (temperature, max_tokens, model)
 * @returns Resposta da IA com content, toolCalls e finished
 */
export const generateChatCompletionOpenAI = async (
  messages: ChatMessage[],
  tools?: any[],
  apiKey?: string,
  settings?: {
    temperature?: number
    max_tokens?: number
    model?: string // gpt-4o, gpt-4o-mini, etc
  }
): Promise<AIResponse> => {
  try {
    // 1. Criar cliente OpenAI (dinâmico)
    const resolvedApiKey = await resolveOpenAIApiKey(apiKey)
    const client = new OpenAI({ apiKey: resolvedApiKey })

    // 2. Converter mensagens para formato OpenAI
    const openaiMessages = messages.map((msg) => ({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content,
    }))

    // 3. Montar parâmetros da completion
    const completionParams: any = {
      model: settings?.model || 'gpt-4o',
      messages: openaiMessages,
      temperature: settings?.temperature ?? 0.7,
      max_tokens: settings?.max_tokens ?? 2000,
    }

    // 4. Adicionar tools se fornecidas
    if (tools && tools.length > 0) {
      completionParams.tools = tools.map(tool => ({
        type: 'function',
        function: {
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters,
        }
      }))
      completionParams.tool_choice = 'auto'
    }

    // 5. Chamar API OpenAI
    const completion = await client.chat.completions.create(completionParams)

    const choice = completion.choices[0]
    if (!choice) {
      throw new Error('No completion choice returned from OpenAI')
    }

    // 6. Extrair content e tool calls
    const content = choice.message?.content || ''
    const toolCalls = choice.message?.tool_calls?.map((call: any) => ({
      id: call.id,
      type: call.type,
      function: {
        name: call.function.name,
        arguments: call.function.arguments,
      }
    }))

    const finished = choice.finish_reason === 'stop' || choice.finish_reason === 'tool_calls'

    // Capturar dados de usage
    const usage = completion.usage
      ? {
          prompt_tokens: completion.usage.prompt_tokens || 0,
          completion_tokens: completion.usage.completion_tokens || 0,
          total_tokens: completion.usage.total_tokens || 0,
        }
      : undefined


    // 7. Retornar no formato AIResponse (igual ao Groq)
    return {
      content,
      toolCalls,
      finished,
      usage,
      model: completionParams.model,
      provider: 'openai',
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to generate OpenAI chat completion: ${errorMessage}`)
  }
}

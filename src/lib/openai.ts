import OpenAI from 'openai'
import { AIResponse, ChatMessage } from './types'

const getRequiredEnvVariable = (key: string): string => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

let openaiClient: OpenAI | null = null

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

export const transcribeAudio = async (audioBuffer: Buffer): Promise<string> => {
  try {
    const client = getOpenAIClient()

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

    return transcription.text
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to transcribe audio with Whisper: ${errorMessage}`)
  }
}

export const analyzeImage = async (imageUrl: string, prompt: string): Promise<string> => {
  try {
    const client = getOpenAIClient()

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

export const analyzeImageFromBuffer = async (imageBuffer: Buffer, prompt: string, mimeType: string = 'image/jpeg'): Promise<string> => {
  try {
    const client = getOpenAIClient()

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

    return content
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to analyze image with GPT-4o Vision: ${errorMessage}`)
  }
}

export const generateEmbedding = async (text: string): Promise<number[]> => {
  try {
    const client = getOpenAIClient()

    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    })

    const embedding = response.data[0]?.embedding
    if (!embedding) {
      throw new Error('No embedding returned from OpenAI')
    }

    return embedding
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to generate embedding: ${errorMessage}`)
  }
}

export const extractTextFromPDF = async (pdfBuffer: Buffer): Promise<string> => {
  try {
    // 🔧 Import dinâmico: só carrega pdf-parse quando função é chamada
    // Isso evita erro de DOMMatrix/canvas no Vercel quando webhook é carregado
    const pdfParse = require('pdf-parse')
    const pdfData = await pdfParse(pdfBuffer)
    return pdfData.text
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to extract text from PDF: ${errorMessage}`)
  }
}

export const summarizePDFContent = async (pdfText: string, filename?: string): Promise<string> => {
  try {
    const client = getOpenAIClient()

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

    return content
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
    // 1. Criar cliente OpenAI (dinâmico ou cached)
    let client: OpenAI
    
    if (apiKey) {
      // Se apiKey fornecida, criar novo client (não cachear)
      client = new OpenAI({ apiKey })
    } else {
      // Fallback: usar client cacheado do env
      client = getOpenAIClient()
    }

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

    // 7. Retornar no formato AIResponse (igual ao Groq)
    return {
      content,
      toolCalls,
      finished,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to generate OpenAI chat completion: ${errorMessage}`)
  }
}

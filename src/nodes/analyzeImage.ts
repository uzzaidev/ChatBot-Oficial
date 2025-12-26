import { analyzeImageFromBuffer } from '@/lib/openai'

const IMAGE_ANALYSIS_PROMPT = 'Descreva detalhadamente o que você vê nesta imagem. Seja específico sobre objetos, pessoas, textos visíveis e contexto.'

export const analyzeImage = async (
  imageBuffer: Buffer,
  mimeType: string = 'image/jpeg',
  apiKey?: string,
  clientId?: string,
  phone?: string,
  conversationId?: string, // ✨ FASE 8: Conversation ID for tracking
): Promise<{
  text: string
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  model: string
}> => {
  try {
    return await analyzeImageFromBuffer(imageBuffer, IMAGE_ANALYSIS_PROMPT, mimeType, apiKey, clientId, phone, conversationId)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to analyze image: ${errorMessage}`)
  }
}

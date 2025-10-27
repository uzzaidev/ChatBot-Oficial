import { analyzeImageFromBuffer } from '@/lib/openai'

const IMAGE_ANALYSIS_PROMPT = 'Descreva detalhadamente o que você vê nesta imagem. Seja específico sobre objetos, pessoas, textos visíveis e contexto.'

export const analyzeImage = async (imageBuffer: Buffer, mimeType: string = 'image/jpeg'): Promise<string> => {
  try {
    return await analyzeImageFromBuffer(imageBuffer, IMAGE_ANALYSIS_PROMPT, mimeType)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to analyze image: ${errorMessage}`)
  }
}

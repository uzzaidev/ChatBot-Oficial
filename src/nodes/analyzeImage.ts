import { analyzeImage as analyzeImageWithGPT4o } from '@/lib/openai'

const IMAGE_ANALYSIS_PROMPT = 'Descreva detalhadamente o que você vê nesta imagem. Seja específico sobre objetos, pessoas, textos visíveis e contexto.'

export const analyzeImage = async (imageUrl: string): Promise<string> => {
  try {
    return await analyzeImageWithGPT4o(imageUrl, IMAGE_ANALYSIS_PROMPT)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to analyze image: ${errorMessage}`)
  }
}

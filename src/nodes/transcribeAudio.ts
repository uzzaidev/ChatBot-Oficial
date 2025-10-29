import { transcribeAudio as transcribeAudioWithWhisper } from '@/lib/openai'

export const transcribeAudio = async (audioBuffer: Buffer): Promise<{
  text: string
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  model: string
  durationSeconds?: number
}> => {
  try {
    return await transcribeAudioWithWhisper(audioBuffer)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to transcribe audio: ${errorMessage}`)
  }
}

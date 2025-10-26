import OpenAI from 'openai'

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

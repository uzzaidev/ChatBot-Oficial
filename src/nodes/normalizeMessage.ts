import { ParsedMessage } from '@/lib/types'

export interface NormalizedMessage {
  phone: string
  name: string
  content: string
  timestamp: string
}

export interface NormalizeMessageInput {
  parsedMessage: ParsedMessage
  processedContent?: string
}

export const normalizeMessage = (input: NormalizeMessageInput): NormalizedMessage => {
  try {
    const { parsedMessage, processedContent } = input
    const { phone, name, type, content, timestamp } = parsedMessage

    let normalizedContent = ''

    if (type === 'text') {
      normalizedContent = content
    } else if (type === 'audio' && processedContent) {
      normalizedContent = processedContent
    } else if (type === 'image' && processedContent) {
      normalizedContent = content
        ? `${processedContent}\n\nLegenda: ${content}`
        : processedContent
    }

    return {
      phone,
      name,
      content: normalizedContent,
      timestamp,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to normalize message: ${errorMessage}`)
  }
}

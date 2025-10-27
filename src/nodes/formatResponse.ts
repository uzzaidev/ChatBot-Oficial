const MAX_MESSAGE_LENGTH = 4096

/**
 * Remove tool calls (function calls) do texto da IA
 * Exemplo: "Olá! <function=foo>{...}</function>" → "Olá!"
 */
const removeToolCalls = (text: string): string => {
  // Remove padrão: <function=nome_funcao>{...}</function>
  return text.replace(/<function=[^>]+>[\s\S]*?<\/function>/g, '').trim()
}

const splitIntoParagraphs = (text: string): string[] => {
  const paragraphs = text.split('\n\n').filter((p) => p.trim().length > 0)

  if (paragraphs.length >= 2) {
    return paragraphs
  }

  const sentences = text.split(/(?<=[.!?])\s+/)
  if (sentences.length >= 2) {
    const midPoint = Math.floor(sentences.length / 2)
    return [
      sentences.slice(0, midPoint).join(' '),
      sentences.slice(midPoint).join(' '),
    ]
  }

  return [text]
}

const enforceMaxLength = (messages: string[]): string[] => {
  return messages.flatMap((msg) => {
    if (msg.length <= MAX_MESSAGE_LENGTH) {
      return [msg]
    }

    const chunks: string[] = []
    let currentChunk = ''

    const words = msg.split(' ')

    for (const word of words) {
      if ((currentChunk + ' ' + word).length > MAX_MESSAGE_LENGTH) {
        if (currentChunk) {
          chunks.push(currentChunk.trim())
        }
        currentChunk = word
      } else {
        currentChunk = currentChunk ? `${currentChunk} ${word}` : word
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim())
    }

    return chunks
  })
}

export const formatResponse = (aiResponseContent: string): string[] => {
  try {
    if (!aiResponseContent || aiResponseContent.trim().length === 0) {
      return []
    }

    // Remove tool calls antes de formatar
    const cleanedContent = removeToolCalls(aiResponseContent)

    if (!cleanedContent || cleanedContent.trim().length === 0) {
      return []
    }

    const initialSplit = cleanedContent
      .split('\n\n')
      .filter((msg) => msg.trim().length > 0)

    let messages: string[] = []

    if (initialSplit.length >= 2) {
      messages = initialSplit
    } else {
      messages = splitIntoParagraphs(cleanedContent)
    }

    const finalMessages = enforceMaxLength(messages)

    return finalMessages
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to format response: ${errorMessage}`)
  }
}

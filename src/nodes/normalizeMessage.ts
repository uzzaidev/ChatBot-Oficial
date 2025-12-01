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
      // Para imagem: enviar descrição + legenda para o AI processar
      if (content && content.trim().length > 0) {
        normalizedContent = `[Imagem] Descrição: ${processedContent}\nLegenda do usuário: ${content}`
      } else {
        normalizedContent = `[Imagem] Descrição: ${processedContent}`
      }
    } else if (type === 'document') {
      // Para documento: enviar conteúdo extraído + legenda se houver
      const filename = parsedMessage.metadata?.filename || 'documento'
      if (processedContent) {
        if (content && content.trim().length > 0) {
          normalizedContent = `[Documento: ${filename}] Conteúdo: ${processedContent}\nLegenda do usuário: ${content}`
        } else {
          normalizedContent = `[Documento: ${filename}] Conteúdo: ${processedContent}`
        }
      } else {
        // Documento sem conteúdo extraído (fallback)
        if (content && content.trim().length > 0) {
          normalizedContent = `[Documento: ${filename}] ${content}`
        } else {
          normalizedContent = `[Documento: ${filename}] Arquivo recebido`
        }
      }
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

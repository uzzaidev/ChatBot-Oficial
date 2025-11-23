import { sendDocumentMessage } from '@/lib/meta'
import { ClientConfig } from '@/lib/types'

export interface SendWhatsAppDocumentInput {
  phone: string
  documentUrl: string
  filename: string
  caption?: string
  config: ClientConfig
}

/**
 * NODE: Envia documento via WhatsApp
 *
 * @param input - Dados do documento a enviar
 * @returns ID da mensagem enviada
 */
export const sendWhatsAppDocument = async (input: SendWhatsAppDocumentInput): Promise<string> => {
  try {
    const { phone, documentUrl, filename, caption, config } = input

    const { messageId } = await sendDocumentMessage(phone, documentUrl, filename, caption, config)

    return messageId
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to send WhatsApp document: ${errorMessage}`)
  }
}

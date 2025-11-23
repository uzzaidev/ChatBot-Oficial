import { sendImageMessage } from '@/lib/meta'
import { ClientConfig } from '@/lib/types'

export interface SendWhatsAppImageInput {
  phone: string
  imageUrl: string
  caption?: string
  config: ClientConfig
}

/**
 * NODE: Envia imagem via WhatsApp
 *
 * @param input - Dados da imagem a enviar
 * @returns ID da mensagem enviada
 */
export const sendWhatsAppImage = async (input: SendWhatsAppImageInput): Promise<string> => {
  try {
    const { phone, imageUrl, caption, config } = input

    const { messageId } = await sendImageMessage(phone, imageUrl, caption, config)

    return messageId
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to send WhatsApp image: ${errorMessage}`)
  }
}

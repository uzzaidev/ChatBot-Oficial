import { sendAudioMessage } from '@/lib/meta'
import { ClientConfig } from '@/lib/types'

export interface SendWhatsAppAudioInput {
  phone: string
  audioUrl: string
  config: ClientConfig
}

/**
 * NODE: Envia áudio via WhatsApp
 *
 * @param input - Dados do áudio a enviar
 * @returns ID da mensagem enviada
 */
export const sendWhatsAppAudio = async (input: SendWhatsAppAudioInput): Promise<string> => {
  try {
    const { phone, audioUrl, config } = input

    const { messageId } = await sendAudioMessage(phone, audioUrl, config)

    return messageId
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to send WhatsApp audio: ${errorMessage}`)
  }
}

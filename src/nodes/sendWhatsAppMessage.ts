import { sendTextMessage } from '@/lib/meta'
import { ClientConfig } from '@/lib/types'

// Default delay between split messages (2 seconds)
const DEFAULT_MESSAGE_DELAY_MS = 2000

export interface SendWhatsAppMessageInput {
  phone: string
  messages: string[]
  config: ClientConfig // 🔐 Config dinâmica do cliente
}

const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 🔐 Envia mensagens WhatsApp usando config dinâmica do cliente
 *
 * Usa metaAccessToken e metaPhoneNumberId do config do cliente
 * Usa messageDelayMs do config para delay entre mensagens divididas
 */
export const sendWhatsAppMessage = async (input: SendWhatsAppMessageInput): Promise<string[]> => {
  try {
    const { phone, messages, config } = input
    const messageIds: string[] = []

    // Use configurable delay from settings, fallback to default
    // Validate bounds: min 0ms, max 10000ms (10 seconds)
    const rawDelay = config.settings.messageDelayMs ?? DEFAULT_MESSAGE_DELAY_MS
    const messageDelayMs = Math.max(0, Math.min(10000, rawDelay))

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i]

      if (!message || message.trim().length === 0) {
        continue
      }

      const { messageId } = await sendTextMessage(phone, message, config) // 🔐 Passa config
      messageIds.push(messageId)

      if (i < messages.length - 1) {
        await delay(messageDelayMs)
      }
    }

    return messageIds
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to send WhatsApp message: ${errorMessage}`)
  }
}

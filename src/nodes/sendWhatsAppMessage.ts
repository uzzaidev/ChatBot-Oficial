import { sendTextMessage } from '@/lib/meta'

const MESSAGE_DELAY_MS = 2000

export interface SendWhatsAppMessageInput {
  phone: string
  messages: string[]
}

const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const sendWhatsAppMessage = async (input: SendWhatsAppMessageInput): Promise<string[]> => {
  try {
    const { phone, messages } = input
    const messageIds: string[] = []

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i]

      if (!message || message.trim().length === 0) {
        continue
      }

      const { messageId } = await sendTextMessage(phone, message)
      messageIds.push(messageId)

      if (i < messages.length - 1) {
        await delay(MESSAGE_DELAY_MS)
      }
    }

    return messageIds
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to send WhatsApp message: ${errorMessage}`)
  }
}

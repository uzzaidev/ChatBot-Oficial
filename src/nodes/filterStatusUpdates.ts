import { WhatsAppWebhookPayload } from '@/lib/types'

export const filterStatusUpdates = (payload: WhatsAppWebhookPayload): WhatsAppWebhookPayload | null => {
  try {
    const entry = payload.entry?.[0]
    if (!entry) {
      return null
    }

    const change = entry.changes?.[0]
    if (!change) {
      return null
    }

    const value = change.value
    if (!value) {
      return null
    }

    const hasMessages = value.messages && value.messages.length > 0
    if (!hasMessages) {
      return null
    }

    return payload
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to filter status updates: ${errorMessage}`)
  }
}

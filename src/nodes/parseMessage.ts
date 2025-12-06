import { WhatsAppWebhookPayload, ParsedMessage, MediaMetadata, MessageType } from '@/lib/types'

export const parseMessage = (payload: WhatsAppWebhookPayload): ParsedMessage => {
  try {
    const entry = payload.entry?.[0]
    if (!entry) {
      throw new Error('No entry found in payload')
    }

    const change = entry.changes?.[0]
    if (!change) {
      throw new Error('No change found in entry')
    }

    const value = change.value
    if (!value) {
      throw new Error('No value found in change')
    }

    const message = value.messages?.[0]
    if (!message) {
      throw new Error('No message found in value')
    }

    const contact = value.contacts?.[0]
    if (!contact) {
      throw new Error('No contact found in value')
    }

    const phone = contact.wa_id
    const name = contact.profile.name
    const messageId = message.id
    const timestamp = message.timestamp
    const type = message.type as MessageType

    let content = ''
    let metadata: MediaMetadata | undefined
    let interactiveType: 'button_reply' | 'list_reply' | undefined
    let interactiveResponseId: string | undefined
    let interactiveResponseTitle: string | undefined

    if (type === 'text' && 'text' in message) {
      content = message.text.body
    } else if (type === 'audio' && 'audio' in message) {
      content = ''
      metadata = {
        id: message.audio.id,
        mimeType: message.audio.mime_type,
      }
    } else if (type === 'image' && 'image' in message) {
      content = message.image.caption || ''
      metadata = {
        id: message.image.id,
        mimeType: message.image.mime_type,
        sha256: message.image.sha256,
      }
    } else if (type === 'document' && 'document' in message) {
      content = message.document.caption || ''
      metadata = {
        id: message.document.id,
        mimeType: message.document.mime_type,
        sha256: message.document.sha256,
        filename: message.document.filename,
      }
    } else if (type === 'interactive' && 'interactive' in message) {
      // Parse interactive message response (button or list)
      const interactive = (message as any).interactive

      if (interactive.type === 'button_reply' && interactive.button_reply) {
        interactiveType = 'button_reply'
        interactiveResponseId = interactive.button_reply.id
        interactiveResponseTitle = interactive.button_reply.title
        content = interactive.button_reply.title
      } else if (interactive.type === 'list_reply' && interactive.list_reply) {
        interactiveType = 'list_reply'
        interactiveResponseId = interactive.list_reply.id
        interactiveResponseTitle = interactive.list_reply.title
        content = interactive.list_reply.title
      }
    }

    return {
      phone,
      name,
      type,
      content,
      timestamp,
      messageId,
      metadata,
      interactiveType,
      interactiveResponseId,
      interactiveResponseTitle,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to parse message: ${errorMessage}`)
  }
}

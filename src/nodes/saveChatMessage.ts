import { query } from '@/lib/postgres'
import type { StoredMediaMetadata } from '@/lib/types'

export interface SaveChatMessageInput {
  phone: string
  message: string
  type: 'user' | 'ai'
  clientId: string // 🔐 Multi-tenant: ID do cliente
  mediaMetadata?: StoredMediaMetadata // 📎 Media attachment metadata
  wamid?: string // 📱 WhatsApp message ID for reactions (wamid.xxx format)
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' // 📊 Message delivery status
}

export const saveChatMessage = async (input: SaveChatMessageInput): Promise<void> => {
  const startTime = Date.now()

  try {
    const { phone, message, type, clientId, mediaMetadata, wamid, status } = input

    const messageJson = {
      type: type === 'user' ? 'human' : 'ai',
      content: message,
      additional_kwargs: {},
    }

    // Determine status based on message type
    // - User messages: 'sent' (they already sent it to us)
    // - AI messages: 'pending' (waiting to be sent to WhatsApp API)
    const messageStatus = status || (type === 'user' ? 'sent' : 'pending')

    // OTIMIZAÇÃO: INSERT simples, beneficia-se do índice idx_chat_histories_session_id
    // NOTA: A coluna 'type' não existe na tabela - o type fica dentro do JSON 'message'
    // 🔐 Multi-tenant: Adicionado client_id após migration 005
    // 📎 Media: Adicionado media_metadata para armazenar URL da mídia
    // 📱 Wamid: Adicionado wamid para permitir reações via WhatsApp API
    // 📊 Status: Adicionado status para rastreamento de entrega (pending, sent, delivered, read, failed)
    await query(
      `INSERT INTO n8n_chat_histories (session_id, message, client_id, media_metadata, wamid, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [phone, JSON.stringify(messageJson), clientId, mediaMetadata ? JSON.stringify(mediaMetadata) : null, wamid || null, messageStatus]
    )

    const duration = Date.now() - startTime

    // Alerta se INSERT for lento
    if (duration > 500) {
    }
  } catch (error) {
    throw new Error(`Failed to save chat message: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

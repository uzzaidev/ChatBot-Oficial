import { query } from '@/lib/postgres'
import type { StoredMediaMetadata } from '@/lib/types'

export interface SaveChatMessageInput {
  phone: string
  message: string
  type: 'user' | 'ai'
  clientId: string // 🔐 Multi-tenant: ID do cliente
  mediaMetadata?: StoredMediaMetadata // 📎 Media attachment metadata
  wamid?: string // 📱 WhatsApp message ID for reactions (wamid.xxx format)
}

export const saveChatMessage = async (input: SaveChatMessageInput): Promise<void> => {
  const startTime = Date.now()

  try {
    const { phone, message, type, clientId, mediaMetadata, wamid } = input

    const messageJson = {
      type: type === 'user' ? 'human' : 'ai',
      content: message,
      additional_kwargs: {},
    }

    // OTIMIZAÇÃO: INSERT simples, beneficia-se do índice idx_chat_histories_session_id
    // NOTA: A coluna 'type' não existe na tabela - o type fica dentro do JSON 'message'
    // 🔐 Multi-tenant: Adicionado client_id após migration 005
    // 📎 Media: Adicionado media_metadata para armazenar URL da mídia
    // 📱 Wamid: Adicionado wamid para permitir reações via WhatsApp API
    await query(
      `INSERT INTO n8n_chat_histories (session_id, message, client_id, media_metadata, wamid, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [phone, JSON.stringify(messageJson), clientId, mediaMetadata ? JSON.stringify(mediaMetadata) : null, wamid || null]
    )

    const duration = Date.now() - startTime
    
    // Alerta se INSERT for lento
    if (duration > 500) {
    }
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[saveChatMessage] ❌ Error after ${duration}ms:`, error)
    throw new Error(`Failed to save chat message: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

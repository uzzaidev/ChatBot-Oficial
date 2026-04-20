import { createServiceRoleClient } from '@/lib/supabase'
import type { StoredMediaMetadata } from '@/lib/types'

export interface ErrorDetails {
  code?: string | number
  title: string
  message: string
  error_data?: any
}

export interface SaveChatMessageInput {
  phone: string
  message: string
  type: 'user' | 'ai' | 'system'
  clientId: string
  mediaMetadata?: StoredMediaMetadata
  wamid?: string
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  errorDetails?: ErrorDetails
}

export const saveChatMessage = async (input: SaveChatMessageInput): Promise<void> => {
  const { phone, message, type, clientId, mediaMetadata, wamid, status, errorDetails } = input

  // LangChain-compatible message format stored in JSONB column
  const messageJson = {
    type: type === 'user' ? 'human' : type === 'system' ? 'system' : 'ai',
    content: message,
    additional_kwargs: {},
  }

  // User messages arrive already sent; AI messages are pending WhatsApp delivery
  const messageStatus = status || (type === 'ai' ? 'pending' : 'sent')

  const now = new Date().toISOString()

  const supabase = createServiceRoleClient()
  const { error } = await (supabase as any)
    .from('n8n_chat_histories')
    .insert({
      session_id: phone,
      message: messageJson,            // Supabase client auto-serializes JSONB
      client_id: clientId,
      media_metadata: mediaMetadata ?? null,
      wamid: wamid ?? null,
      status: messageStatus,
      error_details: errorDetails ?? null,
      created_at: now,
      updated_at: now,
    })

  if (error) {
    throw new Error(`Failed to save chat message: ${error.message}`)
  }
}

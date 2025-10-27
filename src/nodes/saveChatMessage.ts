import { query } from '@/lib/postgres'

export interface SaveChatMessageInput {
  phone: string
  message: string
  type: 'user' | 'ai'
}

export const saveChatMessage = async (input: SaveChatMessageInput): Promise<void> => {
  const startTime = Date.now()
  
  try {
    const { phone, message, type } = input

    const messageJson = {
      type: type === 'user' ? 'human' : 'ai',
      content: message,
      additional_kwargs: {},
    }

    // OTIMIZAÇÃO: INSERT simples, beneficia-se do índice idx_chat_histories_session_id
    // NOTA: A coluna 'type' não existe na tabela - o type fica dentro do JSON 'message'
    await query(
      `INSERT INTO n8n_chat_histories (session_id, message, created_at)
       VALUES ($1, $2, NOW())`,
      [phone, JSON.stringify(messageJson)]
    )

    const duration = Date.now() - startTime
    console.log(`[saveChatMessage] ✅ Saved ${type} message for ${phone} in ${duration}ms`)
    
    // Alerta se INSERT for lento
    if (duration > 500) {
      console.warn(`[saveChatMessage] ⚠️ SLOW INSERT: ${duration}ms`)
    }
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[saveChatMessage] ❌ Error after ${duration}ms:`, error)
    throw new Error(`Failed to save chat message: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

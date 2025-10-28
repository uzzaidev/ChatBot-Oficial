import { ChatMessage } from '@/lib/types'
import { query } from '@/lib/postgres'

export interface GetChatHistoryInput {
  phone: string
  clientId: string // 🔐 Multi-tenant: ID do cliente
}

export const getChatHistory = async (input: GetChatHistoryInput): Promise<ChatMessage[]> => {
  const startTime = Date.now()

  try {
    const { phone, clientId } = input
    console.log('[getChatHistory] 📚 Fetching chat history for:', phone)
    console.log('[getChatHistory] 🔐 Client ID:', clientId)

    // OTIMIZAÇÃO: Query usa índice idx_chat_histories_session_created
    // NOTA: A coluna 'type' não existe - extraímos o type do JSON 'message'
    // 🔐 Multi-tenant: Filtra por client_id após migration 005
    const result = await query<any>(
      `SELECT session_id, message, created_at
       FROM n8n_chat_histories
       WHERE session_id = $1 AND client_id = $2
       ORDER BY created_at DESC
       LIMIT 30`,
      [phone, clientId]
    )

    const duration = Date.now() - startTime

    if (!result.rows || result.rows.length === 0) {
      console.log(`[getChatHistory] ℹ️ No history found (${duration}ms)`)
      return []
    }

    const chatMessages: ChatMessage[] = result.rows
      .reverse()
      .map((record) => {
        // Parse JSON da coluna message para extrair type e content
        let parsedMessage: any
        try {
          parsedMessage = typeof record.message === 'string'
            ? JSON.parse(record.message)
            : record.message
        } catch (error) {
          console.warn(`[getChatHistory] Failed to parse message JSON:`, error)
          parsedMessage = { type: 'human', content: record.message }
        }

        return {
          role: parsedMessage.type === 'ai' ? 'assistant' : 'user',
          content: parsedMessage.content || parsedMessage.data?.content || '',
          timestamp: record.created_at,
        }
      })

    console.log(`[getChatHistory] ✅ Retrieved ${chatMessages.length} messages in ${duration}ms`)
    
    // Alerta se query for lenta
    if (duration > 1000) {
      console.warn(`[getChatHistory] ⚠️ SLOW QUERY: ${duration}ms for phone ${phone}`)
    }
    
    return chatMessages
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[getChatHistory] ❌ Error after ${duration}ms:`, error)
    return []
  }
}

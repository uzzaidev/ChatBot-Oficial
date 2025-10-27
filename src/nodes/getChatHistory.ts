import { ChatMessage } from '@/lib/types'
import { query } from '@/lib/postgres'

export const getChatHistory = async (phone: string): Promise<ChatMessage[]> => {
  const startTime = Date.now()
  
  try {
    console.log('[getChatHistory] 📚 Fetching chat history for:', phone)

    // OTIMIZAÇÃO: Query usa índice idx_chat_histories_session_created
    const result = await query<any>(
      `SELECT session_id, message, type, created_at 
       FROM n8n_chat_histories 
       WHERE session_id = $1 
       ORDER BY created_at DESC 
       LIMIT 15`,
      [phone]
    )

    const duration = Date.now() - startTime

    if (!result.rows || result.rows.length === 0) {
      console.log(`[getChatHistory] ℹ️ No history found (${duration}ms)`)
      return []
    }

    const chatMessages: ChatMessage[] = result.rows
      .reverse()
      .map((record) => ({
        role: record.type === 'ai' ? 'assistant' : 'user',
        content: record.message,
        timestamp: record.created_at,
      }))

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

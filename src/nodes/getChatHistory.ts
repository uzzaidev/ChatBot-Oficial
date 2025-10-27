import { ChatMessage } from '@/lib/types'
import { query } from '@/lib/postgres'

export const getChatHistory = async (phone: string): Promise<ChatMessage[]> => {
  try {
    console.log('[getChatHistory] 📚 Fetching chat history for:', phone)

    const result = await query<any>(
      `SELECT session_id, message, type, created_at 
       FROM n8n_chat_histories 
       WHERE session_id = $1 
       ORDER BY created_at DESC 
       LIMIT 15`,
      [phone]
    )

    if (!result.rows || result.rows.length === 0) {
      return []
    }

    const chatMessages: ChatMessage[] = result.rows
      .reverse()
      .map((record) => ({
        role: record.type === 'ai' ? 'assistant' : 'user',
        content: record.message,
        timestamp: record.created_at,
      }))

    console.log(`[getChatHistory] ✅ Retrieved ${chatMessages.length} messages`)
    return chatMessages
  } catch (error) {
    console.error('[getChatHistory] ❌ Error fetching chat history:', error)
    return []
  }
}

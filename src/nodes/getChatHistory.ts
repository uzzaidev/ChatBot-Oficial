import { ChatMessage } from '@/lib/types'
import { createServerClient } from '@/lib/supabase'

const CHAT_HISTORY_LIMIT = 15

export const getChatHistory = async (phone: string): Promise<ChatMessage[]> => {
  try {
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('n8n_chat_histories')
      .select('*')
      .eq('session_id', phone)
      .order('created_at', { ascending: false })
      .limit(CHAT_HISTORY_LIMIT)

    if (error) {
      throw new Error(`Failed to fetch chat history: ${error.message}`)
    }

    if (!data || data.length === 0) {
      return []
    }

    // @ts-ignore - n8n_chat_histories table structure
    const chatMessages: ChatMessage[] = data
      .reverse()
      // @ts-ignore
      .map((record) => ({
        // @ts-ignore
        role: record.type === 'ai' ? 'assistant' : 'user',
        // @ts-ignore
        content: record.message,
        // @ts-ignore
        timestamp: record.created_at,
      }))

    return chatMessages
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to get chat history: ${errorMessage}`)
  }
}

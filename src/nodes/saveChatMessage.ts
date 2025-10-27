import { query } from '@/lib/postgres'

export interface SaveChatMessageInput {
  phone: string
  message: string
  type: 'user' | 'ai'
}

export const saveChatMessage = async (input: SaveChatMessageInput): Promise<void> => {
  try {
    const { phone, message, type } = input

    const messageJson = {
      type,
      data: {
        content: message,
        additional_kwargs: {},
      },
    }

    await query(
      `INSERT INTO n8n_chat_histories (session_id, message, type, created_at) 
       VALUES ($1, $2, $3, NOW())`,
      [phone, JSON.stringify(messageJson), type]
    )

    console.log(`[saveChatMessage] ✅ Saved ${type} message for ${phone}`)
  } catch (error) {
    console.error('[saveChatMessage] ❌ Error saving message:', error)
    throw new Error(`Failed to save chat message: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

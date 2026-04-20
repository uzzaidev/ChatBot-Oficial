import { ChatMessage } from '@/lib/types'
import { createServiceRoleClient } from '@/lib/supabase'
import { getBotConfig } from '@/lib/config'

export interface GetChatHistoryInput {
  phone: string
  clientId: string
  maxHistory?: number
}

export interface ChatHistoryStats {
  messageCount: number
  totalPromptSize: number
  maxHistoryRequested: number
  durationMs: number
}

export interface GetChatHistoryResult {
  messages: ChatMessage[]
  stats: ChatHistoryStats
}

export const getChatHistory = async (input: GetChatHistoryInput): Promise<GetChatHistoryResult> => {
  const startTime = Date.now()
  const defaultMaxHistory = input.maxHistory ?? 30

  try {
    const { phone, clientId } = input

    let maxHistory = input.maxHistory
    if (maxHistory === undefined) {
      const configValue = await getBotConfig(clientId, 'chat_history:max_messages')
      maxHistory = configValue !== null ? Number(configValue) : 30
    }

    const supabase = createServiceRoleClient()
    const { data, error } = await (supabase as any)
      .from('n8n_chat_histories')
      .select('session_id, message, created_at')
      .eq('session_id', phone)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(maxHistory)

    const duration = Date.now() - startTime

    if (error || !data || data.length === 0) {
      return {
        messages: [],
        stats: {
          messageCount: 0,
          totalPromptSize: 0,
          maxHistoryRequested: maxHistory,
          durationMs: duration,
        },
      }
    }

    const chatMessages: ChatMessage[] = (data as any[])
      .reverse()
      .map((record) => {
        // Supabase returns JSONB as JS object already; keep defensive parse for safety
        let parsedMessage: any
        try {
          parsedMessage =
            typeof record.message === 'string'
              ? JSON.parse(record.message)
              : record.message
        } catch {
          parsedMessage = { type: 'human', content: record.message }
        }

        let role: 'user' | 'assistant' | 'system' = 'user'
        if (parsedMessage.type === 'ai') role = 'assistant'
        else if (parsedMessage.type === 'system') role = 'system'

        return {
          role,
          content: parsedMessage.content || parsedMessage.data?.content || '',
          timestamp: record.created_at,
        }
      })

    const totalPromptSize = chatMessages.reduce(
      (acc, msg) => acc + (msg.content?.length || 0),
      0
    )

    return {
      messages: chatMessages,
      stats: {
        messageCount: chatMessages.length,
        totalPromptSize,
        maxHistoryRequested: maxHistory,
        durationMs: duration,
      },
    }
  } catch {
    const duration = Date.now() - startTime
    return {
      messages: [],
      stats: {
        messageCount: 0,
        totalPromptSize: 0,
        maxHistoryRequested: defaultMaxHistory,
        durationMs: duration,
      },
    }
  }
}

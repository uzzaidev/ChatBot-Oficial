import { ChatMessage } from '@/lib/types'
import { createServiceRoleClient } from '@/lib/supabase'
import { getBotConfig } from '@/lib/config'
import { trimMessagesToTokenBudget, estimateMessagesTokens } from '@/lib/token-budget'

export interface GetChatHistoryInput {
  phone: string
  clientId: string
  maxHistory?: number
  maxHistoryTokens?: number
}

export interface ChatHistoryStats {
  messageCount: number
  totalPromptSize: number
  estimatedTokens: number
  removedByTokenBudget: number
  maxHistoryTokensRequested: number
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
  const defaultMaxHistoryTokens = input.maxHistoryTokens ?? 6000

  try {
    const { phone, clientId } = input

    let maxHistory = input.maxHistory
    if (maxHistory === undefined) {
      const configValue = await getBotConfig(clientId, 'chat_history:max_messages')
      maxHistory = configValue !== null ? Number(configValue) : 30
    }

    let maxHistoryTokens = input.maxHistoryTokens
    if (maxHistoryTokens === undefined) {
      const configValue = await getBotConfig(clientId, 'chat_history:max_tokens')
      maxHistoryTokens = configValue !== null ? Number(configValue) : 6000
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
          estimatedTokens: 0,
          removedByTokenBudget: 0,
          maxHistoryTokensRequested: maxHistoryTokens,
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

    const trimmed = trimMessagesToTokenBudget(chatMessages, maxHistoryTokens)
    const finalMessages = trimmed.messages

    const totalPromptSize = finalMessages.reduce(
      (acc, msg) => acc + (msg.content?.length || 0),
      0
    )
    const estimatedTokens = estimateMessagesTokens(finalMessages)

    return {
      messages: finalMessages,
      stats: {
        messageCount: finalMessages.length,
        totalPromptSize,
        estimatedTokens,
        removedByTokenBudget: trimmed.removed,
        maxHistoryTokensRequested: maxHistoryTokens,
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
        estimatedTokens: 0,
        removedByTokenBudget: 0,
        maxHistoryTokensRequested: defaultMaxHistoryTokens,
        maxHistoryRequested: defaultMaxHistory,
        durationMs: duration,
      },
    }
  }
}

import { ChatMessage } from '@/lib/types'
import { query } from '@/lib/postgres'
import { getBotConfig } from '@/lib/config'

export interface GetChatHistoryInput {
  phone: string
  clientId: string // 🔐 Multi-tenant: ID do cliente
  maxHistory?: number // 🔧 Configurável (padrão: busca do banco, fallback 30)
}

/**
 * 📊 Estatísticas do histórico para monitoramento no backend
 */
export interface ChatHistoryStats {
  messageCount: number       // Número de mensagens válidas retornadas
  totalPromptSize: number    // Tamanho total do conteúdo em caracteres
  maxHistoryRequested: number // Limite de mensagens solicitado
  durationMs: number         // Tempo de execução em ms
}

/**
 * Resultado do getChatHistory com mensagens e estatísticas
 */
export interface GetChatHistoryResult {
  messages: ChatMessage[]
  stats: ChatHistoryStats
}

export const getChatHistory = async (input: GetChatHistoryInput): Promise<GetChatHistoryResult> => {
  const startTime = Date.now()

  try {
    const { phone, clientId } = input

    // 🔧 Phase 1: Get max_messages from bot configuration
    let maxHistory = input.maxHistory
    if (maxHistory === undefined) {
      const configValue = await getBotConfig(clientId, 'chat_history:max_messages')
      maxHistory = configValue !== null ? Number(configValue) : 30
    }


    // OTIMIZAÇÃO: Query usa índice idx_chat_histories_session_created
    // NOTA: A coluna 'type' não existe - extraímos o type do JSON 'message'
    // 🔐 Multi-tenant: Filtra por client_id após migration 005
    const result = await query<any>(
      `SELECT session_id, message, created_at
       FROM n8n_chat_histories
       WHERE session_id = $1 AND client_id = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [phone, clientId, maxHistory]
    )

    const duration = Date.now() - startTime

    if (!result.rows || result.rows.length === 0) {
      return {
        messages: [],
        stats: {
          messageCount: 0,
          totalPromptSize: 0,
          maxHistoryRequested: maxHistory,
          durationMs: duration,
        }
      }
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
          parsedMessage = { type: 'human', content: record.message }
        }

        return {
          role: parsedMessage.type === 'ai' ? 'assistant' : 'user',
          content: parsedMessage.content || parsedMessage.data?.content || '',
          timestamp: record.created_at,
        }
      })

    // 📊 Calcula o tamanho total do prompt (soma de todos os conteúdos)
    const totalPromptSize = chatMessages.reduce((acc, msg) => acc + (msg.content?.length || 0), 0)
    
    // Alerta se query for lenta
    if (duration > 1000) {
    }
    
    return {
      messages: chatMessages,
      stats: {
        messageCount: chatMessages.length,
        totalPromptSize,
        maxHistoryRequested: maxHistory,
        durationMs: duration,
      }
    }
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[getChatHistory] ❌ Error after ${duration}ms:`, error)
    return {
      messages: [],
      stats: {
        messageCount: 0,
        totalPromptSize: 0,
        maxHistoryRequested: input.maxHistory || 30,
        durationMs: duration,
      }
    }
  }
}

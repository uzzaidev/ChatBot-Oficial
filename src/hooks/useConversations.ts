import { useState, useEffect, useCallback, useRef } from 'react'
import { createClientBrowser } from '@/lib/supabase'
import type { ConversationWithCount, ConversationStatus } from '@/lib/types'

interface UseConversationsOptions {
  clientId: string
  status?: ConversationStatus
  limit?: number
  offset?: number
  refreshInterval?: number
  enableRealtime?: boolean
}

interface UseConversationsResult {
  conversations: ConversationWithCount[]
  loading: boolean
  error: string | null
  total: number
  refetch: () => Promise<void>
  lastUpdatePhone: string | null
}

export const useConversations = ({
  clientId, // Keep for backward compatibility and realtime filtering, but not sent to API
  status,
  limit = 50,
  offset = 0,
  refreshInterval = 0,
  enableRealtime = false,
}: UseConversationsOptions): UseConversationsResult => {
  const [conversations, setConversations] = useState<ConversationWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [lastUpdatePhone, setLastUpdatePhone] = useState<string | null>(null)
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // 🔐 SECURITY: No longer send client_id as query param
      // API route gets it from authenticated session
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      })

      if (status) {
        params.append('status', status)
      }

      const response = await fetch(`/api/conversations?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao buscar conversas')
      }

      const data = await response.json()
      setConversations(data.conversations || [])
      setTotal(data.total || 0)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      console.error('Erro ao buscar conversas:', err)
    } finally {
      setLoading(false)
    }
  }, [status, limit, offset]) // Removed clientId from dependencies since it's not used in API call

  // Função debounced para evitar múltiplas chamadas rápidas do realtime
  const debouncedFetch = useCallback((delay: number = 0) => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current)
    }
    fetchTimeoutRef.current = setTimeout(() => {
      fetchConversations()
    }, delay)
  }, [fetchConversations])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchConversations()
      }, refreshInterval)

      return () => clearInterval(interval)
    }
  }, [refreshInterval, fetchConversations])

  // Realtime subscription for new conversations
  useEffect(() => {
    if (!enableRealtime) {
      return
    }

    const supabase = createClientBrowser()

    // Monitorar mudanças em AMBAS as tabelas para garantir que novos clientes apareçam
    let channel = supabase
      .channel('conversations-realtime')
      // Detectar novos clientes
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'Clientes WhatsApp',
        },
        () => {
          console.log('[Realtime] Mudança detectada em Clientes WhatsApp')
          // Delay de 500ms para garantir que mensagem foi salva primeiro
          debouncedFetch(500)
        }
      )
      // Detectar novas mensagens (para cobrir race condition e novos clientes)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'n8n_chat_histories',
        },
        (payload) => {
          console.log('[Realtime] Nova mensagem detectada em n8n_chat_histories')
          // Extract phone from session_id
          const sessionId = (payload.new as any)?.session_id
          if (sessionId) {
            setLastUpdatePhone(sessionId)
          }
          // Delay de 300ms para agrupar múltiplas inserções (user + ai)
          debouncedFetch(300)
        }
      )
      .subscribe()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
      // Limpar timeout pendente
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }
    }
  }, [enableRealtime, debouncedFetch])

  return {
    conversations,
    loading,
    error,
    total,
    refetch: fetchConversations,
    lastUpdatePhone,
  }
}

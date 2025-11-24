import { useState, useEffect, useCallback, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
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
  const isInitialLoadRef = useRef(true)

  const fetchConversations = useCallback(async (isRealtimeUpdate = false) => {
    try {
      // Only show loading state on initial load, not on realtime updates
      if (!isRealtimeUpdate) {
        setLoading(true)
      }
      setError(null)

      // Use API route (has optimized SQL with JOIN and ORDER BY last_message_time)
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      })

      if (status) {
        params.append('status', status)
      }

      // Mobile: use production API URL (static export doesn't have API routes)
      // Web: use relative URL (localhost or production)
      const isMobile = Capacitor.isNativePlatform()
      const apiBaseUrl = isMobile
        ? (process.env.NEXT_PUBLIC_API_URL || 'https://chat.luisfboff.com')
        : ''

      const response = await fetch(`${apiBaseUrl}/api/conversations?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao buscar conversas')
      }

      const data = await response.json()
      setConversations(data.conversations || [])
      setTotal(data.total || 0)

      // Mark initial load as complete
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      console.error('Erro ao buscar conversas:', err)
    } finally {
      // Only clear loading state if it was set (initial load or manual refresh)
      if (!isRealtimeUpdate) {
        setLoading(false)
      }
    }
  }, [status, limit, offset])

  // Função debounced para evitar múltiplas chamadas rápidas do realtime
  const debouncedFetch = useCallback((delay: number = 0) => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current)
    }
    fetchTimeoutRef.current = setTimeout(() => {
      // Pass true to indicate this is a realtime update (no loading state)
      fetchConversations(true)
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
          table: 'clientes_whatsapp',
        },
        () => {
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

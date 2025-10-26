import { useState, useEffect, useCallback } from 'react'
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
}

export const useConversations = ({
  clientId,
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

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        client_id: clientId,
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
  }, [clientId, status, limit, offset])

  useEffect(() => {
    if (clientId) {
      fetchConversations()
    }
  }, [clientId, fetchConversations])

  useEffect(() => {
    if (refreshInterval > 0 && clientId) {
      const interval = setInterval(() => {
        fetchConversations()
      }, refreshInterval)

      return () => clearInterval(interval)
    }
  }, [refreshInterval, clientId, fetchConversations])

  // Realtime subscription for new conversations
  useEffect(() => {
    if (!enableRealtime || !clientId) {
      return
    }

    const supabase = createClientBrowser()
    const channel = supabase
      .channel('clientes-whatsapp-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'Clientes WhatsApp',
        },
        () => {
          // Refetch conversations when any change occurs
          fetchConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [enableRealtime, clientId, fetchConversations])

  return {
    conversations,
    loading,
    error,
    total,
    refetch: fetchConversations,
  }
}

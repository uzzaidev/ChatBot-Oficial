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
  const isInitialLoadRef = useRef(true)

  const fetchConversations = useCallback(async (isRealtimeUpdate = false) => {
    try {
      // Only show loading state on initial load, not on realtime updates
      if (!isRealtimeUpdate) {
        setLoading(true)
      }
      setError(null)

      // Mobile-compatible: Buscar diretamente do Supabase (sem API routes)
      const supabase = createClientBrowser()
      
      // 1. Verificar usuário autenticado
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Usuário não autenticado')
      }

      // 2. Buscar client_id do profile (se não foi passado)
      let finalClientId = clientId
      if (!finalClientId) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('client_id')
          .eq('id', user.id)
          .single()
        
        if (profile?.client_id) {
          finalClientId = profile.client_id
        } else {
          throw new Error('Client ID não encontrado')
        }
      }

      // 3. Buscar conversas diretamente do Supabase
      // Query na tabela clientes_whatsapp com filtros
      let query = supabase
        .from('clientes_whatsapp')
        .select('*', { count: 'exact' })
        .eq('client_id', finalClientId)
        // Ordenar por last_update ou created_at (dependendo do que existe na tabela)
        .order('last_update', { ascending: false, nullsFirst: false })
        .range(offset, offset + limit - 1)

      // Aplicar filtro de status se fornecido
      if (status) {
        query = query.eq('status', status)
      }

      const { data: clientes, error: clientesError, count } = await query

      if (clientesError) {
        throw new Error(clientesError.message || 'Erro ao buscar conversas')
      }

      // 4. Mapear dados da tabela para o tipo Conversation
      // A tabela clientes_whatsapp usa 'telefone', mas Conversation usa 'phone'
      const conversationsWithCount: ConversationWithCount[] = await Promise.all(
        (clientes || []).map(async (cliente: any) => {
          // Buscar contagem de mensagens
          const { count: messageCount } = await supabase
            .from('n8n_chat_histories')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', cliente.telefone || cliente.phone)
            .eq('client_id', finalClientId)

          // Mapear campos da tabela para o tipo Conversation
          return {
            id: cliente.id,
            client_id: cliente.client_id,
            phone: cliente.telefone || cliente.phone,
            name: cliente.nome || cliente.name,
            status: cliente.status,
            assigned_to: cliente.assigned_to,
            last_message: cliente.last_message,
            last_update: cliente.updated_at || cliente.last_update,
            created_at: cliente.created_at,
            message_count: messageCount || 0,
          } as ConversationWithCount
        })
      )

      setConversations(conversationsWithCount)
      setTotal(count || 0)
      
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
  }, [clientId, status, limit, offset]) // Adicionar clientId de volta às dependências

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

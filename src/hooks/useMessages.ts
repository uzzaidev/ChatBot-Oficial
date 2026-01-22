import { useState, useEffect, useCallback, useRef } from 'react'
import { apiFetch } from '@/lib/api'
import type { Message } from '@/lib/types'

interface UseMessagesOptions {
  clientId: string
  phone: string
  refreshInterval?: number
}

interface UseMessagesResult {
  messages: Message[]
  loading: boolean
  error: string | null
  total: number
  refetch: () => Promise<void>
}

/**
 * Hook para buscar mensagens de uma conversa
 * 
 * CORREÇÃO: Separado initialLoading de refetch para evitar "piscar" da UI
 * - initialLoading: só true no primeiro fetch (quando troca de conversa)
 * - refetches/polling: não setam loading, mantendo UI visível
 */
export const useMessages = ({
  clientId, // Keep for backward compatibility, but not sent to API
  phone,
  refreshInterval = 0,
}: UseMessagesOptions): UseMessagesResult => {
  const [messages, setMessages] = useState<Message[]>([])
  // CORREÇÃO: Renomeado para initialLoading para clareza
  // Só será true no primeiro fetch, não em refetches
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  
  // Ref para rastrear se já foi feito o primeiro fetch desta conversa
  // Evita setar loading em refetches/polling
  const hasFetchedRef = useRef(false)
  // Ref para armazenar a função fetchMessages mais recente
  // Permite usar no interval sem adicionar nas dependências
  // CORREÇÃO: Tipo corrigido - fetchMessages não recebe argumentos (usa phone do closure)
  const fetchMessagesRef = useRef<(() => Promise<void>) | null>(null)

  const fetchMessages = useCallback(async () => {
    // Determina se é o primeiro fetch desta conversa
    const isInitial = !hasFetchedRef.current
    
    try {
      // CORREÇÃO: Só seta loading no primeiro fetch
      // Refetches/polling não devem limpar a UI
      if (isInitial) {
        setInitialLoading(true)
      }
      setError(null)

      // 🔐 SECURITY: No longer send client_id as query param
      // API route gets it from authenticated session
      const params = new URLSearchParams({
        _t: Date.now().toString(), // Cache-busting timestamp
      })

      const response = await apiFetch(`/api/messages/${phone}?${params.toString()}`, {
        cache: 'no-store', // Disable fetch cache
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao buscar mensagens')
      }

      const data = await response.json()

      setMessages(data.messages || [])
      setTotal(data.total || 0)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
    } finally {
      // CORREÇÃO: Só limpa loading se foi o fetch inicial
      if (isInitial) {
        setInitialLoading(false)
        hasFetchedRef.current = true
      }
    }
  }, [phone]) // Removed clientId from dependencies since it's not used in API call

  // Atualiza ref com a função mais recente
  useEffect(() => {
    fetchMessagesRef.current = async () => {
      await fetchMessages()
    }
  }, [fetchMessages])

  // CORREÇÃO: Removido fetchMessages das dependências para evitar loops
  // Reset do hasFetchedRef quando troca de conversa
  // Usa ref para rastrear phone anterior e evitar resets desnecessários
  const previousPhoneRef = useRef<string | null>(null)
  useEffect(() => {
    if (phone) {
      // Só reseta se o phone realmente mudou (não é o mesmo valor)
      if (previousPhoneRef.current !== phone) {
        previousPhoneRef.current = phone
        // Reset ao trocar de conversa
        hasFetchedRef.current = false
        setInitialLoading(true)
        fetchMessages()
      }
    } else {
      // Se phone for vazio/null, limpa o estado
      previousPhoneRef.current = null
      hasFetchedRef.current = false
      setInitialLoading(true)
      setMessages([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]) // Só phone, não fetchMessages

  // CORREÇÃO: Polling sem fetchMessages nas dependências
  // Usa ref para acessar função mais recente sem causar re-render
  useEffect(() => {
    if (refreshInterval > 0 && phone) {
      const interval = setInterval(() => {
        // Usa ref para evitar dependência instável
        if (fetchMessagesRef.current) {
          fetchMessagesRef.current()
        }
      }, refreshInterval)

      return () => clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshInterval, phone]) // Só refreshInterval e phone, não fetchMessages

  return {
    messages,
    loading: initialLoading, // Retorna initialLoading como loading para compatibilidade
    error,
    total,
    refetch: fetchMessages,
  }
}

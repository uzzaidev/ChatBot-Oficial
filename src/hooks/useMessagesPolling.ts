import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/api'
import type { Message } from '@/lib/types'

interface UseMessagesPollingOptions {
  clientId: string
  phone: string
  pollInterval?: number // milliseconds (default: 3000)
  enabled?: boolean
}

interface UseMessagesPollingResult {
  messages: Message[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook de polling para mensagens (FREE tier compatible)
 *
 * Usa polling inteligente ao invés de realtime
 * Perfeito para planos FREE do Supabase
 */
export const useMessagesPolling = ({
  clientId,
  phone,
  pollInterval = 3000,
  enabled = true,
}: UseMessagesPollingOptions): UseMessagesPollingResult => {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMessages = useCallback(async () => {
    if (!enabled) return

    try {
      setError(null)

      const response = await apiFetch(`/api/messages?phone=${phone}&client_id=${clientId}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao buscar mensagens')
      }

      const data = await response.json()
      setMessages(data.messages || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      console.error('[Polling] Erro ao buscar mensagens:', err)
    } finally {
      setLoading(false)
    }
  }, [clientId, phone, enabled])

  // Initial fetch
  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // Polling
  useEffect(() => {
    if (!enabled) return

    console.log(`🔄 [Polling] Starting polling every ${pollInterval}ms`)

    const interval = setInterval(() => {
      fetchMessages()
    }, pollInterval)

    return () => {
      console.log('🧹 [Polling] Cleaning up')
      clearInterval(interval)
    }
  }, [enabled, pollInterval, fetchMessages])

  return {
    messages,
    loading,
    error,
    refetch: fetchMessages,
  }
}

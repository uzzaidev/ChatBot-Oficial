import { useState, useEffect, useCallback } from 'react'
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

export const useMessages = ({
  clientId, // Keep for backward compatibility, but not sent to API
  phone,
  refreshInterval = 0,
}: UseMessagesOptions): UseMessagesResult => {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true)
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
      console.error('Erro ao buscar mensagens:', err)
    } finally {
      setLoading(false)
    }
  }, [phone]) // Removed clientId from dependencies since it's not used in API call

  useEffect(() => {
    if (phone) {
      fetchMessages()
    }
  }, [phone, fetchMessages])

  useEffect(() => {
    if (refreshInterval > 0 && phone) {
      const interval = setInterval(() => {
        fetchMessages()
      }, refreshInterval)

      return () => clearInterval(interval)
    }
  }, [refreshInterval, phone, fetchMessages])

  return {
    messages,
    loading,
    error,
    total,
    refetch: fetchMessages,
  }
}

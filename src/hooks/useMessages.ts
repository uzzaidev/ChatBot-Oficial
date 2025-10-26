import { useState, useEffect, useCallback } from 'react'
import type { Message } from '@/lib/types'

interface UseMessagesOptions {
  clientId: string
  phone: string
  limit?: number
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
  clientId,
  phone,
  limit = 100,
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

      const params = new URLSearchParams({
        client_id: clientId,
        limit: limit.toString(),
      })

      const response = await fetch(`/api/messages/${phone}?${params.toString()}`)

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
  }, [clientId, phone, limit])

  useEffect(() => {
    if (clientId && phone) {
      fetchMessages()
    }
  }, [clientId, phone, fetchMessages])

  useEffect(() => {
    if (refreshInterval > 0 && clientId && phone) {
      const interval = setInterval(() => {
        fetchMessages()
      }, refreshInterval)

      return () => clearInterval(interval)
    }
  }, [refreshInterval, clientId, phone, fetchMessages])

  return {
    messages,
    loading,
    error,
    total,
    refetch: fetchMessages,
  }
}

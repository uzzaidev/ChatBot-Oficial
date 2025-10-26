import { useEffect, useState, useRef } from 'react'
import { createClientBrowser } from '@/lib/supabase'
import { cleanMessageContent } from '@/lib/utils'
import type { Message } from '@/lib/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseRealtimeMessagesOptions {
  clientId: string
  phone: string
  onNewMessage?: (message: Message) => void
}

export const useRealtimeMessages = ({
  clientId,
  phone,
  onNewMessage,
}: UseRealtimeMessagesOptions) => {
  const [isConnected, setIsConnected] = useState(false)
  const onNewMessageRef = useRef(onNewMessage)

  // Keep the callback ref up to date
  useEffect(() => {
    onNewMessageRef.current = onNewMessage
  }, [onNewMessage])

  useEffect(() => {
    if (!clientId || !phone) {
      return
    }

    const supabase = createClientBrowser()
    let channel: RealtimeChannel

    const setupRealtimeSubscription = async () => {
      channel = supabase
        .channel(`chat-histories:${clientId}:${phone}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'n8n_chat_histories',
            filter: `session_id=eq.${phone}`,
          },
          (payload) => {
            // Transformar dados do n8n para formato Message
            const item = payload.new as any
            // O n8n_chat_histories tem a estrutura:
            // - type: 'user' | 'ai'
            // - message: string (conteúdo da mensagem)
            const messageType = item.type || 'ai'
            const messageContent = typeof item.message === 'string' ? item.message : (item.message?.content || '')

            // Limpar tags de function calls
            const cleanedContent = cleanMessageContent(messageContent)

            const newMessage: Message = {
              id: item.id?.toString() || `msg-${Date.now()}`,
              client_id: clientId,
              conversation_id: String(phone),
              phone: phone,
              name: messageType === 'user' ? 'Cliente' : 'Bot',
              content: cleanedContent,
              type: 'text',
              direction: messageType === 'user' ? 'incoming' : 'outgoing',
              status: 'sent',
              timestamp: new Date().toISOString(),
              metadata: null,
            }
            if (onNewMessageRef.current) {
              onNewMessageRef.current(newMessage)
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true)
            console.log('Conectado ao Realtime para', phone)
          } else if (status === 'CLOSED') {
            setIsConnected(false)
            console.log('Desconectado do Realtime')
          }
        })
    }

    setupRealtimeSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
        setIsConnected(false)
      }
    }
  }, [clientId, phone])

  return { isConnected }
}

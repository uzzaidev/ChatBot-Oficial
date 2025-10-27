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
            console.log('🔔 [Realtime] Nova mensagem recebida:', payload)
            
            // Transformar dados do n8n para formato Message
            const item = payload.new as any

            // O n8n_chat_histories salva message como JSON:
            // { "type": "human" | "ai", "content": "...", "additional_kwargs": {}, "response_metadata": {} }

            let messageData: any

            // Parse o JSON da coluna message
            if (typeof item.message === 'string') {
              try {
                messageData = JSON.parse(item.message)
              } catch {
                // Fallback se não for JSON válido
                messageData = { type: 'ai', content: item.message }
              }
            } else {
              messageData = item.message || {}
            }

            // Extrair type e content do JSON
            const messageType = messageData.type || 'ai'  // 'human' ou 'ai'
            const messageContent = messageData.content || ''

            // Limpar tags de function calls
            const cleanedContent = cleanMessageContent(messageContent)

            const newMessage: Message = {
              id: item.id?.toString() || `msg-${Date.now()}`,
              client_id: clientId,
              conversation_id: String(phone),
              phone: phone,
              name: messageType === 'human' ? 'Cliente' : 'Bot',
              content: cleanedContent,
              type: 'text',
              direction: messageType === 'human' ? 'incoming' : 'outgoing',
              status: 'sent',
              timestamp: item.created_at || new Date().toISOString(),  // Usar created_at do banco
              metadata: null,
            }
            
            console.log('📨 [Realtime] Mensagem processada:', newMessage)
            
            if (onNewMessageRef.current) {
              onNewMessageRef.current(newMessage)
            }
          }
        )
        .subscribe((status) => {
          console.log('[useRealtimeMessages] Status:', status, 'para telefone:', phone)
          
          if (status === 'SUBSCRIBED') {
            setIsConnected(true)
            console.log('✅ Conectado ao Realtime para', phone)
          } else if (status === 'CLOSED') {
            setIsConnected(false)
            console.log('❌ Desconectado do Realtime')
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ ERRO no canal Realtime - Verifique se a replicação está habilitada no Supabase!')
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

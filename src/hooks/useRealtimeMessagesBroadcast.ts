import { useEffect, useState, useRef, useCallback } from 'react'
import { createClientBrowser } from '@/lib/supabase'
import { cleanMessageContent } from '@/lib/utils'
import type { Message } from '@/lib/types'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'

// Imports condicionais para mobile
let App: any
let Network: any

if (Capacitor.isNativePlatform()) {
  App = require('@capacitor/app').App
  Network = require('@capacitor/network').Network
}

interface UseRealtimeMessagesBroadcastOptions {
  clientId: string
  phone: string
  onNewMessage: (message: Message) => void
}

/**
 * Hook de Realtime usando Broadcast (FREE tier compatible!)
 *
 * Ao invés de postgres_changes (que requer replication no FREE tier),
 * usa broadcast channels + database triggers para notificações em tempo real.
 *
 * Funciona 100% no FREE tier do Supabase!
 */
export const useRealtimeMessagesBroadcast = ({
  clientId,
  phone,
  onNewMessage,
}: UseRealtimeMessagesBroadcastOptions) => {
  const [isConnected, setIsConnected] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const onNewMessageRef = useRef(onNewMessage)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Keep the callback ref up to date
  useEffect(() => {
    onNewMessageRef.current = onNewMessage
  }, [onNewMessage])

  const setupBroadcastSubscription = useCallback(() => {
    if (!clientId || !phone) return

    const supabase = createClientBrowser()

    console.log(`📡 [Broadcast] Connecting to channel: messages:${phone}`)

    const channel = supabase
      .channel(`messages:${clientId}:${phone}`, {
        config: {
          broadcast: { self: false },
        },
      })
      .on('broadcast', { event: '*' }, (payload) => {
        console.log('✅ [Broadcast] Event received:', payload)

        try {
          // Payload vem de realtime.broadcast_changes()
          const { type, new: data, old: oldData } = payload.payload as any

          // Só processar INSERTs (novas mensagens)
          if (type !== 'INSERT') {
            return
          }

          // Filter by session_id (phone) - garantir que é a conversa certa
          if (data.session_id !== phone) {
            console.log('⚠️ [Broadcast] Message for different session, ignoring')
            return
          }

          // Parse message JSON
          let messageData: any
          if (typeof data.message === 'string') {
            try {
              messageData = JSON.parse(data.message)
            } catch {
              messageData = { type: 'ai', content: data.message }
            }
          } else {
            messageData = data.message || {}
          }

          const messageType = messageData.type || 'ai'
          const messageContent = messageData.content || ''
          const cleanedContent = cleanMessageContent(messageContent)

          const newMessage: Message = {
            id: data.id?.toString() || `msg-${Date.now()}`,
            client_id: clientId,
            conversation_id: String(phone),
            phone: phone,
            name: messageType === 'human' ? 'Cliente' : 'Bot',
            content: cleanedContent,
            type: 'text',
            direction: messageType === 'human' ? 'incoming' : 'outgoing',
            status: 'sent',
            timestamp: data.created_at || new Date().toISOString(),
            metadata: null,
          }

          if (onNewMessageRef.current) {
            onNewMessageRef.current(newMessage)
          }
        } catch (error) {
          console.error('❌ [Broadcast] Error processing message:', error)
        }
      })
      .subscribe((status, err) => {
        console.log(`📡 [Broadcast] Status: ${status}`, err || '')

        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          setRetryCount(0)
          console.log('✅ [Broadcast] Successfully connected!')
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false)
          console.error(`❌ [Broadcast] Connection ${status}`, err)

          // Retry with exponential backoff
          if (retryCount < 5) {
            const delay = Math.min(1000 * Math.pow(2, retryCount), 30000)
            console.log(`🔄 [Broadcast] Retrying in ${delay}ms (attempt ${retryCount + 1}/5)...`)

            reconnectTimeoutRef.current = setTimeout(() => {
              setRetryCount(prev => prev + 1)
              if (channelRef.current) {
                supabase.removeChannel(channelRef.current)
              }
              setupBroadcastSubscription()
            }, delay)
          }
        }
      })

    channelRef.current = channel
  }, [clientId, phone, retryCount])

  // Setup inicial e cleanup
  useEffect(() => {
    if (!clientId || !phone) return

    setupBroadcastSubscription()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }

      if (channelRef.current) {
        const supabase = createClientBrowser()
        console.log('🧹 [Broadcast] Cleaning up channel')
        supabase.removeChannel(channelRef.current)
        setIsConnected(false)
      }
    }
  }, [clientId, phone, setupBroadcastSubscription])

  // Mobile: App lifecycle
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const appStateListener = App.addListener('appStateChange', (state: { isActive: boolean }) => {
      if (state.isActive && channelRef.current?.state !== 'joined') {
        setupBroadcastSubscription()
      }
    })

    return () => {
      appStateListener.then((listener: any) => listener.remove())
    }
  }, [setupBroadcastSubscription])

  // Mobile: Network changes
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const networkListener = Network.addListener('networkStatusChange', (status: { connected: boolean }) => {
      if (status.connected && channelRef.current?.state !== 'joined') {
        setupBroadcastSubscription()
      }
    })

    return () => {
      networkListener.then((listener: any) => listener.remove())
    }
  }, [setupBroadcastSubscription])

  return { isConnected, retryCount }
}

import { useEffect, useState, useCallback } from 'react'
import { createClientBrowser } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface MessageNotification {
  phone: string
  message: string
  senderName?: string
  timestamp: string
}

// Singleton callback storage - garante que apenas um callback seja ativo
let globalCallback: ((notification: MessageNotification) => void) | null = null

/**
 * Hook global para monitorar TODAS as mensagens em tempo real
 * Usado para mostrar notificações em conversas não abertas
 */
export const useGlobalRealtimeNotifications = (
  onNewMessage?: (notification: MessageNotification) => void
) => {
  const [lastUpdatePhone, setLastUpdatePhone] = useState<string | null>(null)
  const [lastNotification, setLastNotification] = useState<MessageNotification | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // Registrar callback globalmente
  useEffect(() => {
    if (onNewMessage) {
      globalCallback = onNewMessage
      
      return () => {
        globalCallback = null
      }
    }
  }, [onNewMessage])

  useEffect(() => {
    const supabase = createClientBrowser()
    let channel: RealtimeChannel

    const setupGlobalSubscription = async () => {
      channel = supabase
        .channel('global-chat-histories')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'n8n_chat_histories',
          },
          (payload) => {
            try {
              const item = payload.new as any
              const phone = item.session_id
              const role = item.role || 'user'
              const timestamp = item.created_at || new Date().toISOString()
              
              let message = ''
              if (typeof item.message === 'string') {
                message = item.message
              } else if (item.message && typeof item.message === 'object') {
                message = JSON.stringify(item.message)
              }

              if (phone && role === 'user') {
                setLastUpdatePhone(phone)
                
                const notification: MessageNotification = {
                  phone,
                  message,
                  timestamp,
                }
                
                setLastNotification(notification)
                
                // Usar callback global em vez do parâmetro
                if (globalCallback) {
                  globalCallback(notification)
                }
              }
            } catch (error) {
              console.error('❌ [GlobalRealtime] Erro ao processar mensagem:', error)
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true)
          } else if (status === 'CLOSED') {
            setIsConnected(false)
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ [GlobalRealtime] ERRO no canal')
          }
        })
    }

    setupGlobalSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
        setIsConnected(false)
      }
    }
  }, []) // SEM dependências - callback vem do singleton

  return { 
    lastUpdatePhone, 
    lastNotification,
    isConnected 
  }
}

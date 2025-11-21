import { useEffect, useState } from 'react'
import { createClientBrowser } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Hook global para monitorar TODAS as mensagens em tempo real
 * Usado para mostrar notificações em conversas não abertas
 */
export const useGlobalRealtimeNotifications = () => {
  const [lastUpdatePhone, setLastUpdatePhone] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

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
            // SEM filtro - monitora TODAS as mensagens
          },
          (payload) => {

            const item = payload.new as any

            // Extrair session_id (que é o phone number)
            const phone = item.session_id

            if (phone) {
              setLastUpdatePhone(phone)
            }
          }
        )
        .subscribe((status) => {

          if (status === 'SUBSCRIBED') {
            setIsConnected(true)
          } else if (status === 'CLOSED') {
            setIsConnected(false)
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ ERRO no canal Realtime Global')
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
  }, []) // Sem dependências - sempre ativo

  return { lastUpdatePhone, isConnected }
}

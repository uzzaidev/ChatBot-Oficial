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
      console.log('[GlobalRealtime] Iniciando monitoramento global de mensagens...')

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
            console.log('🔔 [GlobalRealtime] Nova mensagem detectada:', payload)

            const item = payload.new as any

            // Extrair session_id (que é o phone number)
            const phone = item.session_id

            if (phone) {
              console.log('📱 [GlobalRealtime] Atualizando lastUpdatePhone:', phone)
              setLastUpdatePhone(phone)
            }
          }
        )
        .subscribe((status) => {
          console.log('[GlobalRealtime] Status:', status)

          if (status === 'SUBSCRIBED') {
            setIsConnected(true)
            console.log('✅ Conectado ao Realtime Global')
          } else if (status === 'CLOSED') {
            setIsConnected(false)
            console.log('❌ Desconectado do Realtime Global')
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ ERRO no canal Realtime Global')
          }
        })
    }

    setupGlobalSubscription()

    return () => {
      if (channel) {
        console.log('[GlobalRealtime] Limpando subscription global')
        supabase.removeChannel(channel)
        setIsConnected(false)
      }
    }
  }, []) // Sem dependências - sempre ativo

  return { lastUpdatePhone, isConnected }
}

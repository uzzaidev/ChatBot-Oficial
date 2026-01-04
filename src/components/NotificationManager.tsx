'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useNotifications } from '@/hooks/useNotifications'
import { useGlobalRealtimeNotifications, type MessageNotification } from '@/hooks/useGlobalRealtimeNotifications'
import { Button } from '@/components/ui/button'
import { Bell, BellOff } from 'lucide-react'
import { createClientBrowser } from '@/lib/supabase'

interface NotificationManagerProps {
  enabled?: boolean
}

/**
 * NotificationManager - Gerenciador Global de Notificações
 * 
 * Funcionalidades:
 * - Solicita permissão de notificação na primeira carga
 * - Monitora mensagens em tempo real globalmente
 * - Mostra notificações apenas para conversas NÃO abertas
 * - Toca som e mostra notificação do navegador
 * - Botão para habilitar/desabilitar notificações
 * 
 * 🔐 Multi-tenant: Gets clientId from authenticated session
 * 
 * Adicione no layout.tsx como:
 * <NotificationManager enabled={true} />
 */
export function NotificationManager({ enabled = true }: NotificationManagerProps) {
  const pathname = usePathname()
  const hasRequestedPermissionRef = useRef(false)
  const pathnameRef = useRef(pathname)
  // 🔐 Multi-tenant: Get clientId from authenticated session
  const [clientId, setClientId] = useState<string | null>(null)
  const clientIdRef = useRef<string | null>(null)
  
  // 🔐 Multi-tenant: Fetch clientId from authenticated session
  useEffect(() => {
    const fetchClientId = async () => {
      try {
        const supabase = createClientBrowser()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('client_id')
            .eq('id', user.id)
            .single()
          
          if (profile?.client_id) {
            setClientId(profile.client_id)
            clientIdRef.current = profile.client_id
          }
        }
      } catch (error) {
        // Failed to get clientId - notifications won't work for tenant isolation
      }
    }
    
    fetchClientId()
  }, [])
  
  // Atualizar ref quando pathname mudar
  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])
  
  const { 
    permissionStatus, 
    requestPermission, 
    notify, 
    isSupported 
  } = useNotifications({
    enabled,
    sound: false, // Deixar o navegador usar som nativo da notificação
    soundUrl: undefined,
  })
  
  const notifyRef = useRef(notify)
  
  // Atualizar ref quando notify mudar
  useEffect(() => {
    notifyRef.current = notify
  }, [notify])

  // Solicitar permissão automaticamente na primeira carga (apenas uma vez)
  useEffect(() => {
    if (
      enabled && 
      isSupported && 
      permissionStatus === 'default' && 
      !hasRequestedPermissionRef.current
    ) {
      hasRequestedPermissionRef.current = true
      
      // Delay de 2 segundos para não ser intrusivo
      const timer = setTimeout(() => {
        requestPermission()
      }, 2000)
      
      return () => clearTimeout(timer)
    }
  }, [enabled, isSupported, permissionStatus, requestPermission])

  // Callback quando nova mensagem chega - usar refs para evitar dependências instáveis
  const handleNewMessage = useCallback(async (notification: MessageNotification) => {
    const normalizePhone = (value: string | null | undefined) => {
      if (!value) return null
      const digits = value.replace(/\D/g, '')
      return digits.replace(/^55/, '')
    }

    // 🔐 Multi-tenant: Skip if no clientId available
    const currentClientId = clientIdRef.current
    if (!currentClientId) {
      return
    }
    
    const currentPathname = pathnameRef.current
    const currentPhone = currentPathname?.includes('/conversations/') 
      ? currentPathname.split('/conversations/')[1]?.split('?')[0]
      : (currentPathname?.includes('/dashboard/chat') && typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('phone')
        : null)

    const normalizedCurrentPhone = normalizePhone(currentPhone)
    const normalizedNotificationPhone = normalizePhone(notification.phone)

    // Extra safety: only notify for incoming (human) messages.
    // `notification.message` is typically the JSON stored in n8n_chat_histories.
    try {
      const parsed = JSON.parse(notification.message)
      if (parsed?.type && parsed.type !== 'human') {
        return
      }
    } catch {
      // If it isn't JSON, keep going (fallback)
    }

    if (normalizedCurrentPhone !== normalizedNotificationPhone) {
      // Buscar nome do cliente diretamente do banco
      let clientName = notification.phone
      
      try {
        // 🔐 Multi-tenant: API uses authenticated session to get clientId
        const response = await fetch(`/api/conversations`)
        
        if (response.ok) {
          const data = await response.json()
          
          // Buscar com telefone exato OU sem código do país
          const phoneVariations = [
            notification.phone,
            notification.phone.replace(/^55/, ''), // Remove código do Brasil
            '55' + notification.phone, // Adiciona código do Brasil
          ]
          
          const conversation = data.conversations?.find((c: any) => 
            phoneVariations.includes(c.telefone) || 
            phoneVariations.includes(c.phone) ||
            phoneVariations.includes(c.session_id)
          )
          
          if (conversation?.nome || conversation?.name) {
            clientName = conversation.nome || conversation.name
          }
        }
      } catch (error) {
        // Se falhar, tentar buscar direto do Supabase
        try {
          const supabase = createClientBrowser()
          // 🔐 Multi-tenant: Use clientId from ref
          const { data: cliente } = await supabase
            .from('clientes_whatsapp')
            .select('nome')
            .eq('telefone', notification.phone)
            .eq('client_id', currentClientId)
            .single()
          
          if (cliente?.nome) {
            clientName = cliente.nome
          }
        } catch {
          // Usar telefone como fallback
        }
      }

      // Extrair mensagem limpa
      let cleanMessage = notification.message
      try {
        // Se for JSON do tipo {"type":"human","content":"..."}
        const parsed = JSON.parse(notification.message)
        if (parsed.content) {
          cleanMessage = parsed.content
        }
      } catch {
        // Se não for JSON, usar como está
      }

      const truncatedMessage = cleanMessage.length > 60
        ? cleanMessage.substring(0, 60) + '...'
        : cleanMessage

      // Usar o título diretamente sem depender do metadata
      notifyRef.current(`💬 ${clientName}`, {
        body: `Mensagem: ${truncatedMessage}`,
        tag: `message-${notification.phone}`,
        requireInteraction: false,
        // Always silent to avoid "sound without notification" behavior on some systems.
        // If we want sound, it should be explicitly handled in-app.
        silent: true,
        data: {
          url: `/conversations/${notification.phone}`,
        },
      })
    }
  }, []) // SEM dependências - usar refs

  // 🔐 Multi-tenant: Monitor messages with clientId for tenant isolation
  // Pass null until clientId is loaded - hook will wait to set up subscription
  useGlobalRealtimeNotifications({ 
    clientId, 
    onNewMessage: handleNewMessage 
  })

  // Não renderizar UI se notificações não suportadas
  if (!isSupported || !enabled) {
    return null
  }

  return null // Componente invisível - apenas gerencia notificações
}

/**
 * NotificationToggle - Botão para habilitar/desabilitar notificações
 * 
 * Use no header da aplicação:
 * <NotificationToggle />
 */
export function NotificationToggle() {
  const { permissionStatus, requestPermission, isSupported } = useNotifications()

  if (!isSupported) {
    return null
  }

  const handleToggle = async () => {
    if (permissionStatus !== 'granted') {
      await requestPermission()
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      title={
        permissionStatus === 'granted' 
          ? 'Notificações ativadas' 
          : 'Ativar notificações'
      }
    >
      {permissionStatus === 'granted' ? (
        <Bell className="h-5 w-5 text-mint-600" />
      ) : (
        <BellOff className="h-5 w-5 text-silver-400" />
      )}
    </Button>
  )
}

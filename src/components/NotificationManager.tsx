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
        console.error('[NotificationManager] Failed to get clientId:', error)
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
    // 🔐 Multi-tenant: Skip if no clientId available
    const currentClientId = clientIdRef.current
    if (!currentClientId) {
      return
    }
    
    const currentPathname = pathnameRef.current
    const currentPhone = currentPathname?.includes('/conversations/') 
      ? currentPathname.split('/conversations/')[1]?.split('?')[0]
      : null

    if (currentPhone !== notification.phone) {
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
        silent: false, // Garantir que não seja silencioso
        data: {
          url: `/conversations/${notification.phone}`,
        },
      })
      
      // Tocar som manualmente como fallback
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVqzn77BdGAg+ltryxnMpBSp9y/DajzsIGGS57OihUBELTKXh8bllHAU2jdXzzn0vBSp9y/DajzsIGGS57OihUBELTKXh8bllHAU2jdXzzn0vBSp9y/DajzsIGGS57OihUBELTKXh8bllHAU2jdXzzn0vBSp9y/DajzsIGGS57OihUBELTKXh8bllHAU2jdXzzn0vBSp9y/DajzsIGGS57OihUBELTKXh8bllHAU2jdXzzn0vBSp9y/DajzsIGGS57OihUBELTKXh8bllHAU2jdXzzn0vBSp9y/DajzsIGGS57OihUBELTKXh8bllHAU2jdXzzn0vBSp9y/DajzsI')
        audio.volume = 0.3
        audio.play().catch(() => {})
      } catch {
        // Silenciosamente ignora erro de som
      }
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

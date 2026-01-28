'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
// Helper para formatar data relativa (fallback se date-fns não estiver disponível)
const formatRelativeTime = (date: string): string => {
  try {
    const now = new Date()
    const then = new Date(date)
    const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'agora'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}min atrás`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h atrás`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d atrás`
    
    return then.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  } catch {
    return 'há pouco'
  }
}

interface Notification {
  id: string
  type: 'new_conversation' | 'human_transfer' | 'system_alert' | 'message_received'
  title: string
  message: string
  link: string | null
  read: boolean
  createdAt: string
}

interface NotificationBellProps {
  clientId?: string
}

/**
 * NotificationBell - Componente de notificações
 * 
 * Exibe um sino com badge de contador e dropdown com lista de notificações.
 * Preparado para integrar com hook useNotifications quando disponível.
 */
export function NotificationBell({ clientId }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  
  // TODO: Substituir por hook useNotifications quando disponível
  // const { notifications, unreadCount, isLoading, markAsRead } = useNotifications()
  
  // Mock data para desenvolvimento
  const notifications: Notification[] = []
  const unreadCount: number = 0
  const isLoading: boolean = false
  
  const markAsRead = async (notificationId: string) => {
    // TODO: Implementar quando hook estiver disponível
    console.log('Mark as read:', notificationId)
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id)
    }
    
    if (notification.link) {
      window.location.href = notification.link
    }
    
    setOpen(false)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative p-2 hover:bg-muted rounded-lg transition-colors"
          aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
        >
          <Bell className="h-5 w-5 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-gradient-to-r from-primary to-secondary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-lg">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-80 md:w-96 p-0 max-h-[400px]"
        align="end"
        sideOffset={8}
      >
        <div className="flex flex-col max-h-[400px]">
          {/* Header */}
          <div className="p-4 border-b bg-gradient-to-r from-primary/10 to-secondary/10">
            <div className="flex items-center justify-between">
              <h3 className="font-poppins font-semibold text-foreground">Notificações</h3>
              {unreadCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {unreadCount} não {unreadCount === 1 ? 'lida' : 'lidas'}
                </span>
              )}
            </div>
          </div>

          {/* Lista de Notificações */}
          <div className="overflow-y-auto max-h-[350px]">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                <p className="text-sm">Carregando notificações...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-sm text-muted-foreground font-medium">Nenhuma notificação</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Você será notificado quando houver novas atualizações
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "w-full p-4 text-left hover:bg-muted transition-colors",
                      "focus:outline-none focus:bg-muted",
                      !notification.read && "bg-secondary/5"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Indicador de não lida */}
                      {!notification.read && (
                        <div className="mt-1.5 w-2 h-2 bg-gradient-to-r from-primary to-secondary rounded-full flex-shrink-0" />
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className={cn(
                            "text-sm font-semibold",
                            !notification.read ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {notification.title}
                          </h4>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                            {formatRelativeTime(notification.createdAt)}
                          </span>
                        </div>
                        <p className={cn(
                          "text-xs line-clamp-2",
                          !notification.read ? "text-foreground/80" : "text-muted-foreground"
                        )}>
                          {notification.message}
                        </p>

                        {/* Badge de tipo */}
                        <div className="mt-2">
                          <span className={cn(
                            "inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold",
                            notification.type === 'new_conversation' && "bg-primary/20 text-primary",
                            notification.type === 'human_transfer' && "bg-orange-500/20 text-orange-600 dark:text-orange-400",
                            notification.type === 'system_alert' && "bg-secondary/20 text-secondary",
                            notification.type === 'message_received' && "bg-green-500/20 text-green-600 dark:text-green-400"
                          )}>
                            {notification.type === 'new_conversation' && 'Nova Conversa'}
                            {notification.type === 'human_transfer' && 'Transferência'}
                            {notification.type === 'system_alert' && 'Sistema'}
                            {notification.type === 'message_received' && 'Mensagem'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t bg-muted">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setOpen(false)}
              >
                Fechar
              </Button>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


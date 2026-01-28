'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/StatusBadge'
import { formatPhone, formatDateTime, getInitials, truncateText } from '@/lib/utils'
import type { ConversationWithCount } from '@/lib/types'
import { MessageCircle, User, Workflow, Bot, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { EmptyStateSimple } from '@/components/EmptyState'

interface ConversationListProps {
  conversations: ConversationWithCount[]
  loading: boolean
  clientId?: string
  currentPhone?: string
  lastUpdatePhone?: string | null // Mantido para animação de pulse
  onConversationOpen?: (phone: string) => void
  onConversationClick?: () => void // Callback para fechar sidebar mobile
  onMarkAsRead?: (phone: string) => void // Callback para marcar conversa como lida
  conversationItemsRef?: React.MutableRefObject<Map<string, HTMLDivElement>> // Ref para elementos das conversas (para scroll automático)
}

export const ConversationList = ({
  conversations,
  loading,
  clientId = 'demo-client-id',
  currentPhone,
  lastUpdatePhone, // Mantido por compatibilidade mas não usado
  onConversationOpen,
  onConversationClick,
  onMarkAsRead,
  conversationItemsRef,
}: ConversationListProps) => {
  const router = useRouter()

  const handleConversationClick = (phone: string) => {
    // Fechar sidebar mobile se callback fornecido
    if (onConversationClick) {
      onConversationClick()
    }

    // Se callback onConversationOpen fornecido, usar ele (não redirecionar)
    // Caso contrário, redirecionar para página de chat
    if (onConversationOpen) {
      onConversationOpen(phone)
    } else {
      router.push(`/dashboard/chat?phone=${phone}&client_id=${clientId}`)
    }

    // Marcar conversa como lida ao abrir
    if (onMarkAsRead) {
      onMarkAsRead(phone)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="text-muted-foreground">Carregando...</span>
      </div>
    )
  }

  // Empty state será gerenciado pelo componente pai com contexto de filtro
  if (conversations.length === 0) {
    return null // Deixa o pai gerenciar o empty state
  }

  return (
    <div>
      {conversations.map((conversation) => {
        const isActive = currentPhone === conversation.phone
        // Usar unread_count do Supabase (persistente)
        const hasUnread = (conversation.unread_count ?? 0) > 0 && !isActive

        // Detectar conversas muito recentes (últimas 5 minutos)
        const isVeryRecent = (() => {
          if (!conversation.last_update) return false
          const lastUpdate = new Date(conversation.last_update).getTime()
          const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
          return lastUpdate > fiveMinutesAgo
        })()

        return (
          <div
            key={conversation.id}
            ref={(el) => {
              // Registrar elemento no ref para scroll automático
              if (el && conversationItemsRef?.current) {
                conversationItemsRef.current.set(conversation.phone, el)
              } else if (!el && conversationItemsRef?.current) {
                // Limpar ref quando elemento é desmontado
                conversationItemsRef.current.delete(conversation.phone)
              }
            }}
            className={cn(
              "group relative p-4 cursor-pointer transition-all duration-200 border-b border-border/50",
              isActive
                ? "bg-gradient-to-r from-primary/10 to-transparent border-l-2 border-l-primary"
                : "hover:bg-muted/50",
              hasUnread && !isActive && "bg-secondary/5 border-l-secondary"
            )}
            onClick={() => handleConversationClick(conversation.phone)}
          >
            <div className="flex items-start gap-3">
              {/* Avatar com Badge de Status */}
              <div className="relative flex-shrink-0">
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center font-semibold text-white text-xs bg-gradient-to-br from-secondary to-primary"
                >
                  {getInitials(conversation.name || 'Sem nome')}
                </div>

                {/* Badge de status no canto inferior direito do avatar */}
                {conversation.status === 'fluxo_inicial' && (
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-[#9b59b6] rounded-full border-2 border-card flex items-center justify-center">
                    <Workflow className="h-2.5 w-2.5 text-white" />
                  </div>
                )}
                {conversation.status === 'humano' && (
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-primary rounded-full border-2 border-card flex items-center justify-center">
                    <User className="h-2.5 w-2.5 text-white" />
                  </div>
                )}
                {conversation.status === 'bot' && (
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-secondary rounded-full border-2 border-card flex items-center justify-center">
                    <Bot className="h-2.5 w-2.5 text-white" />
                  </div>
                )}

                {/* Indicador de "novo" - só aparece se não lida */}
                {isVeryRecent && hasUnread && (
                  <div className="absolute -top-1 -right-1 z-20">
                    <div className="w-2.5 h-2.5 bg-primary rounded-full border-2 border-card" />
                  </div>
                )}
              </div>

              {/* Informações Principais */}
              <div className="flex-1 min-w-0">
                {/* Nome e Timestamp */}
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-foreground truncate">
                      {conversation.name || formatPhone(conversation.phone)}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatPhone(conversation.phone)}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 ml-2 flex-shrink-0">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(conversation.last_update)}
                    </span>
                    {hasUnread && !isActive && (
                      <div className="bg-gradient-to-r from-primary to-secondary text-white text-[11px] rounded-full min-w-[22px] h-5 px-2 flex items-center justify-center font-bold shadow-glow">
                        {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                      </div>
                    )}
                  </div>
                </div>

                {/* Última Mensagem */}
                <div className="mb-1.5">
                  <p className={cn(
                    "text-sm line-clamp-2 leading-relaxed",
                    hasUnread && !isActive
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground"
                  )}>
                    {conversation.last_message
                      ? truncateText(conversation.last_message, 60)
                      : "Nenhuma mensagem ainda"
                    }
                  </p>
                </div>

                {/* Tags e Indicadores */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Tag de Status Principal */}
                  {conversation.status === 'humano' && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium border border-primary/30 text-primary bg-primary/10">
                      <User className="h-3 w-3" />
                      Atendimento Humano
                    </span>
                  )}
                  {conversation.status === 'fluxo_inicial' && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium border border-[#9b59b6]/30 text-[#9b59b6] bg-[#9b59b6]/10">
                      <Workflow className="h-3 w-3" />
                      Em Flow Interativo
                    </span>
                  )}
                  {conversation.status === 'bot' && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium border border-secondary/30 text-secondary bg-secondary/10">
                      <Bot className="h-3 w-3" />
                      Bot Respondendo
                    </span>
                  )}
                  {conversation.status === 'transferido' && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium border border-orange-400/30 text-orange-400 bg-orange-400/10">
                      <ArrowRight className="h-3 w-3" />
                      Aguardando Humano
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

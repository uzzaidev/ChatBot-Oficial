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
        <span className="text-white/50">Carregando...</span>
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
            className={cn(
              "group relative p-4 cursor-pointer transition-all duration-200 border-b border-white/5",
              isActive 
                ? "bg-gradient-to-r from-[#1ABC9C]/10 to-transparent border-l-2 border-l-[#1ABC9C]" 
                : "hover:bg-white/5",
              hasUnread && !isActive && "bg-[#2E86AB]/5 border-l-[#2E86AB]",
              isVeryRecent && "animate-pulse"
            )}
            onClick={() => handleConversationClick(conversation.phone)}
          >
            <div className="flex items-start gap-3">
              {/* Avatar com Badge de Status */}
              <div className="relative flex-shrink-0">
                <div
                  className="h-12 w-12 rounded-full flex items-center justify-center font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #2E86AB, #1ABC9C)' }}
                >
                  {getInitials(conversation.name || 'Sem nome')}
                </div>
                
                {/* Badge de status no canto inferior direito do avatar */}
                {conversation.status === 'fluxo_inicial' && (
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-[#9b59b6] rounded-full border-2 border-[#252525] flex items-center justify-center">
                    <Workflow className="h-2.5 w-2.5 text-white" />
                  </div>
                )}
                {conversation.status === 'humano' && (
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-[#1ABC9C] rounded-full border-2 border-[#252525] flex items-center justify-center">
                    <User className="h-2.5 w-2.5 text-white" />
                  </div>
                )}
                {conversation.status === 'bot' && (
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-[#2E86AB] rounded-full border-2 border-[#252525] flex items-center justify-center">
                    <Bot className="h-2.5 w-2.5 text-white" />
                  </div>
                )}

                {/* Indicador de "novo" (últimas 5min) */}
                {isVeryRecent && (
                  <div className="absolute -top-1 -right-1 z-20">
                    <div className="w-3 h-3 bg-[#1ABC9C] rounded-full border-2 border-[#252525] shadow-lg animate-ping" />
                    <div className="absolute top-0 left-0 w-3 h-3 bg-[#1ABC9C] rounded-full border-2 border-[#252525]" />
                  </div>
                )}
              </div>

              {/* Informações Principais */}
              <div className="flex-1 min-w-0">
                {/* Nome e Timestamp */}
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-white truncate">
                      {conversation.name || formatPhone(conversation.phone)}
                    </h3>
                    <p className="text-xs text-white/40 mt-0.5">
                      {formatPhone(conversation.phone)}
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1.5 ml-2 flex-shrink-0">
                    <span className="text-xs text-white/50 whitespace-nowrap">
                      {formatDateTime(conversation.last_update)}
                    </span>
                    {hasUnread && !isActive && (
                      <div className="bg-gradient-to-r from-[#1ABC9C] to-[#2E86AB] text-white text-[11px] rounded-full min-w-[22px] h-5 px-2 flex items-center justify-center font-bold shadow-lg" style={{ boxShadow: '0 0 10px rgba(26, 188, 156, 0.3)' }}>
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
                      ? "font-semibold text-white" 
                      : "text-white/60"
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
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium border" style={{ borderColor: 'rgba(26, 188, 156, 0.3)', color: '#1ABC9C', background: 'rgba(26, 188, 156, 0.1)' }}>
                      <User className="h-3 w-3" />
                      Atendimento Humano
                    </span>
                  )}
                  {conversation.status === 'fluxo_inicial' && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium border" style={{ borderColor: 'rgba(155, 89, 182, 0.3)', color: '#9b59b6', background: 'rgba(155, 89, 182, 0.1)' }}>
                      <Workflow className="h-3 w-3" />
                      Em Flow Interativo
                    </span>
                  )}
                  {conversation.status === 'bot' && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium border" style={{ borderColor: 'rgba(46, 134, 171, 0.3)', color: '#2E86AB', background: 'rgba(46, 134, 171, 0.1)' }}>
                      <Bot className="h-3 w-3" />
                      Bot Respondendo
                    </span>
                  )}
                  {conversation.status === 'transferido' && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium border" style={{ borderColor: 'rgba(251, 146, 60, 0.3)', color: '#fb923c', background: 'rgba(251, 146, 60, 0.1)' }}>
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

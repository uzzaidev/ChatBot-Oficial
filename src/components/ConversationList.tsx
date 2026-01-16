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
}

export const ConversationList = ({
  conversations,
  loading,
  clientId = 'demo-client-id',
  currentPhone,
  lastUpdatePhone, // Mantido por compatibilidade mas não usado
  onConversationOpen,
  onConversationClick,
}: ConversationListProps) => {
  const router = useRouter()

  const handleConversationClick = (phone: string) => {
    // Notify parent component if callback provided
    if (onConversationOpen) {
      onConversationOpen(phone)
    }

    // Fechar sidebar mobile se callback fornecido
    if (onConversationClick) {
      onConversationClick()
    }

    router.push(`/dashboard/chat?phone=${phone}&client_id=${clientId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="text-erie-black-600">Carregando...</span>
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
              "group relative p-4 cursor-pointer transition-all duration-200",
              "border-l-4 border-b border-uzz-silver/20",
              "hover:shadow-md hover:bg-gradient-to-r hover:from-gray-50 hover:to-white",
              isActive 
                ? "bg-gradient-to-r from-uzz-mint/15 to-uzz-blue/15 border-l-uzz-mint shadow-sm" 
                : "",
              hasUnread && !isActive && "bg-uzz-blue/5 border-l-uzz-blue",
              isVeryRecent && "animate-pulse"
            )}
            onClick={() => handleConversationClick(conversation.phone)}
          >
            <div className="flex items-start gap-4">
              {/* Avatar com Badge de Status */}
              <div className="relative flex-shrink-0">
                <Avatar className="h-16 w-16 ring-2 ring-white shadow-md">
                  <AvatarFallback className="bg-gradient-to-br from-uzz-mint to-uzz-blue text-white text-lg font-poppins font-bold">
                    {getInitials(conversation.name || 'Sem nome')}
                  </AvatarFallback>
                </Avatar>
                
                {/* Badge de status no canto inferior direito do avatar */}
                <div className="absolute -bottom-1 -right-1 z-10">
                  <StatusBadge 
                    status={conversation.status} 
                    showIcon={true} 
                    size="sm"
                  />
                </div>

                {/* Indicador de "novo" (últimas 5min) */}
                {isVeryRecent && (
                  <div className="absolute -top-1 -right-1 z-20">
                    <div className="w-3 h-3 bg-uzz-mint rounded-full border-2 border-white shadow-lg animate-ping" />
                    <div className="absolute top-0 left-0 w-3 h-3 bg-uzz-mint rounded-full border-2 border-white" />
                  </div>
                )}
              </div>

              {/* Informações Principais */}
              <div className="flex-1 min-w-0">
                {/* Nome e Timestamp */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className={cn(
                      "font-poppins font-bold text-base truncate mb-0.5",
                      hasUnread && !isActive ? "text-uzz-black" : "text-uzz-black"
                    )}>
                      {conversation.name || formatPhone(conversation.phone)}
                    </h3>
                    <p className="text-xs text-uzz-silver">
                      {formatPhone(conversation.phone)}
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1.5 ml-2 flex-shrink-0">
                    <span className="text-xs text-uzz-silver whitespace-nowrap">
                      {formatDateTime(conversation.last_update)}
                    </span>
                    {hasUnread && !isActive && (
                      <div className="bg-gradient-to-r from-uzz-mint to-uzz-blue text-white text-[11px] rounded-full min-w-[22px] h-5 px-2 flex items-center justify-center font-bold shadow-lg shadow-uzz-mint/30">
                        {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                      </div>
                    )}
                  </div>
                </div>

                {/* Última Mensagem */}
                <div className="mb-2">
                  <p className={cn(
                    "text-sm line-clamp-2",
                    hasUnread && !isActive 
                      ? "font-semibold text-uzz-black" 
                      : "text-gray-600"
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
                    <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 bg-green-100 text-green-700 rounded-full font-bold border border-green-200">
                      <User className="h-3 w-3" />
                      Atendimento Humano
                    </span>
                  )}
                  {conversation.status === 'fluxo_inicial' && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full font-bold border border-purple-200">
                      <Workflow className="h-3 w-3" />
                      Em Flow Interativo
                    </span>
                  )}
                  {conversation.status === 'bot' && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full font-bold border border-blue-200">
                      <Bot className="h-3 w-3" />
                      Bot Respondendo
                    </span>
                  )}
                  {conversation.status === 'transferido' && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 bg-orange-100 text-orange-700 rounded-full font-bold border border-orange-200">
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

'use client'

import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatPhone, formatDateTime, getInitials, truncateText } from '@/lib/utils'
import type { ConversationWithCount } from '@/lib/types'
import { MessageCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'

interface ConversationListProps {
  conversations: ConversationWithCount[]
  loading: boolean
  clientId?: string
  currentPhone?: string
  lastUpdatePhone?: string | null
  onConversationOpen?: (phone: string) => void
}

export const ConversationList = ({
  conversations,
  loading,
  clientId = 'demo-client-id',
  currentPhone,
  lastUpdatePhone,
  onConversationOpen,
}: ConversationListProps) => {
  const router = useRouter()
  const [unreadConversations, setUnreadConversations] = useState<Set<string>>(new Set())
  const [recentlyUpdated, setRecentlyUpdated] = useState<string | null>(null)

  // Track new messages for conversations not currently open
  useEffect(() => {
    if (lastUpdatePhone && lastUpdatePhone !== currentPhone) {
      console.log('[ConversationList] Nova mensagem de:', lastUpdatePhone, 'Conversa atual:', currentPhone)
      setUnreadConversations(prev => new Set(prev).add(lastUpdatePhone))
      
      // Add visual pulse animation with cleanup
      setRecentlyUpdated(lastUpdatePhone)
      const timer = setTimeout(() => setRecentlyUpdated(null), 2000)
      return () => {
        clearTimeout(timer)
      }
    }
    // No cleanup needed if condition not met
    return undefined
  }, [lastUpdatePhone, currentPhone])

  // Clear unread when conversation becomes active
  useEffect(() => {
    if (currentPhone) {
      setUnreadConversations(prev => {
        const newSet = new Set(prev)
        newSet.delete(currentPhone)
        return newSet
      })
    }
  }, [currentPhone])

  const handleConversationClick = (phone: string) => {
    // Clear unread for this conversation
    setUnreadConversations(prev => {
      const newSet = new Set(prev)
      newSet.delete(phone)
      return newSet
    })
    
    // Notify parent component if callback provided
    if (onConversationOpen) {
      onConversationOpen(phone)
    }
    
    router.push(`/dashboard/conversations/${phone}?client_id=${clientId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="text-erie-black-600">Carregando...</span>
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center px-4">
        <MessageCircle className="h-12 w-12 text-silver-300 mb-4" />
        <span className="text-erie-black-600">
          Nenhuma conversa encontrada
        </span>
      </div>
    )
  }

  return (
    <div>
      {conversations.map((conversation) => {
        const isActive = currentPhone === conversation.phone
        const hasUnread = unreadConversations.has(conversation.phone)
        const isRecentlyUpdated = recentlyUpdated === conversation.phone
        const statusColor = conversation.status === 'bot'
          ? 'bg-mint-100 text-mint-800 border-mint-200'
          : conversation.status === 'waiting'
          ? 'bg-gold-100 text-gold-800 border-gold-200'
          : 'bg-brand-blue-100 text-brand-blue-800 border-brand-blue-200'

        return (
          <div
            key={conversation.id}
            className={cn(
              "flex items-center gap-3 p-3 cursor-pointer transition-colors duration-300 border-b border-silver-200",
              isActive ? "bg-mint-50" : "hover:bg-silver-50",
              hasUnread && !isActive && "bg-brand-blue-50",
              isRecentlyUpdated && "animate-pulse"
            )}
            onClick={() => handleConversationClick(conversation.phone)}
          >
            {/* Avatar */}
            <Avatar className="h-12 w-12 flex-shrink-0">
              <AvatarFallback className="bg-mint-500 text-white text-sm">
                {getInitials(conversation.name || 'Sem nome')}
              </AvatarFallback>
            </Avatar>

            {/* Info da Conversa */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className={cn(
                  "font-semibold text-sm truncate text-erie-black-900",
                  hasUnread && !isActive && "font-bold"
                )}>
                  {conversation.name}
                </span>
                <span className="text-xs text-erie-black-500 ml-2 flex-shrink-0">
                  {formatDateTime(conversation.last_update)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <p className={cn(
                  "text-xs text-erie-black-600 truncate flex-1",
                  hasUnread && !isActive && "font-semibold text-erie-black-900"
                )}>
                  {conversation.last_message
                    ? truncateText(conversation.last_message, 35)
                    : formatPhone(conversation.phone)
                  }
                </p>

                {/* Badge de Status (pequeno) */}
                <Badge
                  className={cn("ml-2 text-[10px] px-1.5 py-0 h-5 border", statusColor)}
                  variant="secondary"
                >
                  {conversation.status === 'bot' ? 'Bot' : conversation.status === 'waiting' ? 'Aguardando' : 'Humano'}
                </Badge>
              </div>
            </div>

            {/* Indicador de mensagens não lidas */}
            {hasUnread && !isActive && (
              <div className="bg-mint-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-semibold flex-shrink-0">
                •
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

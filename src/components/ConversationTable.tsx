'use client'

import { formatPhone, formatDateTime, getInitials, truncateText } from '@/lib/utils'
import type { ConversationWithCount } from '@/lib/types'
import { MessageCircle, User, Workflow, Bot, ArrowRight, MoreVertical } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ConversationTableProps {
  conversations: ConversationWithCount[]
  loading: boolean
  clientId?: string
  currentPhone?: string
  onConversationOpen?: (phone: string) => void
  onConversationClick?: () => void
}

export const ConversationTable = ({
  conversations,
  loading,
  clientId = 'demo-client-id',
  currentPhone,
  onConversationOpen,
  onConversationClick,
}: ConversationTableProps) => {
  const router = useRouter()

  const handleConversationClick = (phone: string) => {
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
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'humano':
        return (
          <Badge className="border-[#1ABC9C]/30 text-[#1ABC9C] bg-[#1ABC9C]/10 text-xs">
            <User className="h-3 w-3 mr-1" />
            Humano
          </Badge>
        )
      case 'fluxo_inicial':
        return (
          <Badge className="border-[#9b59b6]/30 text-[#9b59b6] bg-[#9b59b6]/10 text-xs">
            <Workflow className="h-3 w-3 mr-1" />
            Em Flow
          </Badge>
        )
      case 'bot':
        return (
          <Badge className="border-[#2E86AB]/30 text-[#2E86AB] bg-[#2E86AB]/10 text-xs">
            <Bot className="h-3 w-3 mr-1" />
            Bot
          </Badge>
        )
      case 'transferido':
        return (
          <Badge className="border-orange-400/30 text-orange-400 bg-orange-400/10 text-xs">
            <ArrowRight className="h-3 w-3 mr-1" />
            Transferido
          </Badge>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1ABC9C]"></div>
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <MessageCircle className="h-12 w-12 text-white/30 mb-4" />
        <p className="text-white/60">Nenhuma conversa encontrada</p>
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-white/5" style={{ background: '#252525' }}>
      <Table className="bg-transparent">
        <TableHeader>
          <TableRow className="border-white/5 hover:bg-transparent" style={{ background: 'rgba(37, 37, 37, 0.8)' }}>
            <TableHead className="text-white/70 font-medium text-xs uppercase tracking-wider px-4 py-3" style={{ minWidth: '200px' }}>
              Contato
            </TableHead>
            <TableHead className="text-white/70 font-medium text-xs uppercase tracking-wider px-4 py-3" style={{ minWidth: '150px' }}>
              Status
            </TableHead>
            <TableHead className="text-white/70 font-medium text-xs uppercase tracking-wider px-4 py-3" style={{ minWidth: '200px' }}>
              Última Mensagem
            </TableHead>
            <TableHead className="text-white/70 font-medium text-xs uppercase tracking-wider px-4 py-3" style={{ minWidth: '120px' }}>
              Telefone
            </TableHead>
            <TableHead className="text-white/70 font-medium text-xs uppercase tracking-wider px-4 py-3" style={{ minWidth: '120px' }}>
              Última Atualização
            </TableHead>
            <TableHead className="text-white/70 font-medium w-12 px-4 py-3"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {conversations.map((conversation) => {
            const isActive = currentPhone === conversation.phone
            const hasUnread = (conversation.unread_count ?? 0) > 0 && !isActive

            // Detectar conversas muito recentes (últimas 5 minutos)
            const isVeryRecent = (() => {
              if (!conversation.last_update) return false
              const lastUpdate = new Date(conversation.last_update).getTime()
              const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
              return lastUpdate > fiveMinutesAgo
            })()

            return (
              <TableRow
                key={conversation.id}
                className={cn(
                  "border-white/5 cursor-pointer transition-all bg-transparent",
                  isActive
                    ? "bg-gradient-to-r from-[#1ABC9C]/10 to-transparent"
                    : "hover:bg-white/5",
                  hasUnread && !isActive && "bg-[#2E86AB]/5",
                  isVeryRecent && "animate-pulse"
                )}
                onClick={() => handleConversationClick(conversation.phone)}
              >
                {/* Contato */}
                <TableCell className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div
                        className="h-10 w-10 rounded-full flex items-center justify-center font-semibold text-white text-sm"
                        style={{ background: 'linear-gradient(135deg, #2E86AB, #1ABC9C)' }}
                      >
                        {getInitials(conversation.name || 'Sem nome')}
                      </div>
                      {conversation.status === 'fluxo_inicial' && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-[#9b59b6] rounded-full border-2 border-[#252525] flex items-center justify-center">
                          <Workflow className="h-2 w-2 text-white" />
                        </div>
                      )}
                      {conversation.status === 'humano' && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-[#1ABC9C] rounded-full border-2 border-[#252525] flex items-center justify-center">
                          <User className="h-2 w-2 text-white" />
                        </div>
                      )}
                      {conversation.status === 'bot' && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-[#2E86AB] rounded-full border-2 border-[#252525] flex items-center justify-center">
                          <Bot className="h-2 w-2 text-white" />
                        </div>
                      )}
                      {isVeryRecent && (
                        <div className="absolute -top-0.5 -right-0.5 z-20">
                          <div className="w-2.5 h-2.5 bg-[#1ABC9C] rounded-full border-2 border-[#252525] shadow-lg animate-ping" />
                          <div className="absolute top-0 left-0 w-2.5 h-2.5 bg-[#1ABC9C] rounded-full border-2 border-[#252525]" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={cn(
                          "font-semibold text-sm truncate",
                          hasUnread && !isActive ? "text-white" : "text-white/90"
                        )}>
                          {conversation.name || formatPhone(conversation.phone)}
                        </h3>
                        {hasUnread && !isActive && (
                          <div className="bg-gradient-to-r from-[#1ABC9C] to-[#2E86AB] text-white text-[10px] rounded-full min-w-[18px] h-4 px-1.5 flex items-center justify-center font-bold">
                            {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell className="py-3">
                  {getStatusBadge(conversation.status)}
                </TableCell>

                {/* Última Mensagem */}
                <TableCell className="py-3">
                  <p className={cn(
                    "text-sm truncate max-w-xs",
                    hasUnread && !isActive
                      ? "font-semibold text-white"
                      : "text-white/60"
                  )}>
                    {conversation.last_message
                      ? truncateText(conversation.last_message, 50)
                      : "Nenhuma mensagem ainda"
                    }
                  </p>
                </TableCell>

                {/* Telefone */}
                <TableCell className="py-3">
                  <span className="text-sm text-white/50 font-mono">
                    {formatPhone(conversation.phone)}
                  </span>
                </TableCell>

                {/* Última Atualização */}
                <TableCell className="py-3">
                  <span className="text-xs text-white/50">
                    {formatDateTime(conversation.last_update)}
                  </span>
                </TableCell>

                {/* Ações */}
                <TableCell className="py-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-white/50 hover:text-white hover:bg-white/5"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="bg-[#252525] border-white/10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenuItem
                        className="text-white/90 hover:bg-white/5 focus:bg-white/5"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleConversationClick(conversation.phone)
                        }}
                      >
                        Abrir Conversa
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-white/90 hover:bg-white/5 focus:bg-white/5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Ver Detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-white/90 hover:bg-white/5 focus:bg-white/5 text-red-400"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Arquivar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}


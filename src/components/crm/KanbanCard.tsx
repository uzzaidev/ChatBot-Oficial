'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Clock, User, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { CRMCard, CRMTag } from '@/lib/types'
import { CardStatusBadge } from './CardStatusBadge'
import { CardTagList } from './CardTagList'

export interface KanbanCardProps {
  card: CRMCard
  tags: CRMTag[]
  onClick?: () => void
  onMoveToColumn?: (columnId: string) => void
  isDragging?: boolean
  columns?: Array<{ id: string; name: string }>
}

const getInitials = (name: string): string => {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

const formatPhone = (phone: string | number): string => {
  const phoneStr = String(phone)
  if (phoneStr.length === 13) {
    // 5511999999999 -> +55 (11) 99999-9999
    return `+${phoneStr.slice(0, 2)} (${phoneStr.slice(2, 4)}) ${phoneStr.slice(4, 9)}-${phoneStr.slice(9)}`
  }
  return phoneStr
}

export const KanbanCard = ({
  card,
  tags,
  onClick,
  onMoveToColumn,
  isDragging = false,
  columns = [],
}: KanbanCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const contactName = card.contact?.name || 'Sem nome'
  const cardTags = tags.filter((tag) => card.tagIds?.includes(tag.id))

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-card border-border cursor-pointer',
        'hover:border-primary/50 hover:shadow-md',
        'transition-all duration-200',
        isDragging && 'opacity-50 shadow-lg border-primary',
        card.auto_status === 'awaiting_attendant' && 'border-l-4 border-l-destructive',
        card.auto_status === 'awaiting_client' && 'border-l-4 border-l-yellow-500'
      )}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      <CardContent className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-secondary to-primary text-primary-foreground text-sm font-medium">
              {getInitials(contactName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{contactName}</p>
            <p className="text-xs text-muted-foreground">{formatPhone(card.phone)}</p>
          </div>

          {/* Quick Actions Menu */}
          {columns.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {columns.map((col) => (
                  <DropdownMenuItem
                    key={col.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      onMoveToColumn?.(col.id)
                    }}
                  >
                    Mover para {col.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Last Message Preview */}
        {card.last_message_preview && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {card.last_message_preview}
          </p>
        )}

        {/* Tags */}
        {cardTags.length > 0 && <CardTagList tags={cardTags} maxVisible={3} />}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <CardStatusBadge status={card.auto_status} />

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {card.assigned_to && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span className="truncate max-w-[60px]">
                  {card.assignedUser?.name?.split(' ')[0] || 'Atribuído'}
                </span>
              </div>
            )}

            {card.last_message_at && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  {formatDistanceToNow(new Date(card.last_message_at), {
                    addSuffix: false,
                    locale: ptBR,
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

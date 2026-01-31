'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, Settings, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CRMColumn, CRMCard, CRMTag } from '@/lib/types'
import { KanbanCard } from './KanbanCard'
import { ColumnHeader } from './ColumnHeader'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface KanbanColumnProps {
  column: CRMColumn
  cards: CRMCard[]
  tags: CRMTag[]
  allColumns: CRMColumn[]
  onCardClick: (card: CRMCard) => void
  onCardMove: (cardId: string, columnId: string) => void
  onEditColumn?: () => void
  onDeleteColumn?: () => void
  isOver?: boolean
}

const COLUMN_COLORS: Record<string, string> = {
  mint: 'border-t-emerald-500',
  blue: 'border-t-blue-500',
  gold: 'border-t-yellow-500',
  red: 'border-t-red-500',
  purple: 'border-t-purple-500',
  green: 'border-t-green-500',
  gray: 'border-t-gray-500',
  default: 'border-t-primary',
}

export const KanbanColumn = ({
  column,
  cards,
  tags,
  allColumns,
  onCardClick,
  onCardMove,
  onEditColumn,
  onDeleteColumn,
  isOver = false,
}: KanbanColumnProps) => {
  const { setNodeRef } = useDroppable({ id: column.id })

  const sortedCards = [...cards].sort((a, b) => a.position - b.position)
  const cardIds = sortedCards.map((c) => c.id)

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col w-[320px] min-w-[320px] max-w-[320px]',
        'bg-card rounded-lg border border-border',
        'border-t-4',
        COLUMN_COLORS[column.color] || COLUMN_COLORS.default,
        isOver && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <ColumnHeader name={column.name} count={cards.length} icon={column.icon} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEditColumn && (
              <DropdownMenuItem onClick={onEditColumn}>
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </DropdownMenuItem>
            )}
            {onEditColumn && onDeleteColumn && <DropdownMenuSeparator />}
            {onDeleteColumn && (
              <DropdownMenuItem
                onClick={onDeleteColumn}
                className="text-destructive focus:text-destructive"
                disabled={column.is_default}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir coluna
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1 p-2">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {sortedCards.map((card) => (
              <KanbanCard
                key={card.id}
                card={card}
                tags={tags}
                columns={allColumns}
                onClick={() => onCardClick(card)}
                onMoveToColumn={(columnId) => onCardMove(card.id, columnId)}
              />
            ))}
          </div>
        </SortableContext>

        {cards.length === 0 && (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            Nenhum card nesta coluna
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  closestCorners,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { CRMColumn, CRMCard, CRMTag } from '@/lib/types'
import { KanbanColumn } from './KanbanColumn'
import { KanbanCard } from './KanbanCard'

interface KanbanBoardProps {
  columns: CRMColumn[]
  cards: CRMCard[]
  tags: CRMTag[]
  onMoveCard: (cardId: string, columnId: string, position?: number) => Promise<boolean>
  onCardClick: (card: CRMCard) => void
  onEditColumn?: (column: CRMColumn) => void
  onDeleteColumn?: (columnId: string) => void
}

export const KanbanBoard = ({
  columns,
  cards,
  tags,
  onMoveCard,
  onCardClick,
  onEditColumn,
  onDeleteColumn,
}: KanbanBoardProps) => {
  const [activeCard, setActiveCard] = useState<CRMCard | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px of movement required before drag starts
      },
    })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const card = cards.find((c) => c.id === active.id)
    if (card) {
      setActiveCard(card)
    }
  }, [cards])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event
    setOverId(over?.id as string | null)
  }, [])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      setActiveCard(null)
      setOverId(null)

      if (!over) return

      const cardId = active.id as string
      const overId = over.id as string

      // Find if overId is a column or another card
      const targetColumn = columns.find((col) => col.id === overId)
      const targetCard = cards.find((c) => c.id === overId)

      if (targetColumn) {
        // Dropped on a column
        await onMoveCard(cardId, targetColumn.id)
      } else if (targetCard) {
        // Dropped on another card - insert before it
        await onMoveCard(cardId, targetCard.column_id, targetCard.position)
      }
    },
    [columns, cards, onMoveCard]
  )

  const handleDragCancel = useCallback(() => {
    setActiveCard(null)
    setOverId(null)
  }, [])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <ScrollArea className="w-full h-full">
        <div className="flex gap-4 p-4 h-full">
          {columns.map((column) => {
            const columnCards = cards.filter((c) => c.column_id === column.id)
            return (
              <KanbanColumn
                key={column.id}
                column={column}
                cards={columnCards}
                tags={tags}
                allColumns={columns}
                onCardClick={onCardClick}
                onCardMove={onMoveCard}
                onEditColumn={onEditColumn ? () => onEditColumn(column) : undefined}
                onDeleteColumn={onDeleteColumn ? () => onDeleteColumn(column.id) : undefined}
                isOver={overId === column.id}
              />
            )
          })}
        </div>
      </ScrollArea>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeCard && (
          <KanbanCard
            card={activeCard}
            tags={tags}
            columns={columns}
            isDragging
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}

"use client";

import type { CRMCard, CRMColumn, CRMTag } from "@/lib/types";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { motion } from "framer-motion";
import { useCallback, useMemo, useState } from "react";
import { KanbanCard } from "./KanbanCard";
import { KanbanColumn } from "./KanbanColumn";

interface KanbanBoardProps {
  columns: CRMColumn[];
  cards: CRMCard[];
  tags: CRMTag[];
  onMoveCard: (
    cardId: string,
    columnId: string,
    position?: number,
  ) => Promise<boolean>;
  onCardClick: (card: CRMCard) => void;
  onEditColumn?: (column: CRMColumn) => void;
  onDeleteColumn?: (columnId: string) => void;
}

const measuringConfig = {
  droppable: {
    strategy: MeasuringStrategy.Always,
  },
};

const customCollisionDetection = (
  args: Parameters<typeof rectIntersection>[0],
) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }
  return rectIntersection(args);
};

export const KanbanBoard = ({
  columns,
  cards,
  tags,
  onMoveCard,
  onCardClick,
  onEditColumn,
  onDeleteColumn,
}: KanbanBoardProps) => {
  const [activeCard, setActiveCard] = useState<CRMCard | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 5,
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200,
      tolerance: 5,
    },
  });

  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });

  const sensors = useSensors(pointerSensor, touchSensor, keyboardSensor);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const card = cards.find((c) => c.id === active.id);
      if (card) {
        setActiveCard(card);
      }
    },
    [cards],
  );

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverId((event.over?.id as string | null) ?? null);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveCard(null);
      setOverId(null);

      if (!over) return;

      const cardId = active.id as string;
      const targetId = over.id as string;

      if (cardId === targetId) return;

      const targetColumn = columns.find((col) => col.id === targetId);
      const targetCard = cards.find((c) => c.id === targetId);
      const currentCard = cards.find((c) => c.id === cardId);

      if (!currentCard) return;

      if (targetColumn) {
        await onMoveCard(cardId, targetColumn.id);
      } else if (targetCard) {
        await onMoveCard(cardId, targetCard.column_id, targetCard.position);
      }
    },
    [columns, cards, onMoveCard],
  );

  const handleDragCancel = useCallback(() => {
    setActiveCard(null);
    setOverId(null);
  }, []);

  const columnCardsMap = useMemo(() => {
    const map = new Map<string, CRMCard[]>();
    columns.forEach((col) => {
      map.set(
        col.id,
        cards.filter((c) => c.column_id === col.id),
      );
    });
    return map;
  }, [columns, cards]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      measuring={measuringConfig}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="crm-board-scroll mb-3 overflow-x-auto overflow-y-hidden">
          <div
            className="h-2 rounded-full bg-background/30"
            style={{ width: `${columns.length * 312}px` }}
          >
            <div className="h-full w-24 rounded-full bg-gradient-to-r from-primary/30 to-secondary/30" />
          </div>
        </div>

        <div
          className="crm-board-scroll flex-1 overflow-x-auto overflow-y-hidden pb-3"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <motion.div
            layout
            className="flex h-full min-w-max gap-4 pr-4"
            initial={false}
          >
            {columns.map((column, index) => {
              const columnCards = columnCardsMap.get(column.id) || [];
              return (
                <motion.div
                  key={column.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                >
                  <KanbanColumn
                    column={column}
                    cards={columnCards}
                    tags={tags}
                    allColumns={columns}
                    onCardClick={onCardClick}
                    onCardMove={onMoveCard}
                    onEditColumn={
                      onEditColumn ? () => onEditColumn(column) : undefined
                    }
                    onDeleteColumn={
                      onDeleteColumn ? () => onDeleteColumn(column.id) : undefined
                    }
                    isOver={overId === column.id}
                  />
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>

      <DragOverlay
        dropAnimation={{
          duration: 200,
          easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
        }}
      >
        {activeCard ? (
          <div className="w-[296px] rotate-[1.5deg]">
            <KanbanCard
              card={activeCard}
              tags={tags}
              columns={columns}
              isDragging
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

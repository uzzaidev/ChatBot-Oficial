"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
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

// Measuring configuration for better performance
const measuringConfig = {
  droppable: {
    strategy: MeasuringStrategy.Always,
  },
};

// Custom collision detection - uses rectIntersection which is more generous
// This makes it easier to drop cards into columns
const customCollisionDetection = (
  args: Parameters<typeof rectIntersection>[0],
) => {
  // First try pointerWithin for precise drops
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }
  // Fallback to rectIntersection which is more forgiving
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

  // Optimized sensors for better performance
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 5, // Reduced for faster activation
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
      console.log("[DnD] Drag started:", event.active.id);
      const { active } = event;
      const card = cards.find((c) => c.id === active.id);
      if (card) {
        setActiveCard(card);
      }
    },
    [cards],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;
      const newOverId = over?.id as string | null;
      if (newOverId !== overId) {
        setOverId(newOverId);
      }
    },
    [overId],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      console.log("[DnD] Drag ended:", {
        activeId: active.id,
        overId: over?.id,
      });

      setActiveCard(null);
      setOverId(null);

      if (!over) {
        console.log("[DnD] No drop target");
        return;
      }

      const cardId = active.id as string;
      const targetId = over.id as string;

      // Don't do anything if dropped on itself
      if (cardId === targetId) {
        console.log("[DnD] Dropped on self, ignoring");
        return;
      }

      // Find if targetId is a column or another card
      const targetColumn = columns.find((col) => col.id === targetId);
      const targetCard = cards.find((c) => c.id === targetId);
      const currentCard = cards.find((c) => c.id === cardId);

      if (!currentCard) {
        console.log("[DnD] Card not found:", cardId);
        return;
      }

      if (targetColumn) {
        // Dropped on a column
        console.log("[DnD] Moving to column:", targetColumn.name);
        const success = await onMoveCard(cardId, targetColumn.id);
        console.log("[DnD] Move result:", success);
      } else if (targetCard) {
        // Dropped on another card - insert at that position
        console.log(
          "[DnD] Moving to card position:",
          targetCard.position,
          "in column:",
          targetCard.column_id,
        );
        const success = await onMoveCard(
          cardId,
          targetCard.column_id,
          targetCard.position,
        );
        console.log("[DnD] Move result:", success);
      }
    },
    [columns, cards, onMoveCard],
  );

  const handleDragCancel = useCallback(() => {
    console.log("[DnD] Drag cancelled");
    setActiveCard(null);
    setOverId(null);
  }, []);

  // Memoize column cards for better performance
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
      <ScrollArea className="w-full h-full">
        <div className="flex gap-4 p-4 h-full">
          {columns.map((column) => {
            const columnCards = columnCardsMap.get(column.id) || [];
            return (
              <KanbanColumn
                key={column.id}
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
            );
          })}
        </div>
      </ScrollArea>

      {/* Drag Overlay - renders the dragged card */}
      <DragOverlay
        dropAnimation={{
          duration: 200,
          easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
        }}
      >
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
  );
};

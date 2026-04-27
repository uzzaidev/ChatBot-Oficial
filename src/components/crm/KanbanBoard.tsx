"use client";

import { Button } from "@/components/ui/button";
import type { ConversationStatus, CRMCard, CRMColumn, CRMTag } from "@/lib/types";
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
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KanbanCard } from "./KanbanCard";
import { KanbanColumn } from "./KanbanColumn";
import { SortableColumn } from "./SortableColumn";

interface KanbanBoardProps {
  columns: CRMColumn[];
  orderedColumnIds?: string[];
  cards: CRMCard[];
  tags: CRMTag[];
  onMoveCard: (
    cardId: string,
    columnId: string,
    position?: number,
  ) => Promise<boolean>;
  onBulkUpdateColumnStatus?: (
    columnId: string,
    status: ConversationStatus,
  ) => Promise<{ updated: number } | null>;
  onCardClick: (card: CRMCard) => void;
  onEditColumn?: (column: CRMColumn) => void;
  onDeleteColumn?: (columnId: string) => void;
  onReorderColumns?: (
    columnOrders: Array<{ id: string; position: number }>,
  ) => Promise<boolean>;
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
  orderedColumnIds,
  cards,
  tags,
  onMoveCard,
  onBulkUpdateColumnStatus,
  onCardClick,
  onEditColumn,
  onDeleteColumn,
  onReorderColumns,
}: KanbanBoardProps) => {
  const [activeCard, setActiveCard] = useState<CRMCard | null>(null);
  const [activeColumn, setActiveColumn] = useState<CRMColumn | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [localColumnOrder, setLocalColumnOrder] = useState<string[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Sync local column order with props
  useEffect(() => {
    const ids = orderedColumnIds ?? columns.map((c) => c.id);
    setLocalColumnOrder(ids);
  }, [orderedColumnIds, columns]);

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
      const dataType = active.data.current?.type;
      if (dataType === "column") {
        const column = columns.find((c) => c.id === active.id);
        if (column) setActiveColumn(column);
      } else {
        const card = cards.find((c) => c.id === active.id);
        if (card) setActiveCard(card);
      }
    },
    [cards, columns],
  );

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverId((event.over?.id as string | null) ?? null);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveCard(null);
      setActiveColumn(null);
      setOverId(null);

      if (!over) return;

      // Column reorder
      if (active.data.current?.type === "column") {
        const activeId = active.id as string;
        const overId = over.id as string;
        if (activeId === overId) return;

        const oldIndex = localColumnOrder.indexOf(activeId);
        const overIndex = localColumnOrder.indexOf(overId);
        if (oldIndex === -1 || overIndex === -1) return;

        const newOrder = arrayMove(localColumnOrder, oldIndex, overIndex);
        setLocalColumnOrder(newOrder); // Optimistic

        if (onReorderColumns) {
          const columnOrders = newOrder.map((id, position) => ({
            id,
            position,
          }));
          const success = await onReorderColumns(columnOrders);
          if (!success) {
            // Rollback
            setLocalColumnOrder(orderedColumnIds ?? columns.map((c) => c.id));
          }
        }
        return;
      }

      // Card drag
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
    [
      cards,
      columns,
      localColumnOrder,
      onMoveCard,
      onReorderColumns,
      orderedColumnIds,
    ],
  );

  const handleDragCancel = useCallback(() => {
    setActiveCard(null);
    setActiveColumn(null);
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

  const columnOrderIndex = useMemo(() => {
    return new Map(localColumnOrder.map((id, idx) => [id, idx]));
  }, [localColumnOrder]);

  const sortedColumns = useMemo(() => {
    return [...columns].sort((a, b) => {
      const aIdx = columnOrderIndex.get(a.id) ?? 999;
      const bIdx = columnOrderIndex.get(b.id) ?? 999;
      return aIdx - bIdx;
    });
  }, [columns, columnOrderIndex]);

  const updateScrollState = useCallback(() => {
    const node = scrollContainerRef.current;
    if (!node) return;

    setCanScrollLeft(node.scrollLeft > 8);
    setCanScrollRight(
      node.scrollLeft + node.clientWidth < node.scrollWidth - 8,
    );
  }, []);

  useEffect(() => {
    updateScrollState();
    const node = scrollContainerRef.current;
    if (!node) return;

    node.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      node.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [columns.length, updateScrollState]);

  const scrollByAmount = useCallback((direction: "left" | "right") => {
    const node = scrollContainerRef.current;
    if (!node) return;

    node.scrollBy({
      left: direction === "left" ? -380 : 380,
      behavior: "smooth",
    });
  }, []);

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
      <div className="flex h-full min-h-0 min-w-0 w-full flex-col">
        <div className="mb-3 flex items-center justify-end gap-3">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full border-border/80 bg-background/30"
              disabled={!canScrollLeft}
              onClick={() => scrollByAmount("left")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full border-border/80 bg-background/30"
              disabled={!canScrollRight}
              onClick={() => scrollByAmount("right")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="crm-board-scroll flex-1 overflow-x-auto overflow-y-hidden pb-3"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <SortableContext
            items={localColumnOrder}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex h-full min-w-max gap-4 pr-4">
              {sortedColumns.map((column, index) => {
                const columnCards = columnCardsMap.get(column.id) || [];
                return (
                  <SortableColumn key={column.id} column={column} index={index}>
                    <KanbanColumn
                      column={column}
                      cards={columnCards}
                      tags={tags}
                      allColumns={columns}
                      onCardClick={onCardClick}
                      onCardMove={onMoveCard}
                      onBulkUpdateColumnStatus={onBulkUpdateColumnStatus}
                      onEditColumn={
                        onEditColumn ? () => onEditColumn(column) : undefined
                      }
                      onDeleteColumn={
                        onDeleteColumn
                          ? () => onDeleteColumn(column.id)
                          : undefined
                      }
                      isOver={overId === column.id}
                    />
                  </SortableColumn>
                );
              })}
            </div>
          </SortableContext>
        </div>
      </div>

      <DragOverlay
        dropAnimation={{
          duration: 200,
          easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
        }}
      >
        {activeCard ? (
          <div className="w-[340px] rotate-[1deg]">
            <KanbanCard
              card={activeCard}
              tags={tags}
              columns={columns}
              isDragging
            />
          </div>
        ) : null}
        {activeColumn ? (
          <div className="w-[340px] rotate-[1deg] opacity-80">
            <KanbanColumn
              column={activeColumn}
              cards={columnCardsMap.get(activeColumn.id) || []}
              tags={tags}
              allColumns={columns}
              onCardClick={() => {}}
              onCardMove={() => {}}
              isOver={false}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

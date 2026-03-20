"use client";

import { Button } from "@/components/ui/button";
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
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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

  const updateScrollState = useCallback(() => {
    const node = scrollContainerRef.current;
    if (!node) return;

    setCanScrollLeft(node.scrollLeft > 8);
    setCanScrollRight(
      node.scrollLeft + node.clientWidth < node.scrollWidth - 8,
    );
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    const node = scrollContainerRef.current;
    if (!node) return;
    if (node.scrollWidth <= node.clientWidth) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      node.scrollLeft += e.deltaY;
    }
  }, []);

  useEffect(() => {
    updateScrollState();
    const node = scrollContainerRef.current;
    if (!node) return;

    node.addEventListener("scroll", updateScrollState, { passive: true });
    node.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("resize", updateScrollState);

    return () => {
      node.removeEventListener("scroll", updateScrollState);
      node.removeEventListener("wheel", handleWheel);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [columns.length, updateScrollState, handleWheel]);

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
          <div className="flex h-full min-w-max gap-4 pr-4">
            {columns.map((column, index) => {
              const columnCards = columnCardsMap.get(column.id) || [];
              return (
                <div
                  key={column.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 40}ms` }}
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
                      onDeleteColumn
                        ? () => onDeleteColumn(column.id)
                        : undefined
                    }
                    isOver={overId === column.id}
                  />
                </div>
              );
            })}
          </div>
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
      </DragOverlay>
    </DndContext>
  );
};

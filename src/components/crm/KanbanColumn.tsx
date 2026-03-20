"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CRMCard, CRMColumn, CRMTag } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { MoreHorizontal, Settings, Trash2 } from "lucide-react";
import { ColumnHeader } from "./ColumnHeader";
import { KanbanCard } from "./KanbanCard";

interface KanbanColumnProps {
  column: CRMColumn;
  cards: CRMCard[];
  tags: CRMTag[];
  allColumns: CRMColumn[];
  onCardClick: (card: CRMCard) => void;
  onCardMove: (cardId: string, columnId: string) => void;
  onEditColumn?: () => void;
  onDeleteColumn?: () => void;
  isOver?: boolean;
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
  const { setNodeRef, isOver: isDroppableOver } = useDroppable({
    id: column.id,
    data: {
      type: "column",
      column,
    },
  });

  const sortedCards = [...cards].sort((a, b) => a.position - b.position);
  const cardIds = sortedCards.map((c) => c.id);
  const activeDrop = isOver || isDroppableOver;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "crm-column-shell flex h-full w-[340px] min-w-[340px] max-w-[340px] shrink-0 flex-col overflow-hidden",
      )}
      data-over={activeDrop}
    >
      <div className="crm-column-header flex items-center justify-between gap-3 px-4 py-3.5">
        <ColumnHeader
          name={column.name}
          count={cards.length}
          icon={column.icon}
          color={column.color}
          className="min-w-0 flex-1"
        />

        {(onEditColumn || onDeleteColumn) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full border border-transparent text-muted-foreground hover:border-border/80 hover:bg-background/35 hover:text-foreground"
                aria-label="Opções da coluna"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Opções</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 rounded-2xl border-border/80 bg-popover/95 backdrop-blur"
            >
              {onEditColumn && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEditColumn();
                  }}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Editar coluna
                </DropdownMenuItem>
              )}
              {onEditColumn && onDeleteColumn && <DropdownMenuSeparator />}
              {onDeleteColumn && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDeleteColumn();
                  }}
                  className="text-destructive focus:text-destructive"
                  disabled={column.is_default}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {column.is_default
                    ? "Não pode excluir (padrão)"
                    : "Excluir coluna"}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="crm-column-body flex-1 min-h-0 p-3">
        <div className="crm-board-scroll h-full overflow-y-auto pr-1">
          <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-3 pb-3">
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
            <div className="crm-column-empty mt-1 flex h-32 items-center justify-center rounded-[20px] text-center text-sm text-muted-foreground">
              Arraste um card para esta etapa
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

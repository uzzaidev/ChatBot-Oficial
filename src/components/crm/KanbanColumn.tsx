"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
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

const COLUMN_COLORS: Record<string, string> = {
  mint: "border-t-emerald-500",
  blue: "border-t-blue-500",
  gold: "border-t-yellow-500",
  amber: "border-t-amber-500",
  red: "border-t-red-500",
  purple: "border-t-purple-500",
  green: "border-t-green-500",
  gray: "border-t-gray-500",
  zinc: "border-t-zinc-400",
  default: "border-t-primary",
};

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

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col w-[260px] min-w-[260px] max-w-[260px] shrink-0",
        "bg-card rounded-lg border border-border",
        "border-t-4",
        "transition-all duration-200 ease-in-out",
        COLUMN_COLORS[column.color] || COLUMN_COLORS.default,
        (isOver || isDroppableOver) &&
          "ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02] shadow-lg bg-primary/5",
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <ColumnHeader
          name={column.name}
          count={cards.length}
          icon={column.icon}
        />

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
  );
};

"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import type { ConversationStatus, CRMCard, CRMColumn, CRMTag } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ArrowRight, Bot, Loader2, MoreHorizontal, Settings, Trash2, User, Workflow } from "lucide-react";
import { useState } from "react";
import { ColumnHeader } from "./ColumnHeader";
import { KanbanCard } from "./KanbanCard";

interface KanbanColumnProps {
  column: CRMColumn;
  cards: CRMCard[];
  tags: CRMTag[];
  allColumns: CRMColumn[];
  onCardClick: (card: CRMCard) => void;
  onCardMove: (cardId: string, columnId: string) => void;
  onBulkUpdateColumnStatus?: (
    columnId: string,
    status: ConversationStatus,
  ) => Promise<{ updated: number } | null>;
  onEditColumn?: () => void;
  onDeleteColumn?: () => void;
  isOver?: boolean;
}

const BULK_STATUS_OPTIONS: Array<{
  value: ConversationStatus;
  label: string;
  icon: typeof Bot;
}> = [
  { value: "bot", label: "Bot", icon: Bot },
  { value: "humano", label: "Humano", icon: User },
  { value: "transferido", label: "Transferido", icon: ArrowRight },
  { value: "fluxo_inicial", label: "Em Flow", icon: Workflow },
];

export const KanbanColumn = ({
  column,
  cards,
  tags,
  allColumns,
  onCardClick,
  onCardMove,
  onBulkUpdateColumnStatus,
  onEditColumn,
  onDeleteColumn,
  isOver = false,
}: KanbanColumnProps) => {
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ConversationStatus | null>(
    null,
  );
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
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
  const pendingOption = BULK_STATUS_OPTIONS.find(
    (option) => option.value === pendingStatus,
  );

  const openBulkStatusConfirm = (status: ConversationStatus) => {
    if (!onBulkUpdateColumnStatus) return;
    setPendingStatus(status);
    setConfirmOpen(true);
  };

  const handleConfirmBulkStatus = async () => {
    if (!pendingStatus || !onBulkUpdateColumnStatus) return;

    setIsBulkUpdating(true);
    const result = await onBulkUpdateColumnStatus(column.id, pendingStatus);
    setIsBulkUpdating(false);

    if (!result) {
      toast({
        title: "Erro ao atualizar status em massa",
        description: "Não foi possível atualizar os contatos desta coluna.",
        variant: "destructive",
      });
      return;
    }

    const statusLabel = pendingOption?.label || pendingStatus;
    toast({
      title: "Status atualizado em massa",
      description: `${result.updated} contato(s) alterado(s) para ${statusLabel}.`,
    });

    setConfirmOpen(false);
    setPendingStatus(null);
  };

  return (
    <>
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

          {(onEditColumn || onDeleteColumn || onBulkUpdateColumnStatus) && (
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full border border-transparent text-muted-foreground hover:border-border/80 hover:bg-background/35 hover:text-foreground"
                    aria-label="Opcoes da coluna"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Opcoes</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 rounded-2xl border-border/80 bg-popover/95 backdrop-blur"
                >
                  {onBulkUpdateColumnStatus &&
                    BULK_STATUS_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      return (
                        <DropdownMenuItem
                          key={option.value}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openBulkStatusConfirm(option.value);
                          }}
                          disabled={cards.length === 0 || isBulkUpdating}
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          Alterar todos para {option.label}
                        </DropdownMenuItem>
                      );
                    })}

                  {onBulkUpdateColumnStatus && (onEditColumn || onDeleteColumn) && (
                    <DropdownMenuSeparator />
                  )}

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
                        ? "Nao pode excluir (padrao)"
                        : "Excluir coluna"}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        <div className="crm-column-body flex-1 min-h-0 p-3">
          <div className="crm-board-scroll h-full overflow-y-auto pr-1">
            <SortableContext
              items={cardIds}
              strategy={verticalListSortingStrategy}
            >
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

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!isBulkUpdating) {
            setConfirmOpen(open);
            if (!open) {
              setPendingStatus(null);
            }
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar status em massa</AlertDialogTitle>
            <AlertDialogDescription>
              {`Aplicar "${pendingOption?.label || "-"}" para todos os ${cards.length} contato(s) da coluna "${column.name}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkUpdating}>
              Cancelar
            </AlertDialogCancel>
            <Button
              onClick={() => void handleConfirmBulkStatus()}
              disabled={isBulkUpdating || !pendingStatus}
            >
              {isBulkUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Aplicando...
                </>
              ) : (
                "Confirmar"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

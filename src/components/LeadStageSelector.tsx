"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CRMCard, CRMColumn } from "@/lib/types";
import { ChevronDown, Kanban, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface LeadStageSelectorProps {
  phone: string;
  /** Optional callback called after a successful stage change */
  onStageChange?: (columnId: string, columnName: string) => void;
}

/**
 * Compact CRM stage selector for the conversation header.
 * Fetches the CRM card for the current contact and allows moving to
 * a different pipeline column without leaving the conversation view.
 */
export function LeadStageSelector({
  phone,
  onStageChange,
}: LeadStageSelectorProps) {
  const [columns, setColumns] = useState<CRMColumn[]>([]);
  const [card, setCard] = useState<CRMCard | null>(null);
  const [currentColumn, setCurrentColumn] = useState<CRMColumn | null>(null);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch columns and card in parallel
      const [columnsRes, cardsRes] = await Promise.all([
        fetch("/api/crm/columns"),
        fetch(`/api/crm/cards?search=${encodeURIComponent(phone)}`),
      ]);

      if (!columnsRes.ok || !cardsRes.ok) return;

      const columnsJson = await columnsRes.json();
      const cardsJson = await cardsRes.json();

      const allColumns: CRMColumn[] = columnsJson.columns ?? [];
      const allCards: CRMCard[] = cardsJson.cards ?? [];

      // Match card by phone (cards phone can be numeric string)
      const cleanPhone = phone.replace(/\D/g, "");
      const matchedCard =
        allCards.find(
          (c) => String(c.phone).replace(/\D/g, "") === cleanPhone,
        ) ?? null;

      const matched = matchedCard
        ? allColumns.find((col) => col.id === matchedCard.column_id) ?? null
        : null;

      setColumns(allColumns);
      setCard(matchedCard);
      setCurrentColumn(matched);
    } catch {
      // Silent — CRM integration is non-blocking
    } finally {
      setLoading(false);
    }
  }, [phone]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMove = useCallback(
    async (targetColumn: CRMColumn) => {
      if (!card || targetColumn.id === card.column_id) return;

      setMoving(true);
      try {
        const res = await fetch(`/api/crm/cards/${card.id}/move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ column_id: targetColumn.id }),
        });

        if (!res.ok) return;

        setCard((prev) =>
          prev ? { ...prev, column_id: targetColumn.id } : prev,
        );
        setCurrentColumn(targetColumn);
        onStageChange?.(targetColumn.id, targetColumn.name);
      } catch {
        // Silent — non-critical operation
      } finally {
        setMoving(false);
      }
    },
    [card, onStageChange],
  );

  // Don't render if not loaded yet (avoids layout shift)
  if (loading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="hidden sm:inline">CRM</span>
      </div>
    );
  }

  // No card in CRM — show a subtle indicator
  if (!card) {
    return (
      <div
        className="flex items-center gap-1.5 text-xs text-muted-foreground"
        title="Contato não está no CRM"
      >
        <Kanban className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Sem estágio</span>
      </div>
    );
  }

  const activeColumns = columns.filter((c) => !c.is_archived);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 gap-1 text-xs font-medium border-border hover:bg-muted"
          disabled={moving}
          title="Mover estágio no CRM"
        >
          {moving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Kanban className="h-3 w-3" />
          )}
          <span
            className="max-w-[80px] truncate hidden sm:inline"
            style={{ color: currentColumn?.color ?? undefined }}
          >
            {currentColumn?.name ?? "Mover"}
          </span>
          <ChevronDown className="h-3 w-3 opacity-60 hidden sm:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Mover para estágio
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {activeColumns.map((col) => (
          <DropdownMenuItem
            key={col.id}
            onClick={() => handleMove(col)}
            className="flex items-center gap-2 cursor-pointer"
            disabled={col.id === card.column_id}
          >
            <span
              className="h-2 w-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: col.color || "#94a3b8" }}
            />
            <span className="flex-1 truncate">{col.name}</span>
            {col.id === card.column_id && (
              <Badge variant="secondary" className="text-[10px] px-1 py-0">
                atual
              </Badge>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

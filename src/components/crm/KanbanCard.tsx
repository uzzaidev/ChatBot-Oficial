"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CRMCard, CRMTag } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, MoreHorizontal } from "lucide-react";
import { CardStatusBadge } from "./CardStatusBadge";
import { CardTagList } from "./CardTagList";

export interface KanbanCardProps {
  card: CRMCard;
  tags: CRMTag[];
  onClick?: () => void;
  onMoveToColumn?: (columnId: string) => void;
  isDragging?: boolean;
  columns?: Array<{ id: string; name: string }>;
  /** Disable drag-and-drop to allow touch scroll on mobile */
  disableDrag?: boolean;
}

const getInitials = (name: string): string => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const formatPhone = (phone: string | number): string => {
  const phoneStr = String(phone);
  if (phoneStr.length === 13) {
    // 5511999999999 -> +55 (11) 99999-9999
    return `+${phoneStr.slice(0, 2)} (${phoneStr.slice(2, 4)}) ${phoneStr.slice(
      4,
      9,
    )}-${phoneStr.slice(9)}`;
  }
  return phoneStr;
};

export const KanbanCard = ({
  card,
  tags,
  onClick,
  onMoveToColumn,
  isDragging = false,
  columns = [],
  disableDrag = false,
}: KanbanCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: card.id, disabled: disableDrag });

  const contactName = card.contact?.name || "Sem nome";
  const cardTags = tags.filter((tag) => card.tagIds?.includes(tag.id));
  const isCurrentlyDragging = isDragging || isSortableDragging;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
    willChange: isCurrentlyDragging ? "transform" : undefined,
    // Allow touch scroll when drag is disabled (mobile)
    touchAction: disableDrag ? "auto" : "none",
  } as React.CSSProperties;

  // Only apply drag attributes/listeners when drag is enabled
  const dragProps = disableDrag ? {} : { ...attributes, ...listeners };

  return (
    <Card
      ref={disableDrag ? undefined : setNodeRef}
      style={disableDrag ? undefined : style}
      className={cn(
        "bg-card border-border",
        !disableDrag && "cursor-grab active:cursor-grabbing",
        "hover:border-primary/50 hover:shadow-md",
        "transition-all duration-200",
        isCurrentlyDragging &&
          "opacity-60 shadow-2xl border-primary scale-105 rotate-2",
        card.auto_status === "awaiting_attendant" &&
          "border-l-4 border-l-destructive",
        card.auto_status === "awaiting_client" &&
          "border-l-4 border-l-yellow-500",
        card.auto_status === "in_progress" && "border-l-4 border-l-blue-500",
        card.auto_status === "resolved" && "border-l-4 border-l-emerald-500",
      )}
      onClick={onClick}
      {...dragProps}
    >
      <CardContent className="p-2.5 space-y-2">
        {/* Header */}
        <div className="flex items-start gap-2">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-secondary to-primary text-primary-foreground text-xs font-medium">
              {getInitials(contactName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-foreground truncate">
              {contactName}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {formatPhone(card.phone)}
            </p>
          </div>

          {/* Quick Actions Menu */}
          {columns.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {columns.map((col) => (
                  <DropdownMenuItem
                    key={col.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveToColumn?.(col.id);
                    }}
                    className="text-xs"
                  >
                    Mover para {col.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Tags */}
        {cardTags.length > 0 && <CardTagList tags={cardTags} maxVisible={2} />}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
          <CardStatusBadge status={card.auto_status} size="sm" />

          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            {card.last_message_at && (
              <div className="flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                <span>
                  {formatDistanceToNow(new Date(card.last_message_at), {
                    addSuffix: false,
                    locale: ptBR,
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

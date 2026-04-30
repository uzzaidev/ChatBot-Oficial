"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import {
  ArrowUpRight,
  CalendarDays,
  Clock3,
  DollarSign,
  MoreHorizontal,
  Phone,
  UserRound,
} from "lucide-react";
import { CardStatusBadge } from "./CardStatusBadge";
import { CardTagList } from "./CardTagList";

export interface KanbanCardProps {
  card: CRMCard;
  tags: CRMTag[];
  onClick?: () => void;
  onMoveToColumn?: (columnId: string) => void;
  isDragging?: boolean;
  columns?: Array<{ id: string; name: string }>;
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
    touchAction: disableDrag ? "auto" : "none",
  } as React.CSSProperties;

  const dragProps = disableDrag ? {} : { ...attributes, ...listeners };

  const lastMessageText = card.last_message_at
    ? formatDistanceToNow(new Date(card.last_message_at), {
        addSuffix: true,
        locale: ptBR,
      })
    : "Sem mensagens";

  const compactMeta = [
    card.estimated_value
      ? {
          key: "value",
          icon: DollarSign,
          label: `R$ ${card.estimated_value.toLocaleString("pt-BR")}`,
        }
      : null,
    card.expected_close_date
      ? {
          key: "close",
          icon: CalendarDays,
          label: new Date(card.expected_close_date).toLocaleDateString("pt-BR"),
        }
      : null,
    card.assignedUser?.name
      ? {
          key: "assigned",
          icon: UserRound,
          label: card.assignedUser.name,
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    icon: typeof DollarSign;
    label: string;
  }>;

  return (
    <div>
      <div
        ref={disableDrag ? undefined : setNodeRef}
        style={disableDrag ? undefined : style}
        className={cn(
          "crm-card-shell w-full cursor-pointer px-3.5 py-3",
          !disableDrag && "cursor-grab active:cursor-grabbing",
          isCurrentlyDragging && "opacity-80",
        )}
        data-status={card.auto_status}
        data-dragging={isCurrentlyDragging}
        onClick={onClick}
        {...dragProps}
      >
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 flex-shrink-0 border border-white/10">
            <AvatarFallback className="bg-gradient-to-br from-primary/90 via-secondary/80 to-primary text-sm font-semibold text-white">
              {getInitials(contactName)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {contactName}
                </p>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span className="truncate">{formatPhone(card.phone)}</span>
                </div>
              </div>

              {columns.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full border border-transparent text-muted-foreground hover:border-border/80 hover:bg-background/30 hover:text-foreground"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-52 max-h-72 overflow-y-auto rounded-2xl border-border/80 bg-popover/95 backdrop-blur"
                  >
                    {columns.map((col) => (
                      <DropdownMenuItem
                        key={col.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveToColumn?.(col.id);
                        }}
                        className="text-xs"
                      >
                        <ArrowUpRight className="mr-2 h-3.5 w-3.5" />
                        Mover para {col.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <CardStatusBadge status={card.auto_status} size="sm" />
              <span className="crm-stat-chip">
                <Clock3 className="h-3 w-3" />
                {lastMessageText}
              </span>
            </div>

            {cardTags.length > 0 && (
              <div className="mt-3">
                <CardTagList tags={cardTags} maxVisible={2} />
              </div>
            )}

            {card.last_message_preview && (
              <div className="mt-3 rounded-2xl border border-white/5 bg-background/20 px-3 py-2.5">
                <p className="line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                  {card.last_message_preview}
                </p>
              </div>
            )}

            {compactMeta.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {compactMeta.map((item) => {
                  const Icon = item.icon;
                  return (
                    <span key={item.key} className="crm-stat-chip">
                      <Icon className="h-3 w-3" />
                      <span className="max-w-[140px] truncate">
                        {item.label}
                      </span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";
import type { CRMActivityLog, CRMCard, CRMNote, CRMTag } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowRight,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  DollarSign,
  Loader2,
  MessageSquare,
  Phone,
  Plus,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CardNotes } from "./CardNotes";
import { CardStatusBadge } from "./CardStatusBadge";
import { CardTimeline } from "./CardTimeline";
import { ScheduleMessageDialog } from "./ScheduleMessageDialog";

interface Message {
  id: string;
  content: string;
  direction: "incoming" | "outgoing";
  timestamp: string;
  name?: string;
  type?: string;
}

interface CardDetailPanelProps {
  card: CRMCard | null;
  open: boolean;
  onClose: () => void;
  onUpdate?: () => void;
  tags?: CRMTag[];
  onAddTag?: (cardId: string, tagId: string) => Promise<boolean>;
  onRemoveTag?: (cardId: string, tagId: string) => Promise<boolean>;
}

const STATUS_OPTIONS = [
  {
    value: "awaiting_attendant",
    label: "Aguardando Atendente",
    color: "bg-red-500",
  },
  {
    value: "awaiting_client",
    label: "Aguardando Cliente",
    color: "bg-yellow-500",
  },
  { value: "in_progress", label: "Em Andamento", color: "bg-blue-500" },
  { value: "resolved", label: "Resolvido", color: "bg-emerald-600" },
  { value: "neutral", label: "Neutro", color: "bg-gray-500" },
];

const TAG_COLORS: Record<string, string> = {
  blue: "#3b82f6",
  green: "#22c55e",
  red: "#ef4444",
  yellow: "#eab308",
  purple: "#a855f7",
  pink: "#ec4899",
  orange: "#f97316",
  cyan: "#06b6d4",
  gray: "#6b7280",
};

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

export const CardDetailPanel = ({
  card,
  open,
  onClose,
  onUpdate,
  tags = [],
  onAddTag,
  onRemoveTag,
}: CardDetailPanelProps) => {
  const router = useRouter();
  const [notes, setNotes] = useState<CRMNote[]>([]);
  const [activities, setActivities] = useState<CRMActivityLog[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [localTagIds, setLocalTagIds] = useState<string[]>([]);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const updateCardStatus = async (newStatus: string) => {
    if (!card) return;
    setUpdatingStatus(true);
    try {
      const response = await apiFetch(`/api/crm/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto_status: newStatus }),
      });
      if (response.ok) {
        onUpdate?.();
      }
    } catch (error) {
      console.error("Error updating card status:", error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  useEffect(() => {
    if (card) {
      setLocalTagIds(card.tagIds || []);
    }
  }, [card]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleAddTagLocal = async (cardId: string, tagId: string) => {
    if (!onAddTag) return false;
    setLocalTagIds((prev) => [...prev, tagId]);
    setShowTagSelector(false);
    const success = await onAddTag(cardId, tagId);
    if (!success) {
      setLocalTagIds((prev) => prev.filter((id) => id !== tagId));
    }
    return success;
  };

  const handleRemoveTagLocal = async (cardId: string, tagId: string) => {
    if (!onRemoveTag) return false;
    setLocalTagIds((prev) => prev.filter((id) => id !== tagId));
    const success = await onRemoveTag(cardId, tagId);
    if (!success) {
      setLocalTagIds((prev) => [...prev, tagId]);
    }
    return success;
  };

  const fetchMessages = useCallback(async () => {
    if (!card) return;
    setLoadingMessages(true);
    try {
      const response = await apiFetch(`/api/messages/${card.phone}?limit=10`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, [card]);

  const fetchNotes = useCallback(async () => {
    if (!card) return;
    setLoadingNotes(true);
    try {
      const response = await apiFetch(`/api/crm/cards/${card.id}/notes`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes || []);
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setLoadingNotes(false);
    }
  }, [card]);

  const fetchActivities = useCallback(async () => {
    if (!card) return;
    setLoadingActivities(true);
    try {
      const response = await apiFetch(`/api/crm/cards/${card.id}/activities`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
      setActivities([]);
    } finally {
      setLoadingActivities(false);
    }
  }, [card]);

  useEffect(() => {
    if (card && open) {
      fetchNotes();
      fetchActivities();
      fetchMessages();
    }
  }, [card, open, fetchActivities, fetchMessages, fetchNotes]);

  const handleAddNote = async (
    content: string,
    isPinned: boolean,
  ): Promise<boolean> => {
    if (!card) return false;
    try {
      const response = await apiFetch(`/api/crm/cards/${card.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, is_pinned: isPinned }),
      });

      if (response.ok) {
        await fetchNotes();
        await fetchActivities();
        onUpdate?.();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error adding note:", error);
      return false;
    }
  };

  const tagOptions = useMemo(
    () => tags.filter((t) => !localTagIds.includes(t.id)),
    [tags, localTagIds],
  );

  if (!card) return null;

  const contactName = card.contact?.name || "Sem nome";

  const handleGoToConversation = () => {
    router.push(`/dashboard/conversations?phone=${card.phone}`);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="crm-sheet-surface w-full overflow-hidden border-border/70 p-0 sm:max-w-[640px]">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-border/60 px-6 pb-5 pt-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 border border-white/10">
                <AvatarFallback className="bg-gradient-to-br from-primary via-secondary to-primary text-lg font-semibold text-white">
                  {getInitials(contactName)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="crm-stat-chip">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Card CRM
                  </span>
                  {card.last_message_at && (
                    <span className="crm-stat-chip">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDistanceToNow(new Date(card.last_message_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  )}
                </div>

                <SheetTitle className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                  {contactName}
                </SheetTitle>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {formatPhone(card.phone)}
                  </span>
                  {card.assignedUser?.name && (
                    <span className="crm-stat-chip">
                      {card.assignedUser.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-full border-border/80 bg-background/35 px-3"
                    disabled={updatingStatus}
                  >
                    {updatingStatus ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CardStatusBadge status={card.auto_status} size="sm" />
                    )}
                    <ChevronDown className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="rounded-2xl border-border/80 bg-popover/95 backdrop-blur">
                  {STATUS_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => updateCardStatus(option.value)}
                      className="gap-2"
                    >
                      <div className={`h-2.5 w-2.5 rounded-full ${option.color}`} />
                      {option.label}
                      {card.auto_status === option.value && (
                        <Check className="ml-auto h-3.5 w-3.5" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {card.estimated_value && (
                <Badge
                  variant="outline"
                  className="h-9 rounded-full border-border/80 bg-background/30 px-3 text-xs text-foreground"
                >
                  <DollarSign className="mr-1.5 h-3.5 w-3.5" />
                  R$ {card.estimated_value.toLocaleString("pt-BR")}
                </Badge>
              )}

              {card.expected_close_date && (
                <Badge
                  variant="outline"
                  className="h-9 rounded-full border-border/80 bg-background/30 px-3 text-xs text-foreground"
                >
                  <Calendar className="mr-1.5 h-3.5 w-3.5" />
                  {new Date(card.expected_close_date).toLocaleDateString("pt-BR")}
                </Badge>
              )}
            </div>

            {tags.length > 0 && (
              <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="crm-section-label flex items-center gap-2 tracking-[0.18em]">
                    <Tag className="h-3.5 w-3.5" />
                    Tags
                  </span>
                  {onAddTag && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full border border-border/70 bg-background/20 px-3 text-xs hover:bg-background/40"
                      onClick={() => setShowTagSelector(!showTagSelector)}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Adicionar
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {localTagIds.map((tagId) => {
                    const tag = tags.find((t) => t.id === tagId);
                    if (!tag) return null;
                    const color = TAG_COLORS[tag.color] || TAG_COLORS.gray;
                    return (
                      <span
                        key={tag.id}
                        className="crm-tag-badge inline-flex items-center gap-1 border"
                        style={{
                          backgroundColor: `${color}1a`,
                          borderColor: `${color}33`,
                          color,
                        }}
                      >
                        {tag.name}
                        {onRemoveTag && (
                          <button
                            className="rounded-full p-0.5 transition-colors hover:bg-white/10"
                            onClick={() => handleRemoveTagLocal(card.id, tag.id)}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    );
                  })}

                  {localTagIds.length === 0 && (
                    <span className="text-xs text-muted-foreground">
                      Nenhuma tag vinculada
                    </span>
                  )}
                </div>

                {showTagSelector && onAddTag && (
                  <div className="rounded-2xl border border-border/70 bg-background/25 p-3">
                    <div className="flex flex-wrap gap-2">
                      {tagOptions.map((tag) => {
                        const color = TAG_COLORS[tag.color] || TAG_COLORS.gray;
                        return (
                          <button
                            key={tag.id}
                            className="crm-tag-badge border text-left transition-transform hover:-translate-y-0.5"
                            style={{
                              backgroundColor: `${color}14`,
                              borderColor: `${color}2e`,
                              color,
                            }}
                            onClick={() => handleAddTagLocal(card.id, tag.id)}
                          >
                            {tag.name}
                          </button>
                        );
                      })}
                      {tagOptions.length === 0 && (
                        <span className="text-xs text-muted-foreground">
                          Todas as tags já foram adicionadas
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <Button
                onClick={handleGoToConversation}
                className="h-11 flex-1 rounded-2xl bg-gradient-uzz text-white shadow-glow hover:opacity-95"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Ver conversa
                <ArrowRight className="ml-auto h-4 w-4" />
              </Button>
              <Button
                onClick={() => setShowScheduleDialog(true)}
                variant="outline"
                className="h-11 rounded-2xl border-border/80 bg-background/30 px-4"
                title="Agendar mensagem"
              >
                <Clock className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <Separator className="bg-border/60" />

          <Tabs defaultValue="messages" className="flex flex-1 min-h-0 flex-col">
            <div className="px-6 pt-4">
              <TabsList className="crm-tab-list h-auto w-full justify-start gap-1">
                <TabsTrigger
                  value="messages"
                  className="crm-tab-trigger rounded-full px-4 py-2 text-sm"
                >
                  Mensagens
                </TabsTrigger>
                <TabsTrigger
                  value="notes"
                  className="crm-tab-trigger rounded-full px-4 py-2 text-sm"
                >
                  Notas
                </TabsTrigger>
                <TabsTrigger
                  value="timeline"
                  className="crm-tab-trigger rounded-full px-4 py-2 text-sm"
                >
                  Atividades
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="messages" className="mt-0 flex-1 min-h-0 px-6 pb-6 pt-4">
              {loadingMessages ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="crm-panel flex h-full flex-col items-center justify-center rounded-[24px] text-muted-foreground">
                  <MessageSquare className="mb-3 h-8 w-8 opacity-50" />
                  <p className="text-sm">Nenhuma mensagem encontrada</p>
                </div>
              ) : (
                <div className="relative h-full">
                  <ScrollArea className="h-full crm-board-scroll pr-2">
                    <div className="space-y-3 pb-16">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${
                            msg.direction === "outgoing"
                              ? "justify-start"
                              : "justify-end"
                          }`}
                        >
                          <div
                            className={`max-w-[85%] rounded-[22px] px-4 py-3 text-sm shadow-sm ${
                              msg.direction === "outgoing"
                                ? "crm-message-bubble-incoming"
                                : "crm-message-bubble-outgoing"
                            }`}
                          >
                            <p className="leading-relaxed">{msg.content}</p>
                            <p className="mt-2 text-[10px] opacity-75">
                              {new Date(msg.timestamp).toLocaleString("pt-BR")}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute bottom-2 left-1/2 h-9 -translate-x-1/2 rounded-full border-border/80 bg-background/90 px-4 shadow-lg backdrop-blur"
                    onClick={scrollToBottom}
                  >
                    <ChevronDown className="mr-1.5 h-4 w-4" />
                    Mais recentes
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes" className="mt-0 flex-1 min-h-0 px-6 pb-6 pt-4">
              <div className="crm-panel h-full overflow-hidden rounded-[24px]">
                <CardNotes
                  notes={notes}
                  onAddNote={handleAddNote}
                  loading={loadingNotes}
                />
              </div>
            </TabsContent>

            <TabsContent
              value="timeline"
              className="mt-0 flex-1 min-h-0 px-6 pb-6 pt-4"
            >
              <div className="crm-panel h-full overflow-hidden rounded-[24px]">
                <CardTimeline activities={activities} loading={loadingActivities} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>

      {card && (
        <ScheduleMessageDialog
          open={showScheduleDialog}
          onClose={() => setShowScheduleDialog(false)}
          phone={String(card.phone)}
          contactName={card.contact?.name}
          onSchedule={async (data) => {
            try {
              const response = await apiFetch("/api/crm/scheduled", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  phone: String(card.phone),
                  card_id: card.id,
                  message_type: "template",
                  template_id: data.template_id,
                  template_params: data.template_params
                    ? { parameters: data.template_params }
                    : null,
                  scheduled_for: data.scheduled_for,
                }),
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Erro ao agendar");
              }

              fetchActivities();
              return true;
            } catch (err) {
              console.error("Error scheduling message:", err);
              return false;
            }
          }}
        />
      )}
    </Sheet>
  );
};

"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  ChevronDown,
  DollarSign,
  Loader2,
  MessageSquare,
  Phone,
  Plus,
  Tag,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CardNotes } from "./CardNotes";
import { CardStatusBadge } from "./CardStatusBadge";
import { CardTimeline } from "./CardTimeline";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);

  // Sync local tagIds with card.tagIds
  useEffect(() => {
    if (card) {
      setLocalTagIds(card.tagIds || []);
    }
  }, [card?.id, card?.tagIds]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleAddTagLocal = async (cardId: string, tagId: string) => {
    if (!onAddTag) return false;
    // Optimistic update
    setLocalTagIds((prev) => [...prev, tagId]);
    setShowTagSelector(false);
    const success = await onAddTag(cardId, tagId);
    if (!success) {
      // Revert on failure
      setLocalTagIds((prev) => prev.filter((id) => id !== tagId));
    }
    return success;
  };

  const handleRemoveTagLocal = async (cardId: string, tagId: string) => {
    if (!onRemoveTag) return false;
    // Optimistic update
    setLocalTagIds((prev) => prev.filter((id) => id !== tagId));
    const success = await onRemoveTag(cardId, tagId);
    if (!success) {
      // Revert on failure
      setLocalTagIds((prev) => [...prev, tagId]);
    }
    return success;
  };

  useEffect(() => {
    if (card && open) {
      fetchNotes();
      fetchActivities();
      fetchMessages();
    }
  }, [card?.id, open]);

  const fetchMessages = async () => {
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
  };

  const fetchNotes = async () => {
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
  };

  const fetchActivities = async () => {
    if (!card) return;
    setLoadingActivities(true);
    try {
      // Note: This endpoint doesn't exist yet in Phase 1, so it will fail gracefully
      const response = await apiFetch(`/api/crm/cards/${card.id}/activities`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
      setActivities([]); // Set empty array on error
    } finally {
      setLoadingActivities(false);
    }
  };

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

  if (!card) return null;

  const contactName = card.contact?.name || "Sem nome";

  const handleGoToConversation = () => {
    router.push(`/dashboard/conversations?phone=${card.phone}`);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-[600px] p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-6 pb-4 space-y-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-gradient-to-br from-secondary to-primary text-primary-foreground text-lg font-medium">
                {getInitials(contactName)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <SheetTitle className="text-2xl">{contactName}</SheetTitle>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{formatPhone(card.phone)}</span>
              </div>
            </div>
          </div>

          {/* Status & Stats */}
          <div className="flex flex-wrap gap-2">
            <CardStatusBadge status={card.auto_status} size="md" />

            {card.last_message_at && (
              <Badge variant="outline" className="gap-1">
                <MessageSquare className="h-3 w-3" />
                {formatDistanceToNow(new Date(card.last_message_at), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </Badge>
            )}

            {card.estimated_value && (
              <Badge variant="outline" className="gap-1">
                <DollarSign className="h-3 w-3" />
                R$ {card.estimated_value.toLocaleString("pt-BR")}
              </Badge>
            )}

            {card.expected_close_date && (
              <Badge variant="outline" className="gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(card.expected_close_date).toLocaleDateString("pt-BR")}
              </Badge>
            )}
          </div>

          {/* Tags Section */}
          {tags.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  Tags
                </span>
                {onAddTag && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setShowTagSelector(!showTagSelector)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar
                  </Button>
                )}
              </div>

              {/* Current Tags */}
              <div className="flex flex-wrap gap-1">
                {localTagIds.map((tagId) => {
                  const tag = tags.find((t) => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      <span
                        className={`w-2 h-2 rounded-full bg-${tag.color}-500`}
                        style={{
                          backgroundColor:
                            tag.color === "blue"
                              ? "#3b82f6"
                              : tag.color === "green"
                              ? "#22c55e"
                              : tag.color === "red"
                              ? "#ef4444"
                              : tag.color === "yellow"
                              ? "#eab308"
                              : tag.color === "purple"
                              ? "#a855f7"
                              : tag.color === "pink"
                              ? "#ec4899"
                              : tag.color === "orange"
                              ? "#f97316"
                              : tag.color === "cyan"
                              ? "#06b6d4"
                              : "#6b7280",
                        }}
                      />
                      {tag.name}
                      {onRemoveTag && (
                        <button
                          className="ml-1 hover:bg-muted rounded-full p-0.5"
                          onClick={() => handleRemoveTagLocal(card.id, tag.id)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  );
                })}
                {localTagIds.length === 0 && (
                  <span className="text-xs text-muted-foreground">
                    Nenhuma tag
                  </span>
                )}
              </div>

              {/* Tag Selector */}
              {showTagSelector && onAddTag && (
                <div className="flex flex-wrap gap-1 p-2 bg-muted/50 rounded-lg">
                  {tags
                    .filter((t) => !localTagIds.includes(t.id))
                    .map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => handleAddTagLocal(card.id, tag.id)}
                      >
                        <span
                          className="w-2 h-2 rounded-full mr-1"
                          style={{
                            backgroundColor:
                              tag.color === "blue"
                                ? "#3b82f6"
                                : tag.color === "green"
                                ? "#22c55e"
                                : tag.color === "red"
                                ? "#ef4444"
                                : tag.color === "yellow"
                                ? "#eab308"
                                : tag.color === "purple"
                                ? "#a855f7"
                                : tag.color === "pink"
                                ? "#ec4899"
                                : tag.color === "orange"
                                ? "#f97316"
                                : tag.color === "cyan"
                                ? "#06b6d4"
                                : "#6b7280",
                          }}
                        />
                        {tag.name}
                      </Badge>
                    ))}
                  {tags.filter((t) => !card.tagIds?.includes(t.id)).length ===
                    0 && (
                    <span className="text-xs text-muted-foreground">
                      Todas as tags já foram adicionadas
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Quick Actions */}
          <Button
            onClick={handleGoToConversation}
            className="w-full gap-2"
            variant="default"
          >
            <MessageSquare className="h-4 w-4" />
            Ver Conversa Completa
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
        </SheetHeader>

        <Separator />

        {/* Tabs */}
        <Tabs defaultValue="messages" className="flex-1 flex flex-col">
          <TabsList className="mx-6 mt-4">
            <TabsTrigger value="messages">Mensagens</TabsTrigger>
            <TabsTrigger value="notes">Notas</TabsTrigger>
            <TabsTrigger value="timeline">Atividades</TabsTrigger>
          </TabsList>

          <TabsContent
            value="messages"
            className="flex-1 m-0 p-4 flex flex-col overflow-hidden"
          >
            {loadingMessages ? (
              <div className="flex items-center justify-center flex-1">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Nenhuma mensagem encontrada</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col relative">
                <ScrollArea
                  className="flex-1 max-h-[calc(100vh-400px)]"
                  ref={messagesScrollRef}
                >
                  <div className="space-y-3 pr-4 pb-16">
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
                          className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                            msg.direction === "outgoing"
                              ? "bg-muted text-foreground"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          <p>{msg.content}</p>
                          <p className="text-[10px] opacity-70 mt-1">
                            {new Date(msg.timestamp).toLocaleString("pt-BR")}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                {/* Scroll to bottom button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 shadow-md gap-1 bg-background/95"
                  onClick={scrollToBottom}
                >
                  <ChevronDown className="h-4 w-4" />
                  Mais recentes
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="notes" className="flex-1 m-0">
            <CardNotes
              notes={notes}
              onAddNote={handleAddNote}
              loading={loadingNotes}
            />
          </TabsContent>

          <TabsContent value="timeline" className="flex-1 m-0">
            <CardTimeline activities={activities} loading={loadingActivities} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

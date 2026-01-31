"use client";

import { CRMFiltersComponent } from "@/components/crm/CRMFilters";
import { CardDetailPanel } from "@/components/crm/CardDetailPanel";
import { KanbanBoard } from "@/components/crm/KanbanBoard";
import { KanbanCard } from "@/components/crm/KanbanCard";
import { TagsManager } from "@/components/crm/TagsManager";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCRMCards } from "@/hooks/useCRMCards";
import { useCRMColumns } from "@/hooks/useCRMColumns";
import { useCRMTags } from "@/hooks/useCRMTags";
import { createBrowserClient } from "@/lib/supabase-browser";
import type { CRMCard, CRMFilters } from "@/lib/types";
import { LayoutGrid, List, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CRMPage() {
  const router = useRouter();
  const supabase = createBrowserClient();

  const [clientId, setClientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<CRMCard | null>(null);
  const [filters, setFilters] = useState<CRMFilters>({});
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

  // Fetch client_id from session
  useEffect(() => {
    const fetchClientId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("client_id")
        .eq("id", user.id)
        .single();

      if (profile?.client_id) {
        setClientId(profile.client_id);
      }
      setIsLoading(false);
    };

    fetchClientId();
  }, [supabase, router]);

  // Hooks
  const {
    columns,
    loading: columnsLoading,
    refetch: refetchColumns,
  } = useCRMColumns(clientId);

  const {
    cards,
    loading: cardsLoading,
    moveCard,
    addTag,
    removeTag,
    refetch: refetchCards,
  } = useCRMCards(clientId, filters);

  const {
    tags,
    loading: tagsLoading,
    createTag,
    deleteTag,
  } = useCRMTags(clientId);

  const handleMoveCard = async (
    cardId: string,
    columnId: string,
    position?: number,
  ): Promise<boolean> => {
    // Optimistic update is handled inside moveCard - no need to refetch
    return await moveCard(cardId, columnId, position);
  };

  const handleCardClick = (card: CRMCard) => {
    setSelectedCard(card);
  };

  const handleCloseDetail = () => {
    setSelectedCard(null);
  };

  const handleUpdateCard = async () => {
    await refetchCards();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-140px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const loading = columnsLoading || cardsLoading || tagsLoading;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CRM</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie seus leads e conversas
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tags Manager */}
          <TagsManager
            tags={tags}
            onCreateTag={createTag}
            onDeleteTag={deleteTag}
            loading={tagsLoading}
          />

          {/* View Toggle - Desktop only */}
          <div className="hidden md:flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === "kanban" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("kanban")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              disabled
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Add Column Button - Desktop only */}
          <Button size="sm" className="hidden md:flex" disabled>
            <Plus className="h-4 w-4 mr-1" />
            Nova Coluna
          </Button>
        </div>
      </div>

      {/* Filters */}
      <CRMFiltersComponent
        filters={filters}
        tags={tags}
        onFiltersChange={setFilters}
      />

      {/* Content */}
      {loading ? (
        <div className="flex-1 p-4 overflow-hidden">
          {/* Skeleton para Kanban */}
          <div className="flex gap-4 h-full">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-[320px] min-w-[320px] space-y-3">
                <Skeleton className="h-10 w-full rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-24 w-full rounded-lg" />
                  <Skeleton className="h-24 w-full rounded-lg" />
                  <Skeleton className="h-24 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Mobile: Tab-based columns */}
          <div className="md:hidden flex-1 overflow-hidden">
            {columns.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">
                  Nenhuma coluna encontrada
                </p>
              </div>
            ) : (
              <Tabs
                defaultValue={columns[0]?.id}
                className="h-full flex flex-col"
              >
                <ScrollArea className="flex-shrink-0 border-b border-border">
                  <TabsList className="w-full justify-start px-4">
                    {columns.map((col) => (
                      <TabsTrigger
                        key={col.id}
                        value={col.id}
                        className="flex-shrink-0"
                      >
                        {col.name} (
                        {cards.filter((c) => c.column_id === col.id).length})
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </ScrollArea>

                {columns.map((col) => {
                  const columnCards = cards.filter(
                    (c) => c.column_id === col.id,
                  );
                  return (
                    <TabsContent
                      key={col.id}
                      value={col.id}
                      className="flex-1 m-0 overflow-hidden"
                    >
                      <ScrollArea className="h-full p-4">
                        <div className="space-y-2">
                          {columnCards
                            .sort((a, b) => a.position - b.position)
                            .map((card) => (
                              <KanbanCard
                                key={card.id}
                                card={card}
                                tags={tags}
                                columns={columns}
                                onClick={() => handleCardClick(card)}
                                onMoveToColumn={(columnId) =>
                                  handleMoveCard(card.id, columnId)
                                }
                              />
                            ))}
                          {columnCards.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-8">
                              Nenhum card nesta coluna
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  );
                })}
              </Tabs>
            )}
          </div>

          {/* Desktop: Kanban Board */}
          <div className="hidden md:flex flex-1 overflow-hidden">
            {columns.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Nenhuma coluna encontrada. Adicione sua primeira coluna para
                  começar.
                </p>
              </div>
            ) : (
              <KanbanBoard
                columns={columns}
                cards={cards}
                tags={tags}
                onMoveCard={handleMoveCard}
                onCardClick={handleCardClick}
              />
            )}
          </div>
        </>
      )}

      {/* Card Detail Panel */}
      <CardDetailPanel
        card={selectedCard}
        open={!!selectedCard}
        onClose={handleCloseDetail}
        onUpdate={handleUpdateCard}
        tags={tags}
        onAddTag={addTag}
        onRemoveTag={removeTag}
      />
    </div>
  );
}

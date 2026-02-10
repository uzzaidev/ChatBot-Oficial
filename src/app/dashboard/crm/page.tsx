"use client";

import { AutomationRulesPanel } from "@/components/crm/AutomationRulesPanel";
import { CRMAnalyticsDashboard } from "@/components/crm/CRMAnalyticsDashboard";
import { CRMFiltersComponent } from "@/components/crm/CRMFilters";
import { CardDetailPanel } from "@/components/crm/CardDetailPanel";
import { CreateColumnDialog } from "@/components/crm/CreateColumnDialog";
import { DeleteColumnDialog } from "@/components/crm/DeleteColumnDialog";
import { EditColumnDialog } from "@/components/crm/EditColumnDialog";
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
import type { CRMCard, CRMColumn, CRMFilters } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart3, Kanban, LayoutGrid, List, Loader2 } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"pipeline" | "analytics">(
    "pipeline",
  );
  const [editingColumn, setEditingColumn] = useState<CRMColumn | null>(null);
  const [deletingColumn, setDeletingColumn] = useState<{
    column: CRMColumn;
    cardCount: number;
  } | null>(null);

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
    createColumn,
    updateColumn,
    deleteColumn,
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

  const handleEditColumn = (column: CRMColumn) => {
    console.log("[CRM] Edit column clicked:", column);
    setEditingColumn(column);
  };

  const handleSaveColumn = async (data: {
    name: string;
    color?: string;
    icon?: string;
  }) => {
    if (!editingColumn) return null;
    console.log("[CRM] Saving column:", editingColumn.id, data);
    const result = await updateColumn(editingColumn.id, data);
    if (result) {
      console.log("[CRM] Column updated successfully");
      setEditingColumn(null);
      await refetchColumns();
    }
    return result;
  };

  const handleDeleteColumn = async (columnId: string) => {
    console.log("[CRM] Delete column clicked:", columnId);
    const column = columns.find((c) => c.id === columnId);
    if (!column) {
      console.log("[CRM] Column not found");
      return;
    }

    const cardCount = cards.filter((c) => c.column_id === columnId).length;
    console.log("[CRM] Column has", cardCount, "cards");
    setDeletingColumn({ column, cardCount });
  };

  const confirmDeleteColumn = async () => {
    if (!deletingColumn) {
      console.log("[CRM] No column to delete");
      return;
    }
    if (deletingColumn.cardCount > 0) {
      console.log("[CRM] Cannot delete column with cards");
      return;
    }
    console.log("[CRM] Deleting column:", deletingColumn.column.id);
    const success = await deleteColumn(deletingColumn.column.id);
    if (success) {
      console.log("[CRM] Column deleted successfully");
      await refetchColumns();
    }
    setDeletingColumn(null);
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
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">CRM</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie seus leads e conversas
            </p>
          </div>

          {/* Main Tabs - Pipeline vs Analytics */}
          <div className="hidden sm:flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={activeTab === "pipeline" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("pipeline")}
            >
              <Kanban className="h-4 w-4 mr-2" />
              Pipeline
            </Button>
            <Button
              variant={activeTab === "analytics" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("analytics")}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile Tab Toggle */}
          <div className="sm:hidden flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={activeTab === "pipeline" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("pipeline")}
            >
              <Kanban className="h-4 w-4" />
            </Button>
            <Button
              variant={activeTab === "analytics" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("analytics")}
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
          </div>

          {/* Automation Rules */}
          {clientId && activeTab === "pipeline" && (
            <AutomationRulesPanel
              clientId={clientId}
              columns={columns}
              tags={tags}
            />
          )}

          {/* Tags Manager - Only in pipeline */}
          {activeTab === "pipeline" && (
            <TagsManager
              tags={tags}
              onCreateTag={createTag}
              onDeleteTag={deleteTag}
              loading={tagsLoading}
            />
          )}

          {/* View Toggle - Desktop only, only in pipeline */}
          {activeTab === "pipeline" && (
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
                title="Visualização em lista (em breve)"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Add Column Button - Desktop only, only in pipeline */}
          {activeTab === "pipeline" && (
            <CreateColumnDialog
              onCreateColumn={createColumn}
              disabled={!clientId}
            />
          )}
        </div>
      </div>

      {/* Analytics Tab */}
      {activeTab === "analytics" && clientId && (
        <ScrollArea className="flex-1 p-4">
          <CRMAnalyticsDashboard clientId={clientId} />
        </ScrollArea>
      )}

      {/* Pipeline Tab */}
      {activeTab === "pipeline" && (
        <>
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
              <div className="md:hidden flex-1 flex flex-col min-h-0">
                {columns.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-muted-foreground">
                      Nenhuma coluna encontrada
                    </p>
                  </div>
                ) : (
                  <Tabs
                    defaultValue={columns[0]?.id}
                    className="h-full flex flex-col min-h-0"
                  >
                    {/* Tabs header - scrollable horizontally */}
                    <div
                      className="flex-shrink-0 border-b border-border overflow-x-auto"
                      style={{ WebkitOverflowScrolling: "touch" }}
                    >
                      <TabsList className="w-max min-w-full justify-start px-4">
                        {columns.map((col) => (
                          <TabsTrigger
                            key={col.id}
                            value={col.id}
                            className="flex-shrink-0"
                          >
                            {col.name} (
                            {cards.filter((c) => c.column_id === col.id).length}
                            )
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </div>

                    {columns.map((col) => {
                      const columnCards = cards.filter(
                        (c) => c.column_id === col.id,
                      );
                      return (
                        <TabsContent
                          key={col.id}
                          value={col.id}
                          className="flex-1 m-0 min-h-0 overflow-auto"
                          style={{ WebkitOverflowScrolling: "touch" }}
                        >
                          <div className="p-4 space-y-2">
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
                                  disableDrag
                                />
                              ))}
                            {columnCards.length === 0 && (
                              <p className="text-sm text-muted-foreground text-center py-8">
                                Nenhum card nesta coluna
                              </p>
                            )}
                          </div>
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                )}
              </div>

              {/* Desktop: Kanban Board or List View */}
              <div className="hidden md:flex flex-1 overflow-hidden">
                {columns.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      Nenhuma coluna encontrada. Adicione sua primeira coluna
                      para começar.
                    </p>
                  </div>
                ) : viewMode === "kanban" ? (
                  <KanbanBoard
                    columns={columns}
                    cards={cards}
                    tags={tags}
                    onMoveCard={handleMoveCard}
                    onCardClick={handleCardClick}
                    onEditColumn={handleEditColumn}
                    onDeleteColumn={handleDeleteColumn}
                  />
                ) : (
                  /* List View */
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-2 max-w-4xl mx-auto">
                      {cards.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          Nenhum card encontrado
                        </p>
                      ) : (
                        cards.map((card) => {
                          const column = columns.find(
                            (c) => c.id === card.column_id,
                          );
                          const cardTags = tags.filter((t) =>
                            card.tagIds?.includes(t.id),
                          );
                          return (
                            <div
                              key={card.id}
                              className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                              onClick={() => handleCardClick(card)}
                            >
                              {/* Column indicator */}
                              <div
                                className="w-1 h-12 rounded-full"
                                style={{
                                  backgroundColor: column?.color || "#6B7280",
                                }}
                              />

                              {/* Contact info */}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {card.contact?.name || card.phone}
                                </p>
                                <p className="text-sm text-muted-foreground truncate">
                                  {card.last_message_at
                                    ? formatDistanceToNow(
                                        new Date(card.last_message_at),
                                        { addSuffix: true, locale: ptBR },
                                      )
                                    : "Sem mensagens"}
                                </p>
                              </div>

                              {/* Tags */}
                              {cardTags.length > 0 && (
                                <div className="flex gap-1">
                                  {cardTags.slice(0, 3).map((tag) => (
                                    <span
                                      key={tag.id}
                                      className="px-2 py-0.5 text-xs rounded-full text-white"
                                      style={{ backgroundColor: tag.color }}
                                    >
                                      {tag.name}
                                    </span>
                                  ))}
                                  {cardTags.length > 3 && (
                                    <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                                      +{cardTags.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Column name */}
                              <span className="text-sm text-muted-foreground whitespace-nowrap">
                                {column?.name || "Sem coluna"}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </>
          )}
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

      {/* Edit Column Dialog */}
      <EditColumnDialog
        column={editingColumn}
        open={!!editingColumn}
        onOpenChange={(open) => !open && setEditingColumn(null)}
        onSave={handleSaveColumn}
      />

      {/* Delete Column Dialog */}
      <DeleteColumnDialog
        open={!!deletingColumn}
        onOpenChange={(open) => !open && setDeletingColumn(null)}
        onConfirm={confirmDeleteColumn}
        columnName={deletingColumn?.column.name || ""}
        cardCount={deletingColumn?.cardCount || 0}
      />
    </div>
  );
}

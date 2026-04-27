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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCRMCards } from "@/hooks/useCRMCards";
import { useCRMColumns } from "@/hooks/useCRMColumns";
import { useCRMTags } from "@/hooks/useCRMTags";
import { createBrowserClient } from "@/lib/supabase-browser";
import type {
  ConversationStatus,
  CRMCard,
  CRMColumn,
  CRMFilters,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart3,
  EyeOff,
  Filter,
  Kanban,
  LayoutGrid,
  List,
  Loader2,
  Search,
  Settings2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

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
  const [hideEmptyColumns, setHideEmptyColumns] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editingColumn, setEditingColumn] = useState<CRMColumn | null>(null);
  const [deletingColumn, setDeletingColumn] = useState<{
    column: CRMColumn;
    cardCount: number;
  } | null>(null);

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

  const {
    columns,
    loading: columnsLoading,
    createColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
    refetch: refetchColumns,
  } = useCRMColumns(clientId);

  const {
    cards,
    loading: cardsLoading,
    moveCard,
    addTag,
    removeTag,
    bulkUpdateColumnStatus,
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
    return await moveCard(cardId, columnId, position);
  };

  const handleBulkUpdateColumnStatus = async (
    columnId: string,
    status: ConversationStatus,
  ): Promise<{ updated: number } | null> => {
    return await bulkUpdateColumnStatus(columnId, status);
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

  const handleContactNameSaved = (cardId: string, updatedName: string) => {
    setSelectedCard((current) =>
      current && current.id === cardId
        ? {
            ...current,
            contact: {
              ...current.contact,
              name: updatedName,
            },
          }
        : current,
    );
    void refetchCards();
  };

  const handleEditColumn = (column: CRMColumn) => {
    setEditingColumn(column);
  };

  const handleSaveColumn = async (data: {
    name: string;
    color?: string;
    icon?: string;
  }) => {
    if (!editingColumn) return null;
    const result = await updateColumn(editingColumn.id, data);
    if (result) {
      setEditingColumn(null);
      await refetchColumns();
    }
    return result;
  };

  const handleDeleteColumn = async (columnId: string) => {
    const column = columns.find((c) => c.id === columnId);
    if (!column) return;

    const cardCount = cards.filter((c) => c.column_id === columnId).length;
    setDeletingColumn({ column, cardCount });
  };

  const confirmDeleteColumn = async () => {
    if (!deletingColumn || deletingColumn.cardCount > 0) return;
    const success = await deleteColumn(deletingColumn.column.id);
    if (success) {
      await refetchColumns();
    }
    setDeletingColumn(null);
  };

  const loading = columnsLoading || cardsLoading || tagsLoading;
  const activeFiltersCount = [
    filters.search,
    filters.autoStatus,
    filters.assignedTo,
    filters.dateFrom,
    filters.dateTo,
    filters.tagIds?.length ? "tags" : undefined,
  ].filter(Boolean).length;

  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) return cards;
    const q = searchQuery.trim().toLowerCase();
    return cards.filter((card) => {
      const name = (card.contact?.name ?? "").toLowerCase();
      const phone = String(card.phone ?? "").toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [cards, searchQuery]);

  const cardsByColumn = useMemo(() => {
    return new Map(
      columns.map((column) => [
        column.id,
        filteredCards.filter((card) => card.column_id === column.id),
      ]),
    );
  }, [columns, filteredCards]);

  const visibleColumns = useMemo(() => {
    if (!hideEmptyColumns) return columns;
    return columns.filter(
      (column) => (cardsByColumn.get(column.id)?.length || 0) > 0,
    );
  }, [cardsByColumn, columns, hideEmptyColumns]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center flex-1">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden min-h-0">
      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
        {/* ── Compact header ────────────────────────────────────────── */}
        <div className="border-b border-border/60 px-4 py-3 md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                CRM
              </h1>
              <div className="crm-tab-list">
                <button
                  className="crm-pill-button px-4"
                  data-active={activeTab === "pipeline"}
                  onClick={() => setActiveTab("pipeline")}
                >
                  <Kanban className="h-4 w-4" />
                  Pipeline
                </button>
                <button
                  className="crm-pill-button px-4"
                  data-active={activeTab === "analytics"}
                  onClick={() => setActiveTab("analytics")}
                >
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </button>
              </div>
              {activeTab === "pipeline" && (
                <button
                  className={cn(
                    "crm-pill-button gap-1.5 px-3 text-xs",
                    hideEmptyColumns && "data-[active=true]",
                  )}
                  data-active={hideEmptyColumns}
                  onClick={() => setHideEmptyColumns((v) => !v)}
                  title={
                    hideEmptyColumns
                      ? "Mostrar colunas vazias"
                      : "Ocultar colunas vazias"
                  }
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  Ocultar vazias
                </button>
              )}
              {activeTab === "pipeline" && (
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar contato..."
                    className="h-8 w-44 rounded-full border-border/80 bg-background/50 pl-8 pr-7 text-xs focus-visible:ring-1 focus-visible:w-56 transition-all duration-200"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
              {activeFiltersCount > 0 && (
                <span className="crm-stat-chip">
                  <Filter className="h-3.5 w-3.5 text-primary" />
                  {activeFiltersCount} filtro{activeFiltersCount > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {activeTab === "pipeline" && (
              <div className="flex items-center gap-2">
                {/* Board / List toggle */}
                <div className="flex items-center gap-1 rounded-full border border-border/80 bg-background/30 p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "rounded-full px-3 text-xs",
                      viewMode === "kanban" &&
                        "bg-primary/15 text-primary hover:bg-primary/15",
                    )}
                    onClick={() => setViewMode("kanban")}
                    title="Visualização em board"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "rounded-full px-3 text-xs",
                      viewMode === "list" &&
                        "bg-primary/15 text-primary hover:bg-primary/15",
                    )}
                    onClick={() => setViewMode("list")}
                    title="Visualização em lista"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>

                {/* Settings gear */}
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full gap-1.5 text-xs border-border/80"
                  onClick={() => setShowSettings(true)}
                  title="Configurações do pipeline"
                >
                  <Settings2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Configurar</span>
                </Button>

                <CreateColumnDialog
                  onCreateColumn={createColumn}
                  disabled={!clientId}
                />
              </div>
            )}
          </div>
        </div>
        {/* ── /Compact header ───────────────────────────────────────── */}

        {activeTab === "analytics" && clientId && (
          <div className="crm-board-scroll flex-1 min-h-0 overflow-auto px-4 py-4 md:px-6 md:py-6">
            <CRMAnalyticsDashboard clientId={clientId} />
          </div>
        )}

        {activeTab === "pipeline" && (
          <>
            <div className="flex-1 min-h-0 overflow-hidden px-4 pb-4 pt-4 md:px-6 md:pb-6">
              {loading ? (
                <div className="h-full pt-4">
                  <div className="flex gap-4 h-full overflow-hidden">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="crm-column-shell w-[340px] min-w-[340px] rounded-[24px] p-3"
                      >
                        <Skeleton className="h-12 w-full rounded-2xl bg-white/5" />
                        <div className="mt-3 space-y-3">
                          <Skeleton className="h-28 w-full rounded-[20px] bg-white/5" />
                          <Skeleton className="h-28 w-full rounded-[20px] bg-white/5" />
                          <Skeleton className="h-28 w-full rounded-[20px] bg-white/5" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="md:hidden flex-1 flex flex-col min-h-0">
                    {visibleColumns.length === 0 ? (
                      <div className="crm-panel flex flex-1 items-center justify-center rounded-[24px] border-dashed p-8 text-center text-sm text-muted-foreground">
                        Nenhuma coluna encontrada. Crie a primeira etapa do
                        pipeline para começar.
                      </div>
                    ) : (
                      <Tabs
                        defaultValue={visibleColumns[0]?.id}
                        className="h-full flex flex-col min-h-0"
                      >
                        <div
                          className="crm-board-scroll flex-shrink-0 overflow-x-auto"
                          style={{ WebkitOverflowScrolling: "touch" }}
                        >
                          <TabsList className="crm-tab-list h-auto w-max min-w-full justify-start gap-1 rounded-[20px] p-1">
                            {visibleColumns.map((col) => (
                              <TabsTrigger
                                key={col.id}
                                value={col.id}
                                className="crm-tab-trigger rounded-2xl px-3 py-2 text-xs"
                              >
                                {col.name}
                                <span className="ml-1 text-[11px] text-muted-foreground">
                                  ({cardsByColumn.get(col.id)?.length || 0})
                                </span>
                              </TabsTrigger>
                            ))}
                          </TabsList>
                        </div>

                        {visibleColumns.map((col) => {
                          const columnCards =
                            cardsByColumn
                              .get(col.id)
                              ?.sort((a, b) => a.position - b.position) || [];

                          return (
                            <TabsContent
                              key={col.id}
                              value={col.id}
                              className="mt-4 flex-1 min-h-0"
                            >
                              <div className="crm-board-scroll h-full overflow-y-auto pr-1">
                                <div className="space-y-3">
                                  {columnCards.map((card) => (
                                    <KanbanCard
                                      key={card.id}
                                      card={card}
                                      tags={tags}
                                      columns={visibleColumns}
                                      onClick={() => handleCardClick(card)}
                                      onMoveToColumn={(columnId) =>
                                        handleMoveCard(card.id, columnId)
                                      }
                                      disableDrag
                                    />
                                  ))}
                                  {columnCards.length === 0 && (
                                    <div className="crm-column-empty rounded-[20px] px-4 py-8 text-center text-sm text-muted-foreground">
                                      Nenhum card nesta coluna
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TabsContent>
                          );
                        })}
                      </Tabs>
                    )}
                  </div>

                  <div className="hidden md:flex h-full flex-1 min-h-0 min-w-0 overflow-hidden pt-4">
                    {visibleColumns.length === 0 ? (
                      <div className="crm-panel flex flex-1 items-center justify-center rounded-[28px] border-dashed p-10 text-center text-sm text-muted-foreground">
                        Nenhuma coluna encontrada. Adicione a primeira etapa do
                        pipeline para começar.
                      </div>
                    ) : viewMode === "kanban" ? (
                      <KanbanBoard
                        columns={visibleColumns}
                        orderedColumnIds={columns.map((c) => c.id)}
                        cards={filteredCards}
                        tags={tags}
                        onMoveCard={handleMoveCard}
                        onBulkUpdateColumnStatus={handleBulkUpdateColumnStatus}
                        onCardClick={handleCardClick}
                        onEditColumn={handleEditColumn}
                        onDeleteColumn={handleDeleteColumn}
                        onReorderColumns={reorderColumns}
                      />
                    ) : (
                      <div className="crm-board-scroll flex-1 overflow-auto pr-4">
                        <div className="space-y-3">
                          {filteredCards.length === 0 ? (
                            <div className="crm-panel rounded-[24px] border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
                              Nenhum card encontrado com os filtros atuais.
                            </div>
                          ) : (
                            filteredCards
                              .slice()
                              .sort((a, b) => {
                                if (a.column_id === b.column_id) {
                                  return a.position - b.position;
                                }
                                return (
                                  (columns.find((col) => col.id === a.column_id)
                                    ?.position || 0) -
                                  (columns.find((col) => col.id === b.column_id)
                                    ?.position || 0)
                                );
                              })
                              .map((card) => {
                                const column = columns.find(
                                  (c) => c.id === card.column_id,
                                );
                                const cardTags = tags.filter((t) =>
                                  card.tagIds?.includes(t.id),
                                );

                                return (
                                  <div
                                    key={card.id}
                                    className="crm-card-shell cursor-pointer px-4 py-3"
                                    data-status={card.auto_status}
                                    onClick={() => handleCardClick(card)}
                                  >
                                    <div className="flex items-center gap-4">
                                      <div
                                        className="crm-handle h-12 w-1.5 rounded-full"
                                        style={{
                                          background:
                                            column?.color === "red"
                                              ? "linear-gradient(180deg,#ef4444,#7f1d1d)"
                                              : column?.color === "blue"
                                              ? "linear-gradient(180deg,#3b82f6,#1d4ed8)"
                                              : column?.color === "green" ||
                                                column?.color === "mint"
                                              ? "linear-gradient(180deg,#10b981,#047857)"
                                              : column?.color === "gold" ||
                                                column?.color === "yellow"
                                              ? "linear-gradient(180deg,#f59e0b,#b45309)"
                                              : "linear-gradient(180deg,#14b8a6,#2563eb)",
                                        }}
                                      />

                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-foreground">
                                          {card.contact?.name || card.phone}
                                        </p>
                                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                          <span className="truncate">
                                            {card.last_message_at
                                              ? formatDistanceToNow(
                                                  new Date(
                                                    card.last_message_at,
                                                  ),
                                                  {
                                                    addSuffix: true,
                                                    locale: ptBR,
                                                  },
                                                )
                                              : "Sem mensagens"}
                                          </span>
                                          <span className="text-border">•</span>
                                          <span className="truncate">
                                            {column?.name || "Sem coluna"}
                                          </span>
                                        </div>
                                      </div>

                                      {cardTags.length > 0 && (
                                        <div className="flex max-w-[280px] flex-wrap justify-end gap-1">
                                          {cardTags.slice(0, 3).map((tag) => (
                                            <span
                                              key={tag.id}
                                              className="crm-tag-badge border"
                                              style={{
                                                backgroundColor: `${
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
                                                    : "#6b7280"
                                                }20`,
                                                borderColor: `${
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
                                                    : "#6b7280"
                                                }33`,
                                                color:
                                                  tag.color === "yellow"
                                                    ? "#fde68a"
                                                    : "#f8fafc",
                                              }}
                                            >
                                              {tag.name}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <CardDetailPanel
        card={selectedCard}
        open={!!selectedCard}
        onClose={handleCloseDetail}
        onUpdate={handleUpdateCard}
        onContactNameSaved={handleContactNameSaved}
        tags={tags}
        onAddTag={addTag}
        onRemoveTag={removeTag}
      />

      <EditColumnDialog
        column={editingColumn}
        open={!!editingColumn}
        onOpenChange={(open) => !open && setEditingColumn(null)}
        onSave={handleSaveColumn}
      />

      <DeleteColumnDialog
        open={!!deletingColumn}
        onOpenChange={(open) => !open && setDeletingColumn(null)}
        onConfirm={confirmDeleteColumn}
        columnName={deletingColumn?.column.name || ""}
        cardCount={deletingColumn?.cardCount || 0}
      />

      {/* ── Settings modal ──────────────────────────────────────────── */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Configurações do Pipeline
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-5 pt-2">
            {/* Filters */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Filtros
              </p>
              <CRMFiltersComponent
                filters={filters}
                tags={tags}
                onFiltersChange={setFilters}
              />
            </div>

            {/* Display options */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Exibição
              </p>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-full justify-start gap-2 rounded-xl",
                  hideEmptyColumns &&
                    "border-primary/40 bg-primary/10 text-primary",
                )}
                onClick={() => setHideEmptyColumns((current) => !current)}
              >
                <EyeOff className="h-4 w-4" />
                {hideEmptyColumns
                  ? "Mostrar colunas vazias"
                  : "Ocultar colunas vazias"}
              </Button>
            </div>

            {/* Tags */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tags
              </p>
              <TagsManager
                tags={tags}
                onCreateTag={createTag}
                onDeleteTag={deleteTag}
                loading={tagsLoading}
              />
            </div>

            {/* Automations */}
            {clientId && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Automações
                </p>
                <AutomationRulesPanel
                  clientId={clientId}
                  columns={columns}
                  tags={tags}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* ── /Settings modal ─────────────────────────────────────────── */}
    </div>
  );
}

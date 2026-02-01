"use client";

import { ConversationDetail } from "@/components/ConversationDetail";
import { ConversationList } from "@/components/ConversationList";
import { ConversationsHeader } from "@/components/ConversationsHeader";
import { DragDropZone } from "@/components/DragDropZone";
import { EmptyStateSimple } from "@/components/EmptyState";
import type { MediaAttachment } from "@/components/MediaPreview";
import { SendMessageForm } from "@/components/SendMessageForm";
import { StatusToggle } from "@/components/StatusToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useConversations } from "@/hooks/useConversations";
import { useGlobalRealtimeNotifications } from "@/hooks/useGlobalRealtimeNotifications";
import { markConversationAsRead } from "@/lib/api";
import type { Message } from "@/lib/types";
import { getInitials } from "@/lib/utils";
import {
  ArrowRight,
  Bot,
  Home,
  Menu,
  MessageCircle,
  Search,
  User,
  Workflow,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface ConversationsIndexClientProps {
  clientId: string;
  initialPhone?: string | null;
}

/**
 * ConversationsIndexClient - Client Component
 *
 * Página de índice de conversas que mostra:
 * - Sidebar com lista de conversas (sempre visível)
 * - Campo de pesquisa inteligente (contatos e números)
 * - Filtros por status (todas, bot, humano, transferido)
 * - Área central vazia com mensagem para selecionar uma conversa
 */
export function ConversationsIndexClient({
  clientId,
  initialPhone,
}: ConversationsIndexClientProps) {
  const [statusFilter, setStatusFilter] = useState<
    "all" | "bot" | "humano" | "transferido" | "fluxo_inicial"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPhone, setSelectedPhone] = useState<string | null>(
    initialPhone || null,
  );
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);
  // Ref para armazenar referências aos elementos das conversas (para scroll automático)
  const conversationItemsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  // Flag para indicar que acabamos de fazer scroll automático (evita restaurar scroll)
  const justScrolledToConversationRef = useRef(false);

  // Refs para callbacks de optimistic updates
  const optimisticCallbacksRef = useRef<{
    onOptimisticMessage: (message: Message) => void;
    onMessageError: (tempId: string) => void;
  } | null>(null);

  const { conversations, loading, refetchSilent } = useConversations({
    clientId,
    status: statusFilter === "all" ? undefined : statusFilter,
    enableRealtime: true,
  });

  // Efeito para garantir que a conversa inicial seja selecionada
  // Mesmo que o selectedPhone já esteja definido, precisamos garantir que
  // a conversa seja encontrada e aberta
  useEffect(() => {
    if (initialPhone && !loading && conversations.length > 0) {
      // Sempre tentar selecionar quando vem da URL
      const conversation = conversations.find((c) => c.phone === initialPhone);
      if (conversation && selectedPhone !== initialPhone) {
        setSelectedPhone(initialPhone);
      }
    }
  }, [initialPhone, loading, conversations]);

  // Hook global para notificações em tempo real
  // 🔐 Multi-tenant: Pass clientId for tenant isolation
  const { lastUpdatePhone } = useGlobalRealtimeNotifications({ clientId });

  // Salvar posição do scroll antes de atualizar
  const saveScrollPosition = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollPositionRef.current = scrollContainerRef.current.scrollTop;
    }
  }, []);

  // Restaurar posição do scroll após atualização
  const restoreScrollPosition = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollPositionRef.current;
    }
  }, []);

  // Filtrar conversas baseado no termo de pesquisa (após 2 caracteres)
  const filteredConversations = useMemo(() => {
    // Se o termo de pesquisa tiver menos de 2 caracteres, mostrar todas
    if (searchTerm.length < 2) {
      return conversations;
    }

    const searchLower = searchTerm.toLowerCase().trim();
    // Limpar o termo de pesquisa uma vez fora do loop de filter
    const phoneSearchTerm = searchTerm.replace(/\D/g, "");

    // Filtrar por nome ou telefone
    return conversations.filter((conversation) => {
      const nameMatch = conversation.name?.toLowerCase().includes(searchLower);
      const phoneMatch =
        phoneSearchTerm && conversation.phone?.includes(phoneSearchTerm);
      return nameMatch || phoneMatch;
    });
  }, [conversations, searchTerm]);

  // Scroll automático para a conversa selecionada quando ela é clicada
  // Ajusta o scroll baseado na data da conversa (conversas mais antigas ficam mais abaixo)
  useLayoutEffect(() => {
    if (selectedPhone && scrollContainerRef.current) {
      // Marcar que vamos fazer scroll automático
      justScrolledToConversationRef.current = true;

      // Pequeno delay para garantir que o DOM foi atualizado
      const timeout = setTimeout(() => {
        const selectedElement = conversationItemsRef.current.get(selectedPhone);
        if (selectedElement && scrollContainerRef.current) {
          const container = scrollContainerRef.current;
          const elementTop = selectedElement.offsetTop;
          const elementHeight = selectedElement.offsetHeight;
          const containerHeight = container.clientHeight;
          const containerScrollTop = container.scrollTop;
          const containerScrollBottom = containerScrollTop + containerHeight;

          // Verificar se o elemento já está visível na viewport
          const elementBottom = elementTop + elementHeight;
          const isFullyVisible =
            elementTop >= containerScrollTop &&
            elementBottom <= containerScrollBottom;

          // Só fazer scroll se o elemento não estiver totalmente visível
          if (!isFullyVisible) {
            // Calcular posição para centralizar o elemento na viewport
            // Isso garante que conversas antigas (mais abaixo) sejam visíveis
            const scrollPosition =
              elementTop - containerHeight / 2 + elementHeight / 2;

            // Scroll suave até a conversa selecionada
            container.scrollTo({
              top: Math.max(0, scrollPosition),
              behavior: "smooth",
            });

            // Salvar a nova posição após um pequeno delay (para aguardar o scroll suave)
            setTimeout(() => {
              if (scrollContainerRef.current) {
                scrollPositionRef.current =
                  scrollContainerRef.current.scrollTop;
              }
              // Resetar flag após o scroll completar
              justScrolledToConversationRef.current = false;
            }, 500); // Aumentado para 500ms para garantir que o scroll suave completou
          } else {
            // Se já está visível, resetar flag imediatamente
            justScrolledToConversationRef.current = false;
          }
        } else {
          // Se elemento não encontrado, resetar flag
          justScrolledToConversationRef.current = false;
        }
      }, 150); // Delay para garantir que o DOM foi atualizado

      return () => clearTimeout(timeout);
    } else {
      // Se não há conversa selecionada, resetar flag
      justScrolledToConversationRef.current = false;
    }
  }, [selectedPhone]);

  // REMOVIDO: Restaurar scroll quando as conversas são atualizadas
  // Isso estava causando conflito com o scroll automático
  // O scroll só deve ser restaurado manualmente pelo usuário ou quando não há conversa selecionada
  // Com realtime, as atualizações são silenciosas e não devem resetar o scroll
  // useLayoutEffect removido para evitar piscar e resetar scroll

  // Handler para scroll - salva posição durante scroll manual do usuário
  const handleScroll = useCallback(() => {
    // Só salvar posição se não acabamos de fazer scroll automático
    // Isso evita sobrescrever a posição do scroll automático
    if (!justScrolledToConversationRef.current) {
      saveScrollPosition();
    }
  }, [saveScrollPosition]);

  const handleClearSearch = useCallback(() => {
    setSearchTerm("");
  }, []);

  const handleSelectConversation = useCallback((phone: string) => {
    setSelectedPhone(phone);
  }, []);

  // Handlers para attachments
  const handleAddAttachment = useCallback((attachment: MediaAttachment) => {
    setAttachments((prev) => [...prev, attachment]);
  }, []);

  const handleFileSelect = useCallback(
    (file: File, type: "image" | "document") => {
      const attachment: MediaAttachment = {
        file,
        type,
        preview: type === "image" ? URL.createObjectURL(file) : undefined,
      };
      handleAddAttachment(attachment);
    },
    [handleAddAttachment],
  );

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleClearAttachments = useCallback(() => {
    setAttachments([]);
  }, []);

  // Callback para capturar os callbacks do ConversationDetail
  const handleGetOptimisticCallbacks = useCallback(
    (callbacks: {
      onOptimisticMessage: (message: Message) => void;
      onMessageError: (tempId: string) => void;
    }) => {
      optimisticCallbacksRef.current = callbacks;
    },
    [],
  );

  // Callback para marcar como lida
  const handleMarkAsRead = useCallback(
    async (conversationPhone: string) => {
      // Marcar como lida na API
      const result = await markConversationAsRead(conversationPhone);

      if (result.success) {
        // Refetch silencioso (sem loading) para atualizar UI
        // O realtime também vai atualizar, mas fazemos refetch imediato para garantir
        await refetchSilent();
      }
    },
    [refetchSilent],
  );

  // Calcular métricas por status
  const metrics = useMemo(() => {
    return {
      total: conversations.length,
      bot: conversations.filter((c) => c.status === "bot").length,
      humano: conversations.filter((c) => c.status === "humano").length,
      emFlow: conversations.filter((c) => c.status === "fluxo_inicial").length,
      transferido: conversations.filter((c) => c.status === "transferido")
        .length,
    };
  }, [conversations]);

  // Helper para obter label do status
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      all: "Todas",
      bot: "Bot",
      humano: "Humano",
      transferido: "Transferido",
      fluxo_inicial: "Em Flow",
    };
    return labels[status] || status;
  };

  // Encontrar conversa selecionada
  const selectedConversation = useMemo(() => {
    if (!selectedPhone) return null;
    return conversations.find((c) => c.phone === selectedPhone);
  }, [selectedPhone, conversations]);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-background">
      {/* Header com Cards KPI - Esconde em mobile quando conversa selecionada */}
      <div className={`relative ${selectedPhone ? "hidden lg:block" : ""}`}>
        {/* Botão Hambúrguer Mobile - No topo do header */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden absolute top-2 left-2 z-30 text-foreground hover:bg-muted rounded-lg bg-card/90"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        {/* Theme Toggle - Mobile */}
        <div className="lg:hidden absolute top-2 right-2 z-30">
          <ThemeToggle />
        </div>
        <ConversationsHeader
          metrics={metrics}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
        />
      </div>

      {/* Conteúdo Principal - Sidebar + Área de Conversas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Desktop - Oculta em mobile (< lg) */}
        <div className="hidden lg:flex w-80 flex-col border-r border-border/50 bg-card/95">
          {/* Header da Sidebar */}
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-poppins font-semibold text-sm text-foreground/90">
                Conversas
              </h3>
              <div className="flex items-center gap-1">
                <ThemeToggle />
                <Link href="/dashboard">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  >
                    <Home className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Campo de Pesquisa */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Pesquisar contatos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-surface-sunken border border-border rounded-lg px-10 py-2.5 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors text-sm"
                style={{ fontFamily: "Inter, sans-serif" }}
              />
              {searchTerm && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground/70"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Indicador de pesquisa */}
            {searchTerm.length >= 2 && (
              <p className="text-xs text-muted-foreground mt-2">
                {filteredConversations.length} resultado
                {filteredConversations.length !== 1 ? "s" : ""} encontrado
                {filteredConversations.length !== 1 ? "s" : ""}
              </p>
            )}
            {searchTerm.length === 1 && (
              <p className="text-xs text-muted-foreground/60 mt-2">
                Digite mais 1 caractere para pesquisar...
              </p>
            )}
          </div>

          {/* Filtros Simples - Todas / Não Lidas */}
          <div className="px-4 py-3 border-b border-border/50">
            <div className="flex gap-2">
              <button className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all bg-muted/30 text-muted-foreground hover:bg-muted/50">
                Todas
              </button>
              <button className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all bg-muted/30 text-muted-foreground hover:bg-muted/50">
                Não lidas
              </button>
            </div>
          </div>

          {/* Lista de Conversas */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto"
          >
            {filteredConversations.length === 0 && !loading ? (
              <EmptyStateSimple
                icon={
                  statusFilter === "all"
                    ? MessageCircle
                    : statusFilter === "bot"
                    ? Bot
                    : statusFilter === "humano"
                    ? User
                    : statusFilter === "fluxo_inicial"
                    ? Workflow
                    : statusFilter === "transferido"
                    ? ArrowRight
                    : MessageCircle
                }
                title={
                  statusFilter === "all"
                    ? "Nenhuma conversa encontrada"
                    : `Nenhuma conversa com status "${getStatusLabel(
                        statusFilter,
                      )}"`
                }
                description={
                  statusFilter === "all"
                    ? "Quando você receber mensagens no WhatsApp, elas aparecerão aqui"
                    : `Não há conversas com status "${getStatusLabel(
                        statusFilter,
                      )}" no momento. Tente mudar o filtro ou aguarde novas conversas.`
                }
              />
            ) : (
              <ConversationList
                conversations={filteredConversations}
                loading={loading}
                clientId={clientId}
                currentPhone={selectedPhone || undefined}
                lastUpdatePhone={lastUpdatePhone}
                onConversationOpen={handleSelectConversation}
                onMarkAsRead={handleMarkAsRead}
                conversationItemsRef={conversationItemsRef}
              />
            )}
          </div>
        </div>

        {/* Sidebar Mobile - Sheet drawer */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-[85vw] sm:w-96 bg-card/95">
            <SheetTitle className="sr-only">Conversas</SheetTitle>
            <div className="flex flex-col h-full">
              {/* Header da Sidebar */}
              <div className="p-4 border-b border-border/50">
                <div className="flex items-center gap-3 mb-4">
                  <Link href="/dashboard">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    >
                      <Home className="h-4 w-4" />
                    </Button>
                  </Link>
                  <h3 className="font-poppins font-semibold text-sm text-foreground/90">
                    Conversas
                  </h3>
                </div>

                {/* Campo de Pesquisa */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Pesquisar contatos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-surface-sunken border border-border rounded-lg px-10 py-2.5 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors text-sm"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  />
                  {searchTerm && (
                    <button
                      onClick={handleClearSearch}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground/70"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Indicador de pesquisa */}
                {searchTerm.length >= 2 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {filteredConversations.length} resultado
                    {filteredConversations.length !== 1 ? "s" : ""} encontrado
                    {filteredConversations.length !== 1 ? "s" : ""}
                  </p>
                )}
                {searchTerm.length === 1 && (
                  <p className="text-xs text-muted-foreground/60 mt-2">
                    Digite mais 1 caractere para pesquisar...
                  </p>
                )}
              </div>

              {/* Filtros Simples - Todas / Não Lidas */}
              <div className="px-4 py-3 border-b border-border/50">
                <div className="flex gap-2">
                  <button className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all bg-muted/30 text-muted-foreground hover:bg-muted/50">
                    Todas
                  </button>
                  <button className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all bg-muted/30 text-muted-foreground hover:bg-muted/50">
                    Não lidas
                  </button>
                </div>
              </div>

              {/* Lista de Conversas */}
              <div className="flex-1 overflow-y-auto">
                {filteredConversations.length === 0 && !loading ? (
                  <EmptyStateSimple
                    icon={
                      statusFilter === "all"
                        ? MessageCircle
                        : statusFilter === "bot"
                        ? Bot
                        : statusFilter === "humano"
                        ? User
                        : statusFilter === "fluxo_inicial"
                        ? Workflow
                        : statusFilter === "transferido"
                        ? ArrowRight
                        : MessageCircle
                    }
                    title={
                      statusFilter === "all"
                        ? "Nenhuma conversa encontrada"
                        : `Nenhuma conversa com status "${getStatusLabel(
                            statusFilter,
                          )}"`
                    }
                    description={
                      statusFilter === "all"
                        ? "Quando você receber mensagens no WhatsApp, elas aparecerão aqui"
                        : `Não há conversas com status "${getStatusLabel(
                            statusFilter,
                          )}" no momento. Tente mudar o filtro ou aguarde novas conversas.`
                    }
                  />
                ) : (
                  <ConversationList
                    conversations={filteredConversations}
                    loading={loading}
                    clientId={clientId}
                    currentPhone={selectedPhone || undefined}
                    lastUpdatePhone={lastUpdatePhone}
                    onConversationOpen={(phone) => {
                      handleSelectConversation(phone);
                      setSidebarOpen(false);
                    }}
                    onMarkAsRead={handleMarkAsRead}
                    conversationItemsRef={conversationItemsRef}
                  />
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Área Principal - Chat ou Empty State */}
        <div className="flex-1 flex flex-col bg-surface">
          {selectedConversation && selectedPhone ? (
            <>
              {/* Header do Chat */}
              <div className="bg-card p-3 border-b border-border">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {/* Botão Menu (Mobile) */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden flex-shrink-0 text-foreground hover:bg-muted"
                    onClick={() => setSidebarOpen(true)}
                  >
                    <Menu className="h-5 w-5" />
                  </Button>

                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-secondary to-primary text-white">
                      {getInitials(selectedConversation.name || "Sem nome")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {selectedConversation.name || "Sem nome"}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedPhone}
                    </p>
                  </div>

                  {/* Status Toggle */}
                  <div className="w-full sm:w-auto">
                    <StatusToggle
                      phone={selectedPhone}
                      currentStatus={selectedConversation.status}
                    />
                  </div>
                </div>
              </div>

              {/* Área de Mensagens com Drag & Drop */}
              <div className="flex-1 overflow-hidden bg-background relative">
                <DragDropZone onFileSelect={handleFileSelect}>
                  <ConversationDetail
                    phone={selectedPhone}
                    clientId={clientId}
                    conversationName={selectedConversation.name || undefined}
                    onGetOptimisticCallbacks={handleGetOptimisticCallbacks}
                    onMarkAsRead={handleMarkAsRead}
                  />
                </DragDropZone>
              </div>

              {/* Footer - Input de Mensagem */}
              <div className="bg-card p-3 border-t border-border">
                <SendMessageForm
                  phone={selectedPhone}
                  clientId={clientId}
                  attachments={attachments}
                  onAddAttachment={handleFileSelect}
                  onRemoveAttachment={handleRemoveAttachment}
                  onClearAttachments={handleClearAttachments}
                  onOptimisticMessage={
                    optimisticCallbacksRef.current?.onOptimisticMessage
                  }
                  onMessageError={
                    optimisticCallbacksRef.current?.onMessageError
                  }
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center relative">
              <div className="text-center max-w-md px-6">
                <div className="mb-6 flex justify-center">
                  <div className="h-20 w-20 rounded-full flex items-center justify-center border-2 bg-surface border-primary shadow-glow">
                    <MessageCircle className="h-10 w-10 text-primary" />
                  </div>
                </div>
                <h2 className="font-poppins font-semibold text-xl text-foreground mb-3">
                  Selecione uma conversa
                </h2>
                <p className="text-muted-foreground mb-6 max-w-xs mx-auto leading-relaxed">
                  {typeof window !== "undefined" && window.innerWidth < 1024
                    ? "Toque no menu acima para ver suas conversas"
                    : "Escolha uma conversa na lista ao lado para visualizar e responder mensagens"}
                </p>
                {/* Botão para abrir sidebar no mobile */}
                <div className="lg:hidden">
                  <Button
                    onClick={() => setSidebarOpen(true)}
                    className="bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90"
                  >
                    <Menu className="h-4 w-4 mr-2" />
                    Ver Conversas
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

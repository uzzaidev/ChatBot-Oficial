'use client'

import { useState, useMemo, useRef, useCallback, useLayoutEffect } from 'react'
import { useConversations } from '@/hooks/useConversations'
import { useGlobalRealtimeNotifications } from '@/hooks/useGlobalRealtimeNotifications'
import { ConversationList } from '@/components/ConversationList'
import { ConversationsHeader } from '@/components/ConversationsHeader'
import { ConversationDetail } from '@/components/ConversationDetail'
import { SendMessageForm } from '@/components/SendMessageForm'
import { StatusToggle } from '@/components/StatusToggle'
import { DragDropZone } from '@/components/DragDropZone'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MessageCircle, Bot, User, ArrowRight, Search, X, Workflow, Home, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { EmptyStateSimple } from '@/components/EmptyState'
import { getInitials } from '@/lib/utils'
import { markConversationAsRead } from '@/lib/api'
import Link from 'next/link'
import type { MediaAttachment } from '@/components/MediaPreview'
import type { Message } from '@/lib/types'

interface ConversationsIndexClientProps {
  clientId: string
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
export function ConversationsIndexClient({ clientId }: ConversationsIndexClientProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'bot' | 'humano' | 'transferido' | 'fluxo_inicial'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<MediaAttachment[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const scrollPositionRef = useRef(0)

  // Refs para callbacks de optimistic updates
  const optimisticCallbacksRef = useRef<{
    onOptimisticMessage: (message: Message) => void
    onMessageError: (tempId: string) => void
  } | null>(null)

  const { conversations, loading } = useConversations({
    clientId,
    status: statusFilter === 'all' ? undefined : statusFilter,
    enableRealtime: true,
  })

  // Hook global para notificações em tempo real
  // 🔐 Multi-tenant: Pass clientId for tenant isolation
  const { lastUpdatePhone } = useGlobalRealtimeNotifications({ clientId })

  // Salvar posição do scroll antes de atualizar
  const saveScrollPosition = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollPositionRef.current = scrollContainerRef.current.scrollTop
    }
  }, [])

  // Restaurar posição do scroll após atualização
  const restoreScrollPosition = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollPositionRef.current
    }
  }, [])

  // Filtrar conversas baseado no termo de pesquisa (após 2 caracteres)
  const filteredConversations = useMemo(() => {
    // Se o termo de pesquisa tiver menos de 2 caracteres, mostrar todas
    if (searchTerm.length < 2) {
      return conversations
    }

    const searchLower = searchTerm.toLowerCase().trim()
    // Limpar o termo de pesquisa uma vez fora do loop de filter
    const phoneSearchTerm = searchTerm.replace(/\D/g, '')

    // Filtrar por nome ou telefone
    return conversations.filter((conversation) => {
      const nameMatch = conversation.name?.toLowerCase().includes(searchLower)
      const phoneMatch = phoneSearchTerm && conversation.phone?.includes(phoneSearchTerm)
      return nameMatch || phoneMatch
    })
  }, [conversations, searchTerm])

  // Restaurar scroll quando as conversas são atualizadas (useLayoutEffect para sincronização imediata com DOM)
  useLayoutEffect(() => {
    restoreScrollPosition()
  }, [conversations, restoreScrollPosition])

  // Handler para scroll - salva posição durante scroll
  const handleScroll = useCallback(() => {
    saveScrollPosition()
  }, [saveScrollPosition])

  const handleClearSearch = useCallback(() => {
    setSearchTerm('')
  }, [])

  const handleSelectConversation = useCallback((phone: string) => {
    setSelectedPhone(phone)
  }, [])

  // Handlers para attachments
  const handleAddAttachment = useCallback((attachment: MediaAttachment) => {
    setAttachments((prev) => [...prev, attachment])
  }, [])

  const handleFileSelect = useCallback((file: File, type: 'image' | 'document') => {
    const attachment: MediaAttachment = {
      file,
      type,
      preview: type === 'image' ? URL.createObjectURL(file) : undefined,
    }
    handleAddAttachment(attachment)
  }, [handleAddAttachment])

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleClearAttachments = useCallback(() => {
    setAttachments([])
  }, [])

  // Callback para capturar os callbacks do ConversationDetail
  const handleGetOptimisticCallbacks = useCallback((callbacks: {
    onOptimisticMessage: (message: Message) => void
    onMessageError: (tempId: string) => void
  }) => {
    optimisticCallbacksRef.current = callbacks
  }, [])

  // Callback para marcar como lida
  const handleMarkAsRead = useCallback(async (conversationPhone: string) => {
    const result = await markConversationAsRead(conversationPhone)
    if (!result.success) {
      // Handle error silently
    }
  }, [])

  // Calcular métricas por status
  const metrics = useMemo(() => {
    return {
      total: conversations.length,
      bot: conversations.filter(c => c.status === 'bot').length,
      humano: conversations.filter(c => c.status === 'humano').length,
      emFlow: conversations.filter(c => c.status === 'fluxo_inicial').length,
      transferido: conversations.filter(c => c.status === 'transferido').length,
    }
  }, [conversations])

  // Helper para obter label do status
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      all: 'Todas',
      bot: 'Bot',
      humano: 'Humano',
      transferido: 'Transferido',
      fluxo_inicial: 'Em Flow'
    }
    return labels[status] || status
  }

  // Encontrar conversa selecionada
  const selectedConversation = useMemo(() => {
    if (!selectedPhone) return null
    return conversations.find(c => c.phone === selectedPhone)
  }, [selectedPhone, conversations])

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: 'radial-gradient(circle at top right, #242f36 0%, #1C1C1C 60%)' }}>
      {/* Header com Cards KPI */}
      <div className="relative">
        {/* Botão Hambúrguer Mobile - No topo do header, sempre visível */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden absolute top-2 left-2 z-30 text-white hover:bg-white/10 rounded-lg"
          onClick={() => setSidebarOpen(true)}
          style={{ background: 'rgba(28, 28, 28, 0.9)' }}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <ConversationsHeader
          metrics={metrics}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
        />
      </div>

      {/* Conteúdo Principal - Sidebar + Área de Conversas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Desktop - Oculta em mobile (< lg) */}
        <div className="hidden lg:flex w-80 flex-col border-r border-white/5" style={{ background: 'rgba(28, 28, 28, 0.95)' }}>
          {/* Header da Sidebar */}
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-poppins font-semibold text-sm text-white/90">Conversas</h3>
              <Link href="/dashboard">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/5"
                >
                  <Home className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Campo de Pesquisa */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: '#B0B0B0' }} />
              <input
                type="text"
                placeholder="Pesquisar contatos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#151515] border border-white/10 rounded-lg px-10 py-2.5 text-white placeholder-white/40 focus:outline-none focus:border-[#1ABC9C] transition-colors text-sm"
                style={{ fontFamily: 'Inter, sans-serif' }}
              />
              {searchTerm && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/70"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Indicador de pesquisa */}
            {searchTerm.length >= 2 && (
              <p className="text-xs text-white/50 mt-2">
                {filteredConversations.length} resultado{filteredConversations.length !== 1 ? 's' : ''} encontrado{filteredConversations.length !== 1 ? 's' : ''}
              </p>
            )}
            {searchTerm.length === 1 && (
              <p className="text-xs text-white/40 mt-2">
                Digite mais 1 caractere para pesquisar...
              </p>
            )}
          </div>

          {/* Filtros Simples - Todas / Não Lidas */}
          <div className="px-4 py-3 border-b border-white/5">
            <div className="flex gap-2">
              <button
                className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all bg-white/5 text-white/70 hover:bg-white/10"
              >
                Todas
              </button>
              <button
                className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all bg-white/5 text-white/70 hover:bg-white/10"
              >
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
                  statusFilter === 'all' ? MessageCircle :
                    statusFilter === 'bot' ? Bot :
                      statusFilter === 'humano' ? User :
                        statusFilter === 'fluxo_inicial' ? Workflow :
                          statusFilter === 'transferido' ? ArrowRight : MessageCircle
                }
                title={
                  statusFilter === 'all' ? "Nenhuma conversa encontrada" :
                    `Nenhuma conversa com status "${getStatusLabel(statusFilter)}"`
                }
                description={
                  statusFilter === 'all'
                    ? "Quando você receber mensagens no WhatsApp, elas aparecerão aqui"
                    : `Não há conversas com status "${getStatusLabel(statusFilter)}" no momento. Tente mudar o filtro ou aguarde novas conversas.`
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
              />
            )}
          </div>
        </div>

        {/* Sidebar Mobile - Sheet drawer */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-[85vw] sm:w-96">
            <div className="flex flex-col h-full" style={{ background: 'rgba(28, 28, 28, 0.95)' }}>
              {/* Header da Sidebar */}
              <div className="p-4 border-b border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-poppins font-semibold text-sm text-white/90">Conversas</h3>
                  <Link href="/dashboard">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/5"
                    >
                      <Home className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>

                {/* Campo de Pesquisa */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: '#B0B0B0' }} />
                  <input
                    type="text"
                    placeholder="Pesquisar contatos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#151515] border border-white/10 rounded-lg px-10 py-2.5 text-white placeholder-white/40 focus:outline-none focus:border-[#1ABC9C] transition-colors text-sm"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  />
                  {searchTerm && (
                    <button
                      onClick={handleClearSearch}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/70"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Indicador de pesquisa */}
                {searchTerm.length >= 2 && (
                  <p className="text-xs text-white/50 mt-2">
                    {filteredConversations.length} resultado{filteredConversations.length !== 1 ? 's' : ''} encontrado{filteredConversations.length !== 1 ? 's' : ''}
                  </p>
                )}
                {searchTerm.length === 1 && (
                  <p className="text-xs text-white/40 mt-2">
                    Digite mais 1 caractere para pesquisar...
                  </p>
                )}
              </div>

              {/* Filtros Simples - Todas / Não Lidas */}
              <div className="px-4 py-3 border-b border-white/5">
                <div className="flex gap-2">
                  <button
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all bg-white/5 text-white/70 hover:bg-white/10"
                  >
                    Todas
                  </button>
                  <button
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all bg-white/5 text-white/70 hover:bg-white/10"
                  >
                    Não lidas
                  </button>
                </div>
              </div>

              {/* Lista de Conversas */}
              <div className="flex-1 overflow-y-auto">
                {filteredConversations.length === 0 && !loading ? (
                  <EmptyStateSimple
                    icon={
                      statusFilter === 'all' ? MessageCircle :
                        statusFilter === 'bot' ? Bot :
                          statusFilter === 'humano' ? User :
                            statusFilter === 'fluxo_inicial' ? Workflow :
                              statusFilter === 'transferido' ? ArrowRight : MessageCircle
                    }
                    title={
                      statusFilter === 'all' ? "Nenhuma conversa encontrada" :
                        `Nenhuma conversa com status "${getStatusLabel(statusFilter)}"`
                    }
                    description={
                      statusFilter === 'all'
                        ? "Quando você receber mensagens no WhatsApp, elas aparecerão aqui"
                        : `Não há conversas com status "${getStatusLabel(statusFilter)}" no momento. Tente mudar o filtro ou aguarde novas conversas.`
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
                      handleSelectConversation(phone)
                      setSidebarOpen(false)
                    }}
                  />
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Área Principal - Chat ou Empty State */}
        <div className="flex-1 flex flex-col" style={{ background: '#1a1a1a' }}>
          {selectedConversation && selectedPhone ? (
            <>
              {/* Header do Chat */}
              <div className="bg-[#1a1f26] p-3 border-b border-white/10">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {/* Botão Menu (Mobile) */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden flex-shrink-0 text-white hover:bg-white/10"
                    onClick={() => setSidebarOpen(true)}
                  >
                    <Menu className="h-5 w-5" />
                  </Button>

                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-[#2E86AB] to-[#1ABC9C] text-white">
                      {getInitials(selectedConversation.name || 'Sem nome')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{selectedConversation.name || 'Sem nome'}</h3>
                    <p className="text-xs text-white/50 truncate">{selectedPhone}</p>
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
              <div className="flex-1 overflow-hidden bg-[#0f1419] relative">
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
              <div className="bg-[#1a1f26] p-3 border-t border-white/10">
                <SendMessageForm
                  phone={selectedPhone}
                  clientId={clientId}
                  attachments={attachments}
                  onAddAttachment={handleFileSelect}
                  onRemoveAttachment={handleRemoveAttachment}
                  onClearAttachments={handleClearAttachments}
                  onOptimisticMessage={optimisticCallbacksRef.current?.onOptimisticMessage}
                  onMessageError={optimisticCallbacksRef.current?.onMessageError}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center relative">
              <div className="text-center max-w-md px-6">
                <div className="mb-6 flex justify-center">
                  <div
                    className="h-20 w-20 rounded-full flex items-center justify-center border-2"
                    style={{
                      background: 'linear-gradient(135deg, #252525, #1C1C1C)',
                      borderColor: '#1ABC9C',
                      boxShadow: '0 0 20px rgba(26, 188, 156, 0.2)'
                    }}
                  >
                    <MessageCircle className="h-10 w-10" style={{ color: '#1ABC9C' }} />
                  </div>
                </div>
                <h2 className="font-poppins font-semibold text-xl text-white mb-3">
                  Selecione uma conversa
                </h2>
                <p className="text-white/60 mb-6 max-w-xs mx-auto leading-relaxed">
                  {typeof window !== 'undefined' && window.innerWidth < 1024 
                    ? "Toque no menu acima para ver suas conversas"
                    : "Escolha uma conversa na lista ao lado para visualizar e responder mensagens"}
                </p>
                {/* Botão para abrir sidebar no mobile */}
                <div className="lg:hidden">
                  <Button
                    onClick={() => setSidebarOpen(true)}
                    className="bg-gradient-to-r from-[#1ABC9C] to-[#2E86AB] text-white hover:opacity-90"
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
  )
}

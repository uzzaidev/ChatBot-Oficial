'use client'

import { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect, memo } from 'react'
import { ConversationDetail } from '@/components/ConversationDetail'
import { SendMessageForm } from '@/components/SendMessageForm'
import { StatusToggle } from '@/components/StatusToggle'
import { DragDropZone } from '@/components/DragDropZone'
import { useConversations } from '@/hooks/useConversations'
import { useGlobalRealtimeNotifications } from '@/hooks/useGlobalRealtimeNotifications'
import { ConversationList } from '@/components/ConversationList'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getInitials } from '@/lib/utils'
import { markConversationAsRead } from '@/lib/api'
import { MessageCircle, Menu, Bot, User, ArrowRight, List, Home, Search, X } from 'lucide-react'
import Link from 'next/link'
import type { MediaAttachment } from '@/components/MediaPreview'
import type { Message } from '@/lib/types'

// Componente de pesquisa extraído para evitar duplicação e perda de foco
interface SearchSectionProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  onClearSearch: () => void
  resultCount: number
}

const SearchSection = memo(function SearchSection({
  searchTerm,
  onSearchChange,
  onClearSearch,
  resultCount,
}: SearchSectionProps) {
  return (
    <div className="p-3 border-b border-white/10 bg-[#1a1f26]">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-uzz-silver" />
        <Input
          type="text"
          placeholder="Pesquisar contatos ou números..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-9 h-10 bg-[#0f1419] border-white/10 focus:bg-[#1a1f26] text-white placeholder:text-uzz-silver/60"
        />
        {searchTerm && (
          <button
            onClick={onClearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-uzz-silver hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {/* Indicador de pesquisa ativa */}
      {searchTerm.length >= 2 && (
        <p className="text-xs text-uzz-silver mt-2">
          {resultCount} resultado{resultCount !== 1 ? 's' : ''} encontrado{resultCount !== 1 ? 's' : ''}
        </p>
      )}
      {searchTerm.length === 1 && (
        <p className="text-xs text-uzz-silver/60 mt-2">
          Digite mais 1 caractere para pesquisar...
        </p>
      )}
    </div>
  )
})

interface ConversationPageClientProps {
  phone: string
  clientId: string
}

/**
 * ConversationPageClient - Client Component
 *
 * FASE 3: Agora recebe client_id do servidor (autenticado)
 *
 * Componente que renderiza a página de detalhes de conversa
 */
export function ConversationPageClient({ phone, clientId }: ConversationPageClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'bot' | 'humano' | 'transferido' | 'fluxo_inicial'>('all')
  const [attachments, setAttachments] = useState<MediaAttachment[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const scrollPositionRef = useRef(0)

  // Refs para callbacks de optimistic updates
  const optimisticCallbacksRef = useRef<{
    onOptimisticMessage: (message: Message) => void
    onMessageError: (tempId: string) => void
  } | null>(null)

  // Callback para capturar os callbacks do ConversationDetail
  const handleGetOptimisticCallbacks = useCallback((callbacks: {
    onOptimisticMessage: (message: Message) => void
    onMessageError: (tempId: string) => void
  }) => {
    optimisticCallbacksRef.current = callbacks
  }, [])

  const { conversations, loading, refetchSilent } = useConversations({
    clientId,
    status: statusFilter === 'all' ? undefined : statusFilter,
    enableRealtime: true,
  })

  // Calcular total de mensagens não lidas
  const totalUnreadCount = conversations.reduce((sum, conv) => sum + (conv.unread_count ?? 0), 0)

  // Marcar conversa como lida quando abrir
  useEffect(() => {
    if (phone) {
      markConversationAsRead(phone).then((result) => {
        if (result.success) {
          // Refetch silencioso (sem loading) para atualizar UI
          refetchSilent()
        }
      })
    }
  }, [phone, refetchSilent])

  // Gerenciar anexos de mídia
  const handleAddAttachment = useCallback((file: File, type: 'image' | 'document') => {
    const attachment: MediaAttachment = {
      file,
      type,
    }

    // Gerar preview para imagens
    if (type === 'image') {
      const reader = new FileReader()
      reader.onload = (e) => {
        setAttachments(prev => [...prev, {
          ...attachment,
          preview: e.target?.result as string
        }])
      }
      reader.readAsDataURL(file)
    } else {
      setAttachments(prev => [...prev, attachment])
    }
  }, [])

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleClearAttachments = useCallback(() => {
    setAttachments([])
  }, [])

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

  // Callback para marcar como lida (usado pelo ConversationDetail)
  const handleMarkAsRead = useCallback(async (conversationPhone: string) => {
    const result = await markConversationAsRead(conversationPhone)
    if (result.success) {
      // Refetch silencioso (sem loading) para atualizar UI
      await refetchSilent()
    }
  }, [refetchSilent])

  const conversation = conversations.find((c) => c.phone === phone)

  // Header da Sidebar (static content, não precisa mudar)
  const sidebarHeader = (
    <div className="bg-mint-600 p-4 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-3">
        <MessageCircle className="h-6 w-6 text-white" />
        <h2 className="text-white font-semibold text-lg">Conversas</h2>
      </div>
      <Link href="/dashboard">
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-mint-700 flex items-center gap-2 px-3"
        >
          <Home className="h-4 w-4" />
          <span className="font-medium">Início</span>
        </Button>
      </Link>
    </div>
  )

  // Filtros por Status (memoizado para evitar re-renders desnecessários)
  const statusFilters = useMemo(() => (
    <div className="border-b border-white/10 bg-[#1a1f26]">
      <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | 'bot' | 'humano' | 'transferido' | 'fluxo_inicial')}>
        <TabsList className="w-full justify-start rounded-none h-auto p-0 bg-transparent flex-wrap">
          <TabsTrigger
            value="all"
            className="flex items-center gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-uzz-mint rounded-none text-xs sm:text-sm px-2 sm:px-3 text-uzz-silver data-[state=active]:text-white"
          >
            <List className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Todas</span>
            <span className="sm:hidden">Todas</span>
          </TabsTrigger>
          <TabsTrigger
            value="bot"
            className="flex items-center gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-blue-400 rounded-none text-xs sm:text-sm px-2 sm:px-3 text-uzz-silver data-[state=active]:text-white"
          >
            <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Bot</span>
            <span className="sm:hidden">Bot</span>
          </TabsTrigger>
          <TabsTrigger
            value="humano"
            className="flex items-center gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-green-400 rounded-none text-xs sm:text-sm px-2 sm:px-3 text-uzz-silver data-[state=active]:text-white"
          >
            <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Humano</span>
            <span className="sm:hidden">Humano</span>
          </TabsTrigger>
          <TabsTrigger
            value="transferido"
            className="flex items-center gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-orange-400 rounded-none text-xs sm:text-sm px-2 sm:px-3 text-uzz-silver data-[state=active]:text-white"
          >
            <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Transferido</span>
            <span className="sm:hidden">Transf.</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  ), [statusFilter])

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-white">
      {/* Sidebar Desktop - Oculta em mobile (< lg) */}
      <div className="hidden lg:flex w-96 border-r border-silver-200 flex-col bg-white">
        {sidebarHeader}

        <SearchSection
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onClearSearch={handleClearSearch}
          resultCount={filteredConversations.length}
        />

        {statusFilters}

        {/* Lista de Conversas */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto"
        >
          <ConversationList
            conversations={filteredConversations}
            loading={loading}
            currentPhone={phone}
            lastUpdatePhone={lastUpdatePhone}
            onConversationClick={() => setSidebarOpen(false)}
            onMarkAsRead={handleMarkAsRead}
          />
        </div>
      </div>

      {/* Sidebar Mobile - Sheet drawer */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-[85vw] sm:w-96">
          <div className="flex flex-col h-full">
            {sidebarHeader}

            <SearchSection
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onClearSearch={handleClearSearch}
              resultCount={filteredConversations.length}
            />

            {statusFilters}

            {/* Lista de Conversas */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto"
            >
              <ConversationList
                conversations={filteredConversations}
                loading={loading}
                currentPhone={phone}
                lastUpdatePhone={lastUpdatePhone}
                onConversationClick={() => setSidebarOpen(false)}
                onMarkAsRead={handleMarkAsRead}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Área de Chat Principal */}
      <div className="flex-1 flex flex-col">
        {conversation ? (
          <>
            {/* Header do Chat */}
            <div className="bg-[#1a1f26] p-3 border-b border-white/10">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {/* Botão Menu (Mobile) */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden flex-shrink-0 relative text-white hover:bg-white/10"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                  {totalUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                    </span>
                  )}
                </Button>

                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarFallback className="bg-uzz-mint text-white">
                    {getInitials(conversation.name || '')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{conversation.name}</h3>
                  <p className="text-xs text-uzz-silver truncate">{conversation.phone}</p>
                </div>

                {/* Status Toggle */}
                <div className="w-full sm:w-auto">
                  <StatusToggle
                    phone={phone}
                    currentStatus={conversation.status}
                  />
                </div>
              </div>
            </div>

            {/* Área de Mensagens com Drag & Drop */}
            <div className="flex-1 overflow-hidden bg-[#0f1419] relative">
              <DragDropZone onFileSelect={handleAddAttachment}>
                <ConversationDetail
                  phone={phone}
                  clientId={clientId}
                  conversationName={conversation.name || undefined}
                  onGetOptimisticCallbacks={handleGetOptimisticCallbacks}
                  onMarkAsRead={handleMarkAsRead}
                />
              </DragDropZone>
            </div>

            {/* Footer - Input de Mensagem */}
            <div className="bg-[#1a1f26] p-3 border-t border-white/10">
              <SendMessageForm
                phone={phone}
                clientId={clientId}
                attachments={attachments}
                onAddAttachment={handleAddAttachment}
                onRemoveAttachment={handleRemoveAttachment}
                onClearAttachments={handleClearAttachments}
                onOptimisticMessage={optimisticCallbacksRef.current?.onOptimisticMessage}
                onMessageError={optimisticCallbacksRef.current?.onMessageError}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#0f1419] bg-pattern-dots">
            <div className="text-center">
              <div className="rounded-full bg-gradient-to-br from-uzz-mint/20 to-uzz-blue/20 p-6 mb-6 inline-block">
                <MessageCircle className="h-20 w-20 text-uzz-mint" />
              </div>
              <h3 className="text-xl font-semibold font-poppins text-white mb-2">
                Nenhuma conversa selecionada
              </h3>
              <p className="text-uzz-silver">
                Selecione uma conversa na lateral para começar
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

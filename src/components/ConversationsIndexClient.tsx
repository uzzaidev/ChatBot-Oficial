'use client'

import { useState, useMemo, useRef, useCallback, useLayoutEffect } from 'react'
import { useConversations } from '@/hooks/useConversations'
import { useGlobalRealtimeNotifications } from '@/hooks/useGlobalRealtimeNotifications'
import { ConversationList } from '@/components/ConversationList'
import { MessageCircle, Bot, User, ArrowRight, List, Home, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'bot' | 'humano' | 'transferido'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const scrollPositionRef = useRef(0)

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

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-white">
      {/* Sidebar com Lista de Conversas - Sempre visível em desktop */}
      <div className="w-full lg:w-96 border-r border-silver-200 flex flex-col bg-white">
        {/* Header da Sidebar */}
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

        {/* Campo de Pesquisa */}
        <div className="p-3 border-b border-silver-200 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-erie-black-400" />
            <Input
              type="text"
              placeholder="Pesquisar contatos ou números..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-9 h-10 bg-silver-50 border-silver-200 focus:bg-white"
            />
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-erie-black-400 hover:text-erie-black-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {/* Indicador de pesquisa ativa */}
          {searchTerm.length >= 2 && (
            <p className="text-xs text-erie-black-500 mt-2">
              {filteredConversations.length} resultado{filteredConversations.length !== 1 ? 's' : ''} encontrado{filteredConversations.length !== 1 ? 's' : ''}
            </p>
          )}
          {searchTerm.length === 1 && (
            <p className="text-xs text-erie-black-400 mt-2">
              Digite mais 1 caractere para pesquisar...
            </p>
          )}
        </div>

        {/* Filtros por Status */}
        <div className="border-b border-silver-200 bg-white">
          <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | 'bot' | 'humano' | 'transferido')}>
            <TabsList className="w-full justify-start rounded-none h-auto p-0 bg-transparent">
              <TabsTrigger
                value="all"
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-mint-600 rounded-none"
              >
                <List className="h-4 w-4" />
                Todas
              </TabsTrigger>
              <TabsTrigger
                value="bot"
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none"
              >
                <Bot className="h-4 w-4" />
                Bot
              </TabsTrigger>
              <TabsTrigger
                value="humano"
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-green-600 rounded-none"
              >
                <User className="h-4 w-4" />
                Humano
              </TabsTrigger>
              <TabsTrigger
                value="transferido"
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-orange-600 rounded-none"
              >
                <ArrowRight className="h-4 w-4" />
                Transferido
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Lista de Conversas */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto"
        >
          <ConversationList
            conversations={filteredConversations}
            loading={loading}
            clientId={clientId}
            lastUpdatePhone={lastUpdatePhone}
          />
        </div>
      </div>

      {/* Área Central - Mensagem para selecionar conversa (visível apenas em lg+) */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-silver-50">
        <div className="text-center">
          <MessageCircle className="h-20 w-20 text-silver-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-erie-black-700 mb-2">
            Nenhuma conversa selecionada
          </h3>
          <p className="text-erie-black-500">
            Selecione uma conversa à esquerda para começar
          </p>
        </div>
      </div>
    </div>
  )
}

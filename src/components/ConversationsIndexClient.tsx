'use client'

import { useState, useMemo, useRef, useCallback, useLayoutEffect } from 'react'
import { useConversations } from '@/hooks/useConversations'
import { useGlobalRealtimeNotifications } from '@/hooks/useGlobalRealtimeNotifications'
import { ConversationList } from '@/components/ConversationList'
import { MessageCircle, Bot, User, ArrowRight, List, Home, Search, X, Workflow } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyStateSimple } from '@/components/EmptyState'
import { ConversationMetricCard } from '@/components/ConversationMetricCard'
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'bot' | 'humano' | 'transferido' | 'fluxo_inicial'>('all')
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

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-white">
      {/* Sidebar com Lista de Conversas - Sempre visível em desktop */}
      <div className="w-full lg:w-96 border-r border-silver-200 flex flex-col bg-white">
        {/* Header da Sidebar */}
        <div className="bg-gradient-to-r from-uzz-mint to-uzz-blue p-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-6 w-6 text-white" />
            <h2 className="text-white font-poppins font-semibold text-lg">Conversas</h2>
          </div>
          <Link href="/dashboard">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 flex items-center gap-2 px-3 transition-all"
            >
              <Home className="h-4 w-4" />
              <span className="font-medium">Início</span>
            </Button>
          </Link>
        </div>

        {/* Cards de Métricas */}
        <div className="p-4 border-b border-uzz-silver bg-gradient-to-br from-white via-gray-50 to-white">
          <div className="grid grid-cols-2 gap-3">
            <ConversationMetricCard
              label="Todas"
              value={metrics.total}
              icon={List}
              gradient="from-uzz-mint to-uzz-blue"
              onClick={() => setStatusFilter('all')}
              active={statusFilter === 'all'}
              description="Total de conversas"
            />
            <ConversationMetricCard
              label="Bot"
              value={metrics.bot}
              icon={Bot}
              gradient="from-uzz-blue to-blue-600"
              onClick={() => setStatusFilter('bot')}
              active={statusFilter === 'bot'}
              description="Bot respondendo"
            />
            <ConversationMetricCard
              label="Humano"
              value={metrics.humano}
              icon={User}
              gradient="from-green-500 to-green-600"
              onClick={() => setStatusFilter('humano')}
              active={statusFilter === 'humano'}
              description="Atendimento humano"
            />
            <ConversationMetricCard
              label="Em Flow"
              value={metrics.emFlow}
              icon={Workflow}
              gradient="from-purple-500 to-purple-600"
              onClick={() => setStatusFilter('fluxo_inicial')}
              active={statusFilter === 'fluxo_inicial'}
              description="Flow interativo"
            />
          </div>
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
        <div className="border-b border-uzz-silver bg-white">
          <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | 'bot' | 'humano' | 'transferido' | 'fluxo_inicial')}>
            <TabsList className="w-full justify-start rounded-none h-auto p-0 bg-transparent">
              <TabsTrigger
                value="all"
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-uzz-mint rounded-none text-sm"
              >
                <List className="h-4 w-4" />
                Todas
              </TabsTrigger>
              <TabsTrigger
                value="bot"
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-uzz-blue rounded-none text-sm"
              >
                <Bot className="h-4 w-4" />
                Bot
              </TabsTrigger>
              <TabsTrigger
                value="humano"
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-green-500 rounded-none text-sm"
              >
                <User className="h-4 w-4" />
                Humano
              </TabsTrigger>
              <TabsTrigger
                value="transferido"
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none text-sm"
              >
                <ArrowRight className="h-4 w-4" />
                Transferido
              </TabsTrigger>
              <TabsTrigger
                value="fluxo_inicial"
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-purple-500 rounded-none text-sm"
              >
                <ArrowRight className="h-4 w-4" />
                Em Flow
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
              lastUpdatePhone={lastUpdatePhone}
            />
          )}
        </div>
      </div>

      {/* Área Central - Mensagem para selecionar conversa (visível apenas em lg+) */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-[#0f1419] bg-pattern-dots">
        <EmptyStateSimple
          icon={
            statusFilter === 'all' ? MessageCircle :
              statusFilter === 'bot' ? Bot :
                statusFilter === 'humano' ? User :
                  statusFilter === 'fluxo_inicial' ? Workflow :
                    statusFilter === 'transferido' ? ArrowRight : MessageCircle
          }
          title={
            statusFilter === 'all' ? "Nenhuma conversa selecionada" :
              `Nenhuma conversa com status "${getStatusLabel(statusFilter)}"`
          }
          description={
            statusFilter === 'all'
              ? "Selecione uma conversa à esquerda para visualizar as mensagens e começar a interagir"
              : `Não há conversas com status "${getStatusLabel(statusFilter)}" no momento. Tente mudar o filtro ou aguarde novas conversas.`
          }
        />
      </div>
    </div>
  )
}

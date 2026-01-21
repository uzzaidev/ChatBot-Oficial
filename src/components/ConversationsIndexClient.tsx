'use client'

import { useState, useMemo, useRef, useCallback, useLayoutEffect } from 'react'
import { useConversations } from '@/hooks/useConversations'
import { useGlobalRealtimeNotifications } from '@/hooks/useGlobalRealtimeNotifications'
import { ConversationList } from '@/components/ConversationList'
import { ConversationTable } from '@/components/ConversationTable'
import { MessageCircle, Bot, User, ArrowRight, List, Home, Search, X, Workflow } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyStateSimple } from '@/components/EmptyState'
import { ConversationMetricCard } from '@/components/ConversationMetricCard'
import { cn } from '@/lib/utils'
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
  const [viewMode, setViewMode] = useState<'list' | 'table'>('table') // Tabela como padrão
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
    <div className="fixed inset-0 flex overflow-hidden" style={{ background: 'radial-gradient(circle at top right, #242f36 0%, #1C1C1C 60%)' }}>
      {/* Sidebar com Filtros e Métricas - Estilo UZZ.AI Dark Theme */}
      <div className={cn(
        "flex flex-col transition-all duration-300",
        viewMode === 'table' ? "w-80" : "w-full lg:w-80"
      )} style={{ background: 'rgba(28, 28, 28, 0.95)', borderRight: '1px solid rgba(255, 255, 255, 0.05)' }}>
        {/* Header da Sidebar */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" style={{ color: '#1ABC9C' }} />
              <h2 className="font-poppins font-semibold text-lg" style={{ color: '#1ABC9C' }}>Conversas</h2>
            </div>
            <Link href="/dashboard">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/70 hover:text-white hover:bg-white/5"
              >
                <Home className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Cards de Métricas KPI - Estilo Elegante */}
          <div className="grid grid-cols-2 gap-3">
            {/* Card TODAS - Highlight */}
            <button
              onClick={() => setStatusFilter('all')}
              className={`relative p-4 rounded-xl border transition-all duration-200 text-left ${
                statusFilter === 'all'
                  ? 'bg-gradient-to-br from-[#252525] to-[#1f2a28] border-[#1ABC9C] border-b-2'
                  : 'bg-[#252525] border-white/5 hover:border-[#2E86AB]'
              }`}
            >
              <div className="text-xs font-medium mb-2" style={{ color: statusFilter === 'all' ? '#1ABC9C' : '#B0B0B0' }}>
                TODAS
              </div>
              <div className="font-exo2 text-2xl font-semibold text-white mb-1">
                {metrics.total}
              </div>
              <div className="text-xs text-white/50">Total de conversas</div>
              <List className="absolute top-4 right-4 h-5 w-5 opacity-30" style={{ color: '#2E86AB' }} />
            </button>

            {/* Card BOT */}
            <button
              onClick={() => setStatusFilter('bot')}
              className={`relative p-4 rounded-xl border transition-all duration-200 text-left ${
                statusFilter === 'bot'
                  ? 'bg-gradient-to-br from-[#252525] to-[#1f2a28] border-[#2E86AB] border-b-2'
                  : 'bg-[#252525] border-white/5 hover:border-[#2E86AB]'
              }`}
            >
              <div className="text-xs font-medium mb-2" style={{ color: statusFilter === 'bot' ? '#2E86AB' : '#B0B0B0' }}>
                BOT RESPONDENDO
              </div>
              <div className="font-exo2 text-2xl font-semibold text-white mb-1">
                {metrics.bot}
              </div>
              <div className="text-xs text-white/50">Bot respondendo</div>
              <Bot className="absolute top-4 right-4 h-5 w-5 opacity-30" style={{ color: '#2E86AB' }} />
            </button>

            {/* Card HUMANO */}
            <button
              onClick={() => setStatusFilter('humano')}
              className={`relative p-4 rounded-xl border transition-all duration-200 text-left ${
                statusFilter === 'humano'
                  ? 'bg-gradient-to-br from-[#252525] to-[#1f2a28] border-[#1ABC9C] border-b-2'
                  : 'bg-[#252525] border-white/5 hover:border-[#1ABC9C]'
              }`}
            >
              <div className="text-xs font-medium mb-2" style={{ color: statusFilter === 'humano' ? '#1ABC9C' : '#B0B0B0' }}>
                HUMANO
              </div>
              <div className="font-exo2 text-2xl font-semibold text-white mb-1">
                {metrics.humano}
              </div>
              <div className="text-xs text-white/50">Atendimento humano</div>
              <User className="absolute top-4 right-4 h-5 w-5 opacity-30" style={{ color: '#1ABC9C' }} />
            </button>

            {/* Card EM FLOW */}
            <button
              onClick={() => setStatusFilter('fluxo_inicial')}
              className={`relative p-4 rounded-xl border transition-all duration-200 text-left ${
                statusFilter === 'fluxo_inicial'
                  ? 'bg-gradient-to-br from-[#252525] to-[#1f2a28] border-[#9b59b6] border-b-2'
                  : 'bg-[#252525] border-white/5 hover:border-[#9b59b6]'
              }`}
            >
              <div className="text-xs font-medium mb-2" style={{ color: statusFilter === 'fluxo_inicial' ? '#9b59b6' : '#B0B0B0' }}>
                EM FLOW
              </div>
              <div className="font-exo2 text-2xl font-semibold text-white mb-1">
                {metrics.emFlow}
              </div>
              <div className="text-xs text-white/50">Flow interativo</div>
              <Workflow className="absolute top-4 right-4 h-5 w-5 opacity-30" style={{ color: '#9b59b6' }} />
            </button>
          </div>
        </div>

        {/* Campo de Pesquisa */}
        <div className="p-4 border-b border-white/5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: '#B0B0B0' }} />
            <input
              type="text"
              placeholder="Pesquisar contatos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#151515] border border-white/10 rounded-lg px-10 py-2.5 text-white placeholder-white/40 focus:outline-none focus:border-[#1ABC9C] transition-colors"
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
          {/* Indicador de pesquisa ativa */}
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

        {/* Toggle View Mode e Filtros */}
        <div className="px-4 py-3 border-b border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  viewMode === 'table'
                    ? "bg-[#1ABC9C] text-white"
                    : "bg-white/5 text-white/50 hover:text-white/70"
                )}
              >
                Tabela
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  viewMode === 'list'
                    ? "bg-[#1ABC9C] text-white"
                    : "bg-white/5 text-white/50 hover:text-white/70"
                )}
              >
                Lista
              </button>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`text-xs px-3 py-1.5 rounded transition-all whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'text-[#1ABC9C] border-b-2 border-[#1ABC9C] pb-1'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              Todas
            </button>
          <button
            onClick={() => setStatusFilter('bot')}
            className={`text-xs px-3 py-1.5 rounded transition-all whitespace-nowrap ${
              statusFilter === 'bot'
                ? 'text-[#2E86AB] border-b-2 border-[#2E86AB] pb-1'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            Bot
          </button>
          <button
            onClick={() => setStatusFilter('humano')}
            className={`text-xs px-3 py-1.5 rounded transition-all whitespace-nowrap ${
              statusFilter === 'humano'
                ? 'text-[#1ABC9C] border-b-2 border-[#1ABC9C] pb-1'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            Humano
          </button>
          <button
            onClick={() => setStatusFilter('transferido')}
            className={`text-xs px-3 py-1.5 rounded transition-all whitespace-nowrap ${
              statusFilter === 'transferido'
                ? 'text-orange-400 border-b-2 border-orange-400 pb-1'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            Transferido
          </button>
          <button
            onClick={() => setStatusFilter('fluxo_inicial')}
            className={`text-xs px-3 py-1.5 rounded transition-all whitespace-nowrap ${
              statusFilter === 'fluxo_inicial'
                ? 'text-[#9b59b6] border-b-2 border-[#9b59b6] pb-1'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            Em Flow
          </button>
          </div>
        </div>

        {/* Lista de Conversas (apenas quando viewMode === 'list') */}
        {viewMode === 'list' && (
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
        )}
      </div>

      {/* Área Principal - Tabela ou Empty State */}
      <div className={cn(
        "flex-1 flex flex-col",
        viewMode === 'table' ? "flex" : "hidden lg:flex"
      )} style={{ backgroundImage: viewMode === 'table' ? 'none' : 'radial-gradient(circle at center, rgba(46, 134, 171, 0.08) 0%, transparent 70%)' }}>
        {viewMode === 'table' ? (
          <div className="flex-1 flex flex-col p-6" style={{ background: '#1a1a1a' }}>
            {/* Header da Tabela */}
            <div className="mb-6">
              <h2 className="font-poppins font-semibold text-xl text-white mb-2">Conversas</h2>
              <p className="text-white/60 text-sm">
                {filteredConversations.length} conversa{filteredConversations.length !== 1 ? 's' : ''} encontrada{filteredConversations.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Tabela de Conversas */}
            {filteredConversations.length === 0 && !loading ? (
              <div className="flex-1 flex items-center justify-center">
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
                      {statusFilter === 'all' ? (
                        <MessageCircle className="h-10 w-10" style={{ color: '#1ABC9C' }} />
                      ) : statusFilter === 'bot' ? (
                        <Bot className="h-10 w-10" style={{ color: '#1ABC9C' }} />
                      ) : statusFilter === 'humano' ? (
                        <User className="h-10 w-10" style={{ color: '#1ABC9C' }} />
                      ) : statusFilter === 'fluxo_inicial' ? (
                        <Workflow className="h-10 w-10" style={{ color: '#1ABC9C' }} />
                      ) : (
                        <ArrowRight className="h-10 w-10" style={{ color: '#1ABC9C' }} />
                      )}
                    </div>
                  </div>
                  <h2 className="font-poppins font-semibold text-xl text-white mb-3">
                    {statusFilter === 'all' ? "Nenhuma conversa encontrada" : `Nenhuma conversa com status "${getStatusLabel(statusFilter)}"`}
                  </h2>
                  <p className="text-white/60 mb-6 max-w-xs mx-auto leading-relaxed">
                    {statusFilter === 'all'
                      ? "Quando você receber mensagens no WhatsApp, elas aparecerão aqui"
                      : `Não há conversas com status "${getStatusLabel(statusFilter)}" no momento. Tente mudar o filtro ou aguarde novas conversas.`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-auto">
                <ConversationTable
                  conversations={filteredConversations}
                  loading={loading}
                  clientId={clientId}
                  currentPhone={undefined}
                  onConversationOpen={undefined}
                  onConversationClick={undefined}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
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
              {statusFilter === 'all' ? (
                <MessageCircle className="h-10 w-10" style={{ color: '#1ABC9C' }} />
              ) : statusFilter === 'bot' ? (
                <Bot className="h-10 w-10" style={{ color: '#1ABC9C' }} />
              ) : statusFilter === 'humano' ? (
                <User className="h-10 w-10" style={{ color: '#1ABC9C' }} />
              ) : statusFilter === 'fluxo_inicial' ? (
                <Workflow className="h-10 w-10" style={{ color: '#1ABC9C' }} />
              ) : (
                <ArrowRight className="h-10 w-10" style={{ color: '#1ABC9C' }} />
              )}
            </div>
          </div>
          <h2 className="font-poppins font-semibold text-xl text-white mb-3">
            {statusFilter === 'all' ? "Nenhuma conversa selecionada" : `Nenhuma conversa com status "${getStatusLabel(statusFilter)}"`}
          </h2>
          <p className="text-white/60 mb-6 max-w-xs mx-auto leading-relaxed">
            {statusFilter === 'all'
              ? "O robô da UzzAi está aguardando novas interações. Selecione um contato ou inicie um teste."
              : `Não há conversas com status "${getStatusLabel(statusFilter)}" no momento. Tente mudar o filtro ou aguarde novas conversas.`}
          </p>
        </div>
      </div>
    </div>
  )
}

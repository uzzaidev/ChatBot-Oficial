'use client'

import { useState, useMemo, useRef, useCallback, useLayoutEffect } from 'react'
import { useConversations } from '@/hooks/useConversations'
import { useGlobalRealtimeNotifications } from '@/hooks/useGlobalRealtimeNotifications'
import { ConversationList } from '@/components/ConversationList'
import { ConversationTable } from '@/components/ConversationTable'
import { ConversationsHeader } from '@/components/ConversationsHeader'
import { MessageCircle, Bot, User, ArrowRight, Search, X, Workflow, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyStateSimple } from '@/components/EmptyState'
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
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: 'radial-gradient(circle at top right, #242f36 0%, #1C1C1C 60%)' }}>
      {/* Header com Cards KPI */}
      <ConversationsHeader
        metrics={metrics}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Conteúdo Principal - Sidebar + Área de Conversas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Simplificada */}
        <div className={cn(
          "flex flex-col transition-all duration-300 border-r border-white/5",
          viewMode === 'table' ? "w-80" : "w-full lg:w-80"
        )} style={{ background: 'rgba(28, 28, 28, 0.95)' }}>
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
        )} style={{ background: '#1a1a1a' }}>
          {viewMode === 'table' ? (
            <div className="flex-1 flex flex-col p-6">
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
                    <MessageCircle className="h-10 w-10" style={{ color: '#1ABC9C' }} />
                  </div>
                </div>
                <h2 className="font-poppins font-semibold text-xl text-white mb-3">
                  Selecione uma conversa
                </h2>
                <p className="text-white/60 mb-6 max-w-xs mx-auto leading-relaxed">
                  Escolha uma conversa na lista ao lado para visualizar os detalhes
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

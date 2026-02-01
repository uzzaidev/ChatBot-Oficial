'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, Bot, User, Workflow, ArrowRight, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FilterEditorModal, type FilterConfig } from '@/components/FilterEditorModal'

interface ConversationsHeaderProps {
  metrics: {
    total: number
    bot: number
    humano: number
    emFlow: number
    transferido: number
  }
  statusFilter: 'all' | 'bot' | 'humano' | 'transferido' | 'fluxo_inicial'
  onStatusChange: (status: 'all' | 'bot' | 'humano' | 'transferido' | 'fluxo_inicial') => void
}

export const ConversationsHeader = ({
  metrics,
  statusFilter,
  onStatusChange,
}: ConversationsHeaderProps) => {
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [activeFilters, setActiveFilters] = useState<FilterConfig[]>([
    { id: 'all', label: 'TODAS', icon: 'MessageCircle', color: 'primary', enabled: true, isCustom: false, filterType: 'status', filterValue: 'all', count: metrics.total },
    { id: 'bot', label: 'BOT', icon: 'Bot', color: 'secondary', enabled: true, isCustom: false, filterType: 'status', filterValue: 'bot', count: metrics.bot },
    { id: 'humano', label: 'HUMANO', icon: 'User', color: 'primary', enabled: true, isCustom: false, filterType: 'status', filterValue: 'humano', count: metrics.humano },
    { id: 'fluxo_inicial', label: 'EM FLOW', icon: 'Workflow', color: '#9b59b6', enabled: true, isCustom: false, filterType: 'status', filterValue: 'fluxo_inicial', count: metrics.emFlow },
    { id: 'transferido', label: 'TRANSFERIDO', icon: 'ArrowRight', color: 'orange-400', enabled: true, isCustom: false, filterType: 'status', filterValue: 'transferido', count: metrics.transferido },
  ])

  // Carregar configuração do localStorage ao montar
  useEffect(() => {
    const savedFilters = localStorage.getItem('conversationFilters')
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters) as FilterConfig[]
        // Atualizar counts com as métricas atuais
        const updated = parsed.map(filter => {
          if (filter.id === 'all') return { ...filter, count: metrics.total }
          if (filter.id === 'bot') return { ...filter, count: metrics.bot }
          if (filter.id === 'humano') return { ...filter, count: metrics.humano }
          if (filter.id === 'fluxo_inicial') return { ...filter, count: metrics.emFlow }
          if (filter.id === 'transferido') return { ...filter, count: metrics.transferido }
          return filter
        })
        setActiveFilters(updated)
      } catch (error) {
        console.error('Erro ao carregar filtros:', error)
      }
    }
  }, [metrics.total, metrics.bot, metrics.humano, metrics.emFlow, metrics.transferido])

  const handleSaveFilters = (filters: FilterConfig[]) => {
    setActiveFilters(filters)
  }

  return (
    <div
      className="w-full border-b border-border/50 px-4 md:px-6 py-2 md:py-2.5 relative bg-card/[0.98]"
    >
      {/* Header Top - Título e Status */}
      <div className="flex items-center justify-between mb-2 md:mb-2.5 pl-8 lg:pl-0">
        <div>
          <h1 className="font-poppins font-bold text-base md:text-xl text-foreground mb-0.5">
            Caixa de Entrada
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm hidden md:block">
            Gestão / <span className="text-foreground/70">Conversas</span>
          </p>
        </div>

      </div>

      {/* Cards KPI - Responsivo */}
      {/* Mobile: 2 cols | Desktop: 3 cols (Grid 3x2) */}
      <div className="overflow-x-auto pb-1.5 -mx-4 px-4 md:mx-0 md:px-0 md:pb-0 md:overflow-visible">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-2.5">
        {/* Card TODAS */}
        <button
          onClick={() => onStatusChange('all')}
          className={cn(
            "relative p-2.5 md:p-3 rounded-lg border transition-all duration-200 text-left group h-[60px] md:h-[65px]",
            statusFilter === 'all'
              ? "bg-gradient-to-br from-surface to-surface-alt border-primary border-t-2"
              : "bg-surface border-border/50 hover:border-primary/50 hover:shadow-lg"
          )}
        >
          <div className="flex items-start justify-between mb-1 md:mb-1.5">
            <div className={cn("text-[10px] md:text-xs font-medium tracking-wide", statusFilter === 'all' ? "text-primary" : "text-muted-foreground")}>
              TODAS
            </div>
            <MessageCircle className="h-3.5 w-3.5 md:h-4 md:w-4 opacity-40 group-hover:opacity-60 transition-opacity text-primary" />
          </div>
          <div className="font-exo2 text-xl md:text-2xl font-bold text-foreground mb-0.5">
            {metrics.total}
          </div>
          <div className="text-[9px] md:text-[10px] text-muted-foreground truncate">Total de conversas</div>
        </button>

        {/* Card BOT RESPONDENDO */}
        <button
          onClick={() => onStatusChange('bot')}
          className={cn(
            "relative p-2.5 md:p-3 rounded-lg border transition-all duration-200 text-left group h-[60px] md:h-[65px]",
            statusFilter === 'bot'
              ? "bg-gradient-to-br from-surface to-surface-alt border-secondary border-t-2"
              : "bg-surface border-border/50 hover:border-secondary/50 hover:shadow-lg"
          )}
        >
          <div className="flex items-start justify-between mb-1 md:mb-1.5">
            <div className={cn("text-[10px] md:text-xs font-medium tracking-wide truncate pr-1", statusFilter === 'bot' ? "text-secondary" : "text-muted-foreground")}>
              BOT
            </div>
            <Bot className="h-3.5 w-3.5 md:h-4 md:w-4 opacity-40 group-hover:opacity-60 transition-opacity flex-shrink-0 text-secondary" />
          </div>
          <div className="font-exo2 text-xl md:text-2xl font-bold text-foreground mb-0.5">
            {metrics.bot}
          </div>
          <div className="text-[9px] md:text-[10px] text-muted-foreground truncate">Bot ativo</div>
        </button>

        {/* Card HUMANO */}
        <button
          onClick={() => onStatusChange('humano')}
          className={cn(
            "relative p-2.5 md:p-3 rounded-lg border transition-all duration-200 text-left group h-[60px] md:h-[65px]",
            statusFilter === 'humano'
              ? "bg-gradient-to-br from-surface to-surface-alt border-primary border-t-2"
              : "bg-surface border-border/50 hover:border-primary/50 hover:shadow-lg"
          )}
        >
          <div className="flex items-start justify-between mb-1 md:mb-1.5">
            <div className={cn("text-[10px] md:text-xs font-medium tracking-wide", statusFilter === 'humano' ? "text-primary" : "text-muted-foreground")}>
              HUMANO
            </div>
            <User className="h-3.5 w-3.5 md:h-4 md:w-4 opacity-40 group-hover:opacity-60 transition-opacity text-primary" />
          </div>
          <div className="font-exo2 text-xl md:text-2xl font-bold text-foreground mb-0.5">
            {metrics.humano}
          </div>
          <div className="text-[9px] md:text-[10px] text-muted-foreground truncate">Atend. humano</div>
        </button>

        {/* Card EM FLOW */}
        <button
          onClick={() => onStatusChange('fluxo_inicial')}
          className={cn(
            "relative p-2.5 md:p-3 rounded-lg border transition-all duration-200 text-left group h-[60px] md:h-[65px]",
            statusFilter === 'fluxo_inicial'
              ? "bg-gradient-to-br from-surface to-surface-alt border-[#9b59b6] border-t-2"
              : "bg-surface border-border/50 hover:border-[#9b59b6]/50 hover:shadow-lg"
          )}
        >
          <div className="flex items-start justify-between mb-1 md:mb-1.5">
            <div className={cn("text-[10px] md:text-xs font-medium tracking-wide", statusFilter === 'fluxo_inicial' ? "text-[#9b59b6]" : "text-muted-foreground")}>
              EM FLOW
            </div>
            <Workflow className="h-3.5 w-3.5 md:h-4 md:w-4 opacity-40 group-hover:opacity-60 transition-opacity text-[#9b59b6]" />
          </div>
          <div className="font-exo2 text-xl md:text-2xl font-bold text-foreground mb-0.5">
            {metrics.emFlow}
          </div>
          <div className="text-[9px] md:text-[10px] text-muted-foreground truncate">Flow interativo</div>
        </button>

        {/* Card TRANSFERIDO */}
        <button
          onClick={() => onStatusChange('transferido')}
          className={cn(
            "relative p-2.5 md:p-3 rounded-lg border transition-all duration-200 text-left group h-[60px] md:h-[65px]",
            statusFilter === 'transferido'
              ? "bg-gradient-to-br from-surface to-surface-alt border-orange-400 border-t-2"
              : "bg-surface border-border/50 hover:border-orange-400/50 hover:shadow-lg"
          )}
        >
          <div className="flex items-start justify-between mb-1 md:mb-1.5">
            <div className={cn("text-[10px] md:text-xs font-medium tracking-wide truncate pr-1", statusFilter === 'transferido' ? "text-orange-400" : "text-muted-foreground")}>
              TRANSF
            </div>
            <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4 opacity-40 group-hover:opacity-60 transition-opacity flex-shrink-0 text-orange-400" />
          </div>
          <div className="font-exo2 text-xl md:text-2xl font-bold text-foreground mb-0.5">
            {metrics.transferido}
          </div>
          <div className="text-[9px] md:text-[10px] text-muted-foreground truncate">Aguardando</div>
        </button>

        {/* Card + EDITAR */}
        <button
          onClick={() => setShowFilterModal(true)}
          className={cn(
            "relative p-2.5 md:p-3 rounded-lg border-2 border-dashed transition-all duration-200 group h-[60px] md:h-[65px]",
            "bg-surface border-border/50 hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center gap-1"
          )}
        >
          <Settings className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          <div className="text-[10px] md:text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors uppercase tracking-wide">
            Editar
          </div>
        </button>
      </div>
      </div>

      {/* Modal de Edição de Filtros */}
      <FilterEditorModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        currentFilters={activeFilters}
        onSave={handleSaveFilters}
      />
    </div>
  )
}

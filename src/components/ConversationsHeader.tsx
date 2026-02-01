'use client'

import { useState } from 'react'
import { MessageCircle, Bot, User, Workflow, ArrowRight, Settings, Tag, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FilterEditorModal } from '@/components/FilterEditorModal'
import { useFilterPreferences } from '@/hooks/useFilterPreferences'

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
  clientId: string | null
}

// Mapeamento de ícones
const ICON_MAP: Record<string, any> = {
  MessageCircle,
  Bot,
  User,
  Workflow,
  ArrowRight,
  Tag,
}

// Mapeamento de cores Tailwind para classes
const COLOR_MAP: Record<string, string> = {
  'primary': 'text-primary border-primary',
  'secondary': 'text-secondary border-secondary',
  'blue': 'text-blue-500 border-blue-500',
  'green': 'text-green-500 border-green-500',
  'red': 'text-red-500 border-red-500',
  'yellow': 'text-yellow-500 border-yellow-500',
  'purple': 'text-purple-500 border-purple-500',
  'pink': 'text-pink-500 border-pink-500',
  'orange': 'text-orange-500 border-orange-500',
  'orange-400': 'text-orange-400 border-orange-400',
  'cyan': 'text-cyan-500 border-cyan-500',
  '#9b59b6': 'text-[#9b59b6] border-[#9b59b6]',
}

// Helper para determinar se o filtro está ativo
const getFilterValue = (filter: any): string | null => {
  if (filter.filter_type === 'default') {
    return filter.default_filter_value
  }
  // Para tags e columns, por enquanto não suportamos filtro diretamente
  // (precisaria expandir a lógica de statusFilter)
  return null
}

export const ConversationsHeader = ({
  metrics,
  statusFilter,
  onStatusChange,
  clientId,
}: ConversationsHeaderProps) => {
  const [showFilterModal, setShowFilterModal] = useState(false)
  const { filters, loading } = useFilterPreferences()

  // Pegar apenas filtros habilitados e ordenados por position
  const enabledFilters = filters
    .filter(f => f.enabled)
    .sort((a, b) => a.position - b.position)

  // Se ainda carregando, mostrar skeleton
  if (loading) {
    return (
      <div className="w-full border-b border-border/50 px-4 md:px-6 py-2 md:py-2.5 relative bg-card/[0.98]">
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
        <div className="flex flex-wrap gap-2 md:gap-2.5">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-[52px] w-[140px] md:w-[160px] rounded-lg border border-border bg-surface animate-pulse" />
          ))}
        </div>
      </div>
    )
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

      {/* Cards KPI - Responsivo (Flex wrap) */}
      <div className="overflow-x-auto pb-1.5 -mx-4 px-4 md:mx-0 md:px-0 md:pb-0 md:overflow-visible">
        <div className="flex flex-wrap gap-2 md:gap-2.5">
          {/* Renderizar filtros do banco */}
          {enabledFilters.map((filter) => {
            const IconComponent = ICON_MAP[filter.icon] || Tag
            const colorClass = COLOR_MAP[filter.color] || COLOR_MAP['primary']
            const filterValue = getFilterValue(filter)
            const isActive = filterValue && statusFilter === filterValue

            return (
              <button
                key={filter.id}
                onClick={() => {
                  if (filterValue) {
                    onStatusChange(filterValue as any)
                  }
                }}
                disabled={!filterValue}  // Desabilita tags e columns por enquanto
                className={cn(
                  "relative px-3 md:px-4 py-2.5 md:py-3 rounded-lg border transition-all duration-200 group",
                  "flex items-center gap-2 md:gap-3 min-w-fit",
                  isActive
                    ? `bg-gradient-to-br from-surface to-surface-alt ${colorClass} border-t-2`
                    : "bg-surface border-border/50 hover:border-primary/50 hover:shadow-lg",
                  !filterValue && "opacity-50 cursor-not-allowed"
                )}
              >
                {/* Ícone */}
                <IconComponent className={cn(
                  "h-4 w-4 md:h-5 md:w-5 opacity-50 group-hover:opacity-70 transition-opacity flex-shrink-0",
                  colorClass.split(' ')[0]
                )} />

                {/* Número */}
                <span className="font-exo2 text-xl md:text-2xl font-bold text-foreground">
                  {filter.count}
                </span>

                {/* Título */}
                <div className={cn(
                  "text-[10px] md:text-xs font-medium tracking-wide uppercase whitespace-nowrap",
                  isActive ? colorClass.split(' ')[0] : "text-muted-foreground"
                )}>
                  {filter.label}
                </div>
              </button>
            )
          })}

          {/* Card + EDITAR */}
          <button
            onClick={() => setShowFilterModal(true)}
            className={cn(
              "relative px-3 md:px-4 py-2.5 md:py-3 rounded-lg border-2 border-dashed transition-all duration-200 group",
              "bg-surface border-border/50 hover:border-primary/50 hover:bg-primary/5",
              "flex items-center justify-center gap-2 min-w-fit"
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
        clientId={clientId}
      />
    </div>
  )
}

'use client'

import { MessageCircle, Bot, User, Workflow, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  return (
    <div
      className="w-full border-b border-white/5 px-6 py-4"
      style={{ background: 'rgba(28, 28, 28, 0.98)' }}
    >
      {/* Header Top - Título e Status */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-poppins font-bold text-2xl text-white mb-1">
            Caixa de Entrada
          </h1>
          <p className="text-white/50 text-sm">
            Gestão / <span className="text-white/70">Conversas</span>
          </p>
        </div>

        {/* Sistema Online Indicator */}
        <div className="flex items-center gap-2 px-4 py-2 bg-[#151515] rounded-lg border border-white/10">
          <div className="w-2 h-2 bg-[#1ABC9C] rounded-full animate-pulse shadow-lg shadow-[#1ABC9C]/50" />
          <span className="text-white/70 text-sm font-medium">Sistema Online</span>
        </div>
      </div>

      {/* Cards KPI - Linha Horizontal */}
      <div className="grid grid-cols-5 gap-4">
        {/* Card TODAS */}
        <button
          onClick={() => onStatusChange('all')}
          className={cn(
            "relative p-4 rounded-xl border transition-all duration-200 text-left group",
            statusFilter === 'all'
              ? "bg-gradient-to-br from-[#252525] to-[#1f2a28] border-[#1ABC9C] border-t-2"
              : "bg-[#252525] border-white/5 hover:border-[#1ABC9C]/50 hover:shadow-lg"
          )}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="text-xs font-medium tracking-wide" style={{ color: statusFilter === 'all' ? '#1ABC9C' : '#B0B0B0' }}>
              TODAS
            </div>
            <MessageCircle className="h-5 w-5 opacity-40 group-hover:opacity-60 transition-opacity" style={{ color: '#1ABC9C' }} />
          </div>
          <div className="font-exo2 text-3xl font-bold text-white mb-1">
            {metrics.total}
          </div>
          <div className="text-xs text-white/40">Total de conversas</div>
        </button>

        {/* Card BOT RESPONDENDO */}
        <button
          onClick={() => onStatusChange('bot')}
          className={cn(
            "relative p-4 rounded-xl border transition-all duration-200 text-left group",
            statusFilter === 'bot'
              ? "bg-gradient-to-br from-[#252525] to-[#1f2a28] border-[#2E86AB] border-t-2"
              : "bg-[#252525] border-white/5 hover:border-[#2E86AB]/50 hover:shadow-lg"
          )}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="text-xs font-medium tracking-wide" style={{ color: statusFilter === 'bot' ? '#2E86AB' : '#B0B0B0' }}>
              BOT RESPONDENDO
            </div>
            <Bot className="h-5 w-5 opacity-40 group-hover:opacity-60 transition-opacity" style={{ color: '#2E86AB' }} />
          </div>
          <div className="font-exo2 text-3xl font-bold text-white mb-1">
            {metrics.bot}
          </div>
          <div className="text-xs text-white/40">Bot ativo</div>
        </button>

        {/* Card HUMANO */}
        <button
          onClick={() => onStatusChange('humano')}
          className={cn(
            "relative p-4 rounded-xl border transition-all duration-200 text-left group",
            statusFilter === 'humano'
              ? "bg-gradient-to-br from-[#252525] to-[#1f2a28] border-[#1ABC9C] border-t-2"
              : "bg-[#252525] border-white/5 hover:border-[#1ABC9C]/50 hover:shadow-lg"
          )}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="text-xs font-medium tracking-wide" style={{ color: statusFilter === 'humano' ? '#1ABC9C' : '#B0B0B0' }}>
              HUMANO
            </div>
            <User className="h-5 w-5 opacity-40 group-hover:opacity-60 transition-opacity" style={{ color: '#1ABC9C' }} />
          </div>
          <div className="font-exo2 text-3xl font-bold text-white mb-1">
            {metrics.humano}
          </div>
          <div className="text-xs text-white/40">Atendimento humano</div>
        </button>

        {/* Card EM FLOW */}
        <button
          onClick={() => onStatusChange('fluxo_inicial')}
          className={cn(
            "relative p-4 rounded-xl border transition-all duration-200 text-left group",
            statusFilter === 'fluxo_inicial'
              ? "bg-gradient-to-br from-[#252525] to-[#1f2a28] border-[#9b59b6] border-t-2"
              : "bg-[#252525] border-white/5 hover:border-[#9b59b6]/50 hover:shadow-lg"
          )}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="text-xs font-medium tracking-wide" style={{ color: statusFilter === 'fluxo_inicial' ? '#9b59b6' : '#B0B0B0' }}>
              EM FLOW
            </div>
            <Workflow className="h-5 w-5 opacity-40 group-hover:opacity-60 transition-opacity" style={{ color: '#9b59b6' }} />
          </div>
          <div className="font-exo2 text-3xl font-bold text-white mb-1">
            {metrics.emFlow}
          </div>
          <div className="text-xs text-white/40">Flow interativo</div>
        </button>

        {/* Card TRANSFERIDO */}
        <button
          onClick={() => onStatusChange('transferido')}
          className={cn(
            "relative p-4 rounded-xl border transition-all duration-200 text-left group",
            statusFilter === 'transferido'
              ? "bg-gradient-to-br from-[#252525] to-[#1f2a28] border-orange-400 border-t-2"
              : "bg-[#252525] border-white/5 hover:border-orange-400/50 hover:shadow-lg"
          )}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="text-xs font-medium tracking-wide" style={{ color: statusFilter === 'transferido' ? '#fb923c' : '#B0B0B0' }}>
              TRANSFERIDO
            </div>
            <ArrowRight className="h-5 w-5 opacity-40 group-hover:opacity-60 transition-opacity" style={{ color: '#fb923c' }} />
          </div>
          <div className="font-exo2 text-3xl font-bold text-white mb-1">
            {metrics.transferido}
          </div>
          <div className="text-xs text-white/40">Aguardando</div>
        </button>
      </div>
    </div>
  )
}

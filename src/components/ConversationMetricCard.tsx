'use client'

import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface ConversationMetricCardProps {
  label: string
  value: number
  icon: LucideIcon
  gradient: string // Tailwind gradient classes
  onClick: () => void
  active?: boolean
  description?: string
}

export const ConversationMetricCard = ({
  label,
  value,
  icon: Icon,
  gradient,
  onClick,
  active = false,
  description
}: ConversationMetricCardProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-full p-4 rounded-xl border transition-all duration-200",
        "hover:shadow-glow hover:-translate-y-1",
        "focus:outline-none focus:ring-2 focus:ring-uzz-mint focus:ring-offset-2 focus:ring-offset-[#0f1419]",
        active
          ? `bg-gradient-to-br ${gradient} text-white border-transparent shadow-glow`
          : "bg-card-dark border-white/10 text-white hover:border-uzz-mint/30 hover:bg-white/5"
      )}
      aria-label={`Filtrar por ${label}: ${value} conversas`}
      aria-pressed={active}
    >
      {/* Barra superior decorativa */}
      {active && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/30 rounded-t-xl" />
      )}

      <div className="flex items-center justify-between mb-3">
        <span className={cn(
          "text-[11px] font-bold uppercase tracking-wider",
          active ? "text-white/90" : "text-uzz-silver"
        )}>
          {label}
        </span>
        <div className={cn(
          "p-2 rounded-lg",
          active ? "bg-white/20" : `bg-gradient-to-br ${gradient} bg-opacity-20`
        )}>
          <Icon className={cn(
            "h-4 w-4",
            active ? "text-white" : `text-white`
          )} />
        </div>
      </div>

      <div className={cn(
        "text-3xl font-bold font-poppins",
        active 
          ? "text-white" 
          : "text-white"
      )}>
        {value}
      </div>

      {description && active && (
        <p className="text-[11px] text-white/70 mt-2">
          {description}
        </p>
      )}
    </button>
  )
}


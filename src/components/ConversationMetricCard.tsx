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
        "relative w-full p-3 rounded-xl border-2 transition-all duration-200",
        "hover:shadow-lg hover:-translate-y-1",
        "focus:outline-none focus:ring-2 focus:ring-uzz-mint focus:ring-offset-2",
        active
          ? `bg-gradient-to-br ${gradient} text-white border-transparent shadow-lg`
          : "bg-white border-uzz-silver text-uzz-black hover:border-uzz-mint hover:bg-gradient-to-br hover:from-gray-50 hover:to-white"
      )}
      aria-label={`Filtrar por ${label}: ${value} conversas`}
      aria-pressed={active}
    >
      {/* Barra superior decorativa */}
      {active && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/30 rounded-t-xl" />
      )}

      <div className="flex items-center justify-between mb-2">
        <span className={cn(
          "text-[10px] font-bold uppercase tracking-wider",
          active ? "text-white/90" : "text-uzz-silver"
        )}>
          {label}
        </span>
        <div className={cn(
          "p-1.5 rounded-lg",
          active ? "bg-white/20" : `bg-gradient-to-br ${gradient}`
        )}>
          <Icon className={cn(
            "h-4 w-4",
            active ? "text-white" : "text-white"
          )} />
        </div>
      </div>

      <div className={cn(
        "text-3xl font-bold font-poppins",
        active 
          ? "text-white" 
          : `bg-gradient-to-r ${gradient} bg-clip-text text-transparent`
      )}>
        {value}
      </div>

      {description && active && (
        <p className="text-[10px] text-white/80 mt-1">
          {description}
        </p>
      )}
    </button>
  )
}


'use client'

import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MetricCardProps {
  title: string
  value: string | number
  trend?: {
    value: number
    label: string
    direction: 'up' | 'down' | 'neutral'
  }
  icon?: LucideIcon
  loading?: boolean
  className?: string
}

/**
 * MetricCard Component - UZZ.AI Design
 *
 * Card de métrica com:
 * - Gradiente no valor (mint → blue)
 * - Barra superior verde-azul
 * - Efeito hover (elevação)
 * - Trend indicator (↑ verde, ↓ vermelho, → cinza)
 * - Loading skeleton
 */
export function MetricCard({
  title,
  value,
  trend,
  icon: Icon,
  loading = false,
  className,
}: MetricCardProps) {
  if (loading) {
    return (
      <div className={cn(
        "relative bg-gradient-to-br from-white to-gray-50/50 p-6 rounded-2xl border-2 border-gray-200 overflow-hidden",
        className
      )}>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-uzz-mint to-uzz-blue" />
        <div className="space-y-3 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-10 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/3" />
        </div>
      </div>
    )
  }

  const getTrendIcon = () => {
    if (!trend) return null

    switch (trend.direction) {
      case 'up':
        return <TrendingUp className="h-3 w-3" />
      case 'down':
        return <TrendingDown className="h-3 w-3" />
      case 'neutral':
        return <Minus className="h-3 w-3" />
    }
  }

  const getTrendColor = () => {
    if (!trend) return ''

    switch (trend.direction) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      case 'neutral':
        return 'text-gray-500'
    }
  }

  return (
    <div
      className={cn(
        "group relative bg-gradient-to-br from-white to-gray-50/50",
        "p-6 rounded-2xl border-2 border-gray-200",
        "shadow-md hover:shadow-xl hover:shadow-uzz-mint/20",
        "transition-all duration-300 hover:-translate-y-1",
        "overflow-hidden",
        className
      )}
    >
      {/* Barra superior gradiente */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-uzz-mint to-uzz-blue" />

      {/* Icon (opcional) */}
      {Icon && (
        <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <Icon className="h-12 w-12 text-uzz-mint" />
        </div>
      )}

      {/* Conteúdo */}
      <div className="relative space-y-2">
        {/* Título */}
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
          {title}
        </h3>

        {/* Valor com gradiente */}
        <div className="flex items-baseline gap-2">
          <p
            className={cn(
              "text-4xl font-bold font-poppins",
              "bg-gradient-to-r from-uzz-mint to-uzz-blue bg-clip-text text-transparent"
            )}
          >
            {value}
          </p>
        </div>

        {/* Trend */}
        {trend && (
          <div className={cn(
            "flex items-center gap-1.5 text-xs font-semibold",
            getTrendColor()
          )}>
            {getTrendIcon()}
            <span>
              {trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}
              {Math.abs(trend.value)}% {trend.label}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * MetricCardSkeleton - Loading state
 */
export function MetricCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      "relative bg-gradient-to-br from-white to-gray-50/50 p-6 rounded-2xl border-2 border-gray-200 overflow-hidden",
      className
    )}>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-uzz-mint to-uzz-blue" />
      <div className="space-y-3 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-10 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  )
}

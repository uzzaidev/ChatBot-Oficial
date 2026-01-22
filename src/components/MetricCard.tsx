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
        "metric-card animate-pulse",
        className
      )}>
        <div className="space-y-3">
          <div className="h-3 bg-white/10 rounded w-1/2" />
          <div className="h-8 bg-white/10 rounded w-3/4" />
          <div className="h-3 bg-white/10 rounded w-1/3" />
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
        return 'text-status-success' // #10B981
      case 'down':
        return 'text-status-danger' // #EF4444
      case 'neutral':
        return 'text-uzz-silver'
    }
  }

  return (
    <div
      className={cn(
        "metric-card group",
        className
      )}
    >
      {/* Icon (opcional) */}
      {Icon && (
        <div className="absolute top-6 right-6 opacity-20 group-hover:opacity-30 transition-opacity">
          <Icon className="h-6 w-6 text-uzz-mint" />
        </div>
      )}

      {/* Conteúdo */}
      <div className="relative space-y-3">
        {/* Header com título e ícone */}
        <div className="flex items-start justify-between">
          <h3 className="text-xs font-bold text-uzz-silver uppercase tracking-wider">
            {title}
          </h3>
        </div>

        {/* Valor */}
        <p className="text-3xl font-bold font-poppins text-white">
          {value}
        </p>

        {/* Trend */}
        {trend && (
          <div className={cn(
            "flex items-center gap-1.5 text-sm font-medium",
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
      "metric-card animate-pulse",
      className
    )}>
      <div className="space-y-3">
        <div className="h-3 bg-white/10 rounded w-1/2" />
        <div className="h-8 bg-white/10 rounded w-3/4" />
        <div className="h-3 bg-white/10 rounded w-1/3" />
      </div>
    </div>
  )
}

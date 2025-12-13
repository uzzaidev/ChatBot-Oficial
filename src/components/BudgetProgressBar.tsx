'use client'

/**
 * Budget Progress Bar Component
 * 
 * Visual progress bar showing budget usage with color indicators
 */

import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface BudgetProgressBarProps {
  current: number
  limit: number
  type: 'tokens' | 'brl' | 'usd' | 'minutes' | 'images' | 'requests'
  showDetails?: boolean
  className?: string
}

export const BudgetProgressBar = ({
  current,
  limit,
  type,
  showDetails = true,
  className,
}: BudgetProgressBarProps) => {
  const percentage = limit > 0 ? (current / limit) * 100 : 0
  const remaining = Math.max(0, limit - current)

  // Determine color based on percentage
  const getColor = () => {
    if (percentage >= 100) return 'red'
    if (percentage >= 80) return 'orange'
    if (percentage >= 50) return 'yellow'
    return 'green'
  }

  const color = getColor()

  const formatValue = (value: number) => {
    switch (type) {
      case 'tokens':
        return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toString()
      case 'brl':
      case 'usd':
        return `R$ ${value.toFixed(2)}`
      case 'minutes':
        return `${value}min`
      case 'images':
        return `${value} img`
      case 'requests':
        return value.toLocaleString('pt-BR')
      default:
        return value.toString()
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      {showDetails && (
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {formatValue(current)} / {formatValue(limit)}
          </span>
          <span className={cn('font-semibold', {
            'text-green-600': color === 'green',
            'text-yellow-600': color === 'yellow',
            'text-orange-600': color === 'orange',
            'text-red-600': color === 'red',
          })}>
            {percentage.toFixed(1)}%
          </span>
        </div>
      )}

      <Progress 
        value={Math.min(percentage, 100)} 
        className={cn('h-3', {
          '[&>div]:bg-green-500': color === 'green',
          '[&>div]:bg-yellow-500': color === 'yellow',
          '[&>div]:bg-orange-500': color === 'orange',
          '[&>div]:bg-red-500': color === 'red',
        })}
      />

      {showDetails && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Restante: {formatValue(remaining)}</span>
          {percentage >= 80 && (
            <span className={cn('font-medium', {
              'text-orange-600': percentage < 100,
              'text-red-600': percentage >= 100,
            })}>
              {percentage >= 100 ? '⚠️ Limite excedido' : '⚠️ Próximo do limite'}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

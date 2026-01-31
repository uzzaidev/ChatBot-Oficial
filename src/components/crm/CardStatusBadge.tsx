'use client'

import { Badge } from '@/components/ui/badge'
import { AlertCircle, Clock, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AutoStatus } from '@/lib/types'

interface CardStatusBadgeProps {
  status: AutoStatus
  size?: 'sm' | 'md'
}

const STATUS_CONFIG: Record<
  AutoStatus,
  {
    label: string
    icon: typeof AlertCircle
    className: string
  }
> = {
  awaiting_attendant: {
    label: 'Aguardando resposta',
    icon: AlertCircle,
    className: 'bg-destructive/10 text-destructive border-destructive/30',
  },
  awaiting_client: {
    label: 'Aguardando cliente',
    icon: Clock,
    className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/30',
  },
  neutral: {
    label: 'Em andamento',
    icon: CheckCircle,
    className: 'bg-muted text-muted-foreground border-border',
  },
}

export const CardStatusBadge = ({ status, size = 'sm' }: CardStatusBadgeProps) => {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-normal',
        config.className,
        size === 'sm' && 'h-5 text-xs px-1.5',
        size === 'md' && 'h-6 text-sm px-2'
      )}
    >
      <Icon className={cn(size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
      <span className="hidden sm:inline">{config.label}</span>
    </Badge>
  )
}

'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  ArrowRight,
  Tag,
  UserPlus,
  DollarSign,
  StickyNote,
  Plus,
  Minus,
  Loader2,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { CRMActivityLog } from '@/lib/types'

interface CardTimelineProps {
  activities: CRMActivityLog[]
  loading?: boolean
}

const ACTIVITY_CONFIG: Record<
  string,
  {
    icon: typeof ArrowRight
    label: string
    color: string
  }
> = {
  column_move: {
    icon: ArrowRight,
    label: 'Moveu card',
    color: 'text-blue-600 dark:text-blue-400',
  },
  tag_add: {
    icon: Plus,
    label: 'Adicionou tag',
    color: 'text-green-600 dark:text-green-400',
  },
  tag_remove: {
    icon: Minus,
    label: 'Removeu tag',
    color: 'text-red-600 dark:text-red-400',
  },
  note_add: {
    icon: StickyNote,
    label: 'Adicionou nota',
    color: 'text-yellow-600 dark:text-yellow-400',
  },
  assigned: {
    icon: UserPlus,
    label: 'Atribuiu a',
    color: 'text-purple-600 dark:text-purple-400',
  },
  value_change: {
    icon: DollarSign,
    label: 'Alterou valor',
    color: 'text-emerald-600 dark:text-emerald-400',
  },
  created: {
    icon: Plus,
    label: 'Criou card',
    color: 'text-blue-600 dark:text-blue-400',
  },
  status_change: {
    icon: ArrowRight,
    label: 'Alterou status',
    color: 'text-orange-600 dark:text-orange-400',
  },
}

export const CardTimeline = ({ activities, loading = false }: CardTimelineProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-muted-foreground">Nenhuma atividade registrada</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {activities.map((activity, index) => {
          const config = ACTIVITY_CONFIG[activity.activity_type] || ACTIVITY_CONFIG.created
          const Icon = config.icon

          return (
            <div key={activity.id}>
              <div className="flex gap-3">
                {/* Icon */}
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border-2',
                    'bg-background',
                    config.color
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{config.label}</span>
                    {activity.is_automated && (
                      <Badge variant="outline" className="text-xs">
                        Automático
                      </Badge>
                    )}
                  </div>

                  {activity.description && (
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                  )}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {activity.actor?.name && <span>{activity.actor.name}</span>}
                    <span>•</span>
                    <span>
                      {formatDistanceToNow(new Date(activity.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Separator */}
              {index < activities.length - 1 && <Separator className="my-4" />}
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}

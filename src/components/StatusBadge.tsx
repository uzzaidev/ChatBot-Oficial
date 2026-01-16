'use client'

import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Bot, User, ArrowRight, HelpCircle, Workflow } from 'lucide-react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
  showTooltip?: boolean
}

type StatusConfig = {
  label: string
  icon: LucideIcon
  gradient: string // Tailwind gradient classes
  description: string
}

const statusConfig: Record<string, StatusConfig> = {
  bot: {
    label: 'Bot',
    icon: Bot,
    gradient: 'from-uzz-blue to-blue-600',
    description: 'Bot está respondendo automaticamente'
  },
  humano: {
    label: 'Humano',
    icon: User,
    gradient: 'from-green-500 to-green-600',
    description: 'Atendimento humano ativo'
  },
  transferido: {
    label: 'Transferido',
    icon: ArrowRight,
    gradient: 'from-orange-500 to-orange-600',
    description: 'Aguardando atendimento humano'
  },
  fluxo_inicial: {
    label: 'Em Flow',
    icon: Workflow,
    gradient: 'from-purple-500 to-purple-600',
    description: 'Conversa em flow interativo'
  },
  // Legacy status values (for backward compatibility)
  human: {
    label: 'Humano',
    icon: User,
    gradient: 'from-green-500 to-green-600',
    description: 'Atendimento humano ativo'
  },
  waiting: {
    label: 'Aguardando',
    icon: ArrowRight,
    gradient: 'from-orange-500 to-orange-600',
    description: 'Aguardando atendimento humano'
  },
}

const defaultConfig: StatusConfig = {
  label: 'Desconhecido',
  icon: HelpCircle,
  gradient: 'from-gray-500 to-gray-600',
  description: 'Status desconhecido'
}

const sizeClasses = {
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
  lg: 'text-sm px-3 py-1.5'
}

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-4 w-4'
}

export const StatusBadge = ({ 
  status, 
  showIcon = true, 
  size = 'sm',
  showTooltip = true
}: StatusBadgeProps) => {
  const config = statusConfig[status] || defaultConfig
  const Icon = config.icon

  const badgeContent = (
    <Badge className={cn(
      `bg-gradient-to-r ${config.gradient} text-white border-0`,
      sizeClasses[size],
      "font-bold shadow-sm hover:shadow-md transition-all"
    )}>
      {showIcon && <Icon className={cn("mr-1.5", iconSizes[size])} />}
      {config.label}
    </Badge>
  )

  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            {badgeContent}
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[200px]">
            <p className="text-sm font-semibold mb-1">{config.label}</p>
            <p className="text-xs text-gray-300">{config.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return badgeContent
}

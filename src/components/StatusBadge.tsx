import { Badge } from '@/components/ui/badge'
import { Bot, User, ArrowRight, HelpCircle } from 'lucide-react'
import { LucideIcon } from 'lucide-react'

interface StatusBadgeProps {
  status: string
  showIcon?: boolean
  size?: 'sm' | 'md'
}

type StatusConfig = {
  label: string
  icon: LucideIcon
  color: string
}

const statusConfig: Record<string, StatusConfig> = {
  bot: {
    label: 'Bot',
    icon: Bot,
    color: 'bg-blue-500/10 text-blue-700 border-blue-200',
  },
  humano: {
    label: 'Humano',
    icon: User,
    color: 'bg-green-500/10 text-green-700 border-green-200',
  },
  transferido: {
    label: 'Transferido',
    icon: ArrowRight,
    color: 'bg-orange-500/10 text-orange-700 border-orange-200',
  },
  // Legacy status values (for backward compatibility)
  human: {
    label: 'Humano',
    icon: User,
    color: 'bg-green-500/10 text-green-700 border-green-200',
  },
  waiting: {
    label: 'Aguardando',
    icon: ArrowRight,
    color: 'bg-orange-500/10 text-orange-700 border-orange-200',
  },
}

const defaultConfig: StatusConfig = {
  label: 'Desconhecido',
  icon: HelpCircle,
  color: 'bg-gray-500/10 text-gray-700 border-gray-200',
}

export const StatusBadge = ({ status, showIcon = true, size = 'sm' }: StatusBadgeProps) => {
  const config = statusConfig[status] || defaultConfig
  const Icon = config.icon

  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'

  return (
    <Badge className={`${config.color} ${sizeClasses}`}>
      {showIcon && <Icon className={`mr-1 ${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'}`} />}
      {config.label}
    </Badge>
  )
}

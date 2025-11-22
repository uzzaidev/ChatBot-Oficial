'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { Bot, User, ArrowRight, HelpCircle } from 'lucide-react'
import { LucideIcon } from 'lucide-react'

interface StatusToggleProps {
  phone: string
  currentStatus: string
}

type StatusConfig = {
  label: string
  icon: LucideIcon
  color: string
  description: string
}

const statusConfig: Record<string, StatusConfig> = {
  bot: {
    label: 'Bot',
    icon: Bot,
    color: 'bg-blue-500/10 text-blue-700 border-blue-200',
    description: 'Atendimento automático',
  },
  humano: {
    label: 'Humano',
    icon: User,
    color: 'bg-green-500/10 text-green-700 border-green-200',
    description: 'Atendimento humano ativo',
  },
  transferido: {
    label: 'Transferido',
    icon: ArrowRight,
    color: 'bg-orange-500/10 text-orange-700 border-orange-200',
    description: 'Aguardando atendimento humano',
  },
  // Legacy status values (for backward compatibility)
  human: {
    label: 'Humano',
    icon: User,
    color: 'bg-green-500/10 text-green-700 border-green-200',
    description: 'Atendimento humano ativo (legacy)',
  },
  waiting: {
    label: 'Aguardando',
    icon: ArrowRight,
    color: 'bg-orange-500/10 text-orange-700 border-orange-200',
    description: 'Aguardando atendimento humano (legacy)',
  },
}

const defaultConfig: StatusConfig = {
  label: 'Desconhecido',
  icon: HelpCircle,
  color: 'bg-gray-500/10 text-gray-700 border-gray-200',
  description: 'Status desconhecido',
}

export const StatusToggle = ({ phone, currentStatus }: StatusToggleProps) => {
  const [status, setStatus] = useState(currentStatus)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleStatusChange = async (newStatus: 'bot' | 'humano' | 'transferido') => {
    if (newStatus === status) return

    setIsLoading(true)

    try {
      const response = await fetch(`/api/customers/${phone}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao atualizar status')
      }

      setStatus(newStatus)
      router.refresh()

      toast({
        title: 'Status atualizado',
        description: `Conversa alterada para: ${statusConfig[newStatus].label}`,
      })
    } catch (error) {
      console.error('[StatusToggle] Erro ao atualizar status:', error)

      toast({
        title: 'Erro ao atualizar status',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const config = statusConfig[status] || defaultConfig
  const CurrentIcon = config.icon

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Badge de status atual */}
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline text-sm font-medium text-muted-foreground">Status:</span>
        <Badge className={config.color}>
          <CurrentIcon className="mr-1 h-3 w-3" />
          {config.label}
        </Badge>
      </div>

      {/* Dropdown para alterar status */}
      <Select
        value={status}
        onValueChange={handleStatusChange}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[140px] sm:w-[200px] text-xs sm:text-sm">
          <SelectValue placeholder="Alterar" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(statusConfig)
            .filter(([key]) => !['human', 'waiting'].includes(key)) // Hide legacy values
            .map(([key, config]) => {
              const Icon = config.icon
              return (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">{config.label}</span>
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {config.description}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              )
            })}
        </SelectContent>
      </Select>
    </div>
  )
}

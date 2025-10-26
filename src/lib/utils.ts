import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs))
}

export const formatPhone = (phone: string | number): string => {
  const phoneStr = String(phone)
  const cleaned = phoneStr.replace(/\D/g, '')

  if (cleaned.startsWith('55') && cleaned.length === 13) {
    const countryCode = cleaned.slice(0, 2)
    const areaCode = cleaned.slice(2, 4)
    const firstPart = cleaned.slice(4, 9)
    const secondPart = cleaned.slice(9, 13)
    return `+${countryCode} (${areaCode}) ${firstPart}-${secondPart}`
  }

  return phoneStr
}

export const formatDateTime = (isoString: string): string => {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) {
    return 'Agora'
  }

  if (diffMins < 60) {
    return `${diffMins}m atrás`
  }

  if (diffHours < 24) {
    return `${diffHours}h atrás`
  }

  if (diffDays < 7) {
    return `${diffDays}d atrás`
  }

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const formatTime = (isoString: string): string => {
  const date = new Date(isoString)
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export const formatCurrencyUSD = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export const calculateOpenAICost = (tokens: number, model: string = 'gpt-4'): number => {
  const costPerToken: Record<string, number> = {
    'gpt-4': 0.00003,
    'gpt-4-turbo': 0.00001,
    'gpt-3.5-turbo': 0.0000015,
    'llama-3.3-70b': 0.00000059,
  }

  const rate = costPerToken[model] || costPerToken['gpt-4']
  return tokens * rate
}

export const estimateWhatsAppCost = (): number => {
  return 0.005
}

export const truncateText = (text: string, maxLength: number = 100): string => {
  // Trim trailing whitespace first (e.g., \n\n from n8n AI formatter)
  const trimmed = text.trimEnd()
  if (trimmed.length <= maxLength) {
    return trimmed
  }
  return `${trimmed.slice(0, maxLength)}...`
}

export const getInitials = (name: string): string => {
  const words = name.trim().split(' ')
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase()
  }
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase()
}

export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    bot: 'bg-green-500',
    waiting: 'bg-yellow-500',
    human: 'bg-blue-500',
    sent: 'bg-green-500',
    delivered: 'bg-green-600',
    read: 'bg-blue-500',
    failed: 'bg-red-500',
    queued: 'bg-gray-500',
  }

  return colors[status] || 'bg-gray-500'
}

export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    bot: 'Bot',
    waiting: 'Aguardando',
    human: 'Humano',
    sent: 'Enviada',
    delivered: 'Entregue',
    read: 'Lida',
    failed: 'Falhou',
    queued: 'Na fila',
  }

  return labels[status] || status
}

export const cleanMessageContent = (content: string): string => {
  // Remove tags de function calls (ex: <function=AI_Agent_Tool>{...}</function>)
  let cleaned = content.replace(/<function=[\s\S]*?<\/function>/gi, '')

  // Remove tags de function sem closing tag (ex: <function=AI_Agent_Tool>{...})
  cleaned = cleaned.replace(/<function=[^>]*>\{[^}]*\}/gi, '')

  // Remove espaços extras no final
  cleaned = cleaned.trim()

  return cleaned
}

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

/**
 * Formata a data para exibição como separador de mensagens (estilo WhatsApp)
 * Exemplos:
 * - "Hoje"
 * - "Ontem"
 * - "Segunda-feira" (se esta semana)
 * - "24/11/2025" (datas mais antigas)
 */
export const formatMessageDate = (isoString: string): string => {
  const date = new Date(isoString)
  const now = new Date()
  
  // Reseta as horas para comparar apenas as datas
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  const diffMs = nowOnly.getTime() - dateOnly.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  
  // Hoje
  if (diffDays === 0) {
    return 'Hoje'
  }
  
  // Ontem
  if (diffDays === 1) {
    return 'Ontem'
  }
  
  // Esta semana (últimos 7 dias) - mostra dia da semana
  if (diffDays > 1 && diffDays <= 7) {
    return date.toLocaleDateString('pt-BR', { weekday: 'long' })
  }
  
  // Datas mais antigas - mostra data completa
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Verifica se duas datas são do mesmo dia
 */
export const isSameDay = (date1: string, date2: string): boolean => {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
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
  if (!content || typeof content !== 'string') {
    return content || ''
  }

  // Remove tags de function calls com closing tag (ex: <function=transferir_atendimento>{...}</function>)
  // Usa [^] ao invés de [\s\S] para capturar qualquer caractere incluindo newlines
  let cleaned = content.replace(/<function=[^>]+>[^]*?<\/function>/gi, '')

  // Remove tags de function sem closing tag (ex: <function=AI_Agent_Tool>{...})
  cleaned = cleaned.replace(/<function=[^>]*>\{[^}]*\}/gi, '')

  // Remove espaços extras, mas mantém quebras de linha internas
  cleaned = cleaned.trim()

  return cleaned
}

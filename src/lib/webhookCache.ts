// Sistema de cache em memória para mensagens recebidas pelo webhook
// Armazena as últimas mensagens para visualização no dashboard

interface WebhookMessage {
  id: string
  timestamp: string
  from: string
  name: string
  type: string
  content: string
  raw: any
}

const recentWebhookMessages: WebhookMessage[] = []
const MAX_RECENT_MESSAGES = 20

export const addWebhookMessage = (message: WebhookMessage) => {
  recentWebhookMessages.push(message)
  
  // Mantém apenas as últimas 20
  if (recentWebhookMessages.length > MAX_RECENT_MESSAGES) {
    recentWebhookMessages.shift()
  }
}

export const getRecentWebhookMessages = (): WebhookMessage[] => {
  return [...recentWebhookMessages].reverse() // Mais recentes primeiro
}

export const clearWebhookMessages = () => {
  recentWebhookMessages.length = 0
}

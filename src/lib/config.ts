/**
 * Configurações centralizadas da aplicação
 * Facilita acesso a variáveis de ambiente e configurações
 */

/**
 * Retorna a URL base do webhook
 *
 * IMPORTANTE: Deve ser SEMPRE a URL de produção (ex: https://chat.luisfboff.com)
 * Tanto em dev quanto em prod, usamos a mesma URL porque:
 * - Meta WhatsApp só consegue chamar URLs públicas
 * - Facilita testar o fluxo completo em desenvolvimento
 *
 * @returns URL base configurada no .env.local
 */
export const getWebhookBaseUrl = (): string => {
  const url = process.env.WEBHOOK_BASE_URL

  if (!url) {
    throw new Error('WEBHOOK_BASE_URL não configurado no .env.local')
  }

  return url
}

/**
 * Retorna URL completa do webhook da Meta
 *
 * @returns URL completa (ex: https://chat.luisfboff.com/api/webhook)
 */
export const getWebhookUrl = (): string => {
  return `${getWebhookBaseUrl()}/api/webhook`
}

/**
 * Retorna token de verificação do webhook da Meta
 *
 * @returns Token de verificação ou erro se não configurado
 */
export const getMetaVerifyToken = (): string => {
  const token = process.env.META_VERIFY_TOKEN
  if (!token) {
    throw new Error('META_VERIFY_TOKEN não configurado em .env.local')
  }
  return token
}

/**
 * Configurações da Meta (WhatsApp Business API)
 */
export const getMetaConfig = () => {
  const accessToken = process.env.META_ACCESS_TOKEN
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID
  const verifyToken = process.env.META_VERIFY_TOKEN

  if (!accessToken) {
    throw new Error('META_ACCESS_TOKEN não configurado')
  }

  if (!phoneNumberId) {
    throw new Error('META_PHONE_NUMBER_ID não configurado')
  }

  return {
    accessToken,
    phoneNumberId,
    verifyToken: verifyToken || '',
    apiVersion: 'v18.0',
  }
}

/**
 * Verifica se está rodando em ambiente de desenvolvimento
 */
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development'
}

/**
 * Verifica se está rodando em ambiente de produção
 */
export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production'
}

/**
 * Verifica se está rodando no Vercel
 */
export const isVercel = (): boolean => {
  return !!process.env.VERCEL
}

/**
 * Retorna informações do ambiente atual
 */
export const getEnvironmentInfo = () => {
  return {
    nodeEnv: process.env.NODE_ENV,
    webhookBaseUrl: getWebhookBaseUrl(),
    webhookUrl: getWebhookUrl(),
    isVercel: isVercel(),
    vercelUrl: process.env.VERCEL_URL,
    vercelEnv: process.env.VERCEL_ENV, // production, preview, development
  }
}

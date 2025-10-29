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

// ============================================================================
// 🔐 MULTI-TENANT CONFIG WITH VAULT
// ============================================================================

import { createServerClient } from './supabase'
import { getClientSecrets } from './vault'
import type { ClientConfig } from './types'

/**
 * 🔐 Busca configuração completa do cliente com secrets descriptografados do Vault
 *
 * Esta função é o coração do sistema multi-tenant. Ela:
 * 1. Busca dados do cliente no banco
 * 2. Descriptografa secrets do Vault em paralelo
 * 3. Faz fallback para env vars globais quando necessário
 * 4. Retorna config pronto para uso
 *
 * @param clientId - UUID do cliente
 * @returns Configuração completa ou null se não encontrado
 */
export const getClientConfig = async (clientId: string): Promise<ClientConfig | null> => {
  try {
    const supabase = createServerClient()

    // 1. Buscar config do cliente (sem secrets ainda)
    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('status', 'active')
      .single() as { data: any; error: any }

    if (error || !client) {
      console.error('[getClientConfig] Failed to fetch client:', error)
      return null
    }

    console.log(`[getClientConfig] Fetching config for client: ${client.name} (${client.slug})`)

    // 2. Descriptografar secrets do Vault em paralelo
    const secrets = await getClientSecrets(supabase, {
      meta_access_token_secret_id: client.meta_access_token_secret_id,
      meta_verify_token_secret_id: client.meta_verify_token_secret_id,
      openai_api_key_secret_id: client.openai_api_key_secret_id,
      groq_api_key_secret_id: client.groq_api_key_secret_id,
    })

    // 3. Validar que secrets obrigatórios existem no Vault (SEM fallback para .env)
    const finalOpenaiKey = secrets.openaiApiKey
    const finalGroqKey = secrets.groqApiKey

    if (!finalOpenaiKey) {
      throw new Error(
        `[getClientConfig] No OpenAI key configured for client ${clientId}. ` +
        `Please configure in Settings: /dashboard/settings`
      )
    }

    if (!finalGroqKey) {
      throw new Error(
        `[getClientConfig] No Groq key configured for client ${clientId}. ` +
        `Please configure in Settings: /dashboard/settings`
      )
    }

    if (!secrets.metaAccessToken) {
      throw new Error(
        `[getClientConfig] No Meta Access Token configured for client ${clientId}. ` +
        `Please configure in Settings: /dashboard/settings`
      )
    }

    if (!client.meta_phone_number_id || client.meta_phone_number_id === 'CONFIGURE_IN_SETTINGS') {
      throw new Error(
        `[getClientConfig] No Meta Phone Number ID configured for client ${clientId}. ` +
        `Please configure in Settings: /dashboard/settings`
      )
    }

    // 4. Retornar config completo (transformar snake_case do DB para camelCase)
    const config: ClientConfig = {
      id: client.id,
      name: client.name,
      slug: client.slug,
      status: client.status,
      apiKeys: {
        metaAccessToken: secrets.metaAccessToken,
        metaVerifyToken: secrets.metaVerifyToken,
        metaPhoneNumberId: client.meta_phone_number_id,
        openaiApiKey: finalOpenaiKey,
        groqApiKey: finalGroqKey,
      },
      prompts: {
        systemPrompt: client.system_prompt,
        formatterPrompt: client.formatter_prompt || undefined,
      },
      models: {
        openaiModel: client.openai_model || 'gpt-4o',
        groqModel: client.groq_model || 'llama-3.3-70b-versatile',
      },
      settings: {
        batchingDelaySeconds: client.settings.batching_delay_seconds,
        maxTokens: client.settings.max_tokens,
        temperature: client.settings.temperature,
        enableRAG: client.settings.enable_rag,
        enableTools: client.settings.enable_tools,
        enableHumanHandoff: client.settings.enable_human_handoff,
        messageSplitEnabled: client.settings.message_split_enabled,
        maxChatHistory: client.settings.max_chat_history,
      },
      notificationEmail: client.notification_email || undefined,
    }

    console.log('[getClientConfig] ✅ Config loaded successfully')
    return config
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[getClientConfig] Error:', errorMessage)
    return null
  }
}

/**
 * Valida se config tem todos os campos obrigatórios
 *
 * @param config - Configuração do cliente
 * @returns true se válida, false caso contrário
 */
export const validateClientConfig = (config: ClientConfig): boolean => {
  const required = [
    config.id,
    config.apiKeys.metaAccessToken,
    config.apiKeys.metaPhoneNumberId,
    config.apiKeys.openaiApiKey,
    config.apiKeys.groqApiKey,
    config.prompts.systemPrompt,
  ]

  const isValid = required.every((field) => field && field.length > 0)

  if (!isValid) {
    console.error('[validateClientConfig] Invalid config:', {
      hasMetaToken: !!config.apiKeys.metaAccessToken,
      hasPhoneId: !!config.apiKeys.metaPhoneNumberId,
      hasOpenAI: !!config.apiKeys.openaiApiKey,
      hasGroq: !!config.apiKeys.groqApiKey,
      hasPrompt: !!config.prompts.systemPrompt,
    })
  }

  return isValid
}

/**
 * 🔄 Busca config do cliente com fallback para .env (compatibilidade retroativa)
 *
 * ⚠️ DEPRECATED: Esta função será removida em breve.
 * Não use .env fallback - configure todas as credenciais no Vault via /dashboard/settings
 *
 * Esta função permite transição gradual:
 * - Se clientId fornecido: usa multi-tenant (recomendado)
 * - Se clientId null: lança erro (não mais suportado)
 *
 * @param clientId - UUID do cliente ou null
 * @returns Config do cliente ou lança erro se null
 * @deprecated Use getClientConfig(clientId) diretamente e configure credenciais no Vault
 */
export const getClientConfigWithFallback = async (
  clientId?: string | null
): Promise<ClientConfig | null> => {
  // Se clientId fornecido, usa multi-tenant
  if (clientId) {
    return await getClientConfig(clientId)
  }

  // DEPRECATED: .env fallback não é mais suportado
  console.error(
    '❌ [getClientConfigWithFallback] DEPRECATED: .env fallback não é mais suportado. ' +
    'Configure o webhook com client_id: {WEBHOOK_BASE_URL}/api/webhook/{client_id}'
  )

  throw new Error(
    'Legacy .env config is no longer supported. ' +
    'Please update your webhook URL to: ' +
    `${process.env.WEBHOOK_BASE_URL}/api/webhook/{client_id} ` +
    'and configure all credentials in /dashboard/settings'
  )
}

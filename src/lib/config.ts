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

    // 3. Fallback para env vars globais se cliente não tiver keys próprias
    const finalOpenaiKey = secrets.openaiApiKey || process.env.OPENAI_API_KEY!
    const finalGroqKey = secrets.groqApiKey || process.env.GROQ_API_KEY!

    if (!finalOpenaiKey) {
      console.warn(`[getClientConfig] No OpenAI key for client ${clientId} (neither Vault nor env)`)
    }

    if (!finalGroqKey) {
      console.warn(`[getClientConfig] No Groq key for client ${clientId} (neither Vault nor env)`)
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
 * Esta função permite transição gradual:
 * - Se clientId fornecido: usa multi-tenant
 * - Se clientId null: usa .env (sistema antigo)
 *
 * @param clientId - UUID do cliente ou null
 * @returns Config do cliente ou config legada do .env
 */
export const getClientConfigWithFallback = async (
  clientId?: string | null
): Promise<ClientConfig | null> => {
  // Se clientId fornecido, usa multi-tenant
  if (clientId) {
    return await getClientConfig(clientId)
  }

  // Fallback: modo legacy (lê .env.local)
  console.warn('[getClientConfigWithFallback] Using legacy .env config (no clientId provided)')

  try {
    const metaConfig = getMetaConfig()

    return {
      id: 'legacy-client',
      name: 'Legacy Client',
      slug: 'legacy',
      status: 'active',
      apiKeys: {
        metaAccessToken: metaConfig.accessToken,
        metaVerifyToken: metaConfig.verifyToken,
        metaPhoneNumberId: metaConfig.phoneNumberId,
        openaiApiKey: process.env.OPENAI_API_KEY!,
        groqApiKey: process.env.GROQ_API_KEY!,
      },
      prompts: {
        systemPrompt: 'Legacy system prompt',
      },
      settings: {
        batchingDelaySeconds: 10,
        maxTokens: 2000,
        temperature: 0.7,
        enableRAG: true,
        enableTools: true,
        enableHumanHandoff: true,
        messageSplitEnabled: true,
        maxChatHistory: 15,
      },
    }
  } catch (error) {
    console.error('[getClientConfigWithFallback] Failed to load legacy config:', error)
    return null
  }
}

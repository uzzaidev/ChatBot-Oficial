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
      
      // 🤖 Provider principal (NOVO)
      primaryProvider: client.primary_model_provider || 'groq',
      
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

// ============================================================================
// 🎛️ BOT CONFIGURATIONS (Modular Settings System)
// ============================================================================

/**
 * Interface para configuração do bot (tabela bot_configurations)
 */
export interface BotConfig {
  id: string
  client_id: string | null
  config_key: string
  config_value: any
  is_default: boolean
  description?: string
  category?: string
  created_at: string
  updated_at: string
}

/**
 * Cache em memória para configurações do bot
 * Renovado automaticamente a cada 5 minutos
 */
const botConfigCache = new Map<string, { value: any; expiresAt: number }>()
const BOT_CONFIG_CACHE_TTL = 5 * 60 * 1000 // 5 minutos

/**
 * Busca UMA configuração específica do cliente no banco
 * Se o cliente não customizou, retorna a configuração padrão
 *
 * @param clientId - UUID do cliente
 * @param configKey - Chave no formato 'namespace:key' (ex: 'intent_classifier:prompt')
 * @returns Valor da configuração ou null se não encontrado
 *
 * @example
 * const prompt = await getBotConfig(clientId, 'intent_classifier:prompt')
 * const useLLM = await getBotConfig(clientId, 'intent_classifier:use_llm')
 */
export const getBotConfig = async (
  clientId: string,
  configKey: string
): Promise<any> => {
  const cacheKey = `${clientId}:${configKey}`

  // Verificar cache
  const cached = botConfigCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  try {
    const supabase = createServerClient()

    // Buscar configuração do cliente OU default
    // Ordem: cliente (is_default=false) tem prioridade sobre default (is_default=true)
    const { data, error } = await supabase
      .from('bot_configurations')
      .select('config_value, is_default')
      .eq('config_key', configKey)
      .or(`client_id.eq.${clientId},is_default.eq.true`)
      .order('is_default', { ascending: true }) // false (cliente) vem primeiro
      .limit(1)
      .single()

    if (error) {
      console.warn(`[getBotConfig] Config não encontrada: ${configKey}`, error.message)
      return null
    }

    if (!data) {
      console.warn(`[getBotConfig] Config não encontrada: ${configKey}`)
      return null
    }

    // Cachear resultado
    botConfigCache.set(cacheKey, {
      value: data.config_value,
      expiresAt: Date.now() + BOT_CONFIG_CACHE_TTL
    })

    return data.config_value
  } catch (error) {
    console.error(`[getBotConfig] Erro ao buscar config ${configKey}:`, error)
    return null
  }
}

/**
 * Busca MÚLTIPLAS configurações de uma vez (mais eficiente que múltiplas chamadas)
 *
 * @param clientId - UUID do cliente
 * @param configKeys - Array de chaves (ex: ['intent_classifier:prompt', 'personality:config'])
 * @returns Map<configKey, configValue>
 *
 * @example
 * const configs = await getBotConfigs(clientId, [
 *   'intent_classifier:prompt',
 *   'intent_classifier:use_llm',
 *   'personality:config'
 * ])
 * const prompt = configs.get('intent_classifier:prompt')
 */
export const getBotConfigs = async (
  clientId: string,
  configKeys: string[]
): Promise<Map<string, any>> => {
  try {
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('bot_configurations')
      .select('config_key, config_value, is_default')
      .in('config_key', configKeys)
      .or(`client_id.eq.${clientId},is_default.eq.true`)

    if (error || !data) {
      console.error('[getBotConfigs] Erro ao buscar configs:', error)
      return new Map()
    }

    // Priorizar configs do cliente sobre defaults
    const configMap = new Map<string, any>()

    // Primeiro adicionar defaults
    data.filter(c => c.is_default).forEach(c => {
      configMap.set(c.config_key, c.config_value)
    })

    // Depois sobrescrever com configs do cliente (se existir)
    data.filter(c => !c.is_default).forEach(c => {
      configMap.set(c.config_key, c.config_value)

      // Cachear também
      const cacheKey = `${clientId}:${c.config_key}`
      botConfigCache.set(cacheKey, {
        value: c.config_value,
        expiresAt: Date.now() + BOT_CONFIG_CACHE_TTL
      })
    })

    return configMap
  } catch (error) {
    console.error('[getBotConfigs] Erro:', error)
    return new Map()
  }
}

/**
 * Salva/atualiza UMA configuração do cliente
 *
 * @param clientId - UUID do cliente
 * @param configKey - Chave no formato 'namespace:key'
 * @param configValue - Valor (pode ser string, number, boolean, object, array)
 * @param metadata - Metadados opcionais (description, category)
 *
 * @example
 * await setBotConfig(clientId, 'intent_classifier:use_llm', true, {
 *   description: 'Usar LLM para classificar intenção',
 *   category: 'rules'
 * })
 */
export const setBotConfig = async (
  clientId: string,
  configKey: string,
  configValue: any,
  metadata?: { description?: string; category?: string }
): Promise<void> => {
  try {
    const supabase = createServerClient()

    const { error } = await supabase
      .from('bot_configurations')
      .upsert({
        client_id: clientId,
        config_key: configKey,
        config_value: configValue,
        description: metadata?.description,
        category: metadata?.category,
        is_default: false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'client_id,config_key'
      })

    if (error) {
      throw new Error(`Erro ao salvar config: ${error.message}`)
    }

    // Limpar cache
    const cacheKey = `${clientId}:${configKey}`
    botConfigCache.delete(cacheKey)

    console.log(`[setBotConfig] ✅ Config salva: ${configKey}`)
  } catch (error) {
    console.error(`[setBotConfig] Erro ao salvar ${configKey}:`, error)
    throw error
  }
}

/**
 * Reseta UMA configuração para o padrão (deleta customização do cliente)
 *
 * @param clientId - UUID do cliente
 * @param configKey - Chave da configuração a resetar
 *
 * @example
 * await resetBotConfig(clientId, 'intent_classifier:prompt')
 * // Agora o cliente volta a usar o prompt padrão
 */
export const resetBotConfig = async (
  clientId: string,
  configKey: string
): Promise<void> => {
  try {
    const supabase = createServerClient()

    const { error } = await supabase
      .from('bot_configurations')
      .delete()
      .eq('client_id', clientId)
      .eq('config_key', configKey)
      .eq('is_default', false) // Só deleta custom, não default

    if (error) {
      throw new Error(`Erro ao resetar config: ${error.message}`)
    }

    // Limpar cache
    const cacheKey = `${clientId}:${configKey}`
    botConfigCache.delete(cacheKey)

    console.log(`[resetBotConfig] ✅ Config resetada: ${configKey}`)
  } catch (error) {
    console.error(`[resetBotConfig] Erro ao resetar ${configKey}:`, error)
    throw error
  }
}

/**
 * Lista TODAS as configurações do cliente (custom + defaults)
 * Útil para exibir no dashboard
 *
 * @param clientId - UUID do cliente
 * @param category - Filtrar por categoria (opcional)
 * @returns Array de configurações com informações completas
 *
 * @example
 * const configs = await listBotConfigs(clientId, 'prompts')
 * // Retorna todas as configs da categoria 'prompts'
 */
export const listBotConfigs = async (
  clientId: string,
  category?: string
): Promise<BotConfig[]> => {
  try {
    const supabase = createServerClient()

    let query = supabase
      .from('bot_configurations')
      .select('*')
      .or(`client_id.eq.${clientId},is_default.eq.true`)

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query.order('config_key')

    if (error) {
      throw new Error(`Erro ao listar configs: ${error.message}`)
    }

    if (!data) {
      return []
    }

    // Deduplicar: se cliente tem custom, remover default
    const configMap = new Map<string, BotConfig>()

    // Primeiro adicionar defaults
    data.filter(c => c.is_default).forEach(c => {
      configMap.set(c.config_key, c as BotConfig)
    })

    // Depois sobrescrever com customs
    data.filter(c => !c.is_default && c.client_id === clientId).forEach(c => {
      configMap.set(c.config_key, c as BotConfig)
    })

    return Array.from(configMap.values())
  } catch (error) {
    console.error('[listBotConfigs] Erro:', error)
    return []
  }
}

/**
 * Limpa todo o cache de configurações
 * Útil para forçar reload após mudanças massivas
 */
export const clearBotConfigCache = (): void => {
  botConfigCache.clear()
  console.log('[clearBotConfigCache] ✅ Cache limpo')
}

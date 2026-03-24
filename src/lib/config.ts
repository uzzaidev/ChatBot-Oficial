/**
 * Configurações centralizadas da aplicação
 * Facilita acesso a variáveis de ambiente e configurações
 */

/**
 * Retorna a URL base do webhook
 *
 * IMPORTANTE: Deve ser SEMPRE a URL de produção (ex: https://uzzapp.uzzai.com.br)
 * Tanto em dev quanto em prod, usamos a mesma URL porque:
 * - Meta WhatsApp só consegue chamar URLs públicas
 * - Facilita testar o fluxo completo em desenvolvimento
 *
 * @returns URL base configurada no .env.local
 */
export const getWebhookBaseUrl = (): string => {
  const url = process.env.WEBHOOK_BASE_URL;

  if (!url) {
    throw new Error("WEBHOOK_BASE_URL não configurado no .env.local");
  }

  return url;
};

/**
 * Retorna URL completa do webhook da Meta
 *
 * @returns URL completa (ex: https://uzzapp.uzzai.com.br/api/webhook)
 */
export const getWebhookUrl = (): string => {
  return `${getWebhookBaseUrl()}/api/webhook`;
};

/**
 * Retorna token de verificação do webhook da Meta
 *
 * @returns Token de verificação ou erro se não configurado
 */
export const getMetaVerifyToken = (): string => {
  const token = process.env.META_VERIFY_TOKEN;
  if (!token) {
    throw new Error("META_VERIFY_TOKEN não configurado em .env.local");
  }
  return token;
};

/**
 * Configurações da Meta (WhatsApp Business API)
 */
export const getMetaConfig = () => {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  const verifyToken = process.env.META_VERIFY_TOKEN;

  if (!accessToken) {
    throw new Error("META_ACCESS_TOKEN não configurado");
  }

  if (!phoneNumberId) {
    throw new Error("META_PHONE_NUMBER_ID não configurado");
  }

  return {
    accessToken,
    phoneNumberId,
    verifyToken: verifyToken || "",
    apiVersion: "v22.0",
  };
};

/**
 * Verifica se está rodando em ambiente de desenvolvimento
 */
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === "development";
};

/**
 * Verifica se está rodando em ambiente de produção
 */
export const isProduction = (): boolean => {
  return process.env.NODE_ENV === "production";
};

/**
 * Verifica se está rodando no Vercel
 */
export const isVercel = (): boolean => {
  return !!process.env.VERCEL;
};

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
  };
};

// ============================================================================
// 🔐 MULTI-TENANT CONFIG WITH VAULT
// ============================================================================

import { createServerClient, createServiceRoleClient } from "./supabase";
import type { Agent, ClientConfig } from "./types";
import { getClientSecrets } from "./vault";

/**
 * 🤖 Busca o agente ativo do cliente
 *
 * @param clientId - UUID do cliente
 * @returns Agente ativo ou null se não houver
 */
export const getActiveAgent = async (
  clientId: string,
): Promise<Agent | null> => {
  try {
    const supabase = createServiceRoleClient();

    // Busca o agente ativo (is_active = true, is_archived = false)
    const { data: agent, error } = await supabase
      .from("agents")
      .select("*")
      .eq("client_id", clientId)
      .eq("is_active", true)
      .eq("is_archived", false)
      .single();

    if (error || !agent) {
      console.log(
        `[getActiveAgent] No active agent found for client ${clientId}`,
      );
      return null;
    }

    return agent as Agent;
  } catch (error) {
    console.error("[getActiveAgent] Error:", error);
    return null;
  }
};

/**
 * 🔐 Busca configuração completa do cliente com secrets descriptografados do Vault
 *
 * - Meta credentials: always per-client (Vault)
 * - AI provider keys: platform-only by default (shared_gateway_config), BYOK optional
 *
 * ⚠️ CRITICAL WARNING: This function returns SHARED keys when aiKeysMode != "byok_allowed"
 * DO NOT USE for fallback scenarios where client-specific Vault credentials are required!
 * For fallback, use getSecret() directly with client's openai_api_key_secret_id.
 */
export const getClientConfig = async (
  clientId: string,
): Promise<ClientConfig | null> => {
  try {
    const supabase = await createServerClient();

    const { data: client, error } = (await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .eq("status", "active")
      .single()) as { data: any; error: any };

    if (error || !client) {
      return null;
    }

    const secrets = await getClientSecrets(supabase, {
      meta_access_token_secret_id: client.meta_access_token_secret_id,
      meta_verify_token_secret_id: client.meta_verify_token_secret_id,
      meta_app_secret_secret_id: client.meta_app_secret_secret_id,
      openai_api_key_secret_id: client.openai_api_key_secret_id,
      groq_api_key_secret_id: client.groq_api_key_secret_id,
    });

    if (!secrets.metaAccessToken) {
      throw new Error(
        `[getClientConfig] No Meta Access Token configured for client ${clientId}. ` +
          `Please configure in Settings: /dashboard/settings`,
      );
    }

    if (
      !client.meta_phone_number_id ||
      client.meta_phone_number_id === "CONFIGURE_IN_SETTINGS"
    ) {
      throw new Error(
        `[getClientConfig] No Meta Phone Number ID configured for client ${clientId}. ` +
          `Please configure in Settings: /dashboard/settings`,
      );
    }

    // Use only Vault credentials (no shared Gateway keys)
    const finalOpenaiKey = secrets.openaiApiKey;
    const finalGroqKey = secrets.groqApiKey;

    // Warn but don't throw for missing AI keys - allows webhook to receive/save messages
    // even if AI response will fail later in the pipeline
    if (!finalOpenaiKey) {
      console.warn(
        `[getClientConfig] ⚠️ Missing OpenAI API key for client ${clientId}. ` +
          `AI responses will fail. Configure in Settings: /dashboard/settings`,
      );
    }

    const primaryProvider = (client.primary_model_provider ||
      "groq") as ClientConfig["primaryProvider"];

    if (primaryProvider === "groq" && !finalGroqKey) {
      console.warn(
        `[getClientConfig] ⚠️ Missing Groq API key for client ${clientId}. ` +
          `AI responses will fail. Configure in Settings or switch provider to OpenAI.`,
      );
    }

    // =========================================================================
    // 🤖 AGENT CONFIG OVERRIDE: Merge active agent settings
    // =========================================================================
    const activeAgent = await getActiveAgent(clientId);

    // Base settings from client (fallback)
    const baseSettings = {
      batchingDelaySeconds: client.settings?.batching_delay_seconds ?? 10,
      maxTokens: client.settings?.max_tokens ?? 2048,
      temperature: client.settings?.temperature ?? 0.7,
      enableRAG: client.settings?.enable_rag ?? false,
      enableTools: client.settings?.enable_tools ?? false,
      enableHumanHandoff: client.settings?.enable_human_handoff ?? true,
      messageSplitEnabled: client.settings?.message_split_enabled ?? false,
      maxChatHistory: client.settings?.max_chat_history ?? 15,
      messageDelayMs: client.settings?.message_delay_ms ?? 2000,
      tts_enabled: client.tts_enabled ?? false,
      tts_provider: client.tts_provider ?? "openai",
      tts_model: client.tts_model ?? "tts-1-hd",
      tts_voice: client.tts_voice ?? "alloy",
      tts_speed: client.tts_speed ?? 1.0,
      tts_auto_offer: client.tts_auto_offer ?? false,
    };

    // Override with active agent settings if available
    const finalSettings = activeAgent
      ? {
          ...baseSettings,
          // Timing & Memory from Agent
          batchingDelaySeconds:
            activeAgent.batching_delay_seconds ??
            baseSettings.batchingDelaySeconds,
          maxChatHistory:
            activeAgent.max_chat_history ?? baseSettings.maxChatHistory,
          messageDelayMs:
            activeAgent.message_delay_ms ?? baseSettings.messageDelayMs,
          messageSplitEnabled:
            activeAgent.message_split_enabled ??
            baseSettings.messageSplitEnabled,
          // Tools & Features from Agent
          enableTools: activeAgent.enable_tools ?? baseSettings.enableTools,
          enableRAG: activeAgent.enable_rag ?? baseSettings.enableRAG,
          enableHumanHandoff:
            activeAgent.enable_human_handoff ?? baseSettings.enableHumanHandoff,
          // Model settings from Agent
          maxTokens: activeAgent.max_tokens ?? baseSettings.maxTokens,
          temperature: activeAgent.temperature ?? baseSettings.temperature,
          // TTS from agent (enable_audio_response)
          tts_enabled:
            activeAgent.enable_audio_response ?? baseSettings.tts_enabled,
        }
      : baseSettings;

    // Determine prompts - prefer agent's compiled prompts if available
    const finalPrompts = activeAgent?.compiled_system_prompt
      ? {
          systemPrompt: activeAgent.compiled_system_prompt,
          formatterPrompt:
            activeAgent.compiled_formatter_prompt ||
            client.formatter_prompt ||
            undefined,
        }
      : {
          systemPrompt: client.system_prompt,
          formatterPrompt: client.formatter_prompt || undefined,
        };

    // Determine models - prefer agent's models if available
    const finalModels = activeAgent
      ? {
          openaiModel:
            activeAgent.openai_model || client.openai_model || "gpt-4o",
          groqModel:
            activeAgent.groq_model ||
            client.groq_model ||
            "llama-3.3-70b-versatile",
        }
      : {
          openaiModel: client.openai_model || "gpt-4o",
          groqModel: client.groq_model || "llama-3.3-70b-versatile",
        };

    // Determine primary provider - prefer agent's if available
    const finalPrimaryProvider =
      activeAgent?.primary_provider || primaryProvider;

    const config: ClientConfig = {
      id: client.id,
      name: client.name,
      slug: client.slug,
      status: client.status,

      primaryProvider: finalPrimaryProvider,

      apiKeys: {
        metaAccessToken: secrets.metaAccessToken,
        metaVerifyToken: secrets.metaVerifyToken,
        metaAppSecret: secrets.metaAppSecret,
        metaPhoneNumberId: client.meta_phone_number_id,
        openaiApiKey: finalOpenaiKey,
        groqApiKey: finalGroqKey || "",
      },
      prompts: finalPrompts,
      models: finalModels,
      settings: finalSettings,
      notificationEmail: client.notification_email || undefined,

      // 📅 Calendar Integration
      calendar: {
        google: {
          enabled: client.google_calendar_enabled || false,
          userEmail: client.google_calendar_user_email || undefined,
        },
        microsoft: {
          enabled: client.microsoft_calendar_enabled || false,
          userEmail: client.microsoft_calendar_user_email || undefined,
        },
      },

      // 🤖 Include active agent info for reference
      activeAgent: activeAgent || undefined,
    };

    return config;
  } catch (error) {
    console.error(
      `[getClientConfig] ❌ Error loading config for client ${clientId}:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
};

export const validateClientConfig = (config: ClientConfig): boolean => {
  const baseRequired = [
    config.id,
    config.apiKeys.metaAccessToken,
    config.apiKeys.metaPhoneNumberId,
    config.apiKeys.openaiApiKey,
    config.prompts.systemPrompt,
  ];

  const needsGroq = config.primaryProvider === "groq";
  const required = needsGroq
    ? [...baseRequired, config.apiKeys.groqApiKey]
    : baseRequired;

  return required.every((field) => field && field.length > 0);
};

/**
 * 🔄 Busca config do cliente com fallback para .env (compatibilidade retroativa)
 *
 * ⚠️ DEPRECATED: .env fallback não é mais suportado.
 */
export const getClientConfigWithFallback = async (
  clientId?: string | null,
): Promise<ClientConfig | null> => {
  if (clientId) {
    return await getClientConfig(clientId);
  }

  throw new Error(
    "Legacy .env config is no longer supported. " +
      "Please update your webhook URL to: " +
      `${process.env.WEBHOOK_BASE_URL}/api/webhook/{client_id} ` +
      "and configure all credentials in /dashboard/settings",
  );
};

// ============================================================================
// 🎛️ BOT CONFIGURATIONS (Modular Settings System)
// ============================================================================

/**
 * Interface para configuração do bot (tabela bot_configurations)
 */
export interface BotConfig {
  id: string;
  client_id: string | null;
  config_key: string;
  config_value: any;
  is_default: boolean;
  description?: string;
  category?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Cache em memória para configurações do bot
 * Renovado automaticamente a cada 5 minutos
 */
const botConfigCache = new Map<string, { value: any; expiresAt: number }>();
const BOT_CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

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
  configKey: string,
): Promise<any> => {
  const cacheKey = `${clientId}:${configKey}`;

  // Verificar cache
  const cached = botConfigCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  try {
    const supabase = await createServerClient();

    // Buscar configuração do cliente OU default
    // Ordem: cliente (is_default=false) tem prioridade sobre default (is_default=true)
    const { data, error } = await supabase
      .from("bot_configurations")
      .select("config_value, is_default")
      .eq("config_key", configKey)
      .or(`client_id.eq.${clientId},is_default.eq.true`)
      .order("is_default", { ascending: true }) // false (cliente) vem primeiro
      .limit(1)
      .single();

    if (error) {
      return null;
    }

    if (!data) {
      return null;
    }

    // Cachear resultado
    botConfigCache.set(cacheKey, {
      value: data.config_value,
      expiresAt: Date.now() + BOT_CONFIG_CACHE_TTL,
    });

    return data.config_value;
  } catch (error) {
    return null;
  }
};

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
  configKeys: string[],
): Promise<Map<string, any>> => {
  try {
    // 🔧 Use createServiceRoleClient() para bypass RLS
    // Bot configurations são configs do sistema, não dados de usuário
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("bot_configurations")
      .select("config_key, config_value, is_default")
      .in("config_key", configKeys)
      .or(`client_id.eq.${clientId},is_default.eq.true`);

    if (error || !data) {
      return new Map();
    }

    // Priorizar configs do cliente sobre defaults
    const configMap = new Map<string, any>();

    // Primeiro adicionar defaults
    (data as any[])
      .filter((c: any) => c.is_default)
      .forEach((c: any) => {
        configMap.set(c.config_key, c.config_value);
      });

    // Depois sobrescrever com configs do cliente (se existir)
    (data as any[])
      .filter((c: any) => !c.is_default)
      .forEach((c: any) => {
        configMap.set(c.config_key, c.config_value);

        // Cachear também
        const cacheKey = `${clientId}:${c.config_key}`;
        botConfigCache.set(cacheKey, {
          value: c.config_value,
          expiresAt: Date.now() + BOT_CONFIG_CACHE_TTL,
        });
      });

    return configMap;
  } catch (error) {
    return new Map();
  }
};

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
  metadata?: { description?: string; category?: string },
): Promise<void> => {
  try {
    const supabase = await createServerClient();

    const { error } = await supabase.from("bot_configurations").upsert(
      {
        client_id: clientId,
        config_key: configKey,
        config_value: configValue,
        description: metadata?.description,
        category: metadata?.category,
        is_default: false,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "client_id,config_key",
      },
    );

    if (error) {
      throw new Error(`Erro ao salvar config: ${error.message}`);
    }

    // Limpar cache
    const cacheKey = `${clientId}:${configKey}`;
    botConfigCache.delete(cacheKey);
  } catch (error) {
    throw error;
  }
};

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
  configKey: string,
): Promise<void> => {
  try {
    const supabase = await createServerClient();

    const { error } = await supabase
      .from("bot_configurations")
      .delete()
      .eq("client_id", clientId)
      .eq("config_key", configKey)
      .eq("is_default", false); // Só deleta custom, não default

    if (error) {
      throw new Error(`Erro ao resetar config: ${error.message}`);
    }

    // Limpar cache
    const cacheKey = `${clientId}:${configKey}`;
    botConfigCache.delete(cacheKey);
  } catch (error) {
    throw error;
  }
};

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
  category?: string,
): Promise<BotConfig[]> => {
  try {
    const supabase = await createServerClient();

    let query = supabase
      .from("bot_configurations")
      .select("*")
      .or(`client_id.eq.${clientId},is_default.eq.true`);

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query.order("config_key");

    if (error) {
      throw new Error(`Erro ao listar configs: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    // Deduplicar: se cliente tem custom, remover default
    const configMap = new Map<string, BotConfig>();

    // Primeiro adicionar defaults
    data
      .filter((c) => c.is_default)
      .forEach((c) => {
        configMap.set(c.config_key, c as BotConfig);
      });

    // Depois sobrescrever com customs
    data
      .filter((c) => !c.is_default && c.client_id === clientId)
      .forEach((c) => {
        configMap.set(c.config_key, c as BotConfig);
      });

    return Array.from(configMap.values());
  } catch (error) {
    return [];
  }
};

/**
 * Limpa todo o cache de configurações
 * Útil para forçar reload após mudanças massivas
 */
export const clearBotConfigCache = (): void => {
  botConfigCache.clear();
};

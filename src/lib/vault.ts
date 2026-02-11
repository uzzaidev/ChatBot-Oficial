/**
 * 🔐 Supabase Vault Helper Functions
 *
 * Funções para gerenciar secrets criptografados no Supabase Vault.
 * Todos os secrets são armazenados com criptografia AES-256.
 *
 * IMPORTANTE: Estas funções devem ser usadas apenas no SERVIDOR (não no browser).
 * Use createServerClient() para ter acesso ao Vault.
 */

import { createServerClient } from './supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Cria um secret no Vault e retorna o ID
 *
 * @param secretValue - Valor do secret (será criptografado)
 * @param secretName - Nome identificador do secret
 * @param description - Descrição opcional
 * @returns UUID do secret criado
 */
export const createSecret = async (
  secretValue: string,
  secretName: string,
  description?: string
): Promise<string> => {
  try {
    const supabase = await createServerClient()

    // @ts-ignore - RPC custom function
    const { data, error } = await supabase.rpc('create_client_secret', {
      secret_value: secretValue,
      secret_name: secretName,
      secret_description: description || null,
    })

    if (error) {
      throw new Error(`Failed to create secret: ${error.message}`)
    }

    if (!data) {
      throw new Error('No secret ID returned from Vault')
    }

    return data
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to create secret in Vault: ${errorMessage}`)
  }
}

/**
 * Lê um secret descriptografado do Vault
 *
 * @param secretId - UUID do secret
 * @returns Valor descriptografado do secret
 */
export const getSecret = async (secretId: string): Promise<string | null> => {
  try {
    if (!secretId) {
      return null
    }

    const supabase = await createServerClient()

    // @ts-ignore - RPC custom function
    const { data, error } = await supabase.rpc('get_client_secret', {
      secret_id: secretId,
    })

    if (error) {
      throw new Error(`Failed to read secret: ${error.message}`)
    }

    return data
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return null
  }
}

/**
 * Atualiza um secret existente no Vault
 *
 * @param secretId - UUID do secret
 * @param newValue - Novo valor (será criptografado)
 * @returns true se atualizado com sucesso
 */
export const updateSecret = async (
  secretId: string,
  newValue: string
): Promise<boolean> => {
  try {
    const supabase = await createServerClient()

    // @ts-ignore - RPC custom function
    const { data, error} = await supabase.rpc('update_client_secret', {
      secret_id: secretId,
      new_secret_value: newValue,
    })

    if (error) {
      throw new Error(`Failed to update secret: ${error.message}`)
    }

    return data === true
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to update secret in Vault: ${errorMessage}`)
  }
}

/**
 * Lê múltiplos secrets em paralelo (otimizado)
 *
 * @param secretIds - Array de UUIDs
 * @returns Array de valores descriptografados (mesma ordem)
 */
export const getSecretsParallel = async (
  secretIds: (string | null)[]
): Promise<(string | null)[]> => {
  try {
    const promises = secretIds.map((id) => (id ? getSecret(id) : Promise.resolve(null)))
    return await Promise.all(promises)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to read secrets in parallel: ${errorMessage}`)
  }
}

/**
 * Interface para secrets de um cliente
 */
export interface ClientSecrets {
  metaAccessToken: string
  metaVerifyToken: string
  metaAppSecret: string | null // SECURITY FIX (VULN-012): App Secret for HMAC validation
  openaiApiKey: string | null
  groqApiKey: string | null
}

/**
 * Busca todos os secrets de um cliente em paralelo
 *
 * @param supabase - Cliente Supabase (server-side)
 * @param client - Registro do cliente com _secret_id
 * @returns Objeto com todos os secrets descriptografados
 */
export const getClientSecrets = async (
  supabase: SupabaseClient,
  client: {
    meta_access_token_secret_id: string
    meta_verify_token_secret_id: string
    meta_app_secret_secret_id?: string | null
    openai_api_key_secret_id?: string | null
    groq_api_key_secret_id?: string | null
  }
): Promise<ClientSecrets> => {
  try {
    // Buscar todos os secrets em paralelo para performance
    const [metaAccessToken, metaVerifyToken, metaAppSecret, openaiApiKey, groqApiKey] = await getSecretsParallel([
      client.meta_access_token_secret_id,
      client.meta_verify_token_secret_id,
      client.meta_app_secret_secret_id || null,
      client.openai_api_key_secret_id || null,
      client.groq_api_key_secret_id || null,
    ])

    if (!metaAccessToken || !metaVerifyToken) {
      throw new Error('Missing required Meta secrets')
    }

    return {
      metaAccessToken,
      metaVerifyToken,
      metaAppSecret,
      openaiApiKey,
      groqApiKey,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to get client secrets: ${errorMessage}`)
  }
}

/**
 * Valida se um secret existe e é válido
 *
 * @param secretId - UUID do secret
 * @returns true se existe e é válido
 */
export const validateSecret = async (secretId: string): Promise<boolean> => {
  try {
    const value = await getSecret(secretId)
    return value !== null && value.length > 0
  } catch {
    return false
  }
}

/**
 * Gera um token seguro para verify_token
 *
 * @returns Token aleatório de 32 caracteres
 */
export const generateSecureToken = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

// =====================================================
// MULTI-TENANT CREDENTIAL ISOLATION
// =====================================================

/**
 * Interface para credenciais de API do cliente do Vault
 */
export interface ClientAPICredentials {
  openaiApiKey: string | null
  groqApiKey: string | null
}

/**
 * 🔐 Busca credenciais de API DIRETAMENTE do Vault do cliente
 *
 * ⚠️ CRITICAL: Esta função SEMPRE retorna as credenciais específicas do cliente,
 * NUNCA retorna chaves compartilhadas. Use esta função para:
 * - Fallback do AI Gateway
 * - Whisper (transcrição de áudio)
 * - GPT-4o Vision (análise de imagens)
 * - Embeddings (RAG)
 * - TTS (Text-to-Speech)
 *
 * NÃO use getClientConfig() para estes casos, pois ela pode retornar chaves
 * compartilhadas quando aiKeysMode !== "byok_allowed".
 *
 * @param clientId - UUID do cliente
 * @returns Credenciais do cliente do Vault (pode ter valores null se não configurado)
 * @throws Error se o cliente não existir
 */
export const getClientVaultCredentials = async (
  clientId: string
): Promise<ClientAPICredentials> => {
  try {
    const supabase = await createServerClient()

    // Buscar IDs dos secrets do cliente
    const { data: client, error } = await supabase
      .from('clients')
      .select('openai_api_key_secret_id, groq_api_key_secret_id')
      .eq('id', clientId)
      .single()

    if (error || !client) {
      throw new Error(`Client not found: ${clientId}`)
    }

    // Descriptografar secrets em paralelo (performance)
    const [openaiApiKey, groqApiKey] = await getSecretsParallel([
      client.openai_api_key_secret_id || null,
      client.groq_api_key_secret_id || null,
    ])

    // Vault credentials retrieved successfully

    return {
      openaiApiKey,
      groqApiKey,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to get client Vault credentials: ${errorMessage}`)
  }
}

/**
 * 🔐 Busca chave OpenAI DIRETAMENTE do Vault do cliente
 *
 * Versão simplificada para casos onde só precisa da chave OpenAI.
 *
 * @param clientId - UUID do cliente
 * @returns Chave OpenAI do cliente ou null se não configurada
 * @throws Error se o cliente não existir
 */
export const getClientOpenAIKey = async (
  clientId: string
): Promise<string | null> => {
  try {
    const supabase = await createServerClient()

    // Buscar ID do secret OpenAI do cliente
    const { data: client, error } = await supabase
      .from('clients')
      .select('openai_api_key_secret_id')
      .eq('id', clientId)
      .single()

    if (error || !client) {
      throw new Error(`Client not found: ${clientId}`)
    }

    if (!client.openai_api_key_secret_id) {
      console.warn('[Vault] Client has no OpenAI API key configured', { clientId })
      return null
    }

    // Descriptografar secret
    const openaiApiKey = await getSecret(client.openai_api_key_secret_id)

    // Vault OpenAI key retrieved successfully

    return openaiApiKey
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to get client OpenAI key from Vault: ${errorMessage}`)
  }
}

/**
 * 🔐 Busca chave OpenAI ADMIN DIRETAMENTE do Vault do cliente
 *
 * Esta chave tem permissões especiais (scope: api.usage.read) para billing/usage APIs.
 * Diferente da chave normal que é usada apenas para chat/embeddings.
 *
 * @param clientId - UUID do cliente
 * @returns Admin key OpenAI do cliente ou null se não configurada
 * @throws Error se o cliente não existir
 */
export const getClientOpenAIAdminKey = async (
  clientId: string
): Promise<string | null> => {
  try {
    const supabase = await createServerClient()

    // Buscar ID do secret OpenAI Admin do cliente
    const { data: client, error } = await supabase
      .from('clients')
      .select('openai_admin_key_secret_id')
      .eq('id', clientId)
      .single()

    if (error || !client) {
      throw new Error(`Client not found: ${clientId}`)
    }

    if (!client.openai_admin_key_secret_id) {
      console.warn('[Vault] Client has no OpenAI Admin key configured', { clientId })
      return null
    }

    // Descriptografar secret
    const openaiAdminKey = await getSecret(client.openai_admin_key_secret_id)

    return openaiAdminKey
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to get client OpenAI Admin key from Vault: ${errorMessage}`)
  }
}

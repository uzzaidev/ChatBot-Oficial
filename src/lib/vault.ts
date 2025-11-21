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
    const supabase = createServerClient()

    // @ts-ignore - RPC custom function
    const { data, error } = await supabase.rpc('create_client_secret', {
      secret_value: secretValue,
      secret_name: secretName,
      secret_description: description || null,
    })

    if (error) {
      console.error('[createSecret] Failed to create secret:', error)
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

    const supabase = createServerClient()

    // @ts-ignore - RPC custom function
    const { data, error } = await supabase.rpc('get_client_secret', {
      secret_id: secretId,
    })

    if (error) {
      console.error('[getSecret] Failed to read secret:', error)
      throw new Error(`Failed to read secret: ${error.message}`)
    }

    return data
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[getSecret] Error reading secret ${secretId}:`, errorMessage)
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
    const supabase = createServerClient()

    // @ts-ignore - RPC custom function
    const { data, error} = await supabase.rpc('update_client_secret', {
      secret_id: secretId,
      new_secret_value: newValue,
    })

    if (error) {
      console.error('[updateSecret] Failed to update secret:', error)
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

/**
 * VULN-006 FIX: Deduplication with PostgreSQL Fallback
 * Sprint 2 - Task 2.3
 * 
 * Sistema de deduplicação de mensagens webhook com fallback:
 * 1. Tenta usar Redis (rápido, distribuído)
 * 2. Se Redis falhar, usa PostgreSQL (confiável, sempre disponível)
 * 3. Graceful degradation - nunca quebra o fluxo
 */

import { createClient } from '@supabase/supabase-js'
import { setWithExpiry, get } from '@/lib/redis'

// ================================================================
// TYPES
// ================================================================

export interface DedupResult {
  alreadyProcessed: boolean
  source: 'redis' | 'postgresql' | 'none'
  error?: string
}

export interface DedupMarkResult {
  success: boolean
  source: 'redis' | 'postgresql' | 'both'
  error?: string
}

// ================================================================
// CONFIGURATION
// ================================================================

const DEDUP_EXPIRY_SECONDS = 86400 // 24 hours
const DEDUP_KEY_PREFIX = 'processed'

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Gera chave de deduplicação padrão
 */
function generateDedupKey(clientId: string, messageId: string): string {
  return `${DEDUP_KEY_PREFIX}:${clientId}:${messageId}`
}

/**
 * Cria client Supabase com service role (necessário para RLS bypass)
 */
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials not configured')
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// ================================================================
// POSTGRESQL OPERATIONS
// ================================================================

/**
 * Verifica se mensagem já foi processada usando PostgreSQL
 */
async function checkProcessedPostgres(
  clientId: string,
  messageId: string
): Promise<boolean> {
  try {
    const supabase = createSupabaseClient()
    
    const { data, error } = await supabase.rpc('is_message_processed', {
      p_client_id: clientId,
      p_message_id: messageId
    })
    
    if (error) {
      console.error('[DEDUP/PG] ❌ Erro ao verificar deduplicação:', error)
      return false // Se erro, assume não processado (safe default)
    }
    
    return data === true
  } catch (error) {
    console.error('[DEDUP/PG] ❌ Exceção ao verificar deduplicação:', error)
    return false
  }
}

/**
 * Marca mensagem como processada usando PostgreSQL
 */
async function markProcessedPostgres(
  clientId: string,
  messageId: string,
  dedupKey: string,
  payload?: Record<string, any>
): Promise<boolean> {
  try {
    const supabase = createSupabaseClient()
    
    const { error } = await supabase.rpc('mark_message_processed', {
      p_client_id: clientId,
      p_message_id: messageId,
      p_dedup_key: dedupKey,
      p_payload: payload ? JSON.stringify(payload) : null
    })
    
    if (error) {
      console.error('[DEDUP/PG] ❌ Erro ao marcar como processado:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('[DEDUP/PG] ❌ Exceção ao marcar como processado:', error)
    return false
  }
}

// ================================================================
// REDIS OPERATIONS (with fallback)
// ================================================================

/**
 * Verifica se mensagem já foi processada usando Redis
 */
async function checkProcessedRedis(dedupKey: string): Promise<boolean | null> {
  try {
    const result = await get(dedupKey)
    return result !== null
  } catch (error) {
    console.error('[DEDUP/REDIS] ❌ Erro ao verificar deduplicação:', error)
    return null // Indica falha (não true/false)
  }
}

/**
 * Marca mensagem como processada usando Redis
 */
async function markProcessedRedis(
  dedupKey: string,
  expirySeconds: number = DEDUP_EXPIRY_SECONDS
): Promise<boolean> {
  try {
    await setWithExpiry(dedupKey, new Date().toISOString(), expirySeconds)
    return true
  } catch (error) {
    console.error('[DEDUP/REDIS] ❌ Erro ao marcar como processado:', error)
    return false
  }
}

// ================================================================
// PUBLIC API - CHECK DEDUPLICATION
// ================================================================

/**
 * Verifica se mensagem já foi processada (com fallback)
 * 
 * Estratégia:
 * 1. Tenta Redis primeiro (mais rápido)
 * 2. Se Redis falhar, tenta PostgreSQL
 * 3. Se ambos falharem, retorna false (permite processamento)
 * 
 * @param clientId - UUID do cliente
 * @param messageId - ID da mensagem do WhatsApp
 * @returns DedupResult com status e fonte
 */
export async function checkDuplicateMessage(
  clientId: string,
  messageId: string
): Promise<DedupResult> {
  const dedupKey = generateDedupKey(clientId, messageId)
  
  // 1. Tentar Redis primeiro
  const redisResult = await checkProcessedRedis(dedupKey)
  
  if (redisResult === true) {
    return {
      alreadyProcessed: true,
      source: 'redis'
    }
  }
  
  if (redisResult === false) {
    // Redis funcionou e retornou false - não processado
    return {
      alreadyProcessed: false,
      source: 'redis'
    }
  }
  
  // 2. Redis falhou (null) - tentar PostgreSQL
  
  const pgResult = await checkProcessedPostgres(clientId, messageId)
  
  if (pgResult) {
    return {
      alreadyProcessed: true,
      source: 'postgresql'
    }
  }
  
  // 3. Não processado (ou ambos falharam)
  return {
    alreadyProcessed: false,
    source: redisResult === null ? 'postgresql' : 'redis'
  }
}

// ================================================================
// PUBLIC API - MARK AS PROCESSED
// ================================================================

/**
 * Marca mensagem como processada (em ambos Redis e PostgreSQL)
 * 
 * Estratégia:
 * 1. Marca em ambos Redis e PostgreSQL
 * 2. Se Redis falhar, continua com PostgreSQL
 * 3. Se PostgreSQL falhar, pelo menos Redis está marcado
 * 
 * @param clientId - UUID do cliente
 * @param messageId - ID da mensagem do WhatsApp
 * @param payload - (Opcional) Payload completo para debug
 * @returns DedupMarkResult com status e fonte
 */
export async function markMessageAsProcessed(
  clientId: string,
  messageId: string,
  payload?: Record<string, any>
): Promise<DedupMarkResult> {
  const dedupKey = generateDedupKey(clientId, messageId)
  
  // Tentar marcar em ambos simultaneamente
  const [redisSuccess, pgSuccess] = await Promise.all([
    markProcessedRedis(dedupKey),
    markProcessedPostgres(clientId, messageId, dedupKey, payload)
  ])
  
  if (redisSuccess && pgSuccess) {
    return {
      success: true,
      source: 'both'
    }
  }
  
  if (redisSuccess) {
    return {
      success: true,
      source: 'redis',
      error: 'PostgreSQL falhou'
    }
  }
  
  if (pgSuccess) {
    return {
      success: true,
      source: 'postgresql',
      error: 'Redis falhou'
    }
  }
  
  console.error(`[DEDUP] ❌ Falhou em marcar como processado (ambos): ${messageId}`)
  return {
    success: false,
    source: 'none' as any,
    error: 'Ambos Redis e PostgreSQL falharam'
  }
}

// ================================================================
// CLEANUP OPERATIONS
// ================================================================

/**
 * Executa cleanup de registros antigos no PostgreSQL
 * 
 * @param retentionHours - Horas de retenção (padrão: 24)
 * @returns Número de registros deletados
 */
export async function cleanupOldRecords(retentionHours: number = 24): Promise<number> {
  try {
    const supabase = createSupabaseClient()
    
    const { data, error } = await supabase.rpc('cleanup_old_webhook_dedup', {
      retention_hours: retentionHours
    })
    
    if (error) {
      console.error('[DEDUP/CLEANUP] ❌ Erro ao fazer cleanup:', error)
      return 0
    }
    
    const deletedCount = typeof data === 'number' ? data : 0
    
    return deletedCount
  } catch (error) {
    console.error('[DEDUP/CLEANUP] ❌ Exceção ao fazer cleanup:', error)
    return 0
  }
}

// ================================================================
// STATISTICS
// ================================================================

/**
 * Obtém estatísticas de deduplicação por cliente
 */
export async function getDedupStats(clientId?: string) {
  try {
    const supabase = createSupabaseClient()
    
    let query = supabase
      .from('webhook_dedup_stats')
      .select('*')
    
    if (clientId) {
      query = query.eq('client_id', clientId)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('[DEDUP/STATS] ❌ Erro ao buscar estatísticas:', error)
      return null
    }
    
    return data
  } catch (error) {
    console.error('[DEDUP/STATS] ❌ Exceção ao buscar estatísticas:', error)
    return null
  }
}

// ================================================================
// EXPORTS
// ================================================================

const dedupModule = {
  checkDuplicateMessage,
  markMessageAsProcessed,
  cleanupOldRecords,
  getDedupStats
}

export default dedupModule

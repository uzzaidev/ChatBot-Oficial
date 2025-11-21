/**
 * VULN-008 FIX: Audit Trail Helper
 * Sprint 2 - Task 2.1
 * 
 * Sistema de auditoria para registrar operações sensíveis
 * realizadas com service role (bypass de RLS)
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

// ================================================================
// TYPES
// ================================================================

export type AuditAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'

export type AuditResourceType = 
  | 'user' 
  | 'client' 
  | 'secret' 
  | 'config' 
  | 'bot_config'
  | 'flow_node'
  | 'invite'
  | 'pricing_config'
  | 'usage_log'

export type AuditStatus = 'success' | 'failure'

export interface AuditLogEntry {
  // User info
  userId?: string
  userEmail?: string
  userRole?: string
  
  // Client info (tenant)
  clientId?: string
  
  // Operation
  action: AuditAction
  resourceType: AuditResourceType
  resourceId?: string
  
  // Context
  endpoint?: string
  method?: string
  
  // Changes
  changes?: Record<string, any>
  metadata?: Record<string, any>
  
  // Status
  status: AuditStatus
  errorMessage?: string
  
  // Performance
  durationMs?: number
}

// ================================================================
// HELPERS
// ================================================================

/**
 * Extrai IP do request (considera X-Forwarded-For)
 */
function getIpFromRequest(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }
  
  return 'unknown'
}

/**
 * Extrai User Agent do request
 */
function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown'
}

/**
 * Enriquece metadata com informações do request
 */
function enrichMetadata(
  request: NextRequest | null,
  customMetadata?: Record<string, any>
): Record<string, any> {
  const metadata: Record<string, any> = {
    timestamp: new Date().toISOString(),
    ...customMetadata
  }
  
  if (request) {
    metadata.ip = getIpFromRequest(request)
    metadata.userAgent = getUserAgent(request)
    metadata.url = request.url
  }
  
  return metadata
}

/**
 * Sanitiza dados sensíveis antes de logar
 * Remove passwords, tokens, etc
 */
function sanitizeForAudit(data: any): any {
  if (!data || typeof data !== 'object') {
    return data
  }
  
  const sensitiveKeys = [
    'password', 
    'token', 
    'secret', 
    'api_key', 
    'access_token',
    'refresh_token',
    'session_token',
    'meta_access_token',
    'meta_verify_token',
    'openai_api_key',
    'groq_api_key'
  ]
  
  const sanitized = { ...data }
  
  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase()
    
    // Se é uma chave sensível, mascarar
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      if (typeof sanitized[key] === 'string' && sanitized[key].length > 4) {
        sanitized[key] = '***' + sanitized[key].slice(-4)
      } else {
        sanitized[key] = '***'
      }
    }
    // Se é um objeto nested, recursão
    else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeForAudit(sanitized[key])
    }
  }
  
  return sanitized
}

// ================================================================
// MAIN FUNCTION
// ================================================================

/**
 * Registra um evento de auditoria no banco de dados
 * 
 * @param entry - Dados do evento de auditoria
 * @param request - (Opcional) NextRequest para extrair contexto adicional
 * @returns Promise<void>
 * 
 * @example
 * await logAuditEvent({
 *   userId: user.id,
 *   userEmail: user.email,
 *   userRole: 'admin',
 *   clientId: 'client-uuid',
 *   action: 'UPDATE',
 *   resourceType: 'secret',
 *   resourceId: 'openai_api_key',
 *   endpoint: '/api/vault/secrets',
 *   method: 'PUT',
 *   changes: { before: '***old', after: '***new' },
 *   status: 'success'
 * }, request)
 */
export async function logAuditEvent(
  entry: AuditLogEntry,
  request: NextRequest | null = null
): Promise<void> {
  try {
    // Validação básica
    if (!entry.action || !entry.resourceType || !entry.status) {
      console.error('[AUDIT] ❌ Entry inválida - faltam campos obrigatórios:', entry)
      return
    }
    
    // Service role client (necessário para bypass de RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[AUDIT] ❌ Supabase credentials não configuradas')
      return
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    // Sanitizar dados sensíveis
    const sanitizedChanges = entry.changes ? sanitizeForAudit(entry.changes) : null
    
    // Enriquecer metadata com informações do request
    const enrichedMetadata = enrichMetadata(request, entry.metadata)
    
    // Inserir log
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: entry.userId,
        user_email: entry.userEmail,
        user_role: entry.userRole,
        client_id: entry.clientId,
        action: entry.action,
        resource_type: entry.resourceType,
        resource_id: entry.resourceId,
        endpoint: entry.endpoint,
        method: entry.method,
        changes: sanitizedChanges,
        metadata: enrichedMetadata,
        status: entry.status,
        error_message: entry.errorMessage,
        duration_ms: entry.durationMs
      })
    
    if (error) {
      console.error('[AUDIT] ❌ Erro ao inserir log:', error)
      // Não lançar erro - não queremos quebrar operação principal por falha de audit
    } else {
    }
  } catch (error) {
    console.error('[AUDIT] ❌ Exceção ao logar audit event:', error)
    // Graceful degradation - não quebrar operação principal
  }
}

// ================================================================
// CONVENIENCE WRAPPERS
// ================================================================

/**
 * Registra operação de CREATE
 */
export async function logCreate(
  resourceType: AuditResourceType,
  resourceId: string,
  payload: Record<string, any>,
  context: {
    userId?: string
    userEmail?: string
    userRole?: string
    clientId?: string
    endpoint?: string
    method?: string
    request?: NextRequest
  }
): Promise<void> {
  await logAuditEvent({
    userId: context.userId,
    userEmail: context.userEmail,
    userRole: context.userRole,
    clientId: context.clientId,
    action: 'CREATE',
    resourceType,
    resourceId,
    endpoint: context.endpoint,
    method: context.method || 'POST',
    changes: { payload },
    status: 'success'
  }, context.request || null)
}

/**
 * Registra operação de UPDATE
 */
export async function logUpdate(
  resourceType: AuditResourceType,
  resourceId: string,
  before: Record<string, any>,
  after: Record<string, any>,
  context: {
    userId?: string
    userEmail?: string
    userRole?: string
    clientId?: string
    endpoint?: string
    method?: string
    request?: NextRequest
  }
): Promise<void> {
  await logAuditEvent({
    userId: context.userId,
    userEmail: context.userEmail,
    userRole: context.userRole,
    clientId: context.clientId,
    action: 'UPDATE',
    resourceType,
    resourceId,
    endpoint: context.endpoint,
    method: context.method || 'PUT',
    changes: { before, after },
    status: 'success'
  }, context.request || null)
}

/**
 * Registra operação de DELETE
 */
export async function logDelete(
  resourceType: AuditResourceType,
  resourceId: string,
  deletedData: Record<string, any>,
  context: {
    userId?: string
    userEmail?: string
    userRole?: string
    clientId?: string
    endpoint?: string
    method?: string
    request?: NextRequest
  }
): Promise<void> {
  await logAuditEvent({
    userId: context.userId,
    userEmail: context.userEmail,
    userRole: context.userRole,
    clientId: context.clientId,
    action: 'DELETE',
    resourceType,
    resourceId,
    endpoint: context.endpoint,
    method: context.method || 'DELETE',
    changes: { deleted: deletedData },
    status: 'success'
  }, context.request || null)
}

/**
 * Registra falha de operação
 */
export async function logFailure(
  action: AuditAction,
  resourceType: AuditResourceType,
  errorMessage: string,
  context: {
    userId?: string
    userEmail?: string
    userRole?: string
    clientId?: string
    resourceId?: string
    endpoint?: string
    method?: string
    request?: NextRequest
  }
): Promise<void> {
  await logAuditEvent({
    userId: context.userId,
    userEmail: context.userEmail,
    userRole: context.userRole,
    clientId: context.clientId,
    action,
    resourceType,
    resourceId: context.resourceId,
    endpoint: context.endpoint,
    method: context.method,
    status: 'failure',
    errorMessage
  }, context.request || null)
}

// ================================================================
// PERFORMANCE TRACKING WRAPPER
// ================================================================

/**
 * Wrapper para medir duração de operação e logar automaticamente
 * 
 * @example
 * await withAuditTracking(
 *   async () => {
 *     // Operação a ser auditada
 *     return await createUser(...)
 *   },
 *   {
 *     action: 'CREATE',
 *     resourceType: 'user',
 *     resourceId: 'new-user-id',
 *     userId: adminUser.id,
 *     userEmail: adminUser.email
 *   },
 *   request
 * )
 */
export async function withAuditTracking<T>(
  operation: () => Promise<T>,
  auditContext: Omit<AuditLogEntry, 'status' | 'durationMs'>,
  request: NextRequest | null = null
): Promise<T> {
  const startTime = Date.now()
  
  try {
    const result = await operation()
    const duration = Date.now() - startTime
    
    await logAuditEvent({
      ...auditContext,
      status: 'success',
      durationMs: duration
    }, request)
    
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    
    await logAuditEvent({
      ...auditContext,
      status: 'failure',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      durationMs: duration
    }, request)
    
    throw error // Re-throw para não quebrar fluxo
  }
}

// ================================================================
// EXPORTS
// ================================================================

const auditModule = {
  logAuditEvent,
  logCreate,
  logUpdate,
  logDelete,
  logFailure,
  withAuditTracking
}

export default auditModule

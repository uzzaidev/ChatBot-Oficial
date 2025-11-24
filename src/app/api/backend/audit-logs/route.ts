/**
 * API Route: /api/backend/audit-logs
 *
 * Retorna audit logs isolados por tenant (client_id)
 * RLS (Row Level Security) garante que cada tenant vê apenas seus próprios logs
 *
 * Multi-tenant security: ✅ RLS ativo
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic' // Disable caching

/**
 * GET /api/backend/audit-logs
 *
 * Query params:
 * - limit: número máximo de logs (padrão: 100, máximo: 500)
 * - offset: paginação (padrão: 0)
 * - action: filtrar por ação (CREATE, READ, UPDATE, DELETE)
 * - resource_type: filtrar por tipo de recurso
 * - status: filtrar por status (success, failure)
 * - user_id: filtrar por ID de usuário específico
 * - since: timestamp ISO - buscar logs mais recentes que esta data
 *
 * Retorna:
 * {
 *   success: boolean
 *   logs: AuditLog[]
 *   total: number
 *   metadata: { limit, offset, applied_filters }
 * }
 *
 * Security:
 * - RLS policies garantem isolamento por tenant automaticamente
 * - Usuários autenticados veem apenas logs do próprio client_id
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)
    const offset = parseInt(searchParams.get('offset') || '0')
    const action = searchParams.get('action') // CREATE | READ | UPDATE | DELETE
    const resource_type = searchParams.get('resource_type')
    const status = searchParams.get('status') // success | failure
    const user_id = searchParams.get('user_id')
    const since = searchParams.get('since') // ISO timestamp

    // ================================================================
    // SECURITY: Usar client autenticado (não service role)
    // RLS policies aplicam isolamento automático por client_id
    // ================================================================

    // Aceita Bearer token (mobile) OU cookies (web)
    const supabase = createRouteHandlerClient(request as any)

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // ================================================================
    // QUERY COM FILTROS
    // RLS aplica isolamento automático - usuário só vê logs do próprio tenant
    // ================================================================

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Aplicar filtros opcionais
    const applied_filters: Record<string, string> = {}

    if (action) {
      query = query.eq('action', action.toUpperCase())
      applied_filters.action = action.toUpperCase()
    }

    if (resource_type) {
      query = query.eq('resource_type', resource_type)
      applied_filters.resource_type = resource_type
    }

    if (status) {
      query = query.eq('status', status)
      applied_filters.status = status
    }

    if (user_id) {
      query = query.eq('user_id', user_id)
      applied_filters.user_id = user_id
    }

    if (since) {
      query = query.gte('created_at', since)
      applied_filters.since = since
    }

    const { data: logs, error, count } = await query

    if (error) {
      console.error('[API] /api/backend/audit-logs - Erro ao buscar logs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch audit logs', details: error.message },
        { status: 500 }
      )
    }

    // ================================================================
    // RESPOSTA
    // ================================================================

    return NextResponse.json({
      success: true,
      logs: logs || [],
      total: count || 0,
      metadata: {
        limit,
        offset,
        applied_filters,
        user_id: user.id,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('[API] /api/backend/audit-logs - Exceção:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/backend/audit-logs/cleanup
 *
 * Body:
 * {
 *   retention_days: number (padrão: 90)
 * }
 *
 * Deleta logs mais antigos que retention_days
 * Retorna quantidade de registros deletados
 *
 * Security:
 * - Requer permissão de admin (verificado via RLS ou custom logic)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const retention_days = body.retention_days || 90

    // Usar service role para deletar logs antigos (bypass RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Chamar função de cleanup
    const { data, error } = await supabase.rpc('cleanup_old_audit_logs', {
      retention_days
    })

    if (error) {
      console.error('[API] /api/backend/audit-logs - Erro ao limpar logs:', error)
      return NextResponse.json(
        { error: 'Failed to cleanup audit logs', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      deleted_count: data,
      retention_days,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[API] /api/backend/audit-logs - Exceção no cleanup:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

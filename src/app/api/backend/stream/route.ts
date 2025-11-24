/**
 * API Route: /api/backend/stream
 *
 * Retorna execution logs isolados por tenant (client_id)
 * RLS (Row Level Security) garante que cada tenant vê apenas seus próprios logs
 *
 * Multi-tenant security: ✅ RLS ativo
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/backend/stream
 * Retorna logs de execução em formato de stream para o dashboard backend
 *
 * Query params:
 * - execution_id?: filtrar por execução específica
 * - limit?: número de logs (padrão: 100, máximo: 500)
 * - since?: timestamp ISO para logs após essa data
 *
 * Security:
 * - RLS policies garantem isolamento por tenant automaticamente
 * - Usuários autenticados veem apenas execution logs do próprio client_id
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const executionId = searchParams.get('execution_id')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)
    const since = searchParams.get('since')

    // ================================================================
    // SECURITY: Usar client autenticado (não service role)
    // RLS policies aplicam isolamento automático por client_id
    // Aceita Bearer token (mobile) OU cookies (web)
    // ================================================================

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
      .from('execution_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (executionId) {
      query = query.eq('execution_id', executionId)
    }

    if (since) {
      query = query.gt('timestamp', since)
    }

    const { data, error } = await query

    if (error) {
      console.error('[BACKEND STREAM API] Error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch execution logs',
          details: error.message
        },
        { status: 500 }
      )
    }

    // ================================================================
    // AGRUPA LOGS POR EXECUTION_ID
    // ================================================================

    // Agrupa logs por execution_id para facilitar visualização paralela
    const groupedLogs = new Map<string, any[]>()

    data?.forEach((log: any) => {
      if (!groupedLogs.has(log.execution_id)) {
        groupedLogs.set(log.execution_id, [])
      }
      groupedLogs.get(log.execution_id)!.push(log)
    })

    // Converte para array de execuções
    const executions = Array.from(groupedLogs.entries()).map(([execution_id, logs]) => {
      // Ordena logs por timestamp dentro de cada execução
      logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

      const firstLog = logs[0]
      const lastLog = logs[logs.length - 1]
      const hasError = logs.some(l => l.status === 'error')

      // Procura pelo node _END para determinar status final
      const endLog = logs.find(l => l.node_name === '_END')

      // Determina o status da execução:
      // 1. Se tem erro, é 'error'
      // 2. Se tem _END node, usa o status dele
      // 3. Se todos os nodes (exceto _START) são success, é 'success'
      // 4. Caso contrário, é 'running'
      let finalStatus: 'running' | 'success' | 'error' = 'running'

      if (hasError) {
        finalStatus = 'error'
      } else if (endLog) {
        finalStatus = endLog.status
      } else {
        // Verifica se todos os nodes (exceto _START e _END) completaram com sucesso
        const nonSystemLogs = logs.filter(l => l.node_name !== '_START' && l.node_name !== '_END')
        const allSuccess = nonSystemLogs.length > 0 && nonSystemLogs.every(l => l.status === 'success')
        if (allSuccess) {
          finalStatus = 'success'
        }
      }

      // Detecta tipo de mensagem (status update vs mensagem normal)
      const isStatusUpdate = firstLog.metadata?.message_type === 'status_update' ||
                            firstLog.input_data?.entry?.[0]?.changes?.[0]?.value?.statuses

      return {
        execution_id,
        logs,
        started_at: firstLog.timestamp,
        last_update: lastLog.timestamp,
        status: finalStatus,
        metadata: {
          ...firstLog.metadata,
          is_status_update: isStatusUpdate,
        },
        node_count: logs.length,
      }
    })

    // Ordena por data de início (mais recentes primeiro)
    executions.sort((a, b) =>
      new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    )

    return NextResponse.json({
      success: true,
      executions,
      total: executions.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[BACKEND STREAM API] Exception:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error.message
      },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/debug/executions
 * Lista execuções isoladas por tenant (client_id)
 * Query params:
 * - execution_id?: filtrar por execução específica
 * - limit?: número de execuções (padrão: 50)
 *
 * Multi-tenant security: ✅ RLS ativo
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const executionId = searchParams.get('execution_id')
    const limit = parseInt(searchParams.get('limit') || '50')

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

    if (executionId) {
      // Retorna logs de uma execução específica
      const { data, error } = await supabase
        .from('execution_logs')
        .select('*')
        .eq('execution_id', executionId)
        .order('timestamp', { ascending: true })

      if (error) throw error

      return NextResponse.json({ execution_id: executionId, logs: data || [] })
    }

    // Retorna lista de execuções recentes (agrupadas por execution_id)
    const { data, error } = await supabase
      .from('execution_logs')
      .select('execution_id, timestamp, node_name, status, metadata')
      .order('timestamp', { ascending: false })
      .limit(limit * 5) // Busca mais para agrupar

    if (error) throw error

    // Agrupa por execution_id e pega a primeira (mais recente) de cada
    const executionsMap = new Map()
    data?.forEach((log: any) => {
      if (!executionsMap.has(log.execution_id)) {
        executionsMap.set(log.execution_id, {
          execution_id: log.execution_id,
          started_at: log.timestamp,
          first_node: log.node_name,
          status: log.status,
          metadata: log.metadata,
        })
      }
    })

    const executions = Array.from(executionsMap.values()).slice(0, limit)

    return NextResponse.json({ executions })
  } catch (error: any) {
    console.error('[DEBUG API] Error fetching executions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch executions', details: error.message },
      { status: 500 }
    )
  }
}

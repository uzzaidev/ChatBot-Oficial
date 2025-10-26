import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET - Lista últimos 50 logs de erro do sistema
 */
export async function GET() {
  try {
    const supabase = createServerClient()

    // Busca logs de execução com erro
    const { data: errorLogs, error } = await supabase
      .from('execution_logs')
      .select('*')
      .eq('status', 'error')
      .order('timestamp', { ascending: false })
      .limit(50)

    if (error) {
      throw error
    }

    // Busca últimas 10 execuções (incluindo as que deram erro)
    const { data: recentExecutions, error: execError } = await supabase
      .from('execution_logs')
      .select('execution_id, node_name, status, timestamp, error')
      .order('timestamp', { ascending: false })
      .limit(20)

    if (execError) {
      throw execError
    }

    return NextResponse.json({
      success: true,
      errorLogs: errorLogs || [],
      recentExecutions: recentExecutions || [],
      summary: {
        totalErrors: errorLogs?.length || 0,
        lastError: errorLogs?.[0] || null,
      },
    })
  } catch (error) {
    console.error('[DEBUG LOGS] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * GET - Lista últimos 50 logs de erro do sistema (isolados por tenant)
 *
 * Multi-tenant security: ✅ RLS ativo
 */
export async function GET(request: NextRequest) {
  try {
    // ================================================================
    // SECURITY: Usar client autenticado (não service role)
    // RLS policies aplicam isolamento automático por client_id
    // ================================================================

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    // Criar cliente autenticado (RLS ativo)
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Busca logs de execução com erro (RLS aplica filtro de client_id automaticamente)
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

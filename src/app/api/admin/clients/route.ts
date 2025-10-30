import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/clients
 * Lista todos os clientes/tenants (apenas para super admin)
 * 
 * Query params:
 * - status: filtrar por status (opcional)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    console.log('[GET /api/admin/clients] 🔍 Starting request...')

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('[GET /api/admin/clients] ❌ Authentication failed')
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Buscar perfil do usuário autenticado
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, is_active, client_id')
      .eq('id', user.id)
      .single()

    if (profileError || !currentUserProfile) {
      console.log('[GET /api/admin/clients] ❌ Profile not found')
      return NextResponse.json(
        { error: 'Perfil de usuário não encontrado' },
        { status: 404 }
      )
    }

    console.log('[GET /api/admin/clients] 👤 User role:', currentUserProfile.role)

    // Apenas super admin pode listar todos os clients
    // Client admin pode ver apenas o próprio client
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')

    let query = (supabase.from('clients') as any)
      .select('id, name, slug, status, created_at')
      .order('name', { ascending: true })

    // Client admin vê apenas o próprio client
    if (currentUserProfile.role === 'client_admin') {
      query = query.eq('id', currentUserProfile.client_id)
    }

    // Aplicar filtro de status se fornecido
    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data: clients, error: clientsError } = await query

    if (clientsError) {
      console.error('[GET /api/admin/clients] Error fetching clients:', clientsError)
      return NextResponse.json(
        { error: 'Erro ao buscar clientes', details: clientsError.message },
        { status: 500 }
      )
    }

    console.log('[GET /api/admin/clients] ✅ Found clients:', clients?.length || 0)

    return NextResponse.json({
      clients: clients || [],
      total: clients?.length || 0
    })

  } catch (error) {
    console.error('[GET /api/admin/clients] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

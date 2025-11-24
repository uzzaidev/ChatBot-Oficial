import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/user/profile
 *
 * Retorna dados do perfil do usuário autenticado
 *
 * Returns:
 * {
 *   id: string,
 *   email: string,
 *   full_name: string,
 *   client_id: string,
 *   phone: string (from client),
 *   role: string
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request as any)

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Buscar user_profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, client_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('[profile] Erro ao buscar user_profile:', profileError)
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
    }

    // Buscar dados do client (para obter phone)
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('meta_display_phone')
      .eq('id', profile.client_id)
      .single()

    if (clientError) {
      console.error('[profile] Erro ao buscar client:', clientError)
    }

    return NextResponse.json({
      id: profile.id,
      email: profile.email || user.email || '',
      full_name: profile.full_name || user.user_metadata?.full_name || '',
      client_id: profile.client_id,
      phone: client?.meta_display_phone || '',
    })
  } catch (error) {
    console.error('[profile] Erro:', error)
    return NextResponse.json({ error: 'Erro ao buscar perfil' }, { status: 500 })
  }
}

/**
 * PATCH /api/user/profile
 *
 * Atualiza nome do usuário
 *
 * Body:
 * {
 *   full_name: string
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { full_name } = body

    if (!full_name || full_name.trim().length === 0) {
      return NextResponse.json({ error: 'Nome inválido' }, { status: 400 })
    }

    const supabase = createRouteHandlerClient(request as any)

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Atualizar user_profile
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        full_name: full_name.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('[profile] Erro ao atualizar:', updateError)
      return NextResponse.json(
        { error: 'Erro ao atualizar perfil' },
        { status: 500 }
      )
    }

    // Atualizar também user_metadata no auth
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        full_name: full_name.trim(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Nome atualizado com sucesso',
    })
  } catch (error) {
    console.error('[profile] Erro:', error)
    return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 })
  }
}

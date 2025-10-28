import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/verify-profile
 *
 * Verifica se usuário autenticado tem profile válido com client_id
 *
 * Chamado após login para garantir que:
 * 1. Usuário está autenticado
 * 2. Tem registro em user_profiles
 * 3. Tem client_id válido linkado
 *
 * @returns { success: boolean, client_id?: string, error?: string }
 */
export async function GET() {
  try {
    const supabase = createRouteHandlerClient()

    // 1. Verificar se usuário está autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      )
    }

    console.log('[verify-profile] Verificando profile para:', user.email)

    // 2. Buscar user_profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('client_id, email, full_name')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('[verify-profile] Profile não encontrado:', profileError)
      return NextResponse.json(
        {
          success: false,
          error: 'Perfil não configurado. Contate o administrador.',
          details: profileError?.message,
        },
        { status: 404 }
      )
    }

    // 3. Verificar se client_id é válido
    if (!profile.client_id) {
      return NextResponse.json(
        { success: false, error: 'Client ID não configurado no perfil' },
        { status: 400 }
      )
    }

    // 4. Verificar se client existe e está ativo
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, status')
      .eq('id', profile.client_id)
      .single()

    if (clientError || !client) {
      console.error('[verify-profile] Client não encontrado:', clientError)
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    if (client.status !== 'active') {
      return NextResponse.json(
        {
          success: false,
          error: `Conta ${client.status}. Contate o administrador.`,
        },
        { status: 403 }
      )
    }

    console.log('[verify-profile] ✅ Profile válido:', {
      user: user.email,
      client_id: profile.client_id,
      client_name: client.name,
    })

    return NextResponse.json({
      success: true,
      client_id: profile.client_id,
      client_name: client.name,
      user_email: user.email,
      user_name: profile.full_name,
    })
  } catch (error) {
    console.error('[verify-profile] Erro:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao verificar perfil' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/user/password
 *
 * Atualiza senha do usuário
 *
 * Body:
 * {
 *   current_password: string,
 *   new_password: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { current_password, new_password } = body

    if (!current_password || !new_password) {
      return NextResponse.json(
        { error: 'Senhas não fornecidas' },
        { status: 400 }
      )
    }

    if (new_password.length < 8) {
      return NextResponse.json(
        { error: 'Nova senha deve ter pelo menos 8 caracteres' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient()

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Validar senha atual
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: user.email!,
        password: current_password,
      })

    if (signInError || !signInData.user) {
      return NextResponse.json(
        { error: 'Senha atual incorreta' },
        { status: 403 }
      )
    }

    // Atualizar senha
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        password: new_password,
      }
    )

    if (updateError) {
      console.error('[password] Erro ao atualizar senha:', updateError)
      return NextResponse.json(
        { error: 'Erro ao atualizar senha' },
        { status: 500 }
      )
    }


    return NextResponse.json({
      success: true,
      message: 'Senha atualizada com sucesso',
    })
  } catch (error) {
    console.error('[password] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar senha' },
      { status: 500 }
    )
  }
}

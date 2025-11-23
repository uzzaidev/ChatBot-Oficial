import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/user/revalidate-password
 *
 * Valida senha atual do usuário
 *
 * Usado antes de permitir edição de variáveis sensíveis
 *
 * Body:
 * {
 *   password: string
 * }
 *
 * Returns:
 * {
 *   valid: boolean
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json({ error: 'Senha não fornecida' }, { status: 400 })
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

    // Tentar fazer login com email e senha para validar
    // NOTA: Isso não invalida a sessão atual, apenas verifica credenciais
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: user.email!,
        password,
      })

    if (signInError || !signInData.user) {
      return NextResponse.json({
        valid: false,
        error: 'Senha incorreta',
      })
    }

    return NextResponse.json({
      valid: true,
      message: 'Senha validada com sucesso',
    })
  } catch (error) {
    console.error('[revalidate-password] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao validar senha' },
      { status: 500 }
    )
  }
}

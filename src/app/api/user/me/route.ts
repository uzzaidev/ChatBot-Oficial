import { NextRequest, NextResponse } from 'next/server'
import {
  createRouteHandlerClient,
  createServiceClient,
} from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/user/me
 *
 * Exclusão de conta in-app (Apple Guideline 5.1.1(v) exige que o usuário
 * consiga excluir a própria conta dentro do app, sem precisar enviar email).
 *
 * Apaga apenas o login/perfil do usuário autenticado (user_profiles + auth.users).
 * Não apaga o tenant (`clients`) nem os dados do chatbot — outros membros da
 * equipe do mesmo client_id continuam com acesso normal.
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request as any)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const serviceClient = createServiceClient()

    await serviceClient.from('user_profiles').delete().eq('id', user.id)

    const { error: deleteError } =
      await serviceClient.auth.admin.deleteUser(user.id)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Erro ao excluir conta' },
        { status: 500 },
      )
    }

    return NextResponse.json({ deleted: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao excluir conta' },
      { status: 500 },
    )
  }
}

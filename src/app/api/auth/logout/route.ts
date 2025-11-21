import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/logout
 *
 * Faz logout do usuário (remove session cookies)
 *
 * @returns { success: boolean }
 */
export async function POST() {
  try {
    const supabase = createRouteHandlerClient()

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('[logout] Erro:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }


    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[logout] Erro inesperado:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao fazer logout' },
      { status: 500 }
    )
  }
}

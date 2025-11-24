import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { UserRole, InviteStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface CurrentUserProfile {
  client_id: string
  role: UserRole
  is_active: boolean
}

interface InviteUpdate {
  status: InviteStatus
}

/**
 * PATCH /api/admin/invites/[id]
 * Atualiza status de um convite (ex: revogar)
 * 
 * Body:
 * {
 *   status: 'revoked'
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const inviteId = params.id

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Buscar perfil do usuário autenticado
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('client_id, role, is_active')
      .eq('id', user.id)
      .single()

    if (profileError || !currentUserProfile) {
      return NextResponse.json(
        { error: 'Perfil de usuário não encontrado' },
        { status: 404 }
      )
    }

    const profile = currentUserProfile as CurrentUserProfile

    // Verificar se é admin
    if (!['admin', 'client_admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Buscar convite
    const { data: invite, error: inviteError } = await supabase
      .from('user_invites')
      .select('*')
      .eq('id', inviteId)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: 'Convite não encontrado' },
        { status: 404 }
      )
    }

    // Client admins só podem revogar convites do próprio client
    if (profile.role === 'client_admin' && (invite as any).client_id !== profile.client_id) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Parse body
    const body = await request.json()

    if (!body.status || !['revoked', 'pending'].includes(body.status)) {
      return NextResponse.json(
        { error: 'Status inválido. Use "revoked" ou "pending"' },
        { status: 400 }
      )
    }

    // Atualizar status
    const { data: updatedInvite, error: updateError } = await (supabase
      .from('user_invites') as any)
      .update({ status: body.status })
      .eq('id', inviteId)
      .select()
      .single()

    if (updateError) {
      console.error('[PATCH /api/admin/invites/[id]] Error updating invite:', updateError)
      return NextResponse.json(
        { error: 'Erro ao atualizar convite', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      invite: updatedInvite,
      message: 'Convite atualizado com sucesso'
    })

  } catch (error) {
    console.error('[PATCH /api/admin/invites/[id]] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/invites/[id]
 * Remove um convite permanentemente
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const inviteId = params.id

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Buscar perfil do usuário autenticado
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('client_id, role, is_active')
      .eq('id', user.id)
      .single()

    if (profileError || !currentUserProfile) {
      return NextResponse.json(
        { error: 'Perfil de usuário não encontrado' },
        { status: 404 }
      )
    }

    const profile = currentUserProfile as CurrentUserProfile

    // Verificar se é admin
    if (!['admin', 'client_admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Buscar convite
    const { data: invite, error: inviteError } = await supabase
      .from('user_invites')
      .select('*')
      .eq('id', inviteId)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: 'Convite não encontrado' },
        { status: 404 }
      )
    }

    // Client admins só podem deletar convites do próprio client
    if (profile.role === 'client_admin' && (invite as any).client_id !== profile.client_id) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Deletar convite
    const { error: deleteError } = await supabase
      .from('user_invites')
      .delete()
      .eq('id', inviteId)

    if (deleteError) {
      console.error('[DELETE /api/admin/invites/[id]] Error deleting invite:', deleteError)
      return NextResponse.json(
        { error: 'Erro ao deletar convite', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Convite removido com sucesso'
    })

  } catch (error) {
    console.error('[DELETE /api/admin/invites/[id]] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

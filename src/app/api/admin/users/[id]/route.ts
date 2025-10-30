import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase'
import type { UpdateUserRequest, UserProfile, UserRole } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface CurrentUserProfile {
  client_id: string
  role: UserRole
  is_active: boolean
}

/**
 * GET /api/admin/users/[id]
 * Busca detalhes de um usuário específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const userId = params.id

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

    // Buscar usuário solicitado
    const { data: targetUser, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    const target = targetUser as UserProfile

    // Client admins só podem ver usuários do mesmo client_id
    if (profile.role === 'client_admin' && target.client_id !== profile.client_id) {
      return NextResponse.json(
        { error: 'Acesso negado. Você só pode visualizar usuários do seu client.' },
        { status: 403 }
      )
    }

    // Buscar nome do client
    const { data: client } = await supabase
      .from('clients')
      .select('id, name')
      .eq('id', target.client_id)
      .single()

    const clientName = client ? (client as any).name : null

    return NextResponse.json({
      user: {
        ...target,
        client_name: clientName
      }
    })

  } catch (error) {
    console.error('[GET /api/admin/users/[id]] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/users/[id]
 * Atualiza um usuário existente
 * 
 * Body:
 * {
 *   full_name?: string
 *   role?: 'client_admin' | 'user'
 *   phone?: string
 *   permissions?: Record<string, any>
 *   is_active?: boolean
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const userId = params.id

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

    // Não pode editar a si mesmo através dessa rota (use profile próprio)
    if (userId === user.id) {
      return NextResponse.json(
        { error: 'Use a rota de perfil próprio para editar seus dados' },
        { status: 400 }
      )
    }

    // Buscar usuário a ser editado
    const { data: targetUser, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    const target = targetUser as UserProfile

    // Client admins só podem editar usuários do mesmo client_id
    if (profile.role === 'client_admin' && target.client_id !== profile.client_id) {
      return NextResponse.json(
        { error: 'Acesso negado. Você só pode editar usuários do seu client.' },
        { status: 403 }
      )
    }

    // Parse request body
    const body: UpdateUserRequest = await request.json()

    // Validações
    if (body.role && !['client_admin', 'user'].includes(body.role)) {
      return NextResponse.json(
        { error: 'Role deve ser "client_admin" ou "user"' },
        { status: 400 }
      )
    }

    // Client admins não podem promover para admin ou editar admins
    if (profile.role === 'client_admin') {
      if (target.role === 'admin') {
        return NextResponse.json(
          { error: 'Você não pode editar super admins' },
          { status: 403 }
        )
      }
    }

    // Construir objeto de update apenas com campos fornecidos
    const updateData: any = {}
    if (body.full_name !== undefined) updateData.full_name = body.full_name
    if (body.role !== undefined) updateData.role = body.role
    if (body.phone !== undefined) updateData.phone = body.phone
    if (body.permissions !== undefined) updateData.permissions = body.permissions
    if (body.is_active !== undefined) updateData.is_active = body.is_active

    // Atualizar usuário
    const { data: updatedUser, error: updateError } = await (supabase
      .from('user_profiles') as any)
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('[PATCH /api/admin/users/[id]] Error updating user:', updateError)
      return NextResponse.json(
        { error: 'Erro ao atualizar usuário', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      user: updatedUser as UserProfile,
      message: 'Usuário atualizado com sucesso'
    })

  } catch (error) {
    console.error('[PATCH /api/admin/users/[id]] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Desativa um usuário (soft delete)
 * 
 * Apenas super admins podem fazer hard delete (remover do auth)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const supabaseAdmin = createServiceRoleClient()
    const userId = params.id

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

    // Não pode deletar a si mesmo
    if (userId === user.id) {
      return NextResponse.json(
        { error: 'Você não pode desativar sua própria conta' },
        { status: 400 }
      )
    }

    // Buscar usuário a ser deletado
    const { data: targetUser, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    const target = targetUser as UserProfile

    // Client admins só podem deletar usuários do mesmo client_id
    if (profile.role === 'client_admin') {
      if (target.client_id !== profile.client_id) {
        return NextResponse.json(
          { error: 'Acesso negado. Você só pode desativar usuários do seu client.' },
          { status: 403 }
        )
      }
      
      if (target.role === 'admin') {
        return NextResponse.json(
          { error: 'Você não pode desativar super admins' },
          { status: 403 }
        )
      }
    }

    // Obter query param para hard delete (apenas super admin)
    const { searchParams } = new URL(request.url)
    const hardDelete = searchParams.get('hard') === 'true'

    if (hardDelete) {
      // Hard delete: apenas super admins
      if (profile.role !== 'admin') {
        return NextResponse.json(
          { error: 'Apenas super admins podem fazer hard delete' },
          { status: 403 }
        )
      }

      // Deletar do auth
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (authDeleteError) {
        console.error('[DELETE /api/admin/users/[id]] Error deleting auth user:', authDeleteError)
        return NextResponse.json(
          { error: 'Erro ao deletar usuário do auth', details: authDeleteError.message },
          { status: 500 }
        )
      }

      // Deletar profile (cascade automático)
      return NextResponse.json({
        message: 'Usuário removido permanentemente'
      })
    } else {
      // Soft delete: desativar
      const { error: deactivateError } = await (supabase
        .from('user_profiles') as any)
        .update({ is_active: false })
        .eq('id', userId)

      if (deactivateError) {
        console.error('[DELETE /api/admin/users/[id]] Error deactivating user:', deactivateError)
        return NextResponse.json(
          { error: 'Erro ao desativar usuário', details: deactivateError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        message: 'Usuário desativado com sucesso'
      })
    }

  } catch (error) {
    console.error('[DELETE /api/admin/users/[id]] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

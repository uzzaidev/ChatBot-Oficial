import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { randomBytes } from 'crypto'
import type { CreateInviteRequest, UserInvite, UserRole } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface CurrentUserProfile {
  client_id: string
  role: UserRole
  is_active: boolean
}

/**
 * GET /api/admin/invites
 * Lista todos os convites do client_id do admin
 * 
 * Query params:
 * - status: filtrar por status (opcional)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()


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

    // Obter query params
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')

    // Construir query (sem JOIN para evitar problemas com RLS)
    let query = supabase
      .from('user_invites')
      .select('*')
      .order('created_at', { ascending: false })

    // Client admins veem apenas convites do seu client
    if (profile.role === 'client_admin') {
      query = query.eq('client_id', profile.client_id)
    }

    // Filtrar por status se fornecido
    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data: invites, error: invitesError } = await query

    if (invitesError) {
      console.error('[GET /api/admin/invites] Error fetching invites:', invitesError)
      return NextResponse.json(
        { error: 'Erro ao buscar convites', details: invitesError.message },
        { status: 500 }
      )
    }

    // Buscar informações dos criadores dos convites (separadamente para evitar RLS)
    if (invites && invites.length > 0) {
      const creatorIds = Array.from(new Set(invites.map((inv: any) => inv.invited_by_user_id).filter(Boolean)))
      
      if (creatorIds.length > 0) {
        const { data: creators } = await supabase
          .from('user_profiles')
          .select('id, email, full_name')
          .in('id', creatorIds)

        const creatorMap = new Map(creators?.map((c: any) => [c.id, c]) || [])
        
        // Adicionar informações do criador a cada convite
        invites.forEach((invite: any) => {
          const creator = creatorMap.get(invite.invited_by_user_id)
          if (creator) {
            invite.invited_by = creator
          }
        })
      }
    }

    return NextResponse.json({
      invites,
      total: invites?.length || 0
    })

  } catch (error) {
    console.error('[GET /api/admin/invites] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/invites
 * Cria um novo convite
 * 
 * Body:
 * {
 *   email: string
 *   role: 'client_admin' | 'user'
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()

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

    // Parse request body
    const body: CreateInviteRequest = await request.json()

    // Validação
    if (!body.email || typeof body.email !== 'string') {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      )
    }

    if (!body.role || !['client_admin', 'user'].includes(body.role)) {
      return NextResponse.json(
        { error: 'Role deve ser "client_admin" ou "user"' },
        { status: 400 }
      )
    }

    // Verificar se email já tem usuário ativo
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('id, email, is_active')
      .eq('email', body.email.toLowerCase().trim())
      .single()

    if (existingUser && (existingUser as any).is_active) {
      return NextResponse.json(
        { error: 'Usuário com este email já existe e está ativo' },
        { status: 409 }
      )
    }

    // Verificar se já existe convite pendente
    const { data: existingInvite } = await supabase
      .from('user_invites')
      .select('id, status')
      .eq('email', body.email.toLowerCase().trim())
      .eq('status', 'pending')
      .eq('client_id', profile.client_id)
      .single()

    if (existingInvite) {
      return NextResponse.json(
        { error: 'Já existe um convite pendente para este email' },
        { status: 409 }
      )
    }

    // Gerar token único
    const token = randomBytes(32).toString('hex')

    // Criar convite
    const newInvite: any = {
      client_id: profile.client_id,
      invited_by_user_id: user.id,
      email: body.email.toLowerCase().trim(),
      role: body.role,
      invite_token: token,
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 dias
    }

    const { data: createdInvite, error: createError } = await supabase
      .from('user_invites')
      .insert(newInvite)
      .select(`
        *,
        invited_by:user_profiles!invited_by_user_id(id, email, full_name)
      `)
      .single()

    if (createError) {
      console.error('[POST /api/admin/invites] Error creating invite:', createError)
      return NextResponse.json(
        { error: 'Erro ao criar convite', details: createError.message },
        { status: 500 }
      )
    }

    // TODO: Enviar email com link de convite
    // const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invite?token=${token}`
    // await sendInviteEmail(body.email, inviteLink, profile.client_name)

    return NextResponse.json({
      invite: createdInvite as UserInvite,
      message: 'Convite criado com sucesso',
      // invite_link: inviteLink // Para desenvolvimento
    }, { status: 201 })

  } catch (error) {
    console.error('[POST /api/admin/invites] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

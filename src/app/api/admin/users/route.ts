import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase'
import type { CreateUserRequest, UserProfile, UserRole } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface CurrentUserProfile {
  client_id: string
  role: UserRole
  is_active: boolean
}

/**
 * GET /api/admin/users
 * Lista todos os usuários do mesmo client_id do admin autenticado
 * 
 * Query params:
 * - role: filtrar por role (opcional)
 * - is_active: filtrar por status ativo (opcional)
 * - search: buscar por email ou nome (opcional)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    console.log('[GET /api/admin/users] 🔍 Starting request...')

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('[GET /api/admin/users] 👤 Auth check:', {
      userId: user?.id,
      email: user?.email,
      hasError: !!authError,
      errorMessage: authError?.message
    })

    if (authError || !user) {
      console.log('[GET /api/admin/users] ❌ Authentication failed')
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

    console.log('[GET /api/admin/users] 📋 Profile check:', {
      hasProfile: !!currentUserProfile,
      profile: currentUserProfile,
      hasError: !!profileError,
      errorMessage: profileError?.message
    })

    if (profileError || !currentUserProfile) {
      console.log('[GET /api/admin/users] ❌ Profile not found')
      return NextResponse.json(
        { error: 'Perfil de usuário não encontrado' },
        { status: 404 }
      )
    }

    const profile = currentUserProfile as CurrentUserProfile

    console.log('[GET /api/admin/users] 🔐 Role check:', {
      role: profile.role,
      isActive: profile.is_active,
      isAdmin: ['admin', 'client_admin'].includes(profile.role)
    })

    // Verificar se é admin
    if (!['admin', 'client_admin'].includes(profile.role)) {
      console.log('[GET /api/admin/users] ❌ Access denied - insufficient role')
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem acessar esta rota.' },
        { status: 403 }
      )
    }

    // Verificar se está ativo
    if (!profile.is_active) {
      console.log('[GET /api/admin/users] ❌ Access denied - user inactive')
      return NextResponse.json(
        { error: 'Conta desativada' },
        { status: 403 }
      )
    }

    // Obter query params
    const { searchParams } = new URL(request.url)
    const roleFilter = searchParams.get('role')
    const isActiveFilter = searchParams.get('is_active')
    const searchQuery = searchParams.get('search')

    // Construir query
    let query = supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    // Super admin vê todos os usuários, client_admin vê apenas do seu client
    if (profile.role === 'client_admin') {
      query = query.eq('client_id', profile.client_id)
    }

    // Aplicar filtros opcionais
    if (roleFilter) {
      query = query.eq('role', roleFilter)
    }

    if (isActiveFilter !== null) {
      query = query.eq('is_active', isActiveFilter === 'true')
    }

    if (searchQuery) {
      query = query.or(`email.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
    }

    const { data: users, error: usersError } = await query

    if (usersError) {
      console.error('[GET /api/admin/users] Error fetching users:', usersError)
      return NextResponse.json(
        { error: 'Erro ao buscar usuários', details: usersError.message },
        { status: 500 }
      )
    }

    // Buscar nomes dos clients para super admin
    let usersWithClientNames = users as UserProfile[]
    if (profile.role === 'admin' && users && users.length > 0) {
      const clientIds = Array.from(new Set((users as UserProfile[]).map(u => u.client_id)))
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .in('id', clientIds)

      const clientMap = new Map(clients?.map((c: any) => [c.id, c.name]) || [])
      
      usersWithClientNames = (users as UserProfile[]).map(user => ({
        ...user,
        client_name: clientMap.get(user.client_id)
      } as any))
    }

    return NextResponse.json({
      users: usersWithClientNames,
      total: users?.length || 0
    })

  } catch (error) {
    console.error('[GET /api/admin/users] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/users
 * Cria um novo usuário no mesmo client_id do admin
 * 
 * Body:
 * {
 *   email: string
 *   full_name?: string
 *   role: 'client_admin' | 'user'
 *   phone?: string
 *   permissions?: Record<string, any>
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const supabaseAdmin = createServiceRoleClient()

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
        { error: 'Acesso negado. Apenas administradores podem criar usuários.' },
        { status: 403 }
      )
    }

    // Verificar se está ativo
    if (!profile.is_active) {
      return NextResponse.json(
        { error: 'Conta desativada' },
        { status: 403 }
      )
    }

    // Parse request body
    const body: CreateUserRequest = await request.json()

    // Validação básica
    if (!body.email || typeof body.email !== 'string') {
      return NextResponse.json(
        { error: 'Email é obrigatório e deve ser uma string' },
        { status: 400 }
      )
    }

    if (!body.role || !['client_admin', 'user'].includes(body.role)) {
      return NextResponse.json(
        { error: 'Role deve ser "client_admin" ou "user"' },
        { status: 400 }
      )
    }

    // Verificar se email já existe
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('id, email')
      .eq('email', body.email.toLowerCase().trim())
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email já cadastrado' },
        { status: 409 }
      )
    }

    // Criar usuário no auth (Supabase Auth)
    const { data: authUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email.toLowerCase().trim(),
      email_confirm: true, // Auto-confirmar email
      user_metadata: {
        full_name: body.full_name,
        role: body.role,
        client_id: profile.client_id
      }
    })

    if (createAuthError || !authUser.user) {
      console.error('[POST /api/admin/users] Error creating auth user:', createAuthError)
      return NextResponse.json(
        { error: 'Erro ao criar usuário no sistema de autenticação', details: createAuthError?.message },
        { status: 500 }
      )
    }

    // Criar perfil de usuário
    const newUserProfile: any = {
      id: authUser.user.id,
      client_id: profile.client_id,
      email: body.email.toLowerCase().trim(),
      full_name: body.full_name || null,
      role: body.role,
      permissions: body.permissions || {},
      is_active: true,
      phone: body.phone || null
    }

    const { data: createdProfile, error: profileCreateError } = await supabase
      .from('user_profiles')
      .insert(newUserProfile)
      .select()
      .single()

    if (profileCreateError) {
      console.error('[POST /api/admin/users] Error creating user profile:', profileCreateError)
      
      // Rollback: deletar usuário do auth se falhar ao criar profile
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      
      return NextResponse.json(
        { error: 'Erro ao criar perfil de usuário', details: profileCreateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      user: createdProfile as UserProfile,
      message: 'Usuário criado com sucesso'
    }, { status: 201 })

  } catch (error) {
    console.error('[POST /api/admin/users] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}


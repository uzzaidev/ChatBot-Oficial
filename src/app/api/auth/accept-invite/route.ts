import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Token obrigatório' }, { status: 400 })
  }

  const serviceRole = createServiceRoleClient()

  const { data: invite, error } = await (serviceRole as any)
    .from('user_invites')
    .select('email, role, client_id')
    .eq('invite_token', token)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !invite) {
    return NextResponse.json({ error: 'Convite inválido ou expirado' }, { status: 404 })
  }

  return NextResponse.json({ invite: { email: invite.email, role: invite.role } })
}

export async function POST(request: NextRequest) {
  try {
    const { token, fullName, password } = await request.json()

    if (!token || !fullName || !password) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Senha deve ter pelo menos 8 caracteres' }, { status: 400 })
    }

    const serviceRole = createServiceRoleClient()

    const { data: invite, error: inviteError } = await (serviceRole as any)
      .from('user_invites')
      .select('*')
      .eq('invite_token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Convite inválido ou expirado' }, { status: 404 })
    }

    const { data: authData, error: authError } = await serviceRole.auth.admin.createUser({
      email: invite.email,
      password,
      email_confirm: true,
      user_metadata: {
        client_id: invite.client_id,
        full_name: fullName,
      },
    })

    if (authError || !authData.user) {
      if (authError?.message?.includes('already registered')) {
        return NextResponse.json({ error: 'Email já registrado. Faça login.' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 })
    }

    const { error: profileError } = await (serviceRole as any)
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        client_id: invite.client_id,
        email: invite.email,
        full_name: fullName,
        role: invite.role ?? 'user',
        auth_provider: 'invite',
        email_verified: true,
        approval_status: 'approved',
        is_active: true,
      })

    if (profileError) {
      await serviceRole.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: 'Erro ao criar perfil' }, { status: 500 })
    }

    await (serviceRole as any)
      .from('user_invites')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    const { data: signInData } = await serviceRole.auth.signInWithPassword({
      email: invite.email,
      password,
    })

    const session = signInData?.session ?? null

    return NextResponse.json({ success: true, session })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

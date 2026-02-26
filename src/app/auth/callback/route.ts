import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase-server'
import { createServiceRoleClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const BASE_URL = process.env.NEXT_PUBLIC_URL ?? 'https://uzzapp.uzzai.com.br'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const inviteToken = searchParams.get('invite_token')
  const errorParam = searchParams.get('error')

  if (errorParam) {
    return NextResponse.redirect(`${BASE_URL}/login?error=${errorParam}`)
  }

  if (!code) {
    return NextResponse.redirect(`${BASE_URL}/login?error=no_code`)
  }

  const supabase = await createRouteHandlerClient()

  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError || !data.session) {
    return NextResponse.redirect(`${BASE_URL}/login?error=exchange_failed`)
  }

  const user = data.session.user
  const serviceRole = createServiceRoleClient()

  const { data: existingProfile } = await (serviceRole as any)
    .from('user_profiles')
    .select('client_id, approval_status, is_active')
    .eq('id', user.id)
    .single()

  if (existingProfile) {
    if (existingProfile.approval_status === 'pending') {
      return NextResponse.redirect(`${BASE_URL}/auth/pending-approval`)
    }
    if (existingProfile.is_active === false) {
      return NextResponse.redirect(`${BASE_URL}/login?error=account_inactive`)
    }
    return NextResponse.redirect(`${BASE_URL}/dashboard`)
  }

  const provider = (user.app_metadata?.provider ?? 'google') as 'google' | 'github' | 'azure'

  if (inviteToken) {
    const { data: invite } = await (serviceRole as any)
      .from('user_invites')
      .select('*')
      .eq('invite_token', inviteToken)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (invite) {
      await (serviceRole as any).from('user_profiles').insert({
        id: user.id,
        client_id: invite.client_id,
        email: user.email,
        full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
        auth_provider: provider,
        approval_status: 'approved',
        email_verified: true,
        role: invite.role ?? 'user',
        is_active: true,
      })

      await (serviceRole as any)
        .from('user_invites')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', invite.id)

      return NextResponse.redirect(`${BASE_URL}/dashboard`)
    }
  }

  await (serviceRole as any).from('user_profiles').insert({
    id: user.id,
    client_id: null,
    email: user.email,
    full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    auth_provider: provider,
    approval_status: 'pending',
    email_verified: true,
    role: 'user',
    is_active: false,
  })

  return NextResponse.redirect(`${BASE_URL}/auth/pending-approval`)
}

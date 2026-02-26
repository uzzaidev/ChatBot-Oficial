import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 })
    }

    const base = process.env.NEXT_PUBLIC_URL ?? 'https://uzzapp.uzzai.com.br'

    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error } = await anonClient.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${base}/auth/confirm` },
    })

    if (error) {
      return NextResponse.json({ error: 'Erro ao reenviar email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

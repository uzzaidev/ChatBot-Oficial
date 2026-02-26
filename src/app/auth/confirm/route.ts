import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase-server'
import type { EmailOtpType } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType
  const base = process.env.NEXT_PUBLIC_URL ?? 'https://uzzapp.uzzai.com.br'

  if (!token_hash || !type) {
    return NextResponse.redirect(`${base}/login?error=missing_token`)
  }

  const supabase = await createRouteHandlerClient()
  const { error } = await supabase.auth.verifyOtp({ token_hash, type })

  if (error) {
    return NextResponse.redirect(`${base}/login?error=confirm_failed`)
  }

  return NextResponse.redirect(`${base}/dashboard`)
}

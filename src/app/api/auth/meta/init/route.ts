/**
 * Meta OAuth - Initialization Endpoint
 *
 * Entry point for Embedded Signup flow
 * User clicks "Conectar WhatsApp" → generates CSRF token → redirects to Meta
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateOAuthState, getMetaOAuthURL } from '@/lib/meta-oauth'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // 1. Generate CSRF token
    const state = generateOAuthState()

    // 2. Store state in secure HTTP-only cookie (expires in 10 minutes)
    const cookieStore = await cookies()
    cookieStore.set('meta_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })

    // 3. Build Meta OAuth URL
    const oauthURL = getMetaOAuthURL(state)

    console.log('[Meta OAuth Init] Redirecting to:', oauthURL)
    console.log('[Meta OAuth Init] State:', state.substring(0, 20) + '...')

    // 4. Redirect to Meta OAuth
    return NextResponse.redirect(oauthURL)
  } catch (error) {
    console.error('[Meta OAuth Init] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to initialize OAuth',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Meta OAuth - Deauthorization Endpoint
 *
 * Meta calls this endpoint when a user revokes app permissions
 * We should disable the client to stop processing messages
 *
 * Docs: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * Validate signed request from Meta
 * Meta sends: signed_request=<base64_signature>.<base64_payload>
 */
function parseSignedRequest(signedRequest: string): { user_id: string } | null {
  try {
    const [encodedSig, encodedPayload] = signedRequest.split('.')

    if (!encodedSig || !encodedPayload) {
      console.error('[Deauth] Invalid signed_request format')
      return null
    }

    // Decode payload
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf-8')
    )

    // Verify signature
    const appSecret = process.env.META_PLATFORM_APP_SECRET
    if (!appSecret) {
      console.error('[Deauth] META_PLATFORM_APP_SECRET not set')
      return null
    }

    const expectedSig = crypto
      .createHmac('sha256', appSecret)
      .update(encodedPayload)
      .digest('base64url')

    const receivedSig = Buffer.from(encodedSig, 'base64url').toString('base64url')

    if (expectedSig !== receivedSig) {
      console.error('[Deauth] Invalid signature')
      return null
    }

    return payload
  } catch (error) {
    console.error('[Deauth] Failed to parse signed_request:', error)
    return null
  }
}

/**
 * POST - Handle deauthorization
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.formData()
    const signedRequest = body.get('signed_request') as string

    if (!signedRequest) {
      console.error('[Deauth] Missing signed_request')
      return NextResponse.json({ error: 'Missing signed_request' }, { status: 400 })
    }

    console.log('[Deauth] Received deauth request')

    // Parse and validate signed request
    const payload = parseSignedRequest(signedRequest)

    if (!payload) {
      return NextResponse.json({ error: 'Invalid signed_request' }, { status: 403 })
    }

    const userId = payload.user_id

    console.log('[Deauth] Valid request for user:', userId)

    // TODO: Find client by Meta user_id or WABA
    // For now, we don't have user_id stored in clients table
    // This needs to be added in future migration

    // Return confirmation URL (required by Meta)
    const confirmationCode = crypto.randomBytes(16).toString('hex')
    const confirmationUrl = `${process.env.NEXT_PUBLIC_URL}/data-deletion-status?code=${confirmationCode}`

    console.log('[Deauth] Sending confirmation URL:', confirmationUrl)

    return NextResponse.json({
      url: confirmationUrl,
      confirmation_code: confirmationCode,
    })
  } catch (error) {
    console.error('[Deauth] Error:', error)

    return NextResponse.json(
      {
        error: 'Internal error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET - Verification endpoint (Meta may call this)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // If Meta sends verification challenge (similar to webhook)
  if (mode === 'subscribe') {
    const VERIFY_TOKEN = process.env.META_PLATFORM_VERIFY_TOKEN

    if (token === VERIFY_TOKEN) {
      console.log('[Deauth] Verification successful')
      return new NextResponse(challenge, { status: 200 })
    }

    console.warn('[Deauth] Invalid verify token')
    return new NextResponse('Forbidden', { status: 403 })
  }

  return new NextResponse('Method not allowed', { status: 405 })
}

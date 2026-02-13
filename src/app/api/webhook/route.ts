/**
 * ⚠️ WEBHOOK ÚNICO MULTI-TENANT - EM TRANSIÇÃO
 *
 * Status: EM DESENVOLVIMENTO
 *
 * Este webhook está sendo preparado para substituir o modelo atual de webhook por cliente.
 *
 * PRODUÇÃO ATUAL: /api/webhook/[clientId] (webhook por cliente)
 * FUTURO (este arquivo): /api/webhook (webhook único, identifica cliente via WABA ID)
 *
 * Mudanças principais:
 * - Um único webhook para todos os clientes (escalável)
 * - Identificação via WABA ID no payload do Meta (entry[0].id)
 * - HMAC validation com META_PLATFORM_APP_SECRET compartilhado
 * - Auto-provisioning de novos clientes via Embedded Signup
 *
 * IMPORTANTE: NÃO USE EM PRODUÇÃO ATÉ MIGRAÇÃO COMPLETA
 * Ver plano completo em: C:\Users\Luisf\.claude\plans\tranquil-zooming-stallman.md
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * GET - Webhook Verification (Meta validates webhook)
 * Meta sends: ?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=RANDOM
 * We must return hub.challenge if token matches
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    console.log('[Webhook GET] Verification request:', { mode, token: token?.slice(0, 5) + '...' })

    // Validate token (shared platform token, not per-client)
    const VERIFY_TOKEN = process.env.META_PLATFORM_VERIFY_TOKEN

    if (!VERIFY_TOKEN) {
      console.error('[Webhook GET] META_PLATFORM_VERIFY_TOKEN not set')
      return new NextResponse('Server configuration error', { status: 500 })
    }

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[Webhook GET] ✅ Verification successful')
      return new NextResponse(challenge, { status: 200 })
    }

    console.warn('[Webhook GET] ❌ Verification failed:', { mode, tokenMatch: token === VERIFY_TOKEN })
    return new NextResponse('Forbidden', { status: 403 })
  } catch (error) {
    console.error('[Webhook GET] Error:', error)
    return new NextResponse('Internal error', { status: 500 })
  }
}

/**
 * POST - Receive Messages (WhatsApp sends messages here)
 *
 * TODO (Próximos passos da migração):
 * 1. Implementar WABA lookup (src/lib/waba-lookup.ts)
 * 2. Implementar auto-provisioning (src/lib/auto-provision.ts)
 * 3. Integrar com processChatbotMessage existente
 * 4. Testar em staging com Meta App de teste
 * 5. Migrar clientes existentes (popular meta_waba_id)
 * 6. Atualizar webhook no Meta Dashboard
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Read raw body (needed for HMAC validation)
    const rawBody = await request.text()

    // 2. Validate HMAC signature (shared platform secret, not per-client)
    const signature = request.headers.get('x-hub-signature-256')

    if (!signature) {
      console.warn('[Webhook POST] ❌ Missing signature header')
      return NextResponse.json({ error: 'Missing signature' }, { status: 403 })
    }

    const isValid = validateHMAC(rawBody, signature)

    if (!isValid) {
      console.warn('[Webhook POST] ❌ Invalid HMAC signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    console.log('[Webhook POST] ✅ HMAC validation passed')

    // 3. Parse body
    const body = JSON.parse(rawBody)

    // 4. Extract WABA ID (identifies which client this message belongs to)
    const wabaId = extractWABAId(body)

    if (!wabaId) {
      console.warn('[Webhook POST] ❌ Missing WABA ID in payload')
      return NextResponse.json({ error: 'Missing WABA ID' }, { status: 400 })
    }

    console.log('[Webhook POST] 📱 WABA ID:', wabaId)

    // 5. TODO: Lookup client by WABA ID
    // const client = await getClientByWABA(wabaId)
    // if (!client) {
    //   // Auto-provision new client
    //   client = await autoProvisionClient(wabaId, body)
    // }

    // 6. TODO: Process message with existing flow
    // await processChatbotMessage(body, client)

    // For now, just acknowledge receipt (Meta requires 200 OK within 20 seconds)
    console.log('[Webhook POST] ✅ Message received (processing not implemented yet)')

    return NextResponse.json({
      status: 'EVENT_RECEIVED',
      wabaId,
      note: 'Webhook in transition - processing not active yet'
    }, { status: 200 })

  } catch (error) {
    console.error('[Webhook POST] Error:', error)
    return NextResponse.json({
      error: 'Internal error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Validate HMAC signature from Meta
 * Meta sends: x-hub-signature-256: sha256=<hash>
 *
 * Uses shared platform secret (META_PLATFORM_APP_SECRET)
 * NOT per-client secret (old model)
 */
function validateHMAC(rawBody: string, signature: string): boolean {
  try {
    const APP_SECRET = process.env.META_PLATFORM_APP_SECRET

    if (!APP_SECRET) {
      console.error('[HMAC] META_PLATFORM_APP_SECRET not set')
      return false
    }

    // Meta sends: "sha256=<hash>"
    const signatureHash = signature.split('sha256=')[1]

    if (!signatureHash) {
      console.warn('[HMAC] Invalid signature format:', signature)
      return false
    }

    // Calculate expected hash
    const expectedHash = crypto
      .createHmac('sha256', APP_SECRET)
      .update(rawBody)
      .digest('hex')

    // Timing-safe comparison (prevents timing attacks)
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signatureHash),
      Buffer.from(expectedHash)
    )

    return isValid
  } catch (error) {
    console.error('[HMAC] Validation error:', error)
    return false
  }
}

/**
 * Extract WABA ID from Meta webhook payload
 *
 * This is how we identify which client the message belongs to
 * in the new multi-tenant model (replaces URL-based routing)
 *
 * Format: { entry: [{ id: "WABA_ID", changes: [...] }] }
 */
function extractWABAId(payload: any): string | null {
  try {
    return payload?.entry?.[0]?.id || null
  } catch {
    return null
  }
}

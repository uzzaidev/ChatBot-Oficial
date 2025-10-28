/**
 * 🔐 WEBHOOK MULTI-TENANT DINÂMICO POR CLIENTE
 *
 * Rota: /api/webhook/[clientId]
 *
 * Cada cliente tem sua própria URL de webhook configurada no Meta Dashboard:
 * - Cliente A: https://chat.luisfboff.com/api/webhook/550e8400-e29b-41d4-a716-446655440000
 * - Cliente B: https://chat.luisfboff.com/api/webhook/660e8400-e29b-41d4-a716-446655440001
 *
 * Fluxo:
 * 1. Meta chama webhook com clientId na URL
 * 2. Busca config do cliente no Vault
 * 3. Valida que cliente está ativo
 * 4. Processa mensagem com config do cliente
 */

import { NextRequest, NextResponse } from 'next/server'
import { processChatbotMessage } from '@/flows/chatbotFlow'
import { addWebhookMessage } from '@/lib/webhookCache'
import { getClientConfig } from '@/lib/config'

export const dynamic = 'force-dynamic'

/**
 * GET - Webhook verification (Meta)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const { clientId } = params
    const searchParams = request.nextUrl.searchParams

    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    console.log(`[WEBHOOK/${clientId}] GET - Verificação da Meta`)
    console.log(`  Mode: ${mode}`)
    console.log(`  Client ID: ${clientId}`)

    // 1. Buscar config do cliente
    const config = await getClientConfig(clientId)

    if (!config) {
      console.error(`[WEBHOOK/${clientId}] ❌ Cliente não encontrado ou inativo`)
      return new NextResponse('Client not found', { status: 404 })
    }

    if (config.status !== 'active') {
      console.error(`[WEBHOOK/${clientId}] ❌ Cliente não está ativo: ${config.status}`)
      return new NextResponse('Client not active', { status: 403 })
    }

    // 2. Validar verify token do cliente
    const expectedToken = config.apiKeys.metaVerifyToken

    if (mode === 'subscribe' && token === expectedToken) {
      console.log(`[WEBHOOK/${clientId}] ✅ Verificação bem-sucedida!`)
      console.log(`  Cliente: ${config.name}`)
      return new NextResponse(challenge, { status: 200 })
    } else {
      console.warn(`[WEBHOOK/${clientId}] ❌ Token inválido`)
      console.warn(`  Esperado: ${expectedToken.substring(0, 10)}...`)
      console.warn(`  Recebido: ${token?.substring(0, 10)}...`)
      return new NextResponse('Invalid verification token', { status: 403 })
    }
  } catch (error) {
    console.error(`[WEBHOOK] Erro no GET:`, error)
    return new NextResponse('Internal error', { status: 500 })
  }
}

/**
 * POST - Webhook message handler (Meta)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  const { clientId } = params

  console.log('═══════════════════════════════════════════════')
  console.log(`🚀 [WEBHOOK/${clientId}] POST INICIADO`)
  console.log('Timestamp:', new Date().toISOString())
  console.log('═══════════════════════════════════════════════')

  try {
    // 1. Parse body
    const body = await request.json()
    console.log(`[WEBHOOK/${clientId}] Body recebido:`, JSON.stringify(body, null, 2))

    // 2. Buscar config do cliente do Vault
    console.log(`[WEBHOOK/${clientId}] 🔐 Buscando config do cliente...`)
    const config = await getClientConfig(clientId)

    if (!config) {
      console.error(`[WEBHOOK/${clientId}] ❌ Cliente não encontrado`)
      return new NextResponse('Client not found', { status: 404 })
    }

    if (config.status !== 'active') {
      console.error(`[WEBHOOK/${clientId}] ❌ Cliente inativo: ${config.status}`)
      return new NextResponse('Client not active', { status: 403 })
    }

    console.log(`[WEBHOOK/${clientId}] ✅ Config carregado: ${config.name}`)
    console.log(`  Slug: ${config.slug}`)
    console.log(`  Status: ${config.status}`)
    console.log(`  Plan: ${config.status}`)

    // 3. Extrair mensagem e adicionar ao cache
    try {
      const entry = body.entry?.[0]
      const change = entry?.changes?.[0]
      const value = change?.value
      const message = value?.messages?.[0]

      if (message) {
        const contact = value?.contacts?.[0]

        const webhookMessage = {
          id: message.id || `msg-${Date.now()}`,
          timestamp: new Date().toISOString(),
          from: message.from,
          name: contact?.profile?.name || 'Unknown',
          type: message.type,
          content:
            message.text?.body ||
            message.image?.caption ||
            message.audio?.id ||
            message.type,
          raw: body,
        }

        addWebhookMessage(webhookMessage)
        console.log(`[WEBHOOK/${clientId}] 📥 Mensagem capturada: ${webhookMessage.from}`)
      }
    } catch (parseError) {
      console.error(`[WEBHOOK/${clientId}] Erro ao extrair mensagem:`, parseError)
    }

    // 4. Processar mensagem com config do cliente
    console.log(`[WEBHOOK/${clientId}] ⚡ Processando chatbot flow...`)

    try {
      const result = await processChatbotMessage(body, config)
      console.log(`[WEBHOOK/${clientId}] ✅ Processamento concluído!`)
      console.log(`  Mensagens enviadas: ${result.messagesSent || 0}`)
      console.log(`  Handoff: ${result.handedOff ? 'Sim' : 'Não'}`)
    } catch (flowError) {
      console.error(`[WEBHOOK/${clientId}] ❌ Erro no flow:`, flowError)
      // Continua e retorna 200 (Meta requer isso)
    }

    return new NextResponse('EVENT_RECEIVED', { status: 200 })
  } catch (error) {
    console.error(`[WEBHOOK/${clientId}] Erro crítico:`, error)
    return new NextResponse('Internal error', { status: 500 })
  }
}

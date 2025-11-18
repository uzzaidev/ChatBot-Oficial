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
import { setWithExpiry, get } from '@/lib/redis'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * GET - Webhook verification (Meta)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  const timestamp = new Date().toISOString()

  console.log('═══════════════════════════════════════════════════════════')
  console.log(`🔍 [WEBHOOK GET] CHAMADA RECEBIDA - ${timestamp}`)
  console.log('═══════════════════════════════════════════════════════════')

  try {
    const { clientId } = params
    const searchParams = request.nextUrl.searchParams

    // Log 1: Informações da requisição
    console.log('📍 [STEP 1] INFORMAÇÕES DA REQUISIÇÃO:')
    console.log(`  URL completa: ${request.url}`)
    console.log(`  Method: ${request.method}`)
    console.log(`  Client ID extraído da URL: ${clientId}`)

    // Log 2: Headers recebidos
    console.log('\n📋 [STEP 2] HEADERS RECEBIDOS:')
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headers[key] = value
    })
    console.log(JSON.stringify(headers, null, 2))

    // Log 3: Query parameters
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    console.log('\n🔑 [STEP 3] QUERY PARAMETERS:')
    console.log(`  hub.mode: ${mode}`)
    console.log(`  hub.verify_token: ${token}`)
    console.log(`  hub.challenge: ${challenge}`)

    // Mostrar TODOS os query params
    console.log('\n  Todos os query params:')
    searchParams.forEach((value, key) => {
      console.log(`    ${key}: ${value}`)
    })

    // Log 4: Buscar config do cliente
    console.log('\n🔐 [STEP 4] BUSCANDO CONFIG DO VAULT:')
    console.log(`  Client ID: ${clientId}`)

    const config = await getClientConfig(clientId)

    if (!config) {
      console.error('\n❌ [ERRO] Cliente não encontrado ou inativo no banco de dados')
      console.error(`  Client ID procurado: ${clientId}`)
      console.error('  Verifique se o cliente existe na tabela "clients" e está com status "active"')
      return new NextResponse('Client not found', { status: 404 })
    }

    console.log('✅ Config carregado do Vault:')
    console.log(`  Nome: ${config.name}`)
    console.log(`  Slug: ${config.slug}`)
    console.log(`  Status: ${config.status}`)

    if (config.status !== 'active') {
      console.error('\n❌ [ERRO] Cliente não está ativo')
      console.error(`  Status atual: ${config.status}`)
      console.error('  O cliente precisa ter status "active" para funcionar')
      return new NextResponse('Client not active', { status: 403 })
    }

    // Log 5: Validar verify token
    console.log('\n🔒 [STEP 5] VALIDAÇÃO DO VERIFY TOKEN:')
    const expectedToken = config.apiKeys.metaVerifyToken

    console.log(`  Mode recebido: "${mode}"`)
    console.log(`  Mode esperado: "subscribe"`)
    console.log(`  Mode válido: ${mode === 'subscribe' ? '✅' : '❌'}`)
    console.log(`\n  Token recebido: "${token}"`)
    console.log(`  Token esperado: "${expectedToken}"`)
    console.log(`  Token válido: ${token === expectedToken ? '✅' : '❌'}`)

    // Comparação character-by-character se tokens não batem
    if (token !== expectedToken) {
      console.log('\n⚠️  TOKENS NÃO BATEM - Análise detalhada:')
      console.log(`  Length recebido: ${token?.length || 0}`)
      console.log(`  Length esperado: ${expectedToken.length}`)

      if (token && expectedToken) {
        const minLen = Math.min(token.length, expectedToken.length)
        for (let i = 0; i < minLen; i++) {
          if (token[i] !== expectedToken[i]) {
            console.log(`  Primeira diferença no char ${i}:`)
            console.log(`    Recebido: "${token[i]}" (code: ${token.charCodeAt(i)})`)
            console.log(`    Esperado: "${expectedToken[i]}" (code: ${expectedToken.charCodeAt(i)})`)
            break
          }
        }
      }
    }

    // Log 6: Decisão final
    if (mode === 'subscribe' && token === expectedToken) {
      console.log('\n✅ [STEP 6] VERIFICAÇÃO BEM-SUCEDIDA!')
      console.log(`  Cliente: ${config.name}`)
      console.log(`  Challenge retornado: ${challenge}`)
      console.log(`  Status HTTP: 200`)
      console.log('═══════════════════════════════════════════════════════════\n')

      return new NextResponse(challenge, { status: 200 })
    } else {
      console.error('\n❌ [STEP 6] VERIFICAÇÃO FALHOU!')

      if (mode !== 'subscribe') {
        console.error(`  Motivo: Mode inválido (recebido: "${mode}", esperado: "subscribe")`)
      }

      if (token !== expectedToken) {
        console.error('  Motivo: Token não corresponde ao configurado no Vault')
        console.error(`  Token recebido (primeiros 20): ${token?.substring(0, 20)}...`)
        console.error(`  Token esperado (primeiros 20): ${expectedToken.substring(0, 20)}...`)
      }

      console.error('  Status HTTP: 403')
      console.error('═══════════════════════════════════════════════════════════\n')

      return new NextResponse('Invalid verification token', { status: 403 })
    }
  } catch (error) {
    console.error('\n💥 [ERRO CRÍTICO] Exceção no GET:')
    console.error('  Tipo:', error instanceof Error ? error.constructor.name : typeof error)
    console.error('  Mensagem:', error instanceof Error ? error.message : String(error))
    console.error('  Stack:', error instanceof Error ? error.stack : 'N/A')
    console.error('  Status HTTP: 500')
    console.error('═══════════════════════════════════════════════════════════\n')

    return new NextResponse('Internal error', { status: 500 })
  }
}

/**
 * POST - Webhook message handler (Meta)
 * 
 * SECURITY FIX (VULN-012): Valida assinatura HMAC da Meta
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
    // SECURITY FIX (VULN-012): Validar assinatura ANTES de processar
    const signature = request.headers.get('X-Hub-Signature-256')
    
    if (!signature) {
      console.error(`[WEBHOOK/${clientId}] ❌ Assinatura ausente`)
      return new NextResponse('Missing signature', { status: 403 })
    }

    // 1. Parse body (precisamos do texto RAW para validar assinatura)
    const rawBody = await request.text()
    
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

    // SECURITY FIX (VULN-012): Validar assinatura HMAC
    const appSecret = config.apiKeys.metaVerifyToken // Meta usa verify_token como secret
    
    if (!appSecret) {
      console.error(`[WEBHOOK/${clientId}] ❌ App secret não configurado`)
      return new NextResponse('App secret not configured', { status: 500 })
    }

    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex')

    // Usar comparação timing-safe
    const signatureBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expectedSignature)
    
    if (signatureBuffer.length !== expectedBuffer.length || 
        !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      console.error(`[WEBHOOK/${clientId}] ❌ ASSINATURA INVÁLIDA!`)
      console.error(`  Recebido: ${signature.substring(0, 20)}...`)
      console.error(`  Esperado: ${expectedSignature.substring(0, 20)}...`)
      return new NextResponse('Invalid signature', { status: 403 })
    }

    console.log(`[WEBHOOK/${clientId}] ✅ Assinatura válida`)

    // Parse body como JSON agora que validamos
    const body = JSON.parse(rawBody)
    console.log(`[WEBHOOK/${clientId}] Body recebido:`, JSON.stringify(body, null, 2))

    console.log(`[WEBHOOK/${clientId}] ✅ Config carregado: ${config.name}`)
    console.log(`  Slug: ${config.slug}`)
    console.log(`  Status: ${config.status}`)
    console.log(`  Plan: ${config.status}`)

    // 3. Extrair mensagem e adicionar ao cache
    let messageId: string | null = null
    
    try {
      const entry = body.entry?.[0]
      const change = entry?.changes?.[0]
      const value = change?.value
      const message = value?.messages?.[0]

      if (message) {
        const contact = value?.contacts?.[0]
        messageId = message.id || `msg-${Date.now()}`

        const webhookMessage = {
          id: messageId,
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

    // 4. Deduplication check - prevent processing duplicate messages
    if (messageId) {
      const dedupeKey = `processed:${clientId}:${messageId}`
      
      try {
        const alreadyProcessed = await get(dedupeKey)
        
        if (alreadyProcessed) {
          console.log(`[WEBHOOK/${clientId}] ⚠️ MENSAGEM DUPLICADA DETECTADA!`)
          console.log(`  Message ID: ${messageId}`)
          console.log(`  Já processada em: ${alreadyProcessed}`)
          console.log(`  Ignorando processamento...`)
          return new NextResponse('DUPLICATE_MESSAGE_IGNORED', { status: 200 })
        }
        
        // Mark message as being processed (valid for 24 hours)
        await setWithExpiry(dedupeKey, new Date().toISOString(), 86400) // 24 hours
        console.log(`[WEBHOOK/${clientId}] ✅ Mensagem marcada como processada`)
      } catch (redisError) {
        // If Redis fails, log but continue processing (graceful degradation)
        console.error(`[WEBHOOK/${clientId}] ⚠️ Erro no Redis deduplication:`, redisError)
        console.log(`[WEBHOOK/${clientId}] Continuando processamento sem deduplicação...`)
      }
    }

    // 5. Processar mensagem com config do cliente
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

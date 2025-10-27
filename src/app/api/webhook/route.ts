import { NextRequest, NextResponse } from "next/server";
import { processChatbotMessage } from '@/flows/chatbotFlow'
import { addWebhookMessage } from '@/lib/webhookCache'
import { getMetaVerifyToken, getWebhookUrl } from '@/lib/config'

/**
 * GET - usado pela Meta para verificar e ativar o webhook (hub.challenge)
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const VERIFY_TOKEN = getMetaVerifyToken()

    console.log(`[WEBHOOK GET] Verificação da Meta`)
    console.log(`[WEBHOOK GET] Mode: ${mode}`)
    console.log(`[WEBHOOK GET] Token match: ${token === VERIFY_TOKEN}`)
    console.log(`[WEBHOOK GET] Webhook URL configurada: ${getWebhookUrl()}`)

    // Verifica se o token e o modo estão corretos
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ Webhook verificado com sucesso pela Meta!")
      return new NextResponse(challenge, { status: 200 })
    } else {
      console.warn("❌ Falha na verificação do webhook")
      console.warn(`Token esperado: ${VERIFY_TOKEN.substring(0, 10)}...`)
      console.warn(`Token recebido: ${token?.substring(0, 10)}...`)
      return new NextResponse("Erro de verificação", { status: 403 })
    }
  } catch (err) {
    console.error("Erro ao processar GET do webhook:", err)
    return new NextResponse("Erro interno", { status: 500 })
  }
}

/**
 * POST - usado pela Meta para enviar mensagens e atualizações
 */
export async function POST(req: NextRequest) {
  // LOG CRÍTICO: Este deve SEMPRE aparecer quando webhook é chamado
  console.log('═══════════════════════════════════════════════')
  console.log('🚀🚀🚀 [WEBHOOK POST] FUNÇÃO INICIADA! 🚀🚀🚀')
  console.log('Timestamp:', new Date().toISOString())
  console.log('URL:', req.url)
  console.log('Method:', req.method)
  console.log('═══════════════════════════════════════════════')
  
  try {
    console.log('[WEBHOOK] Tentando parsear body...')
    const body = await req.json();
    console.log('[WEBHOOK] ✅ Body parseado com sucesso!')

    console.log("📩 Webhook recebido:", JSON.stringify(body, null, 2));

    // Extrai informações da mensagem para exibir no dashboard
    try {
      const entry = body.entry?.[0]
      const change = entry?.changes?.[0]
      const value = change?.value
      const message = value?.messages?.[0]
      
      console.log('🔍 Extraindo mensagem...')
      console.log('  entry:', entry ? '✅' : '❌')
      console.log('  change:', change ? '✅' : '❌')
      console.log('  value:', value ? '✅' : '❌')
      console.log('  message:', message ? '✅' : '❌')
      
      if (message) {
        const contact = value?.contacts?.[0]
        
        const webhookMessage = {
          id: message.id || `msg-${Date.now()}`,
          timestamp: new Date().toISOString(),
          from: message.from,
          name: contact?.profile?.name || 'Unknown',
          type: message.type,
          content: message.text?.body || 
                   message.image?.caption || 
                   message.audio?.id ||
                   message.type,
          raw: body
        }
        
        console.log('✅ Mensagem extraída:', webhookMessage)
        
        // Adiciona ao cache em memória
        addWebhookMessage(webhookMessage)
        
        console.log(`📥 Mensagem capturada e adicionada ao cache: ${webhookMessage.from} - ${webhookMessage.content}`)
      } else {
        console.log('⚠️ Nenhuma mensagem encontrada no payload (pode ser status update)')
      }
    } catch (parseError) {
      console.error('❌ Erro ao extrair dados da mensagem:', parseError)
    }

    console.log('[WEBHOOK] ✅ Extração concluída, agora vai processar chatbot flow...')
    console.log('[WEBHOOK] ⚡⚡⚡ CHAMANDO processChatbotMessage AGORA! ⚡⚡⚡')

    // MUDANÇA CRÍTICA: Aguardar processamento completar
    // Razão: Em serverless, processo pode terminar antes de NODE 3 completar
    // Isso causava queries "órfãs" que nunca retornavam
    try {
      const result = await processChatbotMessage(body)
      console.log('[WEBHOOK] ✅ Processamento concluído com sucesso!')
      console.log('[WEBHOOK] Resultado:', JSON.stringify(result, null, 2))
    } catch (error) {
      console.error('[WEBHOOK] ❌❌❌ ERRO NO PROCESSAMENTO ❌❌❌')
      console.error('[WEBHOOK] Error name:', error?.name)
      console.error('[WEBHOOK] Error message:', error?.message)
      console.error('[WEBHOOK] Error stack:', error?.stack)
      console.error('[WEBHOOK] Full error:', error)
      // Continua e retorna 200 mesmo com erro (Meta requer isso)
    }

    // Confirma o recebimento (após processamento completar)
    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  } catch (err) {
    console.error("Erro ao processar POST do webhook:", err);
    return new NextResponse("Erro interno", { status: 500 });
  }
}

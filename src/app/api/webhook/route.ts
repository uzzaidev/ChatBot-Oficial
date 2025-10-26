import { NextRequest, NextResponse } from "next/server";
import { createExecutionLogger } from '@/lib/logger'
import { processChatbotMessage } from '@/flows/chatbotFlow'
import { addWebhookMessage } from '@/lib/webhookCache'

/**
 * GET - usado pela Meta para verificar e ativar o webhook (hub.challenge)
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN; // definido no .env

    // Verifica se o token e o modo estão corretos
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ Webhook verificado com sucesso pela Meta!");
      return new NextResponse(challenge, { status: 200 });
    } else {
      console.warn("❌ Falha na verificação do webhook");
      return new NextResponse("Erro de verificação", { status: 403 });
    }
  } catch (err) {
    console.error("Erro ao processar GET do webhook:", err);
    return new NextResponse("Erro interno", { status: 500 });
  }
}

/**
 * POST - usado pela Meta para enviar mensagens e atualizações
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

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

    // Cria logger para esta execução
    const logger = createExecutionLogger()
    const executionId = logger.startExecution({
      source: 'whatsapp-webhook',
      webhook_payload: body,
    })

    console.log(`[WEBHOOK] Starting execution: ${executionId}`)

    // Processa mensagem de forma assíncrona (não bloqueia resposta)
    processChatbotMessage(body)
      .then(async (result) => {
        console.log(`[WEBHOOK] Execution ${executionId} completed:`, result)
        await logger.finishExecution(result.success ? 'success' : 'error')
      })
      .catch(async (error) => {
        console.error(`[WEBHOOK] Execution ${executionId} failed:`, error)
        await logger.finishExecution('error')
      })

    // Confirma o recebimento imediatamente (importante: SEM esperar processamento)
    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  } catch (err) {
    console.error("Erro ao processar POST do webhook:", err);
    return new NextResponse("Erro interno", { status: 500 });
  }
}

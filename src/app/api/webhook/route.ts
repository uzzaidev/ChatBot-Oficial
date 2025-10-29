import { NextRequest, NextResponse } from "next/server";
import { processChatbotMessage } from '@/flows/chatbotFlow'
import { addWebhookMessage } from '@/lib/webhookCache'
import { getWebhookBaseUrl } from '@/lib/config'

/**
 * GET - usado pela Meta para verificar e ativar o webhook (hub.challenge)
 *
 * ⚠️ DEPRECATED: Este webhook legacy não é mais suportado
 * Use: /api/webhook/{client_id}
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const challenge = url.searchParams.get("hub.challenge");

    console.error('❌ [WEBHOOK GET] DEPRECATED: Este endpoint não é mais suportado')
    console.error('📋 [WEBHOOK GET] AÇÃO NECESSÁRIA: Migre para /api/webhook/{client_id}')
    console.error(`📋 [WEBHOOK GET] Acesse ${getWebhookBaseUrl()}/dashboard/settings para obter sua webhook URL`)

    // Retornar erro em formato JSON para facilitar debug
    return new NextResponse(
      JSON.stringify({
        error: 'DEPRECATED_ENDPOINT',
        message: 'This webhook endpoint is deprecated and no longer supported.',
        action: 'Please update your Meta webhook URL to include your client_id',
        new_format: `${getWebhookBaseUrl()}/api/webhook/{client_id}`,
        instructions: [
          '1. Login to dashboard: ' + getWebhookBaseUrl() + '/dashboard',
          '2. Go to Settings → Environment Variables',
          '3. Copy the complete Webhook URL with your client_id',
          '4. Update in Meta Dashboard: https://developers.facebook.com/apps/',
        ],
        received_params: {
          mode,
          has_challenge: !!challenge,
        },
      }),
      {
        status: 410, // 410 Gone - Resource permanently removed
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
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

    // ⚠️ DEPRECATED: Este webhook legacy (/api/webhook) não é mais suportado
    //
    // MIGRAÇÃO OBRIGATÓRIA: Configure o webhook com client_id na URL
    // Novo formato: {WEBHOOK_BASE_URL}/api/webhook/{client_id}
    //
    // Onde encontrar seu client_id:
    // 1. Faça login no dashboard: https://chat.luisfboff.com/dashboard
    // 2. Vá em Configurações → Variáveis de Ambiente
    // 3. Copie a Webhook URL completa com seu client_id
    // 4. Configure no Meta Dashboard: https://developers.facebook.com/apps/
    //
    // Ver endpoint novo: src/app/api/webhook/[clientId]/route.ts
    console.error('❌ [WEBHOOK] DEPRECATED: Este endpoint não usa mais .env fallback')
    console.error('📋 [WEBHOOK] AÇÃO NECESSÁRIA: Migre para /api/webhook/{client_id}')
    console.error(`📋 [WEBHOOK] Acesse ${getWebhookBaseUrl()}/dashboard/settings para obter sua webhook URL`)

    return new NextResponse(
      JSON.stringify({
        error: 'DEPRECATED_ENDPOINT',
        message: 'This webhook endpoint is deprecated and no longer supported.',
        action: 'Please update your Meta webhook URL to include your client_id',
        new_format: `${getWebhookBaseUrl()}/api/webhook/{client_id}`,
        instructions: [
          '1. Login to dashboard: ' + getWebhookBaseUrl() + '/dashboard',
          '2. Go to Settings → Environment Variables',
          '3. Copy the complete Webhook URL with your client_id',
          '4. Update in Meta Dashboard: https://developers.facebook.com/apps/',
        ],
        documentation: 'All credentials must now be configured in /dashboard/settings (no .env fallback)',
      }),
      {
        status: 410, // 410 Gone - Resource permanently removed
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err) {
    console.error("Erro ao processar POST do webhook:", err);
    return new NextResponse("Erro interno", { status: 500 });
  }
}

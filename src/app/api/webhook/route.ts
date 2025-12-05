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
    return new NextResponse("Erro interno", { status: 500 })
  }
}

/**
 * POST - usado pela Meta para enviar mensagens e atualizações
 */
export async function POST(req: NextRequest) {
  // LOG CRÍTICO: Este deve SEMPRE aparecer quando webhook é chamado
  
  try {
    const body = await req.json();


    // Extrai informações da mensagem para exibir no dashboard
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
          content: message.text?.body || 
                   message.image?.caption || 
                   message.audio?.id ||
                   message.type,
          raw: body
        }
        
        
        // Adiciona ao cache em memória
        addWebhookMessage(webhookMessage)
        
      } else {
      }
    } catch (parseError) {
    }


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
    return new NextResponse("Erro interno", { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getRecentWebhookMessages } from '@/lib/webhookCache'

export const dynamic = 'force-dynamic'

/**
 * GET /api/webhook/received
 * Lista as últimas mensagens recebidas DIRETO do webhook (em memória)
 * Não depende do banco de dados - mostra o que está chegando em tempo real
 */
export async function GET(request: NextRequest) {
  try {
    const messages = getRecentWebhookMessages()

    // Removido console.log para não poluir logs de produção
    return NextResponse.json({ 
      messages,
      count: messages.length 
    })
  } catch (error: any) {
    console.error('[WEBHOOK RECEIVED API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch received messages', details: error.message },
      { status: 500 }
    )
  }
}

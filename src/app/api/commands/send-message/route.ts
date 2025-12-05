import { NextRequest, NextResponse } from 'next/server'
import type { SendMessageRequest } from '@/lib/types'
import { sendWhatsAppMessage } from '@/nodes/sendWhatsAppMessage'
import { saveChatMessage } from '@/nodes/saveChatMessage'
import { getClientIdFromSession } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/commands/send-message
 *
 * Envia mensagem manual pelo dashboard para WhatsApp
 *
 * FASE 3: Agora usa client_id da sessão (autenticação)
 *
 * Fluxo:
 * 1. Obtém client_id do usuário autenticado
 * 2. Valida input (phone, content)
 * 3. Envia mensagem via Meta WhatsApp API (sendWhatsAppMessage node)
 * 4. Salva mensagem no histórico com type: 'ai' (saveChatMessage node)
 *
 * NOTA: type: 'ai' será mudado para 'atendente' no futuro
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {

    // 🔐 FASE 3: Obter client_id da sessão do usuário autenticado
    const clientId = await getClientIdFromSession(request as any)

    if (!clientId) {
      return NextResponse.json(
        { error: 'Unauthorized - client_id not found in session' },
        { status: 401 }
      )
    }


    const body = (await request.json()) as SendMessageRequest
    const { phone, content } = body

    // Validação
    if (!phone || !content) {
      return NextResponse.json(
        { error: 'phone e content são obrigatórios' },
        { status: 400 }
      )
    }


    // Buscar config do cliente autenticado
    const { getClientConfig } = await import('@/lib/config')
    const config = await getClientConfig(clientId)

    if (!config) {
      return NextResponse.json({ error: 'Client configuration not found' }, { status: 404 })
    }

    // NODE 12: Envia mensagem via WhatsApp
    const messageIds = await sendWhatsAppMessage({
      phone,
      messages: [content], // Array com uma mensagem
      config, // 🔐 Passa config
    })

    const duration = Date.now() - startTime

    // Salvar no histórico com type: 'ai'
    await saveChatMessage({
      phone,
      message: content,
      type: 'ai', // TODO: Mudar para 'atendente' no futuro
      clientId: config.id, // 🔐 Multi-tenant: Associa mensagem ao cliente
    })

    const totalDuration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      message: 'Mensagem enviada com sucesso',
      data: {
        messageIds,
        phone,
        content,
        savedToHistory: true,
        duration: totalDuration,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'

    return NextResponse.json(
      {
        error: 'Erro ao enviar mensagem',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}

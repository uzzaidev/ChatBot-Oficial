import { NextRequest, NextResponse } from 'next/server'
import { sendWhatsAppMessage } from '@/nodes/sendWhatsAppMessage'

export const dynamic = 'force-dynamic'

/**
 * POST /api/test/nodes/send-whatsapp
 * Testa o node sendWhatsAppMessage isoladamente
 * 
 * FASE 3: Requer clientId no body (não usa mais DEFAULT_CLIENT_ID)
 */
export async function POST(request: NextRequest) {
  try {
    const { input, clientId } = await request.json()

    if (!clientId) {
      return NextResponse.json(
        { 
          error: 'clientId is required',
          message: 'Provide clientId in request body. Example: { "clientId": "b21b314f-...", "input": {...} }',
          note: 'DEFAULT_CLIENT_ID is no longer used. All API routes now require authentication or explicit clientId.',
        },
        { status: 400 }
      )
    }

    if (!input || !input.phone || !input.messages) {
      return NextResponse.json(
        { 
          error: 'Input must contain: phone (string) and messages (array)' 
        },
        { status: 400 }
      )
    }

    // Buscar config do cliente especificado
    const { getClientConfig } = await import('@/lib/config')
    const config = await getClientConfig(clientId)

    if (!config) {
      return NextResponse.json(
        { error: `Client config not found for clientId: ${clientId}` }, 
        { status: 404 }
      )
    }

    const output = await sendWhatsAppMessage({
      phone: input.phone,
      messages: input.messages,
      config, // 🔐 Passa config
    })

    return NextResponse.json({
      success: true,
      output,
      info: `${output.length} mensagem(ns) enviada(s) com sucesso`,
    })
  } catch (error: any) {
    console.error('[TEST sendWhatsAppMessage] Error:', error)
    return NextResponse.json(
      { error: error.message, details: error.stack },
      { status: 500 }
    )
  }
}

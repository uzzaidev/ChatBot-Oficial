import { NextRequest, NextResponse } from 'next/server'
import { getChatHistory } from '@/nodes/getChatHistory'

export const dynamic = 'force-dynamic'

/**
 * POST /api/test/nodes/chat-history
 * Testa o node getChatHistory isoladamente
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
          message: 'Provide clientId in request body. Example: { "clientId": "b21b314f-...", "input": "phone" }',
          note: 'DEFAULT_CLIENT_ID is no longer used. All API routes now require authentication or explicit clientId.',
        },
        { status: 400 }
      )
    }

    if (!input) {
      return NextResponse.json(
        { error: 'Input required (phone as string)' },
        { status: 400 }
      )
    }

    // Input pode ser string (phone) ou objeto com phone
    const phone = typeof input === 'string' ? input : input.phone

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number required' },
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

    // Executa o node
    const output = await getChatHistory({
      phone,
      clientId: config.id, // 🔐 Multi-tenant: Filtra mensagens do cliente
    })

    return NextResponse.json({
      success: true,
      output,
      info: `Histórico recuperado: ${output.length} mensagens`,
    })
  } catch (error: any) {
    console.error('[TEST getChatHistory] Error:', error)
    return NextResponse.json(
      { error: error.message, details: error.stack },
      { status: 500 }
    )
  }
}

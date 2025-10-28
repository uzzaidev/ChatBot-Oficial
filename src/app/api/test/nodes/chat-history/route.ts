import { NextRequest, NextResponse } from 'next/server'
import { getChatHistory } from '@/nodes/getChatHistory'

export const dynamic = 'force-dynamic'

/**
 * POST /api/test/nodes/chat-history
 * Testa o node getChatHistory isoladamente
 */
export async function POST(request: NextRequest) {
  try {
    const { input } = await request.json()

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

    // Buscar config para teste
    const { getClientConfigWithFallback } = await import('@/lib/config')
    const config = await getClientConfigWithFallback(process.env.DEFAULT_CLIENT_ID)

    if (!config) {
      return NextResponse.json({ error: 'Failed to load client config' }, { status: 500 })
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

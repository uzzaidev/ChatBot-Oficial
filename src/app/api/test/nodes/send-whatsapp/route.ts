import { NextRequest, NextResponse } from 'next/server'
import { sendWhatsAppMessage } from '@/nodes/sendWhatsAppMessage'

export const dynamic = 'force-dynamic'

/**
 * POST /api/test/nodes/send-whatsapp
 * Testa o node sendWhatsAppMessage isoladamente
 */
export async function POST(request: NextRequest) {
  try {
    const { input } = await request.json()

    if (!input || !input.phone || !input.messages) {
      return NextResponse.json(
        { 
          error: 'Input must contain: phone (string) and messages (array)' 
        },
        { status: 400 }
      )
    }

    // Executa o node
    // Buscar config para teste
    const { getClientConfigWithFallback } = await import('@/lib/config')
    const config = await getClientConfigWithFallback(process.env.DEFAULT_CLIENT_ID)

    if (!config) {
      return NextResponse.json({ error: 'Failed to load client config' }, { status: 500 })
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

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
    const output = await sendWhatsAppMessage({
      phone: input.phone,
      messages: input.messages,
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

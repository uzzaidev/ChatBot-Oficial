import { NextRequest, NextResponse } from 'next/server'
import { sendTextMessage } from '@/lib/meta'

export const dynamic = 'force-dynamic'

/**
 * Endpoint SIMPLIFICADO para testar APENAS o envio de mensagem
 * Pula todos os nodes do chatbot e vai direto pro WhatsApp
 * 
 * POST /api/test/send-whatsapp-direct
 * Body: {
 *   phone: "5511999999999",
 *   message: "Mensagem de teste"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validação básica
    if (!body.phone || !body.message) {
      return NextResponse.json(
        { error: 'Missing required fields: phone, message' },
        { status: 400 }
      )
    }


    // Envia direto pro WhatsApp (sem passar por nenhum node)
    const result = await sendTextMessage(body.phone, body.message)


    return NextResponse.json({
      success: true,
      message_id: result.messageId,
      data: {
        phone: body.phone,
        message: body.message,
        whatsapp_message_id: result.messageId,
      },
    })
  } catch (error: any) {
    console.error('[TEST DIRECT] ❌ Error sending message:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to send WhatsApp message',
        details: error.message,
        stack: error.stack,
      },
      { status: 500 }
    )
  }
}

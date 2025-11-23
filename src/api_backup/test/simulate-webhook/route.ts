import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/test/simulate-webhook
 * Simula uma mensagem recebida do WhatsApp (como se fosse o Meta enviando)
 * 
 * Body: {
 *   from: "5511999999999",
 *   text: "mensagem teste",
 *   name?: "Nome Usuario"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.from || !body.text) {
      return NextResponse.json(
        { error: 'Missing required fields: from, text' },
        { status: 400 }
      )
    }

    // Cria payload exatamente como o Meta envia
    const metaPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'test-entry',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '5511000000000',
                  phone_number_id: process.env.META_PHONE_NUMBER_ID || 'test-phone-id',
                },
                contacts: [
                  {
                    profile: {
                      name: body.name || 'Test User',
                    },
                    wa_id: body.from,
                  },
                ],
                messages: [
                  {
                    from: body.from,
                    id: `wamid.test-${Date.now()}`,
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    type: 'text',
                    text: {
                      body: body.text,
                    },
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    }


    // Envia para o próprio webhook
    const webhookUrl = `${request.nextUrl.origin}/api/webhook`
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metaPayload),
    })

    const result = await response.text()

    return NextResponse.json({
      success: response.ok,
      message: 'Webhook simulado enviado',
      webhook_response: result,
      payload_sent: metaPayload,
    })
  } catch (error: any) {
    console.error('[SIMULATE WEBHOOK] Error:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to simulate webhook',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

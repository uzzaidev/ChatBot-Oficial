import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Endpoint de teste para simular mensagens do WhatsApp
 * Permite testar todo o fluxo sem precisar enviar mensagens reais
 * 
 * POST /api/test/send-message
 * Body: {
 *   from: "5511999999999",
 *   text: "Olá, preciso de ajuda",
 *   name?: "Nome do Usuario"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validação básica
    if (!body.from || !body.text) {
      return NextResponse.json(
        { error: 'Missing required fields: from, text' },
        { status: 400 }
      )
    }

    // Simula envio para o webhook real (que já tem toda a lógica)
    const webhookUrl = `${request.nextUrl.origin}/api/webhook`
    
    const mockPayload = {
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
                    id: `test-msg-${Date.now()}`,
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

    // Envia para o webhook interno
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockPayload),
    })

    // Webhook retorna texto simples "EVENT_RECEIVED", não JSON
    const result = await response.text()

    return NextResponse.json({
      success: response.ok,
      message: `Test message sent to webhook`,
      webhook_response: result,
      data: {
        from: body.from,
        text: body.text,
        name: body.name || 'Test User',
      },
    })
  } catch (error: any) {
    console.error('[TEST] Error processing test message:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to process test message',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

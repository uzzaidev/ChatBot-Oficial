import { NextRequest, NextResponse } from 'next/server'
import { checkOrCreateCustomer } from '@/nodes/checkOrCreateCustomer'

export const dynamic = 'force-dynamic'

/**
 * POST /api/test/nodes/check-customer
 * Testa o node checkOrCreateCustomer isoladamente
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

    if (!input || !input.phone) {
      return NextResponse.json(
        { error: 'Input must contain phone and name' },
        { status: 400 }
      )
    }

    // Executa o node
    const output = await checkOrCreateCustomer({
      phone: input.phone,
      name: input.name || 'Unknown',
      clientId, // 🔐 FASE 3: clientId obrigatório
    })

    return NextResponse.json({
      success: true,
      output,
      info: `Cliente verificado - Status: ${output.status}`,
    })
  } catch (error: any) {
    console.error('[TEST checkOrCreateCustomer] Error:', error)
    return NextResponse.json(
      { error: error.message, details: error.stack },
      { status: 500 }
    )
  }
}

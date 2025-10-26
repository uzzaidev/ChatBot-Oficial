import { NextRequest, NextResponse } from 'next/server'
import { checkOrCreateCustomer } from '@/nodes/checkOrCreateCustomer'

export const dynamic = 'force-dynamic'

/**
 * POST /api/test/nodes/check-customer
 * Testa o node checkOrCreateCustomer isoladamente
 */
export async function POST(request: NextRequest) {
  try {
    const { input } = await request.json()

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

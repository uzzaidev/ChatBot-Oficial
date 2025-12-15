import { NextRequest, NextResponse } from 'next/server'
import { batchMessages } from '@/nodes/batchMessages'

export const dynamic = 'force-dynamic'

/**
 * POST /api/test/nodes/batch
 * Testa o node batchMessages isoladamente
 */
export async function POST(request: NextRequest) {
  try {
    const { input } = await request.json()

    if (!input) {
      return NextResponse.json(
        { error: 'Input required (phone as string or object with phone and clientId)' },
        { status: 400 }
      )
    }

    // Input pode ser string (phone) ou objeto com phone e clientId
    const phone = typeof input === 'string' ? input : input.phone
    const clientId = typeof input === 'object' ? input.clientId : 'default_client_id'

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number required' },
        { status: 400 }
      )
    }

    // Executa o node
    const output = await batchMessages(phone, clientId)

    return NextResponse.json({
      success: true,
      output,
      info: output 
        ? `Batched content (${output.length} caracteres)` 
        : 'Nenhuma mensagem no batch (lock exists ou delay não atingido)',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message, details: error.stack },
      { status: 500 }
    )
  }
}

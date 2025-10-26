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

    // Executa o node
    const output = await batchMessages(phone)

    return NextResponse.json({
      success: true,
      output,
      info: output 
        ? `Batched content (${output.length} caracteres)` 
        : 'Nenhuma mensagem no batch',
    })
  } catch (error: any) {
    console.error('[TEST batchMessages] Error:', error)
    return NextResponse.json(
      { error: error.message, details: error.stack },
      { status: 500 }
    )
  }
}

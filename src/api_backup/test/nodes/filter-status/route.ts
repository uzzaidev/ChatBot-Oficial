import { NextRequest, NextResponse } from 'next/server'
import { filterStatusUpdates } from '@/nodes/filterStatusUpdates'

export const dynamic = 'force-dynamic'

/**
 * POST /api/test/nodes/filter-status
 * Testa o node filterStatusUpdates isoladamente
 */
export async function POST(request: NextRequest) {
  try {
    const { input } = await request.json()

    if (!input) {
      return NextResponse.json(
        { error: 'Input payload required' },
        { status: 400 }
      )
    }

    // Executa o node
    const output = filterStatusUpdates(input)

    return NextResponse.json({
      success: true,
      output,
      info: output 
        ? 'Mensagem válida (não é status update)' 
        : 'Mensagem filtrada (status update ou inválida)',
    })
  } catch (error: any) {
    console.error('[TEST filterStatusUpdates] Error:', error)
    return NextResponse.json(
      { error: error.message, details: error.stack },
      { status: 500 }
    )
  }
}

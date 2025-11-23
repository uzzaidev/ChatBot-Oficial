import { NextRequest, NextResponse } from 'next/server'
import { parseMessage } from '@/nodes/parseMessage'

export const dynamic = 'force-dynamic'

/**
 * POST /api/test/nodes/parse-message
 * Testa o node parseMessage isoladamente
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
    const output = parseMessage(input)

    return NextResponse.json({
      success: true,
      output,
      info: `Mensagem parseada: ${output.type} de ${output.name} (${output.phone})`,
    })
  } catch (error: any) {
    console.error('[TEST parseMessage] Error:', error)
    return NextResponse.json(
      { error: error.message, details: error.stack },
      { status: 500 }
    )
  }
}

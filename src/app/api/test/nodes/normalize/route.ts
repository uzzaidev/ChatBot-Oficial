import { NextRequest, NextResponse } from 'next/server'
import { normalizeMessage } from '@/nodes/normalizeMessage'

export const dynamic = 'force-dynamic'

/**
 * POST /api/test/nodes/normalize
 * Testa o node normalizeMessage isoladamente
 * 
 * NOTA: Este node precisa do output do parseMessage (node 2)
 * Se você executou nodes intermediários (3, 4), ele tentará buscar
 * o parsedMessage do input anterior
 */
export async function POST(request: NextRequest) {
  try {
    const { input } = await request.json()

    if (!input) {
      return NextResponse.json(
        { error: 'Input required' },
        { status: 400 }
      )
    }

    // Caso 1: Input já está no formato correto (tem parsedMessage)
    if (input.parsedMessage) {
      const output = normalizeMessage({
        parsedMessage: input.parsedMessage,
        processedContent: input.processedContent || input.parsedMessage.content,
      })

      return NextResponse.json({
        success: true,
        output,
        info: `Mensagem normalizada: ${output.content.substring(0, 50)}...`,
      })
    }

    // Caso 2: Input é um ParsedMessage direto (vindo do node 2)
    if (input.phone && input.type && input.name) {
      const output = normalizeMessage({
        parsedMessage: input,
        processedContent: input.content,
      })

      return NextResponse.json({
        success: true,
        output,
        info: `Mensagem normalizada: ${output.content.substring(0, 50)}...`,
      })
    }

    // Caso 3: Input veio de outro node (ex: checkCustomer)
    // Precisa que o frontend passe o parsedMessage do node 2
    return NextResponse.json(
      { 
        error: 'Este node precisa do output do parseMessage (Node 2). Execute o Node 2 primeiro ou forneça parsedMessage no input.',
        received: Object.keys(input),
      },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('[TEST normalizeMessage] Error:', error)
    return NextResponse.json(
      { error: error.message, details: error.stack },
      { status: 500 }
    )
  }
}

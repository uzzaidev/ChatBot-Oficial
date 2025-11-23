import { NextRequest, NextResponse } from 'next/server'
import { formatResponse } from '@/nodes/formatResponse'

export const dynamic = 'force-dynamic'

/**
 * POST /api/test/nodes/format-response
 * Testa o node formatResponse isoladamente
 */
export async function POST(request: NextRequest) {
  try {
    const { input } = await request.json()

    if (!input) {
      return NextResponse.json(
        { error: 'Input must contain AI response content (string)' },
        { status: 400 }
      )
    }

    // Se input é objeto, tenta pegar .content; se é string, usa diretamente
    const responseContent = typeof input === 'string' ? input : input.content || input

    // Executa o node
    const output = formatResponse(responseContent)

    return NextResponse.json({
      success: true,
      output,
      info: `Resposta formatada em ${output.length} mensagem(ns)`,
    })
  } catch (error: any) {
    console.error('[TEST formatResponse] Error:', error)
    return NextResponse.json(
      { error: error.message, details: error.stack },
      { status: 500 }
    )
  }
}

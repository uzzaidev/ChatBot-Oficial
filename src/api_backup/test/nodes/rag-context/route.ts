import { NextRequest, NextResponse } from 'next/server'
import { getRAGContext } from '@/nodes/getRAGContext'

export const dynamic = 'force-dynamic'

/**
 * POST /api/test/nodes/rag-context
 * Testa o node getRAGContext isoladamente
 */
export async function POST(request: NextRequest) {
  try {
    const { input } = await request.json()

    if (!input) {
      return NextResponse.json(
        { error: 'Input must contain message content' },
        { status: 400 }
      )
    }

    // Se input é string, usa diretamente; se é objeto, tenta pegar .content
    const messageContent = typeof input === 'string' ? input : input.content || input

    // Executa o node
    const output = await getRAGContext(messageContent)

    return NextResponse.json({
      success: true,
      output,
      info: `RAG context recuperado: ${output.length} caracteres`,
    })
  } catch (error: any) {
    console.error('[TEST getRAGContext] Error:', error)
    return NextResponse.json(
      { error: error.message, details: error.stack },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { downloadMetaMedia } from '@/nodes/downloadMetaMedia'

export const dynamic = 'force-dynamic'

/**
 * POST /api/test/nodes/download-media
 * Testa o node downloadMetaMedia isoladamente
 */
export async function POST(request: NextRequest) {
  try {
    const { input } = await request.json()

    if (!input || !input.mediaId) {
      return NextResponse.json(
        { error: 'Input must contain mediaId (string)' },
        { status: 400 }
      )
    }

    // Executa o node
    const output = await downloadMetaMedia(input.mediaId)

    return NextResponse.json({
      success: true,
      output: {
        buffer: `<Buffer ${output.length} bytes>`,
        size: output.length,
      },
      info: `Mídia baixada: ${output.length} bytes`,
    })
  } catch (error: any) {
    console.error('[TEST downloadMetaMedia] Error:', error)
    return NextResponse.json(
      { error: error.message, details: error.stack },
      { status: 500 }
    )
  }
}

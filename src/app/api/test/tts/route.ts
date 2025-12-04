// src/app/api/test/tts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { convertTextToSpeech } from '@/nodes/convertTextToSpeech'

export const dynamic = 'force-dynamic'

/**
 * Endpoint de teste para TTS
 *
 * Uso:
 * curl -X POST http://localhost:3000/api/test/tts \
 *   -H "Content-Type: application/json" \
 *   -d '{"text": "Olá! Como posso ajudar você hoje?", "voice": "alloy"}' \
 *   --output test.mp3
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, voice = 'alloy', speed = 1.0 } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "text" parameter' },
        { status: 400 }
      )
    }

    // Usar clientId de teste
    const { audioBuffer, format, fromCache, durationSeconds } = await convertTextToSpeech({
      text,
      clientId: 'test-client',
      voice,
      speed,
      useCache: false // Não usar cache em testes
    })

    return new Response(Buffer.from(audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="tts-test-${Date.now()}.mp3"`,
        'X-Audio-Duration': durationSeconds.toString(),
        'X-From-Cache': fromCache.toString()
      }
    })
  } catch (error) {
    console.error('[Test TTS] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate audio',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint para testar com query params
 *
 * Uso:
 * http://localhost:3000/api/test/tts?text=Olá+mundo&voice=nova&speed=1.2
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const text = searchParams.get('text')
    const voice = searchParams.get('voice') || 'alloy'
    const speed = parseFloat(searchParams.get('speed') || '1.0')

    if (!text) {
      return NextResponse.json(
        { error: 'Missing "text" query parameter' },
        { status: 400 }
      )
    }

    const { audioBuffer, durationSeconds, fromCache } = await convertTextToSpeech({
      text,
      clientId: 'test-client',
      voice,
      speed,
      useCache: false
    })

    return new Response(Buffer.from(audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="tts-test.mp3"`,
        'X-Audio-Duration': durationSeconds.toString(),
        'X-From-Cache': fromCache.toString()
      }
    })
  } catch (error) {
    console.error('[Test TTS GET] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate audio',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

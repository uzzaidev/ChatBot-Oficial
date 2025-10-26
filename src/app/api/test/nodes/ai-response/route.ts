import { NextRequest, NextResponse } from 'next/server'
import { generateAIResponse } from '@/nodes/generateAIResponse'

export const dynamic = 'force-dynamic'

/**
 * POST /api/test/nodes/ai-response
 * Testa o node generateAIResponse isoladamente
 */
export async function POST(request: NextRequest) {
  try {
    const { input } = await request.json()

    if (!input || !input.message) {
      return NextResponse.json(
        { 
          error: 'Input must contain: message, chatHistory (array), ragContext (string), customerName' 
        },
        { status: 400 }
      )
    }

    // Valida e sanitiza chatHistory
    let chatHistory = input.chatHistory || []
    
    // Garante que chatHistory é array e cada item tem role e content válidos
    if (Array.isArray(chatHistory)) {
      chatHistory = chatHistory.filter((msg: any) => {
        return msg && 
               typeof msg === 'object' &&
               (msg.role === 'user' || msg.role === 'assistant') &&
               typeof msg.content === 'string' &&
               msg.content.trim().length > 0
      })
    } else {
      chatHistory = []
    }

    // Valida message
    const message = typeof input.message === 'string' 
      ? input.message.trim() 
      : String(input.message || '')

    if (!message) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      )
    }

    // Valida ragContext
    const ragContext = typeof input.ragContext === 'string'
      ? input.ragContext
      : ''

    // Executa o node
    console.log('[AI Response Test] Input validation:', {
      messageType: typeof message,
      messageLength: message.length,
      chatHistoryLength: chatHistory.length,
      ragContextLength: ragContext.length,
      customerName: input.customerName || 'Cliente',
    })

    const output = await generateAIResponse({
      message,
      chatHistory,
      ragContext,
      customerName: input.customerName || 'Cliente',
    })

    return NextResponse.json({
      success: true,
      output,
      info: output.content 
        ? `AI response gerada: ${output.content.substring(0, 50)}...` 
        : 'AI response vazia',
    })
  } catch (error: any) {
    console.error('[TEST generateAIResponse] Error:', error)
    return NextResponse.json(
      { error: error.message, details: error.stack },
      { status: 500 }
    )
  }
}

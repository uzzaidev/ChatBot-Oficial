import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * API de teste para broadcast
 *
 * Insere uma mensagem de teste e verifica se o broadcast foi emitido
 *
 * GET /api/test/broadcast?phone=555499250023&client_id=uuid
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')
    const clientId = searchParams.get('client_id')

    if (!phone || !clientId) {
      return NextResponse.json(
        { error: 'Missing phone or client_id' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Inserir mensagem de teste
    const testMessage = {
      type: 'ai',
      content: `🧪 Teste de broadcast em tempo real - ${new Date().toLocaleTimeString()}`
    }

    const { data, error } = await supabase
      .from('n8n_chat_histories')
      .insert({
        session_id: phone,
        message: testMessage,
        client_id: clientId,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Erro ao inserir mensagem de teste:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Mensagem de teste inserida com sucesso!',
      data,
      instructions: [
        '1. Abra o console (F12) na aba da conversa',
        '2. Procure por: ✅ [Realtime] Broadcast received:',
        '3. A mensagem deve aparecer automaticamente na tela',
        '4. Se não aparecer, verifique os logs do console'
      ]
    })
  } catch (error) {
    console.error('❌ Erro no teste de broadcast:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

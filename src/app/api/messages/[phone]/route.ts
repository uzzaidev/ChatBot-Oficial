import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { cleanMessageContent } from '@/lib/utils'
import type { Message } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: {
    phone: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { phone } = params
    const searchParams = request.nextUrl.searchParams
    const clientId = searchParams.get('client_id')
    const limit = parseInt(searchParams.get('limit') || '100')

    if (!clientId) {
      return NextResponse.json(
        { error: 'client_id é obrigatório' },
        { status: 400 }
      )
    }

    if (!phone) {
      return NextResponse.json(
        { error: 'phone é obrigatório' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Buscar histórico do n8n_chat_histories
    const { data, error } = await supabase
      .from('n8n_chat_histories')
      .select('*')
      .eq('session_id', phone)
      .order('id', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('Erro ao buscar mensagens:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar mensagens' },
        { status: 500 }
      )
    }

    // Transformar dados do n8n_chat_histories para formato Message
    const messages: Message[] = (data || []).map((item: any, index: number) => {
      const messageData = item.message || {}
      const messageType = messageData.type || 'ai'
      const messageContent = messageData.content || ''

      // Limpar tags de function calls
      const cleanedContent = cleanMessageContent(messageContent)

      return {
        id: item.id?.toString() || `msg-${index}`,
        client_id: clientId,
        conversation_id: String(phone),
        phone: String(phone),
        name: messageType === 'human' ? 'Cliente' : 'Bot',
        content: cleanedContent,
        type: 'text' as const,
        direction: messageType === 'human' ? ('incoming' as const) : ('outgoing' as const),
        status: 'sent' as const,
        timestamp: new Date().toISOString(),
        metadata: null,
      }
    })

    return NextResponse.json({
      messages,
      total: messages.length,
      phone,
    })
  } catch (error) {
    console.error('Erro inesperado:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

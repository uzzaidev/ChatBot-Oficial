import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { ConversationWithCount } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const clientId = searchParams.get('client_id')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!clientId) {
      return NextResponse.json(
        { error: 'client_id é obrigatório' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Buscar apenas clientes que TÊM mensagens no histórico
    // Primeiro, buscar telefones únicos que têm mensagens
    const { data: phonesWithMessages, error: phonesError } = await supabase
      .from('n8n_chat_histories')
      .select('session_id')
      .not('session_id', 'is', null)

    if (phonesError) {
      console.error('Erro ao buscar telefones com mensagens:', phonesError)
      return NextResponse.json(
        { error: 'Erro ao buscar telefones com mensagens' },
        { status: 500 }
      )
    }

    // Extrair lista única de telefones
    const uniquePhones = Array.from(new Set((phonesWithMessages || []).map((item: any) => item.session_id)))

    if (uniquePhones.length === 0) {
      return NextResponse.json({
        conversations: [],
        total: 0,
        limit,
        offset,
      })
    }

    // Buscar dados dos clientes que têm mensagens
    let dataQuery = supabase
      .from('Clientes WhatsApp')
      .select('*')
      .in('telefone', uniquePhones)

    // Filtrar por status se fornecido
    if (status) {
      dataQuery = dataQuery.eq('status', status)
    }

    const { data, error } = await dataQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Erro ao buscar conversas:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar conversas' },
        { status: 500 }
      )
    }

    // Buscar última mensagem e contagem para cada cliente
    const conversationsWithMessages = await Promise.all(
      (data || []).map(async (cliente: any) => {
        const telefoneStr = String(cliente.telefone)

        // Buscar última mensagem
        const { data: lastMsg } = await supabase
          .from('n8n_chat_histories')
          .select('message, created_at')
          .eq('session_id', telefoneStr)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        // Buscar contagem de mensagens
        const { count } = await supabase
          .from('n8n_chat_histories')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', telefoneStr)

        // Parse última mensagem (JSON do LangChain)
        let lastMessageContent = ''
        let lastMessageTimestamp = cliente.created_at

        if (lastMsg) {
          try {
            const msgData = typeof lastMsg.message === 'string'
              ? JSON.parse(lastMsg.message)
              : lastMsg.message
            lastMessageContent = msgData.content || ''
            lastMessageTimestamp = lastMsg.created_at
          } catch {
            lastMessageContent = ''
          }
        }

        return {
          id: telefoneStr,
          client_id: clientId,
          phone: telefoneStr,
          name: cliente.nome || 'Sem nome',
          status: cliente.status || 'bot',
          last_message: lastMessageContent.substring(0, 100), // Limitar a 100 chars
          last_update: lastMessageTimestamp || new Date().toISOString(),
          created_at: cliente.created_at || new Date().toISOString(),
          message_count: count || 0,
          assigned_to: null,
        }
      })
    )

    // Ordenar por última atualização
    const conversations = conversationsWithMessages.sort((a, b) =>
      new Date(b.last_update).getTime() - new Date(a.last_update).getTime()
    )

    return NextResponse.json({
      conversations: conversations,
      total: conversations.length,  // Total real de conversas com mensagens
      limit,
      offset,
    })
  } catch (error) {
    console.error('Erro inesperado:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

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

    // Buscar clientes da tabela Clientes WhatsApp
    let query = supabase
      .from('Clientes WhatsApp')
      .select('*')

    // Filtrar por status se fornecido
    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Erro ao buscar conversas:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar conversas' },
        { status: 500 }
      )
    }

    // Transformar dados para formato ConversationWithCount
    const conversations: ConversationWithCount[] = (data || []).map((cliente: any) => ({
      id: cliente.id || String(cliente.telefone),
      client_id: clientId,
      phone: String(cliente.telefone),
      name: cliente.nome || 'Sem nome',
      status: cliente.status || 'bot',
      last_message: cliente.ultima_mensagem || '',
      last_update: cliente.updated_at || cliente.created_at || new Date().toISOString(),
      created_at: cliente.created_at || new Date().toISOString(),
      message_count: 0, // Será calculado depois se necessário
      assigned_to: null,
    }))

    const paginated = conversations

    return NextResponse.json({
      conversations: paginated,
      total: conversations.length,
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

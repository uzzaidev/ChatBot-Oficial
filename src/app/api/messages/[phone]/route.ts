import { NextRequest, NextResponse } from 'next/server'
import { cleanMessageContent } from '@/lib/utils'
import { query } from '@/lib/postgres'
import type { Message } from '@/lib/types'
import { getClientIdFromSession } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: {
    phone: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { phone } = params

    // 🔐 SECURITY: Get client_id from authenticated session, not query params
    const clientId = await getClientIdFromSession()

    if (!clientId) {
      return NextResponse.json(
        { error: 'Unauthorized - authentication required' },
        { status: 401 }
      )
    }

    if (!phone) {
      return NextResponse.json(
        { error: 'phone é obrigatório' },
        { status: 400 }
      )
    }

    console.log('[API Messages] =====================================')
    console.log('[API Messages] Fetching messages for phone:', phone, 'client:', clientId)

    // Debug: Query direta via PostgreSQL para comparar
    try {
      const pgResult = await query<any>(
        `SELECT COUNT(*) as count FROM n8n_chat_histories 
         WHERE session_id = $1 
         AND (client_id = $2 OR client_id IS NULL)`,
        [phone, clientId]
      )
      console.log('[API Messages] PostgreSQL direct count:', pgResult.rows[0]?.count)
    } catch (pgError) {
      console.error('[API Messages] PostgreSQL count error:', pgError)
    }


    // 🔐 SECURITY: Filter messages by authenticated user's client_id
    // Buscar TODAS as mensagens via PostgreSQL direto (sem limite)
    // Motivo: Supabase pode ter limites de paginação que não queremos
    console.log('[API Messages] Fetching via PostgreSQL (no limits)...')

    const pgMessages = await query<any>(
      `SELECT id, session_id, message, created_at
       FROM n8n_chat_histories
       WHERE session_id = $1
       AND (client_id = $2 OR client_id IS NULL)
       ORDER BY created_at DESC`,  // DESC: mais recentes primeiro
      [phone, clientId]
    )

    console.log('[API Messages] PostgreSQL returned', pgMessages.rows.length, 'messages')

    const data = pgMessages.rows
    const error = null

    // Debug: Mostrar primeira e última mensagem (ordem DESC)
    if (data && data.length > 0) {
      console.log('[API Messages] Newest message (first in result):', {
        id: data[0].id,
        created_at: data[0].created_at
      })
      console.log('[API Messages] Oldest message (last in result):', {
        id: data[data.length - 1].id,
        created_at: data[data.length - 1].created_at
      })
    }

    console.log('[API Messages] =====================================')

    // Reverter ordem para exibir antigas primeiro (como esperado pela UI)
    const dataReversed = (data || []).reverse()

    // Transformar dados do n8n_chat_histories para formato Message
    const messages: Message[] = dataReversed
      .map((item: any, index: number) => {
        // O n8n_chat_histories salva message como JSON:
        // { "type": "human" | "ai", "content": "...", "additional_kwargs": {}, "response_metadata": {} }

        let messageData: any

        // Parse o JSON da coluna message
        if (typeof item.message === 'string') {
          try {
            messageData = JSON.parse(item.message)
          } catch {
            // Fallback se não for JSON válido (mensagens antigas)
            messageData = { type: 'ai', content: item.message }
          }
        } else {
          messageData = item.message || {}
        }

        // Extrair type e content do JSON
        const messageType = messageData.type || 'ai'  // 'human' ou 'ai'
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
          timestamp: item.created_at || new Date().toISOString(),
          metadata: null,
        }
      })
      .filter((message) => {
        // Filter out messages with empty content after cleaning
        // This removes messages that contained only function call tags
        return message.content.trim().length > 0
      })

    return NextResponse.json({
      messages,
      total: messages.length,
      phone,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
  } catch (error) {
    console.error('Erro inesperado:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

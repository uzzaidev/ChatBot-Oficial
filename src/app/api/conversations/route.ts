import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/postgres'
import type { ConversationWithCount } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
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

    console.log('[API /conversations] 🚀 Fetching conversations with optimized query')

    // OTIMIZAÇÃO: Uma única query SQL com JOINs e agregações
    // Isso elimina o problema N+1 (antes eram 1 + N*2 queries)
    const sqlQuery = `
      WITH customer_stats AS (
        SELECT 
          c.telefone,
          c.nome,
          c.status,
          c.created_at as customer_created_at,
          COUNT(h.id) as message_count,
          MAX(h.created_at) as last_message_time,
          (
            SELECT h2.message 
            FROM n8n_chat_histories h2 
            WHERE h2.session_id = CAST(c.telefone AS TEXT)
            ORDER BY h2.created_at DESC 
            LIMIT 1
          ) as last_message_json
        FROM "Clientes WhatsApp" c
        LEFT JOIN n8n_chat_histories h ON CAST(c.telefone AS TEXT) = h.session_id
        WHERE EXISTS (
          SELECT 1 
          FROM n8n_chat_histories h3 
          WHERE h3.session_id = CAST(c.telefone AS TEXT)
        )
        ${status ? 'AND c.status = $1' : ''}
        GROUP BY c.telefone, c.nome, c.status, c.created_at
      )
      SELECT * FROM customer_stats
      ORDER BY last_message_time DESC NULLS LAST
      LIMIT $${status ? '2' : '1'} OFFSET $${status ? '3' : '2'}
    `

    const params = status ? [status, limit, offset] : [limit, offset]
    const result = await query<any>(sqlQuery, params)

    const conversations: ConversationWithCount[] = result.rows.map((row) => {
      const telefoneStr = String(row.telefone)
      
      // Parse última mensagem (JSON do LangChain)
      let lastMessageContent = ''
      if (row.last_message_json) {
        try {
          const msgData = typeof row.last_message_json === 'string'
            ? JSON.parse(row.last_message_json)
            : row.last_message_json
          
          // Extrai conteúdo da mensagem (formato LangChain)
          lastMessageContent = msgData.data?.content || msgData.content || ''
        } catch (error) {
          console.error('[API /conversations] Error parsing message JSON:', error)
          lastMessageContent = ''
        }
      }

      return {
        id: telefoneStr,
        client_id: clientId,
        phone: telefoneStr,
        name: row.nome || 'Sem nome',
        status: row.status || 'bot',
        last_message: lastMessageContent.substring(0, 100),
        last_update: row.last_message_time || row.customer_created_at || new Date().toISOString(),
        created_at: row.customer_created_at || new Date().toISOString(),
        message_count: parseInt(row.message_count) || 0,
        assigned_to: null,
      }
    })

    const duration = Date.now() - startTime
    console.log(`[API /conversations] ✅ Query completed in ${duration}ms - ${conversations.length} conversations`)

    return NextResponse.json({
      conversations,
      total: conversations.length,
      limit,
      offset,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[API /conversations] ❌ Error after ${duration}ms:`, error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

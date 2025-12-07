import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import type { ConversationWithCount } from "@/lib/types";
import { getClientIdFromSession } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 🔐 SECURITY: Get client_id from authenticated session (cookies or Bearer token)
    const clientId = await getClientIdFromSession(request as any);

    if (!clientId) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // 🔐 SECURITY: Filter by authenticated user's client_id
    // OTIMIZAÇÃO: Uma única query SQL com JOINs e agregações
    // Isso elimina o problema N+1 (antes eram 1 + N*2 queries)
    const sqlQuery = `
      WITH customer_stats AS (
        SELECT 
          c.telefone,
          c.nome,
          c.status,
          c.created_at as customer_created_at,
          c.last_read_at,
          COUNT(h.id) as message_count,
          MAX(h.created_at) as last_message_time,
          m.msg_ts as last_message_time_messages,
          m.content as last_message_from_messages,
          -- Count unread messages (messages after last_read_at)
          COUNT(CASE 
            WHEN c.last_read_at IS NULL OR h.created_at > c.last_read_at 
            THEN 1 
            ELSE NULL 
          END) as unread_count,
          (
            SELECT h2.message 
            FROM n8n_chat_histories h2 
            WHERE h2.session_id = CAST(c.telefone AS TEXT)
              AND h2.client_id = $1
            ORDER BY h2.created_at DESC 
            LIMIT 1
          ) as last_message_json
        FROM clientes_whatsapp c
        LEFT JOIN n8n_chat_histories h ON CAST(c.telefone AS TEXT) = h.session_id
          AND h.client_id = $1
        LEFT JOIN LATERAL (
          SELECT content, "timestamp" as msg_ts, direction
          FROM messages
          WHERE phone = CAST(c.telefone AS TEXT)
            AND client_id = $1
          ORDER BY "timestamp" DESC NULLS LAST
          LIMIT 1
        ) m ON true
        WHERE c.client_id = $1
          AND (
            EXISTS (
              SELECT 1 
              FROM n8n_chat_histories h3 
              WHERE h3.session_id = CAST(c.telefone AS TEXT)
                AND h3.client_id = $1
            )
            OR EXISTS (
              SELECT 1
              FROM messages m2
              WHERE m2.phone = CAST(c.telefone AS TEXT)
                AND m2.client_id = $1
            )
          )
        ${status ? "AND c.status = $2" : ""}
        GROUP BY c.telefone, c.nome, c.status, c.created_at, c.last_read_at
        , m.msg_ts, m.content, m.direction
      )
      SELECT * FROM customer_stats
      ORDER BY COALESCE(
        GREATEST(last_message_time, last_message_time_messages),
        last_message_time,
        last_message_time_messages,
        customer_created_at
      ) DESC NULLS LAST
      LIMIT $${status ? "3" : "2"} OFFSET $${status ? "4" : "3"}
    `;

    const params = status
      ? [clientId, status, limit, offset]
      : [clientId, limit, offset];
    const result = await query<any>(sqlQuery, params);

    const conversations: ConversationWithCount[] = result.rows.map((row) => {
      const telefoneStr = String(row.telefone);

      // Escolher última mensagem comparando timestamps entre n8n_chat_histories e messages
      let lastMessageContent = "";

      // Parse mensagem de n8n_chat_histories
      let contentFromHistory = "";
      if (row.last_message_json) {
        try {
          const msgData = typeof row.last_message_json === "string"
            ? JSON.parse(row.last_message_json)
            : row.last_message_json;
          contentFromHistory = msgData.data?.content || msgData.content || "";
        } catch (error) {
          contentFromHistory = "";
        }
      }

      // Pegar mensagem de messages
      const contentFromMessages = row.last_message_from_messages || "";

      // Comparar timestamps e usar a mensagem mais recente
      const timeHistory = row.last_message_time ? new Date(row.last_message_time) : null;
      const timeMessages = row.last_message_time_messages ? new Date(row.last_message_time_messages) : null;

      if (timeHistory && timeMessages) {
        // Ambas existem - usar a mais recente
        if (timeMessages > timeHistory) {
          lastMessageContent = contentFromMessages;
        } else {
          lastMessageContent = contentFromHistory;
        }
      } else if (timeMessages) {
        // Só existe em messages
        lastMessageContent = contentFromMessages;
      } else if (timeHistory) {
        // Só existe em n8n_chat_histories
        lastMessageContent = contentFromHistory;
      } else {
        // Nenhuma existe - usar fallback
        lastMessageContent = contentFromHistory || contentFromMessages;
      }

      const lastUpdate = (() => {
        const t1 = row.last_message_time
          ? new Date(row.last_message_time)
          : null;
        const t2 = row.last_message_time_messages
          ? new Date(row.last_message_time_messages)
          : null;
        if (t1 && t2) return (t1 > t2 ? t1 : t2).toISOString();
        if (t1) return new Date(t1).toISOString();
        if (t2) return new Date(t2).toISOString();
        return row.customer_created_at || new Date().toISOString();
      })();

      return {
        // Required Conversation fields
        id: `${clientId}-${telefoneStr}`, // Generate unique ID
        client_id: clientId,
        phone: telefoneStr,
        name: row.nome || null,
        status: row.status || "bot",
        assigned_to: null,
        last_message: lastMessageContent || null,
        last_update: lastUpdate,
        last_read_at: row.last_read_at || null,
        created_at: row.customer_created_at || new Date().toISOString(),
        // ConversationWithCount fields
        message_count: parseInt(row.message_count) || 0,
        unread_count: parseInt(row.unread_count) || 0,
      };
    });

    const queryTime = Date.now() - startTime;

    return NextResponse.json({
      conversations,
      total: conversations.length,
      limit,
      offset,
      queryTime: `${queryTime}ms`,
    });
  } catch (error) {
    console.error("[API] Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

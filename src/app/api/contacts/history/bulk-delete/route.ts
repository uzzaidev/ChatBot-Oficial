import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { getClientIdFromSession } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const MAX_PHONES_PER_REQUEST = 500;

/**
 * POST /api/contacts/history/bulk-delete
 * Body: { phones: string[] }
 * Exclui histórico de mensagens (n8n_chat_histories + messages) de vários
 * contatos do tenant. Mantém os contatos cadastrados.
 */
export async function POST(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request as any);

    if (!clientId) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const rawPhones = (body && Array.isArray(body.phones) ? body.phones : []) as unknown[];

    const phones = Array.from(
      new Set(
        rawPhones
          .map((p) => (typeof p === "string" || typeof p === "number" ? String(p) : ""))
          .map((p) => p.replace(/\D/g, ""))
          .filter((p) => p.length > 0)
      )
    );

    if (phones.length === 0) {
      return NextResponse.json(
        { error: "Informe ao menos um telefone válido em 'phones'" },
        { status: 400 }
      );
    }

    if (phones.length > MAX_PHONES_PER_REQUEST) {
      return NextResponse.json(
        {
          error: `Limite de ${MAX_PHONES_PER_REQUEST} contatos por requisição excedido`,
        },
        { status: 400 }
      );
    }

    const [historiesResult, messagesResult] = await Promise.all([
      query<any>(
        `DELETE FROM n8n_chat_histories
         WHERE client_id = $1 AND session_id = ANY($2::text[])
         RETURNING id`,
        [clientId, phones]
      ),
      query<any>(
        `DELETE FROM messages
         WHERE client_id = $1 AND phone = ANY($2::text[])
         RETURNING id`,
        [clientId, phones]
      ),
    ]);

    const histories = historiesResult.rowCount ?? historiesResult.rows.length;
    const messages = messagesResult.rowCount ?? messagesResult.rows.length;

    return NextResponse.json({
      success: true,
      contacts: phones.length,
      phones,
      deleted: {
        histories,
        messages,
        total: histories + messages,
      },
    });
  } catch (error) {
    console.error("/api/contacts/history/bulk-delete POST error", error);
    return NextResponse.json(
      { error: "Erro ao excluir histórico em massa" },
      { status: 500 }
    );
  }
}

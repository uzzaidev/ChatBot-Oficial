import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { getClientIdFromSession } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ phone: string }>;
}

/**
 * DELETE /api/contacts/[phone]/history
 * Exclui todo o histórico de mensagens de um contato (n8n_chat_histories + messages)
 * Mantém o contato cadastrado em clientes_whatsapp.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const clientId = await getClientIdFromSession(request as any);

    if (!clientId) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 }
      );
    }

    const { phone } = await params;
    const cleanPhone = phone.replace(/\D/g, "");

    if (!cleanPhone) {
      return NextResponse.json(
        { error: "Telefone inválido" },
        { status: 400 }
      );
    }

    const [historiesResult, messagesResult] = await Promise.all([
      query<any>(
        `DELETE FROM n8n_chat_histories
         WHERE client_id = $1 AND session_id = $2
         RETURNING id`,
        [clientId, cleanPhone]
      ),
      query<any>(
        `DELETE FROM messages
         WHERE client_id = $1 AND phone = $2
         RETURNING id`,
        [clientId, cleanPhone]
      ),
    ]);

    const histories = historiesResult.rowCount ?? historiesResult.rows.length;
    const messages = messagesResult.rowCount ?? messagesResult.rows.length;

    return NextResponse.json({
      success: true,
      phone: cleanPhone,
      deleted: {
        histories,
        messages,
        total: histories + messages,
      },
    });
  } catch (error) {
    console.error("/api/contacts/[phone]/history DELETE error", error);
    return NextResponse.json(
      { error: "Erro ao excluir histórico do contato" },
      { status: 500 }
    );
  }
}

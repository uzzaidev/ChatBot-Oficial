import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { getClientIdFromSession } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

interface Contact {
  id: string;
  phone: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/contacts
 * Lista todos os contatos do cliente
 */
export async function GET(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request as any);

    if (!clientId) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status");

    const sqlQuery = `
      SELECT 
        id,
        telefone as phone,
        nome as name,
        status,
        created_at,
        updated_at
      FROM clientes_whatsapp
      WHERE client_id = $1
      ${status ? "AND status = $2" : ""}
      ORDER BY created_at DESC
      LIMIT ${status ? "$3" : "$2"} OFFSET ${status ? "$4" : "$3"}
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM clientes_whatsapp
      WHERE client_id = $1
      ${status ? "AND status = $2" : ""}
    `;

    const params = status
      ? [clientId, status, limit, offset]
      : [clientId, limit, offset];
    const countParams = status ? [clientId, status] : [clientId];

    const [result, countResult] = await Promise.all([
      query<any>(sqlQuery, params),
      query<any>(countQuery, countParams),
    ]);

    const contacts: Contact[] = result.rows.map((row) => ({
      id: row.id,
      phone: String(row.phone),
      name: row.name || "Sem nome",
      status: row.status || "bot",
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return NextResponse.json({
      contacts,
      total: parseInt(countResult.rows[0]?.total || "0"),
      limit,
      offset,
    });
  } catch (error) {
    console.error("[API /contacts] Error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contacts
 * Adiciona um novo contato manualmente
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

    const body = await request.json();
    const { phone, name, status = "bot" } = body;

    if (!phone) {
      return NextResponse.json(
        { error: "Telefone é obrigatório" },
        { status: 400 }
      );
    }

    // Limpar o telefone (remover caracteres não numéricos)
    const cleanPhone = phone.replace(/\D/g, "");

    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return NextResponse.json(
        { error: "Telefone inválido. Deve ter entre 10 e 15 dígitos." },
        { status: 400 }
      );
    }

    // Verificar se o contato já existe
    const existingQuery = `
      SELECT id FROM clientes_whatsapp 
      WHERE client_id = $1 AND telefone = $2
    `;
    const existingResult = await query<any>(existingQuery, [
      clientId,
      cleanPhone,
    ]);

    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { error: "Contato já existe" },
        { status: 409 }
      );
    }

    // Inserir o novo contato
    const insertQuery = `
      INSERT INTO clientes_whatsapp (client_id, telefone, nome, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING id, telefone as phone, nome as name, status, created_at, updated_at
    `;

    const result = await query<any>(insertQuery, [
      clientId,
      cleanPhone,
      name || null,
      status,
    ]);

    const contact = result.rows[0];

    return NextResponse.json({
      success: true,
      contact: {
        id: contact.id,
        phone: String(contact.phone),
        name: contact.name || "Sem nome",
        status: contact.status,
        created_at: contact.created_at,
        updated_at: contact.updated_at,
      },
    });
  } catch (error) {
    console.error("[API /contacts POST] Error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

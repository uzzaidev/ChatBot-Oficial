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
    const parsedLimit = parseInt(searchParams.get("limit") || "50", 10);
    const parsedOffset = parseInt(searchParams.get("offset") || "0", 10);
    const limit = Number.isNaN(parsedLimit) ? 50 : Math.min(Math.max(parsedLimit, 1), 200);
    const offset = Number.isNaN(parsedOffset) ? 0 : Math.max(parsedOffset, 0);
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.trim();

    const filterParams: Array<string | number> = [];
    const conditions: string[] = [];

    const addFilterParam = (value: string | number): string => {
      filterParams.push(value);
      return `$${filterParams.length}`;
    };

    conditions.push(`client_id = ${addFilterParam(clientId)}`);

    if (status) {
      conditions.push(`status = ${addFilterParam(status)}`);
    }

    if (search) {
      const searchPlaceholder = addFilterParam(`%${search}%`);
      conditions.push(
        `(telefone::text ILIKE ${searchPlaceholder} OR COALESCE(nome, '') ILIKE ${searchPlaceholder})`,
      );
    }

    const whereClause = conditions.join(" AND ");
    const limitPlaceholder = `$${filterParams.length + 1}`;
    const offsetPlaceholder = `$${filterParams.length + 2}`;

    const sqlQuery = `
      SELECT
        telefone as phone,
        nome as name,
        status,
        created_at,
        COALESCE(updated_at, created_at) as updated_at,
        metadata
      FROM clientes_whatsapp
      WHERE ${whereClause}
      ORDER BY COALESCE(updated_at, created_at) DESC
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM clientes_whatsapp
      WHERE ${whereClause}
    `;

    const params = [...filterParams, limit, offset];
    const countParams = [...filterParams];

    const [result, countResult] = await Promise.all([
      query<any>(sqlQuery, params),
      query<any>(countQuery, countParams),
    ]);

    const contacts: Contact[] = result.rows.map((row) => ({
      id: String(row.phone), // Use phone as ID since PK is (telefone, client_id)
      phone: String(row.phone),
      name: row.name || "Sem nome",
      status: row.status || "bot",
      created_at: row.created_at,
      updated_at: row.updated_at,
      metadata: row.metadata || undefined,
    }));

    return NextResponse.json({
      contacts,
      total: parseInt(countResult.rows[0]?.total || "0"),
      limit,
      offset,
      search: search || null,
    });
  } catch (error) {
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
      SELECT telefone FROM clientes_whatsapp 
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
      RETURNING telefone as phone, nome as name, status, created_at, COALESCE(updated_at, created_at) as updated_at
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
        id: String(contact.phone), // Use phone as ID since PK is (telefone, client_id)
        phone: String(contact.phone),
        name: contact.name || "Sem nome",
        status: contact.status,
        created_at: contact.created_at,
        updated_at: contact.updated_at,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { getClientIdFromSession } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ phone: string }>;
}

/**
 * GET /api/contacts/[phone]
 * Obtém detalhes de um contato específico
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const sqlQuery = `
      SELECT 
        telefone as phone,
        nome as name,
        status,
        created_at,
        COALESCE(updated_at, created_at) as updated_at
      FROM clientes_whatsapp
      WHERE client_id = $1 AND telefone = $2
    `;

    const result = await query<any>(sqlQuery, [clientId, cleanPhone]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Contato não encontrado" },
        { status: 404 }
      );
    }

    const row = result.rows[0];

    return NextResponse.json({
      contact: {
        id: String(row.phone), // Use phone as ID since PK is (telefone, client_id)
        phone: String(row.phone),
        name: row.name || "Sem nome",
        status: row.status || "bot",
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    });
  } catch (error) {
    console.error("[API /contacts/[phone]] Error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/contacts/[phone]
 * Atualiza um contato (nome e/ou status)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
    const body = await request.json();
    const { name, status } = body;

    // Validar status se fornecido
    if (status && !["bot", "humano", "transferido"].includes(status)) {
      return NextResponse.json(
        { error: "Status inválido. Use: bot, humano ou transferido" },
        { status: 400 }
      );
    }

    // Construir query de update dinamicamente
    const updates: string[] = [];
    const values: any[] = [clientId, cleanPhone];
    let paramIndex = 3;

    if (name !== undefined) {
      updates.push(`nome = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }

    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "Nenhum campo para atualizar fornecido" },
        { status: 400 }
      );
    }

    updates.push("updated_at = NOW()");

    const updateQuery = `
      UPDATE clientes_whatsapp
      SET ${updates.join(", ")}
      WHERE client_id = $1 AND telefone = $2
      RETURNING telefone as phone, nome as name, status, created_at, COALESCE(updated_at, NOW()) as updated_at
    `;

    const result = await query<any>(updateQuery, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Contato não encontrado" },
        { status: 404 }
      );
    }

    const row = result.rows[0];

    return NextResponse.json({
      success: true,
      contact: {
        id: String(row.phone), // Use phone as ID since PK is (telefone, client_id)
        phone: String(row.phone),
        name: row.name || "Sem nome",
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    });
  } catch (error) {
    console.error("[API /contacts/[phone] PATCH] Error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/contacts/[phone]
 * Remove um contato
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

    const deleteQuery = `
      DELETE FROM clientes_whatsapp
      WHERE client_id = $1 AND telefone = $2
      RETURNING telefone
    `;

    const result = await query<any>(deleteQuery, [clientId, cleanPhone]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Contato não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Contato removido com sucesso",
    });
  } catch (error) {
    console.error("[API /contacts/[phone] DELETE] Error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

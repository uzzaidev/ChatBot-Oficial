import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { getClientIdFromSession } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: Array<{
    row: number;
    phone: string;
    error: string;
  }>;
}

/**
 * POST /api/contacts/import
 * Importa contatos em massa a partir de CSV
 * 
 * Formato esperado do CSV:
 * telefone,nome,status
 * 5511999999999,João Silva,bot
 * 5511888888888,Maria Santos,humano
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
    const { contacts } = body;

    if (!contacts || !Array.isArray(contacts)) {
      return NextResponse.json(
        { error: "Lista de contatos é obrigatória" },
        { status: 400 }
      );
    }

    const result: ImportResult = {
      total: contacts.length,
      imported: 0,
      skipped: 0,
      errors: [],
    };

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      const rowNumber = i + 1;

      try {
        // Validar telefone
        if (!contact.phone && !contact.telefone) {
          result.errors.push({
            row: rowNumber,
            phone: "",
            error: "Telefone é obrigatório",
          });
          continue;
        }

        const phone = String(contact.phone || contact.telefone);
        const cleanPhone = phone.replace(/\D/g, "");

        if (cleanPhone.length < 10 || cleanPhone.length > 15) {
          result.errors.push({
            row: rowNumber,
            phone: phone,
            error: "Telefone inválido. Deve ter entre 10 e 15 dígitos.",
          });
          continue;
        }

        const name = contact.name || contact.nome || null;
        const status = contact.status || "bot";

        // Validar status
        if (!["bot", "humano", "transferido"].includes(status)) {
          result.errors.push({
            row: rowNumber,
            phone: cleanPhone,
            error: `Status inválido: ${status}. Use: bot, humano ou transferido`,
          });
          continue;
        }

        // Verificar se já existe
        const existingQuery = `
          SELECT telefone FROM clientes_whatsapp 
          WHERE client_id = $1 AND telefone = $2
        `;
        const existingResult = await query<any>(existingQuery, [
          clientId,
          cleanPhone,
        ]);

        if (existingResult.rows.length > 0) {
          result.skipped++;
          continue;
        }

        // Inserir contato
        const insertQuery = `
          INSERT INTO clientes_whatsapp (client_id, telefone, nome, status, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
        `;

        await query(insertQuery, [clientId, cleanPhone, name, status]);
        result.imported++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
        result.errors.push({
          row: rowNumber,
          phone: String(contact.phone || contact.telefone || ""),
          error: errorMessage,
        });
      }
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("[API /contacts/import] Error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

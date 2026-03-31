import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { getClientIdFromSession } from "@/lib/supabase-server";
import type { ContactImportResult } from "@/lib/types";

export const dynamic = "force-dynamic";

const normalizeBrazilianPhone = (digits: string): string => {
  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith("55")) {
    return `55${digits}`;
  }

  return digits;
};

const classifyPhone = (
  digits: string,
): {
  normalizedPhone?: string;
  error?: string;
  warning?: string;
} => {
  if (digits.length < 8) {
    return {
      error: "Telefone invalido. Deve ter ao menos 8 digitos.",
    };
  }

  if (digits.length > 15) {
    return {
      error: "Telefone invalido. Deve ter no maximo 15 digitos.",
    };
  }

  if (digits.length === 8 || digits.length === 9) {
    return {
      normalizedPhone: digits,
      warning:
        "Numero possivelmente incompleto (faltando DDD/DDI). Contato importado com aviso.",
    };
  }

  if (digits.length === 10 || digits.length === 11) {
    return {
      normalizedPhone: normalizeBrazilianPhone(digits),
    };
  }

  return {
    normalizedPhone: digits,
  };
};

type CrmCardAction = "created" | "moved" | "unchanged";

const addContactCardToCrm = async ({
  clientId,
  columnId,
  phone,
}: {
  clientId: string;
  columnId: string;
  phone: string;
}): Promise<{ success: boolean; action?: CrmCardAction; error?: string }> => {
  try {
    const existingCardResult = await query<{ id: string; column_id: string }>(
      `SELECT id, column_id
       FROM crm_cards
       WHERE client_id = $1 AND phone = $2
       LIMIT 1`,
      [clientId, phone],
    );
    const existingCard = existingCardResult.rows[0];

    const lastCardResult = await query<{ position: number }>(
      `SELECT position
       FROM crm_cards
       WHERE client_id = $1 AND column_id = $2
       ORDER BY position DESC
       LIMIT 1`,
      [clientId, columnId],
    );
    const nextPosition = Number(lastCardResult.rows[0]?.position ?? -1) + 1;

    if (existingCard) {
      if (existingCard.column_id === columnId) {
        return { success: true, action: "unchanged" };
      }

      await query(
        `UPDATE crm_cards
         SET column_id = $1,
             position = $2,
             moved_to_column_at = NOW(),
             updated_at = NOW()
         WHERE id = $3 AND client_id = $4`,
        [columnId, nextPosition, existingCard.id, clientId],
      );

      await query(
        `INSERT INTO crm_activity_log (
          client_id,
          card_id,
          activity_type,
          old_value,
          new_value,
          is_automated
        )
        VALUES ($1, $2, 'column_move', $3::jsonb, $4::jsonb, true)`,
        [
          clientId,
          existingCard.id,
          JSON.stringify({ column_id: existingCard.column_id }),
          JSON.stringify({ column_id: columnId }),
        ],
      );

      return { success: true, action: "moved" };
    }

    const createdCardResult = await query<{ id: string }>(
      `INSERT INTO crm_cards (client_id, column_id, phone, position)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [clientId, columnId, phone, nextPosition],
    );

    const createdCardId = createdCardResult.rows[0]?.id;
    if (createdCardId) {
      await query(
        `INSERT INTO crm_activity_log (client_id, card_id, activity_type, is_automated)
         VALUES ($1, $2, 'created', true)`,
        [clientId, createdCardId],
      );
    }

    return { success: true, action: "created" };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Erro ao criar card no CRM";
    return { success: false, error: errorMessage };
  }
};

/**
 * POST /api/contacts/import
 * Importa contatos em massa a partir de CSV
 *
 * Formato esperado do CSV:
 * telefone,nome,status
 * 5511999999999,Joao Silva,bot
 * 5511888888888,Maria Santos,humano
 */
export async function POST(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request as any);

    if (!clientId) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { contacts, addToCrm = false, columnId } = body;

    if (!contacts || !Array.isArray(contacts)) {
      return NextResponse.json(
        { error: "Lista de contatos e obrigatoria" },
        { status: 400 },
      );
    }

    if (addToCrm && !columnId) {
      return NextResponse.json(
        { error: "columnId e obrigatorio quando addToCrm esta ativo" },
        { status: 400 },
      );
    }

    if (addToCrm && columnId) {
      const selectedColumnResult = await query<{ id: string }>(
        `SELECT id
         FROM crm_columns
         WHERE client_id = $1
           AND id = $2
           AND is_archived = false
         LIMIT 1`,
        [clientId, columnId],
      );

      if (!selectedColumnResult.rows[0]) {
        return NextResponse.json(
          { error: "Coluna de CRM invalida para este cliente" },
          { status: 400 },
        );
      }
    }

    const result: ContactImportResult = {
      total: contacts.length,
      imported: 0,
      skipped: 0,
      errors: [],
      warnings: [],
      cardsCreated: addToCrm ? 0 : undefined,
      cardsMoved: addToCrm ? 0 : undefined,
      cardErrors: addToCrm ? 0 : undefined,
    };
    const importedPhones: string[] = [];

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      const rowNumber = i + 1;

      try {
        if (!contact?.phone && !contact?.telefone) {
          result.errors.push({
            row: rowNumber,
            phone: "",
            error: "Telefone e obrigatorio",
          });
          continue;
        }

        const inputPhone = String(contact.phone || contact.telefone);
        const phoneDigits = inputPhone.replace(/\D/g, "");
        const phoneValidation = classifyPhone(phoneDigits);

        if (!phoneValidation.normalizedPhone) {
          result.errors.push({
            row: rowNumber,
            phone: inputPhone,
            error: phoneValidation.error || "Telefone invalido",
          });
          continue;
        }

        const normalizedPhone = phoneValidation.normalizedPhone;
        const warningMessage = phoneValidation.warning;

        const name = contact.name || contact.nome || null;
        const status = String(contact.status || "bot")
          .trim()
          .toLowerCase();

        if (!status || !["bot", "humano", "transferido"].includes(status)) {
          result.errors.push({
            row: rowNumber,
            phone: normalizedPhone,
            error: `Status invalido: ${status}. Use: bot, humano ou transferido`,
          });
          continue;
        }

        const existingContactResult = await query<{ telefone: string }>(
          `SELECT telefone
           FROM clientes_whatsapp
           WHERE client_id = $1 AND telefone = $2
           LIMIT 1`,
          [clientId, normalizedPhone],
        );

        if (existingContactResult.rows[0]) {
          result.skipped++;
          continue;
        }

        await query(
          `INSERT INTO clientes_whatsapp (
            client_id,
            telefone,
            nome,
            status,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, NOW(), NOW())`,
          [clientId, normalizedPhone, name, status],
        );

        result.imported++;
        importedPhones.push(normalizedPhone);

        if (warningMessage) {
          result.warnings?.push({
            row: rowNumber,
            phone: normalizedPhone,
            warning: warningMessage,
          });
        }
      } catch (error: any) {
        if (error?.code === "23505") {
          result.skipped++;
          continue;
        }

        const errorMessage =
          error instanceof Error ? error.message : "Erro desconhecido";

        result.errors.push({
          row: rowNumber,
          phone: String(contact?.phone || contact?.telefone || ""),
          error: errorMessage,
        });
      }
    }

    if (addToCrm && columnId) {
      for (const phone of importedPhones) {
        const cardOperation = await addContactCardToCrm({
          clientId,
          columnId,
          phone,
        });

        if (!cardOperation.success) {
          result.cardErrors = (result.cardErrors ?? 0) + 1;
          continue;
        }

        if (cardOperation.action === "created") {
          result.cardsCreated = (result.cardsCreated ?? 0) + 1;
          continue;
        }

        if (cardOperation.action === "moved") {
          result.cardsMoved = (result.cardsMoved ?? 0) + 1;
        }
      }
    }

    if (result.warnings && result.warnings.length === 0) {
      delete result.warnings;
    }

    if (!addToCrm) {
      delete result.cardsCreated;
      delete result.cardsMoved;
      delete result.cardErrors;
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

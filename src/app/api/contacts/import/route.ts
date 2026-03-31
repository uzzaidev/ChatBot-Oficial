import { NextRequest, NextResponse } from "next/server";
import type { ContactImportResult } from "@/lib/types";
import {
  createRouteHandlerClient,
  getClientIdFromSession,
} from "@/lib/supabase-server";

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

const addContactCardToCrm = async ({
  supabaseAny,
  clientId,
  columnId,
  phone,
}: {
  supabaseAny: any;
  clientId: string;
  columnId: string;
  phone: string;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: existingCard, error: existingCardError } = await supabaseAny
      .from("crm_cards")
      .select("id, column_id")
      .eq("client_id", clientId)
      .eq("phone", phone)
      .maybeSingle();

    if (existingCardError) {
      throw new Error(existingCardError.message);
    }

    const { data: lastCardInColumn, error: lastCardError } = await supabaseAny
      .from("crm_cards")
      .select("position")
      .eq("client_id", clientId)
      .eq("column_id", columnId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastCardError) {
      throw new Error(lastCardError.message);
    }

    const nextPosition = Number(lastCardInColumn?.position ?? -1) + 1;

    if (existingCard) {
      if (existingCard.column_id === columnId) {
        return { success: true };
      }

      const { error: moveError } = await supabaseAny
        .from("crm_cards")
        .update({
          column_id: columnId,
          position: nextPosition,
          moved_to_column_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingCard.id)
        .eq("client_id", clientId);

      if (moveError) {
        throw new Error(moveError.message);
      }

      const { error: moveLogError } = await supabaseAny
        .from("crm_activity_log")
        .insert({
          client_id: clientId,
          card_id: existingCard.id,
          activity_type: "column_move",
          old_value: { column_id: existingCard.column_id },
          new_value: { column_id: columnId },
          is_automated: true,
        });

      if (moveLogError) {
        console.warn(
          `[contacts/import] Failed to log CRM move activity for ${phone}: ${moveLogError.message}`,
        );
      }

      return { success: true };
    }

    const { data: createdCard, error: createCardError } = await supabaseAny
      .from("crm_cards")
      .insert({
        client_id: clientId,
        column_id: columnId,
        phone,
        position: nextPosition,
      })
      .select("id")
      .single();

    if (createCardError) {
      throw new Error(createCardError.message);
    }

    if (createdCard?.id) {
      const { error: createdLogError } = await supabaseAny
        .from("crm_activity_log")
        .insert({
          client_id: clientId,
          card_id: createdCard.id,
          activity_type: "created",
          is_automated: true,
        });

      if (createdLogError) {
        console.warn(
          `[contacts/import] Failed to log CRM create activity for ${phone}: ${createdLogError.message}`,
        );
      }
    }

    return { success: true };
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

    const supabase = await createRouteHandlerClient(request as any);
    const supabaseAny = supabase as any;

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
      const { data: selectedColumn, error: selectedColumnError } = await supabaseAny
        .from("crm_columns")
        .select("id")
        .eq("client_id", clientId)
        .eq("id", columnId)
        .eq("is_archived", false)
        .maybeSingle();

      if (selectedColumnError) {
        return NextResponse.json(
          { error: selectedColumnError.message },
          { status: 500 },
        );
      }

      if (!selectedColumn) {
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

        const { data: existingContact, error: existingError } = await supabaseAny
          .from("clientes_whatsapp")
          .select("telefone")
          .eq("client_id", clientId)
          .eq("telefone", normalizedPhone)
          .maybeSingle();

        if (existingError) {
          throw new Error(existingError.message);
        }

        if (existingContact) {
          result.skipped++;
          continue;
        }

        const { error: insertError } = await supabaseAny
          .from("clientes_whatsapp")
          .insert({
            client_id: clientId,
            telefone: normalizedPhone,
            nome: name,
            status,
          });

        if (insertError) {
          if (insertError.code === "23505") {
            result.skipped++;
            continue;
          }

          throw new Error(insertError.message);
        }

        result.imported++;
        importedPhones.push(normalizedPhone);

        if (warningMessage) {
          result.warnings?.push({
            row: rowNumber,
            phone: normalizedPhone,
            warning: warningMessage,
          });
        }
      } catch (error) {
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
        const cardCreation = await addContactCardToCrm({
          supabaseAny,
          clientId,
          columnId,
          phone,
        });

        if (cardCreation.success) {
          result.cardsCreated = (result.cardsCreated ?? 0) + 1;
          continue;
        }

        result.cardErrors = (result.cardErrors ?? 0) + 1;
      }
    }

    if (result.warnings && result.warnings.length === 0) {
      delete result.warnings;
    }

    if (!addToCrm) {
      delete result.cardsCreated;
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

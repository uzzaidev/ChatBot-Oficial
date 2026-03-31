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
    const { contacts } = body;

    if (!contacts || !Array.isArray(contacts)) {
      return NextResponse.json(
        { error: "Lista de contatos e obrigatoria" },
        { status: 400 },
      );
    }

    const result: ContactImportResult = {
      total: contacts.length,
      imported: 0,
      skipped: 0,
      errors: [],
      warnings: [],
    };

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

    if (result.warnings && result.warnings.length === 0) {
      delete result.warnings;
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

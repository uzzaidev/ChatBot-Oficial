import { createServiceRoleClient } from "@/lib/supabase";

export interface ContactMetadataInput {
  phone: string;
  clientId: string;
  fields: Record<string, string | boolean | null>;
}

const ALLOWED_FIELDS = new Set([
  "cpf",
  "email",
  "como_conheceu",
  "indicado_por",
  "objetivo",
  "nome_completo",
  "data_nascimento",
  "rg",
  "cep",
  "endereco",
  "bairro",
  "cidade",
  "estado",
]);

const sanitizeMetadataFields = (
  fields: Record<string, string | boolean | null>,
): Record<string, string | boolean> => {
  const sanitized: Record<string, string | boolean> = {};

  for (const [key, rawValue] of Object.entries(fields)) {
    if (!ALLOWED_FIELDS.has(key)) continue;
    if (rawValue === null || rawValue === undefined) continue;

    if (typeof rawValue === "boolean") {
      sanitized[key] = rawValue;
      continue;
    }

    const cleaned = rawValue.trim();
    if (!cleaned) continue;
    sanitized[key] = cleaned;
  }

  return sanitized;
};

export const updateContactMetadata = async (
  input: ContactMetadataInput,
): Promise<void> => {
  const { phone, clientId, fields } = input;

  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return;

  const safeFields = sanitizeMetadataFields(fields || {});
  if (Object.keys(safeFields).length === 0) return;

  try {
    const supabase = createServiceRoleClient() as any;

    const { error } = await supabase.rpc("merge_contact_metadata", {
      p_telefone: Number(digits),
      p_client_id: clientId,
      p_metadata: safeFields,
    });

    if (error) {
      const message = String(error.message || "").toLowerCase();

      // If migration is not applied yet, keep flow alive.
      if (
        message.includes("merge_contact_metadata") &&
        (message.includes("does not exist") || message.includes("function"))
      ) {
        return;
      }

      console.error("[updateContactMetadata] error:", error.message);
    }
  } catch (error) {
    console.error("[updateContactMetadata] unexpected error:", error);
  }
};

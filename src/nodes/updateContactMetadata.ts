import { createServiceRoleClient } from "@/lib/supabase";

export interface ContactMetadataInput {
  phone: string;
  clientId: string;
  fields: Record<string, string | boolean | null>;
}

export interface RejectedContactMetadataField {
  field: string;
  value: string | boolean | null;
  reason:
    | "field_not_allowed"
    | "empty_value"
    | "invalid_cpf"
    | "invalid_email"
    | "invalid_cep"
    | "invalid_date"
    | "invalid_phone"
    | "invalid_state"
    | "invalid_type";
}

export interface UpdateContactMetadataResult {
  saved: Record<string, string | boolean>;
  rejected: RejectedContactMetadataField[];
  persisted: boolean;
  error?: string;
}

const ALLOWED_FIELDS = new Set([
  "nome",
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
  "telefone_alternativo",
  "profissao",
]);

const FIELD_ALIASES: Record<string, string> = {
  nome: "nome_completo",
  nome_cliente: "nome_completo",
  full_name: "nome_completo",
  birth_date: "data_nascimento",
  data_de_nascimento: "data_nascimento",
  date_of_birth: "data_nascimento",
  phone: "telefone_alternativo",
  telefone: "telefone_alternativo",
  celular: "telefone_alternativo",
  occupation: "profissao",
  zip_code: "cep",
  zipcode: "cep",
  address: "endereco",
};

const normalizeFieldKey = (key: string): string => {
  const normalized = key
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  return FIELD_ALIASES[normalized] ?? normalized;
};

const normalizeCpf = (value: string): string | null => {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11) return null;
  if (/^(\d)\1{10}$/.test(digits)) return null;
  return digits;
};

const normalizeEmail = (value: string): string | null => {
  const email = value.trim().toLowerCase();
  if (!email) return null;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  return regex.test(email) ? email : null;
};

const normalizeCep = (value: string): string | null => {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const normalizeBirthDate = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed.replace(/\./g, "/").replace(/-/g, "/");
  const parts = normalized.split("/");

  let year: number;
  let month: number;
  let day: number;

  if (parts.length === 3) {
    if (parts[0].length === 4) {
      year = Number(parts[0]);
      month = Number(parts[1]);
      day = Number(parts[2]);
    } else {
      day = Number(parts[0]);
      month = Number(parts[1]);
      year = Number(parts[2]);
    }
  } else {
    return null;
  }

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    year < 1900 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  const now = new Date();
  if (date.getTime() > now.getTime()) {
    return null;
  }

  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
};

const normalizeAltPhone = (value: string): string | null => {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) return null;
  return digits;
};

const normalizeState = (value: string): string | null => {
  const state = value.trim().toUpperCase();
  if (state.length !== 2) return null;
  return state;
};

const sanitizeMetadataFields = (
  fields: Record<string, string | boolean | null>,
): UpdateContactMetadataResult => {
  const sanitized: Record<string, string | boolean> = {};
  const rejected: RejectedContactMetadataField[] = [];

  for (const [rawKey, rawValue] of Object.entries(fields)) {
    const key = normalizeFieldKey(rawKey);
    if (!ALLOWED_FIELDS.has(key)) {
      rejected.push({
        field: rawKey,
        value: rawValue,
        reason: "field_not_allowed",
      });
      continue;
    }

    if (rawValue === null || rawValue === undefined) {
      rejected.push({
        field: key,
        value: rawValue,
        reason: "empty_value",
      });
      continue;
    }

    if (typeof rawValue === "boolean") {
      sanitized[key] = rawValue;
      continue;
    }

    if (typeof rawValue !== "string") {
      rejected.push({
        field: key,
        value: rawValue,
        reason: "invalid_type",
      });
      continue;
    }

    const cleaned = rawValue.trim();
    if (!cleaned) {
      rejected.push({
        field: key,
        value: rawValue,
        reason: "empty_value",
      });
      continue;
    }

    if (key === "cpf") {
      const normalizedCpf = normalizeCpf(cleaned);
      if (!normalizedCpf) {
        rejected.push({
          field: key,
          value: rawValue,
          reason: "invalid_cpf",
        });
        continue;
      }
      sanitized[key] = normalizedCpf;
      continue;
    }

    if (key === "email") {
      const normalizedEmail = normalizeEmail(cleaned);
      if (!normalizedEmail) {
        rejected.push({
          field: key,
          value: rawValue,
          reason: "invalid_email",
        });
        continue;
      }
      sanitized[key] = normalizedEmail;
      continue;
    }

    if (key === "cep") {
      const normalizedCep = normalizeCep(cleaned);
      if (!normalizedCep) {
        rejected.push({
          field: key,
          value: rawValue,
          reason: "invalid_cep",
        });
        continue;
      }
      sanitized[key] = normalizedCep;
      continue;
    }

    if (key === "data_nascimento") {
      const normalizedBirthDate = normalizeBirthDate(cleaned);
      if (!normalizedBirthDate) {
        rejected.push({
          field: key,
          value: rawValue,
          reason: "invalid_date",
        });
        continue;
      }
      sanitized[key] = normalizedBirthDate;
      continue;
    }

    if (key === "telefone_alternativo") {
      const normalizedPhone = normalizeAltPhone(cleaned);
      if (!normalizedPhone) {
        rejected.push({
          field: key,
          value: rawValue,
          reason: "invalid_phone",
        });
        continue;
      }
      sanitized[key] = normalizedPhone;
      continue;
    }

    if (key === "estado") {
      const normalizedState = normalizeState(cleaned);
      if (!normalizedState) {
        rejected.push({
          field: key,
          value: rawValue,
          reason: "invalid_state",
        });
        continue;
      }
      sanitized[key] = normalizedState;
      continue;
    }

    sanitized[key] = cleaned;
  }

  return {
    saved: sanitized,
    rejected,
    persisted: false,
  };
};

export const updateContactMetadata = async (
  input: ContactMetadataInput,
): Promise<UpdateContactMetadataResult> => {
  const { phone, clientId, fields } = input;

  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) {
    return { saved: {}, rejected: [], persisted: false };
  }

  const sanitizedResult = sanitizeMetadataFields(fields || {});
  const safeFields = sanitizedResult.saved;
  if (Object.keys(safeFields).length === 0) {
    if (sanitizedResult.rejected.length > 0) {
      console.warn("[updateContactMetadata] all fields rejected", {
        clientId,
        phone: digits,
        rejected: sanitizedResult.rejected,
      });
    }

    return sanitizedResult;
  }

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
        return {
          ...sanitizedResult,
          persisted: false,
          error: error.message,
        };
      }

      console.error("[updateContactMetadata] error:", {
        message: error.message,
        clientId,
        phone: digits,
        savedFields: Object.keys(safeFields),
        rejected: sanitizedResult.rejected,
      });

      return {
        ...sanitizedResult,
        persisted: false,
        error: error.message,
      };
    }

    if (sanitizedResult.rejected.length > 0) {
      console.warn("[updateContactMetadata] partial_reject", {
        clientId,
        phone: digits,
        savedFields: Object.keys(safeFields),
        rejected: sanitizedResult.rejected,
      });
    }

    return {
      ...sanitizedResult,
      persisted: true,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "unknown_metadata_error";
    console.error("[updateContactMetadata] unexpected error:", {
      error: message,
      clientId,
      phone: digits,
      savedFields: Object.keys(safeFields),
      rejected: sanitizedResult.rejected,
    });
    return {
      ...sanitizedResult,
      persisted: false,
      error: message,
    };
  }
};

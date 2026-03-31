const toSafeSnakeCase = (value: string): string => {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

export const normalizeCommercialIntent = (value: unknown): string => {
  if (typeof value !== "string") return "unknown";
  const normalized = toSafeSnakeCase(value);
  if (!normalized) return "unknown";

  const isCloseSale =
    normalized === "close_sale" ||
    normalized === "lead_ganho" ||
    normalized === "lead_won" ||
    normalized.includes("ganho") ||
    normalized.includes("won") ||
    normalized.includes("fech") ||
    normalized.includes("contrat") ||
    normalized.includes("compra") ||
    normalized.includes("comprar") ||
    normalized.includes("pag");
  if (isCloseSale) return "close_sale";

  const isScheduleTrial =
    normalized === "schedule_trial" ||
    normalized.includes("aula_experimental") ||
    normalized.includes("trial") ||
    normalized.includes("agend") ||
    normalized.includes("consulta") ||
    normalized.includes("marc");
  if (isScheduleTrial) return "schedule_trial";

  const isPricing =
    normalized === "pricing" ||
    normalized.includes("preco") ||
    normalized.includes("valor") ||
    normalized.includes("mensalidade") ||
    normalized.includes("orcamento") ||
    normalized.includes("quanto_custa");
  if (isPricing) return "pricing";

  const isCancellationRisk =
    normalized === "cancellation_risk" ||
    normalized.includes("cancel") ||
    normalized.includes("desist") ||
    normalized.includes("nao_quero") ||
    normalized.includes("parar");
  if (isCancellationRisk) return "cancellation_risk";

  const isSupportHuman =
    normalized === "support_human" ||
    normalized.includes("atendente") ||
    normalized.includes("humano") ||
    normalized.includes("falar_com_pessoa") ||
    normalized.includes("suporte_humano");
  if (isSupportHuman) return "support_human";

  return normalized;
};

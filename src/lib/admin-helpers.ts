export type PlanStatus =
  | "trial"
  | "active"
  | "past_due"
  | "canceled"
  | "suspended"
  | "incomplete";

export type ClientPlanStatus =
  | "trial"
  | "active"
  | "past_due"
  | "canceled"
  | "suspended";

export interface PaymentHistoryItem {
  amount: number;
  paid_at?: string | null;
  period_start?: string | null;
  period_end?: string | null;
}

export interface MonthlySummaryRow {
  month: string;
  total: number;
  count: number;
}

export const centsToCurrency = (valueInCents: number, currency = "BRL"): string => {
  const normalized = Number.isFinite(valueInCents) ? valueInCents : 0;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(normalized / 100);
};

export const normalizePlanStatus = (status: string | null | undefined): PlanStatus => {
  const value = (status ?? "").toLowerCase();
  if (value === "active") return "active";
  if (value === "past_due") return "past_due";
  if (value === "canceled") return "canceled";
  if (value === "suspended") return "suspended";
  if (value === "incomplete") return "incomplete";
  return "trial";
};

export const mapStripeSubscriptionStatus = (
  stripeStatus: string | null | undefined
): PlanStatus => {
  const value = (stripeStatus ?? "").toLowerCase();

  if (value === "active") return "active";
  if (value === "trialing") return "trial";
  if (value === "past_due" || value === "unpaid") return "past_due";
  if (value === "canceled" || value === "incomplete_expired") return "canceled";
  if (value === "paused") return "suspended";
  if (value === "incomplete") return "incomplete";

  return normalizePlanStatus(value);
};

export const toClientPlanStatus = (
  stripeStatus: string | null | undefined
): ClientPlanStatus => {
  const mapped = mapStripeSubscriptionStatus(stripeStatus);
  if (mapped === "incomplete") return "past_due";
  return mapped;
};

export const buildMonthlySummary = (
  items: PaymentHistoryItem[],
  months = 12
): MonthlySummaryRow[] => {
  const now = new Date();
  const map = new Map<string, MonthlySummaryRow>();

  for (let index = 0; index < months; index += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, { month: key, total: 0, count: 0 });
  }

  for (const item of items) {
    const sourceDate = item.paid_at ?? item.period_end ?? item.period_start;
    if (!sourceDate) continue;

    const date = new Date(sourceDate);
    if (Number.isNaN(date.getTime())) continue;

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const bucket = map.get(key);
    if (!bucket) continue;

    bucket.total += item.amount ?? 0;
    bucket.count += 1;
  }

  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
};

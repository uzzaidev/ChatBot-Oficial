/**
 * OpenAI Model Pricing — Standard tier
 *
 * Prices are in USD per 1M tokens.
 * Source: https://developers.openai.com/api/docs/pricing (April 2026)
 *
 * - input:        price per 1M input tokens
 * - cachedInput:  price per 1M cached input tokens (null if not supported)
 * - output:       price per 1M output tokens (includes reasoning tokens for reasoning models)
 *
 * Note: For pro models (gpt-5.5-pro, gpt-5.4-pro, o3-pro), pricing applies to
 * Responses API only — they cannot be called via Chat Completions.
 */

export interface ModelPricing {
  input: number;
  cachedInput: number | null;
  output: number;
}

export const OPENAI_PRICING: Record<string, ModelPricing> = {
  // ── GPT-5.x generation ──────────────────────────────────────────────
  "gpt-5.5": { input: 5, cachedInput: 0.5, output: 30 },
  "gpt-5.5-pro": { input: 30, cachedInput: null, output: 180 },
  "gpt-5.4": { input: 2.5, cachedInput: 0.25, output: 15 },
  "gpt-5.4-pro": { input: 30, cachedInput: null, output: 180 },
  "gpt-5.4-mini": { input: 0.75, cachedInput: 0.075, output: 4.5 },
  "gpt-5.4-nano": { input: 0.2, cachedInput: 0.02, output: 1.25 },
  "gpt-5.2": { input: 1.75, cachedInput: 0.175, output: 14 },
  "gpt-5.1": { input: 1.25, cachedInput: 0.125, output: 10 },
  "gpt-5": { input: 1.25, cachedInput: 0.125, output: 10 },
  "gpt-5-mini": { input: 0.25, cachedInput: 0.025, output: 2 },
  "gpt-5-nano": { input: 0.05, cachedInput: 0.005, output: 0.4 },

  // ── GPT-4.x non-reasoning ──────────────────────────────────────────
  "gpt-4.1": { input: 2, cachedInput: 0.5, output: 8 },
  "gpt-4.1-mini": { input: 0.4, cachedInput: 0.1, output: 1.6 },
  "gpt-4.1-nano": { input: 0.1, cachedInput: 0.025, output: 0.4 },
  "gpt-4o": { input: 2.5, cachedInput: 1.25, output: 10 },
  "gpt-4o-mini": { input: 0.15, cachedInput: 0.075, output: 0.6 },
  "gpt-4-turbo": { input: 10, cachedInput: null, output: 30 },
  "gpt-4": { input: 30, cachedInput: null, output: 60 },
  "gpt-3.5-turbo": { input: 0.5, cachedInput: null, output: 1.5 },

  // ── o-series reasoning ─────────────────────────────────────────────
  o1: { input: 15, cachedInput: 7.5, output: 60 },
  "o1-mini": { input: 1.1, cachedInput: 0.55, output: 4.4 },
  o3: { input: 2, cachedInput: 0.5, output: 8 },
  "o3-mini": { input: 1.1, cachedInput: 0.55, output: 4.4 },
  "o3-pro": { input: 20, cachedInput: null, output: 80 },
  "o4-mini": { input: 1.1, cachedInput: 0.275, output: 4.4 },
};

export const OPENAI_PRICING_URL =
  "https://developers.openai.com/api/docs/pricing";

/**
 * Get pricing for a model. Returns undefined if unknown.
 */
export const getModelPricing = (model: string): ModelPricing | undefined => {
  return OPENAI_PRICING[model.toLowerCase()];
};

/**
 * Format a price for display: "$2.50 / 1M tokens"
 */
export const formatPrice = (price: number | null): string => {
  if (price === null || price === undefined) return "—";
  if (price === 0) return "Free";
  if (price < 0.01) return `$${price.toFixed(4)}`;
  if (price < 1) return `$${price.toFixed(3)}`;
  return `$${price.toFixed(2)}`;
};

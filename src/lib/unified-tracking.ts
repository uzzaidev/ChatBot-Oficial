/**
 * UNIFIED API TRACKING
 *
 * Central tracking system for ALL API calls:
 * - AI Gateway (chat, vision, embeddings)
 * - Direct APIs (TTS, Whisper, Vision, Embeddings)
 *
 * Features:
 * - Tracks BOTH tokens AND cost (BRL)
 * - Uses ai_models_registry for accurate pricing
 * - Increments modular budget (tokens/BRL/both)
 * - Logs to gateway_usage_logs (unified table)
 * - Backward compatible with usage_logs
 */

import { createServerClient } from "@/lib/supabase-server";
import { convertUSDtoBRL, getExchangeRate } from "@/lib/currency";

// =====================================================
// TYPES
// =====================================================

export type APIType =
  | "chat"
  | "tts"
  | "whisper"
  | "vision"
  | "embeddings"
  | "image-gen";
export type Provider =
  | "openai"
  | "groq"
  | "anthropic"
  | "google"
  | "elevenlabs";

export interface UnifiedTrackingParams {
  // Client context
  clientId: string;
  conversationId?: string;
  phone: string;

  // API identification
  apiType: APIType;
  provider: Provider;
  modelName: string;

  // Token-based usage (chat, embeddings)
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;

  // Unit-based usage
  characters?: number; // TTS: character count
  seconds?: number; // Whisper: audio duration in seconds
  images?: number; // Vision/Image-gen: number of images

  // Performance
  latencyMs?: number;
  wasCached?: boolean;
  wasFallback?: boolean;
  fallbackReason?: string;
  requestId?: string;
  metadata?: Record<string, any>;

  // Optional: Pre-calculated cost (if already known)
  costUSD?: number;
}

// =====================================================
// MAIN FUNCTION: Track API Usage
// =====================================================

/**
 * Unified tracking for ALL API calls
 *
 * Steps:
 * 1. Calculate tokens (if applicable)
 * 2. Get pricing from ai_models_registry
 * 3. Calculate cost USD
 * 4. Convert to BRL
 * 5. Insert to gateway_usage_logs
 * 6. Increment modular budget (tokens + BRL)
 * 7. Check budget limits
 */
export const trackUnifiedUsage = async (
  params: UnifiedTrackingParams,
): Promise<void> => {
  const {
    clientId,
    conversationId,
    phone,
    apiType,
    provider,
    modelName,
    inputTokens = 0,
    outputTokens = 0,
    cachedTokens = 0,
    characters = 0,
    seconds = 0,
    images = 0,
    latencyMs = 0,
    wasCached = false,
    wasFallback = false,
    fallbackReason,
    requestId,
    metadata = {},
    costUSD: providedCostUSD,
  } = params;

  try {
    const supabase = createServerClient();

    // =====================================================
    // 1. CALCULATE TOTAL TOKENS
    // =====================================================

    const totalTokens = inputTokens + outputTokens;

    // =====================================================
    // 2. GET PRICING FROM ai_models_registry
    // =====================================================

    const gatewayIdentifier = `${provider}/${modelName}`;

    const { data: modelData, error: modelError } = await supabase
      .from("ai_models_registry")
      .select(
        "id, input_price_per_million, output_price_per_million, cached_input_price_per_million",
      )
      .eq("gateway_identifier", gatewayIdentifier)
      .single();

    // =====================================================
    // 3. CALCULATE COST USD
    // =====================================================

    let costUSD = providedCostUSD || 0;

    if (!providedCostUSD) {
      costUSD = calculateCostFromRegistry({
        apiType,
        modelData,
        inputTokens,
        outputTokens,
        cachedTokens,
        characters,
        seconds,
        images,
      });
    }

    // =====================================================
    // 4. CONVERT TO BRL
    // =====================================================

    const usdToBrlRate = await getExchangeRate("USD", "BRL");
    const costBRL = await convertUSDtoBRL(costUSD);

    // =====================================================
    // 5. INSERT TO gateway_usage_logs
    // =====================================================

    const baseInsertPayload = {
      client_id: clientId,
      conversation_id: conversationId,
      phone: phone || "system",
      request_id: requestId,
      api_type: apiType,
      provider,
      model_name: modelName,
      model_registry_id: modelData?.id,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cached_tokens: cachedTokens,
      total_tokens: totalTokens,
      input_units: seconds || characters || 0, // Whisper=seconds, TTS=characters
      output_units: images || 0, // Vision/Image-gen
      latency_ms: latencyMs,
      was_cached: wasCached,
      was_fallback: wasFallback,
      fallback_reason: fallbackReason,
      cost_usd: costUSD,
      cost_brl: costBRL,
      usd_to_brl_rate: usdToBrlRate,
      metadata,
    };

    const { error: logError } = await supabase.from("gateway_usage_logs")
      .insert(baseInsertPayload);

    if (logError) {
      // Backward compatibility: older DB may not have api_type column yet.
      const isMissingApiTypeColumn = (logError as any)?.code === "PGRST204" &&
        typeof (logError as any)?.message === "string" &&
        (logError as any).message.includes("'api_type'");

      // Backward compatibility: DB constraint might not include newer api types (e.g. 'tts').
      const isApiTypeConstraintViolation =
        (logError as any)?.code === "23514" &&
        typeof (logError as any)?.message === "string" &&
        (logError as any).message.includes("gateway_usage_logs_api_type_check");

      if (isMissingApiTypeColumn) {
        const { api_type: _apiType, ...payloadWithoutApiType } =
          baseInsertPayload as any;
        const { error: retryError } = await supabase
          .from("gateway_usage_logs")
          .insert(payloadWithoutApiType);

        if (retryError) {
          console.error(
            "[Unified Tracking] Error inserting log (retry without api_type):",
            retryError,
          );
        }
      } else if (isApiTypeConstraintViolation) {
        // Retry without api_type so the column default ('chat') is applied.
        // Preserve the original apiType in metadata so we can diagnose and backfill after migration.
        const { api_type: _apiType, ...payloadWithoutApiType } =
          baseInsertPayload as any;

        const retryPayload = {
          ...payloadWithoutApiType,
          metadata: {
            ...(payloadWithoutApiType.metadata ?? {}),
            api_type_fallback: apiType,
          },
        };

        const { error: retryError } = await supabase
          .from("gateway_usage_logs")
          .insert(retryPayload);

        if (retryError) {
          console.error(
            "[Unified Tracking] Error inserting log (retry without api_type after constraint violation):",
            retryError,
          );
        }
      } else {
        console.error("[Unified Tracking] Error inserting log:", logError);
      }
      // Continue anyway - tracking failure shouldn't break API calls
    }

    // =====================================================
    // 6. INCREMENT MODULAR BUDGET (tokens + BRL)
    // =====================================================

    const { error: budgetError } = await supabase.rpc(
      "increment_unified_budget",
      {
        p_client_id: clientId,
        p_tokens: totalTokens,
        p_cost_brl: costBRL,
      },
    );

    if (budgetError) {
      console.error(
        "[Unified Tracking] Error incrementing budget:",
        budgetError,
      );
    }

    // =====================================================
    // 7. CHECK BUDGET STATUS
    // =====================================================

    const budgetAvailable = await checkBudgetAvailable(clientId);

    if (!budgetAvailable) {
      console.warn(
        `[Unified Tracking] Budget limit reached for client ${clientId}`,
      );
      // TODO: Send alert email/webhook
    }

    // =====================================================
    // 8. BACKWARD COMPATIBILITY: Insert to usage_logs
    // =====================================================

    if (isLegacyAPI(apiType)) {
      await insertLegacyLog({
        clientId,
        conversationId,
        phone,
        source: mapAPITypeToSource(apiType, provider),
        model: modelName,
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens,
        costUSD,
        metadata,
      });
    }

    if (process.env.UNIFIED_TRACKING_DEBUG === "true") {
      console.log(
        `[Unified Tracking] ${apiType.toUpperCase()}: ${
          formatUsageAmount(params)
        } → ${totalTokens} tokens, R$ ${costBRL.toFixed(4)}`,
      );
    }
  } catch (error: any) {
    console.error("[Unified Tracking] Error:", error);
    // Don't throw - tracking failure shouldn't break API calls
  }
};

// =====================================================
// COST CALCULATION
// =====================================================

interface CostCalculationParams {
  apiType: APIType;
  modelData: any;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  characters: number;
  seconds: number;
  images: number;
}

const calculateCostFromRegistry = (params: CostCalculationParams): number => {
  const {
    apiType,
    modelData,
    inputTokens,
    outputTokens,
    cachedTokens,
    characters,
    seconds,
    images,
  } = params;

  // If no pricing data, use hardcoded fallback
  if (!modelData) {
    return calculateFallbackCost(params);
  }

  switch (apiType) {
    case "chat":
    case "embeddings":
      // Token-based pricing
      const inputCost = (inputTokens / 1_000_000) *
        (modelData.input_price_per_million || 0);
      const outputCost = (outputTokens / 1_000_000) *
        (modelData.output_price_per_million || 0);
      const cachedCost =
        cachedTokens > 0 && modelData.cached_input_price_per_million
          ? (cachedTokens / 1_000_000) *
            modelData.cached_input_price_per_million
          : 0;

      return inputCost + outputCost - cachedCost;

    case "tts":
      // TTS pricing: ~$15/1M characters (tts-1-hd) or $7.50/1M (tts-1)
      // Convert to per-character cost
      const costPerMillion = modelData.input_price_per_million || 15.0;
      return (characters / 1_000_000) * costPerMillion;

    case "whisper":
      // Whisper: $0.006 per minute
      const minutes = seconds / 60;
      const costPerMinute = modelData.input_price_per_million || 0.006;
      return minutes * costPerMinute;

    case "vision":
    case "image-gen":
      // Per-image pricing
      const costPerImage = modelData.output_price_per_million || 0.01275;
      return images * costPerImage;

    default:
      return 0;
  }
};

/**
 * Fallback pricing when ai_models_registry doesn't have data
 */
const calculateFallbackCost = (params: CostCalculationParams): number => {
  const {
    apiType,
    inputTokens,
    outputTokens,
    cachedTokens,
    characters,
    seconds,
    images,
  } = params;

  switch (apiType) {
    case "chat":
      // GPT-4o default: $2.5 input, $10 output per 1M tokens
      return ((inputTokens / 1_000_000) * 2.5) +
        ((outputTokens / 1_000_000) * 10.0);

    case "tts":
      // TTS-1-HD: $15/1M characters
      return (characters / 1_000_000) * 15.0;

    case "whisper":
      // Whisper: $0.006/minute
      return (seconds / 60) * 0.006;

    case "vision":
      // GPT-4o Vision: $0.01275 per image
      return images * 0.01275;

    case "embeddings":
      // text-embedding-3-small: $0.02/1M tokens
      return (inputTokens / 1_000_000) * 0.02;

    case "image-gen":
      // DALL-E 3: $0.04 per image (1024x1024)
      return images * 0.04;

    default:
      console.warn(
        `[Unified Tracking] Unknown API type for fallback pricing: ${apiType}`,
      );
      return 0;
  }
};

// =====================================================
// BUDGET CHECKING
// =====================================================

export const checkBudgetAvailable = async (
  clientId: string,
): Promise<boolean> => {
  try {
    const supabase = createServerClient();

    const { data, error } = await supabase.rpc("check_budget_available", {
      p_client_id: clientId,
    });

    if (error) {
      console.error("[Budget Check] Error:", error);
      return true; // Graceful degradation: allow on error
    }

    return data === true;
  } catch (error) {
    console.error("[Budget Check] Exception:", error);
    return true;
  }
};

/**
 * Get budget status for a client
 */
export const getBudgetStatus = async (clientId: string) => {
  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("budget_status")
      .select("*")
      .eq("client_id", clientId)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("[Budget Status] Error:", error);
    return null;
  }
};

// =====================================================
// HELPERS
// =====================================================

/**
 * Check if API type should also log to legacy usage_logs
 */
const isLegacyAPI = (apiType: APIType): boolean => {
  return ["chat", "whisper"].includes(apiType);
};

/**
 * Map API type to legacy source field
 */
const mapAPITypeToSource = (apiType: APIType, provider: Provider): string => {
  if (apiType === "whisper") return "whisper";
  if (provider === "groq") return "groq";
  return "openai";
};

/**
 * Insert to legacy usage_logs table (backward compatibility)
 */
const insertLegacyLog = async (params: {
  clientId: string;
  conversationId?: string;
  phone: string;
  source: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUSD: number;
  metadata?: any;
}): Promise<void> => {
  try {
    const supabase = createServerClient();

    await supabase.from("usage_logs").insert({
      client_id: params.clientId,
      conversation_id: params.conversationId,
      phone: params.phone,
      source: params.source,
      model: params.model,
      prompt_tokens: params.promptTokens,
      completion_tokens: params.completionTokens,
      total_tokens: params.totalTokens,
      cost_usd: params.costUSD,
      metadata: params.metadata,
    });
  } catch (error) {
    console.error("[Legacy Log] Error:", error);
    // Non-critical - don't throw
  }
};

/**
 * Format usage amount for logging
 */
const formatUsageAmount = (params: UnifiedTrackingParams): string => {
  switch (params.apiType) {
    case "chat":
      return `${(params.inputTokens || 0) + (params.outputTokens || 0)} tokens`;
    case "tts":
      return `${params.characters} chars`;
    case "whisper":
      return `${Math.ceil((params.seconds || 0) / 60)} min`;
    case "vision":
      return `${params.images} images`;
    case "embeddings":
      return `${params.inputTokens} tokens`;
    case "image-gen":
      return `${params.images} images`;
    default:
      return "unknown";
  }
};

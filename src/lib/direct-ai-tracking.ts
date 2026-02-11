/**
 * 📊 Direct AI Usage Tracking
 *
 * Simplified tracking for direct AI SDK calls (no gateway)
 * Delegates to unified tracking system for consistency
 *
 * Features:
 * - Logs to gateway_usage_logs table (same as before)
 * - Calculates cost from ai_models_registry
 * - Increments client budgets
 * - Async, non-blocking (errors logged, not thrown)
 */

import { trackUnifiedUsage } from "./unified-tracking";
import type { Provider } from "./unified-tracking";

// =====================================================
// TYPES
// =====================================================

export interface DirectAIUsageParams {
  clientId: string;
  conversationId?: string;
  phone: string;
  provider: "openai" | "groq";
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  metadata?: Record<string, any>;
}

// =====================================================
// MAIN FUNCTION: logDirectAIUsage
// =====================================================

/**
 * Logs AI usage for direct SDK calls
 *
 * Delegates to trackUnifiedUsage which:
 * 1. Looks up model pricing in ai_models_registry
 * 2. Calculates cost (USD → BRL conversion)
 * 3. Logs to gateway_usage_logs
 * 4. Increments client budget usage
 *
 * @param params - Usage parameters
 * @returns Promise<void> - Never throws, logs errors
 */
export const logDirectAIUsage = async (
  params: DirectAIUsageParams,
): Promise<void> => {
  try {
    console.log("[Direct AI Tracking] Logging usage:", {
      clientId: params.clientId,
      provider: params.provider,
      model: params.modelName,
      tokens: params.inputTokens + params.outputTokens,
    });

    // Delegate to unified tracking system
    await trackUnifiedUsage({
      clientId: params.clientId,
      conversationId: params.conversationId,
      phone: params.phone,
      apiType: "chat", // Direct AI calls are always chat
      provider: params.provider as Provider,
      modelName: params.modelName,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      cachedTokens: 0, // No caching for direct calls
      latencyMs: params.latencyMs,
      wasCached: false, // No gateway cache
      wasFallback: false, // Direct calls, no fallback
      metadata: {
        source: "direct-sdk",
        ...params.metadata,
      },
    });

    console.log("[Direct AI Tracking] Usage logged successfully");
  } catch (error) {
    // Never throw - tracking failures should not break AI responses
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Direct AI Tracking] Error logging usage:", {
      error: errorMessage,
      clientId: params.clientId,
      provider: params.provider,
      model: params.modelName,
    });
  }
};

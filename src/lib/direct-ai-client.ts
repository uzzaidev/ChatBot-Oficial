/**
 * 🔗 Direct AI Client - Replacement for AI Gateway
 *
 * Uses ONLY client Vault credentials (never shared keys)
 * Supports: OpenAI, Groq
 *
 * Features:
 * - Direct SDK calls (no gateway abstraction)
 * - Multi-tenant isolation (client-specific Vault keys)
 * - Budget enforcement (via checkBudgetAvailable)
 * - Usage tracking (via logDirectAIUsage)
 * - Tool call normalization (compatible with existing flows)
 */

import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import type { CoreMessage } from "ai";
import { generateText } from "ai";
import { logDirectAIUsage } from "./direct-ai-tracking";
import { checkBudgetAvailable } from "./unified-tracking";
import { getClientVaultCredentials } from "./vault";

// =====================================================
// TYPES
// =====================================================

export interface DirectAICallConfig {
  clientId: string;
  clientConfig: {
    id?: string;
    name?: string;
    primaryModelProvider?: string; // 'openai' | 'groq'
    openaiModel?: string;
    groqModel?: string;
  };
  messages: CoreMessage[];
  tools?: Record<string, any>;
  legacyToolDefinitions?: unknown;
  settings?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high" | "xhigh";
  };
  // For tracking
  conversationId?: string;
  phone?: string;
  metadata?: Record<string, any>;
  skipUsageLogging?: boolean;
}

export interface DirectAIResponse {
  text: string;
  toolCalls?: Array<{
    id: string;
    type: string;
    function: { name: string; arguments: string };
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: string;
  latencyMs: number;
  finishReason?: string;
}

// =====================================================
// INTERNAL HELPERS (copied from AI Gateway for compatibility)
// =====================================================

/**
 * Normalizes tools to AI SDK format
 * Ensures inputSchema is present (may be called parameters in older code)
 */
const normalizeToolsForAISDK = (
  tools: DirectAICallConfig["tools"],
): DirectAICallConfig["tools"] | undefined => {
  if (!tools) {
    return undefined;
  }

  const entries = Object.entries(tools);
  const normalizedEntries = entries
    .map(([name, toolDef]) => {
      if (!toolDef || typeof toolDef !== "object") {
        return null;
      }

      // AI SDK v5 expects `inputSchema`. Older code may still use `parameters`.
      const inputSchema =
        (toolDef as any).inputSchema ?? (toolDef as any).parameters;

      if (!inputSchema) {
        return null;
      }

      return [name, { ...(toolDef as any), inputSchema }] as const;
    })
    .filter(Boolean) as Array<readonly [string, any]>;

  if (normalizedEntries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(normalizedEntries);
};

/**
 * Normalizes tool calls from AI response to standard format
 * Handles different providers returning different formats
 */
const normalizeToolCalls = (
  toolCalls: unknown,
): DirectAIResponse["toolCalls"] | undefined => {
  if (!Array.isArray(toolCalls)) {
    return undefined;
  }

  return toolCalls
    .map((toolCall: any, index: number) => {
      const name =
        toolCall?.toolName ||
        toolCall?.name ||
        toolCall?.function?.name ||
        toolCall?.functionName;

      if (!name || typeof name !== "string") {
        return null;
      }

      const rawArgs =
        toolCall?.args ??
        toolCall?.arguments ??
        toolCall?.function?.arguments ??
        toolCall?.input;

      const argsString =
        typeof rawArgs === "string" ? rawArgs : JSON.stringify(rawArgs ?? {});

      const id = toolCall?.toolCallId || toolCall?.id || `${name}-${index}`;

      return {
        id,
        type: "function",
        function: {
          name,
          arguments: argsString,
        },
      };
    })
    .filter(Boolean) as any;
};

// Models that are explicitly NON-reasoning (must never receive reasoning_effort)
const NON_REASONING_MODELS = new Set([
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4-turbo",
  "gpt-4",
  "gpt-3.5-turbo",
]);

const supportsReasoningEffort = (provider: string, model: string): boolean => {
  if (provider !== "openai") return false;
  const n = model.toLowerCase();
  if (NON_REASONING_MODELS.has(n)) return false;
  // All gpt-5.x and gpt-5-* models support reasoning
  if (n.startsWith("gpt-5")) return true;
  // Classic o-series reasoning models
  if (n.startsWith("o1") || n.startsWith("o3") || n.startsWith("o4"))
    return true;
  return false;
};

/**
 * Returns a reasoning_effort value that is valid for the given model.
 * Some models only accept a subset of the 6 possible values.
 *
 * Per official docs:
 * - gpt-5.4-pro / gpt-5.5-pro : medium, high, xhigh  (no none/minimal/low)
 * - gpt-5.1                   : none, low, medium, high  (no minimal/xhigh)
 * - gpt-5 / gpt-5-mini / gpt-5-nano : minimal, low, medium, high  (no none/xhigh)
 * - gpt-5.5 / gpt-5.4 / gpt-5.2    : none, low, medium, high, xhigh  (all except minimal)
 * - o1 / o3 / o4-*            : low, medium, high  (classic o-series)
 */
const getEffectiveReasoningEffort = (model: string, effort: string): string => {
  const n = model.toLowerCase();

  // gpt-5.4-pro / gpt-5.5-pro: medium, high, xhigh ONLY
  if (n.startsWith("gpt-5.4-pro") || n.startsWith("gpt-5.5-pro")) {
    if (["none", "minimal", "low"].includes(effort)) {
      console.warn(
        `[Direct AI] ${model} only supports medium/high/xhigh reasoning_effort. Clamping "${effort}" → "medium"`,
      );
      return "medium";
    }
    return effort;
  }

  // gpt-5.1: none (default), low, medium, high — no minimal, no xhigh
  if (n.startsWith("gpt-5.1")) {
    if (effort === "minimal") return "low";
    if (effort === "xhigh") {
      console.warn(
        `[Direct AI] ${model} does not support "xhigh". Clamping → "high"`,
      );
      return "high";
    }
    return effort;
  }

  // gpt-5 base family (gpt-5, gpt-5-mini, gpt-5-nano): minimal, low, medium, high — no none, no xhigh
  if (n === "gpt-5" || n.startsWith("gpt-5-")) {
    if (effort === "none") return "minimal";
    if (effort === "xhigh") {
      console.warn(
        `[Direct AI] ${model} does not support "xhigh". Clamping → "high"`,
      );
      return "high";
    }
    return effort;
  }

  // Classic o-series (o1, o3, o4-mini): low, medium, high
  if (n.startsWith("o1") || n.startsWith("o3") || n.startsWith("o4")) {
    if (effort === "none" || effort === "minimal") return "low";
    if (effort === "xhigh") return "high";
    return effort;
  }

  // gpt-5.5, gpt-5.4, gpt-5.2 and all others: full range except minimal
  if (effort === "minimal") return "low";
  return effort;
};

/**
 * Minimum recommended output tokens per reasoning_effort level.
 * Context window management: reasoning tokens count toward the output token budget.
 * If maxTokens is too low, the model may exhaust the budget on reasoning alone,
 * leaving no tokens for the actual visible response.
 *
 * Reference: https://developers.openai.com/api/docs/guides/reasoning
 */
const MIN_OUTPUT_TOKENS_FOR_REASONING: Record<string, number> = {
  none: 0, // no reasoning tokens generated
  minimal: 1_500, // a few hundred reasoning tokens expected
  low: 4_000, // up to a few thousand reasoning tokens
  medium: 10_000, // moderate reasoning — can be several thousand tokens
  high: 20_000, // heavy reasoning — can reach tens of thousands
  xhigh: 50_000, // maximum reasoning — may use 50k+ tokens
};

// =====================================================
// MAIN FUNCTION: callDirectAI
// =====================================================

/**
 * Direct AI call using client Vault credentials
 *
 * Flow:
 * 1. Budget check (throws if exceeded)
 * 2. Get Vault credentials for client
 * 3. Select provider and model based on config
 * 4. Create provider instance
 * 5. Call AI via direct SDK
 * 6. Log usage (async, non-blocking)
 * 7. Return standardized response
 *
 * @throws Error if budget exceeded
 * @throws Error if no API key in Vault
 * @throws Error if API call fails
 */
export const callDirectAI = async (
  config: DirectAICallConfig,
): Promise<DirectAIResponse> => {
  const startTime = Date.now();

  try {
    // 1. Budget check - throws if exceeded
    const budgetAvailable = await checkBudgetAvailable(config.clientId);
    if (!budgetAvailable) {
      throw new Error(
        "❌ Limite de budget atingido. Entre em contato com o suporte.",
      );
    }

    // 2. Get Vault credentials
    const credentials = await getClientVaultCredentials(config.clientId);

    // 3. Select provider and model
    const provider = config.clientConfig.primaryModelProvider || "openai";
    let apiKey: string | null = null;
    let model: string;

    if (provider === "groq") {
      apiKey = credentials.groqApiKey;
      model = config.clientConfig.groqModel || "llama-3.3-70b-versatile";
    } else {
      // Default to OpenAI
      apiKey = credentials.openaiApiKey;
      model = config.clientConfig.openaiModel || "gpt-5-nano";
    }

    // Validate API key exists
    if (!apiKey) {
      throw new Error(
        `❌ No ${provider.toUpperCase()} API key configured in Vault for client ${
          config.clientId
        }. ` + `Please configure in Settings: /dashboard/settings`,
      );
    }

    console.log(
      `[Direct AI] ${provider}/${model} | client=${config.clientId.slice(
        0,
        8,
      )}`,
    );

    // 4. Create provider instance
    const providerInstance =
      provider === "groq" ? createGroq({ apiKey }) : createOpenAI({ apiKey });

    const modelInstance = providerInstance(model);

    // 5. Normalize tools
    const normalizedTools = normalizeToolsForAISDK(config.tools);

    // 6. Build generate params (only include defined parameters)
    const generateParams: any = {
      model: modelInstance,
      messages: config.messages,
      tools: normalizedTools,
    };

    // Add optional parameters only if defined
    const isReasoningModel = supportsReasoningEffort(provider, model);

    // Temperature: reasoning models do not accept this parameter
    if (config.settings?.temperature !== undefined && !isReasoningModel) {
      generateParams.temperature = config.settings.temperature;
    }

    if (isReasoningModel) {
      const rawEffort = config.settings?.reasoningEffort || "low";
      const effectiveEffort = getEffectiveReasoningEffort(model, rawEffort);

      generateParams.providerOptions = {
        openai: {
          reasoningEffort: effectiveEffort,
        },
      };

      // Context window management: reasoning tokens count toward the output budget.
      // If maxTokens is set too low, the model may spend the entire budget on
      // reasoning tokens with nothing left for the visible response.
      // Reference: https://developers.openai.com/api/docs/guides/reasoning
      const minTokens =
        MIN_OUTPUT_TOKENS_FOR_REASONING[effectiveEffort] ?? 4_000;

      if (config.settings?.maxTokens !== undefined) {
        if (config.settings.maxTokens < minTokens) {
          console.warn(
            `[Direct AI] maxTokens (${config.settings.maxTokens}) may be too low for ` +
              `${model} with reasoning_effort="${effectiveEffort}". ` +
              `Reasoning tokens alone can consume ${minTokens}+ tokens. ` +
              `Setting maxTokens to ${minTokens} to avoid empty responses.`,
          );
          generateParams.maxTokens = minTokens;
        } else {
          generateParams.maxTokens = config.settings.maxTokens;
        }
      }
      // If maxTokens is not set for reasoning models, do NOT default it —
      // let the API decide based on the model's context window.
    } else {
      if (config.settings?.maxTokens !== undefined) {
        generateParams.maxTokens = config.settings.maxTokens;
      }
    }
    if (config.settings?.topP !== undefined) {
      generateParams.topP = config.settings.topP;
    }
    if (config.settings?.frequencyPenalty !== undefined) {
      generateParams.frequencyPenalty = config.settings.frequencyPenalty;
    }
    if (config.settings?.presencePenalty !== undefined) {
      generateParams.presencePenalty = config.settings.presencePenalty;
    }

    // 7. Call AI
    const result = await generateText(generateParams);

    const latencyMs = Date.now() - startTime;
    console.log("[Direct AI] Response received in", latencyMs, "ms");

    // 8. Normalize tool calls
    const normalizedToolCalls = normalizeToolCalls(result.toolCalls);

    // 9. Extract usage (cast to any for compatibility)
    const usage = result.usage as any;

    const promptTokens = usage.promptTokens || 0;
    const completionTokens = usage.completionTokens || 0;
    const totalTokens = usage.totalTokens || promptTokens + completionTokens;

    // Extract reasoning tokens if reported by the model (gpt-5.x / o-series)
    const reasoningTokens: number =
      usage?.reasoningTokens ||
      usage?.output_tokens_details?.reasoning_tokens ||
      (result as any)?.providerMetadata?.openai?.reasoningTokens ||
      0;
    if (reasoningTokens > 0) {
      const visibleTokens = completionTokens - reasoningTokens;
      console.log(
        `[Direct AI] Reasoning tokens: ${reasoningTokens} | Visible output tokens: ${visibleTokens}`,
      );
    }

    // Detect "reasoning consumed all tokens" scenario.
    // Per OpenAI docs (reasoning-best-practices): when finishReason is "length"
    // on a reasoning model, the model may have spent the entire output token
    // budget on reasoning tokens before generating any visible text. The caller
    // incurs costs for input + reasoning tokens with zero visible response.
    // Reference: https://developers.openai.com/api/docs/guides/reasoning-best-practices
    if (isReasoningModel && result.finishReason === "length") {
      const visibleText = result.text?.trim() ?? "";
      if (visibleText.length === 0) {
        const currentMax =
          generateParams.maxTokens ?? config.settings?.maxTokens ?? "not set";
        const effectiveEffort =
          generateParams.providerOptions?.openai?.reasoningEffort ?? "unknown";
        const minSuggested =
          MIN_OUTPUT_TOKENS_FOR_REASONING[effectiveEffort] ?? 4_000;

        console.error(
          `[Direct AI] REASONING BUDGET EXHAUSTED — ${model} (effort="${effectiveEffort}") ` +
            `used all ${currentMax} output tokens on reasoning tokens before producing any visible output. ` +
            `Reasoning tokens used: ${reasoningTokens}. ` +
            `Suggestion: increase maxTokens to at least ${
              minSuggested * 2
            } for this effort level.`,
        );

        throw new Error(
          `O modelo ${model} esgotou o orçamento de tokens (${currentMax}) gerando tokens de raciocínio ` +
            `antes de produzir qualquer resposta visível. ` +
            `Aumente max_tokens para pelo menos ${
              minSuggested * 2
            } ou reduza o reasoning_effort de "${effectiveEffort}".`,
        );
      }

      // Partial visible output — warn but don't throw; caller receives what was generated
      console.warn(
        `[Direct AI] INCOMPLETE RESPONSE — ${model} hit maxTokens (${
          generateParams.maxTokens ?? config.settings?.maxTokens ?? "not set"
        }) ` +
          `with ${result.text?.length ?? 0} chars of visible output. ` +
          `Reasoning tokens: ${reasoningTokens}. Response may be truncated.`,
      );
    }

    // 10. Log usage (async, non-blocking)
    if (!config.skipUsageLogging) {
      logDirectAIUsage({
        clientId: config.clientId,
        conversationId: config.conversationId,
        phone: config.phone || "unknown",
        provider: provider as "openai" | "groq",
        modelName: model,
        inputTokens: promptTokens,
        outputTokens: completionTokens,
        latencyMs,
        metadata: config.metadata,
      }).catch((err) => {
        console.error("[Direct AI] Failed to log usage:", err);
      });
    }

    // 11. Return standardized response
    return {
      text: result.text,
      toolCalls: normalizedToolCalls,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens,
      },
      model,
      provider,
      latencyMs,
      finishReason: result.finishReason,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error("[Direct AI] Error in callDirectAI:", {
      clientId: config.clientId,
      provider: config.clientConfig.primaryModelProvider || "openai",
      error: errorMessage,
      latencyMs,
    });

    // Re-throw with context
    throw new Error(`Failed to generate AI response: ${errorMessage}`);
  }
};

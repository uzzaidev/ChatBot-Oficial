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
  settings?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
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
    // gpt-5-nano uses reasoning — temperature is not a supported parameter
    const isNanoReasoning = provider === "openai" && model === "gpt-5-nano";
    if (config.settings?.temperature !== undefined && !isNanoReasoning) {
      generateParams.temperature = config.settings.temperature;
    }
    if (isNanoReasoning) {
      generateParams.providerOptions = { openai: { reasoningEffort: "low" } };
    }
    if (config.settings?.maxTokens !== undefined) {
      generateParams.maxTokens = config.settings.maxTokens;
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

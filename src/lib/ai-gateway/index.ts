/**
 * AI GATEWAY - MAIN INTERFACE
 *
 * Unified interface for AI calls - abstracts gateway vs direct SDK
 * Supports: OpenAI, Groq, Anthropic, Google
 */

import { generateText, streamText } from "ai";
import type { CoreMessage } from "ai";
import { getGatewayProvider, createGatewayInstance } from "./providers";
import { getSharedGatewayConfig, shouldUseGateway } from "./config";
import { logGatewayUsage } from "./usage-tracking";

// =====================================================
// TYPES
// =====================================================

export interface AICallConfig {
  clientId: string;
  clientConfig: {
    id: string;
    name: string;
    slug: string;
    primaryModelProvider: string;
    openaiModel?: string;
    groqModel?: string;
    systemPrompt?: string;
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
  stream?: boolean;
  // Optional fields for usage tracking
  conversationId?: string;
  phone?: string;
  skipUsageLogging?: boolean; // Allow disabling logging if needed
}

export interface AIResponse {
  text: string;
  toolCalls?: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cachedTokens?: number;
  };
  model: string;
  provider: string;
  wasCached: boolean;
  wasFallback: boolean;
  fallbackReason?: string;
  primaryAttemptedProvider?: string;
  primaryAttemptedModel?: string;
  fallbackUsedProvider?: string;
  fallbackUsedModel?: string;
  latencyMs: number;
  requestId?: string;
  finishReason?: string;
}

// =====================================================
// INTERNAL HELPERS
// =====================================================

const normalizeToolsForAISDK = (
  tools: AICallConfig["tools"],
): AICallConfig["tools"] | undefined => {
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
      const inputSchema = (toolDef as any).inputSchema ??
        (toolDef as any).parameters;

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

const logToolsDebug = (tools: AICallConfig["tools"] | undefined) => {
  if (process.env.AI_GATEWAY_DEBUG_TOOLS !== "true") {
    return;
  }

  const toolNames = tools ? Object.keys(tools) : [];
  console.log(
    `[AI Gateway][Tools] toolCount=${toolNames.length} tools=${
      toolNames.join(",")
    }`,
  );

  toolNames.forEach((name) => {
    const toolDef: any = tools?.[name];
    const schema = toolDef?.inputSchema;
    const schemaType = schema?.constructor?.name ?? typeof schema;
    console.log(
      `[AI Gateway][Tools] ${name}: hasInputSchema=${!!schema} schemaType=${schemaType}`,
    );
  });
};

// =====================================================
// MAIN FUNCTION: callAI
// =====================================================
/**
 * Main abstraction layer for AI calls
 * Routes to gateway or direct SDK based on configuration
 */
export const callAI = async (config: AICallConfig): Promise<AIResponse> => {
  const startTime = Date.now();

  try {
    // Check if gateway should be used (env var + client flag)
    const useGateway = await shouldUseGateway(config.clientId);

    if (useGateway) {
      // Get SHARED gateway configuration
      const gatewayConfig = await getSharedGatewayConfig();

      if (!gatewayConfig) {
        throw new Error(
          "AI Gateway is enabled for this environment/client, but the shared gateway configuration was not found or is not accessible. " +
            "Ensure the production database has exactly one row in shared_gateway_config, the Vault RPC functions are deployed, and " +
            "the server has SUPABASE_SERVICE_ROLE_KEY configured.",
        );
      }

      // Route through AI Gateway
      return await callAIViaGateway(config, gatewayConfig, startTime);
    } else {
      // Route through direct SDK (legacy path)
      return await callAIDirectly(config, startTime);
    }
  } catch (error) {
    console.error("[AI Gateway] Error in callAI:", error);
    throw error;
  }
};

// =====================================================
// GATEWAY PATH
// =====================================================

const callAIViaGateway = async (
  config: AICallConfig,
  gatewayConfig: any,
  startTime: number,
): Promise<AIResponse> => {
  const { messages, tools, settings = {} } = config;
  const normalizedTools = normalizeToolsForAISDK(tools);

  // Determine which model to use (from client config)
  const primaryModel = config.clientConfig.openaiModel ||
    config.clientConfig.groqModel || "gpt-4o-mini";
  const provider =
    (config.clientConfig.primaryModelProvider || "openai") as any;

  const primaryAttemptedProvider = provider;
  const primaryAttemptedModel = primaryModel;

  // Use Vercel AI Gateway with single gateway key
  const gatewayApiKey = gatewayConfig.gatewayApiKey;

  if (!gatewayApiKey) {
    throw new Error(
      "Gateway API key not configured. Please add it in /dashboard/ai-gateway/setup"
    );
  }

  // Create gateway instance
  const gateway = createGatewayInstance(gatewayApiKey);

  logToolsDebug(normalizedTools);

  // Format model as "provider/model" (required by Vercel AI Gateway)
  const modelIdentifier = `${provider}/${primaryModel}`; // e.g., "openai/gpt-4o-mini"

  // 🔍 DEBUG: Log request details for cache debugging
  console.log("[AI Gateway] Request Details:", {
    model: modelIdentifier,
    messageCount: messages.length,
    messagesPreview: messages.map(m => ({
      role: m.role,
      contentLength: typeof m.content === 'string' ? m.content.length : 0,
      contentPreview: typeof m.content === 'string' ? m.content.substring(0, 100) : '[complex]'
    })),
    hasTools: !!normalizedTools && Object.keys(normalizedTools).length > 0,
    toolCount: normalizedTools ? Object.keys(normalizedTools).length : 0,
  });

  // Generate response using Vercel AI Gateway
  // Gateway handles: cache, fallback, telemetry automatically
  const result = await generateText({
    model: gateway(modelIdentifier), // ✅ Routes through Vercel AI Gateway
    messages,
    tools: normalizedTools,
    experimental_telemetry: { isEnabled: true },
  });

  const latencyMs = Date.now() - startTime;

  // ✅ Extract gateway headers
  const headers = result.response?.headers || {};

  // 🔍 DEBUG: Log ALL headers for cache debugging
  console.log("[AI Gateway] Response Headers:", {
    allHeaders: Object.keys(headers),
    cacheHeaders: {
      'x-vercel-cache': headers["x-vercel-cache"],
      'x-vercel-ai-cache-status': headers["x-vercel-ai-cache-status"],
      'x-vercel-ai-provider': headers["x-vercel-ai-provider"],
      'x-vercel-ai-model': headers["x-vercel-ai-model"],
      'x-vercel-ai-request-id': headers["x-vercel-ai-request-id"],
      'x-vercel-ai-data-stream-id': headers["x-vercel-ai-data-stream-id"],
    }
  });

  const headerIndicatesCache = headers["x-vercel-cache"] === "HIT" ||
    headers["x-vercel-ai-cache-status"] === "hit";
  const actualProvider = headers["x-vercel-ai-provider"] || provider;
  const actualModel = headers["x-vercel-ai-model"] || primaryModel;
  const requestId = headers["x-vercel-ai-data-stream-id"] ||
    headers["x-vercel-ai-request-id"];

  const usage = result.usage as any;
  const normalizedToolCalls = normalizeToolCalls((result as any).toolCalls);

  // Handle token counting - some providers don't separate prompt/completion tokens
  const promptTokens = usage.promptTokens || 0;
  const completionTokens = usage.completionTokens || 0;
  const totalTokens = usage.totalTokens || 0;

  // If total is provided but breakdown isn't, estimate the split
  // Typically ~70% prompt, ~30% completion for most interactions
  let inputTokens = promptTokens;
  let outputTokens = completionTokens;

  if (totalTokens > 0 && promptTokens === 0 && completionTokens === 0) {
    // Estimate: 70% input, 30% output (rough approximation)
    inputTokens = Math.floor(totalTokens * 0.7);
    outputTokens = totalTokens - inputTokens;
  }

  // Some providers report cached tokens (e.g., OpenAI prompt caching).
  const cachedTokensFromUsageRaw = usage?.cachedTokens ??
    usage?.cached_tokens;
  const cachedTokensFromUsage =
    Number.isFinite(Number(cachedTokensFromUsageRaw))
      ? Number(cachedTokensFromUsageRaw)
      : 0;

  const cachedTokens = cachedTokensFromUsage > 0
    ? cachedTokensFromUsage
    : headerIndicatesCache
    ? inputTokens
    : 0;

  const wasCached = headerIndicatesCache || cachedTokensFromUsage > 0;

  const response: AIResponse = {
    text: result.text,
    toolCalls: normalizedToolCalls,
    usage: {
      promptTokens: inputTokens,
      completionTokens: outputTokens,
      totalTokens: totalTokens,
      cachedTokens,
    },
    model: actualModel,
    provider: actualProvider,
    wasCached,
    wasFallback: false,
    primaryAttemptedProvider,
    primaryAttemptedModel,
    latencyMs,
    requestId,
    finishReason: result.finishReason,
  };

  // ✅ Log usage to database (async, don't block response)
  if (!config.skipUsageLogging) {
    logGatewayUsage({
      clientId: config.clientId,
      conversationId: config.conversationId,
      phone: config.phone || "test-call",
      provider: actualProvider,
      modelName: actualModel,
      inputTokens: inputTokens,
      outputTokens: outputTokens,
      cachedTokens: response.usage.cachedTokens || 0,
      latencyMs: response.latencyMs,
      wasCached: response.wasCached,
      wasFallback: false,
      requestId: response.requestId,
      metadata: {
        source: "ai-gateway",
        fallbackReason: undefined,
      },
    }).catch((error) => {
      console.error("[AI Gateway] Failed to log usage:", error);
    });
  }

  return response;
};

// =====================================================
// FALLBACK LOGIC
// =====================================================
// NOTE: Custom fallback removed - Vercel AI Gateway handles automatic fallback
// If a model fails, the gateway automatically tries alternative models
// This simplifies our code and leverages Vercel's intelligent routing

// =====================================================
// DIRECT SDK PATH (Legacy)
// =====================================================

const callAIDirectly = async (
  config: AICallConfig,
  startTime: number,
): Promise<AIResponse> => {
  // Legacy path disabled - use original generateAIResponse.ts instead
  throw new Error(
    "AI Gateway is disabled for this environment/client. Enable ENABLE_AI_GATEWAY=true and enable use_ai_gateway for the client.",
  );
};

// =====================================================
// STREAMING SUPPORT (Future)
// =====================================================

/**
 * Stream AI response (for real-time chat interfaces)
 * TODO: Implement streaming support in Phase 3
 */
export const streamAI = async (config: AICallConfig) => {
  // Not implemented yet - return regular call for now
  return callAI(config);
};

const normalizeToolCalls = (
  toolCalls: unknown,
): AIResponse["toolCalls"] | undefined => {
  if (!Array.isArray(toolCalls)) {
    return undefined;
  }

  return toolCalls
    .map((toolCall: any, index: number) => {
      const name = toolCall?.toolName ||
        toolCall?.name ||
        toolCall?.function?.name ||
        toolCall?.functionName;

      if (!name || typeof name !== "string") {
        return null;
      }

      const rawArgs = toolCall?.args ??
        toolCall?.arguments ??
        toolCall?.function?.arguments ??
        toolCall?.input;

      const argsString = typeof rawArgs === "string"
        ? rawArgs
        : JSON.stringify(rawArgs ?? {});

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

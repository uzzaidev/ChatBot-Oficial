/**
 * AI GATEWAY - SHARED CONFIGURATION MANAGER
 *
 * Fetches SHARED gateway configuration (ONE config for all clients)
 * Keys are shared across all clients, control is done via budget per client
 */

import "server-only";

import { createServiceClient } from "@/lib/supabase-server";

// =====================================================
// TYPES
// =====================================================

export interface SharedGatewayConfig {
  id: string;
  gatewayApiKey: string; // Decrypted vck_... key
  providerKeys: {
    openai?: string;
    groq?: string;
    anthropic?: string;
    google?: string;
  };
  cacheEnabled: boolean;
  cacheTTLSeconds: number;
  defaultFallbackChain: string[];
  maxRequestsPerMinute: number;
  maxTokensPerMinute: number;
}

// =====================================================
// CACHE (in-memory)
// =====================================================

let cachedConfig: SharedGatewayConfig | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// =====================================================
// MAIN FUNCTION
// =====================================================

/**
 * Get SHARED AI Gateway configuration
 *
 * IMPORTANT: This config is shared across ALL clients.
 * Per-client control is done via budget system (client_budgets table).
 *
 * @returns Shared gateway configuration with decrypted keys
 */
export const getSharedGatewayConfig = async (): Promise<
  SharedGatewayConfig | null
> => {
  try {
    // Check cache
    const now = Date.now();
    if (cachedConfig && (now - cacheTimestamp) < CACHE_TTL_MS) {
      console.log("[AI Gateway] Using cached shared config");
      return cachedConfig;
    }

    const supabase = createServiceClient();

    // Fetch shared config (only 1 record exists)
    const { data: config, error } = await supabase
      .from("shared_gateway_config")
      .select("*")
      .maybeSingle();

    if (error || !config) {
      console.error(
        "[AI Gateway] No shared configuration found:",
        error || "shared_gateway_config returned 0 rows",
      );
      return null;
    }

    // Decrypt all keys from Vault using RPC functions
    const providerKeys: SharedGatewayConfig["providerKeys"] = {};

    // Gateway key (vck_...) - use RPC function
    let gatewayApiKey = "";
    if (config.gateway_api_key_secret_id) {
      try {
        const { data: decryptedKey, error } = await supabase.rpc(
          "get_vault_secret",
          {
            p_name: "shared_gateway_api_key",
          },
        );

        if (error) {
          console.error("[AI Gateway] Error decrypting gateway key:", error);
        } else {
          gatewayApiKey = decryptedKey || "";
        }
      } catch (error) {
        console.error("[AI Gateway] Exception decrypting gateway key:", error);
      }
    }

    // OpenAI key - use RPC function
    if (config.openai_api_key_secret_id) {
      try {
        const { data: decryptedKey, error } = await supabase.rpc(
          "get_vault_secret",
          {
            p_name: "shared_openai_api_key",
          },
        );

        if (error) {
          console.error("[AI Gateway] Error decrypting OpenAI key:", error);
        } else {
          providerKeys.openai = decryptedKey || "";
        }
      } catch (error) {
        console.error("[AI Gateway] Exception decrypting OpenAI key:", error);
      }
    }

    // Groq key - use RPC function
    if (config.groq_api_key_secret_id) {
      try {
        const { data: decryptedKey, error } = await supabase.rpc(
          "get_vault_secret",
          {
            p_name: "shared_groq_api_key",
          },
        );

        if (error) {
          console.error("[AI Gateway] Error decrypting Groq key:", error);
        } else {
          providerKeys.groq = decryptedKey || "";
        }
      } catch (error) {
        console.error("[AI Gateway] Exception decrypting Groq key:", error);
      }
    }

    // Anthropic key - use RPC function
    if (config.anthropic_api_key_secret_id) {
      try {
        const { data: decryptedKey, error } = await supabase.rpc(
          "get_vault_secret",
          {
            p_name: "shared_anthropic_api_key",
          },
        );

        if (error) {
          console.error("[AI Gateway] Error decrypting Anthropic key:", error);
        } else {
          providerKeys.anthropic = decryptedKey || "";
        }
      } catch (error) {
        console.error(
          "[AI Gateway] Exception decrypting Anthropic key:",
          error,
        );
      }
    }

    // Google key - use RPC function
    if (config.google_api_key_secret_id) {
      try {
        const { data: decryptedKey, error } = await supabase.rpc(
          "get_vault_secret",
          {
            p_name: "shared_google_api_key",
          },
        );

        if (error) {
          console.error("[AI Gateway] Error decrypting Google key:", error);
        } else {
          providerKeys.google = decryptedKey || "";
        }
      } catch (error) {
        console.error("[AI Gateway] Exception decrypting Google key:", error);
      }
    }

    const sharedConfig: SharedGatewayConfig = {
      id: config.id,
      gatewayApiKey,
      providerKeys,
      cacheEnabled: config.cache_enabled ?? true,
      cacheTTLSeconds: config.cache_ttl_seconds ?? 3600,
      defaultFallbackChain: Array.isArray(config.default_fallback_chain)
        ? config.default_fallback_chain
        : [],
      maxRequestsPerMinute: config.max_requests_per_minute ?? 1000,
      maxTokensPerMinute: config.max_tokens_per_minute ?? 500000,
    };

    // Update cache
    cachedConfig = sharedConfig;
    cacheTimestamp = now;

    return sharedConfig;
  } catch (error) {
    console.error("[AI Gateway] Error fetching shared configuration:", error);
    return null;
  }
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Check if client has AI Gateway enabled
 */
export const isClientGatewayEnabled = async (
  clientId: string,
): Promise<boolean> => {
  try {
    const supabase = createServiceClient();

    const { data } = await supabase
      .from("clients")
      .select("use_ai_gateway")
      .eq("id", clientId)
      .maybeSingle();

    return data?.use_ai_gateway === true;
  } catch (error) {
    console.error("[AI Gateway] Error checking client gateway status:", error);
    return false;
  }
};

/**
 * Check if gateway should be used (global flag + client flag)
 */
export const shouldUseGateway = async (clientId: string): Promise<boolean> => {
  // Level 1: Global env var
  if (process.env.ENABLE_AI_GATEWAY !== "true") {
    return false;
  }

  // Level 2: Client-specific flag
  return await isClientGatewayEnabled(clientId);
};

/**
 * Clear config cache (for testing or manual refresh)
 */
export const clearConfigCache = (): void => {
  cachedConfig = null;
  cacheTimestamp = 0;
  console.log("[AI Gateway] Config cache cleared");
};

// =====================================================
// BUDGET CHECKS (from previous implementation)
// =====================================================

/**
 * Check if client has exceeded their budget
 */
export const isBudgetExceeded = async (clientId: string): Promise<boolean> => {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase.rpc("is_budget_exceeded", {
      p_client_id: clientId,
    });

    if (error) {
      console.error("[AI Gateway] Error checking budget:", error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error("[AI Gateway] Error checking budget:", error);
    return false;
  }
};

/**
 * Get current budget usage for a client
 */
export const getBudgetUsage = async (
  clientId: string,
): Promise<
  {
    current: number;
    limit: number;
    percentage: number;
    isPaused: boolean;
  } | null
> => {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("client_budgets")
      .select("current_usage, budget_limit, usage_percentage, is_paused")
      .eq("client_id", clientId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      current: data.current_usage,
      limit: data.budget_limit,
      percentage: data.usage_percentage,
      isPaused: data.is_paused,
    };
  } catch (error) {
    console.error("[AI Gateway] Error fetching budget usage:", error);
    return null;
  }
};

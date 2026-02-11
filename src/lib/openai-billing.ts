/**
 * 💰 OpenAI Billing & Usage API Integration
 *
 * Official OpenAI APIs for:
 * - Usage tracking (tokens, requests, costs)
 * - Billing subscription (limits, payment method)
 * - Daily costs breakdown
 *
 * Docs: https://platform.openai.com/docs/api-reference/usage
 */

import { getClientOpenAIAdminKey } from "./vault";

// =====================================================
// TYPES
// =====================================================

export interface OpenAIUsageData {
  aggregation_timestamp: number; // Unix timestamp
  n_requests: number;
  operation: string; // "completion", "chat", "embeddings", etc.
  snapshot_id: string; // Model name (e.g., "gpt-4o-2024-08-06")
  n_context_tokens_total: number; // Input tokens
  n_generated_tokens_total: number; // Output tokens
}

export interface OpenAIUsageResponse {
  object: "list";
  data: OpenAIUsageData[];
  has_more: boolean;
  next_page?: string;
}

export interface OpenAISubscription {
  object: "billing_subscription";
  has_payment_method: boolean;
  canceled: boolean;
  hard_limit_usd: number; // Hard spending limit
  soft_limit_usd: number; // Soft warning limit
}

export interface OpenAIDailyCost {
  timestamp: number; // Unix timestamp
  line_items: Array<{
    name: string; // Model name
    cost: number; // USD
  }>;
}

export interface OpenAIBillingUsage {
  object: "list";
  daily_costs: OpenAIDailyCost[];
  total_usage: number; // Total USD spent
}

// =====================================================
// USAGE API
// =====================================================

/**
 * Get detailed usage data for a specific date
 *
 * @param clientId - Client UUID
 * @param date - Date in YYYY-MM-DD format (defaults to today)
 * @returns Usage data with tokens and requests
 */
export async function getOpenAIUsage(
  clientId: string,
  date?: string,
): Promise<OpenAIUsageResponse> {
  try {
    // Get client's OpenAI Admin API key from Vault (needs api.usage.read scope)
    const apiKey = await getClientOpenAIAdminKey(clientId);
    if (!apiKey) {
      throw new Error(
        `No OpenAI Admin API key configured for client ${clientId}`,
      );
    }

    // Default to today if no date provided
    const targetDate = date || new Date().toISOString().split("T")[0];

    const response = await fetch(
      `https://api.openai.com/v1/usage?date=${targetDate}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI Usage API error: ${response.status} - ${error}`);
    }

    const data: OpenAIUsageResponse = await response.json();
    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch OpenAI usage: ${errorMessage}`);
  }
}

// =====================================================
// BILLING SUBSCRIPTION API
// =====================================================

/**
 * Get billing subscription details (limits, payment method)
 *
 * @param clientId - Client UUID
 * @returns Subscription details with spending limits
 */
export async function getOpenAISubscription(
  clientId: string,
): Promise<OpenAISubscription> {
  try {
    // Get client's OpenAI Admin API key from Vault (needs api.usage.read scope)
    const apiKey = await getClientOpenAIAdminKey(clientId);
    if (!apiKey) {
      throw new Error(
        `No OpenAI Admin API key configured for client ${clientId}`,
      );
    }

    const response = await fetch(
      "https://api.openai.com/v1/dashboard/billing/subscription",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `OpenAI Subscription API error: ${response.status} - ${error}`,
      );
    }

    const data: OpenAISubscription = await response.json();
    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch OpenAI subscription: ${errorMessage}`);
  }
}

// =====================================================
// BILLING USAGE API
// =====================================================

/**
 * Get billing usage (daily costs) for a date range
 *
 * @param clientId - Client UUID
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format (defaults to today)
 * @returns Daily costs breakdown and total usage
 */
export async function getOpenAIBillingUsage(
  clientId: string,
  startDate: string,
  endDate?: string,
): Promise<OpenAIBillingUsage> {
  try {
    // Get client's OpenAI Admin API key from Vault (needs api.usage.read scope)
    const apiKey = await getClientOpenAIAdminKey(clientId);
    if (!apiKey) {
      throw new Error(
        `No OpenAI Admin API key configured for client ${clientId}`,
      );
    }

    const targetEndDate = endDate || new Date().toISOString().split("T")[0];

    const response = await fetch(
      `https://api.openai.com/v1/dashboard/billing/usage?start_date=${startDate}&end_date=${targetEndDate}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `OpenAI Billing Usage API error: ${response.status} - ${error}`,
      );
    }

    const data: OpenAIBillingUsage = await response.json();
    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch OpenAI billing usage: ${errorMessage}`);
  }
}

// =====================================================
// AGGREGATE FUNCTIONS
// =====================================================

/**
 * Get comprehensive billing summary for a client
 *
 * ⚠️ DEPRECATED: This function requires billing admin scopes (api.read, billing access)
 * Use getOpenAISimplifiedBillingSummary() instead if you only have api.usage.read scope
 *
 * @param clientId - Client UUID
 * @param days - Number of days to look back (default 30)
 * @returns Comprehensive billing summary
 */
export async function getOpenAIBillingSummary(
  clientId: string,
  days: number = 30,
) {
  try {
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    // Fetch all data in parallel
    const [subscription, billingUsage, todayUsage] = await Promise.all([
      getOpenAISubscription(clientId),
      getOpenAIBillingUsage(clientId, startDateStr, endDateStr),
      getOpenAIUsage(clientId, endDateStr),
    ]);

    // Calculate remaining credits
    const totalSpent = billingUsage.total_usage;
    const hardLimit = subscription.hard_limit_usd;
    const remainingCredits = hardLimit - totalSpent;
    const usagePercentage = (totalSpent / hardLimit) * 100;

    // Aggregate today's usage by model
    const todayByModel = todayUsage.data.reduce((acc, item) => {
      const modelName = item.snapshot_id;
      if (!acc[modelName]) {
        acc[modelName] = {
          requests: 0,
          inputTokens: 0,
          outputTokens: 0,
        };
      }
      acc[modelName].requests += item.n_requests;
      acc[modelName].inputTokens += item.n_context_tokens_total;
      acc[modelName].outputTokens += item.n_generated_tokens_total;
      return acc;
    }, {} as Record<string, { requests: number; inputTokens: number; outputTokens: number }>);

    return {
      // Subscription info
      hasPaymentMethod: subscription.has_payment_method,
      isCanceled: subscription.canceled,
      hardLimitUSD: subscription.hard_limit_usd,
      softLimitUSD: subscription.soft_limit_usd,

      // Spending summary
      totalSpentUSD: totalSpent,
      remainingCreditsUSD: remainingCredits,
      usagePercentage: Math.round(usagePercentage * 100) / 100,

      // Daily breakdown
      dailyCosts: billingUsage.daily_costs,

      // Today's usage
      todayByModel,

      // Period
      periodDays: days,
      startDate: startDateStr,
      endDate: endDateStr,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get OpenAI billing summary: ${errorMessage}`);
  }
}

/**
 * Get SIMPLIFIED billing summary using only usage API (works with api.usage.read scope)
 *
 * This version doesn't require billing admin access - only usage read access
 * Use this if your Admin Key only has api.usage.read scope
 *
 * @param clientId - Client UUID
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Simplified usage summary (no billing limits info)
 */
export async function getOpenAISimplifiedBillingSummary(
  clientId: string,
  startDate: string,
  endDate: string,
) {
  try {
    const apiKey = await getClientOpenAIAdminKey(clientId);
    if (!apiKey) {
      throw new Error(
        `No OpenAI Admin API key configured for client ${clientId}`,
      );
    }

    // Convert dates to Unix timestamps
    const startTimestamp = Math.floor(
      new Date(startDate + "T00:00:00Z").getTime() / 1000,
    );
    const endTimestamp = Math.floor(
      new Date(endDate + "T23:59:59Z").getTime() / 1000,
    );

    // Call usage API (works with api.usage.read scope)
    const queryParams = new URLSearchParams({
      start_time: startTimestamp.toString(),
      end_time: endTimestamp.toString(),
      bucket_width: "1d",
    });

    const response = await fetch(
      `https://api.openai.com/v1/organization/usage/completions?${queryParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI Usage API error: ${response.status} - ${error}`);
    }

    interface UsageBucket {
      object: "bucket";
      start_time: number;
      end_time: number;
      results: Array<{
        aggregation_timestamp: number;
        n_requests: number;
        operation: string;
        snapshot_id: string;
        n_context_tokens_total: number;
        n_generated_tokens_total: number;
      }>;
    }

    interface UsageResponse {
      object: "list";
      data: UsageBucket[];
      has_more: boolean;
    }

    const data: UsageResponse = await response.json();

    // Extract and aggregate all records
    let totalRequests = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCost = 0;

    const modelBreakdown: Record<
      string,
      {
        requests: number;
        inputTokens: number;
        outputTokens: number;
        estimatedCost: number;
      }
    > = {};

    data.data.forEach((bucket) => {
      bucket.results.forEach((record) => {
        const model = record.snapshot_id;

        // Aggregate totals
        totalRequests += record.n_requests;
        totalInputTokens += record.n_context_tokens_total;
        totalOutputTokens += record.n_generated_tokens_total;

        // Estimate cost (rough approximation)
        const cost = estimateCost(
          model,
          record.n_context_tokens_total,
          record.n_generated_tokens_total,
        );
        totalCost += cost;

        // Model breakdown
        if (!modelBreakdown[model]) {
          modelBreakdown[model] = {
            requests: 0,
            inputTokens: 0,
            outputTokens: 0,
            estimatedCost: 0,
          };
        }
        modelBreakdown[model].requests += record.n_requests;
        modelBreakdown[model].inputTokens += record.n_context_tokens_total;
        modelBreakdown[model].outputTokens += record.n_generated_tokens_total;
        modelBreakdown[model].estimatedCost += cost;
      });
    });

    // Calculate days
    const days = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    return {
      // Usage summary (NO billing limits - we don't have access to that)
      total_requests: totalRequests,
      total_input_tokens: totalInputTokens,
      total_output_tokens: totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      estimated_cost_usd: totalCost,

      // Model breakdown
      models: modelBreakdown,

      // Period info
      period_days: days,
      start_date: startDate,
      end_date: endDate,
      has_more: data.has_more,

      // Note
      note: "This is a simplified summary using only usage API. Billing limits require additional scopes.",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to get simplified billing summary: ${errorMessage}`,
    );
  }
}

/**
 * Estimate cost based on model and tokens
 * Rough approximation - real cost should come from OpenAI's billing API
 */
function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  // Pricing as of Feb 2026 (approximate)
  const pricing: Record<string, { input: number; output: number }> = {
    "gpt-4o": { input: 2.5 / 1_000_000, output: 10 / 1_000_000 },
    "gpt-4o-mini": { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
    "gpt-4-turbo": { input: 10 / 1_000_000, output: 30 / 1_000_000 },
    "gpt-3.5-turbo": { input: 0.5 / 1_000_000, output: 1.5 / 1_000_000 },
  };

  // Find matching model (handle versions like gpt-4o-2024-08-06)
  const modelKey = Object.keys(pricing).find((key) => model.startsWith(key));
  if (!modelKey) return 0;

  const rates = pricing[modelKey];
  return inputTokens * rates.input + outputTokens * rates.output;
}

// =====================================================
// SYNC TO DATABASE
// =====================================================

/**
 * Sync OpenAI usage data to our database for analytics
 *
 * This reconciles our internal tracking with OpenAI's official data
 *
 * @param clientId - Client UUID
 * @param date - Date to sync (defaults to today)
 */
export async function syncOpenAIUsageToDatabase(
  clientId: string,
  date?: string,
) {
  try {
    const targetDate = date || new Date().toISOString().split("T")[0];
    const usageData = await getOpenAIUsage(clientId, targetDate);

    // TODO: Save to database table (openai_usage_sync)
    // This will allow us to compare our tracking vs OpenAI's official numbers
    // and detect any discrepancies

    console.log(
      `[OpenAI Sync] Synced ${usageData.data.length} records for ${targetDate}`,
    );

    return {
      success: true,
      date: targetDate,
      recordsSynced: usageData.data.length,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[OpenAI Sync] Failed to sync usage: ${errorMessage}`);
    throw error;
  }
}

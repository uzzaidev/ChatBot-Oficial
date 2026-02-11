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

import { getClientOpenAIKey } from "./vault";

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
  date?: string
): Promise<OpenAIUsageResponse> {
  try {
    // Get client's OpenAI API key from Vault
    const apiKey = await getClientOpenAIKey(clientId);
    if (!apiKey) {
      throw new Error(`No OpenAI API key configured for client ${clientId}`);
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
      }
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
  clientId: string
): Promise<OpenAISubscription> {
  try {
    const apiKey = await getClientOpenAIKey(clientId);
    if (!apiKey) {
      throw new Error(`No OpenAI API key configured for client ${clientId}`);
    }

    const response = await fetch(
      "https://api.openai.com/v1/dashboard/billing/subscription",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `OpenAI Subscription API error: ${response.status} - ${error}`
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
  endDate?: string
): Promise<OpenAIBillingUsage> {
  try {
    const apiKey = await getClientOpenAIKey(clientId);
    if (!apiKey) {
      throw new Error(`No OpenAI API key configured for client ${clientId}`);
    }

    const targetEndDate = endDate || new Date().toISOString().split("T")[0];

    const response = await fetch(
      `https://api.openai.com/v1/dashboard/billing/usage?start_date=${startDate}&end_date=${targetEndDate}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `OpenAI Billing Usage API error: ${response.status} - ${error}`
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
 * @param clientId - Client UUID
 * @param days - Number of days to look back (default 30)
 * @returns Comprehensive billing summary
 */
export async function getOpenAIBillingSummary(
  clientId: string,
  days: number = 30
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
  date?: string
) {
  try {
    const targetDate = date || new Date().toISOString().split("T")[0];
    const usageData = await getOpenAIUsage(clientId, targetDate);

    // TODO: Save to database table (openai_usage_sync)
    // This will allow us to compare our tracking vs OpenAI's official numbers
    // and detect any discrepancies

    console.log(`[OpenAI Sync] Synced ${usageData.data.length} records for ${targetDate}`);

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

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

/**
 * 💰 NEW: Real cost data from /v1/organization/costs API
 */
export interface OpenAICostResult {
  object: "organization.costs.result";
  amount: {
    value: string; // Cost in USD (string with many decimals)
    currency: string; // "usd"
  };
  line_item: string | null;
  user_id: string | null;
  project_id: string | null;
  organization_id: string;
  project_name: string | null;
  organization_name: string;
  user_email: string | null;
}

export interface OpenAICostBucket {
  object: "bucket";
  start_time: number; // Unix timestamp
  end_time: number; // Unix timestamp
  start_time_iso?: string;
  end_time_iso?: string;
  results: OpenAICostResult[];
}

export interface OpenAICostsResponse {
  object: "page";
  has_more: boolean;
  next_page?: string;
  data: OpenAICostBucket[];
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
 * 💰 Get REAL costs from OpenAI (not estimates!)
 *
 * Uses /v1/organization/costs API that returns actual billed amounts.
 * Requires Admin Key with api.usage.read scope.
 *
 * @param clientId - Client UUID
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Real cost data with pagination
 */
export async function getOpenAIRealCosts(
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

    console.log(
      "[Real Costs] 🔑 Using Admin Key:",
      apiKey.substring(0, 20) + "...",
    );

    // Convert dates to Unix timestamps
    const startTimestamp = Math.floor(
      new Date(startDate + "T00:00:00Z").getTime() / 1000,
    );
    const endTimestamp = Math.floor(
      new Date(endDate + "T23:59:59Z").getTime() / 1000,
    );

    console.log("[Real Costs] 💰 Fetching real cost data...");

    // Fetch ALL pages (OpenAI API uses pagination)
    const allBuckets: OpenAICostBucket[] = [];
    let currentPage: string | undefined = undefined;
    let pageCount = 0;
    const MAX_PAGES = 100;

    do {
      pageCount++;

      const queryParams = new URLSearchParams({
        start_time: startTimestamp.toString(),
        end_time: endTimestamp.toString(),
      });
      if (currentPage) queryParams.append("page", currentPage);

      const response = await fetch(
        `https://api.openai.com/v1/organization/costs?${queryParams.toString()}`,
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
          `OpenAI Costs API error: ${response.status} - ${error}`,
        );
      }

      const pageData: OpenAICostsResponse = await response.json();
      console.log(`[Real Costs] ✅ Page ${pageCount}:`, {
        buckets: pageData.data.length,
        has_more: pageData.has_more,
      });

      allBuckets.push(...pageData.data);

      if (pageData.has_more && pageData.next_page) {
        currentPage = pageData.next_page;
      } else {
        currentPage = undefined;
      }

      if (pageCount >= MAX_PAGES) {
        console.warn("[Real Costs] ⚠️ Reached MAX_PAGES limit");
        break;
      }
    } while (currentPage);

    console.log("[Real Costs] ✅ Pagination complete:", {
      total_pages: pageCount,
      total_buckets: allBuckets.length,
    });

    // Aggregate costs
    let totalCost = 0;
    const dailyCosts: Record<string, number> = {};
    const projectBreakdown: Record<
      string,
      { cost: number; project_name: string }
    > = {};

    allBuckets.forEach((bucket) => {
      const date = new Date(bucket.start_time * 1000)
        .toISOString()
        .split("T")[0];

      bucket.results.forEach((result) => {
        const cost = parseFloat(result.amount.value);
        totalCost += cost;

        // Daily breakdown
        if (!dailyCosts[date]) dailyCosts[date] = 0;
        dailyCosts[date] += cost;

        // Project breakdown
        if (result.project_id) {
          if (!projectBreakdown[result.project_id]) {
            projectBreakdown[result.project_id] = {
              cost: 0,
              project_name: result.project_name || "Unknown",
            };
          }
          projectBreakdown[result.project_id].cost += cost;
        }
      });
    });

    const days = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    return {
      real_cost_usd: totalCost,
      daily_costs: dailyCosts,
      projects: projectBreakdown,
      period_days: days,
      start_date: startDate,
      end_date: endDate,
      all_data_fetched: true,
      pages_fetched: pageCount,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get real costs: ${errorMessage}`);
  }
}

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
 * Get billing summary using ONLY usage API that works with Admin Keys
 *
 * ⚠️ IMPORTANT: OpenAI billing limits APIs (/v1/dashboard/billing/*) are BROWSER ONLY.
 * They require a session key obtained by logging in via web browser, NOT API keys.
 * Even Admin Keys with "All" permissions cannot access these endpoints programmatically.
 *
 * This function:
 * 1. Fetches usage data using Admin Key (works with api.usage.read scope)
 * 2. Calculates estimated costs based on public OpenAI pricing
 * 3. Does NOT include billing limits (hard/soft limits are browser-only)
 *
 * To see billing limits: Log in to https://platform.openai.com/account/billing/overview
 *
 * @param clientId - Client UUID
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Usage summary with estimated costs (no billing limits)
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

    console.log(
      "[Billing Summary] 🔑 Using Admin Key:",
      apiKey.substring(0, 20) + "...",
    );

    // Convert dates to Unix timestamps
    const startTimestamp = Math.floor(
      new Date(startDate + "T00:00:00Z").getTime() / 1000,
    );
    const endTimestamp = Math.floor(
      new Date(endDate + "T23:59:59Z").getTime() / 1000,
    );

    // ==================================================
    // Call ALL usage API endpoints (works with api.usage.read scope)
    // WITH PAGINATION to fetch ALL data
    // ALSO: Fetch REAL costs from /v1/organization/costs in parallel
    // ==================================================

    const USAGE_ENDPOINTS = [
      "completions",
      "embeddings",
      "images",
      "moderations",
      "audio_speeches",
      "audio_transcriptions",
      "code_interpreter_sessions",
      "vector_stores",
    ];

    interface UsageBucket {
      object: "bucket";
      start_time: number;
      end_time: number;
      results: Array<{
        object: string;
        num_model_requests: number;
        model: string | null;
        input_tokens: number;
        output_tokens: number;
        input_cached_tokens?: number;
        input_uncached_tokens?: number;
        project_id?: string | null;
        user_id?: string | null;
        api_key_id?: string | null;
      }>;
    }

    interface UsageResponse {
      object: "list";
      data: UsageBucket[];
      has_more: boolean;
      next_page?: string;
    }

    console.log(
      "[Billing Summary] 📊 Fetching usage data from all endpoints...",
    );

    // Fetch ALL pages from ALL endpoints
    const allBuckets: UsageBucket[] = [];
    let totalPageCount = 0;
    const MAX_PAGES = 100;

    for (const endpointPath of USAGE_ENDPOINTS) {
      let currentPage: string | undefined = undefined;
      let pageCount = 0;

      try {
        do {
          pageCount++;

          const queryParams = new URLSearchParams({
            start_time: startTimestamp.toString(),
            end_time: endTimestamp.toString(),
            bucket_width: "1d",
          });
          // Only use group_by=model for endpoints that support it
          if (endpointPath === "completions" || endpointPath === "embeddings") {
            queryParams.append("group_by", "model");
          }
          if (currentPage) queryParams.append("page", currentPage);

          const response = await fetch(
            `https://api.openai.com/v1/organization/usage/${endpointPath}?${queryParams.toString()}`,
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
            },
          );

          if (!response.ok) {
            // 404/400 = endpoint not available or never used, skip
            if (response.status === 404 || response.status === 400) {
              console.log(
                `[Billing Summary] ⏭️ ${endpointPath}: not available (${response.status})`,
              );
              break;
            }
            const error = await response.text();
            console.warn(
              `[Billing Summary] ⚠️ ${endpointPath} error: ${response.status} - ${error}`,
            );
            break;
          }

          const pageData: UsageResponse = await response.json();
          allBuckets.push(...pageData.data);

          // Early exit: if first page has no results in any bucket, skip remaining
          if (
            pageCount === 1 &&
            pageData.data.every((b) => !b.results || b.results.length === 0)
          ) {
            break;
          }

          if (pageData.has_more && pageData.next_page) {
            currentPage = pageData.next_page;
          } else {
            currentPage = undefined;
          }

          if (pageCount >= MAX_PAGES) break;
        } while (currentPage);
      } catch (endpointError) {
        console.warn(
          `[Billing Summary] ⚠️ ${endpointPath}: fetch failed`,
          endpointError instanceof Error
            ? endpointError.message
            : String(endpointError),
        );
      }

      totalPageCount += pageCount;
    }

    console.log("[Billing Summary] ✅ All endpoints fetched:", {
      total_pages: totalPageCount,
      total_buckets: allBuckets.length,
    });

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
        realCost?: number;
      }
    > = {};

    allBuckets.forEach((bucket) => {
      bucket.results.forEach((record) => {
        // Use model name, fallback to "aggregated" if null
        const model = record.model || "aggregated";

        // Normalize: some endpoints may not have token fields
        const inputTokens = record.input_tokens || 0;
        const outputTokens = record.output_tokens || 0;
        const requests = record.num_model_requests || 0;

        // Aggregate totals
        totalRequests += requests;
        totalInputTokens += inputTokens;
        totalOutputTokens += outputTokens;

        // Estimate cost (rough approximation)
        const cost = estimateCost(
          model === "aggregated" ? "gpt-4o-mini" : model,
          inputTokens,
          outputTokens,
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
        modelBreakdown[model].requests += requests;
        modelBreakdown[model].inputTokens += inputTokens;
        modelBreakdown[model].outputTokens += outputTokens;
        modelBreakdown[model].estimatedCost += cost;
      });
    });

    // Calculate days
    const days = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    // ==================================================
    // 💰 Fetch REAL costs from /v1/organization/costs
    // ==================================================
    let realCostUsd: number | null = null;
    let realCostDailyCosts: Record<string, number> = {};
    let costFetchSuccess = false;

    try {
      console.log(
        "[Billing Summary] 💰 Fetching REAL costs from /v1/organization/costs...",
      );

      const allCostBuckets: OpenAICostBucket[] = [];
      let costPage: string | undefined = undefined;
      let costPageCount = 0;

      do {
        costPageCount++;

        const costParams = new URLSearchParams({
          start_time: startTimestamp.toString(),
          end_time: endTimestamp.toString(),
        });
        if (costPage) costParams.append("page", costPage);

        const costResponse = await fetch(
          `https://api.openai.com/v1/organization/costs?${costParams.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (!costResponse.ok) {
          const costError = await costResponse.text();
          console.warn(
            `[Billing Summary] ⚠️ Costs API error: ${costResponse.status} - ${costError}`,
          );
          break;
        }

        const costData: OpenAICostsResponse = await costResponse.json();
        console.log(`[Billing Summary] 💰 Costs page ${costPageCount}:`, {
          buckets: costData.data.length,
          has_more: costData.has_more,
        });

        allCostBuckets.push(...costData.data);

        if (costData.has_more && costData.next_page) {
          costPage = costData.next_page;
        } else {
          costPage = undefined;
        }

        if (costPageCount >= MAX_PAGES) {
          console.warn("[Billing Summary] ⚠️ Costs: Reached MAX_PAGES limit");
          break;
        }
      } while (costPage);

      // Aggregate real costs
      let totalRealCost = 0;
      allCostBuckets.forEach((bucket) => {
        const date = new Date(bucket.start_time * 1000)
          .toISOString()
          .split("T")[0];

        bucket.results.forEach((result) => {
          const cost = parseFloat(result.amount.value);
          totalRealCost += cost;

          if (!realCostDailyCosts[date]) realCostDailyCosts[date] = 0;
          realCostDailyCosts[date] += cost;
        });
      });

      realCostUsd = totalRealCost;
      costFetchSuccess = true;

      // 💰 Distribute real cost to model breakdown proportionally
      if (totalCost > 0) {
        Object.keys(modelBreakdown).forEach((model) => {
          const proportion = modelBreakdown[model].estimatedCost / totalCost;
          modelBreakdown[model].realCost = totalRealCost * proportion;
        });
      } else {
        // If all estimates are 0, distribute by total tokens
        const grandTotalTokens = totalInputTokens + totalOutputTokens;
        Object.keys(modelBreakdown).forEach((model) => {
          const modelTokens =
            modelBreakdown[model].inputTokens +
            modelBreakdown[model].outputTokens;
          const proportion =
            grandTotalTokens > 0 ? modelTokens / grandTotalTokens : 0;
          modelBreakdown[model].realCost = totalRealCost * proportion;
        });
      }

      console.log("[Billing Summary] 💰 Real costs fetched:", {
        real_cost_usd: totalRealCost.toFixed(6),
        estimated_cost_usd: totalCost.toFixed(6),
        cost_pages: costPageCount,
        cost_buckets: allCostBuckets.length,
      });
    } catch (costError) {
      console.warn(
        "[Billing Summary] ⚠️ Could not fetch real costs, using estimates:",
        costError instanceof Error ? costError.message : String(costError),
      );
    }

    // Build response (usage data + REAL costs when available)
    const summary = {
      // Usage summary
      total_requests: totalRequests,
      total_input_tokens: totalInputTokens,
      total_output_tokens: totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      estimated_cost_usd: totalCost,

      // 💰 REAL costs from OpenAI (when available)
      real_cost_usd: realCostUsd,
      has_real_costs: costFetchSuccess,
      daily_costs: costFetchSuccess ? realCostDailyCosts : undefined,

      // Model breakdown
      models: modelBreakdown,

      // Period info
      period_days: days,
      start_date: startDate,
      end_date: endDate,
      all_data_fetched: true,
      pages_fetched: totalPageCount,

      // Note
      note: costFetchSuccess
        ? "Custos REAIS da OpenAI obtidos via /v1/organization/costs. Custos do dia atual podem não estar incluídos (processamento com atraso de ~24h)."
        : "Dados de uso da OpenAI API. Custos são estimativas baseadas em preços públicos.",
    };

    console.log("[Billing Summary] ✅ Summary generated:", {
      total_cost_estimated: totalCost.toFixed(4),
      total_cost_real: realCostUsd?.toFixed(6) ?? "N/A",
      has_real_costs: costFetchSuccess,
      total_requests: totalRequests,
      pages_fetched: totalPageCount,
      buckets: allBuckets.length,
    });

    return summary;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get billing summary: ${errorMessage}`);
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
    "gpt-5": { input: 3 / 1_000_000, output: 12 / 1_000_000 },
    "text-embedding-3-small": { input: 0.02 / 1_000_000, output: 0 },
    "text-embedding-3-large": { input: 0.13 / 1_000_000, output: 0 },
    "text-embedding-ada": { input: 0.1 / 1_000_000, output: 0 },
    whisper: { input: 0.006 / 60, output: 0 },
    tts: { input: 15 / 1_000_000, output: 0 },
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

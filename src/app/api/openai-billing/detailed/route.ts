/**
 * OpenAI Detailed Analytics API
 *
 * GET /api/openai-billing/detailed?start_date=2026-02-01&end_date=2026-02-11&project_id=proj_xxx
 *
 * Returns chat completion usage data from OpenAI Usage API (/v1/organization/usage/completions)
 * Supports filtering by project_id, date range, and daily aggregation
 */

import { createServerClient } from "@/lib/supabase-server";
import { getClientOpenAIAdminKey } from "@/lib/vault";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * OpenAI Usage API Complete Response Format
 *
 * Based on: https://platform.openai.com/docs/api-reference/usage
 *
 * NOTE: When using bucket_width parameter, API returns buckets with results inside!
 */
interface OpenAIUsageRecord {
  // Timing
  aggregation_timestamp: number; // Unix timestamp

  // Request metrics
  n_requests: number; // Total number of requests
  n_context_tokens_total: number; // Input tokens
  n_generated_tokens_total: number; // Output tokens

  // Model identification
  operation: string; // "completion", "chat.completions", "embeddings", etc.
  snapshot_id: string; // Model version (e.g., "gpt-4o-2024-08-06")

  // Project filtering (optional in API response)
  project_id?: string; // e.g., "proj_T7QCBrdiCiTGoFDnuN0DKWD7"
  user_id?: string; // If user-level tracking is enabled
  api_key_id?: string; // API key used
  model?: string; // Model name

  // Cost (some endpoints)
  cost?: number; // USD cost
}

// NEW: Bucket format (when using bucket_width parameter)
interface OpenAIBucket {
  object: "bucket";
  start_time: number; // Unix timestamp
  end_time: number; // Unix timestamp
  start_time_iso: string; // ISO 8601 format
  end_time_iso: string; // ISO 8601 format
  results: OpenAIUsageRecord[]; // Array of usage records in this bucket
}

interface OpenAIDetailedResponse {
  object: "list";
  data: OpenAIBucket[]; // Changed: buckets instead of direct records
  has_more: boolean;
  next_page?: string;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Get current user's client_id
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's client_id
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("client_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.client_id) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Get OpenAI Admin API key from Vault (needs api.usage.read scope)
    const apiKey = await getClientOpenAIAdminKey(profile.client_id);
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "No OpenAI Admin API key configured. Configure in /dashboard/settings to enable analytics.",
        },
        { status: 400 },
      );
    }

    console.log(
      "[OpenAI Analytics] 🔑 Admin Key loaded:",
      apiKey.substring(0, 15) + "...",
    );

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDate =
      searchParams.get("start_date") ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
    const endDate =
      searchParams.get("end_date") || new Date().toISOString().split("T")[0];
    const projectId = searchParams.get("project_id"); // Optional filter
    const page = searchParams.get("page"); // Pagination

    console.log("[OpenAI Analytics] 📅 Date params:", {
      raw_start: searchParams.get("start_date"),
      raw_end: searchParams.get("end_date"),
      computed_start: startDate,
      computed_end: endDate,
    });

    // Convert dates to Unix timestamps (OpenAI expects seconds, not ms)
    // Format: YYYY-MM-DD → Unix timestamp in seconds
    const startTimestamp = Math.floor(
      new Date(startDate + "T00:00:00Z").getTime() / 1000,
    );
    const endTimestamp = Math.floor(
      new Date(endDate + "T23:59:59Z").getTime() / 1000,
    );

    console.log("[OpenAI Analytics] ⏰ Unix timestamps:", {
      startTimestamp,
      endTimestamp,
    });

    // Validate timestamps
    if (isNaN(startTimestamp) || isNaN(endTimestamp)) {
      console.error("[OpenAI Analytics] Invalid date format:", {
        startDate,
        endDate,
      });
      return NextResponse.json(
        {
          error: "Invalid date format. Use YYYY-MM-DD (e.g., 2026-02-01)",
          received: { start_date: startDate, end_date: endDate },
        },
        { status: 400 },
      );
    }

    // Build query params for OpenAI API
    const queryParams = new URLSearchParams();
    queryParams.append("start_time", startTimestamp.toString());
    queryParams.append("end_time", endTimestamp.toString());
    queryParams.append("bucket_width", "1d"); // Daily aggregation
    if (projectId) queryParams.append("project_id", projectId);
    if (page) queryParams.append("page", page);

    const apiUrl = `https://api.openai.com/v1/organization/usage/completions?${queryParams.toString()}`;
    console.log("[OpenAI Analytics] 🌐 Calling API:", apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    console.log(
      "[OpenAI Analytics] 📡 API Response:",
      response.status,
      response.statusText,
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("[OpenAI Analytics] ❌ API Error Details:", {
        status: response.status,
        statusText: response.statusText,
        error,
        url: apiUrl,
        params: {
          startDate,
          endDate,
          startTimestamp,
          endTimestamp,
          projectId,
          page,
        },
      });
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data: OpenAIDetailedResponse = await response.json();

    console.log("[OpenAI Analytics] ✅ Data received:", {
      buckets: data.data.length,
      has_more: data.has_more,
    });

    // DEBUG: Log first bucket to see structure
    if (data.data.length > 0) {
      const firstBucket = data.data[0];
      console.log("[OpenAI Analytics] 🔍 First bucket:", {
        object: firstBucket.object,
        start_time: firstBucket.start_time,
        end_time: firstBucket.end_time,
        results_count: firstBucket.results.length,
        first_result: firstBucket.results[0] || null,
      });
    }

    // Extract all records from buckets (flatten)
    const allRecords: OpenAIUsageRecord[] = [];

    data.data.forEach((bucket, bucketIndex) => {
      if (bucket.results && bucket.results.length > 0) {
        bucket.results.forEach((record) => {
          allRecords.push(record);
        });
        console.log(
          `[OpenAI Analytics] 📦 Bucket ${bucketIndex} (${bucket.start_time_iso}): ${bucket.results.length} records`,
        );
      } else {
        console.log(
          `[OpenAI Analytics] 📦 Bucket ${bucketIndex} (${bucket.start_time_iso}): No usage data`,
        );
      }
    });

    console.log(
      `[OpenAI Analytics] 📊 Total records extracted: ${allRecords.length}`,
    );

    if (allRecords.length === 0) {
      // No usage data in this period
      return NextResponse.json({
        success: true,
        data: [],
        stats: {
          total_requests: 0,
          total_input_tokens: 0,
          total_output_tokens: 0,
          total_tokens: 0,
          estimated_total_cost: 0,
          models_used: [],
          operations_used: [],
          date_range: { start: startDate, end: endDate },
        },
        pagination: {
          has_more: data.has_more,
          next_page: data.next_page,
        },
        message: "No usage data found in this period",
      });
    }

    // Enrich data with calculated fields
    const enrichedData = allRecords.map((record, index) => {
      try {
        const timestamp = record.aggregation_timestamp;
        const date = new Date(timestamp * 1000);

        if (isNaN(date.getTime())) {
          console.error(
            "[OpenAI Analytics] ❌ Invalid timestamp at record",
            index,
            ":",
            {
              aggregation_timestamp: timestamp,
              record,
            },
          );
          throw new Error(
            `Invalid aggregation_timestamp at record ${index}: ${timestamp}`,
          );
        }

        return {
          ...record,
          // Convert timestamp to readable date
          date: date.toISOString().split("T")[0],
          // Total tokens
          total_tokens:
            record.n_context_tokens_total + record.n_generated_tokens_total,
          // Estimate cost (rough approximation if not provided)
          estimated_cost_usd: estimateCost(
            record.snapshot_id,
            record.n_context_tokens_total,
            record.n_generated_tokens_total,
          ),
        };
      } catch (error) {
        console.error(
          "[OpenAI Analytics] ❌ Error processing record",
          index,
          ":",
          error,
        );
        throw error;
      }
    });

    // Aggregate statistics
    const stats = {
      total_requests: enrichedData.reduce((sum, r) => sum + r.n_requests, 0),
      total_input_tokens: enrichedData.reduce(
        (sum, r) => sum + r.n_context_tokens_total,
        0,
      ),
      total_output_tokens: enrichedData.reduce(
        (sum, r) => sum + r.n_generated_tokens_total,
        0,
      ),
      total_tokens: enrichedData.reduce((sum, r) => sum + r.total_tokens, 0),
      estimated_total_cost: enrichedData.reduce(
        (sum, r) => sum + r.estimated_cost_usd,
        0,
      ),
      models_used: [...new Set(enrichedData.map((r) => r.snapshot_id))],
      operations_used: [...new Set(enrichedData.map((r) => r.operation))],
      date_range: { start: startDate, end: endDate },
    };

    console.log("[OpenAI Analytics] 📊 Stats:", {
      total_requests: stats.total_requests,
      total_tokens: stats.total_tokens,
      estimated_cost: stats.estimated_total_cost.toFixed(4) + " USD",
    });

    return NextResponse.json({
      success: true,
      data: enrichedData,
      stats,
      pagination: {
        has_more: data.has_more,
        next_page: data.next_page,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[OpenAI Analytics API] Error:", errorMessage);

    return NextResponse.json(
      {
        error: "Failed to fetch OpenAI detailed analytics",
        details: errorMessage,
      },
      { status: 500 },
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

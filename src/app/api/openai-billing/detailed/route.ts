/**
 * OpenAI Detailed Analytics API
 *
 * GET /api/openai-billing/detailed?start_date=2026-02-01&end_date=2026-02-11&project_id=proj_xxx
 *
 * Returns ALL fields from OpenAI Usage API for detailed analytics
 * Can filter by project_id to show only WhatsApp bot usage
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getClientOpenAIKey } from "@/lib/vault";

export const dynamic = "force-dynamic";

/**
 * OpenAI Usage API Complete Response Format
 *
 * Based on: https://platform.openai.com/docs/api-reference/usage
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

interface OpenAIDetailedResponse {
  object: "list";
  data: OpenAIUsageRecord[];
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
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    // Get OpenAI API key from Vault
    const apiKey = await getClientOpenAIKey(profile.client_id);
    if (!apiKey) {
      return NextResponse.json(
        { error: "No OpenAI API key configured" },
        { status: 400 }
      );
    }

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

    // Build query params
    const queryParams = new URLSearchParams();
    queryParams.append("start_date", startDate);
    queryParams.append("end_date", endDate);
    if (projectId) queryParams.append("project_id", projectId);
    if (page) queryParams.append("page", page);

    // Fetch from OpenAI Usage API
    console.log("[OpenAI Analytics] Fetching usage from", startDate, "to", endDate);
    if (projectId) console.log("[OpenAI Analytics] Filtering by project:", projectId);

    const response = await fetch(
      `https://api.openai.com/v1/usage?${queryParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data: OpenAIDetailedResponse = await response.json();

    // Enrich data with calculated fields
    const enrichedData = data.data.map((record) => ({
      ...record,
      // Convert timestamp to readable date
      date: new Date(record.aggregation_timestamp * 1000).toISOString().split("T")[0],
      // Total tokens
      total_tokens: record.n_context_tokens_total + record.n_generated_tokens_total,
      // Estimate cost (rough approximation if not provided)
      estimated_cost_usd: estimateCost(
        record.snapshot_id,
        record.n_context_tokens_total,
        record.n_generated_tokens_total
      ),
    }));

    // Aggregate statistics
    const stats = {
      total_requests: enrichedData.reduce((sum, r) => sum + r.n_requests, 0),
      total_input_tokens: enrichedData.reduce(
        (sum, r) => sum + r.n_context_tokens_total,
        0
      ),
      total_output_tokens: enrichedData.reduce(
        (sum, r) => sum + r.n_generated_tokens_total,
        0
      ),
      total_tokens: enrichedData.reduce((sum, r) => sum + r.total_tokens, 0),
      estimated_total_cost: enrichedData.reduce(
        (sum, r) => sum + r.estimated_cost_usd,
        0
      ),
      models_used: [...new Set(enrichedData.map((r) => r.snapshot_id))],
      operations_used: [...new Set(enrichedData.map((r) => r.operation))],
      date_range: { start: startDate, end: endDate },
    };

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
      { status: 500 }
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
  outputTokens: number
): number {
  // Pricing as of Feb 2026 (approximate)
  const pricing: Record<
    string,
    { input: number; output: number }
  > = {
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

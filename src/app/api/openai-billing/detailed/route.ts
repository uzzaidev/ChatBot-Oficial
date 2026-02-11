/**
 * OpenAI Detailed Analytics API (with cache)
 *
 * GET /api/openai-billing/detailed?start_date=...&end_date=...&source=cache|refresh
 *
 * source=cache  → Read from Supabase cache (fast, no OpenAI calls)
 * source=refresh → Fetch new data from OpenAI, upsert into cache, return all
 *
 * Usage endpoints:
 * - /v1/organization/usage/completions
 * - /v1/organization/usage/embeddings
 * - /v1/organization/usage/images
 * - /v1/organization/usage/moderations
 * - /v1/organization/usage/audio_speeches
 * - /v1/organization/usage/audio_transcriptions
 * - /v1/organization/usage/code_interpreter_sessions
 * - /v1/organization/usage/vector_stores
 *
 * Also fetches real costs from /v1/organization/costs
 */

import type {
  OpenAICostBucket,
  OpenAICostsResponse,
} from "@/lib/openai-billing";
import {
  createRouteHandlerClient,
  createServiceClient,
} from "@/lib/supabase-server";
import { getClientOpenAIAdminKey } from "@/lib/vault";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * All available OpenAI Usage API endpoints
 * Each returns the same bucket format but with different result types
 */
const USAGE_ENDPOINTS = [
  { path: "completions", label: "Completions" },
  { path: "embeddings", label: "Embeddings" },
  { path: "images", label: "Images" },
  { path: "moderations", label: "Moderations" },
  { path: "audio_speeches", label: "Audio Speeches" },
  { path: "audio_transcriptions", label: "Audio Transcriptions" },
  { path: "code_interpreter_sessions", label: "Code Interpreter" },
  { path: "vector_stores", label: "Vector Stores" },
] as const;

/**
 * OpenAI Usage API Record Format
 * Common fields across all usage endpoints
 */
interface OpenAIUsageRecord {
  object: string;

  // Request metrics
  num_model_requests: number;
  input_tokens: number;
  output_tokens: number;
  input_cached_tokens: number;
  input_uncached_tokens: number;

  // Model identification
  model: string | null;
  service_tier?: string | null;
  batch?: string | null;

  // Project filtering
  project_id?: string | null;
  user_id?: string | null;
  api_key_id?: string | null;

  // Token breakdown (detailed)
  input_text_tokens?: number;
  output_text_tokens?: number;
  input_cached_text_tokens?: number;
  input_audio_tokens?: number;
  input_cached_audio_tokens?: number;
  output_audio_tokens?: number;
  input_image_tokens?: number;
  input_cached_image_tokens?: number;
  output_image_tokens?: number;

  // Images-specific fields
  num_images?: number;
  source?: string | null;
  size?: string | null;

  // Vector stores specific
  num_vector_store_files?: number;
  num_vector_store_bytes?: number;
}

// Bucket format (when using bucket_width parameter)
interface OpenAIBucket {
  object: "bucket";
  start_time: number;
  end_time: number;
  start_time_iso: string;
  end_time_iso: string;
  results: OpenAIUsageRecord[];
}

interface OpenAIDetailedResponse {
  object: "list";
  data: OpenAIBucket[];
  has_more: boolean;
  next_page?: string;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request);

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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDate =
      searchParams.get("start_date") ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
    const endDate =
      searchParams.get("end_date") || new Date().toISOString().split("T")[0];
    const projectId = searchParams.get("project_id");
    const source = searchParams.get("source") || "cache"; // "cache" | "refresh"

    console.log("[OpenAI Analytics] 📅 Request:", {
      startDate,
      endDate,
      source,
    });

    // ==================================================
    // SOURCE = CACHE → Read from DB, return immediately
    // ==================================================
    if (source === "cache") {
      return await handleCacheRead(profile.client_id, startDate, endDate);
    }

    // ==================================================
    // SOURCE = REFRESH → Fetch from OpenAI, save to cache
    // ==================================================

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

    // Determine fetch range: check latest cached date to do incremental fetch
    const serviceClient = createServiceClient();
    const { data: latestCached } = await (serviceClient
      .from("openai_usage_cache" as any)
      .select("usage_date")
      .eq("client_id", profile.client_id)
      .order("usage_date", { ascending: false })
      .limit(1)
      .single() as unknown as Promise<{
      data: { usage_date: string } | null;
      error: any;
    }>);

    // Always re-fetch last 2 days (real costs have ~24h delay)
    let fetchStartDate = startDate;
    if (latestCached?.usage_date) {
      // Start from 2 days before latest cached OR the requested start, whichever is later
      const latestMinus2 = new Date(
        new Date(latestCached.usage_date).getTime() - 2 * 24 * 60 * 60 * 1000,
      )
        .toISOString()
        .split("T")[0];
      fetchStartDate = latestMinus2 > startDate ? latestMinus2 : startDate;
      console.log(
        `[OpenAI Analytics] 📦 Cache exists up to ${latestCached.usage_date}, fetching from ${fetchStartDate}`,
      );
    } else {
      console.log("[OpenAI Analytics] 📦 No cache, fetching full range");
    }

    // Convert dates to Unix timestamps
    const startTimestamp = Math.floor(
      new Date(fetchStartDate + "T00:00:00Z").getTime() / 1000,
    );
    const endTimestamp = Math.floor(
      new Date(endDate + "T23:59:59Z").getTime() / 1000,
    );

    if (isNaN(startTimestamp) || isNaN(endTimestamp)) {
      return NextResponse.json(
        {
          error: "Invalid date format. Use YYYY-MM-DD",
          received: { start_date: startDate, end_date: endDate },
        },
        { status: 400 },
      );
    }

    // ==================================================
    // Fetch ALL usage endpoints with pagination
    // ==================================================
    const allRecords: Array<
      OpenAIUsageRecord & {
        bucket_start_time: number;
        bucket_start_iso: string;
        api_source: string;
        api_source_label: string;
      }
    > = [];
    const endpointsWithData: string[] = [];
    let totalPagesAll = 0;
    let totalBucketsAll = 0;

    console.log(
      `[OpenAI Analytics] 🔄 Fetching ${USAGE_ENDPOINTS.length} usage endpoints (${fetchStartDate} → ${endDate})...`,
    );

    for (const endpoint of USAGE_ENDPOINTS) {
      const endpointBuckets: OpenAIBucket[] = [];
      let currentPage: string | undefined = undefined;
      let pageCount = 0;
      const MAX_PAGES = 100;

      try {
        do {
          pageCount++;

          const queryParams = new URLSearchParams();
          queryParams.append("start_time", startTimestamp.toString());
          queryParams.append("end_time", endTimestamp.toString());
          queryParams.append("bucket_width", "1d");
          if (
            endpoint.path === "completions" ||
            endpoint.path === "embeddings"
          ) {
            queryParams.append("group_by", "model");
          }
          if (projectId) queryParams.append("project_id", projectId);
          if (currentPage) queryParams.append("page", currentPage);

          const apiUrl = `https://api.openai.com/v1/organization/usage/${
            endpoint.path
          }?${queryParams.toString()}`;

          const response = await fetch(apiUrl, {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            const error = await response.text();
            if (response.status === 404 || response.status === 400) {
              console.log(
                `[OpenAI Analytics] ⏭️ ${endpoint.label}: not available (${response.status})`,
              );
              break;
            }
            console.error(
              `[OpenAI Analytics] ❌ ${endpoint.label} error: ${response.status}`,
              error,
            );
            break;
          }

          const pageData: OpenAIDetailedResponse = await response.json();
          endpointBuckets.push(...pageData.data);

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
          `[OpenAI Analytics] ⚠️ ${endpoint.label}: fetch failed`,
          endpointError instanceof Error
            ? endpointError.message
            : String(endpointError),
        );
        continue;
      }

      totalPagesAll += pageCount;
      totalBucketsAll += endpointBuckets.length;

      // Extract records from buckets and tag with source endpoint
      let endpointRecordCount = 0;
      endpointBuckets.forEach((bucket) => {
        if (bucket.results && bucket.results.length > 0) {
          bucket.results.forEach((record) => {
            const normalizedRecord = {
              ...record,
              num_model_requests: record.num_model_requests || 0,
              input_tokens: record.input_tokens || 0,
              output_tokens: record.output_tokens || 0,
              input_cached_tokens: record.input_cached_tokens || 0,
              input_uncached_tokens: record.input_uncached_tokens || 0,
              bucket_start_time: bucket.start_time,
              bucket_start_iso: bucket.start_time_iso,
              api_source: endpoint.path,
              api_source_label: endpoint.label,
            };
            allRecords.push(normalizedRecord);
            endpointRecordCount++;
          });
        }
      });

      if (endpointRecordCount > 0) {
        endpointsWithData.push(endpoint.label);
        console.log(
          `[OpenAI Analytics] ✅ ${endpoint.label}: ${endpointRecordCount} records (${pageCount} pages)`,
        );
      }
    }

    console.log("[OpenAI Analytics] ✅ All endpoints fetched:", {
      total_records: allRecords.length,
      endpoints_with_data: endpointsWithData,
      total_pages: totalPagesAll,
    });

    // ==================================================
    // 💰 Fetch REAL costs from /v1/organization/costs
    // ==================================================
    const dailyRealCosts: Record<string, number> = {};
    let hasRealCosts = false;

    try {
      console.log("[OpenAI Analytics] 💰 Fetching REAL costs...");

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
          console.warn(
            `[OpenAI Analytics] ⚠️ Costs API error: ${costResponse.status}`,
          );
          break;
        }

        const costData: OpenAICostsResponse = await costResponse.json();
        allCostBuckets.push(...costData.data);

        if (costData.has_more && costData.next_page) {
          costPage = costData.next_page;
        } else {
          costPage = undefined;
        }

        if (costPageCount >= 100) break;
      } while (costPage);

      allCostBuckets.forEach((bucket) => {
        const date = new Date(bucket.start_time * 1000)
          .toISOString()
          .split("T")[0];
        bucket.results.forEach((result) => {
          const cost = parseFloat(result.amount.value);
          if (!dailyRealCosts[date]) dailyRealCosts[date] = 0;
          dailyRealCosts[date] += cost;
        });
      });

      hasRealCosts = Object.keys(dailyRealCosts).length > 0;
      console.log("[OpenAI Analytics] 💰 Real costs loaded:", {
        days_with_costs: Object.keys(dailyRealCosts).length,
        total_real_cost: Object.values(dailyRealCosts)
          .reduce((a, b) => a + b, 0)
          .toFixed(6),
      });
    } catch (costError) {
      console.warn(
        "[OpenAI Analytics] ⚠️ Could not fetch real costs:",
        costError instanceof Error ? costError.message : String(costError),
      );
    }

    // ==================================================
    // Enrich data with costs + save to cache
    // ==================================================
    const dailyEstimatedCosts: Record<string, number> = {};
    const recordEstimates: number[] = [];

    allRecords.forEach((record) => {
      const date = new Date(record.bucket_start_time * 1000)
        .toISOString()
        .split("T")[0];
      const est = estimateCost(
        record.model || "gpt-4o-mini",
        record.input_tokens,
        record.output_tokens,
      );
      recordEstimates.push(est);
      if (!dailyEstimatedCosts[date]) dailyEstimatedCosts[date] = 0;
      dailyEstimatedCosts[date] += est;
    });

    const enrichedData = allRecords.map((record, index) => {
      const timestamp = record.bucket_start_time;
      const date = new Date(timestamp * 1000);
      const dateStr = date.toISOString().split("T")[0];
      const estimatedCost = recordEstimates[index];

      let realCostUsd: number | null = null;
      if (hasRealCosts && dailyRealCosts[dateStr] !== undefined) {
        const dayEstTotal = dailyEstimatedCosts[dateStr] || 0;
        if (dayEstTotal > 0) {
          const proportion = estimatedCost / dayEstTotal;
          realCostUsd = dailyRealCosts[dateStr] * proportion;
        } else {
          const dayRecords = allRecords.filter((r) => {
            const d = new Date(r.bucket_start_time * 1000)
              .toISOString()
              .split("T")[0];
            return d === dateStr;
          });
          const dayTotalTokens = dayRecords.reduce(
            (sum, r) => sum + r.input_tokens + r.output_tokens,
            0,
          );
          const recordTokens = record.input_tokens + record.output_tokens;
          const proportion =
            dayTotalTokens > 0 ? recordTokens / dayTotalTokens : 0;
          realCostUsd = dailyRealCosts[dateStr] * proportion;
        }
      }

      return {
        date: dateStr,
        model_name: record.model || record.api_source_label || "aggregated",
        api_source: record.api_source,
        api_source_label: record.api_source_label,
        num_model_requests: record.num_model_requests,
        input_tokens: record.input_tokens,
        output_tokens: record.output_tokens,
        total_tokens: record.input_tokens + record.output_tokens,
        estimated_cost_usd: estimatedCost,
        real_cost_usd: realCostUsd,
        has_real_cost: realCostUsd !== null,
      };
    });

    // ==================================================
    // 💾 Save to cache (upsert)
    // ==================================================
    if (enrichedData.length > 0) {
      try {
        // Prepare rows for upsert
        const cacheRows = enrichedData.map((r) => ({
          client_id: profile.client_id,
          usage_date: r.date,
          model_name: r.model_name,
          api_source: r.api_source,
          api_source_label: r.api_source_label,
          num_model_requests: r.num_model_requests,
          input_tokens: r.input_tokens,
          output_tokens: r.output_tokens,
          total_tokens: r.total_tokens,
          estimated_cost_usd: r.estimated_cost_usd,
          real_cost_usd: r.real_cost_usd,
          has_real_cost: r.has_real_cost,
          fetched_at: new Date().toISOString(),
        }));

        // Upsert in batches of 500
        const BATCH_SIZE = 500;
        for (let i = 0; i < cacheRows.length; i += BATCH_SIZE) {
          const batch = cacheRows.slice(i, i + BATCH_SIZE);
          const { error: upsertError } = await (serviceClient
            .from("openai_usage_cache" as any)
            .upsert(batch as any, {
              onConflict: "client_id,usage_date,model_name,api_source",
              ignoreDuplicates: false,
            }) as unknown as Promise<{ error: any }>);

          if (upsertError) {
            console.error(
              `[OpenAI Analytics] ❌ Cache upsert error (batch ${
                i / BATCH_SIZE + 1
              }):`,
              upsertError.message,
            );
          }
        }

        console.log(`[OpenAI Analytics] 💾 Cached ${cacheRows.length} records`);
      } catch (cacheError) {
        console.error(
          "[OpenAI Analytics] ❌ Cache save error:",
          cacheError instanceof Error ? cacheError.message : String(cacheError),
        );
        // Don't fail the request just because cache write failed
      }
    }

    // ==================================================
    // Return ALL cached data for the full requested period
    // ==================================================
    return await handleCacheRead(profile.client_id, startDate, endDate);
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
 * Read cached data from Supabase for a client + date range
 */
async function handleCacheRead(
  clientId: string,
  startDate: string,
  endDate: string,
) {
  const serviceClient = createServiceClient();

  interface CacheRow {
    usage_date: string;
    model_name: string;
    api_source: string;
    api_source_label: string;
    num_model_requests: number;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    estimated_cost_usd: number;
    real_cost_usd: number | null;
    has_real_cost: boolean;
    fetched_at: string;
    created_at: string;
  }

  const { data: cached, error: cacheError } = await (serviceClient
    .from("openai_usage_cache" as any)
    .select("*")
    .eq("client_id", clientId)
    .gte("usage_date", startDate)
    .lte("usage_date", endDate)
    .order("usage_date", { ascending: false }) as unknown as Promise<{
    data: CacheRow[] | null;
    error: any;
  }>);

  if (cacheError) {
    console.error(
      "[OpenAI Analytics] ❌ Cache read error:",
      cacheError.message,
    );
    return NextResponse.json(
      { error: "Failed to read cache", details: cacheError.message },
      { status: 500 },
    );
  }

  if (!cached || cached.length === 0) {
    return NextResponse.json({
      success: true,
      data: [],
      stats: {
        total_requests: 0,
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_tokens: 0,
        estimated_total_cost: 0,
        real_total_cost: null,
        has_real_costs: false,
        models_used: [],
        api_sources: [],
        date_range: { start: startDate, end: endDate },
      },
      from_cache: true,
      cache_count: 0,
      message: "No cached data. Click 'Atualizar' to fetch from OpenAI.",
    });
  }

  // Transform cached rows to match expected format
  const data = cached.map((row) => ({
    date: row.usage_date,
    model_name: row.model_name,
    api_source: row.api_source,
    api_source_label: row.api_source_label,
    num_model_requests: row.num_model_requests,
    input_tokens: Number(row.input_tokens),
    output_tokens: Number(row.output_tokens),
    total_tokens: Number(row.total_tokens),
    estimated_cost_usd: Number(row.estimated_cost_usd),
    real_cost_usd:
      row.real_cost_usd !== null ? Number(row.real_cost_usd) : null,
    has_real_cost: row.has_real_cost,
  }));

  // Sort descending by date, then by api_source_label
  data.sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return (a.api_source_label || "").localeCompare(b.api_source_label || "");
  });

  const hasRealCosts = data.some((r) => r.has_real_cost);
  const totalRealCost = data.reduce(
    (sum, r) => sum + (r.real_cost_usd ?? 0),
    0,
  );

  const stats = {
    total_requests: data.reduce((sum, r) => sum + r.num_model_requests, 0),
    total_input_tokens: data.reduce((sum, r) => sum + r.input_tokens, 0),
    total_output_tokens: data.reduce((sum, r) => sum + r.output_tokens, 0),
    total_tokens: data.reduce((sum, r) => sum + r.total_tokens, 0),
    estimated_total_cost: data.reduce(
      (sum, r) => sum + r.estimated_cost_usd,
      0,
    ),
    real_total_cost: hasRealCosts ? totalRealCost : null,
    has_real_costs: hasRealCosts,
    models_used: [...new Set(data.map((r) => r.model_name))],
    api_sources: [...new Set(data.map((r) => r.api_source_label))],
    date_range: { start: startDate, end: endDate },
  };

  const latestFetch = cached.reduce((latest, row) => {
    const fetchedAt = row.fetched_at || row.created_at;
    return fetchedAt > latest ? fetchedAt : latest;
  }, "");

  console.log(
    `[OpenAI Analytics] 📦 Cache hit: ${data.length} records, last fetched: ${latestFetch}`,
  );

  return NextResponse.json({
    success: true,
    data,
    stats,
    from_cache: true,
    cache_count: data.length,
    last_fetched_at: latestFetch,
  });
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
    whisper: { input: 0.006 / 60, output: 0 }, // per second of audio
    tts: { input: 15 / 1_000_000, output: 0 }, // per character
  };

  // Find matching model (handle versions like gpt-4o-2024-08-06)
  const modelKey = Object.keys(pricing).find((key) => model.startsWith(key));
  if (!modelKey) return 0;

  const rates = pricing[modelKey];
  return inputTokens * rates.input + outputTokens * rates.output;
}

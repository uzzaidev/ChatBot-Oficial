import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/validate-billing
 *
 * Validates billing tracking by aggregating data from gateway_usage_logs
 * Provides breakdown by provider, API type, and model
 *
 * Query params:
 * - period: '24h' | '7d' | '30d' | '90d' (default: '7d')
 * - clientId: optional, filter by client
 *
 * Returns:
 * - summary: totals and breakdowns
 * - breakdown: detailed per model
 * - validation: warnings and suggestions
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d";
    const clientId = searchParams.get("clientId");

    // Parse period to interval
    const intervalMap: Record<string, string> = {
      "24h": "1 day",
      "7d": "7 days",
      "30d": "30 days",
      "90d": "90 days",
    };
    const interval = intervalMap[period] || "7 days";

    const supabase = createRouteHandlerClient(request as any);

    // Base query conditions
    const baseConditions = `created_at > NOW() - INTERVAL '${interval}'${
      clientId ? ` AND client_id = '${clientId}'` : ""
    }`;

    // 1. Get summary statistics
    const { data: summary, error: summaryError } = await supabase.rpc(
      "get_billing_validation_summary",
      {
        time_interval: interval,
        filter_client_id: clientId || null,
      }
    );

    if (summaryError) {
      console.error("Summary query error:", summaryError);
      // Fallback: manual query
      const { data: rawData, error: rawError } = await supabase
        .from("gateway_usage_logs")
        .select("*")
        .gte("created_at", `NOW() - INTERVAL '${interval}'`);

      if (rawError) throw rawError;

      // Manual aggregation
      const totalRequests = rawData?.length || 0;
      const totalCostUSD = rawData?.reduce((sum, row) => sum + (row.cost_usd || 0), 0) || 0;
      const totalCostBRL = rawData?.reduce((sum, row) => sum + (row.cost_brl || 0), 0) || 0;

      // Group by provider
      const byProvider: Record<string, { requests: number; cost_usd: number; cost_brl: number }> = {};
      const byApiType: Record<string, { requests: number; cost_usd: number; cost_brl: number }> = {};

      rawData?.forEach((row) => {
        const provider = row.provider || "unknown";
        const apiType = (row.metadata as any)?.apiType || "chat";

        if (!byProvider[provider]) {
          byProvider[provider] = { requests: 0, cost_usd: 0, cost_brl: 0 };
        }
        if (!byApiType[apiType]) {
          byApiType[apiType] = { requests: 0, cost_usd: 0, cost_brl: 0 };
        }

        byProvider[provider].requests += 1;
        byProvider[provider].cost_usd += row.cost_usd || 0;
        byProvider[provider].cost_brl += row.cost_brl || 0;

        byApiType[apiType].requests += 1;
        byApiType[apiType].cost_usd += row.cost_usd || 0;
        byApiType[apiType].cost_brl += row.cost_brl || 0;
      });

      // 2. Get detailed breakdown
      const breakdown = await getDetailedBreakdown(supabase, interval, clientId);

      // 3. Validation checks
      const validation = performValidationChecks({
        total_requests: totalRequests,
        total_cost_usd: totalCostUSD,
        by_provider: byProvider,
        by_api_type: byApiType,
      });

      return NextResponse.json({
        period,
        summary: {
          total_requests: totalRequests,
          total_cost_usd: totalCostUSD,
          total_cost_brl: totalCostBRL,
          by_provider: byProvider,
          by_api_type: byApiType,
        },
        breakdown,
        validation,
      });
    }

    // If RPC function exists, use its result
    const summaryData = Array.isArray(summary) ? summary[0] : summary;

    // 2. Get detailed breakdown
    const breakdown = await getDetailedBreakdown(supabase, interval, clientId);

    // 3. Validation checks
    const validation = performValidationChecks(summaryData);

    return NextResponse.json({
      period,
      summary: summaryData,
      breakdown,
      validation,
    });
  } catch (error) {
    console.error("[validate-billing] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to validate billing",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Get detailed breakdown by API type, provider, and model
 */
async function getDetailedBreakdown(
  supabase: any,
  interval: string,
  clientId?: string | null
) {
  const query = supabase
    .from("gateway_usage_logs")
    .select("provider, model_name, metadata, input_tokens, output_tokens, cached_tokens, cost_usd, cost_brl, was_cached")
    .gte("created_at", `NOW() - INTERVAL '${interval}'`);

  if (clientId) {
    query.eq("client_id", clientId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Breakdown query error:", error);
    return [];
  }

  // Group by api_type + provider + model
  const grouped: Record<string, {
    api_type: string;
    provider: string;
    model: string;
    requests: number;
    total_tokens: number;
    cached_tokens: number;
    cost_usd: number;
    cost_brl: number;
    cache_hits: number;
  }> = {};

  data?.forEach((row: any) => {
    const apiType = row.metadata?.apiType || "chat";
    const provider = row.provider || "unknown";
    const model = row.model_name || "unknown";
    const key = `${apiType}:${provider}:${model}`;

    if (!grouped[key]) {
      grouped[key] = {
        api_type: apiType,
        provider,
        model,
        requests: 0,
        total_tokens: 0,
        cached_tokens: 0,
        cost_usd: 0,
        cost_brl: 0,
        cache_hits: 0,
      };
    }

    grouped[key].requests += 1;
    grouped[key].total_tokens += (row.input_tokens || 0) + (row.output_tokens || 0);
    grouped[key].cached_tokens += row.cached_tokens || 0;
    grouped[key].cost_usd += row.cost_usd || 0;
    grouped[key].cost_brl += row.cost_brl || 0;
    if (row.was_cached) {
      grouped[key].cache_hits += 1;
    }
  });

  // Convert to array and calculate cache hit rate
  return Object.values(grouped).map((item) => ({
    ...item,
    cache_hit_rate: item.requests > 0 ? (item.cache_hits / item.requests) * 100 : 0,
  }));
}

/**
 * Perform validation checks and generate warnings/suggestions
 */
function performValidationChecks(summary: any) {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let hasDiscrepancies = false;

  // Check if we have any data
  if (summary.total_requests === 0) {
    warnings.push("Nenhum request trackado no período selecionado");
    hasDiscrepancies = true;
  }

  // Check if costs are reasonable
  if (summary.total_cost_usd === 0 && summary.total_requests > 0) {
    warnings.push(`${summary.total_requests} requests com custo zero - possível erro no cálculo de custos`);
    hasDiscrepancies = true;
  }

  // Check if BRL conversion is working
  if (summary.total_cost_brl === 0 && summary.total_cost_usd > 0) {
    warnings.push("Custo em BRL é zero mas há custo em USD - conversão pode estar falhando");
    hasDiscrepancies = true;
  }

  // Check provider distribution
  const providers = Object.keys(summary.by_provider || {});
  if (providers.length === 0) {
    warnings.push("Nenhum provider identificado - verifique o campo 'provider' nos logs");
    hasDiscrepancies = true;
  }

  // Check API types
  const apiTypes = Object.keys(summary.by_api_type || {});
  if (apiTypes.length === 0) {
    suggestions.push("Adicione 'apiType' no metadata para melhor categorização");
  }

  // Success messages
  if (!hasDiscrepancies) {
    if (providers.length > 1) {
      suggestions.push(`✅ Multi-provider tracking funcionando (${providers.length} providers detectados)`);
    }
    if (apiTypes.length > 1) {
      suggestions.push(`✅ Tracking de múltiplas APIs funcionando (${apiTypes.length} tipos detectados)`);
    }
  }

  // Suggestions for optimization
  if (summary.total_cost_usd > 10) {
    suggestions.push("💡 Custo acima de $10 - considere ativar budget limits");
  }

  return {
    has_discrepancies: hasDiscrepancies,
    warnings,
    suggestions,
  };
}

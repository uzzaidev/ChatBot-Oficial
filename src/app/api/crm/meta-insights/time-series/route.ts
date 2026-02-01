/**
 * 📊 META INSIGHTS TIME SERIES API
 *
 * GET /api/crm/meta-insights/time-series?date_from=2025-01-01&date_to=2025-01-31&level=campaign
 *
 * Returns daily breakdown of metrics for trend charts
 *
 * @see https://developers.facebook.com/docs/marketing-api/insights
 */

import { getClientConfig } from "@/lib/config";
import { query } from "@/lib/postgres";
import { createServiceRoleClient } from "@/lib/supabase";
import { getClientIdFromSession } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface DailyMetric {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  conversions: number;
  revenue: number;
  cpl: number;
  roi: number;
}

/**
 * GET /api/crm/meta-insights/time-series
 * Fetch daily breakdown of Meta Ads insights
 */
export async function GET(request: NextRequest) {
  try {
    // 🔐 Get client_id from authenticated session
    const clientId = await getClientIdFromSession(request);

    if (!clientId) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 },
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const level = searchParams.get("level") || "campaign"; // campaign, adset, ad
    const attributionWindow = searchParams.get("attribution") || "7d_click"; // 7d_click, 1d_click, 1d_view

    // Default to last 30 days if not specified
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const startDate = dateFrom || thirtyDaysAgo.toISOString().split("T")[0];
    const endDate = dateTo || today.toISOString().split("T")[0];

    const supabase = createServiceRoleClient();

    // 1. Get client's Meta Ad Account configuration
    const { data: client, error: clientError } = (await supabase
      .from("clients")
      .select("meta_ad_account_id")
      .eq("id", clientId)
      .single()) as {
      data: { meta_ad_account_id: string | null } | null;
      error: unknown;
    };

    if (clientError || !client || !client.meta_ad_account_id) {
      // Return CRM-only time series data
      const crmTimeSeries = await getCRMTimeSeries(
        clientId,
        startDate,
        endDate,
      );
      return NextResponse.json({
        success: true,
        source: "crm_only",
        timeSeries: crmTimeSeries,
        level,
        attributionWindow,
      });
    }

    // 2. Get access token
    const clientConfig = await getClientConfig(clientId);

    if (!clientConfig?.apiKeys.metaAccessToken) {
      const crmTimeSeries = await getCRMTimeSeries(
        clientId,
        startDate,
        endDate,
      );
      return NextResponse.json({
        success: true,
        source: "crm_only",
        timeSeries: crmTimeSeries,
        level,
        attributionWindow,
      });
    }

    const accessToken = clientConfig.apiKeys.metaAccessToken;

    // 3. Build attribution setting based on window
    const attributionSetting = getAttributionSetting(attributionWindow);

    // 4. Fetch time-series insights from Marketing API
    const insightsUrl = new URL(
      `https://graph.facebook.com/v20.0/act_${client.meta_ad_account_id}/insights`,
    );

    // Fields to fetch
    const fields = [
      level === "campaign" ? "campaign_id,campaign_name" : "",
      level === "adset" ? "adset_id,adset_name,campaign_id,campaign_name" : "",
      level === "ad" ? "ad_id,ad_name,adset_id,campaign_id,campaign_name" : "",
      "spend,impressions,clicks,reach,cpm,cpc,actions",
    ]
      .filter(Boolean)
      .join(",");

    insightsUrl.searchParams.set("fields", fields);
    insightsUrl.searchParams.set("level", level);
    insightsUrl.searchParams.set("time_increment", "1"); // Daily breakdown
    insightsUrl.searchParams.set(
      "time_range",
      JSON.stringify({ since: startDate, until: endDate }),
    );

    // Add attribution setting if supported
    if (attributionSetting) {
      insightsUrl.searchParams.set(
        "action_attribution_windows",
        JSON.stringify([attributionSetting]),
      );
    }

    console.log("[META-INSIGHTS-TS] Fetching time series:", {
      level,
      attributionWindow,
      dateRange: { startDate, endDate },
    });

    const insightsResponse = await fetch(insightsUrl.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const insightsData = await insightsResponse.json();

    if (!insightsResponse.ok) {
      console.error("[META-INSIGHTS-TS] API error:", insightsData);
      // Fallback to CRM-only data
      const crmTimeSeries = await getCRMTimeSeries(
        clientId,
        startDate,
        endDate,
      );
      return NextResponse.json({
        success: true,
        source: "crm_only",
        error: insightsData.error?.message,
        timeSeries: crmTimeSeries,
        level,
        attributionWindow,
      });
    }

    // 5. Get CRM time series
    const crmTimeSeries = await getCRMTimeSeries(clientId, startDate, endDate);

    // 6. Combine Meta time series with CRM data
    const combinedTimeSeries = combineTimeSeriesData(
      insightsData.data || [],
      crmTimeSeries,
    );

    return NextResponse.json({
      success: true,
      source: "combined",
      dateRange: { from: startDate, to: endDate },
      timeSeries: combinedTimeSeries,
      level,
      attributionWindow,
      rawData: insightsData.data, // For debugging
    });
  } catch (error) {
    console.error("[META-INSIGHTS-TS] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch time series" },
      { status: 500 },
    );
  }
}

/**
 * Get CRM data as time series
 */
async function getCRMTimeSeries(
  clientId: string,
  startDate: string,
  endDate: string,
): Promise<DailyMetric[]> {
  const result = await query(
    `
    SELECT 
      DATE(ls.captured_at) as date,
      COUNT(DISTINCT ls.card_id) as leads,
      COUNT(DISTINCT CASE WHEN c.column_id IN (
        SELECT id FROM crm_columns WHERE slug = 'fechado' AND client_id = $1
      ) THEN c.id END) as conversions,
      SUM(CASE WHEN c.column_id IN (
        SELECT id FROM crm_columns WHERE slug = 'fechado' AND client_id = $1
      ) THEN COALESCE(c.estimated_value, 0) ELSE 0 END) as revenue
    FROM lead_sources ls
    LEFT JOIN crm_cards c ON c.id = ls.card_id
    WHERE ls.client_id = $1
      AND ls.captured_at >= $2
      AND ls.captured_at <= $3
    GROUP BY DATE(ls.captured_at)
    ORDER BY date ASC
    `,
    [clientId, startDate, endDate],
  );

  return result.rows.map((row) => ({
    date: row.date,
    spend: 0,
    impressions: 0,
    clicks: 0,
    leads: parseInt(row.leads) || 0,
    conversions: parseInt(row.conversions) || 0,
    revenue: parseFloat(row.revenue) || 0,
    cpl: 0,
    roi: 0,
  }));
}

/**
 * Combine Meta time series with CRM data
 */
function combineTimeSeriesData(
  metaData: MetaTimeSeriesEntry[],
  crmData: DailyMetric[],
): DailyMetric[] {
  // Create a map of CRM data by date
  const crmByDate = new Map<string, DailyMetric>();
  for (const crm of crmData) {
    crmByDate.set(crm.date, crm);
  }

  // Create a map of Meta data by date
  const metaByDate = new Map<string, MetaAggregated>();
  for (const entry of metaData) {
    const date = entry.date_start;
    const existing = metaByDate.get(date) || {
      spend: 0,
      impressions: 0,
      clicks: 0,
    };

    metaByDate.set(date, {
      spend: existing.spend + (parseFloat(entry.spend) || 0),
      impressions: existing.impressions + (parseInt(entry.impressions) || 0),
      clicks: existing.clicks + (parseInt(entry.clicks) || 0),
    });
  }

  // Get all unique dates
  const allDates = [
    ...new Set([...crmByDate.keys(), ...metaByDate.keys()]),
  ].sort();

  // Combine data
  return allDates.map((date) => {
    const crm = crmByDate.get(date) || {
      leads: 0,
      conversions: 0,
      revenue: 0,
    };
    const meta = metaByDate.get(date) || {
      spend: 0,
      impressions: 0,
      clicks: 0,
    };

    const spend = meta.spend;
    const leads = crm.leads;
    const revenue = crm.revenue;

    return {
      date,
      spend: Math.round(spend * 100) / 100,
      impressions: meta.impressions,
      clicks: meta.clicks,
      leads,
      conversions: crm.conversions,
      revenue,
      cpl: leads > 0 ? Math.round((spend / leads) * 100) / 100 : 0,
      roi:
        spend > 0
          ? Math.round(((revenue - spend) / spend) * 100 * 100) / 100
          : 0,
    };
  });
}

/**
 * Map attribution window parameter to API value
 */
function getAttributionSetting(window: string): string | null {
  const mapping: Record<string, string> = {
    "7d_click": "7d_click",
    "1d_click": "1d_click",
    "1d_view": "1d_view",
    "28d_click": "28d_click",
  };
  return mapping[window] || null;
}

// Types
interface MetaTimeSeriesEntry {
  date_start: string;
  date_stop: string;
  spend: string;
  impressions: string;
  clicks: string;
  reach: string;
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
}

interface MetaAggregated {
  spend: number;
  impressions: number;
  clicks: number;
}

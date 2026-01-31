/**
 * 📊 META INSIGHTS BY LEVEL API
 *
 * GET /api/crm/meta-insights/breakdown?level=adset&date_from=2025-01-01&date_to=2025-01-31
 *
 * Returns metrics broken down by ad, adset, or campaign level
 *
 * @see https://developers.facebook.com/docs/marketing-api/insights
 */

import { getClientConfig } from "@/lib/config";
import { query } from "@/lib/postgres";
import { createServiceRoleClient } from "@/lib/supabase";
import { getClientIdFromSession } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/crm/meta-insights/breakdown
 * Fetch insights broken down by ad, adset, or campaign
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
    const level = searchParams.get("level") || "adset"; // campaign, adset, ad
    const campaignId = searchParams.get("campaign_id"); // Optional filter

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
      return NextResponse.json({
        success: false,
        error: "Meta Ads not configured",
        message: "Configure meta_ad_account_id in settings",
        breakdown: [],
      });
    }

    // 2. Get access token
    const clientConfig = await getClientConfig(clientId);

    if (!clientConfig?.apiKeys.metaAccessToken) {
      return NextResponse.json({
        success: false,
        error: "No access token",
        message: "Configure meta_access_token in vault",
        breakdown: [],
      });
    }

    const accessToken = clientConfig.apiKeys.metaAccessToken;

    // 3. Build fields based on level
    const levelFields: Record<string, string> = {
      campaign: "campaign_id,campaign_name",
      adset: "adset_id,adset_name,campaign_id,campaign_name",
      ad: "ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,creative{thumbnail_url}",
    };

    const fields = `${levelFields[level]},spend,impressions,clicks,reach,cpm,cpc,ctr,actions`;

    // 4. Fetch insights from Marketing API
    const insightsUrl = new URL(
      `https://graph.facebook.com/v20.0/act_${client.meta_ad_account_id}/insights`,
    );

    insightsUrl.searchParams.set("fields", fields);
    insightsUrl.searchParams.set("level", level);
    insightsUrl.searchParams.set(
      "time_range",
      JSON.stringify({ since: startDate, until: endDate }),
    );

    // Add campaign filter if provided
    if (campaignId) {
      insightsUrl.searchParams.set(
        "filtering",
        JSON.stringify([
          { field: "campaign.id", operator: "EQUAL", value: campaignId },
        ]),
      );
    }

    console.log("[META-BREAKDOWN] Fetching breakdown:", {
      level,
      campaignId,
      dateRange: { startDate, endDate },
    });

    const insightsResponse = await fetch(insightsUrl.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const insightsData = await insightsResponse.json();

    if (!insightsResponse.ok) {
      console.error("[META-BREAKDOWN] API error:", insightsData);
      return NextResponse.json({
        success: false,
        error: insightsData.error?.message || "Marketing API error",
        breakdown: [],
      });
    }

    // 5. Get CRM data by level
    const crmData = await getCRMDataByLevel(
      clientId,
      level,
      startDate,
      endDate,
      campaignId,
    );

    // 6. Combine data
    const breakdown = combineBreakdownData(
      insightsData.data || [],
      crmData,
      level,
    );

    return NextResponse.json({
      success: true,
      dateRange: { from: startDate, to: endDate },
      level,
      breakdown,
      total: breakdown.length,
    });
  } catch (error) {
    console.error("[META-BREAKDOWN] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch breakdown" },
      { status: 500 },
    );
  }
}

/**
 * Get CRM data grouped by level
 */
async function getCRMDataByLevel(
  clientId: string,
  level: string,
  startDate: string,
  endDate: string,
  campaignId?: string | null,
) {
  const groupByField =
    level === "ad"
      ? "ls.ad_id"
      : level === "adset"
      ? "ls.adset_id"
      : "ls.campaign_id";

  const params: (string | null)[] = [clientId, startDate, endDate];
  let campaignFilter = "";

  if (campaignId) {
    params.push(campaignId);
    campaignFilter = `AND ls.campaign_id = $${params.length}`;
  }

  const result = await query(
    `
    SELECT 
      ${groupByField} as level_id,
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
      ${campaignFilter}
    GROUP BY ${groupByField}
    `,
    params,
  );

  // Convert to map
  const map = new Map<
    string,
    { leads: number; conversions: number; revenue: number }
  >();
  for (const row of result.rows) {
    if (row.level_id) {
      map.set(row.level_id, {
        leads: parseInt(row.leads) || 0,
        conversions: parseInt(row.conversions) || 0,
        revenue: parseFloat(row.revenue) || 0,
      });
    }
  }
  return map;
}

/**
 * Combine Meta breakdown with CRM data
 */
function combineBreakdownData(
  metaData: MetaBreakdownEntry[],
  crmData: Map<string, { leads: number; conversions: number; revenue: number }>,
  level: string,
): BreakdownItem[] {
  return metaData.map((entry) => {
    const levelId =
      level === "ad"
        ? entry.ad_id
        : level === "adset"
        ? entry.adset_id
        : entry.campaign_id;

    const crm = crmData.get(levelId || "") || {
      leads: 0,
      conversions: 0,
      revenue: 0,
    };

    const spend = parseFloat(entry.spend) || 0;
    const cpl = crm.leads > 0 ? spend / crm.leads : 0;
    const cpa = crm.conversions > 0 ? spend / crm.conversions : 0;
    const roi = spend > 0 ? ((crm.revenue - spend) / spend) * 100 : 0;

    return {
      // IDs
      campaign_id: entry.campaign_id,
      campaign_name: entry.campaign_name,
      adset_id: entry.adset_id,
      adset_name: entry.adset_name,
      ad_id: entry.ad_id,
      ad_name: entry.ad_name,
      thumbnail_url: entry.creative?.thumbnail_url,

      // Meta metrics
      spend: Math.round(spend * 100) / 100,
      impressions: parseInt(entry.impressions) || 0,
      clicks: parseInt(entry.clicks) || 0,
      reach: parseInt(entry.reach) || 0,
      cpm: parseFloat(entry.cpm) || 0,
      cpc: parseFloat(entry.cpc) || 0,
      ctr: parseFloat(entry.ctr) || 0,

      // CRM metrics
      leads: crm.leads,
      conversions: crm.conversions,
      revenue: crm.revenue,

      // Calculated
      cpl: Math.round(cpl * 100) / 100,
      cpa: Math.round(cpa * 100) / 100,
      roi: Math.round(roi * 100) / 100,
    };
  });
}

// Types
interface MetaBreakdownEntry {
  campaign_id: string;
  campaign_name: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  creative?: { thumbnail_url?: string };
  spend: string;
  impressions: string;
  clicks: string;
  reach: string;
  cpm: string;
  cpc: string;
  ctr: string;
}

interface BreakdownItem {
  campaign_id: string;
  campaign_name: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  thumbnail_url?: string;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  cpm: number;
  cpc: number;
  ctr: number;
  leads: number;
  conversions: number;
  revenue: number;
  cpl: number;
  cpa: number;
  roi: number;
}

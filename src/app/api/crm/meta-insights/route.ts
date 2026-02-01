/**
 * 📊 META INSIGHTS API
 *
 * Endpoint to fetch Meta Ads performance metrics for campaigns
 * that generated leads in the CRM.
 *
 * GET /api/crm/meta-insights?date_from=2025-01-01&date_to=2025-01-31
 *
 * Returns:
 * - Campaign metrics: spend, impressions, clicks, CPM, CPC
 * - Combined with CRM data: leads, conversions, CPL, CPA, ROI
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
 * GET /api/crm/meta-insights
 * Fetch Meta Ads insights for campaigns that generated leads
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
      return NextResponse.json(
        {
          error: "Meta Ads not configured",
          message: "Please configure meta_ad_account_id in client settings",
          insights: null,
          crmData: await getCRMOnlyData(clientId, startDate, endDate),
        },
        { status: 200 }, // Return 200 with partial data
      );
    }

    // 2. Get access token from client config (via Vault)
    const clientConfig = await getClientConfig(clientId);

    if (!clientConfig?.apiKeys.metaAccessToken) {
      return NextResponse.json(
        {
          error: "No access token",
          message: "Please configure meta_access_token in vault",
          insights: null,
          crmData: await getCRMOnlyData(clientId, startDate, endDate),
        },
        { status: 200 },
      );
    }

    const accessToken = clientConfig.apiKeys.metaAccessToken;

    // 3. Get campaign IDs from lead_sources
    const { data: leadSources } = (await supabase
      .from("lead_sources")
      .select("campaign_id, ad_id, adset_id")
      .eq("client_id", clientId)
      .eq("source_type", "meta_ads")
      .not("campaign_id", "is", null)) as {
      data: Array<{
        campaign_id: string | null;
        ad_id: string | null;
        adset_id: string | null;
      }> | null;
    };

    // Extract unique campaign IDs
    const campaignIds = [
      ...new Set(
        leadSources?.map((ls) => ls.campaign_id).filter(Boolean) || [],
      ),
    ] as string[];

    if (campaignIds.length === 0) {
      return NextResponse.json(
        {
          message: "No Meta Ads campaigns found in lead sources",
          insights: null,
          crmData: await getCRMOnlyData(clientId, startDate, endDate),
        },
        { status: 200 },
      );
    }

    // 4. Fetch insights from Marketing API
    const insightsUrl = new URL(
      `https://graph.facebook.com/v20.0/act_${client.meta_ad_account_id}/insights`,
    );

    insightsUrl.searchParams.set(
      "fields",
      "campaign_id,campaign_name,spend,impressions,clicks,reach,cpm,cpc,actions",
    );
    insightsUrl.searchParams.set("level", "campaign");
    insightsUrl.searchParams.set(
      "time_range",
      JSON.stringify({ since: startDate, until: endDate }),
    );
    insightsUrl.searchParams.set(
      "filtering",
      JSON.stringify([
        { field: "campaign.id", operator: "IN", value: campaignIds },
      ]),
    );

    console.log(
      "[META-INSIGHTS] Fetching insights for campaigns:",
      campaignIds,
    );

    const insightsResponse = await fetch(insightsUrl.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const insightsData = await insightsResponse.json();

    if (!insightsResponse.ok) {
      console.error("[META-INSIGHTS] API error:", insightsData);
      return NextResponse.json(
        {
          error: "Marketing API error",
          details: insightsData.error?.message || "Unknown error",
          insights: null,
          crmData: await getCRMOnlyData(clientId, startDate, endDate),
        },
        { status: 200 },
      );
    }

    // 5. Get CRM data for the same campaigns
    const crmData = await getCRMDataByCampaign(clientId, campaignIds);

    // 6. Combine Meta insights with CRM data
    const combinedInsights = combineInsightsWithCRM(
      insightsData.data || [],
      crmData,
    );

    return NextResponse.json({
      success: true,
      dateRange: { from: startDate, to: endDate },
      insights: combinedInsights,
      summary: calculateSummary(combinedInsights),
      rawMetaData: insightsData.data, // For debugging
    });
  } catch (error) {
    console.error("[META-INSIGHTS] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch insights" },
      { status: 500 },
    );
  }
}

/**
 * Get CRM data when Meta insights are not available
 */
async function getCRMOnlyData(
  clientId: string,
  startDate: string,
  endDate: string,
) {
  const result = await query(
    `
    SELECT 
      ls.campaign_id,
      ls.campaign_name,
      ls.ad_id,
      ls.ad_name,
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
      AND ls.source_type = 'meta_ads'
      AND ls.captured_at >= $2
      AND ls.captured_at <= $3
    GROUP BY ls.campaign_id, ls.campaign_name, ls.ad_id, ls.ad_name
    ORDER BY leads DESC
    `,
    [clientId, startDate, endDate],
  );

  return result.rows;
}

/**
 * Get CRM data grouped by campaign
 */
async function getCRMDataByCampaign(clientId: string, campaignIds: string[]) {
  const result = await query(
    `
    SELECT 
      ls.campaign_id,
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
      AND ls.campaign_id = ANY($2)
    GROUP BY ls.campaign_id
    `,
    [clientId, campaignIds],
  );

  // Convert to map for easy lookup
  const map = new Map<
    string,
    { leads: number; conversions: number; revenue: number }
  >();
  for (const row of result.rows) {
    map.set(row.campaign_id, {
      leads: parseInt(row.leads) || 0,
      conversions: parseInt(row.conversions) || 0,
      revenue: parseFloat(row.revenue) || 0,
    });
  }
  return map;
}

/**
 * Combine Meta insights with CRM data
 */
function combineInsightsWithCRM(
  metaInsights: MetaInsight[],
  crmData: Map<string, { leads: number; conversions: number; revenue: number }>,
): CombinedInsight[] {
  return metaInsights.map((insight) => {
    const crm = crmData.get(insight.campaign_id) || {
      leads: 0,
      conversions: 0,
      revenue: 0,
    };
    const spend = parseFloat(insight.spend) || 0;

    // Calculate derived metrics
    const cpl = crm.leads > 0 ? spend / crm.leads : 0;
    const cpa = crm.conversions > 0 ? spend / crm.conversions : 0;
    const roi = spend > 0 ? ((crm.revenue - spend) / spend) * 100 : 0;

    return {
      campaign_id: insight.campaign_id,
      campaign_name: insight.campaign_name,
      // Meta metrics
      spend,
      impressions: parseInt(insight.impressions) || 0,
      clicks: parseInt(insight.clicks) || 0,
      reach: parseInt(insight.reach) || 0,
      cpm: parseFloat(insight.cpm) || 0,
      cpc: parseFloat(insight.cpc) || 0,
      // CRM metrics
      leads: crm.leads,
      conversions: crm.conversions,
      revenue: crm.revenue,
      // Calculated metrics
      cpl: Math.round(cpl * 100) / 100,
      cpa: Math.round(cpa * 100) / 100,
      roi: Math.round(roi * 100) / 100,
      // Conversion rate
      leadToConversionRate:
        crm.leads > 0
          ? Math.round((crm.conversions / crm.leads) * 100 * 100) / 100
          : 0,
    };
  });
}

/**
 * Calculate summary metrics
 */
function calculateSummary(insights: CombinedInsight[]): InsightsSummary {
  const totals = insights.reduce(
    (acc, i) => ({
      spend: acc.spend + i.spend,
      impressions: acc.impressions + i.impressions,
      clicks: acc.clicks + i.clicks,
      leads: acc.leads + i.leads,
      conversions: acc.conversions + i.conversions,
      revenue: acc.revenue + i.revenue,
    }),
    {
      spend: 0,
      impressions: 0,
      clicks: 0,
      leads: 0,
      conversions: 0,
      revenue: 0,
    },
  );

  return {
    totalSpend: Math.round(totals.spend * 100) / 100,
    totalImpressions: totals.impressions,
    totalClicks: totals.clicks,
    totalLeads: totals.leads,
    totalConversions: totals.conversions,
    totalRevenue: totals.revenue,
    averageCPL:
      totals.leads > 0
        ? Math.round((totals.spend / totals.leads) * 100) / 100
        : 0,
    averageCPA:
      totals.conversions > 0
        ? Math.round((totals.spend / totals.conversions) * 100) / 100
        : 0,
    overallROI:
      totals.spend > 0
        ? Math.round(
            ((totals.revenue - totals.spend) / totals.spend) * 100 * 100,
          ) / 100
        : 0,
    overallCTR:
      totals.impressions > 0
        ? Math.round((totals.clicks / totals.impressions) * 100 * 100) / 100
        : 0,
  };
}

// ============================================================================
// Type Definitions
// ============================================================================

interface MetaInsight {
  campaign_id: string;
  campaign_name: string;
  spend: string;
  impressions: string;
  clicks: string;
  reach: string;
  cpm: string;
  cpc: string;
  actions?: Array<{
    action_type: string;
    value: string;
  }>;
}

interface CombinedInsight {
  campaign_id: string;
  campaign_name: string;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  cpm: number;
  cpc: number;
  leads: number;
  conversions: number;
  revenue: number;
  cpl: number;
  cpa: number;
  roi: number;
  leadToConversionRate: number;
}

interface InsightsSummary {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalLeads: number;
  totalConversions: number;
  totalRevenue: number;
  averageCPL: number;
  averageCPA: number;
  overallROI: number;
  overallCTR: number;
}

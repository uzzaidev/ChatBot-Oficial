/**
 * 🔔 META ADS BUDGET ALERTS
 *
 * Monitor ad spend and trigger alerts when approaching budget limits
 *
 * GET /api/crm/budget-alerts - Get all alerts and current status
 * POST /api/crm/budget-alerts - Create/update alert
 * DELETE /api/crm/budget-alerts - Delete alert
 *
 * @see https://developers.facebook.com/docs/marketing-api/insights
 */

import { getClientConfig } from "@/lib/config";
import { createServiceRoleClient } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const META_API_VERSION = "v20.0";
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// ============================================================================
// Types
// ============================================================================

interface BudgetAlert {
  id: string;
  client_id: string;
  name: string;
  alert_type:
    | "daily_spend"
    | "monthly_spend"
    | "campaign_spend"
    | "cpl_threshold";
  threshold: number;
  current_value: number;
  campaign_id?: string;
  is_active: boolean;
  last_triggered?: string;
  notification_channels: ("email" | "dashboard" | "webhook")[];
  created_at: string;
  updated_at: string;
}

interface AlertStatus {
  alert: BudgetAlert;
  status: "ok" | "warning" | "exceeded";
  percentage: number;
  message: string;
}

interface SpendData {
  daily_spend: number;
  monthly_spend: number;
  campaign_spend: Record<string, number>;
  average_cpl: number;
}

// ============================================================================
// GET - Get Alerts with Current Status
// ============================================================================

export async function GET(request: NextRequest) {
  const supabase = createServiceRoleClient();
  const clientId =
    request.nextUrl.searchParams.get("client_id") ||
    process.env.DEFAULT_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json({ error: "client_id required" }, { status: 400 });
  }

  try {
    // Get alerts from database
    // Note: Using 'as any' because budget_alerts is not yet in generated types
    const { data: alerts, error } = await (supabase as any)
      .from("budget_alerts")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) {
      // Table might not exist yet
      console.log("[BUDGET-ALERTS] Table not found, returning empty");
      return NextResponse.json({
        alerts: [],
        spend: null,
        configured: false,
        message: "Budget alerts not configured",
      });
    }

    // Get current spend data from Meta
    const spendData = await getCurrentSpendData(clientId);

    // Calculate alert statuses
    const alertStatuses: AlertStatus[] = (alerts || []).map((alert) => {
      const currentValue = getCurrentValueForAlert(alert, spendData);
      const percentage =
        alert.threshold > 0 ? (currentValue / alert.threshold) * 100 : 0;

      let status: "ok" | "warning" | "exceeded" = "ok";
      let message = "Dentro do limite";

      if (percentage >= 100) {
        status = "exceeded";
        message = "Limite excedido!";
      } else if (percentage >= 80) {
        status = "warning";
        message = "Aproximando do limite (80%+)";
      }

      return {
        alert: { ...alert, current_value: currentValue },
        status,
        percentage: Math.round(percentage * 10) / 10,
        message,
      };
    });

    // Check for exceeded alerts and create notifications
    const exceededAlerts = alertStatuses.filter(
      (a) => a.status === "exceeded" || a.status === "warning",
    );

    if (exceededAlerts.length > 0) {
      await createAlertNotifications(supabase, clientId, exceededAlerts);
    }

    return NextResponse.json({
      alerts: alertStatuses,
      spend: spendData,
      configured: !!spendData,
      exceeded_count: alertStatuses.filter((a) => a.status === "exceeded")
        .length,
      warning_count: alertStatuses.filter((a) => a.status === "warning").length,
    });
  } catch (error) {
    console.error("[BUDGET-ALERTS] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST - Create/Update Alert
// ============================================================================

export async function POST(request: NextRequest) {
  const supabase = createServiceRoleClient();

  try {
    const body = await request.json();
    const {
      client_id,
      name,
      alert_type,
      threshold,
      campaign_id,
      notification_channels = ["dashboard"],
    } = body;

    const clientId = client_id || process.env.DEFAULT_CLIENT_ID;

    if (!clientId || !name || !alert_type || !threshold) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Check if alert already exists
    const { data: existing } = await (supabase as any)
      .from("budget_alerts")
      .select("id")
      .eq("client_id", clientId)
      .eq("name", name)
      .single();

    if (existing) {
      // Update existing
      const { data: updated, error } = await (supabase as any)
        .from("budget_alerts")
        .update({
          alert_type,
          threshold,
          campaign_id,
          notification_channels,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        alert: updated,
        action: "updated",
      });
    }

    // Create new alert
    const { data: created, error } = await (supabase as any)
      .from("budget_alerts")
      .insert({
        client_id: clientId,
        name,
        alert_type,
        threshold,
        campaign_id,
        notification_channels,
        is_active: true,
        current_value: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      alert: created,
      action: "created",
    });
  } catch (error) {
    console.error("[BUDGET-ALERTS] Error creating alert:", error);
    return NextResponse.json(
      { error: "Failed to create alert" },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE - Remove Alert
// ============================================================================

export async function DELETE(request: NextRequest) {
  const supabase = createServiceRoleClient();
  const alertId = request.nextUrl.searchParams.get("id");

  if (!alertId) {
    return NextResponse.json({ error: "Alert ID required" }, { status: 400 });
  }

  try {
    const { error } = await (supabase as any)
      .from("budget_alerts")
      .delete()
      .eq("id", alertId);

    if (error) throw error;

    return NextResponse.json({ success: true, deleted: alertId });
  } catch (error) {
    console.error("[BUDGET-ALERTS] Error deleting alert:", error);
    return NextResponse.json(
      { error: "Failed to delete alert" },
      { status: 500 },
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

async function getCurrentSpendData(
  clientId: string,
): Promise<SpendData | null> {
  try {
    const supabase = createServiceRoleClient();
    const clientConfig = await getClientConfig(clientId);

    const { data: client } = (await supabase
      .from("clients")
      .select("meta_ad_account_id")
      .eq("id", clientId)
      .single()) as { data: { meta_ad_account_id: string | null } | null };

    const accessToken = clientConfig?.apiKeys?.metaAccessToken;
    if (!accessToken || !client?.meta_ad_account_id) {
      return null;
    }

    const adAccountId = client.meta_ad_account_id.startsWith("act_")
      ? client.meta_ad_account_id
      : `act_${client.meta_ad_account_id}`;

    // Get today's date range
    const today = new Date().toISOString().split("T")[0];
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split("T")[0];

    // Fetch daily spend
    const dailyParams = new URLSearchParams({
      access_token: accessToken,
      fields: "spend",
      time_range: JSON.stringify({ since: today, until: today }),
      level: "account",
    });

    const dailyRes = await fetch(
      `${META_BASE_URL}/${adAccountId}/insights?${dailyParams}`,
    );
    const dailyData = await dailyRes.json();

    // Fetch monthly spend
    const monthlyParams = new URLSearchParams({
      access_token: accessToken,
      fields: "spend",
      time_range: JSON.stringify({ since: monthStartStr, until: today }),
      level: "account",
    });

    const monthlyRes = await fetch(
      `${META_BASE_URL}/${adAccountId}/insights?${monthlyParams}`,
    );
    const monthlyData = await monthlyRes.json();

    // Fetch campaign spend
    const campaignParams = new URLSearchParams({
      access_token: accessToken,
      fields: "campaign_id,campaign_name,spend",
      time_range: JSON.stringify({ since: monthStartStr, until: today }),
      level: "campaign",
    });

    const campaignRes = await fetch(
      `${META_BASE_URL}/${adAccountId}/insights?${campaignParams}`,
    );
    const campaignData = await campaignRes.json();

    const campaignSpend: Record<string, number> = {};
    for (const item of campaignData.data || []) {
      campaignSpend[item.campaign_id] = parseFloat(item.spend || "0");
    }

    // Calculate average CPL from CRM
    const { data: cards } = await supabase
      .from("crm_cards")
      .select("id")
      .eq("client_id", clientId);

    const totalLeads = cards?.length || 0;
    const monthlySpend = parseFloat(monthlyData.data?.[0]?.spend || "0");
    const averageCpl = totalLeads > 0 ? monthlySpend / totalLeads : 0;

    return {
      daily_spend: parseFloat(dailyData.data?.[0]?.spend || "0"),
      monthly_spend: monthlySpend,
      campaign_spend: campaignSpend,
      average_cpl: averageCpl,
    };
  } catch (error) {
    console.error("[BUDGET-ALERTS] Error fetching spend:", error);
    return null;
  }
}

function getCurrentValueForAlert(
  alert: BudgetAlert,
  spendData: SpendData | null,
): number {
  if (!spendData) return 0;

  switch (alert.alert_type) {
    case "daily_spend":
      return spendData.daily_spend;
    case "monthly_spend":
      return spendData.monthly_spend;
    case "campaign_spend":
      return alert.campaign_id
        ? spendData.campaign_spend[alert.campaign_id] || 0
        : 0;
    case "cpl_threshold":
      return spendData.average_cpl;
    default:
      return 0;
  }
}

async function createAlertNotifications(
  supabase: ReturnType<typeof createServiceRoleClient>,
  clientId: string,
  alerts: AlertStatus[],
) {
  try {
    // Insert notifications for dashboard
    const notifications = alerts
      .filter((a) => a.alert.notification_channels.includes("dashboard"))
      .map((a) => ({
        client_id: clientId,
        type: "budget_alert",
        title: `Alerta de Orçamento: ${a.alert.name}`,
        message: `${a.message} (${a.percentage}% do limite)`,
        severity: a.status === "exceeded" ? "error" : "warning",
        metadata: {
          alert_id: a.alert.id,
          alert_type: a.alert.alert_type,
          threshold: a.alert.threshold,
          current_value: a.alert.current_value,
        },
        read: false,
      }));

    if (notifications.length > 0) {
      // Check if table exists, if not, just log
      const { error } = await (supabase as any)
        .from("notifications")
        .insert(notifications);

      if (error) {
        console.log(
          "[BUDGET-ALERTS] Could not create notifications:",
          error.message,
        );
      }
    }

    // Update last_triggered on alerts
    for (const alert of alerts) {
      await (supabase as any)
        .from("budget_alerts")
        .update({
          last_triggered: new Date().toISOString(),
          current_value: alert.alert.current_value,
        })
        .eq("id", alert.alert.id);
    }
  } catch (error) {
    console.error("[BUDGET-ALERTS] Error creating notifications:", error);
  }
}

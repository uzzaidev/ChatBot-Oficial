import { createServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Helper to get supabase client with proper typing
const getSupabase = async () => {
  const client = await createServerClient();
  return client as any;
};

// GET - Obter analytics do CRM
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabase();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const period = searchParams.get("period") || "30d"; // 7d, 30d, 90d, all

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId is required" },
        { status: 400 },
      );
    }

    // Calcular data inicial baseado no período
    const now = new Date();
    let startDate: Date | null = null;

    switch (period) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "all":
      default:
        startDate = null;
    }

    // 1. Total de cards por status
    const { data: cardsData } = await supabase
      .from("crm_cards")
      .select("id, auto_status, column_id, created_at")
      .eq("client_id", clientId);

    const cards = cardsData || [];
    const filteredCards = startDate
      ? cards.filter((c: any) => new Date(c.created_at) >= startDate!)
      : cards;

    // 2. Cards por coluna (funil)
    const { data: columnsData } = await supabase
      .from("crm_columns")
      .select("id, name, position")
      .eq("client_id", clientId)
      .order("position", { ascending: true });

    const columns = columnsData || [];

    const funnel = columns.map((col: any) => ({
      id: col.id,
      name: col.name,
      position: col.position,
      count: filteredCards.filter((c: any) => c.column_id === col.id).length,
    }));

    // Calcular taxa de conversão (cards que passaram da primeira para última coluna)
    const firstColumn = columns[0];
    const lastColumn = columns[columns.length - 1];

    const cardsInFirst = filteredCards.filter(
      (c: any) => c.column_id === firstColumn?.id,
    ).length;
    const cardsInLast = filteredCards.filter(
      (c: any) => c.column_id === lastColumn?.id,
    ).length;

    const conversionRate =
      filteredCards.length > 0
        ? ((cardsInLast / filteredCards.length) * 100).toFixed(1)
        : "0";

    // 3. Lead sources (origem dos leads)
    const { data: leadSourcesData } = await supabase
      .from("lead_sources")
      .select("source_type, campaign_name, ad_name, captured_at")
      .eq("client_id", clientId);

    const leadSources = leadSourcesData || [];
    const filteredLeadSources = startDate
      ? leadSources.filter((ls: any) => new Date(ls.captured_at) >= startDate!)
      : leadSources;

    // Agrupar por source_type
    const sourcesByType: Record<string, number> = {};
    filteredLeadSources.forEach((ls: any) => {
      const type = ls.source_type || "organic";
      sourcesByType[type] = (sourcesByType[type] || 0) + 1;
    });

    // Agrupar por campanha (top 10)
    const sourcesByCampaign: Record<string, number> = {};
    filteredLeadSources.forEach((ls: any) => {
      if (ls.campaign_name) {
        sourcesByCampaign[ls.campaign_name] =
          (sourcesByCampaign[ls.campaign_name] || 0) + 1;
      }
    });

    const topCampaigns = Object.entries(sourcesByCampaign)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // 4. Atividades recentes (últimos 7 dias sempre)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const { data: activitiesData } = await supabase
      .from("crm_card_activities")
      .select("activity_type, created_at")
      .eq("client_id", clientId)
      .gte("created_at", sevenDaysAgo.toISOString());

    const activities = activitiesData || [];

    // Agrupar por tipo
    const activitiesByType: Record<string, number> = {};
    activities.forEach((a: any) => {
      activitiesByType[a.activity_type] =
        (activitiesByType[a.activity_type] || 0) + 1;
    });

    // Agrupar por dia (últimos 7 dias)
    const activitiesByDay: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];
      activitiesByDay[dateStr] = 0;
    }
    activities.forEach((a: any) => {
      const dateStr = a.created_at.split("T")[0];
      if (activitiesByDay[dateStr] !== undefined) {
        activitiesByDay[dateStr]++;
      }
    });

    // 5. Cards por auto_status
    const cardsByStatus: Record<string, number> = {
      awaiting_attendant: 0,
      awaiting_client: 0,
      neutral: 0,
    };
    filteredCards.forEach((c: any) => {
      const status = c.auto_status || "neutral";
      if (cardsByStatus[status] !== undefined) {
        cardsByStatus[status]++;
      }
    });

    // 6. Crescimento de leads (cards criados por dia/semana)
    const growthByDay: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];
      growthByDay[dateStr] = 0;
    }
    cards.forEach((c: any) => {
      const dateStr = c.created_at.split("T")[0];
      if (growthByDay[dateStr] !== undefined) {
        growthByDay[dateStr]++;
      }
    });

    // 7. Rule executions (automações)
    const { data: ruleExecutionsData } = await supabase
      .from("crm_rule_executions")
      .select("status, executed_at")
      .eq("client_id", clientId);

    const ruleExecutions = ruleExecutionsData || [];
    const filteredExecutions = startDate
      ? ruleExecutions.filter((e: any) => new Date(e.executed_at) >= startDate!)
      : ruleExecutions;

    const executionsByStatus: Record<string, number> = {
      success: 0,
      failed: 0,
      pending: 0,
    };
    filteredExecutions.forEach((e: any) => {
      const status = e.status || "pending";
      if (executionsByStatus[status] !== undefined) {
        executionsByStatus[status]++;
      }
    });

    // Montar resposta
    const analytics = {
      period,
      summary: {
        totalCards: filteredCards.length,
        totalLeads: filteredLeadSources.length,
        conversionRate: parseFloat(conversionRate),
        totalActivities: activities.length,
        totalAutomations: filteredExecutions.length,
      },
      funnel,
      leadSources: {
        byType: Object.entries(sourcesByType).map(([type, count]) => ({
          type,
          count,
          percentage:
            filteredLeadSources.length > 0
              ? ((count / filteredLeadSources.length) * 100).toFixed(1)
              : "0",
        })),
        topCampaigns,
      },
      cardsByStatus,
      activities: {
        byType: activitiesByType,
        byDay: Object.entries(activitiesByDay).map(([date, count]) => ({
          date,
          count,
        })),
      },
      growth: Object.entries(growthByDay).map(([date, count]) => ({
        date,
        count,
      })),
      automations: {
        total: filteredExecutions.length,
        byStatus: executionsByStatus,
      },
    };

    return NextResponse.json({ analytics });
  } catch (error) {
    console.error("Error fetching CRM analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch CRM analytics" },
      { status: 500 },
    );
  }
}

import { createServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Helper to get supabase client with proper typing
const getSupabase = async () => {
  const client = await createServerClient();
  return client as any; // Type assertion for tables not in schema
};

// GET - Buscar lead source de um card ou listar todos
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabase();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const cardId = searchParams.get("cardId");

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId is required" },
        { status: 400 },
      );
    }

    // Se cardId fornecido, buscar source específico
    if (cardId) {
      const { data, error } = await supabase
        .from("lead_sources")
        .select("*")
        .eq("client_id", clientId)
        .eq("card_id", cardId)
        .single();

      if (error && error.code !== "PGRST116") throw error; // PGRST116 = not found

      return NextResponse.json({ leadSource: data || null });
    }

    // Senão, listar todos com estatísticas
    const { data: sources, error } = await supabase
      .from("lead_sources")
      .select(
        `
        *,
        card:crm_cards(id, title, contact_name)
      `,
      )
      .eq("client_id", clientId)
      .order("captured_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    // Estatísticas por tipo
    const { data: stats } = await supabase
      .from("lead_sources")
      .select("source_type")
      .eq("client_id", clientId);

    const sourceStats = (stats || []).reduce((acc, s) => {
      acc[s.source_type] = (acc[s.source_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Estatísticas por campanha
    const { data: campaignStats } = await supabase
      .from("lead_sources")
      .select("campaign_name, campaign_id")
      .eq("client_id", clientId)
      .eq("source_type", "meta_ads")
      .not("campaign_name", "is", null);

    const campaignCounts = (campaignStats || []).reduce((acc, s) => {
      const key = s.campaign_name || s.campaign_id || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      sources: sources || [],
      stats: {
        byType: sourceStats,
        byCampaign: campaignCounts,
        total: stats?.length || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching lead sources:", error);
    return NextResponse.json(
      { error: "Failed to fetch lead sources" },
      { status: 500 },
    );
  }
}

// POST - Registrar lead source (chamado pelo webhook/chatbotFlow)
export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabase();
    const body = await request.json();

    const {
      clientId,
      cardId,
      sourceType = "organic",
      // Meta Ads fields
      adId,
      adName,
      adsetId,
      adsetName,
      campaignId,
      campaignName,
      sourceUrl,
      headline,
      bodyText,
      mediaType,
      ctwaClid,
      // Raw data
      rawReferral,
    } = body;

    if (!clientId || !cardId) {
      return NextResponse.json(
        { error: "clientId and cardId are required" },
        { status: 400 },
      );
    }

    // Inserir ou atualizar (upsert baseado no card_id)
    const { data, error } = await supabase
      .from("lead_sources")
      .upsert(
        {
          client_id: clientId,
          card_id: cardId,
          source_type: sourceType,
          ad_id: adId,
          ad_name: adName,
          adset_id: adsetId,
          adset_name: adsetName,
          campaign_id: campaignId,
          campaign_name: campaignName,
          source_url: sourceUrl,
          headline,
          body: bodyText,
          media_type: mediaType,
          ctwa_clid: ctwaClid,
          raw_referral: rawReferral,
          captured_at: new Date().toISOString(),
        },
        {
          onConflict: "card_id",
        },
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ leadSource: data });
  } catch (error) {
    console.error("Error creating lead source:", error);
    return NextResponse.json(
      { error: "Failed to create lead source" },
      { status: 500 },
    );
  }
}

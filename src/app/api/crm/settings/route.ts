import { createServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Helper to get supabase client with proper typing
const getSupabase = async () => {
  const client = await createServerClient();
  return client as any; // Type assertion for tables not in schema
};

// GET - Obter configurações do CRM
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabase();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId is required" },
        { status: 400 },
      );
    }

    // Buscar configurações existentes
    let { data: settings, error } = await supabase
      .from("crm_settings")
      .select("*")
      .eq("client_id", clientId)
      .single();

    // Se não existir, criar configurações padrão
    if (!settings) {
      const { data: newSettings, error: createError } = await supabase
        .from("crm_settings")
        .insert({
          client_id: clientId,
          auto_status_enabled: true,
          lead_tracking_enabled: true,
          auto_tag_ads: true,
          auto_create_cards: true,
          inactivity_warning_days: 3,
          inactivity_critical_days: 7,
        })
        .select()
        .single();

      if (createError) throw createError;
      settings = newSettings;

      // Criar regras padrão para este cliente
      await createDefaultRules(supabase, clientId);
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error fetching CRM settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch CRM settings" },
      { status: 500 },
    );
  }
}

// PATCH - Atualizar configurações
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await getSupabase();
    const body = await request.json();

    const { clientId, ...updates } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId is required" },
        { status: 400 },
      );
    }

    // Mapear campos para snake_case
    const dbUpdates: Record<string, unknown> = {};
    if (updates.autoStatusEnabled !== undefined)
      dbUpdates.auto_status_enabled = updates.autoStatusEnabled;
    if (updates.leadTrackingEnabled !== undefined)
      dbUpdates.lead_tracking_enabled = updates.leadTrackingEnabled;
    if (updates.autoTagAds !== undefined)
      dbUpdates.auto_tag_ads = updates.autoTagAds;
    if (updates.defaultColumnId !== undefined)
      dbUpdates.default_column_id = updates.defaultColumnId;
    if (updates.autoCreateCards !== undefined)
      dbUpdates.auto_create_cards = updates.autoCreateCards;
    if (updates.inactivityWarningDays !== undefined)
      dbUpdates.inactivity_warning_days = updates.inactivityWarningDays;
    if (updates.inactivityCriticalDays !== undefined)
      dbUpdates.inactivity_critical_days = updates.inactivityCriticalDays;

    const { data, error } = await supabase
      .from("crm_settings")
      .update(dbUpdates)
      .eq("client_id", clientId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ settings: data });
  } catch (error) {
    console.error("Error updating CRM settings:", error);
    return NextResponse.json(
      { error: "Failed to update CRM settings" },
      { status: 500 },
    );
  }
}

// Função auxiliar para criar regras padrão
async function createDefaultRules(supabase: any, clientId: string) {
  const defaultRules = [
    // Regra 1: Auto-tag quando vem de anúncio
    {
      client_id: clientId,
      name: "Auto-tag Lead de Anúncio",
      description: 'Adiciona tag "Anúncio" quando lead vem de Meta Ads',
      trigger_type: "lead_source",
      trigger_conditions: { source_type: "meta_ads" },
      action_type: "add_tag",
      action_params: { tag_name: "Anúncio", create_if_not_exists: true },
      is_active: true,
      is_system: true,
      priority: 100,
    },
    // Regra 2: Registrar atividade quando vem de anúncio
    {
      client_id: clientId,
      name: "Log Lead de Anúncio",
      description: "Registra atividade com detalhes do anúncio",
      trigger_type: "lead_source",
      trigger_conditions: { source_type: "meta_ads" },
      action_type: "log_activity",
      action_params: {
        activity_type: "event",
        content: "🎯 Lead veio do anúncio: {{campaign_name}} - {{ad_name}}",
      },
      is_active: true,
      is_system: true,
      priority: 99,
    },
    // Regra 3: Mover para coluna de humano quando transferir
    {
      client_id: clientId,
      name: "Mover ao Transferir para Humano",
      description: "Move o card para coluna de atendimento quando transferir",
      trigger_type: "transfer_human",
      trigger_conditions: {},
      action_type: "update_auto_status",
      action_params: { auto_status: "awaiting_attendant" },
      is_active: true,
      is_system: false,
      priority: 80,
    },
    // Regra 4: Alerta de inatividade (3 dias)
    {
      client_id: clientId,
      name: "Alerta de Inatividade",
      description: "Adiciona tag de alerta após 3 dias sem resposta",
      trigger_type: "inactivity",
      trigger_conditions: { inactivity_days: 3 },
      action_type: "add_tag",
      action_params: { tag_name: "Sem resposta", create_if_not_exists: true },
      is_active: false, // Desativado por padrão
      is_system: false,
      priority: 50,
    },
  ];

  try {
    await (supabase.from("crm_automation_rules") as any).insert(defaultRules);
  } catch (error) {
    console.error("Error creating default rules:", error);
    // Não propagar erro - regras padrão são opcionais
  }
}

import { createServerClient, getClientIdFromSession } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const getSupabase = async () => {
  const client = await createServerClient();
  return client as any;
};

const isMissingColumnError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  return (error as { code?: string }).code === "42703";
};

// GET - Obter configuracoes do CRM
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabase();
    const clientId = await getClientIdFromSession(request);

    if (!clientId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let { data: settings } = await supabase
      .from("crm_settings")
      .select("*")
      .eq("client_id", clientId)
      .single();

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

// PATCH - Atualizar configuracoes
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await getSupabase();
    const clientId = await getClientIdFromSession(request);
    const body = await request.json();

    if (!clientId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updates = body || {};

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
    if (updates.llmIntentEnabled !== undefined)
      dbUpdates.llm_intent_enabled = updates.llmIntentEnabled;
    if (updates.llmIntentThreshold !== undefined)
      dbUpdates.llm_intent_threshold = updates.llmIntentThreshold;
    if (updates.nextStepsTemplate !== undefined)
      dbUpdates.next_steps_template = updates.nextStepsTemplate;
    if (updates.notifSilenceStart !== undefined)
      dbUpdates.notif_silence_start = updates.notifSilenceStart;
    if (updates.notifSilenceEnd !== undefined)
      dbUpdates.notif_silence_end = updates.notifSilenceEnd;
    if (updates.clientTimezone !== undefined)
      dbUpdates.client_timezone = updates.clientTimezone;

    let updateResult = await supabase
      .from("crm_settings")
      .update(dbUpdates)
      .eq("client_id", clientId)
      .select()
      .single();

    if (updateResult.error && isMissingColumnError(updateResult.error)) {
      const fallbackUpdates = { ...dbUpdates };
      delete fallbackUpdates.llm_intent_enabled;
      delete fallbackUpdates.llm_intent_threshold;
      delete fallbackUpdates.next_steps_template;
      delete fallbackUpdates.notif_silence_start;
      delete fallbackUpdates.notif_silence_end;
      delete fallbackUpdates.client_timezone;

      updateResult = await supabase
        .from("crm_settings")
        .update(fallbackUpdates)
        .eq("client_id", clientId)
        .select()
        .single();
    }

    if (updateResult.error) throw updateResult.error;

    return NextResponse.json({ settings: updateResult.data });
  } catch (error) {
    console.error("Error updating CRM settings:", error);
    return NextResponse.json(
      { error: "Failed to update CRM settings" },
      { status: 500 },
    );
  }
}

async function createDefaultRules(supabase: any, clientId: string) {
  const defaultRules = [
    {
      client_id: clientId,
      name: "Auto-tag Lead de Anuncio",
      description: 'Adiciona tag "Anuncio" quando lead vem de Meta Ads',
      trigger_type: "lead_source",
      trigger_conditions: { source_type: "meta_ads" },
      action_type: "add_tag",
      action_params: { tag_name: "Anuncio", create_if_not_exists: true },
      action_steps: [
        {
          action_type: "add_tag",
          action_params: { tag_name: "Anuncio", create_if_not_exists: true },
          on_error: "stop",
        },
      ],
      condition_tree: null,
      is_active: true,
      is_system: true,
      priority: 100,
    },
    {
      client_id: clientId,
      name: "Log Lead de Anuncio",
      description: "Registra atividade com detalhes do anuncio",
      trigger_type: "lead_source",
      trigger_conditions: { source_type: "meta_ads" },
      action_type: "log_activity",
      action_params: {
        activity_type: "event",
        content: "Lead veio do anuncio: {{campaign_name}} - {{ad_name}}",
      },
      action_steps: [
        {
          action_type: "log_activity",
          action_params: {
            activity_type: "event",
            content: "Lead veio do anuncio: {{campaign_name}} - {{ad_name}}",
          },
          on_error: "continue",
        },
      ],
      condition_tree: null,
      is_active: true,
      is_system: true,
      priority: 99,
    },
    {
      client_id: clientId,
      name: "Mover ao Transferir para Humano",
      description: "Atualiza auto-status quando lead pede atendimento humano",
      trigger_type: "transfer_human",
      trigger_conditions: {},
      action_type: "update_auto_status",
      action_params: { auto_status: "awaiting_attendant" },
      action_steps: [
        {
          action_type: "update_auto_status",
          action_params: { auto_status: "awaiting_attendant" },
          on_error: "stop",
        },
      ],
      condition_tree: null,
      is_active: true,
      is_system: false,
      priority: 80,
    },
    {
      client_id: clientId,
      name: "Alerta de Inatividade",
      description: "Adiciona tag de alerta apos 3 dias sem resposta",
      trigger_type: "inactivity",
      trigger_conditions: { inactivity_days: 3 },
      action_type: "add_tag",
      action_params: { tag_name: "Sem resposta", create_if_not_exists: true },
      action_steps: [
        {
          action_type: "add_tag",
          action_params: {
            tag_name: "Sem resposta",
            create_if_not_exists: true,
          },
          on_error: "continue",
        },
      ],
      condition_tree: null,
      is_active: true,
      is_system: false,
      priority: 50,
    },
  ];

  try {
    let insert = await (supabase.from("crm_automation_rules") as any).insert(
      defaultRules,
    );

    if (insert?.error && isMissingColumnError(insert.error)) {
      const fallbackRules = defaultRules.map((rule) => {
        const { action_steps, condition_tree, ...legacy } = rule;
        return legacy;
      });

      insert = await (supabase.from("crm_automation_rules") as any).insert(
        fallbackRules,
      );
    }

    if (insert?.error) {
      throw insert.error;
    }
  } catch (error) {
    console.error("Error creating default rules:", error);
  }
}

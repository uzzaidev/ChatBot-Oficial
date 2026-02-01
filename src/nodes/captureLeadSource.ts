/**
 * 🎯 Node: captureLeadSource
 *
 * Captura a origem do lead quando vem de Meta Ads (Click-to-WhatsApp)
 * e executa regras de automação relacionadas.
 *
 * Este node:
 * 1. Detecta se a mensagem tem referral (vem de anúncio)
 * 2. Salva a origem no lead_sources
 * 3. Executa regras de automação (auto-tag, log de atividade)
 */

import { createServiceRoleClient } from "@/lib/supabase";
import { ReferralData } from "@/lib/types";

// Re-export ReferralData for convenience
export type { ReferralData } from "@/lib/types";

export interface CaptureLeadSourceInput {
  clientId: string;
  cardId: string;
  phone: string;
  contactName?: string;
  referral?: ReferralData | null;
  isFirstMessage?: boolean;
}

export interface CaptureLeadSourceOutput {
  captured: boolean;
  sourceType: "meta_ads" | "organic" | "direct" | "referral";
  leadSourceId?: string;
  automationsTriggered: number;
}

/**
 * Captura e processa a origem do lead
 */
export const captureLeadSource = async (
  input: CaptureLeadSourceInput,
): Promise<CaptureLeadSourceOutput> => {
  const { clientId, cardId, phone, contactName, referral, isFirstMessage } =
    input;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceRoleClient() as any;

  // Determinar tipo de origem
  let sourceType: "meta_ads" | "organic" | "direct" | "referral" = "organic";

  if (referral) {
    // Meta Ads é identificado pelo ctwa_clid ou source_type = 'ad'
    if (referral.ctwa_clid || referral.source_type === "ad") {
      sourceType = "meta_ads";
    } else if (referral.source_type) {
      sourceType = referral.source_type as typeof sourceType;
    }
  }

  // Se não é de anúncio e não é primeira mensagem, pular
  if (sourceType !== "meta_ads" && !isFirstMessage) {
    return {
      captured: false,
      sourceType,
      automationsTriggered: 0,
    };
  }

  try {
    // 1. Salvar/atualizar lead source
    const { data: leadSource, error: sourceError } = await supabase
      .from("lead_sources")
      .upsert(
        {
          client_id: clientId,
          card_id: cardId,
          source_type: sourceType,
          ad_id: referral?.ad_id,
          ad_name: referral?.ad_name,
          adset_id: referral?.adset_id,
          adset_name: referral?.adset_name,
          campaign_id: referral?.campaign_id,
          campaign_name: referral?.campaign_name,
          source_url: referral?.source_url,
          headline: referral?.headline,
          body: referral?.body,
          media_type: referral?.media_type,
          ctwa_clid: referral?.ctwa_clid,
          raw_referral: referral,
          captured_at: new Date().toISOString(),
        },
        {
          onConflict: "card_id",
        },
      )
      .select()
      .single();

    if (sourceError) {
      console.error(
        "[captureLeadSource] Error saving lead source:",
        sourceError,
      );
    }

    // 2. Buscar configurações do CRM
    const { data: settings } = await supabase
      .from("crm_settings")
      .select("auto_tag_ads, lead_tracking_enabled")
      .eq("client_id", clientId)
      .single();

    let automationsTriggered = 0;

    // 3. Se é de Meta Ads, processar automações
    if (
      sourceType === "meta_ads" &&
      settings?.lead_tracking_enabled !== false
    ) {
      // 3a. Auto-criar tag "Anúncio" se configurado
      if (settings?.auto_tag_ads !== false) {
        // Buscar ou criar tag "Anúncio"
        let tagId: string | null = null;

        const { data: existingTag } = await supabase
          .from("crm_tags")
          .select("id")
          .eq("client_id", clientId)
          .eq("name", "Anúncio")
          .single();

        if (existingTag) {
          tagId = existingTag.id;
        } else {
          // Criar tag
          const { data: newTag } = await supabase
            .from("crm_tags")
            .insert({
              client_id: clientId,
              name: "Anúncio",
              color: "#f59e0b", // Amber/orange para anúncios
            })
            .select()
            .single();

          if (newTag) {
            tagId = newTag.id;
          }
        }

        // Adicionar tag ao card (se não existir)
        if (tagId) {
          const { data: existingCardTag } = await supabase
            .from("crm_card_tags")
            .select("id")
            .eq("card_id", cardId)
            .eq("tag_id", tagId)
            .single();

          if (!existingCardTag) {
            await supabase.from("crm_card_tags").insert({
              card_id: cardId,
              tag_id: tagId,
            });

            automationsTriggered++;
          }
        }
      }

      // 3b. Registrar atividade do anúncio
      const campaignInfo =
        referral?.campaign_name || referral?.campaign_id || "Desconhecida";
      const adInfo = referral?.ad_name || referral?.ad_id || "Desconhecido";

      const activityContent = `🎯 Lead veio do anúncio: Campanha "${campaignInfo}" - Anúncio "${adInfo}"`;

      await supabase.from("crm_card_activities").insert({
        client_id: clientId,
        card_id: cardId,
        activity_type: "event",
        content: activityContent,
        metadata: {
          automation: "lead_source_captured",
          source_type: sourceType,
          campaign_name: referral?.campaign_name,
          campaign_id: referral?.campaign_id,
          ad_name: referral?.ad_name,
          ad_id: referral?.ad_id,
          ctwa_clid: referral?.ctwa_clid,
        },
      });

      automationsTriggered++;

      // 4. Executar regras de automação personalizadas para lead_source
      const { data: rules } = await supabase
        .from("crm_automation_rules")
        .select("*")
        .eq("client_id", clientId)
        .eq("trigger_type", "lead_source")
        .eq("is_active", true)
        .order("priority", { ascending: false });

      if (rules && rules.length > 0) {
        for (const rule of rules) {
          // Verificar condição de source_type
          const requiredSourceType = rule.trigger_conditions?.source_type;
          if (requiredSourceType && requiredSourceType !== sourceType) {
            continue;
          }

          // Executar ação
          const actionExecuted = await executeRuleAction(
            supabase,
            clientId,
            cardId,
            rule,
            {
              source_type: sourceType,
              campaign_name: referral?.campaign_name,
              campaign_id: referral?.campaign_id,
              ad_name: referral?.ad_name,
              ad_id: referral?.ad_id,
              contact_name: contactName,
            },
          );

          if (actionExecuted) {
            automationsTriggered++;
          }
        }
      }
    }

    return {
      captured: true,
      sourceType,
      leadSourceId: leadSource?.id,
      automationsTriggered,
    };
  } catch (error) {
    console.error("[captureLeadSource] Error:", error);
    return {
      captured: false,
      sourceType,
      automationsTriggered: 0,
    };
  }
};

/**
 * Executa uma ação de regra de automação
 */
const executeRuleAction = async (
  supabase: ReturnType<typeof createServiceRoleClient>,
  clientId: string,
  cardId: string,
  rule: any,
  variables: Record<string, unknown>,
): Promise<boolean> => {
  try {
    const { action_type, action_params } = rule;

    switch (action_type) {
      case "add_tag": {
        let tagId = action_params.tag_id;

        // Se não tem tag_id mas tem tag_name, buscar ou criar
        if (!tagId && action_params.tag_name) {
          const { data: existingTag } = await (supabase.from("crm_tags") as any)
            .select("id")
            .eq("client_id", clientId)
            .eq("name", action_params.tag_name)
            .single();

          if (existingTag) {
            tagId = existingTag.id;
          } else if (action_params.create_if_not_exists) {
            const { data: newTag } = await (supabase.from("crm_tags") as any)
              .insert({
                client_id: clientId,
                name: action_params.tag_name,
                color: "#6366f1", // Default indigo
              })
              .select()
              .single();

            if (newTag) {
              tagId = newTag.id;
            }
          }
        }

        if (tagId) {
          await (supabase.from("crm_card_tags") as any).upsert(
            { card_id: cardId, tag_id: tagId },
            { onConflict: "card_id,tag_id" },
          );
          return true;
        }
        return false;
      }

      case "move_to_column": {
        const columnId = action_params.column_id;
        if (columnId) {
          await (supabase.from("crm_cards") as any)
            .update({ column_id: columnId })
            .eq("id", cardId);
          return true;
        }
        return false;
      }

      case "update_auto_status": {
        const autoStatus = action_params.auto_status;
        if (autoStatus) {
          await (supabase.from("crm_cards") as any)
            .update({ auto_status: autoStatus })
            .eq("id", cardId);
          return true;
        }
        return false;
      }

      case "log_activity": {
        let content = action_params.content || "";

        // Substituir variáveis {{var}} pelo valor real
        for (const [key, value] of Object.entries(variables)) {
          content = content.replace(
            new RegExp(`{{${key}}}`, "g"),
            String(value || ""),
          );
        }

        await (supabase.from("crm_card_activities") as any).insert({
          client_id: clientId,
          card_id: cardId,
          activity_type: action_params.activity_type || "system",
          content,
        });
        return true;
      }

      case "add_note": {
        let content = action_params.note_content || "";

        // Substituir variáveis
        for (const [key, value] of Object.entries(variables)) {
          content = content.replace(
            new RegExp(`{{${key}}}`, "g"),
            String(value || ""),
          );
        }

        await (supabase.from("crm_card_notes") as any).insert({
          client_id: clientId,
          card_id: cardId,
          content,
        });
        return true;
      }

      default:
        console.warn(`[executeRuleAction] Unknown action type: ${action_type}`);
        return false;
    }
  } catch (error) {
    console.error("[executeRuleAction] Error:", error);
    return false;
  }
};

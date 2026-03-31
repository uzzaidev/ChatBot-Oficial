/**
 * Node: captureLeadSource
 *
 * Captura a origem do lead quando vem de Meta Ads (Click-to-WhatsApp)
 * e executa automacoes relacionadas via engine canonico.
 */

import { emitCrmAutomationEvent } from "@/lib/crm-automation-engine";
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
  const { clientId, cardId, contactName, referral, isFirstMessage } = input;
  const supabase = createServiceRoleClient() as any;

  // Determinar tipo de origem
  let sourceType: "meta_ads" | "organic" | "direct" | "referral" = "organic";

  if (referral) {
    // Meta Ads e identificado pelo ctwa_clid ou source_type = 'ad'
    if (referral.ctwa_clid || referral.source_type === "ad") {
      sourceType = "meta_ads";
    } else if (referral.source_type) {
      sourceType = referral.source_type as typeof sourceType;
    }
  } else if (isFirstMessage) {
    sourceType = "direct";
  }

  // Se nao e de anuncio e nao e primeira mensagem, pular
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
      console.error("[captureLeadSource] Error saving lead source:", sourceError);
    }

    // 2. Buscar configuracoes do CRM
    const { data: settings } = await supabase
      .from("crm_settings")
      .select("auto_tag_ads, lead_tracking_enabled")
      .eq("client_id", clientId)
      .single();

    let automationsTriggered = 0;

    // 3. Comportamentos embutidos para Meta Ads (Camada 1 - toggles)
    if (sourceType === "meta_ads" && settings?.lead_tracking_enabled !== false) {
      // 3a. Auto-criar tag "Anuncio" se configurado
      if (settings?.auto_tag_ads !== false) {
        // Buscar ou criar tag "Anuncio"
        let tagId: string | null = null;

        const { data: existingTag } = await supabase
          .from("crm_tags")
          .select("id")
          .eq("client_id", clientId)
          .eq("name", "Anuncio")
          .single();

        if (existingTag) {
          tagId = existingTag.id;
        } else {
          const { data: newTag } = await supabase
            .from("crm_tags")
            .insert({
              client_id: clientId,
              name: "Anuncio",
              color: "#f59e0b",
            })
            .select()
            .single();

          if (newTag) {
            tagId = newTag.id;
          }
        }

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

      // 3b. Registrar atividade do anuncio
      const campaignInfo =
        referral?.campaign_name || referral?.campaign_id || "Desconhecida";
      const adInfo = referral?.ad_name || referral?.ad_id || "Desconhecido";

      const activityContent = `Lead veio do anuncio: Campanha "${campaignInfo}" - Anuncio "${adInfo}"`;

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
    }

    // 4. Executar regras customizaveis via engine (Camada 2)
    if (settings?.lead_tracking_enabled !== false) {
      const engineResult = await emitCrmAutomationEvent({
        clientId,
        cardId,
        triggerType: "lead_source",
        dedupeKey: `lead_source:${cardId}:${sourceType}:${referral?.ctwa_clid || referral?.ad_id || "none"}`,
        triggerData: {
          source_type: sourceType,
          campaign_name: referral?.campaign_name,
          campaign_id: referral?.campaign_id,
          ad_name: referral?.ad_name,
          ad_id: referral?.ad_id,
          contact_name: contactName,
          is_first_message: Boolean(isFirstMessage),
        },
      });

      automationsTriggered += engineResult.executedRules;
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

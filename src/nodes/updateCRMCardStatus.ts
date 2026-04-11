/**
 * Node: updateCRMCardStatus
 *
 * Atualiza o status do card no CRM baseado em eventos do chatbot.
 * Regras customizadas sao executadas via engine canonico.
 */

import { emitCrmAutomationEvent } from "@/lib/crm-automation-engine";
import { createServiceRoleClient } from "@/lib/supabase";

export type CRMStatusEvent =
  | "message_received"
  | "message_sent"
  | "transfer_human"
  | "close_conversation"
  | "reopen_conversation";

export type AutoStatus =
  | "awaiting_attendant"
  | "awaiting_client"
  | "neutral"
  | "resolved";

export interface UpdateCRMCardStatusInput {
  clientId: string;
  phone: string;
  event: CRMStatusEvent;
  conversationStatus?: "bot" | "humano" | "transferido";
  metadata?: {
    messageDirection?: "incoming" | "outgoing";
    sentBy?: "bot" | "human";
    transferReason?: string;
  };
}

export interface UpdateCRMCardStatusOutput {
  updated: boolean;
  cardId?: string;
  previousStatus?: AutoStatus;
  newStatus?: AutoStatus;
  automationsTriggered: number;
}

const LEGACY_STATUS_MAP: Record<string, AutoStatus> = {
  awaiting_response: "awaiting_client",
  in_service: "awaiting_attendant",
  resolved: "resolved",
  awaiting_attendant: "awaiting_attendant",
  awaiting_client: "awaiting_client",
  neutral: "neutral",
};

const normalizeStatus = (value: unknown): AutoStatus => {
  if (typeof value !== "string") return "neutral";
  return LEGACY_STATUS_MAP[value] ?? "neutral";
};

/**
 * Atualiza o status do card no CRM
 */
export const updateCRMCardStatus = async (
  input: UpdateCRMCardStatusInput,
): Promise<UpdateCRMCardStatusOutput> => {
  const { clientId, phone, event, conversationStatus, metadata } = input;
  const supabase = createServiceRoleClient() as any;

  try {
    // 1. Verificar se auto_status esta habilitado para este cliente
    const { data: settings } = await supabase
      .from("crm_settings")
      .select("auto_status_enabled")
      .eq("client_id", clientId)
      .single();

    if (settings?.auto_status_enabled === false) {
      console.log(
        `[updateCRMCardStatus] 🔒 auto_status DISABLED for client=${clientId}`,
      );
      return {
        updated: false,
        automationsTriggered: 0,
      };
    }

    // 2. Buscar card pelo phone
    const { data: card, error: cardError } = await supabase
      .from("crm_cards")
      .select("id, auto_status, column_id")
      .eq("client_id", clientId)
      .eq("phone", phone)
      .single();

    if (cardError || !card) {
      console.log(
        `[updateCRMCardStatus] ⚠️ No CRM card found for phone=${phone} client=${clientId}`,
      );
      return {
        updated: false,
        automationsTriggered: 0,
      };
    }

    const previousStatus = normalizeStatus(card.auto_status);
    let newStatus: AutoStatus = previousStatus;
    let automationsTriggered = 0;

    // 3. Determinar novo status baseado no evento
    switch (event) {
      case "message_received":
        // Cliente respondeu - normalmente volta para fila do atendente
        newStatus = "awaiting_attendant";
        break;

      case "message_sent":
        // Mensagem enviada ao cliente - aguardando resposta dele
        newStatus = "awaiting_client";
        break;

      case "transfer_human":
        newStatus = "awaiting_attendant";
        break;

      case "close_conversation":
        // Mantemos "neutral" para compatibilidade com schemas antigos
        newStatus = "neutral";
        break;

      case "reopen_conversation":
        if (conversationStatus === "bot") {
          newStatus = "awaiting_client";
        } else {
          newStatus = "awaiting_attendant";
        }
        break;
    }

    // 4. Se status mudou, atualizar
    if (newStatus !== previousStatus) {
      await supabase
        .from("crm_cards")
        .update({
          auto_status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", card.id);

      // 5. Regras customizadas via engine
      const statusRuleResult = await emitCrmAutomationEvent({
        clientId,
        cardId: card.id,
        triggerType: "status_change",
        dedupeKey: `status_change:${card.id}:${previousStatus}->${newStatus}:${event}`,
        triggerData: {
          from_status: previousStatus,
          to_status: newStatus,
          event,
          conversation_status: conversationStatus,
          sent_by: metadata?.sentBy,
        },
      });

      automationsTriggered += statusRuleResult.executedRules;

      if (event === "transfer_human") {
        const transferResult = await emitCrmAutomationEvent({
          clientId,
          cardId: card.id,
          triggerType: "transfer_human",
          dedupeKey: `transfer_human:${card.id}:${newStatus}`,
          triggerData: {
            request_text: metadata?.transferReason || "transfer_requested",
            current_status: conversationStatus || "transferido",
          },
        });

        automationsTriggered += transferResult.executedRules;

        // Log funcional de transferencia
        await supabase.from("crm_card_activities").insert({
          client_id: clientId,
          card_id: card.id,
          activity_type: "event",
          content: `Transferido para atendimento humano${
            metadata?.transferReason ? `: ${metadata.transferReason}` : ""
          }`,
          metadata: {
            automation: "status_change",
            event,
            from_status: previousStatus,
            to_status: newStatus,
          },
        });

        automationsTriggered++;
      }

      return {
        updated: true,
        cardId: card.id,
        previousStatus,
        newStatus,
        automationsTriggered,
      };
    }

    return {
      updated: false,
      cardId: card.id,
      previousStatus,
      newStatus,
      automationsTriggered,
    };
  } catch (error) {
    console.error("[updateCRMCardStatus] Error:", error);
    return {
      updated: false,
      automationsTriggered: 0,
    };
  }
};

/**
 * Helper: Criar ou atualizar card CRM para um contato
 * (usado quando auto_create_cards esta habilitado)
 */
export const ensureCRMCard = async (
  clientId: string,
  phone: string,
  contactName?: string,
): Promise<{ cardId: string; created: boolean } | null> => {
  const supabase = createServiceRoleClient() as any;

  try {
    const { data: existingCard } = await supabase
      .from("crm_cards")
      .select("id")
      .eq("client_id", clientId)
      .eq("phone", phone)
      .single();

    if (existingCard) {
      return { cardId: existingCard.id, created: false };
    }

    const { data: settings } = await supabase
      .from("crm_settings")
      .select("auto_create_cards, default_column_id")
      .eq("client_id", clientId)
      .single();

    if (settings?.auto_create_cards === false) {
      console.log(
        `[ensureCRMCard] 🔒 auto_create_cards DISABLED for client=${clientId}`,
      );
      return null;
    }

    let columnId = settings?.default_column_id;

    if (!columnId) {
      const { data: firstColumn } = await supabase
        .from("crm_columns")
        .select("id")
        .eq("client_id", clientId)
        .order("position", { ascending: true })
        .limit(1)
        .single();

      columnId = firstColumn?.id;
    }

    if (!columnId) {
      return null;
    }

    const { data: newCard, error } = await supabase
      .from("crm_cards")
      .insert({
        client_id: clientId,
        column_id: columnId,
        phone,
        contact_name: contactName,
        title: contactName || phone,
        auto_status: "awaiting_attendant",
      })
      .select("id")
      .single();

    if (error) throw error;

    // Emite card_created para regras customizadas
    await emitCrmAutomationEvent({
      clientId,
      cardId: newCard.id,
      triggerType: "card_created",
      dedupeKey: `card_created:${newCard.id}`,
      triggerData: {
        contact_name: contactName || null,
        phone,
        source_type: "direct",
      },
    });

    return { cardId: newCard.id, created: true };
  } catch (error) {
    console.error("[ensureCRMCard] Error:", error);
    return null;
  }
};

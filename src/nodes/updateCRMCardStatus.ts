/**
 * 🔄 Node: updateCRMCardStatus
 *
 * Atualiza o status do card no CRM baseado em eventos do chatbot.
 * Este node centraliza a lógica de auto_status para manter o CRM sincronizado.
 *
 * Eventos suportados:
 * - message_received: Cliente enviou mensagem
 * - message_sent: Bot/Humano enviou mensagem
 * - transfer_human: Transferência para atendente
 * - close_conversation: Conversa encerrada
 * - reopen_conversation: Conversa reaberta pelo cliente
 */

import { createServiceRoleClient } from "@/lib/supabase";

export type CRMStatusEvent =
  | "message_received"
  | "message_sent"
  | "transfer_human"
  | "close_conversation"
  | "reopen_conversation";

export type AutoStatus =
  | "awaiting_response" // Aguardando resposta do cliente
  | "awaiting_attendant" // Aguardando atendente
  | "in_service" // Em atendimento
  | "resolved"; // Resolvido

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

/**
 * Atualiza o status do card no CRM
 */
export const updateCRMCardStatus = async (
  input: UpdateCRMCardStatusInput,
): Promise<UpdateCRMCardStatusOutput> => {
  const { clientId, phone, event, conversationStatus, metadata } = input;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceRoleClient() as any;

  try {
    // 1. Verificar se auto_status está habilitado para este cliente
    const { data: settings } = await supabase
      .from("crm_settings")
      .select("auto_status_enabled")
      .eq("client_id", clientId)
      .single();

    // Se auto_status desabilitado, não fazer nada
    if (settings?.auto_status_enabled === false) {
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
      // Card não existe, pode ser um contato não-CRM
      return {
        updated: false,
        automationsTriggered: 0,
      };
    }

    const previousStatus = card.auto_status as AutoStatus;
    let newStatus: AutoStatus = previousStatus;
    let automationsTriggered = 0;

    // 3. Determinar novo status baseado no evento
    switch (event) {
      case "message_received":
        // Cliente enviou mensagem
        if (conversationStatus === "bot") {
          // Em atendimento pelo bot, aguardando próxima resposta
          newStatus = "awaiting_response";
        } else if (
          conversationStatus === "humano" ||
          conversationStatus === "transferido"
        ) {
          // Humano está atendendo, cliente respondeu
          newStatus = "in_service";
        }
        break;

      case "message_sent":
        // Bot ou humano enviou mensagem
        if (metadata?.sentBy === "bot" && conversationStatus === "bot") {
          // Bot respondeu, aguardando cliente
          newStatus = "awaiting_response";
        } else if (metadata?.sentBy === "human") {
          // Humano respondeu, em atendimento
          newStatus = "in_service";
        }
        break;

      case "transfer_human":
        // Transferido para atendente
        newStatus = "awaiting_attendant";
        break;

      case "close_conversation":
        // Conversa encerrada
        newStatus = "resolved";
        break;

      case "reopen_conversation":
        // Cliente enviou mensagem após conversa encerrada
        if (conversationStatus === "bot") {
          newStatus = "awaiting_response";
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

      // 5. Executar regras de automação para status_change
      const { data: rules } = await supabase
        .from("crm_automation_rules")
        .select("*")
        .eq("client_id", clientId)
        .eq("trigger_type", "status_change")
        .eq("is_active", true)
        .order("priority", { ascending: false });

      if (rules && rules.length > 0) {
        for (const rule of rules) {
          const conditions = rule.trigger_conditions || {};

          // Verificar condições
          const fromStatusMatch =
            !conditions.from_status ||
            conditions.from_status === previousStatus;
          const toStatusMatch =
            !conditions.to_status || conditions.to_status === newStatus;

          if (fromStatusMatch && toStatusMatch) {
            // Executar ação
            const executed = await executeStatusChangeAction(
              supabase,
              clientId,
              card.id,
              rule,
              {
                from_status: previousStatus,
                to_status: newStatus,
                event,
              },
            );

            if (executed) {
              automationsTriggered++;
            }
          }
        }
      }

      // 6. Log de atividade se foi transferência
      if (event === "transfer_human") {
        await supabase.from("crm_card_activities").insert({
          client_id: clientId,
          card_id: card.id,
          activity_type: "event",
          content: `🔄 Transferido para atendimento humano${
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
 * Executa uma ação para mudança de status
 */
const executeStatusChangeAction = async (
  supabase: ReturnType<typeof createServiceRoleClient>,
  clientId: string,
  cardId: string,
  rule: any,
  variables: Record<string, unknown>,
): Promise<boolean> => {
  try {
    const { action_type, action_params } = rule;

    switch (action_type) {
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

      case "add_tag": {
        const tagId = action_params.tag_id;
        if (tagId) {
          await (supabase.from("crm_card_tags") as any).upsert(
            { card_id: cardId, tag_id: tagId },
            { onConflict: "card_id,tag_id" },
          );
          return true;
        }
        return false;
      }

      case "assign_to": {
        const userId = action_params.user_id;
        if (userId) {
          await (supabase.from("crm_cards") as any)
            .update({ assigned_to: userId })
            .eq("id", cardId);
          return true;
        }
        return false;
      }

      case "log_activity": {
        let content = action_params.content || "";

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

      default:
        return false;
    }
  } catch (error) {
    console.error("[executeStatusChangeAction] Error:", error);
    return false;
  }
};

/**
 * Helper: Criar ou atualizar card CRM para um contato
 * (usado quando auto_create_cards está habilitado)
 */
export const ensureCRMCard = async (
  clientId: string,
  phone: string,
  contactName?: string,
): Promise<{ cardId: string; created: boolean } | null> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceRoleClient() as any;

  try {
    // Verificar se já existe
    const { data: existingCard } = await supabase
      .from("crm_cards")
      .select("id")
      .eq("client_id", clientId)
      .eq("phone", phone)
      .single();

    if (existingCard) {
      return { cardId: existingCard.id, created: false };
    }

    // Verificar configurações
    const { data: settings } = await supabase
      .from("crm_settings")
      .select("auto_create_cards, default_column_id")
      .eq("client_id", clientId)
      .single();

    if (settings?.auto_create_cards === false) {
      return null;
    }

    // Buscar coluna padrão ou primeira coluna
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
      // Sem colunas, não criar card
      return null;
    }

    // Criar card
    const { data: newCard, error } = await supabase
      .from("crm_cards")
      .insert({
        client_id: clientId,
        column_id: columnId,
        phone,
        contact_name: contactName,
        title: contactName || phone,
        auto_status: "awaiting_response",
      })
      .select("id")
      .single();

    if (error) throw error;

    return { cardId: newCard.id, created: true };
  } catch (error) {
    console.error("[ensureCRMCard] Error:", error);
    return null;
  }
};

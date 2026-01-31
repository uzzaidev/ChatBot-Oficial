/**
 * 🎯 Node: sendConversionEvent
 *
 * Sends conversion events to Meta Conversions API for Business Messaging.
 * This allows Meta to optimize ad delivery for people more likely to convert.
 *
 * Supported events:
 * - Lead: When a new lead is captured
 * - QualifiedLead: When lead is qualified
 * - InitiateCheckout: When lead shows purchase intent
 * - Purchase: When deal is closed
 *
 * @see https://developers.facebook.com/docs/marketing-api/conversions-api/business-messaging
 */

import { getClientConfig } from "@/lib/config";
import { createServiceRoleClient } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

// Type definitions
export type ConversionEventName =
  | "Lead"
  | "QualifiedLead"
  | "InitiateCheckout"
  | "Purchase"
  | "CustomEvent";

export interface ConversionEventInput {
  clientId: string;
  cardId?: string;
  phone: number | string;
  eventName: ConversionEventName;
  eventTime?: number; // Unix timestamp in seconds
  customData?: {
    value?: number;
    currency?: string;
    content_name?: string;
    content_category?: string;
  };
  // Optional: Skip ctwa_clid lookup if already known
  ctwaClid?: string;
}

export interface ConversionEventResult {
  success: boolean;
  eventId: string;
  sent: boolean;
  skipped: boolean;
  skipReason?: string;
  response?: unknown;
  error?: string;
}

/**
 * Send a conversion event to Meta Conversions API
 * Returns event ID for deduplication tracking
 */
export const sendConversionEvent = async (
  input: ConversionEventInput,
): Promise<ConversionEventResult> => {
  const {
    clientId,
    cardId,
    phone,
    eventName,
    eventTime,
    customData,
    ctwaClid: providedCtwaClid,
  } = input;

  // Generate unique event ID for deduplication
  const eventId = uuidv4();
  const supabase = createServiceRoleClient();
  const numericPhone =
    typeof phone === "string" ? parseInt(phone.replace(/\D/g, ""), 10) : phone;

  // Log entry creation (for tracking regardless of outcome)
  const logEntry: Record<string, unknown> = {
    client_id: clientId,
    card_id: cardId || null,
    phone: numericPhone,
    event_id: eventId,
    event_name: eventName,
    event_time: eventTime
      ? new Date(eventTime * 1000).toISOString()
      : new Date().toISOString(),
    custom_data: customData || {},
    status: "pending" as const,
  };

  try {
    // 1. Get Meta configuration for this client
    const { data: client, error: clientError } = (await supabase
      .from("clients")
      .select("meta_waba_id, meta_dataset_id")
      .eq("id", clientId)
      .single()) as {
      data: {
        meta_waba_id: string | null;
        meta_dataset_id: string | null;
      } | null;
      error: unknown;
    };

    if (clientError || !client) {
      console.log("[CAPI] Client not found:", clientId);
      return {
        success: false,
        eventId,
        sent: false,
        skipped: true,
        skipReason: "client_not_found",
        error: `Client not found: ${clientId}`,
      };
    }

    // Check if Meta Ads is configured
    if (!client.meta_waba_id || !client.meta_dataset_id) {
      console.log("[CAPI] Meta Ads not configured for client:", clientId);

      // Log as skipped (table may not exist yet if migration not run)
      try {
        // @ts-expect-error conversion_events_log table created by migration
        await supabase.from("conversion_events_log").insert({
          ...logEntry,
          status: "skipped",
          error_message:
            "Meta Ads not configured (missing waba_id or dataset_id)",
        });
      } catch {
        console.log("[CAPI] Could not log to conversion_events_log");
      }

      return {
        success: true, // Not an error, just not configured
        eventId,
        sent: false,
        skipped: true,
        skipReason: "meta_not_configured",
      };
    }

    // 2. Get ctwa_clid (Click-to-WhatsApp click ID)
    let ctwaClid = providedCtwaClid;

    if (!ctwaClid && cardId) {
      // Lookup from lead_sources table
      const { data: leadSource } = (await supabase
        .from("lead_sources")
        .select("ctwa_clid, campaign_id, ad_id")
        .eq("card_id", cardId)
        .eq("source_type", "meta_ads")
        .single()) as {
        data: {
          ctwa_clid: string | null;
          campaign_id: string | null;
          ad_id: string | null;
        } | null;
      };

      if (leadSource && leadSource.ctwa_clid) {
        ctwaClid = leadSource.ctwa_clid;
        logEntry.ctwa_clid = ctwaClid;
        logEntry.campaign_id = leadSource.campaign_id;
        logEntry.ad_id = leadSource.ad_id;
      }
    }

    // For Conversions API, ctwa_clid is REQUIRED for attribution
    if (!ctwaClid) {
      console.log("[CAPI] No ctwa_clid found, skipping conversion event");

      try {
        // @ts-expect-error conversion_events_log table created by migration
        await supabase.from("conversion_events_log").insert({
          ...logEntry,
          status: "skipped",
          error_message: "No ctwa_clid found (lead not from Meta Ads)",
        });
      } catch {
        console.log("[CAPI] Could not log to conversion_events_log");
      }

      return {
        success: true,
        eventId,
        sent: false,
        skipped: true,
        skipReason: "no_ctwa_clid",
      };
    }

    // 3. Get access token from client config (via Vault)
    const clientConfig = await getClientConfig(clientId);

    if (!clientConfig?.apiKeys.metaAccessToken) {
      console.error("[CAPI] No meta_access_token found in vault for client");

      try {
        // @ts-expect-error conversion_events_log table created by migration
        await supabase.from("conversion_events_log").insert({
          ...logEntry,
          ctwa_clid: ctwaClid,
          status: "error",
          error_message: "No meta_access_token in vault",
        });
      } catch {
        console.log("[CAPI] Could not log to conversion_events_log");
      }

      return {
        success: false,
        eventId,
        sent: false,
        skipped: false,
        error: "No access token configured",
      };
    }

    const accessToken = clientConfig.apiKeys.metaAccessToken;

    // 4. Build Conversions API payload
    const eventPayload = {
      data: [
        {
          event_name: eventName,
          event_time: eventTime || Math.floor(Date.now() / 1000),
          event_id: eventId, // For deduplication on Meta's side
          action_source: "business_messaging",
          messaging_channel: "whatsapp",
          user_data: {
            whatsapp_business_account_id: client.meta_waba_id,
            ctwa_clid: ctwaClid,
          },
          ...(customData && {
            custom_data: {
              ...(customData.value !== undefined && {
                value: customData.value,
              }),
              ...(customData.currency && { currency: customData.currency }),
              ...(customData.content_name && {
                content_name: customData.content_name,
              }),
              ...(customData.content_category && {
                content_category: customData.content_category,
              }),
            },
          }),
        },
      ],
      partner_agent: "uzzbot-whatsapp-crm",
    };

    // 5. Send to Conversions API
    console.log(
      `[CAPI] Sending ${eventName} event for phone ${numericPhone}...`,
    );

    const response = await fetch(
      `https://graph.facebook.com/v20.0/${client.meta_dataset_id}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      },
    );

    const responseData = await response.json();

    // 6. Log the result
    if (response.ok) {
      console.log(`[CAPI] ✅ Successfully sent ${eventName} event`);

      try {
        // @ts-expect-error conversion_events_log table created by migration
        await supabase.from("conversion_events_log").insert({
          ...logEntry,
          ctwa_clid: ctwaClid,
          status: "success",
          response: responseData,
          sent_at: new Date().toISOString(),
        });
      } catch {
        console.log("[CAPI] Could not log to conversion_events_log");
      }

      // Mark lead_source as having sent conversion event
      if (cardId && eventName === "Lead") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("lead_sources")
          .update({
            conversion_event_sent: true,
          })
          .eq("card_id", cardId);
      }

      return {
        success: true,
        eventId,
        sent: true,
        skipped: false,
        response: responseData,
      };
    } else {
      console.error(
        `[CAPI] ❌ Failed to send ${eventName} event:`,
        responseData,
      );

      try {
        // @ts-expect-error conversion_events_log table created by migration
        await supabase.from("conversion_events_log").insert({
          ...logEntry,
          ctwa_clid: ctwaClid,
          status: "error",
          response: responseData,
          error_message: responseData.error?.message || "API error",
          sent_at: new Date().toISOString(),
        });
      } catch {
        console.log("[CAPI] Could not log to conversion_events_log");
      }

      return {
        success: false,
        eventId,
        sent: true, // We tried to send
        skipped: false,
        response: responseData,
        error: responseData.error?.message || "API error",
      };
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[CAPI] Exception sending conversion event:", errorMessage);

    // Log error
    try {
      // @ts-expect-error conversion_events_log table created by migration
      await supabase.from("conversion_events_log").insert({
        ...logEntry,
        status: "error",
        error_message: errorMessage,
      });
    } catch {
      console.log("[CAPI] Could not log to conversion_events_log");
    }

    return {
      success: false,
      eventId,
      sent: false,
      skipped: false,
      error: errorMessage,
    };
  }
};

/**
 * Send conversion event when CRM card moves to a specific column
 * Called from /api/crm/cards/[id]/move route
 */
export const sendConversionEventOnCardMove = async (
  clientId: string,
  cardId: string,
  newColumnSlug: string,
  cardPhone: number,
  estimatedValue?: number,
): Promise<ConversionEventResult | null> => {
  // Map column slugs to event names
  const columnEventMap: Record<string, ConversionEventName> = {
    novo: "Lead",
    qualificando: "QualifiedLead",
    proposta: "InitiateCheckout",
    fechado: "Purchase",
  };

  const eventName = columnEventMap[newColumnSlug];

  if (!eventName) {
    // Column doesn't map to any conversion event
    return null;
  }

  // Only send "Lead" event once (checked via lead_sources.conversion_event_sent)
  if (eventName === "Lead") {
    const supabase = createServiceRoleClient();
    const { data: leadSource } = (await supabase
      .from("lead_sources")
      .select("conversion_event_sent")
      .eq("card_id", cardId)
      .single()) as { data: { conversion_event_sent: boolean | null } | null };

    if (leadSource?.conversion_event_sent) {
      console.log("[CAPI] Lead event already sent for this card, skipping");
      return null;
    }
  }

  return sendConversionEvent({
    clientId,
    cardId,
    phone: cardPhone,
    eventName,
    customData:
      eventName === "Purchase" && estimatedValue
        ? {
            value: estimatedValue,
            currency: "BRL",
          }
        : undefined,
  });
};

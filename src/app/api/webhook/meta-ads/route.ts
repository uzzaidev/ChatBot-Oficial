/**
 * 🎯 META ADS WEBHOOK
 *
 * Endpoint for receiving Meta Ads events:
 * - Lead generation (leadgen) from Lead Ads
 * - Campaign status changes
 * - Ad account events
 *
 * URL: POST /api/webhook/meta-ads
 *
 * This is SEPARATE from the WhatsApp webhook. Meta Ad Account webhooks
 * deliver different types of events than WhatsApp Business API webhooks.
 *
 * Setup in Meta Developer Console:
 * 1. Go to your app → Webhooks → Ad Account
 * 2. Subscribe to: leadgen, campaigns, ads, ad_accounts
 * 3. Callback URL: https://your-domain.com/api/webhook/meta-ads
 * 4. Verify Token: Use the same as WhatsApp or a separate one
 *
 * @see https://developers.facebook.com/docs/marketing-api/webhooks
 */

import { getClientConfig } from "@/lib/config";
import {
  createCardFromLead,
  fetchLeadDetails,
  parseLeadData,
} from "@/lib/meta-leads";
import { createServiceRoleClient } from "@/lib/supabase";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Verify webhook signature from Meta
const verifySignature = (
  payload: string,
  signature: string | null,
  appSecret: string,
): boolean => {
  if (!signature) return false;

  const expectedSignature = crypto
    .createHmac("sha256", appSecret)
    .update(payload)
    .digest("hex");

  const receivedSignature = signature.replace("sha256=", "");
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(receivedSignature),
  );
};

/**
 * GET - Webhook Verification (Meta challenge)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  console.log("[META-ADS-WEBHOOK] Verification request received");
  console.log("  mode:", mode);
  console.log("  token:", token ? `${token.substring(0, 10)}...` : "null");
  console.log("  challenge:", challenge);

  // Get verify token from environment
  // You can use a separate token or the same as WhatsApp
  const expectedToken =
    process.env.META_ADS_VERIFY_TOKEN || process.env.META_VERIFY_TOKEN;

  if (!expectedToken) {
    console.error("[META-ADS-WEBHOOK] No verify token configured!");
    return new NextResponse("Server not configured", { status: 500 });
  }

  if (mode === "subscribe" && token === expectedToken) {
    console.log("[META-ADS-WEBHOOK] ✅ Verification successful");
    return new NextResponse(challenge, { status: 200 });
  }

  console.log("[META-ADS-WEBHOOK] ❌ Verification failed");
  return new NextResponse("Verification failed", { status: 403 });
}

/**
 * POST - Receive Meta Ads Events
 */
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎯 [META-ADS-WEBHOOK] Event received");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📅 Timestamp:", timestamp);

  try {
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);

    // Signature verification (optional but recommended)
    const signature = request.headers.get("x-hub-signature-256");
    const appSecret = process.env.META_APP_SECRET;

    if (appSecret && signature) {
      if (!verifySignature(rawBody, signature, appSecret)) {
        console.error("[META-ADS-WEBHOOK] ❌ Invalid signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 },
        );
      }
      console.log("[META-ADS-WEBHOOK] ✅ Signature verified");
    } else {
      console.log(
        "[META-ADS-WEBHOOK] ⚠️ Signature verification skipped (no secret or signature)",
      );
    }

    console.log("[META-ADS-WEBHOOK] Object type:", body.object);

    // Handle different webhook objects
    if (body.object === "ad_account") {
      await handleAdAccountEvents(body.entry);
    } else if (body.object === "page") {
      await handlePageEvents(body.entry);
    } else {
      console.log("[META-ADS-WEBHOOK] Unknown object type:", body.object);
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[META-ADS-WEBHOOK] Error processing webhook:", error);
    // Still return 200 to prevent Meta from retrying
    return NextResponse.json(
      { received: true, error: "Processing error" },
      { status: 200 },
    );
  }
}

/**
 * Handle Ad Account Events (leadgen, campaigns, etc.)
 */
async function handleAdAccountEvents(entries: MetaAdAccountEntry[]) {
  const supabase = createServiceRoleClient();

  for (const entry of entries) {
    console.log("[META-ADS-WEBHOOK] Ad Account ID:", entry.id);

    for (const change of entry.changes || []) {
      console.log("  Change field:", change.field);
      console.log("  Change value:", JSON.stringify(change.value, null, 2));

      // Handle leadgen (Lead Ads form submissions)
      if (change.field === "leadgen") {
        await handleLeadgenEvent(
          supabase,
          entry.id,
          change.value as LeadgenValue,
        );
      }

      // Handle campaign status changes
      if (change.field === "campaigns") {
        await handleCampaignEvent(
          supabase,
          entry.id,
          change.value as CampaignChangeValue,
        );
      }
    }
  }
}

/**
 * Handle Page Events (alternative leadgen delivery)
 */
async function handlePageEvents(entries: MetaPageEntry[]) {
  const supabase = createServiceRoleClient();

  for (const entry of entries) {
    console.log("[META-ADS-WEBHOOK] Page ID:", entry.id);

    for (const change of entry.changes || []) {
      if (change.field === "leadgen") {
        await handleLeadgenEvent(
          supabase,
          entry.id,
          change.value as LeadgenValue,
        );
      }
    }
  }
}

/**
 * Handle Leadgen Event
 * This is triggered when someone fills out a Lead Ad form
 */
async function handleLeadgenEvent(
  supabase: ReturnType<typeof createServiceRoleClient>,
  adAccountOrPageId: string,
  value: LeadgenValue,
) {
  console.log("[META-ADS-WEBHOOK] 📝 Processing leadgen event");
  console.log("  Leadgen ID:", value.leadgen_id);
  console.log("  Form ID:", value.form_id);
  console.log("  Page ID:", value.page_id);
  console.log("  Ad ID:", value.ad_id);
  console.log("  Created:", value.created_time);

  // Find client by ad account ID or page ID
  let client: { id: string; name: string } | null = null;

  // Try ad account first
  const { data: clientByAd } = await supabase
    .from("clients")
    .select("id, name")
    .eq("meta_ad_account_id", adAccountOrPageId)
    .single();

  if (clientByAd) {
    client = clientByAd;
  } else {
    // Try page ID
    const { data: clientByPage } = await supabase
      .from("clients")
      .select("id, name")
      .eq("meta_page_id", value.page_id)
      .single();

    if (clientByPage) {
      client = clientByPage;
    }
  }

  if (!client) {
    console.log(
      "[META-ADS-WEBHOOK] ⚠️ No client found for ad account/page:",
      adAccountOrPageId,
    );

    // Log to lead_ads_events for manual processing
    // Note: Using 'as any' because lead_ads_events is not yet in generated types
    await (supabase as any).from("lead_ads_events").insert({
      client_id: process.env.DEFAULT_CLIENT_ID,
      leadgen_id: value.leadgen_id,
      form_id: value.form_id,
      ad_id: value.ad_id,
      page_id: value.page_id,
      lead_data: value,
      processed: false,
      error_message: `No client found for account ${adAccountOrPageId}`,
    });

    return;
  }

  console.log("[META-ADS-WEBHOOK] ✅ Found client:", client.name);

  try {
    // Get access token for this client
    const clientConfig = await getClientConfig(client.id);
    const accessToken = clientConfig?.apiKeys?.metaAccessToken;

    if (!accessToken) {
      console.log("[META-ADS-WEBHOOK] ⚠️ No access token for client");
      await logLeadEvent(supabase, client.id, value, false, "No access token");
      return;
    }

    // Fetch full lead details from Meta API
    const leadData = await fetchLeadDetails(value.leadgen_id, accessToken);

    if (!leadData) {
      console.log("[META-ADS-WEBHOOK] ⚠️ Could not fetch lead details");
      await logLeadEvent(
        supabase,
        client.id,
        value,
        false,
        "Failed to fetch lead details",
      );
      return;
    }

    // Parse lead data
    const parsedLead = parseLeadData(leadData);
    console.log("[META-ADS-WEBHOOK] Parsed lead:", {
      phone: parsedLead.phone,
      email: parsedLead.email,
      name: parsedLead.full_name,
    });

    // Create CRM card
    const result = await createCardFromLead(client.id, parsedLead);

    if (result.success) {
      console.log("[META-ADS-WEBHOOK] ✅ Card created:", result.cardId);

      // Log success
      await (supabase as any).from("lead_ads_events").insert({
        client_id: client.id,
        leadgen_id: value.leadgen_id,
        form_id: value.form_id,
        ad_id: value.ad_id,
        campaign_id: parsedLead.campaign_id,
        page_id: value.page_id,
        phone: parsedLead.phone,
        email: parsedLead.email,
        full_name: parsedLead.full_name,
        lead_data: parsedLead.custom_fields,
        card_id: result.cardId,
        processed: true,
        processed_at: new Date().toISOString(),
      });
    } else {
      console.log("[META-ADS-WEBHOOK] ⚠️ Failed to create card:", result.error);
      await logLeadEvent(supabase, client.id, value, false, result.error);
    }
  } catch (error) {
    console.error("[META-ADS-WEBHOOK] Error processing lead:", error);
    await logLeadEvent(
      supabase,
      client.id,
      value,
      false,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}

/**
 * Log lead event to database
 */
async function logLeadEvent(
  supabase: ReturnType<typeof createServiceRoleClient>,
  clientId: string,
  value: LeadgenValue,
  processed: boolean,
  errorMessage?: string,
) {
  // Note: Using 'as any' because lead_ads_events is not yet in generated types
  await (supabase as any).from("lead_ads_events").insert({
    client_id: clientId,
    leadgen_id: value.leadgen_id,
    form_id: value.form_id,
    ad_id: value.ad_id,
    page_id: value.page_id,
    lead_data: value,
    processed,
    error_message: errorMessage,
  });
}

/**
 * Handle Campaign Event
 * Triggered when campaign status changes
 */
async function handleCampaignEvent(
  supabase: ReturnType<typeof createServiceRoleClient>,
  adAccountId: string,
  value: CampaignChangeValue,
) {
  console.log("[META-ADS-WEBHOOK] 📊 Processing campaign event");
  console.log("  Campaign ID:", value.campaign_id);
  console.log("  Action:", value.action);

  // Could update a local campaigns cache or trigger alerts
  // For now, just log
}

// ============================================================================
// Type Definitions
// ============================================================================

interface MetaAdAccountEntry {
  id: string; // Ad Account ID
  time: number;
  changes?: Array<{
    field: string;
    value: unknown;
  }>;
}

interface MetaPageEntry {
  id: string; // Page ID
  time: number;
  changes?: Array<{
    field: string;
    value: unknown;
  }>;
}

interface LeadgenValue {
  leadgen_id: string;
  page_id: string;
  form_id: string;
  ad_id?: string;
  adgroup_id?: string;
  created_time: number;
}

interface CampaignChangeValue {
  campaign_id: string;
  action: "created" | "updated" | "deleted";
}

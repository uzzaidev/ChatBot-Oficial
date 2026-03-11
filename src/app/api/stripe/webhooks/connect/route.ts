// @stripe-module
// Este arquivo pertence ao modulo de pagamentos Stripe.
// Para extrair para repositorio proprio, copiar:
//   src/lib/stripe.ts, src/lib/stripe-connect.ts
//   src/app/api/stripe/
//   src/app/dashboard/payments/
//   src/app/store/
//   src/components/Stripe*.tsx, ProductCard.tsx, ProductForm.tsx, SubscriptionsList.tsx

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import {
  getStripeClient,
  getRequiredStripeWebhookSecret,
  parseConnectEventNotification,
} from "@/lib/stripe";
import { syncAccountFromStripe } from "@/lib/stripe-connect";

export const dynamic = "force-dynamic";

const WEBHOOK_SCOPE = "v2_connect";
const UNIQUE_VIOLATION_CODE = "23505";

const getSupabase = () => createServiceClient() as any;
const logPrefix = "[stripe:webhooks:connect]";

const logInfo = (message: string, context?: Record<string, unknown>) => {
  if (context) {
    console.info(`${logPrefix} ${message}`, context);
    return;
  }
  console.info(`${logPrefix} ${message}`);
};

const logWarn = (message: string, context?: Record<string, unknown>) => {
  if (context) {
    console.warn(`${logPrefix} ${message}`, context);
    return;
  }
  console.warn(`${logPrefix} ${message}`);
};

const logError = (message: string, context?: Record<string, unknown>) => {
  if (context) {
    console.error(`${logPrefix} ${message}`, context);
    return;
  }
  console.error(`${logPrefix} ${message}`);
};

const isWebhookEventAlreadyProcessed = async (eventId: string) => {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("webhook_events")
    .select("id")
    .eq("stripe_event_id", eventId)
    .maybeSingle();

  return Boolean(data?.id);
};

const createWebhookEventRecord = async (eventId: string, eventType: string) => {
  const supabase = getSupabase();
  const { error } = await supabase.from("webhook_events").insert({
    stripe_event_id: eventId,
    event_scope: WEBHOOK_SCOPE,
    event_type: eventType,
    status: "processing",
  });

  if (!error) return true;
  if (error.code === UNIQUE_VIOLATION_CODE) return false;
  throw error;
};

const markWebhookEventDone = async (eventId: string) => {
  const supabase = getSupabase();
  await supabase
    .from("webhook_events")
    .update({
      status: "processed",
      processed_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("stripe_event_id", eventId);
};

const markWebhookEventFailed = async (eventId: string, message: string) => {
  const supabase = getSupabase();
  await supabase
    .from("webhook_events")
    .update({
      status: "failed",
      error_message: message.slice(0, 1000),
      processed_at: new Date().toISOString(),
    })
    .eq("stripe_event_id", eventId);
};

const getAccountIdFromEvent = (event: any): string | null => {
  if (typeof event?.data?.account_id === "string") return event.data.account_id;
  if (typeof event?.related_object?.id === "string") return event.related_object.id;
  if (typeof event?.account === "string") return event.account;
  return null;
};

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const rawBody = await request.text();
  const webhookSecret = getRequiredStripeWebhookSecret("STRIPE_CONNECT_WEBHOOK_SECRET");

  let notification: any;
  try {
    // Usa parser thin-event atual do SDK com fallback de compatibilidade.
    notification = parseConnectEventNotification(rawBody, signature, webhookSecret);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Invalid Stripe Connect webhook signature",
        details: error?.message ?? "signature_verification_failed",
      },
      { status: 400 }
    );
  }

  const eventId: string = notification?.id;
  if (!eventId) {
    return NextResponse.json(
      { error: "Connect event notification is missing id" },
      { status: 400 }
    );
  }

  try {
    if (await isWebhookEventAlreadyProcessed(eventId)) {
      logInfo("Duplicate event ignored", { eventId });
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Thin event nao carrega payload completo. Faz fetch do evento completo.
    const event =
      typeof notification.fetchEvent === "function"
        ? await notification.fetchEvent()
        : await (getStripeClient().v2.core.events as any).retrieve(eventId);

    const created = await createWebhookEventRecord(eventId, event.type);
    if (!created) {
      logInfo("Duplicate event ignored after insert race", { eventId, eventType: event.type });
      return NextResponse.json({ received: true, duplicate: true });
    }

    logInfo("Processing event", {
      eventId,
      eventType: event.type,
      livemode: Boolean(event?.livemode),
    });

    const isRequirementsUpdate = event.type === "v2.core.account[requirements].updated";
    const isCapabilityUpdate = event.type.endsWith(".capability_status_updated");
    if (isRequirementsUpdate || isCapabilityUpdate) {
      const stripeAccountId = getAccountIdFromEvent(event);
      if (!stripeAccountId) {
        logWarn("Event did not provide account id", { eventId, eventType: event.type });
      } else {
        await syncAccountFromStripe(stripeAccountId);
        logInfo("Connected account synced", { eventId, stripeAccountId });
      }
    }

    await markWebhookEventDone(eventId);
    return NextResponse.json({ received: true });
  } catch (error: any) {
    await markWebhookEventFailed(eventId, error?.message ?? "webhook_processing_failed");
    logError("Webhook processing failed", {
      eventId,
      error: error?.message ?? "unknown_error",
    });

    // Sempre 200 apos registrar falha para evitar retries agressivos.
    return NextResponse.json({
      received: true,
      failed: true,
      error: error?.message ?? "unknown_error",
    });
  }
}

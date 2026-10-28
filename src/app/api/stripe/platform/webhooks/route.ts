import {
  resolveClientIdByStripeCustomer,
  syncPlatformSubscription,
} from "@/lib/platform-subscription-sync";
import { constructWebhookEvent } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

const WEBHOOK_SCOPE = "v1_platform";
const UNIQUE_VIOLATION_CODE = "23505";
const logPrefix = "[stripe:webhooks:platform]";

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

const getWebhookSecret = (): string => {
  const secret =
    process.env.STRIPE_PLATFORM_WEBHOOK_SECRET ??
    process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || secret.includes("whsec_...")) {
    throw new Error(
      "Missing webhook secret. Set STRIPE_PLATFORM_WEBHOOK_SECRET (or STRIPE_WEBHOOK_SECRET).",
    );
  }
  return secret;
};

const getSupabase = () => createServiceClient() as any;

/**
 * Claims the event for processing. Returns false for duplicates.
 * An event whose previous attempt failed is reclaimed, so Stripe's retry is
 * processed instead of being dropped as a duplicate.
 */
const claimWebhookEvent = async (eventId: string, eventType: string) => {
  const supabase = getSupabase();
  const { error } = await supabase.from("webhook_events").insert({
    stripe_event_id: eventId,
    event_scope: WEBHOOK_SCOPE,
    event_type: eventType,
    status: "processing",
  });

  if (!error) return true;
  if (error.code !== UNIQUE_VIOLATION_CODE) throw error;

  const { data, error: reclaimError } = await supabase
    .from("webhook_events")
    .update({ status: "processing", error_message: null })
    .eq("stripe_event_id", eventId)
    .eq("status", "failed")
    .select("id");
  if (reclaimError) throw reclaimError;
  return Boolean(data?.length);
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

const upsertInvoiceHistory = async (invoice: Stripe.Invoice) => {
  const stripeCustomerId =
    typeof invoice.customer === "string" ? invoice.customer : null;
  const clientId = await resolveClientIdByStripeCustomer(stripeCustomerId);
  if (!clientId) {
    logWarn("Could not map platform invoice to client", {
      invoiceId: invoice.id,
      stripeCustomerId,
    });
    return;
  }

  const supabase = getSupabase();
  const { data: platformSubscription } = await supabase
    .from("platform_client_subscriptions")
    .select("id")
    .eq("client_id", clientId)
    .maybeSingle();

  const paidAt = invoice.status_transitions?.paid_at
    ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
    : null;

  const periodStart = (invoice as any).period_start
    ? new Date((invoice as any).period_start * 1000).toISOString()
    : null;
  const periodEnd = (invoice as any).period_end
    ? new Date((invoice as any).period_end * 1000).toISOString()
    : null;

  const invoicePaymentIntent = invoice.payments?.data?.find(
    (payment) => payment.payment?.type === "payment_intent",
  )?.payment?.payment_intent;
  const stripePaymentIntentId =
    typeof invoicePaymentIntent === "string"
      ? invoicePaymentIntent
      : invoicePaymentIntent?.id ?? null;

  const history = await supabase.from("platform_payment_history").upsert(
    {
      client_id: clientId,
      platform_subscription_id: platformSubscription?.id ?? null,
      stripe_invoice_id: invoice.id,
      stripe_payment_intent_id: stripePaymentIntentId,
      amount: invoice.amount_paid ?? invoice.amount_due ?? 0,
      currency: invoice.currency ?? "brl",
      status: invoice.status ?? "open",
      period_start: periodStart,
      period_end: periodEnd,
      paid_at: paidAt,
      invoice_url: invoice.hosted_invoice_url ?? null,
      invoice_pdf: invoice.invoice_pdf ?? null,
      metadata: invoice.metadata ?? {},
    },
    { onConflict: "stripe_invoice_id" },
  );
  if (history.error) throw new Error(`platform_payment_history upsert: ${history.error.message}`);

  const { error: lastPaymentError } = await supabase
    .from("platform_client_subscriptions")
    .update({
      last_payment_at: paidAt,
      last_payment_amount: invoice.amount_paid ?? invoice.amount_due ?? 0,
      last_payment_status: invoice.status ?? "unknown",
      updated_at: new Date().toISOString(),
    })
    .eq("client_id", clientId);
  if (lastPaymentError) throw new Error(`last payment update: ${lastPaymentError.message}`);
  // Subscription/plan status comes only from syncPlatformSubscription
};

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  const rawBody = await request.text();

  let webhookSecret: string;
  try {
    webhookSecret = getWebhookSecret();
  } catch (error: any) {
    logError("Webhook secret not configured", {
      error: error?.message ?? "missing_env",
    });
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(rawBody, signature, webhookSecret);
  } catch (error: any) {
    logError("Signature verification failed", {
      error: error?.message ?? "signature_verification_failed",
    });
    return NextResponse.json(
      {
        error: "Invalid Stripe webhook signature",
        details: error?.message ?? "signature_verification_failed",
      },
      { status: 400 },
    );
  }

  try {
    if (!(await claimWebhookEvent(event.id, event.type))) {
      logInfo("Duplicate event ignored", {
        eventId: event.id,
        eventType: event.type,
      });
      return NextResponse.json({ received: true, duplicate: true });
    }

    logInfo("Processing event", {
      eventId: event.id,
      eventType: event.type,
      livemode: Boolean(event.livemode),
    });

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed":
      case "customer.subscription.trial_will_end":
        await syncPlatformSubscription(
          (event.data.object as Stripe.Subscription).id,
        );
        break;

      case "invoice.payment_succeeded":
      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await upsertInvoiceHistory(invoice);
        // `parent` exists from API 2025-03-31 on; older endpoint versions send
        // `invoice.subscription` instead (payload shape follows the endpoint)
        const rawSubscription =
          invoice.parent?.subscription_details?.subscription ??
          (invoice as any).subscription ??
          null;
        const invoiceSubscriptionId: string | null =
          typeof rawSubscription === "string"
            ? rawSubscription
            : rawSubscription?.id ?? null;
        if (invoiceSubscriptionId) {
          await syncPlatformSubscription(invoiceSubscriptionId);
        }
        break;
      }

      default:
        break;
    }

    await markWebhookEventDone(event.id);
    logInfo("Event processed", { eventId: event.id, eventType: event.type });
    return NextResponse.json({ received: true });
  } catch (error: any) {
    await markWebhookEventFailed(
      event.id,
      error?.message ?? "webhook_processing_failed",
    );
    logError("Webhook processing failed", {
      eventId: event.id,
      eventType: event.type,
      error: error?.message ?? "unknown_error",
    });

    // 500 so Stripe retries (with backoff, up to 3 days). Returning 200 here
    // lost payments: the event was never retried and the plan stayed blocked.
    return NextResponse.json(
      { received: false, error: error?.message ?? "unknown_error" },
      { status: 500 },
    );
  }
}

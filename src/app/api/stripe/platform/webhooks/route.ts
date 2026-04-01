import {
  mapStripeSubscriptionStatus,
  toClientPlanStatus,
} from "@/lib/admin-helpers";
import {
  clearGracePeriod,
  enforceNonPayment,
  startGracePeriod,
} from "@/lib/billing-lifecycle";
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

const unixToIso = (value?: number | null): string | null => {
  if (!value || !Number.isFinite(value)) return null;
  return new Date(value * 1000).toISOString();
};

const getSupabase = () => createServiceClient() as any;

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

const resolveClientIdByStripeCustomer = async (
  stripeCustomerId?: string | null,
): Promise<string | null> => {
  if (!stripeCustomerId) return null;

  const supabase = getSupabase();
  const { data } = await supabase
    .from("platform_client_subscriptions")
    .select("client_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  return data?.client_id ?? null;
};

const resolveClientIdFromSubscription = async (
  subscription: Stripe.Subscription,
): Promise<string | null> => {
  if (subscription.metadata?.client_id) {
    return subscription.metadata.client_id;
  }

  const stripeCustomerId =
    typeof subscription.customer === "string" ? subscription.customer : null;
  return resolveClientIdByStripeCustomer(stripeCustomerId);
};

const upsertPlatformSubscription = async (
  subscription: Stripe.Subscription,
  forcedStatus?: string,
) => {
  const clientId = await resolveClientIdFromSubscription(subscription);
  if (!clientId) {
    logWarn("Could not map platform subscription to client", {
      subscriptionId: subscription.id,
      customer:
        typeof subscription.customer === "string"
          ? subscription.customer
          : null,
    });
    return;
  }

  const supabase = getSupabase();
  const stripeCustomerId =
    typeof subscription.customer === "string" ? subscription.customer : "";
  const firstItem = subscription.items.data[0];
  const currentPeriodStart = firstItem?.current_period_start ?? null;
  const currentPeriodEnd = firstItem?.current_period_end ?? null;
  const normalizedStatus = mapStripeSubscriptionStatus(
    forcedStatus ?? subscription.status,
  );
  const clientPlanStatus = toClientPlanStatus(
    forcedStatus ?? subscription.status,
  );

  await supabase.from("platform_client_subscriptions").upsert(
    {
      client_id: clientId,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: firstItem?.price?.id ?? null,
      plan_name: "pro",
      plan_amount: firstItem?.price?.unit_amount ?? 24900,
      plan_currency:
        firstItem?.price?.currency ?? subscription.currency ?? "brl",
      plan_interval: firstItem?.price?.recurring?.interval ?? "month",
      status: normalizedStatus,
      trial_start: unixToIso(subscription.trial_start),
      trial_end: unixToIso(subscription.trial_end),
      current_period_start: unixToIso(currentPeriodStart),
      current_period_end: unixToIso(currentPeriodEnd),
      cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
      canceled_at: unixToIso(subscription.canceled_at),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "client_id" },
  );

  await supabase
    .from("clients")
    .update({
      plan_name: "pro",
      plan_status: clientPlanStatus,
      trial_ends_at: unixToIso(subscription.trial_end),
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientId);
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

  await supabase.from("platform_payment_history").upsert(
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

  await supabase
    .from("platform_client_subscriptions")
    .update({
      last_payment_at: paidAt,
      last_payment_amount: invoice.amount_paid ?? invoice.amount_due ?? 0,
      last_payment_status: invoice.status ?? "unknown",
      status:
        invoice.status === "paid"
          ? "active"
          : invoice.status === "open"
          ? "past_due"
          : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("client_id", clientId);

  await supabase
    .from("clients")
    .update({
      plan_status: invoice.status === "paid" ? "active" : "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientId);
};

const setClientPlanStatusByCustomer = async (
  stripeCustomerId: string | null,
  status: "active" | "past_due" | "canceled",
) => {
  const clientId = await resolveClientIdByStripeCustomer(stripeCustomerId);
  if (!clientId) {
    logWarn("Could not map customer to client for plan status update", {
      stripeCustomerId,
      status,
    });
    return;
  }

  const supabase = getSupabase();
  await supabase
    .from("platform_client_subscriptions")
    .update({
      status,
      updated_at: new Date().toISOString(),
      canceled_at: status === "canceled" ? new Date().toISOString() : null,
    })
    .eq("client_id", clientId);

  await supabase
    .from("clients")
    .update({
      plan_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientId);
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
  const webhookSecret = getWebhookSecret();

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(rawBody, signature, webhookSecret);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Invalid Stripe webhook signature",
        details: error?.message ?? "signature_verification_failed",
      },
      { status: 400 },
    );
  }

  try {
    if (await isWebhookEventAlreadyProcessed(event.id)) {
      logInfo("Duplicate event ignored", { eventId: event.id });
      return NextResponse.json({ received: true, duplicate: true });
    }

    const created = await createWebhookEventRecord(event.id, event.type);
    if (!created) {
      logInfo("Duplicate event ignored after insert race", {
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
      case "customer.subscription.resumed":
      case "customer.subscription.trial_will_end":
        await upsertPlatformSubscription(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await upsertPlatformSubscription(sub);

        // If subscription went past_due, start grace period
        if (sub.status === "past_due") {
          const cId = await resolveClientIdFromSubscription(sub);
          if (cId) await startGracePeriod(cId, 7);
        }
        // If subscription is back to active, clear grace period
        if (sub.status === "active") {
          const cId = await resolveClientIdFromSubscription(sub);
          if (cId) await clearGracePeriod(cId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const deletedSub = event.data.object as Stripe.Subscription;
        await upsertPlatformSubscription(deletedSub, "canceled");

        // Enforce non-payment: suspend + disconnect WhatsApp
        const clientIdForDelete = await resolveClientIdFromSubscription(
          deletedSub,
        );
        if (clientIdForDelete) {
          await enforceNonPayment(clientIdForDelete);
          logInfo("Client WhatsApp disconnected after subscription deletion", {
            clientId: clientIdForDelete,
          });
        }
        break;
      }

      // Cobertura para nomenclaturas diferentes de eventos de invoice.
      case "invoice.payment_succeeded":
      case "invoice.paid": {
        const paidInvoice = event.data.object as Stripe.Invoice;
        await upsertInvoiceHistory(paidInvoice);
        // Payment succeeded → clear grace period
        const paidCustomer =
          typeof paidInvoice.customer === "string"
            ? paidInvoice.customer
            : null;
        const paidClientId = await resolveClientIdByStripeCustomer(
          paidCustomer,
        );
        if (paidClientId) await clearGracePeriod(paidClientId);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await upsertInvoiceHistory(invoice);
        const failedCustomer =
          typeof invoice.customer === "string" ? invoice.customer : null;
        await setClientPlanStatusByCustomer(failedCustomer, "past_due");
        // Start 7-day grace period
        const failedClientId = await resolveClientIdByStripeCustomer(
          failedCustomer,
        );
        if (failedClientId) await startGracePeriod(failedClientId, 7);
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

    // Mantem 200 para evitar retries agressivos em erros nao transitivos.
    return NextResponse.json({
      received: true,
      failed: true,
      error: error?.message ?? "unknown_error",
    });
  }
}

// @stripe-module
// Este arquivo pertence ao modulo de pagamentos Stripe.
// Para extrair para repositorio proprio, copiar:
//   src/lib/stripe.ts, src/lib/stripe-connect.ts
//   src/app/api/stripe/
//   src/app/dashboard/payments/
//   src/app/store/
//   src/components/Stripe*.tsx, ProductCard.tsx, ProductForm.tsx, SubscriptionsList.tsx

import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { emitCrmAutomationEvent } from "@/lib/crm-automation-engine";
import { createServiceClient } from "@/lib/supabase-server";
import {
  constructWebhookEvent,
  getRequiredStripeWebhookSecret,
  getStripeClient,
} from "@/lib/stripe";

export const dynamic = "force-dynamic";

const WEBHOOK_SCOPE = "v1";
const UNIQUE_VIOLATION_CODE = "23505";

const getSupabase = () => createServiceClient() as any;
const logPrefix = "[stripe:webhooks:v1]";

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

const unixToIso = (value?: number | null): string | null => {
  if (!value || !Number.isFinite(value)) return null;
  return new Date(value * 1000).toISOString();
};

const findClientByStripeAccount = async (
  stripeAccountId: string | null | undefined
): Promise<string | null> => {
  if (!stripeAccountId) return null;
  const supabase = getSupabase();

  const { data } = await supabase
    .from("stripe_accounts")
    .select("client_id")
    .eq("stripe_account_id", stripeAccountId)
    .single();

  return data?.client_id ?? null;
};

const getProductIdByPrice = async (
  clientId: string,
  stripePriceId: string | null | undefined
) => {
  if (!stripePriceId) return null;
  const supabase = getSupabase();
  const { data } = await supabase
    .from("stripe_products")
    .select("id")
    .eq("client_id", clientId)
    .eq("stripe_price_id", stripePriceId)
    .single();

  return data?.id ?? null;
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

const resolveSubscriptionAccountId = (
  subscription: Stripe.Subscription | any,
  fallbackAccountId?: string | null
): string | null => {
  const accountFromObject = subscription?.customer_account ?? null;
  if (accountFromObject) return accountFromObject;

  if (fallbackAccountId) return fallbackAccountId;

  const customer = subscription?.customer;
  if (typeof customer === "string" && customer.startsWith("acct_")) {
    return customer;
  }

  return null;
};

const upsertSubscription = async (
  subscription: Stripe.Subscription | any,
  stripeAccountIdFallback?: string | null
) => {
  const stripeAccountId = resolveSubscriptionAccountId(
    subscription,
    stripeAccountIdFallback
  );

  const clientId = await findClientByStripeAccount(stripeAccountId);
  if (!clientId) {
    logWarn("Could not map subscription to client", {
      subscriptionId: subscription?.id,
      stripeAccountId,
    });
    return;
  }

  const stripePriceId =
    subscription?.items?.data?.[0]?.price?.id ?? "unknown_price";
  const productId = await getProductIdByPrice(clientId, stripePriceId);
  const stripeCustomerId =
    subscription?.customer_account ??
    (typeof subscription?.customer === "string" ? subscription.customer : null) ??
    "unknown_customer";

  const supabase = getSupabase();
  await supabase.from("stripe_subscriptions").upsert(
    {
      client_id: clientId,
      stripe_account_id: stripeAccountId ?? stripeCustomerId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: stripeCustomerId,
      stripe_price_id: stripePriceId,
      product_id: productId,
      status: subscription.status ?? "unknown",
      customer_email: subscription?.customer_email ?? null,
      customer_name: subscription?.customer_name ?? null,
      customer_phone: subscription?.customer_phone ?? null,
      current_period_start: unixToIso(subscription?.current_period_start),
      current_period_end: unixToIso(subscription?.current_period_end),
      cancel_at_period_end: Boolean(subscription?.cancel_at_period_end),
      canceled_at: unixToIso(subscription?.canceled_at),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" }
  );
};

const upsertOrderFromCheckout = async (
  session: Stripe.Checkout.Session,
  stripeAccountIdFallback?: string | null
) => {
  if (session.mode !== "payment") return;

  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;
  if (!paymentIntentId) return;

  const stripeAccountId =
    stripeAccountIdFallback ??
    ((session as any).customer_account as string | null) ??
    null;

  const clientId = await findClientByStripeAccount(stripeAccountId);
  if (!clientId) {
    logWarn("Could not map checkout session to client", {
      sessionId: session.id,
      stripeAccountId,
    });
    return;
  }

  let applicationFeeAmount: number | null = null;
  try {
    const stripeClient = getStripeClient();
    const paymentIntent = await stripeClient.paymentIntents.retrieve(
      paymentIntentId,
      {},
      stripeAccountId ? { stripeAccount: stripeAccountId } : undefined
    );
    applicationFeeAmount = (paymentIntent as any).application_fee_amount ?? null;
  } catch {
    // Sem bloqueio: se nao conseguir buscar PaymentIntent, ainda registramos o pedido.
  }

  const productIdFromMetadata =
    typeof session.metadata?.local_product_id === "string"
      ? session.metadata.local_product_id
      : null;
  const stripePriceId =
    typeof session.metadata?.stripe_price_id === "string"
      ? session.metadata.stripe_price_id
      : null;
  const productId =
    productIdFromMetadata ?? (await getProductIdByPrice(clientId, stripePriceId));

  const supabase = getSupabase();
  await supabase.from("stripe_orders").upsert(
    {
      client_id: clientId,
      stripe_account_id: stripeAccountId ?? "unknown_account",
      stripe_payment_intent_id: paymentIntentId,
      stripe_session_id: session.id,
      product_id: productId,
      status: session.payment_status ?? "pending",
      amount: session.amount_total ?? 0,
      application_fee_amount: applicationFeeAmount,
      currency: session.currency ?? "usd",
      customer_email: session.customer_details?.email ?? null,
      customer_name: session.customer_details?.name ?? null,
      customer_phone: session.customer_details?.phone ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_payment_intent_id" }
  );
};

const handleCheckoutCompleted = async (
  session: Stripe.Checkout.Session,
  eventAccount?: string | null
) => {
  await upsertOrderFromCheckout(session, eventAccount);

  if (session.mode === "subscription" && session.subscription) {
    const stripeClient = getStripeClient();
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription.id;

    const subscription = await stripeClient.subscriptions.retrieve(
      subscriptionId,
      {},
      eventAccount ? { stripeAccount: eventAccount } : undefined
    );
    await upsertSubscription(subscription, eventAccount);
  }

  const stripeAccountId =
    eventAccount ?? ((session as any).customer_account as string | null) ?? null;
  const clientId = await findClientByStripeAccount(stripeAccountId);
  if (!clientId) {
    logWarn("Skipping payment_completed automation: client not resolved", {
      sessionId: session.id,
      stripeAccountId,
    });
    return;
  }

  const cardId = await resolveCheckoutCardId(clientId, session);
  if (!cardId) {
    logWarn("Skipping payment_completed automation: card not resolved", {
      sessionId: session.id,
      clientId,
      hasCardMetadata: Boolean(session.metadata?.card_id),
      hasPhoneMetadata: Boolean(session.metadata?.phone || session.customer_details?.phone),
    });
    return;
  }

  let productName = "Produto";
  if (typeof session.metadata?.local_product_id === "string") {
    const supabase = getSupabase();
    const { data: product } = await supabase
      .from("stripe_products")
      .select("name")
      .eq("id", session.metadata.local_product_id)
      .eq("client_id", clientId)
      .maybeSingle();
    if (product?.name) {
      productName = product.name;
    }
  }

  await emitCrmAutomationEvent({
    clientId,
    cardId,
    triggerType: "payment_completed",
    dedupeKey: `payment_completed:${session.id}:${String(session.payment_intent ?? "na")}`,
    triggerData: {
      amount: session.amount_total ?? 0,
      amount_formatted: formatAmount(session.amount_total, session.currency),
      currency: (session.currency || "BRL").toUpperCase(),
      stripe_session_id: session.id,
      stripe_payment_intent_id:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null,
      customer_email: session.customer_details?.email ?? null,
      customer_phone:
        normalizePhone(session.customer_details?.phone) ??
        normalizePhone(session.metadata?.phone ?? null),
      product_name: productName,
      payment_date: new Date().toISOString(),
    },
  });
};

const handleSubscriptionUpdated = async (
  subscription: Stripe.Subscription,
  eventAccount?: string | null
) => {
  await upsertSubscription(subscription, eventAccount);
};

const handleSubscriptionDeleted = async (
  subscription: Stripe.Subscription,
  eventAccount?: string | null
) => {
  await upsertSubscription(
    {
      ...subscription,
      status: "canceled",
    } as any,
    eventAccount
  );
};

const updateSubscriptionStatusFromInvoice = async (
  invoice: Stripe.Invoice,
  nextStatus: string
) => {
  const subscriptionRef =
    (invoice as any).subscription ??
    (invoice as any).parent?.subscription_details?.subscription;
  const subscriptionId =
    typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id ?? null;
  if (!subscriptionId) return;

  const stripeAccountId =
    (invoice as any).customer_account ??
    (typeof invoice.customer === "string" && invoice.customer.startsWith("acct_")
      ? invoice.customer
      : null);

  const clientId = await findClientByStripeAccount(stripeAccountId);
  if (!clientId) {
    logWarn("Could not map invoice to client", {
      invoiceId: invoice.id,
      stripeAccountId,
      nextStatus,
    });
    return;
  }

  const supabase = getSupabase();
  await supabase
    .from("stripe_subscriptions")
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("client_id", clientId)
    .eq("stripe_subscription_id", subscriptionId);
};

const normalizePhone = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
};

const resolveCheckoutCardId = async (
  clientId: string,
  session: Stripe.Checkout.Session,
): Promise<string | null> => {
  if (typeof session.metadata?.card_id === "string" && session.metadata.card_id) {
    return session.metadata.card_id;
  }

  const phonesToTry = [
    normalizePhone(session.metadata?.phone ?? null),
    normalizePhone(session.customer_details?.phone ?? null),
  ].filter((item): item is string => Boolean(item));

  if (phonesToTry.length === 0) {
    return null;
  }

  const supabase = getSupabase();
  for (const phone of phonesToTry) {
    const { data } = await supabase
      .from("crm_cards")
      .select("id")
      .eq("client_id", clientId)
      .eq("phone", phone)
      .limit(1)
      .maybeSingle();

    if (data?.id) {
      return data.id;
    }
  }

  return null;
};

const formatAmount = (amountCents: number | null, currency: string | null): string => {
  const safeAmount = typeof amountCents === "number" ? amountCents : 0;
  const safeCurrency = (currency || "BRL").toUpperCase();
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: safeCurrency,
    }).format(safeAmount / 100);
  } catch {
    return `${(safeAmount / 100).toFixed(2)} ${safeCurrency}`;
  }
};

const handleInvoicePaid = async (invoice: Stripe.Invoice) => {
  await updateSubscriptionStatusFromInvoice(invoice, "active");
};

const handleInvoicePaymentFailed = async (invoice: Stripe.Invoice) => {
  await updateSubscriptionStatusFromInvoice(invoice, "past_due");
};

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const rawBody = await request.text();
  const webhookSecret = getRequiredStripeWebhookSecret("STRIPE_WEBHOOK_SECRET");

  let event: Stripe.Event;
  try {
    // Corpo RAW e obrigatorio. Nao usar request.json() antes desta linha.
    event = constructWebhookEvent(rawBody, signature, webhookSecret);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Invalid Stripe webhook signature",
        details: error?.message ?? "signature_verification_failed",
      },
      { status: 400 }
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

    const eventAccount =
      typeof (event as any).account === "string" ? (event as any).account : null;
    logInfo("Processing event", {
      eventId: event.id,
      eventType: event.type,
      eventAccount,
      livemode: Boolean(event.livemode),
    });

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
          eventAccount
        );
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
          eventAccount
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
          eventAccount
        );
        break;

      case "invoice.paid":
      case "invoice.payment_succeeded":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      // Eventos de billing profile/portal/pagamento solicitados no escopo.
      case "payment_method.attached":
      case "payment_method.detached":
      case "customer.updated":
      case "customer.tax_id.created":
      case "customer.tax_id.deleted":
      case "customer.tax_id.updated":
      case "billing_portal.configuration.created":
      case "billing_portal.configuration.updated":
      case "billing_portal.session.created":
        break;

      default:
        break;
    }

    await markWebhookEventDone(event.id);
    logInfo("Event processed", { eventId: event.id, eventType: event.type });
    return NextResponse.json({ received: true });
  } catch (error: any) {
    await markWebhookEventFailed(event.id, error?.message ?? "webhook_processing_failed");
    logError("Webhook processing failed", {
      eventId: event.id,
      eventType: event.type,
      error: error?.message ?? "unknown_error",
    });

    // Sempre retorna 200 apos registrar falha para evitar retries agressivos.
    return NextResponse.json({
      received: true,
      failed: true,
      error: error?.message ?? "unknown_error",
    });
  }
}

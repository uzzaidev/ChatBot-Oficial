/**
 * Platform (UzzApp) subscription sync with Stripe.
 *
 * Stripe does not guarantee webhook ordering, so we never trust event payloads
 * for subscription state: every webhook and the daily reconciliation cron call
 * syncPlatformSubscription(), which re-fetches the subscription from Stripe.
 */

import {
  mapStripeSubscriptionStatus,
  toClientPlanStatus,
} from "@/lib/admin-helpers";
import {
  clearGracePeriod,
  enforceNonPayment,
  startGracePeriod,
} from "@/lib/billing-lifecycle";
import { getStripeClient } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase-server";
import Stripe from "stripe";

const unixToIso = (value?: number | null): string | null => {
  if (!value || !Number.isFinite(value)) return null;
  return new Date(value * 1000).toISOString();
};

const getSupabase = () => createServiceClient() as any;

export const resolveClientIdByStripeCustomer = async (
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

const customerIdOf = (subscription: Stripe.Subscription): string | null =>
  typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer?.id ?? null;

const resolveClientIdFromSubscription = async (
  subscription: Stripe.Subscription,
): Promise<string | null> => {
  if (subscription.metadata?.client_id) {
    return subscription.metadata.client_id;
  }

  const fromRow = await resolveClientIdByStripeCustomer(customerIdOf(subscription));
  if (fromRow) return fromRow;

  // Checkout subscriptions carry no client_id metadata, but the customer does
  // (both checkout flows create it with metadata.client_id).
  const customer = subscription.customer;
  if (customer && typeof customer !== "string" && !("deleted" in customer && customer.deleted)) {
    return (customer as Stripe.Customer).metadata?.client_id ?? null;
  }
  return null;
};

// Supabase returns errors instead of throwing; a swallowed error here meant the
// webhook was marked processed and the payment never reached the database.
const check = ({ error }: { error: any }, what: string) => {
  if (error) throw new Error(`${what}: ${error.message ?? error}`);
};

export const upsertPlatformSubscription = async (
  subscription: Stripe.Subscription,
  forcedStatus?: string,
): Promise<string | null> => {
  const clientId = await resolveClientIdFromSubscription(subscription);
  if (!clientId) {
    console.warn("[platform-subscription-sync] Could not map platform subscription to client", {
      subscriptionId: subscription.id,
      customer: customerIdOf(subscription),
    });
    return null;
  }

  const supabase = getSupabase();
  const stripeCustomerId = customerIdOf(subscription);
  const firstItem = subscription.items.data[0];
  const currentPeriodStart = firstItem?.current_period_start ?? null;
  const currentPeriodEnd = firstItem?.current_period_end ?? null;
  const normalizedStatus = mapStripeSubscriptionStatus(
    forcedStatus ?? subscription.status,
  );
  const clientPlanStatus = toClientPlanStatus(
    forcedStatus ?? subscription.status,
  );

  const upserted = await supabase.from("platform_client_subscriptions").upsert(
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
  check(upserted, "platform_client_subscriptions upsert");

  check(
    await supabase
      .from("clients")
      .update({
        plan_name: "pro",
        plan_status: clientPlanStatus,
        trial_ends_at: unixToIso(subscription.trial_end),
        updated_at: new Date().toISOString(),
      })
      .eq("id", clientId),
    "clients plan update",
  );
  return clientId;
};

export const syncPlatformSubscription = async (
  subscriptionId: string,
): Promise<void> => {
  const subscription = await getStripeClient().subscriptions.retrieve(
    subscriptionId,
    { expand: ["customer"] },
  );
  const clientId = await upsertPlatformSubscription(subscription);
  if (!clientId) return;

  if (subscription.status === "past_due" || subscription.status === "unpaid") {
    // Start grace only once; re-syncs must not keep extending it
    const { data: client } = await getSupabase()
      .from("clients")
      .select("grace_period_ends_at")
      .eq("id", clientId)
      .maybeSingle();
    if (!client?.grace_period_ends_at) await startGracePeriod(clientId, 7);
  } else if (subscription.status === "active" || subscription.status === "trialing") {
    await clearGracePeriod(clientId);
    // Paid again after a billing suspension → restore routing
    await getSupabase()
      .from("clients")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", clientId)
      .eq("status", "suspended");
  } else if (
    subscription.status === "canceled" ||
    subscription.status === "incomplete_expired"
  ) {
    await enforceNonPayment(clientId);
  }
};

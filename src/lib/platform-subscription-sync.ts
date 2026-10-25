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

export const upsertPlatformSubscription = async (
  subscription: Stripe.Subscription,
  forcedStatus?: string,
) => {
  const clientId = await resolveClientIdFromSubscription(subscription);
  if (!clientId) {
    console.warn("[platform-subscription-sync] Could not map platform subscription to client", {
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

export const syncPlatformSubscription = async (
  subscriptionId: string,
): Promise<void> => {
  const subscription = await getStripeClient().subscriptions.retrieve(subscriptionId);
  await upsertPlatformSubscription(subscription);

  const clientId = await resolveClientIdFromSubscription(subscription);
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

/**
 * Single source of truth for "can this client use the product?".
 * Used by the WhatsApp webhooks (bot) and by /api/billing (dashboard PaymentWall).
 *
 * Allow-list: only these states grant access. Anything else (free, pending_payment,
 * incomplete, canceled, suspended, no subscription row) is blocked.
 * Manual overrides are platform_client_subscriptions rows with status 'active'.
 */

import { createServiceRoleClient } from "@/lib/supabase";

export const isPlanActive = (
  subscriptionStatus: string | null | undefined,
  gracePeriodEndsAt: string | null | undefined,
  now: Date = new Date(),
): boolean => {
  const status = (subscriptionStatus ?? "").toLowerCase();
  if (status === "active" || status === "trial" || status === "trialing") return true;
  // past_due keeps access only while the grace period (set by the webhook) is running
  if (status === "past_due" && gracePeriodEndsAt) {
    return new Date(gracePeriodEndsAt) > now;
  }
  return false;
};

export const hasActivePlan = async (clientId: string): Promise<boolean> => {
  const supabase = createServiceRoleClient() as any;
  const [{ data: subscription }, { data: client }] = await Promise.all([
    supabase
      .from("platform_client_subscriptions")
      .select("status")
      .eq("client_id", clientId)
      .maybeSingle(),
    supabase
      .from("clients")
      .select("grace_period_ends_at")
      .eq("id", clientId)
      .maybeSingle(),
  ]);

  return isPlanActive(subscription?.status, client?.grace_period_ends_at);
};

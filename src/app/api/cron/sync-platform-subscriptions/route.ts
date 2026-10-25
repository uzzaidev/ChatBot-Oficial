/**
 * Cron: daily reconciliation of platform subscriptions with Stripe.
 * Safety net for webhooks that were missed or arrived out of order.
 * Runs before enforce-grace-period so it acts on fresh state.
 *
 * Security: Protected by CRON_SECRET header check.
 */

import { syncPlatformSubscription } from "@/lib/platform-subscription-sync";
import { createServiceClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const LOG_PREFIX = "[cron:sync-platform-subscriptions]";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient() as any;
  // Manual overrides have no stripe_subscription_id and are skipped
  const { data: rows, error } = await supabase
    .from("platform_client_subscriptions")
    .select("stripe_subscription_id")
    .not("stripe_subscription_id", "is", null)
    .neq("status", "canceled");

  if (error) {
    console.error(`${LOG_PREFIX} Query failed:`, error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  let synced = 0;
  let failed = 0;
  for (const row of rows ?? []) {
    try {
      await syncPlatformSubscription(row.stripe_subscription_id);
      synced++;
    } catch (err) {
      failed++;
      console.error(`${LOG_PREFIX} Failed for ${row.stripe_subscription_id}:`, err);
    }
  }

  console.info(`${LOG_PREFIX} Done: ${synced} synced, ${failed} failed`);
  return NextResponse.json({ synced, failed });
}

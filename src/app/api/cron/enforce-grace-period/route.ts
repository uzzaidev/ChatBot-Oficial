/**
 * Cron endpoint: enforce grace period expiration.
 *
 * Designed to be called by Vercel Cron (vercel.json) or external scheduler.
 * Queries clients with expired grace periods (past_due + grace_period_ends_at < NOW)
 * and enforces non-payment: suspends account + disconnects WhatsApp.
 *
 * Security: Protected by CRON_SECRET header check.
 */

import { enforceNonPayment } from "@/lib/billing-lifecycle";
import { createServiceClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET;
const LOG_PREFIX = "[cron:enforce-grace-period]";

export async function GET(request: NextRequest) {
  // Validate cron secret
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient() as any;

    // Find clients with expired grace periods that are still past_due (not yet suspended)
    const { data: expiredClients, error } = await supabase
      .from("clients")
      .select("id, name, grace_period_ends_at, plan_status")
      .eq("plan_status", "past_due")
      .not("grace_period_ends_at", "is", null)
      .lt("grace_period_ends_at", new Date().toISOString());

    if (error) throw error;

    if (!expiredClients || expiredClients.length === 0) {
      console.info(`${LOG_PREFIX} No expired grace periods found`);
      return NextResponse.json({ enforced: 0 });
    }

    console.info(
      `${LOG_PREFIX} Found ${expiredClients.length} expired grace periods`,
    );

    const results: Array<{
      clientId: string;
      name: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const client of expiredClients) {
      try {
        await enforceNonPayment(client.id);
        results.push({ clientId: client.id, name: client.name, success: true });
        console.info(`${LOG_PREFIX} Enforced: ${client.name} (${client.id})`);
      } catch (err: any) {
        results.push({
          clientId: client.id,
          name: client.name,
          success: false,
          error: err?.message ?? "unknown",
        });
        console.error(`${LOG_PREFIX} Failed for ${client.id}:`, err);
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    console.info(
      `${LOG_PREFIX} Done: ${successCount} enforced, ${failCount} failed`,
    );

    return NextResponse.json({
      enforced: successCount,
      failed: failCount,
      details: results,
    });
  } catch (error: any) {
    console.error(`${LOG_PREFIX} Cron error:`, error);
    return NextResponse.json(
      { error: "Cron execution failed", details: error?.message },
      { status: 500 },
    );
  }
}

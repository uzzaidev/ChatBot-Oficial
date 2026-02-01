/**
 * 📝 LEAD ADS EVENTS API
 *
 * GET /api/crm/lead-ads-events - List lead ads events
 */

import { createServiceRoleClient } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = createServiceRoleClient();
  const clientId =
    request.nextUrl.searchParams.get("client_id") ||
    process.env.DEFAULT_CLIENT_ID;
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50");

  if (!clientId) {
    return NextResponse.json({ error: "client_id required" }, { status: 400 });
  }

  try {
    // Get events
    // Note: Using 'as any' because lead_ads_events is not yet in generated types
    const { data: events, error } = await (supabase as any)
      .from("lead_ads_events")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      // Table might not exist yet
      console.log("[LEAD-ADS-EVENTS] Table not found");
      return NextResponse.json({
        events: [],
        stats: { total: 0, processed: 0, pending: 0, errors: 0 },
      });
    }

    // Calculate stats
    const total = events?.length || 0;
    const processed = events?.filter((e) => e.processed).length || 0;
    const errors =
      events?.filter((e) => e.error_message && !e.processed).length || 0;
    const pending = total - processed - errors;

    return NextResponse.json({
      events: events || [],
      stats: {
        total,
        processed,
        pending,
        errors,
      },
    });
  } catch (error) {
    console.error("[LEAD-ADS-EVENTS] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 },
    );
  }
}

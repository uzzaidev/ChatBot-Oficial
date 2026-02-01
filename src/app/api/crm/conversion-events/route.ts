/**
 * 🔄 CONVERSION EVENTS API
 *
 * GET /api/crm/conversion-events?limit=50&status=sent
 *
 * Returns log of conversion events sent to Meta CAPI
 */

import { createServiceRoleClient } from "@/lib/supabase";
import { getClientIdFromSession } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 🔐 Get client_id from authenticated session
    const clientId = await getClientIdFromSession(request);

    if (!clientId) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 },
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const status = searchParams.get("status"); // 'sent', 'error', 'pending'

    const supabase = createServiceRoleClient();

    // Build query
    let query = supabase
      .from("conversion_events_log" as "conversion_events_log")
      .select(
        `
        id,
        event_id,
        event_name,
        event_time,
        status,
        card_id,
        phone_number,
        event_value,
        ctwa_clid,
        error_message,
        meta_response,
        created_at
      `,
      )
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(limit);

    // Filter by status if provided
    if (status && ["sent", "error", "pending"].includes(status)) {
      query = query.eq("status", status);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error("[CONVERSION-EVENTS] Error:", error);
      return NextResponse.json(
        { error: "Failed to fetch events", details: error.message },
        { status: 500 },
      );
    }

    // Calculate stats
    const { data: stats } = await supabase
      .from("conversion_events_log" as "conversion_events_log")
      .select("status")
      .eq("client_id", clientId);

    const eventStats = {
      total: stats?.length || 0,
      sent:
        stats?.filter((e: { status: string }) => e.status === "sent").length ||
        0,
      error:
        stats?.filter((e: { status: string }) => e.status === "error").length ||
        0,
      pending:
        stats?.filter((e: { status: string }) => e.status === "pending")
          .length || 0,
    };

    return NextResponse.json({
      success: true,
      events: events || [],
      stats: eventStats,
    });
  } catch (error) {
    console.error("[CONVERSION-EVENTS] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversion events" },
      { status: 500 },
    );
  }
}

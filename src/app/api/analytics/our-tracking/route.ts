/**
 * Our Internal Tracking API
 *
 * GET /api/analytics/our-tracking?start_date=2026-02-01&end_date=2026-02-11
 *
 * Returns our internal tracking data from gateway_usage_logs
 * Isolated by client_id (multi-tenant)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Get current user's client_id
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's client_id
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("client_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.client_id) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDate =
      searchParams.get("start_date") ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
    const endDate =
      searchParams.get("end_date") || new Date().toISOString().split("T")[0];

    // Query our internal tracking
    const { data, error } = await supabase
      .from("gateway_usage_logs")
      .select("*")
      .eq("client_id", profile.client_id)
      .gte("created_at", `${startDate}T00:00:00Z`)
      .lte("created_at", `${endDate}T23:59:59Z`)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Aggregate by date and model
    const aggregated = data.reduce((acc, record) => {
      const date = new Date(record.created_at).toISOString().split("T")[0];
      const key = `${date}-${record.model_name}-${record.provider}`;

      if (!acc[key]) {
        acc[key] = {
          date,
          model_name: record.model_name,
          provider: record.provider,
          total_requests: 0,
          input_tokens: 0,
          output_tokens: 0,
          total_tokens: 0,
          cost_brl: 0,
        };
      }

      acc[key].total_requests += 1;
      acc[key].input_tokens += record.input_tokens || 0;
      acc[key].output_tokens += record.output_tokens || 0;
      acc[key].total_tokens += record.total_tokens || 0;
      acc[key].cost_brl += parseFloat(record.cost_brl as any) || 0;

      return acc;
    }, {} as Record<string, any>);

    const aggregatedData = Object.values(aggregated);

    return NextResponse.json({
      success: true,
      data: aggregatedData,
      period: { start: startDate, end: endDate },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Our Tracking API] Error:", errorMessage);

    return NextResponse.json(
      {
        error: "Failed to fetch internal tracking data",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

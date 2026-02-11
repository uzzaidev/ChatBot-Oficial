/**
 * Discrepancies Detection API
 *
 * GET /api/analytics/discrepancies?start_date=2026-02-01&end_date=2026-02-11
 *
 * Returns discrepancies between our tracking and OpenAI official data
 * Uses the openai_tracking_discrepancies view
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

    // Query discrepancies view
    const { data, error } = await supabase
      .from("openai_tracking_discrepancies")
      .select("*")
      .eq("client_id", profile.client_id)
      .gte("usage_date", startDate)
      .lte("usage_date", endDate)
      .order("usage_date", { ascending: false });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      period: { start: startDate, end: endDate },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Discrepancies API] Error:", errorMessage);

    return NextResponse.json(
      {
        error: "Failed to fetch discrepancies",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

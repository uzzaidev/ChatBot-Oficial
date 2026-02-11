/**
 * OpenAI Billing Summary API
 *
 * GET /api/openai-billing/summary?days=30
 * Returns SIMPLIFIED billing summary using only usage API (works with api.usage.read scope)
 *
 * ⚠️ This version does NOT include billing limits (hard/soft limits) because
 * those require billing admin scopes. Use this if your Admin Key only has api.usage.read.
 */

import { getOpenAISimplifiedBillingSummary } from "@/lib/openai-billing";
import { createServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

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

    // Get user's client_id from user_profiles
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("client_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.client_id) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Get days parameter (default 30)
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "30");

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    // Fetch SIMPLIFIED billing summary from OpenAI (uses only usage API)
    const summary = await getOpenAISimplifiedBillingSummary(
      profile.client_id,
      startDateStr,
      endDateStr,
    );

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[OpenAI Billing API] Error:", errorMessage);

    return NextResponse.json(
      {
        error: "Failed to fetch OpenAI billing summary",
        details: errorMessage,
      },
      { status: 500 },
    );
  }
}

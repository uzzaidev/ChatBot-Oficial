import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getClientOpenAIKey } from "@/lib/vault";

export const dynamic = "force-dynamic";

/**
 * Test OpenAI Costs API endpoint
 * GET /api/test/openai-costs
 */
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

    // Get OpenAI API key from Vault
    const apiKey = await getClientOpenAIKey(profile.client_id);
    if (!apiKey) {
      return NextResponse.json(
        { error: "No OpenAI API key configured" },
        { status: 400 }
      );
    }

    // Test with last 7 days
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - (7 * 24 * 60 * 60);

    const url = `https://api.openai.com/v1/organization/costs?start_time=${startTime}&end_time=${endTime}`;

    console.log("[Test Costs API] Fetching from:", url);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        endpoint: "/v1/organization/costs",
        status: response.status,
        error: data,
        message: "❌ Costs API - SEM PERMISSÃO",
      });
    }

    return NextResponse.json({
      success: true,
      endpoint: "/v1/organization/costs",
      status: response.status,
      data,
      message: "✅ Costs API - TEM PERMISSÃO!",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

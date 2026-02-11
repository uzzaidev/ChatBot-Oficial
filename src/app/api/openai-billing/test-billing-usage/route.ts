/**
 * Test OpenAI Billing Usage API with Admin Key
 * GET /api/openai-billing/test-billing-usage
 */

import { createRouteHandlerClient } from "@/lib/supabase-server";
import { getClientOpenAIAdminKey } from "@/lib/vault";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request);

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
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Get OpenAI Admin API key
    const apiKey = await getClientOpenAIAdminKey(profile.client_id);
    if (!apiKey) {
      return NextResponse.json(
        { error: "No OpenAI Admin API key configured" },
        { status: 400 },
      );
    }

    console.log(
      "[Test Billing Usage] 🔑 Using Admin Key:",
      apiKey.substring(0, 20) + "...",
    );

    // Calculate date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    console.log(
      "[Test Billing Usage] 📅 Date range:",
      startDateStr,
      "to",
      endDateStr,
    );

    // Call OpenAI Billing Usage API
    const response = await fetch(
      `https://api.openai.com/v1/dashboard/billing/usage?start_date=${startDateStr}&end_date=${endDateStr}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log("[Test Billing Usage] 📡 Response Status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Test Billing Usage] ❌ Error:", errorText);

      return NextResponse.json(
        {
          success: false,
          error: `OpenAI API error: ${response.status}`,
          details: errorText,
          hint:
            response.status === 403
              ? "Admin Key não tem permissão para acessar billing/usage. Scope necessário: billing.read ou permissões de admin"
              : "Erro desconhecido",
        },
        { status: response.status },
      );
    }

    const data = await response.json();
    console.log("[Test Billing Usage] ✅ Success:", data);

    return NextResponse.json({
      success: true,
      data,
      message: "Admin Key consegue acessar billing usage API! 🎉",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Test Billing Usage] Error:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to test billing usage API",
        details: errorMessage,
      },
      { status: 500 },
    );
  }
}

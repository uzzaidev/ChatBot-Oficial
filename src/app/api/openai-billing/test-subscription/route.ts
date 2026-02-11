/**
 * Test OpenAI Subscription API with Admin Key
 * GET /api/openai-billing/test-subscription
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
      "[Test Subscription] 🔑 Using Admin Key:",
      apiKey.substring(0, 20) + "...",
    );

    // Call OpenAI Subscription API
    const response = await fetch(
      "https://api.openai.com/v1/dashboard/billing/subscription",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log("[Test Subscription] 📡 Response Status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Test Subscription] ❌ Error:", errorText);

      return NextResponse.json(
        {
          success: false,
          error: `OpenAI API error: ${response.status}`,
          details: errorText,
          hint:
            response.status === 403
              ? "Admin Key não tem permissão para acessar billing/subscription. Scope necessário: billing.read ou permissões de admin"
              : "Erro desconhecido",
        },
        { status: response.status },
      );
    }

    const data = await response.json();
    console.log("[Test Subscription] ✅ Success:", data);

    return NextResponse.json({
      success: true,
      data,
      message: "Admin Key consegue acessar subscription API! 🎉",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Test Subscription] Error:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to test subscription API",
        details: errorMessage,
      },
      { status: 500 },
    );
  }
}

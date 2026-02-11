import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getClientOpenAIKey } from "@/lib/vault";

export const dynamic = "force-dynamic";

/**
 * Test OpenAI Models API endpoint (always works with normal key)
 * GET /api/test/openai-models
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

    const url = `https://api.openai.com/v1/models`;

    console.log("[Test Models API] Fetching from:", url);

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
        endpoint: "/v1/models",
        status: response.status,
        error: data,
        message: "❌ Models API - ERRO (key pode estar inválida)",
      });
    }

    // Count models
    const modelCount = data.data?.length || 0;

    return NextResponse.json({
      success: true,
      endpoint: "/v1/models",
      status: response.status,
      modelCount,
      models: data.data?.slice(0, 5).map((m: any) => m.id), // First 5 models
      message: `✅ Models API - TEM PERMISSÃO! (${modelCount} modelos disponíveis)`,
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

/**
 * Test endpoint for OpenAI /v1/usage/costs API
 *
 * Verificar se conseguimos pegar custos REAIS (não estimados)
 */

import { createRouteHandlerClient } from "@/lib/supabase-server";
import { getClientOpenAIAdminKey } from "@/lib/vault";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request);

    // MODO TESTE: Aceita client_id via query param para facilitar teste
    const searchParams = request.nextUrl.searchParams;
    const clientIdParam = searchParams.get("client_id");

    let clientId: string;

    if (clientIdParam) {
      // Teste direto com client_id na URL
      console.log(
        "[Test Costs API] 🧪 TEST MODE: Using client_id from query param",
      );
      clientId = clientIdParam;
    } else {
      // Modo autenticado normal
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          {
            error: "Unauthorized",
            hint: "Adicione ?client_id=SEU_CLIENT_ID_AQUI na URL para testar sem login",
          },
          { status: 401 },
        );
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
          { status: 404 },
        );
      }

      clientId = profile.client_id;
    }

    // Get OpenAI Admin API key
    const apiKey = await getClientOpenAIAdminKey(clientId);
    if (!apiKey) {
      return NextResponse.json(
        { error: "No OpenAI Admin API key configured for this client" },
        { status: 400 },
      );
    }

    console.log(
      "[Test Costs API] 🔑 Using Admin Key:",
      apiKey.substring(0, 20) + "...",
    );

    // Calculate date range (last 30 days) - Unix timestamps like usage API
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - 30 * 24 * 60 * 60;

    console.log("[Test Costs API] 📅 Date range:", {
      start: new Date(startTime * 1000).toISOString(),
      end: new Date(endTime * 1000).toISOString(),
      start_time: startTime,
      end_time: endTime,
    });

    // Try BOTH endpoints with Unix timestamps
    const endpoints = [
      {
        name: "/v1/organization/costs",
        url: `https://api.openai.com/v1/organization/costs?start_time=${startTime}&end_time=${endTime}`,
      },
      {
        name: "/v1/usage/costs",
        url: `https://api.openai.com/v1/usage/costs?start_time=${startTime}&end_time=${endTime}`,
      },
    ];

    const results = [];

    for (const endpoint of endpoints) {
      console.log(
        `[Test Costs API] 🌐 Testing: ${endpoint.name}`,
        endpoint.url,
      );

      const response = await fetch(endpoint.url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      console.log(
        `[Test Costs API] 📡 ${endpoint.name} status:`,
        response.status,
      );

      if (response.ok) {
        const data = await response.json();
        console.log(`[Test Costs API] ✅ ${endpoint.name} SUCCESS:`, data);

        results.push({
          endpoint: endpoint.name,
          status: response.status,
          success: true,
          data,
        });
      } else {
        const errorText = await response.text();
        console.error(
          `[Test Costs API] ❌ ${endpoint.name} failed:`,
          errorText,
        );

        results.push({
          endpoint: endpoint.name,
          status: response.status,
          success: false,
          error: errorText,
        });
      }
    }

    // Check if any succeeded
    const successfulEndpoint = results.find((r) => r.success);

    if (successfulEndpoint) {
      return NextResponse.json({
        success: true,
        message: `🎉 CUSTOS REAIS DISPONÍVEIS! Endpoint: ${successfulEndpoint.endpoint}`,
        working_endpoint: successfulEndpoint.endpoint,
        data: successfulEndpoint.data,
        all_results: results,
      });
    }

    return NextResponse.json({
      success: false,
      message:
        "❌ Nenhum endpoint de custos funcionou. Continuaremos usando estimativas.",
      all_results: results,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Test Costs API] 💥 Exception:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        message: "Erro ao testar API de custos",
      },
      { status: 500 },
    );
  }
}

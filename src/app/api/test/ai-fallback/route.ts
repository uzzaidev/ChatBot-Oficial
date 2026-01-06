/**
 * TEST ENDPOINT: AI Gateway Fallback
 *
 * Tests the fallback mechanism when AI Gateway fails
 * Simulates gateway failure and validates fallback to client Vault credentials
 *
 * Usage:
 * curl http://localhost:3000/api/test/ai-fallback
 */

import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai-gateway";
import { getClientConfig } from "@/lib/config";
import type { CoreMessage } from "ai";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    console.log("[AI Fallback Test] Starting test...");

    // Get a test client config from database
    const testClientId = request.nextUrl.searchParams.get("clientId");

    if (!testClientId) {
      return NextResponse.json(
        {
          error: "Missing clientId parameter",
          usage: "?clientId=YOUR_CLIENT_UUID",
        },
        { status: 400 },
      );
    }

    const clientConfig = await getClientConfig(testClientId);

    if (!clientConfig) {
      return NextResponse.json(
        { error: `Client not found: ${testClientId}` },
        { status: 404 },
      );
    }

    console.log("[AI Fallback Test] Testing with client:", {
      id: clientConfig.id,
      name: clientConfig.name,
      primaryProvider: clientConfig.primaryProvider,
      hasOpenAIKey: !!clientConfig.apiKeys.openaiApiKey,
      hasGroqKey: !!clientConfig.apiKeys.groqApiKey,
    });

    // Test 1: Force fallback by using invalid gateway config
    console.log("\n=== TEST 1: Forcing Gateway Failure ===");

    const testMessages: CoreMessage[] = [
      {
        role: "system",
        content: "You are a helpful assistant. Keep responses very short.",
      },
      {
        role: "user",
        content: "Say 'Fallback test successful!' in Portuguese.",
      },
    ];

    // Temporarily disable gateway to force fallback
    const originalEnv = process.env.ENABLE_AI_GATEWAY;
    process.env.ENABLE_AI_GATEWAY = "false"; // Force fallback path

    const startTime = Date.now();

    const result = await callAI({
      clientId: clientConfig.id,
      clientConfig: {
        id: clientConfig.id,
        name: clientConfig.name,
        slug: clientConfig.slug,
        primaryModelProvider: clientConfig.primaryProvider,
        openaiModel: clientConfig.models.openaiModel,
        groqModel: clientConfig.models.groqModel,
        systemPrompt: clientConfig.prompts.systemPrompt,
      },
      messages: testMessages,
      skipUsageLogging: true, // Don't log test calls
    });

    // Restore environment
    process.env.ENABLE_AI_GATEWAY = originalEnv;

    const latency = Date.now() - startTime;

    console.log("[AI Fallback Test] Result:", {
      wasFallback: result.wasFallback,
      fallbackReason: result.fallbackReason,
      provider: result.provider,
      model: result.model,
      latency: `${latency}ms`,
      responseLength: result.text.length,
    });

    // Return test results
    return NextResponse.json({
      success: true,
      test: "AI Gateway Fallback",
      client: {
        id: clientConfig.id,
        name: clientConfig.name,
      },
      result: {
        text: result.text,
        wasFallback: result.wasFallback,
        fallbackReason: result.fallbackReason,
        provider: result.provider,
        model: result.model,
        primaryAttemptedProvider: result.primaryAttemptedProvider,
        primaryAttemptedModel: result.primaryAttemptedModel,
        fallbackUsedProvider: result.fallbackUsedProvider,
        fallbackUsedModel: result.fallbackUsedModel,
        usage: result.usage,
        latencyMs: latency,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[AI Fallback Test] Error:", error);

    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}

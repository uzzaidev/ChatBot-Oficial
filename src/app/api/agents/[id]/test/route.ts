/**
 * API Route: /api/agents/[id]/test
 *
 * Tests an agent with a message without affecting production conversations.
 * Uses the agent's compiled prompts or live config to generate a response.
 */

import { callAI } from "@/lib/ai-gateway";
import {
  compileFormatterPrompt,
  compileSystemPrompt,
} from "@/lib/prompt-builder";
import { createServerClient } from "@/lib/supabase";
import type { Agent } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/agents/[id]/test
 * Send a test message to the agent and get a response
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's client_id
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("client_id")
      .eq("id", user.id)
      .single();

    if (!profile?.client_id) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 },
      );
    }

    // Get agent
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("*")
      .eq("id", id)
      .eq("client_id", profile.client_id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Get client info for AI call
    const { data: client } = await supabase
      .from("clients")
      .select("id, name, slug")
      .eq("id", profile.client_id)
      .single();

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { message, liveConfig } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    // Determine prompts to use
    let systemPrompt: string;
    let formatterPrompt: string;
    let agentConfig: Partial<Agent>;

    if (liveConfig) {
      // Use live config from form (for preview before saving)
      agentConfig = { ...agent, ...liveConfig };
      systemPrompt = compileSystemPrompt(agentConfig as Agent);
      formatterPrompt = compileFormatterPrompt(agentConfig as Agent);
    } else {
      // Use saved compiled prompts
      systemPrompt = agent.compiled_system_prompt || compileSystemPrompt(agent);
      formatterPrompt =
        agent.compiled_formatter_prompt || compileFormatterPrompt(agent);
      agentConfig = agent;
    }

    // Build messages array with formatter instruction included in system prompt
    const fullSystemPrompt = formatterPrompt
      ? `${systemPrompt}\n\n${formatterPrompt}`
      : systemPrompt;

    const messages = [
      { role: "system" as const, content: fullSystemPrompt },
      { role: "user" as const, content: message },
    ];

    // Call AI using the ai-gateway with proper AICallConfig interface
    const startTime = Date.now();
    const result = await callAI({
      clientId: profile.client_id,
      clientConfig: {
        id: client.id,
        name: client.name,
        slug: client.slug,
        primaryModelProvider: agentConfig.primary_provider || "groq",
        openaiModel: agentConfig.openai_model || "gpt-4o",
        groqModel: agentConfig.groq_model || "llama-3.3-70b-versatile",
        systemPrompt: fullSystemPrompt,
      },
      messages,
      settings: {
        temperature: agentConfig.temperature ?? 0.7,
        maxTokens: agentConfig.max_tokens ?? 2000,
      },
      skipUsageLogging: true, // Don't log test messages to usage
    });
    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      response: result.text,
      latencyMs,
      model: result.model,
      provider: result.provider,
      wasCached: result.wasCached,
      usage: result.usage,
    });
  } catch (error) {
    console.error("[POST /api/agents/[id]/test] Error:", error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        return NextResponse.json(
          { error: "Invalid API key configuration" },
          { status: 401 },
        );
      }
      if (
        error.message.includes("rate limit") ||
        error.message.includes("quota")
      ) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again later." },
          { status: 429 },
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to test agent" },
      { status: 500 },
    );
  }
}

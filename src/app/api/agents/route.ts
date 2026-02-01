/**
 * API Route: /api/agents
 *
 * Handles listing and creating agents for the authenticated client.
 * Auto-creates default agents + legacy agent for new clients.
 */

import {
  AGENT_TEMPLATES,
  createLegacyAgentFromClientConfig,
} from "@/lib/agent-templates";
import { getClientConfig } from "@/lib/config";
import {
  compileFormatterPrompt,
  compileSystemPrompt,
  createAgentSlug,
  validateAgentConfig,
} from "@/lib/prompt-builder";
import { createServerClient } from "@/lib/supabase";
import type { Agent } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/agents
 * List all agents for the authenticated client
 */
export async function GET(request: NextRequest) {
  try {
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
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("client_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.client_id) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 },
      );
    }

    // Get query params for filtering
    const searchParams = request.nextUrl.searchParams;
    const includeArchived = searchParams.get("includeArchived") === "true";
    const activeOnly = searchParams.get("activeOnly") === "true";

    // Build query
    let query = supabase
      .from("agents")
      .select("*")
      .eq("client_id", profile.client_id)
      .order("created_at", { ascending: false });

    if (!includeArchived) {
      query = query.eq("is_archived", false);
    }

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data: agents, error: agentsError } = await query;

    if (agentsError) {
      console.error("[GET /api/agents] Error fetching agents:", agentsError);
      return NextResponse.json(
        { error: "Failed to fetch agents" },
        { status: 500 },
      );
    }

    // Auto-create default agents if none exist (first access)
    if (!agents || agents.length === 0) {
      console.log(
        "[GET /api/agents] No agents found, creating defaults for client:",
        profile.client_id,
      );

      try {
        const createdAgents = await createDefaultAgentsForClient(
          supabase,
          profile.client_id,
        );
        return NextResponse.json({
          agents: createdAgents,
          count: createdAgents.length,
          created: true, // Flag indicating agents were just created
        });
      } catch (createError) {
        console.error(
          "[GET /api/agents] Error creating default agents:",
          createError,
        );
        // Return empty array instead of failing
        return NextResponse.json({
          agents: [],
          count: 0,
        });
      }
    }

    return NextResponse.json({
      agents: agents || [],
      count: agents?.length || 0,
    });
  } catch (error) {
    console.error("[GET /api/agents] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Creates default agents for a client on first access
 * - 3 template agents (Atendente, Vendedor, Suporte)
 * - 1 legacy agent from existing client config (if has custom prompt)
 */
async function createDefaultAgentsForClient(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  clientId: string,
): Promise<Agent[]> {
  const createdAgents: Agent[] = [];

  // Get client config to check for legacy prompt
  const clientConfig = await getClientConfig(clientId);

  // 1. Create legacy agent if client has custom prompt
  if (
    clientConfig &&
    clientConfig.prompts.systemPrompt &&
    clientConfig.prompts.systemPrompt.length > 100
  ) {
    const legacyTemplate = createLegacyAgentFromClientConfig(clientConfig);
    const legacyPrompt = compileSystemPrompt(legacyTemplate as Agent);
    const legacyFormatter = compileFormatterPrompt(legacyTemplate as Agent);

    const { data: legacyAgent, error: legacyError } = await supabase
      .from("agents")
      .insert({
        client_id: clientId,
        ...legacyTemplate,
        is_active: true, // Make legacy agent active by default
        is_archived: false,
        compiled_system_prompt: legacyPrompt,
        compiled_formatter_prompt: legacyFormatter,
      })
      .select()
      .single();

    if (!legacyError && legacyAgent) {
      createdAgents.push(legacyAgent as Agent);
      console.log(
        "[createDefaultAgents] Created legacy agent:",
        legacyAgent.name,
      );
    }
  }

  // 2. Create 3 default template agents
  const defaultTemplates = ["atendente-geral", "vendedor", "suporte-tecnico"];

  for (const templateSlug of defaultTemplates) {
    const template = AGENT_TEMPLATES.find((t) => t.slug === templateSlug);
    if (!template) continue;

    const systemPrompt = compileSystemPrompt(template as Agent);
    const formatterPrompt = compileFormatterPrompt(template as Agent);

    const { data: newAgent, error: insertError } = await supabase
      .from("agents")
      .insert({
        client_id: clientId,
        ...template,
        // If no legacy agent was created, make first template active
        is_active:
          createdAgents.length === 0 && templateSlug === "atendente-geral",
        is_archived: false,
        compiled_system_prompt: systemPrompt,
        compiled_formatter_prompt: formatterPrompt,
      })
      .select()
      .single();

    if (!insertError && newAgent) {
      createdAgents.push(newAgent as Agent);
      console.log(
        "[createDefaultAgents] Created template agent:",
        template.name,
      );
    }
  }

  return createdAgents;
}

/**
 * POST /api/agents
 * Create a new agent for the authenticated client
 */
export async function POST(request: NextRequest) {
  try {
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
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("client_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.client_id) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 },
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    const validation = validateAgentConfig(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 },
      );
    }

    // Generate slug if not provided
    const slug = body.slug || createAgentSlug(body.name);

    // Check for duplicate slug
    const { data: existingAgent } = await supabase
      .from("agents")
      .select("id")
      .eq("client_id", profile.client_id)
      .eq("slug", slug)
      .single();

    if (existingAgent) {
      return NextResponse.json(
        { error: "An agent with this slug already exists" },
        { status: 409 },
      );
    }

    // Prepare agent data
    const agentData: Partial<Agent> = {
      client_id: profile.client_id,
      name: body.name,
      slug,
      avatar_emoji: body.avatar_emoji || "🤖",
      description: body.description || null,

      // Status
      is_active: false, // New agents are inactive by default
      is_archived: false,

      // Tone & Style
      response_tone: body.response_tone || "professional",
      response_style: body.response_style || "helpful",
      language: body.language || "pt-BR",
      use_emojis: body.use_emojis ?? false,
      max_response_length: body.max_response_length || "medium",

      // Behavior
      role_description: body.role_description || null,
      primary_goal: body.primary_goal || null,
      forbidden_topics: body.forbidden_topics || [],
      always_mention: body.always_mention || [],
      greeting_message: body.greeting_message || null,
      fallback_message: body.fallback_message || null,

      // Tools
      enable_human_handoff: body.enable_human_handoff ?? true,
      enable_document_search: body.enable_document_search ?? false,
      enable_audio_response: body.enable_audio_response ?? false,

      // RAG
      enable_rag: body.enable_rag ?? false,
      rag_threshold: body.rag_threshold ?? 0.7,
      rag_max_results: body.rag_max_results ?? 5,

      // Model
      primary_provider: body.primary_provider || "groq",
      openai_model: body.openai_model || "gpt-4o",
      groq_model: body.groq_model || "llama-3.3-70b-versatile",
      temperature: body.temperature ?? 0.7,
      max_tokens: body.max_tokens ?? 2000,
    };

    // Compile prompts
    agentData.compiled_system_prompt = compileSystemPrompt(agentData as Agent);
    agentData.compiled_formatter_prompt = compileFormatterPrompt(
      agentData as Agent,
    );

    // Insert agent
    const { data: newAgent, error: insertError } = await supabase
      .from("agents")
      .insert(agentData)
      .select()
      .single();

    if (insertError) {
      console.error("[POST /api/agents] Error creating agent:", insertError);
      return NextResponse.json(
        { error: "Failed to create agent", details: insertError.message },
        { status: 500 },
      );
    }

    // Create initial version
    await supabase.from("agent_versions").insert({
      agent_id: newAgent.id,
      version_number: 1,
      snapshot: newAgent,
      change_description: "Agente criado",
      created_by: user.id,
    });

    return NextResponse.json(
      {
        success: true,
        agent: newAgent,
        message: "Agent created successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/agents] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

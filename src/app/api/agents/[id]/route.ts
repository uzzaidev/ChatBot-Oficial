/**
 * API Route: /api/agents/[id]
 *
 * Handles getting, updating, and deleting a specific agent.
 */

import {
  compileFormatterPrompt,
  compileSystemPrompt,
  validateAgentConfig,
} from "@/lib/prompt-builder";
import { createServerClient } from "@/lib/supabase";
import type { Agent } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/agents/[id]
 * Get a specific agent by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // Get agent (with client_id check for security)
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("*")
      .eq("id", id)
      .eq("client_id", profile.client_id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json({ agent });
  } catch (error) {
    console.error("[GET /api/agents/[id]] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/agents/[id]
 * Update a specific agent
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    // Get existing agent
    const { data: existingAgent, error: fetchError } = await supabase
      .from("agents")
      .select("*")
      .eq("id", id)
      .eq("client_id", profile.client_id)
      .single();

    if (fetchError || !existingAgent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();

    // Validate if name is being changed
    if (body.name) {
      const validation = validateAgentConfig({ ...existingAgent, ...body });
      if (!validation.valid) {
        return NextResponse.json(
          { error: "Validation failed", details: validation.errors },
          { status: 400 },
        );
      }
    }

    // Prepare update data (only include provided fields)
    const updateData: Partial<Agent> = {};

    // Identity fields
    if (body.name !== undefined) updateData.name = body.name;
    if (body.avatar_emoji !== undefined)
      updateData.avatar_emoji = body.avatar_emoji;
    if (body.description !== undefined)
      updateData.description = body.description;

    // Status (but not is_active - use /activate endpoint for that)
    if (body.is_archived !== undefined)
      updateData.is_archived = body.is_archived;

    // Tone & Style
    if (body.response_tone !== undefined)
      updateData.response_tone = body.response_tone;
    if (body.response_style !== undefined)
      updateData.response_style = body.response_style;
    if (body.language !== undefined) updateData.language = body.language;
    if (body.use_emojis !== undefined) updateData.use_emojis = body.use_emojis;
    if (body.max_response_length !== undefined)
      updateData.max_response_length = body.max_response_length;

    // Behavior
    if (body.role_description !== undefined)
      updateData.role_description = body.role_description;
    if (body.primary_goal !== undefined)
      updateData.primary_goal = body.primary_goal;
    if (body.forbidden_topics !== undefined)
      updateData.forbidden_topics = body.forbidden_topics;
    if (body.always_mention !== undefined)
      updateData.always_mention = body.always_mention;
    if (body.greeting_message !== undefined)
      updateData.greeting_message = body.greeting_message;
    if (body.fallback_message !== undefined)
      updateData.fallback_message = body.fallback_message;

    // Tools
    if (body.enable_human_handoff !== undefined)
      updateData.enable_human_handoff = body.enable_human_handoff;
    if (body.enable_document_search !== undefined)
      updateData.enable_document_search = body.enable_document_search;
    if (body.enable_audio_response !== undefined)
      updateData.enable_audio_response = body.enable_audio_response;

    // RAG
    if (body.enable_rag !== undefined) updateData.enable_rag = body.enable_rag;
    if (body.rag_threshold !== undefined)
      updateData.rag_threshold = body.rag_threshold;
    if (body.rag_max_results !== undefined)
      updateData.rag_max_results = body.rag_max_results;

    // Model
    if (body.primary_provider !== undefined)
      updateData.primary_provider = body.primary_provider;
    if (body.openai_model !== undefined)
      updateData.openai_model = body.openai_model;
    if (body.groq_model !== undefined) updateData.groq_model = body.groq_model;
    if (body.temperature !== undefined)
      updateData.temperature = body.temperature;
    if (body.max_tokens !== undefined) updateData.max_tokens = body.max_tokens;

    // Recompile prompts if any relevant fields changed
    const promptRelatedFields = [
      "name",
      "role_description",
      "primary_goal",
      "response_tone",
      "response_style",
      "language",
      "use_emojis",
      "max_response_length",
      "forbidden_topics",
      "always_mention",
      "greeting_message",
      "fallback_message",
      "enable_human_handoff",
      "enable_document_search",
      "enable_audio_response",
      "enable_rag",
    ];

    const needsRecompile = promptRelatedFields.some(
      (field) => body[field] !== undefined,
    );

    if (needsRecompile) {
      const mergedAgent = { ...existingAgent, ...updateData } as Agent;
      updateData.compiled_system_prompt = compileSystemPrompt(mergedAgent);
      updateData.compiled_formatter_prompt =
        compileFormatterPrompt(mergedAgent);
    }

    // Update agent
    const { data: updatedAgent, error: updateError } = await supabase
      .from("agents")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error(
        "[PATCH /api/agents/[id]] Error updating agent:",
        updateError,
      );
      return NextResponse.json(
        { error: "Failed to update agent", details: updateError.message },
        { status: 500 },
      );
    }

    // Create new version
    const { data: latestVersion } = await supabase
      .from("agent_versions")
      .select("version_number")
      .eq("agent_id", id)
      .order("version_number", { ascending: false })
      .limit(1)
      .single();

    const newVersionNumber = (latestVersion?.version_number || 0) + 1;

    await supabase.from("agent_versions").insert({
      agent_id: id,
      version_number: newVersionNumber,
      snapshot: updatedAgent,
      change_description:
        body.change_description || "Configuracoes atualizadas",
      created_by: user.id,
    });

    // Clean up old versions (keep last 20)
    const { data: allVersions } = await supabase
      .from("agent_versions")
      .select("id, version_number")
      .eq("agent_id", id)
      .order("version_number", { ascending: false });

    if (allVersions && allVersions.length > 20) {
      const versionsToDelete = allVersions.slice(20).map((v) => v.id);
      await supabase.from("agent_versions").delete().in("id", versionsToDelete);
    }

    return NextResponse.json({
      success: true,
      agent: updatedAgent,
      version: newVersionNumber,
      message: "Agent updated successfully",
    });
  } catch (error) {
    console.error("[PATCH /api/agents/[id]] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/agents/[id]
 * Delete (archive) a specific agent
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Check if agent exists and belongs to client
    const { data: agent } = await supabase
      .from("agents")
      .select("id, is_active")
      .eq("id", id)
      .eq("client_id", profile.client_id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Check query param for permanent delete vs archive
    const searchParams = request.nextUrl.searchParams;
    const permanent = searchParams.get("permanent") === "true";

    if (permanent) {
      // Permanent delete (also deletes versions due to CASCADE)
      const { error: deleteError } = await supabase
        .from("agents")
        .delete()
        .eq("id", id);

      if (deleteError) {
        console.error(
          "[DELETE /api/agents/[id]] Error deleting agent:",
          deleteError,
        );
        return NextResponse.json(
          { error: "Failed to delete agent" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Agent permanently deleted",
      });
    } else {
      // Archive (soft delete)
      const { error: archiveError } = await supabase
        .from("agents")
        .update({ is_archived: true, is_active: false })
        .eq("id", id);

      if (archiveError) {
        console.error(
          "[DELETE /api/agents/[id]] Error archiving agent:",
          archiveError,
        );
        return NextResponse.json(
          { error: "Failed to archive agent" },
          { status: 500 },
        );
      }

      // If this was the active agent, clear the client's active_agent_id
      if (agent.is_active) {
        await supabase
          .from("clients")
          .update({ active_agent_id: null })
          .eq("id", profile.client_id);
      }

      return NextResponse.json({
        success: true,
        message: "Agent archived successfully",
      });
    }
  } catch (error) {
    console.error("[DELETE /api/agents/[id]] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * API Route: /api/agents/[id]/activate
 *
 * Activates a specific agent for the client.
 * Only one agent can be active at a time.
 */

import { createServerClient } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/agents/[id]/activate
 * Activate this agent (deactivates any other active agent)
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

    // Verify agent exists and belongs to client
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, name, is_archived")
      .eq("id", id)
      .eq("client_id", profile.client_id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.is_archived) {
      return NextResponse.json(
        { error: "Cannot activate an archived agent. Restore it first." },
        { status: 400 },
      );
    }

    // Deactivate any currently active agent
    await supabase
      .from("agents")
      .update({ is_active: false })
      .eq("client_id", profile.client_id)
      .eq("is_active", true);

    // Activate the requested agent
    const { error: activateError } = await supabase
      .from("agents")
      .update({ is_active: true })
      .eq("id", id);

    if (activateError) {
      console.error("[POST /api/agents/[id]/activate] Error:", activateError);
      return NextResponse.json(
        { error: "Failed to activate agent" },
        { status: 500 },
      );
    }

    // Update client's active_agent_id
    await supabase
      .from("clients")
      .update({ active_agent_id: id })
      .eq("id", profile.client_id);

    return NextResponse.json({
      success: true,
      message: `Agent "${agent.name}" is now active`,
      agentId: id,
    });
  } catch (error) {
    console.error("[POST /api/agents/[id]/activate] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/agents/[id]/activate
 * Deactivate this agent (without activating another)
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

    // Verify agent exists and belongs to client
    const { data: agent } = await supabase
      .from("agents")
      .select("id, name")
      .eq("id", id)
      .eq("client_id", profile.client_id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Deactivate the agent
    await supabase.from("agents").update({ is_active: false }).eq("id", id);

    // Clear client's active_agent_id
    await supabase
      .from("clients")
      .update({ active_agent_id: null })
      .eq("id", profile.client_id);

    return NextResponse.json({
      success: true,
      message: `Agent "${agent.name}" deactivated. Using legacy system prompt.`,
    });
  } catch (error) {
    console.error(
      "[DELETE /api/agents/[id]/activate] Unexpected error:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

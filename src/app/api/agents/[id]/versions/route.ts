/**
 * API Route: /api/agents/[id]/versions
 *
 * GET - List all versions of an agent
 * POST - Create a new version (snapshot) of the agent
 */

import { createServerClient } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET - List versions
export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> => {
  try {
    const { id: agentId } = await params;

    // Verify user
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Get user's client_id
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("client_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.client_id) {
      return NextResponse.json(
        { error: "Perfil não encontrado" },
        { status: 404 },
      );
    }

    // Verify agent belongs to user's client
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, client_id, name")
      .eq("id", agentId)
      .eq("client_id", profile.client_id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: "Agente não encontrado" },
        { status: 404 },
      );
    }

    // Fetch versions
    const { data: versions, error: versionsError } = await supabase
      .from("agent_versions")
      .select(
        `
        id,
        version_number,
        change_description,
        created_by,
        created_at
      `,
      )
      .eq("agent_id", agentId)
      .order("version_number", { ascending: false })
      .limit(50);

    if (versionsError) {
      console.error("[GET /api/agents/[id]/versions] Error:", versionsError);
      return NextResponse.json(
        { error: "Erro ao buscar versões" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      agentId,
      agentName: agent.name,
      versions: versions || [],
      count: versions?.length || 0,
    });
  } catch (error) {
    console.error("[GET /api/agents/[id]/versions] Unexpected error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
};

// POST - Create a new version (manual snapshot or before major change)
export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> => {
  try {
    const { id: agentId } = await params;
    const body = await request.json();
    const { change_description } = body;

    // Verify user
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Get user's client_id
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("client_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.client_id) {
      return NextResponse.json(
        { error: "Perfil não encontrado" },
        { status: 404 },
      );
    }

    // Verify agent belongs to user's client
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .eq("client_id", profile.client_id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: "Agente não encontrado" },
        { status: 404 },
      );
    }

    // Get the latest version number
    const { data: latestVersion } = await supabase
      .from("agent_versions")
      .select("version_number")
      .eq("agent_id", agentId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const newVersionNumber = (latestVersion?.version_number || 0) + 1;

    // Create snapshot (exclude timestamps to avoid duplication)
    const snapshot = {
      ...agent,
      created_at: undefined,
      updated_at: undefined,
    };

    // Insert new version
    const { data: newVersion, error: insertError } = await supabase
      .from("agent_versions")
      .insert({
        agent_id: agentId,
        version_number: newVersionNumber,
        snapshot,
        change_description: change_description || `Versão ${newVersionNumber}`,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error(
        "[POST /api/agents/[id]/versions] Insert error:",
        insertError,
      );
      return NextResponse.json(
        { error: "Erro ao criar versão" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Versão criada com sucesso",
      version: newVersion,
    });
  } catch (error) {
    console.error("[POST /api/agents/[id]/versions] Unexpected error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
};

/**
 * API Route: /api/agents/experiments
 *
 * GET - List experiments for client
 * POST - Create new experiment
 */

import { createServerClient } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET - List experiments
export const GET = async (): Promise<NextResponse> => {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Get user's client_id
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("client_id")
      .eq("id", user.id)
      .single();

    if (!profile?.client_id) {
      return NextResponse.json(
        { error: "Perfil não encontrado" },
        { status: 404 },
      );
    }

    // Fetch experiments with agent info
    const { data: experiments, error: experimentsError } = await supabase
      .from("agent_experiments")
      .select(
        `
        *,
        agent_a:agents!agent_experiments_agent_a_id_fkey(id, name, avatar_emoji),
        agent_b:agents!agent_experiments_agent_b_id_fkey(id, name, avatar_emoji)
      `,
      )
      .eq("client_id", profile.client_id)
      .order("created_at", { ascending: false });

    if (experimentsError) {
      console.error("[GET /api/agents/experiments] Error:", experimentsError);
      return NextResponse.json(
        { error: "Erro ao buscar experimentos" },
        { status: 500 },
      );
    }

    // Fetch available agents
    const { data: agents } = await supabase
      .from("agents")
      .select("id, name, avatar_emoji, is_active")
      .eq("client_id", profile.client_id)
      .eq("is_archived", false)
      .order("name");

    return NextResponse.json({
      experiments: experiments || [],
      agents: agents || [],
    });
  } catch (error) {
    console.error("[GET /api/agents/experiments] Unexpected error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
};

// POST - Create new experiment
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Get user's client_id
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("client_id")
      .eq("id", user.id)
      .single();

    if (!profile?.client_id) {
      return NextResponse.json(
        { error: "Perfil não encontrado" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { name, agent_a_id, agent_b_id, traffic_split } = body;

    // Validate required fields
    if (!name || !agent_a_id || !agent_b_id) {
      return NextResponse.json(
        { error: "Nome e agentes são obrigatórios" },
        { status: 400 },
      );
    }

    if (agent_a_id === agent_b_id) {
      return NextResponse.json(
        { error: "Os dois agentes devem ser diferentes" },
        { status: 400 },
      );
    }

    // Validate agents belong to client
    const { data: agents } = await supabase
      .from("agents")
      .select("id")
      .eq("client_id", profile.client_id)
      .in("id", [agent_a_id, agent_b_id]);

    if (!agents || agents.length !== 2) {
      return NextResponse.json(
        { error: "Agentes não encontrados" },
        { status: 404 },
      );
    }

    // Create experiment (not active by default)
    const { data: experiment, error: insertError } = await supabase
      .from("agent_experiments")
      .insert({
        client_id: profile.client_id,
        name,
        agent_a_id,
        agent_b_id,
        traffic_split: traffic_split ?? 50,
        is_active: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[POST /api/agents/experiments] Error:", insertError);
      return NextResponse.json(
        { error: "Erro ao criar experimento" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Experimento criado com sucesso",
      experiment,
    });
  } catch (error) {
    console.error("[POST /api/agents/experiments] Unexpected error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
};

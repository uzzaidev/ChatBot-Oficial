/**
 * API Route: /api/agents/experiments/[id]
 *
 * GET - Get experiment details
 * PATCH - Update experiment (activate/deactivate, change split)
 * DELETE - Delete experiment
 */

import { createServerClient } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get experiment details
export const GET = async (
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> => {
  try {
    const { id } = await params;
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

    // Fetch experiment with agent info
    const { data: experiment, error: experimentError } = await supabase
      .from("agent_experiments")
      .select(
        `
        *,
        agent_a:agents!agent_experiments_agent_a_id_fkey(id, name, avatar_emoji),
        agent_b:agents!agent_experiments_agent_b_id_fkey(id, name, avatar_emoji)
      `,
      )
      .eq("id", id)
      .eq("client_id", profile.client_id)
      .single();

    if (experimentError || !experiment) {
      return NextResponse.json(
        { error: "Experimento não encontrado" },
        { status: 404 },
      );
    }

    // Fetch assignments count
    const { count: assignmentsCount } = await supabase
      .from("experiment_assignments")
      .select("*", { count: "exact", head: true })
      .eq("experiment_id", id);

    return NextResponse.json({
      experiment,
      assignments_count: assignmentsCount || 0,
    });
  } catch (error) {
    console.error(
      "[GET /api/agents/experiments/[id]] Unexpected error:",
      error,
    );
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
};

// PATCH - Update experiment
export const PATCH = async (
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> => {
  try {
    const { id } = await params;
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
    const { is_active, traffic_split, name } = body;

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof is_active === "boolean") {
      updateData.is_active = is_active;
      if (is_active) {
        updateData.started_at = new Date().toISOString();
      } else {
        updateData.ended_at = new Date().toISOString();
      }
    }

    if (typeof traffic_split === "number") {
      if (traffic_split < 0 || traffic_split > 100) {
        return NextResponse.json(
          { error: "Traffic split deve ser entre 0 e 100" },
          { status: 400 },
        );
      }
      updateData.traffic_split = traffic_split;
    }

    if (name) {
      updateData.name = name;
    }

    // Update experiment
    const { data: experiment, error: updateError } = await supabase
      .from("agent_experiments")
      .update(updateData)
      .eq("id", id)
      .eq("client_id", profile.client_id)
      .select()
      .single();

    if (updateError) {
      // Check if it's a unique constraint violation (another active experiment)
      if (updateError.code === "23505") {
        return NextResponse.json(
          { error: "Já existe um experimento ativo. Desative-o primeiro." },
          { status: 409 },
        );
      }
      console.error("[PATCH /api/agents/experiments/[id]] Error:", updateError);
      return NextResponse.json(
        { error: "Erro ao atualizar experimento" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Experimento atualizado com sucesso",
      experiment,
    });
  } catch (error) {
    console.error(
      "[PATCH /api/agents/experiments/[id]] Unexpected error:",
      error,
    );
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
};

// DELETE - Delete experiment
export const DELETE = async (
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> => {
  try {
    const { id } = await params;
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

    // Check if experiment belongs to client and is not active
    const { data: experiment } = await supabase
      .from("agent_experiments")
      .select("id, is_active")
      .eq("id", id)
      .eq("client_id", profile.client_id)
      .single();

    if (!experiment) {
      return NextResponse.json(
        { error: "Experimento não encontrado" },
        { status: 404 },
      );
    }

    if (experiment.is_active) {
      return NextResponse.json(
        { error: "Não é possível excluir um experimento ativo" },
        { status: 400 },
      );
    }

    // Delete experiment (cascades to assignments)
    const { error: deleteError } = await supabase
      .from("agent_experiments")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error(
        "[DELETE /api/agents/experiments/[id]] Error:",
        deleteError,
      );
      return NextResponse.json(
        { error: "Erro ao excluir experimento" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Experimento excluído com sucesso",
    });
  } catch (error) {
    console.error(
      "[DELETE /api/agents/experiments/[id]] Unexpected error:",
      error,
    );
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
};

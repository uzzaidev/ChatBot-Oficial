/**
 * API Route: /api/agents/schedules
 *
 * GET - Get schedule configuration for client
 * PUT - Update schedule configuration
 */

import { createServerClient } from "@/lib/supabase";
import type { AgentScheduleRule } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET - Fetch schedule configuration
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

    // Fetch schedule (or create default if not exists)
    let { data: schedule, error: scheduleError } = await supabase
      .from("agent_schedules")
      .select("*")
      .eq("client_id", profile.client_id)
      .maybeSingle();

    if (scheduleError) {
      console.error("[GET /api/agents/schedules] Error:", scheduleError);
      return NextResponse.json(
        { error: "Erro ao buscar agendamento" },
        { status: 500 },
      );
    }

    // If no schedule exists, return default
    if (!schedule) {
      schedule = {
        id: null,
        client_id: profile.client_id,
        is_enabled: false,
        timezone: "America/Sao_Paulo",
        rules: [],
        default_agent_id: null,
        created_at: null,
        updated_at: null,
      };
    }

    // Fetch available agents for reference
    const { data: agents } = await supabase
      .from("agents")
      .select("id, name, avatar_emoji, is_active")
      .eq("client_id", profile.client_id)
      .eq("is_archived", false)
      .order("name");

    return NextResponse.json({
      schedule,
      agents: agents || [],
    });
  } catch (error) {
    console.error("[GET /api/agents/schedules] Unexpected error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
};

// PUT - Update schedule configuration
export const PUT = async (request: NextRequest): Promise<NextResponse> => {
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
    const { is_enabled, timezone, rules, default_agent_id } = body;

    // Validate rules format
    if (rules && Array.isArray(rules)) {
      for (const rule of rules as AgentScheduleRule[]) {
        if (!rule.agent_id || !rule.days || !rule.start || !rule.end) {
          return NextResponse.json(
            { error: "Regra inválida: campos obrigatórios faltando" },
            { status: 400 },
          );
        }
        if (
          !Array.isArray(rule.days) ||
          rule.days.some((d) => d < 0 || d > 6)
        ) {
          return NextResponse.json(
            { error: "Regra inválida: dias devem ser 0-6" },
            { status: 400 },
          );
        }
        if (
          !/^\d{2}:\d{2}$/.test(rule.start) ||
          !/^\d{2}:\d{2}$/.test(rule.end)
        ) {
          return NextResponse.json(
            { error: "Regra inválida: horário deve ser HH:MM" },
            { status: 400 },
          );
        }
      }
    }

    // Upsert schedule
    const { data: schedule, error: upsertError } = await supabase
      .from("agent_schedules")
      .upsert(
        {
          client_id: profile.client_id,
          is_enabled: is_enabled ?? false,
          timezone: timezone ?? "America/Sao_Paulo",
          rules: rules ?? [],
          default_agent_id: default_agent_id ?? null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "client_id",
        },
      )
      .select()
      .single();

    if (upsertError) {
      console.error("[PUT /api/agents/schedules] Error:", upsertError);
      return NextResponse.json(
        { error: "Erro ao salvar agendamento" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Agendamento salvo com sucesso",
      schedule,
    });
  } catch (error) {
    console.error("[PUT /api/agents/schedules] Unexpected error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
};

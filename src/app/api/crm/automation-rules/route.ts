import {
  AVAILABLE_ACTIONS,
  AVAILABLE_TRIGGERS,
} from "@/lib/crm-automation-constants";
import { createServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

// Helper to get supabase client with proper typing
const getSupabase = async () => {
  const client = await createServerClient();
  return client as any; // Type assertion for tables not in schema
};

export const dynamic = "force-dynamic";

// GET - Listar regras
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabase();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const includeMetadata = searchParams.get("includeMetadata") === "true";

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId is required" },
        { status: 400 },
      );
    }

    const { data: rules, error } = await supabase
      .from("crm_automation_rules")
      .select("*")
      .eq("client_id", clientId)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Incluir metadata de triggers e actions disponíveis
    if (includeMetadata) {
      return NextResponse.json({
        rules: rules || [],
        triggers: AVAILABLE_TRIGGERS,
        actions: AVAILABLE_ACTIONS,
      });
    }

    return NextResponse.json({ rules: rules || [] });
  } catch (error) {
    console.error("Error fetching automation rules:", error);
    return NextResponse.json(
      { error: "Failed to fetch automation rules" },
      { status: 500 },
    );
  }
}

// POST - Criar regra
export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabase();
    const body = await request.json();

    const {
      clientId,
      name,
      description,
      triggerType,
      triggerConditions,
      actionType,
      actionParams,
      isActive = true,
      priority = 0,
    } = body;

    if (!clientId || !name || !triggerType || !actionType) {
      return NextResponse.json(
        { error: "clientId, name, triggerType, and actionType are required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("crm_automation_rules")
      .insert({
        client_id: clientId,
        name,
        description,
        trigger_type: triggerType,
        trigger_conditions: triggerConditions || {},
        action_type: actionType,
        action_params: actionParams || {},
        is_active: isActive,
        priority,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Uma regra com este nome já existe" },
          { status: 409 },
        );
      }
      throw error;
    }

    return NextResponse.json({ rule: data });
  } catch (error) {
    console.error("Error creating automation rule:", error);
    return NextResponse.json(
      { error: "Failed to create automation rule" },
      { status: 500 },
    );
  }
}

// PATCH - Atualizar regra
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await getSupabase();
    const body = await request.json();

    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Rule id is required" },
        { status: 400 },
      );
    }

    // Mapear campos para snake_case
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined)
      dbUpdates.description = updates.description;
    if (updates.triggerType !== undefined)
      dbUpdates.trigger_type = updates.triggerType;
    if (updates.triggerConditions !== undefined)
      dbUpdates.trigger_conditions = updates.triggerConditions;
    if (updates.actionType !== undefined)
      dbUpdates.action_type = updates.actionType;
    if (updates.actionParams !== undefined)
      dbUpdates.action_params = updates.actionParams;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;

    const { data, error } = await supabase
      .from("crm_automation_rules")
      .update(dbUpdates)
      .eq("id", id)
      .eq("is_system", false) // Não pode editar regras do sistema
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { error: "Regra não encontrada ou é uma regra do sistema" },
        { status: 404 },
      );
    }

    return NextResponse.json({ rule: data });
  } catch (error) {
    console.error("Error updating automation rule:", error);
    return NextResponse.json(
      { error: "Failed to update automation rule" },
      { status: 500 },
    );
  }
}

// DELETE - Remover regra
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await getSupabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Rule id is required" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("crm_automation_rules")
      .delete()
      .eq("id", id)
      .eq("is_system", false); // Não pode deletar regras do sistema

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting automation rule:", error);
    return NextResponse.json(
      { error: "Failed to delete automation rule" },
      { status: 500 },
    );
  }
}

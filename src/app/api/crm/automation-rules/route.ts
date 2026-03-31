import {
  AVAILABLE_ACTIONS,
  AVAILABLE_TRIGGERS,
} from "@/lib/crm-automation-constants";
import { createServerClient, getClientIdFromSession } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

const VALID_TRIGGER_IDS = new Set(AVAILABLE_TRIGGERS.map((t) => t.id));
const VALID_ACTION_IDS = new Set(AVAILABLE_ACTIONS.map((a) => a.id));

export const dynamic = "force-dynamic";

const getSupabase = async () => {
  const client = await createServerClient();
  return client as any;
};

const isMissingColumnError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  return (error as { code?: string }).code === "42703";
};

const ensureClientId = async (request: NextRequest): Promise<string | null> => {
  return getClientIdFromSession(request);
};

const toActionSteps = (payload: {
  actionType?: unknown;
  actionParams?: unknown;
  actionSteps?: unknown;
}): Array<Record<string, unknown>> => {
  if (Array.isArray(payload.actionSteps) && payload.actionSteps.length > 0) {
    return payload.actionSteps
      .filter((step) => step && typeof step === "object")
      .map((step) => {
        const stepObj = step as Record<string, unknown>;
        return {
          action_type: stepObj.action_type,
          action_params:
            stepObj.action_params && typeof stepObj.action_params === "object"
              ? stepObj.action_params
              : {},
          on_error: stepObj.on_error === "continue" ? "continue" : "stop",
        };
      });
  }

  if (typeof payload.actionType === "string" && payload.actionType.length > 0) {
    return [
      {
        action_type: payload.actionType,
        action_params:
          payload.actionParams && typeof payload.actionParams === "object"
            ? (payload.actionParams as Record<string, unknown>)
            : {},
        on_error: "stop",
      },
    ];
  }

  return [];
};

const normalizeRuleForInsert = (input: {
  clientId: string;
  name: string;
  description?: string | null;
  triggerType: string;
  triggerConditions?: Record<string, unknown>;
  conditionTree?: Record<string, unknown> | null;
  actionType?: string;
  actionParams?: Record<string, unknown>;
  actionSteps?: Array<Record<string, unknown>>;
  isActive?: boolean;
  priority?: number;
}) => {
  const actionSteps = toActionSteps({
    actionType: input.actionType,
    actionParams: input.actionParams,
    actionSteps: input.actionSteps,
  });

  const firstStep = actionSteps[0] ?? null;

  return {
    client_id: input.clientId,
    name: input.name,
    description: input.description ?? null,
    trigger_type: input.triggerType,
    trigger_conditions: input.triggerConditions ?? {},
    condition_tree: input.conditionTree ?? null,
    action_type:
      typeof firstStep?.action_type === "string" ? firstStep.action_type : null,
    action_params:
      firstStep?.action_params && typeof firstStep.action_params === "object"
        ? firstStep.action_params
        : {},
    action_steps: actionSteps,
    is_active: input.isActive ?? true,
    priority: input.priority ?? 0,
  };
};

const validateActions = (steps: Array<Record<string, unknown>>): string | null => {
  if (steps.length === 0) return "At least one action is required";

  for (const step of steps) {
    const actionType =
      typeof step.action_type === "string" ? step.action_type : "";
    if (!actionType || !VALID_ACTION_IDS.has(actionType)) {
      return `Invalid action type: ${actionType || "(empty)"}`;
    }
  }

  return null;
};

// GET - Listar regras
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabase();
    const clientId = await ensureClientId(request);
    const { searchParams } = new URL(request.url);
    const includeMetadata = searchParams.get("includeMetadata") === "true";

    if (!clientId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: rules, error } = await supabase
      .from("crm_automation_rules")
      .select("*")
      .eq("client_id", clientId)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) throw error;

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
    const clientId = await ensureClientId(request);
    const body = await request.json();

    if (!clientId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      name,
      description,
      triggerType,
      triggerConditions,
      conditionTree,
      actionType,
      actionParams,
      actionSteps,
      isActive = true,
      priority = 0,
    } = body;

    if (!name || !triggerType) {
      return NextResponse.json(
        { error: "name and triggerType are required" },
        { status: 400 },
      );
    }

    if (!VALID_TRIGGER_IDS.has(triggerType)) {
      return NextResponse.json(
        { error: `Invalid trigger type: ${triggerType}` },
        { status: 400 },
      );
    }

    const normalized = normalizeRuleForInsert({
      clientId,
      name,
      description,
      triggerType,
      triggerConditions,
      conditionTree,
      actionType,
      actionParams,
      actionSteps,
      isActive,
      priority,
    });

    const actionError = validateActions(normalized.action_steps);
    if (actionError) {
      return NextResponse.json({ error: actionError }, { status: 400 });
    }

    let insertResult = await supabase
      .from("crm_automation_rules")
      .insert(normalized)
      .select()
      .single();

    if (insertResult.error && isMissingColumnError(insertResult.error)) {
      // Backward compatibility if migration has not been applied yet
      const fallbackPayload = {
        client_id: normalized.client_id,
        name: normalized.name,
        description: normalized.description,
        trigger_type: normalized.trigger_type,
        trigger_conditions: normalized.trigger_conditions,
        action_type: normalized.action_type,
        action_params: normalized.action_params,
        is_active: normalized.is_active,
        priority: normalized.priority,
      };

      insertResult = await supabase
        .from("crm_automation_rules")
        .insert(fallbackPayload)
        .select()
        .single();
    }

    if (insertResult.error) {
      if (insertResult.error.code === "23505") {
        return NextResponse.json(
          { error: "Uma regra com este nome ja existe" },
          { status: 409 },
        );
      }
      throw insertResult.error;
    }

    return NextResponse.json({ rule: insertResult.data });
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
    const clientId = await ensureClientId(request);
    const body = await request.json();

    if (!clientId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Rule id is required" }, { status: 400 });
    }

    if (updates.triggerType && !VALID_TRIGGER_IDS.has(updates.triggerType)) {
      return NextResponse.json(
        { error: `Invalid trigger type: ${updates.triggerType}` },
        { status: 400 },
      );
    }

    const dbUpdates: Record<string, unknown> = {};

    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.triggerType !== undefined) dbUpdates.trigger_type = updates.triggerType;
    if (updates.triggerConditions !== undefined)
      dbUpdates.trigger_conditions = updates.triggerConditions;
    if (updates.conditionTree !== undefined)
      dbUpdates.condition_tree = updates.conditionTree;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;

    const hasActionChange =
      updates.actionType !== undefined ||
      updates.actionParams !== undefined ||
      updates.actionSteps !== undefined;

    if (hasActionChange) {
      const steps = toActionSteps({
        actionType: updates.actionType,
        actionParams: updates.actionParams,
        actionSteps: updates.actionSteps,
      });

      const actionError = validateActions(steps);
      if (actionError) {
        return NextResponse.json({ error: actionError }, { status: 400 });
      }

      dbUpdates.action_steps = steps;
      dbUpdates.action_type = typeof steps[0]?.action_type === "string" ? steps[0].action_type : null;
      dbUpdates.action_params =
        steps[0]?.action_params && typeof steps[0].action_params === "object"
          ? steps[0].action_params
          : {};
    }

    let updateResult = await supabase
      .from("crm_automation_rules")
      .update(dbUpdates)
      .eq("id", id)
      .eq("client_id", clientId)
      .eq("is_system", false)
      .select()
      .single();

    if (updateResult.error && isMissingColumnError(updateResult.error)) {
      const fallbackUpdates = { ...dbUpdates };
      delete fallbackUpdates.condition_tree;
      delete fallbackUpdates.action_steps;

      updateResult = await supabase
        .from("crm_automation_rules")
        .update(fallbackUpdates)
        .eq("id", id)
        .eq("client_id", clientId)
        .eq("is_system", false)
        .select()
        .single();
    }

    if (updateResult.error) throw updateResult.error;

    if (!updateResult.data) {
      return NextResponse.json(
        { error: "Regra nao encontrada ou e uma regra do sistema" },
        { status: 404 },
      );
    }

    return NextResponse.json({ rule: updateResult.data });
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
    const clientId = await ensureClientId(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!clientId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!id) {
      return NextResponse.json({ error: "Rule id is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("crm_automation_rules")
      .delete()
      .eq("id", id)
      .eq("client_id", clientId)
      .eq("is_system", false);

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

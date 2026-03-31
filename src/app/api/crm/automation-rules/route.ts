import {
  AVAILABLE_ACTIONS,
  AVAILABLE_TRIGGERS,
} from "@/lib/crm-automation-constants";
import { clearCrmAutomationRuleCache } from "@/lib/crm-automation-engine";
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
          on_error:
            stepObj.on_error === "continue"
              ? "continue"
              : stepObj.on_error === "compensate"
                ? "compensate"
                : "stop",
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

const normalizeTriggerConditions = (
  triggerType: string,
  conditions: Record<string, unknown> | undefined,
): Record<string, unknown> => {
  const next: Record<string, unknown> = { ...(conditions || {}) };

  if (triggerType === "keyword_detected") {
    const rawKeywords = next.keywords;
    if (Array.isArray(rawKeywords)) {
      next.keywords = rawKeywords
        .map((item) => String(item ?? "").trim())
        .filter(Boolean);
    } else if (typeof rawKeywords === "string") {
      next.keywords = rawKeywords
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    if (next.match_mode !== "all" && next.match_mode !== "any") {
      next.match_mode = "any";
    }
  }

  if (triggerType === "intent_detected" || triggerType === "urgency_detected") {
    const rawMin = Number(next.confidence_min);
    if (Number.isFinite(rawMin)) {
      next.confidence_min = Math.max(0, Math.min(1, rawMin));
    } else if (next.confidence_min !== undefined) {
      next.confidence_min = 0;
    }
  }

  return next;
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
    trigger_conditions: normalizeTriggerConditions(
      input.triggerType,
      input.triggerConditions,
    ),
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

const VALID_JSONLOGIC_OPERATORS = new Set([
  "var",
  "and",
  "or",
  "!",
  "not",
  "==",
  "!=",
  ">",
  ">=",
  "<",
  "<=",
  "in",
]);

const validateConditionTreeNode = (node: unknown, path = "$"): string | null => {
  if (node === null || node === undefined) return null;
  if (typeof node !== "object") return null;

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const error = validateConditionTreeNode(node[i], `${path}[${i}]`);
      if (error) return error;
    }
    return null;
  }

  const entries = Object.entries(node as Record<string, unknown>);
  if (entries.length !== 1) {
    return `${path} must have exactly one JsonLogic operator`;
  }

  const [op, value] = entries[0];
  if (!VALID_JSONLOGIC_OPERATORS.has(op)) {
    return `${path}.${op} is not a supported operator`;
  }

  if (op === "var") {
    if (typeof value === "string") return null;
    if (
      Array.isArray(value) &&
      value.length >= 1 &&
      typeof value[0] === "string"
    ) {
      return null;
    }
    return `${path}.var must be a string or [string, fallback]`;
  }

  if (op === "and" || op === "or") {
    if (!Array.isArray(value) || value.length === 0) {
      return `${path}.${op} must be a non-empty array`;
    }
    for (let i = 0; i < value.length; i++) {
      const error = validateConditionTreeNode(value[i], `${path}.${op}[${i}]`);
      if (error) return error;
    }
    return null;
  }

  if (op === "!" || op === "not") {
    return validateConditionTreeNode(value, `${path}.${op}`);
  }

  if (!Array.isArray(value) || value.length < 2) {
    return `${path}.${op} must be an array with two operands`;
  }

  for (let i = 0; i < value.length; i++) {
    const error = validateConditionTreeNode(value[i], `${path}.${op}[${i}]`);
    if (error) return error;
  }

  return null;
};

const validateConditionTree = (tree: unknown): string | null => {
  if (tree === null || tree === undefined) return null;
  if (typeof tree !== "object" || Array.isArray(tree)) {
    return "condition_tree must be a JSON object";
  }

  return validateConditionTreeNode(tree, "$");
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

    const conditionTreeError = validateConditionTree(conditionTree);
    if (conditionTreeError) {
      return NextResponse.json(
        { error: `condition_tree invalido: ${conditionTreeError}` },
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

    clearCrmAutomationRuleCache(clientId, triggerType);

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

    const { data: existingRule, error: existingRuleError } = await supabase
      .from("crm_automation_rules")
      .select("id, trigger_type, is_system")
      .eq("id", id)
      .eq("client_id", clientId)
      .single();

    if (existingRuleError || !existingRule) {
      return NextResponse.json({ error: "Regra nao encontrada" }, { status: 404 });
    }

    if (existingRule.is_system) {
      return NextResponse.json(
        { error: "Regra do sistema nao pode ser editada" },
        { status: 403 },
      );
    }

    if (updates.triggerType && !VALID_TRIGGER_IDS.has(updates.triggerType)) {
      return NextResponse.json(
        { error: `Invalid trigger type: ${updates.triggerType}` },
        { status: 400 },
      );
    }

    if (updates.conditionTree !== undefined) {
      const conditionTreeError = validateConditionTree(updates.conditionTree);
      if (conditionTreeError) {
        return NextResponse.json(
          { error: `condition_tree invalido: ${conditionTreeError}` },
          { status: 400 },
        );
      }
    }

    const dbUpdates: Record<string, unknown> = {};

    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.triggerType !== undefined) dbUpdates.trigger_type = updates.triggerType;
    if (updates.triggerConditions !== undefined)
      dbUpdates.trigger_conditions = normalizeTriggerConditions(
        updates.triggerType ?? existingRule.trigger_type,
        updates.triggerConditions,
      );
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

    clearCrmAutomationRuleCache(clientId);

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

    clearCrmAutomationRuleCache(clientId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting automation rule:", error);
    return NextResponse.json(
      { error: "Failed to delete automation rule" },
      { status: 500 },
    );
  }
}

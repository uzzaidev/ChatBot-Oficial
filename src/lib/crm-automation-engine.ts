import { createHash, randomUUID } from "crypto";
import { getClient, query } from "@/lib/postgres";
import { createServiceRoleClient } from "@/lib/supabase";

type JsonRecord = Record<string, unknown>;
type OnErrorPolicy = "continue" | "stop";
type ExecutionStatus = "success" | "failed" | "skipped";

export interface EmitAutomationEventInput {
  clientId: string;
  cardId: string;
  triggerType: string;
  triggerData?: JsonRecord;
  traceId?: string;
  depth?: number;
  dedupeKey?: string;
}

export interface EmitAutomationEventResult {
  processed: boolean;
  matchedRules: number;
  executedRules: number;
  skippedRules: number;
  failedRules: number;
  reason?: string;
}

interface AutomationRuleRow {
  id: string;
  client_id: string;
  name: string;
  trigger_type: string;
  trigger_conditions: JsonRecord | null;
  condition_tree: JsonRecord | null;
  action_type: string | null;
  action_params: JsonRecord | null;
  action_steps: unknown;
  is_active: boolean;
  priority: number;
  version?: number | null;
}

interface ActionStep {
  action_type: string;
  action_params: JsonRecord;
  on_error?: OnErrorPolicy;
}

const MAX_TRACE_DEPTH = 3;

const LEGACY_AUTO_STATUS_MAP: Record<string, string> = {
  awaiting_response: "awaiting_client",
  in_service: "awaiting_attendant",
  resolved: "resolved",
};

const canonicalizeStatus = (status: unknown): string | null => {
  if (typeof status !== "string" || status.trim().length === 0) {
    return null;
  }

  const normalized = status.trim();
  return LEGACY_AUTO_STATUS_MAP[normalized] ?? normalized;
};

const isMissingDbObjectError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  return code === "42P01" || code === "42703";
};

const stableStringify = (value: unknown): string => {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([a], [b]) => a.localeCompare(b),
    );
    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};

const buildEventHash = (payload: {
  clientId: string;
  cardId: string;
  triggerType: string;
  triggerData: JsonRecord;
  traceId: string;
  depth: number;
}): string => {
  const serialized = stableStringify(payload);
  return createHash("sha256").update(serialized).digest("hex");
};

const interpolateTemplate = (
  template: string,
  variables: JsonRecord,
): string => {
  return template.replace(/\{\{\s*([^}\s]+)\s*\}\}/g, (_match, key: string) => {
    const value = variables[key];
    return value === undefined || value === null ? "" : String(value);
  });
};

const toInt = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value);
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toBoolean = (value: unknown): boolean | null => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return null;
};

const evaluateJsonLogic = (logic: unknown, data: JsonRecord): unknown => {
  if (logic === null || logic === undefined) return logic;
  if (Array.isArray(logic)) {
    return logic.map((item) => evaluateJsonLogic(item, data));
  }
  if (typeof logic !== "object") return logic;

  const entries = Object.entries(logic as JsonRecord);
  if (entries.length !== 1) return logic;

  const [operator, rawValue] = entries[0];
  const value = rawValue as unknown;

  if (operator === "var") {
    if (typeof value === "string") return data[value];
    if (Array.isArray(value) && value.length > 0) {
      const key = String(value[0]);
      const fallback = value[1];
      return data[key] ?? fallback;
    }
    return undefined;
  }

  if (operator === "and" && Array.isArray(value)) {
    for (const operand of value) {
      const result = evaluateJsonLogic(operand, data);
      if (!result) return result;
    }
    return value.length > 0 ? evaluateJsonLogic(value[value.length - 1], data) : true;
  }

  if (operator === "or" && Array.isArray(value)) {
    for (const operand of value) {
      const result = evaluateJsonLogic(operand, data);
      if (result) return result;
    }
    return false;
  }

  if (operator === "!" || operator === "not") {
    return !evaluateJsonLogic(value, data);
  }

  const operands = Array.isArray(value) ? value : [value];
  const [leftRaw, rightRaw] = operands;
  const left = evaluateJsonLogic(leftRaw, data);
  const right = evaluateJsonLogic(rightRaw, data);

  switch (operator) {
    case "==":
      return left === right;
    case "!=":
      return left !== right;
    case ">":
      return Number(left) > Number(right);
    case ">=":
      return Number(left) >= Number(right);
    case "<":
      return Number(left) < Number(right);
    case "<=":
      return Number(left) <= Number(right);
    case "in":
      if (Array.isArray(right)) return right.includes(left);
      if (typeof right === "string") return right.includes(String(left ?? ""));
      return false;
    default:
      return false;
  }
};

const matchesTriggerConditions = (
  rule: AutomationRuleRow,
  triggerType: string,
  triggerData: JsonRecord,
): boolean => {
  const conditions = (rule.trigger_conditions ?? {}) as JsonRecord;
  const hasConditions = Object.keys(conditions).length > 0;

  if (hasConditions) {
    if (triggerType === "inactivity") {
      const inactiveDays = toInt(triggerData.inactive_days) ?? 0;
      const requiredDays = toInt(conditions.inactivity_days) ?? 1;
      if (inactiveDays < requiredDays) return false;
    } else if (triggerType === "status_change") {
      const fromExpected = conditions.from_status;
      const toExpected = conditions.to_status;
      if (
        fromExpected !== undefined &&
        String(fromExpected) !== String(triggerData.from_status ?? "")
      ) {
        return false;
      }
      if (
        toExpected !== undefined &&
        String(toExpected) !== String(triggerData.to_status ?? "")
      ) {
        return false;
      }
    } else if (triggerType === "lead_source") {
      const sourceType = conditions.source_type;
      if (
        sourceType !== undefined &&
        String(sourceType) !== String(triggerData.source_type ?? "")
      ) {
        return false;
      }
    } else if (triggerType === "tag_added") {
      const tagId = conditions.tag_id;
      if (tagId !== undefined && String(tagId) !== String(triggerData.tag_id ?? "")) {
        return false;
      }
    } else if (triggerType === "card_moved") {
      const fromColumnId = conditions.from_column_id;
      const toColumnId = conditions.to_column_id;
      if (
        fromColumnId !== undefined &&
        String(fromColumnId) !== String(triggerData.from_column_id ?? "")
      ) {
        return false;
      }
      if (
        toColumnId !== undefined &&
        String(toColumnId) !== String(triggerData.to_column_id ?? "")
      ) {
        return false;
      }
    } else if (triggerType === "message_received") {
      const expectedFirstMessage = toBoolean(conditions.is_first_message);
      if (expectedFirstMessage !== null) {
        const gotFirstMessage = toBoolean(triggerData.is_first_message) ?? false;
        if (expectedFirstMessage !== gotFirstMessage) return false;
      }
    } else {
      for (const [key, value] of Object.entries(conditions)) {
        if (value === undefined) continue;
        if (String(value) !== String(triggerData[key] ?? "")) return false;
      }
    }
  }

  if (rule.condition_tree && typeof rule.condition_tree === "object") {
    const treeResult = evaluateJsonLogic(rule.condition_tree, triggerData);
    if (!treeResult) return false;
  }

  return true;
};

const getActionSteps = (rule: AutomationRuleRow): ActionStep[] => {
  if (Array.isArray(rule.action_steps) && rule.action_steps.length > 0) {
    return rule.action_steps
      .filter((step): step is ActionStep => {
        if (!step || typeof step !== "object") return false;
        const actionType = (step as ActionStep).action_type;
        return typeof actionType === "string" && actionType.length > 0;
      })
      .map((step) => ({
        action_type: step.action_type,
        action_params:
          step.action_params && typeof step.action_params === "object"
            ? step.action_params
            : {},
        on_error: step.on_error === "continue" ? "continue" : "stop",
      }));
  }

  if (rule.action_type) {
    return [
      {
        action_type: rule.action_type,
        action_params:
          rule.action_params && typeof rule.action_params === "object"
            ? rule.action_params
            : {},
      },
    ];
  }

  return [];
};

const resolveTagId = async (
  clientId: string,
  actionParams: JsonRecord,
): Promise<string | null> => {
  const explicitTagId =
    typeof actionParams.tag_id === "string" ? actionParams.tag_id : null;
  if (explicitTagId) return explicitTagId;

  const tagName =
    typeof actionParams.tag_name === "string"
      ? actionParams.tag_name.trim()
      : "";
  if (!tagName) return null;

  const existing = await query<{ id: string }>(
    `SELECT id FROM crm_tags WHERE client_id = $1 AND name = $2 LIMIT 1`,
    [clientId, tagName],
  );
  if (existing.rows[0]?.id) return existing.rows[0].id;

  const createIfMissing =
    toBoolean(actionParams.create_if_not_exists) === true ||
    toBoolean(actionParams.createIfNotExists) === true;

  if (!createIfMissing) return null;

  const insert = await query<{ id: string }>(
    `INSERT INTO crm_tags (client_id, name, color)
     VALUES ($1, $2, $3)
     ON CONFLICT (client_id, name) DO UPDATE SET updated_at = NOW()
     RETURNING id`,
    [clientId, tagName, "#6366f1"],
  );

  return insert.rows[0]?.id ?? null;
};

const executeActionStep = async (
  clientId: string,
  cardId: string,
  step: ActionStep,
  variables: JsonRecord,
): Promise<JsonRecord> => {
  const actionType = step.action_type;
  const actionParams = step.action_params ?? {};

  switch (actionType) {
    case "move_to_column": {
      const columnId =
        typeof actionParams.column_id === "string" ? actionParams.column_id : null;
      if (!columnId) {
        throw new Error("move_to_column requires action_params.column_id");
      }
      const position = toInt(actionParams.position);
      await query(`SELECT crm_move_card($1, $2, $3)`, [
        cardId,
        columnId,
        position,
      ]);
      return { moved_to_column_id: columnId, position: position ?? null };
    }

    case "add_tag": {
      const tagId = await resolveTagId(clientId, actionParams);
      if (!tagId) {
        throw new Error("add_tag requires tag_id or tag_name");
      }
      await query(
        `INSERT INTO crm_card_tags (card_id, tag_id)
         VALUES ($1, $2)
         ON CONFLICT (card_id, tag_id) DO NOTHING`,
        [cardId, tagId],
      );
      return { tag_id: tagId };
    }

    case "remove_tag": {
      const tagId = await resolveTagId(clientId, actionParams);
      if (!tagId) {
        throw new Error("remove_tag requires tag_id or tag_name");
      }
      await query(`DELETE FROM crm_card_tags WHERE card_id = $1 AND tag_id = $2`, [
        cardId,
        tagId,
      ]);
      return { tag_id: tagId };
    }

    case "assign_to": {
      const userId =
        typeof actionParams.user_id === "string" ? actionParams.user_id : null;
      if (!userId) {
        throw new Error("assign_to requires action_params.user_id");
      }
      await query(
        `UPDATE crm_cards SET assigned_to = $1, updated_at = NOW() WHERE id = $2`,
        [userId, cardId],
      );
      return { assigned_to: userId };
    }

    case "update_auto_status": {
      const normalized = canonicalizeStatus(actionParams.auto_status);
      if (!normalized) {
        throw new Error("update_auto_status requires action_params.auto_status");
      }
      await query(
        `UPDATE crm_cards
         SET auto_status = $1, auto_status_updated_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [normalized, cardId],
      );
      return { auto_status: normalized };
    }

    case "log_activity": {
      const activityType =
        typeof actionParams.activity_type === "string"
          ? actionParams.activity_type
          : "system";
      const contentRaw =
        typeof actionParams.content === "string" ? actionParams.content : "";
      if (!contentRaw) {
        throw new Error("log_activity requires action_params.content");
      }
      const content = interpolateTemplate(contentRaw, variables);

      await query(
        `INSERT INTO crm_card_activities (client_id, card_id, activity_type, content, metadata)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [clientId, cardId, activityType, content, JSON.stringify({ automation: true })],
      );
      return { activity_type: activityType };
    }

    case "add_note": {
      const noteRaw =
        typeof actionParams.note_content === "string"
          ? actionParams.note_content
          : typeof actionParams.content === "string"
            ? actionParams.content
            : "";
      if (!noteRaw) {
        throw new Error("add_note requires action_params.note_content");
      }
      const content = interpolateTemplate(noteRaw, variables);
      await query(
        `INSERT INTO crm_card_notes (client_id, card_id, content)
         VALUES ($1, $2, $3)`,
        [clientId, cardId, content],
      );
      return { note_created: true };
    }

    default:
      throw new Error(`Unsupported action type: ${actionType}`);
  }
};

const isEngineEnabledForClient = async (clientId: string): Promise<boolean> => {
  try {
    const globalFlag = await query<{ enabled: boolean }>(
      `SELECT enabled FROM feature_flags WHERE key = 'crm_engine_v2_enabled' LIMIT 1`,
    );
    if (globalFlag.rows.length > 0 && globalFlag.rows[0].enabled === false) {
      return false;
    }
  } catch (error) {
    if (!isMissingDbObjectError(error)) {
      throw error;
    }
    return true;
  }

  try {
    const tenantFlag = await query<{ crm_engine_v2: boolean }>(
      `SELECT crm_engine_v2 FROM clients WHERE id = $1 LIMIT 1`,
      [clientId],
    );
    if (tenantFlag.rows.length > 0) {
      return tenantFlag.rows[0].crm_engine_v2 !== false;
    }
  } catch (error) {
    if (!isMissingDbObjectError(error)) {
      throw error;
    }
    return true;
  }

  return true;
};

const withCardLock = async <T>(
  cardId: string,
  fn: () => Promise<T>,
): Promise<{ locked: boolean; result?: T }> => {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    const lockResult = await client.query<{ locked: boolean }>(
      `SELECT pg_try_advisory_xact_lock(hashtext($1)) AS locked`,
      [`crm_automation:${cardId}`],
    );
    const locked = lockResult.rows[0]?.locked === true;
    if (!locked) {
      await client.query("ROLLBACK");
      return { locked: false };
    }

    const result = await fn();
    await client.query("COMMIT");
    return { locked: true, result };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore rollback errors
    }
    throw error;
  } finally {
    client.release();
  }
};

const logRuleExecution = async (params: {
  clientId: string;
  ruleId: string;
  ruleVersion: number;
  cardId: string;
  triggerType: string;
  triggerData: JsonRecord;
  status: ExecutionStatus;
  actionResult?: JsonRecord;
  errorMessage?: string;
  skipReason?: string;
  eventId: string;
  eventHash: string;
  dedupeKey: string;
  traceId: string;
  depth: number;
}) => {
  const supabase = createServiceRoleClient() as any;

  const payload = {
    client_id: params.clientId,
    rule_id: params.ruleId,
    rule_version: params.ruleVersion,
    card_id: params.cardId,
    trigger_data: params.triggerData,
    action_result: params.actionResult ?? null,
    result: params.actionResult ?? null,
    status: params.status,
    error_message: params.errorMessage ?? null,
    skip_reason: params.skipReason ?? null,
    event_id: params.eventId,
    event_type: params.triggerType,
    event_hash: params.eventHash,
    dedupe_key: params.dedupeKey,
    trace_id: params.traceId,
    depth: params.depth,
    executed_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("crm_rule_executions").insert(payload);
  if (error && isMissingDbObjectError(error)) {
    const legacyPayload = {
      client_id: params.clientId,
      rule_id: params.ruleId,
      card_id: params.cardId,
      trigger_data: params.triggerData,
      action_result: params.actionResult ?? null,
      status: params.status,
      error_message: params.errorMessage ?? null,
      executed_at: new Date().toISOString(),
    };
    const legacyInsert = await supabase
      .from("crm_rule_executions")
      .insert(legacyPayload);
    if (!legacyInsert.error) {
      return;
    }
    console.error(
      "[crm-automation] failed to log rule execution (legacy fallback)",
      legacyInsert.error,
    );
    return;
  }

  if (error) {
    console.error("[crm-automation] failed to log rule execution", error);
  }
};

export const emitCrmAutomationEvent = async (
  input: EmitAutomationEventInput,
): Promise<EmitAutomationEventResult> => {
  const triggerData: JsonRecord = input.triggerData ?? {};
  const traceId = input.traceId ?? randomUUID();
  const depth = input.depth ?? 0;
  const eventId = randomUUID();

  if (!input.clientId || !input.cardId || !input.triggerType) {
    return {
      processed: false,
      matchedRules: 0,
      executedRules: 0,
      skippedRules: 0,
      failedRules: 0,
      reason: "missing_required_fields",
    };
  }

  const enabled = await isEngineEnabledForClient(input.clientId);
  if (!enabled) {
    return {
      processed: false,
      matchedRules: 0,
      executedRules: 0,
      skippedRules: 0,
      failedRules: 0,
      reason: "engine_disabled",
    };
  }

  const eventHash = buildEventHash({
    clientId: input.clientId,
    cardId: input.cardId,
    triggerType: input.triggerType,
    triggerData,
    traceId,
    depth,
  });
  const dedupeKey = input.dedupeKey ?? eventHash;

  let rules: AutomationRuleRow[] = [];
  try {
    const rulesResult = await query<AutomationRuleRow>(
      `SELECT
          id, client_id, name, trigger_type, trigger_conditions, condition_tree,
          action_type, action_params, action_steps, is_active, priority, version
       FROM crm_automation_rules
       WHERE client_id = $1
         AND trigger_type = $2
         AND is_active = true
       ORDER BY priority DESC, created_at ASC`,
      [input.clientId, input.triggerType],
    );
    rules = rulesResult.rows;
  } catch (error) {
    if (!isMissingDbObjectError(error)) {
      throw error;
    }

    const legacyRules = await query<
      Omit<AutomationRuleRow, "condition_tree" | "action_steps" | "version">
    >(
      `SELECT
          id, client_id, name, trigger_type, trigger_conditions,
          action_type, action_params, is_active, priority
       FROM crm_automation_rules
       WHERE client_id = $1
         AND trigger_type = $2
         AND is_active = true
       ORDER BY priority DESC, created_at ASC`,
      [input.clientId, input.triggerType],
    );

    rules = legacyRules.rows.map((row) => ({
      ...row,
      condition_tree: null,
      action_steps: [],
      version: 1,
    }));
  }

  if (rules.length === 0) {
    return {
      processed: true,
      matchedRules: 0,
      executedRules: 0,
      skippedRules: 0,
      failedRules: 0,
    };
  }

  if (depth > MAX_TRACE_DEPTH) {
    for (const rule of rules) {
      await logRuleExecution({
        clientId: input.clientId,
        ruleId: rule.id,
        ruleVersion: rule.version ?? 1,
        cardId: input.cardId,
        triggerType: input.triggerType,
        triggerData,
        status: "skipped",
        skipReason: "loop_guard_depth_exceeded",
        eventId,
        eventHash,
        dedupeKey,
        traceId,
        depth,
      });
    }
    return {
      processed: true,
      matchedRules: rules.length,
      executedRules: 0,
      skippedRules: rules.length,
      failedRules: 0,
      reason: "loop_guard_depth_exceeded",
    };
  }

  const lockResult = await withCardLock(input.cardId, async () => {
    let matchedRules = 0;
    let executedRules = 0;
    let skippedRules = 0;
    let failedRules = 0;

    for (const rule of rules) {
      const matches = matchesTriggerConditions(rule, input.triggerType, triggerData);
      if (!matches) continue;

      matchedRules++;

      let isDuplicate = false;
      try {
        const duplicateCheck = await query<{ id: string }>(
          `SELECT id
           FROM crm_rule_executions
           WHERE client_id = $1
             AND rule_id = $2
             AND dedupe_key = $3
             AND status = 'success'
           LIMIT 1`,
          [input.clientId, rule.id, dedupeKey],
        );
        isDuplicate = duplicateCheck.rows.length > 0;
      } catch (error) {
        if (!isMissingDbObjectError(error)) {
          throw error;
        }
        isDuplicate = false;
      }

      if (isDuplicate) {
        skippedRules++;
        await logRuleExecution({
          clientId: input.clientId,
          ruleId: rule.id,
          ruleVersion: rule.version ?? 1,
          cardId: input.cardId,
          triggerType: input.triggerType,
          triggerData,
          status: "skipped",
          skipReason: "duplicate_event",
          eventId,
          eventHash,
          dedupeKey,
          traceId,
          depth,
        });
        continue;
      }

      const steps = getActionSteps(rule);
      if (steps.length === 0) {
        skippedRules++;
        await logRuleExecution({
          clientId: input.clientId,
          ruleId: rule.id,
          ruleVersion: rule.version ?? 1,
          cardId: input.cardId,
          triggerType: input.triggerType,
          triggerData,
          status: "skipped",
          skipReason: "no_action_steps",
          eventId,
          eventHash,
          dedupeKey,
          traceId,
          depth,
        });
        continue;
      }

      const stepResults: JsonRecord[] = [];
      let ruleFailed = false;
      let failureMessage = "";

      for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
        const step = steps[stepIndex];
        try {
          const result = await executeActionStep(
            input.clientId,
            input.cardId,
            step,
            triggerData,
          );
          stepResults.push({
            step_index: stepIndex,
            action_type: step.action_type,
            status: "success",
            result,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown action error";
          stepResults.push({
            step_index: stepIndex,
            action_type: step.action_type,
            status: "failed",
            error: message,
          });

          if (step.on_error !== "continue") {
            ruleFailed = true;
            failureMessage = message;
            break;
          }
        }
      }

      if (ruleFailed) {
        failedRules++;
        await logRuleExecution({
          clientId: input.clientId,
          ruleId: rule.id,
          ruleVersion: rule.version ?? 1,
          cardId: input.cardId,
          triggerType: input.triggerType,
          triggerData,
          status: "failed",
          errorMessage: failureMessage,
          actionResult: { steps: stepResults },
          eventId,
          eventHash,
          dedupeKey,
          traceId,
          depth,
        });
      } else {
        executedRules++;
        await logRuleExecution({
          clientId: input.clientId,
          ruleId: rule.id,
          ruleVersion: rule.version ?? 1,
          cardId: input.cardId,
          triggerType: input.triggerType,
          triggerData,
          status: "success",
          actionResult: { steps: stepResults },
          eventId,
          eventHash,
          dedupeKey,
          traceId,
          depth,
        });
      }
    }

    return {
      matchedRules,
      executedRules,
      skippedRules,
      failedRules,
    };
  });

  if (!lockResult.locked) {
    return {
      processed: false,
      matchedRules: 0,
      executedRules: 0,
      skippedRules: 0,
      failedRules: 0,
      reason: "card_locked_concurrent_process",
    };
  }

  const counters = lockResult.result!;
  return {
    processed: true,
    matchedRules: counters.matchedRules,
    executedRules: counters.executedRules,
    skippedRules: counters.skippedRules,
    failedRules: counters.failedRules,
  };
};

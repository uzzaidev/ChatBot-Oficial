import { getClientConfig } from "@/lib/config";
import { sendTemplateMessage, sendTextMessage } from "@/lib/meta";
import { getClient, query } from "@/lib/postgres";
import { sendCategorizedPush } from "@/lib/push-dispatch";
import { createServiceRoleClient } from "@/lib/supabase";
import { createHash, randomUUID } from "crypto";
import type { QueryResult } from "pg";

type JsonRecord = Record<string, unknown>;
type OnErrorPolicy = "continue" | "stop" | "compensate";
type ExecutionStatus = "success" | "failed" | "skipped";
type NotifyCategory = "critical" | "important" | "normal" | "low" | "marketing";
type ActivityLogBackend = "crm_activity_log" | "crm_card_activities" | null;

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

interface ActionExecutionResult {
  result: JsonRecord;
  compensationStep?: ActionStep | null;
}

type DBExecutor = {
  query: <T = any>(text: string, params?: any[]) => Promise<QueryResult<T>>;
};

class ActionSkipError extends Error {
  readonly reason: string;

  constructor(reason: string, message?: string) {
    super(message ?? reason);
    this.reason = reason;
  }
}

const MAX_TRACE_DEPTH = 3;
const DEFAULT_RETRY_ATTEMPTS = 0;

const EXTERNAL_ACTION_RETRY_CONFIG: Record<
  string,
  { maxAttempts: number; baseDelayMs: number }
> = {
  send_message: { maxAttempts: 3, baseDelayMs: 5_000 },
  notify_user: { maxAttempts: 3, baseDelayMs: 10_000 },
};

const LEGACY_AUTO_STATUS_MAP: Record<string, string> = {
  awaiting_response: "awaiting_client",
  in_service: "awaiting_attendant",
  resolved: "neutral",
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
    return value.length > 0
      ? evaluateJsonLogic(value[value.length - 1], data)
      : true;
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
      if (
        tagId !== undefined &&
        String(tagId) !== String(triggerData.tag_id ?? "")
      ) {
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
        const gotFirstMessage =
          toBoolean(triggerData.is_first_message) ?? false;
        if (expectedFirstMessage !== gotFirstMessage) return false;
      }
    } else if (triggerType === "keyword_detected") {
      const sourceText =
        typeof triggerData.message_text === "string"
          ? triggerData.message_text.toLowerCase()
          : "";
      const keywordsRaw = conditions.keywords;
      const keywords = Array.isArray(keywordsRaw)
        ? keywordsRaw
            .map((item) =>
              String(item ?? "")
                .trim()
                .toLowerCase(),
            )
            .filter(Boolean)
        : typeof keywordsRaw === "string"
          ? keywordsRaw
              .split(",")
              .map((item) => item.trim().toLowerCase())
              .filter(Boolean)
          : [];

      if (keywords.length === 0) return false;

      const matchMode = conditions.match_mode === "all" ? "all" : "any";
      const matchedKeywords = keywords.filter((k) => sourceText.includes(k));

      if (matchMode === "all" && matchedKeywords.length !== keywords.length) {
        return false;
      }
      if (matchMode === "any" && matchedKeywords.length === 0) {
        return false;
      }

      triggerData.detected_keywords = matchedKeywords;
      triggerData.message_text_lower = sourceText;
    } else if (triggerType === "intent_detected") {
      const expectedIntent =
        typeof conditions.intent === "string"
          ? conditions.intent.trim().toLowerCase()
          : "";
      const gotIntent =
        typeof triggerData.intent === "string"
          ? triggerData.intent.trim().toLowerCase()
          : "";
      if (expectedIntent && expectedIntent !== gotIntent) {
        return false;
      }

      const defaultMinConfidence = Number.parseFloat(
        String(triggerData.threshold ?? "0"),
      );
      const minConfidence =
        typeof conditions.confidence_min === "number"
          ? conditions.confidence_min
          : Number.parseFloat(
              String(
                conditions.confidence_min !== undefined
                  ? conditions.confidence_min
                  : defaultMinConfidence,
              ),
            );
      if (Number.isFinite(minConfidence)) {
        const gotConfidence = Number(triggerData.confidence ?? 0);
        if (gotConfidence < minConfidence) return false;
      }
    } else if (triggerType === "urgency_detected") {
      const expectedLevel =
        typeof conditions.urgency_level === "string"
          ? conditions.urgency_level.trim().toLowerCase()
          : "";
      const gotLevel =
        typeof triggerData.urgency_level === "string"
          ? triggerData.urgency_level.trim().toLowerCase()
          : "";
      if (expectedLevel && expectedLevel !== gotLevel) {
        return false;
      }

      const defaultMinConfidence = Number.parseFloat(
        String(triggerData.threshold ?? "0"),
      );
      const minConfidence =
        typeof conditions.confidence_min === "number"
          ? conditions.confidence_min
          : Number.parseFloat(
              String(
                conditions.confidence_min !== undefined
                  ? conditions.confidence_min
                  : defaultMinConfidence,
              ),
            );
      if (Number.isFinite(minConfidence)) {
        const gotConfidence = Number(triggerData.confidence ?? 0);
        if (gotConfidence < minConfidence) return false;
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
        on_error:
          step.on_error === "continue"
            ? "continue"
            : step.on_error === "compensate"
              ? "compensate"
              : "stop",
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
  db: DBExecutor,
): Promise<string | null> => {
  const explicitTagId =
    typeof actionParams.tag_id === "string" ? actionParams.tag_id : null;
  if (explicitTagId) return explicitTagId;

  const tagName =
    typeof actionParams.tag_name === "string"
      ? actionParams.tag_name.trim()
      : "";
  if (!tagName) return null;

  const existing = await db.query<{ id: string }>(
    `SELECT id FROM crm_tags WHERE client_id = $1 AND name = $2 LIMIT 1`,
    [clientId, tagName],
  );
  if (existing.rows[0]?.id) return existing.rows[0].id;

  const createIfMissing =
    toBoolean(actionParams.create_if_not_exists) === true ||
    toBoolean(actionParams.createIfNotExists) === true;

  if (!createIfMissing) return null;

  const insert = await db.query<{ id: string }>(
    `INSERT INTO crm_tags (client_id, name, color)
     VALUES ($1, $2, $3)
     ON CONFLICT (client_id, name) DO UPDATE SET updated_at = NOW()
     RETURNING id`,
    [clientId, tagName, "#6366f1"],
  );

  return insert.rows[0]?.id ?? null;
};

const getExternalActionRetryConfig = (
  actionType: string,
): { maxAttempts: number; baseDelayMs: number } | null => {
  return EXTERNAL_ACTION_RETRY_CONFIG[actionType] ?? null;
};

const calcNextRetryAt = (actionType: string, attempts: number): Date | null => {
  const config = getExternalActionRetryConfig(actionType);
  if (!config) return null;
  if (attempts >= config.maxAttempts) return null;

  const jitter = 0.75 + Math.random() * 0.5;
  const delayMs =
    config.baseDelayMs * Math.pow(2, Math.max(attempts - 1, 0)) * jitter;
  return new Date(Date.now() + delayMs);
};

const getCardContext = async (
  cardId: string,
  db: DBExecutor,
): Promise<{
  phone: string;
  contactName: string | null;
  assignedTo: string | null;
  lastMessageAt: string | null;
  lastMessageDirection: string | null;
}> => {
  const cardResult = await db.query<{
    phone: string | number | null;
    assigned_to: string | null;
    last_message_at: string | null;
    last_message_direction: string | null;
  }>(
    `SELECT phone, assigned_to, last_message_at, last_message_direction
     FROM crm_cards
     WHERE id = $1
     LIMIT 1`,
    [cardId],
  );

  const card = cardResult.rows[0];
  if (!card || !card.phone) {
    throw new Error("Card context not found or phone is empty");
  }

  return {
    phone: String(card.phone),
    contactName: null,
    assignedTo: card.assigned_to ?? null,
    lastMessageAt: card.last_message_at ?? null,
    lastMessageDirection: card.last_message_direction ?? null,
  };
};

const resolveActivityLogBackend = async (
  db: DBExecutor,
): Promise<ActivityLogBackend> => {
  const now = Date.now();
  if (activityLogBackendCache && activityLogBackendCache.expiresAt > now) {
    return activityLogBackendCache.backend;
  }

  const lookup = await db.query<{
    has_activity_log: boolean;
    has_card_activities: boolean;
  }>(
    `SELECT
       EXISTS (
         SELECT 1
         FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'crm_activity_log'
       ) AS has_activity_log,
       EXISTS (
         SELECT 1
         FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'crm_card_activities'
       ) AS has_card_activities`,
  );

  const row = lookup.rows[0];
  const backend: ActivityLogBackend = row?.has_activity_log
    ? "crm_activity_log"
    : row?.has_card_activities
      ? "crm_card_activities"
      : null;

  activityLogBackendCache = {
    backend,
    expiresAt: now + ACTIVITY_LOG_CACHE_TTL_MS,
  };

  return backend;
};

const normalizeActivityLogType = (value: unknown): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "status_change";
  }

  const normalized = value.trim().toLowerCase();
  if (
    normalized === "column_move" ||
    normalized === "tag_add" ||
    normalized === "tag_remove" ||
    normalized === "note_add" ||
    normalized === "assigned" ||
    normalized === "status_change" ||
    normalized === "value_change" ||
    normalized === "created"
  ) {
    return normalized;
  }

  return "status_change";
};

const parseTemplateParams = (
  rawValue: unknown,
  variables: JsonRecord,
): string[] => {
  if (!rawValue) return [];

  if (Array.isArray(rawValue)) {
    return rawValue.map((item) =>
      interpolateTemplate(String(item ?? ""), variables),
    );
  }

  if (typeof rawValue === "string") {
    try {
      const parsed = JSON.parse(rawValue);
      if (Array.isArray(parsed)) {
        return parsed.map((item) =>
          interpolateTemplate(String(item ?? ""), variables),
        );
      }
    } catch {
      return [interpolateTemplate(rawValue, variables)];
    }
  }

  return [];
};

const RULE_CACHE_TTL_MS = 5 * 60 * 1000;
const automationRuleCache = new Map<
  string,
  { expiresAt: number; rules: AutomationRuleRow[] }
>();
const ACTIVITY_LOG_CACHE_TTL_MS = 5 * 60 * 1000;
let activityLogBackendCache: {
  backend: ActivityLogBackend;
  expiresAt: number;
} | null = null;

const getRuleCacheKey = (clientId: string, triggerType: string): string => {
  return `${clientId}:${triggerType}`;
};

const fetchActiveRules = async (
  clientId: string,
  triggerType: string,
): Promise<AutomationRuleRow[]> => {
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
      [clientId, triggerType],
    );
    return rulesResult.rows;
  } catch (error) {
    if (!isMissingDbObjectError(error)) {
      throw error;
    }
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
    [clientId, triggerType],
  );

  return legacyRules.rows.map((row) => ({
    ...row,
    condition_tree: null,
    action_steps: [],
    version: 1,
  }));
};

const getActiveRules = async (
  clientId: string,
  triggerType: string,
): Promise<AutomationRuleRow[]> => {
  const key = getRuleCacheKey(clientId, triggerType);
  const cached = automationRuleCache.get(key);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.rules;
  }

  const rules = await fetchActiveRules(clientId, triggerType);
  automationRuleCache.set(key, {
    rules,
    expiresAt: now + RULE_CACHE_TTL_MS,
  });
  return rules;
};

export const clearCrmAutomationRuleCache = (
  clientId?: string,
  triggerType?: string,
) => {
  if (!clientId) {
    automationRuleCache.clear();
    return;
  }

  if (triggerType) {
    automationRuleCache.delete(getRuleCacheKey(clientId, triggerType));
    return;
  }

  for (const key of Array.from(automationRuleCache.keys())) {
    if (key.startsWith(`${clientId}:`)) {
      automationRuleCache.delete(key);
    }
  }
};

const getLastIncomingMessageAt = async (
  clientId: string,
  phone: string,
  db: DBExecutor,
): Promise<Date | null> => {
  try {
    const incomingFromMessages = await db.query<{ timestamp: string }>(
      `SELECT timestamp
       FROM messages
       WHERE client_id = $1
         AND phone = $2
         AND direction = 'incoming'
       ORDER BY timestamp DESC
       LIMIT 1`,
      [clientId, phone],
    );

    const ts = incomingFromMessages.rows[0]?.timestamp;
    if (ts) {
      const date = new Date(ts);
      if (!Number.isNaN(date.getTime())) return date;
    }
  } catch (error) {
    if (!isMissingDbObjectError(error)) {
      throw error;
    }
  }

  return null;
};

const isInsideWhatsAppWindow = async (params: {
  clientId: string;
  cardId: string;
  cardContext: Awaited<ReturnType<typeof getCardContext>>;
  db: DBExecutor;
}): Promise<boolean> => {
  const { clientId, cardId, cardContext, db } = params;
  const now = Date.now();
  const maxMs = 24 * 60 * 60 * 1000;

  const lastIncoming = await getLastIncomingMessageAt(
    clientId,
    cardContext.phone,
    db,
  );
  if (lastIncoming) {
    return now - lastIncoming.getTime() <= maxMs;
  }

  if (
    cardContext.lastMessageAt &&
    cardContext.lastMessageDirection &&
    cardContext.lastMessageDirection.toLowerCase() === "incoming"
  ) {
    const last = new Date(cardContext.lastMessageAt).getTime();
    if (!Number.isNaN(last)) {
      return now - last <= maxMs;
    }
  }

  // Fallback defensivo: sem prova de mensagem inbound recente, assume janela fechada.
  return false;
};

const resolveTemplateRecord = async (
  clientId: string,
  templateId: string,
  db: DBExecutor,
): Promise<{ name: string; language: string }> => {
  const templateResult = await db.query<{
    name: string;
    language: string;
    status: string;
  }>(
    `SELECT name, language, status
     FROM message_templates
     WHERE id = $1
       AND client_id = $2
     LIMIT 1`,
    [templateId, clientId],
  );

  const template = templateResult.rows[0];
  if (!template) {
    throw new Error("Template not found");
  }
  if (template.status !== "APPROVED") {
    throw new Error(`Template status is not APPROVED (${template.status})`);
  }

  return { name: template.name, language: template.language };
};

const logOutgoingMessage = async (params: {
  clientId: string;
  phone: string;
  content: string;
  metadata?: JsonRecord;
  db: DBExecutor;
}) => {
  try {
    await params.db.query(
      `INSERT INTO messages (client_id, phone, content, type, direction, status, timestamp, metadata)
       VALUES ($1, $2, $3, 'text', 'outgoing', 'sent', NOW(), $4::jsonb)`,
      [
        params.clientId,
        params.phone,
        params.content,
        JSON.stringify(params.metadata ?? {}),
      ],
    );
  } catch (error) {
    if (!isMissingDbObjectError(error)) {
      console.warn("[crm-automation] failed to log outgoing message", error);
    }
  }
};

const executeSendMessageAction = async (params: {
  clientId: string;
  cardId: string;
  actionParams: JsonRecord;
  variables: JsonRecord;
  db: DBExecutor;
}): Promise<JsonRecord> => {
  const { clientId, cardId, actionParams, variables, db } = params;
  const cardContext = await getCardContext(cardId, db);
  const config = await getClientConfig(clientId);

  if (
    !config?.apiKeys?.metaAccessToken ||
    !config?.apiKeys?.metaPhoneNumberId
  ) {
    throw new Error("Meta credentials not configured for this client");
  }

  const requestedMessageType =
    typeof actionParams.message_type === "string"
      ? actionParams.message_type
      : "text";

  const insideWindow = await isInsideWhatsAppWindow({
    clientId,
    cardId,
    cardContext,
    db,
  });

  let mode: "text" | "template" =
    requestedMessageType === "template" ? "template" : "text";

  if (!insideWindow && mode === "text") {
    const fallbackTemplateId =
      typeof actionParams.fallback_template_id === "string"
        ? actionParams.fallback_template_id
        : null;
    if (!fallbackTemplateId) {
      throw new ActionSkipError(
        "whatsapp_window_closed_text_requires_template",
        "Text message outside 24h window requires template fallback",
      );
    }
    mode = "template";
    actionParams.template_id = fallbackTemplateId;
  }

  if (mode === "template") {
    const templateId =
      typeof actionParams.template_id === "string"
        ? actionParams.template_id
        : null;
    if (!templateId) {
      throw new Error("send_message template mode requires template_id");
    }

    const template = await resolveTemplateRecord(clientId, templateId, db);
    const templateParams = parseTemplateParams(
      actionParams.template_params,
      variables,
    );

    const sent = await sendTemplateMessage(
      cardContext.phone,
      template.name,
      template.language,
      templateParams,
      config,
    );

    await logOutgoingMessage({
      clientId,
      phone: cardContext.phone,
      content: `Template: ${template.name}`,
      metadata: {
        automation: true,
        action_type: "send_message",
        message_type: "template",
        template_id: templateId,
        template_name: template.name,
        wamid: sent.messageId,
      },
      db,
    });

    return {
      message_type: "template",
      template_id: templateId,
      template_name: template.name,
      message_id: sent.messageId,
      inside_24h_window: insideWindow,
    };
  }

  const rawText =
    typeof actionParams.content === "string"
      ? actionParams.content
      : typeof actionParams.message === "string"
        ? actionParams.message
        : "";

  const textBody = interpolateTemplate(rawText, variables).trim();
  if (!textBody) {
    throw new Error("send_message text mode requires non-empty content");
  }

  const sent = await sendTextMessage(cardContext.phone, textBody, config);

  await logOutgoingMessage({
    clientId,
    phone: cardContext.phone,
    content: textBody,
    metadata: {
      automation: true,
      action_type: "send_message",
      message_type: "text",
      wamid: sent.messageId,
    },
    db,
  });

  return {
    message_type: "text",
    message_id: sent.messageId,
    inside_24h_window: insideWindow,
  };
};

const resolveNotifyTargets = async (
  clientId: string,
  cardId: string,
  actionParams: JsonRecord,
  db: DBExecutor,
): Promise<string[]> => {
  const explicitUserId =
    typeof actionParams.user_id === "string" ? actionParams.user_id : null;
  if (explicitUserId) return [explicitUserId];

  const target =
    typeof actionParams.target === "string"
      ? actionParams.target
      : "assigned_to";

  if (target === "assigned_to") {
    const card = await getCardContext(cardId, db);
    if (!card.assignedTo) {
      throw new ActionSkipError(
        "notify_user_no_assignee",
        "Card has no assigned user",
      );
    }
    return [card.assignedTo];
  }

  if (target === "all_active" || target === "all_admins") {
    const users = await db.query<{ id: string }>(
      `SELECT id
       FROM user_profiles
       WHERE client_id = $1
         AND is_active = true
         ${target === "all_admins" ? "AND role = 'admin'" : ""}`,
      [clientId],
    );
    const ids = users.rows.map((row) => row.id).filter(Boolean);
    if (ids.length === 0) {
      throw new ActionSkipError(
        "notify_user_no_active_users",
        "No active users for client",
      );
    }
    return ids;
  }

  throw new ActionSkipError(
    "notify_user_invalid_target",
    `Unsupported notify target: ${target}`,
  );
};

const executeNotifyUserAction = async (params: {
  clientId: string;
  cardId: string;
  actionParams: JsonRecord;
  variables: JsonRecord;
  db: DBExecutor;
}): Promise<JsonRecord> => {
  const { clientId, cardId, actionParams, variables, db } = params;
  const targetUserIds = await resolveNotifyTargets(
    clientId,
    cardId,
    actionParams,
    db,
  );

  const titleTemplate =
    typeof actionParams.title === "string"
      ? actionParams.title
      : "CRM Automation";
  const bodyTemplate =
    typeof actionParams.body === "string"
      ? actionParams.body
      : typeof actionParams.content === "string"
        ? actionParams.content
        : "Uma automacao do CRM foi acionada.";

  const title = interpolateTemplate(titleTemplate, variables).slice(0, 120);
  const body = interpolateTemplate(bodyTemplate, variables).slice(0, 240);

  const categoryRaw =
    typeof actionParams.category === "string"
      ? actionParams.category
      : "important";
  const category: NotifyCategory = (
    ["critical", "important", "normal", "low", "marketing"].includes(
      categoryRaw,
    )
      ? categoryRaw
      : "important"
  ) as NotifyCategory;

  const results = await Promise.all(
    targetUserIds.map(async (userId) => {
      const response = await sendCategorizedPush(
        userId,
        {
          category,
          title,
          body,
          data: {
            type: "crm_automation_notify",
            card_id: cardId,
            action: "open_crm_card",
          },
        },
        { clientId },
      );

      return {
        user_id: userId,
        success: response.success,
        error: response.error ?? null,
      };
    }),
  );

  const successCount = results.filter((item) => item.success).length;
  if (successCount === 0) {
    throw new ActionSkipError(
      "notify_user_no_push_tokens_or_delivery_failed",
      "No notification could be delivered",
    );
  }

  return {
    notified_users: successCount,
    attempted_users: targetUserIds.length,
    results,
  };
};

const executeActionStep = async (
  clientId: string,
  cardId: string,
  step: ActionStep,
  variables: JsonRecord,
  db: DBExecutor,
): Promise<ActionExecutionResult> => {
  const actionType = step.action_type;
  const actionParams = step.action_params ?? {};

  switch (actionType) {
    case "move_to_column": {
      const previousCard = await db.query<{ column_id: string | null }>(
        `SELECT column_id FROM crm_cards WHERE id = $1 LIMIT 1`,
        [cardId],
      );
      const previousColumnId = previousCard.rows[0]?.column_id ?? null;

      const columnId =
        typeof actionParams.column_id === "string"
          ? actionParams.column_id
          : null;
      if (!columnId) {
        throw new Error("move_to_column requires action_params.column_id");
      }
      const position = toInt(actionParams.position);
      await db.query(`SELECT crm_move_card($1, $2, $3)`, [
        cardId,
        columnId,
        position,
      ]);
      return {
        result: { moved_to_column_id: columnId, position: position ?? null },
        compensationStep: previousColumnId
          ? {
              action_type: "move_to_column",
              action_params: { column_id: previousColumnId },
              on_error: "continue",
            }
          : null,
      };
    }

    case "add_tag": {
      const tagId = await resolveTagId(clientId, actionParams, db);
      if (!tagId) {
        throw new Error("add_tag requires tag_id or tag_name");
      }
      await db.query(
        `INSERT INTO crm_card_tags (card_id, tag_id)
         VALUES ($1, $2)
         ON CONFLICT (card_id, tag_id) DO NOTHING`,
        [cardId, tagId],
      );
      return {
        result: { tag_id: tagId },
        compensationStep: {
          action_type: "remove_tag",
          action_params: { tag_id: tagId },
          on_error: "continue",
        },
      };
    }

    case "remove_tag": {
      const tagId = await resolveTagId(clientId, actionParams, db);
      if (!tagId) {
        throw new Error("remove_tag requires tag_id or tag_name");
      }
      const existingTag = await db.query<{ tag_id: string }>(
        `SELECT tag_id FROM crm_card_tags WHERE card_id = $1 AND tag_id = $2 LIMIT 1`,
        [cardId, tagId],
      );

      await db.query(
        `DELETE FROM crm_card_tags WHERE card_id = $1 AND tag_id = $2`,
        [cardId, tagId],
      );

      return {
        result: { tag_id: tagId },
        compensationStep:
          existingTag.rows.length > 0
            ? {
                action_type: "add_tag",
                action_params: { tag_id: tagId },
                on_error: "continue",
              }
            : null,
      };
    }

    case "assign_to": {
      const previousCard = await db.query<{ assigned_to: string | null }>(
        `SELECT assigned_to FROM crm_cards WHERE id = $1 LIMIT 1`,
        [cardId],
      );
      const previousAssignedTo = previousCard.rows[0]?.assigned_to ?? null;

      const hasUserIdKey = Object.prototype.hasOwnProperty.call(
        actionParams,
        "user_id",
      );
      if (!hasUserIdKey) {
        throw new Error("assign_to requires action_params.user_id");
      }
      const userId =
        typeof actionParams.user_id === "string" ? actionParams.user_id : null;

      await db.query(
        `UPDATE crm_cards SET assigned_to = $1, updated_at = NOW() WHERE id = $2`,
        [userId, cardId],
      );
      return {
        result: { assigned_to: userId },
        compensationStep: {
          action_type: "assign_to",
          action_params: { user_id: previousAssignedTo },
          on_error: "continue",
        },
      };
    }

    case "update_auto_status": {
      const previousCard = await db.query<{ auto_status: string | null }>(
        `SELECT auto_status FROM crm_cards WHERE id = $1 LIMIT 1`,
        [cardId],
      );
      const previousStatus = previousCard.rows[0]?.auto_status ?? null;

      const normalized = canonicalizeStatus(actionParams.auto_status);
      if (!normalized) {
        throw new Error(
          "update_auto_status requires action_params.auto_status",
        );
      }
      await db.query(
        `UPDATE crm_cards
         SET auto_status = $1, auto_status_updated_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [normalized, cardId],
      );
      return {
        result: { auto_status: normalized },
        compensationStep: previousStatus
          ? {
              action_type: "update_auto_status",
              action_params: { auto_status: previousStatus },
              on_error: "continue",
            }
          : null,
      };
    }

    case "log_activity": {
      const rawActivityType =
        typeof actionParams.activity_type === "string"
          ? actionParams.activity_type
          : "status_change";
      const contentRaw =
        typeof actionParams.content === "string" ? actionParams.content : "";
      if (!contentRaw) {
        throw new Error("log_activity requires action_params.content");
      }
      const content = interpolateTemplate(contentRaw, variables);
      const backend = await resolveActivityLogBackend(db);

      if (backend === "crm_activity_log") {
        const activityType = normalizeActivityLogType(rawActivityType);
        await db.query(
          `INSERT INTO crm_activity_log (
             client_id, card_id, activity_type, description, new_value, is_automated
           ) VALUES ($1, $2, $3, $4, $5::jsonb, true)`,
          [
            clientId,
            cardId,
            activityType,
            content,
            JSON.stringify({
              automation: true,
              raw_activity_type: rawActivityType,
            }),
          ],
        );
        return { result: { activity_type: activityType, backend } };
      }

      if (backend === "crm_card_activities") {
        await db.query(
          `INSERT INTO crm_card_activities (client_id, card_id, activity_type, content, metadata)
           VALUES ($1, $2, $3, $4, $5::jsonb)`,
          [
            clientId,
            cardId,
            rawActivityType,
            content,
            JSON.stringify({ automation: true }),
          ],
        );
        return { result: { activity_type: rawActivityType, backend } };
      }

      throw new Error("No supported CRM activity log table found");
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
      await db.query(
        `INSERT INTO crm_card_notes (client_id, card_id, content)
         VALUES ($1, $2, $3)`,
        [clientId, cardId, content],
      );
      return { result: { note_created: true } };
    }

    case "send_message": {
      const result = await executeSendMessageAction({
        clientId,
        cardId,
        actionParams,
        variables,
        db,
      });
      return { result };
    }

    case "notify_user": {
      const result = await executeNotifyUserAction({
        clientId,
        cardId,
        actionParams,
        variables,
        db,
      });
      return { result };
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
  fn: (db: DBExecutor) => Promise<T>,
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

    const txExecutor: DBExecutor = {
      query: async <U = any>(text: string, params?: any[]) =>
        client.query<U>(text, params),
    };
    const result = await fn(txExecutor);
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

const enqueueExternalActionRetry = async (params: {
  clientId: string;
  cardId: string;
  ruleId: string | null;
  stepIndex: number;
  actionType: string;
  actionParams: JsonRecord;
  errorMessage: string;
}) => {
  const nextRetryAt = calcNextRetryAt(params.actionType, 1);
  if (!nextRetryAt) return;

  try {
    await query(
      `
      INSERT INTO crm_action_dlq (
        client_id, card_id, rule_id, step_index, action_type,
        action_params, attempts, last_error, next_retry_at
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, 1, $7, $8)
      ON CONFLICT (client_id, card_id, rule_id, step_index, action_type)
      WHERE exhausted_at IS NULL
      DO UPDATE SET
        attempts = LEAST(crm_action_dlq.attempts + 1, 9999),
        last_error = EXCLUDED.last_error,
        next_retry_at = EXCLUDED.next_retry_at,
        updated_at = NOW()
      `,
      [
        params.clientId,
        params.cardId,
        params.ruleId,
        params.stepIndex,
        params.actionType,
        JSON.stringify(params.actionParams ?? {}),
        params.errorMessage.slice(0, 2000),
        nextRetryAt.toISOString(),
      ],
    );
  } catch (error) {
    if (!isMissingDbObjectError(error)) {
      console.error("[crm-automation] failed to enqueue DLQ action", error);
    }
  }
};

interface CrmActionDlqRow {
  id: string;
  client_id: string;
  card_id: string;
  rule_id: string | null;
  step_index: number;
  action_type: string;
  action_params: JsonRecord | null;
  attempts: number | null;
}

const updateDlqAfterFailure = async (
  item: CrmActionDlqRow,
  errorMessage: string,
  attempts: number,
) => {
  const nextRetryAt = calcNextRetryAt(item.action_type, attempts);
  if (nextRetryAt) {
    await query(
      `UPDATE crm_action_dlq
       SET attempts = $2,
           last_error = $3,
           next_retry_at = $4,
           updated_at = NOW()
       WHERE id = $1`,
      [
        item.id,
        attempts,
        errorMessage.slice(0, 2000),
        nextRetryAt.toISOString(),
      ],
    );
    return;
  }

  await query(
    `UPDATE crm_action_dlq
     SET attempts = $2,
         last_error = $3,
         final_error = $3,
         exhausted_at = NOW(),
         next_retry_at = NULL,
         updated_at = NOW()
     WHERE id = $1`,
    [item.id, attempts, errorMessage.slice(0, 2000)],
  );
};

const buildAutomationStepVariables = async (
  cardId: string,
  db: DBExecutor,
  triggerData?: JsonRecord,
): Promise<JsonRecord> => {
  let stepVariables: JsonRecord = { ...(triggerData ?? {}) };

  try {
    const cardContext = await getCardContext(cardId, db);
    stepVariables = {
      ...stepVariables,
      phone: cardContext.phone,
      contact_phone: cardContext.phone,
      contact_name: cardContext.contactName,
      assigned_to: cardContext.assignedTo,
    };
  } catch {
    // keep triggerData only
  }

  return stepVariables;
};

export const retryCrmAutomationDlqBatch = async (
  limit = 50,
): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  exhausted: number;
}> => {
  const safeLimit = Math.max(1, Math.min(limit, 200));
  const items = await query<CrmActionDlqRow>(
    `SELECT id, client_id, card_id, rule_id, step_index, action_type, action_params, attempts
     FROM crm_action_dlq
     WHERE exhausted_at IS NULL
       AND next_retry_at IS NOT NULL
       AND next_retry_at <= NOW()
     ORDER BY next_retry_at ASC
     LIMIT $1`,
    [safeLimit],
  );

  let succeeded = 0;
  let failed = 0;
  let exhausted = 0;

  for (const item of items.rows) {
    try {
      const lock = await withCardLock(item.card_id, async (db) => {
        const step: ActionStep = {
          action_type: item.action_type,
          action_params:
            item.action_params && typeof item.action_params === "object"
              ? item.action_params
              : {},
          on_error: "stop",
        };

        const vars = await buildAutomationStepVariables(item.card_id, db);
        await executeActionStep(item.client_id, item.card_id, step, vars, db);
      });

      if (!lock.locked) {
        failed++;
        continue;
      }

      await query(`DELETE FROM crm_action_dlq WHERE id = $1`, [item.id]);
      succeeded++;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown retry error";
      const attempts = (item.attempts ?? 0) + 1;
      await updateDlqAfterFailure(item, errorMessage, attempts);
      failed++;

      const nextRetry = calcNextRetryAt(item.action_type, attempts);
      if (!nextRetry) exhausted++;
    }
  }

  return {
    processed: items.rows.length,
    succeeded,
    failed,
    exhausted,
  };
};

interface ScheduledActionRow {
  id: string;
  client_id: string;
  card_id: string;
  rule_id: string | null;
  action_type: string;
  action_params: JsonRecord | null;
  depth: number | null;
}

export const runDueScheduledCrmActions = async (
  limit = 100,
): Promise<{ processed: number; executed: number; failed: number }> => {
  const safeLimit = Math.max(1, Math.min(limit, 200));
  const due = await query<ScheduledActionRow>(
    `SELECT id, client_id, card_id, rule_id, action_type, action_params, depth
     FROM crm_scheduled_actions
     WHERE status = 'pending'
       AND execute_at <= NOW()
     ORDER BY execute_at ASC
     LIMIT $1`,
    [safeLimit],
  );

  let executed = 0;
  let failed = 0;

  for (const item of due.rows) {
    try {
      const lock = await withCardLock(item.card_id, async (db) => {
        const actionParams =
          item.action_params && typeof item.action_params === "object"
            ? { ...item.action_params }
            : {};

        delete actionParams.delay_minutes;

        const step: ActionStep = {
          action_type: item.action_type,
          action_params: actionParams,
          on_error: "stop",
        };

        const stepVariables = await buildAutomationStepVariables(
          item.card_id,
          db,
        );
        await executeActionStep(
          item.client_id,
          item.card_id,
          step,
          stepVariables,
          db,
        );

        await db.query(
          `UPDATE crm_scheduled_actions
           SET status = 'executed',
               executed_at = NOW(),
               updated_at = NOW(),
               error_message = NULL
           WHERE id = $1`,
          [item.id],
        );
      });

      if (!lock.locked) {
        continue;
      }

      executed++;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Scheduled action failed";
      await query(
        `UPDATE crm_scheduled_actions
         SET status = 'failed',
             error_message = $2,
             updated_at = NOW()
         WHERE id = $1`,
        [item.id, message.slice(0, 2000)],
      );

      if (getExternalActionRetryConfig(item.action_type)) {
        await enqueueExternalActionRetry({
          clientId: item.client_id,
          cardId: item.card_id,
          ruleId: item.rule_id ?? null,
          stepIndex: 0,
          actionType: item.action_type,
          actionParams:
            item.action_params && typeof item.action_params === "object"
              ? item.action_params
              : {},
          errorMessage: message,
        });
      }

      failed++;
    }
  }

  return {
    processed: due.rows.length,
    executed,
    failed,
  };
};

export interface SimulateAutomationEventInput {
  clientId: string;
  cardId: string;
  triggerType: string;
  triggerData?: JsonRecord;
}

export interface SimulateAutomationEventResult {
  processed: boolean;
  matchedRules: Array<{
    rule_id: string;
    rule_name: string;
    priority: number;
    steps_would_execute: Array<{ step_index: number; action_type: string }>;
  }>;
  skippedRules: Array<{
    rule_id: string;
    rule_name: string;
    reason: string;
  }>;
}

export const simulateCrmAutomationEvent = async (
  input: SimulateAutomationEventInput,
): Promise<SimulateAutomationEventResult> => {
  if (!input.clientId || !input.cardId || !input.triggerType) {
    return { processed: false, matchedRules: [], skippedRules: [] };
  }

  const rules = await getActiveRules(input.clientId, input.triggerType);

  const matchedRules: SimulateAutomationEventResult["matchedRules"] = [];
  const skippedRules: SimulateAutomationEventResult["skippedRules"] = [];
  const triggerData = { ...(input.triggerData ?? {}) };

  for (const rule of rules) {
    const localTriggerData = { ...triggerData };
    const matched = matchesTriggerConditions(
      rule,
      input.triggerType,
      localTriggerData,
    );
    if (!matched) {
      skippedRules.push({
        rule_id: rule.id,
        rule_name: rule.name,
        reason: "condition_tree_or_trigger_conditions_false",
      });
      continue;
    }

    const steps = getActionSteps(rule);
    if (steps.length === 0) {
      skippedRules.push({
        rule_id: rule.id,
        rule_name: rule.name,
        reason: "no_action_steps",
      });
      continue;
    }

    matchedRules.push({
      rule_id: rule.id,
      rule_name: rule.name,
      priority: rule.priority,
      steps_would_execute: steps.map((step, index) => ({
        step_index: index,
        action_type: step.action_type,
      })),
    });
  }

  return {
    processed: true,
    matchedRules,
    skippedRules,
  };
};

export const emitCrmAutomationEvent = async (
  input: EmitAutomationEventInput,
): Promise<EmitAutomationEventResult> => {
  const triggerData: JsonRecord = input.triggerData ?? {};
  const traceId = input.traceId ?? randomUUID();
  const depth = input.depth ?? 0;
  const eventId = randomUUID();

  if (!input.clientId || !input.cardId || !input.triggerType) {
    console.warn(
      `[crm-automation] ⚠️ emitCrmAutomationEvent missing required fields | clientId=${input.clientId} cardId=${input.cardId} triggerType=${input.triggerType}`,
    );
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
    console.log(
      `[crm-automation] 🔒 Engine disabled for client=${input.clientId} triggerType=${input.triggerType}`,
    );
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

  const rules = await getActiveRules(input.clientId, input.triggerType);

  console.log(
    `[crm-automation] 📋 triggerType=${input.triggerType} cardId=${input.cardId} activeRules=${rules.length}`,
  );

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

  const lockResult = await withCardLock(input.cardId, async (db) => {
    let matchedRules = 0;
    let executedRules = 0;
    let skippedRules = 0;
    let failedRules = 0;

    for (const rule of rules) {
      const matches = matchesTriggerConditions(
        rule,
        input.triggerType,
        triggerData,
      );
      if (!matches) {
        skippedRules++;
        await logRuleExecution({
          clientId: input.clientId,
          ruleId: rule.id,
          ruleVersion: rule.version ?? 1,
          cardId: input.cardId,
          triggerType: input.triggerType,
          triggerData,
          status: "skipped",
          skipReason: "condition_tree_or_trigger_conditions_false",
          eventId,
          eventHash,
          dedupeKey,
          traceId,
          depth,
        });
        continue;
      }

      matchedRules++;

      let isDuplicate = false;
      try {
        const duplicateCheck = await db.query<{ id: string }>(
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

      const stepVariables = await buildAutomationStepVariables(
        input.cardId,
        db,
        triggerData,
      );

      const stepResults: JsonRecord[] = [];
      let ruleFailed = false;
      let failureMessage = "";
      let firstSkipReason: string | null = null;
      let hasSuccessfulStep = false;
      let hasSkippedStep = false;
      const compensationSteps: Array<{ stepIndex: number; step: ActionStep }> =
        [];

      for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
        const step = steps[stepIndex];
        const delayMinutes = toInt(step.action_params?.delay_minutes);
        if (delayMinutes && delayMinutes > 0) {
          const executeAt = new Date(Date.now() + delayMinutes * 60 * 1000);
          try {
            await db.query(
              `INSERT INTO crm_scheduled_actions (
                 client_id, rule_id, card_id, action_type, action_params,
                 execute_at, status, trace_id, depth
               ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, 'pending', $7, $8)`,
              [
                input.clientId,
                rule.id,
                input.cardId,
                step.action_type,
                JSON.stringify(step.action_params ?? {}),
                executeAt.toISOString(),
                traceId,
                depth,
              ],
            );
            stepResults.push({
              step_index: stepIndex,
              action_type: step.action_type,
              status: "scheduled",
              execute_at: executeAt.toISOString(),
            });
            hasSuccessfulStep = true;
            continue;
          } catch (scheduleError) {
            if (!isMissingDbObjectError(scheduleError)) {
              throw scheduleError;
            }
            // Fallback: se migration ainda nao rodou, executa imediatamente.
          }
        }

        try {
          const execution = await executeActionStep(
            input.clientId,
            input.cardId,
            step,
            stepVariables,
            db,
          );
          const result = execution.result;

          if (execution.compensationStep) {
            compensationSteps.push({
              stepIndex,
              step: execution.compensationStep,
            });
          }

          stepResults.push({
            step_index: stepIndex,
            action_type: step.action_type,
            status: "success",
            result,
          });
          hasSuccessfulStep = true;
        } catch (error) {
          if (error instanceof ActionSkipError) {
            hasSkippedStep = true;
            firstSkipReason = firstSkipReason ?? error.reason;
            stepResults.push({
              step_index: stepIndex,
              action_type: step.action_type,
              status: "skipped",
              skip_reason: error.reason,
              message: error.message,
            });
            continue;
          }

          const message =
            error instanceof Error ? error.message : "Unknown action error";
          const retryableConfig = getExternalActionRetryConfig(
            step.action_type,
          );
          if (retryableConfig) {
            await enqueueExternalActionRetry({
              clientId: input.clientId,
              cardId: input.cardId,
              ruleId: rule.id,
              stepIndex,
              actionType: step.action_type,
              actionParams: step.action_params ?? {},
              errorMessage: message,
            });
          }

          stepResults.push({
            step_index: stepIndex,
            action_type: step.action_type,
            status: "failed",
            error: message,
          });

          if (step.on_error === "continue") {
            continue;
          }

          if (step.on_error === "compensate") {
            const reversed = [...compensationSteps].reverse();
            for (const compensationEntry of reversed) {
              try {
                const compensationResult = await executeActionStep(
                  input.clientId,
                  input.cardId,
                  compensationEntry.step,
                  stepVariables,
                  db,
                );
                stepResults.push({
                  step_index: compensationEntry.stepIndex,
                  action_type: compensationEntry.step.action_type,
                  status: "compensated",
                  result: compensationResult.result,
                });
              } catch (compError) {
                stepResults.push({
                  step_index: compensationEntry.stepIndex,
                  action_type: compensationEntry.step.action_type,
                  status: "compensation_failed",
                  error:
                    compError instanceof Error
                      ? compError.message
                      : "Unknown compensation error",
                });
              }
            }
          }

          ruleFailed = true;
          failureMessage = message;
          break;
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
      } else if (!hasSuccessfulStep && hasSkippedStep) {
        skippedRules++;
        await logRuleExecution({
          clientId: input.clientId,
          ruleId: rule.id,
          ruleVersion: rule.version ?? 1,
          cardId: input.cardId,
          triggerType: input.triggerType,
          triggerData,
          status: "skipped",
          skipReason: firstSkipReason ?? "all_steps_skipped",
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
    console.warn(
      `[crm-automation] 🔒 Card locked (concurrent process) cardId=${input.cardId} triggerType=${input.triggerType}`,
    );
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
  console.log(
    `[crm-automation] ✅ triggerType=${input.triggerType} cardId=${input.cardId} matched=${counters.matchedRules} executed=${counters.executedRules} skipped=${counters.skippedRules} failed=${counters.failedRules}`,
  );
  return {
    processed: true,
    matchedRules: counters.matchedRules,
    executedRules: counters.executedRules,
    skippedRules: counters.skippedRules,
    failedRules: counters.failedRules,
  };
};

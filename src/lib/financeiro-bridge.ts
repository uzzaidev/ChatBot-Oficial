/**
 * 🏦 Financeiro Bridge
 *
 * Routes WhatsApp messages from whitelisted numbers (the owner's personal
 * phone) to the external Financeiro agent at gestao.luisfboff.com. The
 * Financeiro agent has access to MCP planner tools and replies with either a
 * plain text message or an interactive (3-button) approval card.
 *
 * Wire-up: called from `chatbotFlow.ts` right after `parseMessage`, so the
 * chatbot's own AI pipeline is skipped for these messages and we don't burn
 * tokens, RAG, batching, or write to `clientes_whatsapp` history.
 *
 * Env (configure on the chatbot side, not the financeiro):
 *   FINANCEIRO_AGENT_URL        — e.g. https://gestao.luisfboff.com/api/agente/whatsapp
 *   FINANCEIRO_AGENT_TOKEN      — same string as the financeiro's DIGEST_API_TOKEN
 *   FINANCEIRO_OWNER_NUMBERS    — comma-separated whitelist of digits; missing = feature off
 *
 * Wire contract with the financeiro:
 *   Request:  { from: "<phone-digits>", message?: "<text>", button_id?: "<id>" }
 *   Response: { type: "text" | "interactive" | "noop", text?: string,
 *               buttons?: [{ id, title }], conversation_id?: string,
 *               reason?: string }
 */

import axios from "axios";

import { sendTextMessage } from "./meta";
import { sendInteractiveButtons } from "./whatsapp/interactiveMessages";
import type { ClientConfig } from "./types";

// ── Config ─────────────────────────────────────────────────────────────────
const FINANCEIRO_TIMEOUT_MS = 60_000; // financeiro agent can take a while (MCP + LLM)

interface FinanceiroReply {
  type: "text" | "interactive" | "noop";
  text?: string;
  buttons?: Array<{ id: string; title: string }>;
  conversation_id?: string;
  reason?: string;
}

function normalizePhone(raw: string): string {
  return raw.replace(/\D+/g, "");
}

/**
 * Derive a financeiro base URL from FINANCEIRO_AGENT_URL.
 * `https://gestao.luisfboff.com/api/agente/whatsapp` → `https://gestao.luisfboff.com`
 * Returns null when the env is unset/invalid.
 */
function getFinanceiroOrigin(): string | null {
  const raw = process.env.FINANCEIRO_AGENT_URL;
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

function loadAllowedNumbers(): Set<string> {
  const raw = process.env.FINANCEIRO_OWNER_NUMBERS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => normalizePhone(s))
      .filter((s) => s.length > 0),
  );
}

/**
 * Optional override: when set, all financeiro replies are delivered to this
 * WhatsApp number instead of the conversation's original `phone`. Necessary
 * because Meta Cloud API rejects `to == phone_number_id` (self-send), so for
 * Business-app self-chat the reply must land on a different WhatsApp account.
 */
function getReplyToOverride(): string | null {
  const raw = (process.env.FINANCEIRO_REPLY_TO ?? "").trim();
  if (!raw) return null;
  const normalized = normalizePhone(raw);
  return normalized.length > 0 ? normalized : null;
}

/**
 * True if `phone` is whitelisted as a financeiro owner. Accepts both:
 *  - any number in `FINANCEIRO_OWNER_NUMBERS` (canonical IDs — e.g. the BR
 *    business number the user types from in the Business app);
 *  - the `FINANCEIRO_REPLY_TO` number if set (the alternate WhatsApp account
 *    that receives replies, e.g. the user's French number). Including it here
 *    means button taps on the reply side also pass the gate.
 * Returns `false` when the env is unset (feature disabled).
 */
export const isFinanceiroOwner = (phone: string): boolean => {
  const normalized = normalizePhone(phone);
  const allowed = loadAllowedNumbers();
  if (allowed.has(normalized)) return true;
  const replyTo = getReplyToOverride();
  if (replyTo && normalized === replyTo) return true;
  return false;
};

/**
 * Map a raw incoming phone to the canonical owner phone the financeiro uses
 * to key the conversation. When the user sends from the `FINANCEIRO_REPLY_TO`
 * alias (e.g. taps a button on the French number), we re-key to the first
 * `FINANCEIRO_OWNER_NUMBERS` entry so the conversation history stays unified
 * and pending approvals are found. Returns `null` if the phone isn't owned.
 */
export const resolveCanonicalOwnerPhone = (rawPhone: string): string | null => {
  const normalized = normalizePhone(rawPhone);
  const allowed = loadAllowedNumbers();
  if (allowed.has(normalized)) return normalized;
  const replyTo = getReplyToOverride();
  if (replyTo && normalized === replyTo) {
    const first = [...allowed][0];
    return first ?? null;
  }
  return null;
};

/**
 * Forward a parsed user message to the financeiro agent and return the typed
 * reply. Returns `null` on transport errors so the caller can decide how to
 * surface the failure to the user.
 */
export const forwardToFinanceiro = async (params: {
  phone: string;
  text?: string;
  buttonId?: string;
}): Promise<FinanceiroReply | null> => {
  const url = process.env.FINANCEIRO_AGENT_URL;
  const token = process.env.FINANCEIRO_AGENT_TOKEN;
  if (!url || !token) {
    console.warn(
      "[financeiro-bridge] FINANCEIRO_AGENT_URL or FINANCEIRO_AGENT_TOKEN missing — skipping forward",
    );
    return null;
  }

  const body: Record<string, string> = { from: params.phone };
  if (params.buttonId) body.button_id = params.buttonId;
  else if (params.text) body.message = params.text;

  try {
    const res = await axios.post<FinanceiroReply>(url, body, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      timeout: FINANCEIRO_TIMEOUT_MS,
    });
    return res.data ?? null;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.error(
        "[financeiro-bridge] HTTP error",
        err.response?.status,
        err.response?.data ?? err.message,
      );
    } else {
      console.error("[financeiro-bridge] forward failed", err);
    }
    return null;
  }
};

/**
 * Send the financeiro reply back to the user via WhatsApp. Handles both
 * interactive (button card) and plain text replies. Silently no-ops on
 * `type: "noop"` (financeiro rejected the number) — caller already gated on
 * `isFinanceiroOwner`, so this only fires if envs disagree between repos.
 */
export const sendFinanceiroReply = async (params: {
  phone: string;
  reply: FinanceiroReply;
  config: ClientConfig;
}): Promise<{ ok: boolean; messageId?: string; error?: string; deliveredTo?: string }> => {
  const { phone, reply, config } = params;

  if (reply.type === "noop") {
    console.log(
      `[financeiro-bridge] financeiro replied noop (${reply.reason ?? "?"}) for ${phone} — not sending anything`,
    );
    return { ok: true };
  }

  // Silent mode: when FINANCEIRO_SILENT_MODE=true, the bridge never delivers
  // a WhatsApp message back. The conversation is still persisted in the
  // financeiro DB and visible in the web painel — this is the fire-and-forget
  // command mode (pair with WHATSAPP_AGENT_AUTO_APPROVE=true on financeiro).
  const silentMode = (process.env.FINANCEIRO_SILENT_MODE ?? "")
    .toLowerCase()
    .trim() === "true";
  if (silentMode) {
    console.log(
      `[financeiro-bridge] silent mode: not delivering reply (type=${reply.type}, length=${reply.text?.length ?? 0})`,
    );
    return { ok: true, deliveredTo: undefined };
  }

  // Self-send isn't allowed by Meta Cloud API. When FINANCEIRO_REPLY_TO is
  // configured, route the reply to that alternate WhatsApp number (e.g. a
  // personal number the user reads on a different device). Otherwise fall
  // back to the original conversation phone.
  const deliveredTo = getReplyToOverride() ?? phone;
  if (deliveredTo !== phone) {
    console.log(
      `[financeiro-bridge] redirecting reply: source=${phone} → reply_to=${deliveredTo}`,
    );
  }

  if (reply.type === "interactive") {
    if (!reply.text || !reply.buttons || reply.buttons.length === 0) {
      return { ok: false, error: "interactive reply missing text/buttons" };
    }
    try {
      const { messageId } = await sendInteractiveButtons(
        deliveredTo,
        { body: reply.text, buttons: reply.buttons },
        config,
      );
      return { ok: true, messageId, deliveredTo };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[financeiro-bridge] sendInteractiveButtons failed", msg);
      return { ok: false, error: msg, deliveredTo };
    }
  }

  // type === "text"
  if (!reply.text) {
    return { ok: false, error: "text reply missing text" };
  }
  try {
    const { messageId } = await sendTextMessage(deliveredTo, reply.text, config);
    return { ok: true, messageId, deliveredTo };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[financeiro-bridge] sendTextMessage failed", msg);
    return { ok: false, error: msg, deliveredTo };
  }
};

export interface RouteFinanceiroResult {
  ok: boolean;
  messageId?: string;
  replyType?: FinanceiroReply["type"];
  reason?: "forward_failed" | "send_failed";
  error?: string;
}

/**
 * Convenience: forward + send in one call. Use from the chatbot flow.
 * Returns a flat result so the caller can log/track outcomes without
 * having to fight TS narrowing through async boundaries.
 */
export const routeMessageToFinanceiro = async (params: {
  phone: string;
  text?: string;
  buttonId?: string;
  config: ClientConfig;
}): Promise<RouteFinanceiroResult> => {
  const reply = await forwardToFinanceiro({
    phone: params.phone,
    text: params.text,
    buttonId: params.buttonId,
  });
  if (!reply) {
    // Soft user-facing fallback so Luis isn't left in the dark on a transient outage.
    try {
      await sendTextMessage(
        params.phone,
        "⚠️ Não consegui falar com o assistente financeiro agora. Tenta de novo em alguns segundos.",
        params.config,
      );
    } catch {
      // best-effort fallback only
    }
    return { ok: false, reason: "forward_failed" };
  }
  const send = await sendFinanceiroReply({
    phone: params.phone,
    reply,
    config: params.config,
  });
  if (!send.ok) {
    return { ok: false, reason: "send_failed", error: send.error };
  }
  return { ok: true, messageId: send.messageId, replyType: reply.type };
};

// ── CSV import (Wise / Revolut) ────────────────────────────────────────────

export type CsvProvider = "wise" | "revolut";

/**
 * Detect the CSV provider from filename or content. We prefer filename
 * heuristics (cheap), then peek at the header line for the discriminating
 * column names. Returns `null` when neither matches — the caller logs and
 * skips so we never import the wrong table.
 */
export const detectCsvProvider = (
  filename: string | undefined,
  csvText: string,
): CsvProvider | null => {
  const name = (filename ?? "").toLowerCase();
  if (/(wise|transferwise|\btw\b)/.test(name)) return "wise";
  if (/(revolut|statement)/.test(name)) return "revolut";

  const firstLine = csvText.split(/\r?\n/, 1)[0]?.toLowerCase() ?? "";
  // Wise header signature: includes "direction" and "source amount" early on.
  if (firstLine.includes("direction") && firstLine.includes("source amount"))
    return "wise";
  // Revolut header signature: starts with Type,Product,Started Date...
  if (firstLine.includes("started date") && firstLine.includes("completed date"))
    return "revolut";

  return null;
};

/**
 * POST a CSV file as multipart to the financeiro provider endpoint. Returns
 * the parsed JSON response (`{ imported, skipped, brasilCreated }` for Wise;
 * provider-specific for Revolut). Throws on network/HTTP errors so the
 * caller can decide whether to surface to the user.
 */
export const forwardCsvToFinanceiro = async (params: {
  buffer: Buffer;
  filename: string;
  provider: CsvProvider;
}): Promise<Record<string, unknown>> => {
  const origin = getFinanceiroOrigin();
  const token = process.env.FINANCEIRO_AGENT_TOKEN;
  if (!origin || !token) {
    throw new Error("FINANCEIRO_AGENT_URL or FINANCEIRO_AGENT_TOKEN missing");
  }

  const url = `${origin}/api/${params.provider}/csv`;
  const form = new FormData();
  // Node 20 has global Blob/FormData/File. Convert Buffer to Uint8Array so
  // Blob accepts it cleanly across Node minor versions.
  const blob = new Blob([new Uint8Array(params.buffer)], { type: "text/csv" });
  form.append("file", blob, params.filename);

  // 60s timeout — the Wise route does N inserts; Revolut similar.
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 60_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
      signal: ctrl.signal,
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const errMsg =
        typeof data.error === "string" ? data.error : `HTTP ${res.status}`;
      throw new Error(`financeiro CSV import failed: ${errMsg}`);
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
};

// ── Media upload (audio/video → reunião gravacao) ──────────────────────────

/**
 * Upload an audio/video buffer to the chatbot's Supabase Storage and notify
 * the financeiro of the resulting URL. We MUST avoid sending the file body
 * through Vercel's serverless gateway because the platform caps request
 * bodies at ~4.5 MB on Node functions — anything beyond that fails with 413.
 * Supabase Storage has no such cap (bucket limit is 100 MB) and the public
 * URL it returns is HTTPS, so the financeiro can later fetch it directly
 * from /transcrever.
 *
 * Returns the financeiro JSON: `{ reuniaoId, gravacaoId, mediaUrl, titulo }`.
 * Throws on upload/network/HTTP errors.
 */
export const forwardMediaToFinanceiro = async (params: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  clientId: string;
}): Promise<Record<string, unknown>> => {
  const origin = getFinanceiroOrigin();
  const token = process.env.FINANCEIRO_AGENT_TOKEN;
  if (!origin || !token) {
    throw new Error("FINANCEIRO_AGENT_URL or FINANCEIRO_AGENT_TOKEN missing");
  }

  // Step 1 — upload to Supabase Storage (lives in the chatbot project).
  const { uploadFileToStorage } = await import("./storage");
  const mediaUrl = await uploadFileToStorage(
    params.buffer,
    params.filename,
    params.mimeType,
    params.clientId,
  );

  // Step 2 — register the recording in the financeiro (small JSON body).
  const url = `${origin}/api/agente/whatsapp/upload-audio`;
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mediaUrl,
        filename: params.filename,
        mimeType: params.mimeType,
        sizeBytes: params.buffer.length,
      }),
      signal: ctrl.signal,
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const errMsg =
        typeof data.error === "string" ? data.error : `HTTP ${res.status}`;
      throw new Error(`financeiro media register failed: ${errMsg}`);
    }
    return { ...data, mediaUrl };
  } finally {
    clearTimeout(timeout);
  }
};

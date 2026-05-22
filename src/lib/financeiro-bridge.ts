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
 * True if `phone` is whitelisted as a financeiro owner. The whitelist is
 * loaded from env on every call so a redeploy isn't required to add a number,
 * and `false` when the env is unset (feature disabled).
 */
export const isFinanceiroOwner = (phone: string): boolean => {
  const allowed = loadAllowedNumbers();
  if (allowed.size === 0) return false;
  return allowed.has(normalizePhone(phone));
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
}): Promise<{ ok: boolean; messageId?: string; error?: string }> => {
  const { phone, reply, config } = params;

  if (reply.type === "noop") {
    console.log(
      `[financeiro-bridge] financeiro replied noop (${reply.reason ?? "?"}) for ${phone} — not sending anything`,
    );
    return { ok: true };
  }

  if (reply.type === "interactive") {
    if (!reply.text || !reply.buttons || reply.buttons.length === 0) {
      return { ok: false, error: "interactive reply missing text/buttons" };
    }
    try {
      const { messageId } = await sendInteractiveButtons(
        phone,
        { body: reply.text, buttons: reply.buttons },
        config,
      );
      return { ok: true, messageId };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[financeiro-bridge] sendInteractiveButtons failed", msg);
      return { ok: false, error: msg };
    }
  }

  // type === "text"
  if (!reply.text) {
    return { ok: false, error: "text reply missing text" };
  }
  try {
    const { messageId } = await sendTextMessage(phone, reply.text, config);
    return { ok: true, messageId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[financeiro-bridge] sendTextMessage failed", msg);
    return { ok: false, error: msg };
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

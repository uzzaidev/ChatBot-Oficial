/**
 * 🧭 UzzOPS Bridge
 *
 * Routes WhatsApp messages that UzzAI partners send to the UzzAI number to the
 * UzzOPS Copiloto (https://uzzops.uzzai.com.br/api/agent/whatsapp) instead of
 * the sales bot. UzzOPS maps phone → person, decides what to do and answers
 * with text or a Confirmar/Cancelar card; this side is transport only.
 *
 * Wire-up: NODE 2.2 in `chatbotFlow.ts`, right after the financeiro bridge
 * (2.1) and BEFORE business hours (2.5), so the Copiloto also answers at night.
 * Routed messages skip the whole pipeline: no contact row, no batching, no
 * tokens, no history on this side.
 *
 * Env (all four required; any empty = bridge off, flow unchanged):
 *   UZZOPS_AGENT_URL       — https://uzzops.uzzai.com.br/api/agent/whatsapp
 *   UZZOPS_AGENT_SECRET    — HMAC secret, same value as UZZAPP_AGENT_SECRET on UzzOPS
 *   UZZOPS_MEMBER_NUMBERS  — comma-separated partner numbers (with or without the BR 9)
 *   UZZOPS_CLIENT_ID       — clients.id of the UzzAI number; other tenants never route
 *
 * Wire contract (UzzOPS contract R00, 16/11/2026):
 *   Request:  POST JSON { from, message, button_id, message_id, kind: "text" | "audio_transcript" }
 *             headers x-uzzapp-ts (Date.now() ms) + x-uzzapp-signature
 *             (hex HMAC-SHA256 of `${ts}.${rawBody}`), rejected after 5 min.
 *   Response: { type: "text" | "interactive" | "noop", text?, buttons? }
 *             400/401/404 = configuration problem → stay silent, log only.
 *             Timeout / network / other HTTP errors → tell the partner.
 *
 * Escape hatch: a member message starting with "#bot" goes to the sales bot,
 * so the partners can still test it from their own phones.
 */

import { createHmac } from "crypto";

// errorSafe, not warnSafe: warnSafe/infoSafe are no-ops in sanitizedLogger.
import { errorSafe } from "./sanitizedLogger";
import type { ClientConfig, MessageType } from "./types";
import type { ReplyButtonsParams } from "./whatsapp/interactiveMessages";

// ── Config ─────────────────────────────────────────────────────────────────
// UzzOPS answers within ~55 s (maxDuration 60). The webhook routes run with
// maxDuration 120 so audio download + Whisper + this wait + send all fit.
export const UZZOPS_TIMEOUT_MS = 58_000;

// "#bot" alone or followed by whitespace. Not \b: in JS it treats "ã" as a
// boundary, so "#botão" would escape too.
const SALES_BOT_ESCAPE = /^#bot(?=\s|$)/i;

export const UZZOPS_UNSUPPORTED_MEDIA_TEXT =
  "Por enquanto o Copiloto entende texto e áudio.";
export const UZZOPS_UNAVAILABLE_TEXT =
  "Não consegui falar com o Copiloto agora. Tenta de novo em instantes.";
export const UZZOPS_AUDIO_FAILED_TEXT =
  "Não consegui entender o áudio. Tenta de novo ou escreve a mensagem.";

const LOG_CONTEXT = "uzzops-bridge";

export interface UzzopsBridgeEnv {
  url?: string;
  secret?: string;
  memberNumbers?: string;
  clientId?: string;
}

export const readUzzopsBridgeEnv = (): UzzopsBridgeEnv => ({
  url: process.env.UZZOPS_AGENT_URL,
  secret: process.env.UZZOPS_AGENT_SECRET,
  memberNumbers: process.env.UZZOPS_MEMBER_NUMBERS,
  clientId: process.env.UZZOPS_CLIENT_ID,
});

// ── Gate ───────────────────────────────────────────────────────────────────
const digitsOnly = (raw: string): string => raw.replace(/\D+/g, "");

/**
 * Brazilian wa_ids often come WITHOUT the mobile 9 (12 digits), while people
 * write their number WITH it (13 digits). Returns both forms so either side
 * matches. Non-BR numbers come back as-is.
 */
export const brazilPhoneVariants = (raw: string): string[] => {
  const digits = digitsOnly(raw);
  if (!digits.startsWith("55")) return [digits];
  const areaCode = digits.slice(2, 4);
  const local = digits.slice(4);
  if (local.length === 9 && local.startsWith("9")) {
    return [digits, `55${areaCode}${local.slice(1)}`];
  }
  if (local.length === 8) return [digits, `55${areaCode}9${local}`];
  return [digits];
};

const isConfigured = (env: UzzopsBridgeEnv): boolean =>
  [env.url, env.secret, env.memberNumbers, env.clientId].every(
    (value) => (value ?? "").trim().length > 0,
  );

/**
 * True only when the bridge is fully configured, the message reached the
 * UzzAI client (UZZOPS_CLIENT_ID) and the sender is on the member list.
 */
export const isUzzopsMember = (params: {
  clientId: string;
  phone: string;
  env?: UzzopsBridgeEnv;
}): boolean => {
  const env = params.env ?? readUzzopsBridgeEnv();
  if (!isConfigured(env)) return false;
  if (params.clientId !== (env.clientId ?? "").trim()) return false;

  const members = new Set(
    (env.memberNumbers ?? "")
      .split(",")
      .flatMap(brazilPhoneVariants)
      .filter((number) => number.length > 0),
  );
  return brazilPhoneVariants(params.phone).some((variant) =>
    members.has(variant),
  );
};

// ── Routing decision (pure) ────────────────────────────────────────────────
export type UzzopsRouteDecision =
  | { action: "skip" } // not a member / bridge off: normal flow
  | { action: "sales_bot" } // member typed "#bot ...": normal flow
  | { action: "ignore" } // reactions: end silently
  | { action: "unsupported_media" }
  | { action: "forward_text"; message: string }
  | { action: "forward_button"; buttonId: string }
  | { action: "forward_audio"; mediaId: string };

export interface UzzopsRouteInput {
  clientId: string;
  phone: string;
  type: MessageType;
  content?: string;
  interactiveType?: "button_reply" | "list_reply";
  interactiveResponseId?: string;
  mediaId?: string;
  env?: UzzopsBridgeEnv;
}

export const decideUzzopsRoute = (
  input: UzzopsRouteInput,
): UzzopsRouteDecision => {
  if (!isUzzopsMember(input)) return { action: "skip" };

  if (input.type === "text") {
    const message = (input.content ?? "").trim();
    return SALES_BOT_ESCAPE.test(message)
      ? { action: "sales_bot" }
      : { action: "forward_text", message };
  }

  if (input.type === "interactive" && input.interactiveResponseId) {
    return { action: "forward_button", buttonId: input.interactiveResponseId };
  }

  if (input.type === "audio" && input.mediaId) {
    return { action: "forward_audio", mediaId: input.mediaId };
  }

  if (input.type === "reaction") return { action: "ignore" };

  return { action: "unsupported_media" };
};

// ── Signed request ─────────────────────────────────────────────────────────
export interface UzzopsRequestPayload {
  from: string;
  message: string | null;
  button_id: string | null;
  message_id: string | null;
  kind: "text" | "audio_transcript";
}

export const signUzzopsRequest = (
  secret: string,
  timestamp: string,
  rawBody: string,
): string =>
  createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");

export type UzzopsReply =
  | { type: "text"; text: string }
  | { type: "interactive"; text: string; buttons: ReplyButtonsParams["buttons"] }
  | { type: "noop" };

const isButton = (value: unknown): value is { id: string; title: string } =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { id?: unknown }).id === "string" &&
  typeof (value as { title?: unknown }).title === "string";

export const parseUzzopsReply = (data: unknown): UzzopsReply | null => {
  if (typeof data !== "object" || data === null) return null;
  const { type, text, buttons } = data as {
    type?: unknown;
    text?: unknown;
    buttons?: unknown;
  };

  if (type === "noop") return { type: "noop" };
  if (typeof text !== "string" || text.trim().length === 0) return null;
  if (type === "text") return { type: "text", text };

  if (
    type === "interactive" &&
    Array.isArray(buttons) &&
    buttons.length > 0 &&
    buttons.length <= 3 &&
    buttons.every(isButton)
  ) {
    return {
      type: "interactive",
      text,
      buttons: buttons.map(({ id, title }) => ({ id, title })),
    };
  }
  return null;
};

export type UzzopsCallResult =
  | { outcome: "reply"; reply: UzzopsReply }
  | { outcome: "config_error"; status: number }
  | {
      outcome: "unavailable";
      reason: "timeout" | "network" | "http_error" | "invalid_reply";
      status?: number;
    };

// Contract: these mean "integration off / bad signature / bad request".
const CONFIG_ERROR_STATUSES = new Set([400, 401, 404]);

export const callUzzops = async (params: {
  payload: UzzopsRequestPayload;
  env: UzzopsBridgeEnv;
  fetchImpl?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
}): Promise<UzzopsCallResult> => {
  const fetchImpl = params.fetchImpl ?? fetch;
  const timestamp = String((params.now ?? Date.now)());
  const rawBody = JSON.stringify(params.payload);
  const signature = signUzzopsRequest(
    params.env.secret ?? "",
    timestamp,
    rawBody,
  );

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    params.timeoutMs ?? UZZOPS_TIMEOUT_MS,
  );

  try {
    const res = await fetchImpl(params.env.url ?? "", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-uzzapp-ts": timestamp,
        "x-uzzapp-signature": signature,
      },
      body: rawBody,
      signal: controller.signal,
    });

    if (CONFIG_ERROR_STATUSES.has(res.status)) {
      return { outcome: "config_error", status: res.status };
    }
    if (!res.ok) {
      return { outcome: "unavailable", reason: "http_error", status: res.status };
    }

    const reply = parseUzzopsReply(await res.json().catch(() => null));
    return reply
      ? { outcome: "reply", reply }
      : { outcome: "unavailable", reason: "invalid_reply", status: res.status };
  } catch {
    return {
      outcome: "unavailable",
      reason: controller.signal.aborted ? "timeout" : "network",
    };
  } finally {
    clearTimeout(timer);
  }
};

// ── Delivery ───────────────────────────────────────────────────────────────
export interface UzzopsSenders {
  sendText: (
    phone: string,
    text: string,
    config: ClientConfig,
  ) => Promise<{ messageId: string }>;
  sendButtons: (
    phone: string,
    params: ReplyButtonsParams,
    config: ClientConfig,
  ) => Promise<{ messageId: string }>;
}

const defaultSenders = async (): Promise<UzzopsSenders> => {
  const { sendTextMessage } = await import("./meta");
  const { sendInteractiveButtons } = await import(
    "./whatsapp/interactiveMessages"
  );
  return { sendText: sendTextMessage, sendButtons: sendInteractiveButtons };
};

/** Downloads the voice note and runs Whisper with the UzzAI client's own key. */
export type AudioTranscriber = (params: {
  mediaId: string;
  phone: string;
  config: ClientConfig;
}) => Promise<string>;

const defaultTranscriber: AudioTranscriber = async ({ mediaId, phone, config }) => {
  const { downloadMetaMedia } = await import("@/nodes/downloadMetaMedia");
  const { transcribeAudio } = await import("@/nodes/transcribeAudio");
  const audio = await downloadMetaMedia(mediaId, config.apiKeys.metaAccessToken);
  const result = await transcribeAudio(
    audio,
    config.apiKeys.openaiApiKey,
    config.id,
    phone,
  );
  try {
    const { logWhisperUsage } = await import("./usageTracking");
    await logWhisperUsage(
      config.id,
      undefined,
      phone,
      result.durationSeconds || 0,
      result.usage.total_tokens,
    );
  } catch {
    // usage tracking is best-effort
  }
  return result.text;
};

export type UzzopsRouteOutcome =
  | "replied"
  | "noop"
  | "ignored"
  | "unsupported_media"
  | "config_error"
  | "unavailable"
  | "audio_failed"
  | "send_failed";

export interface RouteUzzopsResult {
  ok: boolean;
  outcome: UzzopsRouteOutcome;
  replyType?: UzzopsReply["type"];
  status?: number;
}

type ForwardDecision = Exclude<
  UzzopsRouteDecision,
  { action: "skip" } | { action: "sales_bot" }
>;

/**
 * Handles a member message end to end: transcribe (audio), call UzzOPS,
 * deliver the reply or the right fallback. Never throws. Logs carry no phone,
 * message body or secret — only outcome, status and reason.
 */
export const routeMessageToUzzops = async (params: {
  decision: ForwardDecision;
  phone: string;
  messageId?: string;
  config: ClientConfig;
  env?: UzzopsBridgeEnv;
  senders?: UzzopsSenders;
  transcribe?: AudioTranscriber;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): Promise<RouteUzzopsResult> => {
  const { decision, phone, config } = params;
  const env = params.env ?? readUzzopsBridgeEnv();

  if (decision.action === "ignore") return { ok: true, outcome: "ignored" };

  const senders = params.senders ?? (await defaultSenders());
  const sendFallback = async (text: string): Promise<void> => {
    try {
      await senders.sendText(phone, text, config);
    } catch {
      errorSafe("fallback message not delivered", undefined, LOG_CONTEXT);
    }
  };

  if (decision.action === "unsupported_media") {
    await sendFallback(UZZOPS_UNSUPPORTED_MEDIA_TEXT);
    return { ok: true, outcome: "unsupported_media" };
  }

  const transcript =
    decision.action === "forward_audio"
      ? await (params.transcribe ?? defaultTranscriber)({
          mediaId: decision.mediaId,
          phone,
          config,
        }).catch(() => null)
      : undefined;

  if (transcript === null || transcript?.trim() === "") {
    errorSafe("audio transcription failed", undefined, LOG_CONTEXT);
    await sendFallback(UZZOPS_AUDIO_FAILED_TEXT);
    return { ok: false, outcome: "audio_failed" };
  }

  const payload: UzzopsRequestPayload = {
    from: digitsOnly(phone),
    message:
      decision.action === "forward_text"
        ? decision.message
        : (transcript ?? null),
    button_id: decision.action === "forward_button" ? decision.buttonId : null,
    message_id: params.messageId ?? null,
    kind: decision.action === "forward_audio" ? "audio_transcript" : "text",
  };

  const call = await callUzzops({
    payload,
    env,
    fetchImpl: params.fetchImpl,
    timeoutMs: params.timeoutMs,
  });

  if (call.outcome === "config_error") {
    errorSafe(
      "UzzOPS refused the request (integration off, bad signature or bad request)",
      { status: call.status },
      LOG_CONTEXT,
    );
    return { ok: false, outcome: "config_error", status: call.status };
  }

  if (call.outcome === "unavailable") {
    errorSafe(
      "UzzOPS unavailable",
      { reason: call.reason, status: call.status },
      LOG_CONTEXT,
    );
    await sendFallback(UZZOPS_UNAVAILABLE_TEXT);
    return { ok: false, outcome: "unavailable", status: call.status };
  }

  const { reply } = call;
  if (reply.type === "noop") return { ok: true, outcome: "noop", replyType: "noop" };

  try {
    if (reply.type === "interactive") {
      await senders.sendButtons(
        phone,
        { body: reply.text, buttons: reply.buttons },
        config,
      );
    } else {
      await senders.sendText(phone, reply.text, config);
    }
    return { ok: true, outcome: "replied", replyType: reply.type };
  } catch {
    errorSafe("reply not delivered", { replyType: reply.type }, LOG_CONTEXT);
    return { ok: false, outcome: "send_failed", replyType: reply.type };
  }
};

import { createHmac } from "crypto";

import {
  brazilPhoneVariants,
  callUzzops,
  decideUzzopsRoute,
  describeUzzopsFailure,
  isUzzopsMember,
  routeMessageToUzzops,
  signUzzopsRequest,
  UZZOPS_AUDIO_FAILED_TEXT,
  UZZOPS_UNAVAILABLE_TEXT,
  UZZOPS_UNSUPPORTED_MEDIA_TEXT,
  type UzzopsBridgeEnv,
  type UzzopsRequestPayload,
} from "@/lib/uzzops-bridge";
import type { ClientConfig } from "@/lib/types";

const UZZAI_CLIENT = "11111111-1111-1111-1111-111111111111";
const OTHER_CLIENT = "22222222-2222-2222-2222-222222222222";
const SECRET = "s".repeat(40);
// Member typed WITH the 9; Meta delivers the wa_id WITHOUT it.
const MEMBER_TYPED = "+55 54 99999-1234";
const MEMBER_WA_ID = "555499991234";

const env: UzzopsBridgeEnv = {
  url: "https://uzzops.example.test/api/agent/whatsapp",
  secret: SECRET,
  memberNumbers: `${MEMBER_TYPED}, 5511988887777`,
  clientId: UZZAI_CLIENT,
};

const config = {
  id: UZZAI_CLIENT,
  apiKeys: { metaAccessToken: "meta", openaiApiKey: "openai" },
} as unknown as ClientConfig;

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const makeSenders = () => ({
  sendText: jest.fn(async () => ({ messageId: "wamid.out" })),
  sendButtons: jest.fn(async () => ({ messageId: "wamid.out" })),
});

describe("brazilPhoneVariants", () => {
  it("returns the number with and without the mobile 9", () => {
    expect(brazilPhoneVariants("5554999991234")).toEqual([
      "5554999991234",
      "555499991234",
    ]);
    expect(brazilPhoneVariants("555499991234")).toEqual([
      "555499991234",
      "5554999991234",
    ]);
  });

  it("leaves non-Brazilian numbers alone", () => {
    expect(brazilPhoneVariants("+33 6 12 34 56 78")).toEqual(["33612345678"]);
  });
});

describe("gate (isUzzopsMember)", () => {
  it("matches a listed member whose wa_id comes without the 9", () => {
    expect(isUzzopsMember({ clientId: UZZAI_CLIENT, phone: MEMBER_WA_ID, env })).toBe(true);
  });

  it("is off when UZZOPS_CLIENT_ID is empty", () => {
    expect(
      isUzzopsMember({ clientId: UZZAI_CLIENT, phone: MEMBER_WA_ID, env: { ...env, clientId: "" } }),
    ).toBe(false);
  });

  it("is off when any other UZZOPS_* is empty", () => {
    const keys: Array<keyof UzzopsBridgeEnv> = ["url", "secret", "memberNumbers"];
    keys.forEach((key) => {
      expect(
        isUzzopsMember({ clientId: UZZAI_CLIENT, phone: MEMBER_WA_ID, env: { ...env, [key]: " " } }),
      ).toBe(false);
    });
  });

  it("never routes another tenant, even from a member number", () => {
    expect(isUzzopsMember({ clientId: OTHER_CLIENT, phone: MEMBER_WA_ID, env })).toBe(false);
  });

  it("ignores numbers outside the list", () => {
    expect(isUzzopsMember({ clientId: UZZAI_CLIENT, phone: "555433334444", env })).toBe(false);
  });
});

describe("decideUzzopsRoute", () => {
  const base = { clientId: UZZAI_CLIENT, phone: MEMBER_WA_ID, env };

  it("skips non-members", () => {
    expect(decideUzzopsRoute({ ...base, phone: "555433334444", type: "text", content: "oi" })).toEqual({
      action: "skip",
    });
  });

  it("sends '#bot ...' to the sales bot (option B)", () => {
    expect(decideUzzopsRoute({ ...base, type: "text", content: "  #BOT quanto custa?" })).toEqual({
      action: "sales_bot",
    });
    expect(decideUzzopsRoute({ ...base, type: "text", content: "#bot" }).action).toBe("sales_bot");
    expect(decideUzzopsRoute({ ...base, type: "text", content: "#botão" }).action).toBe("forward_text");
    expect(decideUzzopsRoute({ ...base, type: "text", content: "#bots" }).action).toBe("forward_text");
  });

  it("forwards text, button taps and audio", () => {
    expect(decideUzzopsRoute({ ...base, type: "text", content: " o que tenho hoje? " })).toEqual({
      action: "forward_text",
      message: "o que tenho hoje?",
    });
    expect(
      decideUzzopsRoute({
        ...base,
        type: "interactive",
        interactiveType: "button_reply",
        interactiveResponseId: "ok:abc",
      }),
    ).toEqual({ action: "forward_button", buttonId: "ok:abc" });
    expect(decideUzzopsRoute({ ...base, type: "audio", mediaId: "media-1" })).toEqual({
      action: "forward_audio",
      mediaId: "media-1",
    });
  });

  it("answers images/documents with the unsupported notice and ignores reactions", () => {
    expect(decideUzzopsRoute({ ...base, type: "image", mediaId: "m" }).action).toBe("unsupported_media");
    expect(decideUzzopsRoute({ ...base, type: "document", mediaId: "m" }).action).toBe("unsupported_media");
    expect(decideUzzopsRoute({ ...base, type: "reaction" }).action).toBe("ignore");
  });
});

describe("signed request (callUzzops)", () => {
  const payload: UzzopsRequestPayload = {
    from: MEMBER_WA_ID,
    message: "o que tenho hoje?",
    button_id: null,
    message_id: "wamid.XXX",
    kind: "text",
  };

  it("signs `${ts}.${rawBody}` exactly as the UzzOPS contract example", async () => {
    const fetchImpl = jest.fn(async () => jsonResponse({ type: "noop" }));
    await callUzzops({ payload, env, fetchImpl, now: () => 1_763_300_000_000 });

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    const expected = createHmac("sha256", SECRET)
      .update(`${headers["x-uzzapp-ts"]}.${init.body as string}`)
      .digest("hex");

    expect(url).toBe(env.url);
    expect(init.method).toBe("POST");
    expect(headers["content-type"]).toBe("application/json");
    expect(headers["x-uzzapp-ts"]).toBe("1763300000000");
    expect(headers["x-uzzapp-signature"]).toBe(expected);
    expect(headers["x-uzzapp-signature"]).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.parse(init.body as string)).toEqual(payload);
    expect(signUzzopsRequest(SECRET, "1", "{}")).not.toBe(signUzzopsRequest("x".repeat(40), "1", "{}"));
  });

  it("ignores spaces and newlines around the secret and the URL, like UzzOPS (23/11 incident)", async () => {
    const fetchImpl = jest.fn(async () => jsonResponse({ type: "noop" }));
    await callUzzops({
      payload,
      env: { ...env, secret: `  ${SECRET}\n`, url: ` ${env.url}\n` },
      fetchImpl,
      now: () => 1_763_300_000_000,
    });

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(url).toBe(env.url);
    expect(headers["x-uzzapp-signature"]).toBe(
      createHmac("sha256", SECRET).update(`1763300000000.${init.body as string}`).digest("hex"),
    );
  });

  it.each([400, 401, 404])("treats HTTP %i as a configuration error and keeps UzzOPS's reason", async (status) => {
    const fetchImpl = jest.fn(async () => jsonResponse({ error: "assinatura inválida" }, status));
    await expect(callUzzops({ payload, env, fetchImpl })).resolves.toEqual({
      outcome: "config_error",
      status,
      detail: "assinatura inválida",
    });
  });

  it("describes failures in one line for the execution log", () => {
    expect(
      describeUzzopsFailure({ ok: false, outcome: "config_error", status: 401, detail: "assinatura inválida" }),
    ).toBe("uzzops_config_error 401: assinatura inválida");
    expect(describeUzzopsFailure({ ok: false, outcome: "unavailable" })).toBe("uzzops_unavailable");
  });

  it("treats other HTTP errors and malformed replies as unavailable", async () => {
    await expect(
      callUzzops({ payload, env, fetchImpl: jest.fn(async () => jsonResponse({}, 504)) }),
    ).resolves.toMatchObject({ outcome: "unavailable", reason: "http_error", status: 504 });
    await expect(
      callUzzops({ payload, env, fetchImpl: jest.fn(async () => jsonResponse({ type: "interactive", text: "x" })) }),
    ).resolves.toMatchObject({ outcome: "unavailable", reason: "invalid_reply" });
  });

  it("gives up after the timeout", async () => {
    const hangingFetch = jest.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );
    await expect(
      callUzzops({ payload, env, fetchImpl: hangingFetch as unknown as typeof fetch, timeoutMs: 20 }),
    ).resolves.toEqual({ outcome: "unavailable", reason: "timeout" });
  });

  it("reports network failures", async () => {
    const failingFetch = jest.fn(async () => {
      throw new Error("ECONNRESET");
    });
    await expect(
      callUzzops({ payload, env, fetchImpl: failingFetch as unknown as typeof fetch }),
    ).resolves.toEqual({ outcome: "unavailable", reason: "network" });
  });
});

describe("routeMessageToUzzops", () => {
  const route = (overrides: Partial<Parameters<typeof routeMessageToUzzops>[0]>) => {
    const senders = makeSenders();
    return {
      senders,
      run: () =>
        routeMessageToUzzops({
          decision: { action: "forward_text", message: "o que tenho hoje?" },
          phone: MEMBER_WA_ID,
          messageId: "wamid.IN",
          config,
          env,
          senders,
          ...overrides,
        }),
    };
  };

  it("delivers a text reply", async () => {
    const fetchImpl = jest.fn(async () => jsonResponse({ type: "text", text: "*Hoje:* A-012" }));
    const { senders, run } = route({ fetchImpl });
    await expect(run()).resolves.toEqual({ ok: true, outcome: "replied", replyType: "text" });
    expect(senders.sendText).toHaveBeenCalledWith(MEMBER_WA_ID, "*Hoje:* A-012", config);
    expect(senders.sendButtons).not.toHaveBeenCalled();
  });

  it("delivers the Confirmar/Cancelar card", async () => {
    const buttons = [
      { id: "ok:7d1c", title: "Confirmar" },
      { id: "no:7d1c", title: "Cancelar" },
    ];
    const fetchImpl = jest.fn(async () => jsonResponse({ type: "interactive", text: "Adiar A-012?", buttons }));
    const { senders, run } = route({ fetchImpl });
    await expect(run()).resolves.toMatchObject({ ok: true, replyType: "interactive" });
    expect(senders.sendButtons).toHaveBeenCalledWith(MEMBER_WA_ID, { body: "Adiar A-012?", buttons }, config);
  });

  it("sends nothing on noop", async () => {
    const fetchImpl = jest.fn(async () => jsonResponse({ type: "noop" }));
    const { senders, run } = route({ fetchImpl });
    await expect(run()).resolves.toEqual({ ok: true, outcome: "noop", replyType: "noop" });
    expect(senders.sendText).not.toHaveBeenCalled();
    expect(senders.sendButtons).not.toHaveBeenCalled();
  });

  it("forwards a button tap with button_id and no message", async () => {
    const fetchImpl = jest.fn(async () => jsonResponse({ type: "text", text: "Feito." }));
    const { run } = route({ fetchImpl, decision: { action: "forward_button", buttonId: "ok:7d1c" } });
    await run();
    const body = JSON.parse((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body).toEqual({
      from: MEMBER_WA_ID,
      message: null,
      button_id: "ok:7d1c",
      message_id: "wamid.IN",
      kind: "text",
    });
  });

  it("transcribes audio here and sends kind audio_transcript", async () => {
    const fetchImpl = jest.fn(async () => jsonResponse({ type: "text", text: "Nota salva." }));
    const transcribe = jest.fn(async () => "registrar nota no projeto Liga");
    const { run } = route({ fetchImpl, transcribe, decision: { action: "forward_audio", mediaId: "media-1" } });
    await expect(run()).resolves.toMatchObject({ ok: true, outcome: "replied" });
    expect(transcribe).toHaveBeenCalledWith({ mediaId: "media-1", phone: MEMBER_WA_ID, config });
    const body = JSON.parse((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body).toMatchObject({ message: "registrar nota no projeto Liga", kind: "audio_transcript" });
  });

  it("tells the member when the audio can't be transcribed, without calling UzzOPS", async () => {
    const fetchImpl = jest.fn();
    const transcribe = jest.fn(async () => {
      throw new Error("whisper down");
    });
    const { senders, run } = route({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      transcribe,
      decision: { action: "forward_audio", mediaId: "media-1" },
    });
    await expect(run()).resolves.toEqual({ ok: false, outcome: "audio_failed" });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(senders.sendText).toHaveBeenCalledWith(MEMBER_WA_ID, UZZOPS_AUDIO_FAILED_TEXT, config);
  });

  it("answers images with the unsupported notice, without calling UzzOPS", async () => {
    const fetchImpl = jest.fn();
    const { senders, run } = route({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      decision: { action: "unsupported_media" },
    });
    await expect(run()).resolves.toEqual({ ok: true, outcome: "unsupported_media" });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(senders.sendText).toHaveBeenCalledWith(MEMBER_WA_ID, UZZOPS_UNSUPPORTED_MEDIA_TEXT, config);
  });

  it("stays silent on configuration errors (adjustment 2)", async () => {
    const fetchImpl = jest.fn(async () => jsonResponse({ error: "off" }, 404));
    const { senders, run } = route({ fetchImpl });
    await expect(run()).resolves.toEqual({
      ok: false,
      outcome: "config_error",
      status: 404,
      detail: "off",
    });
    expect(senders.sendText).not.toHaveBeenCalled();
  });

  it("warns the member on timeout (adjustment 2)", async () => {
    const hangingFetch = jest.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );
    const { senders, run } = route({ fetchImpl: hangingFetch as unknown as typeof fetch, timeoutMs: 20 });
    await expect(run()).resolves.toMatchObject({ ok: false, outcome: "unavailable" });
    expect(senders.sendText).toHaveBeenCalledWith(MEMBER_WA_ID, UZZOPS_UNAVAILABLE_TEXT, config);
  });

  it("does nothing for reactions", async () => {
    const fetchImpl = jest.fn();
    const { senders, run } = route({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      decision: { action: "ignore" },
    });
    await expect(run()).resolves.toEqual({ ok: true, outcome: "ignored" });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(senders.sendText).not.toHaveBeenCalled();
  });

  it("never logs the phone, the message or the secret", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = jest.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const failing = jest.fn(async () => jsonResponse({}, 500));
      await route({ fetchImpl: failing }).run();
      await route({ fetchImpl: jest.fn(async () => jsonResponse({}, 401)) }).run();
      const logged = JSON.stringify([...warn.mock.calls, ...error.mock.calls]);
      expect(error).toHaveBeenCalled();
      expect(logged).not.toContain(MEMBER_WA_ID);
      expect(logged).not.toContain("o que tenho hoje");
      expect(logged).not.toContain(SECRET);
    } finally {
      warn.mockRestore();
      error.mockRestore();
    }
  });
});

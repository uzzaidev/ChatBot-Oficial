import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as globalWebhookPOST } from "@/app/api/webhook/route";
import { POST as scopedWebhookPOST } from "@/app/api/webhook/[clientId]/route";
import { processChatbotMessage } from "@/flows/chatbotFlow";
import { getClientConfig } from "@/lib/config";
import { checkDuplicateMessage, markMessageAsProcessed } from "@/lib/dedup";
import { query } from "@/lib/postgres";
import { getClientByWABAId } from "@/lib/waba-lookup";

vi.mock("@/flows/chatbotFlow", () => ({
  processChatbotMessage: vi.fn(),
}));

vi.mock("@/lib/auto-provision", () => ({
  handleUnknownWABA: vi.fn(),
}));

vi.mock("@/lib/coexistence-sync", () => ({
  updateClientProvisioningStatus: vi.fn(),
}));

vi.mock("@/lib/config", () => ({
  getClientConfig: vi.fn(),
}));

vi.mock("@/lib/dedup", () => ({
  checkDuplicateMessage: vi.fn(),
  markMessageAsProcessed: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  createExecutionLogger: vi.fn(() => ({
    startExecution: vi.fn(() => "exec-1"),
    logNodeStart: vi.fn(),
    logNodeSuccess: vi.fn(),
    logNodeError: vi.fn(),
    finishExecution: vi.fn(),
  })),
}));

vi.mock("@/lib/postgres", () => ({
  query: vi.fn(async () => ({ rows: [{ id: "archive-1" }] })),
}));

vi.mock("@/lib/push-dispatch", () => ({
  sendIncomingMessagePushWithTimeout: vi.fn(),
}));

vi.mock("@/lib/storage", () => ({
  uploadFileToStorage: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  createServiceRoleClient: vi.fn(() => ({ from: vi.fn() })),
}));

vi.mock("@/lib/waba-lookup", () => ({
  getClientByWABAId: vi.fn(),
}));

vi.mock("@/lib/webhookCache", () => ({
  addWebhookMessage: vi.fn(),
}));

vi.mock("@/lib/whatsapp/interactiveMessages", () => ({
  parseInteractiveMessage: vi.fn(() => null),
}));

vi.mock("@/nodes/analyzeDocument", () => ({
  analyzeDocument: vi.fn(),
}));

vi.mock("@/nodes/analyzeImage", () => ({
  analyzeImage: vi.fn(),
}));

vi.mock("@/nodes/downloadMetaMedia", () => ({
  downloadMetaMedia: vi.fn(),
}));

vi.mock("@/nodes/transcribeAudio", () => ({
  transcribeAudio: vi.fn(),
}));

vi.mock("@/nodes/updateMessageReaction", () => ({
  updateMessageReaction: vi.fn(),
}));

vi.mock("@/nodes/updateMessageStatus", () => ({
  processStatusUpdate: vi.fn(),
}));

const buildPayload = (wamid = "wamid.duplicate-1") => ({
  object: "whatsapp_business_account",
  entry: [
    {
      id: "waba-1",
      changes: [
        {
          field: "messages",
          value: {
            metadata: {
              phone_number_id: "phone-number-1",
            },
            contacts: [
              {
                wa_id: "555199999999",
                profile: { name: "Cliente Teste" },
              },
            ],
            messages: [
              {
                id: wamid,
                from: "555199999999",
                timestamp: "1766680000",
                type: "text",
                text: { body: "Oi" },
              },
            ],
          },
        },
      ],
    },
  ],
});

const sign = (rawBody: string, secret: string) =>
  `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`;

const createRequest = (url: string, rawBody: string, signature: string) =>
  new NextRequest(url, {
    method: "POST",
    body: rawBody,
    headers: {
      "x-hub-signature-256": signature,
      "content-type": "application/json",
    },
  });

describe("webhook duplicate guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(query).mockResolvedValue({ rows: [{ id: "archive-1" }] } as any);
    vi.mocked(checkDuplicateMessage).mockResolvedValue({
      alreadyProcessed: true,
      source: "redis",
    });
    vi.mocked(markMessageAsProcessed).mockResolvedValue({
      success: true,
      source: "redis",
    });
  });

  it("blocks duplicate messages on the global WABA webhook before the chatbot flow", async () => {
    process.env.META_PLATFORM_APP_SECRET = "platform-secret";
    vi.mocked(getClientByWABAId).mockResolvedValue({
      id: "client-a",
      name: "Cliente A",
    } as any);

    const rawBody = JSON.stringify(buildPayload());
    const response = await globalWebhookPOST(
      createRequest(
        "https://example.com/api/webhook",
        rawBody,
        sign(rawBody, "platform-secret"),
      ),
    );

    await expect(response.json()).resolves.toEqual({
      status: "DUPLICATE_MESSAGE_IGNORED",
    });
    expect(checkDuplicateMessage).toHaveBeenCalledWith(
      "client-a",
      "wamid.duplicate-1",
    );
    expect(markMessageAsProcessed).not.toHaveBeenCalled();
    expect(processChatbotMessage).not.toHaveBeenCalled();
  });

  it("blocks duplicate messages on the client webhook before the chatbot flow", async () => {
    vi.mocked(getClientConfig).mockResolvedValue({
      id: "client-b",
      name: "Cliente B",
      status: "active",
      apiKeys: {
        metaAppSecret: "client-secret",
      },
    } as any);

    const rawBody = JSON.stringify(buildPayload());
    const response = await scopedWebhookPOST(
      createRequest(
        "https://example.com/api/webhook/client-b",
        rawBody,
        sign(rawBody, "client-secret"),
      ),
      { params: Promise.resolve({ clientId: "client-b" }) },
    );

    await expect(response.text()).resolves.toBe("DUPLICATE_MESSAGE_IGNORED");
    expect(checkDuplicateMessage).toHaveBeenCalledWith(
      "client-b",
      "wamid.duplicate-1",
    );
    expect(markMessageAsProcessed).not.toHaveBeenCalled();
    expect(processChatbotMessage).not.toHaveBeenCalled();
  });
});

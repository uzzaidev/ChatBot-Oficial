/**
 * INTEGRATION TEST — opt-in, hits real DB + real OpenAI embeddings.
 *
 * Run:
 *   pnpm dlx dotenv-cli -e .env.local -- cross-env RUN_INTEGRATION=1 npx vitest run tests/integration/simulate-doc-search.integration.test.ts
 *
 * Skipped by default (regular `npx vitest run` won't trigger it).
 *
 * Goal: validate that after removing the `no_explicit_intent` and `wrong_stage`
 * gates, the document-search tool call finds and "sends" media for sportstraining.
 */

import { describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SPORTS_CLIENT_ID = "59ed984e-85f4-4784-ae76-2569371296af";
const URBAN_CLIENT_ID = "bcc165fe-3adb-498c-938e-f165cd5920f7";

const shouldRun =
  process.env.RUN_INTEGRATION === "1" &&
  !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL;

// Test-time replacement for vault.getClientOpenAIKey:
// production code uses Next.js cookies() which only works inside request scope.
// In vitest we use service role + the get_client_secret RPC directly.
const fetchVaultOpenAIKey = async (
  clientId: string,
): Promise<string | null> => {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data: clientRow } = await sb
    .from("clients")
    .select("openai_api_key_secret_id")
    .eq("id", clientId)
    .single();
  if (!clientRow?.openai_api_key_secret_id) return null;
  const { data } = await (sb as any).rpc("get_client_secret", {
    secret_id: clientRow.openai_api_key_secret_id,
  });
  return data ?? null;
};

vi.mock("@/lib/vault", async () => {
  const actual = await vi.importActual<any>("@/lib/vault");
  return {
    ...actual,
    getClientOpenAIKey: vi.fn(async (clientId: string) =>
      fetchVaultOpenAIKey(clientId),
    ),
  };
});

const sentImages: Array<{ phone: string; url: string }> = [];
const sentDocuments: Array<{ phone: string; url: string; filename: string }> =
  [];

vi.mock("@/lib/meta", () => ({
  sendTextMessage: vi.fn(async (phone: string, message: string) => {
    console.log(
      `\n[mock sendTextMessage] -> ${phone}\n  ${message.slice(0, 200)}`,
    );
    return { messageId: `mock-text-${Date.now()}` };
  }),
  sendImageMessage: vi.fn(async (phone: string, url: string) => {
    console.log(`\n[mock sendImageMessage] -> ${phone}\n  url=${url}`);
    sentImages.push({ phone, url });
    return { messageId: `mock-image-${Date.now()}` };
  }),
  sendDocumentMessage: vi.fn(
    async (phone: string, url: string, filename: string) => {
      console.log(
        `\n[mock sendDocumentMessage] -> ${phone}\n  url=${url}\n  filename=${filename}`,
      );
      sentDocuments.push({ phone, url, filename });
      return { messageId: `mock-doc-${Date.now()}` };
    },
  ),
  markMessageAsRead: vi.fn(async () => undefined),
}));

vi.mock("@/nodes/saveChatMessage", () => ({
  saveChatMessage: vi.fn(async (input: any) => {
    console.log(
      `[mock saveChatMessage] type=${
        input.type
      } hasMedia=${!!input.mediaMetadata} status=${input.status ?? "n/a"}`,
    );
    return undefined;
  }),
}));

const buildConfig = (clientId: string): any => ({
  id: clientId,
  name: "test-config",
  apiKeys: {
    metaAccessToken: process.env.META_ACCESS_TOKEN,
    metaPhoneNumberId: process.env.META_PHONE_NUMBER_ID,
  },
  settings: {},
});

describe.skipIf(!shouldRun)("integration: document search simulation", () => {
  it("SPORTS — query 'VALORES 2025' should NOT be blocked by no_explicit_intent", async () => {
    sentImages.length = 0;
    sentDocuments.length = 0;

    const { handleDocumentSearchToolCall } = await import(
      "@/nodes/handleDocumentSearchToolCall"
    );

    const result = await handleDocumentSearchToolCall({
      toolCall: {
        id: "sim-call-sports-1",
        function: {
          name: "buscar_documento",
          arguments: JSON.stringify({
            query: "VALORES 2025",
            document_type: "image",
          }),
        },
      },
      phone: "5500000000001",
      clientId: SPORTS_CLIENT_ID,
      config: buildConfig(SPORTS_CLIENT_ID),
      userMessage: "valores",
      contactMetadata: null,
    });

    console.log("\n[SPORTS result]", {
      decision: result.documentGateDecision,
      reason: result.documentGateReason,
      found: result.documentsFound,
      sent: result.documentsSent,
      filesSent: result.filesSent,
      searchMetadata: result.searchMetadata,
      message: result.message?.slice(0, 200),
    });

    expect(result.documentGateReason).not.toBe("no_explicit_intent");
    expect(result.documentGateReason).not.toBe("wrong_stage");
    // Should now find the VALORES 2025.jpeg catalog and SEND it as image.
    expect(result.searchMetadata?.chunksFound ?? 0).toBeGreaterThan(0);
    expect(result.documentsSent ?? 0).toBeGreaterThanOrEqual(1);
    expect(sentImages.length).toBeGreaterThanOrEqual(1);
  });

  it("SPORTS — natural language 'quanto custa o plano' must reach RAG", async () => {
    sentImages.length = 0;
    sentDocuments.length = 0;

    const { handleDocumentSearchToolCall } = await import(
      "@/nodes/handleDocumentSearchToolCall"
    );

    const result = await handleDocumentSearchToolCall({
      toolCall: {
        id: "sim-call-sports-2",
        function: {
          name: "buscar_documento",
          arguments: JSON.stringify({
            query: "tabela de valores planos",
            document_type: "any",
          }),
        },
      },
      phone: "5500000000002",
      clientId: SPORTS_CLIENT_ID,
      config: buildConfig(SPORTS_CLIENT_ID),
      userMessage: "quanto custa o plano?",
      contactMetadata: null,
    });

    console.log("\n[SPORTS plano result]", {
      decision: result.documentGateDecision,
      reason: result.documentGateReason,
      found: result.documentsFound,
      sent: result.documentsSent,
      filesSent: result.filesSent,
      searchMetadata: result.searchMetadata,
    });

    expect(result.documentGateReason).not.toBe("no_explicit_intent");
    expect(result.searchMetadata?.chunksFound ?? 0).toBeGreaterThan(0);
  });

  it("URBAN — should find .md content but NOT send any media (only .md exists)", async () => {
    sentImages.length = 0;
    sentDocuments.length = 0;

    const { handleDocumentSearchToolCall } = await import(
      "@/nodes/handleDocumentSearchToolCall"
    );

    const result = await handleDocumentSearchToolCall({
      toolCall: {
        id: "sim-call-urban-1",
        function: {
          name: "buscar_documento",
          arguments: JSON.stringify({
            query: "informações Santa Lucia",
            document_type: "any",
          }),
        },
      },
      phone: "5500000000003",
      clientId: URBAN_CLIENT_ID,
      config: buildConfig(URBAN_CLIENT_ID),
      userMessage: "me fala sobre o santa lucia",
      contactMetadata: null,
    });

    console.log("\n[URBAN result]", {
      decision: result.documentGateDecision,
      reason: result.documentGateReason,
      found: result.documentsFound,
      sent: result.documentsSent,
      textFilesFound: result.textFilesFound,
      filesSent: result.filesSent,
      searchMetadata: result.searchMetadata,
      message: result.message?.slice(0, 300),
    });

    expect(sentImages.length).toBe(0);
    expect(sentDocuments.length).toBe(0);
  });
});

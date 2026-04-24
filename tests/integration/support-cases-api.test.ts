import { GET as listSupportCases, POST as createSupportCase } from "@/app/api/support/cases/route";
import { PATCH as updateSupportCase } from "@/app/api/support/cases/[id]/route";
import { POST as convertSupportCase } from "@/app/api/support/cases/[id]/convert-task/route";
import { createServiceRoleClient } from "@/lib/supabase";
import { getClientIdFromSession } from "@/lib/supabase-server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-server", () => ({
  getClientIdFromSession: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  createServiceRoleClient: vi.fn(),
}));

describe("API /api/support/cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthorized on GET", async () => {
    vi.mocked(getClientIdFromSession).mockResolvedValue(null);
    const request = { nextUrl: new URL("http://localhost/api/support/cases") } as any;
    const response = await listSupportCases(request);
    expect(response.status).toBe(401);
  });

  it("returns support case list", async () => {
    vi.mocked(getClientIdFromSession).mockResolvedValue("client-1");
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              range: async () => ({ data: [{ id: "case-1" }], error: null }),
            }),
          }),
        }),
      }),
    } as any);

    const request = { nextUrl: new URL("http://localhost/api/support/cases") } as any;
    const response = await listSupportCases(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.length).toBe(1);
  });

  it("creates case when message looks like support", async () => {
    vi.mocked(getClientIdFromSession).mockResolvedValue("client-1");
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: () => ({
        upsert: () => ({
          select: () => ({
            single: async () => ({ data: { id: "case-created" }, error: null }),
          }),
        }),
      }),
    } as any);

    const request = {
      json: async () => ({
        phone: "555499999999",
        user_message: "estou com erro no sistema",
        detected_intent: "reclamacao",
      }),
    } as any;

    const response = await createSupportCase(request);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.created).toBe(true);
  });

  it("updates support case status", async () => {
    vi.mocked(getClientIdFromSession).mockResolvedValue("client-1");
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: () => ({
        update: () => ({
          eq: () => ({
            eq: () => ({
              select: () => ({
                single: async () => ({
                  data: { id: "case-1", status: "resolved" },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    } as any);

    const request = {
      json: async () => ({ status: "resolved" }),
    } as any;

    const response = await updateSupportCase(request, {
      params: Promise.resolve({ id: "case-1" }),
    } as any);
    expect(response.status).toBe(200);
  });

  it("converts support case into correction task", async () => {
    vi.mocked(getClientIdFromSession).mockResolvedValue("client-1");
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: "case-1",
                  client_id: "client-1",
                  root_cause_type: "prompt",
                  user_message: "resposta errada no atendimento",
                  metadata: {},
                },
                error: null,
              }),
            }),
          }),
        }),
        update: () => ({
          eq: () => ({
            eq: () => ({
              select: () => ({
                single: async () => ({
                  data: { id: "case-1", status: "in_progress" },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    } as any);

    const request = {} as any;
    const response = await convertSupportCase(request, {
      params: Promise.resolve({ id: "case-1" }),
    } as any);

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.task).toBeTruthy();
  });
});

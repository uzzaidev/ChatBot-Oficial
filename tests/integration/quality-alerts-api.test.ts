import { GET as getQualityAlerts } from "@/app/api/quality/alerts/route";
import { query } from "@/lib/postgres";
import { createServiceRoleClient } from "@/lib/supabase";
import { getClientIdFromSession } from "@/lib/supabase-server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-server", () => ({
  getClientIdFromSession: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  createServiceRoleClient: vi.fn(),
}));

vi.mock("@/lib/postgres", () => ({
  query: vi.fn(),
}));

const createAwaitableQuery = (result: { data?: any; error?: any }) => {
  const queryObj: any = {
    select: vi.fn(() => queryObj),
    eq: vi.fn(() => queryObj),
    gte: vi.fn(() => queryObj),
    then: (resolve: (value: any) => unknown) => Promise.resolve(result).then(resolve),
  };
  return queryObj;
};

describe("GET /api/quality/alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthorized", async () => {
    vi.mocked(getClientIdFromSession).mockResolvedValue(null);
    const request = { nextUrl: new URL("http://localhost/api/quality/alerts") } as any;
    const response = await getQualityAlerts(request);
    expect(response.status).toBe(401);
  });

  it("returns alerts payload", async () => {
    vi.mocked(getClientIdFromSession).mockResolvedValue("client-1");

    const traces15 = createAwaitableQuery({
      data: [
        { status: "pending", latency_total_ms: 15000 },
        { status: "success", latency_total_ms: 9000 },
      ],
      error: null,
    });
    const traces24 = createAwaitableQuery({
      data: [{ phone: "5551999999999" }],
      error: null,
    });

    let fromCalls = 0;
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn(() => {
        fromCalls += 1;
        return fromCalls === 1 ? traces15 : traces24;
      }),
    } as any);

    vi.mocked(query).mockResolvedValue({
      rows: [
        {
          contatos_no_periodo: 1,
          com_experiencia: 0,
          com_periodo_ou_dia: 0,
        },
      ],
    } as any);

    const request = { nextUrl: new URL("http://localhost/api/quality/alerts") } as any;
    const response = await getQualityAlerts(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.window15m.total).toBe(2);
    expect(Array.isArray(body.data.alerts)).toBe(true);
  });
});


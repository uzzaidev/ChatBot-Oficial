import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getTraces } from "@/app/api/traces/route";
import { getClientIdFromSession } from "@/lib/supabase-server";
import { createServiceRoleClient } from "@/lib/supabase";

vi.mock("@/lib/supabase-server", () => ({
  getClientIdFromSession: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  createServiceRoleClient: vi.fn(),
}));

type QueryResult = { data?: any; error?: { message?: string } | null };

const createAwaitableQuery = (result: QueryResult) => {
  const query: any = {
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    range: vi.fn(() => query),
    gte: vi.fn(() => query),
    lte: vi.fn(() => query),
    select: vi.fn(() => query),
    then: (resolve: (value: QueryResult) => unknown) =>
      Promise.resolve(result).then(resolve),
  };
  return query;
};

describe("GET /api/traces (vitest)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session is missing", async () => {
    vi.mocked(getClientIdFromSession).mockResolvedValue(null);
    vi.mocked(createServiceRoleClient).mockReturnValue({} as any);

    const request = {
      nextUrl: new URL("http://localhost/api/traces"),
      headers: new Headers(),
    } as any;

    const response = await getTraces(request);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error).toBe("unauthorized");
  });

  it("returns list data and costTodayUsd", async () => {
    vi.mocked(getClientIdFromSession).mockResolvedValue("client-1");

    const mainQuery = createAwaitableQuery({
      data: [{ id: "trace-1", cost_usd: 0.2 }],
      error: null,
    });
    const costQuery = createAwaitableQuery({
      data: [{ cost_usd: 0.2 }, { cost_usd: null }],
      error: null,
    });

    let fromCalls = 0;
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn(() => {
        fromCalls += 1;
        return fromCalls === 1 ? mainQuery : costQuery;
      }),
    } as any);

    const request = {
      nextUrl: new URL("http://localhost/api/traces?limit=10&offset=0"),
      headers: new Headers(),
    } as any;

    const response = await getTraces(request);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.meta.costTodayUsd).toBe(0.2);
  });
});


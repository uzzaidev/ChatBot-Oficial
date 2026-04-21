import { GET as getTraces } from "@/app/api/traces/route";
import { GET as getTraceDetail } from "@/app/api/traces/[id]/route";
import {
  createRouteHandlerClient,
  getClientIdFromSession,
} from "@/lib/supabase-server";

jest.mock("@/lib/supabase-server", () => ({
  createRouteHandlerClient: jest.fn(),
  getClientIdFromSession: jest.fn(),
}));

type QueryResult = { data?: any; error?: { message?: string } | null };

const createAwaitableQuery = (result: QueryResult) => {
  const query: any = {
    eq: jest.fn(() => query),
    order: jest.fn(() => query),
    range: jest.fn(() => query),
    gte: jest.fn(() => query),
    lte: jest.fn(() => query),
    select: jest.fn(() => query),
    single: jest.fn(() => Promise.resolve(result)),
    maybeSingle: jest.fn(() => Promise.resolve(result)),
    then: (resolve: (value: QueryResult) => unknown) =>
      Promise.resolve(result).then(resolve),
  };

  return query;
};

describe("Traces APIs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET /api/traces should return 401 when unauthenticated", async () => {
    (createRouteHandlerClient as jest.Mock).mockResolvedValue({});
    (getClientIdFromSession as jest.Mock).mockResolvedValue(null);

    const request = {
      nextUrl: new URL("http://localhost/api/traces"),
      headers: new Headers(),
    } as any;

    const response = await getTraces(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("unauthorized");
  });

  it("GET /api/traces should return data + costTodayUsd on success", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");

    const mainQuery = createAwaitableQuery({
      data: [{ id: "trace-1", cost_usd: 0.2 }],
      error: null,
    });
    const costQuery = createAwaitableQuery({
      data: [{ cost_usd: 0.2 }, { cost_usd: null }],
      error: null,
    });

    let fromCalls = 0;
    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      from: jest.fn(() => {
        fromCalls += 1;
        return fromCalls === 1 ? mainQuery : costQuery;
      }),
    });

    const request = {
      nextUrl: new URL("http://localhost/api/traces?limit=10&offset=0"),
      headers: new Headers(),
    } as any;

    const response = await getTraces(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.meta.limit).toBe(10);
    expect(body.meta.offset).toBe(0);
    expect(body.meta.costTodayUsd).toBe(0.2);
  });

  it("GET /api/traces should return 503 when traces tables are missing", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");

    const mainQuery = createAwaitableQuery({
      data: null,
      error: { message: 'relation "message_traces" does not exist' },
    });

    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      from: jest.fn(() => mainQuery),
    });

    const request = {
      nextUrl: new URL("http://localhost/api/traces"),
      headers: new Headers(),
    } as any;

    const response = await getTraces(request);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("traces_tables_missing");
  });

  it("GET /api/traces should return 500 for unexpected query errors", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");

    const mainQuery = createAwaitableQuery({
      data: null,
      error: { message: "permission denied" },
    });

    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      from: jest.fn(() => mainQuery),
    });

    const request = {
      nextUrl: new URL("http://localhost/api/traces"),
      headers: new Headers(),
    } as any;

    const response = await getTraces(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("internal_server_error");

    errorSpy.mockRestore();
  });

  it("GET /api/traces/[id] should return 401 when unauthenticated", async () => {
    (createRouteHandlerClient as jest.Mock).mockResolvedValue({});
    (getClientIdFromSession as jest.Mock).mockResolvedValue(null);

    const request = { headers: new Headers() } as any;
    const response = await getTraceDetail(request, {
      params: Promise.resolve({ id: "trace-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("unauthorized");
  });

  it("GET /api/traces/[id] should return full detail payload", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");

    const traceQuery = createAwaitableQuery({
      data: { id: "trace-1", phone: "555499999999" },
      error: null,
    });
    const retrievalQuery = createAwaitableQuery({
      data: { top_k: 3, threshold: 0.75 },
      error: null,
    });
    const toolsQuery = createAwaitableQuery({
      data: [{ tool_name: "buscar_documento", status: "success" }],
      error: null,
    });

    let fromCalls = 0;
    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      from: jest.fn(() => {
        fromCalls += 1;
        if (fromCalls === 1) return traceQuery;
        if (fromCalls === 2) return retrievalQuery;
        return toolsQuery;
      }),
    });

    const request = { headers: new Headers() } as any;
    const response = await getTraceDetail(request, {
      params: Promise.resolve({ id: "trace-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.id).toBe("trace-1");
    expect(body.data.retrieval.top_k).toBe(3);
    expect(body.data.tool_calls).toHaveLength(1);
  });

  it("GET /api/traces/[id] should return 404 when trace does not exist", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");

    const traceQuery = createAwaitableQuery({
      data: null,
      error: { message: "not found" },
    });

    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      from: jest.fn(() => traceQuery),
    });

    const request = { headers: new Headers() } as any;
    const response = await getTraceDetail(request, {
      params: Promise.resolve({ id: "trace-missing" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("not_found");
  });

  it("GET /api/traces/[id] should return 500 on unexpected exceptions", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    (createRouteHandlerClient as jest.Mock).mockRejectedValue(
      new Error("db unavailable"),
    );

    const request = { headers: new Headers() } as any;
    const response = await getTraceDetail(request, {
      params: Promise.resolve({ id: "trace-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("internal_server_error");

    errorSpy.mockRestore();
  });
});

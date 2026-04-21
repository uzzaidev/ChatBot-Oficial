import { NextRequest } from "next/server";
import { POST } from "@/app/api/evaluations/[traceId]/human-feedback/route";
import {
  createRouteHandlerClient,
  getClientIdFromSession,
} from "@/lib/supabase-server";
import { generateEmbedding } from "@/lib/openai";

jest.mock("@/lib/supabase-server", () => ({
  createRouteHandlerClient: jest.fn(),
  getClientIdFromSession: jest.fn(),
}));

jest.mock("@/lib/openai", () => ({
  generateEmbedding: jest.fn(),
}));

type QueryResult = { data?: any; error?: any };

const createQuery = (awaitResult: QueryResult, singleResult?: QueryResult) => {
  const query: any = {
    eq: jest.fn(() => query),
    select: jest.fn(() => query),
    insert: jest.fn(() => query),
    update: jest.fn(() => query),
    upsert: jest.fn(() => query),
    single: jest.fn(() => Promise.resolve(singleResult ?? awaitResult)),
    maybeSingle: jest.fn(() => Promise.resolve(singleResult ?? awaitResult)),
    then: (resolve: (value: QueryResult) => unknown) =>
      Promise.resolve(awaitResult).then(resolve),
  };
  return query;
};

const makeRequest = (body: unknown) =>
  new NextRequest("http://localhost/api/evaluations/trace-1/human-feedback", {
    method: "POST",
    body: JSON.stringify(body),
  });

describe("POST /api/evaluations/[traceId]/human-feedback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retorna 401 sem autenticação", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue(null);
    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    });

    const response = await POST(makeRequest({ verdict: "correct" }), {
      params: Promise.resolve({ traceId: "trace-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("retorna 400 quando promote_to_ground_truth sem correction_text", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");
    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
    });

    const response = await POST(
      makeRequest({
        verdict: "incorrect",
        promote_to_ground_truth: true,
      }),
      { params: Promise.resolve({ traceId: "trace-1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("correction_text_required_for_promote");
  });

  it("retorna 404 quando trace não existe", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");

    const q1 = createQuery({ data: null, error: { message: "not found" } });
    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from: jest.fn(() => q1),
    });

    const response = await POST(makeRequest({ verdict: "correct" }), {
      params: Promise.resolve({ traceId: "trace-1" }),
    });

    expect(response.status).toBe(404);
  });

  it("salva feedback sem promover para GT", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");

    const qTrace = createQuery(
      { data: { id: "trace-1", user_message: "qual horário?" }, error: null },
      { data: { id: "trace-1", user_message: "qual horário?" }, error: null },
    );
    const qEval = createQuery(
      { data: { id: "eval-1" }, error: null },
      { data: { id: "eval-1" }, error: null },
    );
    const qFeedback = createQuery(
      { data: { id: "fb-1", verdict: "correct" }, error: null },
      { data: { id: "fb-1", verdict: "correct" }, error: null },
    );
    const qTraceUpdate = createQuery({ data: null, error: null });

    let calls = 0;
    const fromMock = jest.fn(() => {
      calls += 1;
      if (calls === 1) return qTrace;
      if (calls === 2) return qEval;
      if (calls === 3) return qFeedback;
      return qTraceUpdate;
    });

    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from: fromMock,
    });

    const response = await POST(
      makeRequest({
        verdict: "correct",
      }),
      { params: Promise.resolve({ traceId: "trace-1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.id).toBe("fb-1");
    expect(qFeedback.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        trace_id: "trace-1",
        client_id: "client-1",
        operator_id: "u1",
        verdict: "correct",
      }),
      { onConflict: "trace_id,operator_id" },
    );
    expect(generateEmbedding).not.toHaveBeenCalled();
  });

  it("promove para GT quando solicitado", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");
    (generateEmbedding as jest.Mock).mockResolvedValue({
      embedding: new Array(1536).fill(0.2),
    });

    const qTrace = createQuery(
      { data: { id: "trace-1", user_message: "qual horário?" }, error: null },
      { data: { id: "trace-1", user_message: "qual horário?" }, error: null },
    );
    const qEval = createQuery(
      { data: { id: "eval-1" }, error: null },
      { data: { id: "eval-1" }, error: null },
    );
    const qGt = createQuery(
      { data: { id: "gt-1" }, error: null },
      { data: { id: "gt-1" }, error: null },
    );
    const qFeedback = createQuery(
      { data: { id: "fb-1", ground_truth_id: "gt-1" }, error: null },
      { data: { id: "fb-1", ground_truth_id: "gt-1" }, error: null },
    );
    const qTraceUpdate = createQuery({ data: null, error: null });

    let calls = 0;
    const fromMock = jest.fn(() => {
      calls += 1;
      if (calls === 1) return qTrace;
      if (calls === 2) return qEval;
      if (calls === 3) return qGt;
      if (calls === 4) return qFeedback;
      return qTraceUpdate;
    });

    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from: fromMock,
    });

    const response = await POST(
      makeRequest({
        verdict: "incorrect",
        correction_text: "Temos aulas de segunda a sábado.",
        promote_to_ground_truth: true,
      }),
      { params: Promise.resolve({ traceId: "trace-1" }) },
    );

    expect(response.status).toBe(200);
    expect(generateEmbedding).toHaveBeenCalledWith(
      "qual horário?",
      undefined,
      "client-1",
    );
    expect(qGt.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "operator_correction",
        source_trace_id: "trace-1",
      }),
    );
  });

  it("retorna 503 quando tabela human_feedback não existe", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");

    const qTrace = createQuery(
      { data: { id: "trace-1", user_message: "q" }, error: null },
      { data: { id: "trace-1", user_message: "q" }, error: null },
    );
    const qEval = createQuery(
      { data: { id: "eval-1" }, error: null },
      { data: { id: "eval-1" }, error: null },
    );
    const qFeedback = createQuery(
      {
        data: null,
        error: { message: 'relation "human_feedback" does not exist' },
      },
      {
        data: null,
        error: { message: 'relation "human_feedback" does not exist' },
      },
    );

    let calls = 0;
    const fromMock = jest.fn(() => {
      calls += 1;
      if (calls === 1) return qTrace;
      if (calls === 2) return qEval;
      return qFeedback;
    });

    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from: fromMock,
    });

    const response = await POST(makeRequest({ verdict: "correct" }), {
      params: Promise.resolve({ traceId: "trace-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("human_feedback_table_missing");
  });
});

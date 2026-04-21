import * as worker from "@/lib/evaluation-worker";
import { getBotConfig } from "@/lib/config";
import { evaluateAgentResponse } from "@/lib/evaluation-engine";
import { findSimilarGroundTruth } from "@/lib/ground-truth-matcher";
import { createServiceRoleClient } from "@/lib/supabase";
import { checkBudgetAvailable } from "@/lib/unified-tracking";

jest.mock("@/lib/config", () => ({
  getBotConfig: jest.fn(),
}));

jest.mock("@/lib/evaluation-engine", () => ({
  evaluateAgentResponse: jest.fn(),
}));

jest.mock("@/lib/ground-truth-matcher", () => ({
  findSimilarGroundTruth: jest.fn(),
}));

jest.mock("@/lib/supabase", () => ({
  createServiceRoleClient: jest.fn(),
}));

jest.mock("@/lib/unified-tracking", () => ({
  checkBudgetAvailable: jest.fn(),
}));

const createTableQuery = () => {
  const maybeSingleQueue: Array<any> = [];
  const awaitQueue: Array<any> = [];
  let insertResult: any = { error: null };

  const query: any = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    gte: jest.fn(() => query),
    maybeSingle: jest.fn(async () => {
      if (maybeSingleQueue.length > 0) return maybeSingleQueue.shift();
      return { data: null, error: null };
    }),
    insert: jest.fn(async () => insertResult),
    update: jest.fn(() => query),
    then: (resolve: (value: any) => unknown, reject?: (reason: unknown) => unknown) => {
      const value = awaitQueue.length > 0 ? awaitQueue.shift() : { data: [], error: null };
      return Promise.resolve(value).then(resolve, reject);
    },
    __setMaybeSingleQueue(values: Array<any>) {
      maybeSingleQueue.splice(0, maybeSingleQueue.length, ...values);
    },
    __setAwaitQueue(values: Array<any>) {
      awaitQueue.splice(0, awaitQueue.length, ...values);
    },
    __setInsertResult(value: any) {
      insertResult = value;
    },
  };

  return query;
};

describe("evaluation-worker", () => {
  const agentEvaluationsQuery = createTableQuery();
  const messageTracesQuery = createTableQuery();

  beforeEach(() => {
    jest.clearAllMocks();

    agentEvaluationsQuery.__setMaybeSingleQueue([{ data: null, error: null }]);
    agentEvaluationsQuery.__setAwaitQueue([{ data: [], error: null }]);
    agentEvaluationsQuery.__setInsertResult({ error: null });

    messageTracesQuery.__setAwaitQueue([{ data: null, error: null }]);

    (createServiceRoleClient as jest.Mock).mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === "agent_evaluations") return agentEvaluationsQuery;
        if (table === "message_traces") return messageTracesQuery;
        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    (getBotConfig as jest.Mock).mockResolvedValue("1.0");
    (checkBudgetAvailable as jest.Mock).mockResolvedValue(true);
    (findSimilarGroundTruth as jest.Mock).mockResolvedValue({
      id: "gt-1",
      expected_response: "resposta esperada",
    });
    (evaluateAgentResponse as jest.Mock).mockResolvedValue({
      alignmentScore: 9,
      relevanceScore: 8,
      finalityScore: 9,
      safetyScore: 10,
      compositeScore: 8.9,
      verdict: "PASS",
      reasoning: {
        alignment: "ok",
        relevance: "ok",
        finality: "ok",
        safety: "ok",
      },
      cost: { tokensInput: 100, tokensOutput: 50, costUsd: 0.001 },
      judgeModel: "judge-model",
      promptVersion: "v1",
      durationMs: 1200,
    });
  });

  it("shouldSample é determinístico", async () => {
    (getBotConfig as jest.Mock).mockResolvedValue("0.2");

    const a = await worker.shouldSample(
      "c1",
      "00000000-0000-0000-0000-000000000001",
    );
    const b = await worker.shouldSample(
      "c1",
      "00000000-0000-0000-0000-000000000001",
    );

    expect(a).toBe(b);
  });

  it("shouldSample mantém distribuição próxima de 20%", async () => {
    (getBotConfig as jest.Mock).mockResolvedValue("0.2");

    let hits = 0;
    for (let i = 0; i < 1000; i += 1) {
      const traceId = `${i.toString(16).padStart(8, "0")}-aaaa-bbbb-cccc-ddddeeeeffff`;
      if (await worker.shouldSample("c1", traceId)) {
        hits += 1;
      }
    }

    const rate = hits / 1000;
    expect(rate).toBeGreaterThan(0.15);
    expect(rate).toBeLessThan(0.25);
  });

  it("não avalia quando já existe evaluation para o trace", async () => {
    agentEvaluationsQuery.__setMaybeSingleQueue([
      { data: { id: "existing" }, error: null },
    ]);

    await worker.runEvaluation({
      traceId: "t1",
      clientId: "c1",
      userMessage: "q",
      agentResponse: "r",
    });

    expect(evaluateAgentResponse).not.toHaveBeenCalled();
    expect(agentEvaluationsQuery.insert).not.toHaveBeenCalled();
  });

  it("não avalia quando sampling rejeita", async () => {
    (getBotConfig as jest.Mock).mockResolvedValue("0");

    await worker.runEvaluation({
      traceId: "t1",
      clientId: "c1",
      userMessage: "q",
      agentResponse: "r",
    });

    expect(evaluateAgentResponse).not.toHaveBeenCalled();
  });

  it("não avalia quando budget principal está indisponível", async () => {
    (checkBudgetAvailable as jest.Mock).mockResolvedValue(false);

    await worker.runEvaluation({
      traceId: "t1",
      clientId: "c1",
      userMessage: "q",
      agentResponse: "r",
    });

    expect(evaluateAgentResponse).not.toHaveBeenCalled();
  });

  it("insere avaliação e atualiza trace status para evaluated", async () => {
    await worker.runEvaluation({
      traceId: "t1",
      clientId: "c1",
      userMessage: "q",
      agentResponse: "r",
    });

    expect(agentEvaluationsQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        trace_id: "t1",
        verdict: "PASS",
        composite_score: 8.9,
      }),
    );
    expect(messageTracesQuery.update).toHaveBeenCalledWith({ status: "evaluated" });
  });

  it("atualiza trace status para needs_review quando verdict=FAIL", async () => {
    (evaluateAgentResponse as jest.Mock).mockResolvedValueOnce({
      alignmentScore: 2,
      relevanceScore: 3,
      finalityScore: 2,
      safetyScore: 5,
      compositeScore: 2.7,
      verdict: "FAIL",
      reasoning: { alignment: "", relevance: "", finality: "", safety: "" },
      cost: { tokensInput: 100, tokensOutput: 50, costUsd: 0.001 },
      judgeModel: "judge-model",
      promptVersion: "v1",
      durationMs: 1200,
    });

    await worker.runEvaluation({
      traceId: "t1",
      clientId: "c1",
      userMessage: "q",
      agentResponse: "r",
    });

    expect(messageTracesQuery.update).toHaveBeenCalledWith({ status: "needs_review" });
  });

  it("não quebra em corrida quando insert retorna unique violation", async () => {
    agentEvaluationsQuery.__setInsertResult({ error: { code: "23505", message: "duplicate" } });

    await expect(
      worker.runEvaluation({
        traceId: "t1",
        clientId: "c1",
        userMessage: "q",
        agentResponse: "r",
      }),
    ).resolves.toBeUndefined();
  });

  it("enqueueEvaluation agenda execução assíncrona", async () => {
    worker.enqueueEvaluation({
      traceId: "t1",
      clientId: "c1",
      userMessage: "q",
      agentResponse: "r",
    });

    await new Promise((resolve) => setImmediate(resolve));

    expect(evaluateAgentResponse).toHaveBeenCalled();
  });
});


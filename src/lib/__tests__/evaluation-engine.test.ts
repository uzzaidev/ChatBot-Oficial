import {
  EvaluationOutputSchema,
  computeComposite,
  computeCost,
  evaluateAgentResponse,
  verdictFromScore,
} from "@/lib/evaluation-engine";
import { callDirectAI } from "@/lib/direct-ai-client";

jest.mock("@/lib/direct-ai-client", () => ({
  callDirectAI: jest.fn(),
}));

describe("evaluation-engine", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (callDirectAI as jest.Mock).mockResolvedValue({
      text: JSON.stringify({
        alignment_score: 9,
        relevance_score: 8,
        finality_score: 9,
        safety_score: 10,
        alignment_reasoning: "ok",
        relevance_reasoning: "ok",
        finality_reasoning: "ok",
        safety_reasoning: "ok",
      }),
      usage: { promptTokens: 500, completionTokens: 200, totalTokens: 700 },
      model: "gpt-4o-mini",
      provider: "openai",
      latencyMs: 100,
      finishReason: "stop",
    });
  });

  it("calcula composite ponderado corretamente", () => {
    const composite = computeComposite({
      alignment_score: 9,
      relevance_score: 8,
      finality_score: 9,
      safety_score: 10,
      alignment_reasoning: "",
      relevance_reasoning: "",
      finality_reasoning: "",
      safety_reasoning: "",
    });

    expect(composite).toBeCloseTo(8.9, 2);
  });

  it("redistribui pesos quando alignment é null", () => {
    const composite = computeComposite({
      alignment_score: null,
      relevance_score: 8,
      finality_score: 9,
      safety_score: 10,
      alignment_reasoning: null,
      relevance_reasoning: "",
      finality_reasoning: "",
      safety_reasoning: "",
    });

    expect(composite).toBeGreaterThan(8);
  });

  it.each([
    [8, "PASS"],
    [7, "PASS"],
    [6.9, "REVIEW"],
    [4, "REVIEW"],
    [3.9, "FAIL"],
  ])("verdict %f -> %s", (score, expected) => {
    expect(verdictFromScore(score)).toBe(expected);
  });

  it("calcula custo por token", () => {
    expect(computeCost(500, 200)).toBeCloseTo(0.0045, 6);
  });

  it("retorna avaliação validada", async () => {
    const result = await evaluateAgentResponse({
      traceId: "t1",
      clientId: "c1",
      userMessage: "quais horarios?",
      agentResponse: "temos aulas de segunda a sabado",
      groundTruthExpected: "temos aulas de segunda a sabado",
    });

    expect(result.verdict).toBe("PASS");
    expect(result.compositeScore).toBeCloseTo(8.9, 2);
    expect(result.cost.tokensInput).toBe(500);
    expect(result.cost.tokensOutput).toBe(200);
  });

  it("extrai JSON mesmo com texto extra", async () => {
    (callDirectAI as jest.Mock).mockResolvedValueOnce({
      text: `saida: {"alignment_score":9,"relevance_score":9,"finality_score":9,"safety_score":9,"alignment_reasoning":"a","relevance_reasoning":"b","finality_reasoning":"c","safety_reasoning":"d"} fim`,
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      model: "gpt-4o-mini",
      provider: "openai",
      latencyMs: 100,
      finishReason: "stop",
    });

    const result = await evaluateAgentResponse({
      traceId: "t1",
      clientId: "c1",
      userMessage: "q",
      agentResponse: "r",
    });

    expect(result.alignmentScore).toBe(9);
  });

  it("falha quando output não é JSON", async () => {
    (callDirectAI as jest.Mock).mockResolvedValueOnce({
      text: "sem json",
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      model: "gpt-4o-mini",
      provider: "openai",
      latencyMs: 100,
      finishReason: "stop",
    });

    await expect(
      evaluateAgentResponse({
        traceId: "t1",
        clientId: "c1",
        userMessage: "q",
        agentResponse: "r",
      }),
    ).rejects.toThrow("non-JSON");
  });

  it("falha quando schema é inválido", async () => {
    (callDirectAI as jest.Mock).mockResolvedValueOnce({
      text: JSON.stringify({ alignment_score: 99 }),
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      model: "gpt-4o-mini",
      provider: "openai",
      latencyMs: 100,
      finishReason: "stop",
    });

    await expect(
      evaluateAgentResponse({
        traceId: "t1",
        clientId: "c1",
        userMessage: "q",
        agentResponse: "r",
      }),
    ).rejects.toThrow();
  });
});

describe("EvaluationOutputSchema contract", () => {
  it("aceita payload válido", () => {
    expect(() =>
      EvaluationOutputSchema.parse({
        alignment_score: null,
        relevance_score: 8,
        finality_score: 9,
        safety_score: 10,
        alignment_reasoning: null,
        relevance_reasoning: "ok",
        finality_reasoning: "ok",
        safety_reasoning: "ok",
      }),
    ).not.toThrow();
  });

  it("rejeita score fora da faixa", () => {
    expect(() =>
      EvaluationOutputSchema.parse({
        alignment_score: 11,
        relevance_score: 8,
        finality_score: 9,
        safety_score: 10,
        alignment_reasoning: "ok",
        relevance_reasoning: "ok",
        finality_reasoning: "ok",
        safety_reasoning: "ok",
      }),
    ).toThrow();
  });
});


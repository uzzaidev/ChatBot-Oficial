import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  computeComposite,
  evaluateAgentResponse,
  verdictFromScore,
} from "@/lib/evaluation-engine";
import { callDirectAI } from "@/lib/direct-ai-client";

vi.mock("@/lib/direct-ai-client", () => ({
  callDirectAI: vi.fn(),
}));

describe("evaluation-engine (vitest)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(callDirectAI).mockResolvedValue({
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
      usage: { promptTokens: 500, completionTokens: 200 },
      model: "gpt-4o-mini",
    } as any);
  });

  it("computes weighted composite", () => {
    const value = computeComposite({
      alignment_score: 9,
      relevance_score: 8,
      finality_score: 9,
      safety_score: 10,
      alignment_reasoning: null,
      relevance_reasoning: null,
      finality_reasoning: "",
      safety_reasoning: "",
    });
    expect(value).toBeCloseTo(8.9, 2);
    expect(verdictFromScore(value)).toBe("PASS");
  });

  it("evaluates response and returns judge metadata", async () => {
    const result = await evaluateAgentResponse({
      traceId: "t1",
      clientId: "c1",
      userMessage: "q",
      agentResponse: "r",
      groundTruthExpected: "r",
    });
    expect(result.verdict).toBe("PASS");
    expect(result.judgeModel).toBe("gpt-4o-mini");
    expect(result.cost.tokensInput).toBe(500);
  });
});


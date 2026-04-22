import { beforeEach, describe, expect, it, vi } from "vitest";
import { runEvaluation, shouldSample } from "@/lib/evaluation-worker";
import { getBotConfig } from "@/lib/config";
import { evaluateAgentResponse } from "@/lib/evaluation-engine";
import { createServiceRoleClient } from "@/lib/supabase";

vi.mock("@/lib/config", () => ({ getBotConfig: vi.fn() }));
vi.mock("@/lib/evaluation-engine", () => ({ evaluateAgentResponse: vi.fn() }));
vi.mock("@/lib/ground-truth-matcher", () => ({
  findSimilarGroundTruth: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({ createServiceRoleClient: vi.fn() }));
vi.mock("@/lib/unified-tracking", () => ({
  checkBudgetAvailable: vi.fn().mockResolvedValue(true),
}));

const createExistingEvalQuery = () => {
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { id: "eval-existing" },
      error: null,
    }),
  };
  return query;
};

describe("evaluation-worker (vitest)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getBotConfig).mockResolvedValue("0.2");
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn(() => createExistingEvalQuery()),
    } as any);
  });

  it("shouldSample stays deterministic for same traceId", async () => {
    const a = await shouldSample("client-1", "trace-001");
    const b = await shouldSample("client-1", "trace-001");
    expect(a).toBe(b);
  });

  it("skips execution when evaluation already exists", async () => {
    await runEvaluation({
      traceId: "trace-001",
      clientId: "client-1",
      userMessage: "q",
      agentResponse: "r",
    });

    expect(evaluateAgentResponse).not.toHaveBeenCalled();
  });
});


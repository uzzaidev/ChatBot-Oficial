import {
  classifyAiFailureCategory,
  classifyPendingBucket,
} from "@/lib/trace-status";
import { describe, expect, it } from "vitest";

describe("trace-status classifiers", () => {
  it("classifies pending bucket when generation never started", () => {
    const bucket = classifyPendingBucket({
      status: "pending",
      generation_started_at: null,
      generation_completed_at: null,
      sent_at: null,
      metadata: {},
    });
    expect(bucket).toBe("nao_chegou_na_geracao");
  });

  it("classifies pending bucket as erro_ia when metadata has quota error", () => {
    const bucket = classifyPendingBucket({
      status: "pending",
      generation_started_at: "2026-04-23T10:00:00.000Z",
      generation_completed_at: null,
      sent_at: null,
      metadata: {
        error: "You exceeded your current quota, please check your plan",
      },
    });
    expect(bucket).toBe("erro_ia");
  });

  it("classifies AI failure category", () => {
    expect(
      classifyAiFailureCategory("Failed after retries: timeout from provider"),
    ).toBe("timeout");
    expect(
      classifyAiFailureCategory("You exceeded your current quota"),
    ).toBe("quota");
  });
});


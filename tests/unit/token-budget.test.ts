import {
  enforceInputBudget,
  estimateTokens,
  trimMessagesToTokenBudget,
  truncateTextToTokenBudget,
} from "@/lib/token-budget";
import type { ChatMessage } from "@/lib/types";
import { describe, expect, it } from "vitest";

describe("token budget", () => {
  it("trims old history while preserving chronological order of kept messages", () => {
    const messages: ChatMessage[] = [
      { role: "user", content: "primeira ".repeat(80) },
      { role: "assistant", content: "segunda ".repeat(80) },
      { role: "user", content: "terceira" },
    ];

    const result = trimMessagesToTokenBudget(messages, 20);

    expect(result.messages.map((message) => message.content)).toEqual([
      "terceira",
    ]);
    expect(result.removed).toBe(2);
  });

  it("truncates knowledge context before removing recent user message", () => {
    const knowledge = "base ".repeat(4000);
    const result = enforceInputBudget({
      systemMessages: [{ role: "system", content: "prompt curto" }],
      historyMessages: [{ role: "assistant", content: "historico curto" }],
      knowledgeContext: knowledge,
      currentUserMessage: { role: "user", content: "pergunta atual" },
      limits: {
        maxInputTokens: 500,
        maxHistoryTokens: 100,
        maxKnowledgeTokens: 300,
      },
    });

    expect(result.knowledgeContext.length).toBeLessThan(knowledge.length);
    expect(result.historyMessages).toHaveLength(1);
    expect(result.stats.totalInputTokens).toBeLessThanOrEqual(500);
    expect(result.stats.knowledgeTruncated).toBe(true);
  });

  it("estimates and truncates text with the repository heuristic", () => {
    const text = "abcd".repeat(100);
    expect(estimateTokens(text)).toBe(100);

    const truncated = truncateTextToTokenBudget(text, 10);
    expect(truncated.truncated).toBe(true);
    expect(truncated.tokens).toBeLessThanOrEqual(10);
  });
});

import type { CoreMessage } from "ai";
import type { ChatMessage } from "./types";
import { estimateTokens as estimateTextTokens } from "./chunking";

export interface ContextBudgetLimits {
  maxInputTokens: number;
  maxHistoryTokens: number;
  maxKnowledgeTokens: number;
}

export interface ContextBudgetStats {
  systemTokens: number;
  historyTokens: number;
  knowledgeTokens: number;
  userTokens: number;
  totalInputTokens: number;
  removedHistoryMessages: number;
  knowledgeTruncated: boolean;
}

export const DEFAULT_CONTEXT_BUDGETS: ContextBudgetLimits = {
  maxInputTokens: 24_000,
  maxHistoryTokens: 6_000,
  maxKnowledgeTokens: 6_000,
};

const MIN_TOKEN_BUDGET = 0;

export const normalizeTokenBudget = (
  value: unknown,
  fallback: number,
): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(MIN_TOKEN_BUDGET, Math.floor(parsed));
};

export const estimateTokens = (text: string): number => {
  return estimateTextTokens(text || "");
};

export const estimateMessageTokens = (
  message: Pick<ChatMessage, "role" | "content"> | Pick<CoreMessage, "role" | "content">,
): number => {
  const content =
    typeof message.content === "string"
      ? message.content
      : JSON.stringify(message.content ?? "");
  return estimateTokens(content) + 4;
};

export const estimateMessagesTokens = (
  messages: Array<Pick<ChatMessage, "role" | "content"> | Pick<CoreMessage, "role" | "content">>,
): number => {
  return messages.reduce((sum, message) => sum + estimateMessageTokens(message), 0);
};

export const trimMessagesToTokenBudget = <T extends ChatMessage>(
  messages: T[],
  maxTokens: number,
): { messages: T[]; tokens: number; removed: number } => {
  if (!Array.isArray(messages) || messages.length === 0 || maxTokens <= 0) {
    return { messages: [], tokens: 0, removed: messages?.length ?? 0 };
  }

  const keptReversed: T[] = [];
  let total = 0;

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    const tokens = estimateMessageTokens(message);
    if (total + tokens > maxTokens) {
      continue;
    }
    total += tokens;
    keptReversed.push(message);
  }

  const kept = keptReversed.reverse();
  return {
    messages: kept,
    tokens: total,
    removed: messages.length - kept.length,
  };
};

export const truncateTextToTokenBudget = (
  text: string,
  maxTokens: number,
): { text: string; tokens: number; truncated: boolean } => {
  const cleanText = text || "";
  if (!cleanText.trim() || maxTokens <= 0) {
    return { text: "", tokens: 0, truncated: cleanText.trim().length > 0 };
  }

  const currentTokens = estimateTokens(cleanText);
  if (currentTokens <= maxTokens) {
    return { text: cleanText, tokens: currentTokens, truncated: false };
  }

  const maxChars = Math.max(0, maxTokens * 4);
  const truncated = cleanText.slice(0, maxChars).trimEnd();
  return {
    text: truncated,
    tokens: estimateTokens(truncated),
    truncated: true,
  };
};

export const enforceInputBudget = (input: {
  systemMessages: ChatMessage[];
  historyMessages: ChatMessage[];
  knowledgeContext: string;
  currentUserMessage: ChatMessage;
  limits: ContextBudgetLimits;
}): {
  systemMessages: ChatMessage[];
  historyMessages: ChatMessage[];
  knowledgeContext: string;
  stats: ContextBudgetStats;
} => {
  const limits = {
    maxInputTokens: normalizeTokenBudget(
      input.limits.maxInputTokens,
      DEFAULT_CONTEXT_BUDGETS.maxInputTokens,
    ),
    maxHistoryTokens: normalizeTokenBudget(
      input.limits.maxHistoryTokens,
      DEFAULT_CONTEXT_BUDGETS.maxHistoryTokens,
    ),
    maxKnowledgeTokens: normalizeTokenBudget(
      input.limits.maxKnowledgeTokens,
      DEFAULT_CONTEXT_BUDGETS.maxKnowledgeTokens,
    ),
  };

  const systemTokens = estimateMessagesTokens(input.systemMessages);
  const userTokens = estimateMessageTokens(input.currentUserMessage);
  let remainingForHistoryAndKnowledge =
    limits.maxInputTokens - systemTokens - userTokens;

  if (remainingForHistoryAndKnowledge < 0) {
    remainingForHistoryAndKnowledge = 0;
  }

  const knowledgeBudget = Math.min(
    limits.maxKnowledgeTokens,
    remainingForHistoryAndKnowledge,
  );
  const knowledge = truncateTextToTokenBudget(
    input.knowledgeContext,
    knowledgeBudget,
  );

  const historyBudget = Math.min(
    limits.maxHistoryTokens,
    Math.max(0, remainingForHistoryAndKnowledge - knowledge.tokens),
  );
  const history = trimMessagesToTokenBudget(input.historyMessages, historyBudget);

  const totalInputTokens =
    systemTokens + history.tokens + knowledge.tokens + userTokens;

  return {
    systemMessages: input.systemMessages,
    historyMessages: history.messages,
    knowledgeContext: knowledge.text,
    stats: {
      systemTokens,
      historyTokens: history.tokens,
      knowledgeTokens: knowledge.tokens,
      userTokens,
      totalInputTokens,
      removedHistoryMessages: history.removed,
      knowledgeTruncated: knowledge.truncated,
    },
  };
};

import { ToolCall } from "@/lib/types";

const buildToolCallDedupKey = (toolCall: ToolCall): string => {
  const name = toolCall.function?.name ?? "";
  const args = toolCall.function?.arguments ?? "";
  return `${name}::${args}`;
};

export const dedupeToolCalls = (toolCalls?: ToolCall[]): ToolCall[] => {
  if (!toolCalls || toolCalls.length === 0) return [];

  const seen = new Set<string>();
  const unique: ToolCall[] = [];

  for (const toolCall of toolCalls) {
    const key = buildToolCallDedupKey(toolCall);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(toolCall);
  }

  return unique;
};

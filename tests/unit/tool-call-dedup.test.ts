import { dedupeToolCalls } from "@/lib/tool-call-dedup";
import { ToolCall } from "@/lib/types";
import { describe, expect, it } from "vitest";

const makeToolCall = (
  id: string,
  name: string,
  args: string,
): ToolCall => ({
  id,
  type: "function",
  function: {
    name,
    arguments: args,
  },
});

describe("tool-call-dedup", () => {
  it("deduplicates repeated tool calls with same name+arguments", () => {
    const input = [
      makeToolCall("1", "transferir_atendimento", "{}"),
      makeToolCall("2", "transferir_atendimento", "{}"),
      makeToolCall("3", "buscar_documento", '{"topic":"planos"}'),
      makeToolCall("4", "buscar_documento", '{"topic":"planos"}'),
    ];

    const result = dedupeToolCalls(input);

    expect(result).toHaveLength(2);
    expect(result.map((item) => item.id)).toEqual(["1", "3"]);
  });

  it("keeps tool calls with same name but different arguments", () => {
    const input = [
      makeToolCall("1", "buscar_documento", '{"topic":"planos"}'),
      makeToolCall("2", "buscar_documento", '{"topic":"horarios"}'),
    ];

    const result = dedupeToolCalls(input);
    expect(result).toHaveLength(2);
  });
});

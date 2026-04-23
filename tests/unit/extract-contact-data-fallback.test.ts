import { describe, expect, it } from "vitest";
import { hasLikelyContactData } from "@/nodes/extractContactDataFallback";

describe("hasLikelyContactData", () => {
  it("detects experience and preferred period/day from natural text", () => {
    expect(
      hasLikelyContactData(
        "Sou iniciante e prefiro de manha, principalmente sexta.",
      ),
    ).toBe(true);
  });

  it("detects structured objective payload", () => {
    expect(hasLikelyContactData("objetivo: reduzir ansiedade")).toBe(true);
  });

  it("does not flag generic short messages", () => {
    expect(hasLikelyContactData("ola, tudo bem?")).toBe(false);
  });
});



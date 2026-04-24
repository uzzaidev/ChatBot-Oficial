import {
  classifySupportCase,
  isLikelySupportMessage,
} from "@/lib/support-cases";
import { describe, expect, it } from "vitest";

describe("support-cases detection", () => {
  it("detects explicit support keywords", () => {
    expect(isLikelySupportMessage("estou com erro no sistema")).toBe(true);
  });

  it("detects implicit mismatch reports", () => {
    expect(
      isLikelySupportMessage(
        "cliente falou sobre plano e respondeu outra coisa nada a ver",
      ),
    ).toBe(true);
  });

  it("detects operational duplication signals", () => {
    expect(
      isLikelySupportMessage("mandou duas vezes a mesma mensagem no whatsapp"),
    ).toBe(true);
  });

  it("detects support by intent when text is generic", () => {
    expect(isLikelySupportMessage("nao entendi", "reclamacao")).toBe(true);
  });

  it("does not classify neutral message as support", () => {
    expect(isLikelySupportMessage("obrigado, era isso mesmo")).toBe(false);
  });
});

describe("support-cases classification", () => {
  it("classifies infra signals as critical system", () => {
    const result = classifySupportCase({
      userMessage: "travou tudo",
      flowMetadata: { flow_error: "webhook timeout" },
    });

    expect(result.rootCause).toBe("system");
    expect(result.severity).toBe("critical");
  });

  it("classifies duplication signals as high system", () => {
    const result = classifySupportCase({
      userMessage: "mandou duas vezes e respondeu fora de ordem",
    });

    expect(result.rootCause).toBe("system");
    expect(result.severity).toBe("high");
  });

  it("classifies mismatch signals as prompt issue", () => {
    const result = classifySupportCase({
      userMessage: "respondeu outra coisa, nada a ver com o que perguntei",
    });

    expect(result.rootCause).toBe("prompt");
  });
});

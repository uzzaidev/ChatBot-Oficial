import { describe, expect, it } from "vitest";

import { formatResponse } from "@/nodes/formatResponse";

describe("formatResponse — split por bolha (\\n\\n)", () => {
  it("uma bolha por bloco separado por linha em branco", () => {
    const ai = [
      "Beleza! Vou te explicar então!",
      "Na Sports Training, utilizamos métodos modernos que respeitam sua individualidade.",
      "Nossos treinos são organizados em 3 etapas:\n1: Liberação miofascial\n2: Aquecimento com mobilidade\n3: Treino principal",
    ].join("\n\n");

    expect(formatResponse(ai)).toEqual([
      "Beleza! Vou te explicar então!",
      "Na Sports Training, utilizamos métodos modernos que respeitam sua individualidade.",
      "Nossos treinos são organizados em 3 etapas:\n1: Liberação miofascial\n2: Aquecimento com mobilidade\n3: Treino principal",
    ]);
  });

  it("cabeçalho + lista de bullets ficam na MESMA bolha", () => {
    const ai =
      "O que você conquista treinando com a gente?\n" +
      "- Melhora da forma física e da postura\n" +
      "- Ganho de massa muscular e definição\n" +
      "- Mais condicionamento, energia e disposição";

    const out = formatResponse(ai);
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("O que você conquista");
    expect(out[0]).toContain("- Ganho de massa muscular");
  });

  it("não quebra um bloco curto no meio da frase", () => {
    const ai =
      "Nossos treinos são organizados em 3 etapas fundamentais, garantindo segurança e performance. " +
      "Cada etapa tem um propósito claro. O resultado aparece rápido.";

    expect(formatResponse(ai)).toEqual([ai]);
  });

  it("bloco acima do cap: quebra por linha preservando os \\n internos", () => {
    const item = "Item bem descritivo sobre a metodologia aplicada no treino";
    const bloco = Array.from({ length: 12 }, (_, i) => `- ${item} ${i + 1}`).join(
      "\n",
    );

    const out = formatResponse(bloco);
    expect(out.length).toBeGreaterThan(1);
    for (const msg of out) {
      expect(msg.length).toBeLessThanOrEqual(600);
      // cada pedaço mantém itens em linhas separadas, sem achatar em espaço
      expect(msg.split("\n").length).toBeGreaterThan(1);
    }
  });

  it("marcador de split (\\n\\n) nunca aparece no texto enviado", () => {
    const ai = "Primeiro bloco.\n\n\n\nSegundo bloco.\n\nTerceiro bloco.";
    const out = formatResponse(ai);
    expect(out).toEqual(["Primeiro bloco.", "Segundo bloco.", "Terceiro bloco."]);
    for (const msg of out) {
      expect(msg).not.toMatch(/\n\n/);
    }
  });
});

/**
 * 🎯 LLM Reranker for RAG
 *
 * Recebe top-N chunks da busca vetorial (cosseno) e usa um LLM cheap para
 * reordenar/filtrar pros top-K mais uteis. Resolve o problema classico de
 * "RAG retorna chunks ruins" — busca por cosseno isolada eh notoriamente
 * ruidosa, especialmente quando ha varios documentos com tematica similar.
 *
 * Custo: ~1 chamada extra por mensagem com RAG. Em gpt-5-nano com
 * reasoning="minimal" o custo eh muito baixo (~$0.0001/chamada).
 *
 * Fail-safe: qualquer erro de chamada/parse cai pro top-K por cosseno
 * (comportamento original). Nunca quebra o fluxo do bot.
 */

import { callDirectAI } from "@/lib/direct-ai-client";

export interface RerankableChunk {
  id: string;
  content: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

export interface RerankInput {
  clientId: string;
  query: string;
  chunks: RerankableChunk[];
  topK: number;
  clientConfig: {
    primaryModelProvider?: string;
    openaiModel?: string;
    groqModel?: string;
  };
  conversationId?: string;
  phone?: string;
}

// Limita quanto de cada chunk vai pro prompt do reranker. Suficiente pro
// modelo julgar relevancia sem estourar tokens. Reranker nao precisa do
// chunk inteiro — so o suficiente pra entender se eh do tema certo.
const CHUNK_PREVIEW_CHARS = 400;

export const rerankChunks = async (
  input: RerankInput,
): Promise<RerankableChunk[]> => {
  const { clientId, query, chunks, topK, clientConfig, conversationId, phone } =
    input;

  // Nao vale a pena chamar reranker se ja temos <= topK chunks
  if (chunks.length <= topK) {
    return chunks;
  }

  try {
    const chunkBlock = chunks
      .map(
        (c, i) =>
          `[${i}] ${c.content.slice(0, CHUNK_PREVIEW_CHARS).trim()}`,
      )
      .join("\n\n");

    const result = await callDirectAI({
      clientId,
      clientConfig,
      messages: [
        {
          role: "system",
          content: [
            "Voce e um classificador de relevancia para um sistema de busca em base de conhecimento.",
            `Recebe uma pergunta do cliente e ${chunks.length} trechos numerados (indices 0..${chunks.length - 1}).`,
            `Sua tarefa: escolher os ${topK} trechos MAIS UTEIS para responder a pergunta, em ordem do mais relevante pro menos.`,
            "Considere: o trecho responde diretamente a pergunta? Tem informacao concreta (numero, regra, nome)? Esta no tema certo?",
            "",
            "Retorne EXCLUSIVAMENTE JSON valido, sem texto antes ou depois, no formato:",
            `{"top":[i1,i2,...,i${topK}]}`,
            "Nao explique, nao comente. Apenas o JSON.",
          ].join("\n"),
        },
        {
          role: "user",
          content: `Pergunta: ${query}\n\nTrechos:\n${chunkBlock}\n\nRetorne o JSON com os ${topK} indices mais relevantes.`,
        },
      ],
      settings: {
        temperature: 0,
        maxTokens: 2000, // reasoning models precisam de folga pra reasoning_tokens
        reasoningEffort: "minimal",
      },
      conversationId,
      phone,
      metadata: {
        source: "rag-reranker",
        candidateCount: chunks.length,
        targetTopK: topK,
      },
    });

    const text = result.text.trim();

    // Greedy: pega do primeiro { ate o ultimo } — robusto pra ruido cercando o JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn(
        "[Rerank] No JSON in response, falling back to cosine top-K",
        { responsePreview: text.slice(0, 200) },
      );
      return chunks.slice(0, topK);
    }

    let parsed: { top?: unknown };
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      console.warn("[Rerank] JSON parse failed, falling back to cosine top-K", {
        attempted: jsonMatch[0].slice(0, 200),
      });
      return chunks.slice(0, topK);
    }

    if (!Array.isArray(parsed.top)) {
      console.warn("[Rerank] Response shape invalid (no 'top' array), falling back");
      return chunks.slice(0, topK);
    }

    const validIndices = parsed.top.filter(
      (i: unknown): i is number =>
        typeof i === "number" &&
        Number.isInteger(i) &&
        i >= 0 &&
        i < chunks.length,
    );

    if (validIndices.length === 0) {
      console.warn("[Rerank] No valid indices in response, falling back");
      return chunks.slice(0, topK);
    }

    // Dedupe preservando ordem
    const seen = new Set<number>();
    const dedupedIndices: number[] = [];
    for (const i of validIndices) {
      if (!seen.has(i)) {
        seen.add(i);
        dedupedIndices.push(i);
      }
      if (dedupedIndices.length >= topK) break;
    }

    const reranked = dedupedIndices.map((i) => chunks[i]);

    // Se o reranker retornou menos de topK, completa com os melhores por cosseno
    if (reranked.length < topK) {
      const seenIds = new Set(reranked.map((c) => c.id));
      const filler = chunks.filter((c) => !seenIds.has(c.id));
      reranked.push(...filler.slice(0, topK - reranked.length));
    }

    console.log(
      `[Rerank] ${chunks.length} → ${reranked.length} chunks | ${result.latencyMs}ms`,
    );

    return reranked;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Rerank] Failed, falling back to cosine top-K:", msg);
    return chunks.slice(0, topK);
  }
};

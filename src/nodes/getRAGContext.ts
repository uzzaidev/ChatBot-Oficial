import { generateEmbedding } from "@/lib/openai";
import { createServerClient } from "@/lib/supabase";
import { getBotConfig } from "@/lib/config";
import { rerankChunks, type RerankableChunk } from "@/lib/rerank";

interface MatchedDocument {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

export interface GetRAGContextInput {
  query: string;
  clientId: string;
  openaiApiKey?: string;
  similarityThreshold?: number;
  maxResults?: number;
  // Quando passado, ativa o reranker LLM (busca top-N, rerank → top maxResults).
  // Sem isso, mantem comportamento original (top maxResults por cosseno).
  clientConfig?: {
    primaryModelProvider?: string;
    openaiModel?: string;
    groqModel?: string;
  };
  conversationId?: string;
  phone?: string;
}

export interface RAGTraceData {
  chunkIds: string[];
  similarityScores: number[];
  topK: number;
  threshold: number;
  strategy: string;
}

export interface GetRAGContextOutput {
  context: string;
  traceData: RAGTraceData | null;
}

// Quantidade inicial buscada no vector search antes do reranker.
// O reranker usa este pool maior pra escolher os melhores topK. Quanto maior,
// melhor a chance de incluir o chunk certo, mas mais caro o reranker.
const RERANKER_INITIAL_FETCH = 10;

export const getRAGContextWithTrace = async (
  input: GetRAGContextInput,
): Promise<GetRAGContextOutput> => {
  const {
    query,
    clientId,
    openaiApiKey,
    clientConfig,
    conversationId,
    phone,
  } = input;

  try {
    let similarityThreshold = input.similarityThreshold;
    let maxResults = input.maxResults;

    if (similarityThreshold === undefined) {
      const configValue = await getBotConfig(clientId, "rag:similarity_threshold");
      similarityThreshold = configValue !== null ? Number(configValue) : 0.7;
    }

    if (maxResults === undefined) {
      const configValue = await getBotConfig(clientId, "rag:max_results");
      maxResults = configValue !== null ? Number(configValue) : 5;
    }

    // Reranker so eh ativado quando o caller passa clientConfig (precisa pra
    // chamar callDirectAI com as credenciais do tenant). Quando ativo, busca
    // um pool maior de chunks e deixa o LLM escolher os melhores. Quando
    // inativo, mantem comportamento original (top-K direto do cosseno).
    const rerankerEnabled = clientConfig !== undefined;
    const initialFetchCount = rerankerEnabled
      ? Math.max(RERANKER_INITIAL_FETCH, maxResults)
      : maxResults;

    const embeddingResult = await generateEmbedding(query, openaiApiKey, clientId);
    const supabase = await createServerClient();

    const { data, error } = await supabase.rpc("match_documents", {
      query_embedding: embeddingResult.embedding,
      match_threshold: similarityThreshold,
      match_count: initialFetchCount,
      filter_client_id: clientId,
    });

    if (error) {
      throw new Error(`Failed to match documents: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return {
        context: "",
        traceData: {
          chunkIds: [],
          similarityScores: [],
          topK: maxResults,
          threshold: similarityThreshold,
          strategy: rerankerEnabled ? "cosine_then_llm_rerank" : "cosine_top_k",
        },
      };
    }

    let documents = data as MatchedDocument[];

    // Rerank passo opcional. Falha graciosa: o rerankChunks ja retorna o
    // top-K original por cosseno em qualquer erro, entao o flow nao quebra.
    if (rerankerEnabled && documents.length > maxResults) {
      const reranked = await rerankChunks({
        clientId,
        query,
        chunks: documents as RerankableChunk[],
        topK: maxResults,
        clientConfig: clientConfig!,
        conversationId,
        phone,
      });
      documents = reranked as MatchedDocument[];
    } else if (documents.length > maxResults) {
      // Sem reranker — trim por cosseno (comportamento original)
      documents = documents.slice(0, maxResults);
    }

    // Note: do NOT prefix chunks with "[Documento N - Relevancia: X%]".
    // Small reasoning models (gpt-5.x-nano) interpret that header as an
    // instruction to "present documents" and end up copying chunk content
    // verbatim to the end user. Relevance scores live in traceData for
    // observability — the LLM does not need them. Plain text separator
    // forces synthesis instead of regurgitation.
    const context = documents
      .map((doc) => doc.content.trim())
      .filter((c) => c.length > 0)
      .join("\n\n---\n\n");

    return {
      context,
      traceData: {
        chunkIds: documents.map((doc) => doc.id),
        similarityScores: documents.map((doc) => doc.similarity),
        topK: maxResults,
        threshold: similarityThreshold,
        strategy: rerankerEnabled ? "cosine_then_llm_rerank" : "cosine_top_k",
      },
    };
  } catch {
    return {
      context: "",
      traceData: null,
    };
  }
};

export const getRAGContext = async (
  input: GetRAGContextInput,
): Promise<string> => {
  const result = await getRAGContextWithTrace(input);
  return result.context;
};

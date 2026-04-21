import { generateEmbedding } from "@/lib/openai";
import { createServerClient } from "@/lib/supabase";
import { getBotConfig } from "@/lib/config";

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

export const getRAGContextWithTrace = async (
  input: GetRAGContextInput,
): Promise<GetRAGContextOutput> => {
  const { query, clientId, openaiApiKey } = input;

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

    const embeddingResult = await generateEmbedding(query, openaiApiKey, clientId);
    const supabase = await createServerClient();

    const { data, error } = await supabase.rpc("match_documents", {
      query_embedding: embeddingResult.embedding,
      match_threshold: similarityThreshold,
      match_count: maxResults,
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
          strategy: "cosine_top_k",
        },
      };
    }

    const documents = data as MatchedDocument[];
    const context = documents
      .map(
        (doc, i) =>
          `[Documento ${i + 1} - Relevancia: ${(doc.similarity * 100).toFixed(1)}%]\n${doc.content}`,
      )
      .join("\n\n---\n\n");

    return {
      context,
      traceData: {
        chunkIds: documents.map((doc) => doc.id),
        similarityScores: documents.map((doc) => doc.similarity),
        topK: maxResults,
        threshold: similarityThreshold,
        strategy: "cosine_top_k",
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


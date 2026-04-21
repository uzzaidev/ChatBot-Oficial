import { getBotConfig } from "@/lib/config";
import { generateEmbedding } from "@/lib/openai";
import { createServerClient } from "@/lib/supabase";

export interface GroundTruthEntry {
  id: string;
  user_query: string;
  expected_response: string;
  category: string | null;
  subcategory: string | null;
  tags: string[];
  confidence: number;
  version: number;
  similarity: number;
}

export interface FindSimilarOptions {
  threshold?: number;
  limit?: number;
}

const DEFAULT_THRESHOLD = 0.8;
const DEFAULT_LIMIT = 1;

const clampThreshold = (value: number) => {
  if (!Number.isFinite(value)) return DEFAULT_THRESHOLD;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
};

export const findSimilarGroundTruth = async (
  clientId: string,
  userQuery: string,
  options: FindSimilarOptions = {},
): Promise<GroundTruthEntry | null> => {
  const list = await findSimilarGroundTruthList(clientId, userQuery, {
    ...options,
    limit: 1,
  });
  return list[0] ?? null;
};

export const findSimilarGroundTruthList = async (
  clientId: string,
  userQuery: string,
  options: FindSimilarOptions = {},
): Promise<GroundTruthEntry[]> => {
  if (!clientId || !userQuery.trim()) {
    return [];
  }

  const thresholdFromConfig = await getBotConfig(clientId, "quality:gt_threshold");
  const threshold =
    options.threshold ??
    (thresholdFromConfig != null ? Number(thresholdFromConfig) : DEFAULT_THRESHOLD);
  const matchThreshold = clampThreshold(threshold);
  const limit = Math.max(1, Math.min(20, options.limit ?? DEFAULT_LIMIT));

  const { embedding } = await generateEmbedding(userQuery, undefined, clientId);
  if (embedding.length !== 1536) {
    throw new Error(
      `Invalid embedding dimensions: expected 1536, got ${embedding.length}`,
    );
  }

  const supabase = await createServerClient();
  const { data, error } = await (supabase as any).rpc("match_ground_truth", {
    query_embedding: embedding,
    match_threshold: matchThreshold,
    match_count: limit,
    filter_client_id: clientId,
  });

  if (error) {
    console.error("[ground-truth-matcher] match failed", {
      clientId,
      error: error.message,
    });
    return [];
  }

  return ((data ?? []) as GroundTruthEntry[]).filter((entry) => !!entry?.id);
};

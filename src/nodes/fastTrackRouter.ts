import { getBotConfigs } from "@/lib/config";
import { callAI } from "@/lib/ai-gateway";
import { shouldUseGateway } from "@/lib/ai-gateway/config";
import type { CoreMessage } from "ai";
import { createServiceRoleClient } from "@/lib/supabase";

/**
 * 🚀 Fast Track Router - Semantic FAQ Detection
 * 
 * Detects FAQ/standard questions using semantic similarity to enable cache-friendly processing.
 * When a question matches a canonical FAQ, the flow bypasses history/RAG/datetime for stable prompts.
 * 
 * This enables LLM prompt caching within the same tenant for identical questions.
 */

export interface FastTrackCatalogItem {
  topic: string; // e.g., "faq_planos", "faq_servicos"
  canonical: string; // Base question: "Quais são os planos?"
  examples: string[]; // Variations: ["pode me mandar o plano?", "quero ver os planos"]
}

export interface FastTrackConfig {
  enabled: boolean;
  router_model?: string; // Model for semantic classification (default: "gpt-4o-mini")
  similarity_threshold?: number; // 0-1, default 0.80
  catalog?: FastTrackCatalogItem[]; // FAQ catalog
  keywords?: string[]; // Optional prefilter keywords
  match_mode?: "contains" | "starts_with"; // Keyword match mode
  disable_tools?: boolean; // Whether to disable tools in fast track
}

export interface FastTrackRouterInput {
  clientId: string;
  phone: string;
  message: string; // Batched message content
  config?: FastTrackConfig; // Optional config override
}

export interface FastTrackRouterOutput {
  shouldFastTrack: boolean;
  reason: string; // 'ai_similarity' | 'keyword_match' | 'disabled' | 'low_similarity' | 'invalid_catalog' | 'no_catalog'
  topic?: string;
  similarity?: number; // 0-1 similarity score
  matchedCanonical?: string;
  matchedExample?: string;
  matchedKeyword?: string;
  catalogSize?: number;
  routerModel?: string;
}

/**
 * Default configuration for fast track router
 */
const DEFAULT_CONFIG: FastTrackConfig = {
  enabled: false, // Disabled by default - tenant must opt-in
  router_model: "gpt-4o-mini", // Cheapest GPT-4 model for classification
  similarity_threshold: 0.80, // High threshold to avoid false positives
  catalog: [],
  keywords: [],
  match_mode: "contains",
  disable_tools: true, // Disable tools by default for more stable prompts
};

/**
 * Normalize message for comparison (lowercase, trim, remove extra spaces)
 */
const normalizeMessage = (message: string): string => {
  return message
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/[?!.,:;]/g, ""); // Remove punctuation
};

/**
 * Keyword-based prefilter (optional, fast path)
 * Returns matched keyword if found
 */
const checkKeywordMatch = (
  message: string,
  keywords: string[],
  matchMode: "contains" | "starts_with",
): string | null => {
  if (!keywords || keywords.length === 0) return null;

  const normalized = normalizeMessage(message);

  for (const keyword of keywords) {
    const normalizedKeyword = normalizeMessage(keyword);

    if (matchMode === "starts_with") {
      if (normalized.startsWith(normalizedKeyword)) {
        return keyword;
      }
    } else {
      // contains
      if (normalized.includes(normalizedKeyword)) {
        return keyword;
      }
    }
  }

  return null;
};

/**
 * Build catalog text for LLM prompt
 */
const buildCatalogText = (catalog: FastTrackCatalogItem[]): string => {
  const lines: string[] = [];

  catalog.forEach((item, index) => {
    lines.push(`${index + 1}. Tópico: ${item.topic}`);
    lines.push(`   Pergunta canônica: "${item.canonical}"`);
    if (item.examples && item.examples.length > 0) {
      lines.push(`   Exemplos de variações:`);
      item.examples.forEach((ex) => {
        lines.push(`   - "${ex}"`);
      });
    }
    lines.push(""); // Empty line between items
  });

  return lines.join("\n");
};

/**
 * Call LLM to determine if message matches any FAQ in catalog
 */
const classifyWithAI = async (
  clientId: string,
  message: string,
  catalog: FastTrackCatalogItem[],
  routerModel: string,
  threshold: number,
): Promise<{
  shouldFastTrack: boolean;
  topic?: string;
  similarity?: number;
  matchedCanonical?: string;
  matchedExample?: string;
}> => {
  // Build system prompt for classification
  const systemPrompt = `Você é um classificador semântico de perguntas FAQ.

Sua tarefa é determinar se a mensagem do usuário corresponde a alguma das perguntas FAQ do catálogo fornecido.

Responda APENAS com um JSON no seguinte formato:
{
  "match": true/false,
  "topic": "topic_name" (apenas se match=true),
  "similarity": 0.0-1.0 (confiança na correspondência),
  "matched_canonical": "pergunta canônica que deu match" (apenas se match=true),
  "matched_example": "exemplo mais similar" (opcional, se houver um exemplo muito similar)
}

Critérios para match:
- A mensagem deve ter INTENÇÃO SIMILAR à pergunta FAQ (não precisa ser idêntica)
- Considere variações linguísticas, gírias e diferentes formas de perguntar
- Similarity mínimo: ${threshold}
- Se a mensagem for muito diferente ou não relacionada às FAQs, retorne match=false`;

  const catalogText = buildCatalogText(catalog);

  const userPrompt = `Catálogo de FAQs:
${catalogText}

Mensagem do usuário: "${message}"

Analise se a mensagem corresponde a alguma FAQ do catálogo. Responda com JSON.`;

  const messages: CoreMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  try {
    // Use AI Gateway if enabled
    const useGateway = await shouldUseGateway(clientId);

    let responseText = "";

    if (useGateway) {
      // Route through AI Gateway
      const result = await callAI({
        clientId,
        clientConfig: {
          id: clientId,
          name: "Fast Track Router",
          slug: "fast-track-router",
          primaryModelProvider: "openai", // Force OpenAI for consistency
          openaiModel: routerModel,
          groqModel: "llama-3.3-70b-versatile",
        },
        messages,
        options: {
          temperature: 0.1, // Low temperature for consistent classification
          max_tokens: 150,
        },
      });

      responseText = result.text;
    } else {
      // Direct OpenAI call (fallback)
      const supabase = createServiceRoleClient();
      const { data: client } = await supabase
        .from("clients")
        .select("openai_api_key")
        .eq("id", clientId)
        .single();

      if (!client?.openai_api_key) {
        throw new Error("OpenAI API key not configured");
      }

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${client.openai_api_key}`,
        },
        body: JSON.stringify({
          model: routerModel,
          messages,
          temperature: 0.1,
          max_tokens: 150,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      responseText = data.choices[0]?.message?.content || "";
    }

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[FastTrack] No JSON in AI response:", responseText);
      return { shouldFastTrack: false, similarity: 0 };
    }

    const result = JSON.parse(jsonMatch[0]);

    return {
      shouldFastTrack: result.match === true && (result.similarity || 0) >= threshold,
      topic: result.topic,
      similarity: result.similarity,
      matchedCanonical: result.matched_canonical,
      matchedExample: result.matched_example,
    };
  } catch (error) {
    console.error("[FastTrack] AI classification error:", error);
    return { shouldFastTrack: false, similarity: 0 };
  }
};

/**
 * Main fast track router node
 * 
 * Determines if a message should take the fast track (cache-friendly) path
 * by checking semantic similarity against a catalog of FAQ questions.
 */
export const fastTrackRouter = async (
  input: FastTrackRouterInput,
): Promise<FastTrackRouterOutput> => {
  const { clientId, message, config: configOverride } = input;

  try {
    // Fetch configuration from database
    const configs = await getBotConfigs(clientId, [
      "fast_track:enabled",
      "fast_track:router_model",
      "fast_track:similarity_threshold",
      "fast_track:catalog",
      "fast_track:keywords",
      "fast_track:match_mode",
      "fast_track:disable_tools",
    ]);

    // Merge with defaults
    const config: FastTrackConfig = {
      ...DEFAULT_CONFIG,
      ...(configOverride || {}),
    };

    // Override with DB values if present
    if (configs["fast_track:enabled"] !== undefined) {
      config.enabled = configs["fast_track:enabled"];
    }
    if (configs["fast_track:router_model"]) {
      config.router_model = configs["fast_track:router_model"];
    }
    if (configs["fast_track:similarity_threshold"] !== undefined) {
      config.similarity_threshold = configs["fast_track:similarity_threshold"];
    }
    if (configs["fast_track:catalog"]) {
      config.catalog = configs["fast_track:catalog"];
    }
    if (configs["fast_track:keywords"]) {
      config.keywords = configs["fast_track:keywords"];
    }
    if (configs["fast_track:match_mode"]) {
      config.match_mode = configs["fast_track:match_mode"];
    }
    if (configs["fast_track:disable_tools"] !== undefined) {
      config.disable_tools = configs["fast_track:disable_tools"];
    }

    // Check if enabled
    if (!config.enabled) {
      return {
        shouldFastTrack: false,
        reason: "disabled",
      };
    }

    // Validate catalog
    if (!config.catalog || config.catalog.length === 0) {
      return {
        shouldFastTrack: false,
        reason: "no_catalog",
        catalogSize: 0,
      };
    }

    // STEP 1: Optional keyword prefilter (fast path)
    if (config.keywords && config.keywords.length > 0) {
      const matchedKeyword = checkKeywordMatch(
        message,
        config.keywords,
        config.match_mode || "contains",
      );

      if (matchedKeyword) {
        // Keyword matched - fast track
        return {
          shouldFastTrack: true,
          reason: "keyword_match",
          matchedKeyword,
          catalogSize: config.catalog.length,
        };
      }
    }

    // STEP 2: Semantic similarity using AI
    const aiResult = await classifyWithAI(
      clientId,
      message,
      config.catalog,
      config.router_model || DEFAULT_CONFIG.router_model!,
      config.similarity_threshold || DEFAULT_CONFIG.similarity_threshold!,
    );

    if (aiResult.shouldFastTrack) {
      return {
        shouldFastTrack: true,
        reason: "ai_similarity",
        topic: aiResult.topic,
        similarity: aiResult.similarity,
        matchedCanonical: aiResult.matchedCanonical,
        matchedExample: aiResult.matchedExample,
        catalogSize: config.catalog.length,
        routerModel: config.router_model,
      };
    }

    // No match
    return {
      shouldFastTrack: false,
      reason: "low_similarity",
      similarity: aiResult.similarity,
      catalogSize: config.catalog.length,
      routerModel: config.router_model,
    };
  } catch (error) {
    console.error("[FastTrack] Router error:", error);
    return {
      shouldFastTrack: false,
      reason: "error",
    };
  }
};

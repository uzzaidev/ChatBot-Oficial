import { callDirectAI } from "@/lib/direct-ai-client";
import { z } from "zod";

const JUDGE_PROVIDER =
  (process.env.EVALUATION_JUDGE_PROVIDER as "openai" | "groq" | undefined) ??
  "openai";
const JUDGE_MODEL = process.env.EVALUATION_JUDGE_MODEL ?? "gpt-4o-mini";
const PROMPT_VERSION = process.env.EVALUATION_JUDGE_PROMPT_VERSION ?? "v1";

const PRICE_INPUT_PER_MTOK = Number.parseFloat(
  process.env.EVALUATION_PRICE_INPUT_PER_MTOK ?? "3",
);
const PRICE_OUTPUT_PER_MTOK = Number.parseFloat(
  process.env.EVALUATION_PRICE_OUTPUT_PER_MTOK ?? "15",
);

export interface EvaluationInput {
  traceId: string;
  clientId: string;
  userMessage: string;
  agentResponse: string;
  retrievedChunks?: Array<{
    id: string;
    content?: string;
    similarity: number;
  }>;
  groundTruthExpected?: string | null;
}

export const EvaluationOutputSchema = z.object({
  alignment_score: z.number().min(0).max(10).nullable(),
  relevance_score: z.number().min(0).max(10).nullable(),
  finality_score: z.number().min(0).max(10),
  safety_score: z.number().min(0).max(10),
  alignment_reasoning: z.string().nullable(),
  relevance_reasoning: z.string().nullable(),
  finality_reasoning: z.string(),
  safety_reasoning: z.string(),
});

export type EvaluationOutput = z.infer<typeof EvaluationOutputSchema>;

export interface EvaluationResult {
  alignmentScore: number | null;
  relevanceScore: number | null;
  finalityScore: number;
  safetyScore: number;
  compositeScore: number;
  verdict: "PASS" | "REVIEW" | "FAIL";
  reasoning: {
    alignment: string | null;
    relevance: string | null;
    finality: string;
    safety: string;
  };
  cost: {
    tokensInput: number;
    tokensOutput: number;
    costUsd: number;
  };
  judgeModel: string;
  promptVersion: string;
  durationMs: number;
}

const WEIGHTS = {
  alignment: 0.4,
  relevance: 0.2,
  finality: 0.3,
  safety: 0.1,
} as const;

const toNonEmptyOrNull = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const extractJsonObject = (raw: string): Record<string, unknown> | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first === -1 || last === -1 || last <= first) return null;

    try {
      return JSON.parse(trimmed.slice(first, last + 1)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
};

const buildPrompt = (input: EvaluationInput): string => {
  const chunks = input.retrievedChunks?.length
    ? input.retrievedChunks
        .slice(0, 8)
        .map((chunk, index) => {
          const content = (chunk.content ?? "").trim();
          const snippet = content
            ? content.slice(0, 300).replace(/\s+/g, " ")
            : "(conteudo indisponivel)";
          return `[${index + 1}] id=${chunk.id} sim=${chunk.similarity.toFixed(
            3,
          )} ${snippet}`;
        })
        .join("\n")
    : "(nenhum chunk recuperado)";

  const groundTruth = input.groundTruthExpected?.trim()
    ? input.groundTruthExpected.trim()
    : "(sem gabarito disponivel; retorne alignment_score e alignment_reasoning como null)";

  return [
    "Voce e um avaliador rigoroso de respostas de chatbot.",
    "Avalie a resposta em 4 dimensoes e retorne APENAS JSON valido.",
    "Nao inclua markdown ou texto fora do JSON.",
    "",
    "Pergunta do usuario:",
    input.userMessage,
    "",
    "Resposta do agente:",
    input.agentResponse,
    "",
    "Chunks recuperados (RAG):",
    chunks,
    "",
    "Resposta esperada (ground truth):",
    groundTruth,
    "",
    "Dimensoes:",
    "- alignment_score (0-10): aderencia semantica ao gabarito; null se sem gabarito",
    "- relevance_score (0-10): qualidade dos chunks recuperados; null se sem chunks",
    "- finality_score (0-10): resposta resolveu a duvida sem nova pergunta?",
    "- safety_score (0-10): sem alucinacao, sem risco, sem dado inventado",
    "",
    "Saida obrigatoria:",
    '{"alignment_score":null,"relevance_score":null,"finality_score":0,"safety_score":0,"alignment_reasoning":null,"relevance_reasoning":null,"finality_reasoning":"","safety_reasoning":""}',
  ].join("\n");
};

export const computeComposite = (output: EvaluationOutput): number => {
  let weightedSum = 0;
  let totalWeight = 0;

  if (output.alignment_score !== null) {
    weightedSum += output.alignment_score * WEIGHTS.alignment;
    totalWeight += WEIGHTS.alignment;
  }

  if (output.relevance_score !== null) {
    weightedSum += output.relevance_score * WEIGHTS.relevance;
    totalWeight += WEIGHTS.relevance;
  }

  weightedSum += output.finality_score * WEIGHTS.finality;
  weightedSum += output.safety_score * WEIGHTS.safety;
  totalWeight += WEIGHTS.finality + WEIGHTS.safety;

  if (totalWeight <= 0) return 0;
  return Number((weightedSum / totalWeight).toFixed(4));
};

export const verdictFromScore = (score: number): "PASS" | "REVIEW" | "FAIL" => {
  if (score >= 7) return "PASS";
  if (score >= 4) return "REVIEW";
  return "FAIL";
};

export const computeCost = (tokensInput: number, tokensOutput: number): number => {
  const input = Number.isFinite(tokensInput) ? tokensInput : 0;
  const output = Number.isFinite(tokensOutput) ? tokensOutput : 0;
  const priceIn = Number.isFinite(PRICE_INPUT_PER_MTOK) ? PRICE_INPUT_PER_MTOK : 0;
  const priceOut = Number.isFinite(PRICE_OUTPUT_PER_MTOK)
    ? PRICE_OUTPUT_PER_MTOK
    : 0;

  const total = (input * priceIn + output * priceOut) / 1_000_000;
  return Number(total.toFixed(8));
};

export const evaluateAgentResponse = async (
  input: EvaluationInput,
): Promise<EvaluationResult> => {
  const startedAt = Date.now();

  const ai = await callDirectAI({
    clientId: input.clientId,
    clientConfig: {
      id: input.clientId,
      primaryModelProvider: JUDGE_PROVIDER,
      openaiModel: JUDGE_MODEL,
      groqModel: JUDGE_MODEL,
    },
    messages: [
      {
        role: "system",
        content:
          "Voce e um juiz automatico de qualidade para conversas de suporte. Retorne apenas JSON valido.",
      },
      {
        role: "user",
        content: buildPrompt(input),
      },
    ],
    settings: {
      temperature: 0,
      maxTokens: 1200,
    },
    metadata: {
      source: "evaluation_engine",
      traceId: input.traceId,
      promptVersion: PROMPT_VERSION,
    },
  });

  const json = extractJsonObject(ai.text);
  if (!json) {
    throw new Error("Judge returned non-JSON output");
  }

  const validated = EvaluationOutputSchema.parse(json);
  const composite = computeComposite(validated);
  const verdict = verdictFromScore(composite);
  const durationMs = Date.now() - startedAt;

  const tokensInput = ai.usage.promptTokens ?? 0;
  const tokensOutput = ai.usage.completionTokens ?? 0;

  return {
    alignmentScore: validated.alignment_score,
    relevanceScore: validated.relevance_score,
    finalityScore: validated.finality_score,
    safetyScore: validated.safety_score,
    compositeScore: composite,
    verdict,
    reasoning: {
      alignment: toNonEmptyOrNull(validated.alignment_reasoning),
      relevance: toNonEmptyOrNull(validated.relevance_reasoning),
      finality: validated.finality_reasoning?.trim() || "Sem justificativa",
      safety: validated.safety_reasoning?.trim() || "Sem justificativa",
    },
    cost: {
      tokensInput,
      tokensOutput,
      costUsd: computeCost(tokensInput, tokensOutput),
    },
    judgeModel: ai.model || JUDGE_MODEL,
    promptVersion: PROMPT_VERSION,
    durationMs,
  };
};


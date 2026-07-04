/**
 * QA Evaluator — judges a QA report and proposes prompt fixes.
 *
 * Given a battery of questions and how the agent answered each one, an LLM
 * acting as a senior QA + prompt engineer:
 *   1. Judges each question/answer (good | partial | bad + score + issue),
 *   2. Proposes concrete, applyable changes to the agent's editable prompt
 *      sections — mapped back to the editor fields exactly like prompt-evaluator.
 *
 * Runs through `callDirectAI` with the client's own Vault credentials.
 */

import { callDirectAI } from "@/lib/direct-ai-client";
import {
  buildSystemPromptSegments,
  compileFormatterPrompt,
  compileSystemPrompt,
  type PromptSegment,
} from "@/lib/prompt-builder";
import type { PromptSuggestion, SuggestionSeverity } from "@/lib/prompt-evaluator";
import type {
  Agent,
  AgentQAQuestionReview,
  AgentQAResultItem,
} from "@/lib/types";
import { randomUUID } from "crypto";

export interface EvaluateQAInput {
  clientId: string;
  agent: Agent;
  provider: "openai" | "groq";
  model: string;
  results: AgentQAResultItem[];
  focus?: string | null;
}

export interface QAEvaluationResult {
  overallScore: number;
  overallAssessment: string;
  questionReviews: AgentQAQuestionReview[];
  suggestions: PromptSuggestion[];
  evaluatorProvider: string;
  evaluatorModel: string;
  usage: { tokensInput: number; tokensOutput: number };
  durationMs: number;
}

const clampScore = (value: unknown): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
};

const normalizeSeverity = (value: unknown): SuggestionSeverity => {
  const v = String(value ?? "").toLowerCase();
  if (v === "high" || v === "alta") return "high";
  if (v === "low" || v === "baixa") return "low";
  return "medium";
};

const normalizeVerdict = (value: unknown): AgentQAQuestionReview["verdict"] => {
  const v = String(value ?? "").toLowerCase();
  if (v === "good" || v === "boa" || v === "bom") return "good";
  if (v === "bad" || v === "ruim" || v === "ma") return "bad";
  return "partial";
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
      return JSON.parse(trimmed.slice(first, last + 1)) as Record<
        string,
        unknown
      >;
    } catch {
      return null;
    }
  }
};

const EVALUATOR_SYSTEM_PROMPT = [
  "Voce e um especialista senior de QA de agentes de IA e engenheiro de prompts. Recebe uma bateria de perguntas (QA) e as respostas que o agente deu a cada uma, junto com o prompt de sistema que gerou essas respostas. Sua funcao e: (1) julgar cada resposta e (2) propor ajustes concretos no prompt.",
  "",
  "REGRAS CRITICAS (em ordem de prioridade):",
  "1. Avalie SOMENTE o material fornecido (perguntas, respostas e prompt). Nao invente fatos, produtos ou politicas.",
  "2. Julgue cada pergunta pelo `id` exato fornecido. Nao crie ids novos nem omita perguntas.",
  "3. So proponha mudanca para uma secao cujo `tag` esteja na lista de SECOES EDITAVEIS. Nunca sugira mudar blocos fixos do sistema.",
  "4. Para cada sugestao com mudanca de texto, `suggested_value` DEVE ser o texto COMPLETO que substitui o conteudo atual daquela secao (nao um diff, nao um trecho).",
  "5. Mantenha o idioma original de cada secao (portugues do Brasil) no `suggested_value`.",
  "6. Para secoes marcadas como advisory=true, `suggested_value` DEVE ser null.",
  "7. Conecte cada sugestao a falhas concretas observadas nas respostas. No maximo 6 sugestoes, foque no maior impacto.",
  "",
  "COMO JULGAR CADA RESPOSTA:",
  "- verdict 'good': responde de forma correta, completa e no tom/escopo esperado.",
  "- verdict 'partial': responde mas com falha relevante (incompleta, tom errado, sem regra de decisao, ambigua).",
  "- verdict 'bad': erra, alucina, foge do escopo, ignora a pergunta ou viola limites.",
  "- `score` 0-100 reflete a qualidade da resposta. `issue` explica em pt-BR o que motivou o veredito (curto e objetivo).",
  "- Se a resposta veio com erro tecnico (campo error preenchido), trate como 'bad' e aponte no issue.",
  "",
  "PROCEDIMENTO (execute em ordem):",
  "1. Leia o prompt e cada par pergunta/resposta.",
  "2. Julgue cada resposta individualmente.",
  "3. Identifique padroes de falha que tenham causa no prompt.",
  "4. Para os de maior impacto, escreva a versao corrigida COMPLETA da secao editavel.",
  "5. So depois escreva o relatorio final em JSON.",
  "",
  "AMBIGUIDADE: se faltar informacao para reescrever com seguranca, marque a sugestao como advisory (suggested_value null) e explique o que o humano precisa decidir.",
  "",
  "FORMATO DE SAIDA (obrigatorio):",
  "- Responda com APENAS um objeto JSON valido. Sem markdown, sem comentarios, sem texto antes ou depois.",
  "- Esquema exato:",
  '{"overall_score": <int 0-100>, "overall_assessment": "<resumo curto pt-BR>", "question_reviews": [{"id": "<id da pergunta>", "verdict": "good|partial|bad", "score": <int 0-100>, "issue": "<pt-BR>"}], "suggestions": [{"section_tag": "<tag da lista ou general>", "title": "<titulo curto>", "severity": "high|medium|low", "rationale": "<por que, pt-BR>", "suggested_value": "<texto completo da secao ou null>"}]}',
].join("\n");

const buildUserMessage = (
  agent: Agent,
  segments: PromptSegment[],
  systemPrompt: string,
  formatterPrompt: string,
  results: AgentQAResultItem[],
  focus: string | null | undefined,
): string => {
  const editableSections = segments
    .filter((segment) => segment.source.editable)
    .map((segment) => {
      const source = segment.source as Extract<
        PromptSegment["source"],
        { editable: true }
      >;
      const advisory = source.apply.kind === "advisory";
      return [
        `### tag: ${segment.tag}`,
        `label: ${source.label}`,
        `advisory: ${advisory}`,
        "conteudo_atual:",
        segment.content,
      ].join("\n");
    })
    .join("\n\n");

  const fixedSections = segments
    .filter((segment) => !segment.source.editable)
    .map((segment) => `- ${segment.tag} (bloco fixo, nao editavel)`)
    .join("\n");

  const qaBlock = results
    .map((r, i) => {
      const answer = r.error
        ? `[ERRO TECNICO] ${r.error}`
        : r.response || "(resposta vazia)";
      return [
        `--- Pergunta ${i + 1} (id: ${r.id}) ---`,
        `PERGUNTA: ${r.question}`,
        `RESPOSTA DO AGENTE: ${answer}`,
      ].join("\n");
    })
    .join("\n\n");

  const parts: string[] = [
    `Agente: ${agent.name}`,
    `Provedor/modelo de producao: ${agent.primary_provider} / ${
      agent.primary_provider === "openai"
        ? agent.openai_model
        : agent.groq_model
    }`,
    "",
    "=== PROMPT DE SISTEMA COMPILADO (exatamente como o modelo recebe) ===",
    systemPrompt,
    "",
    "=== PROMPT DO FORMATADOR ===",
    formatterPrompt,
    "",
    "=== BATERIA DE QA (perguntas e respostas a julgar) ===",
    qaBlock || "(vazio)",
    "",
    "=== SECOES EDITAVEIS (use apenas estes `tag` em section_tag) ===",
    editableSections || "(nenhuma)",
  ];

  if (fixedSections) {
    parts.push("", "=== BLOCOS FIXOS (NAO editar) ===", fixedSections);
  }

  if (focus && focus.trim()) {
    parts.push("", "=== FOCO PEDIDO PELO OPERADOR ===", focus.trim());
  }

  parts.push(
    "",
    "Agora produza o relatorio em JSON conforme o esquema. Julgue TODAS as perguntas pelo id, e em suggestions use apenas tags da lista editavel com suggested_value completo (ou null se advisory).",
  );

  return parts.join("\n");
};

export const evaluateQAReport = async (
  input: EvaluateQAInput,
): Promise<QAEvaluationResult> => {
  const startedAt = Date.now();
  const { agent, provider, model, results, focus, clientId } = input;

  const segments = buildSystemPromptSegments(agent);
  const systemPrompt = compileSystemPrompt(agent);
  const formatterPrompt = compileFormatterPrompt(agent);

  const segmentByTag = new Map<string, PromptSegment>();
  for (const segment of segments) {
    segmentByTag.set(segment.tag, segment);
  }
  const validResultIds = new Set(results.map((r) => r.id));

  const ai = await callDirectAI({
    clientId,
    clientConfig: {
      id: clientId,
      primaryModelProvider: provider,
      openaiModel: model,
      groqModel: model,
    },
    messages: [
      { role: "system", content: EVALUATOR_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildUserMessage(
          agent,
          segments,
          systemPrompt,
          formatterPrompt,
          results,
          focus,
        ),
      },
    ],
    settings: {
      temperature: 0.2,
      maxTokens: 4000,
    },
    metadata: {
      source: "qa_evaluator",
      agentId: agent.id,
      questionCount: results.length,
    },
  });

  const json = extractJsonObject(ai.text);
  if (!json) {
    throw new Error("Evaluator returned non-JSON output");
  }

  // ── Per-question reviews ──
  const rawReviews = Array.isArray(json.question_reviews)
    ? (json.question_reviews as Array<Record<string, unknown>>)
    : [];

  const questionReviews: AgentQAQuestionReview[] = rawReviews
    .map((raw): AgentQAQuestionReview | null => {
      const id = String(raw.id ?? "").trim();
      if (!validResultIds.has(id)) return null;
      return {
        id,
        verdict: normalizeVerdict(raw.verdict),
        score: clampScore(raw.score),
        issue: String(raw.issue ?? "").trim(),
      };
    })
    .filter((v): v is AgentQAQuestionReview => v !== null);

  // ── Prompt suggestions (same mapping as prompt-evaluator) ──
  const rawSuggestions = Array.isArray(json.suggestions)
    ? (json.suggestions as Array<Record<string, unknown>>)
    : [];

  const suggestions: PromptSuggestion[] = rawSuggestions
    .map((raw): PromptSuggestion | null => {
      const sectionTag = String(raw.section_tag ?? "").trim();
      const segment = segmentByTag.get(sectionTag);
      if (!segment || !segment.source.editable) return null;

      const source = segment.source as Extract<
        PromptSegment["source"],
        { editable: true }
      >;
      const isAdvisory = source.apply.kind === "advisory";

      const rawValue =
        typeof raw.suggested_value === "string"
          ? raw.suggested_value.trim()
          : "";
      const suggestedValue =
        isAdvisory || rawValue.length === 0 ? null : rawValue;

      return {
        id: randomUUID(),
        sectionTag,
        sectionLabel: source.label,
        title: String(raw.title ?? "Sugestao").trim() || "Sugestao",
        severity: normalizeSeverity(raw.severity),
        rationale: String(raw.rationale ?? "").trim(),
        currentExcerpt: segment.content,
        suggestedValue,
        apply: source.apply,
        status: "open",
      };
    })
    .filter((value): value is PromptSuggestion => value !== null);

  return {
    overallScore: clampScore(json.overall_score),
    overallAssessment: String(json.overall_assessment ?? "").trim(),
    questionReviews,
    suggestions,
    evaluatorProvider: provider,
    evaluatorModel: ai.model || model,
    usage: {
      tokensInput: ai.usage.promptTokens ?? 0,
      tokensOutput: ai.usage.completionTokens ?? 0,
    },
    durationMs: Date.now() - startedAt,
  };
};

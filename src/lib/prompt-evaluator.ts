/**
 * Prompt Evaluator — a specialist "prompt engineer" reviewer.
 *
 * Given an agent's compiled system prompt (the exact text the model receives),
 * an LLM acting as a prompt-engineering expert reviews it and returns structured
 * suggestions mapped back to the editor fields that control each section.
 *
 * The evaluator runs through `callDirectAI` using the client's own Vault
 * credentials (multi-tenant isolation), exactly like the quality judge in
 * `evaluation-engine.ts`.
 *
 * Output contract follows OpenAI prompt-guidance structure:
 * critical rules first, numbered execution steps, explicit decision rules,
 * separation of "analyse" vs "report", explicit ambiguity handling, and a
 * strict JSON-only output envelope.
 */

import { callDirectAI } from "@/lib/direct-ai-client";
import {
  buildSystemPromptSegments,
  compileFormatterPrompt,
  compileSystemPrompt,
  type PromptApplyTarget,
  type PromptSegment,
} from "@/lib/prompt-builder";
import type { Agent } from "@/lib/types";
import { randomUUID } from "crypto";

export type SuggestionSeverity = "high" | "medium" | "low";

export type SuggestionStatus = "open" | "applied" | "dismissed";

export interface PromptSuggestion {
  id: string;
  /** XML tag of the targeted section, or "general" for global advice. */
  sectionTag: string;
  /** Human label of the editor location that controls the section. */
  sectionLabel: string;
  title: string;
  severity: SuggestionSeverity;
  rationale: string;
  /** Current content of the section (for the before/after diff). */
  currentExcerpt: string | null;
  /** Full replacement text for the editable field, or null when advisory. */
  suggestedValue: string | null;
  /** Where to write `suggestedValue` back in the editor form. */
  apply: PromptApplyTarget;
  status: SuggestionStatus;
}

export interface PromptTraceContext {
  userMessage: string;
  agentResponse: string;
  modelUsed: string | null;
}

export interface EvaluatePromptInput {
  clientId: string;
  agent: Agent;
  provider: "openai" | "groq";
  model: string;
  /** Optional real message that motivated the review (message-grounded mode). */
  trace?: PromptTraceContext | null;
  /** Optional extra instruction from the operator (what to focus on). */
  focus?: string | null;
}

export interface PromptEvaluationResult {
  overallScore: number;
  overallAssessment: string;
  suggestions: PromptSuggestion[];
  evaluatorProvider: string;
  evaluatorModel: string;
  promptSnapshot: {
    systemPrompt: string;
    formatterPrompt: string;
  };
  usage: {
    tokensInput: number;
    tokensOutput: number;
  };
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

/**
 * Specialist system prompt for the "prompt engineer" reviewer.
 *
 * Structured per OpenAI prompt-guidance: critical rules first, numbered steps,
 * decision rules, explicit ambiguity handling, and a strict output envelope.
 */
const EVALUATOR_SYSTEM_PROMPT = [
  "Voce e um engenheiro de prompts senior. Sua unica funcao e revisar o prompt de sistema de um agente de IA e propor melhorias concretas.",
  "",
  "REGRAS CRITICAS (em ordem de prioridade):",
  "1. Avalie SOMENTE o prompt fornecido. Nao invente secoes, ferramentas ou contexto que nao estejam no material.",
  "2. So proponha mudanca para uma secao cujo `tag` esteja na lista de SECOES EDITAVEIS. Nunca sugira mudar blocos fixos do sistema.",
  "3. Para cada sugestao com mudanca de texto, `suggested_value` DEVE ser o texto COMPLETO que substitui o conteudo atual daquela secao (nao um diff, nao um trecho).",
  "4. Mantenha o idioma original de cada secao (portugues do Brasil) no `suggested_value`.",
  "5. Para secoes marcadas como advisory=true, `suggested_value` DEVE ser null (apenas oriente em texto, nao reescreva).",
  "6. Nao reescreva tudo de uma vez: foque nas mudancas de maior impacto. No maximo 6 sugestoes.",
  "",
  "PRINCIPIOS DE ENGENHARIA DE PROMPT que voce aplica ao avaliar:",
  "- Regras criticas e nao-negociaveis devem vir primeiro e ser inequivocas.",
  "- Prefira passos numerados e regras de decisao a instrucoes vagas; nao confie so em 'voce DEVE'.",
  "- Separe claramente 'executar a acao' de 'relatar a acao'.",
  "- Defina explicitamente o comportamento sob ambiguidade: quando perguntar, quando assumir, quando recusar.",
  "- Especifique o empacotamento da resposta: tamanho, se faz pergunta de follow-up, ordem das secoes.",
  "- Modelos menores/mais literais (ex: mini) seguem melhor escopo explicito e ordem de execucao completa.",
  "- Remova contradicoes, redundancias e instrucoes que competem entre si.",
  "",
  "PROCEDIMENTO (execute em ordem):",
  "1. Leia o prompt completo e o contexto opcional da mensagem real.",
  "2. Identifique problemas concretos por secao (ambiguidade, contradicao, falta de regra de decisao, formato de saida indefinido, risco de alucinacao).",
  "3. Se houver uma mensagem real anexada, conecte cada problema ao que de fato aconteceu na resposta do agente.",
  "4. Para os problemas de maior impacto, escreva a versao corrigida COMPLETA da secao.",
  "5. So depois de analisar, escreva o relatorio final em JSON.",
  "",
  "AMBIGUIDADE: se faltar informacao para reescrever com seguranca, NAO invente. Marque a sugestao como advisory (suggested_value null) e explique o que precisa ser decidido pelo humano.",
  "",
  "FORMATO DE SAIDA (obrigatorio):",
  "- Responda com APENAS um objeto JSON valido. Sem markdown, sem comentarios, sem texto antes ou depois.",
  "- Apos o JSON final, nao escreva mais nada.",
  "- Esquema exato:",
  '{"overall_score": <int 0-100>, "overall_assessment": "<resumo curto em pt-BR>", "suggestions": [{"section_tag": "<tag da lista ou general>", "title": "<titulo curto>", "severity": "high|medium|low", "rationale": "<por que, em pt-BR>", "suggested_value": "<texto completo da secao ou null>"}]}',
].join("\n");

const buildUserMessage = (
  agent: Agent,
  segments: PromptSegment[],
  systemPrompt: string,
  formatterPrompt: string,
  trace: PromptTraceContext | null | undefined,
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

  const parts: string[] = [
    `Agente: ${agent.name}`,
    `Provedor/modelo de producao: ${agent.primary_provider} / ${
      agent.primary_provider === "openai"
        ? agent.openai_model
        : agent.groq_model
    }`,
    `Temperatura: ${agent.temperature} | Max tokens: ${agent.max_tokens}`,
    "",
    "=== PROMPT DE SISTEMA COMPILADO (exatamente como o modelo recebe) ===",
    systemPrompt,
    "",
    "=== PROMPT DO FORMATADOR ===",
    formatterPrompt,
    "",
    "=== SECOES EDITAVEIS (use apenas estes `tag` em section_tag) ===",
    editableSections || "(nenhuma)",
  ];

  if (fixedSections) {
    parts.push("", "=== BLOCOS FIXOS (NAO editar) ===", fixedSections);
  }

  if (trace) {
    parts.push(
      "",
      "=== MENSAGEM REAL PARA EMBASAR A AVALIACAO ===",
      "Conecte cada sugestao ao que aconteceu nesta troca real:",
      `Modelo usado: ${trace.modelUsed ?? "desconhecido"}`,
      "Mensagem do usuario:",
      trace.userMessage,
      "Resposta do agente:",
      trace.agentResponse,
    );
  }

  if (focus && focus.trim()) {
    parts.push("", "=== FOCO PEDIDO PELO OPERADOR ===", focus.trim());
  }

  parts.push(
    "",
    "Agora produza o relatorio em JSON conforme o esquema. Lembre: section_tag deve existir na lista de secoes editaveis e suggested_value deve ser o texto COMPLETO da secao (ou null se advisory).",
  );

  return parts.join("\n");
};

/**
 * Runs the specialist prompt review and returns structured, applyable
 * suggestions. Throws if the evaluator returns non-JSON output.
 */
export const evaluateAgentPrompt = async (
  input: EvaluatePromptInput,
): Promise<PromptEvaluationResult> => {
  const startedAt = Date.now();
  const { agent, provider, model, trace, focus, clientId } = input;

  const segments = buildSystemPromptSegments(agent);
  const systemPrompt = compileSystemPrompt(agent);
  const formatterPrompt = compileFormatterPrompt(agent);

  const segmentByTag = new Map<string, PromptSegment>();
  for (const segment of segments) {
    segmentByTag.set(segment.tag, segment);
  }

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
          trace,
          focus,
        ),
      },
    ],
    settings: {
      temperature: 0.2,
      maxTokens: 4000,
    },
    metadata: {
      source: "prompt_evaluator",
      agentId: agent.id,
      grounded: Boolean(trace),
    },
  });

  const json = extractJsonObject(ai.text);
  if (!json) {
    throw new Error("Evaluator returned non-JSON output");
  }

  const rawSuggestions = Array.isArray(json.suggestions)
    ? (json.suggestions as Array<Record<string, unknown>>)
    : [];

  const suggestions: PromptSuggestion[] = rawSuggestions
    .map((raw): PromptSuggestion | null => {
      const sectionTag = String(raw.section_tag ?? "").trim();
      const segment = segmentByTag.get(sectionTag);

      // Only accept suggestions for known editable sections.
      if (!segment || !segment.source.editable) {
        return null;
      }

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

      const title = String(raw.title ?? "Sugestao").trim() || "Sugestao";
      const rationale = String(raw.rationale ?? "").trim();

      return {
        id: randomUUID(),
        sectionTag,
        sectionLabel: source.label,
        title,
        severity: normalizeSeverity(raw.severity),
        rationale,
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
    suggestions,
    evaluatorProvider: provider,
    evaluatorModel: ai.model || model,
    promptSnapshot: { systemPrompt, formatterPrompt },
    usage: {
      tokensInput: ai.usage.promptTokens ?? 0,
      tokensOutput: ai.usage.completionTokens ?? 0,
    },
    durationMs: Date.now() - startedAt,
  };
};

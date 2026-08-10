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

// Sections whose compiled content is a system-generated "use this text
// verbatim" wrapper around a raw field (see buildSystemPromptSegments).
// A suggested_value for these must be the bare message, never the wrapper.
const VERBATIM_MESSAGE_TAGS = new Set(["greeting", "fallback"]);

/**
 * Defense-in-depth against the evaluator echoing back the mandatory-use
 * instruction wrapper (or inventing its own) instead of the plain message.
 * Even with explicit prompt instructions telling the model not to do this,
 * an LLM can still slip — this is a structural guard so a corrupted
 * suggestion can never be one-click applied. Matches were chosen from the
 * literal wrapper text in buildSystemPromptSegments (prompt-builder.ts).
 */
const looksLikeMetaInstructionWrapper = (value: string): boolean => {
  const normalized = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return (
    normalized.includes("obrigatorio") ||
    normalized.includes("exatamente este texto") ||
    normalized.includes("sem alterar nenhuma palavra")
  );
};

// Rule-type sections where fallback/escalation logic legitimately lives \u2014
// but where a NEW deflection rule is risky enough to deserve a caution
// (see introducesNewFallbackEscape below).
const RULE_FIELD_TAGS = new Set(["rules", "boundaries", "escalation_policy"]);

const KNOWN_TOOL_NAMES = [
  "buscar_documento",
  "transferir_atendimento",
  "buscar_conhecimento",
  "registrar_dado_cadastral",
  "enviar_resposta_em_audio",
  "verificar_agenda",
  "criar_evento_agenda",
  "alterar_evento_agenda",
  "cancelar_evento_agenda",
];

const FILENAME_PATTERN =
  /\b[\w-]+\.(jpe?g|png|gif|webp|pdf|docx?|xlsx?|pptx?|txt|md)\b/gi;

/**
 * Concrete, load-bearing references (tool names, filenames) present in the
 * current content but missing from the suggested replacement \u2014 usually an
 * accidental "simplification" that breaks tool-calling or filename lookups.
 * Returns what disappeared, for the caution note; empty when nothing dropped.
 */
const findDroppedConcreteReferences = (
  current: string,
  suggested: string,
): string[] => {
  const dropped = new Set<string>();
  const suggestedLower = suggested.toLowerCase();

  for (const name of KNOWN_TOOL_NAMES) {
    if (current.includes(name) && !suggestedLower.includes(name)) {
      dropped.add(name);
    }
  }

  const currentFilenames = current.match(FILENAME_PATTERN) ?? [];
  for (const filename of currentFilenames) {
    if (!suggestedLower.includes(filename.toLowerCase())) {
      dropped.add(filename);
    }
  }

  return Array.from(dropped);
};

const FALLBACK_ESCAPE_PHRASES = [
  "peca para a equipe",
  "pedir para a equipe",
  "encaminhe depois",
  "encaminhar depois",
  "nao conseguiu",
  "diga que vai",
  "avise que",
  "nao foi possivel",
  "entraremos em contato",
  "retornaremos",
  "nossa equipe vai",
  "equipe vai te passar",
  "assim que possivel",
];

/**
 * True when `suggested` introduces deflection/escape language that wasn't
 * already present in `current` \u2014 e.g. "se nao conseguir, diga que a equipe
 * vai te passar depois". Legitimate sometimes, but risky: it can make the
 * model prefer deferring over actually trying the action/tool it has
 * available (this is exactly what stopped an agent from sending images \u2014
 * it started deferring to "a equipe vai te passar" instead of calling
 * buscar_documento). Used to force elevated severity + a caution note,
 * never to block \u2014 unlike the message-wrapper case, this can be legitimate.
 */
const introducesNewFallbackEscape = (
  current: string,
  suggested: string,
): boolean => {
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const currentNorm = normalize(current);
  const suggestedNorm = normalize(suggested);
  return FALLBACK_ESCAPE_PHRASES.some(
    (phrase) =>
      suggestedNorm.includes(phrase) && !currentNorm.includes(phrase),
  );
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
  "4. Secoes marcadas 'ATENCAO: esta secao e uma MENSAGEM LITERAL' (ex: greeting, fallback) sao textos enviados ao cliente, nao instrucoes. `suggested_value` para elas deve ser APENAS a mensagem em si — NUNCA inclua prefixos tipo 'OBRIGATORIO', 'use EXATAMENTE este texto', aspas envolvendo a mensagem inteira, ou qualquer outra meta-instrucao. O sistema ja adiciona esse envoltorio sozinho ao compilar; incluir de novo cria instrucoes aninhadas que vazam pro cliente.",
  "5. Mantenha o idioma original de cada secao (portugues do Brasil) no `suggested_value`.",
  "6. Para secoes marcadas como advisory=true, `suggested_value` DEVE ser null (apenas oriente em texto, nao reescreva).",
  "7. Nao reescreva tudo de uma vez: foque nas mudancas de maior impacto. No maximo 6 sugestoes.",
  "8. IDEMPOTENCIA — voce SUBSTITUI o campo inteiro, nunca empilha em cima. Se o `conteudo_atual` ja mostrar sinais de seu proprio patch anterior (frases repetidas, instrucoes duplicadas, camadas redundantes), sua tarefa e CONSOLIDAR e limpar isso no `suggested_value` — nunca adicionar mais uma camada por cima do que ja esta la.",
  "9. NUNCA remova referencias concretas que ja existam no `conteudo_atual`: nomes de ferramenta (ex: buscar_documento, transferir_atendimento, buscar_conhecimento, registrar_dado_cadastral), nomes de arquivo (ex: planos-humana.jpg), URLs ou identificadores exatos. Essas referencias sustentam chamadas de tool e buscas por nome — remover ou generalizar 'para simplificar' quebra funcionalidade real.",
  "10. CAUTELA COM 'SAIDA FACIL': prefira resolver contradicao/ambiguidade a inventar uma nova regra de fallback/desvio (ex: 'se nao conseguir X, diga que vai encaminhar/pedir para a equipe depois'). Se mesmo assim a mudanca de maior impacto for adicionar uma logica de fallback/escalação nova a uma secao de REGRA, marque `severity: \"high\"` e explique no `rationale` que isso precisa ser testado no QA antes de confiar (pode fazer o agente preferir desviar a de fato tentar a acao/tool).",
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
  "INVARIANTES DO PRODUTO (nunca proponha `suggested_value` que viole isto):",
  "- RAG e automatico: quando habilitado, o proprio sistema injeta o contexto ou expõe a ferramenta de busca de conhecimento — nunca adicione uma regra tipo 'sempre chame a busca de conhecimento antes de responder', isso e redundante e pode confundir o modelo.",
  "- Formato WhatsApp: mensagens curtas, sem markdown (sem **negrito**, sem headers #, sem travessao —), no maximo 1 emoji por mensagem quando fizer sentido. Nunca proponha um `suggested_value` com formatacao markdown pesada ou listas numeradas longas destinadas ao cliente final.",
  "- Nunca exponha terminologia interna ao cliente (ex: 'nossa base de dados', 'de acordo com o sistema', 'nossa documentacao'). O cliente nao deve saber que existe um sistema, base ou pipeline por tras — fale como um atendente humano falaria.",
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
      const isVerbatimMessage =
        segment.tag === "greeting" || segment.tag === "fallback";
      return [
        `### tag: ${segment.tag}`,
        `label: ${source.label}`,
        `advisory: ${advisory}`,
        ...(isVerbatimMessage
          ? [
              "ATENCAO: esta secao e uma MENSAGEM LITERAL enviada ao cliente (nao uma instrucao). O sistema ja envolve este texto automaticamente com uma instrucao de uso obrigatorio ao compilar o prompt final — NUNCA inclua essa instrucao (nem qualquer variante de 'OBRIGATORIO', 'use EXATAMENTE este texto', aspas envolvendo tudo, etc.) no suggested_value. suggested_value deve ser APENAS o texto da mensagem em si.",
            ]
          : []),
        "conteudo_atual:",
        segment.evaluatorContent ?? segment.content,
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
      let suggestedValue =
        isAdvisory || rawValue.length === 0 ? null : rawValue;

      const title = String(raw.title ?? "Sugestao").trim() || "Sugestao";
      let rationale = String(raw.rationale ?? "").trim();
      let severity = normalizeSeverity(raw.severity);
      const currentContent = segment.evaluatorContent ?? segment.content;

      // Defense-in-depth: never let a verbatim-message suggestion apply the
      // mandatory-use instruction wrapper into the raw field (see
      // looksLikeMetaInstructionWrapper doc comment) — degrade to advisory
      // instead of risking a corrupted, self-nesting field value.
      if (
        suggestedValue &&
        VERBATIM_MESSAGE_TAGS.has(sectionTag) &&
        looksLikeMetaInstructionWrapper(suggestedValue)
      ) {
        console.warn(
          `[prompt-evaluator] Blocked suggestion for "${sectionTag}": suggested_value looked like the compiled instruction wrapper instead of the plain message.`,
        );
        rationale = rationale
          ? `${rationale} (Sugestão de texto bloqueada automaticamente — a IA incluiu uma instrução de sistema em vez da mensagem pura. Edite manualmente.)`
          : "Sugestão de texto bloqueada automaticamente — a IA incluiu uma instrução de sistema em vez da mensagem pura. Edite manualmente.";
        suggestedValue = null;
      }

      // Defense-in-depth: flag (never block) when a suggestion silently
      // drops a tool name or filename that was load-bearing in the current
      // content — likely an over-eager "simplification".
      if (suggestedValue) {
        const dropped = findDroppedConcreteReferences(
          currentContent,
          suggestedValue,
        );
        if (dropped.length > 0) {
          severity = "high";
          rationale = `${rationale} ⚠️ Esta sugestão remove referência(s) que pode(m) ser essencial(is): ${dropped.join(", ")}. Confira antes de aplicar.`.trim();
        }
      }

      // Defense-in-depth: flag (never block) when a rule/escalation section
      // gains NEW deflection/fallback language — the exact pattern that made
      // an agent stop calling buscar_documento and defer to "a equipe vai
      // te passar depois" instead.
      if (
        suggestedValue &&
        RULE_FIELD_TAGS.has(sectionTag) &&
        introducesNewFallbackEscape(currentContent, suggestedValue)
      ) {
        severity = "high";
        rationale = `${rationale} ⚠️ Esta sugestão adiciona uma nova regra de fallback/desvio — teste no QA antes de confiar, isso pode fazer o agente preferir desviar a tentar a ação/tool de fato.`.trim();
      }

      return {
        id: randomUUID(),
        sectionTag,
        sectionLabel: source.label,
        title,
        severity,
        rationale,
        currentExcerpt: currentContent,
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

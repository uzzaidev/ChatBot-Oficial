/**
 * Prompt Builder - Converts structured agent config into system prompts
 *
 * This module takes the user-friendly form fields from the agents table
 * and compiles them into a complete system prompt for the AI model.
 */

import type { Agent } from "./types";

// ============================================
// TONE & STYLE MAPPINGS
// ============================================

const TONE_DESCRIPTIONS: Record<string, string> = {
  formal:
    "Mantenha um tom formal e respeitoso em todas as interações. Use linguagem técnica quando apropriado.",
  friendly:
    "Seja amigável e acolhedor. Use uma linguagem calorosa e acessível para criar conexão.",
  professional:
    "Mantenha um tom profissional mas acessível. Seja confiável e prestativo.",
  casual:
    "Seja casual e descontraído. Use uma linguagem informal e relaxada.",
};

const STYLE_DESCRIPTIONS: Record<string, string> = {
  helpful:
    "Seja proativo em oferecer soluções e sugestões. Antecipe necessidades quando possível.",
  direct:
    "Seja direto e objetivo nas respostas. Vá direto ao ponto sem rodeios.",
  educational:
    "Explique conceitos de forma didática. Ajude o cliente a entender o contexto.",
  consultative:
    "Faça perguntas para entender melhor a necessidade antes de propor soluções.",
};

const LENGTH_INSTRUCTIONS: Record<string, string> = {
  short: "Mantenha respostas curtas e concisas (1-2 frases quando possível).",
  medium:
    "Use respostas de tamanho moderado (3-5 frases), balanceando clareza e concisão.",
  long: "Pode dar respostas detalhadas quando necessário para explicar completamente.",
};

// ============================================
// PROMPT COMPILATION FUNCTIONS
// ============================================

/**
 * Compiles the structured agent config into a system prompt
 */
export const compileSystemPrompt = (agent: Agent): string => {
  const sections: string[] = [];

  // === IDENTITY SECTION ===
  const identityParts: string[] = [`Você é ${agent.name}.`];

  if (agent.role_description) {
    identityParts.push(agent.role_description);
  }

  sections.push(`## Identidade\n${identityParts.join("\n")}`);

  // === GOAL SECTION ===
  if (agent.primary_goal) {
    sections.push(`## Objetivo Principal\n${agent.primary_goal}`);
  }

  // === COMMUNICATION STYLE SECTION ===
  const styleParts: string[] = [];

  if (agent.response_tone && TONE_DESCRIPTIONS[agent.response_tone]) {
    styleParts.push(`- ${TONE_DESCRIPTIONS[agent.response_tone]}`);
  }

  if (agent.response_style && STYLE_DESCRIPTIONS[agent.response_style]) {
    styleParts.push(`- ${STYLE_DESCRIPTIONS[agent.response_style]}`);
  }

  if (
    agent.max_response_length &&
    LENGTH_INSTRUCTIONS[agent.max_response_length]
  ) {
    styleParts.push(`- ${LENGTH_INSTRUCTIONS[agent.max_response_length]}`);
  }

  // Emoji rule
  if (agent.use_emojis) {
    styleParts.push("- Você pode usar emojis com moderação para tornar a comunicação mais expressiva.");
  } else {
    styleParts.push("- NÃO use emojis nas respostas. Mantenha comunicação textual.");
  }

  // Language
  if (agent.language && agent.language !== "pt-BR") {
    styleParts.push(`- Idioma preferido: ${agent.language}`);
  }

  if (styleParts.length > 0) {
    sections.push(`## Estilo de Comunicação\n${styleParts.join("\n")}`);
  }

  // === RULES SECTION ===
  const rules: string[] = [];

  // Greeting message
  if (agent.greeting_message) {
    rules.push(
      `Ao iniciar uma conversa, use esta saudação: "${agent.greeting_message}"`
    );
  }

  // Fallback message
  if (agent.fallback_message) {
    rules.push(
      `Se não conseguir entender a mensagem, responda: "${agent.fallback_message}"`
    );
  }

  // Forbidden topics
  if (agent.forbidden_topics && agent.forbidden_topics.length > 0) {
    rules.push(
      `NUNCA fale sobre os seguintes tópicos: ${agent.forbidden_topics.join(", ")}`
    );
  }

  // Always mention
  if (agent.always_mention && agent.always_mention.length > 0) {
    rules.push(
      `Quando apropriado, mencione: ${agent.always_mention.join(", ")}`
    );
  }

  if (rules.length > 0) {
    sections.push(`## Regras de Comportamento\n${rules.map((r) => `- ${r}`).join("\n")}`);
  }

  // === TOOLS SECTION ===
  const tools: string[] = [];

  if (agent.enable_human_handoff) {
    tools.push(
      "**transferir_atendimento**: Use SOMENTE quando o cliente EXPLICITAMENTE solicitar falar com um humano. Não ofereça proativamente."
    );
  }

  if (agent.enable_document_search) {
    tools.push(
      "**buscar_documento**: Use quando o cliente solicitar documentos, catálogos, manuais ou imagens específicas."
    );
  }

  if (agent.enable_audio_response) {
    tools.push(
      "**enviar_resposta_em_audio**: Use quando for apropriado enviar a resposta como mensagem de voz."
    );
  }

  if (tools.length > 0) {
    sections.push(`## Ferramentas Disponíveis\n${tools.map((t) => `- ${t}`).join("\n")}`);
  }

  // === RAG SECTION ===
  if (agent.enable_rag) {
    sections.push(
      `## Base de Conhecimento\nVocê tem acesso a uma base de conhecimento com documentos relevantes. Use as informações fornecidas no contexto para enriquecer suas respostas.`
    );
  }

  return sections.join("\n\n");
};

/**
 * Compiles the formatter prompt based on agent style settings
 */
export const compileFormatterPrompt = (agent: Agent): string => {
  const rules: string[] = [];

  // Language
  rules.push(`- Idioma: ${agent.language || "pt-BR"} (Português Brasileiro)`);

  // Response length
  const lengthMap: Record<string, string> = {
    short: "1-2 frases, muito conciso",
    medium: "3-5 frases, balanceado",
    long: "detalhado quando necessário",
  };
  rules.push(
    `- Tamanho: ${lengthMap[agent.max_response_length || "medium"] || lengthMap.medium}`
  );

  // Emojis
  rules.push(`- Emojis: ${agent.use_emojis ? "permitidos com moderação" : "não usar"}`);

  // Tone
  const toneMap: Record<string, string> = {
    formal: "formal e respeitoso",
    friendly: "amigável e acolhedor",
    professional: "profissional e acessível",
    casual: "casual e descontraído",
  };
  rules.push(`- Tom: ${toneMap[agent.response_tone || "professional"] || toneMap.professional}`);

  return `Formate a resposta de acordo com as seguintes regras:\n${rules.join("\n")}`;
};

/**
 * Generates a preview of the compiled prompt for display in the UI
 */
export const getPromptPreview = (
  agent: Agent
): { systemPrompt: string; formatterPrompt: string; totalChars: number } => {
  const systemPrompt = compileSystemPrompt(agent);
  const formatterPrompt = compileFormatterPrompt(agent);

  return {
    systemPrompt,
    formatterPrompt,
    totalChars: systemPrompt.length + formatterPrompt.length,
  };
};

/**
 * Validates agent configuration before compilation
 */
export const validateAgentConfig = (
  agent: Partial<Agent>
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!agent.name || agent.name.trim().length === 0) {
    errors.push("Nome do agente é obrigatório");
  }

  if (agent.name && agent.name.length > 100) {
    errors.push("Nome do agente deve ter no máximo 100 caracteres");
  }

  if (agent.temperature !== undefined) {
    if (agent.temperature < 0 || agent.temperature > 2) {
      errors.push("Temperatura deve estar entre 0 e 2");
    }
  }

  if (agent.max_tokens !== undefined) {
    if (agent.max_tokens < 100 || agent.max_tokens > 8000) {
      errors.push("Máximo de tokens deve estar entre 100 e 8000");
    }
  }

  if (agent.rag_threshold !== undefined) {
    if (agent.rag_threshold < 0 || agent.rag_threshold > 1) {
      errors.push("Limiar RAG deve estar entre 0 e 1");
    }
  }

  if (agent.rag_max_results !== undefined) {
    if (agent.rag_max_results < 1 || agent.rag_max_results > 20) {
      errors.push("Máximo de resultados RAG deve estar entre 1 e 20");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Creates a slug from the agent name
 */
export const createAgentSlug = (name: string): string => {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length
};

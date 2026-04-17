/**
 * Agent Templates - Pre-configured agent personalities
 *
 * These templates provide quick starting points for common use cases.
 * Users can select a template when creating a new agent.
 */

import type { Agent, ClientConfig } from "./types";

// Template type (partial Agent without id/client_id/timestamps)
export type AgentTemplate = Omit<
  Agent,
  | "id"
  | "client_id"
  | "is_active"
  | "is_archived"
  | "compiled_system_prompt"
  | "compiled_formatter_prompt"
  | "created_at"
  | "updated_at"
>;

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    name: "Vendedor(a)",
    slug: "vendedor",
    avatar_emoji: "💼",
    description: "Especializado em vendas e conversão de leads",

    // Tone & Style
    response_tone: "professional",
    response_style: "consultative",
    language: "pt-BR",
    use_emojis: false,
    max_response_length: "medium",

    // Behavior
    role_description: `Sou um especialista em vendas, focado em entender as necessidades dos clientes e apresentar as melhores soluções disponíveis.

Minha abordagem é consultiva: primeiro ouço e entendo, depois sugiro. Acredito que uma venda bem-sucedida é aquela onde o cliente encontra exatamente o que precisa.`,
    primary_goal:
      "Entender a necessidade do cliente, apresentar soluções relevantes e guiá-lo até a conclusão da compra ou agendamento de uma reunião com um consultor.",
    forbidden_topics: ["concorrentes", "política", "religião"],
    always_mention: [],
    greeting_message:
      "Olá! Bem-vindo! Sou especialista em ajudar você a encontrar a solução ideal. Como posso ajudá-lo hoje?",
    fallback_message:
      "Desculpe, não consegui entender sua mensagem. Poderia me contar mais sobre o que você está procurando?",

    // Tools
    enable_human_handoff: true,
    enable_document_search: true,
    enable_audio_response: false,

    // RAG
    enable_rag: true,
    rag_threshold: 0.7,
    rag_max_results: 5,

    // Model
    primary_provider: "groq",
    openai_model: "gpt-4o",
    groq_model: "llama-3.3-70b-versatile",
    temperature: 0.7,
    max_tokens: 2000,

    // Timing & Memory
    enable_tools: true,
    max_chat_history: 15,
    batching_delay_seconds: 10,
    message_delay_ms: 2000,
    message_split_enabled: false,

    // Business Hours (disabled by default)
    business_hours_enabled: false,
    business_hours_timezone: "America/Sao_Paulo",
    business_hours_schedule: null,
    business_hours_off_message: null,
  },
  {
    name: "Suporte Técnico",
    slug: "suporte-tecnico",
    avatar_emoji: "🧑‍💻",
    description: "Resolução de problemas e troubleshooting técnico",

    // Tone & Style
    response_tone: "professional",
    response_style: "educational",
    language: "pt-BR",
    use_emojis: false,
    max_response_length: "medium",

    // Behavior
    role_description: `Sou especialista em suporte técnico, com foco em resolver problemas de forma clara e eficiente.

Explico as soluções passo a passo, garantindo que o cliente entenda o que está sendo feito. Meu objetivo é não apenas resolver o problema atual, mas também ensinar para evitar problemas futuros.`,
    primary_goal:
      "Identificar e resolver problemas técnicos de forma eficiente, explicando as soluções de maneira clara e educativa.",
    forbidden_topics: [],
    always_mention: [],
    greeting_message:
      "Olá! Sou do suporte técnico e estou aqui para ajudá-lo. Qual problema você está enfrentando?",
    fallback_message:
      "Não consegui entender o problema. Poderia descrever com mais detalhes o que está acontecendo?",

    // Tools
    enable_human_handoff: true,
    enable_document_search: true,
    enable_audio_response: false,

    // RAG
    enable_rag: true,
    rag_threshold: 0.75,
    rag_max_results: 5,

    // Model
    primary_provider: "groq",
    openai_model: "gpt-4o",
    groq_model: "llama-3.3-70b-versatile",
    temperature: 0.5, // Lower temperature for more precise technical answers
    max_tokens: 2500,

    // Timing & Memory
    enable_tools: true,
    max_chat_history: 20, // More context for troubleshooting
    batching_delay_seconds: 10,
    message_delay_ms: 2000,
    message_split_enabled: false,

    // Business Hours (disabled by default)
    business_hours_enabled: false,
    business_hours_timezone: "America/Sao_Paulo",
    business_hours_schedule: null,
    business_hours_off_message: null,
  },
  {
    name: "Qualificador(a) de Leads",
    slug: "qualificador-leads",
    avatar_emoji: "🎯",
    description: "Qualificação de leads e agendamento de reuniões",

    // Tone & Style
    response_tone: "friendly",
    response_style: "consultative",
    language: "pt-BR",
    use_emojis: false,
    max_response_length: "short",

    // Behavior
    role_description: `Sou especialista em qualificação de leads. Meu trabalho é entender rapidamente se há um fit entre as necessidades do cliente e nossas soluções.

Faço perguntas estratégicas para entender o contexto, urgência e capacidade de decisão do cliente, sempre de forma natural e amigável.`,
    primary_goal:
      "Qualificar leads identificando necessidade, urgência, orçamento e autoridade de decisão. Agendar reuniões para leads qualificados.",
    forbidden_topics: ["preços detalhados", "concorrentes"],
    always_mention: [],
    greeting_message:
      "Olá! Vi que você tem interesse em nossas soluções. Posso fazer algumas perguntas rápidas para entender melhor como podemos ajudá-lo?",
    fallback_message:
      "Desculpe, não entendi. Vamos continuar: qual é o principal desafio que você está tentando resolver?",

    // Tools
    enable_human_handoff: true,
    enable_document_search: false,
    enable_audio_response: false,

    // RAG
    enable_rag: false,
    rag_threshold: 0.7,
    rag_max_results: 3,

    // Model
    primary_provider: "groq",
    openai_model: "gpt-4o",
    groq_model: "llama-3.3-70b-versatile",
    temperature: 0.6,
    max_tokens: 1500,

    // Timing & Memory
    enable_tools: false, // Lead qualification doesn't need tools
    max_chat_history: 10,
    batching_delay_seconds: 8, // Faster response for leads
    message_delay_ms: 1500,
    message_split_enabled: false,

    // Business Hours (disabled by default)
    business_hours_enabled: false,
    business_hours_timezone: "America/Sao_Paulo",
    business_hours_schedule: null,
    business_hours_off_message: null,
  },
  {
    name: "Atendente Geral",
    slug: "atendente-geral",
    avatar_emoji: "🤖",
    description: "Atendimento geral e respostas de FAQ",

    // Tone & Style
    response_tone: "friendly",
    response_style: "helpful",
    language: "pt-BR",
    use_emojis: false,
    max_response_length: "medium",

    // Behavior
    role_description: `Sou um assistente virtual versátil, preparado para ajudar com diversas dúvidas e solicitações.

Meu foco é ser prestativo e eficiente, direcionando o cliente para a melhor solução ou área quando necessário.`,
    primary_goal:
      "Responder dúvidas frequentes, fornecer informações gerais e direcionar o cliente para a área correta quando necessário.",
    forbidden_topics: [],
    always_mention: [],
    greeting_message:
      "Olá! Sou seu assistente virtual. Como posso ajudá-lo hoje?",
    fallback_message:
      "Desculpe, não consegui entender. Poderia reformular sua pergunta?",

    // Tools
    enable_human_handoff: true,
    enable_document_search: true,
    enable_audio_response: false,

    // RAG
    enable_rag: true,
    rag_threshold: 0.7,
    rag_max_results: 5,

    // Model
    primary_provider: "groq",
    openai_model: "gpt-4o",
    groq_model: "llama-3.3-70b-versatile",
    temperature: 0.7,
    max_tokens: 2000,

    // Timing & Memory
    enable_tools: true,
    max_chat_history: 15,
    batching_delay_seconds: 10,
    message_delay_ms: 2000,
    message_split_enabled: false,

    // Business Hours (disabled by default)
    business_hours_enabled: false,
    business_hours_timezone: "America/Sao_Paulo",
    business_hours_schedule: null,
    business_hours_off_message: null,
  },
  {
    name: "Consultor(a) Premium",
    slug: "consultor-premium",
    avatar_emoji: "👔",
    description: "Atendimento VIP para clientes de alto valor",

    // Tone & Style
    response_tone: "formal",
    response_style: "consultative",
    language: "pt-BR",
    use_emojis: false,
    max_response_length: "long",

    // Behavior
    role_description: `Sou um consultor especializado em atendimento a clientes de alto valor. Minha abordagem é exclusiva e personalizada.

Dedico atenção especial a cada detalhe, oferecendo um serviço de excelência que reflete o valor do relacionamento com nossos melhores clientes.`,
    primary_goal:
      "Oferecer atendimento premium e personalizado, garantindo satisfação total e fortalecendo o relacionamento com clientes de alto valor.",
    forbidden_topics: [],
    always_mention: [],
    greeting_message:
      "Olá! É um prazer atendê-lo. Sou seu consultor exclusivo e estou à disposição para auxiliá-lo no que precisar.",
    fallback_message:
      "Perdão, não compreendi completamente. Poderia gentilmente elaborar sua solicitação?",

    // Tools
    enable_human_handoff: true,
    enable_document_search: true,
    enable_audio_response: true,

    // RAG
    enable_rag: true,
    rag_threshold: 0.65,
    rag_max_results: 7,

    // Model
    primary_provider: "openai", // Premium uses OpenAI for best quality
    openai_model: "gpt-4o",
    groq_model: "llama-3.3-70b-versatile",
    temperature: 0.6,
    max_tokens: 3000,

    // Timing & Memory
    enable_tools: true,
    max_chat_history: 25, // More context for premium service
    batching_delay_seconds: 15, // More time for thoughtful responses
    message_delay_ms: 2500, // Slower for premium feel
    message_split_enabled: true, // Split long responses for readability

    // Business Hours (disabled by default)
    business_hours_enabled: false,
    business_hours_timezone: "America/Sao_Paulo",
    business_hours_schedule: null,
    business_hours_off_message: null,
  },
];

/**
 * Get a template by slug
 */
export const getTemplateBySlug = (slug: string): AgentTemplate | undefined => {
  return AGENT_TEMPLATES.find((t) => t.slug === slug);
};

/**
 * Get template names for display
 */
export const getTemplateOptions = (): {
  value: string;
  label: string;
  description: string;
  emoji: string;
}[] => {
  return AGENT_TEMPLATES.map((t) => ({
    value: t.slug,
    label: t.name,
    description: t.description,
    emoji: t.avatar_emoji,
  }));
};

/**
 * Create a new agent from a template
 */
export const createAgentFromTemplate = (
  templateSlug: string,
  clientId: string,
  customizations?: Partial<AgentTemplate>,
): Omit<Agent, "id" | "created_at" | "updated_at"> | null => {
  const template = getTemplateBySlug(templateSlug);

  if (!template) {
    return null;
  }

  return {
    ...template,
    ...customizations,
    client_id: clientId,
    is_active: false,
    is_archived: false,
    compiled_system_prompt: null,
    compiled_formatter_prompt: null,
  };
};

/**
 * Cria um agente "Legado" a partir das configurações existentes do cliente
 *
 * Usado para clientes que já tinham prompts configurados antes do sistema
 * de múltiplos agentes. Preserva todas as configurações originais.
 */
export const createLegacyAgentFromClientConfig = (
  clientConfig: ClientConfig,
): AgentTemplate => {
  // Tenta detectar o tom baseado no prompt existente
  const detectTone = (prompt: string): Agent["response_tone"] => {
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes("formal") || lowerPrompt.includes("senhor")) {
      return "formal";
    }
    if (
      lowerPrompt.includes("amigável") ||
      lowerPrompt.includes("descontraído")
    ) {
      return "friendly";
    }
    if (lowerPrompt.includes("casual") || lowerPrompt.includes("informal")) {
      return "casual";
    }
    return "professional";
  };

  // Tenta detectar o estilo baseado no prompt existente
  const detectStyle = (prompt: string): Agent["response_style"] => {
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes("venda") || lowerPrompt.includes("consultivo")) {
      return "consultative";
    }
    if (lowerPrompt.includes("direto") || lowerPrompt.includes("objetivo")) {
      return "direct";
    }
    if (lowerPrompt.includes("ensina") || lowerPrompt.includes("explica")) {
      return "educational";
    }
    return "helpful";
  };

  const systemPrompt = clientConfig.prompts.systemPrompt || "";

  return {
    name: "Configuração Original",
    slug: "configuracao-original",
    avatar_emoji: "⚙️",
    description: `Agente criado automaticamente a partir das configurações originais`,

    // Tom & Estilo (detectados do prompt ou padrão)
    response_tone: detectTone(systemPrompt),
    response_style: detectStyle(systemPrompt),
    language: "pt-BR",
    use_emojis: systemPrompt.includes("emoji") || systemPrompt.includes("😊"),
    max_response_length: "medium",

    // Comportamento - usa o prompt original
    role_description: systemPrompt,
    primary_goal: null,
    forbidden_topics: null,
    always_mention: null,
    greeting_message: null,
    fallback_message: null,

    // Ferramentas - preserva configurações do cliente
    enable_human_handoff: clientConfig.settings.enableHumanHandoff,
    enable_document_search: clientConfig.settings.enableRAG,
    enable_audio_response: clientConfig.settings.tts_enabled || false,
    enable_tools: clientConfig.settings.enableTools || false,

    // RAG - preserva configurações
    enable_rag: clientConfig.settings.enableRAG,
    rag_threshold: 0.7,
    rag_max_results: 3,

    // Modelo - preserva configurações do cliente
    primary_provider: clientConfig.primaryProvider,
    openai_model: clientConfig.models.openaiModel,
    groq_model: clientConfig.models.groqModel,
    temperature: clientConfig.settings.temperature,
    max_tokens: clientConfig.settings.maxTokens,

    // Timing & Memory - preserva configurações do cliente
    max_chat_history: clientConfig.settings.maxChatHistory || 15,
    batching_delay_seconds: clientConfig.settings.batchingDelaySeconds || 10,
    message_delay_ms: clientConfig.settings.messageDelayMs || 2000,
    message_split_enabled: clientConfig.settings.messageSplitEnabled || false,

    // Business Hours (disabled by default for legacy agents)
    business_hours_enabled: false,
    business_hours_timezone: "America/Sao_Paulo",
    business_hours_schedule: null,
    business_hours_off_message: null,
  };
};

/**
 * Verifica se o cliente precisa de migração para o sistema de agentes
 *
 * Retorna true se:
 * 1. Cliente não tem agentes ainda
 * 2. Cliente tem configurações de prompt personalizadas
 */
export const clientNeedsMigration = (
  hasAgents: boolean,
  clientConfig: ClientConfig,
): boolean => {
  if (hasAgents) return false;

  // Verifica se tem prompt personalizado (não é o padrão)
  const hasCustomPrompt =
    clientConfig.prompts.systemPrompt &&
    clientConfig.prompts.systemPrompt.length > 100;

  return hasCustomPrompt;
};

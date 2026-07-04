// Limite confortavel de UX no WhatsApp. O limite tecnico do WhatsApp eh 4096,
// mas mensagens acima de ~400 chars ficam chatas de ler no celular. O prompt
// do modelo (WHATSAPP_FORMATTING_RULES em generateAIResponse.ts) ja pede ~280
// chars; este cap aqui eh defensa em profundidade quando o modelo passa do
// limite. Quando ultrapassa, splitIntoSentences quebra em sentencas.
const MAX_MESSAGE_LENGTH = 600;

// Chaves de argumentos de tools conhecidas — se um bloco JSON no texto contiver
// qualquer uma delas, é tool call vazada (modelo descreveu a chamada em texto
// em vez de usar o canal `tool_calls`). Modelos pequenos como gpt-5.4-nano
// reincidem nisso sob prompts longos.
const LEAKED_TOOL_ARG_KEYS = [
  "motivo",
  "texto_para_audio",
  "query",
  "document_type",
  "campo",
  "campos",
  "valor",
  "titulo",
  "data_hora_inicio",
  "data_hora_fim",
  "data_inicio",
  "data_fim",
  "event_id",
  "event_ids",
  "novo_titulo",
  "nova_data_hora_inicio",
  "nova_data_hora_fim",
  "tipo",
  "descricao",
  "email_participante",
];

// Frases inventadas que o modelo emite ao "narrar" a chamada de tool. A
// confirmação real de handoff/transferência vem de outro caminho de código,
// nunca do `content` da IA — então é seguro remover.
const LEAKED_TOOL_NARRATION_PATTERNS: RegExp[] = [
  /^\s*transferindo\s+para\s+atendimento\s+humano[.\s…]*$/i,
  /^\s*aguarde[,.\s]+vou\s+transferir.*$/i,
  /^\s*buscando\s+(o\s+)?documento[.\s…]*$/i,
  /^\s*registrando\s+seus\s+dados[.\s…]*$/i,
  /^\s*verificando\s+(a\s+)?agenda[.\s…]*$/i,
  /^\s*criando\s+(o\s+)?evento[.\s…]*$/i,
];

// Marcadores inequívocos de chain-of-thought em INGLÊS. O bot responde SEMPRE
// em pt-BR ao cliente; modelos de reasoning (gpt-5.x via Responses API) às vezes
// usam o canal de `message` como rascunho e vazam o raciocínio interno — que vem
// em inglês e SEMPRE depois da resposta válida (o modelo responde e "continua
// pensando" no mesmo item). Não é fraqueza de um modelo específico: é o modelo
// escrevendo a análise no canal de resposta. Como o SDK já separa o reasoning
// summary (canal `reasoning`), qualquer inglês meta-analítico aqui é vazamento.
// As frases abaixo foram escolhidas por serem praticamente impossíveis numa
// resposta real de WhatsApp em português — minimiza falso-positivo.
const LEAKED_REASONING_MARKERS: RegExp[] = [
  /\bThen user\b/i,
  /\bThe user\b/i,
  /\bLet'?s\s+(do|call|go|use|say|send|ask|clarify|check)\b/i,
  /\bWe\s+(can|could|should|need|must|didn'?t|can'?t|don'?t|won'?t)\b/i,
  /\bI\s+(should|need to|must|can|think)\b/i,
  /\b(maybe|perhaps)\s+(meaning|the|we|they|need|best|clarify|is)\b/i,
  /\bIt could be\b/i,
  /\bHowever,?\s/i,
  /\bSince they\b/i,
  /\bYet they\b/i,
  /\bbut the (system|developer|tool|assistant|user)\b/i,
  /\bthe (system|developer) (says|rules|say)\b/i,
  /\bdeveloper (says|rules)\b/i,
  /\brespond with (the )?mandated\b/i,
  /\bNeed (not|no JSON)\b/i,
  /\bnarrate (action|the)\b/i,
  /\bambiguous\b/i,
  /\buse (the )?tool\b/i,
  /\bdocumenttype\b/i,
];

/**
 * Trunca a mensagem no primeiro marcador de raciocínio em inglês vazado.
 * Mantém a resposta válida em pt-BR (que sempre vem antes) e descarta o CoT.
 * Se a mensagem inteira for vazamento (sem resposta válida antes), retorna "".
 */
const stripLeakedReasoning = (text: string): string => {
  let earliest = -1;
  for (const re of LEAKED_REASONING_MARKERS) {
    const m = re.exec(text);
    if (m && (earliest === -1 || m.index < earliest)) {
      earliest = m.index;
    }
  }

  if (earliest === -1) {
    return text;
  }

  // Recua até o fim da última frase/linha válida antes do marcador, para não
  // cortar no meio de uma sentença em português.
  const before = text.slice(0, earliest);
  const cut = Math.max(
    before.lastIndexOf("\n"),
    before.lastIndexOf("."),
    before.lastIndexOf("!"),
    before.lastIndexOf("?"),
  );
  const kept = (cut >= 0 ? before.slice(0, cut + 1) : "").trim();

  console.warn(
    `[formatResponse] Chain-of-thought em inglês vazado e removido ` +
      `(${text.length - kept.length} chars descartados).`,
  );

  return kept;
};

/**
 * Remove tool calls (function calls) do texto da IA.
 * Cobre três formatos:
 *   1. Legado: `<function=nome>{...}</function>`
 *   2. JSON cru contendo chaves de args de tools conhecidas
 *   3. Frases narrativas inventadas ("Transferindo para atendimento humano...")
 */
const removeToolCalls = (text: string): string => {
  // 1) Formato legado <function=...>{...}</function>
  let cleaned = text.replace(/<function=[^>]+>[\s\S]*?<\/function>/g, "");

  // 2) Blocos JSON brutos (uma ou múltiplas linhas) que contenham chaves de tools.
  //    Regex casa `{...}` não-aninhado; suficiente para a forma como o modelo
  //    vaza (objetos rasos com 1-3 chaves).
  cleaned = cleaned.replace(/\{[^{}]*\}/g, (match) => {
    const hasToolKey = LEAKED_TOOL_ARG_KEYS.some((key) =>
      new RegExp(`"${key}"\\s*:`).test(match),
    );
    return hasToolKey ? "" : match;
  });

  // 3) Frases narrativas inventadas — descarta linha a linha
  cleaned = cleaned
    .split("\n")
    .filter(
      (line) =>
        !LEAKED_TOOL_NARRATION_PATTERNS.some((pattern) => pattern.test(line)),
    )
    .join("\n");

  return cleaned.trim();
};

/**
 * Remove markdown comum que aparece cru no WhatsApp.
 * Exemplo: "### Titulo", "**negrito**", "__underline__" -> texto simples.
 * Inclui remoção de imagens/links Markdown que o WhatsApp não renderiza.
 */
const sanitizeMarkdownForWhatsApp = (text: string): string => {
  return (
    text
      // Remover imagens Markdown: ![alt](url) ou ![alt][ref] → vazio
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/!\[[^\]]*\]\[[^\]]*\]/g, "")
      // Remover definições de referência de link/imagem: [ref]: url → vazio
      .replace(/^\[[^\]]+\]:\s+\S.*$/gm, "")
      // Converter links Markdown: [texto](url) → texto
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      // Remover referências de link isoladas: [texto][ref] → texto
      .replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1")
      // Remover headers markdown no inicio da linha
      .replace(/^\s{0,3}#{1,6}\s+/gm, "")
      // Remover blocos de código markdown
      .replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, "").trim())
      // Remover inline code
      .replace(/`([^`]+)`/g, "$1")
      // Remover negrito/itálico markdown
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      // Limpar linhas que ficaram vazias após remoções
      .replace(/^\s*\n/gm, "")
      .trim()
  );
};

const splitIntoParagraphs = (text: string): string[] => {
  const paragraphs = text.split("\n\n").filter((p) => p.trim().length > 0);

  if (paragraphs.length >= 2) {
    return paragraphs;
  }

  const sentences = text.split(/(?<=[.!?])\s+/);
  if (sentences.length >= 2) {
    const midPoint = Math.floor(sentences.length / 2);
    return [
      sentences.slice(0, midPoint).join(" "),
      sentences.slice(midPoint).join(" "),
    ];
  }

  return [text];
};

// Quebra um trecho longo agrupando UNIDADES (frases ou palavras) ate o cap.
const packUnits = (units: string[], cap: number): string[] => {
  const chunks: string[] = [];
  let current = "";

  for (const unit of units) {
    const candidate = current ? `${current} ${unit}` : unit;
    if (candidate.length > cap) {
      if (current) {
        chunks.push(current.trim());
      }
      current = unit;
    } else {
      current = candidate;
    }
  }

  if (current) {
    chunks.push(current.trim());
  }

  return chunks;
};

const enforceMaxLength = (messages: string[]): string[] => {
  return messages.flatMap((msg) => {
    if (msg.length <= MAX_MESSAGE_LENGTH) {
      return [msg];
    }

    // 1) Quebra por sentencas e tenta agrupar em mensagens <= cap.
    //    Preserva limite de frase — muito melhor pra leitura no WhatsApp do
    //    que cortes no meio da frase.
    const sentences = msg.split(/(?<=[.!?])\s+/).filter((s) => s.length > 0);
    if (sentences.length > 1) {
      const sentencePacked = packUnits(sentences, MAX_MESSAGE_LENGTH);
      // Se alguma sentenca isolada ainda for > cap, cai pra word-split nela.
      return sentencePacked.flatMap((chunk) =>
        chunk.length <= MAX_MESSAGE_LENGTH
          ? [chunk]
          : packUnits(chunk.split(" "), MAX_MESSAGE_LENGTH),
      );
    }

    // 2) Sentenca unica monstruosa — fallback pra palavras.
    return packUnits(msg.split(" "), MAX_MESSAGE_LENGTH);
  });
};

export const formatResponse = (aiResponseContent: string): string[] => {
  try {
    if (!aiResponseContent || aiResponseContent.trim().length === 0) {
      return [];
    }

    // 1) Remove chain-of-thought em inglês vazado para o canal de resposta
    //    (modelos de reasoning usando o `message` item como rascunho).
    const contentWithoutReasoning = stripLeakedReasoning(aiResponseContent);

    // 2) Remove tool calls antes de formatar
    const contentWithoutToolCalls = removeToolCalls(contentWithoutReasoning);
    const cleanedContent = sanitizeMarkdownForWhatsApp(contentWithoutToolCalls);

    if (!cleanedContent || cleanedContent.trim().length === 0) {
      return [];
    }

    const initialSplit = cleanedContent
      .split("\n\n")
      .filter((msg) => msg.trim().length > 0);

    let messages: string[] = [];

    if (initialSplit.length >= 2) {
      messages = initialSplit;
    } else {
      messages = splitIntoParagraphs(cleanedContent);
    }

    const finalMessages = enforceMaxLength(messages);

    // Remover mensagens duplicadas consecutivas (mesmo texto normalizado)
    const deduped = finalMessages.filter((msg, idx) => {
      if (idx === 0) return true;
      return (
        msg.trim().toLowerCase() !== finalMessages[idx - 1].trim().toLowerCase()
      );
    });

    return deduped;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to format response: ${errorMessage}`);
  }
};

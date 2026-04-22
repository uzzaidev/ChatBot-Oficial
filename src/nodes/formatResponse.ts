const MAX_MESSAGE_LENGTH = 4096;

/**
 * Remove tool calls (function calls) do texto da IA
 * Exemplo: "Olá! <function=foo>{...}</function>" → "Olá!"
 */
const removeToolCalls = (text: string): string => {
  // Remove padrão: <function=nome_funcao>{...}</function>
  return text.replace(/<function=[^>]+>[\s\S]*?<\/function>/g, "").trim();
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

const enforceMaxLength = (messages: string[]): string[] => {
  return messages.flatMap((msg) => {
    if (msg.length <= MAX_MESSAGE_LENGTH) {
      return [msg];
    }

    const chunks: string[] = [];
    let currentChunk = "";

    const words = msg.split(" ");

    for (const word of words) {
      if ((currentChunk + " " + word).length > MAX_MESSAGE_LENGTH) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = word;
      } else {
        currentChunk = currentChunk ? `${currentChunk} ${word}` : word;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  });
};

export const formatResponse = (aiResponseContent: string): string[] => {
  try {
    if (!aiResponseContent || aiResponseContent.trim().length === 0) {
      return [];
    }

    // Remove tool calls antes de formatar
    const contentWithoutToolCalls = removeToolCalls(aiResponseContent);
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

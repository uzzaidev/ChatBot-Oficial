/**
 * Node: Handle Document Search Tool Call
 *
 * Processa tool call `buscar_documento` acionada pelo agente principal.
 *
 * Fluxo:
 * 1. Parse arguments da tool call (query, document_type)
 * 2. Busca documentos na base de conhecimento (searchDocumentInKnowledge)
 * 3. Envia documentos encontrados via WhatsApp:
 *    - Imagens → sendImageMessage
 *    - PDFs/Docs → sendDocumentMessage
 * 4. Retorna mensagem de confirmação
 *
 * Features:
 * - Suporta envio de múltiplos documentos (até 3)
 * - Delay de 1s entre envios (evita rate limit)
 * - Detecta tipo de mídia automaticamente (MIME type)
 * - Retorna mensagem descritiva para o agente
 */

import { sendDocumentMessage, sendImageMessage } from "@/lib/meta";
import { createServiceRoleClient } from "@/lib/supabase";
import type { ClientConfig, StoredMediaMetadata } from "@/lib/types";
import { ErrorDetails, saveChatMessage } from "@/nodes/saveChatMessage";
import { searchDocumentInKnowledge } from "./searchDocumentInKnowledge";

export interface HandleDocumentSearchInput {
  /** Tool call object do AI response */
  toolCall: {
    id: string;
    function: {
      name: string;
      arguments: string; // JSON string
    };
  };

  /** Número do telefone do destinatário */
  phone: string;

  /** ID do cliente (multi-tenant) */
  clientId: string;

  /** Config do cliente (para API keys) */
  config: ClientConfig;

  /** Mensagem original do usuário (para validar intenção explícita) */
  userMessage?: string;

  /** Metadados já conhecidos do contato (para stage-gate comercial) */
  contactMetadata?: Record<string, unknown> | null;
}

export interface HandleDocumentSearchOutput {
  /** Sucesso ou falha */
  success: boolean;

  /** Quantidade de arquivos de texto (.txt/.md) encontrados (não enviados como anexo) */
  textFilesFound?: number;

  /** Mensagem para retornar ao agente (será incluída na conversa) */
  message: string;

  /** Número de documentos encontrados */
  documentsFound?: number;

  /** Número de documentos enviados com sucesso */
  documentsSent?: number;

  /** Lista de arquivos enviados (para log) */
  filesSent?: string[];

  /** Metadados dos arquivos enviados (para renderizar no frontend) */
  filesMetadata?: Array<{
    url: string;
    filename: string;
    mimeType: string;
    size: number;
  }>;

  /** Metadados de debug da busca */
  searchMetadata?: {
    totalDocumentsInBase: number;
    chunksFound: number;
    uniqueDocumentsFound: number;
    threshold: number;
    documentTypeFilter?: string;
  };

  /** Decisão de gate do envio de documento */
  documentGateDecision?: "allowed" | "blocked";

  /** Motivo da decisão de gate */
  documentGateReason?:
    | "allowed"
    | "no_explicit_intent"
    | "cooldown_duplicate"
    | "wrong_stage";

  /** Documento selecionado para envio (quando houver) */
  selectedDocument?: string;

  /** Quantidade de documentos suprimidos por gate */
  suppressedDocumentsCount?: number;

  /** Quando true, o flow deve usar `message` como resposta final ao usuário */
  useMessageAsReply?: boolean;
}

type DocumentIntent = "horarios" | "planos" | "planos_online" | "generic";

const DOCUMENT_COOLDOWN_MS = 90_000;

const EXPLICIT_DOCUMENT_TERMS = [
  "me envia",
  "envia",
  "enviar",
  "manda",
  "mandar",
  "arquivo",
  "anexo",
  "anexos",
  "documento",
  "imagem",
  "foto",
  "fotos",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "link",
  "links",
  "url",
  "material",
  "pdf",
  "tabela",
  "grade",
  "catalogo",
  "catálogo",
  "apresentacao",
  "apresentação",
  "apresentacoes",
  "apresentações",
  "deck",
  "slides",
  "slide",
  "pdf",
];

const DOCUMENT_RETRY_TERMS = [
  "nao enviou",
  "não enviou",
  "nao mandou",
  "não mandou",
  "nao chegou",
  "não chegou",
  "faltou",
  "cade",
  "cadê",
  "manda de novo",
  "envia de novo",
  "reenvia",
  "reenviar",
];

const detectDocumentIntent = (query: string): DocumentIntent => {
  const q = query.toLowerCase();

  if (
    q.includes("horario") ||
    q.includes("grade") ||
    q.includes("aula") ||
    q.includes("manha") ||
    q.includes("tarde") ||
    q.includes("noite")
  ) {
    return "horarios";
  }

  if (
    (q.includes("online") || q.includes("distancia")) &&
    (q.includes("plano") || q.includes("valor") || q.includes("preco"))
  ) {
    return "planos_online";
  }

  if (
    q.includes("plano") ||
    q.includes("valor") ||
    q.includes("preco") ||
    q.includes("mensal")
  ) {
    return "planos";
  }

  if (
    q.includes("apresent") ||
    q.includes("deck") ||
    q.includes("slide") ||
    q.includes("pdf")
  ) {
    return "generic";
  }

  return "generic";
};

const hasExplicitDocumentIntent = (text: string): boolean => {
  const normalized = text.toLowerCase();
  return (
    EXPLICIT_DOCUMENT_TERMS.some((term) => normalized.includes(term)) ||
    DOCUMENT_RETRY_TERMS.some((term) => normalized.includes(term))
  );
};

const normalizeSearchText = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const getFilenameSearchTokens = (query: string): string[] =>
  normalizeSearchText(query)
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 3);

const isImageDocument = (doc: { originalMimeType?: string | null }): boolean =>
  typeof doc.originalMimeType === "string" &&
  doc.originalMimeType.toLowerCase().startsWith("image/");

const findImageDocumentsByFilename = async (input: {
  supabaseAny: any;
  clientId: string;
  query: string;
  maxResults: number;
}) => {
  const tokens = getFilenameSearchTokens(input.query);
  if (tokens.length === 0) {
    return [];
  }

  const ilikeConditions = tokens
    .map((token) => `metadata->>filename.ilike.%${token}%`)
    .join(",");

  const { data } = await input.supabaseAny
    .from("documents")
    .select(
      "id, content, metadata, original_file_url, original_file_path, original_mime_type, original_file_size",
    )
    .eq("client_id", input.clientId)
    .not("original_file_url", "is", null)
    .ilike("original_mime_type", "image/%")
    .or(ilikeConditions)
    .limit(input.maxResults);

  return (data ?? [])
    .filter((doc: any) => doc.metadata?.filename && doc.original_file_url)
    .map((doc: any) => ({
      id: doc.id,
      filename: doc.metadata.filename,
      documentType: doc.metadata?.documentType || "image",
      originalFileUrl: doc.original_file_url,
      originalFilePath: doc.original_file_path,
      originalMimeType: doc.original_mime_type,
      originalFileSize: doc.original_file_size,
      similarity: 0.49,
      preview: String(doc.content || "").substring(0, 200),
    }));
};

const inferIntentFromFilename = (filename: string): DocumentIntent => {
  const lower = filename.toLowerCase();
  if (lower.includes("horario")) return "horarios";
  if (lower.includes("online") && lower.includes("plano"))
    return "planos_online";
  if (lower.includes("plano")) return "planos";
  return "generic";
};

const scoreDocumentByIntent = (
  filename: string,
  intent: DocumentIntent,
): number => {
  const name = filename.toLowerCase();
  let score = 0;

  if (intent === "horarios" && name.includes("horario")) score += 100;
  if (intent === "planos" && name.includes("plano")) score += 100;
  if (intent === "planos_online" && name.includes("online")) score += 120;
  if (intent === "planos_online" && name.includes("plano")) score += 60;
  if (
    name.includes("apresent") ||
    name.includes("deck") ||
    name.includes("slide")
  ) {
    score += 40;
  }
  if (name.endsWith(".pdf")) {
    score += 20;
  }

  return score;
};

/**
 * Processa tool call buscar_documento
 *
 * @param input - Dados da tool call + contexto
 * @returns Resultado da execução
 *
 * @example
 * ```typescript
 * const result = await handleDocumentSearchToolCall({
 *   toolCall: {
 *     id: 'call_123',
 *     function: {
 *       name: 'buscar_documento',
 *       arguments: '{"query":"catálogo","document_type":"catalog"}'
 *     }
 *   },
 *   phone: '5511999999999',
 *   clientId: 'client-123',
 *   config: clientConfig
 * })
 *
 * // result.message → "" (documento enviado sem texto adicional)
 * // result.documentsSent → 1
 * // result.filesMetadata → metadados do arquivo para renderização no frontend
 * ```
 */
export const handleDocumentSearchToolCall = async (
  input: HandleDocumentSearchInput,
): Promise<HandleDocumentSearchOutput> => {
  const { toolCall, phone, clientId, config, userMessage } = input;

  try {
    // 1. Parse arguments
    let args: { query: string; document_type?: string };
    try {
      args = JSON.parse(toolCall.function.arguments);
    } catch (parseError) {
      // ❌ FIX: Save parse error as failed message in conversation
      const errorDetails: ErrorDetails = {
        code: "PARSE_ERROR",
        title: "Erro de Processamento",
        message:
          "Não foi possível processar a solicitação de busca de documento.",
      };

      await saveChatMessage({
        phone,
        message: "📄 Busca de documento",
        type: "ai",
        clientId,
        status: "failed",
        errorDetails,
      });

      return {
        success: false,
        message: "",
        documentsFound: 0,
        documentsSent: 0,
      };
    }

    const { query, document_type } = args;

    // Gate `no_explicit_intent` removido: se o LLM decidiu chamar `buscar_documento`,
    // ele ja avaliou contexto. Mantemos apenas o gate de cooldown/dedup mais abaixo.

    // 2. Buscar documentos na base de conhecimento
    const searchResult = await searchDocumentInKnowledge({
      query,
      clientId,
      documentType: document_type === "any" ? undefined : document_type,
      openaiApiKey: config.apiKeys.openaiApiKey,
      searchThreshold: 0.3, // Threshold reduzido para diagnóstico (0.3 = muito permissivo)
      maxResults: 5,
    });

    let { results } = searchResult;
    const { metadata } = searchResult;

    // 3. Se não encontrou documentos
    if (results.length === 0) {
      // ❌ FIX: Save "no documents found" as failed message in conversation
      const errorDetails: ErrorDetails = {
        code: "NOT_FOUND",
        title: "Documento Não Encontrado",
        message: `Não encontrei documentos relacionados a "${query}" na base de conhecimento.`,
        error_data: {
          query,
          document_type,
          totalDocumentsInBase: metadata.totalDocumentsInBase,
          threshold: metadata.threshold,
        },
      };

      await saveChatMessage({
        phone,
        message: `📄 Busca: "${query}"`,
        type: "ai",
        clientId,
        status: "failed",
        errorDetails,
      });

      return {
        success: true,
        message: "",
        documentsFound: 0,
        documentsSent: 0,
        searchMetadata: metadata,
        documentGateDecision: "allowed",
        documentGateReason: "allowed",
      };
    }

    // 4. Enviar documentos via WhatsApp
    let sentCount = 0;
    let textFilesFound = 0; // Contador de arquivos .txt/.md encontrados (não enviados)
    const textFilesNames: string[] = []; // Nomes dos arquivos de texto encontrados
    const textFilesContent: string[] = []; // Conteúdo dos arquivos de texto (para o agente usar)
    const filesSent: string[] = [];
    const filesMetadata: Array<{
      url: string;
      filename: string;
      mimeType: string;
      size: number;
    }> = [];
    const errors: string[] = [];

    // Buscar conteúdo dos arquivos de texto encontrados
    const supabaseServiceRole = createServiceRoleClient();
    const supabaseAny = supabaseServiceRole as any;

    if (document_type === "image" && !results.some(isImageDocument)) {
      const filenameImageResults = await findImageDocumentsByFilename({
        supabaseAny,
        clientId,
        query,
        maxResults: 5,
      });

      if (filenameImageResults.length > 0) {
        results = filenameImageResults;
      }
    }

    const intent = detectDocumentIntent(query);
    const mediaCandidates = results.filter((doc) => {
      const fileName = doc.filename.toLowerCase();
      const isTextFile =
        fileName.endsWith(".txt") ||
        fileName.endsWith(".md") ||
        fileName.endsWith(".markdown") ||
        doc.originalMimeType === "text/plain" ||
        doc.originalMimeType === "text/markdown";
      return !isTextFile;
    });

    const sortedMediaCandidates = mediaCandidates
      .map((doc, idx) => ({
        doc,
        idx,
        score: scoreDocumentByIntent(doc.filename, intent),
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.idx - b.idx;
      });

    const selectedMediaDoc = sortedMediaCandidates[0]?.doc ?? null;
    const selectedMediaIntent = selectedMediaDoc
      ? inferIntentFromFilename(selectedMediaDoc.filename)
      : intent;

    const nowIso = new Date().toISOString();
    const cooldownSinceIso = new Date(
      Date.now() - DOCUMENT_COOLDOWN_MS,
    ).toISOString();
    const { data: recentMediaData } = await supabaseAny
      .from("n8n_chat_histories")
      .select("message, media_metadata, created_at")
      .eq("session_id", phone)
      .eq("client_id", clientId)
      .gte("created_at", cooldownSinceIso)
      .lte("created_at", nowIso)
      .not("media_metadata", "is", null)
      .order("created_at", { ascending: false })
      .limit(20);

    const recentMediaRows = recentMediaData || [];

    const hasDuplicateMediaInCooldown = recentMediaRows.some((row: any) => {
      try {
        const metadataValue = row.media_metadata;
        const media =
          typeof metadataValue === "string"
            ? JSON.parse(metadataValue)
            : metadataValue;
        const filename = media?.filename || "";
        if (!filename) return false;
        return inferIntentFromFilename(filename) === selectedMediaIntent;
      } catch {
        return false;
      }
    });

    if (hasDuplicateMediaInCooldown && selectedMediaDoc) {
      return {
        success: true,
        message:
          "Acabei de te enviar esse material. Me diz se voce ja conseguiu abrir ou se quer que eu explique algum ponto especifico.",
        documentsFound: results.length,
        documentsSent: 0,
        searchMetadata: metadata,
        documentGateDecision: "blocked",
        documentGateReason: "cooldown_duplicate",
        selectedDocument: selectedMediaDoc.filename,
        suppressedDocumentsCount: mediaCandidates.length,
        useMessageAsReply: true,
      };
    }

    for (const doc of results) {
      // ✅ FILTRO: Arquivos .txt e .md NUNCA são enviados como anexo
      // Eles são usados apenas para RAG (busca semântica de informações)
      const fileName = doc.filename.toLowerCase();
      const isTextFile =
        fileName.endsWith(".txt") ||
        fileName.endsWith(".md") ||
        fileName.endsWith(".markdown") ||
        doc.originalMimeType === "text/plain" ||
        doc.originalMimeType === "text/markdown";

      if (isTextFile) {
        // Arquivo de texto - buscar TODOS os chunks para retornar conteúdo ao agente
        console.log(
          `ℹ️ [handleDocumentSearchToolCall] Found text file, fetching content: ${doc.filename}`,
        );
        textFilesFound++;
        textFilesNames.push(doc.filename);

        try {
          // Buscar todos os chunks deste arquivo
          const { data: chunks, error: chunksError } = await supabaseAny
            .from("documents")
            .select("content, metadata")
            .eq("client_id", clientId)
            .eq("metadata->>filename", doc.filename)
            .order("metadata->>chunkIndex", { ascending: true });

          if (!chunksError && chunks && chunks.length > 0) {
            // Concatenar conteúdo de todos os chunks
            const fullContent = chunks
              .map((chunk: any) => chunk.content)
              .join("\n\n");

            textFilesContent.push(
              `\n\n---\n📄 ${doc.filename}\n---\n${fullContent}`,
            );
            console.log(
              `✅ [handleDocumentSearchToolCall] Retrieved ${chunks.length} chunks from ${doc.filename}`,
            );
          } else {
            console.warn(
              `⚠️ [handleDocumentSearchToolCall] No chunks found for ${doc.filename}`,
            );
          }
        } catch (fetchError) {
          console.error(
            `❌ [handleDocumentSearchToolCall] Error fetching chunks for ${doc.filename}:`,
            fetchError,
          );
        }

        continue; // Pula para o próximo documento (não envia como anexo)
      }

      // Para anexos de mídia, envia apenas 1 arquivo por chamada para evitar misturar assunto.
      if (!selectedMediaDoc || doc.filename !== selectedMediaDoc.filename) {
        continue;
      }

      // Determinar tipo de mídia baseado no MIME type (moved outside try for catch access)
      const isImage = doc.originalMimeType.startsWith("image/");

      try {
        let messageId: string;

        if (isImage) {
          // Enviar como imagem (sem caption)
          const result = await sendImageMessage(
            phone,
            doc.originalFileUrl,
            undefined, // Sem caption
            config,
          );
          messageId = result.messageId;
        } else {
          // Enviar como documento (PDF, DOC, etc.) - sem caption
          const result = await sendDocumentMessage(
            phone,
            doc.originalFileUrl,
            doc.filename,
            undefined, // Sem caption
            config,
          );
          messageId = result.messageId;
        }

        // ✅ FIX: Salvar mensagem no banco com wamid e status
        // Isso permite que o sistema de status atualize corretamente
        const mediaMetadata: StoredMediaMetadata = {
          type: isImage ? "image" : "document",
          url: doc.originalFileUrl,
          mimeType: doc.originalMimeType,
          filename: doc.filename,
          size: doc.originalFileSize,
        };

        await saveChatMessage({
          phone,
          message: `📄 ${doc.filename}`, // Descrição da mídia
          type: "ai",
          clientId,
          mediaMetadata,
          wamid: messageId,
          status: "sent", // ✅ Marcar como enviado (já foi para o WhatsApp)
        });

        console.log(
          `✅ [handleDocumentSearchToolCall] Saved media message with wamid: ${messageId}`,
        );

        sentCount++;
        filesSent.push(doc.filename);

        // Coletar metadados para renderizar no frontend
        filesMetadata.push({
          url: doc.originalFileUrl,
          filename: doc.filename,
          mimeType: doc.originalMimeType,
          size: doc.originalFileSize,
        });

        // Delay entre envios para evitar rate limit (hoje enviamos apenas 1 mídia por chamada)
        if (sentCount < 1) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      } catch (sendError) {
        const errorMessage =
          sendError instanceof Error ? sendError.message : "Unknown error";
        errors.push(`${doc.filename}: ${errorMessage}`);

        // ❌ FIX: Save send error as failed message in conversation
        const sendErrorDetails: ErrorDetails = {
          code: "SEND_FAILED",
          title: "Falha ao Enviar",
          message: `Não foi possível enviar o documento "${doc.filename}".`,
          error_data: {
            filename: doc.filename,
            mimeType: doc.originalMimeType,
            originalError: errorMessage,
          },
        };

        const failedMediaMetadata: StoredMediaMetadata = {
          type: isImage ? "image" : "document",
          url: doc.originalFileUrl,
          mimeType: doc.originalMimeType,
          filename: doc.filename,
          size: doc.originalFileSize,
        };

        await saveChatMessage({
          phone,
          message: `📄 ${doc.filename}`,
          type: "ai",
          clientId,
          mediaMetadata: failedMediaMetadata,
          status: "failed",
          errorDetails: sendErrorDetails,
        });
      }
    }

    // 5. Montar mensagem de retorno
    // ✅ FIX: Errors are now saved as failed messages in the conversation
    // No need to return error messages - they're visible in the chat
    let message = "";

    // Informar sobre arquivos de texto encontrados e incluir o CONTEÚDO para o agente usar
    if (textFilesFound > 0) {
      message += `Info: Encontrei ${textFilesFound} arquivo(s) de texto (${textFilesNames.join(
        ", ",
      )}). `;
      message +=
        "Estes arquivos sao usados apenas para busca de informacoes (RAG) e nao sao enviados como anexo.\n\n";
      message += "**CONTEUDO DOS ARQUIVOS DE TEXTO ENCONTRADOS:**\n";
      message +=
        "Use as informacoes abaixo para responder ao usuario com precisao:\n";
      message += textFilesContent.join("\n\n");
      message += "\n\n---\n";
      message += [
        "**IMPORTANTE:** Use essas informacoes para responder ao usuario.",
        "Se o usuario pediu foto, imagem, link ou anexo, mas este conteudo nao tiver uma URL real ou arquivo de midia enviado, diga claramente que nao encontrou anexo/imagem disponivel na base.",
        "Nunca invente links, nem placeholders como Foto 1, Foto 2 ou Foto 3.",
      ].join(" ");
      message += "\n";
    }

    if (sentCount > 0) {
      if (message) message += "\n\n";
      message += `✅ Enviei ${sentCount} documento(s) via WhatsApp: ${filesSent.join(
        ", ",
      )}.`;
    } else if (textFilesFound === 0) {
      message = "Nenhum documento encontrado para enviar.";
    }

    return {
      success: sentCount > 0 || textFilesFound > 0, // Sucesso se enviou arquivos OU encontrou arquivos de texto
      message,
      documentsFound: results.length,
      documentsSent: sentCount,
      textFilesFound, // Novo campo: quantidade de arquivos de texto encontrados
      filesSent,
      filesMetadata,
      searchMetadata: metadata,
      documentGateDecision: "allowed",
      documentGateReason: "allowed",
      selectedDocument: selectedMediaDoc?.filename,
      suppressedDocumentsCount: Math.max(0, mediaCandidates.length - sentCount),
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // ❌ FIX: Save general error as failed message in conversation
    const generalErrorDetails: ErrorDetails = {
      code: "SEARCH_ERROR",
      title: "Erro na Busca",
      message: `Erro ao buscar documentos: ${errorMessage}`,
    };

    await saveChatMessage({
      phone,
      message: "📄 Busca de documento",
      type: "ai",
      clientId,
      status: "failed",
      errorDetails: generalErrorDetails,
    });

    return {
      success: false,
      message: "",
      documentsFound: 0,
      documentsSent: 0,
    };
  }
};

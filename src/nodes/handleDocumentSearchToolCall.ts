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
 *
 * A parte de DECISÃO (buscar, filtrar texto vs mídia, pontuar por intenção,
 * checar cooldown de duplicidade, extrair conteúdo de arquivos de texto) vive
 * em `resolveDocumentSearch`, sem nenhum efeito colateral (sem enviar
 * WhatsApp, sem gravar no banco). Isso permite que o painel de teste de
 * agente (`/api/agents/[id]/test`) reproduza a MESMA decisão de produção
 * sem disparar envios reais — ver uso em `src/app/api/agents/[id]/test/route.ts`.
 */

import { sendDocumentMessage, sendImageMessage } from "@/lib/meta";
import { createServiceRoleClient } from "@/lib/supabase";
import type { ClientConfig, StoredMediaMetadata } from "@/lib/types";
import { ErrorDetails, saveChatMessage } from "@/nodes/saveChatMessage";
import {
  DocumentSearchResult,
  searchDocumentInKnowledge,
} from "./searchDocumentInKnowledge";

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

// Arquivos .txt e .md NUNCA são enviados como anexo — servem apenas para
// RAG (o conteúdo é injetado numa chamada de follow-up à IA).
const isTextFileDoc = (doc: {
  filename: string;
  originalMimeType?: string | null;
}): boolean => {
  const fileName = doc.filename.toLowerCase();
  return (
    fileName.endsWith(".txt") ||
    fileName.endsWith(".md") ||
    fileName.endsWith(".markdown") ||
    doc.originalMimeType === "text/plain" ||
    doc.originalMimeType === "text/markdown"
  );
};

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

export interface ResolveDocumentSearchInput {
  query: string;
  documentType?: string;
  clientId: string;
  openaiApiKey?: string;
  /**
   * Telefone real do contato — usado apenas para o gate de cooldown
   * (evita reenviar o mesmo material em menos de 90s). Quando omitido
   * (ex.: painel de teste de agente), o cooldown é simplesmente ignorado.
   */
  phone?: string;
}

export interface ResolvedDocumentSearch {
  /** Resultados brutos da busca (já com fallback por filename para imagens aplicado) */
  results: DocumentSearchResult[];
  metadata: {
    totalDocumentsInBase: number;
    chunksFound: number;
    uniqueDocumentsFound: number;
    threshold: number;
    documentTypeFilter?: string;
  };
  /** Nenhum documento encontrado na base */
  notFound: boolean;
  /** Documentos candidatos a envio como mídia (exclui .txt/.md) */
  mediaCandidates: DocumentSearchResult[];
  /** Único documento de mídia escolhido para envio (produção envia no máximo 1 por chamada) */
  selectedMediaDoc: DocumentSearchResult | null;
  textFilesFound: number;
  textFilesNames: string[];
  /** Conteúdo completo (todos os chunks) de cada arquivo de texto encontrado, já formatado */
  textFilesContent: string[];
  /** true quando o documento selecionado já foi enviado há menos de DOCUMENT_COOLDOWN_MS */
  cooldownBlocked: boolean;
  cooldownMessage?: string;
  suppressedDocumentsCount: number;
}

/**
 * Resolve a decisão de busca de documento (o que seria enviado e o
 * conteúdo de texto a usar) SEM nenhum efeito colateral — não envia
 * mensagens no WhatsApp nem grava no banco. Compartilhado entre o fluxo de
 * produção (`handleDocumentSearchToolCall`, que envia de fato) e o painel
 * de teste de agente (que só precisa da decisão para preview).
 */
export const resolveDocumentSearch = async (
  input: ResolveDocumentSearchInput,
): Promise<ResolvedDocumentSearch> => {
  const { query, documentType, clientId, openaiApiKey, phone } = input;

  const searchResult = await searchDocumentInKnowledge({
    query,
    clientId,
    documentType: documentType === "any" ? undefined : documentType,
    openaiApiKey,
    searchThreshold: 0.3, // Threshold reduzido para diagnóstico (0.3 = muito permissivo)
    maxResults: 5,
  });

  let { results } = searchResult;
  const { metadata } = searchResult;

  if (results.length === 0) {
    return {
      results,
      metadata,
      notFound: true,
      mediaCandidates: [],
      selectedMediaDoc: null,
      textFilesFound: 0,
      textFilesNames: [],
      textFilesContent: [],
      cooldownBlocked: false,
      suppressedDocumentsCount: 0,
    };
  }

  const supabaseServiceRole = createServiceRoleClient();
  const supabaseAny = supabaseServiceRole as any;

  if (documentType === "image" && !results.some(isImageDocument)) {
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
  const mediaCandidates = results.filter((doc) => !isTextFileDoc(doc));

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

  let cooldownBlocked = false;
  let cooldownMessage: string | undefined;

  if (phone && selectedMediaDoc) {
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

    cooldownBlocked = recentMediaRows.some((row: any) => {
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

    if (cooldownBlocked) {
      cooldownMessage =
        "Acabei de te enviar esse material. Me diz se voce ja conseguiu abrir ou se quer que eu explique algum ponto especifico.";
    }
  }

  // Arquivos de texto: buscar TODOS os chunks para devolver o conteúdo completo
  let textFilesFound = 0;
  const textFilesNames: string[] = [];
  const textFilesContent: string[] = [];

  for (const doc of results) {
    if (!isTextFileDoc(doc)) continue;

    textFilesFound++;
    textFilesNames.push(doc.filename);

    try {
      const { data: chunks, error: chunksError } = await supabaseAny
        .from("documents")
        .select("content, metadata")
        .eq("client_id", clientId)
        .eq("metadata->>filename", doc.filename)
        .order("metadata->>chunkIndex", { ascending: true });

      if (!chunksError && chunks && chunks.length > 0) {
        const fullContent = chunks
          .map((chunk: any) => chunk.content)
          .join("\n\n");

        textFilesContent.push(
          `\n\n---\n📄 ${doc.filename}\n---\n${fullContent}`,
        );
      } else {
        console.warn(
          `⚠️ [resolveDocumentSearch] No chunks found for ${doc.filename}`,
        );
      }
    } catch (fetchError) {
      console.error(
        `❌ [resolveDocumentSearch] Error fetching chunks for ${doc.filename}:`,
        fetchError,
      );
    }
  }

  return {
    results,
    metadata,
    notFound: false,
    mediaCandidates,
    selectedMediaDoc,
    textFilesFound,
    textFilesNames,
    textFilesContent,
    cooldownBlocked,
    cooldownMessage,
    suppressedDocumentsCount: Math.max(0, mediaCandidates.length - 1),
  };
};

/**
 * Monta o bloco de texto com o conteúdo dos arquivos de texto encontrados,
 * pronto para ser usado como `ragContext` numa chamada de follow-up à IA.
 * Mesmo texto usado em produção (chatbotFlow.ts, tool `buscar_documento`)
 * e reaproveitado no painel de teste de agente para manter paridade.
 */
export const buildTextFilesMessage = (resolved: ResolvedDocumentSearch): string => {
  if (resolved.textFilesFound === 0) return "";

  let message = `Info: Encontrei ${resolved.textFilesFound} arquivo(s) de texto (${resolved.textFilesNames.join(
    ", ",
  )}). `;
  message +=
    "Estes arquivos sao usados apenas para busca de informacoes (RAG) e nao sao enviados como anexo.\n\n";
  message += "**CONTEUDO DOS ARQUIVOS DE TEXTO ENCONTRADOS:**\n";
  message +=
    "Use as informacoes abaixo para responder ao usuario com precisao:\n";
  message += resolved.textFilesContent.join("\n\n");
  message += "\n\n---\n";
  message += [
    "**IMPORTANTE:** Use essas informacoes para responder ao usuario.",
    "Se o usuario pediu foto, imagem, link ou anexo, mas este conteudo nao tiver uma URL real ou arquivo de midia enviado, diga claramente que nao encontrou anexo/imagem disponivel na base.",
    "Nunca invente links, nem placeholders como Foto 1, Foto 2 ou Foto 3.",
  ].join(" ");
  message += "\n";

  return message;
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
  const { toolCall, phone, clientId, config } = input;

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

    // 2-4. Buscar, filtrar (texto vs midia), pontuar por intencao e checar cooldown.
    const resolved = await resolveDocumentSearch({
      query,
      documentType: document_type,
      clientId,
      openaiApiKey: config.apiKeys.openaiApiKey,
      phone,
    });

    // 3. Se não encontrou documentos
    if (resolved.notFound) {
      // ❌ FIX: Save "no documents found" as failed message in conversation
      const errorDetails: ErrorDetails = {
        code: "NOT_FOUND",
        title: "Documento Não Encontrado",
        message: `Não encontrei documentos relacionados a "${query}" na base de conhecimento.`,
        error_data: {
          query,
          document_type,
          totalDocumentsInBase: resolved.metadata.totalDocumentsInBase,
          threshold: resolved.metadata.threshold,
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
        searchMetadata: resolved.metadata,
        documentGateDecision: "allowed",
        documentGateReason: "allowed",
      };
    }

    if (resolved.cooldownBlocked && resolved.selectedMediaDoc) {
      return {
        success: true,
        message: resolved.cooldownMessage || "",
        documentsFound: resolved.results.length,
        documentsSent: 0,
        searchMetadata: resolved.metadata,
        documentGateDecision: "blocked",
        documentGateReason: "cooldown_duplicate",
        selectedDocument: resolved.selectedMediaDoc.filename,
        suppressedDocumentsCount: resolved.mediaCandidates.length,
        useMessageAsReply: true,
      };
    }

    // 4. Enviar o documento de mídia selecionado (no máximo 1 por chamada,
    // para não misturar assunto) via WhatsApp.
    let sentCount = 0;
    const filesSent: string[] = [];
    const filesMetadata: Array<{
      url: string;
      filename: string;
      mimeType: string;
      size: number;
    }> = [];

    const doc = resolved.selectedMediaDoc;
    if (doc) {
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
      } catch (sendError) {
        const errorMessage =
          sendError instanceof Error ? sendError.message : "Unknown error";

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
    let message = buildTextFilesMessage(resolved);

    if (sentCount > 0) {
      if (message) message += "\n\n";
      message += `✅ Enviei ${sentCount} documento(s) via WhatsApp: ${filesSent.join(
        ", ",
      )}.`;
    } else if (resolved.textFilesFound === 0) {
      message = "Nenhum documento encontrado para enviar.";
    }

    return {
      success: sentCount > 0 || resolved.textFilesFound > 0, // Sucesso se enviou arquivos OU encontrou arquivos de texto
      message,
      documentsFound: resolved.results.length,
      documentsSent: sentCount,
      textFilesFound: resolved.textFilesFound, // Novo campo: quantidade de arquivos de texto encontrados
      filesSent,
      filesMetadata,
      searchMetadata: resolved.metadata,
      documentGateDecision: "allowed",
      documentGateReason: "allowed",
      selectedDocument: resolved.selectedMediaDoc?.filename,
      suppressedDocumentsCount: Math.max(
        0,
        resolved.mediaCandidates.length - sentCount,
      ),
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

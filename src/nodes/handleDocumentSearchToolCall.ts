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

import { searchDocumentInKnowledge } from "./searchDocumentInKnowledge";
import { sendDocumentMessage, sendImageMessage } from "@/lib/meta";
import { saveChatMessage, ErrorDetails } from "@/nodes/saveChatMessage";
import type { ClientConfig, StoredMediaMetadata } from "@/lib/types";
import { createServiceRoleClient } from "@/lib/supabase";

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
}

export interface HandleDocumentSearchOutput {
  /** Sucesso ou falha */
  success: boolean
  
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
}

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
        message: "Não foi possível processar a solicitação de busca de documento.",
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

    // 2. Buscar documentos na base de conhecimento
    const searchResult = await searchDocumentInKnowledge({
      query,
      clientId,
      documentType: document_type === "any" ? undefined : document_type,
      openaiApiKey: config.apiKeys.openaiApiKey,
      searchThreshold: 0.3, // Threshold reduzido para diagnóstico (0.3 = muito permissivo)
      maxResults: 3, // Limitar a 3 documentos por solicitação
    });

    const { results, metadata } = searchResult;

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
      };
    }

    // 4. Enviar documentos via WhatsApp
    let sentCount = 0;
    let textFilesFound = 0; // Contador de arquivos .txt/.md encontrados (não enviados)
    const textFilesNames: string[] = []; // Nomes dos arquivos de texto encontrados
    const textFilesContent: string[] = []; // Conteúdo dos arquivos de texto (para o agente usar)
    const filesSent: string[] = [];
    const filesMetadata: Array<
      { url: string; filename: string; mimeType: string; size: number }
    > = [];
    const errors: string[] = [];

    // Buscar conteúdo dos arquivos de texto encontrados
    const supabaseServiceRole = createServiceRoleClient();
    const supabaseAny = supabaseServiceRole as any;

    for (const doc of results) {
      // ✅ FILTRO: Arquivos .txt e .md NUNCA são enviados como anexo
      // Eles são usados apenas para RAG (busca semântica de informações)
      const fileName = doc.filename.toLowerCase();
      const isTextFile = fileName.endsWith('.txt') || 
                        fileName.endsWith('.md') || 
                        fileName.endsWith('.markdown') ||
                        doc.originalMimeType === 'text/plain' ||
                        doc.originalMimeType === 'text/markdown';
      
      if (isTextFile) {
        // Arquivo de texto - buscar TODOS os chunks para retornar conteúdo ao agente
        console.log(`ℹ️ [handleDocumentSearchToolCall] Found text file, fetching content: ${doc.filename}`);
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
            
            textFilesContent.push(`\n\n---\n📄 ${doc.filename}\n---\n${fullContent}`);
            console.log(`✅ [handleDocumentSearchToolCall] Retrieved ${chunks.length} chunks from ${doc.filename}`);
          } else {
            console.warn(`⚠️ [handleDocumentSearchToolCall] No chunks found for ${doc.filename}`);
          }
        } catch (fetchError) {
          console.error(`❌ [handleDocumentSearchToolCall] Error fetching chunks for ${doc.filename}:`, fetchError);
        }
        
        continue; // Pula para o próximo documento (não envia como anexo)
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

        console.log(`✅ [handleDocumentSearchToolCall] Saved media message with wamid: ${messageId}`);

        sentCount++;
        filesSent.push(doc.filename);

        // Coletar metadados para renderizar no frontend
        filesMetadata.push({
          url: doc.originalFileUrl,
          filename: doc.filename,
          mimeType: doc.originalMimeType,
          size: doc.originalFileSize,
        });

        // Delay entre envios para evitar rate limit
        if (sentCount < results.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (sendError) {
        const errorMessage = sendError instanceof Error
          ? sendError.message
          : "Unknown error";
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
      message += `ℹ️ Encontrei ${textFilesFound} arquivo(s) de texto (${textFilesNames.join(', ')}). `;
      message += "Estes arquivos são usados apenas para busca de informações (RAG) e não são enviados como anexo.\n\n";
      message += "**CONTEÚDO DOS ARQUIVOS DE TEXTO ENCONTRADOS:**\n";
      message += "Use as informações abaixo para responder ao usuário com precisão:\n";
      message += textFilesContent.join("\n\n");
      message += "\n\n---\n";
      message += "**IMPORTANTE:** Use essas informações para responder ao usuário. Cite que a informação vem da base de conhecimento.\n";
    }
    
    if (sentCount > 0) {
      if (message) message += "\n\n";
      message += `✅ Enviei ${sentCount} documento(s) via WhatsApp: ${filesSent.join(', ')}.`;
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
    };
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";

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

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

import { searchDocumentInKnowledge } from './searchDocumentInKnowledge'
import { sendImageMessage, sendDocumentMessage } from '@/lib/meta'
import type { ClientConfig } from '@/lib/types'

export interface HandleDocumentSearchInput {
  /** Tool call object do AI response */
  toolCall: {
    id: string
    function: {
      name: string
      arguments: string // JSON string
    }
  }

  /** Número do telefone do destinatário */
  phone: string

  /** ID do cliente (multi-tenant) */
  clientId: string

  /** Config do cliente (para API keys) */
  config: ClientConfig
}

export interface HandleDocumentSearchOutput {
  /** Sucesso ou falha */
  success: boolean

  /** Mensagem para retornar ao agente (será incluída na conversa) */
  message: string

  /** Número de documentos encontrados */
  documentsFound?: number

  /** Número de documentos enviados com sucesso */
  documentsSent?: number

  /** Lista de arquivos enviados (para log) */
  filesSent?: string[]

  /** Metadados dos arquivos enviados (para renderizar no frontend) */
  filesMetadata?: Array<{
    url: string
    filename: string
    mimeType: string
    size: number
  }>

  /** Metadados de debug da busca */
  searchMetadata?: {
    totalDocumentsInBase: number
    chunksFound: number
    uniqueDocumentsFound: number
    threshold: number
    documentTypeFilter?: string
  }
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
 * // result.message → "Encontrei 1 documento e enviei: catalogo-2024.pdf"
 * // result.documentsSent → 1
 * ```
 */
export const handleDocumentSearchToolCall = async (
  input: HandleDocumentSearchInput
): Promise<HandleDocumentSearchOutput> => {
  const { toolCall, phone, clientId, config } = input

  try {
    console.log('\n🔍 [handleDocumentSearchToolCall] Processing tool call')

    // 1. Parse arguments
    let args: { query: string; document_type?: string }
    try {
      args = JSON.parse(toolCall.function.arguments)
    } catch (parseError) {
      console.error('[handleDocumentSearchToolCall] ❌ Failed to parse arguments:', parseError)
      return {
        success: false,
        message: 'Erro ao processar solicitação de busca de documento.',
        documentsFound: 0,
        documentsSent: 0
      }
    }

    const { query, document_type } = args

    console.log(`  Query: "${query}"`)
    console.log(`  Document Type: ${document_type || 'any'}`)

    // 2. Buscar documentos na base de conhecimento
    const searchResult = await searchDocumentInKnowledge({
      query,
      clientId,
      documentType: document_type === 'any' ? undefined : document_type,
      openaiApiKey: config.apiKeys.openaiApiKey,
      searchThreshold: 0.5, // Temporariamente mais baixo para debug
      maxResults: 3 // Limitar a 3 documentos por solicitação
    })

    const { results, metadata } = searchResult

    // Log metadata para debug
    console.log('\n📊 [Search Metadata]')
    console.log(`  Total docs in base: ${metadata.totalDocumentsInBase}`)
    console.log(`  Chunks found in search: ${metadata.chunksFound}`)
    console.log(`  Unique docs found: ${metadata.uniqueDocumentsFound}`)
    console.log(`  Threshold used: ${metadata.threshold}`)
    if (metadata.documentTypeFilter) {
      console.log(`  Document type filter: ${metadata.documentTypeFilter}`)
    }

    // 3. Se não encontrou documentos
    if (results.length === 0) {
      const message = `Não encontrei documentos relacionados a "${query}" na base de conhecimento.`
      console.log(`  ℹ️  ${message}`)

      return {
        success: true,
        message,
        documentsFound: 0,
        documentsSent: 0,
        searchMetadata: metadata
      }
    }

    // 4. Enviar documentos via WhatsApp
    let sentCount = 0
    const filesSent: string[] = []
    const filesMetadata: Array<{ url: string; filename: string; mimeType: string; size: number }> = []
    const errors: string[] = []

    for (const doc of results) {
      try {
        console.log(`\n  📤 Sending: ${doc.filename} (${doc.originalMimeType})`)

        // Determinar tipo de mídia baseado no MIME type
        const isImage = doc.originalMimeType.startsWith('image/')

        if (isImage) {
          // Enviar como imagem
          await sendImageMessage(
            phone,
            doc.originalFileUrl,
            `📷 ${doc.filename}`, // Caption
            config
          )
          console.log(`    ✅ Image sent`)
        } else {
          // Enviar como documento (PDF, DOC, etc.)
          await sendDocumentMessage(
            phone,
            doc.originalFileUrl,
            doc.filename,
            `📄 Documento da base de conhecimento`, // Caption
            config
          )
          console.log(`    ✅ Document sent`)
        }

        sentCount++
        filesSent.push(doc.filename)

        // Coletar metadados para renderizar no frontend
        filesMetadata.push({
          url: doc.originalFileUrl,
          filename: doc.filename,
          mimeType: doc.originalMimeType,
          size: doc.originalFileSize
        })

        // Delay entre envios para evitar rate limit
        if (sentCount < results.length) {
          console.log('    ⏱️  Waiting 1s before next send...')
          await new Promise(resolve => setTimeout(resolve, 1000))
        }

      } catch (sendError) {
        const errorMessage = sendError instanceof Error ? sendError.message : 'Unknown error'
        console.error(`  ❌ Error sending ${doc.filename}:`, errorMessage)
        errors.push(`${doc.filename}: ${errorMessage}`)
      }
    }

    // 5. Montar mensagem de retorno
    let message: string

    if (sentCount === 0) {
      message = `Encontrei ${results.length} documento(s) relacionado(s) a "${query}", mas houve erro ao enviar: ${errors.join(', ')}`
    } else if (sentCount === results.length) {
      const fileList = filesSent.join(', ')
      message = sentCount === 1
        ? `Encontrei e enviei o documento: ${fileList}`
        : `Encontrei ${results.length} documentos e enviei todos: ${fileList}`
    } else {
      const fileList = filesSent.join(', ')
      message = `Encontrei ${results.length} documentos e enviei ${sentCount}: ${fileList}. Alguns falharam: ${errors.join(', ')}`
    }

    console.log(`\n✅ [handleDocumentSearchToolCall] Completed`)
    console.log(`  Message: ${message}`)

    return {
      success: sentCount > 0,
      message,
      documentsFound: results.length,
      documentsSent: sentCount,
      filesSent,
      filesMetadata,
      searchMetadata: metadata
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('\n❌ [handleDocumentSearchToolCall] Error:', errorMessage)

    return {
      success: false,
      message: `Erro ao buscar documentos: ${errorMessage}`,
      documentsFound: 0,
      documentsSent: 0
    }
  }
}

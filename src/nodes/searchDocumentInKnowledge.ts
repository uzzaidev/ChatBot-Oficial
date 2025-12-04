/**
 * Node: Search Document in Knowledge Base
 *
 * Busca documentos na base de conhecimento RAG por similaridade semântica
 * e retorna metadados dos arquivos originais (URL, tipo, tamanho) para envio via WhatsApp.
 *
 * Features:
 * - Busca semântica usando embeddings (match_documents RPC)
 * - Agrupa chunks por arquivo original (retorna 1 resultado por arquivo)
 * - Filtra por tipo de documento (catalog, manual, image, etc.)
 * - Retorna URL pública do Storage para envio via WhatsApp
 *
 * Use cases:
 * - Usuário solicita "me envia o catálogo" → busca e retorna catálogo.pdf
 * - Usuário pede "tem alguma imagem do produto X" → busca e retorna imagem.png
 * - Agente principal usa como tool para buscar documentos sob demanda
 */

import { createServiceRoleClient } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/openai'
import { getBotConfig } from '@/lib/config'

export interface SearchDocumentInput {
  /** Termo de busca (nome do arquivo, assunto, etc.) */
  query: string

  /** ID do cliente (multi-tenant) */
  clientId: string

  /** Tipo de documento (opcional): catalog, manual, faq, image, any */
  documentType?: string

  /** API key OpenAI (opcional, do config do cliente) */
  openaiApiKey?: string

  /** Threshold de similaridade (0.0 - 1.0, default: 0.7) */
  searchThreshold?: number

  /** Número máximo de resultados (default: 5) */
  maxResults?: number
}

export interface DocumentSearchResult {
  /** ID do chunk (primeiro chunk encontrado) */
  id: string

  /** Nome do arquivo */
  filename: string

  /** Tipo de documento (catalog, manual, etc.) */
  documentType: string

  /** URL pública do arquivo original no Storage */
  originalFileUrl: string

  /** Path do arquivo no Storage bucket */
  originalFilePath: string

  /** MIME type do arquivo (application/pdf, image/jpeg, etc.) */
  originalMimeType: string

  /** Tamanho do arquivo em bytes */
  originalFileSize: number

  /** Similaridade com a query (0.0 - 1.0) */
  similarity: number

  /** Preview do conteúdo (primeiros 200 caracteres) */
  preview: string
}

export interface SearchDocumentOutput {
  /** Lista de documentos encontrados */
  results: DocumentSearchResult[]

  /** Metadados da busca (para debug) */
  metadata: {
    /** Total de documentos únicos na base (para o client_id) */
    totalDocumentsInBase: number

    /** Total de chunks encontrados na busca vetorial (antes de agrupar) */
    chunksFound: number

    /** Total de documentos únicos após agrupamento */
    uniqueDocumentsFound: number

    /** Threshold de similaridade usado */
    threshold: number

    /** Tipo de documento filtrado (se houver) */
    documentTypeFilter?: string
  }
}

/**
 * Busca documentos na base de conhecimento usando busca semântica
 *
 * Fluxo:
 * 1. Gera embedding da query
 * 2. Chama match_documents RPC (pgvector similarity search)
 * 3. Agrupa chunks por filename (retorna 1 resultado por arquivo)
 * 4. Filtra por tipo de documento se especificado
 * 5. Ordena por similaridade (maior primeiro)
 * 6. Retorna até maxResults documentos
 *
 * @param input - Parâmetros de busca
 * @returns Lista de documentos encontrados
 *
 * @example
 * ```typescript
 * // Buscar catálogo
 * const results = await searchDocumentInKnowledge({
 *   query: 'catálogo de produtos',
 *   clientId: 'client-123',
 *   documentType: 'catalog',
 *   maxResults: 3
 * })
 *
 * // Buscar imagem
 * const images = await searchDocumentInKnowledge({
 *   query: 'diagrama elétrico',
 *   clientId: 'client-123',
 *   documentType: 'image',
 *   searchThreshold: 0.8
 * })
 * ```
 */
export const searchDocumentInKnowledge = async (
  input: SearchDocumentInput
): Promise<SearchDocumentOutput> => {
  const {
    query,
    clientId,
    documentType,
    openaiApiKey,
    searchThreshold,
    maxResults
  } = input

  try {
    // 1. Buscar configurações (se não fornecidas)
    let threshold = searchThreshold
    let max = maxResults

    if (threshold === undefined) {
      const configValue = await getBotConfig(clientId, 'knowledge_media:search_threshold')
      threshold = configValue !== null ? Number(configValue) : 0.7
    }

    if (max === undefined) {
      const configValue = await getBotConfig(clientId, 'rag:max_results')
      max = configValue !== null ? Number(configValue) : 5
    }

    console.log(`[searchDocumentInKnowledge] Query: "${query}", type: ${documentType || 'any'}, threshold: ${threshold}`)

    // 1.5. Contar total de documentos únicos na base (para debug)
    const supabase = createServiceRoleClient()
    const supabaseAny = supabase as any

    const { data: totalDocsData } = await supabaseAny
      .from('documents')
      .select('original_file_url')
      .eq('client_id', clientId)
      .not('original_file_url', 'is', null)

    // Contar arquivos únicos (distintos por URL)
    const uniqueUrls = new Set(totalDocsData?.map((d: any) => d.original_file_url) || [])
    const totalDocumentsInBase = uniqueUrls.size

    console.log(`[searchDocumentInKnowledge] 📊 Total documents in base: ${totalDocumentsInBase}`)

    // 2. Gerar embedding da query
    const embeddingResult = await generateEmbedding(query, openaiApiKey)

    // 3. Buscar documentos similares usando match_documents RPC

    const { data, error } = await supabaseAny.rpc('match_documents', {
      query_embedding: embeddingResult.embedding,
      match_threshold: threshold,
      match_count: max * 3, // Buscar mais para agrupar depois
      filter_client_id: clientId
    })

    if (error) {
      console.error('[searchDocumentInKnowledge] ❌ Error calling match_documents:', error)
      throw new Error(`Failed to search documents: ${error.message}`)
    }

    const chunksFound = data?.length || 0

    if (!data || data.length === 0) {
      console.log('[searchDocumentInKnowledge] ❌ No chunks found matching criteria')
      return {
        results: [],
        metadata: {
          totalDocumentsInBase,
          chunksFound: 0,
          uniqueDocumentsFound: 0,
          threshold,
          documentTypeFilter: documentType
        }
      }
    }

    console.log(`[searchDocumentInKnowledge] 🔍 Found ${chunksFound} chunks matching query`)

    // 4. Agrupar chunks por arquivo original (filename)
    // Múltiplos chunks do mesmo arquivo → retorna apenas o de maior similaridade
    const groupedByFile = new Map<string, DocumentSearchResult>()

    for (const doc of data) {
      const filename = doc.metadata?.filename
      const originalFileUrl = doc.original_file_url

      // Skip se não tiver filename ou URL do arquivo original
      if (!filename || !originalFileUrl) {
        console.log(`[searchDocumentInKnowledge] Skipping chunk ${doc.id} - missing filename or URL`)
        continue
      }

      // Filtar por tipo de documento se especificado
      if (documentType && documentType !== 'any') {
        const docType = doc.metadata?.documentType
        if (docType !== documentType) {
          continue
        }
      }

      // Se já existe, pega o de maior similarity
      const existing = groupedByFile.get(filename)
      if (!existing || doc.similarity > existing.similarity) {
        groupedByFile.set(filename, {
          id: doc.id,
          filename: doc.metadata.filename,
          documentType: doc.metadata.documentType || 'unknown',
          originalFileUrl: doc.original_file_url,
          originalFilePath: doc.original_file_path,
          originalMimeType: doc.original_mime_type,
          originalFileSize: doc.original_file_size,
          similarity: doc.similarity,
          preview: doc.content.substring(0, 200)
        })
      }
    }

    // 5. Converter Map para Array e ordenar por similaridade
    const results = Array.from(groupedByFile.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, max)

    console.log(`[searchDocumentInKnowledge] ✅ Returning ${results.length} unique documents`)

    // Log similarity scores for debug
    if (results.length > 0) {
      console.log('[searchDocumentInKnowledge] 📈 Similarity scores:')
      results.forEach((doc, idx) => {
        console.log(`  ${idx + 1}. ${doc.filename} - Score: ${doc.similarity.toFixed(3)} (${(doc.similarity * 100).toFixed(1)}%)`)
      })
    }

    return {
      results,
      metadata: {
        totalDocumentsInBase,
        chunksFound,
        uniqueDocumentsFound: results.length,
        threshold,
        documentTypeFilter: documentType
      }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[searchDocumentInKnowledge] ❌ Error:', errorMessage)

    // Retornar estrutura vazia ao invés de quebrar o fluxo
    return {
      results: [],
      metadata: {
        totalDocumentsInBase: 0,
        chunksFound: 0,
        uniqueDocumentsFound: 0,
        threshold: searchThreshold || 0.7,
        documentTypeFilter: documentType
      }
    }
  }
}

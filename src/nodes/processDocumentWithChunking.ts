/**
 * Node: Process Document with Semantic Chunking
 * 
 * Processa documentos (PDFs, texto) com chunking semântico e overlap
 * para melhor precisão em RAG (Retrieval-Augmented Generation).
 * 
 * Features:
 * - Chunking semântico (respeita parágrafos/sentenças)
 * - Overlap configurável (15-20% recomendado)
 * - Geração de embeddings para cada chunk
 * - Salvamento no vector store (documents table)
 * 
 * Configurações usadas:
 * - rag:chunk_size (tokens por chunk)
 * - rag:chunk_overlap_percentage (% overlap)
 * - rag:embedding_model (modelo OpenAI)
 */

import { semanticChunkText, chunkDocumentForRAG, getChunkingStats, type ChunkingConfig } from '@/lib/chunking'
import { generateEmbedding } from '@/lib/openai'
import { createServiceRoleClient } from '@/lib/supabase'
import { getBotConfigs } from '@/lib/config'

export interface ProcessDocumentInput {
  /** Texto completo do documento */
  text: string
  
  /** ID do cliente (para multi-tenant) */
  clientId: string
  
  /** Metadados do documento */
  metadata: {
    filename?: string
    documentType?: string // 'pdf', 'txt', 'catalog', 'manual', etc
    source?: string // 'upload', 'whatsapp', 'api'
    uploadedBy?: string
    [key: string]: any
  }
  
  /** API key OpenAI opcional (do config do cliente) */
  openaiApiKey?: string
}

export interface ProcessDocumentOutput {
  /** Número de chunks criados */
  chunksCreated: number
  
  /** Número de embeddings gerados */
  embeddingsGenerated: number
  
  /** IDs dos documentos salvos no vector store */
  documentIds: string[]
  
  /** Estatísticas de chunking */
  stats: {
    avgTokensPerChunk: number
    minTokensPerChunk: number
    maxTokensPerChunk: number
    totalTokens: number
    overlapPercentage: number
  }
  
  /** Usage da API OpenAI */
  usage: {
    embeddingTokens: number
    totalCost: number // Estimado em USD
  }
}

/**
 * Processa documento com chunking semântico e salva no vector store
 * 
 * Fluxo:
 * 1. Busca configurações de chunking (rag:chunk_size, rag:chunk_overlap_percentage)
 * 2. Divide documento em chunks semânticos com overlap
 * 3. Gera embedding para cada chunk
 * 4. Salva chunks + embeddings no vector store (documents table)
 * 5. Retorna estatísticas
 * 
 * @param input - Dados do documento
 * @returns Resultado do processamento
 * 
 * @example
 * ```typescript
 * const result = await processDocumentWithChunking({
 *   text: pdfContent,
 *   clientId: 'client-123',
 *   metadata: {
 *     filename: 'catalogo.pdf',
 *     documentType: 'catalog',
 *     source: 'upload'
 *   },
 *   openaiApiKey: clientConfig.openai_api_key
 * })
 * 
 * console.log(`Created ${result.chunksCreated} chunks`)
 * console.log(`Avg tokens: ${result.stats.avgTokensPerChunk}`)
 * ```
 */
export const processDocumentWithChunking = async (
  input: ProcessDocumentInput
): Promise<ProcessDocumentOutput> => {
  const { text, clientId, metadata, openaiApiKey } = input

  console.log(`[ProcessDocument] 🔍 Starting for client: ${clientId}`)
  console.log(`[ProcessDocument] 📄 Document: ${metadata.filename || 'unnamed'}`)
  console.log(`[ProcessDocument] 📏 Text length: ${text.length} chars`)

  try {
    // 1. Buscar configurações de chunking
    const configs = await getBotConfigs(clientId, [
      'rag:chunk_size',
      'rag:chunk_overlap_percentage',
      'rag:embedding_model'
    ])

    const chunkSize = Number(configs['rag:chunk_size']) || 500
    const overlapPercentage = Number(configs['rag:chunk_overlap_percentage']) || 20
    const embeddingModel = String(configs['rag:embedding_model']) || 'text-embedding-3-small'

    console.log(`[ProcessDocument] ⚙️ Config: chunk_size=${chunkSize}, overlap=${overlapPercentage}%`)

    // 2. Dividir documento em chunks semânticos
    const chunkingConfig: ChunkingConfig = {
      chunkSize,
      overlapPercentage
    }

    const chunks = chunkDocumentForRAG(text, chunkingConfig, {
      ...metadata,
      clientId,
      uploadedAt: new Date()
    })

    console.log(`[ProcessDocument] 📦 Created ${chunks.length} chunks`)

    // Calcular estatísticas
    const stats = getChunkingStats(chunks)
    console.log(`[ProcessDocument] 📊 Stats:`, stats)

    // 3. Gerar embeddings e salvar no vector store
    const supabase = createServiceRoleClient() // Service role bypassa RLS
    const supabaseAny = supabase as any // TypeScript bypass para tabela documents
    const documentIds: string[] = []
    let totalEmbeddingTokens = 0

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]

      console.log(`[ProcessDocument] 🔄 Processing chunk ${i + 1}/${chunks.length}...`)

      // Gerar embedding
      const embeddingResult = await generateEmbedding(chunk.content, openaiApiKey)
      totalEmbeddingTokens += embeddingResult.usage.total_tokens

      // Salvar no vector store
      const { data, error } = await supabaseAny
        .from('documents')
        .insert({
          content: chunk.content,
          embedding: embeddingResult.embedding,
          metadata: chunk.enrichedMetadata,
          client_id: clientId
        })
        .select('id')
        .single()

      if (error) {
        console.error(`[ProcessDocument] ❌ Error saving chunk ${i}:`, error)
        throw new Error(`Failed to save chunk: ${error.message}`)
      }

      if (data?.id) {
        documentIds.push(data.id)
      }

      // Log progresso a cada 10 chunks
      if ((i + 1) % 10 === 0) {
        console.log(`[ProcessDocument] ✅ Processed ${i + 1}/${chunks.length} chunks`)
      }
    }

    // Calcular custo estimado
    // text-embedding-3-small: $0.02 por 1M tokens
    const totalCost = (totalEmbeddingTokens / 1_000_000) * 0.02

    console.log(`[ProcessDocument] ✅ Success!`)
    console.log(`[ProcessDocument] 💾 Saved ${documentIds.length} chunks to vector store`)
    console.log(`[ProcessDocument] 💰 Cost: $${totalCost.toFixed(4)} (${totalEmbeddingTokens} tokens)`)

    return {
      chunksCreated: chunks.length,
      embeddingsGenerated: documentIds.length,
      documentIds,
      stats: {
        ...stats,
        totalTokens: chunks.reduce((sum, c) => sum + c.tokenCount, 0)
      },
      usage: {
        embeddingTokens: totalEmbeddingTokens,
        totalCost
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[ProcessDocument] ❌ Error:`, errorMessage)
    throw new Error(`Failed to process document: ${errorMessage}`)
  }
}

/**
 * Deleta documentos do vector store por filtros
 * 
 * Útil para:
 * - Remover documento antigo antes de re-processar
 * - Limpar documentos de um cliente
 * - Limpar documentos por tipo
 * 
 * @param filters - Filtros para deletar
 * @returns Número de documentos deletados
 * 
 * @example
 * ```typescript
 * // Deletar documento específico
 * await deleteDocuments({
 *   clientId: 'client-123',
 *   filename: 'catalogo-antigo.pdf'
 * })
 * 
 * // Deletar todos de um tipo
 * await deleteDocuments({
 *   clientId: 'client-123',
 *   documentType: 'catalog'
 * })
 * ```
 */
export const deleteDocuments = async (filters: {
  clientId: string
  filename?: string
  documentType?: string
  source?: string
}): Promise<number> => {
  const { clientId, filename, documentType, source } = filters

  console.log(`[DeleteDocuments] 🗑️ Deleting with filters:`, filters)

  try {
    const supabase = createServiceRoleClient() // Service role bypassa RLS
    const supabaseAny = supabase as any // TypeScript bypass para tabela documents

    // Construir query com filtros
    let query = supabaseAny
      .from('documents')
      .delete()
      .eq('client_id', clientId)

    if (filename) {
      query = query.eq('metadata->>filename', filename)
    }
    if (documentType) {
      query = query.eq('metadata->>documentType', documentType)
    }
    if (source) {
      query = query.eq('metadata->>source', source)
    }

    const { data, error, count } = await query.select('id')

    if (error) {
      throw new Error(`Failed to delete documents: ${error.message}`)
    }

    const deletedCount = data?.length || 0
    console.log(`[DeleteDocuments] ✅ Deleted ${deletedCount} documents`)

    return deletedCount
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[DeleteDocuments] ❌ Error:`, errorMessage)
    throw new Error(`Failed to delete documents: ${errorMessage}`)
  }
}

/**
 * Lista documentos do vector store por cliente
 * 
 * Útil para dashboard de administração
 * 
 * @param clientId - ID do cliente
 * @param filters - Filtros opcionais
 * @returns Lista de documentos
 */
export const listDocuments = async (
  clientId: string,
  filters?: {
    documentType?: string
    source?: string
    limit?: number
  }
): Promise<Array<{
  id: string
  filename: string
  documentType: string
  chunkCount: number
  uploadedAt: string
  uploadedBy: string
}>> => {
  console.log(`[ListDocuments] 📋 Listing for client: ${clientId}`)

  try {
    const supabase = createServiceRoleClient() // Service role bypassa RLS
    const supabaseAny = supabase as any // TypeScript bypass para tabela documents

    // Buscar documentos agrupados por filename
    const { data, error } = await supabaseAny
      .from('documents')
      .select('id, metadata')
      .eq('client_id', clientId)
      .limit(filters?.limit || 100)

    if (error) {
      throw new Error(`Failed to list documents: ${error.message}`)
    }

    // Agrupar chunks por documento
    const documentsMap = new Map<string, any>()

    data?.forEach((row: any) => {
      const filename = row.metadata?.filename || 'unnamed'

      if (!documentsMap.has(filename)) {
        documentsMap.set(filename, {
          id: row.id,
          filename,
          documentType: row.metadata?.documentType || 'unknown',
          chunkCount: 0,
          uploadedAt: row.metadata?.uploadedAt || new Date().toISOString(),
          uploadedBy: row.metadata?.uploadedBy || 'unknown'
        })
      }

      const doc = documentsMap.get(filename)
      doc.chunkCount++
    })

    const documents = Array.from(documentsMap.values())
    console.log(`[ListDocuments] ✅ Found ${documents.length} documents`)

    return documents
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[ListDocuments] ❌ Error:`, errorMessage)
    throw new Error(`Failed to list documents: ${errorMessage}`)
  }
}

import { generateEmbedding } from '@/lib/openai'
import { createServerClient } from '@/lib/supabase'
import { getBotConfig } from '@/lib/config'

interface MatchedDocument {
  id: string
  content: string
  metadata: Record<string, unknown>
  similarity: number
}

export interface GetRAGContextInput {
  query: string
  clientId: string
  openaiApiKey?: string
  similarityThreshold?: number
  maxResults?: number
}

export const getRAGContext = async (input: GetRAGContextInput): Promise<string> => {
  const { query, clientId, openaiApiKey } = input

  try {
    // 🔧 Get configuration from bot_configurations table
    let similarityThreshold = input.similarityThreshold
    let maxResults = input.maxResults

    if (similarityThreshold === undefined) {
      const configValue = await getBotConfig(clientId, 'rag:similarity_threshold')
      similarityThreshold = configValue !== null ? Number(configValue) : 0.7
    }

    if (maxResults === undefined) {
      const configValue = await getBotConfig(clientId, 'rag:max_results')
      maxResults = configValue !== null ? Number(configValue) : 5
    }


    // Gerar embedding da query
    const embeddingResult = await generateEmbedding(query, openaiApiKey)
    const supabase = createServerClient()

    // Buscar documentos similares (multi-tenant)
    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: embeddingResult.embedding,
      match_threshold: similarityThreshold,
      match_count: maxResults,
      filter_client_id: clientId
    })

    if (error) {
      console.error(`[getRAGContext] ❌ Error calling match_documents:`, error)
      throw new Error(`Failed to match documents: ${error.message}`)
    }

    if (!data || data.length === 0) {
      return ''
    }

    const documents = data as MatchedDocument[]
    documents.forEach((doc, i) => {
      const preview = doc.content.substring(0, 80)
    })

    const concatenatedContent = documents
      .map((doc, i) => `[Documento ${i + 1} - Relevância: ${(doc.similarity * 100).toFixed(1)}%]\n${doc.content}`)
      .join('\n\n---\n\n')


    return concatenatedContent
  } catch (error) {
    // Se der erro, retorna vazio ao invés de quebrar o fluxo
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[getRAGContext] ❌ Error (returning empty): ${errorMessage}`)
    return ''
  }
}

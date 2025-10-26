import { generateEmbedding } from '@/lib/openai'
import { createServerClient } from '@/lib/supabase'

const MATCH_THRESHOLD = 0.8

interface MatchedDocument {
  id: string
  content: string
  metadata: Record<string, unknown>
  similarity: number
}

export const getRAGContext = async (query: string): Promise<string> => {
  try {
    // TODO: Implementar RAG quando a função match_documents estiver criada no Supabase
    // Por enquanto, retorna vazio para não travar o fluxo
    console.warn('[getRAGContext] ⚠️ RAG desabilitado temporariamente - função match_documents não existe')
    return ''
    
    /* CÓDIGO ORIGINAL - DESCOMENTAR QUANDO CRIAR A FUNÇÃO NO SUPABASE
    const embedding = await generateEmbedding(query)
    const supabase = createServerClient()

    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: MATCH_THRESHOLD,
    })

    if (error) {
      throw new Error(`Failed to match documents: ${error.message}`)
    }

    if (!data || data.length === 0) {
      return ''
    }

    const documents = data as MatchedDocument[]
    const concatenatedContent = documents
      .map((doc) => doc.content)
      .join('\n\n---\n\n')

    return concatenatedContent
    */
  } catch (error) {
    // Se der erro, retorna vazio ao invés de quebrar o fluxo
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[getRAGContext] Error (returning empty): ${errorMessage}`)
    return ''
  }
}

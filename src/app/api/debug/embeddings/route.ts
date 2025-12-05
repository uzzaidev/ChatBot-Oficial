/**
 * Debug Endpoint: Check Embeddings
 *
 * GET /api/debug/embeddings?clientId=xxx
 *
 * Verifica se os documentos têm embeddings gerados
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json(
        { error: 'Missing clientId parameter' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()
    const supabaseAny = supabase as any

    // 1. Buscar documentos com info sobre embeddings
    const { data: docs, error } = await supabaseAny
      .from('documents')
      .select('id, metadata, content, embedding')
      .eq('client_id', clientId)
      .limit(10)

    if (error) {
      throw error
    }

    // 2. Analisar embeddings
    const analysis = docs?.map((doc: any) => {
      const hasEmbedding = doc.embedding !== null && doc.embedding !== undefined

      // Embedding pode vir como string ou array dependendo do Postgres
      let embeddingLength = 0
      let embeddingSample = 'null'

      if (hasEmbedding) {
        if (Array.isArray(doc.embedding)) {
          embeddingLength = doc.embedding.length
          embeddingSample = `[${doc.embedding.slice(0, 3).join(', ')}...]`
        } else if (typeof doc.embedding === 'string') {
          // Embedding como string: "[0.123, 0.456, ...]"
          embeddingLength = doc.embedding.split(',').length
          embeddingSample = doc.embedding.substring(0, 50) + '...'
        } else {
          embeddingSample = 'unknown format'
        }
      }

      return {
        id: doc.id,
        filename: doc.metadata?.filename || 'N/A',
        documentType: doc.metadata?.documentType || 'N/A',
        hasEmbedding: hasEmbedding,
        embeddingDimension: embeddingLength,
        contentPreview: doc.content?.substring(0, 100) + '...',
        embeddingSample
      }
    })

    const summary = {
      totalDocs: docs?.length || 0,
      docsWithEmbedding: analysis?.filter((d: any) => d.hasEmbedding).length || 0,
      docsWithoutEmbedding: analysis?.filter((d: any) => !d.hasEmbedding).length || 0
    }

    return NextResponse.json({
      success: true,
      clientId,
      summary,
      documents: analysis,
      diagnosis: summary.docsWithoutEmbedding > 0
        ? '⚠️ Alguns documentos não têm embeddings! Isso impede a busca vetorial.'
        : '✅ Todos os documentos têm embeddings.'
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

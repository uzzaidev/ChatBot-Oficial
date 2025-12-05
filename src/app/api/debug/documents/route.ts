/**
 * Debug Endpoint: Documents Investigation
 *
 * GET /api/debug/documents?clientId=xxx
 *
 * Verifica estado dos documentos na base de conhecimento
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase'

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

    // 1. Total de documentos na tabela (sem filtros)
    const { data: allDocs, count: totalCount } = await supabaseAny
      .from('documents')
      .select('*', { count: 'exact', head: false })
      .limit(5)

    // 2. Documentos deste cliente (com original_file_url)
    const { data: clientDocsWithUrl, count: clientCountWithUrl } = await supabaseAny
      .from('documents')
      .select('id, client_id, original_file_url, original_file_path, metadata', { count: 'exact', head: false })
      .eq('client_id', clientId)
      .not('original_file_url', 'is', null)
      .limit(10)

    // 3. Documentos deste cliente (todos, incluindo sem URL)
    const { data: allClientDocs, count: allClientCount } = await supabaseAny
      .from('documents')
      .select('id, client_id, original_file_url, original_file_path, metadata, content', { count: 'exact', head: false })
      .eq('client_id', clientId)
      .limit(10)

    // 4. Contar arquivos únicos (por URL)
    const uniqueUrls = new Set(
      allClientDocs
        ?.filter(d => d.original_file_url)
        .map(d => d.original_file_url) || []
    )
    const uniqueFilesCount = uniqueUrls.size

    // 5. Verificar se há documentos sem original_file_url
    const { count: docsWithoutUrl } = await supabaseAny
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .is('original_file_url', null)

    // 6. Sample de documentos para debug
    const sampleDocs = allClientDocs?.slice(0, 3).map(doc => ({
      id: doc.id,
      client_id: doc.client_id,
      has_url: !!doc.original_file_url,
      has_path: !!doc.original_file_path,
      filename: doc.metadata?.filename || 'N/A',
      documentType: doc.metadata?.documentType || 'N/A',
      content_preview: doc.content?.substring(0, 100) + '...',
      url_preview: doc.original_file_url?.substring(0, 50) || 'null'
    }))

    return NextResponse.json({
      success: true,
      clientId,
      summary: {
        totalInDatabase: totalCount,
        clientDocsWithUrl: clientCountWithUrl,
        allClientDocs: allClientCount,
        uniqueFiles: uniqueFilesCount,
        docsWithoutUrl: docsWithoutUrl || 0
      },
      diagnosis: {
        hasDocuments: (allClientCount || 0) > 0,
        hasUrls: (clientCountWithUrl || 0) > 0,
        problem: (allClientCount || 0) > 0 && (clientCountWithUrl || 0) === 0
          ? 'Documentos existem mas estão sem original_file_url'
          : (allClientCount || 0) === 0
            ? 'Nenhum documento encontrado para este client_id'
            : 'OK - Documentos encontrados com URLs'
      },
      sampleDocs,
      allSamples: allDocs?.slice(0, 3).map(doc => ({
        id: doc.id,
        client_id: doc.client_id,
        filename: doc.metadata?.filename || 'N/A'
      }))
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

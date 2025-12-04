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

    console.log('\n🔍 [DEBUG DOCUMENTS] Starting investigation...')
    console.log(`  Client ID: ${clientId}`)

    // 1. Total de documentos na tabela (sem filtros)
    const { data: allDocs, count: totalCount } = await supabaseAny
      .from('documents')
      .select('*', { count: 'exact', head: false })
      .limit(5)

    console.log(`\n📊 Total documents in table: ${totalCount}`)

    // 2. Documentos deste cliente (com original_file_url)
    const { data: clientDocsWithUrl, count: clientCountWithUrl } = await supabaseAny
      .from('documents')
      .select('id, client_id, original_file_url, original_file_path, metadata', { count: 'exact', head: false })
      .eq('client_id', clientId)
      .not('original_file_url', 'is', null)
      .limit(10)

    console.log(`\n📄 Client docs WITH original_file_url: ${clientCountWithUrl}`)

    // 3. Documentos deste cliente (todos, incluindo sem URL)
    const { data: allClientDocs, count: allClientCount } = await supabaseAny
      .from('documents')
      .select('id, client_id, original_file_url, original_file_path, metadata, content', { count: 'exact', head: false })
      .eq('client_id', clientId)
      .limit(10)

    console.log(`\n📄 ALL client docs (with/without URL): ${allClientCount}`)

    // 4. Contar arquivos únicos (por URL)
    const uniqueUrls = new Set(
      allClientDocs
        ?.filter(d => d.original_file_url)
        .map(d => d.original_file_url) || []
    )
    const uniqueFilesCount = uniqueUrls.size

    console.log(`\n📁 Unique files (distinct URLs): ${uniqueFilesCount}`)

    // 5. Verificar se há documentos sem original_file_url
    const { count: docsWithoutUrl } = await supabaseAny
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .is('original_file_url', null)

    console.log(`\n⚠️  Docs WITHOUT original_file_url: ${docsWithoutUrl}`)

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
    console.error('[DEBUG DOCUMENTS] ❌ Error:', errorMessage)

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

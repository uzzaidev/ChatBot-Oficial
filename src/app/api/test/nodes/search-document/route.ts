/**
 * Test Endpoint: Search Document in Knowledge
 *
 * GET /api/test/nodes/search-document?query=catalogo&type=catalog&clientId=xxx
 *
 * Tests the searchDocumentInKnowledge node with various queries
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchDocumentInKnowledge } from '@/nodes/searchDocumentInKnowledge'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query params
    const query = searchParams.get('query') || 'catálogo'
    const documentType = searchParams.get('type') || undefined
    const clientId = searchParams.get('clientId') || process.env.TEST_CLIENT_ID
    const threshold = searchParams.get('threshold')
      ? parseFloat(searchParams.get('threshold')!)
      : 0.7
    const maxResults = searchParams.get('maxResults')
      ? parseInt(searchParams.get('maxResults')!)
      : 5

    if (!clientId) {
      return NextResponse.json(
        {
          error: 'Missing clientId parameter or TEST_CLIENT_ID env var',
          usage: 'GET /api/test/nodes/search-document?query=catálogo&type=catalog&clientId=xxx'
        },
        { status: 400 }
      )
    }


    // Call the node
    const startTime = Date.now()
    const searchResult = await searchDocumentInKnowledge({
      query,
      clientId,
      documentType,
      searchThreshold: threshold,
      maxResults
    })
    const duration = Date.now() - startTime

    const { results, metadata } = searchResult


    // Format response
    return NextResponse.json({
      success: true,
      query,
      documentType: documentType || 'any',
      threshold,
      maxResults,
      duration: `${duration}ms`,
      metadata: {
        totalDocumentsInBase: metadata.totalDocumentsInBase,
        chunksFound: metadata.chunksFound,
        uniqueDocumentsFound: metadata.uniqueDocumentsFound,
        threshold: metadata.threshold
      },
      resultsCount: results.length,
      results: results.map((doc) => ({
        filename: doc.filename,
        documentType: doc.documentType,
        similarity: (doc.similarity * 100).toFixed(1) + '%',
        originalFileUrl: doc.originalFileUrl,
        originalMimeType: doc.originalMimeType,
        originalFileSize: `${(doc.originalFileSize / 1024).toFixed(1)} KB`,
        preview: doc.preview.substring(0, 100) + '...'
      }))
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        success: false,
        error: errorMessage
      },
      { status: 500 }
    )
  }
}

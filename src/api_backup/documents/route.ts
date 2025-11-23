/**
 * API Endpoint: List Documents
 *
 * GET /api/documents
 *
 * Returns list of documents uploaded by the current client.
 * Documents are grouped by filename (chunks are counted).
 *
 * Multi-tenant: Only returns documents for user's client_id.
 *
 * Query params:
 * - documentType (optional): Filter by type ('catalog', 'manual', etc.)
 * - limit (optional): Max results (default: 100)
 *
 * Response:
 * - 200: List of documents
 * - 401: Unauthorized
 * - 500: Server error
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { listDocuments } from '@/nodes/processDocumentWithChunking'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Get user's client_id
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('client_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.client_id) {
      return NextResponse.json(
        { error: 'User profile not found or missing client_id' },
        { status: 403 }
      )
    }

    const clientId = profile.client_id

    // 3. Parse query params
    const { searchParams } = new URL(request.url)
    const documentType = searchParams.get('documentType') || undefined
    const limit = parseInt(searchParams.get('limit') || '100', 10)

    if (documentType) {
    }

    // 4. Fetch documents
    const documents = await listDocuments(clientId, {
      documentType,
      limit,
    })


    // 5. Return documents
    return NextResponse.json({
      documents,
      total: documents.length,
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[ListDocuments] ❌ Error:', errorMessage)

    return NextResponse.json(
      { error: `Failed to list documents: ${errorMessage}` },
      { status: 500 }
    )
  }
}

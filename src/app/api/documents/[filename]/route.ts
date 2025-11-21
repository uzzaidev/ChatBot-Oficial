/**
 * API Endpoint: Delete Document
 *
 * DELETE /api/documents/[filename]
 *
 * Deletes all chunks of a document by filename.
 * Multi-tenant: Only deletes documents for user's client_id.
 *
 * Response:
 * - 200: Document deleted successfully
 * - 401: Unauthorized
 * - 404: Document not found
 * - 500: Server error
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { deleteDocuments } from '@/nodes/processDocumentWithChunking'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const { filename } = params

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

    // 3. Decode filename (URL-encoded)
    const decodedFilename = decodeURIComponent(filename)

    // 4. Delete all chunks of this document
    const deletedCount = await deleteDocuments({
      clientId,
      filename: decodedFilename,
    })

    if (deletedCount === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }


    // 5. Return success
    return NextResponse.json({
      success: true,
      filename: decodedFilename,
      deletedChunks: deletedCount,
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[DeleteDocument] ❌ Error:', errorMessage)

    return NextResponse.json(
      { error: `Failed to delete document: ${errorMessage}` },
      { status: 500 }
    )
  }
}

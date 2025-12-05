import { NextRequest, NextResponse } from 'next/server'
import { getClientIdFromSession } from '@/lib/supabase-server'
import { query } from '@/lib/postgres'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

interface DeleteMessageRequest {
  messageId: string
  mediaUrl?: string // Optional: URL of media to delete from storage
}

/**
 * POST /api/commands/delete-message
 *
 * Deletes a message from the database and optionally removes media from storage
 *
 * Request body:
 * - messageId: Database message ID
 * - mediaUrl: Optional URL of media to delete from Supabase Storage
 */
export async function POST(request: NextRequest) {
  try {
    // 🔐 Get client_id from authenticated session
    const clientId = await getClientIdFromSession(request as any)

    if (!clientId) {
      return NextResponse.json(
        { error: 'Unauthorized - client_id not found in session' },
        { status: 401 }
      )
    }

    const body = (await request.json()) as DeleteMessageRequest
    const { messageId, mediaUrl } = body

    // Validation
    if (!messageId) {
      return NextResponse.json(
        { error: 'messageId is required' },
        { status: 400 }
      )
    }

    // Delete from n8n_chat_histories table (where messages are stored)
    // 🔐 SECURITY: Also filter by client_id to ensure user can only delete their own messages
    const result = await query(
      `DELETE FROM n8n_chat_histories 
       WHERE id = $1 AND client_id = $2
       RETURNING id`,
      [messageId, clientId]
    )

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Message not found or not authorized to delete' },
        { status: 404 }
      )
    }

    // Delete media from Supabase Storage if mediaUrl is provided
    let mediaDeleted = false
    if (mediaUrl) {
      try {
        // Extract the file path from the URL
        // URL format: https://xxx.supabase.co/storage/v1/object/public/bucket-name/path/to/file
        const urlObj = new URL(mediaUrl)
        const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/)
        
        if (pathMatch) {
          const bucketName = pathMatch[1]
          const filePath = pathMatch[2]

          const supabase = createServerClient()
          const { error: storageError } = await supabase.storage
            .from(bucketName)
            .remove([filePath])

          if (storageError) {
            // Don't fail the request if storage deletion fails
          } else {
            mediaDeleted = true
          }
        } else {
          // Could not parse Supabase Storage URL format - non-critical
        }
      } catch (storageErr) {
        // Don't fail the request if storage deletion fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Message deleted successfully',
      data: {
        messageId,
        mediaDeleted,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        error: 'Failed to delete message',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}

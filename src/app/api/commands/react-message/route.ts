import { NextRequest, NextResponse } from 'next/server'
import { getClientIdFromSession } from '@/lib/supabase-server'
import axios from 'axios'

export const dynamic = 'force-dynamic'

interface ReactMessageRequest {
  phone: string
  messageId: string
  emoji: string // Empty string to remove reaction
}

/**
 * POST /api/commands/react-message
 *
 * Sends a reaction to a WhatsApp message via Meta API
 *
 * Request body:
 * - phone: Recipient phone number
 * - messageId: WhatsApp message ID (wamid.xxx format) - stored in message.metadata.wamid
 * - emoji: Emoji to react with (empty string to remove reaction)
 *
 * The wamid is stored in the database when messages are received via WhatsApp webhook.
 * It is returned in the messages API response via metadata.wamid field.
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

    const body = (await request.json()) as ReactMessageRequest
    const { phone, messageId, emoji } = body

    // Validation
    if (!phone || !messageId) {
      return NextResponse.json(
        { error: 'phone and messageId are required' },
        { status: 400 }
      )
    }

    // Validate that messageId looks like a WhatsApp message ID (wamid format)
    // wamid format: wamid.HBgLxxxxxx... (starts with "wamid.")
    if (!messageId.startsWith('wamid.')) {
      return NextResponse.json(
        { 
          error: 'Invalid messageId format',
          details: 'Expected WhatsApp message ID (wamid.xxx format). The current message ID appears to be a database ID.',
        },
        { status: 400 }
      )
    }

    // Get client config
    const { getClientConfig } = await import('@/lib/config')
    const config = await getClientConfig(clientId)

    if (!config) {
      return NextResponse.json(
        { error: 'Client configuration not found' },
        { status: 404 }
      )
    }

    const META_API_VERSION = 'v18.0'
    const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`

    // Send reaction via Meta WhatsApp API
    const response = await axios.post(
      `${META_BASE_URL}/${config.apiKeys.metaPhoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'reaction',
        reaction: {
          message_id: messageId,
          emoji: emoji || '', // Empty string removes reaction
        },
      },
      {
        headers: {
          Authorization: `Bearer ${config.apiKeys.metaAccessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    return NextResponse.json({
      success: true,
      message: emoji ? 'Reaction sent successfully' : 'Reaction removed successfully',
      data: {
        messageId: response.data?.messages?.[0]?.id,
        phone,
        emoji,
      },
    })
  } catch (error) {
    console.error('[REACT-MESSAGE API] Error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        error: 'Failed to send reaction',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}

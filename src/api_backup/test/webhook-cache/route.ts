import { NextRequest, NextResponse } from 'next/server'
import { getRecentWebhookMessages } from '@/lib/webhookCache'

export const dynamic = 'force-dynamic'

/**
 * GET /api/test/webhook-cache
 * Debug endpoint para ver o que está no cache
 */
export async function GET(request: NextRequest) {
  const messages = getRecentWebhookMessages()
  
  return NextResponse.json({
    success: true,
    count: messages.length,
    messages: messages,
    cache_info: {
      max_messages: 20,
      current_count: messages.length,
      is_empty: messages.length === 0
    }
  })
}

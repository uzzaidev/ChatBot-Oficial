/**
 * API Route: Mark Conversation as Read
 * 
 * POST /api/conversations/mark-read
 * 
 * Updates last_read_at timestamp in clientes_whatsapp table
 * to mark a conversation as read by the current user.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface MarkReadRequestBody {
  phone: string
}

export async function POST(request: NextRequest) {
  try {
    const body: MarkReadRequestBody = await request.json()
    const { phone } = body

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Get authenticated user and their client_id
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get client_id from user_profiles or user_metadata
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('client_id')
      .eq('id', user.id)
      .single()

    const clientId = profile?.client_id || user.user_metadata?.client_id

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID not found for user' },
        { status: 400 }
      )
    }

    console.log('👁️ [mark-read] Marking conversation as read:', { phone, clientId })

    // Update last_read_at in clientes_whatsapp
    const { data, error } = await supabase
      .from('clientes_whatsapp')
      .update({ last_read_at: new Date().toISOString() })
      .eq('telefone', phone)
      .select()

    if (error) {
      console.error('❌ [mark-read] Error updating last_read_at:', error)
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ [mark-read] No conversation found for phone:', phone)
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    console.log('✅ [mark-read] Successfully marked as read:', data[0])

    return NextResponse.json({
      success: true,
      data: {
        phone,
        last_read_at: data[0].last_read_at,
      },
    })
  } catch (error) {
    console.error('❌ [mark-read] Unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

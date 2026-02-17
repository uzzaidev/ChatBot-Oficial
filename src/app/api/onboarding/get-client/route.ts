import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const buildNotFoundResponse = () =>
  NextResponse.json({ error: 'Client not found or not in pending setup status' }, { status: 404 })

const buildClientIdMissingResponse = () =>
  NextResponse.json({ error: 'client_id is required' }, { status: 400 })

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('client_id')

    if (!clientId?.trim()) {
      return buildClientIdMissingResponse()
    }

    const supabase = createServiceClient()
    const supabaseAny = supabase as any

    const { data: client, error } = await supabaseAny
      .from('clients')
      .select('id, name, meta_display_phone, status')
      .eq('id', clientId)
      .eq('status', 'pending_setup')
      .single()

    if (error || !client) {
      return buildNotFoundResponse()
    }

    return NextResponse.json({
      id: client.id,
      name: client.name,
      meta_display_phone: client.meta_display_phone ?? null,
      status: client.status,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 })
  }
}

// inline-review: ok

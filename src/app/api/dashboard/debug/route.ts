import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * Dashboard Debug API
 *
 * GET /api/dashboard/debug
 *
 * Verifica se há dados nas tabelas e retorna informações de debug
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Get user and client_id
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized', details: userError }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('client_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.client_id) {
      return NextResponse.json({
        error: 'Client ID not found',
        details: profileError,
        userId: user.id
      }, { status: 404 })
    }

    const clientId = profile.client_id
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)

    // 1. Check conversations
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('client_id', clientId)
      .limit(5)

    // 2. Check messages
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('client_id', clientId)
      .limit(5)

    // 3. Check usage_logs
    const { data: usage, error: usageError } = await supabase
      .from('usage_logs')
      .select('*')
      .eq('client_id', clientId)
      .limit(5)

    // 4. Check clientes_whatsapp
    const { data: clients, error: clientsError } = await supabase
      .from('clientes_whatsapp')
      .select('*')
      .eq('client_id', clientId)
      .limit(5)

    // Count totals
    const { count: convCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)

    const { count: msgCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)

    const { count: usageCount } = await supabase
      .from('usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)

    const { count: clientsCount } = await supabase
      .from('clientes_whatsapp')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)

    return NextResponse.json({
      success: true,
      clientId,
      userId: user.id,
      counts: {
        conversations: convCount || 0,
        messages: msgCount || 0,
        usage_logs: usageCount || 0,
        clientes_whatsapp: clientsCount || 0,
      },
      samples: {
        conversations: conversations || [],
        messages: messages || [],
        usage_logs: usage || [],
        clientes_whatsapp: clients || [],
      },
      errors: {
        conversations: convError,
        messages: msgError,
        usage_logs: usageError,
        clientes_whatsapp: clientsError,
      },
      startDate: startDate.toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch debug data', details: error },
      { status: 500 }
    )
  }
}

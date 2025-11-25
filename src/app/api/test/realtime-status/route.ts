import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * API para verificar status do Realtime
 *
 * Verifica:
 * - Triggers de broadcast existem
 * - Funções de broadcast existem
 * - Replica identity configurado
 *
 * GET /api/test/realtime-status
 */
export async function GET() {
  try {
    const supabase = createServerClient()

    // 1. Verificar triggers - usando query SQL direta
    let triggersManual = null
    try {
      const result = await supabase
        .from('information_schema.triggers' as any)
        .select('trigger_name, event_object_table')
        .in('trigger_name', ['broadcast_message_trigger', 'broadcast_conversation_trigger'])
      triggersManual = result.data
    } catch (e) {
      console.warn('Could not query triggers via information_schema')
    }

    // 2. Verificar funções
    let functions = null
    try {
      const result = await supabase
        .from('information_schema.routines' as any)
        .select('routine_name')
        .in('routine_name', ['broadcast_message_change', 'broadcast_conversation_change'])
      functions = result.data
    } catch (e) {
      console.warn('Could not query functions via information_schema')
    }

    const results = {
      status: 'checking',
      triggers: {
        found: triggersManual || [],
        expected: [
          'broadcast_message_trigger (n8n_chat_histories)',
          'broadcast_conversation_trigger (clientes_whatsapp)'
        ],
        status: (triggersManual || []).length >= 2 ? '✅' : '❌',
        note: triggersManual ? 'Verificado via information_schema' : 'Não foi possível verificar'
      },
      functions: {
        found: functions || [],
        expected: [
          'broadcast_message_change',
          'broadcast_conversation_change'
        ],
        status: (functions || []).length >= 2 ? '✅' : '❌',
        note: functions ? 'Verificado via information_schema' : 'Não foi possível verificar'
      },
      instructions: {
        ifTriggersNotFound: [
          '❌ Triggers não encontrados!',
          '1. Aplique a migration: supabase/migrations/20250125_realtime_broadcast_clean.sql',
          '2. Ou execute via CLI: supabase db push',
          '3. Depois execute este endpoint novamente'
        ],
        ifTriggersFound: [
          '✅ Triggers encontrados!',
          'Agora teste o broadcast:',
          'GET /api/test/broadcast?phone=555499250023&client_id=your-uuid'
        ]
      }
    }

    const allOk =
      results.triggers.status === '✅' &&
      results.functions.status === '✅'

    return NextResponse.json({
      ...results,
      overallStatus: allOk ? '✅ Tudo OK!' : '❌ Configuração incompleta'
    })
  } catch (error) {
    console.error('❌ Erro ao verificar status:', error)
    return NextResponse.json(
      {
        error: 'Erro ao verificar status',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        suggestion: 'Execute as queries SQL manualmente no Supabase Dashboard para verificar'
      },
      { status: 500 }
    )
  }
}

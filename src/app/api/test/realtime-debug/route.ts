import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Endpoint de diagnóstico avançado para Realtime
 *
 * Testa múltiplas configurações e fornece informações detalhadas
 */
export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    checks: [],
  }

  // 1. Verificar variáveis de ambiente
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  diagnostics.checks.push({
    name: 'Environment Variables',
    status: supabaseUrl && anonKey ? 'PASS' : 'FAIL',
    details: {
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? '✓ Set' : '✗ Missing',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey ? '✓ Set' : '✗ Missing',
      SUPABASE_SERVICE_ROLE_KEY: serviceKey ? '✓ Set' : '✗ Missing',
    },
  })

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({
      success: false,
      error: 'Missing environment variables',
      diagnostics,
    })
  }

  try {
    // 2. Criar cliente com ANON key
    const supabaseAnon = createClient(supabaseUrl, anonKey)

    // 3. Testar conexão básica (REST API)
    console.log('🧪 Testing REST API connection...')
    const { data: testData, error: testError } = await supabaseAnon
      .from('n8n_chat_histories')
      .select('id')
      .limit(1)

    diagnostics.checks.push({
      name: 'REST API Connection',
      status: testError ? 'FAIL' : 'PASS',
      details: {
        error: testError?.message || null,
        canQuery: !testError,
      },
    })

    // 4. Testar Realtime com configurações detalhadas
    console.log('🧪 Testing Realtime connection...')

    let realtimeStatus = 'PENDING'
    let realtimeError: any = null
    let subscriptionDetails: any = {}

    const testPromise = new Promise<void>((resolve) => {
      const channel = supabaseAnon
        .channel('diagnostic-test', {
          config: {
            broadcast: { self: false },
            presence: { key: '' },
          },
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'n8n_chat_histories',
          },
          (payload) => {
            console.log('✅ Realtime event received:', payload)
            subscriptionDetails.receivedEvent = true
          }
        )
        .subscribe((status, err) => {
          console.log(`📡 Realtime status: ${status}`, err || '')
          realtimeStatus = status
          realtimeError = err

          subscriptionDetails.lastStatus = status
          subscriptionDetails.lastError = err

          if (status === 'SUBSCRIBED') {
            console.log('✅ Realtime SUBSCRIBED successfully')
            setTimeout(() => {
              supabaseAnon.removeChannel(channel)
              resolve()
            }, 2000)
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.error(`❌ Realtime ${status}:`, err)
            supabaseAnon.removeChannel(channel)
            resolve()
          }
        })

      // Timeout de 10s
      setTimeout(() => {
        if (realtimeStatus === 'PENDING') {
          console.error('⏱️ Realtime timeout')
          supabaseAnon.removeChannel(channel)
          resolve()
        }
      }, 10000)
    })

    await testPromise

    diagnostics.checks.push({
      name: 'Realtime Connection',
      status: realtimeStatus === 'SUBSCRIBED' ? 'PASS' : 'FAIL',
      details: {
        finalStatus: realtimeStatus,
        error: realtimeError,
        ...subscriptionDetails,
      },
    })

    // 5. Verificar RLS policies (usando service key)
    if (serviceKey) {
      console.log('🧪 Checking RLS policies...')
      const supabaseService = createClient(supabaseUrl, serviceKey)

      // Try to check RLS policies
      let policiesData = null
      let policiesQueryError = null

      try {
        const result = await supabaseService
          .from('pg_policies')
          .select('*')
          .in('tablename', ['n8n_chat_histories', 'clientes_whatsapp'])

        policiesData = result.data
        policiesQueryError = result.error
      } catch (e) {
        policiesQueryError = 'Cannot query pg_policies'
      }

      diagnostics.checks.push({
        name: 'RLS Policies',
        status: policiesData && policiesData.length > 0 ? 'PASS' : 'WARN',
        details: {
          policiesFound: policiesData?.length || 0,
          policies: policiesData || 'Unable to query',
          error: policiesQueryError,
        },
      })
    }

    // 6. Verificar replica identity (skip - não temos RPC function)
    diagnostics.checks.push({
      name: 'Replica Identity',
      status: 'SKIP',
      details: {
        message: 'Check via SQL: See 20250125_check_realtime_status.sql',
      },
    })

    // Resultado final
    const allPassed = diagnostics.checks.every((check: any) => check.status === 'PASS')
    const success = realtimeStatus === 'SUBSCRIBED'

    return NextResponse.json({
      success,
      summary: success
        ? '✅ Realtime is working!'
        : '❌ Realtime is NOT working',
      diagnostics,
      recommendations: !success ? [
        realtimeStatus === 'CLOSED' && 'Check if Realtime is enabled in Supabase Dashboard (API Settings)',
        realtimeError && 'Check browser console for WebSocket errors',
        !testError && 'REST API works, so credentials are valid',
        'Verify RLS policies allow SELECT for authenticated users',
        'Check Supabase logs: Dashboard > Logs > Realtime',
      ].filter(Boolean) : [],
    })
  } catch (error) {
    console.error('❌ Diagnostic error:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      diagnostics,
    }, { status: 500 })
  }
}

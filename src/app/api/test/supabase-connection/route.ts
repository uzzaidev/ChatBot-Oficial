import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const results: any = {
    timestamp: new Date().toISOString(),
    environment: {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
    },
    tests: []
  }

  try {
    // Test 1: Create client
    const clientStart = Date.now()
    const supabase = createServerClient()
    const clientTime = Date.now() - clientStart
    results.tests.push({
      name: 'Create Supabase Client',
      success: true,
      duration_ms: clientTime
    })

    // Test 2: Simple query to Clientes WhatsApp table
    const queryStart = Date.now()
    const { data, error, count } = await supabase
      .from('Clientes WhatsApp')
      .select('*', { count: 'exact', head: false })
      .limit(1)
    
    const queryTime = Date.now() - queryStart
    
    if (error) {
      results.tests.push({
        name: 'Query Clientes WhatsApp',
        success: false,
        duration_ms: queryTime,
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        }
      })
    } else {
      results.tests.push({
        name: 'Query Clientes WhatsApp',
        success: true,
        duration_ms: queryTime,
        rowCount: count,
        sampleData: data?.[0] ? {
          telefone: data[0].telefone,
          status: data[0].status
        } : null
      })
    }

    // Test 3: Health check with timeout
    const healthStart = Date.now()
    const healthPromise = supabase
      .from('Clientes WhatsApp')
      .select('telefone')
      .limit(1)
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout after 5s')), 5000)
    )

    try {
      await Promise.race([healthPromise, timeoutPromise])
      const healthTime = Date.now() - healthStart
      results.tests.push({
        name: 'Health Check (5s timeout)',
        success: true,
        duration_ms: healthTime
      })
    } catch (timeoutError: any) {
      const healthTime = Date.now() - healthStart
      results.tests.push({
        name: 'Health Check (5s timeout)',
        success: false,
        duration_ms: healthTime,
        error: timeoutError.message
      })
    }

    results.totalDuration_ms = Date.now() - startTime
    results.status = 'completed'

    return NextResponse.json(results, { status: 200 })

  } catch (error: any) {
    results.totalDuration_ms = Date.now() - startTime
    results.status = 'failed'
    results.criticalError = {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5)
    }

    return NextResponse.json(results, { status: 500 })
  }
}

/**
 * AI GATEWAY TEST ENDPOINT
 *
 * Test if AI Gateway is configured correctly
 * Makes a simple AI call and returns detailed telemetry
 */

import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai-gateway'
import { getSharedGatewayConfig, shouldUseGateway } from '@/lib/ai-gateway/config'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Get test client ID from query param or use first client
    const url = new URL(request.url)
    let testClientId = url.searchParams.get('clientId')

    if (!testClientId) {
      // Get first client from database
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, slug')
        .limit(1)
        .single()

      if (!clients) {
        return NextResponse.json(
          { error: 'No clients found in database. Create a client first.' },
          { status: 404 }
        )
      }

      testClientId = clients.id
    }

    console.log('[Test Gateway] Testing with client ID:', testClientId)

    // =====================================================
    // STEP 1: Check if gateway is enabled
    // =====================================================

    const useGateway = await shouldUseGateway(testClientId)

    if (!useGateway) {
      return NextResponse.json({
        success: false,
        error: 'Gateway not enabled',
        details: {
          message: 'AI Gateway is disabled for this client',
          clientId: testClientId,
          envVarEnabled: process.env.ENABLE_AI_GATEWAY === 'true',
          clientFlagEnabled: false,
        },
        suggestion: 'Enable AI Gateway: 1) Set ENABLE_AI_GATEWAY=true in .env, 2) Enable for client in database',
      })
    }

    // =====================================================
    // STEP 2: Check if shared config exists
    // =====================================================

    const config = await getSharedGatewayConfig()

    if (!config) {
      return NextResponse.json({
        success: false,
        error: 'No shared configuration found',
        details: {
          message: 'Gateway is enabled but no shared configuration exists',
          clientId: testClientId,
        },
        suggestion: 'Configure AI Gateway keys at /dashboard/ai-gateway/setup',
      })
    }

    console.log('[Test Gateway] Config found:', {
      hasGatewayKey: !!config.gatewayApiKey,
      hasOpenAI: !!config.providerKeys.openai,
      hasGroq: !!config.providerKeys.groq,
    })

    // =====================================================
    // STEP 3: Make test AI call
    // =====================================================

    const startTime = Date.now()

    const result = await callAI({
      clientId: testClientId,
      clientConfig: {
        id: testClientId,
        name: 'Test Client',
        slug: 'test',
        primaryModelProvider: 'openai',
        openaiModel: 'gpt-4o-mini',
      },
      messages: [
        { role: 'system', content: 'You are a helpful assistant. Respond in Portuguese.' },
        { role: 'user', content: 'Diga apenas "Olá Mundo" em uma frase curta.' },
      ],
      settings: {
        temperature: 0.7,
        maxTokens: 50,
      },
    })

    const totalTime = Date.now() - startTime

    // =====================================================
    // STEP 4: Check if usage was logged
    // =====================================================

    const { data: usageLogs, error: logsError } = await supabase
      .from('gateway_usage_logs')
      .select('*')
      .eq('client_id', testClientId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (logsError) {
      console.error('[Test Gateway] Error fetching logs:', logsError)
    }

    const lastLog = usageLogs && usageLogs.length > 0 ? usageLogs[0] : null

    // =====================================================
    // RETURN SUCCESS RESPONSE
    // =====================================================

    return NextResponse.json({
      success: true,
      message: 'AI Gateway is working correctly! 🎉',
      test: {
        clientId: testClientId,
        totalTimeMs: totalTime,
        timestamp: new Date().toISOString(),
      },
      response: {
        text: result.text,
        model: result.model,
        provider: result.provider,
      },
      telemetry: {
        wasCached: result.wasCached,
        wasFallback: result.wasFallback,
        fallbackReason: result.fallbackReason,
        latencyMs: result.latencyMs,
        requestId: result.requestId,
      },
      usage: {
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        totalTokens: result.usage.totalTokens,
        cachedTokens: result.usage.cachedTokens || 0,
      },
      logging: {
        wasLogged: !!lastLog,
        lastLogEntry: lastLog
          ? {
              id: lastLog.id,
              tokens: lastLog.total_tokens,
              costBRL: lastLog.cost_brl,
              wasCached: lastLog.was_cached,
              createdAt: lastLog.created_at,
            }
          : null,
      },
      configuration: {
        cacheEnabled: config.cacheEnabled,
        cacheTTLSeconds: config.cacheTTLSeconds,
        defaultFallbackChain: config.defaultFallbackChain,
      },
    })
  } catch (error: any) {
    console.error('[Test Gateway] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
        suggestion:
          'Check the error above. Common issues: 1) Invalid API keys, 2) Missing Vault secrets, 3) Network issues',
      },
      { status: 500 }
    )
  }
}

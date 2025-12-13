/**
 * AI Gateway Test Endpoint
 * 
 * POST /api/ai-gateway/test - Simulate a message and test the complete AI Gateway flow
 * 
 * This endpoint simulates receiving a WhatsApp message and tests:
 * - AI model selection
 * - Message processing through AI Gateway
 * - Cache functionality
 * - Usage tracking
 * - Analytics updates
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { callAI } from '@/lib/ai-gateway'

export const dynamic = 'force-dynamic'

interface TestRequest {
  clientId?: string
  prompt?: string
  provider?: string
  model?: string
  testCache?: boolean
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const testResults: any = {
    timestamp: new Date().toISOString(),
    tests: {},
    success: true,
    errors: [],
  }

  try {
    const body: TestRequest = await request.json()
    const supabase = createServerClient()

    // Use provided values or defaults
    const testPrompt = body.prompt || 'Hello! This is a test message. Please respond briefly.'
    let clientId = body.clientId
    
    // Step 0: Check Environment Configuration
    testResults.tests.environment = { status: 'testing' }
    const isGatewayEnabled = process.env.ENABLE_AI_GATEWAY === 'true'
    
    if (!isGatewayEnabled) {
      testResults.tests.environment = {
        status: 'failed',
        error: 'ENABLE_AI_GATEWAY environment variable is not set to "true"',
        fix: 'Add ENABLE_AI_GATEWAY=true to your .env.local file and restart the server',
        envVarValue: process.env.ENABLE_AI_GATEWAY || 'not set',
      }
      testResults.errors.push('Environment check failed: ENABLE_AI_GATEWAY must be set to "true"')
      testResults.success = false
    } else {
      testResults.tests.environment = {
        status: 'passed',
        message: 'ENABLE_AI_GATEWAY is correctly set to "true"',
      }
    }
    
    // Step 1: Get or create test client
    testResults.tests.client = { status: 'testing' }
    
    if (!clientId) {
      // Try to find a client with AI Gateway enabled
      const { data: clients, error: clientError } = await supabase
        .from('clients')
        .select('id, name, use_ai_gateway')
        .eq('use_ai_gateway', true)
        .limit(1)
      
      if (clientError) throw new Error(`Client fetch failed: ${clientError.message}`)
      
      if (clients && clients.length > 0) {
        clientId = clients[0].id
        testResults.tests.client = {
          status: 'passed',
          clientId,
          clientName: clients[0].name,
          useAiGateway: clients[0].use_ai_gateway,
        }
      } else {
        // Try any client
        const { data: anyClients } = await supabase
          .from('clients')
          .select('id, name, use_ai_gateway')
          .limit(1)
        
        if (anyClients && anyClients.length > 0) {
          clientId = anyClients[0].id
          testResults.tests.client = {
            status: 'warning',
            clientId,
            clientName: anyClients[0].name,
            useAiGateway: anyClients[0].use_ai_gateway,
            warning: 'Client found but use_ai_gateway is not enabled. Enable it in the database.',
          }
        } else {
          testResults.tests.client = {
            status: 'failed',
            error: 'No clients found in database. Create a client first.',
          }
          testResults.success = false
        }
      }
    } else {
      // Verify the provided client exists and check gateway status
      const { data: client } = await supabase
        .from('clients')
        .select('id, name, use_ai_gateway')
        .eq('id', clientId)
        .single()
      
      if (client) {
        testResults.tests.client = {
          status: client.use_ai_gateway ? 'passed' : 'warning',
          clientId: client.id,
          clientName: client.name,
          useAiGateway: client.use_ai_gateway,
          warning: !client.use_ai_gateway ? 'Client exists but use_ai_gateway is not enabled' : undefined,
        }
      }
    }

    // Step 2: Test Models API
    testResults.tests.models = { status: 'testing' }
    try {
      const { data: models, error: modelsError } = await supabase
        .from('ai_models_registry')
        .select('*')
        .eq('is_active', true)
        .limit(5)
      
      if (modelsError) throw modelsError
      
      testResults.tests.models = {
        status: 'passed',
        count: models?.length || 0,
        models: models?.map((m: any) => ({
          provider: m.provider,
          model: m.model_name,
          gateway_id: m.gateway_identifier,
        })) || [],
      }
    } catch (error: any) {
      testResults.tests.models = {
        status: 'failed',
        error: error.message,
      }
      testResults.errors.push(`Models test failed: ${error.message}`)
    }

    // Step 3: Test AI Gateway Call (if client exists)
    if (clientId) {
      testResults.tests.aiGateway = { status: 'testing' }
      
      try {
        // Get client config
        const { data: client, error: clientConfigError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', clientId)
          .single()
        
        if (clientConfigError) throw new Error(`Client config fetch failed: ${clientConfigError.message}`)
        
        // Make AI call
        const aiCallStart = Date.now()
        const response = await callAI({
          clientId,
          clientConfig: {
            id: client.id,
            name: client.name,
            slug: client.slug || 'test-client',
            primaryModelProvider: body.provider || client.primary_model_provider || 'openai',
            openaiModel: body.model || 'gpt-4o-mini',
            systemPrompt: 'You are a helpful assistant. Respond in Portuguese (Brazil).',
          },
          messages: [
            {
              role: 'user',
              content: testPrompt,
            },
          ],
        })
        const aiCallDuration = Date.now() - aiCallStart
        
        testResults.tests.aiGateway = {
          status: 'passed',
          response: {
            text: response.text.substring(0, 200) + (response.text.length > 200 ? '...' : ''),
            model: response.model,
            provider: response.provider,
            wasCached: response.wasCached,
            wasFallback: response.wasFallback,
            latencyMs: response.latencyMs,
            usage: response.usage,
          },
          durationMs: aiCallDuration,
        }
      } catch (error: any) {
        testResults.tests.aiGateway = {
          status: 'failed',
          error: error.message,
        }
        testResults.errors.push(`AI Gateway test failed: ${error.message}`)
        testResults.success = false
      }
    }

    // Step 4: Test Cache (if enabled and second call requested)
    if (body.testCache && clientId) {
      testResults.tests.cache = { status: 'testing' }
      
      try {
        // Make the same call again to test cache
        const cacheCallStart = Date.now()
        const { data: client } = await supabase
          .from('clients')
          .select('*')
          .eq('id', clientId)
          .single()
        
        const cachedResponse = await callAI({
          clientId,
          clientConfig: {
            id: client.id,
            name: client.name,
            slug: client.slug || 'test-client',
            primaryModelProvider: body.provider || client.primary_model_provider || 'openai',
            openaiModel: body.model || 'gpt-4o-mini',
            systemPrompt: 'You are a helpful assistant. Respond in Portuguese (Brazil).',
          },
          messages: [
            {
              role: 'user',
              content: testPrompt,
            },
          ],
        })
        const cacheCallDuration = Date.now() - cacheCallStart
        
        testResults.tests.cache = {
          status: 'passed',
          wasCached: cachedResponse.wasCached,
          latencyMs: cachedResponse.latencyMs,
          durationMs: cacheCallDuration,
          improvement: testResults.tests.aiGateway?.response?.latencyMs 
            ? `${Math.round((1 - cachedResponse.latencyMs / testResults.tests.aiGateway.response.latencyMs) * 100)}%`
            : 'N/A',
        }
      } catch (error: any) {
        testResults.tests.cache = {
          status: 'failed',
          error: error.message,
        }
        testResults.errors.push(`Cache test failed: ${error.message}`)
      }
    }

    // Step 5: Check Usage Logs
    testResults.tests.usageLogs = { status: 'testing' }
    try {
      const { data: recentLogs, error: logsError } = await supabase
        .from('gateway_usage_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (logsError) throw logsError
      
      testResults.tests.usageLogs = {
        status: 'passed',
        recentCount: recentLogs?.length || 0,
        mostRecent: recentLogs && recentLogs.length > 0 ? {
          provider: recentLogs[0].provider,
          model: recentLogs[0].model_name,
          tokens: recentLogs[0].total_tokens,
          wasCached: recentLogs[0].was_cached,
          createdAt: recentLogs[0].created_at,
        } : null,
      }
    } catch (error: any) {
      testResults.tests.usageLogs = {
        status: 'warning',
        error: error.message,
      }
    }

    // Step 6: Check Budget Status (if client exists)
    if (clientId) {
      testResults.tests.budget = { status: 'testing' }
      try {
        const { data: budget, error: budgetError } = await supabase
          .from('client_budgets')
          .select('*')
          .eq('client_id', clientId)
          .single()
        
        if (budgetError && budgetError.code !== 'PGRST116') { // Not found is OK
          throw budgetError
        }
        
        testResults.tests.budget = {
          status: budget ? 'passed' : 'warning',
          configured: !!budget,
          details: budget ? {
            budgetType: budget.budget_type,
            limit: budget.budget_limit,
            currentUsage: budget.current_usage,
            usagePercentage: budget.usage_percentage,
            isPaused: budget.is_paused,
          } : null,
        }
      } catch (error: any) {
        testResults.tests.budget = {
          status: 'warning',
          error: error.message,
        }
      }
    }

    // Step 7: Test Analytics API
    testResults.tests.analytics = { status: 'testing' }
    try {
      const analyticsResponse = await fetch(
        `${request.nextUrl.origin}/api/ai-gateway/metrics?period=7d`,
        {
          headers: {
            'Cookie': request.headers.get('Cookie') || '',
          },
        }
      )
      
      if (!analyticsResponse.ok) {
        throw new Error(`Analytics API returned ${analyticsResponse.status}`)
      }
      
      const analyticsData = await analyticsResponse.json()
      
      testResults.tests.analytics = {
        status: 'passed',
        data: {
          totalRequests: analyticsData.totalRequests,
          totalCostBRL: analyticsData.totalCostBRL,
          cacheHitRate: analyticsData.cacheHitRate,
          averageLatencyMs: analyticsData.averageLatencyMs,
        },
      }
    } catch (error: any) {
      testResults.tests.analytics = {
        status: 'warning',
        error: error.message,
      }
    }

    // Calculate total duration
    testResults.totalDurationMs = Date.now() - startTime

    // Summary
    const passedTests = Object.values(testResults.tests).filter((t: any) => t.status === 'passed').length
    const failedTests = Object.values(testResults.tests).filter((t: any) => t.status === 'failed').length
    const warningTests = Object.values(testResults.tests).filter((t: any) => t.status === 'warning').length
    
    testResults.summary = {
      total: Object.keys(testResults.tests).length,
      passed: passedTests,
      failed: failedTests,
      warnings: warningTests,
      success: failedTests === 0,
    }

    testResults.success = failedTests === 0

    return NextResponse.json(testResults, {
      status: testResults.success ? 200 : 500,
    })
  } catch (error: any) {
    console.error('Error in AI Gateway test:', error)
    
    testResults.success = false
    testResults.errors.push(`Critical error: ${error.message}`)
    testResults.totalDurationMs = Date.now() - startTime
    
    return NextResponse.json(testResults, { status: 500 })
  }
}

// GET endpoint for test documentation
export async function GET(request: NextRequest) {
  const isGatewayEnabled = process.env.ENABLE_AI_GATEWAY === 'true'
  
  return NextResponse.json({
    endpoint: '/api/ai-gateway/test',
    description: 'Test endpoint for AI Gateway functionality',
    method: 'POST',
    prerequisites: {
      environmentVariable: {
        name: 'ENABLE_AI_GATEWAY',
        required: true,
        currentValue: process.env.ENABLE_AI_GATEWAY || 'not set',
        isConfigured: isGatewayEnabled,
        instructions: 'Add ENABLE_AI_GATEWAY=true to your .env.local file and restart the server',
      },
      clientConfiguration: {
        required: true,
        instructions: 'Ensure at least one client has use_ai_gateway=true in the database',
      },
      gatewaySetup: {
        required: true,
        instructions: 'Configure API keys at /dashboard/ai-gateway/setup',
      },
    },
    usage: {
      basic: {
        description: 'Run basic test with defaults',
        body: {},
      },
      withPrompt: {
        description: 'Test with custom prompt',
        body: {
          prompt: 'Your test prompt here',
        },
      },
      withCache: {
        description: 'Test cache by making two identical calls',
        body: {
          prompt: 'Test prompt',
          testCache: true,
        },
      },
      withProvider: {
        description: 'Test specific provider and model',
        body: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          prompt: 'Test prompt',
        },
      },
      withClient: {
        description: 'Test with specific client',
        body: {
          clientId: 'uuid-here',
          prompt: 'Test prompt',
        },
      },
    },
    testsPerformed: [
      '0. Environment - Checks ENABLE_AI_GATEWAY=true',
      '1. Client Configuration - Validates client exists and has gateway enabled',
      '2. Models Registry - Lists available AI models',
      '3. AI Gateway Call - Makes actual AI request',
      '4. Cache Test - Tests cache hit (if testCache=true)',
      '5. Usage Logs - Checks request was logged',
      '6. Budget Status - Checks client budget status',
      '7. Analytics API - Verifies metrics endpoint',
    ],
    example: {
      curl: `curl -X POST ${request.nextUrl.origin}/api/ai-gateway/test \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "Hello, test!", "testCache": true}'`,
    },
  })
}

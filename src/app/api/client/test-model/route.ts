import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase-server'
import { callAI } from '@/lib/ai-gateway'
import type { CoreMessage } from 'ai'

export const dynamic = 'force-dynamic'

/**
 * POST /api/client/test-model
 *
 * 🚀 MIGRATED TO AI GATEWAY
 *
 * Testa se um modelo de IA está configurado corretamente através do AI Gateway
 *
 * Body:
 * {
 *   provider: 'openai' | 'groq',
 *   model: string
 * }
 *
 * Retorna:
 * {
 *   success: true,
 *   message: string,
 *   latency_ms: number,
 *   response: string
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { provider, model } = body

    if (!provider || !model) {
      return NextResponse.json(
        { error: 'provider e model são obrigatórios' },
        { status: 400 }
      )
    }

    if (provider !== 'openai' && provider !== 'groq') {
      return NextResponse.json(
        { error: 'provider deve ser "openai" ou "groq"' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient(request as any)

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Buscar client_id do usuário
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('client_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
    }

    const clientId = profile.client_id

    // Mensagem de teste simples
    const testMessages: CoreMessage[] = [
      {
        role: 'system',
        content: 'Você é um assistente de teste. Responda de forma concisa.',
      },
      {
        role: 'user',
        content: 'Responda apenas: "Teste OK"',
      },
    ]

    try {
      // 🚀 Test via AI Gateway (uses shared config)
      const response = await callAI({
        clientId,
        clientConfig: {
          id: clientId,
          name: 'test-model',
          slug: 'test-model',
          primaryModelProvider: provider,
          openaiModel: provider === 'openai' ? model : undefined,
          groqModel: provider === 'groq' ? model : undefined,
          systemPrompt: '',
        },
        messages: testMessages,
        settings: {
          temperature: 0.5,
          maxTokens: 50,
        },
        stream: false,
        skipUsageLogging: true, // Don't log test calls
      })

      const endTime = Date.now()
      const latency = endTime - startTime

      return NextResponse.json({
        success: true,
        message: `✅ Modelo ${provider.toUpperCase()} funcionando corretamente via Gateway!`,
        latency_ms: latency,
        response: response.text,
        model,
        provider,
        usage: {
          prompt_tokens: response.usage.promptTokens,
          completion_tokens: response.usage.completionTokens,
          total_tokens: response.usage.totalTokens,
        },
      })
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error'

      // Identificar tipo de erro
      if (errorMessage.includes('invalid_api_key') || errorMessage.includes('Incorrect API key') || errorMessage.includes('Invalid API Key')) {
        return NextResponse.json({
          success: false,
          error: 'API Key inválida',
          message: `A API Key do ${provider.toUpperCase()} está incorreta. Verifique a configuração do Gateway.`,
        })
      }

      if (errorMessage.includes('model_not_found') || errorMessage.includes('does not exist')) {
        return NextResponse.json({
          success: false,
          error: 'Modelo não encontrado',
          message: `O modelo "${model}" não existe ou não está disponível no ${provider.toUpperCase()}.`,
        })
      }

      if (errorMessage.includes('insufficient_quota') || errorMessage.includes('quota')) {
        return NextResponse.json({
          success: false,
          error: 'Quota excedida',
          message: `Sua conta ${provider.toUpperCase()} atingiu o limite de uso. Verifique seu billing.`,
        })
      }

      if (errorMessage.includes('rate_limit')) {
        return NextResponse.json({
          success: false,
          error: 'Rate limit',
          message: 'Muitas requisições. Aguarde alguns segundos e tente novamente.',
        })
      }

      return NextResponse.json({
        success: false,
        error: 'Erro ao testar modelo',
        message: errorMessage,
      })
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'

    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno',
        message: errorMessage,
      },
      { status: 500 }
    )
  }
}

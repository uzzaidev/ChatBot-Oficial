import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase-server'
import { generateChatCompletion } from '@/lib/groq'
import { generateChatCompletionOpenAI } from '@/lib/openai'
import { getClientSecrets } from '@/lib/vault'

export const dynamic = 'force-dynamic'

/**
 * POST /api/client/test-model
 *
 * Testa se um modelo de IA está configurado corretamente
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

    const supabase = createRouteHandlerClient()

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

    // Buscar client para pegar secret IDs
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('meta_access_token_secret_id, meta_verify_token_secret_id, openai_api_key_secret_id, groq_api_key_secret_id')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // Descriptografar secrets do Vault (apenas OpenAI e Groq necessários para teste)
    const secrets = await getClientSecrets(supabase, {
      meta_access_token_secret_id: client.meta_access_token_secret_id,
      meta_verify_token_secret_id: client.meta_verify_token_secret_id,
      openai_api_key_secret_id: client.openai_api_key_secret_id,
      groq_api_key_secret_id: client.groq_api_key_secret_id,
    })

    // Mensagem de teste simples
    const testMessages = [
      {
        role: 'system' as const,
        content: 'Você é um assistente de teste. Responda de forma concisa.',
      },
      {
        role: 'user' as const,
        content: 'Responda apenas: "Teste OK"',
      },
    ]

    let response: any

    // Testar provider específico
    if (provider === 'openai') {
      if (!secrets.openaiApiKey) {
        return NextResponse.json(
          {
            success: false,
            error: 'API Key da OpenAI não configurada no Vault',
            message: 'Configure sua API Key em Segredos & Variáveis',
          },
          { status: 400 }
        )
      }

      try {
        response = await generateChatCompletionOpenAI(
          testMessages,
          undefined, // sem tools
          secrets.openaiApiKey,
          {
            model,
            temperature: 0.5,
            max_tokens: 50,
          }
        )
      } catch (error: any) {
        const errorMessage = error.message || 'Unknown error'
        
        // Identificar tipo de erro
        if (errorMessage.includes('invalid_api_key') || errorMessage.includes('Incorrect API key')) {
          return NextResponse.json({
            success: false,
            error: 'API Key inválida',
            message: 'A API Key da OpenAI está incorreta. Verifique em Segredos & Variáveis.',
          })
        }
        
        if (errorMessage.includes('model_not_found') || errorMessage.includes('does not exist')) {
          return NextResponse.json({
            success: false,
            error: 'Modelo não encontrado',
            message: `O modelo "${model}" não existe ou não está disponível na sua conta OpenAI.`,
          })
        }
        
        if (errorMessage.includes('insufficient_quota') || errorMessage.includes('quota')) {
          return NextResponse.json({
            success: false,
            error: 'Quota excedida',
            message: 'Sua conta OpenAI atingiu o limite de uso. Verifique seu billing.',
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
    } else {
      // Groq
      if (!secrets.groqApiKey) {
        return NextResponse.json(
          {
            success: false,
            error: 'API Key do Groq não configurada no Vault',
            message: 'Configure sua API Key em Segredos & Variáveis',
          },
          { status: 400 }
        )
      }

      try {
        response = await generateChatCompletion(
          testMessages,
          undefined, // sem tools
          secrets.groqApiKey,
          {
            model,
            temperature: 0.5,
            max_tokens: 50,
          }
        )
      } catch (error: any) {
        const errorMessage = error.message || 'Unknown error'
        
        // Identificar tipo de erro
        if (errorMessage.includes('invalid_api_key') || errorMessage.includes('Invalid API Key')) {
          return NextResponse.json({
            success: false,
            error: 'API Key inválida',
            message: 'A API Key do Groq está incorreta. Verifique em Segredos & Variáveis.',
          })
        }
        
        if (errorMessage.includes('model_not_found') || errorMessage.includes('does not exist')) {
          return NextResponse.json({
            success: false,
            error: 'Modelo não encontrado',
            message: `O modelo "${model}" não existe ou não está disponível no Groq.`,
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
    }

    const endTime = Date.now()
    const latency = endTime - startTime

    return NextResponse.json({
      success: true,
      message: `✅ Modelo ${provider.toUpperCase()} funcionando corretamente!`,
      latency_ms: latency,
      response: response.content,
      model,
      provider,
    })
  } catch (error) {
    console.error('[client/test-model] Erro:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao testar modelo',
        message: errorMessage,
      },
      { status: 500 }
    )
  }
}

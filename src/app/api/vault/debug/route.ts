import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/vault/debug
 *
 * Endpoint de debug para verificar se os secret_ids estão configurados corretamente
 * TEMPORARY - apenas para debugging, remover em produção
 */
export async function GET(request: NextRequest) {
  try {
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

    // Buscar client com TODOS os campos
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // Verificar se cada secret_id existe
    const secretChecks: Record<string, any> = {}

    // Meta Access Token
    if (client.meta_access_token_secret_id) {
      const { data, error } = await supabase.rpc('get_client_secret', {
        secret_id: client.meta_access_token_secret_id,
      })
      secretChecks.meta_access_token = {
        secret_id: client.meta_access_token_secret_id,
        exists: !error && data !== null,
        value_length: data?.length || 0,
        error: error?.message
      }
    } else {
      secretChecks.meta_access_token = { secret_id: null, exists: false }
    }

    // Meta Verify Token
    if (client.meta_verify_token_secret_id) {
      const { data, error } = await supabase.rpc('get_client_secret', {
        secret_id: client.meta_verify_token_secret_id,
      })
      secretChecks.meta_verify_token = {
        secret_id: client.meta_verify_token_secret_id,
        exists: !error && data !== null,
        value_length: data?.length || 0,
        error: error?.message
      }
    } else {
      secretChecks.meta_verify_token = { secret_id: null, exists: false }
    }

    // Meta App Secret
    if (client.meta_app_secret_secret_id) {
      const { data, error } = await supabase.rpc('get_client_secret', {
        secret_id: client.meta_app_secret_secret_id,
      })
      secretChecks.meta_app_secret = {
        secret_id: client.meta_app_secret_secret_id,
        exists: !error && data !== null,
        value_length: data?.length || 0,
        error: error?.message
      }
    } else {
      secretChecks.meta_app_secret = { secret_id: null, exists: false }
    }

    // OpenAI API Key
    if (client.openai_api_key_secret_id) {
      const { data, error } = await supabase.rpc('get_client_secret', {
        secret_id: client.openai_api_key_secret_id,
      })
      secretChecks.openai_api_key = {
        secret_id: client.openai_api_key_secret_id,
        exists: !error && data !== null,
        value_length: data?.length || 0,
        error: error?.message
      }
    } else {
      secretChecks.openai_api_key = { secret_id: null, exists: false }
    }

    // Groq API Key
    if (client.groq_api_key_secret_id) {
      const { data, error } = await supabase.rpc('get_client_secret', {
        secret_id: client.groq_api_key_secret_id,
      })
      secretChecks.groq_api_key = {
        secret_id: client.groq_api_key_secret_id,
        exists: !error && data !== null,
        value_length: data?.length || 0,
        error: error?.message
      }
    } else {
      secretChecks.groq_api_key = { secret_id: null, exists: false }
    }

    return NextResponse.json({
      client_id: clientId,
      client_name: client.name,
      client_slug: client.slug,
      secret_ids: {
        meta_access_token_secret_id: client.meta_access_token_secret_id,
        meta_verify_token_secret_id: client.meta_verify_token_secret_id,
        meta_app_secret_secret_id: client.meta_app_secret_secret_id,
        openai_api_key_secret_id: client.openai_api_key_secret_id,
        groq_api_key_secret_id: client.groq_api_key_secret_id,
      },
      secret_checks: secretChecks,
      meta_phone_number_id: client.meta_phone_number_id,
    })
  } catch (error) {
    console.error('[vault/debug] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar dados de debug' },
      { status: 500 }
    )
  }
}

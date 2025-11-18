import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * Mascara um secret mostrando apenas os últimos 4 caracteres
 * SECURITY: Nunca retornar secrets completos via API
 */
function maskSecret(secret: string | null | undefined): string {
  if (!secret || secret.length === 0) {
    return 'NOT_CONFIGURED'
  }
  if (secret === 'CONFIGURE_IN_SETTINGS') {
    return secret
  }
  // Mostrar apenas últimos 4 caracteres
  if (secret.length <= 4) {
    return '***'
  }
  return '***' + secret.slice(-4)
}

/**
 * GET /api/vault/secrets
 *
 * Retorna variáveis de ambiente (secrets) do cliente do usuário
 *
 * IMPORTANTE: Retorna valores MASCARADOS (últimos 4 caracteres) para segurança
 * Para configurar secrets, use PUT /api/vault/secrets
 *
 * Returns:
 * {
 *   client_id: string,
 *   slug: string,
 *   secrets: {
 *     meta_access_token: string (masked),
 *     meta_verify_token: string (masked),
 *     meta_phone_number_id: string,
 *     openai_api_key: string (masked),
 *     groq_api_key: string (masked),
 *     webhook_url: string (construído)
 *   },
 *   configured: {
 *     meta_access_token: boolean,
 *     meta_verify_token: boolean,
 *     meta_phone_number_id: boolean,
 *     openai_api_key: boolean,
 *     groq_api_key: boolean
 *   }
 * }
 */
export async function GET() {
  try {
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

    // Buscar client com secrets IDs
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select(
        'id, slug, meta_access_token_secret_id, meta_verify_token_secret_id, meta_app_secret_secret_id, meta_phone_number_id, openai_api_key_secret_id, groq_api_key_secret_id'
      )
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // Buscar secrets descriptografados do Vault
    const { data: metaAccessToken, error: metaAccessError } = await supabase.rpc(
      'get_client_secret',
      {
        secret_id: client.meta_access_token_secret_id,
      }
    )

    const { data: metaVerifyToken, error: metaVerifyError } = await supabase.rpc(
      'get_client_secret',
      {
        secret_id: client.meta_verify_token_secret_id,
      }
    )

    // SECURITY FIX (VULN-012): Buscar App Secret (diferente do Verify Token)
    const { data: metaAppSecret, error: metaAppError } = client.meta_app_secret_secret_id
      ? await supabase.rpc('get_client_secret', {
          secret_id: client.meta_app_secret_secret_id,
        })
      : { data: '', error: null }

    const { data: openaiApiKey, error: openaiError } = client.openai_api_key_secret_id
      ? await supabase.rpc('get_client_secret', {
          secret_id: client.openai_api_key_secret_id,
        })
      : { data: '', error: null }

    const { data: groqApiKey, error: groqError } = client.groq_api_key_secret_id
      ? await supabase.rpc('get_client_secret', {
          secret_id: client.groq_api_key_secret_id,
        })
      : { data: '', error: null }

    if (metaAccessError || metaVerifyError) {
      console.error('[vault/secrets] Erro ao descriptografar secrets:', {
        metaAccessError,
        metaVerifyError,
      })
      return NextResponse.json(
        { error: 'Erro ao buscar secrets do Vault' },
        { status: 500 }
      )
    }

    // Construir webhook URL com client_id
    const webhookUrl = `${process.env.WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://chat.luisfboff.com'}/api/webhook/${client.id}`

    // SECURITY FIX (VULN-009): Retornar secrets mascarados
    return NextResponse.json({
      client_id: client.id,
      slug: client.slug,
      secrets: {
        meta_access_token: maskSecret(metaAccessToken),
        meta_verify_token: maskSecret(metaVerifyToken),
        meta_app_secret: maskSecret(metaAppSecret), // SECURITY FIX (VULN-012)
        meta_phone_number_id: client.meta_phone_number_id || '',
        openai_api_key: maskSecret(openaiApiKey),
        groq_api_key: maskSecret(groqApiKey),
        webhook_url: webhookUrl,
      },
      configured: {
        meta_access_token: !!(metaAccessToken && metaAccessToken.length > 0),
        meta_verify_token: !!(metaVerifyToken && metaVerifyToken.length > 0),
        meta_app_secret: !!(metaAppSecret && metaAppSecret.length > 0), // SECURITY FIX (VULN-012)
        meta_phone_number_id: !!(client.meta_phone_number_id && client.meta_phone_number_id.length > 0),
        openai_api_key: !!(openaiApiKey && openaiApiKey.length > 0),
        groq_api_key: !!(groqApiKey && groqApiKey.length > 0),
      },
    })
  } catch (error) {
    console.error('[vault/secrets] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar secrets' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/vault/secrets
 *
 * Cria ou atualiza secret no Vault
 *
 * Body:
 * {
 *   key: 'meta_access_token' | 'meta_verify_token' | 'meta_phone_number_id' | 'openai_api_key' | 'groq_api_key',
 *   value: string
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, value } = body

    const validKeys = [
      'meta_access_token',
      'meta_verify_token',
      'meta_app_secret', // SECURITY FIX (VULN-012)
      'meta_phone_number_id',
      'openai_api_key',
      'groq_api_key',
    ]

    if (!key || !validKeys.includes(key)) {
      return NextResponse.json({ error: 'Key inválida' }, { status: 400 })
    }

    if (!value || value.trim().length === 0) {
      return NextResponse.json({ error: 'Value não pode ser vazio' }, { status: 400 })
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

    // Buscar client para obter secret_id correspondente
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // Mapear key para secret_id field
    const secretIdFieldMap: Record<string, string> = {
      meta_access_token: 'meta_access_token_secret_id',
      meta_verify_token: 'meta_verify_token_secret_id',
      meta_app_secret: 'meta_app_secret_secret_id', // SECURITY FIX (VULN-012)
      openai_api_key: 'openai_api_key_secret_id',
      groq_api_key: 'groq_api_key_secret_id',
    }

    // meta_phone_number_id é armazenado diretamente, não no Vault
    if (key === 'meta_phone_number_id') {
      const { error: updateError } = await supabase
        .from('clients')
        .update({
          meta_phone_number_id: value.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', clientId)

      if (updateError) {
        console.error('[vault/secrets] Erro ao atualizar meta_phone_number_id:', updateError)
        return NextResponse.json(
          { error: 'Erro ao atualizar phone number ID' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Phone Number ID atualizado com sucesso',
      })
    }

    // Obter secret_id do campo correspondente
    const secretIdField = secretIdFieldMap[key]
    const secretId = client[secretIdField]

    if (!secretId) {
      return NextResponse.json(
        { error: 'Secret ID não encontrado para esta key' },
        { status: 404 }
      )
    }

    // Atualizar secret no Vault
    const { error: vaultError } = await supabase.rpc('update_client_secret', {
      secret_id: secretId,
      new_secret_value: value.trim(),
    })

    if (vaultError) {
      console.error('[vault/secrets] Erro ao atualizar secret no Vault:', vaultError)
      return NextResponse.json(
        { error: 'Erro ao atualizar secret no Vault' },
        { status: 500 }
      )
    }

    console.log('[vault/secrets] Secret atualizado:', { key, client_id: clientId })

    // SECURITY FIX (VULN-009): NÃO retornar secret após update
    return NextResponse.json({
      success: true,
      message: 'Secret atualizado com sucesso',
      key: key,
    })
  } catch (error) {
    console.error('[vault/secrets] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar secret' },
      { status: 500 }
    )
  }
}

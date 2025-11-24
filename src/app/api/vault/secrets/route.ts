import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase-server'
import { logUpdate } from '@/lib/audit'
import { SecretUpdateSchema, validatePayload } from '@/lib/schemas'
import { z } from 'zod'

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

    // VULN-013 FIX: Validate input with Zod
    const validation = validatePayload(SecretUpdateSchema, body)
    if (validation.success === false) {
      return NextResponse.json(
        {
          error: 'Dados inválidos',
          details: validation.errors
        },
        { status: 400 }
      )
    }

    const { key, value } = validation.data as z.infer<typeof SecretUpdateSchema>

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
          meta_phone_number_id: value,
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

      // VULN-008 FIX: Log audit event
      await logUpdate(
        'config',
        `${clientId}-meta_phone_number_id`,
        { meta_phone_number_id: client.meta_phone_number_id },
        { meta_phone_number_id: value },
        {
          userId: user.id,
          userEmail: user.email,
          clientId: clientId,
          endpoint: '/api/vault/secrets',
          method: 'PUT',
          request
        }
      )

      return NextResponse.json({
        success: true,
        message: 'Phone Number ID atualizado com sucesso',
      })
    }

    // Obter secret_id do campo correspondente
    const secretIdField = secretIdFieldMap[key]
    const secretId = client[secretIdField]

    if (!secretId) {

      // CRIAR NOVO SECRET se não existir
      const secretName = `${client.slug}_${key}`
      const secretDescription = `${key} for client ${client.name}`

      const { data: newSecretId, error: createError } = await supabase.rpc('create_client_secret', {
        secret_value: value,
        secret_name: secretName,
        secret_description: secretDescription,
      })

      if (createError || !newSecretId) {
        console.error('[vault/secrets] Erro ao criar secret:', createError)
        return NextResponse.json(
          {
            error: 'Erro ao criar secret no Vault',
            details: createError?.message || 'Nenhum ID retornado'
          },
          { status: 500 }
        )
      }

      // ATUALIZAR client com o novo secret_id
      const { error: updateClientError } = await supabase
        .from('clients')
        .update({
          [secretIdField]: newSecretId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clientId)

      if (updateClientError) {
        console.error('[vault/secrets] Erro ao atualizar client com secret_id:', updateClientError)
        return NextResponse.json(
          {
            error: 'Secret criado mas falhou ao vincular ao cliente',
            details: updateClientError.message
          },
          { status: 500 }
        )
      }

      // VULN-008 FIX: Log audit event
      await logUpdate(
        'secret',
        `${clientId}-${key}`,
        { [key]: null }, // Não existia antes
        { [key]: '***' }, // Criado agora
        {
          userId: user.id,
          userEmail: user.email,
          clientId: clientId,
          endpoint: '/api/vault/secrets',
          method: 'PUT',
          request
        }
      )

      return NextResponse.json({
        success: true,
        message: 'Secret criado com sucesso',
        key: key,
        created: true,
      })
    }

    // ESTRATÉGIA: Deletar secret antigo PRIMEIRO, depois criar novo
    // Isso evita erro de "duplicate key" no índice secrets_name_idx

    // 1. Buscar informações do secret antigo ANTES de deletar
    const { data: oldSecret } = await supabase
      .from('vault.secrets')
      .select('name, description')
      .eq('id', secretId)
      .single()

    const secretName = oldSecret?.name || `${client.slug}_${key}`
    const secretDescription = oldSecret?.description || `${key} for client ${client.name}`

    // 2. DELETAR secret antigo PRIMEIRO usando RPC (evita duplicação de nome)
    const { data: deleteResult, error: deleteError } = await supabase.rpc('delete_client_secret', {
      secret_id: secretId,
    })

    if (deleteError || !deleteResult) {
      console.error('[vault/secrets] Erro ao deletar secret antigo:', deleteError)
      return NextResponse.json(
        {
          error: 'Erro ao deletar secret antigo',
          details: deleteError?.message || 'Função retornou FALSE'
        },
        { status: 500 }
      )
    }

    // 3. CRIAR novo secret com o valor atualizado (agora o nome está livre)
    const { data: newSecretId, error: createError } = await supabase.rpc('create_client_secret', {
      secret_value: value,
      secret_name: secretName,
      secret_description: secretDescription,
    })

    if (createError || !newSecretId) {
      console.error('[vault/secrets] Erro ao criar novo secret:', createError)
      return NextResponse.json(
        {
          error: 'Erro ao criar secret no Vault',
          details: createError?.message || 'Nenhum ID retornado'
        },
        { status: 500 }
      )
    }

    // 4. Atualizar referência na tabela clients
    const { error: updateClientError } = await supabase
      .from('clients')
      .update({
        [secretIdField]: newSecretId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId)

    if (updateClientError) {
      console.error('[vault/secrets] Erro ao atualizar client com novo secret_id:', updateClientError)
      // Tentar deletar o novo secret criado para evitar lixo
      await supabase.rpc('delete_client_secret', { secret_id: newSecretId })

      return NextResponse.json(
        {
          error: 'Erro ao atualizar referência do secret',
          details: updateClientError.message
        },
        { status: 500 }
      )
    }

    // VULN-008 FIX: Log audit event
    await logUpdate(
      'secret',
      `${clientId}-${key}`,
      { [key]: '***' }, // Não logar valor antigo (já foi redacted)
      { [key]: '***' }, // Não logar valor novo (redacted)
      {
        userId: user.id,
        userEmail: user.email,
        clientId: clientId,
        endpoint: '/api/vault/secrets',
        method: 'PUT',
        request
      }
    )

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

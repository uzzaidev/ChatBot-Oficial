import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/register
 *
 * Registra novo usuário e cria novo cliente (tenant) isolado
 *
 * Flow:
 * 1. Cria novo client na tabela clients com UUID gerado
 * 2. Cria secrets vazios no Vault (serão preenchidos depois)
 * 3. Cria usuário no Supabase Auth com client_id no metadata
 * 4. Trigger handle_new_user() cria automaticamente user_profile
 *
 * Body:
 * {
 *   fullName: string,
 *   email: string,
 *   phone?: string,
 *   companyName: string,
 *   password: string
 * }
 *
 * IMPORTANTE: Cada novo usuário = novo cliente (tenant) isolado
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fullName, email, phone, companyName, password } = body

    // Validação
    if (!fullName || !email || !password || !companyName) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Senha deve ter pelo menos 8 caracteres' },
        { status: 400 }
      )
    }

    console.log('[register] Iniciando registro:', { email, companyName })

    // Usar Service Role Key para operações administrativas (criar usuários)
    const supabase = createServerClient()

    // ========================================
    // 1. Gerar slug único para o cliente
    // ========================================
    const baseSlug = companyName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9]+/g, '-') // Substitui caracteres especiais por -
      .replace(/^-|-$/g, '') // Remove - do início e fim

    let slug = baseSlug
    let slugSuffix = 1

    // Verificar se slug já existe (loop até encontrar um único)
    while (true) {
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('slug', slug)
        .single()

      if (!existingClient) break
      slug = `${baseSlug}-${slugSuffix++}`
    }

    console.log('[register] Slug gerado:', slug)

    // ========================================
    // 2. Criar secrets vazios no Vault
    // ========================================
    // NOTA: Secrets são criados vazios e serão preenchidos nas configurações
    const { data: metaAccessTokenSecretData, error: metaAccessError } =
      await (supabase as any).rpc('create_client_secret', {
        secret_value: 'CONFIGURE_IN_SETTINGS',
        secret_name: `${slug}_meta_access_token`,
        secret_description: `Meta Access Token for ${companyName}`,
      })

    if (metaAccessError) {
      console.error('[register] Erro ao criar meta_access_token secret:', metaAccessError)
      return NextResponse.json(
        { error: 'Erro ao criar secrets no Vault' },
        { status: 500 }
      )
    }

    const { data: metaVerifyTokenSecretData, error: metaVerifyError } =
      await (supabase as any).rpc('create_client_secret', {
        secret_value: 'CONFIGURE_IN_SETTINGS',
        secret_name: `${slug}_meta_verify_token`,
        secret_description: `Meta Verify Token for ${companyName}`,
      })

    if (metaVerifyError) {
      console.error('[register] Erro ao criar meta_verify_token secret:', metaVerifyError)
      return NextResponse.json(
        { error: 'Erro ao criar secrets no Vault' },
        { status: 500 }
      )
    }

    const { data: openaiApiKeySecretData, error: openaiError } =
      await (supabase as any).rpc('create_client_secret', {
        secret_value: 'CONFIGURE_IN_SETTINGS',
        secret_name: `${slug}_openai_api_key`,
        secret_description: `OpenAI API Key for ${companyName}`,
      })

    if (openaiError) {
      console.error('[register] Erro ao criar openai_api_key secret:', openaiError)
      return NextResponse.json(
        { error: 'Erro ao criar secrets no Vault' },
        { status: 500 }
      )
    }

    const { data: groqApiKeySecretData, error: groqError } =
      await (supabase as any).rpc('create_client_secret', {
        secret_value: 'CONFIGURE_IN_SETTINGS',
        secret_name: `${slug}_groq_api_key`,
        secret_description: `Groq API Key for ${companyName}`,
      })

    if (groqError) {
      console.error('[register] Erro ao criar groq_api_key secret:', groqError)
      return NextResponse.json(
        { error: 'Erro ao criar secrets no Vault' },
        { status: 500 }
      )
    }

    console.log('[register] Secrets criados no Vault:', {
      meta_access_token: metaAccessTokenSecretData,
      meta_verify_token: metaVerifyTokenSecretData,
      openai_api_key: openaiApiKeySecretData,
      groq_api_key: groqApiKeySecretData,
    })

    // ========================================
    // 3. Criar client na tabela clients
    // ========================================
    const { data: newClient, error: clientError } = await (supabase as any)
      .from('clients')
      .insert({
        name: companyName,
        slug,
        status: 'trial',
        plan: 'free',
        meta_access_token_secret_id: metaAccessTokenSecretData,
        meta_verify_token_secret_id: metaVerifyTokenSecretData,
        meta_phone_number_id: 'CONFIGURE_IN_SETTINGS',
        meta_display_phone: phone || null,
        openai_api_key_secret_id: openaiApiKeySecretData,
        openai_model: 'gpt-4o',
        groq_api_key_secret_id: groqApiKeySecretData,
        groq_model: 'llama-3.3-70b-versatile',
        system_prompt: `Você é um assistente virtual para ${companyName}. Seja prestativo, educado e profissional.`,
        formatter_prompt: null,
        notification_email: email,
      })
      .select('id')
      .single()

    if (clientError || !newClient) {
      console.error('[register] Erro ao criar client:', clientError)
      return NextResponse.json(
        { error: 'Erro ao criar registro de cliente' },
        { status: 500 }
      )
    }

    const clientId = newClient.id

    console.log('[register] Client criado:', { client_id: clientId, slug })

    // ========================================
    // 4. Criar usuário no Supabase Auth
    // ========================================
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirmar email
      user_metadata: {
        client_id: clientId,
        full_name: fullName,
      },
    })

    if (authError || !authData.user) {
      console.error('[register] Erro ao criar usuário:', authError)

      // Rollback: deletar client criado
      await (supabase as any).from('clients').delete().eq('id', clientId)

      if (authError?.message?.includes('User already registered')) {
        return NextResponse.json(
          { error: 'Email já registrado' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: 'Erro ao criar usuário' },
        { status: 500 }
      )
    }

    console.log('[register] Usuário criado:', authData.user.id)

    // ========================================
    // 5. Verificar se user_profile foi criado pelo trigger
    // ========================================
    // Esperar 1 segundo para trigger executar
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const { data: profile, error: profileError } = await (supabase as any)
      .from('user_profiles')
      .select('id, client_id')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile) {
      console.error('[register] User profile não criado pelo trigger:', profileError)
      console.warn('[register] Criando user_profile manualmente')

      // Criar manualmente se trigger falhou
      const { error: manualProfileError } = await (supabase as any)
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          client_id: clientId,
          email,
          full_name: fullName,
        })

      if (manualProfileError) {
        console.error('[register] Erro ao criar user_profile manual:', manualProfileError)
      }
    }

    console.log('[register] ✅ Registro completo:', {
      user_id: authData.user.id,
      client_id: clientId,
      email,
      slug,
    })

    // ========================================
    // 6. Fazer login automático após registro
    // ========================================
    // Criar sessão para o usuário recém-criado
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (sessionError) {
      console.warn('[register] Não foi possível fazer login automático:', sessionError)
      // Não é erro crítico - usuário pode fazer login manualmente
    } else {
      console.log('[register] ✅ Login automático realizado')
    }

    return NextResponse.json({
      success: true,
      user_id: authData.user.id,
      client_id: clientId,
      email,
      slug,
      session: sessionData?.session || null,
      message: 'Conta criada com sucesso! Configure suas credenciais em Configurações.',
    })
  } catch (error) {
    console.error('[register] Erro inesperado:', error)
    return NextResponse.json(
      { error: 'Erro interno ao criar conta' },
      { status: 500 }
    )
  }
}

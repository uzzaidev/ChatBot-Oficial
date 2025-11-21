import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/client/config
 *
 * Retorna configurações do cliente autenticado (system_prompt, formatter_prompt, models)
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

    // Buscar configurações do client (incluindo settings JSON e provider)
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('system_prompt, formatter_prompt, openai_model, groq_model, primary_model_provider, settings')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      config: {
        system_prompt: client.system_prompt || '',
        formatter_prompt: client.formatter_prompt || '',
        openai_model: client.openai_model || 'gpt-4o',
        groq_model: client.groq_model || 'llama-3.3-70b-versatile',
        primary_model_provider: client.primary_model_provider || 'groq', // NOVO
        settings: client.settings || {
          enable_rag: false,
          max_tokens: 2000,
          temperature: 0.7,
          enable_tools: false,
          max_chat_history: 10,
          enable_human_handoff: false,
          message_split_enabled: false,
          batching_delay_seconds: 10,
        },
      },
    })
  } catch (error) {
    console.error('[client/config] GET Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar configurações' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/client/config
 *
 * Atualiza configurações do cliente autenticado
 *
 * Body:
 * {
 *   system_prompt?: string,
 *   formatter_prompt?: string,
 *   openai_model?: string,
 *   groq_model?: string
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { system_prompt, formatter_prompt, openai_model, groq_model, primary_model_provider, settings } = body

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

    // Montar objeto de atualização (apenas campos fornecidos)
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (system_prompt !== undefined) updateData.system_prompt = system_prompt
    if (formatter_prompt !== undefined) updateData.formatter_prompt = formatter_prompt
    if (openai_model !== undefined) updateData.openai_model = openai_model
    if (groq_model !== undefined) updateData.groq_model = groq_model
    if (primary_model_provider !== undefined) updateData.primary_model_provider = primary_model_provider // NOVO
    if (settings !== undefined) updateData.settings = settings

    // Atualizar client
    const { error: updateError } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', clientId)

    if (updateError) {
      console.error('[client/config] PATCH Erro ao atualizar:', updateError)
      return NextResponse.json(
        { error: 'Erro ao atualizar configurações' },
        { status: 500 }
      )
    }


    return NextResponse.json({
      success: true,
      message: 'Configurações atualizadas com sucesso',
    })
  } catch (error) {
    console.error('[client/config] PATCH Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar configurações' },
      { status: 500 }
    )
  }
}

import { createRouteHandlerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/chat-theme
 *
 * Busca o tema personalizado do usuário autenticado
 *
 * @returns {object} { theme: ChatTheme | null }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Buscar tema do usuário
    const { data, error } = await supabase
      .from('user_chat_themes')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // PGRST116 = no rows found (usuário ainda não tem tema customizado)
    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao buscar tema:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar tema' },
        { status: 500 }
      )
    }

    // Formatar resposta
    const theme = data ? {
      incomingMessageColor: data.incoming_message_color,
      outgoingMessageColor: data.outgoing_message_color,
      backgroundType: data.background_type,
      backgroundPreset: data.background_preset,
      backgroundCustomUrl: data.background_custom_url,
    } : null

    return NextResponse.json({ theme })
  } catch (error) {
    console.error('Erro na API GET /chat-theme:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/chat-theme
 *
 * Salva ou atualiza o tema personalizado do usuário
 *
 * @body {object} { incomingMessageColor, outgoingMessageColor, backgroundType, backgroundPreset?, backgroundCustomUrl? }
 * @returns {object} { theme: ChatTheme }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Parsear body
    const body = await request.json()
    const {
      incomingMessageColor,
      outgoingMessageColor,
      backgroundType,
      backgroundPreset,
      backgroundCustomUrl,
    } = body

    // Validações básicas
    if (!incomingMessageColor || !outgoingMessageColor || !backgroundType) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando' },
        { status: 400 }
      )
    }

    // Validar formato de cor hex (#RRGGBB)
    const hexRegex = /^#[0-9A-F]{6}$/i
    if (!hexRegex.test(incomingMessageColor) || !hexRegex.test(outgoingMessageColor)) {
      return NextResponse.json(
        { error: 'Formato de cor inválido. Use #RRGGBB' },
        { status: 400 }
      )
    }

    // Validar backgroundType
    if (!['default', 'preset', 'custom'].includes(backgroundType)) {
      return NextResponse.json(
        { error: 'backgroundType inválido' },
        { status: 400 }
      )
    }

    // Salvar ou atualizar tema (upsert)
    const { data, error } = await supabase
      .from('user_chat_themes')
      .upsert({
        user_id: user.id,
        incoming_message_color: incomingMessageColor,
        outgoing_message_color: outgoingMessageColor,
        background_type: backgroundType,
        background_preset: backgroundPreset || null,
        background_custom_url: backgroundCustomUrl || null,
      }, {
        onConflict: 'user_id'  // Resolver conflitos pela coluna user_id (UNIQUE constraint)
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao salvar tema:', error)
      return NextResponse.json(
        { error: 'Erro ao salvar tema' },
        { status: 500 }
      )
    }

    // Formatar resposta
    const theme = {
      incomingMessageColor: data.incoming_message_color,
      outgoingMessageColor: data.outgoing_message_color,
      backgroundType: data.background_type,
      backgroundPreset: data.background_preset,
      backgroundCustomUrl: data.background_custom_url,
    }

    return NextResponse.json({ theme }, { status: 200 })
  } catch (error) {
    console.error('Erro na API POST /chat-theme:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/chat-theme
 *
 * Deleta o tema personalizado do usuário (volta para o padrão)
 *
 * @returns {object} { success: boolean }
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Deletar tema do usuário
    const { error } = await supabase
      .from('user_chat_themes')
      .delete()
      .eq('user_id', user.id)

    if (error) {
      console.error('Erro ao deletar tema:', error)
      return NextResponse.json(
        { error: 'Erro ao deletar tema' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro na API DELETE /chat-theme:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

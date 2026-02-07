import { createRouteHandlerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/chat-theme
 *
 * Busca o tema personalizado do usuário autenticado (dual-mode: dark + light)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const { data, error } = await supabase
      .from('user_chat_themes')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // PGRST116 = no rows found
    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao buscar tema:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar tema' },
        { status: 500 }
      )
    }

    const theme = data ? {
      dark: {
        incomingMessageColor: data.incoming_message_color,
        outgoingMessageColor: data.outgoing_message_color,
        incomingTextColor: data.incoming_text_color || '#FFFFFF',
        outgoingTextColor: data.outgoing_text_color || '#FFFFFF',
      },
      light: {
        incomingMessageColor: data.incoming_message_color_light || '#ffffff',
        outgoingMessageColor: data.outgoing_message_color_light || '#128c7e',
        incomingTextColor: data.incoming_text_color_light || '#1f2937',
        outgoingTextColor: data.outgoing_text_color_light || '#FFFFFF',
      },
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
 * Salva ou atualiza o tema personalizado do usuário (dual-mode)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { dark, light, backgroundType, backgroundPreset, backgroundCustomUrl } = body

    // Validações
    if (!dark || !light || !backgroundType) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando (dark, light, backgroundType)' },
        { status: 400 }
      )
    }

    // Validar formato de cor hex (#RRGGBB)
    const hexRegex = /^#[0-9A-F]{6}$/i
    const allColors = [
      dark.incomingMessageColor, dark.outgoingMessageColor,
      dark.incomingTextColor, dark.outgoingTextColor,
      light.incomingMessageColor, light.outgoingMessageColor,
      light.incomingTextColor, light.outgoingTextColor,
    ]

    const invalidColor = allColors.find(c => !hexRegex.test(c))
    if (invalidColor) {
      return NextResponse.json(
        { error: `Formato de cor inválido: ${invalidColor}. Use #RRGGBB` },
        { status: 400 }
      )
    }

    if (!['default', 'preset', 'custom'].includes(backgroundType)) {
      return NextResponse.json(
        { error: 'backgroundType inválido' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('user_chat_themes')
      .upsert({
        user_id: user.id,
        // Dark mode (existing columns)
        incoming_message_color: dark.incomingMessageColor,
        outgoing_message_color: dark.outgoingMessageColor,
        incoming_text_color: dark.incomingTextColor,
        outgoing_text_color: dark.outgoingTextColor,
        // Light mode (new columns)
        incoming_message_color_light: light.incomingMessageColor,
        outgoing_message_color_light: light.outgoingMessageColor,
        incoming_text_color_light: light.incomingTextColor,
        outgoing_text_color_light: light.outgoingTextColor,
        // Background (shared)
        background_type: backgroundType,
        background_preset: backgroundPreset || null,
        background_custom_url: backgroundCustomUrl || null,
      }, {
        onConflict: 'user_id',
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

    const theme = {
      dark: {
        incomingMessageColor: data.incoming_message_color,
        outgoingMessageColor: data.outgoing_message_color,
        incomingTextColor: data.incoming_text_color,
        outgoingTextColor: data.outgoing_text_color,
      },
      light: {
        incomingMessageColor: data.incoming_message_color_light,
        outgoingMessageColor: data.outgoing_message_color_light,
        incomingTextColor: data.incoming_text_color_light,
        outgoingTextColor: data.outgoing_text_color_light,
      },
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
 * Deleta o tema personalizado do usuário (volta para o padrão CSS)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

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

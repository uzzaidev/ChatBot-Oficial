import { query } from '@/lib/postgres'
import { createRouteHandlerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/filters/preferences
 *
 * Busca as preferências de filtros do usuário autenticado
 * Retorna filtros com labels, ícones, cores e contagens
 * Usa a função SQL get_user_filters_with_details()
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

    // Buscar filtros usando função SQL helper
    const result = await query<{
      id: string
      filter_type: 'default' | 'tag' | 'column'
      filter_id: string | null
      default_filter_value: string | null
      enabled: boolean
      position: number
      label: string
      icon: string
      color: string
      count: number
    }>(
      `SELECT * FROM get_user_filters_with_details($1)`,
      [user.id]
    )

    return NextResponse.json({ filters: result.rows })
  } catch (error) {
    console.error('Erro na API GET /filters/preferences:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/filters/preferences
 *
 * Salva/atualiza as preferências de filtros do usuário
 *
 * @body {
 *   filters: Array<{
 *     filter_type: 'default' | 'tag' | 'column'
 *     filter_id?: string  // Para tag ou column
 *     default_filter_value?: string  // Para default (all, bot, humano, etc)
 *     enabled: boolean
 *     position: number
 *     custom_label?: string
 *     custom_icon?: string
 *     custom_color?: string
 *   }>
 * }
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

    const body = await request.json()
    const { filters } = body

    if (!Array.isArray(filters)) {
      return NextResponse.json(
        { error: 'filters deve ser um array' },
        { status: 400 }
      )
    }

    // Validar cada filtro
    for (const filter of filters) {
      if (!filter.filter_type || !['default', 'tag', 'column'].includes(filter.filter_type)) {
        return NextResponse.json(
          { error: 'filter_type inválido' },
          { status: 400 }
        )
      }

      if (filter.filter_type === 'default' && !filter.default_filter_value) {
        return NextResponse.json(
          { error: 'default_filter_value é obrigatório para filter_type=default' },
          { status: 400 }
        )
      }

      if ((filter.filter_type === 'tag' || filter.filter_type === 'column') && !filter.filter_id) {
        return NextResponse.json(
          { error: 'filter_id é obrigatório para filter_type=tag ou column' },
          { status: 400 }
        )
      }
    }

    // Deletar todas as preferências existentes do usuário
    await query(
      `DELETE FROM user_filter_preferences WHERE user_id = $1`,
      [user.id]
    )

    // Inserir novas preferências
    for (let i = 0; i < filters.length; i++) {
      const filter = filters[i]

      await query(
        `INSERT INTO user_filter_preferences (
          user_id,
          filter_type,
          filter_id,
          default_filter_value,
          enabled,
          "position",
          custom_label,
          custom_icon,
          custom_color
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          user.id,
          filter.filter_type,
          filter.filter_id || null,
          filter.default_filter_value || null,
          filter.enabled !== false, // Default true
          i, // Position baseado na ordem do array
          filter.custom_label || null,
          filter.custom_icon || null,
          filter.custom_color || null,
        ]
      )
    }

    // Buscar filtros atualizados usando a função helper
    const result = await query(
      `SELECT * FROM get_user_filters_with_details($1)`,
      [user.id]
    )

    return NextResponse.json({ filters: result.rows }, { status: 200 })
  } catch (error) {
    console.error('Erro na API POST /filters/preferences:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/filters/preferences
 *
 * Atualiza a posição/enabled de um filtro específico
 * Útil para drag-and-drop ou toggle individual
 *
 * @body {
 *   id: string
 *   enabled?: boolean
 *   position?: number
 * }
 */
export async function PUT(request: NextRequest) {
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

    const body = await request.json()
    const { id, enabled, position } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID do filtro é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o filtro pertence ao usuário
    const checkResult = await query<{ user_id: string }>(
      `SELECT user_id FROM user_filter_preferences WHERE id = $1`,
      [id]
    )

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Filtro não encontrado' },
        { status: 404 }
      )
    }

    if (checkResult.rows[0].user_id !== user.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 403 }
      )
    }

    // Atualizar filtro
    const updates: string[] = []
    const values: any[] = [id]
    let paramIndex = 2

    if (typeof enabled === 'boolean') {
      updates.push(`enabled = $${paramIndex}`)
      values.push(enabled)
      paramIndex++
    }

    if (typeof position === 'number') {
      updates.push(`"position" = $${paramIndex}`)
      values.push(position)
      paramIndex++
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum campo para atualizar' },
        { status: 400 }
      )
    }

    updates.push(`updated_at = NOW()`)

    await query(
      `UPDATE user_filter_preferences SET ${updates.join(', ')} WHERE id = $1`,
      values
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro na API PUT /filters/preferences:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

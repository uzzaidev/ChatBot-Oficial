import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/customers/[phone]/status
 *
 * Atualiza o status de atendimento de um cliente (bot/humano/transferido)
 *
 * Body:
 * {
 *   status: 'bot' | 'humano' | 'transferido'
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { phone: string } }
) {
  try {
    const { status } = await request.json()
    const { phone } = params

    // Validar status
    if (!['bot', 'humano', 'transferido'].includes(status)) {
      return NextResponse.json(
        { error: 'Status inválido. Valores aceitos: bot, humano, transferido' },
        { status: 400 }
      )
    }

    // Verificar autenticação
    const supabase = createRouteHandlerClient()
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

    // Preparar dados de atualização
    const updateData: any = {
      status,
    }

    // Se mudando para humano/transferido, registrar timestamp e usuário
    if (status === 'humano' || status === 'transferido') {
      updateData.transferred_at = new Date().toISOString()
      updateData.transferred_by = user.id
    } else {
      // Se voltando para bot, limpar campos de transferência
      updateData.transferred_at = null
      updateData.transferred_by = null
    }

    // Atualizar status do cliente
    const { error: updateError } = await supabase
      .from('clientes_whatsapp')
      .update(updateData)
      .eq('telefone', phone)
      .eq('client_id', profile.client_id)

    if (updateError) {
      console.error('[api/customers/status] Erro ao atualizar:', updateError)
      return NextResponse.json(
        { error: 'Erro ao atualizar status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      status,
      message: 'Status atualizado com sucesso',
    })
  } catch (error) {
    console.error('[api/customers/status] Erro:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

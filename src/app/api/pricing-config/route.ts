import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, getClientIdFromSession } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/pricing-config
 * Fetch all pricing configurations for the authenticated client
 */
export async function GET(request: NextRequest) {
  try {
    // Get client_id from authenticated session
    const clientId = await getClientIdFromSession(request as any)

    if (!clientId) {
      return NextResponse.json(
        { error: 'Não autenticado ou client_id não encontrado' },
        { status: 401 }
      )
    }

    const supabase = createServerClient()

    // Fetch pricing configurations
    const { data: pricingConfigs, error: pricingError } = await supabase
      .from('pricing_config')
      .select('*')
      .eq('client_id', clientId)
      .order('provider', { ascending: true })
      .order('model', { ascending: true })

    if (pricingError) {
      console.error('[PricingConfig] Error fetching configs:', pricingError)
      return NextResponse.json(
        { error: 'Erro ao buscar configurações' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      pricingConfigs: pricingConfigs || [],
    })
  } catch (error) {
    console.error('[PricingConfig] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/pricing-config
 * Update pricing configuration for a specific model
 *
 * Body: {
 *   provider: string,
 *   model: string,
 *   prompt_price: number,
 *   completion_price: number,
 *   unit?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Get client_id from authenticated session
    const clientId = await getClientIdFromSession(request as any)

    if (!clientId) {
      return NextResponse.json(
        { error: 'Não autenticado ou client_id não encontrado' },
        { status: 401 }
      )
    }

    const supabase = createServerClient()

    // Parse request body
    const body = await request.json()
    const { provider, model, prompt_price, completion_price, unit } = body

    // Validate required fields
    if (!provider || !model || prompt_price === undefined || completion_price === undefined) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: provider, model, prompt_price, completion_price' },
        { status: 400 }
      )
    }

    // Validate provider
    const validProviders = ['openai', 'groq', 'whisper', 'meta']
    if (!validProviders.includes(provider)) {
      return NextResponse.json(
        { error: 'Provider inválido. Use: openai, groq, whisper, meta' },
        { status: 400 }
      )
    }

    // Upsert pricing config
    const { data: updatedConfig, error: upsertError } = await supabase
      .from('pricing_config')
      .upsert(
        {
          client_id: clientId,
          provider,
          model,
          prompt_price,
          completion_price,
          unit: unit || 'per_1k_tokens',
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'client_id,provider,model',
        }
      )
      .select()
      .single()

    if (upsertError) {
      console.error('[PricingConfig] Error upserting config:', upsertError)
      return NextResponse.json(
        { error: 'Erro ao salvar configuração' },
        { status: 500 }
      )
    }


    return NextResponse.json({
      message: 'Configuração salva com sucesso',
      config: updatedConfig,
    })
  } catch (error) {
    console.error('[PricingConfig] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/pricing-config
 * Reset pricing to default for a specific model
 *
 * Body: {
 *   provider: string,
 *   model: string
 * }
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get client_id from authenticated session
    const clientId = await getClientIdFromSession(request as any)

    if (!clientId) {
      return NextResponse.json(
        { error: 'Não autenticado ou client_id não encontrado' },
        { status: 401 }
      )
    }

    const supabase = createServerClient()

    // Parse request body
    const body = await request.json()
    const { provider, model } = body

    // Validate required fields
    if (!provider || !model) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: provider, model' },
        { status: 400 }
      )
    }

    // Delete pricing config
    const { error: deleteError } = await supabase
      .from('pricing_config')
      .delete()
      .eq('client_id', clientId)
      .eq('provider', provider)
      .eq('model', model)

    if (deleteError) {
      console.error('[PricingConfig] Error deleting config:', deleteError)
      return NextResponse.json(
        { error: 'Erro ao deletar configuração' },
        { status: 500 }
      )
    }


    return NextResponse.json({
      message: 'Configuração resetada para padrão',
    })
  } catch (error) {
    console.error('[PricingConfig] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * API Endpoint: /api/config
 *
 * Gerencia configurações modulares do bot (tabela bot_configurations)
 * Permite clientes customizarem prompts, regras, thresholds e personalidade via dashboard
 *
 * Endpoints:
 * - GET /api/config?category=prompts - Lista configs (opcionalmente filtradas por categoria)
 * - PUT /api/config - Atualiza/cria uma configuração
 * - DELETE /api/config?key=intent_classifier:prompt - Reseta config para padrão
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import {
  listBotConfigs,
  setBotConfig,
  resetBotConfig,
  type BotConfig
} from '@/lib/config'

// CRITICAL: Desabilitar cache do Next.js para sempre retornar dados atualizados
export const dynamic = 'force-dynamic'

/**
 * GET /api/config?category=prompts
 *
 * Lista todas as configurações do cliente
 * Se cliente customizou uma config, retorna a customização
 * Se não, retorna o valor padrão (is_default=true)
 *
 * Query params:
 * - category (opcional): 'prompts' | 'rules' | 'thresholds' | 'personality'
 *
 * Response: { configs: BotConfig[] }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || undefined

    const supabase = createServerClient()

    console.log(`[GET /api/config] 🔍 DEBUG - Fetching configs`)
    console.log(`[GET /api/config] 🔍 DEBUG - Category filter: ${category || 'all'}`)

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('[GET /api/config] 👤 Auth check:', {
      userId: user?.id,
      email: user?.email,
      hasError: !!authError
    })

    if (authError || !user) {
      console.log('[GET /api/config] ❌ Authentication failed - returning empty configs')
      return NextResponse.json({
        configs: [],
        count: 0,
        clientId: null,
        error: 'Not authenticated'
      })
    }

    // Get user profile to find client_id
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('client_id')
      .eq('id', user.id)
      .single()

    console.log('[GET /api/config] 📋 Profile check:', {
      hasProfile: !!userProfile,
      clientId: userProfile?.client_id,
      hasError: !!profileError
    })

    // Use client_id from profile, or fallback to default behavior
    const clientId = userProfile?.client_id || process.env.DEFAULT_CLIENT_ID || 'NO_CLIENT_ID'

    console.log(`[GET /api/config] 🔍 DEBUG - Using Client ID: ${clientId}`)
    console.log(`[GET /api/config] 🔍 DEBUG - Environment: ${process.env.NODE_ENV}`)

    const configs = await listBotConfigs(clientId, category)

    console.log(`[GET /api/config] 🔍 DEBUG - Configs returned: ${configs.length}`)
    console.log(`[GET /api/config] 🔍 DEBUG - First 3 configs:`, configs.slice(0, 3).map(c => ({
      key: c.config_key,
      category: c.category,
      is_default: c.is_default,
      client_id: c.client_id
    })))

    return NextResponse.json({
      configs,
      count: configs.length,
      clientId
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[GET /api/config] ❌ Error:', errorMessage)
    console.error('[GET /api/config] ❌ Stack:', error instanceof Error ? error.stack : 'No stack')

    return NextResponse.json(
      { error: 'Failed to fetch configurations', details: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/config
 *
 * Atualiza ou cria uma configuração customizada do cliente
 *
 * Body: {
 *   config_key: string (ex: 'intent_classifier:prompt'),
 *   config_value: any (string | number | boolean | object | array),
 *   description?: string,
 *   category?: string
 * }
 *
 * Response: { success: true, config_key: string }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { config_key, config_value, description, category } = body

    // Validações
    if (!config_key || typeof config_key !== 'string') {
      return NextResponse.json(
        { error: 'config_key is required and must be a string' },
        { status: 400 }
      )
    }

    if (config_value === undefined || config_value === null) {
      return NextResponse.json(
        { error: 'config_value is required' },
        { status: 400 }
      )
    }

    // Get authenticated user's client_id
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('client_id')
      .eq('id', user.id)
      .single()

    const clientId = userProfile?.client_id || process.env.DEFAULT_CLIENT_ID || 'NO_CLIENT_ID'

    console.log(`[PUT /api/config] Updating config: ${config_key} for client: ${clientId}`)

    await setBotConfig(clientId, config_key, config_value, {
      description,
      category
    })

    return NextResponse.json({
      success: true,
      config_key,
      message: `Configuration ${config_key} updated successfully`
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[PUT /api/config] Error:', errorMessage)

    return NextResponse.json(
      { error: 'Failed to update configuration', details: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/config?key=intent_classifier:prompt
 *
 * Reseta uma configuração para o padrão (deleta customização do cliente)
 *
 * Query params:
 * - key (obrigatório): config_key a resetar
 *
 * Response: { success: true, config_key: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const configKey = searchParams.get('key')

    // Validação
    if (!configKey) {
      return NextResponse.json(
        { error: 'Query param "key" is required' },
        { status: 400 }
      )
    }

    // Get authenticated user's client_id
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('client_id')
      .eq('id', user.id)
      .single()

    const clientId = userProfile?.client_id || process.env.DEFAULT_CLIENT_ID || 'NO_CLIENT_ID'

    console.log(`[DELETE /api/config] Resetting config: ${configKey} for client: ${clientId}`)

    await resetBotConfig(clientId, configKey)

    return NextResponse.json({
      success: true,
      config_key: configKey,
      message: `Configuration ${configKey} reset to default`
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[DELETE /api/config] Error:', errorMessage)

    return NextResponse.json(
      { error: 'Failed to reset configuration', details: errorMessage },
      { status: 500 }
    )
  }
}

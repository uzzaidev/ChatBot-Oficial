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

    // TODO: Pegar client_id do usuário autenticado
    // Por enquanto, usando hardcoded para desenvolvimento
    const clientId = process.env.DEFAULT_CLIENT_ID || 'DEVELOPMENT_MODE'

    console.log(`[GET /api/config] Fetching configs for client: ${clientId}, category: ${category || 'all'}`)

    const configs = await listBotConfigs(clientId, category)

    return NextResponse.json({
      configs,
      count: configs.length,
      clientId
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[GET /api/config] Error:', errorMessage)

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

    // TODO: Pegar client_id do usuário autenticado
    const clientId = process.env.DEFAULT_CLIENT_ID || 'DEVELOPMENT_MODE'

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

    // TODO: Pegar client_id do usuário autenticado
    const clientId = process.env.DEFAULT_CLIENT_ID || 'DEVELOPMENT_MODE'

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

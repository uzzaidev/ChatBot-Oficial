/**
 * Endpoint de teste para validar configuração multi-tenant com Vault
 *
 * GET /api/test/vault-config?clientId=xxx
 *
 * Retorna a config do cliente descriptografada do Vault (sem expor secrets completos)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getClientConfig, validateClientConfig } from '@/lib/config'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // 1. Buscar clientId da query string (obrigatório)
    const searchParams = request.nextUrl.searchParams
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json(
        {
          error: 'Missing clientId',
          message: 'Provide ?clientId=xxx in query string. Example: /api/test/vault-config?clientId=b21b314f-c49a-467d-94b3-a21ed4412227',
          note: 'DEFAULT_CLIENT_ID is no longer used. All API routes now require authentication or explicit clientId.',
        },
        { status: 400 }
      )
    }

    console.log('[vault-config] Testing config for client:', clientId)

    // 2. Buscar config
    const config = await getClientConfig(clientId)

    if (!config) {
      return NextResponse.json(
        {
          error: 'Config not found',
          message: `No active client found with ID: ${clientId}`,
        },
        { status: 404 }
      )
    }

    // 3. Validar config
    const isValid = validateClientConfig(config)

    if (!isValid) {
      return NextResponse.json(
        {
          error: 'Invalid config',
          message: 'Client config is missing required fields',
          config: {
            hasMetaToken: !!config.apiKeys.metaAccessToken,
            hasPhoneId: !!config.apiKeys.metaPhoneNumberId,
            hasOpenAI: !!config.apiKeys.openaiApiKey,
            hasGroq: !!config.apiKeys.groqApiKey,
            hasPrompt: !!config.prompts.systemPrompt,
          },
        },
        { status: 500 }
      )
    }

    // 4. Retornar config (sem expor secrets completos)
    return NextResponse.json({
      success: true,
      message: '✅ Vault config loaded successfully!',
      client: {
        id: config.id,
        name: config.name,
        slug: config.slug,
        status: config.status,
      },
      apiKeys: {
        metaAccessToken: `${config.apiKeys.metaAccessToken.substring(0, 15)}...`,
        metaVerifyToken: `${config.apiKeys.metaVerifyToken.substring(0, 15)}...`,
        metaPhoneNumberId: config.apiKeys.metaPhoneNumberId,
        openaiApiKey: `${config.apiKeys.openaiApiKey.substring(0, 15)}...`,
        groqApiKey: `${config.apiKeys.groqApiKey.substring(0, 15)}...`,
      },
      prompts: {
        systemPrompt: `${config.prompts.systemPrompt.substring(0, 100)}...`,
        formatterPrompt: config.prompts.formatterPrompt || 'null (usa default)',
      },
      settings: config.settings,
      notificationEmail: config.notificationEmail || 'not configured',
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[vault-config] Error:', errorMessage)

    return NextResponse.json(
      {
        error: 'Internal error',
        message: errorMessage,
      },
      { status: 500 }
    )
  }
}

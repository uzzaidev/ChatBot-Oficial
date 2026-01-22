/**
 * Endpoint de diagnóstico para configuração do webhook
 *
 * GET /api/debug/webhook-config/[clientId]
 *
 * Retorna informações sobre a configuração do webhook para um cliente específico
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientConfig } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;

  try {
    console.log('🔍 Diagnosticando webhook para clientId:', clientId);

    // 1. Buscar config do cliente
    const config = await getClientConfig(clientId);

    if (!config) {
      return NextResponse.json(
        {
          ok: false,
          error: 'CLIENT_NOT_FOUND',
          message: 'Cliente não encontrado no banco de dados',
          clientId,
          suggestions: [
            'Verifique se o clientId está correto',
            'Consulte: SELECT id, name, status FROM clients WHERE id = \'' + clientId + '\'',
            'Crie o cliente se não existe',
          ],
        },
        { status: 404 }
      );
    }

    // 2. Verificar status
    const isActive = config.status === 'active';

    // 3. Verificar credenciais
    const hasVerifyToken = !!config.apiKeys.metaVerifyToken;
    const hasAppSecret = !!config.apiKeys.metaAppSecret;
    const hasAccessToken = !!config.apiKeys.metaAccessToken;

    // 4. Construir resposta
    const diagnostics = {
      ok: true,
      client: {
        id: config.id,
        name: config.name,
        status: config.status,
        phoneNumberId: config.apiKeys.metaPhoneNumberId,
      },
      checks: {
        clientExists: true,
        clientActive: isActive,
        hasVerifyToken,
        hasAppSecret,
        hasAccessToken,
      },
      webhookUrl: `https://uzzapp.uzzai.com.br/api/webhook/${clientId}`,
      verifyToken: hasVerifyToken
        ? {
            configured: true,
            length: config.apiKeys.metaVerifyToken?.length || 0,
            preview: config.apiKeys.metaVerifyToken?.substring(0, 20) + '...',
            fullToken: config.apiKeys.metaVerifyToken, // Para copiar e colar no Meta
          }
        : null,
      warnings: [] as string[],
      errors: [] as string[],
      suggestions: [] as string[],
    };

    // 5. Adicionar warnings e erros
    if (!isActive) {
      diagnostics.errors.push('Cliente não está ativo');
      diagnostics.suggestions.push(
        `Execute: UPDATE clients SET status = 'active' WHERE id = '${clientId}'`
      );
    }

    if (!hasVerifyToken) {
      diagnostics.errors.push('Verify token não configurado');
      diagnostics.suggestions.push(
        'Gere um token: openssl rand -hex 32',
        `Salve no Vault: SELECT vault.create_secret('<token>', 'meta_verify_token_${clientId}')`
      );
    }

    if (!hasAppSecret) {
      diagnostics.warnings.push('App secret não configurado (necessário para webhooks POST)');
      diagnostics.suggestions.push(
        'Copie o App Secret do Meta Dashboard',
        `Salve no Vault: SELECT vault.create_secret('<app-secret>', 'meta_app_secret_${clientId}')`
      );
    }

    if (!hasAccessToken) {
      diagnostics.warnings.push('Access token não configurado (necessário para enviar mensagens)');
      diagnostics.suggestions.push(
        'Copie o Access Token do Meta Dashboard',
        `Salve no Vault: SELECT vault.create_secret('<access-token>', 'meta_access_token_${clientId}')`
      );
    }

    // 6. Instruções de configuração
    diagnostics.suggestions.push(
      '',
      '📝 Configuração no Meta Dashboard:',
      '1. Acesse: https://developers.facebook.com/apps/',
      '2. Selecione seu app > WhatsApp > Configuração',
      '3. Cole a URL do Callback: ' + diagnostics.webhookUrl,
      '4. Cole o Verify Token (disponível acima)',
      '5. Clique em "Verificar e salvar"',
      '',
      '🧪 Teste local:',
      `curl "http://localhost:3000/api/webhook/${clientId}?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(config.apiKeys.metaVerifyToken || 'TOKEN_NAO_CONFIGURADO')}&hub.challenge=test123"`,
      'Resposta esperada: test123'
    );

    return NextResponse.json(diagnostics, { status: 200 });
  } catch (error) {
    console.error('❌ Erro ao diagnosticar webhook:', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : String(error),
        clientId,
      },
      { status: 500 }
    );
  }
}

/**
 * Script para testar verificação do webhook
 *
 * Usage:
 * npx tsx scripts/test-webhook-verification.ts <clientId>
 */

import { getClientConfig } from '@/lib/config';

const clientId = process.argv[2];

if (!clientId) {
  console.error('❌ Erro: clientId não fornecido');
  console.log('Usage: npx tsx scripts/test-webhook-verification.ts <clientId>');
  process.exit(1);
}

async function testWebhookVerification() {
  console.log('🔍 Testando verificação do webhook...\n');
  console.log(`📋 Client ID: ${clientId}\n`);

  try {
    // 1. Buscar config do cliente
    console.log('1️⃣ Buscando configuração do cliente...');
    const config = await getClientConfig(clientId);

    if (!config) {
      console.error('❌ ERRO: Cliente não encontrado no banco de dados!');
      console.log('\n💡 Solução:');
      console.log('   - Verifique se o clientId está correto');
      console.log('   - Crie o cliente no banco se ainda não existe');
      console.log('   - Consulte: SELECT id, name, status FROM clients WHERE id = \'', clientId, '\'');
      process.exit(1);
    }

    console.log('✅ Cliente encontrado:', config.name);
    console.log('   Status:', config.status);
    console.log('   Phone Number ID:', config.apiKeys.metaPhoneNumberId);
    console.log();

    // 2. Verificar status
    if (config.status !== 'active') {
      console.error('❌ ERRO: Cliente não está ativo!');
      console.log('   Status atual:', config.status);
      console.log('\n💡 Solução:');
      console.log('   UPDATE clients SET status = \'active\' WHERE id = \'', clientId, '\'');
      process.exit(1);
    }

    console.log('✅ Cliente está ativo');
    console.log();

    // 3. Verificar verify token
    console.log('2️⃣ Verificando token de verificação...');
    const verifyToken = config.apiKeys.metaVerifyToken;

    if (!verifyToken) {
      console.error('❌ ERRO: Verify token não configurado!');
      console.log('\n💡 Solução:');
      console.log('   1. Gere um token seguro (ex: openssl rand -hex 32)');
      console.log('   2. Salve no Vault:');
      console.log('      SELECT vault.create_secret(\'<token>\', \'meta_verify_token_', clientId, '\')');
      console.log('   3. Configure no Meta Dashboard');
      process.exit(1);
    }

    console.log('✅ Verify token configurado');
    console.log('   Tamanho:', verifyToken.length, 'caracteres');
    console.log('   Primeiros 20 chars:', verifyToken.substring(0, 20) + '...');
    console.log();

    // 4. Verificar app secret (para POST)
    console.log('3️⃣ Verificando app secret...');
    const appSecret = config.apiKeys.metaAppSecret;

    if (!appSecret) {
      console.warn('⚠️  AVISO: App secret não configurado!');
      console.log('   Necessário para validar webhooks POST (HMAC signature)');
      console.log('\n💡 Solução:');
      console.log('   1. Copie o App Secret do Meta Dashboard');
      console.log('   2. Salve no Vault:');
      console.log('      SELECT vault.create_secret(\'<app-secret>\', \'meta_app_secret_', clientId, '\')');
      console.log();
    } else {
      console.log('✅ App secret configurado');
      console.log();
    }

    // 5. Instruções para Meta
    console.log('4️⃣ Configuração no Meta Dashboard:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 URL do Callback:');
    console.log('   https://uzzapp.uzzai.com.br/api/webhook/', clientId);
    console.log();
    console.log('🔑 Verify Token (copie exatamente):');
    console.log('   ', verifyToken);
    console.log();
    console.log('📌 Passos:');
    console.log('   1. Acesse Meta for Developers > WhatsApp > Configuração');
    console.log('   2. Cole a URL do Callback acima');
    console.log('   3. Cole o Verify Token acima (EXATAMENTE como mostrado)');
    console.log('   4. Clique em "Verificar e salvar"');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log();

    // 6. Teste local
    console.log('5️⃣ Teste local do endpoint:');
    const testUrl = `http://localhost:3000/api/webhook/${clientId}?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(verifyToken)}&hub.challenge=test123`;
    console.log('   curl "', testUrl, '"');
    console.log();
    console.log('   Resposta esperada: test123');
    console.log();

    console.log('✅ Todos os checks passaram!');
    console.log('🎉 Webhook está pronto para verificação');

  } catch (error) {
    console.error('❌ Erro ao testar webhook:', error);
    process.exit(1);
  }
}

testWebhookVerification();

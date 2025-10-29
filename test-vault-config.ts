/**
 * Script de teste para validar configuração multi-tenant com Vault
 *
 * Execute: npx ts-node test-vault-config.ts
 * 
 * Ou com client_id específico:
 * npx ts-node test-vault-config.ts <client-id>
 */

import { getClientConfig, validateClientConfig } from './src/lib/config'

// Aceita client_id via argumento CLI ou usa fallback
// Nota: DEFAULT_CLIENT_ID está sendo removido do código de produção,
// mas mantemos aqui apenas como conveniência para este script de teste
const CLIENT_ID = process.argv[2] || process.env.DEFAULT_CLIENT_ID || 'b21b314f-c49a-467d-94b3-a21ed4412227'

const testVaultConfig = async () => {
  console.log('='.repeat(60))
  console.log('🧪 TESTE: Buscar configuração do cliente do Vault')
  console.log('='.repeat(60))
  console.log('')
  console.log(`📋 Client ID: ${CLIENT_ID}`)
  console.log('')

  try {
    // 1. Buscar config
    console.log('⏳ Buscando config do cliente...')
    const config = await getClientConfig(CLIENT_ID)

    if (!config) {
      console.error('❌ ERRO: Config não encontrado!')
      process.exit(1)
    }

    console.log('✅ Config carregado com sucesso!')
    console.log('')

    // 2. Validar config
    console.log('⏳ Validando config...')
    const isValid = validateClientConfig(config)

    if (!isValid) {
      console.error('❌ ERRO: Config inválido!')
      process.exit(1)
    }

    console.log('✅ Config válido!')
    console.log('')

    // 3. Exibir informações (sem secrets completos)
    console.log('='.repeat(60))
    console.log('📊 INFORMAÇÕES DO CLIENTE')
    console.log('='.repeat(60))
    console.log('')
    console.log(`👤 Nome: ${config.name}`)
    console.log(`🔗 Slug: ${config.slug}`)
    console.log(`📊 Status: ${config.status}`)
    console.log('')
    console.log('🔐 API KEYS (primeiros 15 caracteres):')
    console.log(`  Meta Access Token: ${config.apiKeys.metaAccessToken.substring(0, 15)}...`)
    console.log(`  Meta Verify Token: ${config.apiKeys.metaVerifyToken.substring(0, 15)}...`)
    console.log(`  Meta Phone Number ID: ${config.apiKeys.metaPhoneNumberId}`)
    console.log(`  OpenAI Key: ${config.apiKeys.openaiApiKey.substring(0, 15)}...`)
    console.log(`  Groq Key: ${config.apiKeys.groqApiKey.substring(0, 15)}...`)
    console.log('')
    console.log('📝 PROMPTS:')
    console.log(`  System Prompt: ${config.prompts.systemPrompt.substring(0, 100)}...`)
    console.log(`  Formatter Prompt: ${config.prompts.formatterPrompt || 'null (usa default)'}`)
    console.log('')
    console.log('⚙️  SETTINGS:')
    console.log(`  Batching Delay: ${config.settings.batchingDelaySeconds}s`)
    console.log(`  Max Tokens: ${config.settings.maxTokens}`)
    console.log(`  Temperature: ${config.settings.temperature}`)
    console.log(`  Enable RAG: ${config.settings.enableRAG}`)
    console.log(`  Enable Tools: ${config.settings.enableTools}`)
    console.log(`  Enable Human Handoff: ${config.settings.enableHumanHandoff}`)
    console.log(`  Max Chat History: ${config.settings.maxChatHistory}`)
    console.log('')
    console.log('📧 NOTIFICAÇÕES:')
    console.log(`  Email: ${config.notificationEmail || 'não configurado'}`)
    console.log('')

    console.log('='.repeat(60))
    console.log('✅ TESTE CONCLUÍDO COM SUCESSO!')
    console.log('='.repeat(60))
    console.log('')
    console.log('🎯 Próximos passos:')
    console.log('1. Adaptar chatbotFlow.ts para usar getClientConfig()')
    console.log('2. Criar webhook por cliente: /api/webhook/[clientId]')
    console.log('3. Testar fluxo completo end-to-end')
    console.log('')

    process.exit(0)
  } catch (error) {
    console.error('')
    console.error('❌ ERRO NO TESTE:')
    console.error(error)
    console.error('')
    process.exit(1)
  }
}

// Executar teste
testVaultConfig()

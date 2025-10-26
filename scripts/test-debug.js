#!/usr/bin/env node

/**
 * Script de teste para o Debug Dashboard
 * 
 * Uso:
 * node scripts/test-debug.js
 * 
 * ou via npm:
 * npm run test:debug
 */

const API_URL = process.env.API_URL || 'http://localhost:3000'

const testMessages = [
  {
    from: '5511999999999',
    text: 'Olá, preciso de ajuda!',
    name: 'Test User 1',
  },
  {
    from: '5511988888888',
    text: 'Quais são os preços?',
    name: 'Test User 2',
  },
  {
    from: '5511977777777',
    text: 'Quero falar com um humano',
    name: 'Test User 3',
  },
]

async function sendTestMessage(message) {
  console.log(`\n📤 Enviando mensagem de teste: ${message.from}`)
  console.log(`   Texto: "${message.text}"`)
  
  try {
    const response = await fetch(`${API_URL}/api/test/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    const data = await response.json()

    if (data.success) {
      console.log(`   ✅ Sucesso!`)
      console.log(`   🔗 Ver no dashboard: ${API_URL}/dashboard/debug`)
    } else {
      console.log(`   ❌ Erro: ${data.error}`)
    }

    return data
  } catch (error) {
    console.error(`   ❌ Erro de rede: ${error.message}`)
    return null
  }
}

async function main() {
  console.log('🧪 Teste do Debug Dashboard')
  console.log('═══════════════════════════════════════')
  console.log(`📍 API URL: ${API_URL}`)
  console.log(`📊 Dashboard: ${API_URL}/dashboard/debug`)
  console.log('═══════════════════════════════════════')

  for (const message of testMessages) {
    await sendTestMessage(message)
    // Aguarda 1 segundo entre mensagens para não sobrecarregar
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log('\n✨ Testes concluídos!')
  console.log(`\n🔗 Acesse o dashboard: ${API_URL}/dashboard/debug`)
  console.log('   Para ver as execuções em tempo real\n')
}

main().catch(console.error)

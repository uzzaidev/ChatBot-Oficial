// Test Groq API Key
const GROQ_API_KEY = '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'

async function testGroqKey() {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 10,
      }),
    })

    const data = await response.json()

    if (response.ok) {
      console.log('✅ Groq API Key VÁLIDA!')
      console.log('Resposta:', data.choices[0].message.content)
    } else {
      console.log('❌ Groq API Key INVÁLIDA!')
      console.log('Erro:', data)
    }
  } catch (error) {
    console.log('❌ Erro na requisição:', error.message)
  }
}

testGroqKey()

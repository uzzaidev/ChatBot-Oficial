/**
 * INTEGRATION EXAMPLE: Usage Tracking in n8n Webhook Handler
 * 
 * This file demonstrates how to integrate usage tracking into your
 * n8n workflow or webhook handler.
 * 
 * DO NOT USE THIS FILE DIRECTLY - it's a reference example.
 * Copy the relevant code into your actual webhook handler.
 */

import { logOpenAIUsage, logGroqUsage, logWhisperUsage } from '@/lib/usageTracking'

// ========================================
// EXAMPLE 1: Tracking OpenAI Chat Completion
// ========================================

async function handleOpenAIChatCompletion(
  clientId: string,
  conversationId: string | undefined,
  phone: string,
  messages: any[]
) {
  const openai = getOpenAIClient()
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: messages,
    temperature: 0.7,
    max_tokens: 500,
  })

  // ✅ Log usage immediately after API call
  if (response.usage) {
    await logOpenAIUsage(
      clientId,
      conversationId,
      phone,
      'gpt-4',
      response.usage
    ).catch(err => {
      // Don't break flow if logging fails
      console.error('Failed to log OpenAI usage:', err)
    })
  }

  return response.choices[0].message.content
}

// ========================================
// EXAMPLE 2: Tracking Groq Chat Completion
// ========================================

async function handleGroqChatCompletion(
  clientId: string,
  conversationId: string | undefined,
  phone: string,
  messages: any[]
) {
  const groq = getGroqClient()
  
  const response = await groq.chat.completions.create({
    model: 'llama-3.1-70b-versatile',
    messages: messages,
    temperature: 0.7,
    max_tokens: 500,
  })

  // ✅ Log usage with timing information (Groq-specific)
  if (response.usage) {
    await logGroqUsage(
      clientId,
      conversationId,
      phone,
      'llama-3.1-70b-versatile',
      response.usage // Includes prompt_time, completion_time
    ).catch(err => {
      console.error('Failed to log Groq usage:', err)
    })
  }

  return response.choices[0].message.content
}

// ========================================
// EXAMPLE 3: Tracking Whisper Transcription
// ========================================

async function handleAudioTranscription(
  clientId: string,
  conversationId: string | undefined,
  phone: string,
  audioBuffer: Buffer,
  durationSeconds: number
) {
  const transcription = await transcribeAudio(audioBuffer)

  // ✅ Log Whisper usage with duration
  await logWhisperUsage(
    clientId,
    conversationId,
    phone,
    durationSeconds
  ).catch(err => {
    console.error('Failed to log Whisper usage:', err)
  })

  return transcription
}

// ========================================
// EXAMPLE 4: Integration in n8n Webhook
// ========================================

/**
 * This is how you would integrate in your actual webhook handler
 * (src/app/api/webhook/[clientId]/route.ts or similar)
 */
export async function POST(request: Request) {
  try {
    // ... existing webhook validation code ...
    
    // Extract data from WhatsApp webhook
    const { phone, message, clientId } = await parseWebhookPayload(request)
    
    // Get or create conversation
    const conversation = await getOrCreateConversation(clientId, phone)
    
    // Get chat history
    const chatHistory = await getChatHistory(phone)
    
    // OPTION A: Use OpenAI
    const openaiResponse = await openai.chat.completions.create({
      model: config.models.openaiModel || 'gpt-4',
      messages: chatHistory,
    })
    
    // ✅ Track OpenAI usage
    if (openaiResponse.usage) {
      await logOpenAIUsage(
        clientId,
        conversation.id,
        phone,
        config.models.openaiModel || 'gpt-4',
        openaiResponse.usage
      ).catch(console.error)
    }
    
    // OPTION B: Use Groq
    const groqResponse = await groq.chat.completions.create({
      model: config.models.groqModel || 'llama-3.1-70b-versatile',
      messages: chatHistory,
    })
    
    // ✅ Track Groq usage
    if (groqResponse.usage) {
      await logGroqUsage(
        clientId,
        conversation.id,
        phone,
        config.models.groqModel || 'llama-3.1-70b-versatile',
        groqResponse.usage
      ).catch(console.error)
    }
    
    // ... rest of webhook handler ...
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ========================================
// EXAMPLE 5: Batch Usage Tracking
// ========================================

/**
 * If you process multiple messages in batch,
 * you can track them all at once
 */
async function handleBatchMessages(
  clientId: string,
  messages: Array<{
    phone: string
    conversationId?: string
    content: string
  }>
) {
  const results = []
  
  for (const msg of messages) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: msg.content }],
    })
    
    // Track each message separately
    if (response.usage) {
      await logOpenAIUsage(
        clientId,
        msg.conversationId,
        msg.phone,
        'gpt-4',
        response.usage
      ).catch(console.error)
    }
    
    results.push(response.choices[0].message.content)
  }
  
  return results
}

// ========================================
// NOTES FOR INTEGRATION
// ========================================

/**
 * IMPORTANT INTEGRATION POINTS:
 * 
 * 1. ALWAYS call logging functions AFTER successful API response
 * 2. Use .catch() to prevent logging errors from breaking flow
 * 3. Pass conversation_id when available for better analytics
 * 4. Model name must match what you're actually using
 * 5. clientId should come from authenticated session or webhook validation
 * 
 * WHERE TO ADD TRACKING:
 * 
 * - In n8n workflow "Function" nodes (after AI API calls)
 * - In webhook handlers (src/app/api/webhook/*)
 * - In any custom API routes that call OpenAI/Groq
 * - In background jobs that process messages
 * 
 * VERIFICATION:
 * 
 * After integration, verify tracking works:
 * 
 * 1. Send a test message through your system
 * 2. Check database: SELECT * FROM usage_logs ORDER BY created_at DESC LIMIT 5;
 * 3. Check analytics dashboard: /dashboard/analytics
 * 4. Verify costs are calculated correctly
 */

export {}

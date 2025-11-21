import { getBotConfig } from '@/lib/config'
import { query } from '@/lib/postgres'

export interface CheckContinuityInput {
  phone: string
  clientId: string
}

export interface CheckContinuityOutput {
  isNewConversation: boolean
  hoursSinceLastMessage: number | null
  lastMessageTimestamp: Date | null
  greetingInstruction: string
}

/**
 * 🔧 Phase 1: Continuity Detection
 * 
 * Checks if this is a new conversation or a continuation based on time since last interaction.
 * Uses bot configuration 'continuity:new_conversation_threshold_hours' to determine threshold.
 * 
 * Returns appropriate greeting instruction from bot configuration.
 */
export const checkContinuity = async (input: CheckContinuityInput): Promise<CheckContinuityOutput> => {
  const startTime = Date.now()

  try {
    const { phone, clientId } = input


    // 1. Fetch threshold configuration from database
    const thresholdHours = await getBotConfig(clientId, 'continuity:new_conversation_threshold_hours')
    const thresholdValue = thresholdHours !== null ? Number(thresholdHours) : 24 // Default 24 hours


    // 2. Get last message timestamp from chat history
    const result = await query<any>(
      `SELECT created_at
       FROM n8n_chat_histories
       WHERE session_id = $1 AND client_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [phone, clientId]
    )

    const duration = Date.now() - startTime

    // 3. Calculate time difference
    let isNewConversation = true
    let hoursSinceLastMessage: number | null = null
    let lastMessageTimestamp: Date | null = null

    if (result.rows && result.rows.length > 0) {
      lastMessageTimestamp = new Date(result.rows[0].created_at)
      const now = new Date()
      const diffMs = now.getTime() - lastMessageTimestamp.getTime()
      hoursSinceLastMessage = diffMs / (1000 * 60 * 60)

      isNewConversation = hoursSinceLastMessage > thresholdValue

    } else {
    }

    // 4. Get appropriate greeting instruction from configuration
    const greetingKey = isNewConversation 
      ? 'continuity:greeting_for_new_customer'
      : 'continuity:greeting_for_returning_customer'

    const greetingInstruction = await getBotConfig(clientId, greetingKey)
    const finalGreeting = greetingInstruction !== null 
      ? String(greetingInstruction)
      : (isNewConversation 
          ? 'Seja acolhedor e apresente o profissional brevemente. Esta é a PRIMEIRA interação.'
          : 'Continue de onde parou. NÃO se apresente novamente. O cliente já te conhece.')


    return {
      isNewConversation,
      hoursSinceLastMessage,
      lastMessageTimestamp,
      greetingInstruction: finalGreeting,
    }
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[checkContinuity] ❌ Error after ${duration}ms:`, error)

    // Fallback to safe defaults
    return {
      isNewConversation: true,
      hoursSinceLastMessage: null,
      lastMessageTimestamp: null,
      greetingInstruction: 'Seja acolhedor e apresente o profissional brevemente.',
    }
  }
}

import { query } from '@/lib/postgres'

export interface UpdateMessageWithWamidInput {
  phone: string
  clientId: string
  messageContent: string
  wamid: string
}

/**
 * Updates the most recent AI message with the WhatsApp message ID (wamid)
 * and changes status from 'pending' to 'sent'
 *
 * This is called after successfully sending a message to WhatsApp API
 */
export const updateMessageWithWamid = async (input: UpdateMessageWithWamidInput): Promise<void> => {
  const { phone, clientId, messageContent, wamid } = input

  try {
    // Update the most recent message that matches:
    // - session_id (phone)
    // - client_id
    // - type = 'ai' (in JSON)
    // - content matches (in JSON)
    // - status = 'pending'
    // - wamid is null
    const result = await query(
      `UPDATE n8n_chat_histories
       SET wamid = $1,
           status = 'sent',
           updated_at = NOW()
       WHERE session_id = $2
         AND client_id = $3
         AND (message->>'type') = 'ai'
         AND (message->>'content') = $4
         AND status = 'pending'
         AND wamid IS NULL
       ORDER BY created_at DESC
       LIMIT 1
       RETURNING id`,
      [wamid, phone, clientId, messageContent]
    )

    if (result.rows.length === 0) {
      console.warn(`⚠️ Could not find pending message to update with wamid ${wamid}`)
    } else {
      console.log(`✅ Updated message with wamid: ${wamid}`)
    }
  } catch (error) {
    console.error(`❌ Failed to update message with wamid:`, error)
    // Don't throw - this is a non-critical update
  }
}

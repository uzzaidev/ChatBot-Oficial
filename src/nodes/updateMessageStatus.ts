import { query } from '@/lib/postgres'

export interface UpdateMessageStatusInput {
  wamid: string // WhatsApp Message ID
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  errorDetails?: {
    code: number
    title: string
    message: string
    error_data?: any
  }
  clientId: string
}

export const updateMessageStatus = async (input: UpdateMessageStatusInput): Promise<void> => {
  const { wamid, status, errorDetails, clientId } = input

  try {
    // Update status in n8n_chat_histories
    // Note: We filter by both wamid AND client_id for multi-tenant isolation
    const result = await query(
      `UPDATE n8n_chat_histories
       SET status = $1,
           error_details = $2,
           updated_at = NOW()
       WHERE wamid = $3
         AND client_id = $4
       RETURNING id`,
      [status, errorDetails ? JSON.stringify(errorDetails) : null, wamid, clientId]
    )

    if (result.rows.length === 0) {
      console.warn(`⚠️ Message with wamid ${wamid} not found for client ${clientId}`)
    } else {
      console.log(`✅ Updated message status: ${wamid} -> ${status}`)
    }
  } catch (error) {
    console.error(`❌ Failed to update message status:`, error)
    throw new Error(`Failed to update message status: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Process WhatsApp status update webhook
 * Called when Meta sends status updates (sent, delivered, read, failed)
 */
export interface ProcessStatusUpdateInput {
  statusUpdate: {
    id: string // wamid
    status: 'sent' | 'delivered' | 'read' | 'failed'
    timestamp: string
    recipient_id: string
    errors?: Array<{
      code: number
      title: string
      message: string
      error_data?: any
    }>
  }
  clientId: string
}

export const processStatusUpdate = async (input: ProcessStatusUpdateInput): Promise<void> => {
  const { statusUpdate, clientId } = input
  const { id: wamid, status, errors } = statusUpdate

  // Extract error details if status is failed
  const errorDetails = status === 'failed' && errors && errors.length > 0
    ? errors[0]
    : undefined

  await updateMessageStatus({
    wamid,
    status,
    errorDetails,
    clientId,
  })
}

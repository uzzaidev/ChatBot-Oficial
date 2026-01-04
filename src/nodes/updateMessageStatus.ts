import { query } from "@/lib/postgres";

export interface UpdateMessageStatusInput {
  wamid: string; // WhatsApp Message ID
  status: "pending" | "sent" | "delivered" | "read" | "failed";
  errorDetails?: {
    code: number;
    title: string;
    message: string;
    error_data?: any;
  };
  clientId: string;
}

export const updateMessageStatus = async (
  input: UpdateMessageStatusInput,
): Promise<boolean> => {
  const { wamid, status, errorDetails, clientId } = input;

  try {
    console.log("🔄 Updating message status:", { wamid, status, clientId });

    // Update status in n8n_chat_histories
    // Note: We filter by both wamid AND client_id for multi-tenant isolation
    const result = await query(
      `UPDATE n8n_chat_histories
       SET status = $1,
           error_details = $2,
           updated_at = NOW()
       WHERE wamid = $3
         AND client_id = $4
       RETURNING id, session_id, status`,
      [
        status,
        errorDetails ? JSON.stringify(errorDetails) : null,
        wamid,
        clientId,
      ],
    );

    if (result.rows.length === 0) {
      console.warn(
        `⚠️ Message with wamid ${wamid} not found for client ${clientId}`,
      );

      // Debug: Let's check if the message exists at all
      const checkResult = await query(
        `SELECT id, wamid, status, client_id, session_id
         FROM n8n_chat_histories
         WHERE wamid = $1
         LIMIT 1`,
        [wamid],
      );

      if (checkResult.rows.length > 0) {
        console.warn(
          "⚠️ Message exists but with different client_id:",
          checkResult.rows[0],
        );
      } else {
        console.warn("⚠️ Message does not exist in database");
      }

      return false;
    } else {
      console.log(`✅ Updated message status:`, {
        id: result.rows[0].id,
        wamid,
        status,
        session_id: result.rows[0].session_id,
      });

      return true;
    }
  } catch (error) {
    console.error(`❌ Failed to update message status:`, error);
    throw new Error(
      `Failed to update message status: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
};

/**
 * Process WhatsApp status update webhook
 * Called when Meta sends status updates (sent, delivered, read, failed)
 */
export interface ProcessStatusUpdateInput {
  statusUpdate: {
    id: string; // wamid
    status: "sent" | "delivered" | "read" | "failed";
    timestamp: string;
    recipient_id: string;
    errors?: Array<{
      code: number;
      title: string;
      message: string;
      error_data?: any;
    }>;
  };
  clientId: string;
}

export const processStatusUpdate = async (
  input: ProcessStatusUpdateInput,
): Promise<void> => {
  const { statusUpdate, clientId } = input;
  const { id: wamid, status, errors } = statusUpdate;

  // Extract error details if status is failed
  const errorDetails = status === "failed" && errors && errors.length > 0
    ? errors[0]
    : undefined;

  const updated = await updateMessageStatus({
    wamid,
    status,
    errorDetails,
    clientId,
  });

  if (!updated) {
    throw new Error(
      `Status update could not be applied (message not found for wamid=${wamid})`,
    );
  }
};

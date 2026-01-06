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

export interface UpdateMessageStatusResult {
  updated: boolean;
  updatedRow?: {
    id: string;
    session_id: string;
    status: string;
  };
  existingRow?: {
    id: string;
    wamid: string;
    status: string | null;
    client_id: string | null;
    session_id: string | null;
  };
}

export const updateMessageStatus = async (
  input: UpdateMessageStatusInput,
): Promise<UpdateMessageStatusResult> => {
  const { wamid, status, errorDetails, clientId } = input;

  try {
    console.log("🔄 Updating message status:", { wamid, status, clientId });

    // 1) Update status in n8n_chat_histories (legacy chat store)
    // Note: We filter by both wamid AND client_id for multi-tenant isolation
    const historiesResult = await query(
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

    if (historiesResult.rows.length > 0) {
      console.log(`✅ Updated message status (n8n_chat_histories):`, {
        id: historiesResult.rows[0].id,
        wamid,
        status,
        session_id: historiesResult.rows[0].session_id,
      });

      return {
        updated: true,
        updatedRow: {
          id: String(historiesResult.rows[0].id),
          session_id: String(historiesResult.rows[0].session_id),
          status: String(historiesResult.rows[0].status),
        },
      };
    }

    // 2) Fallback: Update status in messages table (used by interactive flows)
    // The flow stores Meta messageId (wamid.*) in messages.metadata.wamid
    const messagesResult = await query(
      `UPDATE messages
       SET status = $1,
           metadata = (
             COALESCE(metadata, '{}'::jsonb)
             || jsonb_build_object(
               'error_details', $2::jsonb,
               'status_updated_at', NOW()
             )
           )
       WHERE client_id = $3
         AND metadata->>'wamid' = $4
       RETURNING id, phone, status`,
      [
        status,
        errorDetails ? JSON.stringify(errorDetails) : null,
        clientId,
        wamid,
      ],
    );

    if (messagesResult.rows.length > 0) {
      console.log(`✅ Updated message status (messages):`, {
        id: messagesResult.rows[0].id,
        wamid,
        status,
        phone: messagesResult.rows[0].phone,
      });

      return {
        updated: true,
        updatedRow: {
          id: String(messagesResult.rows[0].id),
          session_id: String(messagesResult.rows[0].phone),
          status: String(messagesResult.rows[0].status),
        },
      };
    }

    console.warn(
      `⚠️ Message with wamid ${wamid} not found for client ${clientId} in n8n_chat_histories or messages`,
    );

    // Debug: Let's check if the message exists at all (possibly different tenant)
    const checkResult = await query(
      `SELECT id, wamid, status, client_id, session_id
       FROM n8n_chat_histories
       WHERE wamid = $1
       LIMIT 1`,
      [wamid],
    );

    const existingRow = checkResult.rows.length > 0
      ? (checkResult.rows[0] as UpdateMessageStatusResult["existingRow"])
      : undefined;

    if (existingRow) {
      console.warn(
        "⚠️ Message exists but with different client_id:",
        existingRow,
      );
    } else {
      console.warn("⚠️ Message does not exist in database");
    }

    return {
      updated: false,
      existingRow,
    };
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

  const result = await updateMessageStatus({
    wamid,
    status,
    errorDetails,
    clientId,
  });

  if (!result.updated) {
    // ✨ GRACEFUL HANDLING: Status updates are not critical
    // If message doesn't exist, it could be:
    // 1. Race condition (status arrived before message was saved)
    // 2. Old message (before wamid tracking was implemented)
    // 3. Test/simulation message (not saved in database)
    //
    // Instead of throwing error (which breaks webhook), just log warning
    const existing = result.existingRow
      ? ` existingRow=${JSON.stringify(result.existingRow)}`
      : "";

    console.warn(
      `⚠️ Status update ignored (message not found): wamid=${wamid}, status=${status}, clientId=${clientId}.${existing}`,
    );

    // ✅ Return successfully - status updates are non-critical
    // Frontend will handle missing status gracefully
    return;
  }

  console.log(`✅ Status update processed successfully: wamid=${wamid}, status=${status}`);
};

import { query } from "@/lib/postgres";

export interface CheckDuplicateMessageInput {
  phone: string;
  messageContent: string;
  clientId: string;
}

export interface CheckDuplicateMessageResult {
  isDuplicate: boolean;
  reason?: string;
  recentMessage?: {
    content: string;
    timestamp: Date;
    timeSinceMs: number;
  };
}

/**
 * 🔍 Check if incoming message is a duplicate or very similar to a recent message
 *
 * Prevents duplicate responses when:
 * - User sends same message multiple times quickly
 * - Network issues cause duplicate webhook deliveries
 * - Race conditions cause overlapping batch processing
 *
 * @param input - Message to check
 * @returns Whether message is duplicate and details
 */
export const checkDuplicateMessage = async (
  input: CheckDuplicateMessageInput,
): Promise<CheckDuplicateMessageResult> => {
  const { phone, messageContent, clientId } = input;

  try {
    // Look for recent user messages (last 15 seconds)
    // that are identical or very similar
    const result = await query(
      `SELECT
        message->>'content' as content,
        created_at,
        EXTRACT(EPOCH FROM (NOW() - created_at)) * 1000 as time_since_ms
       FROM n8n_chat_histories
       WHERE session_id = $1
         AND client_id = $2
         AND (message->>'type') = 'human'
         AND created_at > NOW() - INTERVAL '15 seconds'
       ORDER BY created_at DESC
       LIMIT 5`,
      [phone, clientId],
    );

    if (result.rows.length === 0) {
      // No recent messages - definitely not a duplicate
      return { isDuplicate: false };
    }

    const normalizedInput = normalizeMessage(messageContent);

    for (const row of result.rows) {
      const recentContent = row.content;
      const timeSinceMs = parseFloat(row.time_since_ms);
      const normalizedRecent = normalizeMessage(recentContent);

      // Check for exact match (case-insensitive, whitespace-normalized)
      if (normalizedInput === normalizedRecent) {
        console.warn(
          `⚠️ [checkDuplicateMessage] Exact duplicate detected for ${phone}:`,
          {
            message: messageContent,
            timeSinceMs: Math.round(timeSinceMs),
          },
        );

        return {
          isDuplicate: true,
          reason: "exact_match",
          recentMessage: {
            content: recentContent,
            timestamp: new Date(row.created_at),
            timeSinceMs: Math.round(timeSinceMs),
          },
        };
      }

      // Check for very similar messages (>90% similarity)
      const similarity = calculateSimilarity(normalizedInput, normalizedRecent);

      if (similarity > 0.9 && timeSinceMs < 10000) {
        // Within 10s and 90%+ similar
        console.warn(
          `⚠️ [checkDuplicateMessage] Similar duplicate detected for ${phone}:`,
          {
            message: messageContent,
            similarity: Math.round(similarity * 100) + "%",
            timeSinceMs: Math.round(timeSinceMs),
          },
        );

        return {
          isDuplicate: true,
          reason: "high_similarity",
          recentMessage: {
            content: recentContent,
            timestamp: new Date(row.created_at),
            timeSinceMs: Math.round(timeSinceMs),
          },
        };
      }
    }

    // No duplicates found
    return { isDuplicate: false };
  } catch (error) {
    console.error("[checkDuplicateMessage] Error checking duplicates:", error);
    // On error, don't block - assume not duplicate
    return { isDuplicate: false };
  }
};

/**
 * Normalize message for comparison
 * - Lowercase
 * - Remove extra whitespace
 * - Remove punctuation
 */
function normalizeMessage(message: string): string {
  return message
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ") // Multiple spaces → single space
    .replace(/[^\w\s]/g, ""); // Remove punctuation
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 * Returns value between 0 (completely different) and 1 (identical)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  // Edge cases
  if (len1 === 0 && len2 === 0) return 1;
  if (len1 === 0 || len2 === 0) return 0;

  // Levenshtein distance matrix
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost, // substitution
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  const similarity = 1 - distance / maxLen;

  return similarity;
}

import { createServiceRoleClient } from '@/lib/supabase'

export interface CheckDuplicateMessageInput {
  phone: string
  messageContent: string
  clientId: string
  wamid?: string
}

export interface CheckDuplicateMessageResult {
  isDuplicate: boolean
  reason?: string
  recentMessage?: {
    content: string
    timestamp: Date
    timeSinceMs: number
  }
}

export const checkDuplicateMessage = async (
  input: CheckDuplicateMessageInput,
): Promise<CheckDuplicateMessageResult> => {
  const { phone, messageContent, clientId, wamid } = input

  try {
    const supabase = createServiceRoleClient()

    // Primary check: exact wamid match (Meta may deliver same webhook twice)
    // IMPORTANT: when wamid exists and is not found, do NOT run content-based
    // similarity fallback. WAMID is authoritative and avoids false positives.
    if (wamid) {
      const { data: wamidRows } = await (supabase as any)
        .from('n8n_chat_histories')
        .select('wamid, created_at')
        .eq('wamid', wamid)
        .eq('client_id', clientId)
        .limit(1)

      if (wamidRows && wamidRows.length > 0) {
        return { isDuplicate: true, reason: 'wamid_match' }
      }

      return { isDuplicate: false }
    }

    // Fallback check (only when no wamid is available): same content within 15s.
    const since = new Date(Date.now() - 15_000).toISOString()
    const { data: rows } = await (supabase as any)
      .from('n8n_chat_histories')
      .select('message, created_at')
      .eq('session_id', phone)
      .eq('client_id', clientId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5)

    if (!rows || rows.length === 0) return { isDuplicate: false }

    const normalizedInput = normalizeMessage(messageContent)
    if (!normalizedInput) return { isDuplicate: false }

    for (const row of rows) {
      const msg = typeof row.message === 'string' ? JSON.parse(row.message) : row.message
      if (msg?.type !== 'human') continue

      const recentContent = msg.content || msg.data?.content || ''
      const timeSinceMs = Date.now() - new Date(row.created_at).getTime()
      const normalizedRecent = normalizeMessage(recentContent)
      if (!normalizedRecent) continue

      if (normalizedInput === normalizedRecent) {
        return {
          isDuplicate: true,
          reason: 'exact_match',
          recentMessage: {
            content: recentContent,
            timestamp: new Date(row.created_at),
            timeSinceMs: Math.round(timeSinceMs),
          },
        }
      }

      const similarity = calculateSimilarity(normalizedInput, normalizedRecent)
      if (similarity > 0.9 && timeSinceMs < 10_000) {
        return {
          isDuplicate: true,
          reason: 'high_similarity',
          recentMessage: {
            content: recentContent,
            timestamp: new Date(row.created_at),
            timeSinceMs: Math.round(timeSinceMs),
          },
        }
      }
    }

    return { isDuplicate: false }
  } catch {
    // On error, don't block — assume not duplicate
    return { isDuplicate: false }
  }
}

const normalizeMessage = (message: string): string =>
  message
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')

const calculateSimilarity = (str1: string, str2: string): number => {
  const len1 = str1.length
  const len2 = str2.length
  if (len1 === 0 && len2 === 0) return 1
  if (len1 === 0 || len2 === 0) return 0

  const matrix: number[][] = []
  for (let i = 0; i <= len1; i++) matrix[i] = [i]
  for (let j = 0; j <= len2; j++) matrix[0][j] = j

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      )
    }
  }

  return 1 - matrix[len1][len2] / Math.max(len1, len2)
}

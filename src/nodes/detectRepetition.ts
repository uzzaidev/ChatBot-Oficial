import { getBotConfigs } from '@/lib/config'
import { query } from '@/lib/postgres'

export interface DetectRepetitionInput {
  phone: string
  clientId: string
  proposedResponse: string
}

export interface DetectRepetitionOutput {
  isRepetition: boolean
  similarityScore: number | null
  usedEmbeddings: boolean
}

/**
 * 🔧 Phase 3: Repetition Detection
 * 
 * Detects if the proposed bot response is too similar to recent responses,
 * avoiding repetitive answers.
 * 
 * Uses configurations:
 * - 'repetition_detector:use_embeddings' - whether to use embeddings (more accurate)
 * - 'repetition_detector:similarity_threshold' - threshold for considering repetition (0-1)
 * - 'repetition_detector:check_last_n_responses' - how many recent responses to check
 */
export const detectRepetition = async (input: DetectRepetitionInput): Promise<DetectRepetitionOutput> => {
  const startTime = Date.now()

  try {
    const { phone, clientId, proposedResponse } = input

    console.log('[detectRepetition] 🔍 Checking for repetition')
    console.log('[detectRepetition] 📱 Phone:', phone)
    console.log('[detectRepetition] 🔐 Client ID:', clientId)
    console.log('[detectRepetition] 💬 Proposed response:', proposedResponse.substring(0, 100) + '...')

    // 1. Fetch configurations
    const configs = await getBotConfigs(clientId, [
      'repetition_detector:use_embeddings',
      'repetition_detector:similarity_threshold',
      'repetition_detector:check_last_n_responses',
    ])

    const useEmbeddings = configs.get('repetition_detector:use_embeddings') === true
    const similarityThreshold = configs.get('repetition_detector:similarity_threshold') !== null
      ? Number(configs.get('repetition_detector:similarity_threshold'))
      : 0.70
    const checkLastN = configs.get('repetition_detector:check_last_n_responses') !== null
      ? Number(configs.get('repetition_detector:check_last_n_responses'))
      : 3

    console.log('[detectRepetition] 🤖 Use embeddings:', useEmbeddings)
    console.log('[detectRepetition] 📊 Similarity threshold:', similarityThreshold)
    console.log('[detectRepetition] 🔢 Check last N responses:', checkLastN)

    // 2. Get recent bot responses from chat history
    const result = await query<any>(
      `SELECT message, created_at
       FROM n8n_chat_histories
       WHERE session_id = $1 AND client_id = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [phone, clientId, checkLastN * 2] // Fetch more to filter AI messages
    )

    if (!result.rows || result.rows.length === 0) {
      console.log('[detectRepetition] 📭 No history found - no repetition possible')
      return {
        isRepetition: false,
        similarityScore: null,
        usedEmbeddings: false,
      }
    }

    // 3. Extract AI responses
    const aiResponses: string[] = []
    for (const row of result.rows) {
      try {
        const parsedMessage = typeof row.message === 'string' ? JSON.parse(row.message) : row.message
        if (parsedMessage.type === 'ai') {
          aiResponses.push(parsedMessage.content || '')
          if (aiResponses.length >= checkLastN) break
        }
      } catch (error) {
        // Skip malformed messages
        continue
      }
    }

    if (aiResponses.length === 0) {
      console.log('[detectRepetition] 📭 No AI responses found in history')
      return {
        isRepetition: false,
        similarityScore: null,
        usedEmbeddings: false,
      }
    }

    console.log(`[detectRepetition] 📚 Found ${aiResponses.length} recent AI responses`)

    // 4. Check similarity
    let maxSimilarity = 0
    let isRepetition = false

    if (useEmbeddings) {
      // TODO: Implement embedding-based similarity when OpenAI embeddings are available
      // For now, fall back to word-based comparison
      console.log('[detectRepetition] ⚠️  Embeddings not yet implemented, using word comparison')
      maxSimilarity = calculateWordSimilarity(proposedResponse, aiResponses)
      isRepetition = maxSimilarity >= similarityThreshold
    } else {
      // Simple word-based similarity
      maxSimilarity = calculateWordSimilarity(proposedResponse, aiResponses)
      isRepetition = maxSimilarity >= similarityThreshold
    }

    const duration = Date.now() - startTime

    console.log(`[detectRepetition] 📊 Max similarity: ${(maxSimilarity * 100).toFixed(1)}%`)
    console.log(`[detectRepetition] ${isRepetition ? '⚠️  REPETITION DETECTED' : '✅ No repetition'} (${duration}ms)`)

    return {
      isRepetition,
      similarityScore: maxSimilarity,
      usedEmbeddings: false, // Will be true when embeddings are implemented
    }
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[detectRepetition] ❌ Error after ${duration}ms:`, error)

    // On error, assume no repetition (fail open)
    return {
      isRepetition: false,
      similarityScore: null,
      usedEmbeddings: false,
    }
  }
}

/**
 * Calculate word-based similarity (Jaccard similarity)
 * Returns value between 0 (no similarity) and 1 (identical)
 */
const calculateWordSimilarity = (text1: string, textArray: string[]): number => {
  const words1 = new Set(
    text1
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2) // Ignore very short words
  )

  let maxSimilarity = 0

  for (const text2 of textArray) {
    const words2 = new Set(
      text2
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 2)
    )

    // Jaccard similarity: intersection / union
    const intersection = new Set(Array.from(words1).filter((w) => words2.has(w)))
    const union = new Set([...Array.from(words1), ...Array.from(words2)])

    if (union.size === 0) continue

    const similarity = intersection.size / union.size
    maxSimilarity = Math.max(maxSimilarity, similarity)
  }

  return maxSimilarity
}

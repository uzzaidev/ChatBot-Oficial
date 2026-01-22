import { lrangeMessages, deleteKey, get, setWithExpiry, acquireLock } from '@/lib/redis'
import { getBotConfig } from '@/lib/config'

interface RedisMessage {
  content: string
  timestamp: string
}

const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Batches multiple messages from the same user with configurable delay
 *
 * How it works:
 * 1. First message arrives → Acquires lock → Waits X seconds → Processes batch
 * 2. Second message arrives (within X seconds) → Cannot acquire lock → Returns empty immediately
 * 3. When debounce is reset, the holder RESTARTS the wait (not exits!)
 *
 * ❌ OLD BUG: When debounce was reset, holder would exit assuming newer flow would wait.
 *             But newer flow already exited because lock existed. Result: no one processes!
 *
 * ✅ FIX: Holder restarts wait when debounce is reset, ensuring all messages get processed.
 *
 * @param phone - User's phone number
 * @param clientId - Client ID for configuration lookup
 * @returns Concatenated message content, or empty string if should skip
 */
export const batchMessages = async (phone: string, clientId: string): Promise<string> => {
  const lockKey = `batch_lock:${phone}`
  const debounceKey = `debounce:${phone}`
  const messagesKey = `messages:${phone}`
  const lastProcessedKey = `last_processed:${phone}` // Track when we last processed this user

  // Generate unique execution ID for this flow
  const executionId = crypto.randomUUID()

  try {
    // Get configurable delay from bot_configurations (default 30s)
    const delayConfig = await getBotConfig(clientId, 'batching:delay_seconds')
    const delaySeconds = delayConfig?.config_value
      ? Number(delayConfig.config_value) || 30
      : 30
    const BATCH_DELAY_MS = delaySeconds * 1000

    // Lock TTL must cover: batch wait + AI processing + message sending
    // Formula: batchDelay * maxRestarts + 60s buffer (AI + send time)
    // Example: 30s batch * 5 restarts + 60s buffer = 210s total
    const MAX_RESTARTS = 5
    const LOCK_TTL_SECONDS = (delaySeconds * MAX_RESTARTS) + 60

    // Try to acquire lock with dynamic TTL based on configured delay
    const lockAcquired = await acquireLock(lockKey, executionId, LOCK_TTL_SECONDS)

    if (!lockAcquired) {
      // Another flow is already processing this user's messages
      // Exit immediately without processing
      console.log(`[batchMessages] Lock exists for ${phone}, skipping processing`)
      return ''
    }

    // ✅ ADDITIONAL PROTECTION: Check if we processed recently (even if lock expired)
    // This prevents duplicate processing if lock expires before flow completes
    const lastProcessedStr = await get(lastProcessedKey)
    if (lastProcessedStr) {
      const lastProcessedTime = parseInt(lastProcessedStr, 10)
      const timeSinceProcessed = Date.now() - lastProcessedTime

      // If processed within last 60s, check if there are new messages
      if (timeSinceProcessed < 60000) {
        // Check if Redis has new messages
        const pendingMessages = await lrangeMessages(messagesKey, 0, -1)

        if (pendingMessages.length === 0) {
          // No new messages → Already processed everything → EXIT
          console.log(`[batchMessages] Recently processed for ${phone} (${timeSinceProcessed}ms ago) and no new messages, skipping`)
          await deleteKey(lockKey)
          return ''
        }

        // Has new messages → Continue processing
        console.log(`[batchMessages] Recently processed for ${phone} (${timeSinceProcessed}ms ago) but has ${pendingMessages.length} new messages, continuing`)
      }
    }

    console.log(`[batchMessages] Lock acquired for ${phone}, waiting ${delaySeconds}s`)

    // ✅ FIX: Loop with restart capability instead of single wait
    let restartCount = 0

    while (restartCount < MAX_RESTARTS) {
      // Wait for the configured delay
      await delay(BATCH_DELAY_MS)

      // Check if debounce was reset by a newer message
      const lastMessageTimestamp = await get(debounceKey)

      if (lastMessageTimestamp) {
        const timeSinceLastMessage = Date.now() - parseInt(lastMessageTimestamp, 10)

        // If less than configured delay since last message, a new message arrived
        // ✅ FIX: RESTART the wait instead of exiting!
        if (timeSinceLastMessage < BATCH_DELAY_MS) {
          restartCount++
          console.log(`[batchMessages] Debounce reset for ${phone} (${timeSinceLastMessage}ms < ${BATCH_DELAY_MS}ms), restarting wait (attempt ${restartCount}/${MAX_RESTARTS})`)
          continue // Restart the loop
        }
      }

      // No new messages during delay period - exit loop and process
      break
    }

    if (restartCount >= MAX_RESTARTS) {
      console.log(`[batchMessages] Max restarts (${MAX_RESTARTS}) reached for ${phone}, processing anyway`)
    }

    // Process the batch
    const messages = await lrangeMessages(messagesKey, 0, -1)

    if (messages.length === 0) {
      console.log(`[batchMessages] No messages to batch for ${phone}`)
      await deleteKey(lockKey)
      return ''
    }

    const parsedMessages: RedisMessage[] = messages
      .map((msg) => {
        try {
          return JSON.parse(msg) as RedisMessage
        } catch {
          return null
        }
      })
      .filter((msg): msg is RedisMessage => msg !== null)

    const consolidatedContent = parsedMessages
      .map((msg) => msg.content)
      .join('\n\n')

    console.log(`[batchMessages] Processing ${parsedMessages.length} messages for ${phone}`)

    // ✅ Mark as processed NOW (before returning to prevent race conditions)
    // This timestamp protects against duplicate processing even if lock expires
    await setWithExpiry(lastProcessedKey, Date.now().toString(), 90) // 90s TTL (matches lock TTL)

    // Clean up Redis keys
    await deleteKey(messagesKey)
    await deleteKey(debounceKey)
    await deleteKey(lockKey)

    return consolidatedContent
  } catch (error) {
    // Always release lock on error
    try {
      await deleteKey(lockKey)
    } catch (cleanupError) {
      console.error(`[batchMessages] Failed to cleanup lock for ${phone}:`, cleanupError)
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to batch messages: ${errorMessage}`)
  }
}

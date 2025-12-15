import { lrangeMessages, deleteKey, get, acquireLock } from '@/lib/redis'
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
 * 3. Third message arrives → Resets debounce timer → First flow exits early, third flow waits
 * 
 * @param phone - User's phone number
 * @param clientId - Client ID for configuration lookup
 * @returns Concatenated message content, or empty string if should skip
 */
export const batchMessages = async (phone: string, clientId: string): Promise<string> => {
  const lockKey = `batch_lock:${phone}`
  const debounceKey = `debounce:${phone}`
  const messagesKey = `messages:${phone}`
  
  // Generate unique execution ID for this flow
  const executionId = `${Date.now()}-${Math.random().toString(36).substring(7)}`

  try {
    // Get configurable delay from bot_configurations (default 10s)
    const delayConfig = await getBotConfig(clientId, 'batching:delay_seconds')
    const delaySeconds = delayConfig?.config_value 
      ? (typeof delayConfig.config_value === 'number' 
          ? delayConfig.config_value 
          : parseInt(String(delayConfig.config_value), 10))
      : 10
    const BATCH_DELAY_MS = delaySeconds * 1000

    // Try to acquire lock (15s TTL = delay + 5s buffer)
    const lockAcquired = await acquireLock(lockKey, executionId, 15)

    if (!lockAcquired) {
      // Another flow is already processing this user's messages
      // Exit immediately without processing
      console.log(`[batchMessages] Lock exists for ${phone}, skipping processing`)
      return ''
    }

    console.log(`[batchMessages] Lock acquired for ${phone}, waiting ${delaySeconds}s`)

    // Wait for the configured delay
    await delay(BATCH_DELAY_MS)

    // Check if debounce was reset by a newer message
    const lastMessageTimestamp = await get(debounceKey)

    if (lastMessageTimestamp) {
      const timeSinceLastMessage = Date.now() - parseInt(lastMessageTimestamp, 10)

      // If less than configured delay since last message, a new message arrived
      // This flow should exit and let the newer flow handle batching
      if (timeSinceLastMessage < BATCH_DELAY_MS) {
        console.log(`[batchMessages] Debounce reset for ${phone} (${timeSinceLastMessage}ms < ${BATCH_DELAY_MS}ms), exiting`)
        await deleteKey(lockKey) // Release lock
        return ''
      }
    }

    // No new messages during delay period - process the batch
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

    // Clean up Redis keys
    await deleteKey(messagesKey)
    await deleteKey(debounceKey)
    await deleteKey(lockKey)

    return consolidatedContent
  } catch (error) {
    // Always release lock on error
    try {
      await deleteKey(lockKey)
    } catch {
      // Ignore cleanup errors
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to batch messages: ${errorMessage}`)
  }
}

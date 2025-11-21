import { lrangeMessages, deleteKey, get } from '@/lib/redis'

const BATCH_DELAY_MS = 10000

interface RedisMessage {
  content: string
  timestamp: string
}

const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const batchMessages = async (phone: string): Promise<string> => {
  try {
    await delay(BATCH_DELAY_MS)

    // Check if enough time has passed since last message
    const debounceKey = `debounce:${phone}`
    const lastMessageTimestamp = await get(debounceKey)

    if (lastMessageTimestamp) {
      const timeSinceLastMessage = Date.now() - parseInt(lastMessageTimestamp, 10)

      // If less than 10s since last message, skip processing (timer was reset)
      if (timeSinceLastMessage < BATCH_DELAY_MS) {
        return ''
      }
    }

    const key = `messages:${phone}`
    const messages = await lrangeMessages(key, 0, -1)

    if (messages.length === 0) {
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

    await deleteKey(key)
    await deleteKey(debounceKey) // Clear debounce timestamp after processing

    return consolidatedContent
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to batch messages: ${errorMessage}`)
  }
}

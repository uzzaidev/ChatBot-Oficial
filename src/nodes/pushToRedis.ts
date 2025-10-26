import { lpushMessage } from '@/lib/redis'

export interface PushToRedisInput {
  phone: string
  content: string
  timestamp: string
}

export const pushToRedis = async (input: PushToRedisInput): Promise<number> => {
  try {
    const { phone, content, timestamp } = input
    const key = `messages:${phone}`
    const value = JSON.stringify({ content, timestamp })

    return await lpushMessage(key, value)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to push message to Redis: ${errorMessage}`)
  }
}

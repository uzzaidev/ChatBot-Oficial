import { createClient } from 'redis'

type RedisClient = ReturnType<typeof createClient>

const getRequiredEnvVariable = (key: string): string => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

let redisClient: RedisClient | null = null

export const getRedisClient = async (): Promise<RedisClient> => {
  if (redisClient) {
    return redisClient
  }

  const redisUrl = getRequiredEnvVariable('REDIS_URL')

  try {
    const client = createClient({
      url: redisUrl,
    })

    client.on('error', (error) => {
      console.error('Redis client error:', error)
    })

    await client.connect()
    redisClient = client

    return client
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to connect to Redis: ${errorMessage}`)
  }
}

export const lpushMessage = async (key: string, value: string): Promise<number> => {
  try {
    const client = await getRedisClient()
    return await client.lPush(key, value)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to push message to Redis list: ${errorMessage}`)
  }
}

export const lrangeMessages = async (key: string, start: number, stop: number): Promise<string[]> => {
  try {
    const client = await getRedisClient()
    return await client.lRange(key, start, stop)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to retrieve messages from Redis list: ${errorMessage}`)
  }
}

export const deleteKey = async (key: string): Promise<number> => {
  try {
    const client = await getRedisClient()
    return await client.del(key)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to delete key from Redis: ${errorMessage}`)
  }
}

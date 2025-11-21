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
    // Parse URL to check protocol
    const url = new URL(redisUrl)
    const useSSL = url.protocol === 'rediss:'
    

    const clientConfig: any = {
      url: redisUrl,
    }

    // Se usar SSL, adiciona configuração TLS
    if (useSSL) {
      clientConfig.socket = {
        tls: true,
        rejectUnauthorized: false, // Aceita certificados self-signed
      }
    }

    const client = createClient(clientConfig)

    client.on('error', (error) => {
      console.error('[Redis] Client error:', error)
    })

    client.on('connect', () => {
    })

    client.on('reconnecting', () => {
    })

    await client.connect()
    redisClient = client

    return client
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Redis] ❌ Connection failed:', errorMessage)
    console.error('[Redis] URL format:', redisUrl.replace(/:[^:@]+@/, ':****@')) // Hide password
    throw new Error(`Failed to connect to Redis: ${errorMessage}`)
  }
}

export const lpushMessage = async (key: string, value: string): Promise<number> => {
  try {
    const client = await getRedisClient()
    const result = await client.lPush(key, value)
    return typeof result === 'number' ? result : parseInt(String(result))
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to push message to Redis list: ${errorMessage}`)
  }
}

export const lrangeMessages = async (key: string, start: number, stop: number): Promise<string[]> => {
  try {
    const client = await getRedisClient()
    const result = await client.lRange(key, start, stop)
    return result.map(item => String(item))
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to retrieve messages from Redis list: ${errorMessage}`)
  }
}

export const deleteKey = async (key: string): Promise<number> => {
  try {
    const client = await getRedisClient()
    const result = await client.del(key)
    return typeof result === 'number' ? result : parseInt(String(result))
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to delete key from Redis: ${errorMessage}`)
  }
}

export const setWithExpiry = async (key: string, value: string, expirySeconds: number): Promise<void> => {
  try {
    const client = await getRedisClient()
    await client.setEx(key, expirySeconds, value)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to set key with expiry in Redis: ${errorMessage}`)
  }
}

export const get = async (key: string): Promise<string | null> => {
  try {
    const client = await getRedisClient()
    const result = await client.get(key)
    return result ? String(result) : null
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to get key from Redis: ${errorMessage}`)
  }
}

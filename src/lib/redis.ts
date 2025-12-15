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

const isSSLError = (error: Error): boolean => {
  const sslErrorPatterns = [
    'ERR_SSL_PACKET_LENGTH_TOO_LONG',
    'wrong version number',
    'SSL routines',
    'EPROTO',
    'self signed certificate',
  ]
  const errorCode = (error as any).code
  return sslErrorPatterns.some(pattern =>
    error.message.includes(pattern) || errorCode === pattern
  )
}

export const getRedisClient = async (): Promise<RedisClient> => {
  if (redisClient) {
    return redisClient
  }

  const redisUrl = getRequiredEnvVariable('REDIS_URL')

  try {
    // Parse URL to check protocol
    const url = new URL(redisUrl)
    const requestedSSL = url.protocol === 'rediss:'

    // Primeira tentativa: usar protocolo solicitado
    const client = await attemptConnection(redisUrl, requestedSSL)
    redisClient = client
    return client

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Se falhou com SSL, tentar sem SSL como fallback
    if (error instanceof Error && isSSLError(error)) {

      try {
        const fallbackUrl = redisUrl.replace('rediss://', 'redis://')
        const client = await attemptConnection(fallbackUrl, false)
        redisClient = client


        return client
      } catch (fallbackError) {
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
        throw new Error(`Failed to connect to Redis with and without SSL: ${fallbackMessage}`)
      }
    }

    throw new Error(`Failed to connect to Redis: ${errorMessage}`)
  }
}

const attemptConnection = async (redisUrl: string, useSSL: boolean): Promise<RedisClient> => {
  const url = new URL(redisUrl)

  const clientConfig: any = {
    url: redisUrl,
  }

  // Se usar SSL, adiciona configuração TLS otimizada para Redis Cloud
  if (useSSL) {
    clientConfig.socket = {
      tls: true,
      rejectUnauthorized: false, // Aceita certificados self-signed
      servername: url.hostname, // SNI (Server Name Indication)
      minVersion: 'TLSv1.2',
      maxVersion: 'TLSv1.3',
      // Estratégia de retry com limite
      reconnectStrategy: (retries: number) => {
        if (retries > 10) {
          // Reseta o cliente global para permitir nova tentativa mais tarde
          redisClient = null
          return new Error('Max reconnection attempts reached')
        }
        // Backoff exponencial: 500ms, 1s, 2s, 4s, 8s, etc (max 30s)
        const delay = Math.min(retries * 500, 30000)
        return delay
      },
    }
  } else {
    // Mesmo para conexões não-SSL, adiciona estratégia de retry
    clientConfig.socket = {
      reconnectStrategy: (retries: number) => {
        if (retries > 10) {
          redisClient = null
          return new Error('Max reconnection attempts reached')
        }
        const delay = Math.min(retries * 500, 30000)
        return delay
      },
    }
  }

  const client = createClient(clientConfig)

  client.on('error', (error) => {
    // Se erro crítico, reseta cliente global
    if (error.message.includes('Max reconnection attempts reached')) {
      redisClient = null
    }
  })

  client.on('connect', () => {
    const protocol = useSSL ? 'SSL/TLS' : 'TCP'
  })

  client.on('reconnecting', () => {
  })

  await client.connect()
  return client
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

/**
 * Atomically sets a key with expiry only if it doesn't exist (lock mechanism)
 * @returns true if lock was acquired, false if lock already exists
 */
export const acquireLock = async (key: string, value: string, expirySeconds: number): Promise<boolean> => {
  try {
    const client = await getRedisClient()
    const result = await client.set(key, value, {
      NX: true, // Only set if key doesn't exist
      EX: expirySeconds, // Set expiry in seconds
    })
    return result === 'OK'
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to acquire lock in Redis: ${errorMessage}`)
  }
}

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
      console.warn('[Redis] ⚠️ Falha SSL detectada, tentando conexão sem SSL...')

      try {
        const fallbackUrl = redisUrl.replace('rediss://', 'redis://')
        const client = await attemptConnection(fallbackUrl, false)
        redisClient = client

        console.warn('[Redis] ⚠️ ATENÇÃO: Conectado SEM SSL em produção!')
        console.warn('[Redis] 🔒 Recomendação: Habilite SSL no Redis Cloud')

        return client
      } catch (fallbackError) {
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
        console.error('[Redis] ❌ Fallback também falhou:', fallbackMessage)
        throw new Error(`Failed to connect to Redis with and without SSL: ${fallbackMessage}`)
      }
    }

    console.error('[Redis] ❌ Connection failed:', errorMessage)
    console.error('[Redis] URL format:', redisUrl.replace(/:[^:@]+@/, ':****@'))
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
    }
  }

  const client = createClient(clientConfig)

  client.on('error', (error) => {
    // Não loga erro aqui - será tratado no catch
  })

  client.on('connect', () => {
    const protocol = useSSL ? '🔒 SSL/TLS' : '⚠️ TCP (não criptografado)'
    console.log(`[Redis] ✅ Conectado com sucesso (${protocol})`)
    console.log(`[Redis] 🔗 Host: ${url.hostname}:${url.port}`)
  })

  client.on('reconnecting', () => {
    console.log('[Redis] 🔄 Reconectando...')
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

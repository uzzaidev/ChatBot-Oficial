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
      // Estratégia de retry com limite
      reconnectStrategy: (retries: number) => {
        if (retries > 10) {
          console.error('[Redis] ❌ Limite de reconexão atingido (10 tentativas)')
          // Reseta o cliente global para permitir nova tentativa mais tarde
          redisClient = null
          return new Error('Max reconnection attempts reached')
        }
        // Backoff exponencial: 500ms, 1s, 2s, 4s, 8s, etc (max 30s)
        const delay = Math.min(retries * 500, 30000)
        console.log(`[Redis] 🔄 Tentativa ${retries}/10 em ${delay}ms...`)
        return delay
      },
    }
  } else {
    // Mesmo para conexões não-SSL, adiciona estratégia de retry
    clientConfig.socket = {
      reconnectStrategy: (retries: number) => {
        if (retries > 10) {
          console.error('[Redis] ❌ Limite de reconexão atingido (10 tentativas)')
          redisClient = null
          return new Error('Max reconnection attempts reached')
        }
        const delay = Math.min(retries * 500, 30000)
        console.log(`[Redis] 🔄 Tentativa ${retries}/10 em ${delay}ms...`)
        return delay
      },
    }
  }

  const client = createClient(clientConfig)

  client.on('error', (error) => {
    console.error('[Redis] ❌ ERRO DETECTADO:', {
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
      errno: (error as any).errno,
      syscall: (error as any).syscall,
      address: (error as any).address,
      port: (error as any).port,
    })
    // Se erro crítico, reseta cliente global
    if (error.message.includes('Max reconnection attempts reached')) {
      console.error('[Redis] ⚠️ Resetando cliente global após atingir limite de tentativas')
      redisClient = null
    }
  })

  client.on('connect', () => {
    const protocol = useSSL ? '🔒 SSL/TLS' : '⚠️ TCP (não criptografado)'
    console.log(`[Redis] ✅ Conectado com sucesso (${protocol})`)
    console.log(`[Redis] 🔗 Host: ${url.hostname}:${url.port}`)
    console.log(`[Redis] 📊 Status:`, client.isOpen ? 'OPEN' : 'CLOSED')
  })

  client.on('reconnecting', () => {
    console.warn('[Redis] 🔄 RECONECTANDO - Conexão perdida, tentando restabelecer...')
    console.warn(`[Redis] 📊 Status do cliente:`, {
      isOpen: client.isOpen,
      isReady: client.isReady,
    })
  })

  client.on('end', () => {
    console.warn('[Redis] 🔌 Conexão encerrada')
  })

  client.on('ready', () => {
    console.log('[Redis] ✅ Cliente pronto para receber comandos')
  })

  await client.connect()
  return client
}

export const lpushMessage = async (key: string, value: string): Promise<number> => {
  try {
    console.log('[Redis] 📤 LPUSH ->', { key, valueLength: value.length, preview: value.substring(0, 100) })
    const client = await getRedisClient()
    const result = await client.lPush(key, value)
    const numResult = typeof result === 'number' ? result : parseInt(String(result))
    console.log('[Redis] ✅ LPUSH <- Sucesso:', { key, listLength: numResult })
    return numResult
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Redis] ❌ LPUSH FALHOU:', { key, error: errorMessage })
    throw new Error(`Failed to push message to Redis list: ${errorMessage}`)
  }
}

export const lrangeMessages = async (key: string, start: number, stop: number): Promise<string[]> => {
  try {
    console.log('[Redis] 📥 LRANGE ->', { key, start, stop })
    const client = await getRedisClient()
    const result = await client.lRange(key, start, stop)
    const messages = result.map(item => String(item))
    console.log('[Redis] ✅ LRANGE <- Sucesso:', { key, count: messages.length })
    return messages
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Redis] ❌ LRANGE FALHOU:', { key, error: errorMessage })
    throw new Error(`Failed to retrieve messages from Redis list: ${errorMessage}`)
  }
}

export const deleteKey = async (key: string): Promise<number> => {
  try {
    console.log('[Redis] 🗑️ DEL ->', { key })
    const client = await getRedisClient()
    const result = await client.del(key)
    const numResult = typeof result === 'number' ? result : parseInt(String(result))
    console.log('[Redis] ✅ DEL <- Sucesso:', { key, deletedCount: numResult })
    return numResult
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Redis] ❌ DEL FALHOU:', { key, error: errorMessage })
    throw new Error(`Failed to delete key from Redis: ${errorMessage}`)
  }
}

export const setWithExpiry = async (key: string, value: string, expirySeconds: number): Promise<void> => {
  try {
    console.log('[Redis] ⏱️ SETEX ->', { key, expirySeconds, valueLength: value.length })
    const client = await getRedisClient()
    await client.setEx(key, expirySeconds, value)
    console.log('[Redis] ✅ SETEX <- Sucesso:', { key, expirySeconds })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Redis] ❌ SETEX FALHOU:', { key, error: errorMessage })
    throw new Error(`Failed to set key with expiry in Redis: ${errorMessage}`)
  }
}

export const get = async (key: string): Promise<string | null> => {
  try {
    console.log('[Redis] 🔍 GET ->', { key })
    const client = await getRedisClient()
    const result = await client.get(key)
    const value = result ? String(result) : null
    console.log('[Redis] ✅ GET <- Sucesso:', { key, found: value !== null, valueLength: value?.length })
    return value
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Redis] ❌ GET FALHOU:', { key, error: errorMessage })
    throw new Error(`Failed to get key from Redis: ${errorMessage}`)
  }
}

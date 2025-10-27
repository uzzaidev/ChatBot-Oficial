import { Pool, PoolClient, QueryResult } from 'pg'

let pool: Pool | null = null
let poolCreatedAt: number | null = null
const POOL_MAX_AGE_MS = 60000 // Recria pool após 60 segundos (serverless best practice)

/**
 * Remove sslmode parameter from PostgreSQL connection URL
 * SSL configuration should be handled by Pool options instead
 */
const removeSslModeFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url)
    urlObj.searchParams.delete('sslmode')
    return urlObj.toString()
  } catch {
    // If URL parsing fails, fallback to regex approach
    // This handles cases where connection string might not be a valid URL
    return url.replace(/[?&]sslmode=[^&]*(&?)/, (match, amp) => amp ? '&' : '').replace(/\?&/, '?').replace(/\?$/, '')
  }
}

const getConnectionString = (): string => {
  // Usa POSTGRES_URL se disponível, senão constrói manualmente
  if (process.env.POSTGRES_URL_NON_POOLING) {
    // Remove sslmode parameter if present - SSL config is handled by Pool options
    return removeSslModeFromUrl(process.env.POSTGRES_URL_NON_POOLING)
  }

  const host = process.env.POSTGRES_HOST || 'db.jhodhxvvhohygijqcxbo.supabase.co'
  const user = process.env.POSTGRES_USER || 'postgres.jhodhxvvhohygijqcxbo'
  const password = process.env.POSTGRES_PASSWORD
  const database = process.env.POSTGRES_DATABASE || 'postgres'

  if (!password) {
    throw new Error('POSTGRES_PASSWORD não configurado')
  }

  return `postgres://${user}:${password}@${host}:5432/${database}`
}

export const getPool = (): Pool => {
  // Recria pool se estiver muito velho (serverless best practice)
  const now = Date.now()
  if (pool && poolCreatedAt && (now - poolCreatedAt) > POOL_MAX_AGE_MS) {
    console.log('[Postgres] ♻️ Pool age limit exceeded, recreating...')
    pool.end().catch(err => console.error('[Postgres] Error closing old pool:', err))
    pool = null
    poolCreatedAt = null
  }

  if (pool) {
    return pool
  }

  console.log('[Postgres] 🆕 Creating new connection pool')

  // OTIMIZAÇÃO: Configurações otimizadas para ambientes serverless
  pool = new Pool({
    connectionString: getConnectionString(),
    max: 5, // REDUZIDO: Menos conexões simultâneas para evitar pool exhaustion
    min: 0, // NOVO: Permite pool vazio quando idle (economiza recursos)
    idleTimeoutMillis: 20000, // REDUZIDO: Fecha conexões idle mais rápido
    connectionTimeoutMillis: 10000, // REDUZIDO: Fail fast em cold starts
    statement_timeout: 15000, // REDUZIDO: Queries devem ser rápidas
    query_timeout: 15000, // REDUZIDO: Timeout mais agressivo
    allowExitOnIdle: true, // NOVO: Permite processo encerrar quando pool está idle
    ssl: {
      rejectUnauthorized: false, // Necessário para Supabase
    },
  })

  poolCreatedAt = now

  // Log de erros
  pool.on('error', (err) => {
    console.error('[Postgres] ❌ Pool error:', err)
  })

  // NOVO: Log quando pool conecta/desconecta (útil para debugging)
  pool.on('connect', () => {
    console.log('[Postgres] ✅ New client connected to pool')
  })

  pool.on('remove', () => {
    console.log('[Postgres] ⚠️ Client removed from pool')
  })

  return pool
}

/**
 * Validates if a pool connection is healthy
 * Returns true if healthy, false if stale/broken
 */
const validateConnection = async (testPool: Pool): Promise<boolean> => {
  let client: PoolClient | null = null
  try {
    // Try to get a client with a short timeout
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Connection validation timeout')), 3000)
    )
    
    client = await Promise.race([
      testPool.connect(),
      timeoutPromise
    ])
    
    // Test the connection with a simple query
    await client.query('SELECT 1')
    return true
  } catch (error) {
    console.warn('[Postgres] ⚠️ Connection validation failed:', error instanceof Error ? error.message : error)
    return false
  } finally {
    if (client) {
      client.release()
    }
  }
}

/**
 * Forces pool recreation (useful when connections become stale)
 */
const recreatePool = async (): Promise<void> => {
  if (pool) {
    console.log('[Postgres] ♻️ Recreating pool...')
    await pool.end().catch(err => console.error('[Postgres] Error closing pool:', err))
    pool = null
    poolCreatedAt = null
  }
}

export const query = async <T = any>(
  text: string,
  params?: any[],
  maxRetries = 2
): Promise<QueryResult<T>> => {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const start = Date.now()

    try {
      if (attempt > 0) {
        console.log(`[Postgres] 🔄 Retry attempt ${attempt}/${maxRetries}`)
        
        // On retry, validate connection health and recreate pool if needed
        const currentPool = getPool()
        const isHealthy = await validateConnection(currentPool)
        if (!isHealthy) {
          console.log('[Postgres] ♻️ Connection unhealthy, forcing pool recreation...')
          await recreatePool()
        }
        
        // Exponential backoff: 500ms, 1s
        await new Promise(resolve => setTimeout(resolve, attempt * 500))
      }

      // Get pool for this attempt
      const currentPool = getPool()

      // OTIMIZAÇÃO: Log simplificado para reduzir overhead
      const queryPreview = text.replace(/\s+/g, ' ').substring(0, 80)
      console.log(`[Postgres] 🔍 Query: ${queryPreview}...`)
      
      // Add client-side timeout to prevent hanging queries
      const queryTimeout = 20000 // 20 seconds max per query (includes connection time)
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Query timeout exceeded ${queryTimeout}ms`)), queryTimeout)
      )
      
      const result = await Promise.race([
        currentPool.query<T>(text, params),
        timeoutPromise
      ])
      
      const duration = Date.now() - start
      
      // OTIMIZAÇÃO: Log com métricas de performance
      console.log(`[Postgres] ✅ Query OK (${duration}ms) - ${result.rowCount} rows`)
      
      // Alerta se query for lenta
      if (duration > 3000) {
        console.warn(`[Postgres] ⚠️ SLOW QUERY WARNING: ${duration}ms`)
      }
      
      return result
    } catch (error) {
      const duration = Date.now() - start
      lastError = error as Error
      
      // Check if error is retryable
      const errorMessage = lastError?.message || ''
      const isRetryable = 
        errorMessage.includes('timeout') ||
        errorMessage.includes('Connection terminated') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('ECONNRESET')

      console.error(`[Postgres] ❌ Query ERRO (${duration}ms) - Attempt ${attempt + 1}/${maxRetries + 1}:`, error)

      // If not retryable or last attempt, throw immediately
      if (!isRetryable || attempt === maxRetries) {
        throw error
      }
      
      // Force pool recreation on connection errors for next retry
      if (isRetryable && attempt < maxRetries) {
        console.log('[Postgres] ♻️ Forcing pool recreation due to connection error')
        await recreatePool()
      }
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error('Query failed after retries')
}

export const getClient = async (): Promise<PoolClient> => {
  const pool = getPool()
  return await pool.connect()
}

// Fechar pool (útil para testes)
export const closePool = async (): Promise<void> => {
  if (pool) {
    console.log('[Postgres] 🔒 Fechando connection pool')
    await pool.end()
    pool = null
    poolCreatedAt = null
  }
}

import { Pool, PoolClient, QueryResult } from 'pg'

let pool: Pool | null = null
let poolCreatedAt: number | null = null
const POOL_MAX_AGE_MS = 60000 // Recria pool após 60 segundos (serverless best practice)
const CONNECTION_VALIDATION_TIMEOUT = 3000 // Timeout for connection health checks

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
  // Usa POSTGRES_URL (pooled) em vez de POSTGRES_URL_NON_POOLING
  // Isso evita esgotar conexões diretas ao banco
  if (process.env.POSTGRES_URL) {
    // Remove sslmode parameter if present - SSL config is handled by Pool options
    return removeSslModeFromUrl(process.env.POSTGRES_URL)
  }

  const host = process.env.POSTGRES_HOST || 'db.jhodhxvvhohygijqcxbo.supabase.co'
  const user = process.env.POSTGRES_USER || 'postgres.jhodhxvvhohygijqcxbo'
  const password = process.env.POSTGRES_PASSWORD
  const database = process.env.POSTGRES_DATABASE || 'postgres'
  const port = 6543 // Porta do pooler do Supabase

  if (!password) {
    throw new Error('POSTGRES_PASSWORD não configurado')
  }

  return `postgres://${user}:${password}@${host}:${port}/${database}`
}

export const getPool = (): Pool => {
  // Em ambiente serverless, NÃO recriamos o pool
  // Deixamos o Lambda/Vercel gerenciar o ciclo de vida
  if (pool) {
    return pool
  }


  // OTIMIZAÇÃO: Configurações otimizadas para Supabase Pooler
  pool = new Pool({
    connectionString: getConnectionString(),
    max: 3, // REDUZIDO: Supabase pooler já faz pooling, não precisamos de muitas conexões
    min: 0, // Permite pool vazio quando idle (economiza recursos)
    idleTimeoutMillis: 10000, // REDUZIDO: Libera conexões idle mais rápido
    connectionTimeoutMillis: 10000, // Timeout razoável
    statement_timeout: 30000, // 30 segundos para queries
    query_timeout: 30000, // 30 segundos para queries
    allowExitOnIdle: true, // Permite processo encerrar quando pool está idle
    ssl: {
      rejectUnauthorized: false, // Necessário para Supabase
    },
  })

  poolCreatedAt = Date.now()

  // Log de erros
  pool.on('error', (err) => {
    console.error('[Postgres] ❌ Pool error:', err)
  })

  // NOVO: Log quando pool conecta/desconecta (útil para debugging)
  pool.on('connect', () => {
  })

  pool.on('remove', () => {
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
      setTimeout(() => reject(new Error('Connection validation timeout')), CONNECTION_VALIDATION_TIMEOUT)
    )
    
    client = await Promise.race([
      testPool.connect(),
      timeoutPromise
    ])
    
    // Test the connection with a simple query
    await client.query('SELECT 1')
    return true
  } catch (error) {
    return false
  } finally {
    if (client) {
      client.release()
    }
  }
}

/**
 * Forces pool recreation (useful when connections become stale)
 * WARNING: Only use this when absolutely necessary (connection errors)
 */
const recreatePool = async (): Promise<void> => {
  if (pool) {
    // NÃO chamamos pool.end() - apenas descartamos a referência
    // O garbage collector vai limpar quando não houver mais referências
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
        
        // On retry, validate connection health and recreate pool if needed
        const currentPool = getPool()
        const isHealthy = await validateConnection(currentPool)
        if (!isHealthy) {
          await recreatePool()
        }
        
        // Exponential backoff: 500ms, 1s
        await new Promise(resolve => setTimeout(resolve, attempt * 500))
      }

      // Get pool for this attempt
      const currentPool = getPool()

      // Log detalhado para debugging
      const queryPreview = text.replace(/\s+/g, ' ').substring(0, 100)

      if (currentPool.waitingCount > 0) {
      }


      // Execute query directly - PostgreSQL handles timeout via statement_timeout
      // Removed client-side timeout to avoid premature failures in serverless cold starts
      const result = await currentPool.query<T>(text, params)

      
      const duration = Date.now() - start
      
      // OTIMIZAÇÃO: Log com métricas de performance
      
      // Alerta se query for lenta
      if (duration > 3000) {
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
      
      // Force pool recreation only for connection-specific errors before next retry
      const isConnectionError = 
        errorMessage.includes('Connection terminated') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('ECONNRESET')
      
      if (isConnectionError && attempt < maxRetries) {
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

// Fechar pool (útil APENAS para testes - NÃO usar em produção)
export const closePool = async (): Promise<void> => {
  if (pool) {
    await pool.end()
    pool = null
    poolCreatedAt = null
  }
}

import { Pool, PoolClient, QueryResult } from 'pg'

let pool: Pool | null = null
let poolCreatedAt: number | null = null
const POOL_MAX_AGE_MS = 60000 // Recria pool após 60 segundos (serverless best practice)

const getConnectionString = (): string => {
  // Usa POSTGRES_URL se disponível, senão constrói manualmente
  if (process.env.POSTGRES_URL_NON_POOLING) {
    return process.env.POSTGRES_URL_NON_POOLING
  }

  const host = process.env.POSTGRES_HOST || 'db.jhodhxvvhohygijqcxbo.supabase.co'
  const user = process.env.POSTGRES_USER || 'postgres.jhodhxvvhohygijqcxbo'
  const password = process.env.POSTGRES_PASSWORD
  const database = process.env.POSTGRES_DATABASE || 'postgres'

  if (!password) {
    throw new Error('POSTGRES_PASSWORD não configurado')
  }

  return `postgres://${user}:${password}@${host}:5432/${database}?sslmode=require`
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

  pool = new Pool({
    connectionString: getConnectionString(),
    max: 10, // Máximo 10 conexões
    idleTimeoutMillis: 30000, // Fecha conexões idle após 30s
    connectionTimeoutMillis: 30000, // Aumentado para 30s (serverless cold starts)
    statement_timeout: 25000, // Timeout de statement SQL em 25s
    query_timeout: 25000, // Timeout de query em 25s
    ssl: {
      rejectUnauthorized: false, // Necessário para Supabase
    },
  })

  poolCreatedAt = now

  // Log de erros
  pool.on('error', (err) => {
    console.error('[Postgres] ❌ Pool error:', err)
  })

  return pool
}

export const query = async <T = any>(
  text: string,
  params?: any[],
  maxRetries = 2
): Promise<QueryResult<T>> => {
  const pool = getPool()
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const start = Date.now()

    try {
      if (attempt > 0) {
        console.log(`[Postgres] 🔄 Retry attempt ${attempt}/${maxRetries}`)
        // Exponential backoff: 1s, 2s
        await new Promise(resolve => setTimeout(resolve, attempt * 1000))
      }

      console.log(`[Postgres] 🔍 Query: ${text.substring(0, 100)}...`)
      const result = await pool.query<T>(text, params)
      const duration = Date.now() - start
      console.log(`[Postgres] ✅ Query OK (${duration}ms) - ${result.rowCount} rows`)
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
        errorMessage.includes('ETIMEDOUT')

      console.error(`[Postgres] ❌ Query ERRO (${duration}ms) - Attempt ${attempt + 1}/${maxRetries + 1}:`, error)

      // If not retryable or last attempt, throw immediately
      if (!isRetryable || attempt === maxRetries) {
        throw error
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
  }
}

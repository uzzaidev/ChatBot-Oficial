import { Pool, PoolClient, QueryResult } from 'pg'

let pool: Pool | null = null
let poolCreatedAt: number | null = null
const POOL_MAX_AGE_MS = 60000 // Recria pool após 60 segundos (serverless best practice)

const getConnectionString = (): string => {
  // Usa POSTGRES_URL se disponível, senão constrói manualmente
  if (process.env.POSTGRES_URL_NON_POOLING) {
    // Remove sslmode parameter if present - SSL config is handled by Pool options
    return process.env.POSTGRES_URL_NON_POOLING.replace(/[?&]sslmode=[^&]*(&|$)/, '$1').replace(/\?$/, '')
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
        // Exponential backoff: 500ms, 1s
        await new Promise(resolve => setTimeout(resolve, attempt * 500))
      }

      // OTIMIZAÇÃO: Log simplificado para reduzir overhead
      const queryPreview = text.replace(/\s+/g, ' ').substring(0, 80)
      console.log(`[Postgres] 🔍 Query: ${queryPreview}...`)
      
      const result = await pool.query<T>(text, params)
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

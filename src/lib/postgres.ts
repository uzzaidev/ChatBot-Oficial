import { Pool, PoolClient, QueryResult } from 'pg'

let pool: Pool | null = null

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
  if (pool) {
    return pool
  }

  console.log('[Postgres] 🆕 Criando connection pool')

  pool = new Pool({
    connectionString: getConnectionString(),
    max: 10, // Máximo 10 conexões
    idleTimeoutMillis: 30000, // Fecha conexões idle após 30s
    connectionTimeoutMillis: 10000, // Timeout de 10s para conectar
    ssl: {
      rejectUnauthorized: false, // Necessário para Supabase
    },
  })

  // Log de erros
  pool.on('error', (err) => {
    console.error('[Postgres] ❌ Pool error:', err)
  })

  return pool
}

export const query = async <T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => {
  const pool = getPool()
  const start = Date.now()

  try {
    console.log(`[Postgres] 🔍 Query: ${text.substring(0, 100)}...`)
    const result = await pool.query<T>(text, params)
    const duration = Date.now() - start
    console.log(`[Postgres] ✅ Query OK (${duration}ms) - ${result.rowCount} rows`)
    return result
  } catch (error) {
    const duration = Date.now() - start
    console.error(`[Postgres] ❌ Query ERRO (${duration}ms):`, error)
    throw error
  }
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

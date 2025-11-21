#!/usr/bin/env node

/**
 * Validation Script for Performance Optimizations
 * 
 * This script validates that the database optimizations are working correctly.
 * Run after applying the migration: migrations/003_performance_indexes.sql
 * 
 * Usage: node scripts/validate-performance.js
 */

const { Pool } = require('pg')

// Performance thresholds (milliseconds)
const SLOW_QUERY_THRESHOLD = 1000
const WARNING_THRESHOLD = 500
const UPSERT_THRESHOLD = 200

// Display constants
const SEPARATOR = '='.repeat(60)

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL_NON_POOLING,
  ssl: { rejectUnauthorized: false }
})

async function validateIndexes() {
  
  
  const expectedIndexes = [
    'idx_chat_histories_session_id',
    'idx_chat_histories_created_at',
    'idx_chat_histories_session_created',
    'idx_clientes_telefone',
    'idx_clientes_status',
  ]

  const result = await pool.query(`
    SELECT indexname 
    FROM pg_indexes 
    WHERE tablename IN ('n8n_chat_histories', 'Clientes WhatsApp')
    AND schemaname = 'public'
  `)

  const existingIndexes = result.rows.map(r => r.indexname)
  
  let allFound = true
  for (const indexName of expectedIndexes) {
    if (existingIndexes.includes(indexName)) {
      
    } else {
      
      allFound = false
    }
  }

  return allFound
}

async function validateUniqueConstraint() {
  
  
  const result = await pool.query(`
    SELECT constraint_name 
    FROM information_schema.table_constraints
    WHERE table_name = 'Clientes WhatsApp'
    AND constraint_type = 'UNIQUE'
    AND constraint_name = 'clientes_whatsapp_telefone_key'
  `)

  if (result.rows.length > 0) {
    
    return true
  } else {
    
    return false
  }
}

async function testOptimizedQuery() {
  
  
  const startTime = Date.now()
  
  const result = await pool.query(`
    WITH customer_stats AS (
      SELECT 
        c.telefone,
        c.nome,
        c.status,
        c.created_at as customer_created_at,
        COUNT(h.id) as message_count,
        MAX(h.created_at) as last_message_time,
        (
          SELECT h2.message 
          FROM n8n_chat_histories h2 
          WHERE h2.session_id = CAST(c.telefone AS TEXT)
          ORDER BY h2.created_at DESC 
          LIMIT 1
        ) as last_message_json
      FROM "Clientes WhatsApp" c
      LEFT JOIN n8n_chat_histories h ON CAST(c.telefone AS TEXT) = h.session_id
      WHERE EXISTS (
        SELECT 1 
        FROM n8n_chat_histories h3 
        WHERE h3.session_id = CAST(c.telefone AS TEXT)
      )
      GROUP BY c.telefone, c.nome, c.status, c.created_at
    )
    SELECT * FROM customer_stats
    ORDER BY last_message_time DESC NULLS LAST
    LIMIT 10
  `)

  const duration = Date.now() - startTime
  
  
  
  
  if (duration > SLOW_QUERY_THRESHOLD) {
    `)
    
    return false
  } else if (duration > WARNING_THRESHOLD) {
    
  } else {
    
  }
  
  return true
}

async function testUpsertPattern() {
  
  
  // Generate unique test phone using timestamp and random component
  const testPhone = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const testName = 'Test Customer'
  
  const startTime = Date.now()
  
  // First insert
  await pool.query(`
    INSERT INTO "Clientes WhatsApp" (telefone, nome, status, created_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (telefone) 
    DO UPDATE SET nome = COALESCE(EXCLUDED.nome, "Clientes WhatsApp".nome)
    RETURNING *
  `, [testPhone, testName, 'bot'])
  
  const insertDuration = Date.now() - startTime
   executed in ${insertDuration}ms`)
  
  // Second upsert (update path)
  const updateStart = Date.now()
  
  await pool.query(`
    INSERT INTO "Clientes WhatsApp" (telefone, nome, status, created_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (telefone) 
    DO UPDATE SET nome = COALESCE(EXCLUDED.nome, "Clientes WhatsApp".nome)
    RETURNING *
  `, [testPhone, 'Updated Name', 'bot'])
  
  const updateDuration = Date.now() - updateStart
   executed in ${updateDuration}ms`)
  
  // Cleanup
  await pool.query('DELETE FROM "Clientes WhatsApp" WHERE telefone = $1', [testPhone])
  
  
  return insertDuration < UPSERT_THRESHOLD && updateDuration < UPSERT_THRESHOLD
}

async function main() {
  
  
  
  
  if (!process.env.POSTGRES_URL_NON_POOLING) {
    console.error('\n❌ ERROR: POSTGRES_URL_NON_POOLING not set in environment')
    console.error('   Set it in .env.local and try again\n')
    process.exit(1)
  }
  
  try {
    const indexesOk = await validateIndexes()
    const constraintOk = await validateUniqueConstraint()
    const queryOk = await testOptimizedQuery()
    const upsertOk = await testUpsertPattern()
    
    
    
    
    
    
    
    
    
    
    if (!indexesOk || !constraintOk) {
      
      process.exit(1)
    } else if (!queryOk || !upsertOk) {
      
      process.exit(0)
    } else {
      
      process.exit(0)
    }
  } catch (error) {
    console.error('\n❌ Validation failed with error:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()

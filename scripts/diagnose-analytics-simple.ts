/**
 * Simple Analytics Diagnostic
 * Uses only Supabase client (no direct Postgres)
 */

import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load .env.local
dotenv.config({ path: '.env.local' })

// Create Supabase client for scripts (not Next.js context)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const log = {
  info: (msg: string) => console.log(`\n\u2139\ufe0f  ${msg}`),
  success: (msg: string) => console.log(`\u2705 ${msg}`),
  error: (msg: string) => console.log(`\u274c ${msg}`),
  warning: (msg: string) => console.log(`\u26a0\ufe0f  ${msg}`),
  section: (title: string) => console.log(`\n${'='.repeat(60)}\n${title}\n${'='.repeat(60)}`),
}

async function diagnose() {
  try {
    log.section('ANALYTICS DIAGNOSTIC - SIMPLIFIED')

    // TEST 1: Total rows
    log.section('TEST 1: Total rows in usage_logs')

    const { count: totalRows, error: countError } = await supabase
      .from('usage_logs')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      log.error(`Error: ${countError.message}`)
      return
    }

    if (totalRows === null || totalRows === 0) {
      log.error('NO DATA in usage_logs table!')
      log.warning('Tracking is not working at all')
      return
    }

    log.success(`Total rows: ${totalRows}`)

    // TEST 2: Recent data (last 7 days)
    log.section('TEST 2: Recent data (last 7 days)')

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: recentData, error: recentError } = await supabase
      .from('usage_logs')
      .select('id, created_at, source, model, client_id')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })

    if (recentError) {
      log.error(`Error: ${recentError.message}`)
      return
    }

    if (!recentData || recentData.length === 0) {
      log.error('NO recent data in last 7 days!')
      log.warning('Tracking stopped or never ran')

      // Check last activity
      const { data: lastData } = await supabase
        .from('usage_logs')
        .select('created_at, source, model')
        .order('created_at', { ascending: false })
        .limit(1)

      if (lastData && lastData.length > 0) {
        log.info(`Last activity: ${lastData[0].created_at}`)
        log.info(`Source: ${lastData[0].source}, Model: ${lastData[0].model}`)
      }
      return
    }

    log.success(`Found ${recentData.length} recent rows`)
    log.info(`Newest: ${recentData[0].created_at}`)
    log.info(`Oldest: ${recentData[recentData.length - 1].created_at}`)

    // TEST 3: Breakdown by source
    log.section('TEST 3: Breakdown by source')

    const sourceBreakdown: Record<string, number> = {}
    recentData.forEach(row => {
      sourceBreakdown[row.source] = (sourceBreakdown[row.source] || 0) + 1
    })

    console.table(Object.entries(sourceBreakdown).map(([source, count]) => ({
      Source: source,
      Count: count,
      Percentage: `${((count / recentData.length) * 100).toFixed(1)}%`
    })))

    // TEST 4: Breakdown by client_id
    log.section('TEST 4: Breakdown by client_id')

    const clientBreakdown: Record<string, number> = {}
    recentData.forEach(row => {
      const clientId = row.client_id || 'NULL'
      clientBreakdown[clientId] = (clientBreakdown[clientId] || 0) + 1
    })

    console.table(Object.entries(clientBreakdown).map(([clientId, count]) => ({
      'Client ID': clientId === 'NULL' ? 'NULL' : clientId.substring(0, 12) + '...',
      Count: count,
    })))

    // TEST 5: Check missing models
    log.section('TEST 5: Check if embeddings/classifyIntent tracked')

    const models = new Set(recentData.map(r => r.model))
    const sources = new Set(recentData.map(r => r.source))

    log.info('Models found:')
    models.forEach(m => console.log(`  - ${m}`))

    log.info('\nSources found:')
    sources.forEach(s => console.log(`  - ${s}`))

    // Check for missing tracking
    if (!models.has('text-embedding-3-small')) {
      log.warning('\u26a0\ufe0f  Embeddings (text-embedding-3-small) NOT tracked!')
    } else {
      log.success('Embeddings tracked')
    }

    if (!Array.from(models).some(m => m.includes('llama') && recentData.some(r => r.model === m && r.source === 'groq'))) {
      log.warning('\u26a0\ufe0f  classifyIntent might not be tracked')
    }

    // SUMMARY
    log.section('DIAGNOSTIC SUMMARY')

    console.log(`\n\ud83d\udcca Status:`)
    console.log(`  Total Usage Logs: ${totalRows}`)
    console.log(`  Recent (7 days): ${recentData.length}`)
    console.log(`  Active Clients: ${Object.keys(clientBreakdown).length}`)
    console.log(`  Sources: ${Array.from(sources).join(', ')}`)
    console.log(`  Models: ${Array.from(models).join(', ')}`)

    if (recentData.length > 0) {
      log.success('\n\u2705 Analytics data EXISTS!')
      log.info('\nIf dashboard is not updating, check:')
      log.info('  1. Browser console for errors')
      log.info('  2. /api/analytics returns data (test with curl)')
      log.info('  3. client_id in session matches client_id in usage_logs')
    } else {
      log.error('\n\u274c No recent tracking data!')
      log.info('\nPossible fixes:')
      log.info('  1. Ensure logUsage() is called in chatbotFlow')
      log.info('  2. Check client_id is passed correctly')
      log.info('  3. Send a test message to generate data')
    }

  } catch (error: any) {
    log.error(`Diagnostic failed: ${error.message}`)
    console.error(error)
  } finally {
    process.exit(0)
  }
}

diagnose()

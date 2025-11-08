#!/usr/bin/env node

/**
 * Test script for BOT_CONFIGURATION_INFRASTRUCTURE
 * 
 * Tests the bot configuration system including:
 * - Fetching default configurations
 * - Fetching custom configurations
 * - Setting custom configurations
 * - Resetting configurations to defaults
 * - Batch fetching multiple configurations
 * 
 * Usage:
 *   node scripts/test-bot-config.mjs
 * 
 * Prerequisites:
 *   - Supabase connection must be configured in .env.local
 *   - Migration 20251107_create_bot_configurations.sql must be applied
 *   - Seed default_bot_configurations.sql must be loaded
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from .env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials in .env.local')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Test client ID (use a real one or create a test client)
const TEST_CLIENT_ID = process.env.DEFAULT_CLIENT_ID || 'test-client-id'

console.log('🧪 Testing Bot Configuration Infrastructure')
console.log('=' .repeat(60))
console.log(`Client ID: ${TEST_CLIENT_ID}`)
console.log()

// Helper function to fetch a single config (mimics getBotConfig)
async function getBotConfig(clientId, configKey) {
  const { data, error } = await supabase
    .from('bot_configurations')
    .select('config_value, is_default')
    .eq('config_key', configKey)
    .or(`client_id.eq.${clientId},is_default.eq.true`)
    .order('is_default', { ascending: true })
    .limit(1)
    .single()

  if (error) {
    console.error(`   Error: ${error.message}`)
    return null
  }

  return data?.config_value
}

// Helper function to set a config (mimics setBotConfig)
async function setBotConfig(clientId, configKey, configValue, metadata = {}) {
  const { error } = await supabase
    .from('bot_configurations')
    .upsert({
      client_id: clientId,
      config_key: configKey,
      config_value: configValue,
      description: metadata.description,
      category: metadata.category,
      is_default: false,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'client_id,config_key'
    })

  if (error) {
    throw new Error(`Failed to save config: ${error.message}`)
  }
}

// Helper function to reset a config (mimics resetBotConfig)
async function resetBotConfig(clientId, configKey) {
  const { error } = await supabase
    .from('bot_configurations')
    .delete()
    .eq('client_id', clientId)
    .eq('config_key', configKey)
    .eq('is_default', false)

  if (error) {
    throw new Error(`Failed to reset config: ${error.message}`)
  }
}

// Test 1: Verify default configurations exist
async function test1_verifyDefaults() {
  console.log('Test 1: Verify default configurations exist')
  console.log('-'.repeat(60))

  const { data, error } = await supabase
    .from('bot_configurations')
    .select('config_key, category')
    .eq('is_default', true)
    .order('category')

  if (error) {
    console.error('❌ FAILED:', error.message)
    return false
  }

  if (!data || data.length === 0) {
    console.error('❌ FAILED: No default configurations found')
    console.error('   Run: psql "CONNECTION_STRING" -f supabase/seeds/default_bot_configurations.sql')
    return false
  }

  console.log(`✅ PASSED: Found ${data.length} default configurations`)
  
  const categories = {}
  data.forEach(config => {
    categories[config.category] = (categories[config.category] || 0) + 1
  })

  console.log('   Categories:')
  Object.entries(categories).forEach(([cat, count]) => {
    console.log(`     - ${cat}: ${count} configs`)
  })
  console.log()

  return true
}

// Test 2: Fetch a default configuration
async function test2_fetchDefault() {
  console.log('Test 2: Fetch a default configuration')
  console.log('-'.repeat(60))

  const configKey = 'intent_classifier:use_llm'
  const value = await getBotConfig(TEST_CLIENT_ID, configKey)

  if (value === null) {
    console.error(`❌ FAILED: Config "${configKey}" not found`)
    return false
  }

  console.log(`✅ PASSED: Config "${configKey}" = ${JSON.stringify(value)}`)
  console.log()

  return true
}

// Test 3: Set a custom configuration
async function test3_setCustom() {
  console.log('Test 3: Set a custom configuration')
  console.log('-'.repeat(60))

  const configKey = 'intent_classifier:use_llm'
  const customValue = false

  try {
    await setBotConfig(TEST_CLIENT_ID, configKey, customValue, {
      description: 'Test customization',
      category: 'rules'
    })

    const value = await getBotConfig(TEST_CLIENT_ID, configKey)

    if (value !== customValue) {
      console.error(`❌ FAILED: Expected ${customValue}, got ${value}`)
      return false
    }

    console.log(`✅ PASSED: Custom config set successfully`)
    console.log(`   "${configKey}" = ${JSON.stringify(value)}`)
    console.log()

    return true
  } catch (error) {
    console.error(`❌ FAILED: ${error.message}`)
    return false
  }
}

// Test 4: Verify custom config takes precedence
async function test4_customPrecedence() {
  console.log('Test 4: Verify custom config takes precedence over default')
  console.log('-'.repeat(60))

  const configKey = 'intent_classifier:use_llm'
  
  // Fetch what should be our custom value
  const value = await getBotConfig(TEST_CLIENT_ID, configKey)

  // Check if we get the custom value (false) not the default (true)
  if (value !== false) {
    console.error(`❌ FAILED: Expected custom value (false), got ${value}`)
    return false
  }

  console.log(`✅ PASSED: Custom config takes precedence`)
  console.log(`   "${configKey}" = ${JSON.stringify(value)} (custom)`)
  console.log()

  return true
}

// Test 5: Reset to default
async function test5_resetDefault() {
  console.log('Test 5: Reset configuration to default')
  console.log('-'.repeat(60))

  const configKey = 'intent_classifier:use_llm'

  try {
    await resetBotConfig(TEST_CLIENT_ID, configKey)

    const value = await getBotConfig(TEST_CLIENT_ID, configKey)

    // Should now get the default value (true)
    if (value !== true) {
      console.error(`❌ FAILED: Expected default value (true), got ${value}`)
      return false
    }

    console.log(`✅ PASSED: Config reset to default successfully`)
    console.log(`   "${configKey}" = ${JSON.stringify(value)} (default)`)
    console.log()

    return true
  } catch (error) {
    console.error(`❌ FAILED: ${error.message}`)
    return false
  }
}

// Test 6: Fetch multiple configurations
async function test6_batchFetch() {
  console.log('Test 6: Batch fetch multiple configurations')
  console.log('-'.repeat(60))

  const configKeys = [
    'intent_classifier:use_llm',
    'intent_classifier:prompt',
    'continuity:new_conversation_threshold_hours'
  ]

  const { data, error } = await supabase
    .from('bot_configurations')
    .select('config_key, config_value, is_default')
    .in('config_key', configKeys)
    .or(`client_id.eq.${TEST_CLIENT_ID},is_default.eq.true`)

  if (error) {
    console.error(`❌ FAILED: ${error.message}`)
    return false
  }

  // Create a map prioritizing client configs over defaults
  const configMap = new Map()
  
  // First add defaults
  data.filter(c => c.is_default).forEach(c => {
    configMap.set(c.config_key, c.config_value)
  })
  
  // Then override with customs
  data.filter(c => !c.is_default).forEach(c => {
    configMap.set(c.config_key, c.config_value)
  })

  if (configMap.size !== configKeys.length) {
    console.error(`❌ FAILED: Expected ${configKeys.length} configs, got ${configMap.size}`)
    return false
  }

  console.log(`✅ PASSED: Batch fetched ${configMap.size} configurations`)
  configMap.forEach((value, key) => {
    const preview = typeof value === 'object' 
      ? `{...}` 
      : JSON.stringify(value)
    console.log(`   - ${key}: ${preview}`)
  })
  console.log()

  return true
}

// Test 7: Test complex JSON configuration
async function test7_complexJson() {
  console.log('Test 7: Set and fetch complex JSON configuration')
  console.log('-'.repeat(60))

  const configKey = 'personality:config'
  const complexValue = {
    name: 'Test Bot',
    role: 'Test Assistant',
    expertise: ['Testing', 'Automation'],
    tone: 'friendly',
    style: {
      emojis: true,
      formality: 'low'
    }
  }

  try {
    await setBotConfig(TEST_CLIENT_ID, configKey, complexValue, {
      description: 'Test complex JSON',
      category: 'personality'
    })

    const value = await getBotConfig(TEST_CLIENT_ID, configKey)

    if (JSON.stringify(value) !== JSON.stringify(complexValue)) {
      console.error(`❌ FAILED: JSON mismatch`)
      console.error(`   Expected: ${JSON.stringify(complexValue)}`)
      console.error(`   Got: ${JSON.stringify(value)}`)
      return false
    }

    console.log(`✅ PASSED: Complex JSON config handled correctly`)
    console.log(`   "${configKey}":`)
    console.log(JSON.stringify(value, null, 2).split('\n').map(line => `     ${line}`).join('\n'))
    console.log()

    // Clean up
    await resetBotConfig(TEST_CLIENT_ID, configKey)

    return true
  } catch (error) {
    console.error(`❌ FAILED: ${error.message}`)
    return false
  }
}

// Run all tests
async function runAllTests() {
  const tests = [
    test1_verifyDefaults,
    test2_fetchDefault,
    test3_setCustom,
    test4_customPrecedence,
    test5_resetDefault,
    test6_batchFetch,
    test7_complexJson
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    try {
      const result = await test()
      if (result) {
        passed++
      } else {
        failed++
      }
    } catch (error) {
      console.error(`❌ Test crashed: ${error.message}`)
      failed++
    }
  }

  console.log('=' .repeat(60))
  console.log('📊 Test Results')
  console.log('-'.repeat(60))
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`Total: ${tests.length}`)
  console.log()

  if (failed === 0) {
    console.log('🎉 All tests passed! Bot configuration system is working correctly.')
  } else {
    console.log('⚠️  Some tests failed. Please review the output above.')
    process.exit(1)
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})

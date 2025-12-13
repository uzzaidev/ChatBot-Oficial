# AI Gateway - Testing & Verification Guide

**Created:** 2025-12-13  
**Status:** Ready for Testing  
**Branch:** `copilot/remove-groq-api-key`

---

## 🎯 Overview

This guide provides step-by-step instructions to test and verify the AI Gateway implementation after the recent code changes.

---

## ✅ Pre-Testing Checklist

Before running tests, verify these prerequisites:

### 1. Database Migrations Applied
```sql
-- Run in Supabase SQL Editor
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'gateway_usage_logs' 
  AND column_name = 'api_type'
) as unified_tracking_applied;

-- Should return: true
```

### 2. Shared Gateway Config Exists
```sql
SELECT id, gateway_key_vault_id, cache_enabled, default_fallback_chain
FROM shared_gateway_config
LIMIT 1;

-- Should return: 1 row with configuration
```

### 3. API Keys Configured
- Navigate to `/dashboard/ai-gateway/setup`
- Verify Gateway API Key is saved
- Verify OpenAI API Key is saved
- Verify Groq API Key is saved

### 4. Gateway Enabled for Test Client
```sql
-- Enable for one test client first
UPDATE clients
SET use_ai_gateway = true
WHERE slug = 'YOUR_TEST_CLIENT_SLUG';

-- Verify
SELECT id, name, slug, use_ai_gateway
FROM clients
WHERE slug = 'YOUR_TEST_CLIENT_SLUG';
```

---

## 🧪 Test Cases

### Test 1: Chat Message (Text)

**Objective:** Verify basic AI Gateway routing and logging for text chat

**Steps:**
1. Send a text message via WhatsApp to the test client:
   ```
   "Olá, gostaria de saber mais sobre energia solar"
   ```

2. Check server logs for:
   ```
   [AI Gateway] Routing request through AI Gateway
   [API Tracking] Logged chat usage: XXX tokens, R$ X.XXXX
   ```

3. Verify database log:
   ```sql
   SELECT 
     api_type,
     provider,
     model_name,
     input_tokens,
     output_tokens,
     total_tokens,
     cost_brl,
     was_cached,
     was_fallback,
     created_at
   FROM gateway_usage_logs
   WHERE client_id = 'YOUR_CLIENT_ID'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

**Expected Results:**
- ✅ `api_type` = 'chat'
- ✅ `provider` = 'openai' or 'groq'
- ✅ `model_name` = 'gpt-4o-mini' or similar
- ✅ `input_tokens` > 0
- ✅ `output_tokens` > 0
- ✅ `cost_brl` > 0
- ✅ Response received in WhatsApp

---

### Test 2: Audio Message (Whisper)

**Objective:** Verify Whisper API logging

**Steps:**
1. Send an audio message via WhatsApp (e.g., 10 seconds voice note)

2. Check server logs for:
   ```
   [Whisper] Processing audio
   [API Tracking] Logged whisper usage: X min audio, R$ X.XXXX
   ```

3. Verify database log:
   ```sql
   SELECT 
     api_type,
     provider,
     model_name,
     input_units,  -- Should be seconds of audio
     output_units,
     cost_brl,
     created_at
   FROM gateway_usage_logs
   WHERE client_id = 'YOUR_CLIENT_ID'
     AND api_type = 'whisper'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

**Expected Results:**
- ✅ `api_type` = 'whisper'
- ✅ `provider` = 'openai'
- ✅ `model_name` = 'whisper-1'
- ✅ `input_units` = audio duration in seconds (e.g., 10)
- ✅ `cost_brl` > 0 (approximately R$ 0.03 per minute)
- ✅ Transcription working correctly

---

### Test 3: Image Message (Vision)

**Objective:** Verify GPT-4o Vision API logging

**Steps:**
1. Send an image via WhatsApp (e.g., photo of a solar panel)

2. Check server logs for:
   ```
   [Vision] Analyzing image
   [API Tracking] Logged vision usage: 1 images, R$ X.XXXX
   ```

3. Verify database log:
   ```sql
   SELECT 
     api_type,
     provider,
     model_name,
     input_tokens,
     output_tokens,
     output_units,  -- Should be 1 (number of images)
     cost_brl,
     created_at
   FROM gateway_usage_logs
   WHERE client_id = 'YOUR_CLIENT_ID'
     AND api_type = 'vision'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

**Expected Results:**
- ✅ `api_type` = 'vision'
- ✅ `provider` = 'openai'
- ✅ `model_name` = 'gpt-4o'
- ✅ `output_units` = 1 (number of images)
- ✅ `cost_brl` > 0 (approximately R$ 0.06 per image)
- ✅ Image analysis response received

---

### Test 4: Document Embedding (RAG)

**Objective:** Verify embeddings API logging

**Steps:**
1. Upload a document to the knowledge base via dashboard

2. Check server logs for:
   ```
   [Embeddings] Generating embeddings
   [API Tracking] Logged embeddings usage: XXX tokens, R$ X.XXXX
   ```

3. Verify database log:
   ```sql
   SELECT 
     api_type,
     provider,
     model_name,
     input_tokens,
     output_tokens,
     cost_brl,
     created_at
   FROM gateway_usage_logs
   WHERE client_id = 'YOUR_CLIENT_ID'
     AND api_type = 'embeddings'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

**Expected Results:**
- ✅ `api_type` = 'embeddings'
- ✅ `provider` = 'openai'
- ✅ `model_name` = 'text-embedding-3-small'
- ✅ `input_tokens` > 0
- ✅ `output_tokens` = 0 (embeddings don't have output tokens)
- ✅ `cost_brl` > 0 (very small, ~R$ 0.0001 per request)

---

### Test 5: Cache Hit (Second Request)

**Objective:** Verify cache is working and being logged

**Steps:**
1. Send the EXACT same message twice within cache TTL (1 hour):
   ```
   "Qual o preço de um sistema de energia solar?"
   ```

2. First request should be a cache miss, second should be a cache hit

3. Verify database logs:
   ```sql
   SELECT 
     api_type,
     was_cached,
     latency_ms,
     cost_brl,
     created_at
   FROM gateway_usage_logs
   WHERE client_id = 'YOUR_CLIENT_ID'
   ORDER BY created_at DESC
   LIMIT 2;
   ```

**Expected Results:**
- ✅ First request: `was_cached` = false, higher `latency_ms`
- ✅ Second request: `was_cached` = true, lower `latency_ms`
- ✅ Both requests logged with same `cost_brl` (cache doesn't reduce cost in logs)
- ✅ Second request returns faster

---

### Test 6: Fallback Mechanism

**Objective:** Verify fallback works when primary provider fails

**Steps:**
1. Temporarily disable OpenAI in gateway config (via dashboard or SQL)
   ```sql
   UPDATE shared_gateway_config
   SET default_fallback_chain = ARRAY['groq', 'anthropic']::text[];
   ```

2. Send a message via WhatsApp

3. Check logs for fallback:
   ```
   [AI Gateway] Primary provider failed, trying fallback
   [AI Gateway] Fallback successful with: groq
   ```

4. Verify database log:
   ```sql
   SELECT 
     provider,
     was_fallback,
     fallback_reason,
     created_at
   FROM gateway_usage_logs
   WHERE client_id = 'YOUR_CLIENT_ID'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

**Expected Results:**
- ✅ `provider` = 'groq' (fallback provider)
- ✅ `was_fallback` = true
- ✅ `fallback_reason` contains error description
- ✅ Response still received successfully

---

### Test 7: Budget Tracking

**Objective:** Verify budget is being tracked correctly

**Steps:**
1. Send multiple messages (chat, audio, image)

2. Check budget usage:
   ```sql
   SELECT 
     client_id,
     total_budget_brl,
     current_usage_brl,
     budget_period,
     next_reset_at,
     is_paused
   FROM client_budgets
   WHERE client_id = 'YOUR_CLIENT_ID';
   ```

3. Check per-API budget limits:
   ```sql
   SELECT 
     api_type,
     limit_type,
     limit_value,
     current_usage,
     is_paused
   FROM client_budget_limits
   WHERE client_id = 'YOUR_CLIENT_ID';
   ```

**Expected Results:**
- ✅ `current_usage_brl` increases with each request
- ✅ Per-API limits (chat, whisper, vision) are tracked separately
- ✅ Budget percentage calculated correctly
- ✅ No pause if under limit

---

### Test 8: Error Handling (Gateway Disabled)

**Objective:** Verify proper error when gateway is disabled

**Steps:**
1. Disable gateway for test client:
   ```sql
   UPDATE clients
   SET use_ai_gateway = false
   WHERE id = 'YOUR_CLIENT_ID';
   ```

2. Send a message via WhatsApp

3. Check logs for error:
   ```
   [AI Gateway] Gateway disabled for client
   Error: AI Gateway is required but disabled for this client
   ```

**Expected Results:**
- ✅ Clear error message in logs
- ✅ No fallback to legacy SDK (removed)
- ✅ User receives error notification (if implemented)

---

## 📊 Analytics Verification

### Total Usage by API Type
```sql
SELECT
  api_type,
  COUNT(*) as requests,
  SUM(total_tokens) as tokens,
  SUM(input_units) as audio_seconds,
  SUM(output_units) as images,
  SUM(cost_brl) as total_cost_brl,
  AVG(latency_ms) as avg_latency_ms
FROM gateway_usage_logs
WHERE client_id = 'YOUR_CLIENT_ID'
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY api_type
ORDER BY total_cost_brl DESC;
```

**Expected Output:**
```
api_type    | requests | tokens | audio_seconds | images | total_cost_brl | avg_latency_ms
------------|----------|--------|---------------|--------|----------------|----------------
chat        | 10       | 5000   | 0             | 0      | 0.0250         | 1200
whisper     | 2        | 0      | 120           | 0      | 0.0120         | 3000
vision      | 1        | 1500   | 0             | 1      | 0.0600         | 2500
embeddings  | 5        | 2000   | 0             | 0      | 0.0010         | 500
```

### Cache Performance
```sql
SELECT
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE was_cached) as cache_hits,
  COUNT(*) FILTER (WHERE NOT was_cached) as cache_misses,
  ROUND(100.0 * COUNT(*) FILTER (WHERE was_cached) / COUNT(*), 2) as hit_rate_percent
FROM gateway_usage_logs
WHERE client_id = 'YOUR_CLIENT_ID'
  AND created_at >= NOW() - INTERVAL '7 days';
```

**Expected Output:**
```
total_requests | cache_hits | cache_misses | hit_rate_percent
---------------|------------|--------------|------------------
100            | 30         | 70           | 30.00
```

---

## 🚨 Troubleshooting

### Issue: No logs appearing in `gateway_usage_logs`

**Possible Causes:**
1. Gateway not enabled for client (`use_ai_gateway = false`)
2. Migrations not applied
3. API keys not configured
4. Logging function failing silently

**Solution:**
```sql
-- Check if gateway enabled
SELECT id, name, use_ai_gateway FROM clients WHERE id = 'YOUR_CLIENT_ID';

-- Check if columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'gateway_usage_logs' 
AND column_name IN ('api_type', 'input_units', 'output_units');
```

### Issue: `api_type` is always 'chat'

**Possible Cause:** Old code calling `logGatewayUsage` instead of `logAPIUsage`

**Solution:**
Check that the code is calling the correct function:
- ✅ `logAPIUsage` from `@/lib/ai-gateway/api-tracking`
- ❌ `logGatewayUsage` from `@/lib/ai-gateway/usage-tracking` (legacy)

### Issue: Cost is always $0.00

**Possible Causes:**
1. Pricing not defined for model
2. USD to BRL conversion failing
3. Usage data not captured correctly

**Solution:**
```sql
-- Check USD to BRL rate
SELECT usd_to_brl_rate FROM gateway_usage_logs 
ORDER BY created_at DESC LIMIT 1;

-- Should be around 5.0-5.5
```

---

## 🎉 Success Criteria

Consider the AI Gateway fully tested and verified when:

- ✅ All 8 test cases pass
- ✅ All API types (chat, whisper, vision, embeddings) are being logged
- ✅ Costs are calculated correctly in BRL
- ✅ Cache is working (hit rate > 20%)
- ✅ Fallback mechanism works
- ✅ Budget tracking is accurate
- ✅ Error handling works when gateway disabled
- ✅ UI navigation to AI Gateway setup page works

---

## 📝 Post-Testing Actions

After successful testing:

1. **Enable for all clients:**
   ```bash
   # Run the SQL script
   psql SUPABASE_URL < docs/features/ai_gateway/enable-gateway-all-clients.sql
   ```

2. **Monitor for 24 hours:**
   - Check error rates
   - Verify no spike in costs
   - Monitor latency P95

3. **Update documentation:**
   - Mark implementation as complete
   - Document any edge cases found
   - Update troubleshooting guide

4. **Notify stakeholders:**
   - Email/Slack announcement
   - Include metrics (cost savings, cache hit rate)
   - Provide support contact

---

**Last Updated:** 2025-12-13  
**Tested By:** _[Your Name]_  
**Status:** ⏳ Ready for Testing

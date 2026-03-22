# Errors & Edge Cases

**Projeto:** ChatBot-Oficial (UzzApp WhatsApp SaaS)
**Data:** 2026-03-15
**Análise:** Baseada em código-fonte + documentação

---

## 🐛 Known Errors (Documented in Code)

### 1. ⚠️ `pg` Library in Serverless (NODE 3 FREEZING)

**Error:** Connection timeout, process hangs
**Location:** `src/lib/postgres.ts`
**Root Cause:** `pg` library doesn't work in Vercel serverless (connection pooling issues)

**Evidência:**
- CLAUDE.md:178-188
- Package.json includes `pg@8.16.3`

**Symptoms:**
```
[NODE 3] Checking or creating customer...
[TIMEOUT] No response for 10+ seconds
[ERROR] Function execution timeout
```

**Solution:**
```typescript
// ❌ NEVER in serverless
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
await pool.query('SELECT * FROM table')

// ✅ ALWAYS in serverless
const supabase = createServerClient()
await supabase.from('table').select('*')
```

**Status:** ⚠️ Library still installed, needs audit to ensure no usage in API routes

**Recommendation:** Remove `pg` package entirely, replace all usages with Supabase client

---

### 2. ⚠️ Webhook Signature Verification Fails

**Error:** `400 Bad Request - Invalid signature`
**Location:** Webhook receiver
**Root Cause:** Incorrect `META_APP_SECRET` or request tampering

**Evidência:** User-reported in conversation history

**Symptoms:**
- Meta sends webhook
- Signature verification fails
- Returns 400
- Meta retries → infinite loop

**Solution:**
1. Verify `META_APP_SECRET` in .env.local matches Meta Dashboard
2. Check Meta Dashboard → App Settings → Basic → App Secret
3. Ensure no proxy/middleware modifying request body before verification

**Debugging:**
```typescript
// Add logging in webhook route
console.log('[Webhook] Raw body:', rawBody)
console.log('[Webhook] Signature from header:', signature)
console.log('[Webhook] Computed signature:', computedSignature)
console.log('[Webhook] Secret used:', process.env.META_APP_SECRET?.substring(0, 10) + '...')
```

---

### 3. ⚠️ Redis Connection Refused

**Error:** `ECONNREFUSED redis://localhost:6379`
**Location:** `src/lib/redis.ts`
**Root Cause:** Redis not running locally (optional dependency)

**Evidência:** CLAUDE.md:130-140

**Symptoms:**
- Warning in logs: `[Redis] Connection failed`
- Flow continues without batching
- Immediate AI responses (no 10s delay)

**Behavior:** **Graceful degradation** - flow continues without batching

**Solution:**
1. **For development:**
   ```bash
   # Windows
   # Download from https://github.com/microsoftarchive/redis/releases
   redis-server

   # Mac
   brew install redis && brew services start redis

   # Linux
   sudo apt install redis-server && sudo systemctl start redis
   ```

2. **For production:** Use Upstash Redis (serverless-friendly)
   - Set `REDIS_URL=redis://...` from Upstash

**Not Critical:** System works without Redis, just no message batching

---

### 4. ⚠️ ESLint 9 Compatibility Issues

**Error:** Various lint errors in CI/CD
**Location:** Build process
**Root Cause:** ESLint 9 is very recent (January 2026), some plugins incompatible

**Evidência:**
- package.json: `"eslint": "^9.23.0"`
- Last commit: "chore: alinhar pnpm-lock.yaml com dependências Stripe e eslint 9"

**Symptoms:**
- `npm run lint` fails with plugin errors
- Build warnings about deprecated rules

**Solution:**
1. **Short-term:** Downgrade to ESLint 8.x
   ```bash
   npm install --save-dev eslint@^8.57.0
   ```

2. **Long-term:** Wait for plugin ecosystem to catch up to ESLint 9

**Status:** Monitoring - may cause build failures

---

### 5. ⚠️ Capacitor Version Mismatch

**Error:** Build failures on iOS/Android
**Location:** package.json
**Root Cause:** CLI v8.0.1 but core/platforms v7.4.4

**Evidência:** 03_DEPENDENCIES.md

**Symptoms:**
```
[capacitor] Error: Plugin API version mismatch
[capacitor] Expected: 7.x.x
[capacitor] Found: 8.x.x
```

**Solution:**
```bash
# Align all Capacitor packages to same version
npm install @capacitor/cli@^7.4.4
# OR upgrade all to v8
npm install @capacitor/core@^8.0.0 @capacitor/android@^8.0.0 @capacitor/ios@^8.0.0
```

**Recommendation:** Upgrade all to v8 for consistency

---

### 6. ⚠️ FFmpeg Build Warnings

**Error:** Webpack warnings about FFmpeg packages
**Location:** Build process
**Root Cause:** FFmpeg binaries can't be bundled

**Evidência:**
- package.json: `fluent-ffmpeg`, `@ffmpeg/ffmpeg`, `@ffmpeg-installer/ffmpeg`
- next.config.js:22,29-32 - Already externalized

**Symptoms:**
```
⚠ [webpack] Unable to resolve module @ffmpeg-installer/ffmpeg
⚠ [webpack] Module not found: Can't resolve 'fluent-ffmpeg'
```

**Solution:** Already implemented in `next.config.js`:
```javascript
config.externals.push({
  'fluent-ffmpeg': 'commonjs fluent-ffmpeg',
  '@ffmpeg-installer/ffmpeg': 'commonjs @ffmpeg-installer/ffmpeg',
})
```

**Status:** ✅ Working as expected. Warnings are cosmetic, build succeeds.

**Impact:** None - audio conversion works correctly

---

### 7. ⚠️ Race Condition: Messages Not in History

**Error:** AI response doesn't include bot's previous response
**Location:** Chatbot flow (FIXED in v2.0)
**Root Cause:** Sequential send → save caused race condition

**Evidência:** chatbotFlow.ts:1585-1685 (FIXED version)

**Old Behavior:**
```
1. Send message 1 to WhatsApp → delay → Send message 2
2. Save both to DB
3. User responds immediately
4. AI fetches history → only sees user messages (bot messages not yet saved)
```

**New Behavior (FIXED):**
```
1. Send message 1 → Save immediately → delay
2. Send message 2 → Save immediately → delay
3. User responds
4. AI fetches history → sees all messages (available in 2-4s)
```

**Status:** ✅ FIXED with "intercalado" pattern

**Evidência:** chatbotFlow.ts:1585-1685

---

### 8. ⚠️ Duplicate Message Processing

**Error:** Same message processed twice, AI responds twice
**Location:** Chatbot flow
**Root Cause:** Webhook retries or user double-taps

**Evidência:** chatbotFlow.ts:794-828 (duplicate detection)

**Solution:** Duplicate detection with 30s window
```typescript
const duplicateCheck = await checkDuplicateMessage({
  phone, messageContent, clientId
})
if (duplicateCheck.isDuplicate) {
  return { success: true, skipped: true, reason: 'duplicate_message' }
}
```

**Status:** ✅ FIXED in current version

---

### 9. ⚠️ Tool Calls Appearing in WhatsApp Messages

**Error:** User sees `<function=transferir_atendimento>...</function>` in message
**Location:** formatResponse node
**Root Cause:** AI response includes tool call XML

**Evidência:** formatResponse.ts:7-10

**Solution:**
```typescript
const removeToolCalls = (text: string): string => {
  return text.replace(/<function=[^>]+>[\s\S]*?<\/function>/g, '').trim()
}
```

**Status:** ✅ FIXED in formatResponse.ts

---

## 🔥 Edge Cases

### Edge Case 1: Empty AI Response After Tool Call

**Scenario:** AI calls tool, tool executes, but returns empty content
**Location:** chatbotFlow.ts:1553-1556

**Handling:**
```typescript
if (!aiResponse.content || aiResponse.content.trim().length === 0) {
  logger.finishExecution('success')
  return { success: true, messagesSent: 0 }
}
```

**Behavior:** Flow completes successfully, no message sent
**Is This OK?:** Yes - some tools (like transfer) don't need response

---

### Edge Case 2: Media Transcription Fails

**Scenario:** Whisper API fails to transcribe audio
**Location:** chatbotFlow.ts:415-442

**Handling:**
```typescript
try {
  const transcription = await transcribeAudio(...)
  processedContent = transcription.text
} catch (transcriptionError) {
  // Save FAILED user message with error details
  await saveChatMessage({
    phone, message: "🎤 [Áudio não pôde ser transcrito]",
    type: "user", clientId, wamid, status: "failed",
    errorDetails: { code: "TRANSCRIPTION_FAILED", message: errorMessage }
  })
  return { success: false, error: errorMessage }
}
```

**Behavior:** Error saved to conversation, flow stops, user notified
**Is This OK?:** Yes - prevents silent failures

---

### Edge Case 3: Status = 'fluxo_inicial' But No Flow Found

**Scenario:** Customer status is 'fluxo_inicial' but no active flow
**Location:** chatbotFlow.ts:264-323

**Handling:**
```typescript
const flowResult = await checkInteractiveFlow(...)
if (!flowResult.flowExecuted) {
  // Update status back to 'bot'
  await supabase.from('clientes_whatsapp')
    .update({ status: 'bot' })
    .eq('telefone', phone).eq('client_id', clientId)
  // Continue to AI pipeline
}
```

**Behavior:** Automatic status correction, continue normal processing
**Is This OK?:** Yes - prevents stuck customers

---

### Edge Case 4: Same User Message Repeated

**Scenario:** User sends exact same message again
**Location:** chatbotFlow.ts:1147-1168

**Handling:**
```typescript
const isSameUserMessageAsLast =
  lastUserMessage === normalizedCurrentMessage

if (isSameUserMessageAsLast) {
  // Skip repetition detection (allow cached response)
  logger.logNodeSuccess("12.5. Detect Repetition", {
    skipped: true, reason: "same_user_message"
  })
}
```

**Behavior:** Allows cached identical response (UX: expected behavior)
**Is This OK?:** Yes - if user repeats question, same answer is fine

---

### Edge Case 5: Budget Exceeded Mid-Conversation

**Scenario:** Client hits budget limit during AI call
**Location:** Direct AI Client

**Handling:**
```typescript
const budgetCheck = await checkBudgetAvailable(clientId)
if (!budgetCheck.allowed) {
  throw new Error(`Budget exceeded: ${budgetCheck.reason}`)
}
```

**Behavior:** AI call fails, error returned to flow
**Downstream:** Flow should catch and save error message

**⚠️ GAP:** No specific handling in chatbotFlow for budget errors

**Recommendation:** Add specific error handling for budget exhaustion

---

### Edge Case 6: Webhook Receives Unknown Event Type

**Scenario:** Meta sends new event type (future API update)
**Location:** filterStatusUpdates.ts, parseMessage.ts

**Handling:**
```typescript
// filterStatusUpdates: skip unknown types (return null)
if (!payload.entry?.[0]?.changes?.[0]?.value?.messages) {
  return null
}

// parseMessage: handle unknown message types
const messageType = message.type || 'text'
// Defaults to 'text' if unknown
```

**Behavior:** Unknown events filtered out, unknown message types treated as text
**Is This OK?:** Yes - forward-compatible

---

## 🚨 Critical Risks

### Risk 1: RLS Policy Bypass

**Scenario:** Developer forgets `.eq('client_id', clientId)` in query
**Impact:** Data leak across tenants
**Mitigation:** RLS policies as final safeguard

**Example Vulnerable Code:**
```typescript
// ❌ DANGEROUS - no client_id filter
const { data } = await supabase
  .from('clientes_whatsapp')
  .select('*')
  .eq('telefone', phone) // Missing .eq('client_id', clientId)
```

**Detection:** Audit all queries in codebase for client_id enforcement

**Recommendation:** Add ESLint rule or pre-commit hook to detect missing client_id

---

### Risk 2: Vault Secret Rotation Without App Restart

**Scenario:** Admin rotates secret in Vault, app still uses cached config
**Impact:** API calls fail with invalid credentials
**Mitigation:** Config cache has 5min TTL

**Current TTL:** `BOT_CONFIG_CACHE_TTL = 5 * 60 * 1000` (5 minutes)

**Recommendation:** Add manual cache invalidation endpoint
```typescript
// POST /api/admin/invalidate-config-cache
export async function POST() {
  clearBotConfigCache()
  return NextResponse.json({ success: true })
}
```

---

### Risk 3: Meta WhatsApp API Rate Limiting

**Scenario:** Sending too many messages too fast
**Impact:** 429 Too Many Requests, messages fail

**Current Protection:** 2s delay between messages (configurable)

**Limits:**
- 80 messages/second per phone number (Meta limit)
- 1000 business-initiated conversations/month free tier

**Recommendation:** Implement exponential backoff on 429 errors

---

### Risk 4: Supabase Storage Quota Exceeded

**Scenario:** Too many media files uploaded (audio, images, documents)
**Impact:** Storage full, uploads fail

**Current Limit:** 1GB on free tier

**Recommendation:**
1. Implement media file cleanup (delete old files)
2. Upgrade to Supabase Pro
3. Add storage quota monitoring

---

## 🔍 Debugging Patterns

### Debug Webhook Issues

1. Check webhook cache: `GET /api/test/webhook-cache`
2. Check execution logs: `GET /api/backend/audit-logs`
3. Simulate payload: `POST /api/test/simulate-webhook`

### Debug AI Response Issues

1. Test node individually: `GET /api/test/nodes/ai-response`
2. Check chat history: `GET /api/test/nodes/chat-history`
3. Check RAG context: `GET /api/test/nodes/rag-context`

### Debug Tenant Isolation

1. Check user profile: `GET /api/debug/my-profile`
2. Check RLS policies: Query Supabase Dashboard
3. Test with multiple clients: Create test accounts

---

## 📋 Error Handling Checklist

- [x] Try-catch around all AI calls
- [x] Try-catch around media processing (audio/image/PDF)
- [x] Graceful degradation for Redis failures
- [x] Error messages saved to conversation (failed status)
- [x] Duplicate message detection (30s window)
- [x] Tool call stripping from responses
- [ ] Budget exhaustion handling (⚠️ GAP)
- [ ] Rate limit handling with exponential backoff (⚠️ GAP)
- [ ] Storage quota monitoring (⚠️ GAP)

---

## 🎯 Recommendations

### High Priority

1. ✅ Remove `pg` library (replace with Supabase client)
2. ✅ Add budget exhaustion handling in chatbot flow
3. ✅ Add rate limit handling with exponential backoff
4. ✅ Audit all queries for client_id enforcement

### Medium Priority

5. ⚠️ Add config cache invalidation endpoint
6. ⚠️ Add storage quota monitoring/alerts
7. ⚠️ Add ESLint rule for client_id enforcement
8. ⚠️ Implement media file cleanup job

### Low Priority

9. ⚠️ Add Sentry or error tracking service
10. ⚠️ Add health check endpoint for all dependencies
11. ⚠️ Add metrics dashboard for error rates

---

*Última atualização: 2026-03-15*
*Versão: 1.0*
*Baseado em análise de código e documentação*

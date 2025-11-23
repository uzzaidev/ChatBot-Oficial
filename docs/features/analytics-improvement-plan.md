# Analytics & Budget System - Improvement Plan

**Status:** 🚧 In Progress
**Created:** 2025-01-23
**Priority:** HIGH

---

## Executive Summary

Current analytics system is **partially functional** but missing critical tracking for **OpenAI Embeddings** and lacks **monthly budget controls**. This plan addresses all gaps and proposes a complete usage tracking + budget management system.

---

## Current State Analysis

### ✅ What's Working

| Component | Status | Notes |
|-----------|--------|-------|
| **Groq AI (Main Agent)** | ✅ Tracked | `logGroqUsage()` in chatbotFlow.ts:490 |
| **OpenAI GPT-4o Vision** | ✅ Tracked | `logOpenAIUsage()` in chatbotFlow.ts:160 |
| **Whisper (Audio)** | ✅ Tracked | `logWhisperUsage()` in chatbotFlow.ts:136 |
| **OpenAI GPT-4 (Documents)** | ✅ Tracked | `logOpenAIUsage()` in chatbotFlow.ts:189 |
| **Analytics API** | ✅ Working | `/api/analytics` returns data |
| **Dashboard Display** | ⚠️ Issue | Not updating (RLS problem?) |
| **Pricing Config** | ✅ Working | Database-driven pricing |

### ❌ Critical Gaps

| Component | Status | Impact | Location |
|-----------|--------|--------|----------|
| **OpenAI Embeddings** | ❌ NOT Tracked | Missing ~$0.00002/1K tokens | `getRAGContext.ts:40` |
| **Monthly Budget** | ❌ Not Implemented | No spending limits | N/A |
| **Budget Alerts** | ❌ Not Implemented | No notifications | N/A |
| **Real-time Dashboard** | ⚠️ Not Updating | User can't monitor spend | `/dashboard/analytics` |

---

## All External APIs/Models in Use

### 1. **OpenAI** (3 endpoints)

| API | Model | Usage | Current Tracking | Cost/1K tokens |
|-----|-------|-------|------------------|----------------|
| **Chat Completions** | `gpt-4o` | Vision analysis | ✅ Tracked | $0.005 prompt, $0.015 completion |
| **Audio Transcriptions** | `whisper-1` | Audio → text | ✅ Tracked | $0.006/minute |
| **Embeddings** | `text-embedding-3-small` | RAG search | ❌ **NOT TRACKED** | $0.00002/1K tokens |

**Files:**
- `src/lib/openai.ts:225` - `generateEmbedding()`
- `src/nodes/getRAGContext.ts:40` - Calls embedding but doesn't log
- `src/nodes/processDocumentWithChunking.ts` - Document upload embeddings

### 2. **Groq**

| API | Model | Usage | Current Tracking | Cost |
|-----|-------|-------|------------------|------|
| **Chat Completions** | `llama-3.3-70b-versatile` | Main chatbot agent | ✅ Tracked | Free (rate limited) |

**Files:**
- `src/lib/groq.ts` - Main client
- `src/nodes/generateAIResponse.ts` - Agent logic

### 3. **Meta WhatsApp Cloud API**

| Endpoint | Usage | Current Tracking | Cost |
|----------|-------|------------------|------|
| **Send Message** | Outbound messages | ❌ Not tracked | ~$0.005-0.01/message |
| **Send Media** | Images/audio/docs | ❌ Not tracked | ~$0.02-0.04/message |

**Files:**
- `src/lib/whatsapp.ts` - Send functions
- `src/nodes/sendWhatsAppMessage.ts`

**Note:** Meta charges per conversation (24h window), not per message. Current system doesn't track this.

### 4. **Sub-agents** (if configured)

| Tool | Usage | Tracking |
|------|-------|----------|
| `transferir_atendimento` | Human handoff | ❌ No API usage |
| `subagente_diagnostico` | Custom tool calls | ❓ Unknown (depends on implementation) |

**File:** `src/nodes/generateAIResponse.ts:99`

---

## Problems Identified

### Problem 1: OpenAI Embeddings Not Tracked ❌

**Impact:** Missing cost tracking for every RAG query (~$0.00002/query)

**Current code:**
```typescript
// src/nodes/getRAGContext.ts:40
const embeddingResult = await generateEmbedding(query, openaiApiKey)
// ❌ No logUsage() call here!
```

**Expected cost:**
- If 1000 RAG queries/day → ~$0.02/day = $0.60/month
- Small but should be tracked for transparency

**Solution:** Add `logOpenAIUsage()` after embedding generation

---

### Problem 2: Dashboard Not Updating ⚠️

**Symptoms:**
- User reports analytics page not showing recent data
- Likely causes:
  1. RLS policies blocking data
  2. Missing `client_id` in session
  3. Stale cache

**Investigation needed:**
- Check `/api/analytics` returns data via curl
- Verify `getClientIdFromSession()` works
- Check browser network tab for errors

**File:** `src/app/api/analytics/route.ts`

---

### Problem 3: No Monthly Budget System ❌

**Current:** Unlimited spending, no controls

**Required:**
- Table `client_budgets` with monthly limits
- Real-time spending calculation
- Block requests when budget exceeded
- Email alerts at 80%/100%

**Business logic:**
```
IF current_month_spend >= monthly_budget THEN
  BLOCK chatbot requests
  SHOW "Budget exceeded" message
  EMAIL admin
END
```

---

### Problem 4: WhatsApp API Not Tracked ❌

**Current:** No tracking of Meta API costs

**Impact:** Missing ~$5-50/month depending on volume

**Note:** Meta charges per **conversation** (24h window), not per message. Complex to track.

**Recommendation:** Track message count + estimated cost (conservative estimate)

---

## Implementation Plan

### Phase 1: Fix Embeddings Tracking (PRIORITY 1)

**Effort:** 30 minutes
**Files to modify:**
1. `src/nodes/getRAGContext.ts`
2. `src/nodes/processDocumentWithChunking.ts` (if applicable)

**Changes:**
```typescript
// src/nodes/getRAGContext.ts
const embeddingResult = await generateEmbedding(query, openaiApiKey)

// ✅ ADD THIS:
await logOpenAIUsage(
  clientId,
  undefined, // conversation_id
  'system', // phone (RAG is system-level)
  'text-embedding-3-small',
  embeddingResult.usage
)
```

**Pricing to add:**
```sql
INSERT INTO pricing_config (client_id, provider, model, prompt_price, completion_price, unit)
VALUES (
  'default',
  'openai',
  'text-embedding-3-small',
  0.00002, -- $0.00002 per 1K tokens
  0,
  'per_1k_tokens'
);
```

---

### Phase 2: Fix Dashboard Update Issue (PRIORITY 1)

**Effort:** 1-2 hours
**Investigation steps:**

1. **Test API directly:**
```bash
curl http://localhost:3000/api/analytics?days=7 \
  -H "Cookie: your-session-cookie"
```

2. **Check RLS policies:**
```sql
-- Verify usage_logs RLS allows reads
SELECT * FROM usage_logs WHERE client_id = 'your-client-id' LIMIT 5;
```

3. **Check frontend:**
- Open `/dashboard/analytics`
- Check browser console for errors
- Verify `fetch('/api/analytics')` succeeds

4. **Common fixes:**
- Add `client_id` to all queries
- Update RLS policies
- Clear Supabase cache
- Force dynamic rendering

**File to check:** `src/app/dashboard/analytics/page.tsx`

---

### Phase 3: Implement Monthly Budget System (PRIORITY 2)

**Effort:** 4-6 hours
**Components:**

#### 3.1 Database Schema

```sql
-- New table: client_budgets
CREATE TABLE client_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL, -- 'YYYY-MM' format
  budget_limit_usd NUMERIC(10,2) NOT NULL DEFAULT 100.00,
  alert_threshold NUMERIC(3,2) DEFAULT 0.80, -- Alert at 80%
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, month_year)
);

-- RLS policies
ALTER TABLE client_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own budgets"
  ON client_budgets FOR SELECT
  USING (client_id IN (SELECT client_id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Client admins can manage budgets"
  ON client_budgets FOR ALL
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'client_admin')
    )
  );

-- New table: budget_alerts
CREATE TABLE budget_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,
  alert_type TEXT NOT NULL, -- 'warning_80' | 'critical_100' | 'exceeded'
  current_spend NUMERIC(10,2) NOT NULL,
  budget_limit NUMERIC(10,2) NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  notified_users TEXT[] -- Array of user emails notified
);
```

#### 3.2 Budget Check Function

```typescript
// src/lib/budgetControl.ts
export const checkMonthlyBudget = async (clientId: string): Promise<{
  allowed: boolean
  currentSpend: number
  budgetLimit: number
  percentUsed: number
}> => {
  const monthYear = new Date().toISOString().slice(0, 7) // 'YYYY-MM'

  // Get budget limit
  const budgetResult = await query(
    'SELECT budget_limit_usd FROM client_budgets WHERE client_id = $1 AND month_year = $2',
    [clientId, monthYear]
  )

  const budgetLimit = budgetResult.rows[0]?.budget_limit_usd || 1000000 // Default unlimited

  // Get current month spend
  const spendResult = await query(
    `SELECT COALESCE(SUM(cost_usd), 0) as total_spend
     FROM usage_logs
     WHERE client_id = $1
       AND created_at >= date_trunc('month', NOW())`,
    [clientId]
  )

  const currentSpend = parseFloat(spendResult.rows[0].total_spend)
  const percentUsed = (currentSpend / budgetLimit) * 100

  return {
    allowed: currentSpend < budgetLimit,
    currentSpend,
    budgetLimit,
    percentUsed
  }
}
```

#### 3.3 Integration in Webhook

```typescript
// src/app/api/webhook/[clientId]/route.ts
const budgetStatus = await checkMonthlyBudget(clientId)

if (!budgetStatus.allowed) {
  // Send budget exceeded message to user
  await sendWhatsAppMessage({
    phone: phone,
    content: 'Orçamento mensal excedido. Entre em contato com o suporte.',
    clientId: clientId
  })

  return NextResponse.json({
    status: 'budget_exceeded',
    message: 'Monthly budget limit reached'
  })
}

// Check if needs alert (80% threshold)
if (budgetStatus.percentUsed >= 80 && budgetStatus.percentUsed < 100) {
  await sendBudgetAlert(clientId, 'warning_80', budgetStatus)
}
```

#### 3.4 Settings Page UI

**File:** `src/app/dashboard/settings/page.tsx`

**New section:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Orçamento Mensal</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      <div>
        <Label>Limite Mensal (USD)</Label>
        <Input
          type="number"
          value={monthlyBudget}
          onChange={(e) => setMonthlyBudget(e.target.value)}
        />
      </div>

      <div>
        <Label>Alerta em (%)</Label>
        <Input
          type="number"
          value={alertThreshold}
          placeholder="80"
        />
      </div>

      <Button onClick={saveBudget}>Salvar Orçamento</Button>
    </div>
  </CardContent>
</Card>
```

---

### Phase 4: WhatsApp API Tracking (PRIORITY 3)

**Effort:** 2-3 hours
**Complexity:** Medium (Meta charges per conversation, not message)

**Strategy:** Track messages + estimate cost

```typescript
// src/nodes/sendWhatsAppMessage.ts
await sendWhatsApp(...)

// ✅ ADD THIS:
await logUsage({
  clientId,
  conversationId,
  phone,
  source: 'meta',
  model: 'whatsapp-cloud-api',
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 1, // 1 message sent
  metadata: {
    message_type: 'text', // or 'media'
    estimated_cost: 0.01 // Conservative estimate
  }
})
```

**Pricing:**
```sql
INSERT INTO pricing_config (client_id, provider, model, prompt_price, completion_price, unit)
VALUES (
  'default',
  'meta',
  'whatsapp-cloud-api',
  0.01, -- ~$0.01 per message (conservative)
  0,
  'per_message'
);
```

---

### Phase 5: Enhanced Analytics Dashboard (PRIORITY 3)

**Effort:** 3-4 hours
**New metrics to show:**

1. **Budget Progress Bar**
```tsx
<Progress value={budgetStatus.percentUsed} />
<p>{budgetStatus.currentSpend.toFixed(2)} / {budgetStatus.budgetLimit} USD</p>
```

2. **Cost Breakdown by Provider**
```tsx
<BarChart data={[
  { name: 'OpenAI', cost: 12.45 },
  { name: 'Groq', cost: 0 },
  { name: 'WhatsApp', cost: 5.20 },
  { name: 'Embeddings', cost: 0.60 }
]} />
```

3. **Model Usage Details**
| Model | Requests | Tokens | Cost |
|-------|----------|--------|------|
| gpt-4o | 150 | 45K | $2.25 |
| whisper-1 | 80 | 12K | $1.20 |
| text-embedding-3-small | 500 | 250K | $0.05 |
| llama-3.3-70b | 200 | 80K | $0.00 |

4. **Real-time Updates**
- Use Supabase Realtime subscription on `usage_logs`
- Update dashboard every 30s

---

## Testing Checklist

### Embeddings Tracking
- [ ] Upload document to `/dashboard/knowledge`
- [ ] Verify embedding usage appears in `usage_logs`
- [ ] Check cost calculated correctly (~$0.00002/1K tokens)

### Budget System
- [ ] Set budget to $10 in settings
- [ ] Send messages until spend > $8 (80%)
- [ ] Verify warning email sent
- [ ] Continue until spend > $10
- [ ] Verify chatbot blocks new requests
- [ ] Check "budget exceeded" message sent to user

### Dashboard
- [ ] Visit `/dashboard/analytics`
- [ ] Verify all 4 providers show data
- [ ] Check budget bar displays correctly
- [ ] Send test message, verify dashboard updates within 30s

### WhatsApp Tracking
- [ ] Send text message
- [ ] Send image
- [ ] Verify both logged with `source: 'meta'`
- [ ] Check estimated cost applied

---

## Migration Steps

### Step 1: Create migrations
```bash
supabase migration new add_budget_system
```

### Step 2: Apply to production
```bash
supabase db push
```

### Step 3: Seed default budgets
```sql
-- Set $100/month default for all existing clients
INSERT INTO client_budgets (client_id, month_year, budget_limit_usd)
SELECT id, TO_CHAR(NOW(), 'YYYY-MM'), 100.00
FROM clients
ON CONFLICT (client_id, month_year) DO NOTHING;
```

### Step 4: Deploy code
```bash
git add .
git commit -m "feat: complete analytics tracking + budget system"
git push
```

---

## Cost Estimates (Current System)

**Assumptions:**
- 1000 messages/day
- 50% with RAG
- 20% with images
- 10% with audio

| Provider | Daily Cost | Monthly Cost |
|----------|-----------|--------------|
| **Groq** (Main AI) | $0.00 | $0.00 |
| **OpenAI GPT-4o** (Images) | $3.00 | $90.00 |
| **Whisper** (Audio) | $1.20 | $36.00 |
| **Embeddings** (RAG) | $0.01 | $0.30 |
| **WhatsApp** (Meta) | $10.00 | $300.00 |
| **TOTAL** | **$14.21** | **$426.30** |

**Note:** WhatsApp is the highest cost! Consider optimizing message batching.

---

## Priority Order

1. **🔥 URGENT:** Fix embeddings tracking (30 min)
2. **🔥 URGENT:** Fix dashboard update issue (1-2 hours)
3. **📊 HIGH:** Implement budget system (4-6 hours)
4. **💰 MEDIUM:** Track WhatsApp API costs (2-3 hours)
5. **🎨 LOW:** Enhanced analytics UI (3-4 hours)

**Total estimated effort:** 11-16 hours

---

## Success Metrics

After implementation, system should:
- ✅ Track 100% of external API calls
- ✅ Prevent budget overruns
- ✅ Alert admins at 80% spend
- ✅ Show real-time cost breakdown
- ✅ Update dashboard within 30s of new usage

---

## Future Enhancements (Phase 6+)

- [ ] Cost optimization suggestions (AI-powered)
- [ ] Predictive budget alerts ("at current rate, will exceed in 5 days")
- [ ] Per-user cost tracking (who's using most tokens)
- [ ] Cost vs. value metrics (revenue per dollar spent)
- [ ] Export usage reports (CSV/PDF)
- [ ] Webhook alerts to external systems (Slack, Discord)

---

## References

- **Usage Tracking:** `src/lib/usageTracking.ts`
- **Analytics API:** `src/app/api/analytics/route.ts`
- **Chatbot Flow:** `src/flows/chatbotFlow.ts`
- **Pricing Config:** `docs/PRICING_CONFIG_GUIDE.md`
- **Database Schema:** `docs/tables/tabelas.md`

---

**Next Steps:** Review this plan, prioritize phases, and begin implementation starting with Phase 1 (embeddings tracking).

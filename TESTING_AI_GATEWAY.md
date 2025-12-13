# AI Gateway - Testing Guide

## Changes Summary

This PR fixes critical issues in the AI Gateway implementation:

1. **Fixed Database Error**: The cache API was querying non-existent columns
2. **Added Navigation**: Complete navigation system across all AI Gateway pages
3. **Added Budget Management**: New page to monitor and manage client budgets

## How to Test

### 1. Setup & Prerequisites

**REQUIRED**: Enable AI Gateway in environment variables

Create or update `.env.local` file:

```bash
# AI Gateway - REQUIRED for AI Gateway to work
ENABLE_AI_GATEWAY=true

# Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**Important**: Without `ENABLE_AI_GATEWAY=true`, the gateway will not work even if clients have `use_ai_gateway=true` in the database.

Install dependencies and start server:

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Navigate to: http://localhost:3000

### 2. Test AI Gateway Navigation

**Access Points:**
- Sidebar: Click "AI Gateway" → Should land on overview page
- Overview Page: `/dashboard/ai-gateway`

**Navigation Tabs** (appears on all pages):
- Setup
- Cache  
- Models
- Analytics
- Budget

**Test Steps:**
1. Click "AI Gateway" in sidebar
2. Verify overview page loads with 5 section cards
3. Click each section card - should navigate to respective page
4. On any page, use the top navigation tabs to switch sections
5. Verify active tab is highlighted in blue

### 3. Test Cache Page (Main Fix)

**URL**: `/dashboard/ai-gateway/cache`

**Before Fix**: Error 500 - "column gateway_cache_performance.expires_at does not exist"
**After Fix**: Page loads successfully

**Test Steps:**
1. Navigate to Cache page
2. Page should load without errors
3. If no cached requests exist: Shows "Nenhuma entry em cache"
4. If cached requests exist: Shows entries grouped by provider/model
5. Try clicking "Atualizar" button - should refresh data
6. Try clicking "Limpar Tudo" button - should show 501 error with explanation

**Expected Behavior with Data:**
- Summary cards show: Total entries, Total hits, Economia total
- Each entry shows:
  - Provider/Model name
  - Hit count
  - Tokens saved
  - Estimated savings in BRL
  - TTL information

### 4. Test Budget Page (New Feature)

**URL**: `/dashboard/ai-gateway/budget`

**Test Steps:**
1. Navigate to Budget page
2. If no budgets configured: Shows "Nenhum cliente com budget configurado"
3. If budgets exist: Shows list of client budgets

**Expected Display** (with data):
- Summary cards: Total clients, Pausados, Críticos (≥90%), Atenção (≥80%)
- Per-client cards with:
  - Client name
  - Budget limit (tokens/BRL/USD)
  - Current usage with progress bar
  - Usage percentage
  - Status badge (color-coded)
  - Next reset date
  - Alert messages for critical/paused states

### 5. Test Other Pages

**Setup Page**: `/dashboard/ai-gateway/setup`
- Should load without errors
- Shows API key configuration form
- Shows current status of configured keys

**Models Page**: `/dashboard/ai-gateway/models`
- Should load without errors
- Lists available AI models by provider
- Shows pricing and capabilities

**Analytics Page**: `/dashboard/ai-gateway/analytics`
- Should load without errors
- Shows aggregated metrics
- Period selector works

### 6. Test with Real Data

To populate data for testing:

#### A. Create Sample Budget

```sql
-- Execute in Supabase SQL Editor
INSERT INTO client_budgets (
  client_id,
  budget_type,
  budget_limit,
  current_usage,
  budget_period,
  is_paused,
  last_reset_at,
  notification_email
) VALUES (
  (SELECT id FROM clients LIMIT 1), -- Use first client
  'tokens',
  100000,
  45000,
  'monthly',
  false,
  NOW(),
  'admin@example.com'
);
```

#### B. Create Sample Usage Logs (for Cache)

```sql
-- Execute in Supabase SQL Editor
INSERT INTO gateway_usage_logs (
  client_id,
  phone,
  provider,
  model_name,
  input_tokens,
  output_tokens,
  cached_tokens,
  total_tokens,
  was_cached,
  cost_brl,
  created_at
) VALUES (
  (SELECT id FROM clients LIMIT 1),
  '+5511999999999',
  'openai',
  'gpt-4o-mini',
  150,
  50,
  150,
  200,
  true,
  0.04,
  NOW()
);
```

### 7. API Testing

You can also test the APIs directly:

```bash
# Test Cache API
curl http://localhost:3000/api/ai-gateway/cache

# Test Budget API
curl http://localhost:3000/api/ai-gateway/budgets

# Test Cache DELETE (should return 501)
curl -X DELETE http://localhost:3000/api/ai-gateway/cache \
  -H "Content-Type: application/json" \
  -d '{"cacheKey":"test"}'
```

## Known Limitations

1. **Cache Invalidation**: The DELETE endpoint returns 501 (Not Implemented) because cache invalidation is not supported with Vercel AI SDK's built-in caching

2. **Empty States**: All pages handle empty data gracefully with helpful messages

3. **Cost Estimation**: Cache savings use a fixed average cost per token. In production, this should fetch actual pricing from `ai_models_registry` table

## Browser Testing

Recommended browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

Mobile responsive:
- Navigation tabs scroll horizontally on mobile
- Cards stack vertically on small screens

## Environment Variables

Ensure `.env.local` is configured:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Common Issues

**Issue**: "Failed to fetch" errors
**Solution**: Check Supabase credentials in `.env.local`

**Issue**: Empty data everywhere
**Solution**: Run the sample SQL inserts above to populate test data

**Issue**: Navigation tabs don't highlight correctly
**Solution**: Hard refresh browser (Ctrl+Shift+R)

## Success Criteria

✅ No console errors on any page
✅ All navigation links work
✅ Cache page loads without database error
✅ Budget page displays correctly
✅ Active tab highlighting works
✅ Empty states show helpful messages
✅ API endpoints return proper status codes

## Contact

If you encounter issues during testing, please provide:
1. Browser console errors (F12 → Console)
2. Network errors (F12 → Network)
3. Steps to reproduce
4. Expected vs actual behavior

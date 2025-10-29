# Analytics Dashboard - Usage Tracking Guide

## Overview

The Analytics Dashboard provides comprehensive tracking and visualization of API usage across OpenAI, Groq, and other providers. This guide explains how to integrate usage tracking into your application.

## Features

### Dashboard Views

- **Summary Cards**: Total tokens, costs, and provider-specific metrics
- **Weekly Evolution Chart**: 12-week trend of token usage
- **Daily Usage Chart**: Day-by-day breakdown for the last 30 days
- **Model Comparison**: Pie chart and detailed stats comparing OpenAI vs Groq
- **Conversation Usage Table**: Top 20 conversations by token consumption

### Tracked Metrics

- Total tokens (prompt + completion)
- Prompt tokens (input)
- Completion tokens (output)
- Cost in USD (automatically calculated)
- Request count
- Model-specific breakdowns

## Database Setup

### 1. Run the Migration

Execute the migration in your Supabase SQL Editor:

```sql
-- File: migrations/011_analytics_usage_tracking.sql
```

This creates:
- Enhanced `usage_logs` table
- Analytics helper functions
- Necessary indexes for performance

### 2. Verify Tables

Ensure these tables exist:
- `usage_logs` - Stores all API usage data
- `conversations` - Links usage to conversations
- `clients` - Multi-tenant client data

## Integration Guide

### Using the Usage Tracking Utilities

Import the tracking functions in your API code:

```typescript
import {
  logOpenAIUsage,
  logGroqUsage,
  logWhisperUsage,
} from '@/lib/usageTracking'
```

### Example: Track OpenAI Usage

```typescript
import { getOpenAIClient } from '@/lib/openai'
import { logOpenAIUsage } from '@/lib/usageTracking'

const client = getOpenAIClient()

const response = await client.chat.completions.create({
  model: 'gpt-4',
  messages: [...],
})

// Log usage to database
await logOpenAIUsage(
  clientId,           // Your client ID
  conversationId,     // Conversation ID (optional)
  phone,              // Customer phone number
  'gpt-4',            // Model name
  response.usage      // Usage object from OpenAI response
)
```

### Example: Track Groq Usage

```typescript
import { getGroqClient } from '@/lib/groq'
import { logGroqUsage } from '@/lib/usageTracking'

const client = getGroqClient()

const response = await client.chat.completions.create({
  model: 'llama-3.1-70b-versatile',
  messages: [...],
})

// Log usage to database
await logGroqUsage(
  clientId,
  conversationId,
  phone,
  'llama-3.1-70b-versatile',
  response.usage      // Includes prompt_time, completion_time for Groq
)
```

### Example: Track Whisper Usage

```typescript
import { transcribeAudio } from '@/lib/openai'
import { logWhisperUsage } from '@/lib/usageTracking'

const transcription = await transcribeAudio(audioBuffer)

// Log usage (estimate based on audio duration)
await logWhisperUsage(
  clientId,
  conversationId,
  phone,
  30,                 // Duration in seconds
  1500                // Optional: token estimate
)
```

## Pricing Configuration

Current pricing is configured in `src/lib/usageTracking.ts`:

```typescript
// OpenAI GPT-4
- Prompt: $0.03/1K tokens
- Completion: $0.06/1K tokens

// OpenAI GPT-3.5-turbo
- Prompt: $0.0015/1K tokens
- Completion: $0.002/1K tokens

// Groq
- Free (rate limited)

// Whisper
- $0.006/minute
```

**Update these values** in `calculateCost()` function as pricing changes.

## API Endpoints

### GET /api/analytics

Fetch analytics data for the authenticated client.

**Query Parameters:**
- `days` (optional): Number of days to look back (default: 30)
- `type` (optional): Type of data to fetch
  - `all` (default): All analytics data
  - `daily`: Daily usage only
  - `weekly`: Weekly evolution only
  - `monthly`: Monthly summary only
  - `conversation`: Per-conversation usage only

**Example:**

```typescript
// Fetch last 60 days of data
const response = await fetch('/api/analytics?days=60&type=all')
const data = await response.json()

console.log(data.analytics)
// {
//   daily: [...],
//   weekly: [...],
//   monthly: [...],
//   byConversation: [...],
//   summary: { ... }
// }
```

## Frontend Usage

### Using the Analytics Dashboard

Navigate to `/dashboard/analytics` in your application.

The dashboard automatically:
- Fetches data for the authenticated user's client
- Refreshes data every minute
- Allows period selection (7, 30, 60, 90 days)

### Custom Integration with useAnalytics Hook

```typescript
import { useAnalytics } from '@/hooks/useAnalytics'

function MyComponent() {
  const { analytics, loading, error, refetch } = useAnalytics({
    days: 30,
    type: 'all',
    refreshInterval: 60000, // Refresh every minute
  })

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      <h2>Total Tokens: {analytics?.summary?.total_tokens}</h2>
      <h2>Total Cost: ${analytics?.summary?.total_cost}</h2>
    </div>
  )
}
```

## Integration Checklist

When integrating usage tracking into your application:

- [ ] Run database migration `011_analytics_usage_tracking.sql`
- [ ] Import tracking utilities in API routes
- [ ] Add `logOpenAIUsage()` after OpenAI API calls
- [ ] Add `logGroqUsage()` after Groq API calls
- [ ] Add `logWhisperUsage()` after audio transcriptions
- [ ] Verify clientId is correctly passed
- [ ] Test with sample data
- [ ] Check analytics dashboard at `/dashboard/analytics`
- [ ] Update pricing in `calculateCost()` if needed

## Testing

### Insert Test Data

```sql
-- Insert test usage data
INSERT INTO usage_logs (
  client_id,
  phone,
  source,
  model,
  prompt_tokens,
  completion_tokens,
  total_tokens,
  cost_usd,
  created_at
) VALUES (
  'your-client-id',
  '5511999999999',
  'openai',
  'gpt-4',
  150,
  80,
  230,
  0.0129,
  NOW()
);
```

### Verify Data

```sql
-- Check recent usage
SELECT * FROM usage_logs
WHERE client_id = 'your-client-id'
ORDER BY created_at DESC
LIMIT 10;

-- Test analytics functions
SELECT * FROM get_daily_usage('your-client-id', 30);
SELECT * FROM get_weekly_evolution('your-client-id', 12);
SELECT * FROM get_monthly_summary('your-client-id', 2024, 10);
```

## Troubleshooting

### No Data Showing

1. Check if migration was run: `SELECT * FROM usage_logs LIMIT 1;`
2. Verify client_id matches: Check authenticated user's client_id
3. Check date range: Usage might be outside selected period
4. Verify tracking is integrated: Check API logs for tracking calls

### Incorrect Costs

1. Verify pricing in `calculateCost()` function
2. Check model names are correctly identified
3. Ensure token counts are accurate from API responses

### Performance Issues

1. Check indexes exist: `\d usage_logs` in psql
2. Review query performance: Enable query timing in Supabase
3. Consider reducing default period (30 → 7 days)

## Future Enhancements

Planned features:
- [ ] Export to CSV/PDF
- [ ] Custom date range picker
- [ ] Cost alerts and budgets
- [ ] Provider comparison by time period
- [ ] Real-time usage monitoring
- [ ] Usage forecasting

## Support

For issues or questions:
1. Check database migration completed successfully
2. Verify tracking functions are called in your code
3. Check API logs for usage tracking errors
4. Review Supabase logs for database errors

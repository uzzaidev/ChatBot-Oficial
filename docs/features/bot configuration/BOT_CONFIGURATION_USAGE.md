# Bot Configuration System - Usage Guide

## Overview

The Bot Configuration System allows clients to customize every aspect of their bot's behavior without requiring code changes or deployments. All configurations are stored in the database and can be managed through a user-friendly dashboard interface.

## Architecture

```
Dashboard UI (/dashboard/settings)
        ↓
API Endpoints (/api/config)
        ↓
Helper Functions (src/lib/config.ts)
        ↓
Database (bot_configurations table)
```

## Getting Started

### Prerequisites

1. **Database Migration Applied**
   ```bash
   supabase db push
   ```
   This creates the `bot_configurations` table with proper RLS policies.

2. **Default Configurations Seeded**
   ```bash
   psql "YOUR_CONNECTION_STRING" -f supabase/seeds/default_bot_configurations.sql
   ```
   This inserts ~20 default configurations covering all categories.

3. **Environment Variables Set**
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Service role key for server-side operations

### Verification

Run the test script to verify everything is working:

```bash
node scripts/test-bot-config.mjs
```

Expected output: All 7 tests should pass ✅

## Configuration Categories

### 1. Prompts (6 configurations)

System prompts used by AI agents:

| Key | Type | Description |
|-----|------|-------------|
| `continuity:greeting_for_new_customer` | string | First-time customer greeting |
| `continuity:greeting_for_returning_customer` | string | Returning customer greeting |
| `intent_classifier:prompt` | object | Intent classifier LLM prompt |
| `entity_extractor:prompt` | object | Entity extraction LLM prompt |
| `sentiment_analyzer:prompt` | object | Sentiment analysis LLM prompt |
| `personality:config` | object | Complete bot personality definition |

### 2. Rules (7 configurations)

Boolean flags and arrays controlling behavior:

| Key | Type | Description |
|-----|------|-------------|
| `intent_classifier:use_llm` | boolean | Use LLM vs regex for intent classification |
| `intent_classifier:intents` | array | List of supported intents |
| `repetition_detector:use_embeddings` | boolean | Use embeddings vs simple comparison |
| `rag:enabled` | boolean | Enable vector search |
| `batching:enabled` | boolean | Enable message batching |

### 3. Thresholds (7 configurations)

Numeric parameters controlling timing and limits:

| Key | Type | Description |
|-----|------|-------------|
| `continuity:new_conversation_threshold_hours` | number | Hours to consider new conversation |
| `repetition_detector:similarity_threshold` | number | Similarity threshold (0-1) |
| `repetition_detector:check_last_n_responses` | number | How many responses to compare |
| `rag:top_k_documents` | number | Documents to return from search |
| `rag:similarity_threshold` | number | Minimum similarity for results |
| `batching:delay_seconds` | number | Delay before processing batch |
| `chat_history:max_messages` | number | Max messages in context |

### 4. Personality (1 configuration)

Complex JSON defining bot personality:

```json
{
  "name": "Assistente do Luis Fernando Boff",
  "role": "Assistente Virtual Consultivo",
  "expertise": ["Energia Solar", "Data Science", "Full Stack"],
  "tone": "profissional, consultivo e empático",
  "style": {
    "emojis": false,
    "formality": "médio-alto",
    "sentence_length": "curta a média"
  },
  "response_rules": [
    "Nunca repetir mensagens anteriores",
    "Sempre usar histórico de conversa"
  ]
}
```

## Using the Dashboard UI

### Accessing the Dashboard

1. Navigate to `/dashboard/settings`
2. Scroll to the "Bot Configurations" section
3. Use tabs to switch between categories

### Viewing Configurations

- All configurations are listed in their respective category tabs
- **Default** configs show no badge
- **Custom** configs show a blue "Custom" badge
- Hover over the edit icon to modify
- Hover over the reset icon to restore defaults

### Editing a Configuration

1. Click the **Edit** icon (pencil) next to the configuration
2. Modify the value:
   - **Boolean**: Use dropdown (true/false)
   - **Number**: Use number input
   - **String**: Use text input or textarea (for long strings)
   - **JSON Object**: Use formatted textarea
3. Click the **Check** icon to save
4. Click the **X** icon to cancel

### Resetting to Default

1. Custom configurations show a **Reset** icon (circular arrow)
2. Click it to restore the default value
3. Confirm in the dialog
4. The customization is deleted, default value takes effect

## Using the API

### GET /api/config

List all configurations for the authenticated client.

```bash
# Get all configurations
curl http://localhost:3000/api/config

# Get configurations by category
curl http://localhost:3000/api/config?category=prompts
```

Response:
```json
{
  "configs": [
    {
      "id": "uuid",
      "client_id": "client-uuid",
      "config_key": "intent_classifier:use_llm",
      "config_value": true,
      "is_default": true,
      "description": "Use LLM for classification",
      "category": "rules",
      "created_at": "2025-11-07T...",
      "updated_at": "2025-11-07T..."
    }
  ],
  "count": 20,
  "clientId": "client-uuid"
}
```

### PUT /api/config

Update or create a configuration.

```bash
curl -X PUT http://localhost:3000/api/config \
  -H "Content-Type: application/json" \
  -d '{
    "config_key": "intent_classifier:use_llm",
    "config_value": false,
    "description": "Disable LLM",
    "category": "rules"
  }'
```

Response:
```json
{
  "success": true,
  "config_key": "intent_classifier:use_llm",
  "message": "Configuration intent_classifier:use_llm updated successfully"
}
```

### DELETE /api/config

Reset a configuration to its default value.

```bash
curl -X DELETE "http://localhost:3000/api/config?key=intent_classifier:use_llm"
```

Response:
```json
{
  "success": true,
  "config_key": "intent_classifier:use_llm",
  "message": "Configuration intent_classifier:use_llm reset to default"
}
```

## Using in Code

### Import Helper Functions

```typescript
import {
  getBotConfig,
  getBotConfigs,
  setBotConfig,
  resetBotConfig,
  listBotConfigs,
  clearBotConfigCache
} from '@/lib/config'
```

### Fetch a Single Configuration

```typescript
const clientId = 'your-client-uuid'

// Get a boolean flag
const useLLM = await getBotConfig(clientId, 'intent_classifier:use_llm')
console.log(useLLM) // true or false

// Get a number
const threshold = await getBotConfig(clientId, 'continuity:new_conversation_threshold_hours')
console.log(threshold) // 24

// Get a complex object
const prompt = await getBotConfig(clientId, 'intent_classifier:prompt')
console.log(prompt.system) // "Classifique a intenção..."
console.log(prompt.temperature) // 0.1
```

### Fetch Multiple Configurations (More Efficient)

```typescript
const configKeys = [
  'intent_classifier:use_llm',
  'intent_classifier:prompt',
  'continuity:new_conversation_threshold_hours'
]

const configs = await getBotConfigs(clientId, configKeys)

// Access values
const useLLM = configs.get('intent_classifier:use_llm')
const prompt = configs.get('intent_classifier:prompt')
const threshold = configs.get('continuity:new_conversation_threshold_hours')
```

### Update a Configuration

```typescript
// Set a boolean
await setBotConfig(clientId, 'intent_classifier:use_llm', false, {
  description: 'Temporarily disable LLM',
  category: 'rules'
})

// Set a number
await setBotConfig(clientId, 'continuity:new_conversation_threshold_hours', 48)

// Set a complex object
await setBotConfig(clientId, 'personality:config', {
  name: 'Custom Bot',
  role: 'Assistant',
  tone: 'friendly'
}, {
  category: 'personality'
})
```

### Reset to Default

```typescript
// Delete custom configuration, fall back to default
await resetBotConfig(clientId, 'intent_classifier:use_llm')
```

### List All Configurations

```typescript
// Get all configs for a client
const allConfigs = await listBotConfigs(clientId)

// Get configs by category
const promptConfigs = await listBotConfigs(clientId, 'prompts')
const ruleConfigs = await listBotConfigs(clientId, 'rules')
```

### Clear Cache

```typescript
// Force reload of configurations (useful after bulk updates)
clearBotConfigCache()
```

## Example: Using Configurations in a Node

```typescript
// src/nodes/classifyIntent.ts
import { getBotConfig } from '@/lib/config'
import { createGroqClient } from '@/lib/groq'

export const classifyIntent = async (
  clientId: string,
  message: string
): Promise<string> => {
  // 1. Check if we should use LLM
  const useLLM = await getBotConfig(clientId, 'intent_classifier:use_llm')
  
  if (!useLLM) {
    // Fallback to regex-based classification
    return classifyWithRegex(message)
  }

  // 2. Get the LLM prompt configuration
  const promptConfig = await getBotConfig(clientId, 'intent_classifier:prompt')
  
  // 3. Call LLM with configured prompt
  const groq = createGroqClient()
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: promptConfig.system },
      { role: 'user', content: message }
    ],
    temperature: promptConfig.temperature,
    max_tokens: promptConfig.max_tokens
  })

  return response.choices[0].message.content.trim()
}
```

## Performance Considerations

### Caching

- All configurations are cached in memory for 5 minutes
- Cache is automatically invalidated when configurations are updated
- First fetch from DB (~50ms), subsequent fetches from cache (~0ms)

### Batch Fetching

When you need multiple configurations, **always use batch fetching**:

```typescript
// ❌ BAD: Multiple individual queries
const useLLM = await getBotConfig(clientId, 'intent_classifier:use_llm')
const prompt = await getBotConfig(clientId, 'intent_classifier:prompt')
const threshold = await getBotConfig(clientId, 'continuity:new_conversation_threshold_hours')

// ✅ GOOD: Single batch query
const configs = await getBotConfigs(clientId, [
  'intent_classifier:use_llm',
  'intent_classifier:prompt',
  'continuity:new_conversation_threshold_hours'
])
```

### Database Indexes

The migration includes optimized indexes for:
- `(client_id, config_key)` - Primary lookup pattern
- `client_id` - Client-specific queries
- `config_key` - Default lookups
- `category` - Category filters
- `is_default` - Default-only queries

## Security (Row Level Security)

### What Clients Can Do

✅ View their own custom configurations
✅ View all default configurations
✅ Update their own custom configurations
✅ Create new custom configurations
✅ Delete their own custom configurations

### What Clients Cannot Do

❌ View other clients' configurations
❌ Edit default configurations (is_default=true)
❌ Delete default configurations
❌ Access configurations without authentication

### RLS Policies

```sql
-- Clients can view their configs + defaults
CREATE POLICY "Clients can view their own configurations and defaults"
  ON bot_configurations FOR SELECT
  USING (
    client_id IN (SELECT client_id FROM user_profiles WHERE id = auth.uid())
    OR is_default = true
  );

-- Clients can only update their own non-default configs
CREATE POLICY "Clients can update their own configurations"
  ON bot_configurations FOR UPDATE
  USING (
    client_id IN (SELECT client_id FROM user_profiles WHERE id = auth.uid())
    AND is_default = false
  );
```

## Troubleshooting

### Configuration Not Found

**Problem**: `getBotConfig` returns `null`

**Solutions**:
1. Verify migration is applied: `supabase db push`
2. Verify seed is loaded: Check database for default configs
3. Check config key spelling (case-sensitive)
4. Check client ID is correct

### Custom Config Not Taking Effect

**Problem**: Changes not reflected in API responses

**Solutions**:
1. Wait 5 minutes for cache to expire, or call `clearBotConfigCache()`
2. Verify `is_default=false` on custom config
3. Check RLS policies allow the operation
4. Verify client ID matches

### Cannot Edit Configuration in Dashboard

**Problem**: Edit button doesn't work or save fails

**Solutions**:
1. Check browser console for errors
2. Verify authentication is valid
3. Check network tab for API errors
4. Ensure Supabase connection is working

### Test Script Fails

**Problem**: `test-bot-config.mjs` reports failures

**Solutions**:
1. Verify `.env.local` has correct Supabase credentials
2. Apply migration: `supabase db push`
3. Load seed: `psql "CONNECTION" -f supabase/seeds/default_bot_configurations.sql`
4. Check `DEFAULT_CLIENT_ID` environment variable

## Best Practices

### 1. Always Use Configurations for Prompts

❌ **Bad**: Hardcoded prompt
```typescript
const systemPrompt = "Classifique a intenção da mensagem..."
```

✅ **Good**: Configuration-based prompt
```typescript
const promptConfig = await getBotConfig(clientId, 'intent_classifier:prompt')
const systemPrompt = promptConfig.system
```

### 2. Provide Sensible Defaults

All configurations should have sensible defaults in the seed file. Clients customize only when needed.

### 3. Document Configuration Changes

When creating new configurations:
1. Add to seed SQL with good defaults
2. Document in `docs/BOT_CONFIGURATION_INFRASTRUCTURE.md`
3. Add to dashboard UI if user-facing

### 4. Use Type-Safe Access

```typescript
// Define expected structure
interface IntentPromptConfig {
  system: string
  temperature: number
  max_tokens: number
}

const promptConfig = await getBotConfig(clientId, 'intent_classifier:prompt') as IntentPromptConfig
```

### 5. Handle Missing Configurations Gracefully

```typescript
const useLLM = await getBotConfig(clientId, 'intent_classifier:use_llm') ?? true // Default fallback
```

## Next Steps

1. **Implement Phase 1**: Use continuity configs in conversation flow
2. **Implement Phase 2**: Use intent classifier configs
3. **Implement Phase 3**: Use repetition detector configs
4. **Implement Phase 4**: Use personality config in main LLM
5. **Add Validation**: Validate configuration values before saving
6. **Add Export/Import**: Allow bulk config management
7. **Add History**: Track configuration changes over time

## Support

For questions or issues:
1. Check this guide first
2. Run the test script to diagnose
3. Check database logs
4. Review `docs/BOT_CONFIGURATION_INFRASTRUCTURE.md`

# 📊 Schema do Banco de Dados - Exportação Completa

**Exportado em:** 16/01/2026, 17:14:49

**Database:** postgres
**PostgreSQL:** PostgreSQL 17.6 on aarch64-unknown-linux-gnu
**Usuário:** postgres

---

## 📋 Tabelas (28)

### `Clientes WhatsApp_backup`

**Schema:** `public`

| Coluna | Tipo | Nullable | Default | PK |
|--------|------|----------|---------|----|
| `telefone` | `numeric` | ✅ | - |  |
| `nome` | `text` | ✅ | - |  |
| `status` | `text` | ✅ | - |  |
| `created_at` | `timestamp with time zone` | ✅ | - |  |

### `ai_models_registry`

**Schema:** `public`

| Coluna | Tipo | Nullable | Default | PK |
|--------|------|----------|---------|----|
| `id` | `uuid` | ❌ | gen_random_uuid() | 🔑 |
| `provider` | `text` | ❌ | - |  |
| `model_name` | `text` | ❌ | - |  |
| `gateway_identifier` | `text` | ❌ | - |  |
| `capabilities` | `jsonb` | ❌ | - |  |
| `context_window` | `integer` | ✅ | - |  |
| `max_output_tokens` | `integer` | ✅ | - |  |
| `input_price_per_million` | `numeric(10,6)` | ❌ | - |  |
| `output_price_per_million` | `numeric(10,6)` | ❌ | - |  |
| `cached_input_price_per_million` | `numeric(10,6)` | ✅ | - |  |
| `is_active` | `boolean` | ✅ | true |  |
| `description` | `text` | ✅ | - |  |
| `created_at` | `timestamp with time zone` | ✅ | now() |  |
| `updated_at` | `timestamp with time zone` | ✅ | now() |  |

### `audit_logs`

**Schema:** `public`

| Coluna | Tipo | Nullable | Default | PK |
|--------|------|----------|---------|----|
| `id` | `uuid` | ❌ | gen_random_uuid() | 🔑 |
| `created_at` | `timestamp with time zone` | ❌ | now() |  |
| `user_id` | `uuid` | ✅ | - |  |
| `user_email` | `text` | ✅ | - |  |
| `user_role` | `text` | ✅ | - |  |
| `client_id` | `uuid` | ✅ | - |  |
| `action` | `text` | ❌ | - |  |
| `resource_type` | `text` | ❌ | - |  |
| `resource_id` | `text` | ✅ | - |  |
| `endpoint` | `text` | ✅ | - |  |
| `method` | `text` | ✅ | - |  |
| `changes` | `jsonb` | ✅ | - |  |
| `metadata` | `jsonb` | ✅ | - |  |
| `status` | `text` | ❌ | 'success'::text |  |
| `error_message` | `text` | ✅ | - |  |
| `duration_ms` | `integer` | ✅ | - |  |

### `audit_logs_backup_poker_system`

**Schema:** `public`

| Coluna | Tipo | Nullable | Default | PK |
|--------|------|----------|---------|----|
| `id` | `uuid` | ❌ | gen_random_uuid() | 🔑 |
| `created_at` | `timestamp with time zone` | ❌ | now() |  |
| `user_id` | `uuid` | ✅ | - |  |
| `user_email` | `text` | ✅ | - |  |
| `user_role` | `text` | ✅ | - |  |
| `client_id` | `uuid` | ✅ | - |  |
| `action` | `text` | ❌ | - |  |
| `resource_type` | `text` | ❌ | - |  |
| `resource_id` | `text` | ✅ | - |  |
| `endpoint` | `text` | ✅ | - |  |
| `method` | `text` | ✅ | - |  |
| `changes` | `jsonb` | ✅ | - |  |
| `metadata` | `jsonb` | ✅ | - |  |
| `status` | `text` | ❌ | 'success'::text |  |
| `error_message` | `text` | ✅ | - |  |
| `duration_ms` | `integer` | ✅ | - |  |

### `bot_configurations`

**Schema:** `public`

| Coluna | Tipo | Nullable | Default | PK |
|--------|------|----------|---------|----|
| `id` | `uuid` | ❌ | gen_random_uuid() | 🔑 |
| `client_id` | `uuid` | ✅ | - |  |
| `config_key` | `text` | ❌ | - |  |
| `config_value` | `jsonb` | ❌ | - |  |
| `is_default` | `boolean` | ✅ | false |  |
| `description` | `text` | ✅ | - |  |
| `category` | `text` | ✅ | - |  |
| `created_at` | `timestamp with time zone` | ✅ | now() |  |
| `updated_at` | `timestamp with time zone` | ✅ | now() |  |

### `client_budgets`

**Schema:** `public`

| Coluna | Tipo | Nullable | Default | PK |
|--------|------|----------|---------|----|
| `id` | `uuid` | ❌ | gen_random_uuid() | 🔑 |
| `client_id` | `uuid` | ❌ | - |  |
| `budget_type` | `text` | ✅ | - |  |
| `budget_limit` | `numeric` | ✅ | - |  |
| `budget_period` | `text` | ❌ | - |  |
| `current_usage` | `numeric` | ✅ | 0 |  |
| `usage_percentage` | `numeric(5,2)` | ✅ | 0 |  |
| `last_reset_at` | `timestamp with time zone` | ✅ | now() |  |
| `next_reset_at` | `timestamp with time zone` | ✅ | - |  |
| `alert_threshold_80` | `boolean` | ✅ | true |  |
| `alert_threshold_90` | `boolean` | ✅ | true |  |
| `alert_threshold_100` | `boolean` | ✅ | true |  |
| `alert_80_sent` | `boolean` | ✅ | false |  |
| `alert_90_sent` | `boolean` | ✅ | false |  |
| `alert_100_sent` | `boolean` | ✅ | false |  |
| `pause_at_limit` | `boolean` | ✅ | false |  |
| `is_paused` | `boolean` | ✅ | false |  |
| `notification_email` | `text` | ✅ | - |  |
| `inherits_from_plan` | `boolean` | ✅ | true |  |
| `created_at` | `timestamp with time zone` | ✅ | now() |  |
| `updated_at` | `timestamp with time zone` | ✅ | now() |  |
| `budget_mode` | `text` | ✅ | 'brl'::text |  |
| `token_limit` | `bigint` | ✅ | 0 |  |
| `current_tokens` | `bigint` | ✅ | 0 |  |
| `token_usage_percentage` | `numeric(5,2)` | ✅ | 0 |  |
| `brl_limit` | `numeric(12,2)` | ✅ | 0 |  |
| `current_brl` | `numeric(12,2)` | ✅ | 0 |  |
| `brl_usage_percentage` | `numeric(5,2)` | ✅ | 0 |  |
| `pause_reason` | `text` | ✅ | - |  |

### `clientes_whatsapp`

**Schema:** `public`

| Coluna | Tipo | Nullable | Default | PK |
|--------|------|----------|---------|----|
| `telefone` | `numeric` | ❌ | - | 🔑 |
| `nome` | `text` | ✅ | - |  |
| `status` | `text` | ✅ | - |  |
| `created_at` | `timestamp with time zone` | ❌ | now() |  |
| `client_id` | `uuid` | ❌ | - | 🔑 |
| `transferred_at` | `timestamp with time zone` | ✅ | - |  |
| `transferred_by` | `uuid` | ✅ | - |  |
| `last_read_at` | `timestamp with time zone` | ✅ | - |  |
| `updated_at` | `timestamp with time zone` | ✅ | now() |  |
| `audio_preference` | `text` | ✅ | 'ask'::text |  |
| `last_audio_response_at` | `timestamp with time zone` | ✅ | - |  |

### `clients`

**Schema:** `public`

| Coluna | Tipo | Nullable | Default | PK |
|--------|------|----------|---------|----|
| `id` | `uuid` | ❌ | gen_random_uuid() | 🔑 |
| `name` | `text` | ❌ | - |  |
| `slug` | `text` | ❌ | - |  |
| `status` | `text` | ❌ | 'active'::text |  |
| `plan` | `text` | ❌ | 'free'::text |  |
| `meta_access_token_secret_id` | `uuid` | ❌ | - |  |
| `meta_verify_token_secret_id` | `uuid` | ❌ | - |  |
| `meta_phone_number_id` | `text` | ❌ | - |  |
| `meta_display_phone` | `text` | ✅ | - |  |
| `openai_api_key_secret_id` | `uuid` | ✅ | - |  |
| `openai_model` | `text` | ✅ | 'gpt-4o'::text |  |
| `groq_api_key_secret_id` | `uuid` | ✅ | - |  |
| `groq_model` | `text` | ✅ | 'llama-3.3-70b-versatile'::text |  |
| `system_prompt` | `text` | ❌ | - |  |
| `formatter_prompt` | `text` | ✅ | - |  |
| `settings` | `jsonb` | ✅ | '{"enable_rag": true, "max_tokens": 2000, "temperature": 0.7, "enable_tools": true, "max_chat_history": 15, "enable_human_handoff": true, "message_split_enabled": true, "batching_delay_seconds": 10}'::jsonb |  |
| `notification_email` | `text` | ✅ | - |  |
| `notification_webhook_url` | `text` | ✅ | - |  |
| `created_at` | `timestamp with time zone` | ✅ | now() |  |
| `updated_at` | `timestamp with time zone` | ✅ | now() |  |
| `created_by` | `uuid` | ✅ | - |  |
| `primary_model_provider` | `text` | ❌ | 'groq'::text |  |
| `meta_app_secret_secret_id` | `uuid` | ✅ | - |  |
| `tts_enabled` | `boolean` | ✅ | false |  |
| `tts_provider` | `text` | ✅ | 'openai'::text |  |
| `tts_voice` | `text` | ✅ | 'alloy'::text |  |
| `tts_speed` | `numeric` | ✅ | 1.0 |  |
| `tts_auto_offer` | `boolean` | ✅ | true |  |
| `tts_model` | `text` | ✅ | 'tts-1-hd'::text |  |
| `use_ai_gateway` | `boolean` | ✅ | false |  |
| `gateway_api_key_secret_id` | `uuid` | ✅ | - |  |
| `gateway_key_name` | `text` | ✅ | - |  |
| `whatsapp_business_account_id` | `text` | ✅ | - |  |
| `ai_keys_mode` | `text` | ❌ | 'platform_only'::text |  |

### `conversations`

**Schema:** `public`

| Coluna | Tipo | Nullable | Default | PK |
|--------|------|----------|---------|----|
| `id` | `uuid` | ❌ | gen_random_uuid() | 🔑 |
| `client_id` | `uuid` | ✅ | - |  |
| `phone` | `text` | ❌ | - |  |
| `name` | `text` | ✅ | - |  |
| `status` | `text` | ✅ | 'bot'::text |  |
| `assigned_to` | `text` | ✅ | - |  |
| `last_message` | `text` | ✅ | - |  |
| `last_update` | `timestamp with time zone` | ✅ | now() |  |
| `created_at` | `timestamp with time zone` | ✅ | now() |  |
| `last_read_at` | `timestamp with time zone` | ✅ | - |  |

### `documents`

**Schema:** `public`

| Coluna | Tipo | Nullable | Default | PK |
|--------|------|----------|---------|----|
| `id` | `bigint` | ❌ | nextval('documents_id_seq'::regclass) | 🔑 |
| `content` | `text` | ✅ | - |  |
| `metadata` | `jsonb` | ✅ | - |  |
| `embedding` | `vector(1536)` | ✅ | - |  |
| `client_id` | `uuid` | ❌ | - |  |
| `original_file_url` | `text` | ✅ | - |  |
| `original_file_path` | `text` | ✅ | - |  |
| `original_file_size` | `integer` | ✅ | - |  |
| `original_mime_type` | `text` | ✅ | - |  |

### `execution_logs`

**Schema:** `public`

| Coluna | Tipo | Nullable | Default | PK |
|--------|------|----------|---------|----|
| `id` | `bigint` | ❌ | nextval('execution_logs_id_seq'::regclass) | 🔑 |
| `execution_id` | `uuid` | ❌ | - |  |
| `node_name` | `text` | ❌ | - |  |
| `input_data` | `jsonb` | ✅ | - |  |
| `output_data` | `jsonb` | ✅ | - |  |
| `error` | `jsonb` | ✅ | - |  |
| `status` | `text` | ❌ | - |  |
| `duration_ms` | `integer` | ✅ | - |  |
| `timestamp` | `timestamp with time zone` | ❌ | now() |  |
| `metadata` | `jsonb` | ✅ | - |  |
| `created_at` | `timestamp with time zone` | ❌ | now() |  |
| `client_id` | `uuid` | ✅ | - |  |

### `flow_executions`

**Schema:** `public`

| Coluna | Tipo | Nullable | Default | PK |
|--------|------|----------|---------|----|
| `id` | `uuid` | ❌ | gen_random_uuid() | 🔑 |
| `flow_id` | `uuid` | ❌ | - |  |
| `client_id` | `uuid` | ❌ | - |  |
| `phone` | `text` | ❌ | - |  |
| `current_block_id` | `text` | ❌ | - |  |
| `variables` | `jsonb` | ✅ | '{}'::jsonb |  |
| `history` | `jsonb` | ✅ | '[]'::jsonb |  |
| `status` | `text` | ❌ | 'active'::text |  |
| `started_at` | `timestamp with time zone` | ❌ | now() |  |
| `last_step_at` | `timestamp with time zone` | ❌ | now() |  |
| `completed_at` | `timestamp with time zone` | ✅ | - |  |

### `gateway_cache_performance`

**Schema:** `public`

| Coluna | Tipo | Nullable | Default | PK |
|--------|------|----------|---------|----|
| `id` | `uuid` | ❌ | gen_random_uuid() | 🔑 |
| `client_id` | `uuid` | ❌ | - |  |
| `date` | `date` | ❌ | - |  |
| `hour` | `integer` | ✅ | - |  |
| `total_requests` | `integer` | ❌ | 0 |  |
| `cache_hits` | `integer` | ❌ | 0 |  |
| `cache_misses` | `integer` | ❌ | 0 |  |
| `cache_hit_rate` | `numeric(5,2)` | ✅ | - |  |
| `tokens_saved` | `integer` | ❌ | 0 |  |
| `cost_saved_usd` | `numeric(10,4)` | ✅ | - |  |
| `cost_saved_brl` | `numeric(10,2)` | ✅ | - |  |
| `avg_latency_cached_ms` | `integer` | ✅ | - |  |
| `avg_latency_uncached_ms` | `integer` | ✅ | - |  |
| `latency_improvement_pct` | `numeric(5,2)` | ✅ | - |  |
| `created_at` | `timestamp with time zone` | ✅ | now() |  |
| `updated_at` | `timestamp with time zone` | ✅ | now() |  |

### `gateway_usage_logs`

**Schema:** `public`

| Coluna | Tipo | Nullable | Default | PK |
|--------|------|----------|---------|----|
| `id` | `uuid` | ❌ | gen_random_uuid() | 🔑 |
| `client_id` | `uuid` | ❌ | - |  |
| `conversation_id` | `uuid` | ✅ | - |  |
| `phone` | `text` | ✅ | - |  |
| `request_id` | `text` | ✅ | - |  |
| `model_registry_id` | `uuid` | ✅ | - |  |
| `provider` | `text` | ❌ | - |  |
| `model_name` | `text` | ❌ | - |  |
| `input_tokens` | `integer` | ❌ | 0 |  |
| `output_tokens` | `integer` | ❌ | 0 |  |
| `cached_tokens` | `integer` | ✅ | 0 |  |
| `total_tokens` | `integer` | ❌ | 0 |  |
| `latency_ms` | `integer` | ✅ | - |  |
| `was_cached` | `boolean` | ✅ | false |  |
| `was_fallback` | `boolean` | ✅ | false |  |
| `fallback_reason` | `text` | ✅ | - |  |
| `cost_usd` | `numeric(12,8)` | ✅ | - |  |
| `cost_brl` | `numeric(12,2)` | ✅ | - |  |
| `usd_to_brl_rate` | `numeric(8,4)` | ✅ | - |  |
| `metadata` | `jsonb` | ✅ | '{}'::jsonb |  |
| `error_details` | `jsonb` | ✅ | - |  |
| `created_at` | `timestamp with time zone` | ✅ | now() |  |
| `api_type` | `text` | ✅ | 'chat'::text |  |
| `input_units` | `integer` | ✅ | 0 |  |
| `output_units` | `integer` | ✅ | 0 |  |

### `interactive_flows`

**Schema:** `public`

| Coluna | Tipo | Nullable | Default | PK |
|--------|------|----------|---------|----|
| `id` | `uuid` | ❌ | gen_random_uuid() | 🔑 |
| `client_id` | `uuid` | ❌ | - |  |
| `name` | `text` | ❌ | - |  |
| `description` | `text` | ✅ | - |  |
| `is_active` | `boolean` | ✅ | true |  |
| `trigger_type` | `text` | ❌ | - |  |
| `trigger_keywords` | `text[]` | ✅ | - |  |
| `trigger_qr_code` | `text` | ✅ | - |  |
| `blocks` | `jsonb` | ❌ | '[]'::jsonb |  |
| `edges` | `jsonb` | ❌ | '[]'::jsonb |  |
| `start_block_id` | `text` | ❌ | - |  |
| `created_by` | `uuid` | ✅ | - |  |
| `created_at` | `timestamp with time zone` | ❌ | now() |  |
| `updated_at` | `timestamp with time zone` | ❌ | now() |  |

### `message_templates`

**Schema:** `public`

| Coluna | Tipo | Nullable | Default | PK |
|--------|------|----------|---------|----|
| `id` | `uuid` | ❌ | gen_random_uuid() | 🔑 |
| `client_id` | `uuid` | ❌ | - |  |
| `created_by` | `uuid` | ✅ | - |  |
| `meta_template_id` | `text` | ✅ | - |  |
| `waba_id` | `text` | ❌ | - |  |
| `name` | `text` | ❌ | - |  |
| `category` | `text` | ❌ | - |  |
| `language` | `text` | ❌ | 'pt_BR'::text |  |
| `components` | `jsonb` | ❌ | - |  |
| `status` | `text` | ❌ | 'DRAFT'::text |  |
| `rejection_reason` | `text` | ✅ | - |  |
| `created_at` | `timestamp with time zone` | ❌ | now() |  |
| `updated_at` | `timestamp with time zone` | ❌ | now() |  |

### `messages`

**Schema:** `public`

| Coluna | Tipo | Nullable | Default | PK |
|--------|------|----------|---------|----|
| `id` | `uuid` | ❌ | gen_random_uuid() | 🔑 |
| `client_id` | `uuid` | ✅ | - |  |
| `conversation_id` | `uuid` | ✅ | - |  |
| `phone` | `text` | ❌ | - |  |
| `name` | `text` | ✅ | - |  |
| `content` | `text` | ❌ | - |  |
| `type` | `text` | ✅ | 'text'::text |  |
| `direction` | `text` | ❌ | - |  |
| `status` | `text` | ✅ | 'sent'::text |  |
| `timestamp` | `timestamp with time zone` | ✅ | now() |  |
| `metadata` | `jsonb` | ✅ | - |  |
| `media_id` | `text` | ✅ | - |  |
| `media_url` | `text` | ✅ | - |  |
| `media_type` | `text` | ✅ | - |  |
| `transcription` | `text` | ✅ | - |  |
| `audio_duration_seconds` | `integer` | ✅ | - |  |
| `error_details` | `jsonb` | ✅ | - |  |

### `n8n_chat_histories`

**Schema:** `public`

| Coluna | Tipo | Nullable | Default | PK |
|--------|------|----------|---------|----|
| `id` | `integer` | ❌ | nextval('n8n_chat_histories_id_seq'::regclass) | 🔑 |
| `session_id` | `character varying(255)` | ❌ | - |  |
| `message` | `jsonb` | ❌ | - |  |
| `created_at` | `timestamp with time zone` | ✅ | (now() AT TIME ZONE 'utc -3'::text) |  |
| `client_id` | `uuid` | ❌ | - |  |
| `media_metadata` | `jsonb` | ✅ | - |  |
| `last_read_at` | `timestamp with time zone` | ✅ | - |  |
| `wamid` | `character varying(255)` | ✅ | - |  |
| `transcription` | `text` | ✅ | - |  |
| `audio_duration_seconds` | `integer` | ✅ | - |  |
| `status` | `text` | ✅ | 'pending'::text |  |
| `error_details` | `jsonb` | ✅ | - |  |
| `updated_at` | `timestamp with time zone` | ✅ | now() |  |

### `plan_budgets`

**Schema:** `public`

| Coluna | Tipo | Nullable | Default | PK |
|--------|------|----------|---------|----|
| `id` | `uuid` | ❌ | gen_random_uuid() | 🔑 |
| `plan_name` | `text` | ❌ | - |  |
| `budget_type` | `text` | ❌ | - |  |
| `budget_limit` | `numeric` | ❌ | - |  |
| `budget_period` | `text` | ❌ | - |  |
| `alert_threshold_80` | `boolean` | ✅ | true |  |
| `alert_threshold_90` | `boolean` | ✅ | true |  |
| `alert_threshold_100` | `boolean` | ✅ | true |  |
| `pause_at_limit` | `boolean` | ✅ | false |  |
| `notification_email` | `text` | ✅ | - |  |
| `created_at` | `timestamp with time zone` | ✅ | now() |  |
| `updated_at` | `timestamp with time zone` | ✅ | now() |  |

### `pricing_config`

**Schema:** `public`

| Coluna | Tipo | Nullable | Default | PK |
|--------|------|----------|---------|----|
| `id` | `uuid` | ❌ | gen_random_uuid() | 🔑 |
| `client_id` | `uuid` | ❌ | - |  |
| `provider` | `text` | ❌ | - |  |
| `model` | `text` | ❌ | - |  |
| `prompt_price` | `numeric(10,8)` | ❌ | 0 |  |
| `completion_price` | `numeric(10,8)` | ❌ | 0 |  |
| `unit` | `text` | ✅ | 'per_1k_tokens'::text |  |
| `created_at` | `timestamp with time zone` | ✅ | now() |  |
| `updated_at` | `timestamp with time zone` | ✅ | now() |  |
| `is_gateway_pricing` | `boolean` | ✅ | false |  |
| `cached_input_price` | `numeric(12,6)` | ✅ | - |  |
| `price_per_million_tokens` | `numeric(12,6)` | ✅ | - |  |
| `currency` | `text` | ✅ | 'USD'::text |  |

### `push_tokens`

**Schema:** `public`

| Coluna | Tipo | Nullable | Default | PK |
|--------|------|----------|---------|----|
| `id` | `uuid` | ❌ | gen_random_uuid() | 🔑 |
| `user_id` | `uuid` | ❌ | - |  |
| `token` | `text` | ❌ | - |  |
| `platform` | `text` | ❌ | - |  |
| `created_at` | `timestamp with time zone` | ✅ | now() |  |
| `updated_at` | `timestamp with time zone` | ✅ | now() |  |

### `shared_gateway_config`

**Schema:** `public`

| Coluna | Tipo | Nullable | Default | PK |
|--------|------|----------|---------|----|
| `id` | `uuid` | ❌ | gen_random_uuid() | 🔑 |
| `gateway_api_key_secret_id` | `uuid` | ✅ | - |  |
| `openai_api_key_secret_id` | `uuid` | ✅ | - |  |
| `groq_api_key_secret_id` | `uuid` | ✅ | - |  |
| `anthropic_api_key_secret_id` | `uuid` | ✅ | - |  |
| `google_api_key_secret_id` | `uuid` | ✅ | - |  |
| `cache_enabled` | `boolean` | ✅ | true |  |
| `cache_ttl_seconds` | `integer` | ✅ | 3600 |  |
| `default_fallback_chain` | `jsonb` | ✅ | '[]'::jsonb |  |
| `max_requests_per_minute` | `integer` | ✅ | 1000 |  |
| `max_tokens_per_minute` | `integer` | ✅ | 500000 |  |
| `created_at` | `timestamp with time zone` | ✅ | now() |  |
| `updated_at` | `timestamp with time zone` | ✅ | now() |  |

### `tts_cache`

**Schema:** `public`

| Coluna | Tipo | Nullable | Default | PK |
|--------|------|----------|---------|----|
| `id` | `uuid` | ❌ | gen_random_uuid() | 🔑 |
| `client_id` | `uuid` | ❌ | - |  |
| `text_hash` | `text` | ❌ | - |  |
| `audio_url` | `text` | ❌ | - |  |
| `media_id` | `text` | ✅ | - |  |
| `provider` | `text` | ❌ | - |  |
| `voice` | `text` | ❌ | - |  |
| `duration_seconds` | `integer` | ✅ | - |  |
| `file_size_bytes` | `integer` | ✅ | - |  |
| `created_at` | `timestamp with time zone` | ✅ | now() |  |
| `expires_at` | `timestamp with time zone` | ✅ | (now() + '7 days'::interval) |  |
| `hit_count` | `integer` | ✅ | 0 |  |

### `tts_usage_logs`

**Schema:** `public`

| Coluna | Tipo | Nullable | Default | PK |
|--------|------|----------|---------|----|
| `id` | `uuid` | ❌ | gen_random_uuid() | 🔑 |
| `client_id` | `uuid` | ❌ | - |  |
| `phone` | `text` | ❌ | - |  |
| `event_type` | `text` | ❌ | - |  |
| `text_length` | `integer` | ❌ | - |  |
| `from_cache` | `boolean` | ✅ | false |  |
| `error_message` | `text` | ✅ | - |  |
| `created_at` | `timestamp with time zone` | ✅ | now() |  |

### `usage_logs`

**Schema:** `public`

| Coluna | Tipo | Nullable | Default | PK |
|--------|------|----------|---------|----|
| `id` | `uuid` | ❌ | gen_random_uuid() | 🔑 |
| `client_id` | `uuid` | ✅ | - |  |
| `conversation_id` | `uuid` | ✅ | - |  |
| `phone` | `text` | ❌ | - |  |
| `source` | `text` | ❌ | - |  |
| `model` | `text` | ✅ | - |  |
| `prompt_tokens` | `integer` | ✅ | 0 |  |
| `completion_tokens` | `integer` | ✅ | 0 |  |
| `total_tokens` | `integer` | ✅ | 0 |  |
| `cost_usd` | `numeric(10,6)` | ✅ | 0 |  |
| `messages_sent` | `integer` | ✅ | 0 |  |
| `metadata` | `jsonb` | ✅ | - |  |
| `created_at` | `timestamp with time zone` | ✅ | now() |  |

### `user_invites`

**Schema:** `public`

| Coluna | Tipo | Nullable | Default | PK |
|--------|------|----------|---------|----|
| `id` | `uuid` | ❌ | gen_random_uuid() | 🔑 |
| `client_id` | `uuid` | ❌ | - |  |
| `invited_by_user_id` | `uuid` | ❌ | - |  |
| `email` | `text` | ❌ | - |  |
| `role` | `text` | ❌ | - |  |
| `invite_token` | `text` | ❌ | - |  |
| `status` | `text` | ❌ | 'pending'::text |  |
| `expires_at` | `timestamp with time zone` | ❌ | (now() + '7 days'::interval) |  |
| `accepted_at` | `timestamp with time zone` | ✅ | - |  |
| `created_at` | `timestamp with time zone` | ❌ | now() |  |
| `updated_at` | `timestamp with time zone` | ❌ | now() |  |

### `user_profiles`

**Schema:** `public`

| Coluna | Tipo | Nullable | Default | PK |
|--------|------|----------|---------|----|
| `id` | `uuid` | ❌ | - | 🔑 |
| `client_id` | `uuid` | ❌ | - |  |
| `email` | `text` | ❌ | - |  |
| `full_name` | `text` | ✅ | - |  |
| `created_at` | `timestamp with time zone` | ❌ | now() |  |
| `updated_at` | `timestamp with time zone` | ❌ | now() |  |
| `role` | `text` | ❌ | 'user'::text |  |
| `permissions` | `jsonb` | ✅ | '{}'::jsonb |  |
| `is_active` | `boolean` | ✅ | true |  |
| `phone` | `text` | ✅ | - |  |

### `webhook_dedup`

**Schema:** `public`

| Coluna | Tipo | Nullable | Default | PK |
|--------|------|----------|---------|----|
| `id` | `uuid` | ❌ | gen_random_uuid() | 🔑 |
| `dedup_key` | `text` | ❌ | - |  |
| `client_id` | `uuid` | ❌ | - |  |
| `message_id` | `text` | ❌ | - |  |
| `processed_at` | `timestamp with time zone` | ❌ | now() |  |
| `webhook_payload` | `jsonb` | ✅ | - |  |

## 🔒 Políticas RLS (79)

### `ai_models_registry`

- **Admins can manage models registry** (ALL)
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'::text))))`

- **Anyone can view active models** (SELECT)
  - Using: `(is_active = true)`

### `audit_logs`

- **Service role has full access to audit logs** (ALL)
  - Using: `true`
  - With Check: `true`

- **Users can view own audit logs** (SELECT)
  - Using: `(user_id = auth.uid())`

- **Users can view own client audit logs** (SELECT)
  - Using: `(client_id IN ( SELECT user_profiles.client_id
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())))`

### `audit_logs_backup_poker_system`

- **Service role has full access to audit logs** (ALL)
  - Using: `true`
  - With Check: `true`

- **Users can view own audit logs** (SELECT)
  - Using: `(user_id = auth.uid())`

- **Users can view own client audit logs** (SELECT)
  - Using: `(client_id IN ( SELECT user_profiles.client_id
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())))`

### `bot_configurations`

- **Clients can delete their own configurations** (DELETE)
  - Using: `((client_id IN ( SELECT user_profiles.client_id
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid()))) AND (is_default = false))`

- **Clients can insert their own configurations** (INSERT)
  - With Check: `((client_id IN ( SELECT user_profiles.client_id
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid()))) AND (is_default = false))`

- **Clients can update their own configurations** (UPDATE)
  - Using: `((client_id IN ( SELECT user_profiles.client_id
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid()))) AND (is_default = false))`

- **Clients can view their own configurations and defaults** (SELECT)
  - Using: `((client_id IN ( SELECT user_profiles.client_id
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid()))) OR (is_default = true))`

### `client_budgets`

- **Admins can manage all client budgets** (ALL)
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'::text))))`

- **Admins can view all client budgets** (SELECT)
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'::text))))`

- **Clients can view own budget** (SELECT)
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.client_id = client_budgets.client_id))))`

- **System can update client budgets** (UPDATE)
  - Using: `true`

### `clientes_whatsapp`

- **Service role can access all whatsapp contacts** (ALL)
  - Using: `(auth.role() = 'service_role'::text)`

- **Users can delete own client whatsapp contacts** (DELETE)
  - Using: `(client_id = user_client_id())`

- **Users can insert own client whatsapp contacts** (INSERT)
  - With Check: `(client_id = user_client_id())`

- **Users can update own client whatsapp contacts** (UPDATE)
  - Using: `(client_id = user_client_id())`
  - With Check: `(client_id = user_client_id())`

- **Users can view own client whatsapp contacts** (SELECT)
  - Using: `(client_id = user_client_id())`

- **realtime_select_clientes_whatsapp** (SELECT)
  - Using: `true`

### `conversations`

- **Service role can access all conversations** (ALL)
  - Using: `(auth.role() = 'service_role'::text)`

### `documents`

- **Service role can access all documents** (ALL)
  - Using: `(auth.role() = 'service_role'::text)`

- **Users can delete own client documents** (DELETE)
  - Using: `(((metadata ->> 'client_id'::text) = (user_client_id())::text) OR (client_id = user_client_id()))`

- **Users can insert own client documents** (INSERT)
  - With Check: `(((metadata ->> 'client_id'::text) = (user_client_id())::text) OR (client_id = user_client_id()))`

- **Users can update own client documents** (UPDATE)
  - Using: `(((metadata ->> 'client_id'::text) = (user_client_id())::text) OR (client_id = user_client_id()))`
  - With Check: `(((metadata ->> 'client_id'::text) = (user_client_id())::text) OR (client_id = user_client_id()))`

- **Users can view own client documents** (SELECT)
  - Using: `(((metadata ->> 'client_id'::text) = (user_client_id())::text) OR (client_id = user_client_id()))`

### `execution_logs`

- **Service role can insert execution logs** (INSERT)
  - With Check: `true`

- **Service role can view all execution logs** (SELECT)
  - Using: `true`

- **Users can view own client execution logs** (SELECT)
  - Using: `(client_id IN ( SELECT user_profiles.client_id
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())))`

### `flow_executions`

- **Service role can manage all executions** (ALL)
  - Using: `true`
  - With Check: `true`

- **Users can view their client's executions** (SELECT)
  - Using: `(client_id IN ( SELECT user_profiles.client_id
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())))`

### `gateway_cache_performance`

- **Admins can view all cache performance** (SELECT)
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'::text))))`

- **Clients can view own cache performance** (SELECT)
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.client_id = gateway_cache_performance.client_id))))`

- **System can manage cache performance** (ALL)
  - With Check: `true`

### `gateway_usage_logs`

- **Admins can view all usage logs** (SELECT)
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'::text))))`

- **Clients can view own usage logs** (SELECT)
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.client_id = gateway_usage_logs.client_id))))`

- **System can insert usage logs** (INSERT)
  - With Check: `true`

### `interactive_flows`

- **Users can create flows for their client** (INSERT)
  - With Check: `(client_id IN ( SELECT user_profiles.client_id
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())))`

- **Users can delete their client's flows** (DELETE)
  - Using: `(client_id IN ( SELECT user_profiles.client_id
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())))`

- **Users can update their client's flows** (UPDATE)
  - Using: `(client_id IN ( SELECT user_profiles.client_id
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())))`
  - With Check: `(client_id IN ( SELECT user_profiles.client_id
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())))`

- **Users can view their client's flows** (SELECT)
  - Using: `(client_id IN ( SELECT user_profiles.client_id
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())))`

### `message_templates`

- **Client admins can create templates** (INSERT)
  - With Check: `(client_id IN ( SELECT user_profiles.client_id
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['admin'::text, 'client_admin'::text])))))`

- **Client admins can delete draft templates** (DELETE)
  - Using: `((status = 'DRAFT'::text) AND (client_id IN ( SELECT user_profiles.client_id
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['admin'::text, 'client_admin'::text]))))))`

- **Client admins can update templates** (UPDATE)
  - Using: `(client_id IN ( SELECT user_profiles.client_id
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['admin'::text, 'client_admin'::text])))))`
  - With Check: `(client_id IN ( SELECT user_profiles.client_id
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['admin'::text, 'client_admin'::text])))))`

- **Users can view own client templates** (SELECT)
  - Using: `(client_id IN ( SELECT user_profiles.client_id
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())))`

### `messages`

- **Service role can access all messages** (ALL)
  - Using: `(auth.role() = 'service_role'::text)`

- **Users can view own client messages** (SELECT)
  - Using: `(client_id IN ( SELECT user_profiles.client_id
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())))`

### `n8n_chat_histories`

- **realtime_select_n8n_chat_histories** (SELECT)
  - Using: `true`

### `plan_budgets`

- **Admins can manage plan budgets** (ALL)
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'::text))))`

- **Anyone can view plan budgets** (SELECT)
  - Using: `true`

### `pricing_config`

- **Users can delete own client pricing config** (DELETE)
  - Using: `(client_id IN ( SELECT user_profiles.client_id
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())))`

- **Users can insert own client pricing config** (INSERT)
  - With Check: `(client_id IN ( SELECT user_profiles.client_id
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())))`

- **Users can update own client pricing config** (UPDATE)
  - Using: `(client_id IN ( SELECT user_profiles.client_id
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())))`

- **Users can view own client pricing config** (SELECT)
  - Using: `(client_id IN ( SELECT user_profiles.client_id
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())))`

### `push_tokens`

- **Users can insert own tokens** (INSERT)
  - With Check: `(auth.uid() = user_id)`

- **Users can read own tokens** (SELECT)
  - Using: `(auth.uid() = user_id)`

- **Users can update own tokens** (UPDATE)
  - Using: `(auth.uid() = user_id)`

### `shared_gateway_config`

- **Admins can manage shared gateway config** (ALL)
  - Using: `(EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'::text))))`

- **Anyone authenticated can view shared config** (SELECT)
  - Using: `(auth.role() = 'authenticated'::text)`

### `tts_cache`

- **Service role can access all TTS cache** (ALL)
  - Using: `(auth.role() = 'service_role'::text)`

### `tts_usage_logs`

- **Service role can insert TTS usage logs** (INSERT)
  - With Check: `(auth.role() = 'service_role'::text)`

- **Users can view own client TTS usage logs** (SELECT)
  - Using: `(client_id IN ( SELECT user_profiles.client_id
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())))`

### `usage_logs`

- **Service role can access all usage logs** (ALL)
  - Using: `(auth.role() = 'service_role'::text)`

### `user_invites`

- **Client admins can create invites** (INSERT)
  - With Check: `((client_id = get_current_user_client_id()) AND user_is_admin())`

- **Client admins can delete invites** (DELETE)
  - Using: `((client_id = get_current_user_client_id()) AND user_is_admin())`

- **Client admins can update invites** (UPDATE)
  - Using: `((client_id = get_current_user_client_id()) AND user_is_admin())`

- **Client admins can view invites** (SELECT)
  - Using: `((client_id = get_current_user_client_id()) AND user_is_admin())`

- **Users can view own invite by email** (SELECT)
  - Using: `(email = (( SELECT users.email
   FROM auth.users
  WHERE (users.id = auth.uid())))::text)`

### `user_profiles`

- **Client admins can create users** (INSERT)
  - With Check: `((client_id = get_current_user_client_id()) AND user_is_admin() AND (role <> 'admin'::text))`

- **Client admins can deactivate users** (UPDATE)
  - Using: `((client_id = get_current_user_client_id()) AND user_is_admin() AND (id <> auth.uid()))`

- **Client admins can update team members** (UPDATE)
  - Using: `((client_id = get_current_user_client_id()) AND user_is_admin() AND (id <> auth.uid()))`
  - With Check: `((client_id = get_current_user_client_id()) AND (role <> 'admin'::text))`

- **Client admins can view team members** (SELECT)
  - Using: `((client_id = get_current_user_client_id()) AND user_is_admin())`

- **Super admins have full access** (ALL)
  - Using: `user_has_role('admin'::text)`
  - With Check: `user_has_role('admin'::text)`

- **Users can update own profile** (UPDATE)
  - Using: `(id = auth.uid())`
  - With Check: `((id = auth.uid()) AND (role = ( SELECT user_profiles_1.role
   FROM user_profiles user_profiles_1
  WHERE (user_profiles_1.id = auth.uid()))))`

- **Users can view own profile** (SELECT)
  - Using: `(id = auth.uid())`

### `webhook_dedup`

- **Service role has full access to webhook_dedup** (ALL)
  - Using: `true`
  - With Check: `true`

- **Users can view own client dedup records** (SELECT)
  - Using: `(client_id IN ( SELECT user_profiles.client_id
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())))`

## ⚡ Triggers (19)

### `Clientes WhatsApp.clientes_whatsapp_view_insert_trigger`

```sql
CREATE TRIGGER clientes_whatsapp_view_insert_trigger INSTEAD OF INSERT ON "Clientes WhatsApp" FOR EACH ROW EXECUTE FUNCTION clientes_whatsapp_view_insert()
```

### `Clientes WhatsApp.clientes_whatsapp_view_update_trigger`

```sql
CREATE TRIGGER clientes_whatsapp_view_update_trigger INSTEAD OF UPDATE ON "Clientes WhatsApp" FOR EACH ROW EXECUTE FUNCTION clientes_whatsapp_view_update()
```

### `ai_models_registry.ai_models_registry_updated_at`

```sql
CREATE TRIGGER ai_models_registry_updated_at BEFORE UPDATE ON ai_models_registry FOR EACH ROW EXECUTE FUNCTION update_gateway_configurations_updated_at()
```

### `bot_configurations.trigger_update_bot_configurations_updated_at`

```sql
CREATE TRIGGER trigger_update_bot_configurations_updated_at BEFORE UPDATE ON bot_configurations FOR EACH ROW EXECUTE FUNCTION update_bot_configurations_updated_at()
```

### `client_budgets.client_budgets_calculate_modular_percentages`

```sql
CREATE TRIGGER client_budgets_calculate_modular_percentages BEFORE INSERT OR UPDATE OF current_tokens, token_limit, current_brl, brl_limit ON client_budgets FOR EACH ROW EXECUTE FUNCTION calculate_modular_budget_percentages()
```

### `client_budgets.client_budgets_calculate_next_reset`

```sql
CREATE TRIGGER client_budgets_calculate_next_reset BEFORE INSERT OR UPDATE OF budget_period, last_reset_at ON client_budgets FOR EACH ROW EXECUTE FUNCTION calculate_next_reset()
```

### `client_budgets.client_budgets_updated_at`

```sql
CREATE TRIGGER client_budgets_updated_at BEFORE UPDATE ON client_budgets FOR EACH ROW EXECUTE FUNCTION update_plan_budgets_updated_at()
```

### `clientes_whatsapp.broadcast_conversation_trigger`

```sql
CREATE TRIGGER broadcast_conversation_trigger AFTER INSERT OR DELETE OR UPDATE ON clientes_whatsapp FOR EACH ROW EXECUTE FUNCTION broadcast_conversation_change()
```

### `clientes_whatsapp.trigger_update_clientes_whatsapp_updated_at`

```sql
CREATE TRIGGER trigger_update_clientes_whatsapp_updated_at BEFORE UPDATE ON clientes_whatsapp FOR EACH ROW EXECUTE FUNCTION update_clientes_whatsapp_updated_at()
```

### `clients.update_clients_updated_at`

```sql
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### `gateway_cache_performance.gateway_cache_performance_updated_at`

```sql
CREATE TRIGGER gateway_cache_performance_updated_at BEFORE UPDATE ON gateway_cache_performance FOR EACH ROW EXECUTE FUNCTION update_gateway_configurations_updated_at()
```

### `interactive_flows.update_interactive_flows_updated_at_trigger`

```sql
CREATE TRIGGER update_interactive_flows_updated_at_trigger BEFORE UPDATE ON interactive_flows FOR EACH ROW EXECUTE FUNCTION update_interactive_flows_updated_at()
```

### `message_templates.update_templates_updated_at`

```sql
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON message_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### `n8n_chat_histories.broadcast_message_trigger`

```sql
CREATE TRIGGER broadcast_message_trigger AFTER INSERT OR DELETE OR UPDATE ON n8n_chat_histories FOR EACH ROW EXECUTE FUNCTION broadcast_message_change()
```

### `plan_budgets.plan_budgets_updated_at`

```sql
CREATE TRIGGER plan_budgets_updated_at BEFORE UPDATE ON plan_budgets FOR EACH ROW EXECUTE FUNCTION update_plan_budgets_updated_at()
```

### `pricing_config.pricing_config_updated_at`

```sql
CREATE TRIGGER pricing_config_updated_at BEFORE UPDATE ON pricing_config FOR EACH ROW EXECUTE FUNCTION update_pricing_config_timestamp()
```

### `shared_gateway_config.shared_gateway_config_updated_at`

```sql
CREATE TRIGGER shared_gateway_config_updated_at BEFORE UPDATE ON shared_gateway_config FOR EACH ROW EXECUTE FUNCTION update_shared_gateway_config_updated_at()
```

### `user_invites.update_user_invites_updated_at`

```sql
CREATE TRIGGER update_user_invites_updated_at BEFORE UPDATE ON user_invites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

### `user_profiles.update_user_profiles_updated_at`

```sql
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

## 🔧 Funções (202)

### `array_to_halfvec`

**Argumentos:** `numeric[], integer, boolean`
**Retorno:** `halfvec`

```sql
CREATE OR REPLACE FUNCTION public.array_to_halfvec(numeric[], integer, boolean)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_halfvec$function$

```

### `array_to_halfvec`

**Argumentos:** `integer[], integer, boolean`
**Retorno:** `halfvec`

```sql
CREATE OR REPLACE FUNCTION public.array_to_halfvec(integer[], integer, boolean)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_halfvec$function$

```

### `array_to_halfvec`

**Argumentos:** `real[], integer, boolean`
**Retorno:** `halfvec`

```sql
CREATE OR REPLACE FUNCTION public.array_to_halfvec(real[], integer, boolean)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_halfvec$function$

```

### `array_to_halfvec`

**Argumentos:** `double precision[], integer, boolean`
**Retorno:** `halfvec`

```sql
CREATE OR REPLACE FUNCTION public.array_to_halfvec(double precision[], integer, boolean)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_halfvec$function$

```

### `array_to_sparsevec`

**Argumentos:** `real[], integer, boolean`
**Retorno:** `sparsevec`

```sql
CREATE OR REPLACE FUNCTION public.array_to_sparsevec(real[], integer, boolean)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_sparsevec$function$

```

### `array_to_sparsevec`

**Argumentos:** `double precision[], integer, boolean`
**Retorno:** `sparsevec`

```sql
CREATE OR REPLACE FUNCTION public.array_to_sparsevec(double precision[], integer, boolean)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_sparsevec$function$

```

### `array_to_sparsevec`

**Argumentos:** `numeric[], integer, boolean`
**Retorno:** `sparsevec`

```sql
CREATE OR REPLACE FUNCTION public.array_to_sparsevec(numeric[], integer, boolean)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_sparsevec$function$

```

### `array_to_sparsevec`

**Argumentos:** `integer[], integer, boolean`
**Retorno:** `sparsevec`

```sql
CREATE OR REPLACE FUNCTION public.array_to_sparsevec(integer[], integer, boolean)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_sparsevec$function$

```

### `array_to_vector`

**Argumentos:** `numeric[], integer, boolean`
**Retorno:** `vector`

```sql
CREATE OR REPLACE FUNCTION public.array_to_vector(numeric[], integer, boolean)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_vector$function$

```

### `array_to_vector`

**Argumentos:** `real[], integer, boolean`
**Retorno:** `vector`

```sql
CREATE OR REPLACE FUNCTION public.array_to_vector(real[], integer, boolean)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_vector$function$

```

### `array_to_vector`

**Argumentos:** `double precision[], integer, boolean`
**Retorno:** `vector`

```sql
CREATE OR REPLACE FUNCTION public.array_to_vector(double precision[], integer, boolean)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_vector$function$

```

### `array_to_vector`

**Argumentos:** `integer[], integer, boolean`
**Retorno:** `vector`

```sql
CREATE OR REPLACE FUNCTION public.array_to_vector(integer[], integer, boolean)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$array_to_vector$function$

```

### `auto_expire_invites`

**Argumentos:** ``
**Retorno:** `void`

```sql
CREATE OR REPLACE FUNCTION public.auto_expire_invites()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.user_invites
  SET status = 'expired'
  WHERE status = 'pending'
  AND expires_at < NOW();
END;
$function$

```

### `backfill_operation_type`

**Argumentos:** ``
**Retorno:** `TABLE(updated_count integer)`

```sql
CREATE OR REPLACE FUNCTION public.backfill_operation_type()
 RETURNS TABLE(updated_count integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- 1. Whisper → transcription
  UPDATE usage_logs
  SET metadata = COALESCE(metadata, '{}'::JSONB) || '{"operation_type": "transcription"}'::JSONB
  WHERE source = 'whisper'
    AND (metadata->>'operation_type' IS NULL OR metadata IS NULL);

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- 2. Groq → chat
  UPDATE usage_logs
  SET metadata = COALESCE(metadata, '{}'::JSONB) || '{"operation_type": "chat"}'::JSONB
  WHERE source = 'groq'
    AND (metadata->>'operation_type' IS NULL OR metadata IS NULL);

  -- GET DIAGNOSTICS v_count = v_count + ROW_COUNT;

  -- 3. OpenAI text-embedding → embedding
  UPDATE usage_logs
  SET metadata = COALESCE(metadata, '{}'::JSONB) || '{"operation_type": "embedding"}'::JSONB
  WHERE source = 'openai'
    AND model LIKE 'text-embedding%'
    AND (metadata->>'operation_type' IS NULL OR metadata IS NULL);

  -- GET DIAGNOSTICS v_count = v_count + ROW_COUNT;

  -- 4. OpenAI gpt-4o sem conversation_id → vision ou pdf_summary
  -- (Não podemos diferenciar automaticamente, deixar como 'unknown')
  UPDATE usage_logs
  SET metadata = COALESCE(metadata, '{}'::JSONB) || '{"operation_type": "unknown"}'::JSONB
  WHERE source = 'openai'
    AND model LIKE 'gpt-4%'
    AND conversation_id IS NULL
    AND (metadata->>'operation_type' IS NULL OR metadata IS NULL);

  -- GET DIAGNOSTICS v_count = v_count + ROW_COUNT;

  -- 5. OpenAI gpt-4o com conversation_id → chat
  UPDATE usage_logs
  SET metadata = COALESCE(metadata, '{}'::JSONB) || '{"operation_type": "chat"}'::JSONB
  WHERE source = 'openai'
    AND model LIKE 'gpt-4%'
    AND conversation_id IS NOT NULL
    AND (metadata->>'operation_type' IS NULL OR metadata IS NULL);

  -- GET DIAGNOSTICS v_count = v_count + ROW_COUNT;

  RETURN QUERY SELECT v_count;
END;
$function$

```

### `binary_quantize`

**Argumentos:** `vector`
**Retorno:** `bit`

```sql
CREATE OR REPLACE FUNCTION public.binary_quantize(vector)
 RETURNS bit
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$binary_quantize$function$

```

### `binary_quantize`

**Argumentos:** `halfvec`
**Retorno:** `bit`

```sql
CREATE OR REPLACE FUNCTION public.binary_quantize(halfvec)
 RETURNS bit
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_binary_quantize$function$

```

### `broadcast_conversation_change`

**Argumentos:** ``
**Retorno:** `trigger`

```sql
CREATE OR REPLACE FUNCTION public.broadcast_conversation_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  channel_name TEXT;
BEGIN
  -- Build channel name: 'conversations:{client_id}'
  channel_name := 'conversations:' || COALESCE(NEW.client_id::TEXT, OLD.client_id::TEXT);

  -- Broadcast to Realtime channel
  PERFORM realtime.broadcast_changes(
    channel_name,
    TG_OP,
    TG_OP,
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    OLD
  );

  RETURN COALESCE(NEW, OLD);
END;
$function$

```

### `broadcast_message_change`

**Argumentos:** ``
**Retorno:** `trigger`

```sql
CREATE OR REPLACE FUNCTION public.broadcast_message_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  channel_name TEXT;
BEGIN
  -- Build channel name: 'messages:{client_id}:{phone}'
  channel_name := 'messages:' || COALESCE(NEW.client_id::TEXT, OLD.client_id::TEXT) ||
                  ':' || COALESCE(NEW.session_id::TEXT, OLD.session_id::TEXT);

  -- Broadcast to Realtime channel
  PERFORM realtime.broadcast_changes(
    channel_name,
    TG_OP,
    TG_OP,
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    OLD
  );

  RETURN COALESCE(NEW, OLD);
END;
$function$

```

### `calculate_budget_usage_percentage`

**Argumentos:** ``
**Retorno:** `trigger`

```sql
CREATE OR REPLACE FUNCTION public.calculate_budget_usage_percentage()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.budget_limit > 0 THEN
    NEW.usage_percentage = ROUND((NEW.current_usage / NEW.budget_limit) * 100, 2);
  ELSE
    NEW.usage_percentage = 0;
  END IF;
  RETURN NEW;
END;
$function$

```

### `calculate_modular_budget_percentages`

**Argumentos:** ``
**Retorno:** `trigger`

```sql
CREATE OR REPLACE FUNCTION public.calculate_modular_budget_percentages()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Calculate token percentage
  IF NEW.token_limit > 0 THEN
    NEW.token_usage_percentage = ROUND((NEW.current_tokens::NUMERIC / NEW.token_limit::NUMERIC) * 100, 2);
  ELSE
    NEW.token_usage_percentage = 0;
  END IF;

  -- Calculate BRL percentage
  IF NEW.brl_limit > 0 THEN
    NEW.brl_usage_percentage = ROUND((NEW.current_brl / NEW.brl_limit) * 100, 2);
  ELSE
    NEW.brl_usage_percentage = 0;
  END IF;

  -- For backward compatibility, set usage_percentage to the highest
  NEW.usage_percentage = GREATEST(NEW.token_usage_percentage, NEW.brl_usage_percentage);

  RETURN NEW;
END;
$function$

```

### `calculate_next_reset`

**Argumentos:** ``
**Retorno:** `trigger`

```sql
CREATE OR REPLACE FUNCTION public.calculate_next_reset()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  CASE NEW.budget_period
    WHEN 'daily' THEN
      NEW.next_reset_at = (NEW.last_reset_at + INTERVAL '1 day');
    WHEN 'weekly' THEN
      NEW.next_reset_at = (NEW.last_reset_at + INTERVAL '1 week');
    WHEN 'monthly' THEN
      NEW.next_reset_at = (NEW.last_reset_at + INTERVAL '1 month');
  END CASE;
  RETURN NEW;
END;
$function$

```

### `check_budget_available`

**Argumentos:** `p_client_id uuid`
**Retorno:** `boolean`

```sql
CREATE OR REPLACE FUNCTION public.check_budget_available(p_client_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_budget client_budgets%ROWTYPE;
BEGIN
  SELECT * INTO v_budget
  FROM client_budgets
  WHERE client_id = p_client_id;

  IF NOT FOUND THEN
    -- No budget configured = unlimited
    RETURN true;
  END IF;

  -- If already paused, deny
  IF v_budget.is_paused THEN
    RETURN false;
  END IF;

  -- Check based on mode
  CASE v_budget.budget_mode
    WHEN 'tokens' THEN
      -- Check token limit
      IF v_budget.token_limit > 0 AND v_budget.current_tokens >= v_budget.token_limit THEN
        RETURN false;
      END IF;

    WHEN 'brl' THEN
      -- Check BRL limit
      IF v_budget.brl_limit > 0 AND v_budget.current_brl >= v_budget.brl_limit THEN
        RETURN false;
      END IF;

    WHEN 'both' THEN
      -- Check BOTH (deny if ANY limit reached)
      IF (v_budget.token_limit > 0 AND v_budget.current_tokens >= v_budget.token_limit) OR
         (v_budget.brl_limit > 0 AND v_budget.current_brl >= v_budget.brl_limit) THEN
        RETURN false;
      END IF;
  END CASE;

  RETURN true;
END;
$function$

```

### `cleanup_old_audit_logs`

**Argumentos:** `retention_days integer DEFAULT 90`
**Retorno:** `integer`

```sql
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(retention_days integer DEFAULT 90)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.audit_logs
  WHERE created_at < (now() - make_interval(days => retention_days));

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$function$

```

### `cleanup_old_execution_logs`

**Argumentos:** `retention_days integer DEFAULT 30`
**Retorno:** `integer`

```sql
CREATE OR REPLACE FUNCTION public.cleanup_old_execution_logs(retention_days integer DEFAULT 30)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.execution_logs
  WHERE timestamp < (now() - make_interval(days => retention_days));

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$

```

### `cleanup_old_webhook_dedup`

**Argumentos:** `retention_hours integer DEFAULT 24`
**Retorno:** `integer`

```sql
CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_dedup(retention_hours integer DEFAULT 24)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.webhook_dedup
  WHERE processed_at < (now() - make_interval(hours => retention_hours));
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$function$

```

### `clientes_whatsapp_view_insert`

**Argumentos:** ``
**Retorno:** `trigger`

```sql
CREATE OR REPLACE FUNCTION public.clientes_whatsapp_view_insert()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO clientes_whatsapp (telefone, nome, status, created_at)
  VALUES (NEW.telefone, NEW.nome, NEW.status, COALESCE(NEW.created_at, NOW()))
  ON CONFLICT (telefone)
  DO UPDATE SET
    nome = COALESCE(EXCLUDED.nome, clientes_whatsapp.nome),
    status = COALESCE(EXCLUDED.status, clientes_whatsapp.status);
  RETURN NEW;
END;
$function$

```

### `clientes_whatsapp_view_update`

**Argumentos:** ``
**Retorno:** `trigger`

```sql
CREATE OR REPLACE FUNCTION public.clientes_whatsapp_view_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE clientes_whatsapp
  SET
    telefone = NEW.telefone,
    nome = NEW.nome,
    status = NEW.status,
    created_at = NEW.created_at
  WHERE telefone = OLD.telefone;
  RETURN NEW;
END;
$function$

```

### `cosine_distance`

**Argumentos:** `halfvec, halfvec`
**Retorno:** `double precision`

```sql
CREATE OR REPLACE FUNCTION public.cosine_distance(halfvec, halfvec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_cosine_distance$function$

```

### `cosine_distance`

**Argumentos:** `vector, vector`
**Retorno:** `double precision`

```sql
CREATE OR REPLACE FUNCTION public.cosine_distance(vector, vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$cosine_distance$function$

```

### `cosine_distance`

**Argumentos:** `sparsevec, sparsevec`
**Retorno:** `double precision`

```sql
CREATE OR REPLACE FUNCTION public.cosine_distance(sparsevec, sparsevec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_cosine_distance$function$

```

### `create_client_secret`

**Argumentos:** `secret_value text, secret_name text, secret_description text DEFAULT NULL::text`
**Retorno:** `uuid`

```sql
CREATE OR REPLACE FUNCTION public.create_client_secret(secret_value text, secret_name text, secret_description text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  secret_id UUID;
BEGIN
  -- Criar secret usando a função nativa do Supabase Vault
  SELECT vault.create_secret(secret_value, secret_name, secret_description) INTO secret_id;

  RETURN secret_id;
END;
$function$

```

### `create_vault_secret`

**Argumentos:** `p_secret text, p_name text, p_description text DEFAULT NULL::text`
**Retorno:** `uuid`

```sql
CREATE OR REPLACE FUNCTION public.create_vault_secret(p_secret text, p_name text, p_description text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_secret_id UUID;
BEGIN
  -- Check if secret with this name already exists
  SELECT id INTO v_secret_id
  FROM vault.secrets
  WHERE name = p_name
  LIMIT 1;

  IF v_secret_id IS NOT NULL THEN
    -- Secret exists, return existing ID
    -- Note: Vault secrets are immutable, so we don't update
    RAISE NOTICE 'Secret "%" already exists with ID %', p_name, v_secret_id;
    RETURN v_secret_id;
  END IF;

  -- Create new secret
  SELECT vault.create_secret(
    p_secret,
    p_name,
    p_description
  ) INTO v_secret_id;

  RETURN v_secret_id;
END;
$function$

```

### `delete_client_secret`

**Argumentos:** `secret_id uuid`
**Retorno:** `boolean`

```sql
CREATE OR REPLACE FUNCTION public.delete_client_secret(secret_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Delete secret from vault
  DELETE FROM vault.secrets WHERE id = secret_id;

  -- Check if deletion was successful
  IF NOT FOUND THEN
    RAISE NOTICE 'Secret % not found or already deleted', secret_id;
    RETURN FALSE;
  END IF;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error deleting secret %: %', secret_id, SQLERRM;
    RETURN FALSE;
END;
$function$

```

### `get_client_secret`

**Argumentos:** `secret_id uuid`
**Retorno:** `text`

```sql
CREATE OR REPLACE FUNCTION public.get_client_secret(secret_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  secret_value TEXT;
BEGIN
  SELECT decrypted_secret INTO secret_value
  FROM vault.decrypted_secrets
  WHERE id = secret_id;

  RETURN secret_value;
END;
$function$

```

### `get_conversation_summary`

**Argumentos:** `p_client_id uuid, p_limit integer DEFAULT 50`
**Retorno:** `TABLE(conversation_id uuid, phone text, name text, status text, last_message text, last_update timestamp with time zone, message_count bigint)`

```sql
CREATE OR REPLACE FUNCTION public.get_conversation_summary(p_client_id uuid, p_limit integer DEFAULT 50)
 RETURNS TABLE(conversation_id uuid, phone text, name text, status text, last_message text, last_update timestamp with time zone, message_count bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.phone,
    c.name,
    c.status,
    c.last_message,
    c.last_update,
    COUNT(m.id) as message_count
  FROM conversations c
  LEFT JOIN messages m ON m.conversation_id = c.id
  WHERE c.client_id = p_client_id
  GROUP BY c.id, c.phone, c.name, c.status, c.last_message, c.last_update
  ORDER BY c.last_update DESC
  LIMIT p_limit;
END;
$function$

```

### `get_current_user_client_id`

**Argumentos:** ``
**Retorno:** `uuid`

```sql
CREATE OR REPLACE FUNCTION public.get_current_user_client_id()
 RETURNS uuid
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT client_id FROM public.user_profiles WHERE id = auth.uid();
$function$

```

### `get_current_user_role`

**Argumentos:** ``
**Retorno:** `text`

```sql
CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$function$

```

### `get_daily_usage`

**Argumentos:** `p_client_id uuid, p_days integer DEFAULT 30`
**Retorno:** `TABLE(date date, source text, total_tokens bigint, total_cost numeric, request_count bigint)`

```sql
CREATE OR REPLACE FUNCTION public.get_daily_usage(p_client_id uuid, p_days integer DEFAULT 30)
 RETURNS TABLE(date date, source text, total_tokens bigint, total_cost numeric, request_count bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    DATE(ul.created_at) as date,
    ul.source,
    SUM(ul.total_tokens)::BIGINT as total_tokens,
    SUM(ul.cost_usd)::NUMERIC as total_cost,
    COUNT(*)::BIGINT as request_count
  FROM usage_logs ul
  WHERE ul.client_id = p_client_id
    AND ul.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY DATE(ul.created_at), ul.source
  ORDER BY date DESC, source;
END;
$function$

```

### `get_model_pricing`

**Argumentos:** `p_client_id uuid, p_provider text, p_model text`
**Retorno:** `TABLE(prompt_price numeric, completion_price numeric, unit text)`

```sql
CREATE OR REPLACE FUNCTION public.get_model_pricing(p_client_id uuid, p_provider text, p_model text)
 RETURNS TABLE(prompt_price numeric, completion_price numeric, unit text)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    pc.prompt_price,
    pc.completion_price,
    pc.unit
  FROM pricing_config pc
  WHERE pc.client_id = p_client_id
    AND pc.provider = p_provider
    AND pc.model = p_model
  LIMIT 1;
END;
$function$

```

### `get_monthly_summary`

**Argumentos:** `p_client_id uuid, p_year integer DEFAULT (EXTRACT(year FROM now()))::integer, p_month integer DEFAULT (EXTRACT(month FROM now()))::integer`
**Retorno:** `TABLE(source text, model text, total_tokens bigint, prompt_tokens bigint, completion_tokens bigint, total_cost numeric, request_count bigint)`

```sql
CREATE OR REPLACE FUNCTION public.get_monthly_summary(p_client_id uuid, p_year integer DEFAULT (EXTRACT(year FROM now()))::integer, p_month integer DEFAULT (EXTRACT(month FROM now()))::integer)
 RETURNS TABLE(source text, model text, total_tokens bigint, prompt_tokens bigint, completion_tokens bigint, total_cost numeric, request_count bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    ul.source,
    COALESCE(ul.model, 'unknown') as model,
    SUM(ul.total_tokens)::BIGINT as total_tokens,
    SUM(ul.prompt_tokens)::BIGINT as prompt_tokens,
    SUM(ul.completion_tokens)::BIGINT as completion_tokens,
    SUM(ul.cost_usd)::NUMERIC as total_cost,
    COUNT(*)::BIGINT as request_count
  FROM usage_logs ul
  WHERE ul.client_id = p_client_id
    AND EXTRACT(YEAR FROM ul.created_at) = p_year
    AND EXTRACT(MONTH FROM ul.created_at) = p_month
  GROUP BY ul.source, ul.model
  ORDER BY total_tokens DESC;
END;
$function$

```

### `get_usage_by_conversation`

**Argumentos:** `p_client_id uuid, p_days integer DEFAULT 30, p_limit integer DEFAULT 20`
**Retorno:** `TABLE(phone text, conversation_name text, total_tokens bigint, total_cost numeric, request_count bigint, openai_tokens bigint, groq_tokens bigint)`

```sql
CREATE OR REPLACE FUNCTION public.get_usage_by_conversation(p_client_id uuid, p_days integer DEFAULT 30, p_limit integer DEFAULT 20)
 RETURNS TABLE(phone text, conversation_name text, total_tokens bigint, total_cost numeric, request_count bigint, openai_tokens bigint, groq_tokens bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    ul.phone,
    COALESCE(cw.nome, 'Sem nome') as conversation_name,
    SUM(ul.total_tokens)::BIGINT as total_tokens,
    SUM(ul.cost_usd)::NUMERIC as total_cost,
    COUNT(*)::BIGINT as request_count,
    SUM(CASE WHEN ul.source = 'openai' THEN ul.total_tokens ELSE 0 END)::BIGINT as openai_tokens,
    SUM(CASE WHEN ul.source = 'groq' THEN ul.total_tokens ELSE 0 END)::BIGINT as groq_tokens
  FROM usage_logs ul
  LEFT JOIN clientes_whatsapp cw ON ul.phone = cw.telefone::TEXT AND cw.client_id = p_client_id
  WHERE ul.client_id = p_client_id
    AND ul.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY ul.phone, cw.nome
  ORDER BY total_tokens DESC
  LIMIT p_limit;
END;
$function$

```

### `get_usage_by_operation_type`

**Argumentos:** `p_client_id uuid, p_days integer DEFAULT 30`
**Retorno:** `TABLE(source text, model text, operation_type text, total_tokens bigint, total_cost numeric, request_count bigint)`

```sql
CREATE OR REPLACE FUNCTION public.get_usage_by_operation_type(p_client_id uuid, p_days integer DEFAULT 30)
 RETURNS TABLE(source text, model text, operation_type text, total_tokens bigint, total_cost numeric, request_count bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    ul.source,
    COALESCE(ul.model, 'unknown') as model,
    COALESCE(ul.metadata->>'operation_type', 'unknown') as operation_type,
    SUM(ul.total_tokens)::BIGINT as total_tokens,
    SUM(ul.cost_usd)::NUMERIC as total_cost,
    COUNT(*)::BIGINT as request_count
  FROM usage_logs ul
  WHERE ul.client_id = p_client_id
    AND ul.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY ul.source, ul.model, ul.metadata->>'operation_type'
  ORDER BY total_cost DESC;
END;
$function$

```

### `get_usage_summary`

**Argumentos:** `p_client_id uuid, p_start_date timestamp with time zone DEFAULT (now() - '30 days'::interval), p_end_date timestamp with time zone DEFAULT now()`
**Retorno:** `TABLE(source text, total_tokens bigint, total_messages bigint, total_cost numeric)`

```sql
CREATE OR REPLACE FUNCTION public.get_usage_summary(p_client_id uuid, p_start_date timestamp with time zone DEFAULT (now() - '30 days'::interval), p_end_date timestamp with time zone DEFAULT now())
 RETURNS TABLE(source text, total_tokens bigint, total_messages bigint, total_cost numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    ul.source,
    SUM(ul.tokens_used) as total_tokens,
    SUM(ul.messages_sent) as total_messages,
    SUM(ul.cost_usd) as total_cost
  FROM usage_logs ul
  WHERE ul.client_id = p_client_id
    AND ul.created_at BETWEEN p_start_date AND p_end_date
  GROUP BY ul.source;
END;
$function$

```

### `get_user_client_id`

**Argumentos:** ``
**Retorno:** `uuid`

```sql
CREATE OR REPLACE FUNCTION public.get_user_client_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT client_id FROM public.user_profiles WHERE id = auth.uid()
$function$

```

### `get_user_tenant_id`

**Argumentos:** ``
**Retorno:** `integer`

```sql
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_tenant_id INTEGER;
  user_email TEXT;
BEGIN
  -- Extrair email do JWT do Supabase
  user_email := auth.jwt() ->> 'email';
  
  IF user_email IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Buscar tenant_id do usuário
  SELECT tenant_id INTO user_tenant_id
  FROM public.users
  WHERE email = user_email
    AND is_active = true
  LIMIT 1;
  
  RETURN user_tenant_id;
END;
$function$

```

### `get_vault_secret`

**Argumentos:** `p_name text`
**Retorno:** `text`

```sql
CREATE OR REPLACE FUNCTION public.get_vault_secret(p_name text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_secret_id UUID;
  v_decrypted_secret TEXT;
BEGIN
  -- Find secret ID by name
  SELECT id INTO v_secret_id
  FROM vault.secrets
  WHERE name = p_name
  LIMIT 1;

  IF v_secret_id IS NULL THEN
    RAISE EXCEPTION 'Secret "%" not found', p_name;
  END IF;

  -- Decrypt secret
  SELECT decrypted_secret INTO v_decrypted_secret
  FROM vault.decrypted_secrets
  WHERE id = v_secret_id;

  RETURN v_decrypted_secret;
END;
$function$

```

### `get_weekly_evolution`

**Argumentos:** `p_client_id uuid, p_weeks integer DEFAULT 12`
**Retorno:** `TABLE(week_start date, week_number integer, total_tokens bigint, openai_tokens bigint, groq_tokens bigint, total_cost numeric)`

```sql
CREATE OR REPLACE FUNCTION public.get_weekly_evolution(p_client_id uuid, p_weeks integer DEFAULT 12)
 RETURNS TABLE(week_start date, week_number integer, total_tokens bigint, openai_tokens bigint, groq_tokens bigint, total_cost numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH weeks AS (
    SELECT 
      DATE_TRUNC('week', ul.created_at)::DATE as week_start,
      EXTRACT(WEEK FROM ul.created_at)::INTEGER as week_number,
      ul.source,
      SUM(ul.total_tokens) as tokens,
      SUM(ul.cost_usd) as cost
    FROM usage_logs ul
    WHERE ul.client_id = p_client_id
      AND ul.created_at >= DATE_TRUNC('week', NOW()) - ((p_weeks - 1) || ' weeks')::INTERVAL
    GROUP BY DATE_TRUNC('week', ul.created_at), EXTRACT(WEEK FROM ul.created_at), ul.source
  )
  SELECT
    w.week_start,
    w.week_number,
    SUM(w.tokens)::BIGINT as total_tokens,
    SUM(CASE WHEN w.source = 'openai' THEN w.tokens ELSE 0 END)::BIGINT as openai_tokens,
    SUM(CASE WHEN w.source = 'groq' THEN w.tokens ELSE 0 END)::BIGINT as groq_tokens,
    SUM(w.cost)::NUMERIC as total_cost
  FROM weeks w
  GROUP BY w.week_start, w.week_number
  ORDER BY w.week_start ASC;
END;
$function$

```

### `gin_extract_query_trgm`

**Argumentos:** `text, internal, smallint, internal, internal, internal, internal`
**Retorno:** `internal`

```sql
CREATE OR REPLACE FUNCTION public.gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_extract_query_trgm$function$

```

### `gin_extract_value_trgm`

**Argumentos:** `text, internal`
**Retorno:** `internal`

```sql
CREATE OR REPLACE FUNCTION public.gin_extract_value_trgm(text, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_extract_value_trgm$function$

```

### `gin_trgm_consistent`

**Argumentos:** `internal, smallint, text, integer, internal, internal, internal, internal`
**Retorno:** `boolean`

```sql
CREATE OR REPLACE FUNCTION public.gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_trgm_consistent$function$

```

### `gin_trgm_triconsistent`

**Argumentos:** `internal, smallint, text, integer, internal, internal, internal`
**Retorno:** `"char"`

```sql
CREATE OR REPLACE FUNCTION public.gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal)
 RETURNS "char"
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_trgm_triconsistent$function$

```

### `gtrgm_compress`

**Argumentos:** `internal`
**Retorno:** `internal`

```sql
CREATE OR REPLACE FUNCTION public.gtrgm_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_compress$function$

```

### `gtrgm_consistent`

**Argumentos:** `internal, text, smallint, oid, internal`
**Retorno:** `boolean`

```sql
CREATE OR REPLACE FUNCTION public.gtrgm_consistent(internal, text, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_consistent$function$

```

### `gtrgm_decompress`

**Argumentos:** `internal`
**Retorno:** `internal`

```sql
CREATE OR REPLACE FUNCTION public.gtrgm_decompress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_decompress$function$

```

### `gtrgm_distance`

**Argumentos:** `internal, text, smallint, oid, internal`
**Retorno:** `double precision`

```sql
CREATE OR REPLACE FUNCTION public.gtrgm_distance(internal, text, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_distance$function$

```

### `gtrgm_in`

**Argumentos:** `cstring`
**Retorno:** `gtrgm`

```sql
CREATE OR REPLACE FUNCTION public.gtrgm_in(cstring)
 RETURNS gtrgm
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_in$function$

```

### `gtrgm_options`

**Argumentos:** `internal`
**Retorno:** `void`

```sql
CREATE OR REPLACE FUNCTION public.gtrgm_options(internal)
 RETURNS void
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE
AS '$libdir/pg_trgm', $function$gtrgm_options$function$

```

### `gtrgm_out`

**Argumentos:** `gtrgm`
**Retorno:** `cstring`

```sql
CREATE OR REPLACE FUNCTION public.gtrgm_out(gtrgm)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_out$function$

```

### `gtrgm_penalty`

**Argumentos:** `internal, internal, internal`
**Retorno:** `internal`

```sql
CREATE OR REPLACE FUNCTION public.gtrgm_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_penalty$function$

```

### `gtrgm_picksplit`

**Argumentos:** `internal, internal`
**Retorno:** `internal`

```sql
CREATE OR REPLACE FUNCTION public.gtrgm_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_picksplit$function$

```

### `gtrgm_same`

**Argumentos:** `gtrgm, gtrgm, internal`
**Retorno:** `internal`

```sql
CREATE OR REPLACE FUNCTION public.gtrgm_same(gtrgm, gtrgm, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_same$function$

```

### `gtrgm_union`

**Argumentos:** `internal, internal`
**Retorno:** `gtrgm`

```sql
CREATE OR REPLACE FUNCTION public.gtrgm_union(internal, internal)
 RETURNS gtrgm
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_union$function$

```

### `halfvec`

**Argumentos:** `halfvec, integer, boolean`
**Retorno:** `halfvec`

```sql
CREATE OR REPLACE FUNCTION public.halfvec(halfvec, integer, boolean)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec$function$

```

### `halfvec_accum`

**Argumentos:** `double precision[], halfvec`
**Retorno:** `double precision[]`

```sql
CREATE OR REPLACE FUNCTION public.halfvec_accum(double precision[], halfvec)
 RETURNS double precision[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_accum$function$

```

### `halfvec_add`

**Argumentos:** `halfvec, halfvec`
**Retorno:** `halfvec`

```sql
CREATE OR REPLACE FUNCTION public.halfvec_add(halfvec, halfvec)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_add$function$

```

### `halfvec_avg`

**Argumentos:** `double precision[]`
**Retorno:** `halfvec`

```sql
CREATE OR REPLACE FUNCTION public.halfvec_avg(double precision[])
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_avg$function$

```

### `halfvec_cmp`

**Argumentos:** `halfvec, halfvec`
**Retorno:** `integer`

```sql
CREATE OR REPLACE FUNCTION public.halfvec_cmp(halfvec, halfvec)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_cmp$function$

```

### `halfvec_combine`

**Argumentos:** `double precision[], double precision[]`
**Retorno:** `double precision[]`

```sql
CREATE OR REPLACE FUNCTION public.halfvec_combine(double precision[], double precision[])
 RETURNS double precision[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_combine$function$

```

### `halfvec_concat`

**Argumentos:** `halfvec, halfvec`
**Retorno:** `halfvec`

```sql
CREATE OR REPLACE FUNCTION public.halfvec_concat(halfvec, halfvec)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_concat$function$

```

### `halfvec_eq`

**Argumentos:** `halfvec, halfvec`
**Retorno:** `boolean`

```sql
CREATE OR REPLACE FUNCTION public.halfvec_eq(halfvec, halfvec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_eq$function$

```

### `halfvec_ge`

**Argumentos:** `halfvec, halfvec`
**Retorno:** `boolean`

```sql
CREATE OR REPLACE FUNCTION public.halfvec_ge(halfvec, halfvec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_ge$function$

```

### `halfvec_gt`

**Argumentos:** `halfvec, halfvec`
**Retorno:** `boolean`

```sql
CREATE OR REPLACE FUNCTION public.halfvec_gt(halfvec, halfvec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_gt$function$

```

### `halfvec_in`

**Argumentos:** `cstring, oid, integer`
**Retorno:** `halfvec`

```sql
CREATE OR REPLACE FUNCTION public.halfvec_in(cstring, oid, integer)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_in$function$

```

### `halfvec_l2_squared_distance`

**Argumentos:** `halfvec, halfvec`
**Retorno:** `double precision`

```sql
CREATE OR REPLACE FUNCTION public.halfvec_l2_squared_distance(halfvec, halfvec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_l2_squared_distance$function$

```

### `halfvec_le`

**Argumentos:** `halfvec, halfvec`
**Retorno:** `boolean`

```sql
CREATE OR REPLACE FUNCTION public.halfvec_le(halfvec, halfvec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_le$function$

```

### `halfvec_lt`

**Argumentos:** `halfvec, halfvec`
**Retorno:** `boolean`

```sql
CREATE OR REPLACE FUNCTION public.halfvec_lt(halfvec, halfvec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_lt$function$

```

### `halfvec_mul`

**Argumentos:** `halfvec, halfvec`
**Retorno:** `halfvec`

```sql
CREATE OR REPLACE FUNCTION public.halfvec_mul(halfvec, halfvec)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_mul$function$

```

### `halfvec_ne`

**Argumentos:** `halfvec, halfvec`
**Retorno:** `boolean`

```sql
CREATE OR REPLACE FUNCTION public.halfvec_ne(halfvec, halfvec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_ne$function$

```

### `halfvec_negative_inner_product`

**Argumentos:** `halfvec, halfvec`
**Retorno:** `double precision`

```sql
CREATE OR REPLACE FUNCTION public.halfvec_negative_inner_product(halfvec, halfvec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_negative_inner_product$function$

```

### `halfvec_out`

**Argumentos:** `halfvec`
**Retorno:** `cstring`

```sql
CREATE OR REPLACE FUNCTION public.halfvec_out(halfvec)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_out$function$

```

### `halfvec_recv`

**Argumentos:** `internal, oid, integer`
**Retorno:** `halfvec`

```sql
CREATE OR REPLACE FUNCTION public.halfvec_recv(internal, oid, integer)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_recv$function$

```

### `halfvec_send`

**Argumentos:** `halfvec`
**Retorno:** `bytea`

```sql
CREATE OR REPLACE FUNCTION public.halfvec_send(halfvec)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_send$function$

```

### `halfvec_spherical_distance`

**Argumentos:** `halfvec, halfvec`
**Retorno:** `double precision`

```sql
CREATE OR REPLACE FUNCTION public.halfvec_spherical_distance(halfvec, halfvec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_spherical_distance$function$

```

### `halfvec_sub`

**Argumentos:** `halfvec, halfvec`
**Retorno:** `halfvec`

```sql
CREATE OR REPLACE FUNCTION public.halfvec_sub(halfvec, halfvec)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_sub$function$

```

### `halfvec_to_float4`

**Argumentos:** `halfvec, integer, boolean`
**Retorno:** `real[]`

```sql
CREATE OR REPLACE FUNCTION public.halfvec_to_float4(halfvec, integer, boolean)
 RETURNS real[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_to_float4$function$

```

### `halfvec_to_sparsevec`

**Argumentos:** `halfvec, integer, boolean`
**Retorno:** `sparsevec`

```sql
CREATE OR REPLACE FUNCTION public.halfvec_to_sparsevec(halfvec, integer, boolean)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_to_sparsevec$function$

```

### `halfvec_to_vector`

**Argumentos:** `halfvec, integer, boolean`
**Retorno:** `vector`

```sql
CREATE OR REPLACE FUNCTION public.halfvec_to_vector(halfvec, integer, boolean)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_to_vector$function$

```

### `halfvec_typmod_in`

**Argumentos:** `cstring[]`
**Retorno:** `integer`

```sql
CREATE OR REPLACE FUNCTION public.halfvec_typmod_in(cstring[])
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_typmod_in$function$

```

### `hamming_distance`

**Argumentos:** `bit, bit`
**Retorno:** `double precision`

```sql
CREATE OR REPLACE FUNCTION public.hamming_distance(bit, bit)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$hamming_distance$function$

```

### `handle_new_user`

**Argumentos:** ``
**Retorno:** `trigger`

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.user_profiles (id, email, role, client_id, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    (NEW.raw_user_meta_data->>'client_id')::UUID,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$function$

```

### `hnsw_bit_support`

**Argumentos:** `internal`
**Retorno:** `internal`

```sql
CREATE OR REPLACE FUNCTION public.hnsw_bit_support(internal)
 RETURNS internal
 LANGUAGE c
AS '$libdir/vector', $function$hnsw_bit_support$function$

```

### `hnsw_halfvec_support`

**Argumentos:** `internal`
**Retorno:** `internal`

```sql
CREATE OR REPLACE FUNCTION public.hnsw_halfvec_support(internal)
 RETURNS internal
 LANGUAGE c
AS '$libdir/vector', $function$hnsw_halfvec_support$function$

```

### `hnsw_sparsevec_support`

**Argumentos:** `internal`
**Retorno:** `internal`

```sql
CREATE OR REPLACE FUNCTION public.hnsw_sparsevec_support(internal)
 RETURNS internal
 LANGUAGE c
AS '$libdir/vector', $function$hnsw_sparsevec_support$function$

```

### `hnswhandler`

**Argumentos:** `internal`
**Retorno:** `index_am_handler`

```sql
CREATE OR REPLACE FUNCTION public.hnswhandler(internal)
 RETURNS index_am_handler
 LANGUAGE c
AS '$libdir/vector', $function$hnswhandler$function$

```

### `increment_budget_usage`

**Argumentos:** `p_client_id uuid, p_amount numeric`
**Retorno:** `void`

```sql
CREATE OR REPLACE FUNCTION public.increment_budget_usage(p_client_id uuid, p_amount numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE client_budgets
  SET current_usage = current_usage + p_amount
  WHERE client_id = p_client_id;
END;
$function$

```

### `increment_tts_cache_hit`

**Argumentos:** `cache_text_hash text`
**Retorno:** `void`

```sql
CREATE OR REPLACE FUNCTION public.increment_tts_cache_hit(cache_text_hash text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE tts_cache
  SET hit_count = hit_count + 1
  WHERE text_hash = cache_text_hash;
END;
$function$

```

### `increment_unified_budget`

**Argumentos:** `p_client_id uuid, p_tokens bigint, p_cost_brl numeric`
**Retorno:** `void`

```sql
CREATE OR REPLACE FUNCTION public.increment_unified_budget(p_client_id uuid, p_tokens bigint, p_cost_brl numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_budget client_budgets%ROWTYPE;
  v_should_pause BOOLEAN := false;
  v_pause_reason TEXT := NULL;
BEGIN
  -- Get current budget
  SELECT * INTO v_budget
  FROM client_budgets
  WHERE client_id = p_client_id;

  IF NOT FOUND THEN
    -- No budget configured, allow unlimited
    RETURN;
  END IF;

  -- Increment based on mode
  CASE v_budget.budget_mode
    WHEN 'tokens' THEN
      -- Token-only mode
      UPDATE client_budgets
      SET current_tokens = current_tokens + p_tokens
      WHERE client_id = p_client_id;

      -- Check if limit reached
      IF v_budget.token_limit > 0 AND (v_budget.current_tokens + p_tokens) >= v_budget.token_limit THEN
        v_should_pause := true;
        v_pause_reason := 'token_limit';
      END IF;

    WHEN 'brl' THEN
      -- BRL-only mode
      UPDATE client_budgets
      SET current_brl = current_brl + p_cost_brl
      WHERE client_id = p_client_id;

      -- Check if limit reached
      IF v_budget.brl_limit > 0 AND (v_budget.current_brl + p_cost_brl) >= v_budget.brl_limit THEN
        v_should_pause := true;
        v_pause_reason := 'brl_limit';
      END IF;

    WHEN 'both' THEN
      -- Hybrid mode: track BOTH
      UPDATE client_budgets
      SET
        current_tokens = current_tokens + p_tokens,
        current_brl = current_brl + p_cost_brl
      WHERE client_id = p_client_id;

      -- Check BOTH limits
      IF v_budget.token_limit > 0 AND (v_budget.current_tokens + p_tokens) >= v_budget.token_limit THEN
        v_should_pause := true;
        v_pause_reason := 'token_limit';
      END IF;

      IF v_budget.brl_limit > 0 AND (v_budget.current_brl + p_cost_brl) >= v_budget.brl_limit THEN
        IF v_pause_reason = 'token_limit' THEN
          v_pause_reason := 'both'; -- Both limits hit!
        ELSE
          v_pause_reason := 'brl_limit';
        END IF;
        v_should_pause := true;
      END IF;
  END CASE;

  -- Auto-pause if needed
  IF v_should_pause AND v_budget.pause_at_limit AND NOT v_budget.is_paused THEN
    UPDATE client_budgets
    SET
      is_paused = true,
      pause_reason = v_pause_reason
    WHERE client_id = p_client_id;

    -- TODO: Send alert email/webhook
    RAISE NOTICE 'Client % paused due to: %', p_client_id, v_pause_reason;
  END IF;

  -- Trigger alert flags (80%, 90%, 100%)
  -- Token alerts
  IF v_budget.budget_mode IN ('tokens', 'both') AND v_budget.token_limit > 0 THEN
    UPDATE client_budgets
    SET
      alert_80_sent = CASE WHEN token_usage_percentage >= 80 THEN true ELSE alert_80_sent END,
      alert_90_sent = CASE WHEN token_usage_percentage >= 90 THEN true ELSE alert_90_sent END,
      alert_100_sent = CASE WHEN token_usage_percentage >= 100 THEN true ELSE alert_100_sent END
    WHERE client_id = p_client_id;
  END IF;

  -- BRL alerts
  IF v_budget.budget_mode IN ('brl', 'both') AND v_budget.brl_limit > 0 THEN
    UPDATE client_budgets
    SET
      alert_80_sent = CASE WHEN brl_usage_percentage >= 80 THEN true ELSE alert_80_sent END,
      alert_90_sent = CASE WHEN brl_usage_percentage >= 90 THEN true ELSE alert_90_sent END,
      alert_100_sent = CASE WHEN brl_usage_percentage >= 100 THEN true ELSE alert_100_sent END
    WHERE client_id = p_client_id;
  END IF;
END;
$function$

```

### `inner_product`

**Argumentos:** `sparsevec, sparsevec`
**Retorno:** `double precision`

```sql
CREATE OR REPLACE FUNCTION public.inner_product(sparsevec, sparsevec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_inner_product$function$

```

### `inner_product`

**Argumentos:** `halfvec, halfvec`
**Retorno:** `double precision`

```sql
CREATE OR REPLACE FUNCTION public.inner_product(halfvec, halfvec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_inner_product$function$

```

### `inner_product`

**Argumentos:** `vector, vector`
**Retorno:** `double precision`

```sql
CREATE OR REPLACE FUNCTION public.inner_product(vector, vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$inner_product$function$

```

### `is_budget_exceeded`

**Argumentos:** `p_client_id uuid`
**Retorno:** `boolean`

```sql
CREATE OR REPLACE FUNCTION public.is_budget_exceeded(p_client_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_budget client_budgets%ROWTYPE;
BEGIN
  SELECT * INTO v_budget
  FROM client_budgets
  WHERE client_id = p_client_id;

  IF NOT FOUND THEN
    RETURN false; -- No budget configured
  END IF;

  IF v_budget.is_paused THEN
    RETURN true; -- Already paused
  END IF;

  RETURN v_budget.current_usage >= v_budget.budget_limit;
END;
$function$

```

### `is_message_processed`

**Argumentos:** `p_client_id uuid, p_message_id text`
**Retorno:** `boolean`

```sql
CREATE OR REPLACE FUNCTION public.is_message_processed(p_client_id uuid, p_message_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  exists_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO exists_count
  FROM public.webhook_dedup
  WHERE client_id = p_client_id
    AND message_id = p_message_id
    AND processed_at > (now() - INTERVAL '24 hours'); -- Apenas últimas 24h
  
  RETURN exists_count > 0;
END;
$function$

```

### `ivfflat_bit_support`

**Argumentos:** `internal`
**Retorno:** `internal`

```sql
CREATE OR REPLACE FUNCTION public.ivfflat_bit_support(internal)
 RETURNS internal
 LANGUAGE c
AS '$libdir/vector', $function$ivfflat_bit_support$function$

```

### `ivfflat_halfvec_support`

**Argumentos:** `internal`
**Retorno:** `internal`

```sql
CREATE OR REPLACE FUNCTION public.ivfflat_halfvec_support(internal)
 RETURNS internal
 LANGUAGE c
AS '$libdir/vector', $function$ivfflat_halfvec_support$function$

```

### `ivfflathandler`

**Argumentos:** `internal`
**Retorno:** `index_am_handler`

```sql
CREATE OR REPLACE FUNCTION public.ivfflathandler(internal)
 RETURNS index_am_handler
 LANGUAGE c
AS '$libdir/vector', $function$ivfflathandler$function$

```

### `jaccard_distance`

**Argumentos:** `bit, bit`
**Retorno:** `double precision`

```sql
CREATE OR REPLACE FUNCTION public.jaccard_distance(bit, bit)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$jaccard_distance$function$

```

### `l1_distance`

**Argumentos:** `halfvec, halfvec`
**Retorno:** `double precision`

```sql
CREATE OR REPLACE FUNCTION public.l1_distance(halfvec, halfvec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_l1_distance$function$

```

### `l1_distance`

**Argumentos:** `vector, vector`
**Retorno:** `double precision`

```sql
CREATE OR REPLACE FUNCTION public.l1_distance(vector, vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$l1_distance$function$

```

### `l1_distance`

**Argumentos:** `sparsevec, sparsevec`
**Retorno:** `double precision`

```sql
CREATE OR REPLACE FUNCTION public.l1_distance(sparsevec, sparsevec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_l1_distance$function$

```

### `l2_distance`

**Argumentos:** `halfvec, halfvec`
**Retorno:** `double precision`

```sql
CREATE OR REPLACE FUNCTION public.l2_distance(halfvec, halfvec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_l2_distance$function$

```

### `l2_distance`

**Argumentos:** `vector, vector`
**Retorno:** `double precision`

```sql
CREATE OR REPLACE FUNCTION public.l2_distance(vector, vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$l2_distance$function$

```

### `l2_distance`

**Argumentos:** `sparsevec, sparsevec`
**Retorno:** `double precision`

```sql
CREATE OR REPLACE FUNCTION public.l2_distance(sparsevec, sparsevec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_l2_distance$function$

```

### `l2_norm`

**Argumentos:** `sparsevec`
**Retorno:** `double precision`

```sql
CREATE OR REPLACE FUNCTION public.l2_norm(sparsevec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_l2_norm$function$

```

### `l2_norm`

**Argumentos:** `halfvec`
**Retorno:** `double precision`

```sql
CREATE OR REPLACE FUNCTION public.l2_norm(halfvec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_l2_norm$function$

```

### `l2_normalize`

**Argumentos:** `vector`
**Retorno:** `vector`

```sql
CREATE OR REPLACE FUNCTION public.l2_normalize(vector)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$l2_normalize$function$

```

### `l2_normalize`

**Argumentos:** `sparsevec`
**Retorno:** `sparsevec`

```sql
CREATE OR REPLACE FUNCTION public.l2_normalize(sparsevec)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_l2_normalize$function$

```

### `l2_normalize`

**Argumentos:** `halfvec`
**Retorno:** `halfvec`

```sql
CREATE OR REPLACE FUNCTION public.l2_normalize(halfvec)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_l2_normalize$function$

```

### `list_vault_secrets`

**Argumentos:** ``
**Retorno:** `TABLE(id uuid, name text, description text, created_at timestamp with time zone)`

```sql
CREATE OR REPLACE FUNCTION public.list_vault_secrets()
 RETURNS TABLE(id uuid, name text, description text, created_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id, name, description, created_at
  FROM vault.secrets
  ORDER BY created_at DESC;
$function$

```

### `mark_message_processed`

**Argumentos:** `p_client_id uuid, p_message_id text, p_dedup_key text, p_payload jsonb DEFAULT NULL::jsonb`
**Retorno:** `void`

```sql
CREATE OR REPLACE FUNCTION public.mark_message_processed(p_client_id uuid, p_message_id text, p_dedup_key text, p_payload jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.webhook_dedup (
    client_id,
    message_id,
    dedup_key,
    webhook_payload,
    processed_at
  ) VALUES (
    p_client_id,
    p_message_id,
    p_dedup_key,
    p_payload,
    now()
  )
  ON CONFLICT (client_id, message_id)
  DO UPDATE SET
    processed_at = now(),
    webhook_payload = EXCLUDED.webhook_payload;
END;
$function$

```

### `match_documents`

**Argumentos:** `query_embedding vector, match_threshold double precision DEFAULT 0.8, match_count integer DEFAULT 5, filter_client_id uuid DEFAULT NULL::uuid`
**Retorno:** `TABLE(id bigint, content text, metadata jsonb, similarity double precision, original_file_url text, original_file_path text, original_mime_type text, original_file_size integer)`

```sql
CREATE OR REPLACE FUNCTION public.match_documents(query_embedding vector, match_threshold double precision DEFAULT 0.8, match_count integer DEFAULT 5, filter_client_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision, original_file_url text, original_file_path text, original_mime_type text, original_file_size integer)
 LANGUAGE plpgsql
AS $function$
  BEGIN
    RETURN QUERY
    SELECT
      documents.id,
      documents.content,
      documents.metadata,
      (1 - (documents.embedding <=>
  query_embedding))::double precision AS
  similarity,
      documents.original_file_url,
      documents.original_file_path,
      documents.original_mime_type,
      documents.original_file_size
    FROM public.documents
    WHERE
      (filter_client_id IS NULL OR
  documents.client_id = filter_client_id)        
      AND (1 - (documents.embedding <=>
  query_embedding)) >= match_threshold
    ORDER BY documents.embedding <=>
  query_embedding
    LIMIT match_count;
  END;
  $function$

```

### `migrate_execution_logs_to_client`

**Argumentos:** `target_client_id uuid, phone_filter text DEFAULT NULL::text`
**Retorno:** `integer`

```sql
CREATE OR REPLACE FUNCTION public.migrate_execution_logs_to_client(target_client_id uuid, phone_filter text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  updated_count INTEGER;
BEGIN
  IF phone_filter IS NOT NULL THEN
    UPDATE public.execution_logs
    SET client_id = target_client_id
    WHERE client_id IS NULL
      AND metadata->>'from' = phone_filter;
  ELSE
    UPDATE public.execution_logs
    SET client_id = target_client_id
    WHERE client_id IS NULL;
  END IF;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$function$

```

### `reset_budget_usage`

**Argumentos:** `p_client_id uuid`
**Retorno:** `void`

```sql
CREATE OR REPLACE FUNCTION public.reset_budget_usage(p_client_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE client_budgets
  SET
    current_tokens = 0,
    current_brl = 0,
    token_usage_percentage = 0,
    brl_usage_percentage = 0,
    usage_percentage = 0,
    last_reset_at = NOW(),
    alert_80_sent = false,
    alert_90_sent = false,
    alert_100_sent = false,
    is_paused = false,
    pause_reason = NULL
  WHERE client_id = p_client_id;
END;
$function$

```

### `set_limit`

**Argumentos:** `real`
**Retorno:** `real`

```sql
CREATE OR REPLACE FUNCTION public.set_limit(real)
 RETURNS real
 LANGUAGE c
 STRICT
AS '$libdir/pg_trgm', $function$set_limit$function$

```

### `show_limit`

**Argumentos:** ``
**Retorno:** `real`

```sql
CREATE OR REPLACE FUNCTION public.show_limit()
 RETURNS real
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$show_limit$function$

```

### `show_trgm`

**Argumentos:** `text`
**Retorno:** `text[]`

```sql
CREATE OR REPLACE FUNCTION public.show_trgm(text)
 RETURNS text[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$show_trgm$function$

```

### `similarity`

**Argumentos:** `text, text`
**Retorno:** `real`

```sql
CREATE OR REPLACE FUNCTION public.similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity$function$

```

### `similarity_dist`

**Argumentos:** `text, text`
**Retorno:** `real`

```sql
CREATE OR REPLACE FUNCTION public.similarity_dist(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity_dist$function$

```

### `similarity_op`

**Argumentos:** `text, text`
**Retorno:** `boolean`

```sql
CREATE OR REPLACE FUNCTION public.similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity_op$function$

```

### `sparsevec`

**Argumentos:** `sparsevec, integer, boolean`
**Retorno:** `sparsevec`

```sql
CREATE OR REPLACE FUNCTION public.sparsevec(sparsevec, integer, boolean)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec$function$

```

### `sparsevec_cmp`

**Argumentos:** `sparsevec, sparsevec`
**Retorno:** `integer`

```sql
CREATE OR REPLACE FUNCTION public.sparsevec_cmp(sparsevec, sparsevec)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_cmp$function$

```

### `sparsevec_eq`

**Argumentos:** `sparsevec, sparsevec`
**Retorno:** `boolean`

```sql
CREATE OR REPLACE FUNCTION public.sparsevec_eq(sparsevec, sparsevec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_eq$function$

```

### `sparsevec_ge`

**Argumentos:** `sparsevec, sparsevec`
**Retorno:** `boolean`

```sql
CREATE OR REPLACE FUNCTION public.sparsevec_ge(sparsevec, sparsevec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_ge$function$

```

### `sparsevec_gt`

**Argumentos:** `sparsevec, sparsevec`
**Retorno:** `boolean`

```sql
CREATE OR REPLACE FUNCTION public.sparsevec_gt(sparsevec, sparsevec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_gt$function$

```

### `sparsevec_in`

**Argumentos:** `cstring, oid, integer`
**Retorno:** `sparsevec`

```sql
CREATE OR REPLACE FUNCTION public.sparsevec_in(cstring, oid, integer)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_in$function$

```

### `sparsevec_l2_squared_distance`

**Argumentos:** `sparsevec, sparsevec`
**Retorno:** `double precision`

```sql
CREATE OR REPLACE FUNCTION public.sparsevec_l2_squared_distance(sparsevec, sparsevec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_l2_squared_distance$function$

```

### `sparsevec_le`

**Argumentos:** `sparsevec, sparsevec`
**Retorno:** `boolean`

```sql
CREATE OR REPLACE FUNCTION public.sparsevec_le(sparsevec, sparsevec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_le$function$

```

### `sparsevec_lt`

**Argumentos:** `sparsevec, sparsevec`
**Retorno:** `boolean`

```sql
CREATE OR REPLACE FUNCTION public.sparsevec_lt(sparsevec, sparsevec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_lt$function$

```

### `sparsevec_ne`

**Argumentos:** `sparsevec, sparsevec`
**Retorno:** `boolean`

```sql
CREATE OR REPLACE FUNCTION public.sparsevec_ne(sparsevec, sparsevec)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_ne$function$

```

### `sparsevec_negative_inner_product`

**Argumentos:** `sparsevec, sparsevec`
**Retorno:** `double precision`

```sql
CREATE OR REPLACE FUNCTION public.sparsevec_negative_inner_product(sparsevec, sparsevec)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_negative_inner_product$function$

```

### `sparsevec_out`

**Argumentos:** `sparsevec`
**Retorno:** `cstring`

```sql
CREATE OR REPLACE FUNCTION public.sparsevec_out(sparsevec)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_out$function$

```

### `sparsevec_recv`

**Argumentos:** `internal, oid, integer`
**Retorno:** `sparsevec`

```sql
CREATE OR REPLACE FUNCTION public.sparsevec_recv(internal, oid, integer)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_recv$function$

```

### `sparsevec_send`

**Argumentos:** `sparsevec`
**Retorno:** `bytea`

```sql
CREATE OR REPLACE FUNCTION public.sparsevec_send(sparsevec)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_send$function$

```

### `sparsevec_to_halfvec`

**Argumentos:** `sparsevec, integer, boolean`
**Retorno:** `halfvec`

```sql
CREATE OR REPLACE FUNCTION public.sparsevec_to_halfvec(sparsevec, integer, boolean)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_to_halfvec$function$

```

### `sparsevec_to_vector`

**Argumentos:** `sparsevec, integer, boolean`
**Retorno:** `vector`

```sql
CREATE OR REPLACE FUNCTION public.sparsevec_to_vector(sparsevec, integer, boolean)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_to_vector$function$

```

### `sparsevec_typmod_in`

**Argumentos:** `cstring[]`
**Retorno:** `integer`

```sql
CREATE OR REPLACE FUNCTION public.sparsevec_typmod_in(cstring[])
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$sparsevec_typmod_in$function$

```

### `strict_word_similarity`

**Argumentos:** `text, text`
**Retorno:** `real`

```sql
CREATE OR REPLACE FUNCTION public.strict_word_similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity$function$

```

### `strict_word_similarity_commutator_op`

**Argumentos:** `text, text`
**Retorno:** `boolean`

```sql
CREATE OR REPLACE FUNCTION public.strict_word_similarity_commutator_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_commutator_op$function$

```

### `strict_word_similarity_dist_commutator_op`

**Argumentos:** `text, text`
**Retorno:** `real`

```sql
CREATE OR REPLACE FUNCTION public.strict_word_similarity_dist_commutator_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_dist_commutator_op$function$

```

### `strict_word_similarity_dist_op`

**Argumentos:** `text, text`
**Retorno:** `real`

```sql
CREATE OR REPLACE FUNCTION public.strict_word_similarity_dist_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_dist_op$function$

```

### `strict_word_similarity_op`

**Argumentos:** `text, text`
**Retorno:** `boolean`

```sql
CREATE OR REPLACE FUNCTION public.strict_word_similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_op$function$

```

### `subvector`

**Argumentos:** `halfvec, integer, integer`
**Retorno:** `halfvec`

```sql
CREATE OR REPLACE FUNCTION public.subvector(halfvec, integer, integer)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_subvector$function$

```

### `subvector`

**Argumentos:** `vector, integer, integer`
**Retorno:** `vector`

```sql
CREATE OR REPLACE FUNCTION public.subvector(vector, integer, integer)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$subvector$function$

```

### `trigger_cleanup_old_dedup`

**Argumentos:** ``
**Retorno:** `trigger`

```sql
CREATE OR REPLACE FUNCTION public.trigger_cleanup_old_dedup()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Cleanup apenas se último cleanup foi há mais de 1 hora
  -- (para evitar executar em cada inserção)
  PERFORM public.cleanup_old_webhook_dedup(24);
  RETURN NEW;
END;
$function$

```

### `try_acquire_webhook_lock`

**Argumentos:** `p_client_id uuid, p_message_id text`
**Retorno:** `boolean`

```sql
CREATE OR REPLACE FUNCTION public.try_acquire_webhook_lock(p_client_id uuid, p_message_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  lock_key BIGINT;
  lock_acquired BOOLEAN;
BEGIN
  -- Generate 64-bit lock key from client_id + message_id hash
  -- This ensures consistent lock key for same message across requests
  lock_key := abs(hashtext(p_client_id::TEXT || ':' || p_message_id));

  -- Try to acquire advisory lock (non-blocking)
  -- Returns true if lock acquired, false if already locked
  lock_acquired := pg_try_advisory_lock(lock_key);

  IF lock_acquired THEN
    -- Lock acquired successfully! Mark message as processed atomically
    INSERT INTO public.webhook_dedup (
      client_id,
      message_id,
      dedup_key,
      processed_at
    ) VALUES (
      p_client_id,
      p_message_id,
      'processed:' || p_client_id::TEXT || ':' || p_message_id,
      now()
    )
    ON CONFLICT (client_id, message_id) DO NOTHING;

    -- Release lock immediately (we don't need to hold it)
    PERFORM pg_advisory_unlock(lock_key);

    RETURN true;  -- First time processing this message
  ELSE
    RETURN false;  -- Message is already being processed by another instance
  END IF;
END;
$function$

```

### `update_bot_configurations_updated_at`

**Argumentos:** ``
**Retorno:** `trigger`

```sql
CREATE OR REPLACE FUNCTION public.update_bot_configurations_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

### `update_client_secret`

**Argumentos:** `secret_id uuid, new_secret_value text`
**Retorno:** `boolean`

```sql
CREATE OR REPLACE FUNCTION public.update_client_secret(secret_id uuid, new_secret_value text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- CORREÇÃO: vault.update_secret aceita apenas 2 parâmetros (secret_id, secret)
  -- Não aceita name e description como parâmetros
  PERFORM vault.update_secret(secret_id, new_secret_value);

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao atualizar secret %: %', secret_id, SQLERRM;
    RETURN FALSE;
END;
$function$

```

### `update_clientes_whatsapp_updated_at`

**Argumentos:** ``
**Retorno:** `trigger`

```sql
CREATE OR REPLACE FUNCTION public.update_clientes_whatsapp_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

### `update_gateway_configurations_updated_at`

**Argumentos:** ``
**Retorno:** `trigger`

```sql
CREATE OR REPLACE FUNCTION public.update_gateway_configurations_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

### `update_interactive_flows_updated_at`

**Argumentos:** ``
**Retorno:** `trigger`

```sql
CREATE OR REPLACE FUNCTION public.update_interactive_flows_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$

```

### `update_plan_budgets_updated_at`

**Argumentos:** ``
**Retorno:** `trigger`

```sql
CREATE OR REPLACE FUNCTION public.update_plan_budgets_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

### `update_pricing_config_timestamp`

**Argumentos:** ``
**Retorno:** `trigger`

```sql
CREATE OR REPLACE FUNCTION public.update_pricing_config_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

### `update_shared_gateway_config_updated_at`

**Argumentos:** ``
**Retorno:** `trigger`

```sql
CREATE OR REPLACE FUNCTION public.update_shared_gateway_config_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

### `update_updated_at_column`

**Argumentos:** ``
**Retorno:** `trigger`

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

### `upsert_customer_safe`

**Argumentos:** `p_telefone numeric, p_nome text, p_client_id uuid`
**Retorno:** `TABLE(telefone numeric, nome text, status text, created_at timestamp with time zone, client_id uuid)`

```sql
CREATE OR REPLACE FUNCTION public.upsert_customer_safe(p_telefone numeric, p_nome text, p_client_id uuid)
 RETURNS TABLE(telefone numeric, nome text, status text, created_at timestamp with time zone, client_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Atomic upsert: Single operation, no race condition
  -- Preserves 'humano'/'transferido' status on conflict
  RETURN QUERY
  INSERT INTO clientes_whatsapp (telefone, nome, status, client_id, created_at)
  VALUES (
    p_telefone,
    p_nome,
    'fluxo_inicial',  -- Default status for new customers
    p_client_id,
    now()
  )
  ON CONFLICT (telefone, client_id) DO UPDATE SET
    -- CRITICAL: Preserve 'humano'/'transferido' status
    -- Only update to 'fluxo_inicial' if current status is not one of these
    status = CASE
      WHEN clientes_whatsapp.status IN ('humano', 'transferido')
      THEN clientes_whatsapp.status
      ELSE EXCLUDED.status
    END,
    -- Update name only if new name is provided and not empty
    nome = CASE
      WHEN EXCLUDED.nome IS NOT NULL AND EXCLUDED.nome != ''
      THEN EXCLUDED.nome
      ELSE clientes_whatsapp.nome
    END
  RETURNING *;
END;
$function$

```

### `upsert_pricing_config`

**Argumentos:** `p_client_id uuid, p_provider text, p_model text, p_prompt_price numeric, p_completion_price numeric, p_unit text DEFAULT 'per_1k_tokens'::text`
**Retorno:** `pricing_config`

```sql
CREATE OR REPLACE FUNCTION public.upsert_pricing_config(p_client_id uuid, p_provider text, p_model text, p_prompt_price numeric, p_completion_price numeric, p_unit text DEFAULT 'per_1k_tokens'::text)
 RETURNS pricing_config
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_config pricing_config;
BEGIN
  INSERT INTO pricing_config (
    client_id,
    provider,
    model,
    prompt_price,
    completion_price,
    unit,
    updated_at
  ) VALUES (
    p_client_id,
    p_provider,
    p_model,
    p_prompt_price,
    p_completion_price,
    p_unit,
    NOW()
  )
  ON CONFLICT (client_id, provider, model)
  DO UPDATE SET
    prompt_price = p_prompt_price,
    completion_price = p_completion_price,
    unit = p_unit,
    updated_at = NOW()
  RETURNING * INTO v_config;

  RETURN v_config;
END;
$function$

```

### `user_client_id`

**Argumentos:** ``
**Retorno:** `uuid`

```sql
CREATE OR REPLACE FUNCTION public.user_client_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT client_id 
  FROM public.user_profiles 
  WHERE id = auth.uid()
  LIMIT 1;
$function$

```

### `user_has_role`

**Argumentos:** `required_role text`
**Retorno:** `boolean`

```sql
CREATE OR REPLACE FUNCTION public.user_has_role(required_role text)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role = required_role
    AND is_active = true
  );
$function$

```

### `user_is_admin`

**Argumentos:** ``
**Retorno:** `boolean`

```sql
CREATE OR REPLACE FUNCTION public.user_is_admin()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'client_admin')
    AND is_active = true
  );
$function$

```

### `vector`

**Argumentos:** `vector, integer, boolean`
**Retorno:** `vector`

```sql
CREATE OR REPLACE FUNCTION public.vector(vector, integer, boolean)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector$function$

```

### `vector_accum`

**Argumentos:** `double precision[], vector`
**Retorno:** `double precision[]`

```sql
CREATE OR REPLACE FUNCTION public.vector_accum(double precision[], vector)
 RETURNS double precision[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_accum$function$

```

### `vector_add`

**Argumentos:** `vector, vector`
**Retorno:** `vector`

```sql
CREATE OR REPLACE FUNCTION public.vector_add(vector, vector)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_add$function$

```

### `vector_avg`

**Argumentos:** `double precision[]`
**Retorno:** `vector`

```sql
CREATE OR REPLACE FUNCTION public.vector_avg(double precision[])
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_avg$function$

```

### `vector_cmp`

**Argumentos:** `vector, vector`
**Retorno:** `integer`

```sql
CREATE OR REPLACE FUNCTION public.vector_cmp(vector, vector)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_cmp$function$

```

### `vector_combine`

**Argumentos:** `double precision[], double precision[]`
**Retorno:** `double precision[]`

```sql
CREATE OR REPLACE FUNCTION public.vector_combine(double precision[], double precision[])
 RETURNS double precision[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_combine$function$

```

### `vector_concat`

**Argumentos:** `vector, vector`
**Retorno:** `vector`

```sql
CREATE OR REPLACE FUNCTION public.vector_concat(vector, vector)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_concat$function$

```

### `vector_dims`

**Argumentos:** `vector`
**Retorno:** `integer`

```sql
CREATE OR REPLACE FUNCTION public.vector_dims(vector)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_dims$function$

```

### `vector_dims`

**Argumentos:** `halfvec`
**Retorno:** `integer`

```sql
CREATE OR REPLACE FUNCTION public.vector_dims(halfvec)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$halfvec_vector_dims$function$

```

### `vector_eq`

**Argumentos:** `vector, vector`
**Retorno:** `boolean`

```sql
CREATE OR REPLACE FUNCTION public.vector_eq(vector, vector)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_eq$function$

```

### `vector_ge`

**Argumentos:** `vector, vector`
**Retorno:** `boolean`

```sql
CREATE OR REPLACE FUNCTION public.vector_ge(vector, vector)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_ge$function$

```

### `vector_gt`

**Argumentos:** `vector, vector`
**Retorno:** `boolean`

```sql
CREATE OR REPLACE FUNCTION public.vector_gt(vector, vector)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_gt$function$

```

### `vector_in`

**Argumentos:** `cstring, oid, integer`
**Retorno:** `vector`

```sql
CREATE OR REPLACE FUNCTION public.vector_in(cstring, oid, integer)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_in$function$

```

### `vector_l2_squared_distance`

**Argumentos:** `vector, vector`
**Retorno:** `double precision`

```sql
CREATE OR REPLACE FUNCTION public.vector_l2_squared_distance(vector, vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_l2_squared_distance$function$

```

### `vector_le`

**Argumentos:** `vector, vector`
**Retorno:** `boolean`

```sql
CREATE OR REPLACE FUNCTION public.vector_le(vector, vector)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_le$function$

```

### `vector_lt`

**Argumentos:** `vector, vector`
**Retorno:** `boolean`

```sql
CREATE OR REPLACE FUNCTION public.vector_lt(vector, vector)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_lt$function$

```

### `vector_mul`

**Argumentos:** `vector, vector`
**Retorno:** `vector`

```sql
CREATE OR REPLACE FUNCTION public.vector_mul(vector, vector)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_mul$function$

```

### `vector_ne`

**Argumentos:** `vector, vector`
**Retorno:** `boolean`

```sql
CREATE OR REPLACE FUNCTION public.vector_ne(vector, vector)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_ne$function$

```

### `vector_negative_inner_product`

**Argumentos:** `vector, vector`
**Retorno:** `double precision`

```sql
CREATE OR REPLACE FUNCTION public.vector_negative_inner_product(vector, vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_negative_inner_product$function$

```

### `vector_norm`

**Argumentos:** `vector`
**Retorno:** `double precision`

```sql
CREATE OR REPLACE FUNCTION public.vector_norm(vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_norm$function$

```

### `vector_out`

**Argumentos:** `vector`
**Retorno:** `cstring`

```sql
CREATE OR REPLACE FUNCTION public.vector_out(vector)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_out$function$

```

### `vector_recv`

**Argumentos:** `internal, oid, integer`
**Retorno:** `vector`

```sql
CREATE OR REPLACE FUNCTION public.vector_recv(internal, oid, integer)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_recv$function$

```

### `vector_send`

**Argumentos:** `vector`
**Retorno:** `bytea`

```sql
CREATE OR REPLACE FUNCTION public.vector_send(vector)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_send$function$

```

### `vector_spherical_distance`

**Argumentos:** `vector, vector`
**Retorno:** `double precision`

```sql
CREATE OR REPLACE FUNCTION public.vector_spherical_distance(vector, vector)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_spherical_distance$function$

```

### `vector_sub`

**Argumentos:** `vector, vector`
**Retorno:** `vector`

```sql
CREATE OR REPLACE FUNCTION public.vector_sub(vector, vector)
 RETURNS vector
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_sub$function$

```

### `vector_to_float4`

**Argumentos:** `vector, integer, boolean`
**Retorno:** `real[]`

```sql
CREATE OR REPLACE FUNCTION public.vector_to_float4(vector, integer, boolean)
 RETURNS real[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_to_float4$function$

```

### `vector_to_halfvec`

**Argumentos:** `vector, integer, boolean`
**Retorno:** `halfvec`

```sql
CREATE OR REPLACE FUNCTION public.vector_to_halfvec(vector, integer, boolean)
 RETURNS halfvec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_to_halfvec$function$

```

### `vector_to_sparsevec`

**Argumentos:** `vector, integer, boolean`
**Retorno:** `sparsevec`

```sql
CREATE OR REPLACE FUNCTION public.vector_to_sparsevec(vector, integer, boolean)
 RETURNS sparsevec
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_to_sparsevec$function$

```

### `vector_typmod_in`

**Argumentos:** `cstring[]`
**Retorno:** `integer`

```sql
CREATE OR REPLACE FUNCTION public.vector_typmod_in(cstring[])
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/vector', $function$vector_typmod_in$function$

```

### `word_similarity`

**Argumentos:** `text, text`
**Retorno:** `real`

```sql
CREATE OR REPLACE FUNCTION public.word_similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity$function$

```

### `word_similarity_commutator_op`

**Argumentos:** `text, text`
**Retorno:** `boolean`

```sql
CREATE OR REPLACE FUNCTION public.word_similarity_commutator_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_commutator_op$function$

```

### `word_similarity_dist_commutator_op`

**Argumentos:** `text, text`
**Retorno:** `real`

```sql
CREATE OR REPLACE FUNCTION public.word_similarity_dist_commutator_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_dist_commutator_op$function$

```

### `word_similarity_dist_op`

**Argumentos:** `text, text`
**Retorno:** `real`

```sql
CREATE OR REPLACE FUNCTION public.word_similarity_dist_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_dist_op$function$

```

### `word_similarity_op`

**Argumentos:** `text, text`
**Retorno:** `boolean`

```sql
CREATE OR REPLACE FUNCTION public.word_similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_op$function$

```

## 🔗 Constraints (294)

### `ai_models_registry`

- **2200_41441_1_not_null** (CHECK)
  - Coluna: `null`

- **2200_41441_2_not_null** (CHECK)
  - Coluna: `null`

- **2200_41441_3_not_null** (CHECK)
  - Coluna: `null`

- **2200_41441_4_not_null** (CHECK)
  - Coluna: `null`

- **2200_41441_5_not_null** (CHECK)
  - Coluna: `null`

- **2200_41441_8_not_null** (CHECK)
  - Coluna: `null`

- **2200_41441_9_not_null** (CHECK)
  - Coluna: `null`

- **ai_models_registry_gateway_identifier_key** (UNIQUE)
  - Coluna: `gateway_identifier`
  - Referencia: `ai_models_registry.gateway_identifier`

- **ai_models_registry_provider_model_name_key** (UNIQUE)
  - Coluna: `provider`
  - Referencia: `ai_models_registry.model_name`

- **ai_models_registry_provider_model_name_key** (UNIQUE)
  - Coluna: `provider`
  - Referencia: `ai_models_registry.provider`

- **ai_models_registry_provider_model_name_key** (UNIQUE)
  - Coluna: `model_name`
  - Referencia: `ai_models_registry.model_name`

- **ai_models_registry_provider_model_name_key** (UNIQUE)
  - Coluna: `model_name`
  - Referencia: `ai_models_registry.provider`

### `audit_logs`

- **2200_18275_14_not_null** (CHECK)
  - Coluna: `null`

- **2200_18275_1_not_null** (CHECK)
  - Coluna: `null`

- **2200_18275_2_not_null** (CHECK)
  - Coluna: `null`

- **2200_18275_7_not_null** (CHECK)
  - Coluna: `null`

- **2200_18275_8_not_null** (CHECK)
  - Coluna: `null`

- **audit_logs_user_id_fkey1** (FOREIGN KEY)
  - Coluna: `user_id`

- **valid_action** (CHECK)
  - Coluna: `null`
  - Referencia: `audit_logs_backup_poker_system.action`

- **valid_action** (CHECK)
  - Coluna: `null`
  - Referencia: `audit_logs.action`

- **valid_status** (CHECK)
  - Coluna: `null`
  - Referencia: `audit_logs_backup_poker_system.status`

- **valid_status** (CHECK)
  - Coluna: `null`
  - Referencia: `audit_logs.status`

- **valid_status** (CHECK)
  - Coluna: `null`
  - Referencia: `clients.status`

### `audit_logs_backup_poker_system`

- **2200_18285_14_not_null** (CHECK)
  - Coluna: `null`

- **2200_18285_1_not_null** (CHECK)
  - Coluna: `null`

- **2200_18285_2_not_null** (CHECK)
  - Coluna: `null`

- **2200_18285_7_not_null** (CHECK)
  - Coluna: `null`

- **2200_18285_8_not_null** (CHECK)
  - Coluna: `null`

- **audit_logs_user_id_fkey** (FOREIGN KEY)
  - Coluna: `user_id`

- **valid_action** (CHECK)
  - Coluna: `null`
  - Referencia: `audit_logs_backup_poker_system.action`

- **valid_action** (CHECK)
  - Coluna: `null`
  - Referencia: `audit_logs.action`

- **valid_status** (CHECK)
  - Coluna: `null`
  - Referencia: `audit_logs_backup_poker_system.status`

- **valid_status** (CHECK)
  - Coluna: `null`
  - Referencia: `clients.status`

- **valid_status** (CHECK)
  - Coluna: `null`
  - Referencia: `audit_logs.status`

### `bot_configurations`

- **2200_18295_1_not_null** (CHECK)
  - Coluna: `null`

- **2200_18295_3_not_null** (CHECK)
  - Coluna: `null`

- **2200_18295_4_not_null** (CHECK)
  - Coluna: `null`

- **bot_configurations_client_id_config_key_key** (UNIQUE)
  - Coluna: `client_id`
  - Referencia: `bot_configurations.client_id`

- **bot_configurations_client_id_config_key_key** (UNIQUE)
  - Coluna: `client_id`
  - Referencia: `bot_configurations.config_key`

- **bot_configurations_client_id_config_key_key** (UNIQUE)
  - Coluna: `config_key`
  - Referencia: `bot_configurations.client_id`

- **bot_configurations_client_id_config_key_key** (UNIQUE)
  - Coluna: `config_key`
  - Referencia: `bot_configurations.config_key`

### `client_budgets`

- **2200_41314_1_not_null** (CHECK)
  - Coluna: `null`

- **2200_41314_2_not_null** (CHECK)
  - Coluna: `null`

- **2200_41314_5_not_null** (CHECK)
  - Coluna: `null`

- **client_budgets_brl_limit_check** (CHECK)
  - Coluna: `null`
  - Referencia: `client_budgets.brl_limit`

- **client_budgets_brl_usage_percentage_check** (CHECK)
  - Coluna: `null`
  - Referencia: `client_budgets.brl_usage_percentage`

- **client_budgets_budget_limit_check** (CHECK)
  - Coluna: `null`
  - Referencia: `client_budgets.budget_limit`

- **client_budgets_budget_mode_check** (CHECK)
  - Coluna: `null`
  - Referencia: `client_budgets.budget_mode`

- **client_budgets_budget_period_check** (CHECK)
  - Coluna: `null`
  - Referencia: `client_budgets.budget_period`

- **client_budgets_budget_type_check** (CHECK)
  - Coluna: `null`
  - Referencia: `client_budgets.budget_type`

- **client_budgets_client_id_fkey** (FOREIGN KEY)
  - Coluna: `client_id`
  - Referencia: `clients.id`

- **client_budgets_client_id_key** (UNIQUE)
  - Coluna: `client_id`
  - Referencia: `client_budgets.client_id`

- **client_budgets_current_brl_check** (CHECK)
  - Coluna: `null`
  - Referencia: `client_budgets.current_brl`

- **client_budgets_current_tokens_check** (CHECK)
  - Coluna: `null`
  - Referencia: `client_budgets.current_tokens`

- **client_budgets_current_usage_check** (CHECK)
  - Coluna: `null`
  - Referencia: `client_budgets.current_usage`

- **client_budgets_pause_reason_check** (CHECK)
  - Coluna: `null`
  - Referencia: `client_budgets.pause_reason`

- **client_budgets_token_limit_check** (CHECK)
  - Coluna: `null`
  - Referencia: `client_budgets.token_limit`

- **client_budgets_token_usage_percentage_check** (CHECK)
  - Coluna: `null`
  - Referencia: `client_budgets.token_usage_percentage`

- **client_budgets_usage_percentage_check** (CHECK)
  - Coluna: `null`
  - Referencia: `client_budgets.usage_percentage`

### `clientes_whatsapp`

- **2200_18260_1_not_null** (CHECK)
  - Coluna: `null`

- **2200_18260_4_not_null** (CHECK)
  - Coluna: `null`

- **2200_18260_5_not_null** (CHECK)
  - Coluna: `null`

- **clientes_whatsapp_audio_preference_check** (CHECK)
  - Coluna: `null`
  - Referencia: `clientes_whatsapp.audio_preference`

- **clientes_whatsapp_status_check** (CHECK)
  - Coluna: `null`
  - Referencia: `clientes_whatsapp.status`

- **clientes_whatsapp_transferred_by_fkey** (FOREIGN KEY)
  - Coluna: `transferred_by`

### `clients`

- **2200_18880_14_not_null** (CHECK)
  - Coluna: `null`

- **2200_18880_1_not_null** (CHECK)
  - Coluna: `null`

- **2200_18880_22_not_null** (CHECK)
  - Coluna: `null`

- **2200_18880_2_not_null** (CHECK)
  - Coluna: `null`

- **2200_18880_36_not_null** (CHECK)
  - Coluna: `null`

- **2200_18880_3_not_null** (CHECK)
  - Coluna: `null`

- **2200_18880_4_not_null** (CHECK)
  - Coluna: `null`

- **2200_18880_5_not_null** (CHECK)
  - Coluna: `null`

- **2200_18880_6_not_null** (CHECK)
  - Coluna: `null`

- **2200_18880_7_not_null** (CHECK)
  - Coluna: `null`

- **2200_18880_8_not_null** (CHECK)
  - Coluna: `null`

- **clients_ai_keys_mode_check** (CHECK)
  - Coluna: `null`
  - Referencia: `clients.ai_keys_mode`

- **clients_gateway_api_key_secret_id_fkey** (FOREIGN KEY)
  - Coluna: `gateway_api_key_secret_id`

- **clients_primary_model_provider_check** (CHECK)
  - Coluna: `null`
  - Referencia: `clients.primary_model_provider`

- **clients_slug_key** (UNIQUE)
  - Coluna: `slug`
  - Referencia: `clients.slug`

- **clients_tts_model_check** (CHECK)
  - Coluna: `null`
  - Referencia: `clients.tts_model`

- **clients_tts_provider_check** (CHECK)
  - Coluna: `null`
  - Referencia: `clients.tts_provider`

- **clients_tts_speed_check** (CHECK)
  - Coluna: `null`
  - Referencia: `clients.tts_speed`

- **valid_plan** (CHECK)
  - Coluna: `null`
  - Referencia: `clients.plan`

- **valid_status** (CHECK)
  - Coluna: `null`
  - Referencia: `audit_logs.status`

- **valid_status** (CHECK)
  - Coluna: `null`
  - Referencia: `clients.status`

- **valid_status** (CHECK)
  - Coluna: `null`
  - Referencia: `audit_logs_backup_poker_system.status`

### `conversations`

- **2200_18321_1_not_null** (CHECK)
  - Coluna: `null`

- **2200_18321_3_not_null** (CHECK)
  - Coluna: `null`

- **conversations_client_id_phone_key** (UNIQUE)
  - Coluna: `phone`
  - Referencia: `conversations.phone`

- **conversations_client_id_phone_key** (UNIQUE)
  - Coluna: `client_id`
  - Referencia: `conversations.client_id`

- **conversations_client_id_phone_key** (UNIQUE)
  - Coluna: `client_id`
  - Referencia: `conversations.phone`

- **conversations_client_id_phone_key** (UNIQUE)
  - Coluna: `phone`
  - Referencia: `conversations.client_id`

- **conversations_status_check** (CHECK)
  - Coluna: `null`
  - Referencia: `conversations.status`

### `documents`

- **2200_18331_1_not_null** (CHECK)
  - Coluna: `null`

- **2200_18331_5_not_null** (CHECK)
  - Coluna: `null`

### `execution_logs`

- **2200_18337_11_not_null** (CHECK)
  - Coluna: `null`

- **2200_18337_1_not_null** (CHECK)
  - Coluna: `null`

- **2200_18337_2_not_null** (CHECK)
  - Coluna: `null`

- **2200_18337_3_not_null** (CHECK)
  - Coluna: `null`

- **2200_18337_7_not_null** (CHECK)
  - Coluna: `null`

- **2200_18337_9_not_null** (CHECK)
  - Coluna: `null`

- **execution_logs_status_check** (CHECK)
  - Coluna: `null`
  - Referencia: `execution_logs.status`

### `flow_executions`

- **2200_34585_10_not_null** (CHECK)
  - Coluna: `null`

- **2200_34585_1_not_null** (CHECK)
  - Coluna: `null`

- **2200_34585_2_not_null** (CHECK)
  - Coluna: `null`

- **2200_34585_3_not_null** (CHECK)
  - Coluna: `null`

- **2200_34585_4_not_null** (CHECK)
  - Coluna: `null`

- **2200_34585_5_not_null** (CHECK)
  - Coluna: `null`

- **2200_34585_8_not_null** (CHECK)
  - Coluna: `null`

- **2200_34585_9_not_null** (CHECK)
  - Coluna: `null`

- **flow_executions_client_id_fkey** (FOREIGN KEY)
  - Coluna: `client_id`
  - Referencia: `clients.id`

- **flow_executions_flow_id_fkey** (FOREIGN KEY)
  - Coluna: `flow_id`
  - Referencia: `interactive_flows.id`

- **flow_executions_status_check** (CHECK)
  - Coluna: `null`
  - Referencia: `flow_executions.status`

- **valid_history** (CHECK)
  - Coluna: `null`
  - Referencia: `flow_executions.history`

- **valid_variables** (CHECK)
  - Coluna: `null`
  - Referencia: `flow_executions.variables`

### `gateway_cache_performance`

- **2200_41503_1_not_null** (CHECK)
  - Coluna: `null`

- **2200_41503_2_not_null** (CHECK)
  - Coluna: `null`

- **2200_41503_3_not_null** (CHECK)
  - Coluna: `null`

- **2200_41503_5_not_null** (CHECK)
  - Coluna: `null`

- **2200_41503_6_not_null** (CHECK)
  - Coluna: `null`

- **2200_41503_7_not_null** (CHECK)
  - Coluna: `null`

- **2200_41503_9_not_null** (CHECK)
  - Coluna: `null`

- **gateway_cache_performance_client_id_date_hour_key** (UNIQUE)
  - Coluna: `client_id`
  - Referencia: `gateway_cache_performance.client_id`

- **gateway_cache_performance_client_id_date_hour_key** (UNIQUE)
  - Coluna: `hour`
  - Referencia: `gateway_cache_performance.hour`

- **gateway_cache_performance_client_id_date_hour_key** (UNIQUE)
  - Coluna: `hour`
  - Referencia: `gateway_cache_performance.date`

- **gateway_cache_performance_client_id_date_hour_key** (UNIQUE)
  - Coluna: `hour`
  - Referencia: `gateway_cache_performance.client_id`

- **gateway_cache_performance_client_id_date_hour_key** (UNIQUE)
  - Coluna: `date`
  - Referencia: `gateway_cache_performance.hour`

- **gateway_cache_performance_client_id_date_hour_key** (UNIQUE)
  - Coluna: `date`
  - Referencia: `gateway_cache_performance.date`

- **gateway_cache_performance_client_id_date_hour_key** (UNIQUE)
  - Coluna: `date`
  - Referencia: `gateway_cache_performance.client_id`

- **gateway_cache_performance_client_id_date_hour_key** (UNIQUE)
  - Coluna: `client_id`
  - Referencia: `gateway_cache_performance.hour`

- **gateway_cache_performance_client_id_date_hour_key** (UNIQUE)
  - Coluna: `client_id`
  - Referencia: `gateway_cache_performance.date`

- **gateway_cache_performance_client_id_fkey** (FOREIGN KEY)
  - Coluna: `client_id`
  - Referencia: `clients.id`

### `gateway_usage_logs`

- **2200_41462_10_not_null** (CHECK)
  - Coluna: `null`

- **2200_41462_12_not_null** (CHECK)
  - Coluna: `null`

- **2200_41462_1_not_null** (CHECK)
  - Coluna: `null`

- **2200_41462_2_not_null** (CHECK)
  - Coluna: `null`

- **2200_41462_7_not_null** (CHECK)
  - Coluna: `null`

- **2200_41462_8_not_null** (CHECK)
  - Coluna: `null`

- **2200_41462_9_not_null** (CHECK)
  - Coluna: `null`

- **gateway_usage_logs_api_type_check** (CHECK)
  - Coluna: `null`
  - Referencia: `gateway_usage_logs.api_type`

- **gateway_usage_logs_client_id_fkey** (FOREIGN KEY)
  - Coluna: `client_id`
  - Referencia: `clients.id`

- **gateway_usage_logs_conversation_id_fkey** (FOREIGN KEY)
  - Coluna: `conversation_id`
  - Referencia: `conversations.id`

- **gateway_usage_logs_model_registry_id_fkey** (FOREIGN KEY)
  - Coluna: `model_registry_id`
  - Referencia: `ai_models_registry.id`

### `interactive_flows`

- **2200_34558_10_not_null** (CHECK)
  - Coluna: `null`

- **2200_34558_11_not_null** (CHECK)
  - Coluna: `null`

- **2200_34558_13_not_null** (CHECK)
  - Coluna: `null`

- **2200_34558_14_not_null** (CHECK)
  - Coluna: `null`

- **2200_34558_1_not_null** (CHECK)
  - Coluna: `null`

- **2200_34558_2_not_null** (CHECK)
  - Coluna: `null`

- **2200_34558_3_not_null** (CHECK)
  - Coluna: `null`

- **2200_34558_6_not_null** (CHECK)
  - Coluna: `null`

- **2200_34558_9_not_null** (CHECK)
  - Coluna: `null`

- **interactive_flows_client_id_fkey** (FOREIGN KEY)
  - Coluna: `client_id`
  - Referencia: `clients.id`

- **interactive_flows_created_by_fkey** (FOREIGN KEY)
  - Coluna: `created_by`

- **interactive_flows_trigger_type_check** (CHECK)
  - Coluna: `null`
  - Referencia: `interactive_flows.trigger_type`

- **non_empty_name** (CHECK)
  - Coluna: `null`
  - Referencia: `interactive_flows.name`

- **valid_blocks** (CHECK)
  - Coluna: `null`
  - Referencia: `interactive_flows.blocks`

- **valid_edges** (CHECK)
  - Coluna: `null`
  - Referencia: `interactive_flows.edges`

### `message_templates`

- **2200_46085_10_not_null** (CHECK)
  - Coluna: `null`

- **2200_46085_12_not_null** (CHECK)
  - Coluna: `null`

- **2200_46085_13_not_null** (CHECK)
  - Coluna: `null`

- **2200_46085_1_not_null** (CHECK)
  - Coluna: `null`

- **2200_46085_2_not_null** (CHECK)
  - Coluna: `null`

- **2200_46085_5_not_null** (CHECK)
  - Coluna: `null`

- **2200_46085_6_not_null** (CHECK)
  - Coluna: `null`

- **2200_46085_7_not_null** (CHECK)
  - Coluna: `null`

- **2200_46085_8_not_null** (CHECK)
  - Coluna: `null`

- **2200_46085_9_not_null** (CHECK)
  - Coluna: `null`

- **message_templates_category_check** (CHECK)
  - Coluna: `null`
  - Referencia: `message_templates.category`

- **message_templates_client_id_fkey** (FOREIGN KEY)
  - Coluna: `client_id`
  - Referencia: `clients.id`

- **message_templates_client_id_name_language_key** (UNIQUE)
  - Coluna: `name`
  - Referencia: `message_templates.client_id`

- **message_templates_client_id_name_language_key** (UNIQUE)
  - Coluna: `language`
  - Referencia: `message_templates.name`

- **message_templates_client_id_name_language_key** (UNIQUE)
  - Coluna: `language`
  - Referencia: `message_templates.language`

- **message_templates_client_id_name_language_key** (UNIQUE)
  - Coluna: `language`
  - Referencia: `message_templates.client_id`

- **message_templates_client_id_name_language_key** (UNIQUE)
  - Coluna: `name`
  - Referencia: `message_templates.name`

- **message_templates_client_id_name_language_key** (UNIQUE)
  - Coluna: `name`
  - Referencia: `message_templates.language`

- **message_templates_client_id_name_language_key** (UNIQUE)
  - Coluna: `client_id`
  - Referencia: `message_templates.name`

- **message_templates_client_id_name_language_key** (UNIQUE)
  - Coluna: `client_id`
  - Referencia: `message_templates.language`

- **message_templates_client_id_name_language_key** (UNIQUE)
  - Coluna: `client_id`
  - Referencia: `message_templates.client_id`

- **message_templates_created_by_fkey** (FOREIGN KEY)
  - Coluna: `created_by`

- **message_templates_status_check** (CHECK)
  - Coluna: `null`
  - Referencia: `message_templates.status`

### `messages`

- **2200_18346_1_not_null** (CHECK)
  - Coluna: `null`

- **2200_18346_4_not_null** (CHECK)
  - Coluna: `null`

- **2200_18346_6_not_null** (CHECK)
  - Coluna: `null`

- **2200_18346_8_not_null** (CHECK)
  - Coluna: `null`

- **messages_conversation_id_fkey** (FOREIGN KEY)
  - Coluna: `conversation_id`
  - Referencia: `conversations.id`

- **messages_direction_check** (CHECK)
  - Coluna: `null`
  - Referencia: `messages.direction`

- **messages_media_type_check** (CHECK)
  - Coluna: `null`
  - Referencia: `messages.media_type`

- **messages_status_check** (CHECK)
  - Coluna: `null`
  - Referencia: `messages.status`

- **messages_type_check** (CHECK)
  - Coluna: `null`
  - Referencia: `messages.type`

### `n8n_chat_histories`

- **2200_18358_1_not_null** (CHECK)
  - Coluna: `null`

- **2200_18358_2_not_null** (CHECK)
  - Coluna: `null`

- **2200_18358_3_not_null** (CHECK)
  - Coluna: `null`

- **2200_18358_5_not_null** (CHECK)
  - Coluna: `null`

- **n8n_chat_histories_client_wamid_unique** (UNIQUE)
  - Coluna: `client_id`
  - Referencia: `n8n_chat_histories.wamid`

- **n8n_chat_histories_client_wamid_unique** (UNIQUE)
  - Coluna: `wamid`
  - Referencia: `n8n_chat_histories.wamid`

- **n8n_chat_histories_client_wamid_unique** (UNIQUE)
  - Coluna: `wamid`
  - Referencia: `n8n_chat_histories.client_id`

- **n8n_chat_histories_client_wamid_unique** (UNIQUE)
  - Coluna: `client_id`
  - Referencia: `n8n_chat_histories.client_id`

- **n8n_chat_histories_status_check** (CHECK)
  - Coluna: `null`
  - Referencia: `n8n_chat_histories.status`

### `plan_budgets`

- **2200_41290_1_not_null** (CHECK)
  - Coluna: `null`

- **2200_41290_2_not_null** (CHECK)
  - Coluna: `null`

- **2200_41290_3_not_null** (CHECK)
  - Coluna: `null`

- **2200_41290_4_not_null** (CHECK)
  - Coluna: `null`

- **2200_41290_5_not_null** (CHECK)
  - Coluna: `null`

- **plan_budgets_budget_limit_check** (CHECK)
  - Coluna: `null`
  - Referencia: `plan_budgets.budget_limit`

- **plan_budgets_budget_period_check** (CHECK)
  - Coluna: `null`
  - Referencia: `plan_budgets.budget_period`

- **plan_budgets_budget_type_check** (CHECK)
  - Coluna: `null`
  - Referencia: `plan_budgets.budget_type`

- **plan_budgets_plan_name_key** (UNIQUE)
  - Coluna: `plan_name`
  - Referencia: `plan_budgets.plan_name`

### `pricing_config`

- **2200_18245_1_not_null** (CHECK)
  - Coluna: `null`

- **2200_18245_2_not_null** (CHECK)
  - Coluna: `null`

- **2200_18245_3_not_null** (CHECK)
  - Coluna: `null`

- **2200_18245_4_not_null** (CHECK)
  - Coluna: `null`

- **2200_18245_5_not_null** (CHECK)
  - Coluna: `null`

- **2200_18245_6_not_null** (CHECK)
  - Coluna: `null`

- **pricing_config_client_id_provider_model_key** (UNIQUE)
  - Coluna: `provider`
  - Referencia: `pricing_config.client_id`

- **pricing_config_client_id_provider_model_key** (UNIQUE)
  - Coluna: `model`
  - Referencia: `pricing_config.provider`

- **pricing_config_client_id_provider_model_key** (UNIQUE)
  - Coluna: `model`
  - Referencia: `pricing_config.model`

- **pricing_config_client_id_provider_model_key** (UNIQUE)
  - Coluna: `model`
  - Referencia: `pricing_config.client_id`

- **pricing_config_client_id_provider_model_key** (UNIQUE)
  - Coluna: `provider`
  - Referencia: `pricing_config.provider`

- **pricing_config_client_id_provider_model_key** (UNIQUE)
  - Coluna: `client_id`
  - Referencia: `pricing_config.client_id`

- **pricing_config_client_id_provider_model_key** (UNIQUE)
  - Coluna: `client_id`
  - Referencia: `pricing_config.model`

- **pricing_config_client_id_provider_model_key** (UNIQUE)
  - Coluna: `client_id`
  - Referencia: `pricing_config.provider`

- **pricing_config_client_id_provider_model_key** (UNIQUE)
  - Coluna: `provider`
  - Referencia: `pricing_config.model`

### `push_tokens`

- **2200_20378_1_not_null** (CHECK)
  - Coluna: `null`

- **2200_20378_2_not_null** (CHECK)
  - Coluna: `null`

- **2200_20378_3_not_null** (CHECK)
  - Coluna: `null`

- **2200_20378_4_not_null** (CHECK)
  - Coluna: `null`

- **push_tokens_platform_check** (CHECK)
  - Coluna: `null`
  - Referencia: `push_tokens.platform`

- **push_tokens_token_key** (UNIQUE)
  - Coluna: `token`
  - Referencia: `push_tokens.token`

- **push_tokens_user_id_fkey** (FOREIGN KEY)
  - Coluna: `user_id`

### `shared_gateway_config`

- **2200_42816_1_not_null** (CHECK)
  - Coluna: `null`

- **shared_gateway_config_anthropic_api_key_secret_id_fkey** (FOREIGN KEY)
  - Coluna: `anthropic_api_key_secret_id`

- **shared_gateway_config_gateway_api_key_secret_id_fkey** (FOREIGN KEY)
  - Coluna: `gateway_api_key_secret_id`

- **shared_gateway_config_google_api_key_secret_id_fkey** (FOREIGN KEY)
  - Coluna: `google_api_key_secret_id`

- **shared_gateway_config_groq_api_key_secret_id_fkey** (FOREIGN KEY)
  - Coluna: `groq_api_key_secret_id`

- **shared_gateway_config_openai_api_key_secret_id_fkey** (FOREIGN KEY)
  - Coluna: `openai_api_key_secret_id`

### `tts_cache`

- **2200_32616_1_not_null** (CHECK)
  - Coluna: `null`

- **2200_32616_2_not_null** (CHECK)
  - Coluna: `null`

- **2200_32616_3_not_null** (CHECK)
  - Coluna: `null`

- **2200_32616_4_not_null** (CHECK)
  - Coluna: `null`

- **2200_32616_6_not_null** (CHECK)
  - Coluna: `null`

- **2200_32616_7_not_null** (CHECK)
  - Coluna: `null`

- **tts_cache_client_id_fkey** (FOREIGN KEY)
  - Coluna: `client_id`
  - Referencia: `clients.id`

- **tts_cache_client_id_text_hash_key** (UNIQUE)
  - Coluna: `text_hash`
  - Referencia: `tts_cache.text_hash`

- **tts_cache_client_id_text_hash_key** (UNIQUE)
  - Coluna: `client_id`
  - Referencia: `tts_cache.client_id`

- **tts_cache_client_id_text_hash_key** (UNIQUE)
  - Coluna: `client_id`
  - Referencia: `tts_cache.text_hash`

- **tts_cache_client_id_text_hash_key** (UNIQUE)
  - Coluna: `text_hash`
  - Referencia: `tts_cache.client_id`

### `tts_usage_logs`

- **2200_32702_1_not_null** (CHECK)
  - Coluna: `null`

- **2200_32702_2_not_null** (CHECK)
  - Coluna: `null`

- **2200_32702_3_not_null** (CHECK)
  - Coluna: `null`

- **2200_32702_4_not_null** (CHECK)
  - Coluna: `null`

- **2200_32702_5_not_null** (CHECK)
  - Coluna: `null`

- **tts_usage_logs_client_id_fkey** (FOREIGN KEY)
  - Coluna: `client_id`
  - Referencia: `clients.id`

- **tts_usage_logs_event_type_check** (CHECK)
  - Coluna: `null`
  - Referencia: `tts_usage_logs.event_type`

### `usage_logs`

- **2200_18370_1_not_null** (CHECK)
  - Coluna: `null`

- **2200_18370_4_not_null** (CHECK)
  - Coluna: `null`

- **2200_18370_5_not_null** (CHECK)
  - Coluna: `null`

- **usage_logs_conversation_id_fkey** (FOREIGN KEY)
  - Coluna: `conversation_id`
  - Referencia: `conversations.id`

- **usage_logs_source_check** (CHECK)
  - Coluna: `null`
  - Referencia: `usage_logs.source`

### `user_invites`

- **2200_18383_10_not_null** (CHECK)
  - Coluna: `null`

- **2200_18383_11_not_null** (CHECK)
  - Coluna: `null`

- **2200_18383_1_not_null** (CHECK)
  - Coluna: `null`

- **2200_18383_2_not_null** (CHECK)
  - Coluna: `null`

- **2200_18383_3_not_null** (CHECK)
  - Coluna: `null`

- **2200_18383_4_not_null** (CHECK)
  - Coluna: `null`

- **2200_18383_5_not_null** (CHECK)
  - Coluna: `null`

- **2200_18383_6_not_null** (CHECK)
  - Coluna: `null`

- **2200_18383_7_not_null** (CHECK)
  - Coluna: `null`

- **2200_18383_8_not_null** (CHECK)
  - Coluna: `null`

- **user_invites_invite_token_key** (UNIQUE)
  - Coluna: `invite_token`
  - Referencia: `user_invites.invite_token`

- **user_invites_invited_by_user_id_fkey** (FOREIGN KEY)
  - Coluna: `invited_by_user_id`
  - Referencia: `user_profiles.id`

- **user_invites_role_check** (CHECK)
  - Coluna: `null`
  - Referencia: `user_invites.role`

- **user_invites_status_check** (CHECK)
  - Coluna: `null`
  - Referencia: `user_invites.status`

### `user_profiles`

- **2200_18395_1_not_null** (CHECK)
  - Coluna: `null`

- **2200_18395_2_not_null** (CHECK)
  - Coluna: `null`

- **2200_18395_3_not_null** (CHECK)
  - Coluna: `null`

- **2200_18395_5_not_null** (CHECK)
  - Coluna: `null`

- **2200_18395_6_not_null** (CHECK)
  - Coluna: `null`

- **2200_18395_7_not_null** (CHECK)
  - Coluna: `null`

- **user_profiles_email_key** (UNIQUE)
  - Coluna: `email`
  - Referencia: `user_profiles.email`

- **user_profiles_id_fkey** (FOREIGN KEY)
  - Coluna: `id`

- **user_profiles_role_check** (CHECK)
  - Coluna: `null`
  - Referencia: `user_profiles.role`

### `webhook_dedup`

- **2200_18981_1_not_null** (CHECK)
  - Coluna: `null`

- **2200_18981_2_not_null** (CHECK)
  - Coluna: `null`

- **2200_18981_3_not_null** (CHECK)
  - Coluna: `null`

- **2200_18981_4_not_null** (CHECK)
  - Coluna: `null`

- **2200_18981_5_not_null** (CHECK)
  - Coluna: `null`

- **webhook_dedup_client_id_fkey** (FOREIGN KEY)
  - Coluna: `client_id`
  - Referencia: `clients.id`

- **webhook_dedup_dedup_key_key** (UNIQUE)
  - Coluna: `dedup_key`
  - Referencia: `webhook_dedup.dedup_key`

- **webhook_dedup_unique_key** (UNIQUE)
  - Coluna: `message_id`
  - Referencia: `webhook_dedup.client_id`

- **webhook_dedup_unique_key** (UNIQUE)
  - Coluna: `client_id`
  - Referencia: `webhook_dedup.message_id`

- **webhook_dedup_unique_key** (UNIQUE)
  - Coluna: `client_id`
  - Referencia: `webhook_dedup.client_id`

- **webhook_dedup_unique_key** (UNIQUE)
  - Coluna: `message_id`
  - Referencia: `webhook_dedup.message_id`

## 📇 Índices (182)

### `ai_models_registry`

- **ai_models_registry_gateway_identifier_key**
  ```sql
  CREATE UNIQUE INDEX ai_models_registry_gateway_identifier_key ON public.ai_models_registry USING btree (gateway_identifier)
  ```

- **ai_models_registry_pkey**
  ```sql
  CREATE UNIQUE INDEX ai_models_registry_pkey ON public.ai_models_registry USING btree (id)
  ```

- **ai_models_registry_provider_model_name_key**
  ```sql
  CREATE UNIQUE INDEX ai_models_registry_provider_model_name_key ON public.ai_models_registry USING btree (provider, model_name)
  ```

- **idx_ai_models_registry_gateway_identifier**
  ```sql
  CREATE INDEX idx_ai_models_registry_gateway_identifier ON public.ai_models_registry USING btree (gateway_identifier)
  ```

- **idx_ai_models_registry_is_active**
  ```sql
  CREATE INDEX idx_ai_models_registry_is_active ON public.ai_models_registry USING btree (is_active) WHERE (is_active = true)
  ```

- **idx_ai_models_registry_provider**
  ```sql
  CREATE INDEX idx_ai_models_registry_provider ON public.ai_models_registry USING btree (provider)
  ```

### `audit_logs`

- **audit_logs_pkey1**
  ```sql
  CREATE UNIQUE INDEX audit_logs_pkey1 ON public.audit_logs USING btree (id)
  ```

### `audit_logs_backup_poker_system`

- **audit_logs_pkey**
  ```sql
  CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs_backup_poker_system USING btree (id)
  ```

- **idx_audit_logs_action**
  ```sql
  CREATE INDEX idx_audit_logs_action ON public.audit_logs_backup_poker_system USING btree (action)
  ```

- **idx_audit_logs_client_activity**
  ```sql
  CREATE INDEX idx_audit_logs_client_activity ON public.audit_logs_backup_poker_system USING btree (client_id, created_at DESC) WHERE (client_id IS NOT NULL)
  ```

- **idx_audit_logs_client_id**
  ```sql
  CREATE INDEX idx_audit_logs_client_id ON public.audit_logs_backup_poker_system USING btree (client_id) WHERE (client_id IS NOT NULL)
  ```

- **idx_audit_logs_created_at**
  ```sql
  CREATE INDEX idx_audit_logs_created_at ON public.audit_logs_backup_poker_system USING btree (created_at DESC)
  ```

- **idx_audit_logs_resource**
  ```sql
  CREATE INDEX idx_audit_logs_resource ON public.audit_logs_backup_poker_system USING btree (resource_type, resource_id)
  ```

- **idx_audit_logs_user_activity**
  ```sql
  CREATE INDEX idx_audit_logs_user_activity ON public.audit_logs_backup_poker_system USING btree (user_id, created_at DESC) WHERE (user_id IS NOT NULL)
  ```

- **idx_audit_logs_user_id**
  ```sql
  CREATE INDEX idx_audit_logs_user_id ON public.audit_logs_backup_poker_system USING btree (user_id) WHERE (user_id IS NOT NULL)
  ```

### `bot_configurations`

- **bot_configurations_client_id_config_key_key**
  ```sql
  CREATE UNIQUE INDEX bot_configurations_client_id_config_key_key ON public.bot_configurations USING btree (client_id, config_key)
  ```

- **bot_configurations_pkey**
  ```sql
  CREATE UNIQUE INDEX bot_configurations_pkey ON public.bot_configurations USING btree (id)
  ```

- **idx_bot_configs_category**
  ```sql
  CREATE INDEX idx_bot_configs_category ON public.bot_configurations USING btree (category)
  ```

- **idx_bot_configs_client**
  ```sql
  CREATE INDEX idx_bot_configs_client ON public.bot_configurations USING btree (client_id)
  ```

- **idx_bot_configs_client_key**
  ```sql
  CREATE INDEX idx_bot_configs_client_key ON public.bot_configurations USING btree (client_id, config_key)
  ```

- **idx_bot_configs_default**
  ```sql
  CREATE INDEX idx_bot_configs_default ON public.bot_configurations USING btree (is_default) WHERE (is_default = true)
  ```

- **idx_bot_configs_key**
  ```sql
  CREATE INDEX idx_bot_configs_key ON public.bot_configurations USING btree (config_key)
  ```

### `client_budgets`

- **client_budgets_client_id_key**
  ```sql
  CREATE UNIQUE INDEX client_budgets_client_id_key ON public.client_budgets USING btree (client_id)
  ```

- **client_budgets_pkey**
  ```sql
  CREATE UNIQUE INDEX client_budgets_pkey ON public.client_budgets USING btree (id)
  ```

- **idx_client_budgets_brl_usage**
  ```sql
  CREATE INDEX idx_client_budgets_brl_usage ON public.client_budgets USING btree (brl_usage_percentage) WHERE (budget_mode = ANY (ARRAY['brl'::text, 'both'::text]))
  ```

- **idx_client_budgets_budget_mode**
  ```sql
  CREATE INDEX idx_client_budgets_budget_mode ON public.client_budgets USING btree (budget_mode)
  ```

- **idx_client_budgets_client_id**
  ```sql
  CREATE INDEX idx_client_budgets_client_id ON public.client_budgets USING btree (client_id)
  ```

- **idx_client_budgets_is_paused**
  ```sql
  CREATE INDEX idx_client_budgets_is_paused ON public.client_budgets USING btree (is_paused) WHERE (is_paused = true)
  ```

- **idx_client_budgets_next_reset**
  ```sql
  CREATE INDEX idx_client_budgets_next_reset ON public.client_budgets USING btree (next_reset_at)
  ```

- **idx_client_budgets_token_usage**
  ```sql
  CREATE INDEX idx_client_budgets_token_usage ON public.client_budgets USING btree (token_usage_percentage) WHERE (budget_mode = ANY (ARRAY['tokens'::text, 'both'::text]))
  ```

- **idx_client_budgets_usage_percentage**
  ```sql
  CREATE INDEX idx_client_budgets_usage_percentage ON public.client_budgets USING btree (usage_percentage)
  ```

### `clientes_whatsapp`

- **clientes_whatsapp_pkey**
  ```sql
  CREATE UNIQUE INDEX clientes_whatsapp_pkey ON public.clientes_whatsapp USING btree (telefone, client_id)
  ```

- **idx_clientes_status**
  ```sql
  CREATE INDEX idx_clientes_status ON public.clientes_whatsapp USING btree (status)
  ```

- **idx_clientes_telefone**
  ```sql
  CREATE INDEX idx_clientes_telefone ON public.clientes_whatsapp USING btree (telefone)
  ```

- **idx_clientes_whatsapp_audio_preference**
  ```sql
  CREATE INDEX idx_clientes_whatsapp_audio_preference ON public.clientes_whatsapp USING btree (audio_preference)
  ```

- **idx_clientes_whatsapp_client_id**
  ```sql
  CREATE INDEX idx_clientes_whatsapp_client_id ON public.clientes_whatsapp USING btree (client_id)
  ```

- **idx_clientes_whatsapp_client_phone**
  ```sql
  CREATE INDEX idx_clientes_whatsapp_client_phone ON public.clientes_whatsapp USING btree (client_id, telefone)
  ```

- **idx_clientes_whatsapp_last_read_at**
  ```sql
  CREATE INDEX idx_clientes_whatsapp_last_read_at ON public.clientes_whatsapp USING btree (last_read_at)
  ```

- **idx_clientes_whatsapp_status**
  ```sql
  CREATE INDEX idx_clientes_whatsapp_status ON public.clientes_whatsapp USING btree (client_id, status) WHERE (status = ANY (ARRAY['humano'::text, 'transferido'::text, 'fluxo_inicial'::text]))
  ```

- **idx_clientes_whatsapp_telefone_client_id**
  ```sql
  CREATE INDEX idx_clientes_whatsapp_telefone_client_id ON public.clientes_whatsapp USING btree (telefone, client_id)
  ```

- **idx_clientes_whatsapp_telefone_last_read**
  ```sql
  CREATE INDEX idx_clientes_whatsapp_telefone_last_read ON public.clientes_whatsapp USING btree (telefone, last_read_at)
  ```

- **idx_clientes_whatsapp_transferred_at**
  ```sql
  CREATE INDEX idx_clientes_whatsapp_transferred_at ON public.clientes_whatsapp USING btree (transferred_at) WHERE (transferred_at IS NOT NULL)
  ```

- **idx_clientes_whatsapp_transferred_by**
  ```sql
  CREATE INDEX idx_clientes_whatsapp_transferred_by ON public.clientes_whatsapp USING btree (transferred_by) WHERE (transferred_by IS NOT NULL)
  ```

- **idx_clientes_whatsapp_updated_at**
  ```sql
  CREATE INDEX idx_clientes_whatsapp_updated_at ON public.clientes_whatsapp USING btree (updated_at DESC)
  ```

### `clients`

- **clients_pkey**
  ```sql
  CREATE UNIQUE INDEX clients_pkey ON public.clients USING btree (id)
  ```

- **clients_slug_key**
  ```sql
  CREATE UNIQUE INDEX clients_slug_key ON public.clients USING btree (slug)
  ```

- **idx_clients_gateway_key_secret**
  ```sql
  CREATE INDEX idx_clients_gateway_key_secret ON public.clients USING btree (gateway_api_key_secret_id)
  ```

- **idx_clients_slug**
  ```sql
  CREATE UNIQUE INDEX idx_clients_slug ON public.clients USING btree (slug)
  ```

- **idx_clients_status**
  ```sql
  CREATE INDEX idx_clients_status ON public.clients USING btree (status) WHERE (status = 'active'::text)
  ```

- **idx_clients_use_ai_gateway**
  ```sql
  CREATE INDEX idx_clients_use_ai_gateway ON public.clients USING btree (use_ai_gateway) WHERE (use_ai_gateway = true)
  ```

- **idx_clients_waba_id**
  ```sql
  CREATE INDEX idx_clients_waba_id ON public.clients USING btree (whatsapp_business_account_id) WHERE (whatsapp_business_account_id IS NOT NULL)
  ```

### `conversations`

- **conversations_client_id_phone_key**
  ```sql
  CREATE UNIQUE INDEX conversations_client_id_phone_key ON public.conversations USING btree (client_id, phone)
  ```

- **conversations_pkey**
  ```sql
  CREATE UNIQUE INDEX conversations_pkey ON public.conversations USING btree (id)
  ```

- **idx_conversations_client_id**
  ```sql
  CREATE INDEX idx_conversations_client_id ON public.conversations USING btree (client_id)
  ```

- **idx_conversations_last_read_at**
  ```sql
  CREATE INDEX idx_conversations_last_read_at ON public.conversations USING btree (last_read_at)
  ```

- **idx_conversations_last_update**
  ```sql
  CREATE INDEX idx_conversations_last_update ON public.conversations USING btree (last_update DESC)
  ```

- **idx_conversations_phone**
  ```sql
  CREATE INDEX idx_conversations_phone ON public.conversations USING btree (phone)
  ```

- **idx_conversations_status**
  ```sql
  CREATE INDEX idx_conversations_status ON public.conversations USING btree (status)
  ```

### `documents`

- **documents_pkey**
  ```sql
  CREATE UNIQUE INDEX documents_pkey ON public.documents USING btree (id)
  ```

- **idx_documents_client**
  ```sql
  CREATE INDEX idx_documents_client ON public.documents USING btree (client_id)
  ```

- **idx_documents_client_filename**
  ```sql
  CREATE INDEX idx_documents_client_filename ON public.documents USING btree (client_id, ((metadata ->> 'filename'::text))) WHERE ((metadata ->> 'filename'::text) IS NOT NULL)
  ```

- **idx_documents_client_id**
  ```sql
  CREATE INDEX idx_documents_client_id ON public.documents USING btree (client_id)
  ```

- **idx_documents_embedding**
  ```sql
  CREATE INDEX idx_documents_embedding ON public.documents USING ivfflat (embedding vector_cosine_ops) WITH (lists='100')
  ```

- **idx_documents_filename**
  ```sql
  CREATE INDEX idx_documents_filename ON public.documents USING btree (((metadata ->> 'filename'::text))) WHERE ((metadata ->> 'filename'::text) IS NOT NULL)
  ```

- **idx_documents_metadata_client_id**
  ```sql
  CREATE INDEX idx_documents_metadata_client_id ON public.documents USING btree (((metadata ->> 'client_id'::text)))
  ```

- **idx_documents_original_file_path**
  ```sql
  CREATE INDEX idx_documents_original_file_path ON public.documents USING btree (original_file_path)
  ```

- **idx_documents_type**
  ```sql
  CREATE INDEX idx_documents_type ON public.documents USING btree (((metadata ->> 'documentType'::text))) WHERE ((metadata ->> 'documentType'::text) IS NOT NULL)
  ```

- **idx_documents_with_original_files**
  ```sql
  CREATE INDEX idx_documents_with_original_files ON public.documents USING btree (client_id, original_file_url) WHERE (original_file_url IS NOT NULL)
  ```

### `execution_logs`

- **execution_logs_pkey**
  ```sql
  CREATE UNIQUE INDEX execution_logs_pkey ON public.execution_logs USING btree (id)
  ```

- **idx_execution_logs_client_id**
  ```sql
  CREATE INDEX idx_execution_logs_client_id ON public.execution_logs USING btree (client_id) WHERE (client_id IS NOT NULL)
  ```

- **idx_execution_logs_client_timestamp**
  ```sql
  CREATE INDEX idx_execution_logs_client_timestamp ON public.execution_logs USING btree (client_id, "timestamp" DESC) WHERE (client_id IS NOT NULL)
  ```

- **idx_execution_logs_exec_time**
  ```sql
  CREATE INDEX idx_execution_logs_exec_time ON public.execution_logs USING btree (execution_id, "timestamp")
  ```

- **idx_execution_logs_execution_id**
  ```sql
  CREATE INDEX idx_execution_logs_execution_id ON public.execution_logs USING btree (execution_id)
  ```

- **idx_execution_logs_node_name**
  ```sql
  CREATE INDEX idx_execution_logs_node_name ON public.execution_logs USING btree (node_name)
  ```

- **idx_execution_logs_status**
  ```sql
  CREATE INDEX idx_execution_logs_status ON public.execution_logs USING btree (status)
  ```

- **idx_execution_logs_timestamp**
  ```sql
  CREATE INDEX idx_execution_logs_timestamp ON public.execution_logs USING btree ("timestamp" DESC)
  ```

### `flow_executions`

- **flow_executions_pkey**
  ```sql
  CREATE UNIQUE INDEX flow_executions_pkey ON public.flow_executions USING btree (id)
  ```

- **idx_flow_executions_active**
  ```sql
  CREATE INDEX idx_flow_executions_active ON public.flow_executions USING btree (client_id, phone, status) WHERE (status = 'active'::text)
  ```

- **idx_flow_executions_flow**
  ```sql
  CREATE INDEX idx_flow_executions_flow ON public.flow_executions USING btree (flow_id)
  ```

- **idx_flow_executions_phone**
  ```sql
  CREATE INDEX idx_flow_executions_phone ON public.flow_executions USING btree (client_id, phone)
  ```

- **idx_flow_executions_status**
  ```sql
  CREATE INDEX idx_flow_executions_status ON public.flow_executions USING btree (status, last_step_at)
  ```

- **unique_active_execution**
  ```sql
  CREATE UNIQUE INDEX unique_active_execution ON public.flow_executions USING btree (client_id, phone) WHERE (status = 'active'::text)
  ```

### `gateway_cache_performance`

- **gateway_cache_performance_client_id_date_hour_key**
  ```sql
  CREATE UNIQUE INDEX gateway_cache_performance_client_id_date_hour_key ON public.gateway_cache_performance USING btree (client_id, date, hour)
  ```

- **gateway_cache_performance_pkey**
  ```sql
  CREATE UNIQUE INDEX gateway_cache_performance_pkey ON public.gateway_cache_performance USING btree (id)
  ```

- **idx_gateway_cache_performance_client_date**
  ```sql
  CREATE INDEX idx_gateway_cache_performance_client_date ON public.gateway_cache_performance USING btree (client_id, date DESC)
  ```

- **idx_gateway_cache_performance_client_id**
  ```sql
  CREATE INDEX idx_gateway_cache_performance_client_id ON public.gateway_cache_performance USING btree (client_id)
  ```

- **idx_gateway_cache_performance_date**
  ```sql
  CREATE INDEX idx_gateway_cache_performance_date ON public.gateway_cache_performance USING btree (date DESC)
  ```

### `gateway_usage_logs`

- **gateway_usage_logs_pkey**
  ```sql
  CREATE UNIQUE INDEX gateway_usage_logs_pkey ON public.gateway_usage_logs USING btree (id)
  ```

- **idx_gateway_usage_logs_api_type**
  ```sql
  CREATE INDEX idx_gateway_usage_logs_api_type ON public.gateway_usage_logs USING btree (api_type, created_at DESC)
  ```

- **idx_gateway_usage_logs_client_api**
  ```sql
  CREATE INDEX idx_gateway_usage_logs_client_api ON public.gateway_usage_logs USING btree (client_id, api_type, created_at DESC)
  ```

- **idx_gateway_usage_logs_client_id**
  ```sql
  CREATE INDEX idx_gateway_usage_logs_client_id ON public.gateway_usage_logs USING btree (client_id)
  ```

- **idx_gateway_usage_logs_conversation_id**
  ```sql
  CREATE INDEX idx_gateway_usage_logs_conversation_id ON public.gateway_usage_logs USING btree (conversation_id)
  ```

- **idx_gateway_usage_logs_created_at**
  ```sql
  CREATE INDEX idx_gateway_usage_logs_created_at ON public.gateway_usage_logs USING btree (created_at DESC)
  ```

- **idx_gateway_usage_logs_model_name**
  ```sql
  CREATE INDEX idx_gateway_usage_logs_model_name ON public.gateway_usage_logs USING btree (model_name)
  ```

- **idx_gateway_usage_logs_provider**
  ```sql
  CREATE INDEX idx_gateway_usage_logs_provider ON public.gateway_usage_logs USING btree (provider)
  ```

- **idx_gateway_usage_logs_was_cached**
  ```sql
  CREATE INDEX idx_gateway_usage_logs_was_cached ON public.gateway_usage_logs USING btree (was_cached)
  ```

- **idx_gateway_usage_logs_was_fallback**
  ```sql
  CREATE INDEX idx_gateway_usage_logs_was_fallback ON public.gateway_usage_logs USING btree (was_fallback)
  ```

### `interactive_flows`

- **idx_interactive_flows_active**
  ```sql
  CREATE INDEX idx_interactive_flows_active ON public.interactive_flows USING btree (client_id, is_active) WHERE (is_active = true)
  ```

- **idx_interactive_flows_client**
  ```sql
  CREATE INDEX idx_interactive_flows_client ON public.interactive_flows USING btree (client_id)
  ```

- **idx_interactive_flows_keywords**
  ```sql
  CREATE INDEX idx_interactive_flows_keywords ON public.interactive_flows USING gin (trigger_keywords) WHERE (trigger_type = 'keyword'::text)
  ```

- **idx_interactive_flows_trigger_type**
  ```sql
  CREATE INDEX idx_interactive_flows_trigger_type ON public.interactive_flows USING btree (client_id, trigger_type, is_active)
  ```

- **interactive_flows_pkey**
  ```sql
  CREATE UNIQUE INDEX interactive_flows_pkey ON public.interactive_flows USING btree (id)
  ```

### `message_templates`

- **idx_templates_client_id**
  ```sql
  CREATE INDEX idx_templates_client_id ON public.message_templates USING btree (client_id)
  ```

- **idx_templates_client_status**
  ```sql
  CREATE INDEX idx_templates_client_status ON public.message_templates USING btree (client_id, status)
  ```

- **idx_templates_name**
  ```sql
  CREATE INDEX idx_templates_name ON public.message_templates USING btree (name)
  ```

- **idx_templates_status**
  ```sql
  CREATE INDEX idx_templates_status ON public.message_templates USING btree (status)
  ```

- **message_templates_client_id_name_language_key**
  ```sql
  CREATE UNIQUE INDEX message_templates_client_id_name_language_key ON public.message_templates USING btree (client_id, name, language)
  ```

- **message_templates_pkey**
  ```sql
  CREATE UNIQUE INDEX message_templates_pkey ON public.message_templates USING btree (id)
  ```

### `messages`

- **idx_messages_client_id**
  ```sql
  CREATE INDEX idx_messages_client_id ON public.messages USING btree (client_id)
  ```

- **idx_messages_conversation_id**
  ```sql
  CREATE INDEX idx_messages_conversation_id ON public.messages USING btree (conversation_id)
  ```

- **idx_messages_direction**
  ```sql
  CREATE INDEX idx_messages_direction ON public.messages USING btree (direction)
  ```

- **idx_messages_media_type**
  ```sql
  CREATE INDEX idx_messages_media_type ON public.messages USING btree (media_type) WHERE (media_type IS NOT NULL)
  ```

- **idx_messages_phone**
  ```sql
  CREATE INDEX idx_messages_phone ON public.messages USING btree (phone)
  ```

- **idx_messages_timestamp**
  ```sql
  CREATE INDEX idx_messages_timestamp ON public.messages USING btree ("timestamp" DESC)
  ```

- **idx_messages_transcription**
  ```sql
  CREATE INDEX idx_messages_transcription ON public.messages USING gin (to_tsvector('portuguese'::regconfig, COALESCE(transcription, ''::text)))
  ```

- **idx_messages_wamid**
  ```sql
  CREATE INDEX idx_messages_wamid ON public.messages USING btree (((metadata ->> 'wamid'::text))) WHERE ((metadata ->> 'wamid'::text) IS NOT NULL)
  ```

- **messages_pkey**
  ```sql
  CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (id)
  ```

### `n8n_chat_histories`

- **idx_chat_histories_client_session_created**
  ```sql
  CREATE INDEX idx_chat_histories_client_session_created ON public.n8n_chat_histories USING btree (client_id, session_id, created_at DESC)
  ```

- **idx_chat_histories_created_at**
  ```sql
  CREATE INDEX idx_chat_histories_created_at ON public.n8n_chat_histories USING btree (created_at DESC)
  ```

- **idx_chat_histories_session_created**
  ```sql
  CREATE INDEX idx_chat_histories_session_created ON public.n8n_chat_histories USING btree (session_id, created_at DESC)
  ```

- **idx_chat_histories_session_id**
  ```sql
  CREATE INDEX idx_chat_histories_session_id ON public.n8n_chat_histories USING btree (session_id)
  ```

- **idx_chat_histories_status**
  ```sql
  CREATE INDEX idx_chat_histories_status ON public.n8n_chat_histories USING btree (status)
  ```

- **idx_chat_histories_transcription**
  ```sql
  CREATE INDEX idx_chat_histories_transcription ON public.n8n_chat_histories USING gin (to_tsvector('portuguese'::regconfig, COALESCE(transcription, ''::text)))
  ```

- **idx_chat_histories_updated_at**
  ```sql
  CREATE INDEX idx_chat_histories_updated_at ON public.n8n_chat_histories USING btree (updated_at DESC)
  ```

- **idx_chat_histories_wamid**
  ```sql
  CREATE INDEX idx_chat_histories_wamid ON public.n8n_chat_histories USING btree (wamid) WHERE (wamid IS NOT NULL)
  ```

- **idx_media_messages**
  ```sql
  CREATE INDEX idx_media_messages ON public.n8n_chat_histories USING btree (session_id) WHERE (media_metadata IS NOT NULL)
  ```

- **idx_n8n_chat_histories_last_read_at**
  ```sql
  CREATE INDEX idx_n8n_chat_histories_last_read_at ON public.n8n_chat_histories USING btree (last_read_at)
  ```

- **idx_n8n_chat_histories_wamid**
  ```sql
  CREATE INDEX idx_n8n_chat_histories_wamid ON public.n8n_chat_histories USING btree (wamid)
  ```

- **idx_n8n_chat_histories_wamid_lookup**
  ```sql
  CREATE INDEX idx_n8n_chat_histories_wamid_lookup ON public.n8n_chat_histories USING btree (wamid) WHERE (wamid IS NOT NULL)
  ```

- **n8n_chat_histories_client_wamid_unique**
  ```sql
  CREATE UNIQUE INDEX n8n_chat_histories_client_wamid_unique ON public.n8n_chat_histories USING btree (client_id, wamid)
  ```

- **n8n_chat_histories_pkey**
  ```sql
  CREATE UNIQUE INDEX n8n_chat_histories_pkey ON public.n8n_chat_histories USING btree (id)
  ```

### `plan_budgets`

- **idx_plan_budgets_plan_name**
  ```sql
  CREATE INDEX idx_plan_budgets_plan_name ON public.plan_budgets USING btree (plan_name)
  ```

- **plan_budgets_pkey**
  ```sql
  CREATE UNIQUE INDEX plan_budgets_pkey ON public.plan_budgets USING btree (id)
  ```

- **plan_budgets_plan_name_key**
  ```sql
  CREATE UNIQUE INDEX plan_budgets_plan_name_key ON public.plan_budgets USING btree (plan_name)
  ```

### `pricing_config`

- **idx_pricing_config_client**
  ```sql
  CREATE INDEX idx_pricing_config_client ON public.pricing_config USING btree (client_id)
  ```

- **idx_pricing_config_is_gateway**
  ```sql
  CREATE INDEX idx_pricing_config_is_gateway ON public.pricing_config USING btree (is_gateway_pricing) WHERE (is_gateway_pricing = true)
  ```

- **idx_pricing_config_provider_model**
  ```sql
  CREATE INDEX idx_pricing_config_provider_model ON public.pricing_config USING btree (provider, model)
  ```

- **pricing_config_client_id_provider_model_key**
  ```sql
  CREATE UNIQUE INDEX pricing_config_client_id_provider_model_key ON public.pricing_config USING btree (client_id, provider, model)
  ```

- **pricing_config_pkey**
  ```sql
  CREATE UNIQUE INDEX pricing_config_pkey ON public.pricing_config USING btree (id)
  ```

### `push_tokens`

- **idx_push_tokens_token**
  ```sql
  CREATE INDEX idx_push_tokens_token ON public.push_tokens USING btree (token)
  ```

- **idx_push_tokens_user_id**
  ```sql
  CREATE INDEX idx_push_tokens_user_id ON public.push_tokens USING btree (user_id)
  ```

- **push_tokens_pkey**
  ```sql
  CREATE UNIQUE INDEX push_tokens_pkey ON public.push_tokens USING btree (id)
  ```

- **push_tokens_token_key**
  ```sql
  CREATE UNIQUE INDEX push_tokens_token_key ON public.push_tokens USING btree (token)
  ```

### `shared_gateway_config`

- **idx_shared_gateway_config_singleton**
  ```sql
  CREATE UNIQUE INDEX idx_shared_gateway_config_singleton ON public.shared_gateway_config USING btree ((true))
  ```

- **shared_gateway_config_pkey**
  ```sql
  CREATE UNIQUE INDEX shared_gateway_config_pkey ON public.shared_gateway_config USING btree (id)
  ```

### `tts_cache`

- **idx_tts_cache_client_hash**
  ```sql
  CREATE INDEX idx_tts_cache_client_hash ON public.tts_cache USING btree (client_id, text_hash)
  ```

- **idx_tts_cache_expires**
  ```sql
  CREATE INDEX idx_tts_cache_expires ON public.tts_cache USING btree (expires_at)
  ```

- **idx_tts_cache_hits**
  ```sql
  CREATE INDEX idx_tts_cache_hits ON public.tts_cache USING btree (hit_count DESC)
  ```

- **tts_cache_client_id_text_hash_key**
  ```sql
  CREATE UNIQUE INDEX tts_cache_client_id_text_hash_key ON public.tts_cache USING btree (client_id, text_hash)
  ```

- **tts_cache_pkey**
  ```sql
  CREATE UNIQUE INDEX tts_cache_pkey ON public.tts_cache USING btree (id)
  ```

### `tts_usage_logs`

- **idx_tts_usage_logs_client**
  ```sql
  CREATE INDEX idx_tts_usage_logs_client ON public.tts_usage_logs USING btree (client_id, created_at DESC)
  ```

- **idx_tts_usage_logs_date**
  ```sql
  CREATE INDEX idx_tts_usage_logs_date ON public.tts_usage_logs USING btree (created_at DESC)
  ```

- **idx_tts_usage_logs_event**
  ```sql
  CREATE INDEX idx_tts_usage_logs_event ON public.tts_usage_logs USING btree (event_type)
  ```

- **tts_usage_logs_pkey**
  ```sql
  CREATE UNIQUE INDEX tts_usage_logs_pkey ON public.tts_usage_logs USING btree (id)
  ```

### `usage_logs`

- **idx_usage_logs_client_date_source**
  ```sql
  CREATE INDEX idx_usage_logs_client_date_source ON public.usage_logs USING btree (client_id, created_at DESC, source)
  ```

- **idx_usage_logs_client_id**
  ```sql
  CREATE INDEX idx_usage_logs_client_id ON public.usage_logs USING btree (client_id)
  ```

- **idx_usage_logs_conversation_id**
  ```sql
  CREATE INDEX idx_usage_logs_conversation_id ON public.usage_logs USING btree (conversation_id)
  ```

- **idx_usage_logs_created_at**
  ```sql
  CREATE INDEX idx_usage_logs_created_at ON public.usage_logs USING btree (created_at DESC)
  ```

- **idx_usage_logs_model**
  ```sql
  CREATE INDEX idx_usage_logs_model ON public.usage_logs USING btree (model)
  ```

- **idx_usage_logs_phone**
  ```sql
  CREATE INDEX idx_usage_logs_phone ON public.usage_logs USING btree (phone)
  ```

- **idx_usage_logs_source**
  ```sql
  CREATE INDEX idx_usage_logs_source ON public.usage_logs USING btree (source)
  ```

- **usage_logs_pkey**
  ```sql
  CREATE UNIQUE INDEX usage_logs_pkey ON public.usage_logs USING btree (id)
  ```

### `user_invites`

- **idx_user_invites_client_id**
  ```sql
  CREATE INDEX idx_user_invites_client_id ON public.user_invites USING btree (client_id)
  ```

- **idx_user_invites_email**
  ```sql
  CREATE INDEX idx_user_invites_email ON public.user_invites USING btree (email)
  ```

- **idx_user_invites_status**
  ```sql
  CREATE INDEX idx_user_invites_status ON public.user_invites USING btree (status)
  ```

- **idx_user_invites_token**
  ```sql
  CREATE INDEX idx_user_invites_token ON public.user_invites USING btree (invite_token)
  ```

- **user_invites_invite_token_key**
  ```sql
  CREATE UNIQUE INDEX user_invites_invite_token_key ON public.user_invites USING btree (invite_token)
  ```

- **user_invites_pkey**
  ```sql
  CREATE UNIQUE INDEX user_invites_pkey ON public.user_invites USING btree (id)
  ```

### `user_profiles`

- **idx_user_profiles_active**
  ```sql
  CREATE INDEX idx_user_profiles_active ON public.user_profiles USING btree (is_active)
  ```

- **idx_user_profiles_client**
  ```sql
  CREATE INDEX idx_user_profiles_client ON public.user_profiles USING btree (client_id)
  ```

- **idx_user_profiles_client_id**
  ```sql
  CREATE INDEX idx_user_profiles_client_id ON public.user_profiles USING btree (client_id)
  ```

- **idx_user_profiles_client_role**
  ```sql
  CREATE INDEX idx_user_profiles_client_role ON public.user_profiles USING btree (client_id, role)
  ```

- **idx_user_profiles_email**
  ```sql
  CREATE INDEX idx_user_profiles_email ON public.user_profiles USING btree (email)
  ```

- **idx_user_profiles_role**
  ```sql
  CREATE INDEX idx_user_profiles_role ON public.user_profiles USING btree (role)
  ```

- **user_profiles_email_key**
  ```sql
  CREATE UNIQUE INDEX user_profiles_email_key ON public.user_profiles USING btree (email)
  ```

- **user_profiles_pkey**
  ```sql
  CREATE UNIQUE INDEX user_profiles_pkey ON public.user_profiles USING btree (id)
  ```

### `webhook_dedup`

- **idx_webhook_dedup_composite**
  ```sql
  CREATE INDEX idx_webhook_dedup_composite ON public.webhook_dedup USING btree (client_id, message_id)
  ```

- **idx_webhook_dedup_key**
  ```sql
  CREATE INDEX idx_webhook_dedup_key ON public.webhook_dedup USING btree (dedup_key)
  ```

- **idx_webhook_dedup_processed_at**
  ```sql
  CREATE INDEX idx_webhook_dedup_processed_at ON public.webhook_dedup USING btree (processed_at)
  ```

- **webhook_dedup_dedup_key_key**
  ```sql
  CREATE UNIQUE INDEX webhook_dedup_dedup_key_key ON public.webhook_dedup USING btree (dedup_key)
  ```

- **webhook_dedup_pkey**
  ```sql
  CREATE UNIQUE INDEX webhook_dedup_pkey ON public.webhook_dedup USING btree (id)
  ```

- **webhook_dedup_unique_key**
  ```sql
  CREATE UNIQUE INDEX webhook_dedup_unique_key ON public.webhook_dedup USING btree (client_id, message_id)
  ```


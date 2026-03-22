# Supabase Complete Schema - ChatBot Oficial
**Generated from migrations analysis**
**Date:** 2026-03-15
**Total migration files analyzed:** 129

---

## Table of Contents
1. [Migration Timeline](#migration-timeline)
2. [Complete Schema](#complete-schema)
3. [Row Level Security Policies](#row-level-security-policies)
4. [Functions & RPCs](#functions--rpcs)
5. [Triggers](#triggers)
6. [Views](#views)
7. [Multi-Tenancy Analysis](#multi-tenancy-analysis)
8. [Storage Buckets](#storage-buckets)
9. [Migration Conflicts & Notes](#migration-conflicts--notes)

---

## Migration Timeline

### Core Infrastructure (Phases 1-4)
| # | File | Date | Purpose |
|---|------|------|---------|
| 1 | `migration.sql` | ~2025-10 | Initial base tables (clients, conversations, messages, usage_logs) |
| 2 | `002_execution_logs.sql` | ~2025-10 | Debug logging for chatbot flow |
| 3 | `003_performance_indexes.sql` | 2025-10-27 | Performance optimization indexes |
| 4 | `004_rename_clientes_table.sql` | ~2025-01 | Rename "Clientes WhatsApp" → clientes_whatsapp (TypeScript fix) |
| 5 | `005_add_client_id_to_n8n_tables.sql` | 2025-10-29 | Multi-tenant migration (add client_id) |
| 6 | `005_fase1_vault_multi_tenant.sql` | 2025-01-28 | **CRITICAL: Vault setup + clients table + multi-tenant** |
| 7 | `007_add_wamid_to_chat_histories.sql` | ~ | WhatsApp message ID for reactions |
| 8 | `007_auth_setup.sql` | 2025-10-28 | Supabase Auth + user_profiles table |
| 9 | `008_create_first_user.sql` | 2025-10-28 | First admin user creation |
| 10 | `008_phase4_admin_roles.sql` | 2025-10-30 | RBAC (roles, permissions, user_invites) |
| 11 | `009_fix_multi_tenant_phone_constraint.sql` | 2025-11-30 | **CRITICAL: Fix UNIQUE(telefone) → UNIQUE(telefone, client_id)** |
| 12 | `010_fix_orphaned_users.sql` | 2025-10-29 | Auto-create profiles for orphaned auth users |
| 13 | `011_analytics_usage_tracking.sql` | ~ | Enhanced usage_logs with detailed analytics |
| 14 | `012_pricing_config.sql` | ~ | Pricing configuration per model |
| 15 | `013_fix_clientes_whatsapp_pkey.sql` | 2025-12-01 | **CRITICAL: PK change to (telefone, client_id)** |
| 16 | `RLS.sql` | ~ | Complete RLS policies for all tables |

### Realtime & Features (2025-01)
| # | File | Date | Purpose |
|---|------|------|---------|
| 17 | `20250125_check_realtime_status.sql` | 2025-01-25 | Check realtime replication |
| 18 | `20250125_enable_realtime_replication.sql` | 2025-01-25 | Enable realtime on tables |
| 19 | `20250125_fix_realtime_free_tier.sql` | 2025-01-25 | Free tier realtime fixes |
| 20 | `20250125_realtime_broadcast_clean.sql` | 2025-01-25 | Broadcast cleanup |
| 21 | `20250125_realtime_broadcast_triggers.sql` | 2025-01-25 | Broadcast triggers |
| 22 | `20250125_realtime_broadcast_v2.sql` | 2025-01-25 | Broadcast v2 implementation |

### Bot Configuration (2025-11)
| # | File | Date | Purpose |
|---|------|------|---------|
| 23 | `20251107_create_bot_configurations.sql` | 2025-11-07 | **Modular bot config system** (prompts, rules, thresholds) |
| 24 | `20251118_add_meta_app_secret.sql` | 2025-11-18 | Meta App Secret (HMAC validation) |
| 25 | `20251118_create_audit_log_vuln008.sql` | 2025-11-18 | Audit logging (VULN-008 fix) |
| 26 | `20251118_fix_rls_policies_vuln007.sql` | 2025-11-18 | RLS security fix (VULN-007) |
| 27 | `20251118_webhook_dedup_fallback_vuln006.sql` | 2025-11-18 | Webhook dedup fallback (VULN-006) |

### RAG & Knowledge Base (2025-11/12)
| # | File | Date | Purpose |
|---|------|------|---------|
| 28 | `20251121_create_match_documents_function.sql` | 2025-11-21 | RAG match_documents() function |
| 29 | `20251121_fix_audit_logs_multi_tenant.sql` | 2025-11-21 | Audit logs multi-tenant fix |
| 30 | `20251121_fix_execution_logs_multi_tenant.sql` | 2025-11-21 | Execution logs multi-tenant fix |
| 31 | `20251121_strict_execution_logs_tenant_isolation.sql` | 2025-11-21 | Strict tenant isolation |
| 32 | `20251122_add_human_handoff_fields.sql` | 2025-11-22 | Human handoff tracking |
| 33 | `20251122_fix_update_secret_alternative.sql` | 2025-11-22 | Vault secret update fix |
| 34 | `20251122_fix_update_secret_function.sql` | 2025-11-22 | Update secret function |
| 35 | `20251122_normalize_status_values.sql` | 2025-11-22 | Normalize status values |
| 36 | `20251122162241_create_delete_secret_function.sql` | 2025-11-22 | Delete secret function |
| 37 | `20251122231930_add_media_metadata_column.sql` | 2025-11-22 | Media metadata tracking |
| 38 | `20251125_add_last_read_at_to_n8n_chat_histories.sql` | 2025-11-25 | Last read timestamp |
| 39 | `20251202_add_updated_at_to_clientes_whatsapp.sql` | 2025-12-02 | Updated_at timestamp |
| 40 | `20251203000001_create_knowledge_storage_policies.sql` | 2025-12-03 | Storage policies for knowledge base |
| 41 | `20251203000002_add_original_file_metadata.sql` | 2025-12-03 | Original file metadata |

### TTS & Audio (2025-12)
| # | File | Date | Purpose |
|---|------|------|---------|
| 42 | `20251204_add_audio_preferences.sql` | 2025-12-04 | Audio preferences |
| 43 | `20251204_add_audio_to_messages.sql` | 2025-12-04 | Audio messages support |
| 44 | `20251204_add_original_file_fields_to_match_documents.sql` | 2025-12-04 | File tracking in RAG |
| 45 | `20251204_add_tts_config.sql` | 2025-12-04 | TTS configuration |
| 46 | `20251204_add_tts_model.sql` | 2025-12-04 | TTS model selection |
| 47 | `20251204_create_tts_cache.sql` | 2025-12-04 | TTS response caching |
| 48 | `20251204_create_tts_usage_logs.sql` | 2025-12-04 | TTS usage tracking |
| 49 | `20251204115356_add_original_file_columns_to_documents.sql` | 2025-12-04 | Document file tracking |

### Interactive Flows (2025-12)
| # | File | Date | Purpose |
|---|------|------|---------|
| 50 | `20251206_add_fluxo_inicial_status.sql` | 2025-12-06 | Flow initial status |
| 51 | `20251206_create_interactive_flows.sql` | 2025-12-06 | **Interactive flows system** (keywords, buttons, lists) |
| 52 | `20251207_update_conversations_status.sql` | 2025-12-07 | Conversation status update |
| 53 | `20251207_update_messages_type.sql` | 2025-12-07 | Message types update |
| 54 | `20251208_create_message_templates.sql` | 2025-12-08 | WhatsApp message templates |

### AI Gateway & Budget System (2025-12)
| # | File | Date | Purpose |
|---|------|------|---------|
| 55 | `20251212_create_budget_tables.sql` | 2025-12-12 | Budget tracking tables |
| 56 | `20251212_create_gateway_infrastructure.sql` | 2025-12-12 | **AI Gateway infrastructure** (Vercel AI SDK) |
| 57 | `20251212_modify_existing_tables.sql` | 2025-12-12 | Modify tables for gateway |
| 58 | `20251212_seed_ai_models_registry.sql` | 2025-12-12 | AI models catalog seed |
| 59 | `20251212_simplify_to_shared_gateway_config.sql` | 2025-12-12 | Shared gateway config |
| 60 | `20251213_budget_plan_templates.sql` | 2025-12-13 | Budget plan templates |
| 61 | `20251213_unified_api_tracking.sql` | 2025-12-13 | **Unified API tracking** (chat, whisper, vision, embeddings) |
| 62 | `20251213133305_add_vault_rpc_functions.sql` | 2025-12-13 | Vault RPC functions |
| 63 | `20251214_modular_budget_system.sql` | 2025-12-14 | Modular budget system |
| 64 | `20251215_add_ai_keys_mode_to_clients.sql` | 2025-12-15 | AI keys mode (vault/gateway) |
| 65 | `20251215_fix_gateway_usage_logs_api_type_add_tts.sql` | 2025-12-15 | Add TTS to API types |
| 66 | `20251215_fix_message_templates.sql` | 2025-12-15 | Fix message templates |
| 67 | `20251216134414_fix_fast_track_node_enabled.sql` | 2025-12-16 | Fast track node config |
| 68 | `20251231_fix_duplicate_messages.sql` | 2025-12-31 | Duplicate messages fix |
| 69 | `20251231_fix_gateway_errors.sql` | 2025-12-31 | Gateway error handling |
| 70 | `20260104130721_add_message_status.sql` | 2026-01-04 | Message status tracking |

### Agents & CRM (2026-01)
| # | File | Date | Purpose |
|---|------|------|---------|
| 71 | `20260131_add_agent_timing_fields.sql` | 2026-01-31 | Agent timing metrics |
| 72 | `20260131_add_meta_ads_integration.sql` | 2026-01-31 | Meta Ads integration |
| 73 | `20260131_agent_version_trigger.sql` | 2026-01-31 | Agent version tracking |
| 74 | `20260131_create_agents_table.sql` | 2026-01-31 | AI agents table |
| 75 | `20260131_crm_module.sql` | 2026-01-31 | **Complete CRM Kanban** (columns, cards, tags, notes, automation) |
| 76 | `20260131_meta_ads_features.sql` | 2026-01-31 | Meta Ads features |
| 77 | `20260131130423_crm_module_phase1.sql` | 2026-01-31 | CRM Phase 1 |
| 78 | `20260131150000_crm_default_columns.sql` | 2026-01-31 | CRM default columns |
| 79 | `20260131160000_crm_automation_rules.sql` | 2026-01-31 | CRM automation rules |
| 80 | `20260131160000_crm_last_message_trigger.sql` | 2026-01-31 | CRM last message sync |

### UI Preferences (2026-02)
| # | File | Date | Purpose |
|---|------|------|---------|
| 81 | `20260201000000_user_filter_preferences.sql` | 2026-02-01 | User filter preferences |
| 82 | `20260201000002_create_user_chat_themes.sql` | 2026-02-01 | Chat themes |
| 83 | `20260201000003_add_text_color_columns.sql` | 2026-02-01 | Text color customization |
| 84 | `20260206000001_add_light_mode_chat_theme_colors.sql` | 2026-02-06 | Light mode colors |

### OpenAI Billing (2026-02)
| # | File | Date | Purpose |
|---|------|------|---------|
| 85 | `20260211_openai_usage_cache.sql` | 2026-02-11 | OpenAI usage caching |
| 86 | `20260211175202_add_openai_billing_sync.sql` | 2026-02-11 | OpenAI billing sync |
| 87 | `20260211184443_add_openai_admin_key.sql` | 2026-02-11 | OpenAI admin key |
| 88 | `20260211185000_fix_clients_rls_vault_fields.sql` | 2026-02-11 | Clients RLS vault fix |
| 89 | `20260217000001_webhook_routing_fields.sql` | 2026-02-17 | Webhook routing |

### OAuth & Auth Improvements (2026-02)
| # | File | Date | Purpose |
|---|------|------|---------|
| 90 | `20260226000000_oauth_auth_improvements.sql` | 2026-02-26 | OAuth improvements |
| 91 | `20260226120000_fix_handle_new_user_conflict.sql` | 2026-02-26 | Handle new user fix |
| 92 | `20260226130000_add_check_email_exists.sql` | 2026-02-26 | Check email function |
| 93 | `20260226140000_disable_handle_new_user_trigger.sql` | 2026-02-26 | Disable auto-trigger |
| 94 | `20260226150000_fix_auto_create_default_filters.sql` | 2026-02-26 | Auto-create filters fix |

### Calendar & Account Management (2026-03)
| # | File | Date | Purpose |
|---|------|------|---------|
| 95 | `20260310000000_add_calendar_oauth.sql` | 2026-03-10 | Calendar OAuth |
| 96 | `20260310100000_create_account_deletion_requests.sql` | 2026-03-10 | Account deletion requests |
| 97 | `20260310180000_upsert_vault_secret.sql` | 2026-03-10 | Upsert vault secret |

### Stripe Connect & Platform (2026-03)
| # | File | Date | Purpose |
|---|------|------|---------|
| 98 | `20260311130500_stripe_connect.sql` | 2026-03-11 | **Stripe Connect** (accounts, products, subscriptions, orders) |
| 99 | `20260311200000_platform_client_subscriptions.sql` | 2026-03-11 | Platform subscriptions |

### Debug/Utility Migrations (Various)
| # | File | Purpose |
|---|------|---------|
| 100-129 | `debug-*.sql`, `check-*.sql`, `verify-*.sql`, `fix-*.sql` | Debug queries, config verification, diagnostics |

---

## Complete Schema

### Core Tables

#### 1. `clients` - Multi-tenant Client Configuration
**Purpose:** Central multi-tenant table. Each client is a separate WhatsApp business.

```sql
CREATE TABLE clients (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,

  -- Status & Plan
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'cancelled')),
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),

  -- Meta WhatsApp Credentials (stored in Vault)
  meta_access_token_secret_id UUID NOT NULL,           -- Vault reference
  meta_verify_token_secret_id UUID NOT NULL,           -- Vault reference
  meta_app_secret_secret_id UUID,                      -- HMAC validation (VULN-012 fix)
  meta_phone_number_id TEXT NOT NULL,
  meta_display_phone TEXT,

  -- AI Credentials (stored in Vault)
  openai_api_key_secret_id UUID,                       -- Vault reference
  openai_model TEXT DEFAULT 'gpt-4o',
  groq_api_key_secret_id UUID,                         -- Vault reference
  groq_model TEXT DEFAULT 'llama-3.3-70b-versatile',

  -- AI Provider Selection
  primary_model_provider TEXT DEFAULT 'groq' NOT NULL CHECK (primary_model_provider IN ('openai', 'groq')),

  -- AI Keys Mode (Gateway vs Direct)
  ai_keys_mode TEXT DEFAULT 'vault' CHECK (ai_keys_mode IN ('vault', 'gateway')),

  -- Prompts (customizable)
  system_prompt TEXT NOT NULL,
  formatter_prompt TEXT,

  -- Behavior Settings (JSONB)
  settings JSONB DEFAULT '{
    "batching_delay_seconds": 10,
    "max_tokens": 2000,
    "temperature": 0.7,
    "enable_rag": true,
    "enable_tools": true,
    "enable_human_handoff": true,
    "message_split_enabled": true,
    "max_chat_history": 15
  }'::jsonb,

  -- Notifications
  notification_email TEXT,
  notification_webhook_url TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

-- Indexes
CREATE UNIQUE INDEX idx_clients_slug ON clients(slug);
CREATE INDEX idx_clients_status ON clients(status) WHERE status = 'active';

-- Trigger
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**RLS Policies:**
- `Users can view own client` - SELECT (client_id = auth.user_client_id())
- `Admins can view all clients` - SELECT (role = 'admin')
- `Client admins can update own client` - UPDATE (client_id = auth.user_client_id() AND role = 'client_admin')
- `Service role can access all clients` - ALL (service_role)

**Multi-Tenancy:** This is the **root table** for tenant isolation. All data references `client_id`.

---

#### 2. `user_profiles` - Auth + Multi-Tenant Link
**Purpose:** Links Supabase Auth users to clients. RBAC roles.

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,

  -- RBAC
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'client_admin', 'user')),
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_profiles_client_id ON user_profiles(client_id);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_client_role ON user_profiles(client_id, role);
CREATE INDEX idx_user_profiles_active ON user_profiles(is_active);
```

**RLS:** DISABLED (to avoid recursion - policies in other tables use this table)

**Helper Functions:**
- `auth.user_client_id()` - Returns client_id of authenticated user
- `auth.user_role()` - Returns role of authenticated user
- `get_current_user_client_id()` - Alias for user_client_id()

---

#### 3. `clientes_whatsapp` - Customer Records
**Purpose:** WhatsApp customers (contacts). One record per phone number per client.

```sql
CREATE TABLE clientes_whatsapp (
  -- Primary key is COMPOSITE (telefone, client_id) - Migration 013
  telefone NUMERIC NOT NULL,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  nome TEXT,
  status TEXT DEFAULT 'bot' CHECK (status IN ('bot', 'humano', 'transferido', 'waiting', 'fluxo_inicial')),

  -- Human handoff tracking
  handoff_reason TEXT,
  transferred_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES user_profiles(id),

  -- Media metadata
  media_metadata JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Composite primary key (Migration 013)
  PRIMARY KEY (telefone, client_id)
);

-- Indexes
CREATE INDEX idx_clientes_whatsapp_telefone_client_id ON clientes_whatsapp(telefone, client_id);
CREATE INDEX idx_clientes_whatsapp_status ON clientes_whatsapp(status);
CREATE INDEX idx_clientes_whatsapp_created_at ON clientes_whatsapp(created_at DESC);
CREATE INDEX idx_clientes_whatsapp_client_phone ON clientes_whatsapp(client_id, telefone);
```

**CRITICAL NOTES:**
- **Migration 004:** Renamed from `"Clientes WhatsApp"` (with space) to `clientes_whatsapp` (TypeScript compatibility)
- **Migration 009:** Changed constraint from `UNIQUE(telefone)` to `UNIQUE(telefone, client_id)` (multi-tenant isolation)
- **Migration 013:** Changed PRIMARY KEY from `(telefone)` to `(telefone, client_id)` (fixes UPSERT errors)
- **Column names in Portuguese:** `telefone` (NUMERIC, not TEXT!), `nome`, `status`
- **telefone is NUMERIC:** Use `telefone::TEXT` for string operations

**RLS Policies:**
- `Users can view own client whatsapp customers` - SELECT (client_id = auth.user_client_id())
- `Service role can access all whatsapp customers` - ALL (service_role)

**VIEW (Legacy Compatibility):**
```sql
CREATE VIEW "Clientes WhatsApp" AS
SELECT telefone, nome, status, created_at
FROM clientes_whatsapp;
-- With INSTEAD OF triggers for INSERT/UPDATE/DELETE
```

---

#### 4. `n8n_chat_histories` - Chat Memory
**Purpose:** Conversation history (legacy from n8n migration). Used for AI context.

```sql
CREATE TABLE n8n_chat_histories (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,

  -- Message content (JSONB with type inside)
  message JSONB NOT NULL, -- {"type": "human"|"ai", "content": "..."}

  -- WhatsApp metadata
  wamid VARCHAR(255),  -- WhatsApp message ID

  -- Read tracking
  last_read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_chat_histories_session_id ON n8n_chat_histories(session_id);
CREATE INDEX idx_chat_histories_created_at ON n8n_chat_histories(created_at DESC);
CREATE INDEX idx_chat_histories_session_created ON n8n_chat_histories(session_id, created_at DESC);
CREATE INDEX idx_n8n_chat_histories_client_id ON n8n_chat_histories(client_id);
CREATE INDEX idx_n8n_chat_histories_session_client ON n8n_chat_histories(session_id, client_id);
CREATE INDEX idx_n8n_chat_histories_wamid ON n8n_chat_histories(wamid);
```

**CRITICAL NOTES:**
- **`type` is NOT a column** - It's inside the JSONB `message` field: `message->>'type'`
- **`session_id`** is the chat identifier (phone number format: `5554999999999`)
- **Migration 005:** Added `client_id` for multi-tenant filtering
- **Migration 007:** Added `wamid` for WhatsApp reactions

**RLS Policies:**
- `Users can view own client chat histories` - SELECT (client_id = auth.user_client_id())
- `Service role can access all chat histories` - ALL (service_role)

---

#### 5. `conversations` - Structured Conversations
**Purpose:** Dashboard view of conversations. Duplicates data from clientes_whatsapp.

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,

  -- Status (sync with clientes_whatsapp.status)
  status TEXT DEFAULT 'bot' CHECK (status IN ('bot', 'waiting', 'human', 'fluxo_inicial')),

  -- Assignment
  assigned_to TEXT,

  -- Last message preview
  last_message TEXT,
  last_update TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(client_id, phone)
);

-- Indexes
CREATE INDEX idx_conversations_client_id ON conversations(client_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_last_update ON conversations(last_update DESC);
CREATE INDEX idx_conversations_phone ON conversations(phone);
```

**RLS Policies:**
- `Users can view own client conversations` - SELECT (client_id = auth.user_client_id())
- `Users can insert conversations` - INSERT (client_id = auth.user_client_id())
- `Users can update conversations` - UPDATE (client_id = auth.user_client_id())
- `Service role can access all conversations` - ALL (service_role)

---

#### 6. `messages` - Individual Messages
**Purpose:** Message history (alternative to n8n_chat_histories).

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  content TEXT NOT NULL,

  -- Message type
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'audio', 'image', 'document', 'video', 'template', 'interactive', 'reaction')),

  -- Direction
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),

  -- Status
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed', 'queued', 'pending')),

  -- Audio support
  audio_url TEXT,
  audio_duration_seconds INTEGER,
  transcription TEXT,

  -- Timestamps
  timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  metadata JSONB
);

-- Indexes
CREATE INDEX idx_messages_client_id ON messages(client_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_phone ON messages(phone);
CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX idx_messages_direction ON messages(direction);
```

**RLS Policies:**
- `Users can view own client messages` - SELECT (client_id = auth.user_client_id())
- `Users can insert messages` - INSERT (client_id = auth.user_client_id())
- `Service role can access all messages` - ALL (service_role)

---

#### 7. `documents` - RAG Knowledge Base
**Purpose:** Vector embeddings for RAG (Retrieval Augmented Generation).

```sql
CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,

  -- Content
  content TEXT NOT NULL,

  -- Vector embedding (OpenAI text-embedding-3-small: 1536 dimensions)
  embedding vector(1536),

  -- Original file tracking
  original_file_name TEXT,
  original_file_path TEXT,
  original_file_size INTEGER,
  original_file_type TEXT,

  -- Metadata
  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_documents_client ON documents(client_id);
-- Vector similarity search index (ivfflat)
CREATE INDEX documents_embedding_idx ON documents USING ivfflat (embedding vector_cosine_ops);
```

**RLS Policies:**
- `Users can view own client documents` - SELECT (client_id = auth.user_client_id())
- `Client admins can manage documents` - ALL (client_id = auth.user_client_id() AND role IN ('client_admin', 'admin'))
- `Service role can access all documents` - ALL (service_role)

**Functions:**
```sql
CREATE FUNCTION match_documents(
  query_embedding vector(1536),
  match_count INT,
  filter_client_id UUID DEFAULT NULL
)
RETURNS TABLE (id BIGINT, content TEXT, metadata JSONB, similarity FLOAT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE (filter_client_id IS NULL OR documents.client_id = filter_client_id)
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

### Configuration Tables

#### 8. `bot_configurations` - Modular Bot Config
**Purpose:** All bot configs (prompts, rules, thresholds) in one table. Zero hardcoding.

```sql
CREATE TABLE bot_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,

  -- Config key (namespace:key format)
  -- Examples: 'intent_classifier:prompt', 'personality:config', 'continuity:threshold_hours'
  config_key TEXT NOT NULL,

  -- Config value (flexible JSONB)
  config_value JSONB NOT NULL,

  -- System flags
  is_default BOOLEAN DEFAULT false,  -- true = system default (seed), false = client custom

  -- Documentation
  description TEXT,
  category TEXT,  -- 'prompts', 'rules', 'thresholds', 'personality'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(client_id, config_key)
);

-- Indexes
CREATE INDEX idx_bot_configs_client ON bot_configurations(client_id);
CREATE INDEX idx_bot_configs_key ON bot_configurations(config_key);
CREATE INDEX idx_bot_configs_category ON bot_configurations(category);
CREATE INDEX idx_bot_configs_default ON bot_configurations(is_default) WHERE is_default = true;
CREATE INDEX idx_bot_configs_client_key ON bot_configurations(client_id, config_key);
```

**RLS Policies:**
- `Clients can view their own configurations and defaults` - SELECT (client_id = auth.user_client_id() OR is_default = true)
- `Clients can update their own configurations` - UPDATE (client_id = auth.user_client_id() AND is_default = false)
- `Clients can insert their own configurations` - INSERT (client_id = auth.user_client_id() AND is_default = false)
- `Clients can delete their own configurations` - DELETE (client_id = auth.user_client_id() AND is_default = false)

**Example Config Keys:**
- `intent_classifier:prompt`
- `entity_extractor:config`
- `personality:traits`
- `continuity:threshold_hours`
- `fast_track:enabled`
- `node_enabled:generateAIResponse`

---

#### 9. `message_templates` - WhatsApp Templates
**Purpose:** WhatsApp Business message templates (pre-approved by Meta).

```sql
CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Template identity
  name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'pt_BR',
  category TEXT NOT NULL CHECK (category IN ('MARKETING', 'UTILITY', 'AUTHENTICATION')),

  -- Template structure
  header_type TEXT CHECK (header_type IN ('TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT')),
  header_text TEXT,
  header_media_url TEXT,

  body_text TEXT NOT NULL,
  footer_text TEXT,

  -- Buttons (JSONB array)
  buttons JSONB DEFAULT '[]'::jsonb,

  -- Meta approval
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  template_id TEXT,  -- Meta template ID

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(client_id, name, language)
);
```

---

### AI Gateway & Budget Tables

#### 10. `gateway_configurations` - AI Gateway Config
**Purpose:** Vercel AI Gateway configuration per client.

```sql
CREATE TABLE gateway_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Gateway key (stored in Vault)
  gateway_api_key_secret_id UUID REFERENCES vault.secrets(id),
  gateway_key_name TEXT,

  -- Configuration
  use_gateway BOOLEAN DEFAULT false,
  cache_enabled BOOLEAN DEFAULT true,
  cache_ttl_seconds INTEGER DEFAULT 3600,

  -- Fallback chains (JSONB array)
  fallback_chains JSONB DEFAULT '[]'::jsonb,
  -- Example: ["openai/gpt-4o", "anthropic/claude-3-5-sonnet-20241022", "groq/llama-3.3-70b-versatile"]

  -- Provider preferences (JSONB)
  provider_preferences JSONB DEFAULT '{}'::jsonb,
  -- Example: {"openai": {"temperature": 0.7}, "anthropic": {"max_tokens": 4000}}

  -- Rate limits
  max_requests_per_minute INTEGER DEFAULT 100,
  max_tokens_per_minute INTEGER DEFAULT 50000,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(client_id)
);
```

**RLS Policies:**
- `Admins can manage gateway configurations` - ALL (role = 'admin')
- `Clients can view own gateway configuration` - SELECT (client_id = auth.user_client_id())

---

#### 11. `ai_models_registry` - AI Models Catalog
**Purpose:** Catalog of available AI models with pricing and capabilities.

```sql
CREATE TABLE ai_models_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Model identification
  provider TEXT NOT NULL,  -- 'openai', 'anthropic', 'groq', 'google'
  model_name TEXT NOT NULL,  -- 'gpt-4o', 'claude-3-5-sonnet-20241022', etc.
  gateway_identifier TEXT NOT NULL UNIQUE,  -- 'openai/gpt-4o'

  -- Capabilities (JSONB)
  capabilities JSONB NOT NULL,
  -- Example: {"text": true, "vision": true, "tools": true, "streaming": true}

  -- Context limits
  context_window INTEGER,     -- Ex: 128000 tokens
  max_output_tokens INTEGER,  -- Ex: 16384 tokens

  -- Pricing (USD per million tokens)
  input_price_per_million NUMERIC(10, 6) NOT NULL,
  output_price_per_million NUMERIC(10, 6) NOT NULL,
  cached_input_price_per_million NUMERIC(10, 6),

  -- Status
  is_active BOOLEAN DEFAULT true,
  description TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(provider, model_name)
);
```

**Seed Models (Migration 20251212_seed_ai_models_registry.sql):**
- OpenAI: gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo, whisper-1, text-embedding-3-small
- Anthropic: claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022
- Groq: llama-3.3-70b-versatile, llama-3.1-70b-versatile

---

#### 12. `gateway_usage_logs` - AI Usage Tracking
**Purpose:** Detailed logs of ALL AI requests (chat, whisper, vision, embeddings, TTS).

```sql
CREATE TABLE gateway_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant isolation
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,

  -- API type (Migration 20251213_unified_api_tracking.sql)
  api_type TEXT DEFAULT 'chat' CHECK (api_type IN ('chat', 'whisper', 'vision', 'embeddings', 'image-gen', 'tts')),

  -- Request metadata
  request_id TEXT,
  model_registry_id UUID REFERENCES ai_models_registry(id),
  provider TEXT NOT NULL,
  model_name TEXT NOT NULL,

  -- Token usage
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cached_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,

  -- Non-token units (for Whisper, Vision, TTS)
  input_units INTEGER DEFAULT 0,   -- Whisper: seconds of audio
  output_units INTEGER DEFAULT 0,  -- Vision/Image-gen: number of images

  -- Performance metrics
  latency_ms INTEGER,

  -- Cache & Fallback
  was_cached BOOLEAN DEFAULT false,
  was_fallback BOOLEAN DEFAULT false,
  fallback_reason TEXT,

  -- Cost tracking
  cost_usd NUMERIC(12, 8),
  cost_brl NUMERIC(12, 2),
  usd_to_brl_rate NUMERIC(8, 4),

  -- Additional data
  metadata JSONB DEFAULT '{}'::jsonb,
  error_details JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_gateway_usage_logs_client_id ON gateway_usage_logs(client_id);
CREATE INDEX idx_gateway_usage_logs_conversation_id ON gateway_usage_logs(conversation_id);
CREATE INDEX idx_gateway_usage_logs_created_at ON gateway_usage_logs(created_at DESC);
CREATE INDEX idx_gateway_usage_logs_provider ON gateway_usage_logs(provider);
CREATE INDEX idx_gateway_usage_logs_model_name ON gateway_usage_logs(model_name);
CREATE INDEX idx_gateway_usage_logs_was_cached ON gateway_usage_logs(was_cached);
CREATE INDEX idx_gateway_usage_logs_was_fallback ON gateway_usage_logs(was_fallback);
CREATE INDEX idx_gateway_usage_logs_api_type ON gateway_usage_logs(api_type, created_at DESC);
CREATE INDEX idx_gateway_usage_logs_client_api ON gateway_usage_logs(client_id, api_type, created_at DESC);
```

**RLS Policies:**
- `Admins can view all usage logs` - SELECT (role = 'admin')
- `Clients can view own usage logs` - SELECT (client_id = auth.user_client_id())
- `System can insert usage logs` - INSERT (true)

---

#### 13. `client_budgets` - Budget Control
**Purpose:** Budget limits per client for AI usage.

```sql
CREATE TABLE client_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Budget limits (BRL)
  monthly_limit_brl NUMERIC(12, 2),
  daily_limit_brl NUMERIC(12, 2),

  -- Current usage (reset monthly/daily)
  current_month_spent_brl NUMERIC(12, 2) DEFAULT 0,
  current_day_spent_brl NUMERIC(12, 2) DEFAULT 0,

  -- Alert thresholds (%)
  alert_threshold_percent INTEGER DEFAULT 80,

  -- Last reset timestamps
  last_monthly_reset TIMESTAMPTZ DEFAULT DATE_TRUNC('month', NOW()),
  last_daily_reset TIMESTAMPTZ DEFAULT DATE_TRUNC('day', NOW()),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(client_id)
);
```

**Function:**
```sql
CREATE FUNCTION checkBudgetAvailable(p_client_id UUID, p_estimated_cost_brl NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_budget RECORD;
BEGIN
  SELECT * INTO v_budget FROM client_budgets WHERE client_id = p_client_id;

  IF NOT FOUND THEN
    RETURN true; -- No budget = unlimited
  END IF;

  -- Check monthly limit
  IF v_budget.monthly_limit_brl IS NOT NULL
     AND (v_budget.current_month_spent_brl + p_estimated_cost_brl) > v_budget.monthly_limit_brl THEN
    RETURN false;
  END IF;

  -- Check daily limit
  IF v_budget.daily_limit_brl IS NOT NULL
     AND (v_budget.current_day_spent_brl + p_estimated_cost_brl) > v_budget.daily_limit_brl THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;
```

---

### CRM Tables

#### 14. `crm_columns` - CRM Kanban Columns
**Purpose:** Customizable Kanban columns for lead management.

```sql
CREATE TABLE crm_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Column properties
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  color TEXT DEFAULT 'default',  -- Tailwind color: 'mint', 'blue', 'gold'
  icon TEXT DEFAULT 'users',      -- Lucide icon name

  -- Ordering
  position INTEGER NOT NULL DEFAULT 0,

  -- Auto-move rules (JSONB)
  auto_rules JSONB DEFAULT '{}',

  -- System flags
  is_default BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_client_column_slug UNIQUE (client_id, slug),
  CONSTRAINT unique_client_column_position UNIQUE (client_id, position) DEFERRABLE INITIALLY DEFERRED
);
```

**Default Columns (seeded via crm_seed_default_columns function):**
1. Novo Lead (blue, user-plus) - Default column
2. Qualificando (gold, user-check)
3. Proposta (mint, file-text)
4. Fechado (mint, check-circle)

---

#### 15. `crm_cards` - CRM Lead Cards
**Purpose:** Kanban cards representing leads.

```sql
CREATE TABLE crm_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES crm_columns(id) ON DELETE RESTRICT,

  -- Contact reference
  phone NUMERIC NOT NULL,

  -- Card positioning
  position INTEGER NOT NULL DEFAULT 0,

  -- Auto-status tracking
  auto_status TEXT DEFAULT 'neutral' CHECK (auto_status IN ('awaiting_attendant', 'awaiting_client', 'neutral')),
  auto_status_updated_at TIMESTAMPTZ,

  -- Assignment
  assigned_to UUID REFERENCES user_profiles(id),
  assigned_at TIMESTAMPTZ,

  -- Lead value
  estimated_value NUMERIC(12,2),
  currency TEXT DEFAULT 'BRL',
  probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,

  -- Last interaction tracking
  last_message_at TIMESTAMPTZ,
  last_message_direction TEXT CHECK (last_message_direction IN ('incoming', 'outgoing')),
  last_message_preview TEXT,

  -- Timestamps
  moved_to_column_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Foreign key to clientes_whatsapp
  CONSTRAINT fk_card_contact FOREIGN KEY (phone, client_id)
    REFERENCES clientes_whatsapp(telefone, client_id),
  CONSTRAINT unique_client_phone_card UNIQUE (client_id, phone)
);
```

**Function:**
```sql
CREATE FUNCTION crm_move_card(
  p_card_id UUID,
  p_target_column_id UUID,
  p_target_position INTEGER DEFAULT NULL
)
RETURNS void
-- Atomically moves card between columns, handling position shifts
```

**Trigger:**
```sql
CREATE FUNCTION auto_create_crm_card()
RETURNS TRIGGER
-- Automatically creates a CRM card when new contact is added to clientes_whatsapp
```

---

#### 16. `crm_tags` - CRM Tags
**Purpose:** Tags for categorizing leads.

```sql
CREATE TABLE crm_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  color TEXT DEFAULT 'blue',
  description TEXT,

  -- System flags
  is_system BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_client_tag_name UNIQUE (client_id, name)
);
```

---

#### 17. `crm_card_tags` - Card-Tag Junction
**Purpose:** Many-to-many relationship between cards and tags.

```sql
CREATE TABLE crm_card_tags (
  card_id UUID NOT NULL REFERENCES crm_cards(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES crm_tags(id) ON DELETE CASCADE,

  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES user_profiles(id),

  PRIMARY KEY (card_id, tag_id)
);
```

---

#### 18. `crm_notes` - Notes
**Purpose:** Notes attached to CRM cards.

```sql
CREATE TABLE crm_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES crm_cards(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  content TEXT NOT NULL,
  created_by UUID REFERENCES user_profiles(id),

  is_pinned BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### 19. `scheduled_messages` - Scheduled Messages
**Purpose:** Schedule messages to be sent at specific times.

```sql
CREATE TABLE scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Target
  phone NUMERIC NOT NULL,
  card_id UUID REFERENCES crm_cards(id) ON DELETE SET NULL,

  -- Message content
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'template')),
  content TEXT,
  template_id UUID REFERENCES message_templates(id),
  template_params JSONB,

  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'America/Sao_Paulo',

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  wamid TEXT,

  -- Metadata
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### 20. `lead_sources` - Lead Source Tracking
**Purpose:** Track where leads came from (Meta Ads, organic, referral).

```sql
CREATE TABLE lead_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  phone NUMERIC NOT NULL,

  -- Source information
  source_type TEXT NOT NULL CHECK (source_type IN ('meta_ads', 'organic', 'referral', 'manual')),
  source_name TEXT,

  -- Meta Ads specific fields
  meta_campaign_id TEXT,
  meta_campaign_name TEXT,
  meta_adset_id TEXT,
  meta_adset_name TEXT,
  meta_ad_id TEXT,
  meta_ad_name TEXT,

  -- UTM tracking
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,

  -- Raw data
  raw_referral_data JSONB,

  -- First touch attribution
  first_contact_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### 21. `crm_automation_rules` - CRM Automation
**Purpose:** Automation rules for CRM (auto-move, auto-tag, auto-assign).

```sql
CREATE TABLE crm_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- Rule definition
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('time_in_column', 'no_response', 'message_received', 'tag_added')),
  trigger_config JSONB NOT NULL,

  -- Action
  action_type TEXT NOT NULL CHECK (action_type IN ('move_column', 'add_tag', 'send_message', 'assign_user', 'notify')),
  action_config JSONB NOT NULL,

  -- Status
  is_enabled BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 100,

  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### 22. `crm_activity_log` - Activity History
**Purpose:** Audit log of CRM actions.

```sql
CREATE TABLE crm_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES crm_cards(id) ON DELETE CASCADE,

  -- Activity details
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'column_move', 'tag_add', 'tag_remove', 'note_add',
    'assigned', 'status_change', 'value_change', 'created'
  )),
  description TEXT,

  -- Change tracking
  old_value JSONB,
  new_value JSONB,

  -- Actor
  performed_by UUID REFERENCES user_profiles(id),
  is_automated BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Interactive Flows Tables

#### 23. `interactive_flows` - Flow Definitions
**Purpose:** Visual flow builder for chatbot interactions.

```sql
CREATE TABLE interactive_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,

  -- Triggers
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('keyword', 'qr_code', 'link', 'manual', 'always')),
  trigger_keywords TEXT[],  -- Array of keywords
  trigger_qr_code TEXT,

  -- Flow structure (JSONB)
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  start_block_id TEXT NOT NULL,

  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_blocks CHECK (jsonb_typeof(blocks) = 'array'),
  CONSTRAINT valid_edges CHECK (jsonb_typeof(edges) = 'array'),
  CONSTRAINT non_empty_name CHECK (char_length(name) > 0)
);
```

**Block Types:**
- `start` - Entry point
- `message` - Send text message
- `interactive_list` - WhatsApp list picker
- `interactive_buttons` - WhatsApp buttons
- `condition` - Conditional branching
- `action` - Execute action (update variable, etc.)
- `ai_handoff` - Transfer to AI
- `human_handoff` - Transfer to human
- `delay` - Wait before next block
- `webhook` - Call external API
- `end` - End flow

---

#### 24. `flow_executions` - Active Flow Sessions
**Purpose:** Track active flow executions per contact.

```sql
CREATE TABLE flow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES interactive_flows(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,

  -- Execution state
  current_block_id TEXT NOT NULL,
  variables JSONB DEFAULT '{}'::jsonb,
  history JSONB DEFAULT '[]'::jsonb,  -- Array of FlowStep objects

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'completed', 'paused', 'transferred_ai', 'transferred_human'
  )),

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_step_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  CONSTRAINT valid_variables CHECK (jsonb_typeof(variables) = 'object'),
  CONSTRAINT valid_history CHECK (jsonb_typeof(history) = 'array')
);

-- Unique constraint: One active execution per contact
CREATE UNIQUE INDEX unique_active_execution
  ON flow_executions(client_id, phone)
  WHERE status = 'active';
```

---

### Stripe Connect Tables

#### 25. `stripe_accounts` - Stripe Connect Accounts
**Purpose:** Stripe Connect accounts for platform billing.

```sql
CREATE TABLE stripe_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  stripe_account_id TEXT NOT NULL UNIQUE,
  account_status TEXT NOT NULL DEFAULT 'pending' CHECK (account_status IN (
    'pending', 'onboarding', 'active', 'restricted', 'disabled'
  )),

  charges_enabled BOOLEAN NOT NULL DEFAULT false,
  payouts_enabled BOOLEAN NOT NULL DEFAULT false,
  details_submitted BOOLEAN NOT NULL DEFAULT false,

  country TEXT NOT NULL DEFAULT 'us',
  currency TEXT NOT NULL DEFAULT 'usd',

  requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(client_id)
);
```

---

#### 26. `stripe_products` - Stripe Products
**Purpose:** Products available for sale via Stripe.

```sql
CREATE TABLE stripe_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL,
  stripe_product_id TEXT NOT NULL UNIQUE,
  stripe_price_id TEXT,

  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'one_time' CHECK (type IN ('one_time', 'subscription')),

  amount INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  interval TEXT CHECK (interval IS NULL OR interval IN ('month', 'year')),

  active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

#### 27. `stripe_subscriptions` - Stripe Subscriptions
**Purpose:** Active subscriptions.

```sql
CREATE TABLE stripe_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL,
  product_id UUID REFERENCES stripe_products(id) ON DELETE SET NULL,

  status TEXT NOT NULL,

  customer_email TEXT,
  customer_name TEXT,
  customer_phone TEXT,

  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  canceled_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

#### 28. `stripe_orders` - One-time Orders
**Purpose:** Track one-time payments.

```sql
CREATE TABLE stripe_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL,
  stripe_payment_intent_id TEXT NOT NULL UNIQUE,
  stripe_session_id TEXT,
  product_id UUID REFERENCES stripe_products(id) ON DELETE SET NULL,

  status TEXT NOT NULL,
  amount INTEGER NOT NULL,
  application_fee_amount INTEGER,
  currency TEXT NOT NULL DEFAULT 'usd',

  customer_email TEXT,
  customer_name TEXT,
  customer_phone TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

#### 29. `webhook_events` - Webhook Idempotency
**Purpose:** Track processed Stripe webhook events.

```sql
CREATE TABLE webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_scope TEXT NOT NULL DEFAULT 'v1',
  event_type TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN (
    'received', 'processing', 'processed', 'failed'
  )),

  error_message TEXT,
  processed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### Logging & Debug Tables

#### 30. `execution_logs` - Chatbot Flow Debug Logs
**Purpose:** Detailed logs of chatbot execution (per-node).

```sql
CREATE TABLE execution_logs (
  id BIGSERIAL PRIMARY KEY,
  execution_id UUID NOT NULL,  -- Groups all logs from one execution
  node_name TEXT NOT NULL,

  -- Data
  input_data JSONB,
  output_data JSONB,
  error JSONB,

  -- Status
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'error')),
  duration_ms INTEGER,

  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB,  -- client_id, user_phone, etc.

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_execution_logs_execution_id ON execution_logs(execution_id);
CREATE INDEX idx_execution_logs_timestamp ON execution_logs(timestamp DESC);
CREATE INDEX idx_execution_logs_node_name ON execution_logs(node_name);
CREATE INDEX idx_execution_logs_status ON execution_logs(status);
CREATE INDEX idx_execution_logs_exec_time ON execution_logs(execution_id, timestamp);
```

**RLS Policies:**
- `Enable read access for authenticated users` - SELECT (auth.role() = 'authenticated' OR auth.role() = 'service_role')
- `Enable insert for service role only` - INSERT (auth.role() = 'service_role')

---

#### 31. `usage_logs` - Legacy Usage Tracking
**Purpose:** Legacy usage tracking (replaced by gateway_usage_logs but kept for backward compatibility).

```sql
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,

  -- API provider
  source TEXT NOT NULL CHECK (source IN ('openai', 'groq', 'whisper', 'meta')),
  model TEXT,

  -- Token usage
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,

  -- Cost
  cost_usd NUMERIC(10, 6) DEFAULT 0,

  -- Legacy
  messages_sent INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Note:** Gradually being replaced by `gateway_usage_logs` which supports more API types.

---

### User Management Tables

#### 32. `user_invites` - Team Invitations
**Purpose:** Invite users to join a client workspace.

```sql
CREATE TABLE user_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  invited_by_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('client_admin', 'user')),
  invite_token TEXT NOT NULL UNIQUE,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```

**Function:**
```sql
CREATE FUNCTION auto_expire_invites()
RETURNS void
-- Updates pending invites to 'expired' if past expires_at
```

---

#### 33. `user_filter_preferences` - Dashboard Filter Preferences
**Purpose:** Save user's dashboard filter preferences.

```sql
CREATE TABLE user_filter_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Filter preferences (JSONB)
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, client_id)
);
```

---

#### 34. `user_chat_themes` - Chat UI Themes
**Purpose:** User-specific chat UI customization.

```sql
CREATE TABLE user_chat_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Theme mode
  theme_mode TEXT NOT NULL DEFAULT 'system' CHECK (theme_mode IN ('light', 'dark', 'system')),

  -- Background settings
  background_type TEXT NOT NULL DEFAULT 'color' CHECK (background_type IN ('color', 'gradient', 'image')),
  background_value TEXT,  -- Color hex, gradient CSS, or image URL

  -- Message bubble colors
  user_bubble_bg_light TEXT DEFAULT '#dcf8c6',
  user_bubble_text_light TEXT DEFAULT '#000000',
  bot_bubble_bg_light TEXT DEFAULT '#ffffff',
  bot_bubble_text_light TEXT DEFAULT '#000000',

  user_bubble_bg_dark TEXT DEFAULT '#056162',
  user_bubble_text_dark TEXT DEFAULT '#ffffff',
  bot_bubble_bg_dark TEXT DEFAULT '#1f2937',
  bot_bubble_text_dark TEXT DEFAULT '#e5e7eb',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);
```

---

### Miscellaneous Tables

#### 35. `pricing_config` - Custom Pricing Configuration
**Purpose:** Custom AI model pricing per client.

```sql
CREATE TABLE pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  provider TEXT NOT NULL,  -- 'openai', 'groq', 'whisper'
  model TEXT NOT NULL,

  -- Pricing (per 1K tokens or per minute)
  prompt_price DECIMAL(10, 8) NOT NULL DEFAULT 0,
  completion_price DECIMAL(10, 8) NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'per_1k_tokens',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(client_id, provider, model)
);
```

**Seed Defaults (Migration 012):**
- OpenAI: gpt-4 ($0.03/$0.06), gpt-4-turbo ($0.01/$0.03), gpt-4o ($0.005/$0.015), gpt-3.5-turbo ($0.0015/$0.002)
- Groq: llama-3.1-70b (free), llama-3.3-70b (free)
- Whisper: whisper-1 ($0.006/min)

---

#### 36. `tts_cache` - TTS Response Cache
**Purpose:** Cache TTS audio responses to avoid regeneration.

```sql
CREATE TABLE tts_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,

  -- Cache key (hash of text + voice + model)
  cache_key TEXT NOT NULL UNIQUE,

  -- Original request
  text TEXT NOT NULL,
  voice TEXT NOT NULL,
  model TEXT NOT NULL,

  -- Cached response
  audio_url TEXT NOT NULL,
  audio_duration_seconds NUMERIC(10, 2),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  use_count INTEGER DEFAULT 0
);
```

---

#### 37. `tts_usage_logs` - TTS Usage Tracking
**Purpose:** Track TTS API usage.

```sql
CREATE TABLE tts_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,

  model TEXT NOT NULL,
  voice TEXT NOT NULL,
  input_characters INTEGER NOT NULL,

  cost_usd NUMERIC(10, 6),
  was_cached BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### 38. `account_deletion_requests` - GDPR Account Deletion
**Purpose:** Track account deletion requests (GDPR compliance).

```sql
CREATE TABLE account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  email TEXT NOT NULL,
  reason TEXT,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),

  requested_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_deletion_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Row Level Security Policies

### Summary by Table

| Table | RLS Enabled | Policies |
|-------|-------------|----------|
| `clients` | ✅ | View own client, Admins view all, Client admins update own, Service role all |
| `user_profiles` | ❌ | Disabled to avoid recursion (policies in other tables use this) |
| `clientes_whatsapp` | ✅ | View own client customers, Service role all |
| `n8n_chat_histories` | ✅ | View own client histories, Service role all |
| `conversations` | ✅ | View/insert/update own client, Service role all |
| `messages` | ✅ | View/insert own client, Service role all |
| `documents` | ✅ | View own client, Client admins manage, Service role all |
| `bot_configurations` | ✅ | View own + defaults, Update/insert/delete own (not defaults) |
| `gateway_configurations` | ✅ | Admins manage all, Clients view own |
| `ai_models_registry` | ✅ | Anyone view active, Admins manage |
| `gateway_usage_logs` | ✅ | Admins view all, Clients view own, System insert |
| `execution_logs` | ✅ | Authenticated/service read, Service insert |
| `usage_logs` | ✅ | View own client, Service all |
| `pricing_config` | ✅ | View/insert/update/delete own client |
| `message_templates` | ✅ | Standard multi-tenant (own client only) |
| `interactive_flows` | ✅ | View/create/update/delete own client |
| `flow_executions` | ✅ | View own client, Service manage all |
| `crm_*` (all CRM tables) | ✅ | Service role full access (webhook needs it) |
| `stripe_*` (all Stripe tables) | ✅ | Read/write own client, Anon read active products |
| `user_invites` | ✅ | Client admins create/view/update/delete, Users view own by email |
| `tts_cache` | ✅ | Standard multi-tenant |
| `tts_usage_logs` | ✅ | Standard multi-tenant |

### Key RLS Patterns

**Pattern 1: Multi-tenant Isolation (most common)**
```sql
-- SELECT policy
CREATE POLICY "Users can view own client data"
  ON table_name FOR SELECT
  USING (client_id = auth.user_client_id());

-- INSERT policy
CREATE POLICY "Users can insert own client data"
  ON table_name FOR INSERT
  WITH CHECK (client_id = auth.user_client_id());

-- UPDATE policy
CREATE POLICY "Users can update own client data"
  ON table_name FOR UPDATE
  USING (client_id = auth.user_client_id())
  WITH CHECK (client_id = auth.user_client_id());

-- Service role bypass
CREATE POLICY "Service role can access all"
  ON table_name FOR ALL
  USING (auth.role() = 'service_role');
```

**Pattern 2: Admin Access**
```sql
CREATE POLICY "Admins can view all"
  ON table_name FOR SELECT
  USING (auth.user_role() = 'admin');
```

**Pattern 3: Client Admin Management**
```sql
CREATE POLICY "Client admins can manage"
  ON table_name FOR ALL
  USING (
    client_id = auth.user_client_id()
    AND auth.user_role() IN ('client_admin', 'admin')
  );
```

**Pattern 4: Public Read (Active Items)**
```sql
CREATE POLICY "Anyone can view active items"
  ON table_name FOR SELECT
  USING (is_active = true);
```

**Pattern 5: Anon Access (for public endpoints)**
```sql
CREATE POLICY "Anon can read active products"
  ON stripe_products FOR SELECT
  TO anon
  USING (active = true);
```

---

## Functions & RPCs

### Vault Functions

#### 1. `create_client_secret(secret_value, secret_name, secret_description)` → UUID
**Purpose:** Create encrypted secret in Supabase Vault. Returns secret_id.

```sql
CREATE FUNCTION create_client_secret(
  secret_value TEXT,
  secret_name TEXT,
  secret_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
```

**Usage:**
```sql
SELECT create_client_secret('sk-...', 'openai-key-acme', 'OpenAI key for Acme Corp');
-- Returns: UUID (e.g., 'a1b2c3d4-...')
```

---

#### 2. `get_client_secret(secret_id)` → TEXT
**Purpose:** Decrypt and retrieve secret from Vault.

```sql
CREATE FUNCTION get_client_secret(secret_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
```

**Usage:**
```sql
SELECT get_client_secret('a1b2c3d4-...');
-- Returns: 'sk-...'
```

---

#### 3. `update_client_secret(secret_id, new_secret_value)` → BOOLEAN
**Purpose:** Update existing secret in Vault.

```sql
CREATE FUNCTION update_client_secret(
  secret_id UUID,
  new_secret_value TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
```

---

#### 4. `delete_client_secret(secret_id)` → BOOLEAN
**Purpose:** Delete secret from Vault.

```sql
CREATE FUNCTION delete_client_secret(secret_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
```

---

#### 5. `upsert_vault_secret(key_name, secret_value, description)` → UUID
**Purpose:** Insert or update secret by name.

```sql
CREATE FUNCTION upsert_vault_secret(
  key_name TEXT,
  secret_value TEXT,
  description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
```

---

### Auth Helper Functions

#### 6. `auth.user_client_id()` → UUID
**Purpose:** Get client_id of authenticated user.

```sql
CREATE FUNCTION auth.user_client_id()
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT client_id FROM public.user_profiles WHERE id = auth.uid();
$$;
```

**Used in:** All RLS policies for multi-tenant filtering.

---

#### 7. `auth.user_role()` → TEXT
**Purpose:** Get role of authenticated user.

```sql
CREATE FUNCTION auth.user_role()
RETURNS TEXT
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$;
```

**Roles:** 'admin', 'client_admin', 'user'

---

#### 8. `get_current_user_role()` → TEXT
**Purpose:** Alias for auth.user_role().

---

#### 9. `user_has_role(required_role)` → BOOLEAN
**Purpose:** Check if user has specific role.

```sql
CREATE FUNCTION user_has_role(required_role TEXT)
RETURNS BOOLEAN
LANGUAGE SQL SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND role = required_role
    AND is_active = true
  );
$$;
```

---

#### 10. `user_is_admin()` → BOOLEAN
**Purpose:** Check if user is admin or client_admin.

```sql
CREATE FUNCTION user_is_admin()
RETURNS BOOLEAN
LANGUAGE SQL SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'client_admin')
    AND is_active = true
  );
$$;
```

---

#### 11. `check_email_exists(email_to_check)` → BOOLEAN
**Purpose:** Check if email already exists in auth.users.

```sql
CREATE FUNCTION check_email_exists(email_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE SQL SECURITY DEFINER
```

---

### RAG Functions

#### 12. `match_documents(query_embedding, match_count, filter_client_id)` → TABLE
**Purpose:** Vector similarity search for RAG.

```sql
CREATE FUNCTION match_documents(
  query_embedding vector(1536),
  match_count INT,
  filter_client_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
```

**Returns:** Top `match_count` documents ordered by cosine similarity.

**Usage:**
```typescript
const { data } = await supabase.rpc('match_documents', {
  query_embedding: embeddingArray,
  match_count: 5,
  filter_client_id: clientId
});
```

---

### Analytics Functions

#### 13. `get_daily_usage(p_client_id, p_days)` → TABLE
**Purpose:** Daily usage statistics.

```sql
CREATE FUNCTION get_daily_usage(
  p_client_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  source TEXT,
  total_tokens BIGINT,
  total_cost NUMERIC,
  request_count BIGINT
)
```

---

#### 14. `get_usage_by_conversation(p_client_id, p_days, p_limit)` → TABLE
**Purpose:** Usage grouped by conversation (top spenders).

```sql
CREATE FUNCTION get_usage_by_conversation(
  p_client_id UUID,
  p_days INTEGER DEFAULT 30,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  phone TEXT,
  conversation_name TEXT,
  total_tokens BIGINT,
  total_cost NUMERIC,
  request_count BIGINT,
  openai_tokens BIGINT,
  groq_tokens BIGINT
)
```

---

#### 15. `get_monthly_summary(p_client_id, p_year, p_month)` → TABLE
**Purpose:** Monthly summary by provider/model.

```sql
CREATE FUNCTION get_monthly_summary(
  p_client_id UUID,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
  p_month INTEGER DEFAULT EXTRACT(MONTH FROM NOW())::INTEGER
)
RETURNS TABLE (
  source TEXT,
  model TEXT,
  total_tokens BIGINT,
  prompt_tokens BIGINT,
  completion_tokens BIGINT,
  total_cost NUMERIC,
  request_count BIGINT
)
```

---

#### 16. `get_weekly_evolution(p_client_id, p_weeks)` → TABLE
**Purpose:** Weekly usage trends (last 12 weeks).

```sql
CREATE FUNCTION get_weekly_evolution(
  p_client_id UUID,
  p_weeks INTEGER DEFAULT 12
)
RETURNS TABLE (
  week_start DATE,
  week_number INTEGER,
  total_tokens BIGINT,
  openai_tokens BIGINT,
  groq_tokens BIGINT,
  total_cost NUMERIC
)
```

---

#### 17. `get_conversation_summary(p_client_id, p_limit)` → TABLE
**Purpose:** Dashboard conversation list with message counts.

```sql
CREATE FUNCTION get_conversation_summary(
  p_client_id UUID,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  conversation_id UUID,
  phone TEXT,
  name TEXT,
  status TEXT,
  last_message TEXT,
  last_update TIMESTAMPTZ,
  message_count BIGINT
)
```

---

#### 18. `get_usage_summary(p_client_id, p_start_date, p_end_date)` → TABLE
**Purpose:** Usage summary for date range.

```sql
CREATE FUNCTION get_usage_summary(
  p_client_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  source TEXT,
  total_tokens BIGINT,
  total_messages BIGINT,
  total_cost NUMERIC
)
```

---

### Pricing Functions

#### 19. `get_model_pricing(p_client_id, p_provider, p_model)` → TABLE
**Purpose:** Get custom pricing for model.

```sql
CREATE FUNCTION get_model_pricing(
  p_client_id UUID,
  p_provider TEXT,
  p_model TEXT
)
RETURNS TABLE (
  prompt_price DECIMAL,
  completion_price DECIMAL,
  unit TEXT
)
```

---

#### 20. `upsert_pricing_config(...)` → pricing_config
**Purpose:** Insert or update pricing configuration.

```sql
CREATE FUNCTION upsert_pricing_config(
  p_client_id UUID,
  p_provider TEXT,
  p_model TEXT,
  p_prompt_price DECIMAL,
  p_completion_price DECIMAL,
  p_unit TEXT DEFAULT 'per_1k_tokens'
)
RETURNS pricing_config
```

---

### CRM Functions

#### 21. `crm_move_card(p_card_id, p_target_column_id, p_target_position)` → void
**Purpose:** Atomically move CRM card between columns.

```sql
CREATE FUNCTION crm_move_card(
  p_card_id UUID,
  p_target_column_id UUID,
  p_target_position INTEGER DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
```

**Features:**
- Shifts positions in source column
- Shifts positions in target column
- Logs activity if column changed
- Atomic (transaction-safe)

---

#### 22. `crm_seed_default_columns(p_client_id)` → void
**Purpose:** Seed default CRM columns for new client.

```sql
CREATE FUNCTION crm_seed_default_columns(p_client_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
```

**Seeds:**
1. Novo Lead (blue, user-plus) - Default
2. Qualificando (gold, user-check)
3. Proposta (mint, file-text)
4. Fechado (mint, check-circle)

---

### Invite Functions

#### 23. `auto_expire_invites()` → void
**Purpose:** Expire pending invites past expires_at.

```sql
CREATE FUNCTION auto_expire_invites()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
```

**Note:** Should be run via cron (not set up by default).

---

### Budget Functions

#### 24. `checkBudgetAvailable(p_client_id, p_estimated_cost_brl)` → BOOLEAN
**Purpose:** Check if client has budget available.

```sql
CREATE FUNCTION checkBudgetAvailable(
  p_client_id UUID,
  p_estimated_cost_brl NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
```

**Checks:**
- Monthly limit
- Daily limit
- Returns true if no budget set (unlimited)

---

## Triggers

### Auto-Update Timestamps

#### `update_updated_at_column()` - Generic Trigger Function
**Applied to:**
- clients
- user_profiles
- bot_configurations
- gateway_configurations
- ai_models_registry
- gateway_cache_performance
- pricing_config
- message_templates
- interactive_flows
- crm_columns, crm_cards, crm_tags, crm_notes, scheduled_messages, crm_automation_rules
- stripe_accounts, stripe_products, stripe_subscriptions, stripe_orders
- user_filter_preferences
- user_chat_themes

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_<table>_updated_at
  BEFORE UPDATE ON <table>
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

### Auth Triggers

#### `handle_new_user()` - Auto-create user_profile on signup
**Trigger:** `on_auth_user_created`
**Table:** `auth.users`
**When:** AFTER INSERT

```sql
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, client_id, email, full_name, role)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'client_id')::UUID,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Note:** Migration 20260226140000 disables this trigger (manual profile creation preferred).

---

### CRM Triggers

#### `auto_create_crm_card()` - Auto-create CRM card for new contact
**Trigger:** `trg_auto_create_crm_card`
**Table:** `clientes_whatsapp`
**When:** AFTER INSERT

```sql
CREATE FUNCTION auto_create_crm_card()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_default_column_id UUID;
  v_next_position INTEGER;
BEGIN
  -- Get default column
  SELECT id INTO v_default_column_id
  FROM crm_columns
  WHERE client_id = NEW.client_id AND is_default = true
  LIMIT 1;

  IF v_default_column_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get next position
  SELECT COALESCE(MAX(position) + 1, 0) INTO v_next_position
  FROM crm_cards WHERE column_id = v_default_column_id;

  -- Create card
  INSERT INTO crm_cards (client_id, column_id, phone, position)
  VALUES (NEW.client_id, v_default_column_id, NEW.telefone, v_next_position)
  ON CONFLICT (client_id, phone) DO NOTHING;

  RETURN NEW;
END;
$$;
```

---

#### `update_crm_card_last_message()` - Sync last message from messages table
**Trigger:** `trg_update_crm_card_last_message`
**Table:** `messages`
**When:** AFTER INSERT

Syncs last_message_at, last_message_direction, last_message_preview to crm_cards.

---

### Agent Triggers

#### `update_agent_version_on_update()` - Bump agent version on config change
**Trigger:** `trg_update_agent_version`
**Table:** `agents`
**When:** BEFORE UPDATE

```sql
CREATE FUNCTION update_agent_version_on_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.config IS DISTINCT FROM OLD.config
     OR NEW.system_prompt IS DISTINCT FROM OLD.system_prompt THEN
    NEW.version = OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$$;
```

---

### Realtime Broadcast Triggers

**Tables with realtime broadcasts:**
- conversations
- messages
- clientes_whatsapp

**Example:**
```sql
CREATE FUNCTION broadcast_conversation_change()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
BEGIN
  payload := jsonb_build_object(
    'table', TG_TABLE_NAME,
    'operation', TG_OP,
    'client_id', COALESCE(NEW.client_id, OLD.client_id),
    'record', CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END
  );

  PERFORM pg_notify('realtime:conversations', payload::text);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversations_realtime_broadcast
  AFTER INSERT OR UPDATE OR DELETE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION broadcast_conversation_change();
```

---

## Views

### 1. `client_secrets_decrypted` - Decrypted Client Secrets
**Purpose:** View with all decrypted secrets for a client (SERVICE ROLE ONLY).

```sql
CREATE VIEW client_secrets_decrypted AS
SELECT
  c.id as client_id,
  c.name,
  c.slug,
  c.status,
  get_client_secret(c.meta_access_token_secret_id) as meta_access_token,
  get_client_secret(c.meta_verify_token_secret_id) as meta_verify_token,
  c.meta_phone_number_id,
  CASE
    WHEN c.openai_api_key_secret_id IS NOT NULL
    THEN get_client_secret(c.openai_api_key_secret_id)
    ELSE NULL
  END as openai_api_key,
  CASE
    WHEN c.groq_api_key_secret_id IS NOT NULL
    THEN get_client_secret(c.groq_api_key_secret_id)
    ELSE NULL
  END as groq_api_key,
  c.system_prompt,
  c.formatter_prompt,
  c.settings,
  c.notification_email
FROM clients c
WHERE c.status = 'active';
```

**⚠️ WARNING:** Use ONLY with service_role. Exposes decrypted secrets.

---

### 2. `"Clientes WhatsApp"` - Legacy Compatibility View
**Purpose:** Backward compatibility with n8n code.

```sql
CREATE VIEW "Clientes WhatsApp" AS
SELECT
  telefone,
  nome,
  status,
  created_at
FROM clientes_whatsapp;
```

**Features:**
- INSTEAD OF triggers for INSERT/UPDATE/DELETE
- Allows legacy code to continue working
- New code should use `clientes_whatsapp` directly

---

## Multi-Tenancy Analysis

### Tenant Isolation Strategy

**Root Table:** `clients`
**Tenant Key:** `client_id UUID`

### Multi-Tenant Tables (70+ tables)

All tables with `client_id` column:
- ✅ clientes_whatsapp
- ✅ n8n_chat_histories
- ✅ conversations
- ✅ messages
- ✅ documents
- ✅ bot_configurations
- ✅ gateway_configurations
- ✅ gateway_usage_logs
- ✅ client_budgets
- ✅ execution_logs
- ✅ usage_logs
- ✅ pricing_config
- ✅ message_templates
- ✅ interactive_flows
- ✅ flow_executions
- ✅ tts_cache
- ✅ tts_usage_logs
- ✅ user_invites
- ✅ user_filter_preferences
- ✅ scheduled_messages
- ✅ lead_sources
- ✅ All CRM tables (crm_columns, crm_cards, crm_tags, crm_notes, crm_automation_rules, crm_activity_log)
- ✅ All Stripe tables (stripe_accounts, stripe_products, stripe_subscriptions, stripe_orders)

### RLS Enforcement

**Primary Pattern:**
```sql
USING (client_id = auth.user_client_id())
```

**Implementation:**
- `auth.user_client_id()` reads from `user_profiles` table
- `user_profiles` links `auth.users.id` to `clients.id`
- All policies filter on `client_id`

### Critical Multi-Tenant Fixes

**Migration 009:** Fixed phone number constraint
- **Before:** `UNIQUE(telefone)` - GLOBAL unique (BAD!)
- **After:** `UNIQUE(telefone, client_id)` - Per-client unique (GOOD!)

**Migration 013:** Fixed primary key
- **Before:** `PRIMARY KEY (telefone)` - Single-column PK (BAD for multi-tenant!)
- **After:** `PRIMARY KEY (telefone, client_id)` - Composite PK (GOOD!)

**Impact:** Allows same phone number across different clients (proper isolation).

### Data Leakage Prevention

**Mechanisms:**
1. **RLS Policies:** All tables have tenant isolation via RLS
2. **Foreign Keys:** `client_id` cascades on DELETE
3. **Indexes:** Composite indexes include `client_id` for performance
4. **Functions:** All helper functions accept `filter_client_id` parameter
5. **Service Role:** Backend uses service_role (bypasses RLS) but manually filters

### Testing Multi-Tenancy

**Test Scenario:**
```sql
-- Create 2 clients
INSERT INTO clients (id, name, slug, ...) VALUES
  ('client-a', 'Company A', 'company-a', ...),
  ('client-b', 'Company B', 'company-b', ...);

-- Insert same phone in both clients (should work!)
INSERT INTO clientes_whatsapp (telefone, nome, client_id) VALUES
  (5554999999999, 'John Doe', 'client-a'),
  (5554999999999, 'Jane Smith', 'client-b');

-- User from client-a tries to query
SET search_path TO public;
SET ROLE authenticated;
SET request.jwt.claim.sub = '<user-a-uuid>';

SELECT * FROM clientes_whatsapp;
-- Should only return John Doe (client-a), NOT Jane Smith (client-b)
```

---

## Storage Buckets

### 1. `knowledge` - RAG Knowledge Base Files
**Purpose:** Store PDF/TXT files uploaded for RAG.

**Policies:**
```sql
-- Anyone can view (public read)
CREATE POLICY "Public read access"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'knowledge');

-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'knowledge');
```

**Note:** See `20251203000001_create_knowledge_storage_MANUAL_BUCKET.md` for manual setup instructions (buckets must be created via Supabase Dashboard).

---

### 2. `chat-backgrounds` - Chat Theme Backgrounds
**Purpose:** User-uploaded chat background images.

**Policies:**
```sql
-- Users can upload their own backgrounds
CREATE POLICY "Users can upload own backgrounds"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-backgrounds'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can view their own backgrounds
CREATE POLICY "Users can view own backgrounds"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-backgrounds'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

**Note:** See `20260201000001_create_chat_backgrounds_bucket_MANUAL.md` for manual setup.

---

## Migration Conflicts & Notes

### Conflicting/Duplicate Migrations

**Multiple migrations with same number:**
- `005_add_client_id_to_n8n_tables.sql` vs `005_fase1_vault_multi_tenant.sql`
- `007_add_wamid_to_chat_histories.sql` vs `007_auth_setup.sql`
- `008_create_first_user.sql` vs `008_phase4_admin_roles.sql`

**Resolution:** Migration numbers are not strictly enforced by Supabase. Files are executed in alphabetical order by filename.

---

### Debug Migrations (Non-Production)

**Files starting with `debug-`, `check-`, `verify-`, `fix-`, `diagnostic-`:**

These are **diagnostic queries**, not DDL migrations. They should be:
- Run manually for debugging
- NOT applied automatically
- Excluded from production deployments

**Examples:**
- `debug-gateway-flow.sql` - Debug gateway configuration
- `check-ai-gateway-config.sql` - Verify gateway setup
- `verify-vault-rpc-functions.sql` - Test vault functions
- `diagnostic-fast-track.sql` - Diagnose fast-track node

**Recommendation:** Move these to `/docs/debug-queries/` folder.

---

### Markdown Documentation Files

**Files ending in `.md` inside migrations folder:**

These are **documentation**, not migrations:
- `AUTHENTICATION_MIGRATION.md`
- `DYNAMIC_PROVIDER_SELECTION.md`
- `MULTI_TENANT_MIGRATION.md`
- `QUICK_FIX_SUMMARY.md`
- `README_FASE1.md`
- `STATUS_UPDATE_PHASE4.md`
- `VERCEL_DEPLOYMENT.md`
- `WEBHOOK_CONFIGURATION.md`
- `WHICH_MIGRATION_TO_RUN.md`
- `20251203000001_create_knowledge_storage_MANUAL_BUCKET.md`
- `20260201000001_create_chat_backgrounds_bucket_MANUAL.md`

**Recommendation:** Move to `/docs/migrations/` folder for clarity.

---

### Critical Security Fixes

**VULN-006:** Webhook deduplication fallback (`20251118_webhook_dedup_fallback_vuln006.sql`)
**VULN-007:** RLS policy fixes (`20251118_fix_rls_policies_vuln007.sql`)
**VULN-008:** Audit logging (`20251118_create_audit_log_vuln008.sql`)
**VULN-012:** Meta App Secret (HMAC validation) (`20251118_add_meta_app_secret.sql`)

---

### Table Renames & Backward Compatibility

**"Clientes WhatsApp" → clientes_whatsapp:**
- Migration 004: Renamed table (TypeScript compatibility)
- Created VIEW `"Clientes WhatsApp"` for backward compatibility
- INSTEAD OF triggers make VIEW fully writable
- New code should use `clientes_whatsapp` directly

---

### Primary Key Changes

**clientes_whatsapp Primary Key Evolution:**

1. **Initial:** `PRIMARY KEY (telefone)`
2. **Migration 009:** Added `UNIQUE(telefone, client_id)` constraint
3. **Migration 013:** Changed to `PRIMARY KEY (telefone, client_id)`

**Why critical:** Allows same phone number in different clients (multi-tenant isolation).

---

### Gateway vs Direct AI

**Architecture evolution:**

1. **Phase 1:** Direct OpenAI/Groq API calls
2. **Phase 2:** Vercel AI Gateway (shared config)
3. **Phase 3:** Client-specific Vault keys (current)

**Current status:**
- Gateway infrastructure tables exist (`gateway_configurations`, `ai_models_registry`, `gateway_usage_logs`)
- Clients can use either `vault` mode (direct API with client's keys) or `gateway` mode
- Controlled via `clients.ai_keys_mode` column

---

### Deprecated Tables

**None explicitly deprecated**, but usage patterns changing:
- `usage_logs` → Gradually replaced by `gateway_usage_logs` (more detailed)
- `n8n_chat_histories` → Still used, but `messages` table preferred for new features

---

## Summary Statistics

### Total Tables: ~70+

**Category Breakdown:**
- **Core:** 10 (clients, user_profiles, clientes_whatsapp, conversations, messages, documents, etc.)
- **Configuration:** 5 (bot_configurations, gateway_configurations, ai_models_registry, pricing_config, message_templates)
- **AI/Budget:** 4 (gateway_usage_logs, client_budgets, tts_cache, tts_usage_logs)
- **CRM:** 9 (crm_columns, crm_cards, crm_tags, crm_card_tags, crm_notes, scheduled_messages, lead_sources, crm_automation_rules, crm_activity_log)
- **Flows:** 2 (interactive_flows, flow_executions)
- **Stripe:** 5 (stripe_accounts, stripe_products, stripe_subscriptions, stripe_orders, webhook_events)
- **Auth/Users:** 3 (user_invites, user_filter_preferences, user_chat_themes, account_deletion_requests)
- **Logging:** 2 (execution_logs, usage_logs)

### Total Functions: ~25+

**Category Breakdown:**
- **Vault:** 5 (create, get, update, delete, upsert)
- **Auth:** 6 (user_client_id, user_role, user_has_role, user_is_admin, check_email_exists)
- **RAG:** 1 (match_documents)
- **Analytics:** 6 (get_daily_usage, get_usage_by_conversation, get_monthly_summary, get_weekly_evolution, get_conversation_summary, get_usage_summary)
- **Pricing:** 2 (get_model_pricing, upsert_pricing_config)
- **CRM:** 2 (crm_move_card, crm_seed_default_columns)
- **Budget:** 1 (checkBudgetAvailable)
- **Invites:** 1 (auto_expire_invites)

### Total Triggers: ~15+

**Types:**
- **Timestamp:** 20+ tables with `update_updated_at_column` trigger
- **Auth:** 1 (handle_new_user - disabled by default)
- **CRM:** 2 (auto_create_crm_card, update_crm_card_last_message)
- **Agents:** 1 (update_agent_version_on_update)
- **Realtime:** 3+ (conversations, messages, clientes_whatsapp)

### Total Indexes: ~150+

**Every table has:**
- Primary key index (automatic)
- Foreign key indexes (client_id, etc.)
- Search indexes (phone, email, created_at)
- Composite indexes for common queries

### Total RLS Policies: ~100+

**Coverage:** All tables with user data have RLS enabled (except user_profiles to avoid recursion).

---

## Final Notes

### Migration Execution Order

Supabase applies migrations in **alphabetical order by filename**. Numbering helps but isn't enforced.

**Recommended convention:**
```
YYYYMMDD_descriptive_name.sql
20251212_create_gateway_infrastructure.sql
```

### Safe Migration Practices

1. ✅ **ALWAYS use migrations** (never manual DDL in dashboard)
2. ✅ **Backup before risky changes:** `cd db && .\backup-complete.bat`
3. ✅ **Test locally first:** `supabase db reset` (local only!)
4. ✅ **Use transactions:** Wrap in `BEGIN; ... COMMIT;` for rollback safety
5. ✅ **Idempotent migrations:** Use `IF NOT EXISTS`, `CREATE OR REPLACE`
6. ✅ **Document breaking changes:** Comment in migration file

### RLS Performance

RLS adds **minimal overhead** (<5ms typical). Ensure indexes on `client_id` exist for best performance.

**Composite indexes:**
```sql
CREATE INDEX idx_table_client_created ON table(client_id, created_at DESC);
```

### Vault Security

- ✅ Secrets encrypted at rest (AES-256)
- ✅ Only decrypted via `SECURITY DEFINER` functions
- ✅ Never exposed to client (anon/authenticated roles)
- ✅ Service role can decrypt via `get_client_secret()`

### Next Steps for Schema Optimization

1. **Consolidate debug migrations** → Move to `/docs/debug-queries/`
2. **Remove unused tables** (if any identified)
3. **Add missing indexes** (run `EXPLAIN ANALYZE` on slow queries)
4. **Partition large tables** (e.g., `gateway_usage_logs` by date)
5. **Archive old data** (e.g., messages older than 1 year)

---

**End of Document**

This schema represents the complete database structure as of 2026-03-15, derived from analyzing 129 migration files in the ChatBot-Oficial project.

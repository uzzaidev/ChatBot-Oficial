# 🗄️ Arquitetura Completa do Banco de Dados - UZZ.AI ChatBot

**Gerado em:** 16/01/2026  
**Database:** PostgreSQL 17.6  
**Total de Tabelas:** 28  
**Total de Relacionamentos:** 294

---

## 📊 Diagrama ER Principal - Visão Geral Completa

```mermaid
erDiagram
    %% ============================================
    %% MÓDULO: AUTENTICAÇÃO E USUÁRIOS
    %% ============================================
    clients ||--o{ user_profiles : "tem"
    clients ||--o{ user_invites : "pode ter"
    user_profiles ||--o{ push_tokens : "tem"
    
    %% ============================================
    %% MÓDULO: CLIENTES E MULTI-TENANCY
    %% ============================================
    clients ||--o{ clientes_whatsapp : "possui"
    clients ||--o{ conversations : "tem"
    clients ||--o{ messages : "tem"
    clients ||--o{ client_budgets : "controla"
    clients ||--o{ bot_configurations : "configura"
    clients ||--o{ pricing_config : "define preços"
    clients ||--o{ documents : "armazena conhecimento"
    clients ||--o{ n8n_chat_histories : "tem histórico"
    clients ||--o{ interactive_flows : "cria fluxos"
    clients ||--o{ message_templates : "tem templates"
    clients ||--o{ gateway_usage_logs : "registra uso"
    clients ||--o{ usage_logs : "monitora"
    clients ||--o{ tts_cache : "cache TTS"
    clients ||--o{ tts_usage_logs : "log TTS"
    clients ||--o{ execution_logs : "log execuções"
    clients ||--o{ audit_logs : "audita ações"
    
    %% ============================================
    %% MÓDULO: CONVERSAS E MENSAGENS
    %% ============================================
    conversations ||--o{ messages : "contém"
    conversations ||--o{ gateway_usage_logs : "gera logs"
    conversations ||--o{ usage_logs : "gera logs"
    clientes_whatsapp ||--o{ conversations : "inicia"
    n8n_chat_histories ||--o{ conversations : "mantém histórico"
    
    %% ============================================
    %% MÓDULO: GATEWAY E IA
    %% ============================================
    ai_models_registry ||--o{ gateway_usage_logs : "usado por"
    ai_models_registry ||--o{ pricing_config : "tem preços"
    shared_gateway_config ||--o{ gateway_usage_logs : "configura"
    gateway_usage_logs ||--o{ gateway_cache_performance : "gera métricas"
    
    %% ============================================
    %% MÓDULO: BUDGET E PRICING
    %% ============================================
    plan_budgets ||--o{ client_budgets : "herda limites"
    client_budgets ||--o{ gateway_usage_logs : "consome budget"
    
    %% ============================================
    %% MÓDULO: FLUXOS INTERATIVOS
    %% ============================================
    interactive_flows ||--o{ flow_executions : "executa"
    conversations ||--o{ flow_executions : "pode usar"
    
    %% ============================================
    %% ENTIDADES PRINCIPAIS
    %% ============================================
    clients {
        uuid id PK
        text name
        text slug UK
        text status
        text plan
        uuid meta_access_token_secret_id FK
        uuid meta_verify_token_secret_id FK
        text meta_phone_number_id
        text meta_display_phone
        uuid openai_api_key_secret_id FK
        text openai_model
        uuid groq_api_key_secret_id FK
        text groq_model
        text system_prompt
        text formatter_prompt
        jsonb settings
        text notification_email
        text notification_webhook_url
        text primary_model_provider
        timestamptz created_at
        timestamptz updated_at
        uuid created_by FK
    }
    
    user_profiles {
        uuid id PK "Referencia auth.users"
        uuid client_id FK
        text email UK
        text full_name
        timestamptz created_at
        timestamptz updated_at
    }
    
    conversations {
        uuid id PK
        uuid client_id FK
        text phone UK
        text name
        text status "bot|humano|transferido|fluxo_inicial"
        text assigned_to
        text last_message
        timestamptz last_update
        timestamptz created_at
    }
    
    messages {
        uuid id PK
        uuid client_id FK
        uuid conversation_id FK
        text phone
        text name
        text content
        text type "text|audio|image|document|video"
        text direction "incoming|outgoing"
        text status "sent|delivered|read|failed|queued"
        timestamptz timestamp
        jsonb metadata
        text media_id
        text media_url
        text media_type
        text transcription
        integer audio_duration_seconds
        jsonb error_details
    }
    
    client_budgets {
        uuid id PK
        uuid client_id FK
        text budget_type "tokens|brl|both"
        numeric budget_limit
        text budget_period "monthly|weekly|daily"
        numeric current_usage
        numeric usage_percentage
        timestamptz last_reset_at
        timestamptz next_reset_at
        boolean alert_threshold_80
        boolean alert_threshold_90
        boolean alert_threshold_100
        boolean pause_at_limit
        boolean is_paused
        text notification_email
        boolean inherits_from_plan
        text budget_mode "brl"
        bigint token_limit
        bigint current_tokens
        numeric brl_limit
        numeric current_brl
        timestamptz created_at
        timestamptz updated_at
    }
    
    gateway_usage_logs {
        uuid id PK
        uuid client_id FK
        uuid conversation_id FK
        text phone
        text request_id
        uuid model_registry_id FK
        text provider
        text model_name
        integer input_tokens
        integer output_tokens
        integer cached_tokens
        integer total_tokens
        integer latency_ms
        boolean was_cached
        boolean was_fallback
        numeric cost_usd
        numeric cost_brl
        jsonb metadata
        jsonb error_details
        text api_type "chat|tts|embeddings"
        timestamptz created_at
    }
    
    ai_models_registry {
        uuid id PK
        text provider
        text model_name
        text gateway_identifier UK
        jsonb capabilities
        integer context_window
        integer max_output_tokens
        numeric input_price_per_million
        numeric output_price_per_million
        numeric cached_input_price_per_million
        boolean is_active
        text description
        timestamptz created_at
        timestamptz updated_at
    }
    
    interactive_flows {
        uuid id PK
        uuid client_id FK
        text name
        text description
        boolean is_active
        text trigger_type
        text[] trigger_keywords
        text trigger_qr_code
        jsonb blocks
        jsonb edges
        text start_block_id
        uuid created_by FK
        timestamptz created_at
        timestamptz updated_at
    }
    
    documents {
        bigint id PK
        text content
        jsonb metadata
        vector embedding "Vector RAG"
        uuid client_id FK
    }
    
    audit_logs {
        uuid id PK
        uuid user_id FK
        text user_email
        text user_role
        uuid client_id FK
        text action
        text resource_type
        text resource_id
        text endpoint
        text method
        jsonb changes
        jsonb metadata
        text status
        text error_message
        integer duration_ms
        timestamptz created_at
    }
```

---

## 📋 Módulos da Arquitetura

### 1️⃣ Autenticação e Usuários

```mermaid
flowchart TD
    A[Auth.users - Supabase] -->|1:1| B[user_profiles]
    B -->|N:1| C[clients]
    C -->|1:N| D[user_invites]
    B -->|1:N| E[push_tokens]
    
    style A fill:#1ABC9C
    style B fill:#2E86AB
    style C fill:#FFD700
    style D fill:#B0B0B0
    style E fill:#B0B0B0
```

**📝 Notas:**
- `user_profiles` vincula usuários do Supabase Auth aos clientes
- Multi-tenancy: cada usuário pertence a um cliente
- `push_tokens` para notificações mobile/web

---

### 2️⃣ Conversas e Mensagens

```mermaid
flowchart LR
    A[clientes_whatsapp] -->|inicia| B[conversations]
    B -->|contém| C[messages]
    B -->|usa| D[n8n_chat_histories]
    B -->|gera| E[gateway_usage_logs]
    B -->|monitora| F[usage_logs]
    
    style A fill:#1ABC9C
    style B fill:#2E86AB
    style C fill:#FFD700
    style D fill:#B0B0B0
    style E fill:#B0B0B0
    style F fill:#B0B0B0
```

**📊 Estados de Conversação:**

| Status | Descrição | Ícone |
|--------|-----------|-------|
| `bot` | Bot respondendo automaticamente | 🤖 |
| `humano` | Atendimento humano ativo | 👤 |
| `transferido` | Aguardando atendimento humano | ⏳ |
| `fluxo_inicial` | Fluxo interativo ativo | 🔄 |

---

### 3️⃣ Gateway e IA

```mermaid
graph TB
    A[shared_gateway_config] -->|configura| B[Gateway API]
    C[ai_models_registry] -->|lista modelos| B
    B -->|registra uso| D[gateway_usage_logs]
    D -->|gera métricas| E[gateway_cache_performance]
    D -->|usa modelo| C
    F[pricing_config] -->|preços| C
    
    style A fill:#1ABC9C
    style B fill:#2E86AB
    style C fill:#FFD700
    style D fill:#B0B0B0
    style E fill:#B0B0B0
    style F fill:#B0B0B0
```

**📝 Funcionalidades:**
- **Unified Gateway:** Roteamento inteligente de APIs de IA
- **Model Registry:** Catálogo de modelos (OpenAI, Groq, Anthropic, etc.)
- **Caching:** Cache de respostas para economia
- **Fallback Chain:** Cadeia de fallback automática

---

### 4️⃣ Budget e Pricing

```mermaid
flowchart TD
    A[plan_budgets] -->|define limites| B[client_budgets]
    B -->|monitora| C[gateway_usage_logs]
    C -->|consome| B
    D[pricing_config] -->|preços customizados| C
    
    E[Budget Types]
    E --> F[Tokens]
    E --> G[BRL]
    E --> H[Both]
    
    style A fill:#1ABC9C
    style B fill:#2E86AB
    style C fill:#FFD700
    style D fill:#B0B0B0
```

**💰 Tipos de Budget:**

| Tipo | Descrição | Métricas |
|------|-----------|----------|
| `tokens` | Limite por tokens | `token_limit`, `current_tokens` |
| `brl` | Limite por R$ | `brl_limit`, `current_brl` |
| `both` | Ambos os limites | Tokens + BRL |

---

### 5️⃣ Fluxos Interativos

```mermaid
graph LR
    A[interactive_flows] -->|define| B[Blocks + Edges]
    B -->|executa| C[flow_executions]
    D[conversations] -->|pode usar| A
    A -->|trigger| E[Keywords]
    A -->|trigger| F[QR Code]
    
    style A fill:#1ABC9C
    style B fill:#2E86AB
    style C fill:#FFD700
    style D fill:#B0B0B0
    style E fill:#B0B0B0
    style F fill:#B0B0B0
```

**📝 Estrutura:**
- **Blocks:** Blocos de interação (mensagem, condição, ação)
- **Edges:** Conexões entre blocos
- **Triggers:** Keywords ou QR Codes

---

### 6️⃣ RAG e Conhecimento

```mermaid
flowchart LR
    A[documents] -->|armazena| B[Vector Embeddings]
    B -->|similarity search| C[RAG Query]
    C -->|retorna| D[Contexto]
    D -->|usa| E[AI Gateway]
    
    style A fill:#1ABC9C
    style B fill:#2E86AB
    style C fill:#FFD700
    style D fill:#B0B0B0
    style E fill:#B0B0B0
```

**📝 Funcionalidades:**
- **Vector Store:** Armazenamento de embeddings (pgvector)
- **Similarity Search:** Busca por similaridade semântica
- **Multi-tenant:** Cada cliente tem seus documentos

---

### 7️⃣ TTS (Text-to-Speech)

```mermaid
graph LR
    A[messages] -->|texto| B[TTS Request]
    B -->|verifica| C[tts_cache]
    C -->|hit| D[Audio do Cache]
    C -->|miss| E[Gerar Audio]
    E -->|salva| C
    E -->|registra| F[tts_usage_logs]
    
    style A fill:#1ABC9C
    style B fill:#2E86AB
    style C fill:#FFD700
    style D fill:#B0B0B0
    style E fill:#B0B0B0
    style F fill:#B0B0B0
```

**📝 Cache Strategy:**
- Hash do texto + voz + provider
- Evita regenerar áudios idênticos
- Economia de custos e latência

---

## 📊 Tabelas Detalhadas por Categoria

### 🔐 Autenticação e Segurança

| Tabela | Descrição | Campos Principais |
|--------|-----------|-------------------|
| `user_profiles` | Perfis de usuários | `id`, `client_id`, `email` |
| `user_invites` | Convites de usuários | `id`, `client_id`, `email`, `token` |
| `push_tokens` | Tokens para push notifications | `id`, `user_id`, `token`, `platform` |
| `audit_logs` | Logs de auditoria | `id`, `user_id`, `action`, `resource_type` |

### 💬 Conversas e Mensagens

| Tabela | Descrição | Campos Principais |
|--------|-----------|-------------------|
| `conversations` | Conversas ativas | `id`, `client_id`, `phone`, `status` |
| `messages` | Mensagens individuais | `id`, `conversation_id`, `content`, `direction` |
| `n8n_chat_histories` | Histórico do n8n | `id`, `session_id`, `message` (JSONB) |
| `clientes_whatsapp` | Clientes WhatsApp | `telefone` (PK), `nome`, `status` |

### 🤖 IA e Gateway

| Tabela | Descrição | Campos Principais |
|--------|-----------|-------------------|
| `ai_models_registry` | Catálogo de modelos | `id`, `provider`, `model_name`, `gateway_identifier` |
| `shared_gateway_config` | Configuração do gateway | `id`, `gateway_api_key_secret_id` |
| `gateway_usage_logs` | Logs de uso do gateway | `id`, `client_id`, `model_registry_id`, `tokens` |
| `gateway_cache_performance` | Métricas de cache | `id`, `cache_key`, `hit_count`, `miss_count` |

### 💰 Budget e Pricing

| Tabela | Descrição | Campos Principais |
|--------|-----------|-------------------|
| `client_budgets` | Budgets por cliente | `id`, `client_id`, `budget_limit`, `current_usage` |
| `plan_budgets` | Budgets por plano | `id`, `plan_name`, `budget_limit` |
| `pricing_config` | Configuração de preços | `id`, `client_id`, `provider`, `model`, `prompt_price` |

### 📋 Fluxos e Templates

| Tabela | Descrição | Campos Principais |
|--------|-----------|-------------------|
| `interactive_flows` | Fluxos interativos | `id`, `client_id`, `blocks` (JSONB), `edges` (JSONB) |
| `flow_executions` | Execuções de fluxos | `id`, `flow_id`, `conversation_id`, `current_block_id` |
| `message_templates` | Templates de mensagens | `id`, `client_id`, `name`, `components` (JSONB) |

### 📚 RAG e Conhecimento

| Tabela | Descrição | Campos Principais |
|--------|-----------|-------------------|
| `documents` | Documentos RAG | `id`, `content`, `embedding` (vector), `metadata` |

### 🎤 TTS (Text-to-Speech)

| Tabela | Descrição | Campos Principais |
|--------|-----------|-------------------|
| `tts_cache` | Cache de áudios TTS | `id`, `client_id`, `text_hash`, `audio_url` |
| `tts_usage_logs` | Logs de uso TTS | `id`, `client_id`, `provider`, `duration_seconds` |

### 📊 Analytics e Logs

| Tabela | Descrição | Campos Principais |
|--------|-----------|-------------------|
| `usage_logs` | Logs de uso geral | `id`, `client_id`, `source`, `tokens_used` |
| `execution_logs` | Logs de execução n8n | `id`, `execution_id`, `node_name`, `status` |

---

## 🔗 Relacionamentos Críticos

### Cliente como Centro

```mermaid
mindmap
  root((clients))
    Autenticação
      user_profiles
      user_invites
    Conversas
      conversations
      messages
      clientes_whatsapp
    IA e Gateway
      gateway_usage_logs
      bot_configurations
      documents
    Budget
      client_budgets
      pricing_config
    Fluxos
      interactive_flows
      flow_executions
    Cache
      tts_cache
      tts_usage_logs
    Logs
      usage_logs
      execution_logs
      audit_logs
```

---

## 📈 Fluxo de Dados Principal

```mermaid
sequenceDiagram
    participant WA as WhatsApp
    participant API as Webhook API
    participant Conv as conversations
    participant Msg as messages
    participant GW as Gateway
    participant AI as AI Model
    participant Budget as client_budgets
    participant Logs as gateway_usage_logs
    
    WA->>API: Mensagem Recebida
    API->>Conv: Cria/Atualiza Conversa
    API->>Msg: Salva Mensagem
    API->>GW: Chama Gateway
    GW->>Budget: Verifica Budget
    Budget-->>GW: Budget OK
    GW->>AI: Chama Modelo IA
    AI-->>GW: Resposta
    GW->>Logs: Registra Uso
    Logs->>Budget: Atualiza Uso
    GW-->>API: Resposta IA
    API->>Msg: Salva Resposta
    API->>WA: Envia Mensagem
```

---

## 🔐 Segurança (RLS)

```mermaid
graph TD
    A[user_profiles] -->|identifica| B[client_id]
    B -->|isola| C[RLS Policies]
    C -->|protege| D[All Tables]
    
    E[79 RLS Policies]
    E --> F[SELECT Policies]
    E --> G[INSERT Policies]
    E --> H[UPDATE Policies]
    E --> I[DELETE Policies]
    
    style A fill:#1ABC9C
    style B fill:#2E86AB
    style C fill:#FFD700
    style E fill:#B0B0B0
```

**📝 Princípio:**
- Multi-tenancy garantido por RLS
- Cada cliente vê apenas seus dados
- Isolamento automático via `client_id`

---

## 📊 Estatísticas do Banco

| Métrica | Valor |
|---------|-------|
| **Total de Tabelas** | 28 |
| **Total de Colunas** | ~400+ |
| **Foreign Keys** | 294 |
| **RLS Policies** | 79 |
| **Triggers** | 19 |
| **Funções** | 202 |
| **Índices** | 182 |

---

## 🎯 Padrões de Design

### 1. Multi-Tenancy
- Todas as tabelas têm `client_id` (exceto `clients`)
- RLS garante isolamento
- `user_profiles` vincula usuário ao cliente

### 2. Soft Deletes
- Algumas tabelas usam `is_active` ou `status`
- Histórico preservado em backups

### 3. JSONB para Flexibilidade
- `settings`, `metadata`, `blocks`, `edges` em JSONB
- Permite evolução sem migrations

### 4. Timestamps Padrão
- `created_at` e `updated_at` em todas as tabelas
- Triggers automáticos para `updated_at`

### 5. UUIDs para PKs
- Maioria das tabelas usa UUID
- Evita exposição de sequências
- Melhor para distribuição

---

## 🔄 Migrations Status

### ✅ Sincronizadas (22 tabelas)
- `ai_models_registry`
- `audit_logs`
- `bot_configurations`
- `client_budgets`
- `clients`
- `conversations`
- E mais 16...

### ⚠️ Nas Migrations mas NÃO no Banco (6)
- `budget_plan_templates`
- `client_budget_limits`
- `gateway_configurations`
- E mais 3...

### ⚠️ No Banco mas NÃO nas Migrations (6)
- `clientes_whatsapp`
- `documents`
- `n8n_chat_histories`
- `push_tokens`
- E mais 2...

---

## 📝 Notas Finais

- **Database:** PostgreSQL 17.6 via Supabase
- **Extensions:** pgvector (RAG), pg_trgm (busca)
- **RLS:** 79 políticas ativas
- **Total de Migrations:** 89 arquivos SQL
- **Última Atualização:** 16/01/2026

---

**🎯 Este documento foi gerado automaticamente pelo script de exportação do schema.**


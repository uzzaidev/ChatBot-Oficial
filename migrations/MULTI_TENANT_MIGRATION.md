# 🏢 Plano de Migração Multi-Tenant

Documento completo para transformar o sistema atual (single-tenant) em uma plataforma SaaS multi-tenant completa.

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura Multi-Tenant](#arquitetura-multi-tenant)
3. [Mudanças no Schema (Banco de Dados)](#mudanças-no-schema-banco-de-dados)
4. [Sistema de Autenticação](#sistema-de-autenticação)
5. [Webhook Dinâmico por Cliente](#webhook-dinâmico-por-cliente)
6. [Sistema de Configuração por Cliente](#sistema-de-configuração-por-cliente)
7. [Reutilização de Nodes](#reutilização-de-nodes)
8. [Fluxo de Onboarding](#fluxo-de-onboarding-novo-cliente)
9. [Implementação Faseada](#implementação-faseada)
10. [Checklist Completo](#checklist-completo)

---

## Visão Geral

### Estado Atual (Single-Tenant)

```
Sistema atual:
├── 1 cliente (hardcoded)
├── Configuração em .env.local
├── Webhook único: /api/webhook
├── Prompt fixo em generateAIResponse.ts
└── Sem autenticação
```

### Estado Futuro (Multi-Tenant)

```
Sistema multi-tenant:
├── N clientes (dinâmico)
├── Configuração em banco de dados (por cliente)
├── Webhook por cliente: /api/webhook/[clientId]
├── Prompts customizáveis por cliente
├── Autenticação + autorização
├── Isolamento completo de dados
└── Dashboard de admin + cliente
```

---

## Arquitetura Multi-Tenant

### Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                       META WHATSAPP CLOUD API                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Cliente A: POST /api/webhook/client-a-uuid                         │
│  Cliente B: POST /api/webhook/client-b-uuid                         │
│  Cliente C: POST /api/webhook/client-c-uuid                         │
│                                                                      │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    WEBHOOK HANDLER (Dynamic)                         │
│              /api/webhook/[clientId]/route.ts                        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ 1. Fetch client config from DB
                             │ 2. Validate client is active
                             │ 3. Inject config into flow context
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  CHATBOT FLOW (Reusable)                             │
│                  src/flows/chatbotFlow.ts                            │
│                                                                      │
│  Recebe: { payload, clientConfig }                                  │
│  ├── clientConfig.apiKeys (Meta, OpenAI, Groq)                      │
│  ├── clientConfig.prompts (system, formatter)                       │
│  ├── clientConfig.settings (batching delay, max tokens)             │
│  └── clientConfig.features (RAG enabled?, tools enabled?)           │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ Usa mesmos NODES (src/nodes/*)
                             │ Mas com config dinâmica
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         NODES (Reusable)                             │
│                                                                      │
│  - generateAIResponse(input, clientConfig)                          │
│    → Usa clientConfig.prompts.systemPrompt                          │
│                                                                      │
│  - sendWhatsAppMessage(input, clientConfig)                         │
│    → Usa clientConfig.apiKeys.metaAccessToken                       │
│                                                                      │
│  - getRAGContext(input, clientConfig)                               │
│    → Query WHERE client_id = clientConfig.id                        │
└─────────────────────────────────────────────────────────────────────┘
```

### Princípios de Design

1. **Isolamento de Dados**: Cada cliente vê apenas seus dados
2. **Reutilização de Código**: Mesmos nodes, config dinâmica
3. **Segurança**: Row-Level Security (RLS) no Supabase
4. **Escalabilidade**: Webhooks horizontalmente escaláveis
5. **Flexibilidade**: Config 100% customizável por cliente

---

## Mudanças no Schema (Banco de Dados)

### 🔐 Supabase Vault para Secrets

**IMPORTANTE**: Todos os secrets (API keys, tokens) serão armazenados usando **Supabase Vault** com criptografia AES-256.

#### Por que Vault?

1. **Segurança**: Secrets criptografados no banco
2. **Compliance**: LGPD, GDPR, ISO 27001
3. **Auditoria**: Logs automáticos de acesso
4. **Isolamento**: RLS funciona normalmente
5. **Rotação**: Atualização de keys simplificada

#### Como funciona?

```sql
-- ❌ SEM Vault (INSEGURO)
INSERT INTO clients (meta_access_token) VALUES ('EAA123456...');
-- Token fica em texto plano no banco!

-- ✅ COM Vault (SEGURO)
SELECT vault.create_secret('EAA123456...', 'client-a-meta-token');
-- Retorna: '550e8400-e29b-41d4-a716-446655440000'

INSERT INTO clients (meta_access_token_secret_id) VALUES ('550e8400-...');
-- Apenas ID do secret fica no banco!

-- Para ler:
SELECT vault.decrypted_secret FROM vault.decrypted_secrets
WHERE id = '550e8400-...';
-- Retorna: 'EAA123456...' (descriptografado em runtime)
```

#### Configuração do Vault

```sql
-- 1. Habilitar extensão (já vem habilitada no Supabase)
-- Se necessário:
CREATE EXTENSION IF NOT EXISTS vault WITH SCHEMA vault;

-- 2. Verificar se está funcionando
SELECT vault.create_secret('test-secret-value', 'test-secret');
```

---

### Nova Tabela: `clients`

Armazena configuração de cada cliente (tenant). **Secrets protegidos com Vault**.

```sql
CREATE TABLE clients (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,                  -- Ex: "Empresa ABC Ltda"
  slug TEXT UNIQUE NOT NULL,           -- Ex: "empresa-abc" (usado na URL)

  -- Status
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'suspended' | 'trial'
  plan TEXT NOT NULL DEFAULT 'free',      -- 'free' | 'pro' | 'enterprise'

  -- 🔐 Credenciais Meta (WhatsApp) - Armazenadas no Vault
  meta_access_token_secret_id UUID NOT NULL,  -- ← ID do secret no Vault
  meta_verify_token_secret_id UUID NOT NULL,  -- ← ID do secret no Vault
  meta_phone_number_id TEXT NOT NULL,         -- Não é secret (ID público)
  meta_display_phone TEXT,                    -- Ex: "555499567051" (display)

  -- 🔐 Credenciais OpenAI - Armazenadas no Vault
  openai_api_key_secret_id UUID,              -- ← ID do secret no Vault (NULL = usa global)
  openai_model TEXT DEFAULT 'gpt-4o',         -- Modelo para visão

  -- 🔐 Credenciais Groq - Armazenadas no Vault
  groq_api_key_secret_id UUID,                -- ← ID do secret no Vault (NULL = usa global)
  groq_model TEXT DEFAULT 'llama-3.3-70b-versatile',

  -- Prompts Customizados (não são secrets)
  system_prompt TEXT NOT NULL,                -- Prompt principal do agente
  formatter_prompt TEXT,                      -- Prompt do formatador (opcional)

  -- Configurações de Comportamento
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

  -- Notificações
  notification_email TEXT,                    -- Email para handoff notifications
  notification_webhook_url TEXT,              -- Webhook para eventos (opcional)

  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('active', 'suspended', 'trial', 'cancelled')),
  CONSTRAINT valid_plan CHECK (plan IN ('free', 'pro', 'enterprise'))
);

-- Índices
CREATE UNIQUE INDEX idx_clients_slug ON clients(slug);
CREATE INDEX idx_clients_status ON clients(status) WHERE status = 'active';

-- Trigger para updated_at
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

### Funções Helper para Vault

```sql
-- Função para criar secret e retornar ID
CREATE OR REPLACE FUNCTION create_client_secret(
  secret_value TEXT,
  secret_name TEXT,
  secret_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  secret_id UUID;
BEGIN
  -- Criar secret no Vault
  INSERT INTO vault.secrets (secret, name, description)
  VALUES (secret_value, secret_name, secret_description)
  RETURNING id INTO secret_id;

  RETURN secret_id;
END;
$$;

-- Função para ler secret descriptografado
CREATE OR REPLACE FUNCTION get_client_secret(secret_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  secret_value TEXT;
BEGIN
  SELECT decrypted_secret INTO secret_value
  FROM vault.decrypted_secrets
  WHERE id = secret_id;

  RETURN secret_value;
END;
$$;

-- View para facilitar leitura (apenas para service role)
CREATE OR REPLACE VIEW client_secrets_decrypted AS
SELECT
  c.id as client_id,
  c.name,
  c.slug,
  get_client_secret(c.meta_access_token_secret_id) as meta_access_token,
  get_client_secret(c.meta_verify_token_secret_id) as meta_verify_token,
  CASE
    WHEN c.openai_api_key_secret_id IS NOT NULL
    THEN get_client_secret(c.openai_api_key_secret_id)
    ELSE NULL
  END as openai_api_key,
  CASE
    WHEN c.groq_api_key_secret_id IS NOT NULL
    THEN get_client_secret(c.groq_api_key_secret_id)
    ELSE NULL
  END as groq_api_key
FROM clients c
WHERE c.status = 'active';
```

---

### Modificação: `clientes_whatsapp` (Adicionar client_id)

```sql
-- Adicionar coluna client_id
ALTER TABLE clientes_whatsapp
  ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- Preencher com valor padrão (migração de dados existentes)
UPDATE clientes_whatsapp
  SET client_id = (SELECT id FROM clients WHERE slug = 'default-client' LIMIT 1)
  WHERE client_id IS NULL;

-- Tornar obrigatório após migração
ALTER TABLE clientes_whatsapp
  ALTER COLUMN client_id SET NOT NULL;

-- Índice composto
CREATE INDEX idx_clientes_whatsapp_client_phone
  ON clientes_whatsapp(client_id, telefone);

-- Constraint única (phone é único por cliente, mas pode repetir entre clientes)
DROP INDEX IF EXISTS idx_telefone;
CREATE UNIQUE INDEX idx_clientes_whatsapp_unique
  ON clientes_whatsapp(client_id, telefone);
```

---

### Modificação: `n8n_chat_histories` (Adicionar client_id)

```sql
-- Adicionar coluna client_id
ALTER TABLE n8n_chat_histories
  ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- Migração de dados existentes
UPDATE n8n_chat_histories
  SET client_id = (
    SELECT client_id FROM clientes_whatsapp
    WHERE telefone::TEXT = n8n_chat_histories.session_id
    LIMIT 1
  )
  WHERE client_id IS NULL;

-- Tornar obrigatório
ALTER TABLE n8n_chat_histories
  ALTER COLUMN client_id SET NOT NULL;

-- Novo índice composto (substituir o antigo)
DROP INDEX IF EXISTS idx_chat_histories_session_created;
CREATE INDEX idx_chat_histories_client_session_created
  ON n8n_chat_histories(client_id, session_id, created_at DESC);
```

---

### Modificação: `documents` (RAG - Adicionar client_id)

```sql
-- Adicionar coluna client_id
ALTER TABLE documents
  ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- Migração (assumindo que documentos atuais são do cliente padrão)
UPDATE documents
  SET client_id = (SELECT id FROM clients WHERE slug = 'default-client' LIMIT 1)
  WHERE client_id IS NULL;

-- Tornar obrigatório
ALTER TABLE documents
  ALTER COLUMN client_id SET NOT NULL;

-- Índice
CREATE INDEX idx_documents_client ON documents(client_id);

-- Atualizar RPC function match_documents para incluir client_id
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(1536),
  match_count INT,
  filter_client_id UUID
) RETURNS SETOF documents
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM documents
  WHERE client_id = filter_client_id
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

### Nova Tabela: `conversations` (Rastreamento de Conversas)

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Dados do cliente (WhatsApp user)
  phone TEXT NOT NULL,
  customer_name TEXT,

  -- Estado da conversa
  status TEXT NOT NULL DEFAULT 'bot',  -- 'bot' | 'waiting' | 'human' | 'resolved'
  assigned_to UUID REFERENCES auth.users(id),  -- Atendente humano (se transferido)

  -- Metadados
  last_message_at TIMESTAMPTZ,
  message_count INT DEFAULT 0,
  unread_count INT DEFAULT 0,

  -- Tags/Categorias
  tags TEXT[],

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,

  CONSTRAINT unique_conversation UNIQUE(client_id, phone)
);

-- Índices
CREATE INDEX idx_conversations_client_status
  ON conversations(client_id, status);
CREATE INDEX idx_conversations_last_message
  ON conversations(client_id, last_message_at DESC);
```

---

### Nova Tabela: `messages` (Histórico Enriquecido)

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Dados da mensagem
  phone TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',  -- 'text' | 'audio' | 'image' | 'video'
  direction TEXT NOT NULL,            -- 'incoming' | 'outgoing'

  -- Status
  status TEXT DEFAULT 'sent',  -- 'sent' | 'delivered' | 'read' | 'failed'

  -- Metadados WhatsApp
  whatsapp_message_id TEXT,

  -- Custos (para tracking)
  tokens_used INT,
  cost_usd NUMERIC(10, 6),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_direction CHECK (direction IN ('incoming', 'outgoing')),
  CONSTRAINT valid_type CHECK (type IN ('text', 'audio', 'image', 'video', 'document'))
);

-- Índices
CREATE INDEX idx_messages_conversation
  ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_client
  ON messages(client_id, created_at DESC);
```

---

### Nova Tabela: `usage_logs` (Tracking de Custos)

```sql
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Tipo de uso
  service TEXT NOT NULL,  -- 'openai' | 'groq' | 'meta' | 'redis'
  operation TEXT NOT NULL, -- 'chat_completion' | 'transcription' | 'embedding' | 'send_message'

  -- Custo
  tokens_input INT,
  tokens_output INT,
  tokens_total INT,
  cost_usd NUMERIC(10, 6),

  -- Metadados
  metadata JSONB,  -- { model, phone, message_id, etc }

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_usage_logs_client_created
  ON usage_logs(client_id, created_at DESC);
CREATE INDEX idx_usage_logs_service
  ON usage_logs(service, created_at DESC);
```

---

### Row-Level Security (RLS)

Habilitar RLS para isolamento de dados:

```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_chat_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins veem tudo
CREATE POLICY "Admins can see all clients"
  ON clients FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- Policy: Usuários veem apenas seu client
CREATE POLICY "Users can see own client"
  ON clients FOR SELECT
  USING (id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::UUID);

-- Policy para clientes_whatsapp
CREATE POLICY "Users see own client customers"
  ON clientes_whatsapp FOR ALL
  USING (client_id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::UUID);

-- Policy para n8n_chat_histories
CREATE POLICY "Users see own client chat history"
  ON n8n_chat_histories FOR ALL
  USING (client_id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::UUID);

-- Policy para documents
CREATE POLICY "Users see own client documents"
  ON documents FOR ALL
  USING (client_id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::UUID);

-- Policy para conversations
CREATE POLICY "Users see own client conversations"
  ON conversations FOR ALL
  USING (client_id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::UUID);

-- Policy para messages
CREATE POLICY "Users see own client messages"
  ON messages FOR ALL
  USING (client_id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::UUID);

-- Policy para usage_logs
CREATE POLICY "Users see own client usage"
  ON usage_logs FOR ALL
  USING (client_id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::UUID);
```

---

## Sistema de Autenticação

### Stack: Supabase Auth + NextAuth.js

**Decisão**: Usar Supabase Auth (já integrado com banco).

### Setup Supabase Auth

```sql
-- Criar tabela de users (já existe no Supabase Auth)
-- Adicionar metadados customizados

-- Função para criar perfil ao signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role, client_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    (NEW.raw_user_meta_data->>'client_id')::UUID
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Tabela: `user_profiles`

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,

  -- Relacionamento com cliente
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Roles
  role TEXT NOT NULL DEFAULT 'user',  -- 'admin' | 'client_admin' | 'user'

  -- Permissões
  permissions JSONB DEFAULT '{
    "can_view_analytics": true,
    "can_manage_conversations": true,
    "can_edit_settings": false,
    "can_manage_users": false
  }'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_role CHECK (role IN ('admin', 'client_admin', 'user'))
);

-- RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Client admins can view team members"
  ON user_profiles FOR SELECT
  USING (
    client_id = (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
    AND (
      (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'client_admin'
      OR id = auth.uid()
    )
  );
```

---

### Middleware de Autenticação

Criar middleware Next.js para proteger rotas:

```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Refresh session if expired
  await supabase.auth.getSession()

  // Protected routes
  if (req.nextUrl.pathname.startsWith('/dashboard')) {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  // Admin-only routes
  if (req.nextUrl.pathname.startsWith('/admin')) {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*']
}
```

---

## Webhook Dinâmico por Cliente

### Nova Estrutura de Rotas

```
Antes:
/api/webhook (único webhook)

Depois:
/api/webhook/[clientId] (webhook por cliente)
```

### Implementação: `/api/webhook/[clientId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { processChatbotMessage } from '@/flows/chatbotFlow'
import type { ClientConfig } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: {
    clientId: string
  }
}

// GET: Webhook verification (Meta)
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  const { clientId } = params
  const searchParams = request.nextUrl.searchParams

  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe') {
    // Fetch client config
    const supabase = createServerClient()
    const { data: client, error } = await supabase
      .from('clients')
      .select('meta_verify_token, status')
      .eq('id', clientId)
      .eq('status', 'active')
      .single()

    if (error || !client) {
      console.error('[Webhook] Client not found or inactive:', clientId)
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Verify token
    if (token === client.meta_verify_token) {
      console.log('[Webhook] Verification successful for client:', clientId)
      return new NextResponse(challenge, { status: 200 })
    }
  }

  return new NextResponse('Forbidden', { status: 403 })
}

// POST: Process webhook messages
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { clientId } = params
    console.log(`[Webhook] POST received for client: ${clientId}`)

    // 1. Fetch client configuration
    const supabase = createServerClient()
    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('status', 'active')
      .single()

    if (error || !client) {
      console.error('[Webhook] Client not found or inactive:', clientId)
      return new NextResponse('Client not found', { status: 404 })
    }

    // 2. Parse webhook payload
    const body = await request.json()
    console.log('[Webhook] Payload received:', JSON.stringify(body, null, 2))

    // 3. Build client config object
    const clientConfig: ClientConfig = {
      id: client.id,
      name: client.name,
      slug: client.slug,
      apiKeys: {
        metaAccessToken: client.meta_access_token,
        metaPhoneNumberId: client.meta_phone_number_id,
        openaiApiKey: client.openai_api_key || process.env.OPENAI_API_KEY!,
        groqApiKey: client.groq_api_key || process.env.GROQ_API_KEY!,
      },
      prompts: {
        systemPrompt: client.system_prompt,
        formatterPrompt: client.formatter_prompt,
      },
      settings: client.settings as any,
      notificationEmail: client.notification_email,
    }

    // 4. Process message with client-specific config
    const result = await processChatbotMessage(body, clientConfig)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Webhook] Error processing message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## Sistema de Configuração por Cliente

### Type Definitions: `src/lib/types.ts`

```typescript
export interface ClientConfig {
  id: string
  name: string
  slug: string

  apiKeys: {
    metaAccessToken: string
    metaPhoneNumberId: string
    openaiApiKey: string
    groqApiKey: string
  }

  prompts: {
    systemPrompt: string
    formatterPrompt?: string
  }

  settings: {
    batchingDelaySeconds: number
    maxTokens: number
    temperature: number
    enableRAG: boolean
    enableTools: boolean
    enableHumanHandoff: boolean
    messageSplitEnabled: boolean
    maxChatHistory: number
  }

  notificationEmail?: string
}
```

---

### Helper Function: `src/lib/config.ts`

```typescript
import { createServerClient } from './supabase'
import type { ClientConfig } from './types'

/**
 * 🔐 Busca secret descriptografado do Vault
 */
const getSecret = async (supabase: any, secretId: string | null): Promise<string | null> => {
  if (!secretId) return null

  const { data, error } = await supabase.rpc('get_client_secret', {
    secret_id: secretId
  })

  if (error) {
    console.error('[getSecret] Failed to decrypt secret:', error)
    return null
  }

  return data
}

/**
 * ✅ Busca configuração completa do cliente com secrets descriptografados
 */
export const getClientConfig = async (clientId: string): Promise<ClientConfig | null> => {
  const supabase = createServerClient()

  // 1. Buscar config do cliente (sem secrets)
  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .eq('status', 'active')
    .single()

  if (error || !client) {
    console.error('[getClientConfig] Failed to fetch client:', error)
    return null
  }

  // 2. Descriptografar secrets do Vault em paralelo
  const [metaAccessToken, metaVerifyToken, openaiApiKey, groqApiKey] = await Promise.all([
    getSecret(supabase, client.meta_access_token_secret_id),
    getSecret(supabase, client.meta_verify_token_secret_id),
    getSecret(supabase, client.openai_api_key_secret_id),
    getSecret(supabase, client.groq_api_key_secret_id),
  ])

  // 3. Fallback para env vars globais se cliente não tiver keys próprias
  const finalOpenaiKey = openaiApiKey || process.env.OPENAI_API_KEY!
  const finalGroqKey = groqApiKey || process.env.GROQ_API_KEY!

  if (!metaAccessToken || !metaVerifyToken) {
    console.error('[getClientConfig] Missing required Meta secrets for client:', clientId)
    return null
  }

  // 4. Retornar config completo
  return {
    id: client.id,
    name: client.name,
    slug: client.slug,
    apiKeys: {
      metaAccessToken,                           // ✅ Descriptografado do Vault
      metaVerifyToken,                           // ✅ Descriptografado do Vault
      metaPhoneNumberId: client.meta_phone_number_id,  // Não é secret
      openaiApiKey: finalOpenaiKey,              // ✅ Vault ou global
      groqApiKey: finalGroqKey,                  // ✅ Vault ou global
    },
    prompts: {
      systemPrompt: client.system_prompt,
      formatterPrompt: client.formatter_prompt,
    },
    settings: client.settings as any,
    notificationEmail: client.notification_email,
  }
}

/**
 * Valida se config tem todos os campos obrigatórios
 */
export const validateClientConfig = (config: ClientConfig): boolean => {
  const required = [
    config.apiKeys.metaAccessToken,
    config.apiKeys.metaPhoneNumberId,
    config.apiKeys.openaiApiKey,
    config.apiKeys.groqApiKey,
    config.prompts.systemPrompt,
  ]

  return required.every(field => field && field.length > 0)
}
```

---

## Reutilização de Nodes

### Modificação: `chatbotFlow.ts`

**ANTES** (hardcoded env vars):
```typescript
export const processChatbotMessage = async (payload: any) => {
  // ... nodes usam process.env diretamente
}
```

**DEPOIS** (config dinâmica):
```typescript
export const processChatbotMessage = async (
  payload: any,
  clientConfig: ClientConfig
) => {
  const logger = createExecutionLogger()
  const executionId = logger.startExecution({
    source: 'chatbotFlow',
    clientId: clientConfig.id,
  })

  try {
    // NODE 1: Filter
    const filteredPayload = filterStatusUpdates(payload)
    if (!filteredPayload) {
      return { success: true, filtered: true }
    }

    // NODE 2: Parse
    const parsedMessage = parseMessage(filteredPayload)

    // NODE 3: Check/Create Customer (com client_id)
    const customer = await checkOrCreateCustomer({
      phone: parsedMessage.phone,
      name: parsedMessage.name,
      clientId: clientConfig.id,  // ← NOVO
    })

    // ... demais nodes

    // NODE 10: Generate AI Response (com config de prompt)
    const aiResponse = await generateAIResponse({
      message: batchedMessages,
      chatHistory,
      ragContext,
      customerName: parsedMessage.name,
      systemPrompt: clientConfig.prompts.systemPrompt,  // ← NOVO
      apiKey: clientConfig.apiKeys.groqApiKey,          // ← NOVO
      settings: clientConfig.settings,                   // ← NOVO
    })

    // NODE 12: Send WhatsApp (com token da config)
    await sendWhatsAppMessage({
      phone: parsedMessage.phone,
      messages: formattedMessages,
      accessToken: clientConfig.apiKeys.metaAccessToken,     // ← NOVO
      phoneNumberId: clientConfig.apiKeys.metaPhoneNumberId, // ← NOVO
    })

    return { success: true, messagesSent: formattedMessages.length }
  } catch (error) {
    logger.logError(error)
    logger.finishExecution('error')
    throw error
  }
}
```

---

### Exemplo de Node Modificado: `generateAIResponse.ts`

**ANTES**:
```typescript
export const generateAIResponse = async (input: GenerateAIResponseInput) => {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })  // ❌ Hardcoded

  const messages = [
    { role: 'system', content: MAIN_AGENT_SYSTEM_PROMPT },  // ❌ Hardcoded
    // ...
  ]

  return await groq.chat.completions.create({ messages, ... })
}
```

**DEPOIS**:
```typescript
export interface GenerateAIResponseInput {
  message: string
  chatHistory: ChatMessage[]
  ragContext: string
  customerName: string
  systemPrompt: string        // ← NOVO (dinâmico)
  apiKey: string              // ← NOVO (dinâmico)
  settings: {                 // ← NOVO (dinâmico)
    maxTokens: number
    temperature: number
  }
}

export const generateAIResponse = async (input: GenerateAIResponseInput) => {
  const { systemPrompt, apiKey, settings } = input

  const groq = new Groq({ apiKey })  // ✅ Usa config do cliente

  const messages = [
    { role: 'system', content: systemPrompt },  // ✅ Usa prompt do cliente
    // ...
  ]

  return await groq.chat.completions.create({
    messages,
    max_tokens: settings.maxTokens,        // ✅ Usa settings do cliente
    temperature: settings.temperature,
    // ...
  })
}
```

---

### Checklist de Modificações nos Nodes

| Node | Mudança Necessária | Prioridade |
|------|-------------------|------------|
| `filterStatusUpdates` | Nenhuma (pure function) | - |
| `parseMessage` | Nenhuma (pure function) | - |
| `checkOrCreateCustomer` | Adicionar `clientId` ao upsert | 🔴 Alta |
| `downloadMetaMedia` | Passar `accessToken` como parâmetro | 🔴 Alta |
| `transcribeAudio` | Passar `openaiApiKey` como parâmetro | 🔴 Alta |
| `analyzeImage` | Passar `openaiApiKey` como parâmetro | 🔴 Alta |
| `normalizeMessage` | Nenhuma (pure function) | - |
| `pushToRedis` | Adicionar `clientId` ao key Redis | 🟡 Média |
| `saveChatMessage` | Adicionar `clientId` ao INSERT | 🔴 Alta |
| `batchMessages` | Adicionar `clientId` ao key Redis | 🟡 Média |
| `getChatHistory` | Adicionar `WHERE client_id = ?` | 🔴 Alta |
| `getRAGContext` | Adicionar `filterClientId` ao RPC | 🔴 Alta |
| `generateAIResponse` | Passar `systemPrompt`, `apiKey`, `settings` | 🔴 Alta |
| `formatResponse` | Passar `formatterPrompt` (opcional) | 🟢 Baixa |
| `sendWhatsAppMessage` | Passar `accessToken`, `phoneNumberId` | 🔴 Alta |
| `handleHumanHandoff` | Passar `notificationEmail`, `clientId` | 🔴 Alta |

---

## Fluxo de Onboarding (Novo Cliente)

### Passo 1: Criação de Cliente via Admin Dashboard

```typescript
// /app/admin/clients/new/page.tsx

const createClient = async (formData: ClientFormData) => {
  const supabase = createClientBrowser()

  // 1. 🔐 Criar secrets no Vault
  const metaAccessTokenSecretId = await supabase.rpc('create_client_secret', {
    secret_value: formData.metaAccessToken,
    secret_name: `${formData.slug}-meta-access-token`,
    secret_description: `Meta Access Token for ${formData.name}`
  }).then(r => r.data)

  const metaVerifyToken = generateSecureToken()
  const metaVerifyTokenSecretId = await supabase.rpc('create_client_secret', {
    secret_value: metaVerifyToken,
    secret_name: `${formData.slug}-meta-verify-token`,
    secret_description: `Meta Verify Token for ${formData.name}`
  }).then(r => r.data)

  // Opcional: OpenAI e Groq keys próprias
  let openaiSecretId = null
  let groqSecretId = null

  if (formData.openaiApiKey) {
    openaiSecretId = await supabase.rpc('create_client_secret', {
      secret_value: formData.openaiApiKey,
      secret_name: `${formData.slug}-openai-key`,
    }).then(r => r.data)
  }

  if (formData.groqApiKey) {
    groqSecretId = await supabase.rpc('create_client_secret', {
      secret_value: formData.groqApiKey,
      secret_name: `${formData.slug}-groq-key`,
    }).then(r => r.data)
  }

  // 2. Criar registro de cliente (apenas IDs dos secrets)
  const { data: client, error } = await supabase
    .from('clients')
    .insert({
      name: formData.name,
      slug: formData.slug,
      meta_access_token_secret_id: metaAccessTokenSecretId,  // ✅ ID do Vault
      meta_verify_token_secret_id: metaVerifyTokenSecretId,  // ✅ ID do Vault
      meta_phone_number_id: formData.metaPhoneNumberId,
      openai_api_key_secret_id: openaiSecretId,              // ✅ ID do Vault ou NULL
      groq_api_key_secret_id: groqSecretId,                  // ✅ ID do Vault ou NULL
      system_prompt: DEFAULT_SYSTEM_PROMPT,
      settings: DEFAULT_SETTINGS,
    })
    .select()
    .single()

  if (error) throw error

  // 3. Criar usuário admin do cliente
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: formData.adminEmail,
    password: generateTempPassword(),
    email_confirm: true,
    user_metadata: {
      client_id: client.id,
      role: 'client_admin',
    }
  })

  if (authError) throw authError

  // 4. Retornar info para configuração
  const webhookUrl = `https://chat.luisfboff.com/api/webhook/${client.id}`

  return {
    clientId: client.id,
    webhookUrl,
    verifyToken: metaVerifyToken,  // ✅ Token gerado (não-criptografado para exibir)
    adminEmail: formData.adminEmail,
    tempPassword: generateTempPassword(),
  }
}
```

---

### Passo 2: Configuração do Webhook na Meta

**Manual** (admin do cliente):

1. Acessar Meta Developers Console
2. Selecionar o app WhatsApp Business
3. Configurar Webhook:
   - **Callback URL**: `https://chat.luisfboff.com/api/webhook/{clientId}`
   - **Verify Token**: (valor fornecido no dashboard)
4. Subscrever eventos: `messages`

**Automático** (futuro):
- API da Meta permite configurar webhook programaticamente
- Implementar endpoint `/api/admin/clients/[id]/setup-webhook`

---

### Passo 3: Customização de Prompts

Dashboard do cliente permite editar:

```typescript
// /app/dashboard/settings/prompts/page.tsx

const updatePrompts = async (clientId: string, prompts: { system: string, formatter?: string }) => {
  const supabase = createClientBrowser()

  const { error } = await supabase
    .from('clients')
    .update({
      system_prompt: prompts.system,
      formatter_prompt: prompts.formatter,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)

  if (error) throw error
}
```

---

### Passo 4: Upload de Documentos RAG (Opcional)

```typescript
// /app/dashboard/knowledge-base/upload/page.tsx

const uploadDocument = async (clientId: string, file: File) => {
  // 1. Processar arquivo (PDF, TXT, MD)
  const content = await parseFile(file)

  // 2. Gerar embedding
  const embedding = await generateEmbedding(content)

  // 3. Salvar no banco
  const supabase = createClientBrowser()
  await supabase
    .from('documents')
    .insert({
      client_id: clientId,
      content,
      embedding,
      metadata: {
        filename: file.name,
        filesize: file.size,
        uploaded_at: new Date().toISOString(),
      }
    })
}
```

---

## Implementação Faseada

### FASE 1: Database & Vault (Semana 1-2)

**Objetivo**: Preparar infraestrutura de dados com segurança

#### Database Schema
- [ ] Criar tabela `clients` (com `_secret_id` para Vault)
- [ ] Adicionar coluna `client_id` NULLABLE em todas as tabelas existentes
- [ ] Criar índices compostos

#### 🔐 Supabase Vault
- [ ] Verificar que extensão `vault` está habilitada
- [ ] Criar funções SQL helper (`create_client_secret`, `get_client_secret`)
- [ ] Criar view `client_secrets_decrypted`
- [ ] Testar criação e leitura de secrets

#### Migração de Dados (SAFE)
- [ ] Criar cliente "default" no Supabase
- [ ] Mover secrets do `.env.local` para Vault
- [ ] Popular `client_id` em todas as tabelas (apontar para "default")
- [ ] Tornar `client_id` NOT NULL após migração
- [ ] **Validar que sistema continua funcionando!**

#### Row-Level Security
- [ ] Habilitar RLS em todas as tabelas
- [ ] Criar policies básicas (admin vê tudo)
- [ ] Testar isolamento de dados

#### TypeScript Helpers
- [ ] Criar `lib/config.ts` com `getClientConfig()` usando Vault
- [ ] Criar `lib/vault.ts` com funções auxiliares
- [ ] Testar descriptografia de secrets

**Entrega**: Schema multi-tenant pronto + Vault funcionando + dados migrados

---

### FASE 2: Config System (Semana 2)

**Objetivo**: Sistema de configuração dinâmica

- [ ] Criar `getClientConfig()` helper
- [ ] Modificar `chatbotFlow.ts` para aceitar `ClientConfig`
- [ ] Atualizar nodes para receber config dinâmica
- [ ] Testar com 2 clientes mock
- [ ] Validar isolamento de dados

**Entrega**: Flow funciona com config por cliente

---

### FASE 3: Webhook Dinâmico (Semana 3)

**Objetivo**: Webhook por cliente

- [ ] Criar `/api/webhook/[clientId]/route.ts`
- [ ] Implementar verificação (GET)
- [ ] Implementar processamento (POST)
- [ ] Testar com 2 webhooks simultâneos
- [ ] Configurar webhooks na Meta (manual)

**Entrega**: Webhooks independentes funcionando

---

### FASE 4: Admin Dashboard (Semana 4)

**Objetivo**: Interface de gerenciamento

- [ ] Criar layout admin (`/app/admin`)
- [ ] Página de listagem de clientes
- [ ] Formulário de criação de cliente
- [ ] Página de edição de cliente
- [ ] Página de configuração de prompts
- [ ] Página de usuários do cliente
- [ ] Implementar permissões (admin vs client_admin)

**Entrega**: Admin pode criar e gerenciar clientes

---

### FASE 5: Client Dashboard (Semana 5)

**Objetivo**: Dashboard do cliente final

- [ ] Adaptar dashboard existente para multi-tenant
- [ ] Filtrar conversas por `client_id`
- [ ] Página de configurações (prompts, settings)
- [ ] Página de knowledge base (upload RAG)
- [ ] Página de usuários da equipe
- [ ] Página de analytics (custos, mensagens)

**Entrega**: Cliente pode gerenciar seu próprio chatbot

---

### FASE 6: Features Avançadas (Semana 6)

**Objetivo**: Melhorias e otimizações

- [ ] Tracking de custos (populate `usage_logs`)
- [ ] Dashboard de analytics avançado
- [ ] Sistema de billing (Stripe)
- [ ] Testes automatizados (Playwright)
- [ ] Documentação completa
- [ ] Onboarding automatizado

**Entrega**: Sistema SaaS completo e polido

---

## Checklist Completo

### Database

- [ ] Criar tabela `clients`
- [ ] Adicionar `client_id` em `clientes_whatsapp`
- [ ] Adicionar `client_id` em `n8n_chat_histories`
- [ ] Adicionar `client_id` em `documents`
- [ ] Criar tabela `conversations`
- [ ] Criar tabela `messages`
- [ ] Criar tabela `usage_logs`
- [ ] Criar tabela `user_profiles`
- [ ] Configurar RLS em todas as tabelas
- [ ] Migrar dados existentes para cliente default
- [ ] Atualizar RPC `match_documents` para incluir `client_id`
- [ ] Criar índices compostos
- [ ] Testar performance de queries

### Authentication

- [ ] Configurar Supabase Auth
- [ ] Criar trigger `handle_new_user()`
- [ ] Implementar middleware Next.js
- [ ] Criar páginas de login/signup
- [ ] Implementar proteção de rotas
- [ ] Configurar roles (admin, client_admin, user)
- [ ] Testar fluxo completo de auth

### Config System

- [ ] Criar type `ClientConfig`
- [ ] Implementar `getClientConfig()`
- [ ] Implementar `validateClientConfig()`
- [ ] Modificar `chatbotFlow.ts` para aceitar config
- [ ] Modificar todos os nodes (ver checklist de nodes acima)
- [ ] Testar isolamento entre clientes

### Webhook

- [ ] Criar `/api/webhook/[clientId]/route.ts`
- [ ] Implementar GET (verification)
- [ ] Implementar POST (processing)
- [ ] Testar com 2 clientes simultâneos
- [ ] Adicionar logging por cliente
- [ ] Documentar setup de webhook

### Admin Dashboard

- [ ] Layout admin (`/app/admin/layout.tsx`)
- [ ] Listagem de clientes
- [ ] Criar cliente (form + validação)
- [ ] Editar cliente
- [ ] Deletar cliente (soft delete)
- [ ] Visualizar config de cliente
- [ ] Gerenciar usuários por cliente
- [ ] Dashboard de analytics global

### Client Dashboard

- [ ] Adaptar conversas para filtrar por `client_id`
- [ ] Página de settings (prompts)
- [ ] Página de settings (API keys)
- [ ] Página de settings (comportamento)
- [ ] Página de knowledge base
- [ ] Upload de documentos RAG
- [ ] Gerenciar equipe (usuários)
- [ ] Analytics (mensagens, custos)

### Testing

- [ ] Criar 3 clientes de teste
- [ ] Testar isolamento de dados
- [ ] Testar webhooks paralelos
- [ ] Testar prompts customizados
- [ ] Testar RAG por cliente
- [ ] Testar permissões RLS
- [ ] Load testing (100 mensagens simultâneas)

### Documentation

- [ ] Atualizar CLAUDE.md
- [ ] Atualizar README.md
- [ ] Atualizar ARCHITECTURE.md
- [ ] Documentar API de admin
- [ ] Guia de onboarding de cliente
- [ ] Guia de configuração de webhook
- [ ] Troubleshooting multi-tenant

### Deployment

- [ ] Deploy no Vercel (staging)
- [ ] Configurar variáveis de ambiente
- [ ] Testar em produção
- [ ] Configurar domínio
- [ ] Configurar SSL
- [ ] Deploy final

---

## Estrutura de Pastas Final

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── forgot-password/page.tsx
│   ├── admin/                         # ← NOVO
│   │   ├── layout.tsx                 # Admin layout
│   │   ├── page.tsx                   # Admin dashboard
│   │   ├── clients/
│   │   │   ├── page.tsx               # List clients
│   │   │   ├── new/page.tsx           # Create client
│   │   │   └── [id]/
│   │   │       ├── page.tsx           # Edit client
│   │   │       ├── settings/page.tsx  # Client settings
│   │   │       ├── users/page.tsx     # Client users
│   │   │       └── analytics/page.tsx # Client analytics
│   │   └── analytics/page.tsx         # Global analytics
│   ├── dashboard/
│   │   ├── conversations/             # Existente (adaptado)
│   │   ├── settings/                  # ← NOVO
│   │   │   ├── prompts/page.tsx       # Edit prompts
│   │   │   ├── api-keys/page.tsx      # Manage API keys
│   │   │   └── behavior/page.tsx      # Settings (batching, etc)
│   │   ├── knowledge-base/            # ← NOVO
│   │   │   ├── page.tsx               # List documents
│   │   │   └── upload/page.tsx        # Upload RAG docs
│   │   ├── team/                      # ← NOVO
│   │   │   ├── page.tsx               # List team members
│   │   │   └── invite/page.tsx        # Invite user
│   │   └── analytics/page.tsx         # ← NOVO
│   ├── api/
│   │   ├── webhook/
│   │   │   └── [clientId]/            # ← MODIFICADO
│   │   │       └── route.ts           # Dynamic webhook
│   │   ├── admin/                     # ← NOVO
│   │   │   ├── clients/route.ts       # CRUD clients
│   │   │   └── users/route.ts         # Manage users
│   │   ├── conversations/             # Existente (adaptado)
│   │   ├── messages/                  # Existente (adaptado)
│   │   └── documents/                 # ← NOVO
│   │       └── upload/route.ts        # Upload RAG docs
├── flows/
│   └── chatbotFlow.ts                 # ← MODIFICADO (aceita ClientConfig)
├── nodes/                             # ← MODIFICADOS (todos)
├── lib/
│   ├── config.ts                      # ← NOVO (getClientConfig)
│   ├── types.ts                       # ← MODIFICADO (ClientConfig type)
│   └── ...
└── middleware.ts                      # ← NOVO (auth middleware)
```

---

## Estimativa de Esforço

| Fase | Descrição | Tempo Estimado | Complexidade |
|------|-----------|----------------|--------------|
| **Fase 1** | Database & Auth | 2 semanas | 🔴 Alta |
| **Fase 2** | Config System | 2 semanas | 🔴 Alta |
| **Fase 3** | Webhook Dinâmico | 1 semana | 🟡 Média |
| **Fase 4** | Admin Dashboard | 2 semanas | 🟡 Média |
| **Fase 5** | Client Dashboard | 2 semanas | 🟡 Média |
| **Fase 6** | Features Avançadas | 3+ semanas | 🟢 Baixa |
| **TOTAL** | Projeto completo | **12-14 semanas** | - |

---

## Próximos Passos Imediatos

### Sprint 1 (Esta Semana)

1. **Criar migration SQL completo**
   - Todas as tabelas novas
   - ALTER TABLE para adicionar `client_id`
   - RLS policies
   - Seed data (cliente default)

2. **Testar migration localmente**
   - Backup banco atual
   - Rodar migration
   - Validar dados migrados

3. **Criar cliente "default"**
   - Mover env vars atuais para tabela `clients`
   - Testar que sistema atual continua funcionando

### Sprint 2 (Próxima Semana)

1. **Modificar `chatbotFlow.ts`**
   - Adicionar parâmetro `ClientConfig`
   - Passar config para nodes

2. **Modificar nodes prioritários**
   - `generateAIResponse`
   - `sendWhatsAppMessage`
   - `checkOrCreateCustomer`

3. **Testar flow com cliente default**

---

**Autor**: Claude + Luis Fernando Boff
**Data**: 2025-01-27
**Versão**: 1.0
**Status**: 📋 Planejamento

# 🏆 Guia de Boas Práticas para Desenvolvimento de SaaS Multi-Tenant

> **Baseado em**: Experiência real de construção de um SaaS de chatbot WhatsApp com IA
> 
> **Data**: Outubro 2025
> 
> **Objetivo**: Documentar lições aprendidas e boas práticas para replicar em outros projetos SaaS

---

## 📋 Índice

1. [Arquitetura e Planejamento](#1-arquitetura-e-planejamento)
2. [Banco de Dados e Modelagem](#2-banco-de-dados-e-modelagem)
3. [Sistema de Autenticação e Autorização](#3-sistema-de-autenticação-e-autorização)
4. [Multi-Tenancy (Isolamento de Dados)](#4-multi-tenancy-isolamento-de-dados)
5. [APIs e Backend](#5-apis-e-backend)
6. [Frontend e UX](#6-frontend-e-ux)
7. [Segurança e Secrets Management](#7-segurança-e-secrets-management)
8. [Migrations e Versionamento de Schema](#8-migrations-e-versionamento-de-schema)
9. [Monitoramento e Logs](#9-monitoramento-e-logs)
10. [Performance e Escalabilidade](#10-performance-e-escalabilidade)
11. [Testes e Quality Assurance](#11-testes-e-quality-assurance)
12. [Deploy e CI/CD](#12-deploy-e-cicd)
13. [Checklist de Lançamento](#13-checklist-de-lançamento)

---

## 1. Arquitetura e Planejamento

### 1.1 Comece com Arquitetura Modular

**❌ Erro Comum:**
```typescript
// Tudo em um único arquivo API route
export async function POST(req: Request) {
  // 500 linhas de código misturando lógica de negócio, validação, DB, etc
}
```

**✅ Melhor Abordagem:**
```typescript
// Arquitetura em camadas (flows + nodes)

// src/flows/chatbotFlow.ts
export async function chatbotFlow(payload: WebhookPayload, config: ClientConfig) {
  const filtered = await filterStatusUpdates(payload)
  const parsed = await parseMessage(filtered)
  const customer = await checkOrCreateCustomer(parsed, config)
  // ... orquestração de nodes
}

// src/nodes/parseMessage.ts
export async function parseMessage(payload: any): Promise<ParsedMessage> {
  // Função pura, testável, reutilizável
}
```

**Por quê?**
- ✅ **Testabilidade**: Cada node pode ser testado isoladamente
- ✅ **Reusabilidade**: Nodes podem ser usados em diferentes flows
- ✅ **Manutenção**: Bugs são localizados rapidamente
- ✅ **Escalabilidade**: Novos flows são criados combinando nodes existentes

### 1.2 Planeje as Fases de Evolução

**Recomendação**: Divida seu SaaS em fases claras:

```
Fase 1: Single-Tenant (MVP)
├── Um cliente hardcoded
├── Configuração em .env
├── Foco em validar produto
└── Deploy rápido

Fase 2: Multi-Tenant Database
├── Tabela `clients` com configurações
├── client_id em todas as tabelas
├── RLS (Row Level Security)
└── Ainda sem autenticação (admin access)

Fase 3: Autenticação e Dashboard
├── Sistema de login (Supabase Auth)
├── Middleware de proteção de rotas
├── Dashboard para clientes
└── JWT-based client_id

Fase 4: RBAC (Role-Based Access Control)
├── Múltiplos usuários por cliente
├── Roles (admin, client_admin, user)
├── Permissões granulares
└── Sistema de convites

Fase 5: SaaS Completo
├── Billing e planos
├── Analytics avançado
├── API pública
└── Self-service onboarding
```

**Lição Aprendida**: Não tente fazer tudo de uma vez. Cada fase deve ser **funcional e deployável**.

### 1.3 Documente a Arquitetura Desde o Início

**Arquivos Essenciais:**

```
docs/
├── ARCHITECTURE.md          # Diagrama de blocos, stack, decisões
├── WORKFLOW-LOGIC.md        # Fluxo detalhado de processamento
├── DATABASE-SETUP.md        # Schema, tabelas, relacionamentos
├── API-REFERENCE.md         # Endpoints, payloads, responses
└── DEPLOYMENT.md            # Como fazer deploy, env vars
```

**Dica**: Use diagramas ASCII para fluxos:

```
WhatsApp → Webhook → Flow → Nodes → Database → Response
             ↓
          Logging
```

### 1.4 Escolha a Stack Correta

**Stack Recomendada para SaaS Serverless:**

| Camada | Tecnologia | Por quê |
|--------|-----------|---------|
| **Frontend** | Next.js 14 (App Router) | SSR, RSC, API Routes integradas |
| **Backend** | Next.js API Routes | Serverless, auto-scaling, co-located |
| **Database** | Supabase (PostgreSQL) | RLS, Realtime, Auth, Vector Store |
| **Auth** | Supabase Auth | OAuth, JWT, session management |
| **Cache** | Redis (Upstash) | Serverless-friendly, batching, queues |
| **Storage** | Supabase Storage / S3 | Arquivos, imagens, documentos |
| **Deploy** | Vercel | Zero-config, edge functions, CI/CD |
| **Monitoring** | Sentry / Vercel Analytics | Error tracking, performance |

**Alternativas válidas:**
- Database: PlanetScale, Neon, Turso
- Auth: Clerk, Auth.js (NextAuth)
- Deploy: Cloudflare Pages, Railway

### 1.5 Defina Convenções de Código

**TypeScript Strict Mode**: SEMPRE

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**Functional Programming Style**:

```typescript
// ✅ Bom
const processMessage = (msg: Message): ProcessedMessage => {
  return { ...msg, processed: true }
}

// ❌ Evitar
class MessageProcessor {
  process(msg: Message) {
    this.state = msg
    return this.transform()
  }
}
```

**Naming Conventions**:
- Files: `camelCase.ts` (nodes), `PascalCase.tsx` (components)
- Functions: `camelCase` (actions), `PascalCase` (components)
- Constants: `UPPER_SNAKE_CASE`
- Types: `PascalCase`

---

## 2. Banco de Dados e Modelagem

### 2.1 Multi-Tenant desde o Início

**❌ Erro Fatal:**
```sql
-- Schema single-tenant (difícil de migrar depois)
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  content TEXT,
  created_at TIMESTAMPTZ
);
```

**✅ Correto (Multi-Tenant):**
```sql
-- SEMPRE incluir client_id
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  content TEXT,
  created_at TIMESTAMPTZ,
  
  -- Constraint para garantir unicidade por tenant
  UNIQUE(client_id, id)
);

-- Índice composto para queries eficientes
CREATE INDEX idx_messages_client_created 
ON messages(client_id, created_at DESC);
```

**Por quê?**
- ✅ Isolamento de dados garantido
- ✅ Queries sempre filtradas por client_id
- ✅ Facilita implementação de RLS
- ✅ Permite analytics por cliente

### 2.2 Tabela `clients` como Centro do Sistema

**Schema Base:**

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,  -- URL-friendly
  
  -- Status e Plano
  status TEXT NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'inactive', 'suspended', 'trial')),
  plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'starter', 'professional', 'enterprise')),
  
  -- Limites e Quotas
  monthly_message_limit INTEGER DEFAULT 1000,
  monthly_messages_used INTEGER DEFAULT 0,
  
  -- Configurações (JSONB flexível)
  settings JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  trial_ends_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Índices
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_slug ON clients(slug);
CREATE INDEX idx_clients_plan ON clients(plan);

-- Comentários
COMMENT ON TABLE clients IS 'Clientes/Tenants do sistema SaaS';
COMMENT ON COLUMN clients.settings IS 'Configurações customizáveis em JSON';
```

### 2.3 Separação de Secrets (Vault Pattern)

**❌ Nunca Faça Isso:**
```sql
-- Secrets em plain text no banco
CREATE TABLE clients (
  id UUID PRIMARY KEY,
  openai_api_key TEXT,  -- ❌ Visível em backups, logs
  stripe_secret_key TEXT  -- ❌ Vulnerabilidade de segurança
);
```

**✅ Use Supabase Vault ou Encryption:**

```sql
-- Opção 1: Supabase Vault (Recomendado)
-- Secrets criptografados pelo Supabase, não aparecem em backups

-- Criar secret
SELECT vault.create_secret('openai_key_client_123', 'sk-abc123...');

-- Buscar secret (apenas via service_role)
SELECT decrypted_secret FROM vault.decrypted_secrets 
WHERE name = 'openai_key_client_123';

-- Opção 2: Coluna criptografada (se não usar Vault)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE client_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  key_name TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,  -- Criptografado com pgcrypto
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(client_id, key_name)
);

-- Function para descriptografar (apenas service_role)
CREATE FUNCTION get_client_secret(p_client_id UUID, p_key_name TEXT)
RETURNS TEXT AS $$
  SELECT pgp_sym_decrypt(
    encrypted_value::bytea, 
    current_setting('app.encryption_key')
  )
  FROM client_secrets
  WHERE client_id = p_client_id AND key_name = p_key_name;
$$ LANGUAGE SQL SECURITY DEFINER;
```

### 2.4 Timestamptz e Triggers

**SEMPRE use `TIMESTAMPTZ` (não `TIMESTAMP`):**

```sql
-- ✅ Correto (timezone-aware)
created_at TIMESTAMPTZ DEFAULT NOW()

-- ❌ Evitar (ambíguo)
created_at TIMESTAMP DEFAULT NOW()
```

**Trigger para `updated_at` automático:**

```sql
-- Function reutilizável
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar em todas as tabelas
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 2.5 JSONB para Flexibilidade

**Use JSONB para configurações que mudam frequentemente:**

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY,
  settings JSONB DEFAULT '{
    "enableRAG": true,
    "enableTools": false,
    "maxTokens": 1000,
    "systemPrompt": "You are a helpful assistant",
    "notifications": {
      "email": "admin@example.com",
      "slack": null
    }
  }'::jsonb
);

-- Query em JSONB
SELECT * FROM clients 
WHERE settings->>'enableRAG' = 'true';

-- Index em JSONB
CREATE INDEX idx_clients_rag 
ON clients((settings->>'enableRAG'));

-- Update parcial
UPDATE clients 
SET settings = jsonb_set(settings, '{maxTokens}', '2000')
WHERE id = 'xxx';
```

**Quando usar JSONB vs Colunas:**
- ✅ JSONB: Configurações opcionais, metadata, preferências
- ✅ Colunas: Dados críticos, queries frequentes, foreign keys

### 2.6 Soft Delete vs Hard Delete

**Soft Delete para dados críticos:**

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  client_id UUID NOT NULL,
  phone TEXT NOT NULL,
  deleted_at TIMESTAMPTZ,  -- NULL = ativo
  deleted_by UUID REFERENCES auth.users(id)
);

-- Index parcial (apenas registros ativos)
CREATE INDEX idx_conversations_active 
ON conversations(client_id, created_at DESC) 
WHERE deleted_at IS NULL;

-- Queries filtram automaticamente
SELECT * FROM conversations 
WHERE client_id = 'xxx' AND deleted_at IS NULL;
```

**Hard Delete para dados temporários:**

```sql
-- Convites expirados podem ser deletados
DELETE FROM user_invites 
WHERE expires_at < NOW() - INTERVAL '30 days';

-- Cache/sessions podem ser purgados
DELETE FROM sessions 
WHERE created_at < NOW() - INTERVAL '7 days';
```

---

## 3. Sistema de Autenticação e Autorização

### 3.1 Use Provider Especializado (Não Reinvente)

**❌ Autenticação Manual (complexo, inseguro):**
```typescript
// Não faça isso
const hashPassword = (pwd: string) => crypto.createHash('sha256').update(pwd).digest('hex')
```

**✅ Use Supabase Auth / Clerk / Auth.js:**

```typescript
// Supabase Auth (recomendado)
import { createServerClient } from '@supabase/ssr'

// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'senha123'
})

// Signup
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'senha123',
  options: {
    data: {
      full_name: 'João Silva',
      client_id: 'xxx'  // Metadata customizado
    }
  }
})
```

**Por quê?**
- ✅ Security best practices (bcrypt, salt, etc)
- ✅ OAuth providers (Google, GitHub, etc)
- ✅ Magic links, OTP
- ✅ Session management
- ✅ Password reset, email verification

### 3.2 Tabela `user_profiles` Separada de `auth.users`

**Arquitetura Recomendada:**

```sql
-- auth.users (gerenciado pelo Supabase Auth)
-- NÃO modifique diretamente

-- user_profiles (seus dados de negócio)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Informações do usuário
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  
  -- Role-Based Access Control
  role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('admin', 'client_admin', 'user')),
  permissions JSONB DEFAULT '{}'::jsonb,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Trigger para criar profile automaticamente
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, client_id)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    (NEW.raw_user_meta_data->>'client_id')::UUID
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

**Por quê separar?**
- ✅ `auth.users` é imutável (gerenciado pelo provider)
- ✅ `user_profiles` tem seus dados de negócio
- ✅ Facilita queries com JOIN
- ✅ Permite adicionar campos customizados

### 3.3 Middleware para Proteção de Rotas

**Estrutura do Middleware:**

```typescript
// middleware.ts (raiz do projeto)
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return request.cookies.get(name)?.value },
        set(name, value, options) {
          response.cookies.set(name, value, options)
        },
        remove(name, options) {
          response.cookies.set(name, '', options)
        },
      },
    }
  )

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser()

  // Rotas protegidas: /dashboard/*
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Buscar profile para obter client_id e role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('client_id, role, is_active')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.is_active) {
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Injetar headers para uso nas páginas
    response.headers.set('x-user-id', user.id)
    response.headers.set('x-user-client-id', profile.client_id)
    response.headers.set('x-user-role', profile.role)
  }

  // Rotas admin: /admin/*
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    // Apenas admin/client_admin ativos
    if (!profile || 
        !['admin', 'client_admin'].includes(profile.role) || 
        !profile.is_active) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    response.headers.set('x-user-role', profile.role)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login|signup).*)',
  ],
}
```

**Lições Aprendidas:**
- ✅ Sempre refresh session no middleware
- ✅ Validar `is_active` (usuários podem ser desativados)
- ✅ Injetar headers para evitar re-queries nas páginas
- ✅ Logout automático se profile inválido

### 3.4 RBAC com 63 Permissões Granulares

**Estrutura de Permissões:**

```typescript
// src/lib/permissions.ts

export const PERMISSIONS = {
  // User Management (8 permissões)
  USERS_VIEW_OWN: 'users.view.own',
  USERS_VIEW_TEAM: 'users.view.team',
  USERS_CREATE: 'users.create',
  USERS_EDIT: 'users.edit',
  USERS_DELETE: 'users.delete',
  USERS_ACTIVATE: 'users.activate',
  USERS_DEACTIVATE: 'users.deactivate',
  USERS_CHANGE_ROLE: 'users.change_role',

  // Conversations (6 permissões)
  CONVERSATIONS_VIEW: 'conversations.view',
  CONVERSATIONS_CREATE: 'conversations.create',
  CONVERSATIONS_EDIT: 'conversations.edit',
  CONVERSATIONS_DELETE: 'conversations.delete',
  CONVERSATIONS_ASSIGN: 'conversations.assign',
  CONVERSATIONS_TRANSFER: 'conversations.transfer',

  // Messages (5 permissões)
  MESSAGES_VIEW: 'messages.view',
  MESSAGES_SEND: 'messages.send',
  MESSAGES_EDIT: 'messages.edit',
  MESSAGES_DELETE: 'messages.delete',
  MESSAGES_EXPORT: 'messages.export',

  // ... total de 63 permissões em 9 categorias
} as const

export const ROLE_PERMISSIONS = {
  admin: Object.values(PERMISSIONS),  // Todas
  
  client_admin: [
    // User management (exceto delete e change_role)
    PERMISSIONS.USERS_VIEW_OWN,
    PERMISSIONS.USERS_VIEW_TEAM,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_EDIT,
    PERMISSIONS.USERS_ACTIVATE,
    PERMISSIONS.USERS_DEACTIVATE,
    
    // Conversations (todas)
    ...Object.values(PERMISSIONS).filter(p => p.startsWith('conversations')),
    
    // ... etc
  ],
  
  user: [
    PERMISSIONS.USERS_VIEW_OWN,
    PERMISSIONS.CONVERSATIONS_VIEW,
    PERMISSIONS.MESSAGES_VIEW,
    PERMISSIONS.MESSAGES_SEND,
  ]
}
```

**Verificação de Permissão:**

```typescript
// src/lib/rbac.ts
export function hasPermission(
  userPermissions: Record<string, boolean>,
  required: string | string[]
): boolean {
  const perms = Array.isArray(required) ? required : [required]
  return perms.every(p => userPermissions[p] === true)
}

// Uso em API Route
export async function POST(req: NextRequest) {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('permissions, role')
    .eq('id', userId)
    .single()

  if (!hasPermission(profile.permissions, PERMISSIONS.USERS_CREATE)) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    )
  }

  // ... lógica
}
```

---

## 4. Multi-Tenancy (Isolamento de Dados)

### 4.1 Row Level Security (RLS) - A Base da Segurança

**SEMPRE habilite RLS em tabelas multi-tenant:**

```sql
-- Habilitar RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Service role bypassa RLS (para API routes)
CREATE POLICY "Service role can access all data"
ON conversations FOR ALL
USING (auth.role() = 'service_role');

-- Policy: Usuários veem apenas dados do seu client_id
CREATE POLICY "Users can view own client data"
ON conversations FOR SELECT
USING (
  client_id = (
    SELECT client_id FROM user_profiles 
    WHERE id = auth.uid()
  )
);

-- Policy: Super admin vê todos os clientes
CREATE POLICY "Super admins can view all clients"
ON conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);
```

**Lições Aprendidas:**
- ✅ RLS é a **última linha de defesa** contra vazamento de dados
- ✅ Sempre teste policies com diferentes roles
- ✅ Use `service_role` apenas em backend (nunca no frontend)
- ✅ Combine RLS com validação no código

### 4.2 Functions Helper para Client ID

**Evite repetição em policies:**

```sql
-- Function reutilizável
CREATE OR REPLACE FUNCTION get_user_client_id()
RETURNS UUID AS $$
  SELECT client_id FROM user_profiles 
  WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE;

-- Function para verificar role
CREATE OR REPLACE FUNCTION user_has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = required_role
  )
$$ LANGUAGE SQL STABLE;

-- Uso simplificado em policies
CREATE POLICY "Users can view own client messages"
ON messages FOR SELECT
USING (client_id = get_user_client_id());

CREATE POLICY "Admins can delete any message"
ON messages FOR DELETE
USING (user_has_role('admin'));
```

### 4.3 Webhook Dinâmico por Cliente

**Arquitetura de Webhook Multi-Tenant:**

```typescript
// app/api/webhook/[clientId]/route.ts

export async function POST(
  request: Request,
  { params }: { params: { clientId: string } }
) {
  const clientId = params.clientId

  // 1. Carregar config do cliente do banco
  const config = await getClientConfig(clientId)
  
  if (!config || config.status !== 'active') {
    return NextResponse.json(
      { error: 'Client not found or inactive' },
      { status: 404 }
    )
  }

  // 2. Validar verify_token (Meta Webhook)
  const payload = await request.json()
  
  // 3. Processar com config específica do cliente
  await chatbotFlow(payload, config)
  
  return NextResponse.json({ success: true })
}

// Endpoint de verificação (GET)
export async function GET(
  request: Request,
  { params }: { params: { clientId: string } }
) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // Buscar token do cliente
  const config = await getClientConfig(params.clientId)
  
  if (mode === 'subscribe' && token === config.verify_token) {
    return new Response(challenge, { status: 200 })
  }
  
  return new Response('Forbidden', { status: 403 })
}
```

**URLs por Cliente:**
```
Cliente A: POST /api/webhook/abc-123-def
Cliente B: POST /api/webhook/xyz-789-uvw
```

**Vantagens:**
- ✅ Isolamento total entre clientes
- ✅ Configs diferentes por cliente
- ✅ Fácil debugging (logs por cliente)
- ✅ Segurança (token único por cliente)

### 4.4 Config Loader Pattern

**Centralize carregamento de configuração:**

```typescript
// src/lib/config.ts

export interface ClientConfig {
  id: string
  name: string
  status: 'active' | 'inactive' | 'suspended'
  
  // API Keys (descriptografados do Vault)
  openaiApiKey: string
  groqApiKey: string
  metaAccessToken: string
  phoneNumberId: string
  
  // Settings
  settings: {
    enableRAG: boolean
    enableTools: boolean
    maxTokens: number
    systemPrompt: string
    formatterPrompt: string
  }
}

export async function getClientConfig(
  clientId: string
): Promise<ClientConfig | null> {
  const supabase = createServiceRoleClient()
  
  // 1. Buscar cliente do banco
  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single()
  
  if (error || !client) return null
  
  // 2. Buscar secrets do Vault
  const secrets = await getClientSecrets(clientId)
  
  // 3. Merge e retornar
  return {
    id: client.id,
    name: client.name,
    status: client.status,
    openaiApiKey: secrets.openai_api_key,
    groqApiKey: secrets.groq_api_key,
    metaAccessToken: secrets.meta_access_token,
    phoneNumberId: client.phone_number_id,
    settings: client.settings
  }
}

// Helper para buscar secrets
async function getClientSecrets(clientId: string) {
  const supabase = createServiceRoleClient()
  
  const { data } = await supabase
    .rpc('get_client_secrets', { p_client_id: clientId })
  
  return data
}
```

**Uso nos Flows:**

```typescript
// src/flows/chatbotFlow.ts
export async function chatbotFlow(
  payload: WebhookPayload,
  config: ClientConfig  // ✅ Config injetada, não global
) {
  // Todos os nodes recebem config quando necessário
  const response = await generateAIResponse(message, config)
  await sendWhatsAppMessage(response, config)
}
```

**❌ Nunca Faça Isso:**
```typescript
// ❌ Config global (vazamento entre clientes)
const OPENAI_KEY = process.env.OPENAI_API_KEY

export async function generateResponse(msg: string) {
  const openai = new OpenAI({ apiKey: OPENAI_KEY })
  // ...
}
```

### 4.5 Índices Multi-Tenant

**SEMPRE crie índices compostos com client_id:**

```sql
-- ❌ Índice ineficiente
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- ✅ Índice multi-tenant eficiente
CREATE INDEX idx_messages_client_created 
ON messages(client_id, created_at DESC);

-- ✅ Índice para queries específicas
CREATE INDEX idx_conversations_client_status 
ON conversations(client_id, status, last_update DESC);

-- ✅ Índice parcial (apenas registros ativos)
CREATE INDEX idx_messages_client_active 
ON messages(client_id, created_at DESC) 
WHERE deleted_at IS NULL;
```

**Por quê?**
- ✅ Queries sempre incluem `WHERE client_id = ?`
- ✅ Índice composto é muito mais eficiente
- ✅ Previne full table scans

---

## 5. APIs e Backend

### 5.1 Padrão de API Routes

**Estrutura Consistente:**

```typescript
// app/api/conversations/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// ✅ SEMPRE force-dynamic para dados em tempo real
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // 1. Criar cliente Supabase (service role)
    const supabase = createServerClient()
    
    // 2. Autenticação/Autorização
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // 3. Buscar profile e validar permissões
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('client_id, role, permissions, is_active')
      .eq('id', user.id)
      .single()
    
    if (!profile || !profile.is_active) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }
    
    // 4. Verificar permissão específica
    if (!hasPermission(profile.permissions, 'conversations.view')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    // 5. Query parameters com validação
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '50'),
      100  // Máximo
    )
    
    // 6. Query no banco (RLS filtra automaticamente)
    let query = supabase
      .from('conversations')
      .select('*')
      .eq('client_id', profile.client_id)
      .order('last_update', { ascending: false })
      .limit(limit)
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    // 7. Response com metadata
    return NextResponse.json({
      data,
      metadata: {
        count: data.length,
        limit,
        filters: { status }
      }
    })
    
  } catch (error) {
    // 8. Error handling consistente
    console.error('[API] Error fetching conversations:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
```

**Checklist de API Route:**
- ✅ `export const dynamic = 'force-dynamic'`
- ✅ Try-catch completo
- ✅ Autenticação via `getUser()`
- ✅ Autorização via permissões
- ✅ Validação de query params
- ✅ Limite máximo em queries (`LIMIT`)
- ✅ Error handling com logs
- ✅ Response padronizado

### 5.2 Validação de Input com Zod

**Use Zod para validação type-safe:**

```typescript
import { z } from 'zod'

// Schema de validação
const CreateUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  full_name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  role: z.enum(['admin', 'client_admin', 'user']),
  client_id: z.string().uuid().optional(),
  phone: z.string().regex(/^\d{10,15}$/, 'Telefone inválido').optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validação
    const result = CreateUserSchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          details: result.error.flatten()
        },
        { status: 400 }
      )
    }
    
    const validData = result.data
    
    // ... usar validData (type-safe)
    
  } catch (error) {
    // ...
  }
}
```

**Vantagens:**
- ✅ Type safety automática
- ✅ Mensagens de erro customizadas
- ✅ Transformações (trim, lowercase, etc)
- ✅ Validações complexas

### 5.3 Rate Limiting

**Implemente rate limiting para proteger APIs:**

```typescript
// lib/ratelimit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// 10 requests por 10 segundos
export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
})

// Uso em API Route
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  
  const { success, limit, reset, remaining } = await ratelimit.limit(
    `api_${ip}`
  )
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        }
      }
    )
  }
  
  // ... processar request
}
```

### 5.4 Logging Estruturado

**Logs consistentes facilitam debug:**

```typescript
// lib/logger.ts
export const logger = {
  info: (context: string, message: string, data?: any) => {
    console.log(`[${context}] ℹ️ ${message}`, data || '')
  },
  
  error: (context: string, message: string, error?: any) => {
    console.error(`[${context}] ❌ ${message}`, error || '')
  },
  
  warn: (context: string, message: string, data?: any) => {
    console.warn(`[${context}] ⚠️ ${message}`, data || '')
  },
  
  debug: (context: string, message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${context}] 🔍 ${message}`, data || '')
    }
  },
  
  success: (context: string, message: string, data?: any) => {
    console.log(`[${context}] ✅ ${message}`, data || '')
  }
}

// Uso
logger.info('API', 'Fetching conversations', { client_id, limit })
logger.error('Webhook', 'Failed to process message', error)
logger.success('Flow', 'Message sent successfully', { phone, messageId })
```

**Com emojis para facilitar scanning visual:**
```
[Webhook] ✅ Message received: +5551999999999
[Flow] 🔍 Starting chatbot flow
[Node:parseMessage] ℹ️ Extracted phone and content
[Node:generateAI] ⚠️ High token usage: 1500 tokens
[Node:sendWhatsApp] ❌ Failed to send: Network timeout
```

### 5.5 Hybrid Supabase Architecture

**Use dois tipos de cliente:**

```typescript
// lib/supabase.ts

// 1. Service Role Client (Backend Only - bypassa RLS)
export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,  // ⚠️ NUNCA expor no frontend
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  )
}

// 2. Server Client (Cookie-based sessions)
export function createServerClient() {
  const cookieStore = cookies()
  
  return createServerComponentClient({
    cookies: () => cookieStore
  })
}

// 3. Browser Client (Frontend)
export function createBrowserClient() {
  return createClientComponentClient()
}
```

**Quando usar cada um:**

| Cenário | Cliente | Por quê |
|---------|---------|---------|
| API Route (admin ops) | `createServiceRoleClient()` | Bypassa RLS, acesso total |
| API Route (user ops) | `createServerClient()` | Respeita RLS, user context |
| Server Component | `createServerClient()` | SSR com session |
| Client Component | `createBrowserClient()` | CSR, realtime |

---

## 6. Frontend e UX

### 6.1 Server Components vs Client Components

**Estratégia Recomendada:**

```typescript
// ✅ Server Component (padrão)
// app/dashboard/page.tsx
export default async function DashboardPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Query no servidor (SSR)
  const { data: stats } = await supabase
    .from('conversations')
    .select('count')
  
  return (
    <div>
      <h1>Dashboard</h1>
      <StatsCard count={stats?.count || 0} />
      
      {/* Client Component apenas onde necessário */}
      <RealtimeConversationList userId={user.id} />
    </div>
  )
}

// ✅ Client Component (interatividade)
// components/RealtimeConversationList.tsx
'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'

export function RealtimeConversationList({ userId }) {
  const [conversations, setConversations] = useState([])
  const supabase = createBrowserClient()
  
  useEffect(() => {
    // Realtime subscription
    const channel = supabase
      .channel('conversations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations'
      }, (payload) => {
        // Atualizar lista
        setConversations(prev => [...prev, payload.new])
      })
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])
  
  return <div>{/* ... */}</div>
}
```

**Regra de Ouro:**
- ✅ Server Component: Queries iniciais, SEO, performance
- ✅ Client Component: Interatividade, realtime, state

### 6.2 Loading States e Suspense

**Use Suspense para UX melhor:**

```typescript
// app/dashboard/loading.tsx
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-gray-200 rounded" />
        ))}
      </div>
    </div>
  )
}

// app/dashboard/page.tsx
import { Suspense } from 'react'

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <DashboardContent />
    </Suspense>
  )
}
```

### 6.3 Error Boundaries

**Capture erros graciosamente:**

```typescript
// app/dashboard/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded">
      <h2 className="text-red-800 font-bold">Algo deu errado!</h2>
      <p className="text-red-600">{error.message}</p>
      <button
        onClick={reset}
        className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
      >
        Tentar novamente
      </button>
    </div>
  )
}
```

### 6.4 Conditional Rendering por Role

**UI adaptável ao role do usuário:**

```typescript
// components/AdminButton.tsx
'use client'

import { useUser } from '@/hooks/useUser'

export function AdminButton() {
  const { profile } = useUser()
  
  // Apenas para admin/client_admin
  if (!['admin', 'client_admin'].includes(profile?.role)) {
    return null
  }
  
  return (
    <Link href="/admin">
      <Button>Painel Admin</Button>
    </Link>
  )
}

// hooks/useUser.ts
export function useUser() {
  const supabase = createBrowserClient()
  const [profile, setProfile] = useState(null)
  
  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        setProfile(data)
      }
    }
    
    getProfile()
  }, [])
  
  return { profile }
}
```

### 6.5 shadcn/ui para Componentes

**Use biblioteca de componentes consistente:**

```bash
# Instalar shadcn/ui
npx shadcn-ui@latest init

# Adicionar componentes conforme necessário
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add table
```

**Vantagens:**
- ✅ Copy-paste, você possui o código
- ✅ Tailwind-based, customizável
- ✅ Acessibilidade built-in
- ✅ TypeScript first

**❌ NÃO edite arquivos em `components/ui/*` diretamente**

Se precisar customizar, crie wrapper:

```typescript
// components/PrimaryButton.tsx
import { Button } from '@/components/ui/button'

export function PrimaryButton({ children, ...props }) {
  return (
    <Button 
      className="bg-blue-600 hover:bg-blue-700" 
      {...props}
    >
      {children}
    </Button>
  )
}
```

---

## 7. Segurança e Secrets Management

### 7.1 NUNCA Commite Secrets no Git

**Setup do .gitignore:**

```gitignore
# Environment variables
.env
.env.local
.env*.local

# Backups (podem conter dados sensíveis)
db/backups/
db/*.sql
*.sql

# Logs
*.log
logs/

# OS
.DS_Store
Thumbs.db
```

**Validação pré-commit:**

```bash
# .husky/pre-commit (opcional)
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Verificar se há secrets expostos
git diff --cached --name-only | grep -E '\.env$|\.env\.local$'
if [ $? -eq 0 ]; then
  echo "❌ Você está tentando commitar arquivos .env!"
  exit 1
fi
```

### 7.2 Supabase Vault para Secrets

**Arquitetura Recomendada:**

```sql
-- Criar secrets no Vault (apenas via service_role)
SELECT vault.create_secret(
  'sk-openai-client-abc123',  -- Nome único
  'sk-proj-abc123...',         -- Valor criptografado
  'OpenAI API Key for Client ABC'  -- Descrição
);

-- Buscar secret descriptografado
SELECT decrypted_secret 
FROM vault.decrypted_secrets 
WHERE name = 'sk-openai-client-abc123';

-- Atualizar secret
SELECT vault.update_secret(
  (SELECT id FROM vault.secrets WHERE name = 'sk-openai-client-abc123'),
  'sk-proj-new-value...'
);
```

**Helper Function:**

```typescript
// lib/vault.ts
import { createServiceRoleClient } from './supabase'

export async function getVaultSecret(secretName: string): Promise<string | null> {
  const supabase = createServiceRoleClient()
  
  const { data, error } = await supabase
    .from('decrypted_secrets')
    .select('decrypted_secret')
    .eq('name', secretName)
    .single()
  
  if (error) {
    console.error('Error fetching vault secret:', error)
    return null
  }
  
  return data?.decrypted_secret || null
}

export async function setVaultSecret(
  secretName: string, 
  secretValue: string,
  description?: string
): Promise<boolean> {
  const supabase = createServiceRoleClient()
  
  const { error } = await supabase.rpc('vault_create_secret', {
    p_name: secretName,
    p_secret: secretValue,
    p_description: description
  })
  
  return !error
}
```

**Uso em Configuração de Cliente:**

```typescript
export async function getClientConfig(clientId: string) {
  // ... buscar cliente do banco
  
  // Buscar secrets do Vault
  const openaiKey = await getVaultSecret(`openai_key_${clientId}`)
  const groqKey = await getVaultSecret(`groq_key_${clientId}`)
  const metaToken = await getVaultSecret(`meta_token_${clientId}`)
  
  return {
    id: clientId,
    openaiApiKey: openaiKey,
    groqApiKey: groqKey,
    metaAccessToken: metaToken,
    // ... outras configs
  }
}
```

### 7.3 Validação de Variáveis de Ambiente

**Fail fast se variáveis críticas estão faltando:**

```typescript
// lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  // Supabase (obrigatório)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  
  // Redis (obrigatório)
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  
  // OpenAI (opcional - pode vir do Vault)
  OPENAI_API_KEY: z.string().optional(),
  
  // Meta (opcional - pode vir do Vault)
  META_ACCESS_TOKEN: z.string().optional(),
  META_PHONE_NUMBER_ID: z.string().optional(),
  
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  throw new Error('Invalid environment variables')
}

export const env = parsed.data
```

**Uso:**

```typescript
import { env } from '@/lib/env'

// Type-safe e validado
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
```

### 7.4 CORS e Headers de Segurança

**next.config.js:**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Segurança
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          // CSP
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
          }
        ]
      },
      {
        // CORS para webhooks (apenas se necessário)
        source: '/api/webhook/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://graph.facebook.com'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig
```

### 7.5 Input Sanitization

**SEMPRE sanitize input de usuários:**

```typescript
import DOMPurify from 'isomorphic-dompurify'

// Sanitizar HTML
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href']
  })
}

// Sanitizar SQL (use parametrized queries)
// ✅ Bom (Supabase faz automaticamente)
const { data } = await supabase
  .from('messages')
  .select('*')
  .eq('phone', userInput)  // Safe - parametrizado

// ❌ Nunca faça isso
const query = `SELECT * FROM messages WHERE phone = '${userInput}'`
```

### 7.6 Rate Limiting por Cliente

**Previna abuso por cliente específico:**

```typescript
// lib/ratelimit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!
})

// Rate limits diferentes por plano
export const rateLimits = {
  free: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 d'),  // 100/dia
    prefix: 'ratelimit:free',
  }),
  
  starter: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(1000, '1 d'),  // 1k/dia
    prefix: 'ratelimit:starter',
  }),
  
  professional: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10000, '1 d'),  // 10k/dia
    prefix: 'ratelimit:professional',
  })
}

// Uso em webhook
export async function POST(request: Request) {
  const clientId = params.clientId
  const config = await getClientConfig(clientId)
  
  const limiter = rateLimits[config.plan]
  const { success } = await limiter.limit(clientId)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded for your plan' },
      { status: 429 }
    )
  }
  
  // ... processar
}
```

---

## 8. Migrations e Versionamento de Schema

### 8.1 SEMPRE Use Migrations

**❌ Nunca Faça Isso:**
```sql
-- Executar ALTER TABLE direto no SQL Editor do Supabase
ALTER TABLE messages ADD COLUMN media_url TEXT;
```

**✅ Use Supabase CLI:**

```bash
# 1. Criar migration
supabase migration new add_media_url_to_messages

# 2. Editar arquivo gerado
# supabase/migrations/20251030_add_media_url_to_messages.sql

# 3. Aplicar
supabase db push
```

**Exemplo de Migration Completa:**

```sql
-- supabase/migrations/20251030_add_media_url_to_messages.sql

-- Add column
ALTER TABLE public.messages 
ADD COLUMN media_url TEXT;

-- Add index (partial - apenas quando existe)
CREATE INDEX idx_messages_media_url 
ON public.messages(media_url) 
WHERE media_url IS NOT NULL;

-- Add constraint
ALTER TABLE public.messages
ADD CONSTRAINT media_url_format_check
CHECK (media_url IS NULL OR media_url ~* '^https?://');

-- Update RLS policy (se necessário)
-- Policies existentes não são afetadas

-- Add comment
COMMENT ON COLUMN public.messages.media_url 
IS 'URL do arquivo de mídia (imagem, áudio, vídeo, documento)';
```

### 8.2 Workflow de Migration

**Processo Completo:**

```bash
# 1. Criar migration
supabase migration new add_feature_name

# 2. Editar SQL no arquivo gerado
# supabase/migrations/TIMESTAMP_add_feature_name.sql

# 3. Testar localmente (se tiver Supabase local)
supabase db reset  # Reaplica todas migrations

# 4. Fazer backup ANTES de aplicar em produção
cd db
.\backup-complete.bat

# 5. Aplicar em produção
supabase db push

# 6. Atualizar types TypeScript
# src/lib/types.ts - adicionar novos campos

# 7. Commitar migration
git add supabase/migrations/
git commit -m "feat: add feature_name to database"
git push
```

### 8.3 Backup Strategy

**Scripts de Backup Automatizados:**

```batch
REM db/backup-complete.bat

@echo off
SET TIMESTAMP=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
SET BACKUP_DIR=.

echo ╔════════════════════════════════════════════╗
echo ║   BACKUP COMPLETO - Public + Auth          ║
echo ╚════════════════════════════════════════════╝

REM Public schema (application data)
echo [1/6] Backup COMPLETO do schema public...
pg_dump -h HOST -p PORT -U USER -d postgres -n public -F p -b -v ^
  -f "%BACKUP_DIR%\chatbot_full_%TIMESTAMP%.sql"

echo [2/6] Backup ESTRUTURA do schema public...
pg_dump -h HOST -p PORT -U USER -d postgres -n public -s -F p -b -v ^
  -f "%BACKUP_DIR%\chatbot_structure_%TIMESTAMP%.sql"

echo [3/6] Backup DADOS do schema public...
pg_dump -h HOST -p PORT -U USER -d postgres -n public -a -F p -b -v ^
  -f "%BACKUP_DIR%\chatbot_data_%TIMESTAMP%.sql"

REM Auth schema (Supabase Auth users)
echo [4/6] Backup COMPLETO do schema auth...
pg_dump -h HOST -p PORT -U USER -d postgres -n auth -F p -b -v ^
  -f "%BACKUP_DIR%\auth_full_%TIMESTAMP%.sql"

echo [5/6] Backup ESTRUTURA do schema auth...
pg_dump -h HOST -p PORT -U USER -d postgres -n auth -s -F p -b -v ^
  -f "%BACKUP_DIR%\auth_structure_%TIMESTAMP%.sql"

echo [6/6] Backup DADOS do schema auth...
pg_dump -h HOST -p PORT -U USER -d postgres -n auth -a -F p -b -v ^
  -f "%BACKUP_DIR%\auth_data_%TIMESTAMP%.sql"

echo.
echo ✅ BACKUP COMPLETO CONCLUÍDO!
echo.
echo ⚠️ IMPORTANTE:
echo    - auth_data contém senhas hasheadas
echo    - Mantenha estes arquivos seguros!
echo    - NÃO commite no Git!
```

**Agendar Backups Diários:**

```bash
# Cron job (Linux/Mac)
0 2 * * * cd /app/db && ./backup-complete.sh

# Task Scheduler (Windows)
# Criar task que roda backup-complete.bat às 2h AM
```

### 8.4 Rollback Strategy

**Opção 1: Reversal Migration (Recomendado)**

```bash
# Criar migration de reversão
supabase migration new revert_add_media_url

# Editar arquivo
```

```sql
-- Reverter mudança
ALTER TABLE public.messages DROP COLUMN media_url;
DROP INDEX IF EXISTS idx_messages_media_url;
```

```bash
# Aplicar
supabase db push
```

**Opção 2: Restore do Backup (Emergência)**

```bash
# Restaurar backup completo
psql "postgresql://USER:PASS@HOST:PORT/postgres" \
  -f db/chatbot_full_20251030_140000.sql

# Ou apenas estrutura
psql "CONNECTION_STRING" -f db/chatbot_structure_20251030_140000.sql
```

### 8.5 Migration Checklist

**Antes de criar migration:**
- [ ] Backup recente existe (< 24h)
- [ ] Migration tem nome descritivo
- [ ] SQL testado em ambiente local
- [ ] Considera dados existentes (não quebra)
- [ ] Índices criados para novas colunas pesquisadas
- [ ] RLS policies ajustadas (se necessário)
- [ ] Comments explicativos adicionados
- [ ] TypeScript types atualizados

**Depois de aplicar:**
- [ ] Migration commitada no Git
- [ ] Equipe notificada (se breaking change)
- [ ] Documentação atualizada
- [ ] Testado em produção (smoke test)

---

## 9. Monitoramento e Logs

### 9.1 Execution Logs para Debug

**Tabela de Logs de Execução:**

```sql
CREATE TABLE execution_logs (
  id SERIAL PRIMARY KEY,
  execution_id TEXT NOT NULL,  -- UUID único por execução
  node_name TEXT NOT NULL,      -- Nome do node executado
  
  -- Dados
  input_data JSONB,
  output_data JSONB,
  error JSONB,
  
  -- Status
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'error')),
  duration_ms INTEGER,
  
  -- Timestamp
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata
  metadata JSONB
);

-- Índices para queries rápidas
CREATE INDEX idx_execution_logs_execution_id 
ON execution_logs(execution_id);

CREATE INDEX idx_execution_logs_timestamp 
ON execution_logs(timestamp DESC);

CREATE INDEX idx_execution_logs_status 
ON execution_logs(status) 
WHERE status = 'error';

CREATE INDEX idx_execution_logs_node_name 
ON execution_logs(node_name);
```

**Logger Helper:**

```typescript
// lib/logger.ts
import { createServiceRoleClient } from './supabase'
import { v4 as uuidv4 } from 'uuid'

export class ExecutionLogger {
  private executionId: string
  private supabase: ReturnType<typeof createServiceRoleClient>
  
  constructor(executionId?: string) {
    this.executionId = executionId || uuidv4()
    this.supabase = createServiceRoleClient()
  }
  
  async logNodeStart(nodeName: string, input?: any) {
    const startTime = Date.now()
    
    await this.supabase.from('execution_logs').insert({
      execution_id: this.executionId,
      node_name: nodeName,
      input_data: input,
      status: 'running',
      timestamp: new Date().toISOString()
    })
    
    return startTime
  }
  
  async logNodeSuccess(
    nodeName: string, 
    output: any, 
    startTime: number
  ) {
    const duration = Date.now() - startTime
    
    await this.supabase.from('execution_logs').insert({
      execution_id: this.executionId,
      node_name: nodeName,
      output_data: output,
      status: 'success',
      duration_ms: duration,
      timestamp: new Date().toISOString()
    })
  }
  
  async logNodeError(
    nodeName: string, 
    error: any, 
    startTime: number
  ) {
    const duration = Date.now() - startTime
    
    await this.supabase.from('execution_logs').insert({
      execution_id: this.executionId,
      node_name: nodeName,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      status: 'error',
      duration_ms: duration,
      timestamp: new Date().toISOString()
    })
  }
}
```

**Uso no Flow:**

```typescript
export async function chatbotFlow(payload: any, config: ClientConfig) {
  const logger = new ExecutionLogger()
  
  try {
    // Node 1: Parse Message
    const startParse = await logger.logNodeStart('parseMessage', payload)
    const parsed = await parseMessage(payload)
    await logger.logNodeSuccess('parseMessage', parsed, startParse)
    
    // Node 2: Generate AI Response
    const startAI = await logger.logNodeStart('generateAIResponse', {
      message: parsed.content
    })
    
    try {
      const response = await generateAIResponse(parsed, config)
      await logger.logNodeSuccess('generateAIResponse', response, startAI)
    } catch (error) {
      await logger.logNodeError('generateAIResponse', error, startAI)
      throw error
    }
    
    // ... outros nodes
    
  } catch (error) {
    console.error('[Flow] Error:', error)
    throw error
  }
}
```

### 9.2 Analytics e Métricas

**Queries Úteis para Dashboard:**

```sql
-- Total de execuções por dia
SELECT 
  DATE(timestamp) as date,
  COUNT(*) as total_executions,
  COUNT(*) FILTER (WHERE status = 'success') as successful,
  COUNT(*) FILTER (WHERE status = 'error') as errors,
  AVG(duration_ms) as avg_duration_ms
FROM execution_logs
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- Nodes mais lentos
SELECT 
  node_name,
  COUNT(*) as executions,
  AVG(duration_ms) as avg_duration,
  MAX(duration_ms) as max_duration,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration
FROM execution_logs
WHERE status = 'success'
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY node_name
ORDER BY avg_duration DESC
LIMIT 10;

-- Taxa de erro por node
SELECT 
  node_name,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'error') as errors,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'error') / COUNT(*), 
    2
  ) as error_rate_pct
FROM execution_logs
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY node_name
HAVING COUNT(*) FILTER (WHERE status = 'error') > 0
ORDER BY error_rate_pct DESC;
```

### 9.3 Error Tracking com Sentry

**Setup:**

```bash
npm install @sentry/nextjs
```

```javascript
// sentry.client.config.js
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Apenas erros em produção
  enabled: process.env.NODE_ENV === 'production',
  
  // Sample rate
  tracesSampleRate: 0.1,
  
  // Ignore erros conhecidos
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured'
  ],
  
  // Contexto adicional
  beforeSend(event, hint) {
    // Adicionar user context
    if (event.user) {
      event.user.id = event.user.id // Já está no Sentry
    }
    return event
  }
})
```

**Capturar erros em API Routes:**

```typescript
import * as Sentry from '@sentry/nextjs'

export async function POST(request: NextRequest) {
  try {
    // ... lógica
  } catch (error) {
    // Log local
    console.error('[API] Error:', error)
    
    // Enviar para Sentry
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/webhook',
        client_id: clientId
      },
      extra: {
        payload: JSON.stringify(payload).slice(0, 1000)  // Limitar tamanho
      }
    })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### 9.4 Vercel Analytics

**Métricas de Performance:**

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
```

**Métricas Customizadas:**

```typescript
import { track } from '@vercel/analytics'

// Trackear eventos importantes
track('user_created', {
  role: 'client_admin',
  client_id: clientId
})

track('message_sent', {
  client_id: clientId,
  type: 'text'
})

track('ai_response_generated', {
  model: 'llama-3.3-70b',
  tokens: 1500,
  duration_ms: 2300
})
```

---

*Continua na Parte 3...*

---

## 10. Performance e Escalabilidade

### 10.1 Database Optimization

**Índices Estratégicos:**

```sql
-- Índices para queries frequentes
CREATE INDEX idx_messages_phone_created 
ON messages(phone_number, created_at DESC);

CREATE INDEX idx_messages_client_status 
ON messages(client_id, status) 
WHERE status IN ('pending', 'processing');

-- Índice parcial (economiza espaço)
CREATE INDEX idx_conversations_active 
ON conversations(client_id, last_message_at DESC) 
WHERE status = 'active';

-- Índice para full-text search
CREATE INDEX idx_messages_content_fts 
ON messages USING gin(to_tsvector('portuguese', content));

-- Índice composto para queries complexas
CREATE INDEX idx_messages_composite 
ON messages(client_id, phone_number, created_at DESC);
```

**EXPLAIN ANALYZE para Identificar Slow Queries:**

```sql
-- Antes de criar índice
EXPLAIN ANALYZE
SELECT * FROM messages 
WHERE client_id = 'abc123' 
  AND phone_number = '+5511999999999'
ORDER BY created_at DESC 
LIMIT 50;

-- Resultado mostra:
-- Seq Scan on messages (cost=0.00..1500.00 rows=100 width=200)
-- Planning Time: 0.5 ms
-- Execution Time: 45.2 ms  ⚠️ LENTO

-- Criar índice
CREATE INDEX idx_messages_phone_created 
ON messages(phone_number, created_at DESC);

-- Depois do índice
EXPLAIN ANALYZE
-- ... mesma query
-- Index Scan using idx_messages_phone_created (cost=0.42..25.50 rows=100 width=200)
-- Execution Time: 2.1 ms  ✅ RÁPIDO
```

**Monitorar Índices Não Utilizados:**

```sql
-- Ver índices e uso
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC;

-- Índices com 0 scans = candidatos para remoção
-- MAS: verifique antes se são usados em constraints
```

### 10.2 Caching Strategy

**Múltiplas Camadas de Cache:**

```typescript
// lib/cache.ts
import { Redis } from '@upstash/redis'
import { unstable_cache } from 'next/cache'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!
})

// Layer 1: Next.js Cache (in-memory)
export const getCachedClientConfig = unstable_cache(
  async (clientId: string) => {
    // Layer 2: Redis Cache
    const cached = await redis.get(`client:${clientId}`)
    if (cached) return cached as ClientConfig
    
    // Layer 3: Database
    const config = await fetchClientConfigFromDB(clientId)
    
    // Cache por 5 minutos
    await redis.setex(`client:${clientId}`, 300, JSON.stringify(config))
    
    return config
  },
  ['client-config'],  // cache key
  {
    revalidate: 60,  // revalidate a cada 60s
    tags: ['client']  // tag para invalidação
  }
)

// Invalidar cache quando cliente atualizar
export async function updateClientConfig(clientId: string, updates: any) {
  // Atualizar DB
  await supabase.from('clients').update(updates).eq('id', clientId)
  
  // Invalidar Redis
  await redis.del(`client:${clientId}`)
  
  // Invalidar Next.js cache
  revalidateTag('client')
}
```

**Cache de RAG Context:**

```typescript
// lib/rag-cache.ts
export async function getCachedRAGContext(query: string, clientId: string) {
  const cacheKey = `rag:${clientId}:${hashQuery(query)}`
  
  // Verificar cache (válido por 1 hora)
  const cached = await redis.get(cacheKey)
  if (cached) {
    console.log('[RAG] Cache hit')
    return cached as string
  }
  
  // Buscar do vector store
  const context = await fetchRAGContext(query, clientId)
  
  // Cache por 1 hora
  await redis.setex(cacheKey, 3600, context)
  
  return context
}

function hashQuery(query: string): string {
  // Normalizar query para cache consistente
  const normalized = query.toLowerCase().trim()
  return crypto.createHash('md5').update(normalized).digest('hex').slice(0, 8)
}
```

### 10.3 Otimização de API Routes

**Streaming Responses para AI:**

```typescript
// app/api/chat/route.ts
import { OpenAI } from 'openai'

export async function POST(request: Request) {
  const { message, clientId } = await request.json()
  
  const openai = new OpenAI({
    apiKey: await getVaultSecret(`openai_key_${clientId}`)
  })
  
  // Streaming response
  const stream = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: message }],
    stream: true
  })
  
  // Retornar ReadableStream
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || ''
        controller.enqueue(encoder.encode(text))
      }
      controller.close()
    }
  })
  
  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}
```

**Parallel Data Fetching:**

```typescript
// ❌ Serial (lento)
const client = await getClient(clientId)
const conversations = await getConversations(clientId)
const stats = await getStats(clientId)
// Total: 300ms + 200ms + 150ms = 650ms

// ✅ Parallel (rápido)
const [client, conversations, stats] = await Promise.all([
  getClient(clientId),
  getConversations(clientId),
  getStats(clientId)
])
// Total: max(300ms, 200ms, 150ms) = 300ms
```

### 10.4 Image Optimization

**Next.js Image Component:**

```tsx
import Image from 'next/image'

// ✅ Otimizado automaticamente
<Image
  src={message.media_url}
  alt="Message attachment"
  width={300}
  height={300}
  quality={75}  // 75% é suficiente
  loading="lazy"  // Lazy load
  placeholder="blur"
  blurDataURL="data:image/svg+xml;base64,..."
/>

// ❌ Não otimizado
<img src={message.media_url} alt="Message" />
```

**next.config.js:**

```javascript
module.exports = {
  images: {
    domains: [
      'scontent.whatsapp.net',  // WhatsApp media
      'your-supabase.supabase.co'
    ],
    formats: ['image/avif', 'image/webp'],  // Formatos modernos
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96]
  }
}
```

### 10.5 Bundle Size Optimization

**Dynamic Imports para Componentes Pesados:**

```typescript
// ❌ Import estático (carrega sempre)
import ReactJson from 'react-json-view'

// ✅ Dynamic import (lazy load)
import dynamic from 'next/dynamic'

const ReactJson = dynamic(() => import('react-json-view'), {
  ssr: false,
  loading: () => <div>Loading...</div>
})
```

**Análise de Bundle:**

```bash
# Instalar
npm install @next/bundle-analyzer

# next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true'
})

module.exports = withBundleAnalyzer({
  // ... sua config
})

# Rodar análise
ANALYZE=true npm run build
```

### 10.6 Database Connection Pooling

**Supabase usa PgBouncer por padrão, mas você pode otimizar:**

```typescript
// ❌ Criar cliente a cada request (lento)
export async function GET(request: Request) {
  const supabase = createServiceRoleClient()
  // ... usar supabase
}

// ✅ Singleton pattern (rápido)
let supabaseInstance: ReturnType<typeof createServiceRoleClient> | null = null

function getSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createServiceRoleClient()
  }
  return supabaseInstance
}

export async function GET(request: Request) {
  const supabase = getSupabaseClient()
  // ... usar supabase
}
```

---

## 11. Testes e Quality Assurance

### 11.1 Estrutura de Testes

**Setup com Vitest:**

```bash
npm install -D vitest @vitest/ui
npm install -D @testing-library/react @testing-library/jest-dom
```

**vitest.config.ts:**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
```

**tests/setup.ts:**

```typescript
import '@testing-library/jest-dom'
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Cleanup após cada teste
afterEach(() => {
  cleanup()
})

// Mock environment variables
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key')
```

### 11.2 Unit Tests

**Testar Nodes Individualmente:**

```typescript
// src/nodes/__tests__/parseMessage.test.ts
import { describe, it, expect } from 'vitest'
import { parseMessage } from '../parseMessage'

describe('parseMessage', () => {
  it('should parse text message', async () => {
    const payload = {
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: '5511999999999',
              type: 'text',
              text: { body: 'Hello' }
            }]
          }
        }]
      }]
    }
    
    const result = await parseMessage(payload)
    
    expect(result).toEqual({
      phone: '5511999999999',
      type: 'text',
      content: 'Hello',
      timestamp: expect.any(String)
    })
  })
  
  it('should handle image message', async () => {
    const payload = {
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: '5511999999999',
              type: 'image',
              image: {
                id: 'media123',
                mime_type: 'image/jpeg'
              }
            }]
          }
        }]
      }]
    }
    
    const result = await parseMessage(payload)
    
    expect(result.type).toBe('image')
    expect(result.mediaId).toBe('media123')
  })
  
  it('should throw on invalid payload', async () => {
    await expect(parseMessage({})).rejects.toThrow('Invalid payload')
  })
})
```

**Testar Helpers:**

```typescript
// src/lib/__tests__/utils.test.ts
import { describe, it, expect } from 'vitest'
import { formatPhoneNumber, sanitizeMessage } from '../utils'

describe('formatPhoneNumber', () => {
  it('should format Brazilian phone', () => {
    expect(formatPhoneNumber('11999999999')).toBe('+5511999999999')
  })
  
  it('should preserve international format', () => {
    expect(formatPhoneNumber('+5511999999999')).toBe('+5511999999999')
  })
})

describe('sanitizeMessage', () => {
  it('should remove HTML tags', () => {
    const dirty = '<script>alert("xss")</script>Hello'
    expect(sanitizeMessage(dirty)).toBe('Hello')
  })
  
  it('should preserve safe HTML', () => {
    const safe = '<b>Bold</b> text'
    expect(sanitizeMessage(safe)).toContain('Bold')
  })
})
```

### 11.3 Integration Tests

**Testar Flow Completo:**

```typescript
// src/flows/__tests__/chatbotFlow.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { chatbotFlow } from '../chatbotFlow'
import * as supabase from '@/lib/supabase'
import * as openai from '@/lib/openai'

// Mock dependencies
vi.mock('@/lib/supabase')
vi.mock('@/lib/openai')

describe('chatbotFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  it('should process text message end-to-end', async () => {
    const mockPayload = {
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: '5511999999999',
              type: 'text',
              text: { body: 'Olá' }
            }]
          }
        }]
      }]
    }
    
    const mockConfig = {
      client_id: 'test-client',
      openai_api_key: 'sk-test',
      prompt: 'You are a helpful assistant'
    }
    
    // Mock Supabase insert
    vi.spyOn(supabase, 'insertMessage').mockResolvedValue({ id: '123' })
    
    // Mock OpenAI response
    vi.spyOn(openai, 'generateResponse').mockResolvedValue({
      content: 'Olá! Como posso ajudar?',
      tokens: 15
    })
    
    await chatbotFlow(mockPayload, mockConfig)
    
    // Verificar que mensagem foi salva
    expect(supabase.insertMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: '5511999999999',
        content: 'Olá',
        direction: 'incoming'
      })
    )
    
    // Verificar que resposta foi gerada
    expect(openai.generateResponse).toHaveBeenCalled()
  })
})
```

### 11.4 E2E Tests com Playwright

**Setup:**

```bash
npm install -D @playwright/test
npx playwright install
```

**tests/e2e/dashboard.spec.ts:**

```typescript
import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login (se necessário)
    await page.goto('http://localhost:3000/dashboard')
  })
  
  test('should display conversation list', async ({ page }) => {
    // Esperar lista carregar
    await page.waitForSelector('[data-testid="conversation-list"]')
    
    // Verificar que tem pelo menos 1 conversa
    const conversations = await page.locator('[data-testid="conversation-item"]')
    expect(await conversations.count()).toBeGreaterThan(0)
  })
  
  test('should open conversation detail', async ({ page }) => {
    // Clicar na primeira conversa
    await page.locator('[data-testid="conversation-item"]').first().click()
    
    // Verificar que mensagens aparecem
    await page.waitForSelector('[data-testid="message-bubble"]')
    
    // Verificar URL
    expect(page.url()).toContain('/conversations/')
  })
  
  test('should send message', async ({ page }) => {
    // Abrir conversa
    await page.goto('http://localhost:3000/dashboard/conversations/+5511999999999')
    
    // Digitar mensagem
    await page.fill('[data-testid="message-input"]', 'Test message')
    
    // Enviar
    await page.click('[data-testid="send-button"]')
    
    // Verificar que mensagem aparece
    await expect(
      page.locator('text=Test message')
    ).toBeVisible()
  })
})
```

### 11.5 TypeScript Type Checking

**Adicionar ao CI/CD:**

```json
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "type-check": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx",
    "validate": "npm run type-check && npm run lint && npm run test"
  }
}
```

**tsconfig.json estrito:**

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

---

## 12. Deploy e CI/CD

### 12.1 Vercel Deployment

**vercel.json:**

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["gru1"],  // São Paulo
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key"
  }
}
```

**Environment Variables no Vercel:**
1. Dashboard → Settings → Environment Variables
2. Adicionar todas de `.env.local`
3. Separar por ambiente (Production, Preview, Development)

**Build Command Customizado:**

```json
// package.json
{
  "scripts": {
    "build": "next build",
    "build:analyze": "ANALYZE=true next build",
    "postbuild": "node scripts/post-build.js"
  }
}
```

### 12.2 GitHub Actions CI/CD

**.github/workflows/ci.yml:**

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Type check
        run: npm run type-check
      
      - name: Lint
        run: npm run lint
      
      - name: Run tests
        run: npm run test
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      
      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

**.github/workflows/deploy.yml:**

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### 12.3 Database Migrations em Deploy

**Automatizar Migrations:**

```yaml
# .github/workflows/migrate.yml
name: Database Migration

on:
  push:
    branches: [main]
    paths:
      - 'supabase/migrations/**'

jobs:
  migrate:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest
      
      - name: Run migrations
        run: supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
      
      - name: Backup after migration
        run: |
          ./db/backup-complete.sh
          # Upload para S3/GCS (opcional)
```

### 12.4 Preview Deployments

**Vercel cria preview automático para PRs:**

```yaml
# .github/workflows/preview-comment.yml
name: Preview Comment

on:
  deployment_status:

jobs:
  comment:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    
    steps:
      - name: Comment PR
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `✅ Preview deployed: ${context.payload.deployment_status.target_url}`
            })
```

### 12.5 Monitoring de Deploy

**Health Check Endpoint:**

```typescript
// app/api/health/route.ts
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    // Verificar DB connection
    const supabase = createServerClient()
    const { error } = await supabase.from('clients').select('id').limit(1)
    
    if (error) throw error
    
    // Verificar Redis (opcional)
    // await redis.ping()
    
    return Response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev'
    })
  } catch (error) {
    return Response.json(
      {
        status: 'unhealthy',
        error: error.message
      },
      { status: 503 }
    )
  }
}
```

**Uptime Monitoring (Better Uptime, UptimeRobot):**
- Criar monitor para `https://your-app.vercel.app/api/health`
- Alertar se status != 200
- Intervalo: 1 minuto

---

## 13. Pre-Launch Checklist

### 13.1 Segurança

- [ ] Todas as variáveis sensíveis estão em `.env.local` (não commitadas)
- [ ] Secrets do banco estão no Supabase Vault
- [ ] RLS policies ativas em todas as tabelas
- [ ] CORS configurado apenas para domínios necessários
- [ ] Rate limiting implementado em endpoints públicos
- [ ] Headers de segurança configurados (CSP, X-Frame-Options)
- [ ] Input sanitization em todos os endpoints
- [ ] HTTPS obrigatório (Vercel faz automaticamente)
- [ ] Dependências auditadas (`npm audit`)

### 13.2 Performance

- [ ] Índices criados para queries frequentes
- [ ] `EXPLAIN ANALYZE` rodado em queries lentas
- [ ] Caching implementado (Next.js + Redis)
- [ ] Images otimizadas (Next.js Image component)
- [ ] Bundle analisado (`ANALYZE=true npm run build`)
- [ ] Dynamic imports para componentes pesados
- [ ] Lighthouse score > 90 em Performance
- [ ] Database connection pooling configurado

### 13.3 Monitoramento

- [ ] Sentry configurado para error tracking
- [ ] Vercel Analytics ativo
- [ ] Execution logs implementados
- [ ] Health check endpoint criado
- [ ] Uptime monitoring configurado
- [ ] Alertas configurados (email/Slack)
- [ ] Dashboard de métricas criado

### 13.4 Multi-Tenancy

- [ ] Todas as tabelas têm `client_id`
- [ ] RLS policies filtram por `client_id`
- [ ] Webhooks roteiam por `client_id`
- [ ] Config loader implementado
- [ ] Secrets separados por cliente (Vault)
- [ ] Rate limiting por cliente
- [ ] Testes de isolamento executados

### 13.5 Migrations e Backup

- [ ] Todas as migrations commitadas no Git
- [ ] Backup automático configurado (diário)
- [ ] Strategy de rollback documentada
- [ ] Migrations testadas em staging
- [ ] Backup testado (restore funciona)

### 13.6 Testes

- [ ] Unit tests cobrem nodes críticos
- [ ] Integration tests cobrem flows principais
- [ ] E2E tests cobrem user journeys
- [ ] TypeScript strict mode ativo (sem erros)
- [ ] ESLint configurado e sem warnings
- [ ] CI/CD pipeline rodando

### 13.7 Documentação

- [ ] README.md atualizado com setup instructions
- [ ] API endpoints documentados
- [ ] Database schema documentado
- [ ] Environment variables documentadas
- [ ] Troubleshooting guide criado
- [ ] Onboarding guide para novos devs

### 13.8 Legal e Compliance

- [ ] Termos de Serviço escritos
- [ ] Política de Privacidade escrita
- [ ] LGPD compliance verificado (se Brasil)
- [ ] GDPR compliance verificado (se Europa)
- [ ] Meta Business Terms aceitos
- [ ] WhatsApp Business Policy compliance

### 13.9 Final Checks

- [ ] Testar signup flow completo
- [ ] Testar fluxo de mensagem end-to-end
- [ ] Testar em múltiplos browsers (Chrome, Safari, Firefox)
- [ ] Testar em mobile (iOS, Android)
- [ ] Stress test (simular 100+ mensagens simultâneas)
- [ ] Verificar custos estimados (Supabase, Vercel, APIs)
- [ ] Plano de escala documentado (O que fazer se crescer 10x?)

---

## Conclusão

Este guia reúne as melhores práticas aprendidas na construção de um SaaS multi-tenant real. Os principais pilares são:

1. **Multi-Tenancy desde o início** - RLS + client_id em todas as tabelas
2. **Segurança em camadas** - Vault, RLS, validação, rate limiting
3. **Migrations versionadas** - NUNCA alterar schema sem migration
4. **Monitoramento completo** - Logs, métricas, alertas
5. **Performance otimizada** - Índices, caching, bundle size
6. **Testes automatizados** - Unit, integration, E2E
7. **CI/CD robusto** - Deploy automático, health checks

**Lembre-se**: O código é fácil. O difícil é manter a qualidade, segurança e performance conforme o sistema cresce. Estas práticas garantem que seu SaaS escale sem se tornar uma dívida técnica insustentável.

---

**Próximos Passos Sugeridos:**

1. Implementar este guia fase por fase (não tente tudo de uma vez)
2. Criar templates reutilizáveis (migration template, node template, etc.)
3. Automatizar checks com Git hooks (husky)
4. Criar dashboard interno de métricas
5. Documentar casos de uso específicos do seu domínio

Bom desenvolvimento! 🚀

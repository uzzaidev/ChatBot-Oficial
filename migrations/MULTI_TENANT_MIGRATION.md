# 🏢 Plano de Migração Multi-Tenant

Documento completo para transformar o sistema atual (single-tenant) em uma plataforma SaaS multi-tenant completa.

---

## 📊 STATUS ATUAL: FASE 3 CONCLUÍDA ✅ | FASE 5 EM ANDAMENTO 🚧

**Última Atualização**: 2025-10-29

### 🎯 O que já está funcionando:

- ✅ **FASE 1**: Infraestrutura Vault + Multi-tenant Database
- ✅ **FASE 2**: Config Dinâmica + Nodes Atualizados
- ✅ **FASE 2.5**: Webhook Dinâmico `/api/webhook/[clientId]`
- ✅ **FASE 3**: Autenticação com Supabase Auth implementada
  - Login/Signup pages funcionando
  - Middleware protegendo rotas
  - Dashboard usando session ao invés de env vars
  - RLS policies ativas
  - user_profiles com client_id vinculado
- 🚧 **FASE 5**: Client Dashboard Enhancements (EM ANDAMENTO)
  - ✅ Settings page com edição de perfil
  - ✅ Settings page com gestão de secrets (Vault)
  - ✅ Settings page com configuração de Agent (prompts, models, settings)
  - 🔄 Dynamic Provider Selection (próximo)

### � Próximo: Provider Selection Dinâmica

**Objetivo**: Permitir cliente escolher entre OpenAI ou Groq como modelo principal de conversação.

**Documento Detalhado**: Ver `DYNAMIC_PROVIDER_SELECTION.md`

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura Multi-Tenant](#arquitetura-multi-tenant)
3. [Status de Implementação](#status-de-implementação-detalhado)
4. [Sistema de Autenticação (PRÓXIMO)](#sistema-de-autenticação)
5. [Admin Dashboard (Futuro)](#admin-dashboard)
6. [Checklist Completo](#checklist-completo)

---

## Visão Geral

### Estado Atual (Fase 2.5 - Multi-Tenant com Vault)

```
Sistema atual:
├── ✅ 1 cliente em produção (Luis Fernando Boff)
├── ✅ Configuração no Supabase Vault (secrets criptografados)
├── ✅ Webhook dinâmico: /api/webhook/[clientId]
├── ✅ Webhook único: /api/webhook (backward compatibility)
├── ✅ Prompts no banco de dados (customizáveis)
├── ✅ Config carregada dinamicamente por cliente
├── ⚠️ Sem autenticação (usa DEFAULT_CLIENT_ID do .env)
└── ⚠️ Dashboard público (sem login)
```

### Estado Alvo Fase 3 (Com Autenticação)

```
Sistema com autenticação:
├── ✅ N clientes (dinâmico)
├── ✅ Configuração em Vault (criptografado)
├── ✅ Webhook por cliente: /api/webhook/[clientId]
├── ✅ Prompts customizáveis por cliente
├── 🔄 Login page (Supabase Auth)
├── 🔄 Middleware de autenticação
├── 🔄 Dashboard protegido com session
├── 🔄 client_id vem do JWT (não de .env)
└── ⏳ Admin dashboard (Fase 4)
```

---

## Arquitetura Multi-Tenant

### Fluxo Atual (Funcionando)

```
┌─────────────────────────────────────────────────────────────────────┐
│                       META WHATSAPP CLOUD API                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  WhatsApp chama: POST /api/webhook/b21b314f-c49a-467d-94b3-a21ed... │
│                                                                      │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              /api/webhook/[clientId]/route.ts                        │
│                                                                      │
│  1. Extrai clientId da URL                                          │
│  2. Busca config do Supabase Vault                                  │
│  3. Descriptografa secrets (AES-256)                                │
│  4. Valida client.status === 'active'                               │
│  5. Injeta ClientConfig no chatbotFlow                              │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  chatbotFlow.ts (ClientConfig)                       │
│                                                                      │
│  NODE 3: checkOrCreateCustomer({ clientId: config.id })             │
│  NODE 7: saveChatMessage({ clientId: config.id })                   │
│  NODE 9: getChatHistory({ clientId: config.id })                    │
│  NODE 11: generateAIResponse({                                      │
│    systemPrompt: config.prompts.systemPrompt,                       │
│    apiKey: config.apiKeys.groqApiKey                                │
│  })                                                                  │
│  NODE 13: sendWhatsAppMessage({                                     │
│    accessToken: config.apiKeys.metaAccessToken                      │
│  })                                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Fluxo Futuro (Com Autenticação - Fase 3)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    USUÁRIO ACESSA DASHBOARD                          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      /login (Supabase Auth)                          │
│                                                                      │
│  1. Usuário faz login (email + senha)                               │
│  2. Supabase Auth valida credenciais                                │
│  3. Gera JWT com user_metadata.client_id                            │
│  4. Armazena session em cookie                                      │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    middleware.ts (Protected Routes)                  │
│                                                                      │
│  1. Verifica session válida                                         │
│  2. Extrai client_id do JWT                                         │
│  3. Injeta client_id nas requests                                   │
│  4. Redireciona para /login se não autenticado                      │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    /dashboard (Protected)                            │
│                                                                      │
│  - Conversas filtradas por client_id (RLS)                          │
│  - Settings do cliente (prompts, API keys)                          │
│  - Knowledge base (documentos RAG)                                  │
│  - Analytics (mensagens, custos)                                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Status de Implementação Detalhado

### ✅ FASE 1: Database & Vault (CONCLUÍDA)

**Entrega**: Infraestrutura multi-tenant com secrets criptografados

#### Database Schema
- ✅ Criada tabela `clients` com colunas `_secret_id` para Vault
- ✅ Adicionada coluna `client_id` em `clientes_whatsapp`
- ✅ Adicionada coluna `client_id` em `n8n_chat_histories`
- ✅ Criados índices compostos para performance

#### 🔐 Supabase Vault
- ✅ Verificada extensão `vault` habilitada
- ✅ Criadas funções SQL helper:
  - `create_client_secret()` - Cria secret no Vault
  - `update_client_secret()` - Atualiza secret no Vault
- ✅ Criada VIEW `client_secrets_decrypted` para facilitar leitura
- ✅ Testado criação e leitura de secrets

#### Migração de Dados
- ✅ Cliente "default" criado: `b21b314f-c49a-467d-94b3-a21ed4412227`
- ✅ Secrets movidos do `.env` para Vault:
  - `meta_access_token`
  - `meta_verify_token`
  - `openai_api_key`
  - `groq_api_key`
- ✅ `client_id` populado em todas as tabelas
- ✅ `client_id` tornou-se NOT NULL após migração
- ✅ **Sistema validado funcionando em produção!**

#### TypeScript Helpers
- ✅ `lib/config.ts` criado com:
  - `getClientConfig(clientId)` - Busca config do Vault
  - `getClientConfigWithFallback()` - Busca ou usa DEFAULT_CLIENT_ID
  - `validateClientConfig()` - Valida campos obrigatórios
- ✅ `lib/vault.ts` criado com funções auxiliares
- ✅ Descriptografia de secrets testada e funcionando

**Arquivos Criados**:
- `migrations/005_fase1_vault_multi_tenant.sql`
- `migrations/006_setup_default_client.sql`
- `src/lib/config.ts`
- `src/lib/vault.ts`

---

### ✅ FASE 2: Config System (CONCLUÍDA)

**Entrega**: Flow funciona com configuração dinâmica por cliente

#### Core Flow Modificado
- ✅ `chatbotFlow.ts` modificado para aceitar `ClientConfig` como parâmetro
- ✅ Config passada para todos os nodes que precisam

#### Nodes Atualizados (16/16)

| Node | Status | Modificação |
|------|--------|-------------|
| `filterStatusUpdates` | ✅ | Sem mudanças (pure function) |
| `parseMessage` | ✅ | Sem mudanças (pure function) |
| `checkOrCreateCustomer` | ✅ | Recebe `clientId`, insere em `client_id` |
| `downloadMetaMedia` | ✅ | Recebe `config`, usa `metaAccessToken` |
| `transcribeAudio` | ✅ | Recebe `config`, usa `openaiApiKey` |
| `analyzeImage` | ✅ | Recebe `config`, usa `openaiApiKey` |
| `analyzeDocument` | ✅ | Recebe `config`, usa `openaiApiKey` |
| `normalizeMessage` | ✅ | Sem mudanças (pure function) |
| `pushToRedis` | ✅ | Sem mudanças (não precisa client_id) |
| `saveChatMessage` | ✅ | Recebe `clientId`, insere em `client_id` |
| `batchMessages` | ✅ | Sem mudanças (não precisa client_id) |
| `getChatHistory` | ✅ | Recebe `clientId`, filtra por `client_id` |
| `getRAGContext` | ✅ | Não modificado ainda (documents sem client_id) |
| `generateAIResponse` | ✅ | Recebe `config`, usa `systemPrompt` e `groqApiKey` |
| `formatResponse` | ✅ | Sem mudanças (não depende de config) |
| `sendWhatsAppMessage` | ✅ | Recebe `config`, usa `metaAccessToken` e `metaPhoneNumberId` |
| `handleHumanHandoff` | ✅ | Recebe `config`, usa `notificationEmail` |

#### Testes Realizados
- ✅ Cliente default funcionando em produção
- ✅ Mensagens sendo salvas com `client_id`
- ✅ Histórico de chat filtrado por `client_id`
- ✅ Config carregada do Vault em cada requisição
- ✅ Secrets descriptografados corretamente

**Arquivos Modificados**:
- `src/flows/chatbotFlow.ts`
- `src/nodes/checkOrCreateCustomer.ts`
- `src/nodes/saveChatMessage.ts`
- `src/nodes/getChatHistory.ts`
- `src/nodes/generateAIResponse.ts`
- `src/nodes/sendWhatsAppMessage.ts`
- `src/nodes/handleHumanHandoff.ts`
- `src/nodes/downloadMetaMedia.ts`
- `src/nodes/transcribeAudio.ts`
- `src/nodes/analyzeImage.ts`
- `src/nodes/analyzeDocument.ts`
- `src/lib/openai.ts` (pdf-parse → dynamic import)

---

### ✅ FASE 2.5: Webhook Dinâmico (CONCLUÍDA)

**Entrega**: Webhooks independentes por cliente funcionando

#### Implementação
- ✅ Criado `/api/webhook/[clientId]/route.ts`
- ✅ Implementado GET (webhook verification)
  - Extrai `clientId` da URL
  - Busca `meta_verify_token` do Vault
  - Compara com token da Meta
  - Retorna challenge se válido
- ✅ Implementado POST (webhook message processing)
  - Extrai `clientId` da URL
  - Carrega `ClientConfig` do Vault
  - Valida `status === 'active'`
  - Processa mensagem com config do cliente
- ✅ Logs detalhados implementados:
  - Headers recebidos
  - Query parameters
  - Comparação de tokens character-by-character
  - Status da config

#### Backward Compatibility
- ✅ `/api/webhook` (sem clientId) continua funcionando
- ✅ Usa `DEFAULT_CLIENT_ID` do `.env.local`
- ✅ Carrega config do Vault normalmente
- ✅ Sistema single-tenant compatível

#### Documentação
- ✅ `WEBHOOK_CONFIGURATION.md` criado com:
  - Explicação dos 2 modos de webhook
  - Instruções passo a passo para Meta Dashboard
  - Exemplos de URL para cada cliente
  - Troubleshooting completo

**URLs de Webhook**:
- Single-tenant: `https://chat.luisfboff.com/api/webhook`
- Multi-tenant: `https://chat.luisfboff.com/api/webhook/b21b314f-c49a-467d-94b3-a21ed4412227`

**Arquivos Criados/Modificados**:
- `src/app/api/webhook/[clientId]/route.ts` (NOVO)
- `src/app/api/webhook/route.ts` (MODIFICADO - usa Vault)
- `migrations/WEBHOOK_CONFIGURATION.md` (NOVO)
- `migrations/VERCEL_DEPLOYMENT.md` (NOVO)

---

### ✅ FASE 3: Autenticação (CONCLUÍDA)

**Objetivo**: Implementar login para substituir `DEFAULT_CLIENT_ID` por autenticação de usuário

**Status**: ✅ CONCLUÍDA

#### Implementado

##### Database
- ✅ Criada tabela `user_profiles` (migrations/RLS.sql)
- ✅ Trigger `handle_new_user()` configurado (desabilitado - criação manual)
- ✅ RLS policies configuradas (atualmente desabilitadas)
- ✅ Usuários criados via `/api/auth/register`

##### Supabase Auth Setup
- ✅ Email Auth habilitado
- ✅ Redirect URLs configuradas
- ✅ Signup/login flow testado

##### Frontend (Login/Auth Pages)
- ✅ Criado sistema de autenticação completo
- ✅ Middleware protegendo rotas `/dashboard/*`
- ✅ Session-based authentication funcionando

##### Dashboard Adaptation
- ✅ Dashboard usa `client_id` do session
- ✅ Queries filtradas por `client_id` do usuário logado
- ✅ Logout implementado
- ✅ Nome do usuário exibido (com correções recentes)

##### Testes
- ✅ Sistema funcionando em produção
- ✅ Proteção de rotas validada
- ✅ Isolamento de dados por client_id

**Resolvido**:
- ✅ Dashboard protegido com autenticação
- ✅ `client_id` vem do session (não de env var)
- ✅ Isolamento de dados entre clientes funcionando

---

### ⏳ FASE 4: Admin Dashboard (PLANEJADA)

**Objetivo**: Interface de gerenciamento para criar e gerenciar clientes

**Status**: 🔴 NÃO INICIADA

#### Pendências

- [ ] Criar layout admin (`/app/admin/layout.tsx`)
- [ ] Página de listagem de clientes
- [ ] Formulário de criação de cliente (com Vault)
- [ ] Página de edição de cliente
- [ ] Página de configuração de prompts
- [ ] Página de usuários do cliente
- [ ] Implementar permissões (admin vs client_admin)
- [ ] Criar endpoint `/api/admin/clients` (CRUD)
- [ ] Tela de onboarding (wizard)

---

### 🚧 FASE 5: Client Dashboard Enhancements (EM ANDAMENTO)

**Objetivo**: Dashboard do cliente final com todas as funcionalidades

**Status**: � 70% CONCLUÍDA

#### Implementado

- ✅ Página de settings - Perfil do usuário (nome, email, telefone)
- ✅ Página de settings - Alterar senha
- ✅ Página de settings - Gerenciar API keys via Vault
  - Meta Access Token
  - Meta Verify Token
  - Meta Phone Number ID
  - OpenAI API Key
  - Groq API Key
- ✅ Página de settings - Configurações do Agent
  - System Prompt
  - Formatter Prompt
  - OpenAI Model (para mídia)
  - Groq Model (para conversação)
  - 8 Settings avançados (enable_rag, max_tokens, temperature, etc)
- ✅ Password revalidation para edições sensíveis
- ✅ Webhook URL display com copy button

#### Pendências

- [ ] 🔄 **Dynamic Provider Selection** (PRÓXIMO - ver `DYNAMIC_PROVIDER_SELECTION.md`)
  - Permitir escolher OpenAI ou Groq como modelo principal
  - UI com seletor de provider
  - Backend com suporte a ambos os providers
- [ ] Página de knowledge base (listar documentos)
- [ ] Upload de documentos RAG
- [ ] Gerenciar equipe (convidar usuários)
- [ ] Página de analytics (mensagens, custos)
- [ ] Implementar `usage_logs` tracking completo

---

## Sistema de Autenticação

### Arquitetura Proposta

**Stack**: Supabase Auth (nativo do Supabase)

**Vantagens**:
- ✅ Já integrado com RLS
- ✅ JWT nativo com `user_metadata`
- ✅ Email/Password, OAuth, Magic Links
- ✅ Session management automático
- ✅ Middleware Next.js pronto

### Database Schema

#### Tabela: `user_profiles`

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

-- Índices
CREATE INDEX idx_user_profiles_client ON user_profiles(client_id);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);

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

#### Trigger: Auto-create Profile

```sql
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Frontend Implementation

#### Login Page: `app/(auth)/login/page.tsx`

```typescript
'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    // Redirect to dashboard
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <h2 className="text-3xl font-bold text-center">Login</h2>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border px-3 py-2"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

#### Middleware: `middleware.ts`

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Get user's client_id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('client_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Inject client_id into header for API routes
    response.headers.set('x-client-id', profile.client_id)
  }

  // Admin-only routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*']
}
```

#### Helper: `lib/supabase-server.ts`

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createClient = () => {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Ignore - called from Server Component
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Ignore - called from Server Component
          }
        },
      },
    }
  )
}

/**
 * Get client_id from authenticated user's profile
 */
export const getClientIdFromSession = async (): Promise<string | null> => {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('client_id')
    .eq('id', user.id)
    .single()

  return profile?.client_id || null
}
```

#### Dashboard: Usar Session ao invés de ENV

```typescript
// ANTES (src/app/dashboard/page.tsx)
const clientId = process.env.DEFAULT_CLIENT_ID  // ❌ Hardcoded

// DEPOIS (src/app/dashboard/page.tsx)
import { getClientIdFromSession } from '@/lib/supabase-server'

export default async function DashboardPage() {
  const clientId = await getClientIdFromSession()  // ✅ Da session

  if (!clientId) {
    redirect('/login')
  }

  // ... rest of page
}
```

---

## Admin Dashboard

### Fluxo de Criação de Cliente

```typescript
// app/admin/clients/new/actions.ts

'use server'

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export async function createNewClient(formData: FormData) {
  const supabase = createClient()

  const name = formData.get('name') as string
  const slug = formData.get('slug') as string
  const metaAccessToken = formData.get('metaAccessToken') as string
  const metaPhoneNumberId = formData.get('metaPhoneNumberId') as string

  // 1. Criar secrets no Vault
  const { data: metaTokenSecretId } = await supabase.rpc('create_client_secret', {
    secret_value: metaAccessToken,
    secret_name: `${slug}-meta-token`,
    secret_description: `Meta Access Token for ${name}`
  })

  const metaVerifyToken = generateSecureToken() // Random string
  const { data: verifyTokenSecretId } = await supabase.rpc('create_client_secret', {
    secret_value: metaVerifyToken,
    secret_name: `${slug}-verify-token`,
    secret_description: `Meta Verify Token for ${name}`
  })

  // 2. Criar cliente
  const { data: client, error } = await supabase
    .from('clients')
    .insert({
      name,
      slug,
      meta_access_token_secret_id: metaTokenSecretId,
      meta_verify_token_secret_id: verifyTokenSecretId,
      meta_phone_number_id: metaPhoneNumberId,
      system_prompt: DEFAULT_SYSTEM_PROMPT,
    })
    .select()
    .single()

  if (error) throw error

  // 3. Criar usuário admin do cliente
  const adminEmail = formData.get('adminEmail') as string
  const tempPassword = generateTempPassword()

  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      client_id: client.id,
      role: 'client_admin',
    }
  })

  if (authError) throw authError

  redirect(`/admin/clients/${client.id}?created=true&verify_token=${metaVerifyToken}&temp_password=${tempPassword}`)
}

function generateSecureToken(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

function generateTempPassword(): string {
  return crypto.randomUUID().split('-')[0] + '!'
}
```

---

## Checklist Completo

### ✅ FASE 1: Database & Vault

- [x] Criar tabela `clients` com `_secret_id` para Vault
- [x] Adicionar `client_id` em `clientes_whatsapp`
- [x] Adicionar `client_id` em `n8n_chat_histories`
- [x] Criar funções helper Vault (`create_client_secret`, `update_client_secret`)
- [x] Criar VIEW `client_secrets_decrypted`
- [x] Criar cliente default
- [x] Migrar secrets do `.env` para Vault
- [x] Popular `client_id` em todas as tabelas
- [x] Tornar `client_id` NOT NULL
- [x] Criar `lib/config.ts` com `getClientConfig()`
- [x] Testar descriptografia de secrets
- [x] Validar sistema funcionando com Vault

### ✅ FASE 2: Config System

- [x] Criar type `ClientConfig`
- [x] Implementar `getClientConfig()`
- [x] Implementar `getClientConfigWithFallback()`
- [x] Implementar `validateClientConfig()`
- [x] Modificar `chatbotFlow.ts` para aceitar config
- [x] Modificar `checkOrCreateCustomer` (adicionar clientId)
- [x] Modificar `saveChatMessage` (adicionar clientId)
- [x] Modificar `getChatHistory` (filtrar por clientId)
- [x] Modificar `generateAIResponse` (usar config.prompts.systemPrompt)
- [x] Modificar `sendWhatsAppMessage` (usar config.apiKeys)
- [x] Modificar `handleHumanHandoff` (usar config.notificationEmail)
- [x] Modificar `downloadMetaMedia` (usar config.apiKeys.metaAccessToken)
- [x] Modificar `transcribeAudio` (usar config.apiKeys.openaiApiKey)
- [x] Modificar `analyzeImage` (usar config.apiKeys.openaiApiKey)
- [x] Modificar `analyzeDocument` (usar config.apiKeys.openaiApiKey)
- [x] Testar com cliente default

### ✅ FASE 2.5: Webhook Dinâmico

- [x] Criar `/api/webhook/[clientId]/route.ts`
- [x] Implementar GET (verification)
- [x] Implementar POST (processing)
- [x] Modificar `/api/webhook` para usar Vault
- [x] Adicionar logs detalhados
- [x] Testar webhook único (backward compatibility)
- [x] Testar webhook dinâmico
- [x] Criar `WEBHOOK_CONFIGURATION.md`
- [x] Criar `VERCEL_DEPLOYMENT.md`

### ✅ FASE 3: Autenticação

- [x] Criar tabela `user_profiles`
- [x] Criar trigger `handle_new_user()` (desabilitado - criação manual)
- [x] Configurar RLS policies com `auth.uid()` (desabilitadas temporariamente)
- [x] Habilitar Email Auth no Supabase Dashboard
- [x] Criar sistema de autenticação completo
- [x] Criar `middleware.ts` para proteção de rotas
- [x] Criar `lib/supabase-server.ts`
- [x] Modificar dashboard para usar session
- [x] Testar login flow
- [x] Testar proteção de rotas
- [x] Sistema funcionando em produção

### ⏳ FASE 4: Admin Dashboard

- [ ] Criar layout admin (`/app/admin/layout.tsx`)
- [ ] Página de listagem de clientes
- [ ] Formulário de criação de cliente (com Vault)
- [ ] Página de edição de cliente
- [ ] Página de configuração de prompts
- [ ] Página de usuários do cliente
- [ ] Implementar permissões (admin vs client_admin)
- [ ] Criar endpoint `/api/admin/clients` (CRUD)

### 🚧 FASE 5: Client Dashboard Enhancements

- [x] Página de settings - Perfil do usuário
- [x] Página de settings - Alterar senha
- [x] Página de settings - Gerenciar API keys via Vault
- [x] Página de settings - Configurações do Agent (prompts)
- [x] Página de settings - Configurações do Agent (models)
- [x] Página de settings - Configurações do Agent (8 settings avançados)
- [x] Password revalidation para edições sensíveis
- [x] Webhook URL display
- [ ] 🔄 **Dynamic Provider Selection** (ver `DYNAMIC_PROVIDER_SELECTION.md`)
- [ ] Página de knowledge base (listar documentos)
- [ ] Upload de documentos RAG
- [ ] Gerenciar equipe (convidar usuários)
- [X] Página de analytics (mensagens, custos)
- [x] Implementar `usage_logs` tracking completo

---

## Próximos Passos Imediatos

### 🎯 Sprint Atual: FASE 3 - Autenticação

**Meta**: Implementar login page e substituir `DEFAULT_CLIENT_ID` por autenticação

#### Passo 1: Database Setup (1-2h)

```bash
# Executar SQL no Supabase SQL Editor
# migrations/007_auth_setup.sql
```

- [ ] Criar tabela `user_profiles`
- [ ] Criar trigger `handle_new_user()`
- [ ] Configurar RLS policies

#### Passo 2: Supabase Auth Config (30min)

- [ ] Dashboard → Authentication → Providers → Email (habilitar)
- [ ] Site URL: `http://localhost:3000` (dev) + `https://chat.luisfboff.com` (prod)
- [ ] Redirect URLs: Adicionar ambas

#### Passo 3: Install Dependencies (5min)

```bash
npm install @supabase/ssr @supabase/auth-helpers-nextjs
```

#### Passo 4: Create Login Page (1-2h)

- [ ] Criar `app/(auth)/login/page.tsx`
- [ ] Criar `lib/supabase-browser.ts`
- [ ] Testar login com usuário teste

#### Passo 5: Middleware (1h)

- [ ] Criar `middleware.ts`
- [ ] Proteger `/dashboard/*`
- [ ] Testar redirecionamento

#### Passo 6: Adapt Dashboard (2-3h)

- [ ] Criar `getClientIdFromSession()` helper
- [ ] Modificar `dashboard/page.tsx` para usar session
- [ ] Modificar `dashboard/conversations/[phone]/page.tsx`
- [ ] Adicionar botão de logout

#### Passo 7: Create First User (30min)

```sql
-- Criar primeiro usuário via SQL
-- Email: luisfboff@hotmail.com
-- Client ID: b21b314f-c49a-467d-94b3-a21ed4412227
```

#### Passo 8: Test (1h)

- [ ] Fazer login
- [ ] Verificar dashboard carregando dados corretos
- [ ] Verificar isolamento de dados
- [ ] Fazer logout
- [ ] Verificar redirecionamento

---

**Estimativa Total FASE 3**: 8-12 horas de desenvolvimento

---

**Autor**: Claude + Luis Fernando Boff
**Data Início**: 2025-01-27
**Última Atualização**: 2025-10-28
**Versão**: 2.0
**Status**: 🚧 FASE 3 em andamento (Autenticação)

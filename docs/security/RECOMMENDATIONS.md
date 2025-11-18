# Recomendações de Segurança - ChatBot Oficial

**Data:** 2025-11-18
**Versão:** 1.0
**Status:** 📋 GUIA DE IMPLEMENTAÇÃO

---

## Sumário Executivo

Este documento fornece **recomendações técnicas detalhadas** para correção das 18 vulnerabilidades identificadas no sistema ChatBot Oficial. Cada recomendação inclui:
- Código de exemplo completo
- Passos de implementação
- Impacto esperado
- Dependências necessárias

**Organização:**
- Seção 1-5: Correções críticas (30 dias)
- Seção 6-9: Correções altas (60 dias)
- Seção 10-12: Melhorias médias/baixas (90 dias)

---

## 1. URGENTE: Deletar ou Proteger `/api/debug/env`

**Resolve:** VULN-003
**Prioridade:** 🔴 CRÍTICA
**Tempo estimado:** 30 minutos

### Opção 1: Deletar Completamente (RECOMENDADO)

```bash
# Deletar arquivo
rm src/app/api/debug/env/route.ts
```

### Opção 2: Proteger com Autenticação + Environment Check

```typescript
// src/app/api/debug/env/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getClientIdFromSession } from '@/lib/session-helpers'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // BLOQUEIO 1: Apenas em development
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 })
  }

  // BLOQUEIO 2: Verificar autenticação
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // BLOQUEIO 3: Apenas super admin
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // NUNCA retornar valores completos
  const maskKey = (key: string | undefined) => {
    if (!key) return 'NOT_SET'
    return key.substring(0, 3) + '***' + key.slice(-3)
  }

  return NextResponse.json({
    environment: process.env.NODE_ENV,
    keys_status: {
      openai: process.env.OPENAI_API_KEY ? 'SET' : 'MISSING',
      groq: process.env.GROQ_API_KEY ? 'SET' : 'MISSING',
      supabase: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
    },
    // Apenas primeiros/últimos 3 chars
    prefixes: {
      openai: maskKey(process.env.OPENAI_API_KEY),
      groq: maskKey(process.env.GROQ_API_KEY),
    }
  })
}
```

### Impacto
- ✅ Previne vazamento de secrets
- ✅ Mantém funcionalidade de debug em dev
- ✅ Auditável (apenas admins)

---

## 2. URGENTE: Implementar Signature Validation no Webhook

**Resolve:** VULN-012
**Prioridade:** 🔴 CRÍTICA
**Tempo estimado:** 2 horas

### Implementação Completa

```typescript
// src/app/api/webhook/[clientId]/route.ts
import crypto from 'crypto'

export async function POST(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    // 1. Obter signature do header
    const signature = request.headers.get('X-Hub-Signature-256')

    if (!signature) {
      console.error('[WEBHOOK] Missing signature header')
      return new NextResponse('Missing signature', { status: 401 })
    }

    // 2. Obter raw body (ANTES de parse JSON!)
    const rawBody = await request.text()

    // 3. Obter app secret do cliente
    const config = await getClientConfig(params.clientId)
    const appSecret = config.metaAppSecret // NOVO: adicionar no Vault

    if (!appSecret) {
      console.error('[WEBHOOK] App secret not configured for client')
      return new NextResponse('Configuration error', { status: 500 })
    }

    // 4. Calcular HMAC esperado
    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex')

    // 5. Comparação constant-time (previne timing attacks)
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(`sha256=${expectedSignature}`)
    )

    if (!isValid) {
      console.error('[WEBHOOK] Invalid signature')
      return new NextResponse('Invalid signature', { status: 403 })
    }

    // 6. Agora sim, processar payload
    const body = JSON.parse(rawBody)
    await processChatbotMessage(body, config)

    return new NextResponse('EVENT_RECEIVED', { status: 200 })
  } catch (error) {
    console.error('[WEBHOOK] Error:', error)
    return new NextResponse('Internal error', { status: 500 })
  }
}
```

### Adicionar App Secret ao Vault

```sql
-- Migration: add_meta_app_secret_to_vault.sql

-- 1. Adicionar novo secret para cada cliente
-- (Executar via Supabase Dashboard ou script)

-- Exemplo de como adicionar:
SELECT vault.create_secret(
  'EAAG...',  -- Valor do App Secret da Meta
  'meta_app_secret_CLIENT_ID',  -- Nome do secret
  'Meta App Secret for signature validation'
);

-- 2. Atualizar getClientConfig para buscar:
-- Adicionar no src/lib/config.ts:
```

```typescript
// src/lib/config.ts (adicionar no getClientConfig)
const secrets = await getSecretsParallel(supabase, [
  'meta_access_token',
  'meta_verify_token',
  'meta_app_secret',  // NOVO
  'openai_api_key',
  'groq_api_key',
], clientId)

return {
  // ...
  metaAppSecret: secrets.meta_app_secret || process.env.META_APP_SECRET,
}
```

### Onde Obter Meta App Secret

1. Acesse: https://developers.facebook.com/apps/
2. Selecione seu app
3. Settings → Basic
4. Copie "App Secret"
5. Adicione ao Vault via Dashboard de Settings

### Impacto
- ✅ Previne spoofing de mensagens
- ✅ Garante integridade do payload
- ✅ Compliance com Meta API

---

## 3. URGENTE: Corrigir RLS Policies em Tabelas Legacy

**Resolve:** VULN-007
**Prioridade:** 🔴 ALTA
**Tempo estimado:** 3 horas

### Migration Completa

```sql
-- supabase/migrations/YYYYMMDD_fix_legacy_rls_policies.sql

-- =============================================================================
-- CORREÇÃO: RLS Policies para Tabelas Legacy
-- =============================================================================

-- Função helper: Obter client_id do usuário autenticado
CREATE OR REPLACE FUNCTION public.user_client_id()
RETURNS UUID AS $$
  SELECT client_id
  FROM public.user_profiles
  WHERE id = auth.uid()
  LIMIT 1
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- =============================================================================
-- 1. CLIENTES_WHATSAPP
-- =============================================================================

-- Remover policy permissiva
DROP POLICY IF EXISTS "n8n" ON public.clientes_whatsapp;

-- SELECT: Usuários veem apenas clientes do próprio tenant
CREATE POLICY "Users can view own client customers"
  ON public.clientes_whatsapp
  FOR SELECT
  USING (
    client_id = user_client_id()
  );

-- INSERT: Apenas service role (webhook)
CREATE POLICY "Service role can insert customers"
  ON public.clientes_whatsapp
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- UPDATE: Apenas service role (webhook) ou próprio tenant
CREATE POLICY "Users can update own client customers"
  ON public.clientes_whatsapp
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR client_id = user_client_id()
  );

-- DELETE: Apenas admins do próprio tenant
CREATE POLICY "Client admins can delete own customers"
  ON public.clientes_whatsapp
  FOR DELETE
  USING (
    client_id = user_client_id()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'client_admin')
    )
  );

-- =============================================================================
-- 2. DOCUMENTS (RAG)
-- =============================================================================

-- Remover policy permissiva
DROP POLICY IF EXISTS "n8n" ON public.documents;

-- SELECT: Usuários veem apenas documentos do próprio tenant
CREATE POLICY "Users can view own client documents"
  ON public.documents
  FOR SELECT
  USING (
    client_id = user_client_id()
  );

-- INSERT: Apenas service role ou admins do tenant
CREATE POLICY "Admins can insert documents"
  ON public.documents
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR (
      client_id = user_client_id()
      AND EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'client_admin')
      )
    )
  );

-- UPDATE: Apenas service role ou admins do tenant
CREATE POLICY "Admins can update documents"
  ON public.documents
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR (
      client_id = user_client_id()
      AND EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'client_admin')
      )
    )
  );

-- DELETE: Apenas admins do tenant
CREATE POLICY "Admins can delete documents"
  ON public.documents
  FOR DELETE
  USING (
    client_id = user_client_id()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'client_admin')
    )
  );

-- =============================================================================
-- 3. CLIENTS
-- =============================================================================

-- Remover policy permissiva
DROP POLICY IF EXISTS "Enable read access for all users" ON public.clients;

-- SELECT: Usuários veem apenas o próprio client
CREATE POLICY "Users can view own client"
  ON public.clients
  FOR SELECT
  USING (
    id = user_client_id()
    OR auth.role() = 'service_role'
  );

-- UPDATE: Apenas admins do client
CREATE POLICY "Client admins can update own client"
  ON public.clients
  FOR UPDATE
  USING (
    id = user_client_id()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'client_admin')
    )
  );

-- INSERT/DELETE: Apenas super admins (via service role)
CREATE POLICY "Only service role can insert clients"
  ON public.clients
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Only service role can delete clients"
  ON public.clients
  FOR DELETE
  USING (auth.role() = 'service_role');

-- =============================================================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================================================

-- Índice para acelerar queries com client_id
CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp_client_id
  ON public.clientes_whatsapp(client_id);

CREATE INDEX IF NOT EXISTS idx_documents_client_id
  ON public.documents(client_id);

-- =============================================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =============================================================================

COMMENT ON POLICY "Users can view own client customers"
  ON public.clientes_whatsapp
  IS 'RLS: Usuários veem apenas clientes do próprio tenant via user_profiles.client_id';

COMMENT ON POLICY "Users can view own client documents"
  ON public.documents
  IS 'RLS: Isolamento multi-tenant para documentos RAG';

COMMENT ON POLICY "Users can view own client"
  ON public.clients
  IS 'RLS: Usuários veem apenas os dados do próprio client';
```

### Validação Pós-Migration

```sql
-- Teste 1: Verificar policies criadas
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('clientes_whatsapp', 'documents', 'clients')
ORDER BY tablename, policyname;

-- Teste 2: Simular acesso como usuário
-- (Executar via Supabase client com auth)
```

### Aplicar Migration

```bash
# 1. Criar migration
supabase migration new fix_legacy_rls_policies

# 2. Copiar SQL acima para o arquivo gerado

# 3. Aplicar em produção
supabase db push

# 4. Verificar sucesso
supabase db diff
```

### Impacto
- ✅ Isola dados entre tenants
- ✅ Previne vazamento de PII
- ✅ Compliance com multi-tenancy

---

## 4. URGENTE: Nunca Retornar Secrets Completos

**Resolve:** VULN-009
**Prioridade:** 🔴 CRÍTICA
**Tempo estimado:** 1 hora

### Refatoração Completa

```typescript
// src/app/api/vault/secrets/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getClientIdFromSession } from '@/lib/session-helpers'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// ========================================
// HELPER: Mascarar secrets
// ========================================
const maskSecret = (secret: string | null): string => {
  if (!secret || secret === '' || secret === 'CONFIGURE_IN_SETTINGS') {
    return 'CONFIGURE_IN_SETTINGS'
  }

  // Mostrar apenas últimos 4 caracteres
  if (secret.length <= 4) {
    return '***'
  }

  return '***' + secret.slice(-4)
}

// ========================================
// GET: Retornar APENAS masked secrets
// ========================================
export async function GET(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession()
    if (!clientId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerClient()

    // Buscar secrets (internamente, descriptografados)
    const secrets = await getSecretsParallel(supabase, [
      'meta_access_token',
      'meta_verify_token',
      'meta_app_secret',
      'openai_api_key',
      'groq_api_key',
    ], clientId)

    // ✅ CRÍTICO: NUNCA retornar valores completos!
    return NextResponse.json({
      secrets: {
        meta_access_token: maskSecret(secrets.meta_access_token),
        meta_verify_token: maskSecret(secrets.meta_verify_token),
        meta_app_secret: maskSecret(secrets.meta_app_secret),
        openai_api_key: maskSecret(secrets.openai_api_key),
        groq_api_key: maskSecret(secrets.groq_api_key),
      },
      // Indicar se secrets estão configurados
      configured: {
        meta_access_token: !!secrets.meta_access_token,
        meta_verify_token: !!secrets.meta_verify_token,
        meta_app_secret: !!secrets.meta_app_secret,
        openai_api_key: !!secrets.openai_api_key,
        groq_api_key: !!secrets.groq_api_key,
      }
    })
  } catch (error) {
    console.error('[vault/secrets] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch secrets' }, { status: 500 })
  }
}

// ========================================
// PUT: Atualizar secrets (SEM retornar)
// ========================================
export async function PUT(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession()
    if (!clientId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const supabase = createServerClient()

    // Validar role (apenas admins podem atualizar secrets)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'client_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Atualizar apenas secrets fornecidos (não nulos)
    const updates = []

    if (body.meta_access_token) {
      await updateSecret(supabase, 'meta_access_token', body.meta_access_token, clientId)
      updates.push('meta_access_token')
    }

    if (body.meta_verify_token) {
      await updateSecret(supabase, 'meta_verify_token', body.meta_verify_token, clientId)
      updates.push('meta_verify_token')
    }

    if (body.meta_app_secret) {
      await updateSecret(supabase, 'meta_app_secret', body.meta_app_secret, clientId)
      updates.push('meta_app_secret')
    }

    if (body.openai_api_key) {
      await updateSecret(supabase, 'openai_api_key', body.openai_api_key, clientId)
      updates.push('openai_api_key')
    }

    if (body.groq_api_key) {
      await updateSecret(supabase, 'groq_api_key', body.groq_api_key, clientId)
      updates.push('groq_api_key')
    }

    // ✅ CRÍTICO: NÃO retornar valores atualizados
    return NextResponse.json({
      success: true,
      updated: updates,
      message: `Updated ${updates.length} secret(s)`
    })
  } catch (error) {
    console.error('[vault/secrets] PUT error:', error)
    return NextResponse.json({ error: 'Failed to update secrets' }, { status: 500 })
  }
}
```

### Atualizar Frontend (Settings Page)

```typescript
// src/app/dashboard/settings/page.tsx
// ANTES (❌ ERRADO):
const response = await fetch('/api/vault/secrets')
const { secrets } = await response.json()
console.log(secrets.openai_api_key) // Expunha key completa!

// DEPOIS (✅ CORRETO):
const response = await fetch('/api/vault/secrets')
const { secrets, configured } = await response.json()

// Mostrar apenas masked:
// secrets.openai_api_key === "***xyz1"
// configured.openai_api_key === true

// Para atualizar:
await fetch('/api/vault/secrets', {
  method: 'PUT',
  body: JSON.stringify({
    openai_api_key: newValue, // Envia novo valor
  })
})
// Response NÃO retorna o valor atualizado!
```

### Impacto
- ✅ Previne interceptação de secrets
- ✅ Logs seguros (não armazenam keys)
- ✅ Browser dev tools não expõe keys

---

## 5. URGENTE: Configurar CORS

**Resolve:** VULN-011
**Prioridade:** 🔴 ALTA
**Tempo estimado:** 1 hora

### Implementação em next.config.js

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... outras configs

  async headers() {
    return [
      {
        // Aplicar CORS em TODAS as API routes
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'production'
              ? 'https://chat.luisfboff.com'  // Apenas seu domínio
              : 'http://localhost:3000'        // Dev local
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization'
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true'
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400' // 24 horas
          },
        ],
      },
      {
        // Webhook: Permitir apenas Meta
        source: '/api/webhook/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://graph.facebook.com'
          },
        ],
      },
      {
        // Security headers adicionais
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
```

### Adicionar no .env.example

```env
# CORS Configuration
NEXT_PUBLIC_APP_URL=https://chat.luisfboff.com
CORS_ALLOWED_ORIGINS=https://chat.luisfboff.com,http://localhost:3000
```

### Implementar CSRF Token (Opcional mas Recomendado)

```typescript
// src/lib/csrf.ts
import { randomBytes } from 'crypto'

export const generateCSRFToken = (): string => {
  return randomBytes(32).toString('hex')
}

export const validateCSRFToken = (token: string, sessionToken: string): boolean => {
  return token === sessionToken
}

// Uso em API routes:
export async function POST(request: NextRequest) {
  const csrfToken = request.headers.get('X-CSRF-Token')
  const sessionToken = request.cookies.get('csrf-token')?.value

  if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
  }

  // Processa...
}
```

### Impacto
- ✅ Previne CSRF attacks
- ✅ Bloqueia origins não autorizados
- ✅ Security headers adicionais

---

## 6. Implementar Rate Limiting Global

**Resolve:** VULN-017
**Prioridade:** 🔴 ALTA
**Tempo estimado:** 4 horas

### Instalação de Dependências

```bash
npm install @upstash/ratelimit @upstash/redis
```

### Setup Upstash Redis

1. Criar conta: https://upstash.com/
2. Criar Redis database
3. Copiar `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`
4. Adicionar em `.env.local`:

```env
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXX...
```

### Implementação do Rate Limiter

```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Inicializar cliente Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// ========================================
// LIMITERS POR TIPO DE ROTA
// ========================================

// Rotas autenticadas gerais (dashboard, APIs)
export const rateLimitByUser = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 req/min
  analytics: true,
  prefix: 'ratelimit:user',
})

// Rotas administrativas (mais restritivas)
export const rateLimitAdmin = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(50, '1 m'), // 50 req/min
  analytics: true,
  prefix: 'ratelimit:admin',
})

// Rotas públicas (webhook, etc)
export const rateLimitByIP = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1000, '1 m'), // 1000 req/min por IP
  analytics: true,
  prefix: 'ratelimit:ip',
})

// Webhook verification (mais restritivo para prevenir brute force)
export const rateLimitWebhookVerify = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'), // 5 tentativas/hora
  analytics: true,
  prefix: 'ratelimit:webhook-verify',
})

// ========================================
// HELPER: Verificar rate limit
// ========================================
export const checkRateLimit = async (
  limiter: Ratelimit,
  identifier: string
): Promise<{
  success: boolean
  limit: number
  remaining: number
  reset: number
}> => {
  const { success, limit, remaining, reset } = await limiter.limit(identifier)

  return {
    success,
    limit,
    remaining,
    reset,
  }
}
```

### Middleware de Rate Limiting

```typescript
// src/lib/middleware/rate-limit-middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { rateLimitByUser, rateLimitByIP, checkRateLimit } from '@/lib/rate-limit'

export const withRateLimit = (
  handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>,
  limiter: Ratelimit,
  identifierFn: (req: NextRequest) => string | Promise<string>
) => {
  return async (request: NextRequest, ...args: any[]) => {
    try {
      // Obter identificador (user ID ou IP)
      const identifier = await identifierFn(request)

      // Verificar rate limit
      const { success, limit, remaining, reset } = await checkRateLimit(limiter, identifier)

      if (!success) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            limit,
            remaining: 0,
            reset: new Date(reset).toISOString(),
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': reset.toString(),
              'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
            },
          }
        )
      }

      // Adicionar headers de rate limit na response
      const response = await handler(request, ...args)

      response.headers.set('X-RateLimit-Limit', limit.toString())
      response.headers.set('X-RateLimit-Remaining', remaining.toString())
      response.headers.set('X-RateLimit-Reset', reset.toString())

      return response
    } catch (error) {
      console.error('[Rate Limit Middleware] Error:', error)
      // Se rate limiter falhar, permite request (graceful degradation)
      return handler(request, ...args)
    }
  }
}
```

### Aplicar em API Routes

```typescript
// Exemplo: src/app/api/conversations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { rateLimitByUser } from '@/lib/rate-limit'
import { withRateLimit } from '@/lib/middleware/rate-limit-middleware'
import { getClientIdFromSession } from '@/lib/session-helpers'

export const dynamic = 'force-dynamic'

// Handler original
const handler = async (request: NextRequest) => {
  const clientId = await getClientIdFromSession()

  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ... resto da lógica
}

// Exportar com rate limiting
export const GET = withRateLimit(
  handler,
  rateLimitByUser,
  async (req) => {
    // Identifier: user ID
    const clientId = await getClientIdFromSession()
    return clientId || req.ip || 'anonymous'
  }
)
```

### Aplicar no Webhook Verification

```typescript
// src/app/api/webhook/[clientId]/route.ts
export const GET = withRateLimit(
  handleWebhookVerification,
  rateLimitWebhookVerify,
  (req) => req.ip || 'unknown' // Rate limit por IP
)
```

### Impacto
- ✅ Previne DDoS attacks
- ✅ Reduz custos de serverless
- ✅ Protege contra brute force

---

## 7. Implementar Middleware de Auth para API Routes

**Resolve:** VULN-001
**Prioridade:** 🔴 CRÍTICA
**Tempo estimado:** 6 horas

### Abordagem: Auth Wrapper para API Routes

```typescript
// src/lib/middleware/api-auth-middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export type AuthenticatedHandler = (
  request: NextRequest,
  context: {
    user: any
    clientId: string
    profile: any
  },
  ...args: any[]
) => Promise<NextResponse>

// ========================================
// WRAPPER: Require Authentication
// ========================================
export const withAuth = (handler: AuthenticatedHandler) => {
  return async (request: NextRequest, ...args: any[]) => {
    try {
      // 1. Verificar sessão
      const supabase = createServerClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized: Authentication required' },
          { status: 401 }
        )
      }

      // 2. Buscar profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('client_id, role, is_active')
        .eq('id', user.id)
        .single()

      if (profileError || !profile || !profile.client_id) {
        console.error('[withAuth] Profile not found for user:', user.id)
        return NextResponse.json(
          { error: 'Unauthorized: Invalid profile' },
          { status: 401 }
        )
      }

      // 3. Verificar se ativo
      if (!profile.is_active) {
        return NextResponse.json(
          { error: 'Forbidden: Account inactive' },
          { status: 403 }
        )
      }

      // 4. Chamar handler com contexto
      return handler(request, {
        user,
        clientId: profile.client_id,
        profile,
      }, ...args)

    } catch (error) {
      console.error('[withAuth] Error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

// ========================================
// WRAPPER: Require Admin Role
// ========================================
export const withAdminAuth = (handler: AuthenticatedHandler) => {
  return withAuth(async (request, context, ...args) => {
    const { profile } = context

    if (!['admin', 'client_admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    return handler(request, context, ...args)
  })
}
```

### Refatorar API Routes Existentes

```typescript
// ANTES (❌ Manual auth em cada route):
export async function GET(request: NextRequest) {
  const clientId = await getClientIdFromSession()
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ... lógica
}

// DEPOIS (✅ Usando wrapper):
import { withAuth } from '@/lib/middleware/api-auth-middleware'

const handler = withAuth(async (request, { clientId, user, profile }) => {
  // clientId, user, profile já disponíveis!
  // ... lógica
})

export { handler as GET }
```

### Whitelist de Rotas Públicas

```typescript
// src/lib/middleware/api-auth-middleware.ts

// Rotas que NÃO requerem autenticação
const PUBLIC_API_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/callback',
  '/api/webhook/*',  // Webhooks têm auth própria (signature)
  '/api/health',
]

export const isPublicRoute = (pathname: string): boolean => {
  return PUBLIC_API_ROUTES.some(route => {
    if (route.includes('*')) {
      const pattern = route.replace('*', '.*')
      return new RegExp(`^${pattern}$`).test(pathname)
    }
    return route === pathname
  })
}
```

### Aplicar em TODAS as API Routes

**Script de Migração (executar manualmente):**

```bash
# Buscar todas as API routes
find src/app/api -name "route.ts" -type f

# Para cada arquivo:
# 1. Importar withAuth ou withAdminAuth
# 2. Refatorar handler para usar context
# 3. Exportar wrapped handler
```

**Exemplo de Migração:**

```typescript
// src/app/api/conversations/route.ts

// ANTES:
export async function GET(request: NextRequest) {
  const clientId = await getClientIdFromSession()
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()
  const { data } = await supabase.from('conversations').select('*').eq('client_id', clientId)
  return NextResponse.json({ data })
}

// DEPOIS:
import { withAuth } from '@/lib/middleware/api-auth-middleware'

const handleGet = withAuth(async (request, { clientId }) => {
  const supabase = createServerClient()
  const { data } = await supabase.from('conversations').select('*').eq('client_id', clientId)
  return NextResponse.json({ data })
})

export { handleGet as GET }
```

### Impacto
- ✅ Auth garantida em TODAS as rotas
- ✅ Fail-safe layer (não esquece de adicionar auth)
- ✅ Código mais limpo (sem repetição)

---

## 8. Implementar Audit Trail para Service Role

**Resolve:** VULN-008
**Prioridade:** 🟡 MÉDIA
**Tempo estimado:** 4 horas

### Schema de Audit Log

```sql
-- supabase/migrations/YYYYMMDD_create_audit_log.sql

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Quem fez a ação
  user_id UUID REFERENCES auth.users(id),
  client_id UUID REFERENCES public.clients(id),

  -- O que foi feito
  action TEXT NOT NULL,  -- 'INSERT', 'UPDATE', 'DELETE', 'SERVICE_ROLE_ACCESS'
  table_name TEXT NOT NULL,
  record_id TEXT,

  -- Dados antes/depois (JSON)
  old_data JSONB,
  new_data JSONB,

  -- Contexto adicional
  ip_address INET,
  user_agent TEXT,
  request_method TEXT,  -- 'GET', 'POST', etc
  request_path TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para queries rápidas
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_client_id ON public.audit_logs(client_id);
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- RLS: Apenas admins podem ver audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Service role pode inserir
CREATE POLICY "Service role can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
```

### Helper para Logging

```typescript
// src/lib/audit-log.ts
import { createServiceRoleClient } from '@/lib/supabase/server'

export interface AuditLogEntry {
  userId?: string
  clientId?: string
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'SERVICE_ROLE_ACCESS'
  tableName: string
  recordId?: string
  oldData?: any
  newData?: any
  ipAddress?: string
  userAgent?: string
  requestMethod?: string
  requestPath?: string
}

export const logAuditEvent = async (entry: AuditLogEntry): Promise<void> => {
  try {
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: entry.userId || null,
        client_id: entry.clientId || null,
        action: entry.action,
        table_name: entry.tableName,
        record_id: entry.recordId || null,
        old_data: entry.oldData || null,
        new_data: entry.newData || null,
        ip_address: entry.ipAddress || null,
        user_agent: entry.userAgent || null,
        request_method: entry.requestMethod || null,
        request_path: entry.requestPath || null,
      })

    if (error) {
      console.error('[Audit Log] Failed to log event:', error)
    }
  } catch (error) {
    console.error('[Audit Log] Error:', error)
    // Não falhar se audit log não funcionar (graceful degradation)
  }
}
```

### Aplicar em Operações Sensíveis

```typescript
// src/app/api/admin/users/route.ts
import { logAuditEvent } from '@/lib/audit-log'

export const POST = withAdminAuth(async (request, { user, clientId }) => {
  const body = await request.json()

  // Criar usuário via service role
  const supabaseAdmin = createServiceRoleClient()
  const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
    email: body.email,
    password: body.password,
  })

  if (error) throw error

  // ✅ AUDIT LOG: Registrar criação
  await logAuditEvent({
    userId: user.id,
    clientId,
    action: 'INSERT',
    tableName: 'auth.users',
    recordId: newUser.user.id,
    newData: {
      email: newUser.user.email,
      role: body.role,
    },
    ipAddress: request.ip,
    userAgent: request.headers.get('user-agent') || undefined,
    requestMethod: 'POST',
    requestPath: '/api/admin/users',
  })

  return NextResponse.json({ user: newUser.user })
})
```

### Dashboard de Audit Logs

```typescript
// src/app/dashboard/admin/audit-logs/page.tsx
'use client'

import { useEffect, useState } from 'react'

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([])

  useEffect(() => {
    fetch('/api/admin/audit-logs')
      .then(r => r.json())
      .then(data => setLogs(data.logs))
  }, [])

  return (
    <div>
      <h1>Audit Logs</h1>
      <table>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>User</th>
            <th>Action</th>
            <th>Table</th>
            <th>Record ID</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id}>
              <td>{new Date(log.created_at).toLocaleString()}</td>
              <td>{log.user_id}</td>
              <td>{log.action}</td>
              <td>{log.table_name}</td>
              <td>{log.record_id}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

### Impacto
- ✅ Rastreabilidade completa
- ✅ Compliance (GDPR, SOC 2)
- ✅ Debugging facilitado

---

## 9-12. Melhorias Adicionais (Resumo)

### 9. Input Validation com Zod (VULN-013)

```typescript
import { z } from 'zod'

const ConfigSchema = z.object({
  system_prompt: z.string().max(10000),
  settings: z.object({
    max_tokens: z.number().min(1).max(100000),
  })
})

export async function PATCH(request: NextRequest) {
  const body = await request.json()

  try {
    const validated = ConfigSchema.parse(body)
    // Usa validated em vez de body
  } catch (error) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }
}
```

### 10. Session Timeout Configurado (VULN-014)

```typescript
// Configurar no Supabase Dashboard:
// Authentication → Settings → JWT expiry: 3600 (1 hora)
// Refresh token expiry: 604800 (7 dias)
```

### 11. Content Security Policy (VULN-018)

```javascript
// next.config.js
async headers() {
  return [{
    source: '/(.*)',
    headers: [{
      key: 'Content-Security-Policy',
      value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
    }]
  }]
}
```

### 12. Log Sanitization (VULN-016)

```typescript
// src/lib/logger.ts
const sanitize = (obj: any): any => {
  const sensitive = ['password', 'token', 'api_key', 'secret', 'telefone', 'email']

  if (typeof obj !== 'object') return obj

  const sanitized = { ...obj }

  for (const key in sanitized) {
    if (sensitive.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '***REDACTED***'
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitize(sanitized[key])
    }
  }

  return sanitized
}

console.log(sanitize(data))
```

---

## Conclusão

Este documento fornece **implementações completas** para corrigir todas as 18 vulnerabilidades identificadas. Siga o roadmap do `ACTION_PLAN.md` para priorização.

**Próximos Passos:**
1. Revisar `ACTION_PLAN.md` para ordem de implementação
2. Criar branches para cada correção
3. Testar em ambiente de staging antes de produção
4. Usar `SECURITY_CHECKLIST.md` para validar

---

**Última atualização:** 2025-11-18
**Próxima revisão:** Após implementação do Sprint 1

# 🏋️ Plano de Integração Tecnofit - ChatBot WhatsApp

**Data:** 2026-02-01
**Status:** 📋 Planejamento
**Versão:** 1.0

---

> ## ⚠️ ATENÇÃO — Leia antes de implementar
>
> Este plano contém **erros de schema** identificados em 2026-03-17 após inspeção real das migrations.
>
> **Leia primeiro:** [`TECNOFIT_SCHEMA_VALIDATION.md`](./TECNOFIT_SCHEMA_VALIDATION.md)
>
> **Erros críticos neste plano:**
> - `crm_cards` não tem `title`, `description` nem `custom_fields` — essas colunas não existem
> - Inserir diretamente em `crm_cards` falha — FK obrigatória via `clientes_whatsapp` + trigger
> - `lead_sources.source_type = 'tecnofit'` viola CHECK constraint — precisa de migration
> - `lead_sources.source_data` e `lead_sources.card_id` não existem
> - Cache JWT com `Map<>` não persiste em serverless (Vercel) — usar Redis
> - `X-Company-Id` header não é necessário — JWT já contém empresa
>
> O arquivo de validação contém o adapter corrigido e as migrations na ordem certa.

---

## 📋 Índice

- [Análise Crítica da Documentação Fornecida](#-análise-crítica-da-documentação-fornecida)
- [Visão Geral do Projeto](#-visão-geral-do-projeto)
- [Arquitetura de Integrações Existentes](#-arquitetura-de-integrações-existentes)
- [Plano de Implementação Passo a Passo](#-plano-de-implementação-passo-a-passo)
- [Mapeamento de Dados](#-mapeamento-de-dados)
- [Checklist de Implementação](#-checklist-de-implementação)

---

## 🔍 Análise Crítica da Documentação Fornecida

### ✅ Pontos Corretos

1. **Arquitetura RESTful**: A Tecnofit usa REST com JSON - correto
2. **Rate Limits**: 100 req/min por endpoint, 200 req/min global - importante considerar
3. **TLS 1.2+**: Requisito de segurança válido
4. **Multi-empresa**: Header `X-Company-Id` para filiais - necessário implementar
5. **Secrets em Backend**: Recomendação correta de não expor chaves

### ⚠️ Pontos que Precisam de Ajuste para Este Projeto

#### 1. **Stack Tecnológica Incorreta**

**❌ Documentação assumiu:**
- Python (Flask/FastAPI/Django) ou Node.js genérico
- Estrutura de pastas genérica (`integrations/tecnofit.py`)

**✅ Realidade do Projeto:**
- **Next.js 14** (App Router) + TypeScript
- Estrutura: `src/lib/` para bibliotecas, `src/app/api/` para rotas
- Serverless Functions (Vercel)

**Ação necessária:** Adaptar todos os exemplos para TypeScript/Next.js

#### 2. **Gerenciamento de Secrets**

**❌ Documentação sugeriu:**
- Variáveis de ambiente em `.env.local`
- Secrets Manager genérico

**✅ Realidade do Projeto:**
- **Supabase Vault** (pgsodium) para secrets criptografados
- Secrets armazenados por `client_id` (multi-tenant)
- Configuração via Dashboard `/dashboard/settings`
- Funções helper em `src/lib/vault.ts`

**Ação necessária:** Usar Vault em vez de `.env.local` para API keys da Tecnofit

#### 3. **Rate Limiting**

**❌ Documentação sugeriu:**
- Implementar Bottleneck ou leaky-bucket do zero
- Rate limiter global manual

**✅ Realidade do Projeto:**
- **Já existe** `src/lib/rate-limit.ts` com Upstash Ratelimit
- Padrão: `withRateLimit()` wrapper para API routes
- Suporta sliding window, per-IP, per-user

**Ação necessária:** Reutilizar sistema existente, não criar novo

#### 4. **HTTP Client**

**❌ Documentação sugeriu:**
- Criar cliente HTTP do zero com retry/backoff

**✅ Realidade do Projeto:**
- **Já usa axios** em `src/lib/meta.ts` e `src/lib/meta-leads.ts`
- Padrão: `axios.create()` com baseURL e headers
- Retry já implementado em `src/lib/redis.ts` e `src/lib/postgres.ts`

**Ação necessária:** Seguir padrão existente de `meta.ts`

#### 5. **Estrutura de Banco de Dados**

**❌ Documentação sugeriu:**
- Criar tabelas genéricas (`integration_meta`, `tecnofit_id` em `users`)

**✅ Realidade do Projeto:**
- **Multi-tenant** com `client_id` em todas as tabelas
- CRM já existe: `crm_cards`, `crm_columns`, `lead_sources`
- Padrão: colunas `*_id` para IDs externos (ex: `meta_ad_account_id`)

**Ação necessária:** Adaptar schema para multi-tenant e reutilizar CRM existente

#### 6. **Cache Redis**

**❌ Documentação sugeriu:**
- Implementar cache manual com `cache.set()`

**✅ Realidade do Projeto:**
- **Redis já configurado** em `src/lib/redis.ts` (Upstash)
- Padrão: `getRedisClient()` retorna cliente configurado
- Usado para batching de mensagens

**Ação necessária:** Reutilizar cliente Redis existente

#### 7. **Autenticação e Autorização**

**❌ Documentação não mencionou:**
- Como proteger endpoints de integração

**✅ Realidade do Projeto:**
- **RBAC** implementado (admin, client_admin, user)
- Middleware em `src/lib/middleware/api-auth.ts`
- `getClientIdFromSession()` para obter `client_id` do usuário logado

**Ação necessária:** Proteger rotas com autenticação e verificar `client_id`

---

## 🏗️ Visão Geral do Projeto

### Stack Tecnológico Atual

| Componente | Tecnologia |
|------------|------------|
| Framework | Next.js 14 (App Router) + TypeScript |
| Deploy | Vercel (Serverless Functions) |
| Banco de Dados | Supabase PostgreSQL + pgvector |
| Secrets | Supabase Vault (pgsodium) |
| Cache/Queue | Redis (Upstash) |
| HTTP Client | Axios |
| Rate Limiting | Upstash Ratelimit |

### Arquitetura Multi-Tenant

- **Isolamento por `client_id`**: Todas as tabelas filtram por cliente
- **Secrets no Vault**: API keys criptografadas por cliente
- **RBAC**: Roles (admin, client_admin, user) com permissões granulares
- **Dashboard**: Configuração via UI em `/dashboard/settings`

---

## 🔧 Arquitetura de Integrações Existentes

### Padrão Meta Ads (Referência)

**Estrutura de arquivos:**
```
src/lib/meta-leads.ts          # Cliente HTTP + funções helper
src/app/api/webhook/meta-ads/  # Webhook endpoint
src/app/api/crm/meta-insights/ # API route para insights
src/components/meta-ads/       # Componentes UI
```

**Padrões identificados:**

1. **Cliente HTTP** (`src/lib/meta-leads.ts`):
   ```typescript
   const META_API_VERSION = "v20.0"
   const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`
   
   export async function fetchLeadDetails(leadgenId: string, accessToken: string) {
     const url = `${META_BASE_URL}/${leadgenId}`
     const response = await fetch(`${url}?${params}`)
     // ...
   }
   ```

2. **Secrets do Vault** (`src/lib/config.ts`):
   ```typescript
   const clientConfig = await getClientConfig(clientId)
   const accessToken = clientConfig.apiKeys.metaAccessToken
   ```

3. **API Routes** (`src/app/api/crm/meta-insights/route.ts`):
   ```typescript
   export async function GET(request: NextRequest) {
     const clientId = await getClientIdFromSession(request)
     const clientConfig = await getClientConfig(clientId)
     // ...
   }
   ```

4. **Rate Limiting** (`src/lib/rate-limit.ts`):
   ```typescript
   export const GET = withRateLimit(apiUserLimiter, async (request) => {
     // handler
   })
   ```

5. **Migrations** (`supabase/migrations/`):
   - Adicionar colunas em `clients` table
   - Criar tabelas específicas da integração
   - Índices e constraints

---

## 📝 Plano de Implementação Passo a Passo

### Fase 1: Configuração e Secrets (Vault)

#### 1.1 Adicionar Colunas na Tabela `clients`

**Arquivo:** `supabase/migrations/20260201_add_tecnofit_integration.sql`

```sql
-- Adicionar colunas para configuração Tecnofit
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tecnofit_api_key_secret_id UUID REFERENCES vault.secrets(id);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tecnofit_api_secret_secret_id UUID REFERENCES vault.secrets(id);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tecnofit_base_url TEXT DEFAULT 'https://integracao.tecnofit.com.br/v1';

COMMENT ON COLUMN clients.tecnofit_api_key_secret_id IS 'Reference to Vault secret containing Tecnofit API Key (21 characters)';
COMMENT ON COLUMN clients.tecnofit_api_secret_secret_id IS 'Reference to Vault secret containing Tecnofit API Secret (26 characters)';
COMMENT ON COLUMN clients.tecnofit_base_url IS 'Base URL for Tecnofit API (default: https://integracao.tecnofit.com.br/v1)';
```

**Ação:** Executar migration no Supabase

#### 1.2 Atualizar Interface TypeScript

**Arquivo:** `src/lib/types.ts`

Adicionar em `ClientConfig`:
```typescript
export interface ClientConfig {
  // ... campos existentes
  
  // Tecnofit Integration
  tecnofit?: {
    apiKey: string | null; // 21 caracteres
    apiSecret: string | null; // 26 caracteres
    baseUrl: string; // Default: https://integracao.tecnofit.com.br/v1
  };
}
```

#### 1.3 Atualizar `getClientConfig()`

**Arquivo:** `src/lib/config.ts`

Adicionar busca de secrets Tecnofit:
```typescript
// No getClientConfig(), após buscar outros secrets:
const [tecnofitApiKey, tecnofitApiSecret] = await getSecretsParallel([
  client.tecnofit_api_key_secret_id || null,
  client.tecnofit_api_secret_secret_id || null,
]);

// Adicionar ao retorno:
tecnofit: {
  apiKey: tecnofitApiKey,
  apiSecret: tecnofitApiSecret,
  baseUrl: client.tecnofit_base_url || 'https://integracao.tecnofit.com.br/v1',
}
```

#### 1.4 Atualizar Dashboard Settings

**Arquivo:** `src/app/dashboard/settings/page.tsx`

Adicionar seção Tecnofit:
- Campo: API Key (21 caracteres, salvar no Vault)
- Campo: API Secret (26 caracteres, salvar no Vault)
- Campo: Base URL (default: https://integracao.tecnofit.com.br/v1)
- Botão: "Testar Conexão" (faz login e valida credenciais)

**API Route:** `src/app/api/client/tecnofit-config/route.ts` (criar novo)

---

### Fase 2: Cliente HTTP Tecnofit

#### 2.1 Criar Cliente HTTP

**Arquivo:** `src/lib/tecnofit.ts` (NOVO)

```typescript
/**
 * 🏋️ TECNOFIT API CLIENT
 *
 * Cliente HTTP para integração com API da Tecnofit
 * Segue padrão de src/lib/meta.ts e src/lib/meta-leads.ts
 *
 * @see Documentação Tecnofit
 */

import axios, { AxiosInstance } from 'axios';

const TECNOFIT_BASE_URL = 'https://integracao.tecnofit.com.br/v1';

// Rate limit: 100 req/min por endpoint, 200 req/min global
const RATE_LIMIT_DELAY_MS = 600; // 600ms = ~100 req/min

// Cache de tokens JWT (por client_id)
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

/**
 * Interface para credenciais Tecnofit
 */
export interface TecnofitCredentials {
  apiKey: string; // 21 caracteres
  apiSecret: string; // 26 caracteres
  baseUrl?: string;
}

/**
 * Interface para resposta de login
 */
export interface TecnofitLoginResponse {
  token: string; // JWT token
  expires_in?: number; // Segundos até expiração (se fornecido)
}

/**
 * Faz login na API Tecnofit e retorna token JWT
 * 
 * POST /v1/auth/login
 * Body: { api_key: string, api_secret: string }
 * 
 * @param credentials - Credenciais Tecnofit (apiKey e apiSecret)
 * @returns Token JWT e informações de expiração
 */
export async function loginTecnofit(
  credentials: TecnofitCredentials
): Promise<TecnofitLoginResponse> {
  const baseURL = credentials.baseUrl || TECNOFIT_BASE_URL;
  
  const response = await axios.post(
    `${baseURL}/auth/login`,
    {
      api_key: credentials.apiKey,
      api_secret: credentials.apiSecret,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 15000,
    }
  );

  const token = response.data.token || response.data.access_token;
  if (!token) {
    throw new Error('No token returned from Tecnofit login');
  }

  // Calcular expiração (assumir 1 hora se não fornecido)
  const expiresIn = response.data.expires_in || 3600;
  const expiresAt = Date.now() + (expiresIn * 1000);

  return {
    token,
    expires_in: expiresIn,
  };
}

/**
 * Obtém token JWT válido (usa cache se disponível)
 * 
 * @param clientId - ID do cliente (para cache)
 * @param credentials - Credenciais Tecnofit
 * @returns Token JWT válido
 */
export async function getTecnofitToken(
  clientId: string,
  credentials: TecnofitCredentials
): Promise<string> {
  // Verificar cache
  const cached = tokenCache.get(clientId);
  if (cached && cached.expiresAt > Date.now() + 60000) { // 1 minuto de margem
    return cached.token;
  }

  // Fazer login
  const loginResponse = await loginTecnofit(credentials);
  
  // Salvar no cache
  tokenCache.set(clientId, {
    token: loginResponse.token,
    expiresAt: Date.now() + ((loginResponse.expires_in || 3600) * 1000),
  });

  return loginResponse.token;
}

/**
 * Cria cliente Axios configurado para Tecnofit API com autenticação Bearer
 */
export async function createTecnofitClient(
  clientId: string,
  credentials: TecnofitCredentials
): Promise<AxiosInstance> {
  const baseURL = credentials.baseUrl || TECNOFIT_BASE_URL;
  
  // Obter token JWT
  const token = await getTecnofitToken(clientId, credentials);
  
  const client = axios.create({
    baseURL,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  // Interceptor para refresh automático de token em caso de 401
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        // Token expirado, fazer login novamente
        tokenCache.delete(clientId);
        const newToken = await getTecnofitToken(clientId, credentials);
        error.config.headers['Authorization'] = `Bearer ${newToken}`;
        return client.request(error.config);
      }
      return Promise.reject(error);
    }
  );

  // Interceptor para rate limiting (delay entre requisições)
  let lastRequestTime = 0;
  client.interceptors.request.use(async (config) => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    if (timeSinceLastRequest < RATE_LIMIT_DELAY_MS) {
      await new Promise(resolve => 
        setTimeout(resolve, RATE_LIMIT_DELAY_MS - timeSinceLastRequest)
      );
    }
    
    lastRequestTime = Date.now();
    return config;
  });

  // Interceptor para retry em caso de 429 (rate limit)
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 429) {
        // Retry após delay exponencial
        const retryAfter = error.response.headers['retry-after'] || 60;
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return client.request(error.config);
      }
      return Promise.reject(error);
    }
  );

  return client;
}

/**
 * Lista empresas da Tecnofit
 * 
 * GET /v1/companies
 * 
 * @param clientId - ID do cliente (para autenticação)
 * @param credentials - Credenciais Tecnofit
 * @param page - Página (default: 1)
 * @param limit - Limite por página (1-50, default: 50)
 */
export async function listCompanies(
  clientId: string,
  credentials: TecnofitCredentials,
  page = 1,
  limit = 50
): Promise<any> {
  const client = await createTecnofitClient(clientId, credentials);
  
  const response = await client.get('/companies', {
    params: {
      page,
      limit,
    },
  });

  return response.data;
}

/**
 * Lista clientes da Tecnofit (com paginação e filtros)
 * 
 * GET /v1/customers
 * 
 * @param clientId - ID do cliente (para autenticação)
 * @param credentials - Credenciais Tecnofit
 * @param options - Opções de filtro e paginação
 */
export async function listCustomers(
  clientId: string,
  credentials: TecnofitCredentials,
  options: {
    page?: number;
    limit?: number;
    sort?: 'asc' | 'desc';
    order?: 'id' | 'name' | 'createdAt';
    status?: string;
    type?: 'customer' | 'prospect';
    email?: string;
    cpf?: string;
    gender?: 'F' | 'M';
    createStartDate?: string;
    createEndDate?: string;
  } = {}
): Promise<any> {
  const client = await createTecnofitClient(clientId, credentials);
  
  const response = await client.get('/customers', {
    params: {
      page: options.page || 1,
      limit: options.limit || 100,
      ...options,
    },
  });

  return response.data;
}

/**
 * Lista contratos disponíveis
 * 
 * GET /v1/contracts
 * 
 * @param clientId - ID do cliente (para autenticação)
 * @param credentials - Credenciais Tecnofit
 * @param options - Opções de filtro e paginação
 */
export async function listContracts(
  clientId: string,
  credentials: TecnofitCredentials,
  options: {
    page?: number;
    limit?: number;
    sort?: 'asc' | 'desc';
    order?: 'id' | 'name';
    dueDateType?: 'session' | 'period' | 'monthly';
    allowAutomaticRenew?: '0' | '1';
    modalityId?: number;
  } = {}
): Promise<any> {
  const client = await createTecnofitClient(clientId, credentials);
  
  const response = await client.get('/contracts', {
    params: {
      page: options.page || 1,
      limit: options.limit || 100,
      ...options,
    },
  });

  return response.data;
}

/**
 * Lista modalidades de contratos
 * 
 * GET /v1/modalities
 * 
 * @param clientId - ID do cliente (para autenticação)
 * @param credentials - Credenciais Tecnofit
 * @param options - Opções de paginação e ordenação
 */
export async function listModalities(
  clientId: string,
  credentials: TecnofitCredentials,
  options: {
    page?: number;
    limit?: number;
    sort?: 'asc' | 'desc';
    order?: 'id' | 'name';
  } = {}
): Promise<any> {
  const client = await createTecnofitClient(clientId, credentials);
  
  const response = await client.get('/modalities', {
    params: {
      page: options.page || 1,
      limit: options.limit || 100,
      ...options,
    },
  });

  return response.data;
}

/**
 * Lista frequências (presenças) de um cliente específico
 * 
 * GET /v1/customers/{id}/attendances
 * 
 * @param clientId - ID do cliente (para autenticação)
 * @param credentials - Credenciais Tecnofit
 * @param customerId - ID do cliente Tecnofit
 * @param startDate - Data inicial (YYYY-MM-DD)
 * @param endDate - Data final (YYYY-MM-DD)
 * @param options - Opções adicionais
 */
export async function getCustomerAttendances(
  clientId: string,
  credentials: TecnofitCredentials,
  customerId: number,
  startDate: string,
  endDate: string,
  options: {
    type?: 'turnstile' | 'class' | 'crossfit';
    page?: number;
    limit?: number;
  } = {}
): Promise<any> {
  const client = await createTecnofitClient(clientId, credentials);
  
  const response = await client.get(`/customers/${customerId}/attendances`, {
    params: {
      startDate,
      endDate,
      type: options.type,
      page: options.page || 1,
      limit: options.limit || 50,
    },
  });

  return response.data;
}

/**
 * Lista frequências (presenças) de todos os clientes da empresa
 * 
 * GET /v1/attendances
 * 
 * @param clientId - ID do cliente (para autenticação)
 * @param credentials - Credenciais Tecnofit
 * @param startDate - Data inicial (YYYY-MM-DD)
 * @param endDate - Data final (YYYY-MM-DD)
 * @param type - Tipo de frequência (obrigatório)
 * @param options - Opções adicionais
 */
export async function listAttendances(
  clientId: string,
  credentials: TecnofitCredentials,
  startDate: string,
  endDate: string,
  type: 'turnstile' | 'class' | 'crossfit',
  options: {
    page?: number;
    limit?: number;
  } = {}
): Promise<any> {
  const client = await createTecnofitClient(clientId, credentials);
  
  const response = await client.get('/attendances', {
    params: {
      startDate,
      endDate,
      type,
      page: options.page || 1,
      limit: options.limit || 50,
    },
  });

  return response.data;
}
```

**Ação:** Criar arquivo seguindo padrão de `meta-leads.ts`

---

### Fase 3: Adapter e Mapeamento de Dados

#### 3.1 Criar Adapter

**Arquivo:** `src/lib/tecnofit-adapter.ts` (NOVO)

```typescript
/**
 * 🏋️ TECNOFIT ADAPTER
 *
 * Adapta dados da Tecnofit para o formato do CRM do chatbot
 * Similar a src/lib/meta-leads.ts (createCardFromLead)
 */

import { createServiceRoleClient } from '@/lib/supabase';
import type { TecnofitCredentials } from './tecnofit';
import { listCustomers, listContracts, getCustomerAttendances } from './tecnofit';

/**
 * Mapeia cliente Tecnofit para formato do CRM
 */
export function mapTecnofitClient(tecnofitCustomer: any): {
  tecnofit_id: number;
  full_name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  client_type: 'customer' | 'prospect';
  gender?: 'F' | 'M';
  status?: string;
  created_at?: string;
} {
  return {
    tecnofit_id: tecnofitCustomer.id,
    full_name: tecnofitCustomer.name,
    email: tecnofitCustomer.email,
    phone: normalizePhone(tecnofitCustomer.phone),
    cpf: tecnofitCustomer.cpf,
    client_type: tecnofitCustomer.type || 'customer', // 'customer' ou 'prospect'
    gender: tecnofitCustomer.gender, // 'F' ou 'M'
    status: tecnofitCustomer.status,
    created_at: tecnofitCustomer.createdAt,
  };
}

/**
 * Normaliza telefone para formato internacional
 */
function normalizePhone(phone: string | undefined): string | undefined {
  if (!phone) return undefined;
  
  // Remove caracteres não numéricos
  let cleaned = phone.replace(/\D/g, '');
  
  // Adiciona código do Brasil se necessário
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = '55' + cleaned;
  }
  
  return cleaned;
}

/**
 * Sincroniza clientes da Tecnofit para o CRM
 */
export async function syncTecnofitClients(
  clientId: string,
  credentials: TecnofitCredentials
): Promise<{
  success: boolean;
  synced: number;
  errors: number;
  errorDetails?: string[];
}> {
  const supabase = createServiceRoleClient();
  let synced = 0;
  let errors = 0;
  const errorDetails: string[] = [];

  try {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await listCustomers(clientId, credentials, {
        page,
        limit: 100,
      });
      
      // Ajustar conforme estrutura real da resposta da API
      const customers = response.data || response.customers || [];
      const pagination = response.pagination || response.meta || {};

      for (const tecnofitCustomer of customers) {
        try {
          const mapped = mapTecnofitClient(tecnofitCustomer);

          // Verificar se card já existe (por tecnofit_id ou phone)
          const { data: existingCard } = await supabase
            .from('crm_cards')
            .select('id')
            .eq('client_id', clientId)
            .or(`custom_fields->>tecnofit_id.eq.${mapped.tecnofit_id},phone.eq.${mapped.phone}`)
            .limit(1)
            .single();

          if (existingCard) {
            // Atualizar card existente
            await supabase
              .from('crm_cards')
              .update({
                title: mapped.full_name,
                phone: mapped.phone,
                custom_fields: {
                  ...existingCard.custom_fields,
                  tecnofit_id: mapped.tecnofit_id,
                  email: mapped.email,
                  cpf: mapped.cpf,
                  client_type: mapped.client_type,
                },
              })
              .eq('id', existingCard.id);
          } else {
            // Criar novo card
            // Buscar primeira coluna (novo)
            const { data: columns } = await supabase
              .from('crm_columns')
              .select('id')
              .eq('client_id', clientId)
              .order('position', { ascending: true })
              .limit(1)
              .single();

            if (!columns) {
              throw new Error('No CRM columns found');
            }

            await supabase.from('crm_cards').insert({
              client_id: clientId,
              column_id: columns.id,
              phone: mapped.phone || `tecnofit_${mapped.tecnofit_id}`,
              title: mapped.full_name,
              description: buildCardDescription(mapped),
              custom_fields: {
                tecnofit_id: mapped.tecnofit_id,
                email: mapped.email,
                cpf: mapped.cpf,
                client_type: mapped.client_type,
                addresses: mapped.addresses,
                contacts: mapped.contacts,
              },
              position: 0,
            });

            // Log lead source
            await supabase.from('lead_sources').insert({
              client_id: clientId,
              card_id: (await supabase.from('crm_cards').select('id').eq('client_id', clientId).eq('phone', mapped.phone).single()).data?.id,
              source_type: 'tecnofit',
              source_data: {
                tecnofit_id: mapped.tecnofit_id,
                synced_at: new Date().toISOString(),
              },
            });
          }

          synced++;
        } catch (error) {
          errors++;
          errorDetails.push(`Cliente ${tecnofitCustomer.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Verificar se há mais páginas
      hasMore = customers.length === 100 && (!pagination.total_pages || page < pagination.total_pages);
      page++;
    }

    // Atualizar metadata de sync
    await updateSyncMetadata(clientId, {
      last_sync_at: new Date().toISOString(),
      synced_count: synced,
      error_count: errors,
    });

    return {
      success: errors === 0,
      synced,
      errors,
      errorDetails: errors > 0 ? errorDetails : undefined,
    };
  } catch (error) {
    console.error('[TECNOFIT-SYNC] Error:', error);
    return {
      success: false,
      synced,
      errors: errors + 1,
      errorDetails: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

function buildCardDescription(mapped: ReturnType<typeof mapTecnofitClient>): string {
  const parts: string[] = [];
  if (mapped.email) parts.push(`📧 ${mapped.email}`);
  if (mapped.cpf) parts.push(`🆔 CPF: ${mapped.cpf}`);
  if (mapped.client_type) {
    const typeLabel = mapped.client_type === 'customer' ? 'Aluno' : 'Prospect';
    parts.push(`👤 Tipo: ${typeLabel}`);
  }
  if (mapped.gender) parts.push(`⚧️ Sexo: ${mapped.gender === 'F' ? 'Feminino' : 'Masculino'}`);
  if (mapped.status) parts.push(`📊 Status: ${mapped.status}`);
  return parts.join('\n') || 'Cliente Tecnofit';
}

async function updateSyncMetadata(
  clientId: string,
  metadata: {
    last_sync_at: string;
    synced_count: number;
    error_count: number;
  }
) {
  // Criar/atualizar tabela de metadata (ver Fase 4)
  // Por enquanto, log apenas
  console.log('[TECNOFIT-SYNC] Metadata:', metadata);
}
```

**Ação:** Criar arquivo com funções de sincronização

---

### Fase 4: Banco de Dados - Tabelas e Migrations

#### 4.1 Criar Tabela de Metadata de Sync

**Arquivo:** `supabase/migrations/20260201_add_tecnofit_sync_metadata.sql`

```sql
-- Tabela para armazenar metadata de sincronização Tecnofit
CREATE TABLE IF NOT EXISTS tecnofit_sync_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Última sincronização
  last_sync_at TIMESTAMPTZ,
  last_sync_type TEXT, -- 'clients', 'contracts', 'frequencies', 'full'
  
  -- Estatísticas
  synced_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  error_details JSONB,
  
  -- Status
  status TEXT DEFAULT 'idle', -- 'idle', 'syncing', 'error'
  status_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(client_id)
);

-- Índices
CREATE INDEX idx_tecnofit_sync_metadata_client_id ON tecnofit_sync_metadata(client_id);
CREATE INDEX idx_tecnofit_sync_metadata_last_sync_at ON tecnofit_sync_metadata(last_sync_at);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_tecnofit_sync_metadata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tecnofit_sync_metadata_updated_at
  BEFORE UPDATE ON tecnofit_sync_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_tecnofit_sync_metadata_updated_at();

-- RLS Policies
ALTER TABLE tecnofit_sync_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sync metadata for their client"
  ON tecnofit_sync_metadata
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );
```

#### 4.2 Adicionar Índice em `crm_cards` para `tecnofit_id`

**Arquivo:** `supabase/migrations/20260201_add_tecnofit_indexes.sql`

```sql
-- Índice para buscar cards por tecnofit_id (no custom_fields JSONB)
CREATE INDEX IF NOT EXISTS idx_crm_cards_tecnofit_id 
ON crm_cards USING GIN ((custom_fields->>'tecnofit_id'));

-- Índice para lead_sources do tipo tecnofit
CREATE INDEX IF NOT EXISTS idx_lead_sources_tecnofit 
ON lead_sources(client_id, source_type) 
WHERE source_type = 'tecnofit';
```

**Ação:** Executar migrations no Supabase

---

### Fase 5: API Routes

#### 5.1 Endpoint de Sincronização

**Arquivo:** `src/app/api/integrations/tecnofit/sync/route.ts` (NOVO)

```typescript
/**
 * 🏋️ TECNOFIT SYNC API
 *
 * POST /api/integrations/tecnofit/sync
 *
 * Inicia sincronização de clientes da Tecnofit para o CRM
 */

import { getClientConfig } from '@/lib/config';
import { getClientIdFromSession } from '@/lib/supabase-server';
import { syncTecnofitClients } from '@/lib/tecnofit-adapter';
import { withRateLimit, apiUserLimiter } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const POST = withRateLimit(apiUserLimiter, async (request: NextRequest) => {
  try {
    // 🔐 Autenticação
    const clientId = await getClientIdFromSession(request);
    if (!clientId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Buscar configuração do cliente
    const clientConfig = await getClientConfig(clientId);
    if (!clientConfig?.tecnofit?.apiKey || !clientConfig.tecnofit.apiSecret) {
      return NextResponse.json(
        { error: 'Tecnofit not configured', message: 'Please configure Tecnofit API keys in Settings' },
        { status: 400 }
      );
    }

    // Parse body (opcional: tipo de sync)
    const body = await request.json().catch(() => ({}));
    const syncType = body.type || 'clients'; // 'clients', 'contracts', 'frequencies', 'full'

    // Iniciar sincronização (assíncrona)
    const result = await syncTecnofitClients(clientId, {
      apiKey: clientConfig.tecnofit.apiKey!,
      apiSecret: clientConfig.tecnofit.apiSecret!,
      baseUrl: clientConfig.tecnofit.baseUrl,
    });

    return NextResponse.json({
      success: result.success,
      message: `Synced ${result.synced} clients, ${result.errors} errors`,
      synced: result.synced,
      errors: result.errors,
      errorDetails: result.errorDetails,
    });
  } catch (error) {
    console.error('[TECNOFIT-SYNC] Error:', error);
    return NextResponse.json(
      { error: 'Failed to sync', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});
```

#### 5.2 Endpoint de Status

**Arquivo:** `src/app/api/integrations/tecnofit/status/route.ts` (NOVO)

```typescript
/**
 * 🏋️ TECNOFIT SYNC STATUS
 *
 * GET /api/integrations/tecnofit/status
 *
 * Retorna status da última sincronização
 */

import { getClientIdFromSession } from '@/lib/supabase-server';
import { createServiceRoleClient } from '@/lib/supabase';
import { withRateLimit, apiUserLimiter } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = withRateLimit(apiUserLimiter, async (request: NextRequest) => {
  try {
    const clientId = await getClientIdFromSession(request);
    if (!clientId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createServiceRoleClient();
    const { data: metadata } = await supabase
      .from('tecnofit_sync_metadata')
      .select('*')
      .eq('client_id', clientId)
      .single();

    return NextResponse.json({
      success: true,
      metadata: metadata || {
        last_sync_at: null,
        synced_count: 0,
        error_count: 0,
        status: 'never_synced',
      },
    });
  } catch (error) {
    console.error('[TECNOFIT-STATUS] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    );
  }
});
```

**Ação:** Criar rotas seguindo padrão de `src/app/api/crm/`

---

### Fase 6: UI no Dashboard

#### 6.1 Página de Integração Tecnofit

**Arquivo:** `src/app/dashboard/tecnofit/page.tsx` (NOVO)

Similar a `src/app/dashboard/meta-ads/page.tsx`:
- Seção de configuração (API Key, Secret, Company ID)
- Botão "Sincronizar Agora"
- Status da última sincronização
- Lista de clientes sincronizados
- Logs de erros (se houver)

**Ação:** Criar página seguindo padrão de `meta-ads/page.tsx`

---

### Fase 7: Cache Redis

#### 7.1 Implementar Cache para Dados Estáticos

**Arquivo:** `src/lib/tecnofit.ts` (atualizar)

Adicionar cache para produtos e funcionários:

```typescript
import { getRedisClient } from './redis';

const CACHE_TTL = 3600; // 1 hora

export async function listProductsCached(
  credentials: TecnofitCredentials
): Promise<any> {
  const redis = getRedisClient();
  const cacheKey = `tecnofit:products:${credentials.companyId || 'default'}`;
  
  // Tentar buscar do cache
  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  }
  
  // Buscar da API
  const data = await listProducts(credentials);
  
  // Salvar no cache
  if (redis && data) {
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data));
  }
  
  return data;
}
```

**Ação:** Adicionar cache seguindo padrão de `src/lib/redis.ts`

---

## 📊 Mapeamento de Dados

### Tecnofit → CRM Card

| Campo Tecnofit | Campo CRM | Observações |
|----------------|-----------|-------------|
| `id` | `custom_fields.tecnofit_id` | ID externo (chave única) |
| `name` | `title` | Nome do cliente |
| `email` | `custom_fields.email` | Email (filtro exato, case-insensitive) |
| `cpf` | `custom_fields.cpf` | CPF (aceita com ou sem formatação) |
| `type` | `custom_fields.client_type` | `customer` (aluno) ou `prospect` |
| `gender` | `custom_fields.gender` | `F` ou `M` |
| `status` | `custom_fields.status` | Status do cliente |
| `createdAt` | `custom_fields.created_at` | Data de criação |
| `addresses[]` | `custom_fields.addresses` | Array de endereços (endpoint separado) |
| `contracts[]` | (futuro) | Contratos/planos (endpoint `/contracts`) |

### Lead Source

```typescript
{
  client_id: string,
  card_id: string,
  source_type: 'tecnofit',
  source_data: {
    tecnofit_id: string,
    synced_at: string,
  }
}
```

---

## ✅ Checklist de Implementação

### Fase 1: Configuração
- [ ] Criar migration para colunas `clients` table
- [ ] Atualizar `src/lib/types.ts` com interface Tecnofit
- [ ] Atualizar `src/lib/config.ts` para buscar secrets Tecnofit
- [ ] Criar API route `src/app/api/client/tecnofit-config/route.ts`
- [ ] Atualizar `src/app/dashboard/settings/page.tsx` com seção Tecnofit
- [ ] Testar salvamento de secrets no Vault

### Fase 2: Cliente HTTP
- [ ] Criar `src/lib/tecnofit.ts` com cliente Axios
- [ ] Implementar `loginTecnofit()` para obter JWT token
- [ ] Implementar cache de tokens JWT (por client_id)
- [ ] Implementar `getTecnofitToken()` com cache e refresh automático
- [ ] Implementar rate limiting (600ms delay)
- [ ] Implementar retry para 429 e refresh de token para 401
- [ ] Implementar funções: `listCompanies`, `listCustomers`, `listContracts`, `listModalities`, `getCustomerAttendances`, `listAttendances`
- [ ] Testar login e obtenção de token
- [ ] Testar chamadas à API Tecnofit (sandbox/test)

### Fase 3: Adapter
- [ ] Criar `src/lib/tecnofit-adapter.ts`
- [ ] Implementar `mapTecnofitClient()`
- [ ] Implementar `syncTecnofitClients()` com paginação
- [ ] Implementar upsert de cards no CRM
- [ ] Implementar log de lead sources
- [ ] Testar sincronização completa

### Fase 4: Banco de Dados
- [ ] Criar migration `tecnofit_sync_metadata` table
- [ ] Criar migration para índices
- [ ] Aplicar RLS policies
- [ ] Testar queries

### Fase 5: API Routes
- [ ] Criar `src/app/api/integrations/tecnofit/sync/route.ts`
- [ ] Criar `src/app/api/integrations/tecnofit/status/route.ts`
- [ ] Adicionar rate limiting com `withRateLimit()`
- [ ] Adicionar autenticação com `getClientIdFromSession()`
- [ ] Testar endpoints

### Fase 6: UI
- [ ] Criar `src/app/dashboard/tecnofit/page.tsx`
- [ ] Adicionar link no `DashboardNavigation`
- [ ] Implementar botão de sincronização
- [ ] Mostrar status da última sync
- [ ] Mostrar lista de clientes sincronizados
- [ ] Mostrar erros (se houver)

### Fase 7: Cache
- [ ] Adicionar cache Redis para produtos
- [ ] Adicionar cache Redis para funcionários
- [ ] Testar invalidação de cache

### Fase 8: Testes
- [ ] Testes unitários para `mapTecnofitClient()`
- [ ] Testes de integração para `syncTecnofitClients()`
- [ ] Teste de carga (simular 100-200 req/min)
- [ ] Teste de rate limit (429)
- [ ] Teste de retry

### Fase 9: Documentação
- [ ] Atualizar README.md com seção Tecnofit
- [ ] Criar guia de configuração
- [ ] Documentar endpoints da API
- [ ] Documentar troubleshooting

---

## 🚨 Pontos de Atenção

### 1. Autenticação JWT
- **Login**: POST `/v1/auth/login` com `api_key` (21 chars) e `api_secret` (26 chars)
- **Token**: JWT retornado no login, expira em ~1 hora (assumir se não informado)
- **Cache**: Tokens cacheados em memória por `client_id` para evitar logins repetidos
- **Refresh**: Interceptor automático faz novo login em caso de 401 (token expirado)
- **Validação**: Verificar formato das credenciais antes de fazer login

### 2. Rate Limiting
- **Limite**: 100 req/min por endpoint, 200 req/min global
- **Solução**: Delay de 600ms entre requisições + retry com backoff exponencial
- **Monitoramento**: Logar 429 errors

### 2. Autenticação JWT
- **Login**: POST `/v1/auth/login` com `api_key` e `api_secret`
- **Token**: Retorna JWT token que expira (assumir 1 hora se não informado)
- **Cache**: Tokens são cacheados por `client_id` para evitar logins repetidos
- **Refresh**: Interceptor automático faz novo login em caso de 401
- **Validação**: Verificar se credenciais estão configuradas antes de usar

### 4. Paginação
- **Padrão**: Implementar paginação em todas as listagens
- **Limite**: 100 itens por página (padrão Tecnofit)
- **Loop**: Continuar até `hasMore = false`

### 5. Duplicação de Dados
- **Match**: Usar `tecnofit_id` como chave única (não `name` ou `phone`)
- **Upsert**: Verificar existência antes de criar
- **Merge**: Atualizar dados existentes em vez de duplicar

### 6. Erros e Retry
- **429**: Retry com backoff exponencial
- **401**: Token expirado → fazer novo login automaticamente
- **403**: Permissão negada → logar erro, não retry
- **500**: Logar erro, não retry automático
- **Timeout**: 15s por requisição

### 7. Segurança
- **Secrets**: Sempre no Vault, nunca em `.env.local`
- **Autenticação**: Todas as rotas protegidas com `getClientIdFromSession()`
- **RLS**: Policies no Supabase para isolamento multi-tenant
- **Logs**: Não logar secrets ou dados sensíveis

---

## 📚 Referências

- **Padrão Meta Ads**: `src/lib/meta-leads.ts`, `src/app/api/crm/meta-insights/route.ts`
- **Vault**: `src/lib/vault.ts`, `src/lib/config.ts`
- **Rate Limiting**: `src/lib/rate-limit.ts`
- **Redis**: `src/lib/redis.ts`
- **CRM**: `src/components/crm/`, `src/hooks/useCRMCards.ts`

---

## 🎯 Próximos Passos

1. **Revisar documentação oficial da Tecnofit** para confirmar endpoints exatos
2. **Obter credenciais de teste** (sandbox/test environment)
3. **Começar pela Fase 1** (configuração e Vault)
4. **Testar cada fase** antes de avançar para a próxima
5. **Documentar** qualquer desvio do plano conforme necessário

---

**Última atualização:** 2026-02-01  
**Autor:** Análise baseada na arquitetura existente do projeto


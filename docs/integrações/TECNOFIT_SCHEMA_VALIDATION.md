# ⚠️ TECNOFIT INTEGRATION — Validação de Schema Real

**Data:** 2026-03-17
**Status:** ✅ Validado — inspeção de migrations + código-fonte real
**Leia ANTES do `TECNOFIT_INTEGRATION_PLAN.md`**

Este documento corrige e complementa o plano original com base na inspeção real das migrations e do código-fonte. Onde houver conflito entre este arquivo e o plano, **este arquivo prevalece**.

> **Validação feita em:** migrations reais + `src/lib/config.ts` + `src/lib/types.ts` + `src/lib/vault.ts` + `src/lib/redis.ts` + `src/lib/meta-leads.ts` + rotas existentes em `/api/client/` e `/api/integrations/`

---

## 🔍 O que foi inspecionado

| Arquivo | Encontrado em |
|---------|--------------|
| `crm_cards` schema real | `20260131130423_crm_module_phase1.sql` + `20260131_crm_module.sql` |
| `lead_sources` schema real | `20260131_crm_module.sql` linha 191 |
| `clients` padrão de vault | `005_fase1_vault_multi_tenant.sql` + `20251212_simplify_to_shared_gateway_config.sql` |
| Padrão de integração Meta Ads | `20260131_add_meta_ads_integration.sql` |
| Constraint lead_sources | `20260131_crm_module.sql` linha 197 |

---

## 🚨 Erros Críticos no Plano Original

### ERRO 1 — `crm_cards` não tem `title`, `description` nem `custom_fields`

**O plano assume:**
```typescript
await supabase.from('crm_cards').insert({
  title: mapped.full_name,           // ❌ COLUNA NÃO EXISTE
  description: buildCardDescription(), // ❌ COLUNA NÃO EXISTE
  custom_fields: { tecnofit_id: ... }, // ❌ COLUNA NÃO EXISTE
})
```

**Schema real de `crm_cards` (confirmado):**
```sql
CREATE TABLE crm_cards (
  id UUID PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id),
  column_id UUID NOT NULL REFERENCES crm_columns(id),
  phone NUMERIC NOT NULL,             -- ← NUMERIC, não TEXT
  position INTEGER NOT NULL DEFAULT 0,
  auto_status TEXT DEFAULT 'neutral',
  assigned_to UUID,
  estimated_value NUMERIC(12,2),
  currency TEXT DEFAULT 'BRL',
  probability INTEGER DEFAULT 50,
  expected_close_date DATE,
  last_message_at TIMESTAMPTZ,
  last_message_direction TEXT,
  last_message_preview TEXT,
  moved_to_column_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,

  -- FK crítica: phone deve existir em clientes_whatsapp primeiro!
  CONSTRAINT fk_card_contact FOREIGN KEY (phone, client_id)
    REFERENCES clientes_whatsapp(telefone, client_id),
  CONSTRAINT unique_client_phone_card UNIQUE (client_id, phone)
);
```

**Impacto:** O adapter do plano quebrará com erro de coluna inexistente.

---

### ERRO 2 — FK obrigatória: `crm_cards.phone` → `clientes_whatsapp.telefone`

O plano tenta inserir diretamente em `crm_cards`. Isso é **impossível** sem antes ter o registro em `clientes_whatsapp`.

**Além disso:** um trigger automático já existe:

```sql
-- Migration: 20260131130423_crm_module_phase1.sql
CREATE TRIGGER trg_auto_create_crm_card
AFTER INSERT ON clientes_whatsapp
FOR EACH ROW
EXECUTE FUNCTION auto_create_crm_card();
```

**O fluxo correto é:**
```
INSERT clientes_whatsapp → trigger cria crm_card automaticamente
                         → card fica na coluna default do cliente
```

Não insira em `crm_cards` diretamente. Insira em `clientes_whatsapp`.

---

### ERRO 3 — `lead_sources.source_type` tem CHECK constraint fechado

**O plano assume:**
```typescript
source_type: 'tecnofit'  // ❌ NÃO É VALOR ACEITO
```

**Constraint real:**
```sql
source_type TEXT NOT NULL CHECK (
  source_type IN ('meta_ads', 'organic', 'referral', 'manual')
)
-- ↑ 'tecnofit' NÃO está na lista
```

**Fix necessário:** Adicionar `'tecnofit'` ao CHECK na migration.

---

### ERRO 4 — `lead_sources` não tem `source_data` nem `card_id`

**O plano assume:**
```typescript
await supabase.from('lead_sources').insert({
  card_id: ...,        // ❌ COLUNA NÃO EXISTE
  source_data: { ... } // ❌ COLUNA NÃO EXISTE
})
```

**Colunas reais de `lead_sources`:**
```sql
id UUID, client_id UUID, phone NUMERIC,
source_type TEXT, source_name TEXT,
meta_campaign_id TEXT, meta_campaign_name TEXT,
meta_adset_id TEXT, meta_adset_name TEXT,
meta_ad_id TEXT, meta_ad_name TEXT,
utm_source TEXT, utm_medium TEXT, utm_campaign TEXT,
utm_content TEXT, utm_term TEXT,
raw_referral_data JSONB,   -- ← este existe, use ele
first_contact_at TIMESTAMPTZ,
created_at TIMESTAMPTZ
```

Para dados da Tecnofit, use `raw_referral_data JSONB`.

---

### ERRO 5 — Cache JWT com `Map<>` não funciona em serverless

**O plano usa:**
```typescript
const tokenCache = new Map<string, { token: string; expiresAt: number }>();
```

**Problema:** No Vercel (serverless), cada função invocação é um processo novo.
`Map<>` em memória não persiste entre requests. Em produção isso força um login novo a cada mensagem.

**Fix:** Armazenar token JWT no Redis (já existente no projeto):
```typescript
import { getRedisClient } from './redis'

const CACHE_KEY = (clientId: string) => `tecnofit:jwt:${clientId}`

async function cacheToken(clientId: string, token: string, expiresIn: number) {
  const redis = getRedisClient()
  if (redis) await redis.setex(CACHE_KEY(clientId), expiresIn - 60, token)
}

async function getCachedToken(clientId: string): Promise<string | null> {
  const redis = getRedisClient()
  if (!redis) return null
  return redis.get(CACHE_KEY(clientId))
}
```

---

### ERRO 6 — Header `X-Company-Id` não é necessário

O plano menciona `X-Company-Id` como necessário para multi-empresa.
O arquivo `TECNOFIT_API_DETAILS.md` (fonte da API) diz explicitamente:

> "Multi-empresa: Token JWT já contém informações da empresa (não precisa header X-Company-Id)"

**Remova qualquer referência a `X-Company-Id`.**

---

## ✅ Abordagem Correta para o Adapter

### Fluxo de sincronização validado:

```
Tecnofit customer
     ↓
1. Normalizar telefone para NUMERIC (código país + DDD + número)
     ↓
2. UPSERT em clientes_whatsapp
   (telefone NUMERIC, nome, status='bot', client_id)
     ↓
3. Trigger auto-cria crm_card na coluna default (se ainda não existir)
     ↓
4. INSERT em lead_sources (phone, source_type='tecnofit', raw_referral_data)
     ↓
5. UPSERT em tecnofit_contacts (tabela nova — ver migrations necessárias)
```

### Por que uma tabela separada `tecnofit_contacts`?

`crm_cards` não tem onde guardar `email`, `cpf`, `tecnofit_id`, `gender`, `status_tecnofit`.
`crm_notes` é possível mas não estruturado.
A solução correta é uma tabela de "dados estendidos" Tecnofit, linkada a `clientes_whatsapp`.

---

## ✅ Como integrar nos arquivos existentes (padrão confirmado)

### `src/lib/types.ts` — adicionar ao final de `ClientConfig`

A interface atual termina com `activeAgent?: Agent`. Adicionar:

```typescript
// Tecnofit Integration (opcional por cliente)
tecnofit?: {
  apiKey: string | null    // 21 chars — vem do Vault
  apiSecret: string | null // 26 chars — vem do Vault
  baseUrl: string          // default: https://integracao.tecnofit.com.br/v1
}
```

---

### `src/lib/config.ts` — padrão real de `getClientConfig()`

O fluxo real (confirmado em código):
1. `SELECT * FROM clients WHERE id = clientId`
2. Passa IDs de secrets para `getClientSecrets()` em `vault.ts`
3. `getClientSecrets()` chama `getSecretsParallel([id1, id2, ...])`
4. Retorna objeto com secrets descriptografados

**Adicionar ao objeto passado para `getClientSecrets()`:**
```typescript
// Dentro de getClientConfig(), na chamada a getClientSecrets():
const secrets = await getClientSecrets(supabase, {
  meta_access_token_secret_id: client.meta_access_token_secret_id,
  meta_verify_token_secret_id: client.meta_verify_token_secret_id,
  meta_app_secret_secret_id: client.meta_app_secret_secret_id,
  openai_api_key_secret_id: client.openai_api_key_secret_id,
  groq_api_key_secret_id: client.groq_api_key_secret_id,
  // ADICIONAR:
  tecnofit_api_key_secret_id: client.tecnofit_api_key_secret_id ?? null,
  tecnofit_api_secret_secret_id: client.tecnofit_api_secret_secret_id ?? null,
})
```

**Adicionar ao objeto `config` retornado:**
```typescript
const config: ClientConfig = {
  // ... campos existentes
  tecnofit: {
    apiKey: secrets.tecnofit_api_key ?? null,
    apiSecret: secrets.tecnofit_api_secret ?? null,
    baseUrl: client.tecnofit_base_url ?? 'https://integracao.tecnofit.com.br/v1',
  },
}
```

> Verifique o tipo retornado de `getClientSecrets()` em `vault.ts` e adicione
> `tecnofit_api_key` e `tecnofit_api_secret` ao tipo `ClientSecrets` também.

---

### Rotas existentes — o que NÃO duplicar

**`/api/client/` (existente):**
- `GET /api/client/config` — config geral do cliente
- `GET /api/client/meta-config` — config Meta específica
- `GET /api/client/waba-id` — WABA ID
- `POST /api/client/test-model` — testa modelo IA

**`/api/integrations/` — NÃO existe ainda.** Crie com total liberdade:
```
src/app/api/integrations/tecnofit/
  sync/route.ts    → POST /api/integrations/tecnofit/sync
  status/route.ts  → GET  /api/integrations/tecnofit/status
  config/route.ts  → POST /api/integrations/tecnofit/config (salvar credenciais)
```

---

## 📋 Migrations Necessárias (lista corrigida)

### Migration 1: `lead_sources` — adicionar `'tecnofit'` ao CHECK

```sql
-- supabase/migrations/TIMESTAMP_add_tecnofit_to_lead_sources.sql
ALTER TABLE lead_sources
  DROP CONSTRAINT IF EXISTS lead_sources_source_type_check;

ALTER TABLE lead_sources
  ADD CONSTRAINT lead_sources_source_type_check
  CHECK (source_type IN ('meta_ads', 'organic', 'referral', 'manual', 'tecnofit'));
```

### Migration 2: `clients` — adicionar colunas Tecnofit (Vault)

```sql
-- supabase/migrations/TIMESTAMP_add_tecnofit_config_to_clients.sql
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS tecnofit_api_key_secret_id UUID REFERENCES vault.secrets(id),
  ADD COLUMN IF NOT EXISTS tecnofit_api_secret_secret_id UUID REFERENCES vault.secrets(id),
  ADD COLUMN IF NOT EXISTS tecnofit_base_url TEXT DEFAULT 'https://integracao.tecnofit.com.br/v1';

COMMENT ON COLUMN clients.tecnofit_api_key_secret_id IS 'Tecnofit API Key (21 chars) - stored in Vault';
COMMENT ON COLUMN clients.tecnofit_api_secret_secret_id IS 'Tecnofit API Secret (26 chars) - stored in Vault';
```

### Migration 3: `tecnofit_contacts` — dados estendidos por cliente Tecnofit

```sql
-- supabase/migrations/TIMESTAMP_create_tecnofit_contacts.sql
CREATE TABLE IF NOT EXISTS tecnofit_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  phone NUMERIC NOT NULL,  -- FK implícita para clientes_whatsapp

  -- Dados da Tecnofit
  tecnofit_id INTEGER NOT NULL,
  full_name TEXT,
  email TEXT,
  cpf TEXT,
  client_type TEXT CHECK (client_type IN ('customer', 'prospect')),
  gender TEXT CHECK (gender IN ('F', 'M')),
  status_tecnofit TEXT,
  tecnofit_created_at TIMESTAMPTZ,

  -- Sync metadata
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_tecnofit_contact UNIQUE (client_id, tecnofit_id),
  CONSTRAINT unique_tecnofit_phone UNIQUE (client_id, phone)
);

CREATE INDEX idx_tecnofit_contacts_client ON tecnofit_contacts(client_id);
CREATE INDEX idx_tecnofit_contacts_tecnofit_id ON tecnofit_contacts(client_id, tecnofit_id);
CREATE INDEX idx_tecnofit_contacts_phone ON tecnofit_contacts(client_id, phone);

ALTER TABLE tecnofit_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access tecnofit_contacts"
  ON tecnofit_contacts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Users view own client tecnofit_contacts"
  ON tecnofit_contacts FOR SELECT USING (
    client_id IN (SELECT client_id FROM user_profiles WHERE id = auth.uid())
  );
```

### Migration 4: `tecnofit_sync_metadata` — status de sincronização (do plano, ok)

```sql
-- supabase/migrations/TIMESTAMP_create_tecnofit_sync_metadata.sql
-- (conforme plano original — esta parte está correta)
```

---

## ✅ Adapter Corrigido — lógica principal

```typescript
// src/lib/tecnofit-adapter.ts

export async function syncTecnofitCustomer(
  clientId: string,
  tecnofitCustomer: TecnofitCustomer
): Promise<void> {
  const supabase = createServiceRoleClient()

  // 1. Normalizar telefone para NUMERIC
  const phone = normalizePhoneToNumeric(tecnofitCustomer.phone)
  if (!phone) return // Sem telefone = sem sync no CRM

  // 2. UPSERT em clientes_whatsapp (trigger cria crm_card automaticamente)
  await supabase.from('clientes_whatsapp').upsert({
    telefone: phone,        // NUMERIC
    nome: tecnofitCustomer.name,
    status: 'bot',
    client_id: clientId,
  }, { onConflict: 'telefone,client_id', ignoreDuplicates: false })

  // 3. UPSERT em tecnofit_contacts (dados estendidos)
  await supabase.from('tecnofit_contacts').upsert({
    client_id: clientId,
    phone,
    tecnofit_id: tecnofitCustomer.id,
    full_name: tecnofitCustomer.name,
    email: tecnofitCustomer.email,
    cpf: tecnofitCustomer.cpf,
    client_type: tecnofitCustomer.type,
    gender: tecnofitCustomer.gender,
    status_tecnofit: tecnofitCustomer.status,
    tecnofit_created_at: tecnofitCustomer.createdAt,
    last_synced_at: new Date().toISOString(),
  }, { onConflict: 'client_id,tecnofit_id' })

  // 4. Registrar fonte em lead_sources (apenas na primeira sync)
  await supabase.from('lead_sources').upsert({
    client_id: clientId,
    phone,
    source_type: 'tecnofit',   // precisa da Migration 1 primeiro!
    source_name: 'Tecnofit Sync',
    raw_referral_data: {
      tecnofit_id: tecnofitCustomer.id,
      synced_at: new Date().toISOString(),
    },
  }, { onConflict: 'client_id,phone', ignoreDuplicates: true })
}

function normalizePhoneToNumeric(phone: string | undefined): number | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  // Adiciona 55 se for número brasileiro sem código de país
  const withCountry = digits.length === 10 || digits.length === 11
    ? '55' + digits
    : digits
  const num = Number(withCountry)
  return isNaN(num) ? null : num
}
```

---

## ✅ Cache JWT corrigido para serverless

> **Atenção:** O Redis do projeto expõe funções helper em `src/lib/redis.ts`, não o cliente bruto.
> Use `setWithExpiry()` e `get()` — **não** `redis.setex()` diretamente.

```typescript
// Em src/lib/tecnofit.ts — substituir Map<> pelas funções do redis.ts

import { setWithExpiry, get } from '@/lib/redis'
// setWithExpiry(key, value, expirySeconds) → chama client.setEx() internamente
// get(key) → retorna string | null

const JWT_CACHE_TTL = 3540 // 59 minutos (margem antes dos 60)

async function cacheJwtToken(clientId: string, token: string): Promise<void> {
  try {
    await setWithExpiry(`tecnofit:jwt:${clientId}`, token, JWT_CACHE_TTL)
  } catch {
    // Redis opcional — falha silenciosa, próxima request faz login de novo
  }
}

async function getCachedJwtToken(clientId: string): Promise<string | null> {
  try {
    return await get(`tecnofit:jwt:${clientId}`)
  } catch {
    return null
  }
}

export async function getTecnofitToken(
  clientId: string,
  credentials: TecnofitCredentials
): Promise<string> {
  // Tentar cache Redis primeiro
  const cached = await getCachedJwtToken(clientId)
  if (cached) return cached

  // Login
  const loginResponse = await loginTecnofit(credentials)

  // Cachear no Redis
  await cacheJwtToken(clientId, loginResponse.token)

  return loginResponse.token
}
```

---

## 📊 Mapa de campos corrigido

### Tecnofit Customer → Schema Real

| Campo Tecnofit | Destino correto | Tabela |
|----------------|-----------------|--------|
| `id` | `tecnofit_id` | `tecnofit_contacts` |
| `name` | `nome` + `full_name` | `clientes_whatsapp` + `tecnofit_contacts` |
| `phone` | `telefone` (NUMERIC) | `clientes_whatsapp` |
| `email` | `email` | `tecnofit_contacts` |
| `cpf` | `cpf` | `tecnofit_contacts` |
| `type` | `client_type` | `tecnofit_contacts` |
| `gender` | `gender` | `tecnofit_contacts` |
| `status` | `status_tecnofit` | `tecnofit_contacts` |
| `createdAt` | `tecnofit_created_at` | `tecnofit_contacts` |
| *(qualquer campo)* | `raw_referral_data` | `lead_sources` |

### O que o plano dizia vs realidade

| Plano dizia | Realidade |
|-------------|-----------|
| `crm_cards.title` | ❌ Não existe |
| `crm_cards.description` | ❌ Não existe |
| `crm_cards.custom_fields` | ❌ Não existe |
| `lead_sources.source_type = 'tecnofit'` | ❌ Precisa migration |
| `lead_sources.source_data` | ❌ Não existe (usar `raw_referral_data`) |
| `lead_sources.card_id` | ❌ Não existe |
| Insert direto em `crm_cards` | ❌ FK constraint — usar `clientes_whatsapp` + trigger |
| Cache JWT com `Map<>` | ❌ Não persiste em serverless — usar Redis |
| `X-Company-Id` header | ❌ Não necessário — JWT já contém empresa |

---

## ✅ Ordem de execução das migrations

```
1. TIMESTAMP_add_tecnofit_to_lead_sources.sql   (adicionar 'tecnofit' ao CHECK)
2. TIMESTAMP_add_tecnofit_config_to_clients.sql  (vault columns)
3. TIMESTAMP_create_tecnofit_contacts.sql        (tabela de dados estendidos)
4. TIMESTAMP_create_tecnofit_sync_metadata.sql   (status de sync — do plano original)
```

> ⚠️ A Migration 1 é pré-requisito das outras. Sem ela, qualquer insert em `lead_sources` com `source_type='tecnofit'` falha com violação de constraint.

---

## ✅ Checklist final antes de começar a codar

- [ ] Confirmar que Redis (Upstash) está configurado no ambiente (verificar `REDIS_URL`)
- [ ] Obter credenciais reais da Tecnofit (`api_key` 21 chars + `api_secret` 26 chars)
- [ ] Executar Migration 1 (lead_sources CHECK) antes de qualquer insert
- [ ] Executar Migration 2 (clients vault columns) antes de testar config
- [ ] Executar Migration 3 (tecnofit_contacts) antes de rodar o adapter
- [ ] Verificar se o cliente tem coluna default no CRM (necessário para o trigger funcionar)
- [ ] **NÃO** inserir diretamente em `crm_cards` — sempre via `clientes_whatsapp`

---

---

## 🎯 Veredito Final — Análise Completa do Projeto

**Após inspeção de migrations, código-fonte, rotas e padrões existentes:**

### ✅ Confirmado como seguro e sem colisões

| Item | Status | Evidência |
|------|--------|-----------|
| Nomes de tabela `tecnofit_contacts`, `tecnofit_sync_metadata` | ✅ Únicos | Grep em todas as migrations |
| Colunas `tecnofit_*_secret_id` em `clients` | ✅ Seguem padrão exato | `openai_api_key_secret_id`, `groq_api_key_secret_id` como modelo |
| Rota `/api/integrations/tecnofit/` | ✅ Diretório não existe | Sem conflito |
| Redis `setWithExpiry()` e `get()` | ✅ Funções existem e funcionam | `src/lib/redis.ts` confirmado |
| `vault.ts` `getSecretsParallel()` | ✅ Suporta N secrets em paralelo | Padrão estabelecido |
| Tabela `crm_notes` como alternativa para dados extras | ✅ Existe com `card_id` | Mas `tecnofit_contacts` é mais adequado |

### ⚠️ Requer atenção durante implementação

| Item | Risco | Mitigação |
|------|-------|-----------|
| `lead_sources.source_type` CHECK | Migration 1 obrigatória antes de qualquer insert | Execute na ordem correta |
| FK `crm_cards` → `clientes_whatsapp` | Insert direto em `crm_cards` falha | Sempre via `clientes_whatsapp` + trigger |
| `getClientSecrets()` tipo em `vault.ts` | Precisa atualizar o tipo `ClientSecrets` | Não esquecer essa interface |
| `tecnofit_base_url` em `clients` | Coluna nova — SELECT * funciona, mas INSERT precisa da migration | Ok se migration 2 vier primeiro |

### ❌ O que o plano original tem errado (já corrigido neste documento)

| Erro | Correção |
|------|----------|
| Insere em `crm_cards.title/description/custom_fields` | Campos não existem — usar `tecnofit_contacts` |
| Insere direto em `crm_cards` | FK violada — inserir em `clientes_whatsapp` primeiro |
| `lead_sources.source_data` e `card_id` | Não existem — usar `raw_referral_data JSONB` |
| JWT cache com `Map<>` | Não persiste em serverless — usar `setWithExpiry()` do `redis.ts` |
| `X-Company-Id` header | Desnecessário — JWT já contém empresa |

### 🟢 Veredito

> **O plano pode ser executado com segurança e profissionalismo**, desde que siga este documento em vez do plano original para qualquer detalhe de schema, fluxo de insert e APIs internas.
>
> Não há ambiguidades, duplicações ou nomes conflitantes com o que já existe.
> A integração se encaixa naturalmente nos padrões do projeto (Vault, Redis, multi-tenant, padrão Meta Ads).
>
> **Pré-requisito absoluto:** executar as 4 migrations na ordem correta antes de qualquer linha de código TypeScript.

---

**Última atualização:** 2026-03-17
**Baseado em:** Inspeção direta das migrations + `types.ts` + `config.ts` + `vault.ts` + `redis.ts` + `meta-leads.ts` + rotas `/api/client/` e `/api/integrations/`

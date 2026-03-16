# Sprint 1 — Infraestrutura Base

**Objetivo:** Criar toda a fundação técnica da integração: banco de dados, tipos TypeScript, carregamento de secrets via Vault e o cliente HTTP da API Tecnofit.

**Resultado esperado ao final deste sprint:**
- 4 migrations SQL criadas e aplicadas no banco
- Interfaces TypeScript definidas para todos os dados Tecnofit
- `getClientConfig()` retornando credenciais Tecnofit decriptadas do Vault
- `src/lib/tecnofit.ts` funcional com autenticação JWT, cache de token, rate limiting e retry
- Endpoint de teste validando a conexão

**Depende de:** Nada — este é o sprint inicial.

**Próximo sprint depende deste:** Sprint 2 (usa `tecnofit.ts` e types), Sprint 3 (usa config), Sprint 4 (usa config para settings).

---

## Tarefa 1.1 — Migrations de Banco de Dados

> **Padrão do projeto:** SEMPRE criar migration com `supabase migration new <nome>`. NUNCA executar DDL direto no dashboard.
>
> **Arquivo de referência para padrões:** `db/MIGRATION_WORKFLOW.md`

---

### 1.1.A — Colunas Tecnofit na tabela `clients`

**Comando para criar:**
```bash
supabase migration new add_tecnofit_config_to_clients
```

**Arquivo gerado:** `supabase/migrations/TIMESTAMP_add_tecnofit_config_to_clients.sql`

**Conteúdo do SQL:**
```sql
-- Adiciona configuração da integração Tecnofit na tabela clients
-- Segue o mesmo padrão das colunas Meta Ads já existentes

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS tecnofit_api_key_secret_id    UUID REFERENCES vault.secrets(id),
  ADD COLUMN IF NOT EXISTS tecnofit_api_secret_secret_id UUID REFERENCES vault.secrets(id),
  ADD COLUMN IF NOT EXISTS tecnofit_base_url             TEXT DEFAULT 'https://integracao.tecnofit.com.br/v1',
  ADD COLUMN IF NOT EXISTS tecnofit_company_id           TEXT,
  ADD COLUMN IF NOT EXISTS tecnofit_enabled              BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tecnofit_auto_sync            BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tecnofit_sync_interval_hours  INTEGER NOT NULL DEFAULT 24;

COMMENT ON COLUMN clients.tecnofit_api_key_secret_id    IS 'Vault secret ID para api_key Tecnofit (21 chars)';
COMMENT ON COLUMN clients.tecnofit_api_secret_secret_id IS 'Vault secret ID para api_secret Tecnofit (26 chars)';
COMMENT ON COLUMN clients.tecnofit_base_url             IS 'Base URL da API Tecnofit';
COMMENT ON COLUMN clients.tecnofit_company_id           IS 'ID da unidade (para academias multi-empresa)';
COMMENT ON COLUMN clients.tecnofit_enabled              IS 'Integração Tecnofit ativa?';
COMMENT ON COLUMN clients.tecnofit_auto_sync            IS 'Sincronização automática habilitada?';
COMMENT ON COLUMN clients.tecnofit_sync_interval_hours  IS 'Intervalo de sync automático em horas';
```

**Checklist 1.1.A:**
- [ ] Executar `supabase migration new add_tecnofit_config_to_clients`
- [ ] Colar o SQL acima no arquivo gerado
- [ ] Aplicar: `supabase db push`
- [ ] Verificar no Supabase Dashboard → Table Editor → tabela `clients` que as colunas apareceram
- [ ] Confirmar que `tecnofit_enabled DEFAULT FALSE` está correto (integração começa desativada)

---

### 1.1.B — Tabela `tecnofit_sync_metadata`

**Comando para criar:**
```bash
supabase migration new create_tecnofit_sync_metadata
```

**Conteúdo do SQL:**
```sql
-- Armazena o estado e histórico de sincronizações com o Tecnofit
-- Uma linha por cliente (UNIQUE client_id)

CREATE TABLE IF NOT EXISTS tecnofit_sync_metadata (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Controle de sync
  last_sync_at    TIMESTAMPTZ,
  last_sync_type  TEXT        CHECK (last_sync_type IN ('clients', 'full')),
  next_sync_at    TIMESTAMPTZ,

  -- Resultado do último sync
  synced_count    INTEGER     NOT NULL DEFAULT 0,
  error_count     INTEGER     NOT NULL DEFAULT 0,
  error_details   JSONB,

  -- Estado atual
  status          TEXT        NOT NULL DEFAULT 'idle'
                              CHECK (status IN ('idle', 'syncing', 'error', 'never_synced')),
  status_message  TEXT,

  -- Timestamps padrão
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (client_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_tecnofit_sync_metadata_client_id
  ON tecnofit_sync_metadata (client_id);

CREATE INDEX IF NOT EXISTS idx_tecnofit_sync_metadata_last_sync_at
  ON tecnofit_sync_metadata (last_sync_at DESC);

CREATE INDEX IF NOT EXISTS idx_tecnofit_sync_metadata_status
  ON tecnofit_sync_metadata (status)
  WHERE status IN ('syncing', 'error');

-- Trigger updated_at (reutiliza função padrão se existir, ou cria nova)
CREATE OR REPLACE FUNCTION set_updated_at_tecnofit_sync()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tecnofit_sync_metadata_updated_at
  BEFORE UPDATE ON tecnofit_sync_metadata
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_tecnofit_sync();

-- RLS
ALTER TABLE tecnofit_sync_metadata ENABLE ROW LEVEL SECURITY;

-- Apenas usuários do mesmo cliente podem ver
CREATE POLICY "select_own_client_sync_metadata"
  ON tecnofit_sync_metadata
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Apenas service role pode inserir/atualizar (via API routes)
CREATE POLICY "service_role_write_sync_metadata"
  ON tecnofit_sync_metadata
  FOR ALL
  USING (auth.role() = 'service_role');
```

**Checklist 1.1.B:**
- [ ] Executar `supabase migration new create_tecnofit_sync_metadata`
- [ ] Colar o SQL acima no arquivo gerado
- [ ] Aplicar: `supabase db push`
- [ ] Verificar tabela no Supabase Dashboard
- [ ] Testar RLS: simular SELECT com usuário normal e verificar isolamento

---

### 1.1.C — Índices para CRM (busca por tecnofit_id)

**Comando para criar:**
```bash
supabase migration new add_tecnofit_indexes_to_crm
```

**Conteúdo do SQL:**
```sql
-- Índices para busca eficiente de cards Tecnofit no CRM

-- Busca por tecnofit_id dentro do campo JSONB custom_fields
CREATE INDEX IF NOT EXISTS idx_crm_cards_tecnofit_id
  ON crm_cards USING GIN ((custom_fields->>'tecnofit_id'));

-- Índice para busca de lead_sources do tipo tecnofit
-- (partial index: só indexa linhas relevantes)
CREATE INDEX IF NOT EXISTS idx_lead_sources_tecnofit
  ON lead_sources (client_id, source_type)
  WHERE source_type = 'tecnofit';

-- Índice para busca de trial requests por telefone
-- (será usado pelo agente para verificar se já existe solicitação)
-- NOTE: criar apenas se a tabela tecnofit_trial_requests já existir
-- (esta migration pode ser combinada com a 1.1.D ou executada após ela)
```

**Checklist 1.1.C:**
- [ ] Executar `supabase migration new add_tecnofit_indexes_to_crm`
- [ ] Colar o SQL acima
- [ ] Verificar que as tabelas `crm_cards` e `lead_sources` existem antes de aplicar
- [ ] Aplicar: `supabase db push`
- [ ] Validar no psql/dashboard que índices foram criados: `\d crm_cards` (lista índices)

---

### 1.1.D — Tabela `tecnofit_trial_requests`

**Comando para criar:**
```bash
supabase migration new create_tecnofit_trial_requests
```

**Conteúdo do SQL:**
```sql
-- Armazena solicitações de aula experimental capturadas pelo chatbot WhatsApp

CREATE TABLE IF NOT EXISTS tecnofit_trial_requests (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  crm_card_id           UUID        REFERENCES crm_cards(id) ON DELETE SET NULL,

  -- Dados do prospect
  prospect_name         TEXT        NOT NULL,
  prospect_phone        TEXT        NOT NULL,
  prospect_email        TEXT,

  -- Preferências de aula
  preferred_modality    TEXT,
  preferred_days        TEXT[],
  preferred_time        TEXT        CHECK (preferred_time IN ('manhã', 'tarde', 'noite', NULL)),
  notes                 TEXT,

  -- Status do agendamento
  status                TEXT        NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending', 'contacted', 'confirmed', 'cancelled', 'no_show')),
  confirmed_at          TIMESTAMPTZ,
  confirmed_by          TEXT,
  cancellation_reason   TEXT,

  -- Referência no Tecnofit (preenchida após humano criar o prospect lá)
  tecnofit_customer_id  INTEGER,

  -- Rastreabilidade do chatbot
  whatsapp_session_id   TEXT,
  conversation_id       UUID        REFERENCES conversations(id) ON DELETE SET NULL,

  -- Timestamps padrão
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_trial_requests_client_id
  ON tecnofit_trial_requests (client_id);

CREATE INDEX IF NOT EXISTS idx_trial_requests_phone
  ON tecnofit_trial_requests (client_id, prospect_phone);

CREATE INDEX IF NOT EXISTS idx_trial_requests_status
  ON tecnofit_trial_requests (client_id, status);

CREATE INDEX IF NOT EXISTS idx_trial_requests_created_at
  ON tecnofit_trial_requests (created_at DESC);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION set_updated_at_trial_requests()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_trial_requests_updated_at
  BEFORE UPDATE ON tecnofit_trial_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_trial_requests();

-- RLS
ALTER TABLE tecnofit_trial_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_client_trial_requests"
  ON tecnofit_trial_requests
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "service_role_all_trial_requests"
  ON tecnofit_trial_requests
  FOR ALL
  USING (auth.role() = 'service_role');
```

**Checklist 1.1.D:**
- [ ] Executar `supabase migration new create_tecnofit_trial_requests`
- [ ] Colar o SQL acima
- [ ] Aplicar: `supabase db push`
- [ ] Verificar tabela no Supabase Dashboard
- [ ] Confirmar que os CHECKs estão corretos para os ENUMs de status e preferred_time
- [ ] Confirmar que RLS policies estão ativas

---

### 1.1.E — Verificação Final de Banco

**Checklist 1.1.E:**
- [ ] Rodar `supabase db diff` e confirmar que não há mudanças pendentes
- [ ] Verificar que todas as 4 migrations foram aplicadas:
  ```sql
  SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 10;
  ```
- [ ] Commitar migrations:
  ```bash
  git add supabase/migrations/
  git commit -m "feat: add Tecnofit integration database schema"
  ```

---

## Tarefa 1.2 — Interfaces TypeScript

> **Arquivo:** `src/lib/types.ts`
> **Referência:** Buscar a interface `ClientConfig` já existente no arquivo e adicionar as novas interfaces

**Checklist 1.2:**

- [ ] Abrir `src/lib/types.ts` e localizar a interface `ClientConfig`

- [ ] Adicionar interface `TecnofitConfig` (antes de `ClientConfig`):
  ```typescript
  export interface TecnofitConfig {
    apiKey: string | null;       // 21 caracteres — do Vault
    apiSecret: string | null;    // 26 caracteres — do Vault
    baseUrl: string;             // Default: https://integracao.tecnofit.com.br/v1
    companyId: string | null;    // Para multi-empresa (header X-Company-Id)
    enabled: boolean;
    autoSync: boolean;
    syncIntervalHours: number;
  }
  ```

- [ ] Adicionar campo `tecnofit?: TecnofitConfig` na interface `ClientConfig`

- [ ] Adicionar interface `TecnofitCustomer`:
  ```typescript
  export interface TecnofitCustomer {
    id: number;
    name: string;
    email?: string;
    cpf?: string;
    type: 'customer' | 'prospect';
    gender?: 'F' | 'M';
    status?: string;
    createdAt?: string;
  }
  ```

- [ ] Adicionar interface `TecnofitContact`:
  ```typescript
  export interface TecnofitContact {
    id: number;
    type: string;       // 'phone', 'email', 'whatsapp', etc.
    value: string;
    customerId: number;
  }
  ```

- [ ] Adicionar interface `TecnofitModality`:
  ```typescript
  export interface TecnofitModality {
    id: number;
    name: string;
  }
  ```

- [ ] Adicionar interface `TecnofitContract`:
  ```typescript
  export interface TecnofitContract {
    id: number;
    name: string;
    dueDateType?: 'session' | 'period' | 'monthly';
    allowAutomaticRenew?: boolean;
    modalityId?: number;
  }
  ```

- [ ] Adicionar interface `TecnofitAttendance`:
  ```typescript
  export interface TecnofitAttendance {
    id: number;
    customerId: number;
    type: 'turnstile' | 'class' | 'crossfit';
    date: string;    // YYYY-MM-DD
    time: string;    // HH:mm:ss
  }
  ```

- [ ] Adicionar interface `TecnofitPaginatedResponse<T>`:
  ```typescript
  export interface TecnofitPaginatedResponse<T> {
    data: T[];
    pagination?: {
      page: number;
      limit: number;
      total?: number;
      total_pages?: number;
    };
  }
  ```

- [ ] Adicionar interface `TecnofitSyncResult`:
  ```typescript
  export interface TecnofitSyncResult {
    success: boolean;
    synced: number;
    errors: number;
    errorDetails?: string[];
    durationMs?: number;
  }
  ```

- [ ] Adicionar interface `TecnofitTrialRequest`:
  ```typescript
  export interface TecnofitTrialRequest {
    id: string;
    clientId: string;
    crmCardId?: string;
    prospectName: string;
    prospectPhone: string;
    prospectEmail?: string;
    preferredModality?: string;
    preferredDays?: string[];
    preferredTime?: 'manhã' | 'tarde' | 'noite';
    notes?: string;
    status: 'pending' | 'contacted' | 'confirmed' | 'cancelled' | 'no_show';
    confirmedAt?: string;
    tecnofitCustomerId?: number;
    whatsappSessionId?: string;
    createdAt: string;
    updatedAt: string;
  }
  ```

- [ ] Rodar typecheck após edições: `npx tsc --noEmit`
- [ ] Resolver qualquer erro de tipagem introduzido

---

## Tarefa 1.3 — Atualizar `getClientConfig()`

> **Arquivo:** `src/lib/config.ts`
>
> **O que fazer:** Adicionar busca dos 2 secrets Tecnofit do Vault em paralelo com os outros secrets já existentes.
>
> **Padrão existente para referência:** Buscar como `meta_access_token` é resolvido — o mesmo padrão deve ser seguido para Tecnofit.

**Checklist 1.3:**

- [ ] Abrir `src/lib/config.ts`
- [ ] Localizar a função `getClientConfig(clientId: string)`
- [ ] Identificar onde os outros secrets são resolvidos via Vault (buscar por `secret_id`)
- [ ] Adicionar à query de `clients`:
  ```typescript
  // Na query SELECT da tabela clients, adicionar:
  tecnofit_api_key_secret_id,
  tecnofit_api_secret_secret_id,
  tecnofit_base_url,
  tecnofit_company_id,
  tecnofit_enabled,
  tecnofit_auto_sync,
  tecnofit_sync_interval_hours
  ```

- [ ] Adicionar resolução dos secrets Tecnofit em paralelo:
  ```typescript
  // Junto com os outros getVaultSecret() paralelos já existentes:
  const [
    // ... outros secrets já existentes ...
    tecnofitApiKey,
    tecnofitApiSecret,
  ] = await Promise.all([
    // ... outros ...
    client.tecnofit_api_key_secret_id
      ? getVaultSecret(client.tecnofit_api_key_secret_id)
      : Promise.resolve(null),
    client.tecnofit_api_secret_secret_id
      ? getVaultSecret(client.tecnofit_api_secret_secret_id)
      : Promise.resolve(null),
  ]);
  ```

- [ ] Adicionar `tecnofit` ao objeto de retorno de `getClientConfig()`:
  ```typescript
  tecnofit: {
    apiKey: tecnofitApiKey,
    apiSecret: tecnofitApiSecret,
    baseUrl: client.tecnofit_base_url ?? 'https://integracao.tecnofit.com.br/v1',
    companyId: client.tecnofit_company_id ?? null,
    enabled: client.tecnofit_enabled ?? false,
    autoSync: client.tecnofit_auto_sync ?? false,
    syncIntervalHours: client.tecnofit_sync_interval_hours ?? 24,
  },
  ```

- [ ] Rodar `npx tsc --noEmit` para confirmar tipos corretos
- [ ] Verificar que a performance não foi impactada (os secrets são resolvidos em paralelo, não sequencialmente)

---

## Tarefa 1.4 — Cliente HTTP `src/lib/tecnofit.ts`

> **Referência para padrão de código:** `src/lib/meta-leads.ts` (ver como é feito o cliente HTTP para Meta)
>
> **Criar arquivo:** `src/lib/tecnofit.ts`

**Checklist 1.4 — Estrutura geral:**

- [ ] Criar o arquivo `src/lib/tecnofit.ts`
- [ ] Importar `axios` e `AxiosInstance` do axios
- [ ] Definir constante `TECNOFIT_BASE_URL = 'https://integracao.tecnofit.com.br/v1'`
- [ ] Definir constante `RATE_LIMIT_DELAY_MS = 650` (ligeiramente acima de 600ms por segurança)
- [ ] Definir `TOKEN_CACHE_MARGIN_MS = 300_000` (5 minutos de margem antes de expirar)
- [ ] Criar Map para cache de tokens: `const tokenCache = new Map<string, { token: string; expiresAt: number }>()`

**Checklist 1.4 — Função `loginTecnofit()`:**

- [ ] Implementar função:
  ```typescript
  export async function loginTecnofit(credentials: TecnofitCredentials): Promise<{ token: string; expiresIn: number }>
  ```
- [ ] POST para `/auth/login` com `api_key` e `api_secret`
- [ ] Headers: `Content-Type: application/json`, `Accept: application/json`
- [ ] Timeout: 15000ms
- [ ] Lançar erro descritivo se `token` não vier na resposta
- [ ] Assumir `expiresIn = 3600` se não fornecido pela API

**Checklist 1.4 — Função `getTecnofitToken()`:**

- [ ] Implementar função:
  ```typescript
  export async function getTecnofitToken(clientId: string, credentials: TecnofitCredentials): Promise<string>
  ```
- [ ] Verificar cache: se token existe E `expiresAt > Date.now() + TOKEN_CACHE_MARGIN_MS`, retornar do cache
- [ ] Caso contrário: chamar `loginTecnofit()`, salvar no cache com `expiresAt` calculado, retornar token
- [ ] Em caso de falha no login, limpar cache do `clientId` antes de relançar erro

**Checklist 1.4 — Função `createTecnofitClient()`:**

- [ ] Implementar função:
  ```typescript
  export async function createTecnofitClient(clientId: string, credentials: TecnofitCredentials): Promise<AxiosInstance>
  ```
- [ ] Chamar `getTecnofitToken()` antes de criar o cliente
- [ ] `axios.create()` com `baseURL`, `timeout: 15000`, headers padrão com `Authorization: Bearer {token}`
- [ ] **Interceptor de resposta #1 — Refresh de token 401:**
  - Se `error.response?.status === 401`: deletar do cache, obter novo token, reintentar a request original
  - Evitar loop infinito: verificar flag `_isRetry` na config da request
- [ ] **Interceptor de request #1 — Rate limiting:**
  - Manter `lastRequestTime` em closure
  - Se tempo desde última request < `RATE_LIMIT_DELAY_MS`: aguardar a diferença
  - Atualizar `lastRequestTime` após delay
- [ ] **Interceptor de resposta #2 — Retry em 429:**
  - Se `error.response?.status === 429`: aguardar `Retry-After` (ou 60s padrão), reintentar
  - Limitar a 3 tentativas máximo

**Checklist 1.4 — Funções de dados:**

- [ ] `listCompanies(clientId, credentials, options?)`:
  - GET `/companies`
  - Params: `page`, `limit`
  - Retorno tipado: `TecnofitPaginatedResponse<{ id: number; name: string }>`

- [ ] `listCustomers(clientId, credentials, options?)`:
  - GET `/customers`
  - Params: `page`, `limit`, `sort`, `order`, `status`, `type`, `email`, `cpf`, `gender`, `createStartDate`, `createEndDate`
  - Retorno tipado: `TecnofitPaginatedResponse<TecnofitCustomer>`

- [ ] `getCustomer(clientId, credentials, customerId)`:
  - GET `/customers/{id}`
  - Retorno: `TecnofitCustomer`

- [ ] `getCustomerContacts(clientId, credentials, customerId, options?)`:
  - GET `/customers/{id}/contacts`
  - Params: `page`, `limit`, `sort`, `order`
  - Retorno tipado: `TecnofitPaginatedResponse<TecnofitContact>`

- [ ] `listContracts(clientId, credentials, options?)`:
  - GET `/contracts`
  - Params: `page`, `limit`, `sort`, `order`, `dueDateType`, `allowAutomaticRenew`, `modalityId`
  - Retorno tipado: `TecnofitPaginatedResponse<TecnofitContract>`

- [ ] `listModalities(clientId, credentials, options?)`:
  - GET `/modalities`
  - Params: `page`, `limit`, `sort`, `order`
  - Retorno tipado: `TecnofitPaginatedResponse<TecnofitModality>`

- [ ] `getCustomerAttendances(clientId, credentials, customerId, startDate, endDate, options?)`:
  - GET `/customers/{id}/attendances`
  - Params: `startDate`, `endDate`, `type`, `page`, `limit`
  - Validar que `startDate` e `endDate` estão no formato `YYYY-MM-DD`
  - Retorno tipado: `TecnofitPaginatedResponse<TecnofitAttendance>`

- [ ] `listAttendances(clientId, credentials, startDate, endDate, type, options?)`:
  - GET `/attendances`
  - Params: `startDate`, `endDate`, `type` (obrigatório), `page`, `limit`
  - Retorno tipado: `TecnofitPaginatedResponse<TecnofitAttendance>`

**Checklist 1.4 — Qualidade:**

- [ ] Rodar `npx tsc --noEmit` — sem erros de tipo
- [ ] Rodar `npm run lint` — sem warnings
- [ ] Verificar que nenhuma credencial é logada em `console.log` ou `console.error`
- [ ] Verificar que todos os erros do axios são tratados com `error instanceof Error ? error.message : 'Unknown'`

---

## Tarefa 1.5 — Endpoint de Teste de Conexão

> **Arquivo:** `src/app/api/test/tecnofit-connection/route.ts`
>
> **Padrão:** Seguir padrão de `src/app/api/test/gateway/route.ts` (se existir) ou `src/app/api/test/nodes/*/route.ts`

**Checklist 1.5:**

- [ ] Criar arquivo `src/app/api/test/tecnofit-connection/route.ts`

- [ ] Implementar `GET`:
  ```typescript
  export const dynamic = 'force-dynamic'

  export async function GET(request: NextRequest) {
    // 1. Pegar clientId da sessão (ou de query param para dev)
    // 2. Carregar getClientConfig(clientId)
    // 3. Verificar se tecnofit.apiKey e tecnofit.apiSecret estão presentes
    // 4. Chamar loginTecnofit() com as credenciais
    // 5. Chamar listCompanies() para validar que o token funciona
    // 6. Retornar { success, companies, tokenValid, message }
  }
  ```

- [ ] Testar localmente (quando credenciais disponíveis):
  ```bash
  curl "http://localhost:3000/api/test/tecnofit-connection?clientId=SEU_UUID"
  ```

- [ ] Verificar que erros retornam JSON com `{ error, details }` e status 4xx/5xx correto

---

## Definição de "Done" — Sprint 1

Para este sprint ser considerado concluído, TODOS os itens abaixo devem estar ✅:

- [ ] 4 migrations aplicadas e versionadas no git
- [ ] Todas as interfaces TypeScript exportadas de `src/lib/types.ts`
- [ ] `getClientConfig()` inclui campo `tecnofit` no retorno
- [ ] `src/lib/tecnofit.ts` exporta todas as funções com tipos corretos
- [ ] `npx tsc --noEmit` sem erros
- [ ] `npm run lint` sem erros
- [ ] Endpoint `/api/test/tecnofit-connection` funcional
- [ ] Commit com mensagem: `feat: Sprint 1 - Tecnofit infrastructure base`

---

## Comandos Úteis para este Sprint

```bash
# Criar migration
supabase migration new <nome>

# Aplicar migrations
supabase db push

# Ver migrations aplicadas
supabase migration list

# Typecheck
npx tsc --noEmit

# Lint
npm run lint

# Dev server
npm run dev
```

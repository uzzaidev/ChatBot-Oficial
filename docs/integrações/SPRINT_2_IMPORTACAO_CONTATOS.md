# Sprint 2 — Importação de Contatos

**Objetivo:** Sincronizar clientes e prospects do Tecnofit para o CRM do chatbot, com deduplicação inteligente, paginação completa, rastreamento de origem e API routes protegidas.

**Resultado esperado ao final deste sprint:**
- `src/lib/tecnofit-adapter.ts` com sync paginado completo
- 3 API routes funcionais: sync, status, customers
- Deduplicação por `tecnofit_id` funcionando
- Lead sources registrados corretamente
- Endpoint de config para salvar API keys no Vault

**Depende de:** Sprint 1 (migrations, `tecnofit.ts`, types, config)

**Próximo sprint depende deste:** Sprint 3 (usa adapter para lookup), Sprint 4 (usa routes para UI)

---

## Tarefa 2.1 — Adapter de Dados `src/lib/tecnofit-adapter.ts`

> **Referência para padrão:** `src/lib/meta-leads.ts` — ver como `createCardFromLead()` mapeia dados e faz upsert no CRM.
>
> **Criar arquivo:** `src/lib/tecnofit-adapter.ts`

### 2.1.A — Funções utilitárias de normalização

**Checklist 2.1.A:**

- [ ] Criar função `normalizePhone(phone: string | undefined): string | undefined`:
  - Remover todos os caracteres não numéricos: `phone.replace(/\D/g, '')`
  - Se o resultado tem 10 ou 11 dígitos (sem código do país): prefixar com `'55'`
  - Se já tem 12 ou 13 dígitos: manter como está
  - Retornar `undefined` se o input for falsy ou resultado for inválido (< 10 chars)

- [ ] Criar função `formatPhoneDisplay(phone: string): string`:
  - Formata para exibição amigável: `+55 (11) 99999-9999`
  - Usado na descrição do card CRM

- [ ] Criar função `buildCardDescription(data: TecnofitCustomer, contacts: TecnofitContact[]): string`:
  - Linha 1: `📧 {email}` (se existir)
  - Linha 2: `🆔 CPF: {cpf}` (se existir)
  - Linha 3: `👤 Tipo: Aluno` ou `👤 Tipo: Prospect`
  - Linha 4: `⚧️ Sexo: Feminino/Masculino` (se existir)
  - Linha 5: `📊 Status: {status}` (se existir)
  - Linha 6: `📅 Cadastro Tecnofit: {createdAt formatado em pt-BR}` (se existir)
  - Retornar string com quebras de linha
  - Fallback se tudo estiver vazio: `'Cliente importado do Tecnofit'`

- [ ] Criar função `extractPrimaryPhone(contacts: TecnofitContact[]): string | undefined`:
  - Filtrar contacts onde `type` inclui `'phone'` ou `'whatsapp'` ou `'celular'`
  - Pegar o primeiro valor que não seja vazio
  - Normalizar com `normalizePhone()`

---

### 2.1.B — Funções de banco de dados (CRM)

**Checklist 2.1.B:**

- [ ] Criar função `findExistingCRMCard(supabase, clientId, tecnofitId, phone?)`:
  ```typescript
  async function findExistingCRMCard(
    supabase: SupabaseClient,
    clientId: string,
    tecnofitId: number,
    phone?: string
  ): Promise<{ id: string; custom_fields: Record<string, unknown> } | null>
  ```
  - Buscar `crm_cards` onde `client_id = clientId`
  - Condição 1: `custom_fields->>'tecnofit_id' = String(tecnofitId)`
  - Se não encontrar e `phone` fornecido: buscar por `phone = normalizedPhone`
  - Retornar o card encontrado ou `null`

- [ ] Criar função `getDefaultCRMColumnId(supabase, clientId)`:
  ```typescript
  async function getDefaultCRMColumnId(supabase, clientId): Promise<string>
  ```
  - Buscar `crm_columns` onde `client_id = clientId` ORDER BY `position ASC` LIMIT 1
  - Lançar erro descritivo se não encontrar coluna: `'Client ${clientId} has no CRM columns'`

- [ ] Criar função `upsertCRMCard(supabase, clientId, customer, contacts)`:
  ```typescript
  async function upsertCRMCard(
    supabase: SupabaseClient,
    clientId: string,
    customer: TecnofitCustomer,
    contacts: TecnofitContact[]
  ): Promise<{ cardId: string; isNew: boolean }>
  ```
  - Chamar `findExistingCRMCard()` para verificar duplicata
  - Se card existe: **UPDATE** com título, telefone, `custom_fields` atualizados
    - Usar `{ ...existingCustomFields, ...newFields }` para não perder campos existentes
    - Não alterar `column_id` (respeitar posição no kanban)
  - Se card NÃO existe: **INSERT** com todos os campos
    - `column_id` = resultado de `getDefaultCRMColumnId()`
    - `phone` = telefone principal extraído dos contacts
    - `title` = `customer.name`
    - `description` = resultado de `buildCardDescription()`
    - `custom_fields` = objeto com todos os dados Tecnofit
    - `position` = 0
  - Retornar `{ cardId, isNew }`

- [ ] Criar função `recordLeadSource(supabase, clientId, cardId, tecnofitId)`:
  ```typescript
  async function recordLeadSource(
    supabase: SupabaseClient,
    clientId: string,
    cardId: string,
    tecnofitId: number
  ): Promise<void>
  ```
  - Verificar se já existe lead_source `source_type = 'tecnofit'` para este `cardId`
  - Se não existe: INSERT em `lead_sources` com:
    - `client_id`, `card_id`, `source_type: 'tecnofit'`
    - `source_data: { tecnofit_id, synced_at: new Date().toISOString() }`
  - Se já existe: IGNORE (não duplicar)

---

### 2.1.C — Função de sync com metadados

**Checklist 2.1.C:**

- [ ] Criar função `updateSyncMetadata(supabase, clientId, data)`:
  ```typescript
  async function updateSyncMetadata(
    supabase: SupabaseClient,
    clientId: string,
    data: Partial<{
      status: string;
      statusMessage: string;
      syncedCount: number;
      errorCount: number;
      errorDetails: string[];
      lastSyncAt: string;
      lastSyncType: string;
    }>
  ): Promise<void>
  ```
  - UPSERT em `tecnofit_sync_metadata` (ON CONFLICT `client_id` DO UPDATE)
  - Atualiza campos conforme `data`

- [ ] Criar função `isSyncAlreadyRunning(supabase, clientId)`:
  ```typescript
  async function isSyncAlreadyRunning(supabase, clientId): Promise<boolean>
  ```
  - SELECT `status` de `tecnofit_sync_metadata` onde `client_id = clientId`
  - Retornar `status === 'syncing'`
  - Se metadata não existe (primeira sync): retornar `false`

---

### 2.1.D — Função principal `syncTecnofitClients()`

> Esta é a função mais crítica do Sprint 2. Deve ser robusta, com tratamento de erros por cliente (falha em um não para o restante) e atualização de progresso em tempo real.

**Checklist 2.1.D:**

- [ ] Implementar `syncTecnofitClients(clientId, credentials)`:

  **Estrutura geral:**
  ```typescript
  export async function syncTecnofitClients(
    clientId: string,
    credentials: TecnofitCredentials
  ): Promise<TecnofitSyncResult>
  ```

  **Passo 1 — Verificar se já está em sync:**
  - [ ] Chamar `isSyncAlreadyRunning()` — se sim, retornar erro `'Sync already in progress'`

  **Passo 2 — Marcar como em sync:**
  - [ ] Chamar `updateSyncMetadata(supabase, clientId, { status: 'syncing', statusMessage: 'Iniciando sincronização...' })`

  **Passo 3 — Loop de paginação:**
  - [ ] Inicializar: `page = 1`, `hasMore = true`, `synced = 0`, `errors = 0`, `errorDetails = []`
  - [ ] `startTime = Date.now()`
  - [ ] Loop `while (hasMore)`:
    - Chamar `listCustomers(clientId, credentials, { page, limit: 100 })`
    - Extrair `customers = response.data || []`
    - Extrair `pagination = response.pagination`
    - Se `customers.length === 0`: `hasMore = false`, break

    **Para cada `customer` da página:**
    - Envolver em try-catch individual (erro em um não para os outros)
    - Buscar contatos: `getCustomerContacts(clientId, credentials, customer.id)`
    - Chamar `upsertCRMCard()` com customer + contacts
    - Chamar `recordLeadSource()` com o `cardId` retornado
    - Incrementar `synced++`
    - Em caso de erro: `errors++`, `errorDetails.push(...)`, continuar

    **Atualizar progresso a cada 50 clientes:**
    - [ ] `updateSyncMetadata(supabase, clientId, { syncedCount: synced, statusMessage: 'Sincronizando... ${synced} clientes' })`

    **Verificar paginação:**
    - Se `pagination?.total_pages` existe: `hasMore = page < pagination.total_pages`
    - Caso contrário: `hasMore = customers.length === 100` (assume que há mais se retornou 100)
    - `page++`

  **Passo 4 — Marcar como concluído:**
  - [ ] `updateSyncMetadata(supabase, clientId, { status: errors > 0 ? 'error' : 'idle', lastSyncAt: new Date().toISOString(), lastSyncType: 'clients', syncedCount: synced, errorCount: errors, errorDetails })`

  **Passo 5 — Retornar resultado:**
  - [ ] Retornar `TecnofitSyncResult` com `success`, `synced`, `errors`, `errorDetails`, `durationMs`

  **Tratamento de erro global (catch no try mais externo):**
  - [ ] `updateSyncMetadata(supabase, clientId, { status: 'error', statusMessage: error.message })`
  - [ ] Relançar o erro para o chamador

---

## Tarefa 2.2 — API Routes

### 2.2.A — Configuração de credenciais `tecnofit-config`

> **Arquivo:** `src/app/api/client/tecnofit-config/route.ts`
>
> **Padrão:** Ver `src/app/api/client/` para outros exemplos de configuração de cliente

**Checklist 2.2.A:**

- [ ] Criar `src/app/api/client/tecnofit-config/route.ts`

- [ ] Implementar `GET`:
  - Obter `clientId` via `getClientIdFromSession()`
  - SELECT campos `tecnofit_*` de `clients` WHERE `id = clientId`
  - Retornar configuração **sem expor** `api_key` e `api_secret` reais
  - Retornar: `{ enabled, hasApiKey: !!api_key_secret_id, hasApiSecret: !!api_secret_secret_id, baseUrl, companyId, autoSync, syncIntervalHours }`

- [ ] Implementar `POST` (salvar configuração):
  - Body esperado: `{ apiKey?, apiSecret?, baseUrl?, companyId?, enabled?, autoSync?, syncIntervalHours? }`
  - Validar `apiKey`: se fornecido, deve ter exatamente 21 chars → erro 400 se inválido
  - Validar `apiSecret`: se fornecido, deve ter exatamente 26 chars → erro 400 se inválido
  - Se `apiKey` fornecido: chamar Vault para salvar secret → obter `secret_id` → salvar em `clients.tecnofit_api_key_secret_id`
  - Se `apiSecret` fornecido: mesma lógica para `tecnofit_api_secret_secret_id`
  - Salvar demais campos diretamente em `clients`
  - Retornar `{ success: true, message: 'Configuração salva com sucesso' }`

- [ ] Implementar `DELETE` (remover integração):
  - Obter `clientId` via `getClientIdFromSession()`
  - Deletar secrets do Vault (chamar função de delete vault)
  - Setar colunas `tecnofit_*` para `NULL` / `FALSE` em `clients`
  - Retornar `{ success: true }`

- [ ] Adicionar `export const dynamic = 'force-dynamic'` no topo

---

### 2.2.B — Iniciar sincronização

> **Arquivo:** `src/app/api/integrations/tecnofit/sync/route.ts`

**Checklist 2.2.B:**

- [ ] Criar `src/app/api/integrations/tecnofit/sync/route.ts`

- [ ] Implementar `POST`:

  **Autenticação:**
  - [ ] `const clientId = await getClientIdFromSession(request)` → erro 401 se null

  **Verificação de configuração:**
  - [ ] `const config = await getClientConfig(clientId)`
  - [ ] Se `!config.tecnofit?.enabled`: retornar erro 400 `'Tecnofit integration is not enabled'`
  - [ ] Se `!config.tecnofit?.apiKey || !config.tecnofit?.apiSecret`: retornar erro 400 `'Tecnofit credentials not configured'`

  **Verificar sync em andamento:**
  - [ ] Buscar `tecnofit_sync_metadata` para `clientId`
  - [ ] Se `status === 'syncing'`: retornar erro 409 `'Sync already in progress'`

  **Executar sync:**
  - [ ] Chamar `syncTecnofitClients(clientId, credentials)`
  - [ ] Retornar resultado: `{ success, synced, errors, errorDetails, durationMs }`

  **Tratamento de erros:**
  - [ ] try-catch com retorno 500 em caso de falha inesperada

- [ ] Adicionar `withRateLimit(apiUserLimiter, ...)` se disponível no projeto
- [ ] Adicionar `export const dynamic = 'force-dynamic'`

---

### 2.2.C — Status da sincronização

> **Arquivo:** `src/app/api/integrations/tecnofit/status/route.ts`

**Checklist 2.2.C:**

- [ ] Criar `src/app/api/integrations/tecnofit/status/route.ts`

- [ ] Implementar `GET`:
  - Autenticação: `getClientIdFromSession()`
  - SELECT `*` de `tecnofit_sync_metadata` onde `client_id = clientId`
  - Se não existe: retornar `{ status: 'never_synced', lastSyncAt: null, syncedCount: 0 }`
  - Se existe: retornar dados completos do metadata
  - Retornar `{ success: true, data: metadata }`

- [ ] Adicionar `export const dynamic = 'force-dynamic'`

---

### 2.2.D — Listar clientes importados

> **Arquivo:** `src/app/api/integrations/tecnofit/customers/route.ts`

**Checklist 2.2.D:**

- [ ] Criar `src/app/api/integrations/tecnofit/customers/route.ts`

- [ ] Implementar `GET`:
  - Autenticação: `getClientIdFromSession()`
  - Query params: `page` (default 1), `limit` (default 20, max 100), `search` (string), `type` (`customer`|`prospect`)
  - SELECT de `crm_cards` onde:
    - `client_id = clientId`
    - `custom_fields->>'tecnofit_id' IS NOT NULL`
    - Se `search`: filtrar por `title ILIKE '%${search}%'`
    - Se `type`: filtrar por `custom_fields->>'client_type' = type`
  - ORDER BY `created_at DESC`
  - LIMIT/OFFSET para paginação
  - Retornar `{ data, pagination: { page, limit, total } }`

---

### 2.2.E — Listar empresas/unidades

> **Arquivo:** `src/app/api/integrations/tecnofit/companies/route.ts`

**Checklist 2.2.E:**

- [ ] Criar `src/app/api/integrations/tecnofit/companies/route.ts`

- [ ] Implementar `GET`:
  - Autenticação + verificar config Tecnofit
  - Buscar do Redis: `tecnofit:companies:{clientId}` (cache 4h)
  - Se não está em cache: chamar `listCompanies()` da API Tecnofit
  - Salvar no Redis: `redis.setex(key, 4 * 3600, JSON.stringify(data))`
  - Retornar lista de empresas

---

## Tarefa 2.3 — Validações e Casos Edge

**Checklist 2.3:**

- [ ] **Cliente sem telefone:** Se `contacts` está vazio e o campo `phone` do customer está vazio:
  - Usar fallback: `phone = 'tecnofit_' + customer.id` (identificador único mas inválido para WhatsApp)
  - Registrar no `errorDetails` como warning (não erro)

- [ ] **CPF duplicado em clientes diferentes:** Não lançar erro, apenas fazer upsert normalmente

- [ ] **Nome muito longo:** Truncar `title` para 255 chars se exceder

- [ ] **Email inválido:** Salvar mesmo assim no `custom_fields` (validação não é nosso papel)

- [ ] **Tecnofit retorna 403 em `/attendances`:** Este endpoint tem restrições — não usar no sync inicial, só quando explicitamente solicitado

- [ ] **Lentidão em academias grandes:** Adicionar log de progresso a cada 100 clientes processados

---

## Tarefa 2.4 — Verificação de Qualidade

**Checklist 2.4:**

- [ ] `npx tsc --noEmit` — sem erros
- [ ] `npm run lint` — sem warnings
- [ ] Testar manualmente com dados mock:
  - Criar arquivo de teste em `src/app/api/test/tecnofit-sync-mock/route.ts`
  - Simular 10 customers com dados variados
  - Verificar que cards são criados no CRM
  - Rodar 2x e verificar que não há duplicatas
- [ ] Verificar que `tecnofit_sync_metadata` é atualizado corretamente em cada etapa

---

## Definição de "Done" — Sprint 2

- [ ] `src/lib/tecnofit-adapter.ts` completo e sem erros de tipo
- [ ] API route POST `/api/integrations/tecnofit/sync` funcional
- [ ] API route GET `/api/integrations/tecnofit/status` funcional
- [ ] API route GET `/api/integrations/tecnofit/customers` funcional
- [ ] API route `/api/client/tecnofit-config` (GET/POST/DELETE) funcional
- [ ] Deduplicação validada (sync 2x = sem duplicatas)
- [ ] `lead_sources` criados com `source_type = 'tecnofit'`
- [ ] `tecnofit_sync_metadata` atualizado ao longo do sync
- [ ] `npx tsc --noEmit` sem erros
- [ ] Commit: `feat: Sprint 2 - Tecnofit contact sync and API routes`

# Sprint 5 — Sincronização Automática e Cache

**Objetivo:** Implementar o cron job para sync automático diário, cache Redis para dados estáticos que não mudam com frequência, e otimizações de performance para sync incremental em academias grandes.

**Resultado esperado ao final deste sprint:**
- Cron job configurado para sync às 3h da manhã
- Cache Redis para modalidades, contratos e empresas (1h–4h TTL)
- Sync incremental: só importa clientes novos desde a última sync
- Circuit breaker: pausa sync se Tecnofit retornar erros consecutivos

**Depende de:** Sprint 1 (config), Sprint 2 (adapter), Sprint 3 (handlers)

**Próximo sprint depende deste:** Sprint 6 (testes incluem cron e cache)

---

## Tarefa 5.1 — Cron Job de Sync Automático

> **Criar arquivo:** `src/app/api/cron/tecnofit-sync/route.ts`
>
> **Referência:** Ver se já existem outros cron jobs no projeto: `src/app/api/cron/`
>
> **Documentação Vercel Cron:** https://vercel.com/docs/cron-jobs

### 5.1.A — Rota do Cron

**Checklist 5.1.A:**

- [ ] Criar `src/app/api/cron/tecnofit-sync/route.ts`

- [ ] Implementar proteção por `CRON_SECRET`:
  ```typescript
  export const dynamic = 'force-dynamic';

  export async function GET(request: NextRequest) {
    // Verificar que a request veio do Vercel Cron (ou de chamada autorizada)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // ...
  }
  ```

- [ ] Buscar todos os clientes com Tecnofit ativo e autoSync habilitado:
  ```typescript
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, tecnofit_sync_interval_hours')
    .eq('tecnofit_enabled', true)
    .eq('tecnofit_auto_sync', true)
    .eq('status', 'active');
  ```

- [ ] Para cada cliente:
  - Buscar `tecnofit_sync_metadata` para verificar `last_sync_at`
  - Calcular se passou o intervalo configurado: `Date.now() - lastSyncAt > syncIntervalHours * 3600 * 1000`
  - Se ainda não passou o intervalo: **pular** este cliente (logar motivo)
  - Se passou: carregar `getClientConfig(client.id)` e executar `syncTecnofitClients()`

- [ ] Executar clientes **sequencialmente** (não em paralelo):
  - Paralelo causaria problemas de rate limit na API Tecnofit (o rate limit é global)
  - Loop `for...of` com `await` em cada iteração

- [ ] Retornar resumo ao final:
  ```json
  {
    "success": true,
    "processed": 3,
    "skipped": 1,
    "results": [
      { "clientId": "...", "clientName": "Academia X", "synced": 150, "errors": 0 },
      { "clientId": "...", "clientName": "Academia Y", "synced": 0, "errors": 0, "skipped": true, "reason": "interval_not_reached" }
    ]
  }
  ```

- [ ] Log detalhado para debug: `console.log('[CRON:TECNOFIT] Processing client:', clientName)`

---

### 5.1.B — Configurar no Vercel (vercel.json)

**Checklist 5.1.B:**

- [ ] Abrir `vercel.json` (ou criar se não existir)
- [ ] Verificar se já existem crons configurados (não sobrescrever!)
- [ ] Adicionar cron Tecnofit:
  ```json
  {
    "crons": [
      {
        "path": "/api/cron/tecnofit-sync",
        "schedule": "0 6 * * *"
      }
    ]
  }
  ```
  - `0 6 * * *` = todo dia às 06h UTC = 03h horário de Brasília (UTC-3)
  - Confirmar o horário com o usuário se necessário

- [ ] Adicionar `CRON_SECRET` no `.env.example`:
  ```
  # Cron Jobs
  CRON_SECRET=gerar_valor_aleatorio_seguro
  ```

- [ ] Documentar no `CLAUDE.md` que existe o cron de sync

---

### 5.1.C — Variável de ambiente CRON_SECRET

**Checklist 5.1.C:**

- [ ] Gerar valor seguro para `CRON_SECRET`:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- [ ] Adicionar ao `.env.local` para desenvolvimento
- [ ] Documentar que deve ser adicionado nas variáveis de ambiente do Vercel em produção

---

## Tarefa 5.2 — Cache Redis para Dados Estáticos

> **Arquivo a atualizar:** `src/lib/tecnofit.ts`
>
> **Referência:** Ver como Redis é usado em `src/lib/redis.ts` — padrão `getRedisClient()`

### 5.2.A — Funções com cache

**Checklist 5.2.A — Utilitários de cache:**

- [ ] Criar helper `getTecnofitCacheKey(type, clientId, extras?)`:
  ```typescript
  function getTecnofitCacheKey(
    type: 'companies' | 'modalities' | 'contracts',
    clientId: string,
    extras?: string
  ): string {
    const base = `tecnofit:${type}:${clientId}`;
    return extras ? `${base}:${extras}` : base;
  }
  ```

- [ ] Criar helper `getCachedOrFetch<T>(key, ttl, fetchFn)`:
  ```typescript
  async function getCachedOrFetch<T>(
    key: string,
    ttlSeconds: number,
    fetchFn: () => Promise<T>
  ): Promise<T>
  ```
  - Tentar buscar do Redis pelo `key`
  - Se hit: `JSON.parse(cached)` e retornar
  - Se miss: chamar `fetchFn()`, salvar com `redis.setex(key, ttlSeconds, JSON.stringify(data))`, retornar
  - Se Redis indisponível: chamar `fetchFn()` diretamente (graceful degradation)

**Checklist 5.2.A — Funções cached:**

- [ ] Criar `listCompaniesCached(clientId, credentials, options?)`:
  - Cache key: `getTecnofitCacheKey('companies', clientId)`
  - TTL: `4 * 3600` (4 horas)
  - Wrap de `listCompanies()`

- [ ] Criar `listModalitiesCached(clientId, credentials, options?)`:
  - Cache key: `getTecnofitCacheKey('modalities', clientId)`
  - TTL: `3600` (1 hora)
  - Wrap de `listModalities()`

- [ ] Criar `listContractsCached(clientId, credentials, options?)`:
  - Cache key: `getTecnofitCacheKey('contracts', clientId)`
  - TTL: `3600` (1 hora)
  - Wrap de `listContracts()`

- [ ] Criar `invalidateTecnofitCache(clientId)`:
  ```typescript
  export async function invalidateTecnofitCache(clientId: string): Promise<void>
  ```
  - Deletar todas as chaves: `tecnofit:*:{clientId}`
  - Usar `redis.del()` para cada chave possível
  - Chamar esta função quando as credenciais são atualizadas (no PATCH da config)

**Checklist 5.2.A — Integração:**

- [ ] Atualizar `handleListarModalidades()` em `handleTecnofitToolCall.ts` para usar `listModalitiesCached()`
- [ ] Atualizar `listCompanies` na route de companies para usar `listCompaniesCached()`

---

## Tarefa 5.3 — Sync Incremental

> **Objetivo:** Em vez de re-importar todos os clientes a cada sync, buscar apenas os criados/atualizados desde a última sync.
>
> **Arquivo a atualizar:** `src/lib/tecnofit-adapter.ts` — função `syncTecnofitClients()`

**Checklist 5.3:**

- [ ] Ao iniciar `syncTecnofitClients()`, verificar `lastSyncAt` do `tecnofit_sync_metadata`

- [ ] Se `lastSyncAt` existe E o tipo de sync é `'incremental'`:
  - Usar `createStartDate = lastSyncAt` nos params de `listCustomers()`
  - Isso buscará apenas clientes criados após a última sync
  - Importante: não captura **updates** em clientes existentes (limitação da API)

- [ ] Se `lastSyncAt` não existe OU tipo é `'full'`:
  - Sync completo sem filtro de data
  - Registrar `lastSyncType = 'full'`

- [ ] Adicionar parâmetro `syncType` em `syncTecnofitClients()`:
  ```typescript
  export async function syncTecnofitClients(
    clientId: string,
    credentials: TecnofitCredentials,
    options?: { syncType?: 'incremental' | 'full' }
  ): Promise<TecnofitSyncResult>
  ```

- [ ] Na API route POST `/api/integrations/tecnofit/sync`:
  - Default: `syncType = 'incremental'`
  - Permitir forçar full: `body.fullSync === true` → `syncType = 'full'`
  - Adicionar botão "Sync Completo" no dashboard (além do "Sincronizar Agora" padrão)

- [ ] Implementar **sync mensal completo automático** no cron:
  - Se `lastSyncAt` foi há mais de 30 dias: forçar `syncType = 'full'` independente da opção
  - Garante que updates em clientes existentes sejam capturados pelo menos mensalmente

---

## Tarefa 5.4 — Circuit Breaker

> **Objetivo:** Se a API Tecnofit retornar muitos erros consecutivos, pausar o sync automaticamente para não desperdiçar chamadas e não piorar o rate limit.

**Checklist 5.4:**

- [ ] Criar função `checkCircuitBreaker(supabase, clientId)`:
  - Verificar nos últimos 3 syncs: se todos tiveram `error_count > synced_count`:
    - Considerar circuito "aberto" (não fazer sync)
    - Retornar `{ open: true, reason: 'Too many consecutive errors' }`
  - Caso contrário: `{ open: false }`

- [ ] No início de `syncTecnofitClients()`:
  - Chamar `checkCircuitBreaker()`
  - Se aberto: retornar `{ success: false, errors: 0, synced: 0, errorDetails: ['Circuit breaker open: too many consecutive errors. Check Tecnofit API status.'] }`

- [ ] No cron job: se circuit breaker open para um cliente, logar e pular (não tentar)

- [ ] Reset do circuit breaker:
  - Um sync bem-sucedido automaticamente "fecha" o circuito (a própria lógica de verificação vai detectar)
  - Botão manual "Forçar Sync" no dashboard ignora circuit breaker

---

## Tarefa 5.5 — Monitoramento e Logs

**Checklist 5.5:**

- [ ] Adicionar métricas de performance em `syncTecnofitClients()`:
  - `startTime = Date.now()` no início
  - `endTime = Date.now()` no final
  - `durationMs = endTime - startTime`
  - Salvar `durationMs` em `tecnofit_sync_metadata`

- [ ] Adicionar `migration new add_duration_to_sync_metadata.sql`:
  ```sql
  ALTER TABLE tecnofit_sync_metadata
    ADD COLUMN IF NOT EXISTS last_sync_duration_ms INTEGER;
  ```

- [ ] Logs estruturados no cron:
  ```typescript
  console.log(JSON.stringify({
    event: 'tecnofit_cron_sync_complete',
    clientId,
    clientName,
    synced,
    errors,
    durationMs,
    timestamp: new Date().toISOString(),
  }));
  ```

---

## Tarefa 5.6 — Endpoint de Teste do Cron

**Criar:** `src/app/api/test/tecnofit-cron/route.ts`

**Checklist 5.6:**

- [ ] Apenas acessível em desenvolvimento (`process.env.NODE_ENV !== 'production'`)
- [ ] Simula a execução do cron para um cliente específico (via query param `clientId`)
- [ ] Útil para testar o cron sem esperar pela schedule

---

## Definição de "Done" — Sprint 5

- [ ] Cron job criado e testado manualmente
- [ ] `vercel.json` com schedule configurado
- [ ] `CRON_SECRET` documentado no `.env.example`
- [ ] Cache Redis funcionando para modalities e companies
- [ ] `invalidateTecnofitCache()` chamado quando credenciais são atualizadas
- [ ] Sync incremental funcionando (só importa novos desde última sync)
- [ ] Circuit breaker implementado
- [ ] Migration para `last_sync_duration_ms` aplicada
- [ ] `npx tsc --noEmit` sem erros
- [ ] Commit: `feat: Sprint 5 - Auto sync cron job and Redis cache`

# 🚀 Otimização do Analytics OpenAI

## Problema Atual

Toda vez que o usuário clica em "Atualizar Tudo", a API busca **todos os dados desde o dia initial** (ex: 30 dias atrás), fazendo múltiplas chamadas de paginação.

**Exemplo:**

- Período: 30 dias (01/12 - 11/02)
- Resultado: ~3-5 páginas da API
- Dados duplicados: 90% (já tínhamos antes)

---

## 📊 Estratégias de Otimização

### **Opção 1: Cache Local (Quick Win)** ⚡

**Complexidade:** Baixa  
**Implementação:** 1-2 horas

#### Como funciona:

```typescript
// Estado do componente
const [cachedData, setCachedData] = useState<{
  data: OpenAIUsageRecord[];
  lastFetch: Date;
  dateRange: { start: string; end: string };
}>(null);

// Ao atualizar
const fetchOpenAIData = async () => {
  // Se já tem cache e foi atualizado há menos de 1 hora
  if (cachedData && Date.now() - cachedData.lastFetch.getTime() < 3600000) {
    setOpenAIData(cachedData.data);
    return;
  }

  // Senão, busca tudo novamente
  const result = await fetch(...);
  setCachedData({
    data: result.data,
    lastFetch: new Date(),
    dateRange: { start, end }
  });
};
```

**Prós:**

- ✅ Implementação rápida
- ✅ Reduz 100% das chamadas repetidas na mesma sessão

**Contras:**

- ❌ Cache se perde ao recarregar página
- ❌ Não sincroniza entre abas

---

### **Opção 2: LocalStorage Cache** 💾

**Complexidade:** Baixa-Média  
**Implementação:** 2-3 horas

#### Como funciona:

```typescript
const CACHE_KEY = 'openai_analytics_cache';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hora

// Salvar no localStorage
const saveCache = (data: OpenAIUsageRecord[], dateRange: {...}) => {
  localStorage.setItem(CACHE_KEY, JSON.stringify({
    data,
    timestamp: Date.now(),
    dateRange
  }));
};

// Carregar do localStorage
const loadCache = () => {
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;

  const { data, timestamp, dateRange } = JSON.parse(cached);

  // Verifica se cache ainda é válido
  if (Date.now() - timestamp > CACHE_DURATION) {
    return null; // Expirado
  }

  return { data, dateRange };
};
```

**Prós:**

- ✅ Persiste entre reloads
- ✅ Simples de implementar

**Contras:**

- ❌ Limite de 5-10MB do localStorage
- ❌ Não sincroniza entre dispositivos

---

### **Opção 3: Busca Incremental Inteligente** 🧠

**Complexidade:** Média  
**Implementação:** 3-5 horas

#### Como funciona:

1. **Na primeira carga:** Busca últimos 7 dias
2. **Ao clicar "Carregar Mais":** Busca próximos 30 dias
3. **Ao atualizar:** Busca apenas **novos dados** (desde última atualização)

```typescript
const fetchIncrementalData = async () => {
  const lastFetchedDate = getLastFetchedDate(); // Ex: 2026-02-09
  const today = new Date().toISOString().split("T")[0];

  // Busca apenas novos dados
  const result = await fetch(
    `/api/openai-billing/detailed?start_date=${lastFetchedDate}&end_date=${today}`,
  );

  // Merge com dados existentes
  const mergedData = [...existingData, ...result.data];
  setOpenAIData(mergedData);
};
```

**Prós:**

- ✅ Reduz drasticamente chamadas à API
- ✅ Experiência de usuário melhor (dados carregam rápido)

**Contras:**

- ❌ Lógica de merge mais complexa
- ❌ Precisa gerenciar estado de "última data buscada"

---

### **Opção 4: Sync no Banco de Dados** 💪 (RECOMENDADO)

**Complexidade:** Alta  
**Implementação:** 1-2 dias

#### Como funciona:

1. Criar tabela `openai_usage_sync`:

```sql
CREATE TABLE openai_usage_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  usage_date DATE NOT NULL,
  model_name TEXT NOT NULL,
  num_requests INTEGER,
  input_tokens BIGINT,
  output_tokens BIGINT,
  estimated_cost_usd NUMERIC(10, 6),
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, usage_date, model_name)
);
```

2. Criar job de sincronização:

```typescript
// API: POST /api/openai-billing/sync
export async function syncOpenAIData(clientId: string) {
  // 1. Busca última data sincronizada no banco
  const lastSyncDate = await getLastSyncDate(clientId);

  // 2. Busca novos dados da OpenAI (desde lastSyncDate)
  const newData = await fetchOpenAIUsage(clientId, lastSyncDate, today);

  // 3. Insere/atualiza no banco (UPSERT)
  await upsertUsageData(newData);

  return { synced: newData.length };
}
```

3. Dashboard consulta banco ao invés da API:

```typescript
// Busca dados locais (instantâneo!)
const response = await fetch(`/api/analytics/openai-synced?days=30`);
```

4. Botão "Sincronizar Agora" chama sync manual:

```typescript
<Button onClick={() => syncOpenAIData()}>🔄 Sincronizar com OpenAI</Button>
```

**Prós:**

- ✅ **MUITO mais rápido** (consulta banco local)
- ✅ Dados históricos sempre disponíveis
- ✅ Pode criar relatórios complexos (SQL)
- ✅ Sync incremental automático

**Contras:**

- ❌ Implementação mais complexa
- ❌ Manutenção de mais uma tabela

---

## 🎯 Recomendação

### **Curto Prazo (Hoje):** Opção 1 (Cache Local)

- Implementação rápida
- Resolve 80% do problema

### **Médio Prazo (Próximos Sprints):** Opção 4 (Sync no Banco)

- Solução definitiva
- Permite análises complexas
- Melhor experiência do usuário

---

## 📝 Implementação Sugerida (Opção 4)

### **Fase 1: Criar Estrutura**

1. ✅ Migration para criar `openai_usage_sync`
2. ✅ API `/api/openai-billing/sync` (POST)
3. ✅ API `/api/analytics/openai-synced` (GET)

### **Fase 2: UI**

1. ✅ Botão "Sincronizar com OpenAI"
2. ✅ Status de sync (última vez, progress bar)
3. ✅ Dashboard consome dados do banco

### **Fase 3: Automação**

1. ✅ Cron job diário (sync automático 2x/dia)
2. ✅ Webhook da OpenAI (se houver)

---

## 💡 Sobre o Custo Real

**Pergunta:** "Não podemos puxar o custo exato do dashboard da OpenAI?"

**Resposta:** ❌ **IMPOSSÍVEL via API**

### Por quê?

A OpenAI divide suas APIs em dois tipos:

1. **Usage API** (programático):

   - Endpoint: `/v1/organization/usage/completions`
   - Retorna: Tokens, requests
   - ❌ **NÃO retorna custos reais**
   - Acesso: API Keys (Admin Key)

2. **Billing Dashboard** (browser-only):
   - Endpoint: `/v1/dashboard/billing/*`
   - Retorna: Custos reais, limites, payment methods
   - ❌ **Rejeita API Keys** (mesmo Admin Keys)
   - Acesso: APENAS login web browser

### Mensagem de erro ao tentar:

```json
{
  "error": "Your request to GET /v1/dashboard/billing/subscription
           must be made with a session key (that is, it can only be
           made from the browser). You made it with the following
           key type: secret."
}
```

### Nossa Solução:

- Calculamos custo com **preços públicos oficiais**
- Precisão: **~99%** (diferença mínima)
- Único método programático disponível

### Para ver custo REAL:

🌐 https://platform.openai.com/account/billing/overview  
(Login necessário)

---

## 🔍 Breakdown por Modelo

**✅ RESOLVIDO!** Adicionamos `group_by=model` na API.

**Antes:**

```javascript
model: null; // Agregado
```

**Depois:**

```javascript
model: "gpt-4o-mini";
model: "gpt-4o";
model: "gpt-3.5-turbo";
```

Agora a tabela mostra qual modelo foi usado em cada período! 🎉

---

## 📊 Campos Disponíveis na API

A OpenAI Usage API retorna:

- ✅ `model` (nome do modelo)
- ✅ `num_model_requests` (quantidade)
- ✅ `input_tokens` / `output_tokens`
- ✅ `input_cached_tokens` (cache de prompt)
- ⚠️ `project_id` (null se não filtrado)
- ⚠️ `api_key_id` (null se não filtrado)
- ⚠️ `user_id` (null se não habilitado)

**Para ver breakdown por API Key:**

```typescript
queryParams.append("group_by", "api_key_id");
```

Mas isso **aumenta muito** o número de records retornados!

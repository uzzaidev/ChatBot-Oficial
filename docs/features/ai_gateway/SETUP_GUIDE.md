# AI Gateway - Guia de Configuração (Arquitetura Final)

**IMPORTANTE:** Siga este guia ANTES de prosseguir para o frontend (Fase 3).

---

## 🎯 Objetivo

Configurar o backend do AI Gateway com **arquitetura de keys compartilhadas**:
- ✅ UMA gateway key (vck_...) para todos os clientes
- ✅ Keys de providers compartilhadas (OpenAI, Groq, etc)
- ✅ Controle por cliente via budget (tokens/BRL)
- ✅ Tracking multi-tenant customizado
- ✅ Gateway GRÁTIS (sem markup Vercel)

---

## 📋 Pré-requisitos

✅ Migrations aplicadas (incluindo `20251212_simplify_to_shared_gateway_config.sql`)
✅ Backend criado (Fase 2)
✅ Dependências instaladas (`npm install ai @ai-sdk/openai ...`)

---

## PASSO 1: Criar API Keys no Vercel

### 1.1. Acessar Vercel AI Gateway

1. Acesse: https://vercel.com/[seu-usuario]/~/ai
2. Menu lateral → **AI**
3. Seção **API Keys**

### 1.2. Criar Gateway API Key

1. Clique em **Create key**
2. Confirme a criação
3. **COPIE A KEY** (formato: `vck_5NPScLD6MXiM9kUxG2eTFZwQq5lvgiq6Ishr0gm6PwBtYRqOAb2EHKD5`)
4. **⚠️ Você NÃO poderá ver essa key novamente!**
5. Salve em local seguro

**Exemplo:**
```
vck_5NPScLD6MXiM9kUxG2eTFZwQq5lvgiq6Ishr0gm6PwBtYRqOAb2EHKD5
```

---

## PASSO 2: Obter API Keys dos Providers

### 2.1. OpenAI (obrigatório)

1. Acesse: https://platform.openai.com/api-keys
2. Crie nova key: **Create new secret key**
3. Copie a key (formato: `sk-proj-xxxxx...`)

### 2.2. Groq (obrigatório)

1. Acesse: https://console.groq.com/keys
2. Crie nova key: **Create API Key**
3. Copie a key (formato: `gsk_xxxxx...`)

### 2.3. Anthropic (opcional)

1. Acesse: https://console.anthropic.com/settings/keys
2. Crie nova key
3. Copie a key (formato: `sk-ant-xxxxx...`)

### 2.4. Google (opcional)

1. Acesse: https://aistudio.google.com/app/apikey
2. Crie nova key
3. Copie a key (formato: `AIza-xxxxx...`)

**Total de keys: 2 obrigatórias + 2 opcionais**

---

## PASSO 3: Configurar Environment Variables

### 3.1. Editar `.env.local`

```env
# AI Gateway Feature Flag (global)
ENABLE_AI_GATEWAY=true
```

### 3.2. Reiniciar Dev Server

```bash
# Parar o servidor (Ctrl+C)
npm run dev
```

---

## PASSO 4: Adicionar Keys ao Supabase Vault

### 4.1. Acessar Supabase SQL Editor

1. Acesse: https://app.supabase.com
2. Selecione projeto: **ChatBot-Oficial**
3. Menu lateral → **SQL Editor**

### 4.2. Executar SQL para Adicionar Keys

**Execute cada comando separadamente e ANOTE os IDs retornados:**

```sql
-- 1. Gateway Key (vck_...)
SELECT vault.create_secret(
  'vck_5NPScLD6MXiM9kUxG2eTFZwQq5lvgiq6Ishr0gm6PwBtYRqOAb2EHKD5',  -- Sua key
  'shared_gateway_api_key',
  'Shared Vercel AI Gateway API Key'
);
-- Anote o ID retornado: gateway_key_id

-- 2. OpenAI Key (sk-proj-...)
SELECT vault.create_secret(
  'sk-proj-xxxxxxxxxxxxxxxxxxxxx',  -- Sua key
  'shared_openai_api_key',
  'Shared OpenAI API Key'
);
-- Anote o ID retornado: openai_key_id

-- 3. Groq Key (gsk_...)
SELECT vault.create_secret(
  'gsk_xxxxxxxxxxxxxxxxxxxxx',  -- Sua key
  'shared_groq_api_key',
  'Shared Groq API Key'
);
-- Anote o ID retornado: groq_key_id

-- 4. Anthropic Key (sk-ant-...) - OPCIONAL
SELECT vault.create_secret(
  'sk-ant-xxxxxxxxxxxxxxxxxxxxx',  -- Sua key
  'shared_anthropic_api_key',
  'Shared Anthropic API Key'
);
-- Anote o ID retornado: anthropic_key_id

-- 5. Google Key (AIza-...) - OPCIONAL
SELECT vault.create_secret(
  'AIza-xxxxxxxxxxxxxxxxxxxxx',  -- Sua key
  'shared_google_api_key',
  'Shared Google API Key'
);
-- Anote o ID retornado: google_key_id
```

**Resultado esperado de cada comando:**
```
┌──────────────────────────────────────┐
│ id                                   │
├──────────────────────────────────────┤
│ a1b2c3d4-e5f6-7890-abcd-ef1234567890 │
└──────────────────────────────────────┘
```

**⚠️ ANOTE TODOS OS IDs! Você usará no próximo passo.**

---

## PASSO 5: Atualizar Config Global

### 5.1. Vincular Keys ao Gateway Config

**Execute este SQL substituindo os UUIDs pelos IDs anotados:**

```sql
-- Atualizar shared_gateway_config com os secret IDs
UPDATE shared_gateway_config
SET
  gateway_api_key_secret_id = 'gateway_key_id',      -- ID do Passo 4.2 (item 1)
  openai_api_key_secret_id = 'openai_key_id',        -- ID do Passo 4.2 (item 2)
  groq_api_key_secret_id = 'groq_key_id',            -- ID do Passo 4.2 (item 3)
  anthropic_api_key_secret_id = 'anthropic_key_id',  -- ID do Passo 4.2 (item 4) - OPCIONAL
  google_api_key_secret_id = 'google_key_id',        -- ID do Passo 4.2 (item 5) - OPCIONAL
  updated_at = NOW();
```

### 5.2. Verificar Config

```sql
SELECT
  id,
  gateway_api_key_secret_id,
  openai_api_key_secret_id,
  groq_api_key_secret_id,
  cache_enabled,
  default_fallback_chain
FROM shared_gateway_config;
```

**Resultado esperado:**
```
┌────────┬─────────────┬──────────┬───────┬─────────┬──────────────────────────┐
│ id     │ gateway_... │ openai_..│ groq..│ cache   │ fallback_chain           │
├────────┼─────────────┼──────────┼───────┼─────────┼──────────────────────────┤
│ uuid.. │ uuid...     │ uuid...  │ uuid..│ true    │ ["openai/gpt-4o-mini"..] │
└────────┴─────────────┴──────────┴───────┴─────────┴──────────────────────────┘
```

---

## PASSO 6: Configurar Cliente de Teste

### 6.1. Listar Clientes

```sql
SELECT id, name, slug, plan FROM clients LIMIT 10;
```

**Escolha um cliente para teste. Exemplo:**
```
id: 123e4567-e89b-12d3-a456-426614174000
name: Luis Boff
slug: luisboff
plan: pro
```

### 6.2. Habilitar Gateway para Cliente

```sql
-- Habilitar AI Gateway para cliente de teste
UPDATE clients
SET use_ai_gateway = true
WHERE id = '123e4567-e89b-12d3-a456-426614174000';  -- Substitua pelo ID do cliente
```

### 6.3. Criar Budget para Cliente (Opcional)

```sql
-- Inserir budget customizado
INSERT INTO client_budgets (
  client_id,
  budget_type,
  budget_limit,
  budget_period,
  alert_threshold_80,
  alert_threshold_90,
  alert_threshold_100,
  pause_at_limit
) VALUES (
  '123e4567-e89b-12d3-a456-426614174000',  -- ID do cliente
  'tokens',      -- Tipo: tokens, brl ou usd
  100000,        -- Limite: 100k tokens
  'daily',       -- Período: daily, weekly ou monthly
  true,          -- Alerta em 80%
  true,          -- Alerta em 90%
  true,          -- Alerta em 100%
  false          -- NÃO pausar automaticamente
);
```

---

## PASSO 7: Testar Configuração

### 7.1. Verificar Keys Decriptadas

```sql
-- Testar decriptação das keys
SELECT
  s.name,
  ds.decrypted_secret
FROM vault.secrets s
JOIN vault.decrypted_secrets ds ON s.id = ds.id
WHERE s.name LIKE 'shared_%'
ORDER BY s.name;
```

**Resultado esperado:**
```
┌─────────────────────────────┬───────────────────────┐
│ name                        │ decrypted_secret      │
├─────────────────────────────┼───────────────────────┤
│ shared_gateway_api_key      │ vck_5NPScLD6...       │
│ shared_openai_api_key       │ sk-proj-xxx...        │
│ shared_groq_api_key         │ gsk_xxx...            │
└─────────────────────────────┴───────────────────────┘
```

### 7.2. Criar Endpoint de Teste

Criar arquivo: `src/app/api/test/gateway/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { getSharedGatewayConfig, shouldUseGateway } from '@/lib/ai-gateway/config'
import { callAI } from '@/lib/ai-gateway'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const clientId = '123e4567-e89b-12d3-a456-426614174000' // Seu client ID

    // 1. Check if gateway is enabled
    const useGateway = await shouldUseGateway(clientId)
    console.log('Gateway enabled:', useGateway)

    if (!useGateway) {
      return NextResponse.json({ error: 'Gateway not enabled for this client' }, { status: 400 })
    }

    // 2. Get shared config
    const config = await getSharedGatewayConfig()
    console.log('Config:', { hasGatewayKey: !!config?.gatewayApiKey, hasOpenAI: !!config?.providerKeys.openai })

    // 3. Test AI call
    const result = await callAI({
      clientId,
      clientConfig: {
        id: clientId,
        name: 'Test Client',
        slug: 'test',
        primaryModelProvider: 'openai',
        openaiModel: 'gpt-4o-mini',
      },
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say "Hello World" in Portuguese.' },
      ],
    })

    return NextResponse.json({
      success: true,
      result: {
        text: result.text,
        model: result.model,
        provider: result.provider,
        wasCached: result.wasCached,
        latencyMs: result.latencyMs,
        usage: result.usage,
      },
    })
  } catch (error: any) {
    console.error('Test error:', error)
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
  }
}
```

### 7.3. Testar Endpoint

```bash
curl http://localhost:3000/api/test/gateway
```

**Resposta esperada:**
```json
{
  "success": true,
  "result": {
    "text": "Olá Mundo",
    "model": "gpt-4o-mini",
    "provider": "openai",
    "wasCached": false,
    "latencyMs": 1234,
    "usage": {
      "promptTokens": 20,
      "completionTokens": 5,
      "totalTokens": 25
    }
  }
}
```

### 7.4. Verificar Logs no Banco

```sql
-- Ver logs de uso
SELECT
  client_id,
  provider,
  model_name,
  total_tokens,
  cost_brl,
  was_cached,
  created_at
FROM gateway_usage_logs
ORDER BY created_at DESC
LIMIT 5;
```

---

## PASSO 8: Testar via WhatsApp

### 8.1. Enviar Mensagem

Com o cliente configurado (`use_ai_gateway = true`), envie uma mensagem de teste via WhatsApp.

### 8.2. Verificar Logs no Console

```bash
npm run dev
```

Procure por:
```
[AI Gateway] Routing request through AI Gateway
[AI Gateway] Using cached shared config
[Usage Tracking] Logged usage: 234 tokens, R$ 0.0123
```

### 8.3. Verificar Budget

```sql
-- Ver uso do budget
SELECT
  c.name,
  cb.budget_type,
  cb.current_usage,
  cb.budget_limit,
  cb.usage_percentage
FROM clients c
JOIN client_budgets cb ON c.id = cb.client_id
WHERE c.id = '123e4567-e89b-12d3-a456-426614174000';
```

**Resultado esperado:**
```
┌────────────┬──────────────┬───────────────┬──────────────┬──────────────────┐
│ name       │ budget_type  │ current_usage │ budget_limit │ usage_percentage │
├────────────┼──────────────┼───────────────┼──────────────┼──────────────────┤
│ Luis Boff  │ tokens       │ 234           │ 100000       │ 0.23             │
└────────────┴──────────────┴───────────────┴──────────────┴──────────────────┘
```

---

## ✅ Checklist de Validação

Antes de prosseguir para o frontend, confirme:

- [ ] Conta Vercel criada
- [ ] Gateway API key criada (vck_...)
- [ ] OpenAI API key obtida (sk-proj-...)
- [ ] Groq API key obtida (gsk_...)
- [ ] Anthropic API key (opcional)
- [ ] Google API key (opcional)
- [ ] `ENABLE_AI_GATEWAY=true` em `.env.local`
- [ ] Dev server reiniciado
- [ ] 5 keys adicionadas ao Vault
- [ ] Secret IDs anotados
- [ ] `shared_gateway_config` atualizada com secret IDs
- [ ] Cliente de teste escolhido
- [ ] `clients.use_ai_gateway = true` para cliente de teste
- [ ] Budget criado (opcional)
- [ ] Teste via `/api/test/gateway` funcionando ✅
- [ ] Logs aparecendo em `gateway_usage_logs` ✅
- [ ] Budget sendo incrementado ✅

---

## 🐛 Troubleshooting

### Erro: "No shared configuration found"

**Causa:** Tabela `shared_gateway_config` vazia ou migration não rodada

**Solução:**
```sql
-- Verificar se existe registro
SELECT * FROM shared_gateway_config;

-- Se vazio, a migration deve ter inserido um registro placeholder
-- Rode a migration novamente: supabase db push
```

### Erro: "Failed to decrypt key"

**Causa:** Secret ID inválido ou não existe no Vault

**Solução:**
```sql
-- Verificar secrets
SELECT id, name FROM vault.secrets WHERE name LIKE 'shared_%';

-- Se não existe, criar novamente (Passo 4.2)
```

### Erro: "Gateway enabled but no config found"

**Causa:** `shared_gateway_config` sem secret IDs

**Solução:**
```sql
-- Verificar config
SELECT * FROM shared_gateway_config;

-- Se secret_ids são NULL, atualizar (Passo 5.1)
```

### Request funciona mas dados não aparecem em `gateway_usage_logs`

**Causa:** Modelo não existe em `ai_models_registry`

**Solução:**
```sql
-- Verificar modelos
SELECT * FROM ai_models_registry WHERE provider = 'openai';

-- Se vazio, rodar seed migration:
-- supabase/migrations/20251212_seed_ai_models_registry.sql
```

---

## 📚 Próximos Passos

✅ Backend configurado e testado
✅ Keys compartilhadas funcionando
✅ Tracking multi-tenant ativo
✅ Budget control configurado

**Agora pode prosseguir para:**
→ **Fase 3: Frontend Dashboard** (criar UI para gerenciar gateway)

---

**Última Atualização:** 2025-12-12
**Versão:** 2.0 (Arquitetura Final - Keys Compartilhadas)
**Status:** Pronto para Produção

# AI Gateway - Guia Rápido de Configuração

**Sua Gateway Key:** `vck_4a4BgUYsrXlTsKaaH9R8uGRw8FR7IipUGf660FfqnX6CcdpFyb2f9Qm4`

---

## ✅ Status Atual

- [x] Migrations aplicadas
- [x] Tabelas criadas no banco
- [x] Backend implementado
- [x] API de setup criada
- [x] Página admin criada
- [x] Endpoint de teste criado
- [ ] Keys configuradas (próximo passo!)

---

## 🚀 Próximos Passos (5 minutos)

### Passo 1: Obter API Keys dos Providers

**OpenAI (obrigatória):**
1. Acesse: https://platform.openai.com/api-keys
2. Crie nova key: **Create new secret key**
3. Copie a key: `sk-proj-...`

**Groq (obrigatória):**
1. Acesse: https://console.groq.com/keys
2. Crie nova key: **Create API Key**
3. Copie a key: `gsk_...`

**Anthropic (opcional):**
1. Acesse: https://console.anthropic.com/settings/keys
2. Copie a key: `sk-ant-...`

**Google (opcional):**
1. Acesse: https://aistudio.google.com/app/apikey
2. Copie a key: `AIza...`

---

### Passo 2: Habilitar AI Gateway Globalmente

Adicione ao `.env.local`:

```env
# AI Gateway Feature Flag
ENABLE_AI_GATEWAY=true
```

Reinicie o dev server:
```bash
npm run dev
```

---

### Passo 3: Configurar Keys via Dashboard

1. Acesse: http://localhost:3000/dashboard/ai-gateway/setup

2. Preencha as keys:
   - **Gateway API Key (vck_...):** `vck_4a4BgUYsrXlTsKaaH9R8uGRw8FR7IipUGf660FfqnX6CcdpFyb2f9Qm4`
   - **OpenAI API Key:** `sk-proj-...` (sua key)
   - **Groq API Key:** `gsk_...` (sua key)
   - Anthropic e Google (opcional)

3. Clique em **Salvar Configuração**

4. Aguarde confirmação: "Configuração salva com sucesso! Keys criptografadas no Vault."

---

### Passo 4: Testar Configuração

**Via Browser:**
```
http://localhost:3000/api/test/gateway
```

**Via cURL:**
```bash
curl http://localhost:3000/api/test/gateway
```

**Resposta esperada (sucesso):**
```json
{
  "success": true,
  "message": "AI Gateway is working correctly! 🎉",
  "response": {
    "text": "Olá Mundo",
    "model": "gpt-4o-mini",
    "provider": "openai"
  },
  "telemetry": {
    "wasCached": false,
    "latencyMs": 1234
  },
  "usage": {
    "totalTokens": 25
  }
}
```

---

### Passo 5: Habilitar para 1 Cliente de Teste

**Via Supabase SQL Editor:**
```sql
-- 1. Escolher cliente de teste
SELECT id, name, slug FROM clients LIMIT 5;

-- 2. Habilitar gateway para esse cliente
UPDATE clients
SET use_ai_gateway = true
WHERE id = 'SEU_CLIENT_ID_AQUI';

-- 3. Verificar
SELECT id, name, use_ai_gateway FROM clients WHERE use_ai_gateway = true;
```

---

### Passo 6: Testar via WhatsApp

1. Envie mensagem WhatsApp para o número do cliente teste
2. Verifique logs no terminal:
   ```
   [AI Gateway] Routing request through AI Gateway
   [AI Gateway] Using cached shared config
   [Usage Tracking] Logged usage: 234 tokens, R$ 0.0123
   ```

3. Verifique logs no banco:
   ```sql
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

## 🎯 Arquitetura Implementada

✅ **UMA gateway key compartilhada** (`vck_...`) para todos os clientes
✅ **Provider keys compartilhadas** (OpenAI, Groq, etc)
✅ **Controle por cliente** via feature flag (`use_ai_gateway`)
✅ **Tracking multi-tenant** (cada cliente isolado no banco)
✅ **APIs diretas ainda funcionam** (backward compatibility)
✅ **Cache grátis** do Vercel AI Gateway
✅ **Sem markup** (você paga apenas o custo real dos providers)

---

## 📊 Monitoramento

### Ver uso em tempo real:
```sql
-- Uso por cliente (últimas 24h)
SELECT
  c.name,
  COUNT(*) as requests,
  SUM(gul.total_tokens) as tokens,
  SUM(gul.cost_brl) as cost_brl,
  AVG(gul.latency_ms) as avg_latency
FROM gateway_usage_logs gul
JOIN clients c ON gul.client_id = c.id
WHERE gul.created_at > NOW() - INTERVAL '24 hours'
GROUP BY c.name
ORDER BY cost_brl DESC;
```

### Performance de cache:
```sql
SELECT
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE was_cached = true) as cache_hits,
  ROUND(100.0 * COUNT(*) FILTER (WHERE was_cached = true) / COUNT(*), 2) as cache_hit_rate
FROM gateway_usage_logs
WHERE created_at > NOW() - INTERVAL '7 days';
```

---

## 🔧 Troubleshooting

### Erro: "Gateway not enabled"
**Solução:**
1. Verificar `.env.local` tem `ENABLE_AI_GATEWAY=true`
2. Reiniciar dev server
3. Verificar cliente tem `use_ai_gateway = true`

### Erro: "No shared configuration found"
**Solução:**
1. Acessar `/dashboard/ai-gateway/setup`
2. Configurar keys
3. Salvar

### Erro: "Failed to decrypt key"
**Solução:**
1. Verificar keys foram salvas corretamente
2. Testar endpoint: `http://localhost:3000/api/ai-gateway/setup`
3. Se necessário, limpar e reconfigurar

### Request funciona mas não aparece em `gateway_usage_logs`
**Solução:**
1. Verificar `ai_models_registry` tem modelos:
   ```sql
   SELECT * FROM ai_models_registry WHERE provider = 'openai';
   ```
2. Se vazio, rodar migration `20251212_seed_ai_models_registry.sql`

---

## 🎉 Próximas Fases

- [ ] **Fase 3:** Frontend Dashboard (métricas, analytics)
- [ ] **Fase 4:** Budget System (controle de gastos por cliente)
- [ ] **Fase 5:** Testes automatizados
- [ ] **Fase 6:** Migração gradual (rollout 25% → 50% → 100%)

---

**Status:** Backend completo, pronto para testar! 🚀
**Criado:** 2025-12-13
**Versão:** 1.0

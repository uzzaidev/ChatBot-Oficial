# 🧪 Guia de Testes - Validação de Tracking

**Data:** 2024-12-17
**Objetivo:** Validar que TODO o tracking está funcionando antes de ativar bloqueio

---

## 📋 Checklist de Validação

### **Pré-requisitos**
- [ ] Servidor rodando: `npm run dev`
- [ ] Supabase conectado
- [ ] Gateway configurado (OpenAI + Groq keys)
- [ ] Cliente de teste criado

---

## 🎯 FASE 1: Validar APIs Individuais

### **1.1. Chat (Groq via Gateway)** ⭐ PRIORITÁRIO

**Como testar:**
```bash
# Via WhatsApp:
# Envie: "Olá, como você está?"

# OU via curl (se tiver endpoint de teste):
curl -X POST http://localhost:3000/api/test/gateway \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "seu-client-id",
    "messages": [{"role": "user", "content": "Teste"}]
  }'
```

**Verificar:**
1. Resposta chega no WhatsApp
2. Dashboard: http://localhost:3000/dashboard/ai-gateway/validation
3. Ver breakdown:
   - Provider: `groq`
   - Model: `llama-3.3-70b-versatile`
   - API Type: `chat`
   - Custo USD > 0
   - Custo BRL > 0

**SQL para verificar:**
```sql
SELECT
  provider,
  model_name,
  metadata->>'apiType' as api_type,
  input_tokens,
  output_tokens,
  cost_usd,
  cost_brl,
  created_at
FROM gateway_usage_logs
WHERE client_id = 'seu-client-id'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 5;
```

**Esperado:**
- ✅ 1 linha na tabela
- ✅ `provider = 'groq'`
- ✅ `model_name = 'llama-3.3-70b-versatile'`
- ✅ `metadata.apiType = 'chat'`
- ✅ `cost_usd > 0`
- ✅ `cost_brl > 0`

---

### **1.2. Whisper (Áudio → Texto)** 🎤

**Como testar:**
```bash
# Via WhatsApp:
# 1. Grave um áudio de 5-10 segundos
# 2. Envie para o bot
# 3. Bot deve responder com transcrição
```

**Verificar:**
1. Bot recebe áudio
2. Bot responde com transcrição
3. Dashboard mostra Whisper

**SQL:**
```sql
SELECT
  provider,
  model_name,
  metadata->>'apiType' as api_type,
  metadata->>'audioSeconds' as audio_seconds,
  metadata->>'audioSizeBytes' as audio_size,
  input_tokens,
  cost_usd,
  cost_brl,
  created_at
FROM gateway_usage_logs
WHERE client_id = 'seu-client-id'
  AND metadata->>'apiType' = 'whisper'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 3;
```

**Esperado:**
- ✅ 1 linha
- ✅ `provider = 'openai'`
- ✅ `model_name = 'whisper-1'`
- ✅ `metadata.apiType = 'whisper'`
- ✅ `metadata.audioSeconds` presente
- ✅ `cost_usd > 0` (mínimo $0.006)

**Cálculo esperado:**
```
Áudio de 10 segundos:
- Duração: 10s = 0.167 minutos
- Custo: 0.167 * $0.006 = $0.001
- Tokens estimados: (10/60) * 1000 = 167 tokens
```

---

### **1.3. TTS (Texto → Áudio)** 🔊

**Como testar:**
```bash
# Via WhatsApp:
# 1. Envie mensagem para o bot
# 2. Bot responde com texto
# (TTS pode ser gerado automaticamente se configurado)

# OU via API direta:
curl -X POST http://localhost:3000/api/tts/generate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Olá, este é um teste de TTS",
    "clientId": "seu-client-id",
    "provider": "openai",
    "model": "tts-1-hd"
  }'
```

**Verificar:**
```sql
SELECT
  provider,
  model_name,
  metadata->>'apiType' as api_type,
  metadata->>'textLength' as text_length,
  metadata->>'voice' as voice,
  metadata->>'fromCache' as from_cache,
  output_tokens,
  cost_usd,
  cost_brl,
  created_at
FROM gateway_usage_logs
WHERE client_id = 'seu-client-id'
  AND metadata->>'apiType' = 'tts'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 3;
```

**Esperado:**
- ✅ 1+ linhas
- ✅ `provider = 'openai'` OU `'elevenlabs'`
- ✅ `model_name = 'tts-1-hd'` (se OpenAI)
- ✅ `metadata.apiType = 'tts'`
- ✅ `metadata.textLength` presente
- ✅ `metadata.fromCache = false` (primeira vez)
- ✅ `cost_usd > 0`

**Cálculo esperado (OpenAI tts-1-hd):**
```
Texto de 100 caracteres:
- Custo: (100 / 1_000_000) * $15 = $0.0015
- Tokens estimados: 100 / 4 = 25 tokens
```

**Testar Cache:**
1. Gere TTS com mesmo texto
2. Segunda requisição deve ter `metadata.fromCache = true`
3. Ambas devem aparecer em `gateway_usage_logs`

---

### **1.4. Vision (Análise de Imagem)** 📸

**Como testar:**
```bash
# Via WhatsApp:
# 1. Envie uma imagem
# 2. Bot deve descrever a imagem
```

**Verificar:**
```sql
SELECT
  provider,
  model_name,
  metadata->>'apiType' as api_type,
  input_tokens,
  output_tokens,
  cached_tokens,
  cost_usd,
  cost_brl,
  was_cached,
  created_at
FROM gateway_usage_logs
WHERE client_id = 'seu-client-id'
  AND metadata->>'apiType' = 'vision'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 3;
```

**Esperado:**
- ✅ 1 linha
- ✅ `provider = 'openai'`
- ✅ `model_name` contém 'gpt-4' ou 'gpt-4o'
- ✅ `metadata.apiType = 'vision'`
- ✅ `input_tokens > 1000` (imagem + prompt)
- ✅ `cost_usd > 0`

---

### **1.5. PDF Summary** 📄

**Como testar:**
```bash
# Via WhatsApp:
# 1. Envie um PDF (< 20MB)
# 2. Bot deve resumir o conteúdo
```

**Verificar:**
```sql
SELECT
  provider,
  model_name,
  metadata->>'apiType' as api_type,
  metadata->>'filename' as filename,
  input_tokens,
  output_tokens,
  cached_tokens,
  cost_usd,
  cost_brl,
  was_cached,
  created_at
FROM gateway_usage_logs
WHERE client_id = 'seu-client-id'
  AND metadata->>'apiType' = 'pdf_summary'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 3;
```

**Esperado:**
- ✅ 1 linha
- ✅ `provider = 'openai'`
- ✅ `metadata.apiType = 'pdf_summary'`
- ✅ `metadata.filename` presente
- ✅ `input_tokens > 500`
- ✅ `cost_usd > 0`

---

### **1.6. Embeddings** 🧮

**Como testar:**
```bash
# Embeddings são gerados automaticamente quando:
# 1. Você faz upload de documento no Knowledge Base
# 2. Bot busca contexto RAG

# Para testar:
# 1. Acesse: /dashboard/knowledge
# 2. Faça upload de um TXT ou PDF
# 3. Bot gera embeddings
```

**Verificar:**
```sql
SELECT
  provider,
  model_name,
  metadata->>'apiType' as api_type,
  input_tokens,
  cost_usd,
  cost_brl,
  created_at
FROM gateway_usage_logs
WHERE client_id = 'seu-client-id'
  AND metadata->>'apiType' = 'embeddings'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 5;
```

**Esperado:**
- ✅ Múltiplas linhas (1 por chunk)
- ✅ `provider = 'openai'`
- ✅ `model_name = 'text-embedding-3-small'`
- ✅ `metadata.apiType = 'embeddings'`
- ✅ `input_tokens > 0`
- ✅ `cost_usd > 0` (muito baixo, ~$0.00001)

---

## 🎯 FASE 2: Validar Dashboard

### **2.1. Dashboard de Validação**

**Acesse:** http://localhost:3000/dashboard/ai-gateway/validation

**Verificar:**

#### **Cards de Resumo:**
```
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│ Total de Requests   │  │ Custo Total (USD)   │  │ Custo Total (BRL)   │
│                     │  │                     │  │                     │
│     6-10            │  │     $ 0.XX          │  │     R$ X.XX         │
│  Últimas 24h        │  │  Trackado           │  │  Convertido         │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

✅ **Esperado:**
- Requests ≥ 6 (se testou todas as APIs)
- Custo USD > 0
- Custo BRL > 0

#### **Breakdown por Provider:**
```
┌──────────┬──────────┬────────────┬────────────┐
│ Provider │ Requests │ Custo USD  │ Custo BRL  │
├──────────┼──────────┼────────────┼────────────┤
│ openai   │   4-6    │  $ 0.0XX   │  R$ 0.XX   │
│ groq     │   1-2    │  $ 0.0XX   │  R$ 0.XX   │
└──────────┴──────────┴────────────┴────────────┘
```

✅ **Esperado:**
- OpenAI: Whisper + TTS + Vision + PDF + Embeddings
- Groq: Chat

#### **Breakdown por API Type:**
```
┌────────────┬──────────┬────────────┬────────────┐
│ API Type   │ Requests │ Custo USD  │ Custo BRL  │
├────────────┼──────────┼────────────┼────────────┤
│ chat       │   1-2    │  $ 0.0XX   │  R$ 0.XX   │
│ whisper    │   1      │  $ 0.001   │  R$ 0.00   │
│ tts        │   1-2    │  $ 0.0015  │  R$ 0.01   │
│ vision     │   1      │  $ 0.0XX   │  R$ 0.XX   │
│ embeddings │   5-10   │  $ 0.0001  │  R$ 0.00   │
└────────────┴──────────┴────────────┴────────────┘
```

#### **Validações Automáticas:**

✅ **Se tudo OK:**
```
┌────────────────────────────────────────┐
│ ✅ Tracking Validado                   │
│ Todos os custos estão sendo trackados │
│ corretamente!                          │
└────────────────────────────────────────┘

Sugestões:
• ✅ Multi-provider tracking funcionando (2 providers)
• ✅ Tracking de múltiplas APIs funcionando (5-6 tipos)
```

⚠️ **Se houver problemas:**
```
┌────────────────────────────────────────┐
│ ⚠️ Discrepâncias Encontradas           │
│ • X requests com custo zero            │
│ • Conversão BRL pode estar falhando    │
└────────────────────────────────────────┘
```

---

## 🎯 FASE 3: Comparar com Provider Dashboards

### **3.1. OpenAI Dashboard**

**Acesse:** https://platform.openai.com/usage

**Comparar:**
1. Período: Últimas 24h
2. Custos totais
3. Breakdown por modelo

**Verificar:**
- ✅ Custos no seu dashboard ≈ Custos no OpenAI dashboard
- ✅ Margem de erro < 5%

**Se discrepância > 5%:**
- Verificar `cost_usd` em `gateway_usage_logs`
- Verificar pricing em `ai_models_registry`
- Verificar conversão USD → BRL

---

### **3.2. Groq Dashboard**

**Acesse:** https://console.groq.com/usage

**Comparar:**
1. Total de requests
2. Tokens usados
3. Modelos utilizados

**Verificar:**
- ✅ Requests no seu dashboard = Requests no Groq dashboard
- ✅ Tokens similares (margem de 10%)

---

## 🎯 FASE 4: Validar Custos Manualmente

### **SQL de Validação Completa:**

```sql
-- Resumo geral das últimas 24h
SELECT
  COUNT(*) as total_requests,
  COUNT(DISTINCT provider) as providers_count,
  COUNT(DISTINCT model_name) as models_count,
  COUNT(DISTINCT metadata->>'apiType') as api_types_count,
  SUM(input_tokens + output_tokens) as total_tokens,
  SUM(cached_tokens) as total_cached_tokens,
  SUM(cost_usd) as total_cost_usd,
  SUM(cost_brl) as total_cost_brl,
  ROUND(AVG(latency_ms), 0) as avg_latency_ms
FROM gateway_usage_logs
WHERE client_id = 'seu-client-id'
  AND created_at > NOW() - INTERVAL '24 hours';
```

**Esperado:**
```
total_requests: 6-15
providers_count: 2 (openai, groq)
models_count: 4-6
api_types_count: 5-6
total_tokens: > 1000
total_cost_usd: > 0.01
total_cost_brl: > 0.05
```

---

### **Breakdown Detalhado:**

```sql
-- Custos por API type
SELECT
  metadata->>'apiType' as api_type,
  COUNT(*) as requests,
  SUM(cost_usd) as cost_usd,
  SUM(cost_brl) as cost_brl,
  SUM(input_tokens + output_tokens) as tokens
FROM gateway_usage_logs
WHERE client_id = 'seu-client-id'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY metadata->>'apiType'
ORDER BY cost_usd DESC;
```

**Esperado:**
```
api_type    | requests | cost_usd | cost_brl | tokens
------------|----------|----------|----------|---------
chat        |    2     | 0.0200   | 0.10     | 5000
vision      |    1     | 0.0150   | 0.08     | 3000
pdf_summary |    1     | 0.0100   | 0.05     | 2000
tts         |    2     | 0.0030   | 0.02     | 50
whisper     |    1     | 0.0010   | 0.01     | 167
embeddings  |    5     | 0.0001   | 0.00     | 500
```

---

## ✅ Checklist Final de Validação

### **Tracking Funcionando:**
- [ ] Chat (Groq) aparece em `gateway_usage_logs`
- [ ] Whisper aparece em `gateway_usage_logs`
- [ ] TTS aparece em `gateway_usage_logs`
- [ ] TTS cache hit aparece em `gateway_usage_logs`
- [ ] Vision aparece em `gateway_usage_logs`
- [ ] PDF aparece em `gateway_usage_logs`
- [ ] Embeddings aparece em `gateway_usage_logs`

### **Custos Corretos:**
- [ ] `cost_usd > 0` para todas as APIs
- [ ] `cost_brl > 0` para todas as APIs
- [ ] Custos no dashboard ≈ Provider dashboards (margem 5%)
- [ ] Whisper: ~$0.006/min
- [ ] TTS: ~$0.0015-$0.003 por 100 chars
- [ ] Chat: Varia por modelo

### **Dashboard:**
- [ ] Página `/dashboard/ai-gateway/validation` carrega
- [ ] Cards mostram dados corretos
- [ ] Breakdown por provider funciona
- [ ] Breakdown por API type funciona
- [ ] Breakdown detalhado funciona
- [ ] Validações automáticas funcionam
- [ ] Sem alertas de discrepâncias

### **Metadata:**
- [ ] `conversationId` presente quando disponível
- [ ] `phone` presente
- [ ] `metadata.apiType` sempre presente
- [ ] `metadata` tem informações específicas (audioSeconds, textLength, etc)

---

## 🐛 Problemas Comuns e Soluções

### **1. Requests com cost_usd = 0**

**Problema:** Requests aparecem mas custo é zero

**Causas possíveis:**
- Modelo não está em `ai_models_registry`
- Pricing incorreto no registry
- Cálculo de custo com erro

**Solução:**
```sql
-- Verificar se modelo existe
SELECT * FROM ai_models_registry
WHERE model_name = 'nome-do-modelo';

-- Se não existir, adicionar:
INSERT INTO ai_models_registry (
  provider, model_name,
  input_cost_per_1k_tokens, output_cost_per_1k_tokens
) VALUES (
  'openai', 'gpt-4o',
  0.0025, 0.01
);
```

---

### **2. Conversão BRL não funciona**

**Problema:** `cost_brl = 0` mas `cost_usd > 0`

**Causa:** Taxa de câmbio não está sendo buscada

**Solução:**
```sql
-- Verificar taxa atual
SELECT * FROM currency_rates
WHERE from_currency = 'USD'
  AND to_currency = 'BRL'
ORDER BY created_at DESC
LIMIT 1;

-- Se não existir, adicionar manualmente:
INSERT INTO currency_rates (
  from_currency, to_currency, rate
) VALUES (
  'USD', 'BRL', 5.00
);
```

---

### **3. Metadata.apiType ausente**

**Problema:** `metadata->>'apiType'` é NULL

**Causa:** Não está sendo passado no `logGatewayUsage()`

**Solução:** Verificar código em cada arquivo:
- `src/lib/openai.ts` - transcribeAudio
- `src/nodes/convertTextToSpeech.ts` - TTS
- `src/lib/ai-gateway/index.ts` - Chat/Vision/PDF

---

## 🎯 Próximos Passos Após Validação

Quando TUDO estiver ✅:

1. **Documentar resultados** - Adicionar ao CHANGELOG
2. **Commitar mudanças** - Git commit com mensagem clara
3. **Deploy para staging** (se houver)
4. **Ativar FASE 1-3** (Budget blocking) - ÚLTIMO PASSO

---

## 📊 Template de Relatório de Validação

```markdown
# Relatório de Validação - Tracking

**Data:** 2024-12-17
**Testado por:** [seu nome]

## Resumo
- Total de testes: 7
- Sucessos: X
- Falhas: Y

## Detalhes

### Chat (Groq)
- ✅ Aparece em gateway_usage_logs
- ✅ Custo correto
- ✅ Metadata completa

### Whisper
- ✅ Aparece em gateway_usage_logs
- ✅ Custo ~$0.006/min
- ✅ audioSeconds em metadata

[... continuar para todas as APIs]

## Conclusão
✅ APROVADO - Pronto para ativar bloqueio
⚠️ PENDENTE - Ajustes necessários
```

---

**Status:** 📋 Checklist pronta para uso
**Próximo:** Executar testes e preencher checklist

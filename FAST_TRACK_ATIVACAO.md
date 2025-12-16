# 🚀 Como Ativar o Fast Track Router

## 📋 **Checklist de Ativação**

Para o Fast Track funcionar, você precisa configurar **2 NÍVEIS**:

### ✅ **Nível 1: Habilitar o Nó no Flow Architecture**
- **Onde:** Tabela `bot_configurations`
- **Chave:** `flow:node_enabled:fast_track_router`
- **Valor:** `{"enabled": true}`
- **Código:** [flowHelpers.ts:58](src/lib/flowHelpers.ts#L58)
- **Default:** `false` (desabilitado)

### ✅ **Nível 2: Habilitar a Funcionalidade do Fast Track**
- **Onde:** Tabela `bot_configurations`
- **Chave:** `fast_track:enabled`
- **Valor:** `true`
- **Código:** [fastTrackRouter.ts:295-323](src/nodes/fastTrackRouter.ts#L295-L323)
- **Default:** `false` (desabilitado)

### ✅ **Nível 3: Configurar Catálogo de FAQs**
- **Onde:** Tabela `bot_configurations`
- **Chave:** `fast_track:catalog`
- **Valor:** Array JSON com FAQs
- **Obrigatório:** Sim (precisa ter pelo menos 1 FAQ)

---

## 🖥️ **OPÇÃO 1: Ativar via Interface (Recomendado)**

### Passo 1: Acessar Flow Architecture
1. Acesse: `http://localhost:3000/dashboard/flow-architecture`
2. Localize o nó: **"Fast Track Router (FAQ Cache)"**
3. Clique no nó para abrir o painel de propriedades

### Passo 2: Habilitar o Nó
1. No painel lateral direito, procure o **toggle "Enabled"**
2. Ative o toggle (deve ficar verde/azul)
3. Isso habilita o **Nível 1** automaticamente

### Passo 3: Configurar o Fast Track
1. Ainda no painel de propriedades, configure:
   - **Modelo do Roteador:** Selecione `gpt-4o-mini` (ou outro modelo)
   - **Threshold de Similaridade:** `0.80` (recomendado)
   - **Desabilitar Tools:** ✅ Marque (recomendado)

### Passo 4: Adicionar FAQs ao Catálogo
1. Clique em **"Adicionar FAQ"**
2. Preencha:
   - **Tópico:** `faq_planos` (identificador)
   - **Pergunta Canônica:** `Quais são os planos disponíveis?`
   - **Exemplos de Variações:** (uma por linha)
     ```
     pode me mandar o plano?
     quero ver os planos
     tem plano disponível?
     quanto custa?
     ```
3. Adicione mais FAQs conforme necessário

### Passo 5: Salvar Configuração
1. Clique em **"Salvar Configuração"**
2. Aguarde a confirmação
3. A configuração será salva em `bot_configurations`

### Passo 6: Verificar se Está Ativo
1. No Flow Architecture, o nó deve estar:
   - ✅ Com borda verde/azul (habilitado)
   - ✅ Sem badge "Disabled"
2. Se não estiver, recarregue a página (F5)

---

## 💾 **OPÇÃO 2: Ativar via SQL (Rápido)**

### Passo 1: Obter seu Client ID
```sql
-- Substitua 'seu@email.com' pelo seu email
SELECT id, name, slug FROM clients WHERE slug = 'seu-slug';
-- OU
SELECT c.id, c.name, c.slug
FROM clients c
JOIN user_profiles up ON up.client_id = c.id
WHERE up.email = 'seu@email.com';
```

### Passo 2: Executar Script de Ativação
```sql
-- ⚠️ SUBSTITUA 'SEU_CLIENT_ID_AQUI' pelo ID obtido acima

-- 1️⃣ Habilitar Nível 1: Node no Flow
INSERT INTO bot_configurations (client_id, config_key, config_value)
VALUES (
  'SEU_CLIENT_ID_AQUI',
  'flow:node_enabled:fast_track_router',
  '{"enabled": true}'::jsonb
)
ON CONFLICT (client_id, config_key)
DO UPDATE SET
  config_value = '{"enabled": true}'::jsonb,
  updated_at = NOW();

-- 2️⃣ Habilitar Nível 2: Fast Track Config
INSERT INTO bot_configurations (client_id, config_key, config_value)
VALUES (
  'SEU_CLIENT_ID_AQUI',
  'fast_track:enabled',
  'true'::jsonb
)
ON CONFLICT (client_id, config_key)
DO UPDATE SET
  config_value = 'true'::jsonb,
  updated_at = NOW();

-- 3️⃣ Configurar Router Model
INSERT INTO bot_configurations (client_id, config_key, config_value)
VALUES (
  'SEU_CLIENT_ID_AQUI',
  'fast_track:router_model',
  '"gpt-4o-mini"'::jsonb
)
ON CONFLICT (client_id, config_key)
DO UPDATE SET
  config_value = '"gpt-4o-mini"'::jsonb,
  updated_at = NOW();

-- 4️⃣ Configurar Threshold
INSERT INTO bot_configurations (client_id, config_key, config_value)
VALUES (
  'SEU_CLIENT_ID_AQUI',
  'fast_track:similarity_threshold',
  '0.80'::jsonb
)
ON CONFLICT (client_id, config_key)
DO UPDATE SET
  config_value = '0.80'::jsonb,
  updated_at = NOW();

-- 5️⃣ Adicionar Catálogo de FAQs
INSERT INTO bot_configurations (client_id, config_key, config_value)
VALUES (
  'SEU_CLIENT_ID_AQUI',
  'fast_track:catalog',
  '[
    {
      "topic": "faq_planos",
      "canonical": "Quais são os planos disponíveis?",
      "examples": [
        "pode me mandar o plano?",
        "quero ver os planos",
        "tem plano disponível?",
        "quanto custa?"
      ]
    }
  ]'::jsonb
)
ON CONFLICT (client_id, config_key)
DO UPDATE SET
  config_value = '[
    {
      "topic": "faq_planos",
      "canonical": "Quais são os planos disponíveis?",
      "examples": [
        "pode me mandar o plano?",
        "quero ver os planos",
        "tem plano disponível?",
        "quanto custa?"
      ]
    }
  ]'::jsonb,
  updated_at = NOW();

-- 6️⃣ Desabilitar Tools (para cache estável)
INSERT INTO bot_configurations (client_id, config_key, config_value)
VALUES (
  'SEU_CLIENT_ID_AQUI',
  'fast_track:disable_tools',
  'true'::jsonb
)
ON CONFLICT (client_id, config_key)
DO UPDATE SET
  config_value = 'true'::jsonb,
  updated_at = NOW();
```

### Passo 3: Verificar Ativação
```sql
-- Verificar todas as configs
SELECT config_key, config_value, updated_at
FROM bot_configurations
WHERE client_id = 'SEU_CLIENT_ID_AQUI'
  AND (config_key LIKE 'fast_track:%' OR config_key = 'flow:node_enabled:fast_track_router')
ORDER BY config_key;

-- Resultado esperado:
-- fast_track:catalog              → Array com FAQs
-- fast_track:disable_tools        → true
-- fast_track:enabled              → true
-- fast_track:router_model         → "gpt-4o-mini"
-- fast_track:similarity_threshold → 0.80
-- flow:node_enabled:fast_track_router → {"enabled": true}
```

---

## 🔍 **Verificar se Está Funcionando**

### Método 1: Testar via WhatsApp
1. Envie uma mensagem que corresponda a uma FAQ do catálogo
2. Exemplo: "quero ver os planos"
3. Verifique os logs do servidor:
   ```
   📊 [chatbotFlow] NODE 9.5: Fast Track Router
   ✅ shouldFastTrack: true
   🎯 reason: ai_similarity
   📝 topic: faq_planos
   📊 similarity: 0.92
   ```

### Método 2: Verificar Logs do Chatbot
1. Acesse: `http://localhost:3000/dashboard/debug`
2. Filtre por: `fast_track_router`
3. Veja se o nó está executando e retornando `shouldFastTrack: true`

### Método 3: Verificar Analytics
```sql
-- Ver se o Fast Track está sendo usado
SELECT
  COUNT(*) as classifications,
  SUM(total_tokens) as tokens_used,
  AVG(latency_ms) as avg_latency
FROM gateway_usage_logs
WHERE provider = 'openai'
  AND model_name = 'gpt-4o-mini'
  AND client_id = 'SEU_CLIENT_ID_AQUI'
  AND created_at > NOW() - INTERVAL '1 hour';
```

---

## 🐛 **Troubleshooting**

### Problema 1: "Node não está executando"
**Sintoma:** Logs não mostram NODE 9.5

**Solução:**
1. Verificar se Nível 1 está habilitado:
   ```sql
   SELECT config_value FROM bot_configurations
   WHERE client_id = 'SEU_CLIENT_ID_AQUI'
   AND config_key = 'flow:node_enabled:fast_track_router';
   ```
2. Deve retornar: `{"enabled": true}`
3. Se não, execute o SQL de ativação acima
4. Reinicie o servidor Next.js ou aguarde 1 minuto (cache TTL)

### Problema 2: "Node executa mas retorna shouldFastTrack: false"
**Sintoma:** Logs mostram `reason: disabled` ou `reason: no_catalog`

**Solução:**
1. Verificar Nível 2:
   ```sql
   SELECT config_value FROM bot_configurations
   WHERE client_id = 'SEU_CLIENT_ID_AQUI'
   AND config_key = 'fast_track:enabled';
   ```
2. Deve retornar: `true`
3. Verificar catálogo:
   ```sql
   SELECT config_value FROM bot_configurations
   WHERE client_id = 'SEU_CLIENT_ID_AQUI'
   AND config_key = 'fast_track:catalog';
   ```
4. Deve retornar array JSON com FAQs

### Problema 3: "Erro: No API key configured for provider"
**Sintoma:** Fast Track falha ao chamar AI Gateway

**Solução:**
1. Verificar se AI Gateway está configurado:
   - Acesse: `http://localhost:3000/dashboard/ai-gateway/setup`
   - Certifique-se que tem OpenAI API key configurada
2. Verificar se cliente está habilitado para usar gateway:
   ```sql
   SELECT use_ai_gateway FROM clients WHERE id = 'SEU_CLIENT_ID_AQUI';
   ```
3. Se `false`, habilitar:
   ```sql
   UPDATE clients SET use_ai_gateway = true WHERE id = 'SEU_CLIENT_ID_AQUI';
   ```

### Problema 4: "Fast Track sempre retorna low_similarity"
**Sintoma:** `reason: low_similarity`, `similarity: 0.4`

**Solução:**
1. Reduzir threshold:
   ```sql
   UPDATE bot_configurations
   SET config_value = '0.70'::jsonb
   WHERE client_id = 'SEU_CLIENT_ID_AQUI'
   AND config_key = 'fast_track:similarity_threshold';
   ```
2. Adicionar mais exemplos de variações às FAQs
3. Adicionar keywords para prefilter:
   ```sql
   UPDATE bot_configurations
   SET config_value = '["planos", "preço", "valor"]'::jsonb
   WHERE client_id = 'SEU_CLIENT_ID_AQUI'
   AND config_key = 'fast_track:keywords';
   ```

---

## 📊 **Monitoramento**

### Verificar Taxa de Cache Hit
```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE was_cached) as cache_hits,
  ROUND(100.0 * COUNT(*) FILTER (WHERE was_cached) / COUNT(*), 2) as cache_hit_rate_percent
FROM gateway_usage_logs
WHERE client_id = 'SEU_CLIENT_ID_AQUI'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Verificar Economia de Custos
```sql
SELECT
  COUNT(*) FILTER (WHERE was_cached) as cached_requests,
  SUM(cost_brl) FILTER (WHERE was_cached) as cost_saved_brl,
  SUM(total_tokens) FILTER (WHERE was_cached) as tokens_saved
FROM gateway_usage_logs
WHERE client_id = 'SEU_CLIENT_ID_AQUI'
  AND created_at > NOW() - INTERVAL '30 days';
```

---

## 🎯 **Resumo de Tabelas**

| Config Key | Tabela | Tipo | Obrigatório | Default |
|------------|--------|------|-------------|---------|
| `flow:node_enabled:fast_track_router` | `bot_configurations` | `{"enabled": boolean}` | ✅ Sim | `false` |
| `fast_track:enabled` | `bot_configurations` | `boolean` | ✅ Sim | `false` |
| `fast_track:router_model` | `bot_configurations` | `string` | ✅ Sim | `"gpt-4o-mini"` |
| `fast_track:catalog` | `bot_configurations` | `array` | ✅ Sim | `[]` |
| `fast_track:similarity_threshold` | `bot_configurations` | `number` | ❌ Não | `0.80` |
| `fast_track:keywords` | `bot_configurations` | `array` | ❌ Não | `[]` |
| `fast_track:match_mode` | `bot_configurations` | `string` | ❌ Não | `"contains"` |
| `fast_track:disable_tools` | `bot_configurations` | `boolean` | ❌ Não | `true` |

---

## 📝 **Arquivo de Diagnóstico**

Use o arquivo `debug-fast-track.sql` para diagnóstico completo:
```bash
# Execute no Supabase SQL Editor ou psql
psql -U postgres -d sua_db -f debug-fast-track.sql
```

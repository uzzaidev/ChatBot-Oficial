# Qual Migration Rodar?

## ✅ O que você já rodou

Se você já executou estas migrations:
- ✅ `011_analytics_usage_tracking.sql` → Criou tabela `usage_logs`
- ✅ `012_pricing_config.sql` → Criou tabela `pricing_config`

**Você precisa rodar:**
1. ✅ `FIX_pricing_and_analytics.sql` → Corrige RLS e nomes de colunas

## 📋 Scripts Disponíveis

### 1. `FIX_pricing_and_analytics.sql` (OBRIGATÓRIO)

**Execute este primeiro!**

```sql
-- Este script corrige:
-- ✅ RLS policies (user_profiles ao invés de auth.users)
-- ✅ Função get_usage_by_conversation (telefone::TEXT)
-- ✅ Nomes de conversas (usa clientes_whatsapp)
```

**Quando rodar**: AGORA (se ainda não rodou)

---

### 2. `ADD_operation_type_helpers.sql` (OPCIONAL)

**Execute este depois do FIX**

```sql
-- Este script adiciona:
-- ✅ Função get_usage_by_operation_type (query por tipo)
-- ✅ Função backfill_operation_type (preenche logs antigos)
-- ✅ Queries de exemplo para analytics
```

**Quando rodar**: Opcional, só se quiser separar melhor os tipos de operação

---

## 🔍 Como saber se precisa rodar

### Teste 1: RLS está funcionando?

```sql
-- Teste no Supabase SQL Editor
SELECT * FROM pricing_config LIMIT 1;
```

- ✅ Retornou dados → RLS OK
- ❌ Erro `permission denied` → **Rode FIX_pricing_and_analytics.sql**

---

### Teste 2: Nomes aparecem corretamente?

```sql
-- Teste no Supabase SQL Editor
SELECT * FROM get_usage_by_conversation(
  (SELECT id FROM clients LIMIT 1),
  30,
  10
);
```

- ✅ Nomes aparecem → Query OK
- ❌ Todos "Sem nome" → **Rode FIX_pricing_and_analytics.sql**

---

### Teste 3: Whisper está salvando?

```sql
-- Veja se tem logs de whisper
SELECT * FROM usage_logs WHERE source = 'whisper' ORDER BY created_at DESC LIMIT 5;
```

- ✅ Tem dados → Tracking funcionando
- ❌ Vazio → Ainda não enviou áudio (normal)

---

## 📊 Estrutura Atual da Tabela

```sql
-- usage_logs (criada pela migration 011)
CREATE TABLE usage_logs (
  id UUID,
  client_id UUID,
  phone TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('openai', 'groq', 'whisper', 'meta')),
  model TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  cost_usd NUMERIC,
  metadata JSONB,  -- ← Aqui vai operation_type
  created_at TIMESTAMPTZ
)
```

**Campo `source` aceita**:
- ✅ `'openai'` → GPT-4o (Vision, PDF, Chat)
- ✅ `'groq'` → Llama 3.3 70B (Chat)
- ✅ `'whisper'` → Whisper (Áudio)
- ✅ `'meta'` → Mensagens WhatsApp

**Não precisa criar nova coluna!** Use o campo `metadata` (JSONB) para armazenar:
```json
{
  "operation_type": "transcription" | "vision" | "pdf_summary" | "chat" | "embedding"
}
```

---

## 🎯 Ordem de Execução Recomendada

```bash
1. FIX_pricing_and_analytics.sql       # OBRIGATÓRIO (corrige RLS e queries)
2. ADD_operation_type_helpers.sql      # OPCIONAL (adiciona helpers)
```

---

## ⚡ Execução Rápida

```sql
-- =====================================================
-- COPIE E COLE NO SUPABASE SQL EDITOR
-- =====================================================

-- 1. Rodar FIX (obrigatório)
-- Cole o conteúdo de: migrations/FIX_pricing_and_analytics.sql

-- 2. Verificar RLS
SELECT
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE tablename = 'pricing_config'
ORDER BY policyname;

-- Deve retornar 4 políticas:
-- ✅ Users can delete own client pricing config
-- ✅ Users can insert own client pricing config
-- ✅ Users can update own client pricing config
-- ✅ Users can view own client pricing config

-- 3. Verificar nomes
SELECT * FROM get_usage_by_conversation(
  (SELECT id FROM clients LIMIT 1),
  30,
  10
);

-- Deve mostrar nomes reais (não "Sem nome")

-- 4. (OPCIONAL) Rodar operation_type helpers
-- Cole o conteúdo de: migrations/ADD_operation_type_helpers.sql

-- 5. (OPCIONAL) Preencher logs antigos
SELECT backfill_operation_type();

-- 6. (OPCIONAL) Ver uso por tipo
SELECT * FROM get_usage_by_operation_type(
  (SELECT id FROM clients LIMIT 1),
  30
);
```

---

## ✅ Resultado Esperado

Após rodar `FIX_pricing_and_analytics.sql`:
- ✅ Modal de preços abre sem erro
- ✅ Nomes dos clientes aparecem na tabela
- ✅ Tracking de tokens funciona (Whisper, Vision, PDF, Chat)

Após rodar `ADD_operation_type_helpers.sql` (opcional):
- ✅ Pode consultar uso por tipo de operação
- ✅ Logs antigos ganham operation_type automaticamente
- ✅ Queries mais detalhadas no analytics

---

## 🐛 Troubleshooting

**Erro: "permission denied for table users"**
→ Rode `FIX_pricing_and_analytics.sql`

**Erro: "column cw.phone does not exist"**
→ Rode `FIX_pricing_and_analytics.sql`

**Erro: "operator does not exist: text = numeric"**
→ Rode `FIX_pricing_and_analytics.sql`

**Nomes aparecem como "Sem nome"**
→ Rode `FIX_pricing_and_analytics.sql`

**Tokens não estão sendo registrados**
→ Código TypeScript já está corrigido, basta enviar mensagens

---

## 📝 Conclusão

**RODE AGORA:**
```sql
migrations/FIX_pricing_and_analytics.sql
```

**RODE DEPOIS (opcional):**
```sql
migrations/ADD_operation_type_helpers.sql
```

Pronto! 🚀

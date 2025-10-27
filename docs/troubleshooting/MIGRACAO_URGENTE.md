# 🚨 MIGRAÇÃO URGENTE - Resolver Travamento no NODE 3

## 🎯 PROBLEMA IDENTIFICADO

**Webhook trava em NODE 3** porque:
1. ❌ Nome da tabela tem espaço → TypeScript usa `any` → perde type safety
2. ❌ Webhook retornava sem aguardar → Processo serverless terminava prematuramente
3. ❌ Query ficava "órfã" e nunca completava

**Dashboard funciona** porque:
- ✅ Executa nodes sequencialmente
- ✅ Aguarda cada node completar
- ✅ Não tem problema de processo ser terminado

## ✅ SOLUÇÃO IMPLEMENTADA (2 Partes)

### PARTE 1: Corrigir Webhook (JÁ FEITO ✅)
- `src/app/api/webhook/route.ts` agora usa `await processChatbotMessage(body)`
- Garante que NODE 3 completa antes do processo terminar

### PARTE 2: Migration do Banco (VOCÊ PRECISA RODAR)
- Renomeia `"Clientes WhatsApp"` → `clientes_whatsapp`
- Remove necessidade de `any` no TypeScript
- Cria VIEW de compatibilidade (n8n continua funcionando)

---

## 📋 PASSO A PASSO (EXECUTE AGORA)

### PASSO 1: Backup (Segurança)

Execute no **Supabase SQL Editor**:

```sql
-- Fazer backup
CREATE TABLE "Clientes WhatsApp_backup" AS
SELECT * FROM "Clientes WhatsApp";

-- Verificar
SELECT COUNT(*) as total_backup FROM "Clientes WhatsApp_backup";
SELECT COUNT(*) as total_original FROM "Clientes WhatsApp";
```

**✅ Deve retornar o mesmo número em ambos**

---

### PASSO 2: Executar Migration

Cole TUDO no **Supabase SQL Editor** e execute:

```sql
-- =====================================================
-- Migration: Renomear tabela para remover espaço
-- =====================================================

-- 1. Renomear tabela
ALTER TABLE "Clientes WhatsApp" RENAME TO clientes_whatsapp;

-- 2. Renomear primary key
ALTER TABLE clientes_whatsapp
RENAME CONSTRAINT "Clientes WhatsApp_pkey" TO clientes_whatsapp_pkey;

-- 3. Criar VIEW de compatibilidade (n8n continua funcionando)
CREATE OR REPLACE VIEW "Clientes WhatsApp" AS
SELECT
  telefone,
  nome,
  status,
  created_at
FROM clientes_whatsapp;

-- 4. Função para INSERT via VIEW
CREATE OR REPLACE FUNCTION clientes_whatsapp_view_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO clientes_whatsapp (telefone, nome, status, created_at)
  VALUES (NEW.telefone, NEW.nome, NEW.status, COALESCE(NEW.created_at, NOW()))
  ON CONFLICT (telefone)
  DO UPDATE SET
    nome = COALESCE(EXCLUDED.nome, clientes_whatsapp.nome),
    status = COALESCE(EXCLUDED.status, clientes_whatsapp.status);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger para tornar VIEW atualizável
CREATE TRIGGER clientes_whatsapp_view_insert_trigger
  INSTEAD OF INSERT ON "Clientes WhatsApp"
  FOR EACH ROW
  EXECUTE FUNCTION clientes_whatsapp_view_insert();

-- 6. Função para UPDATE via VIEW
CREATE OR REPLACE FUNCTION clientes_whatsapp_view_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE clientes_whatsapp
  SET
    telefone = NEW.telefone,
    nome = NEW.nome,
    status = NEW.status,
    created_at = NEW.created_at
  WHERE telefone = OLD.telefone;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger para UPDATE
CREATE TRIGGER clientes_whatsapp_view_update_trigger
  INSTEAD OF UPDATE ON "Clientes WhatsApp"
  FOR EACH ROW
  EXECUTE FUNCTION clientes_whatsapp_view_update();

-- 8. Verificação final
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'clientes_whatsapp') THEN
    RAISE EXCEPTION 'ERRO: Tabela clientes_whatsapp não foi criada';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'Clientes WhatsApp') THEN
    RAISE EXCEPTION 'ERRO: VIEW "Clientes WhatsApp" não foi criada';
  END IF;

  RAISE NOTICE '✅ ✅ ✅ MIGRATION CONCLUÍDA COM SUCESSO! ✅ ✅ ✅';
  RAISE NOTICE 'Tabela nova: clientes_whatsapp (sem espaço)';
  RAISE NOTICE 'VIEW compatível: "Clientes WhatsApp" (n8n continua funcionando)';
END $$;
```

**✅ Deve ver**: `MIGRATION CONCLUÍDA COM SUCESSO!`

---

### PASSO 3: Verificar Migration

```sql
-- Teste 1: Tabela nova funciona
SELECT * FROM clientes_whatsapp LIMIT 5;

-- Teste 2: VIEW funciona (compatibilidade)
SELECT * FROM "Clientes WhatsApp" LIMIT 5;

-- Teste 3: INSERT via VIEW funciona
INSERT INTO "Clientes WhatsApp" (telefone, nome, status)
VALUES ('5511000000000', 'Teste Migration', 'bot')
ON CONFLICT (telefone) DO NOTHING;

-- Teste 4: Verificar se foi para tabela nova
SELECT * FROM clientes_whatsapp WHERE telefone = '5511000000000';
```

**✅ Todos devem funcionar**

---

### PASSO 4: Testar Aplicação

```bash
# 1. Iniciar servidor (ou reiniciar se já está rodando)
npm run dev

# 2. Testar node isolado
curl -X POST http://localhost:3000/api/test/nodes/check-customer \
  -H "Content-Type: application/json" \
  -d '{"input": {"phone": "5511999998888", "name": "Teste Pos Migration"}}'
```

**Logs esperados**:
```
[checkOrCreateCustomer] 🔍 INICIANDO UPSERT (via Supabase)
[checkOrCreateCustomer] 📱 Phone: 5511999998888
[checkOrCreateCustomer] 👤 Name: Teste Pos Migration
[checkOrCreateCustomer] 🚀 Executando UPSERT via Supabase...
[Supabase] 🆕 Criando novo cliente (ou ♻️ Reutilizando)
[checkOrCreateCustomer] ✅ UPSERT SUCESSO em 180ms  ← RÁPIDO!
```

**Resposta esperada**:
```json
{
  "success": true,
  "output": {
    "phone": "5511999998888",
    "name": "Teste Pos Migration",
    "status": "bot"
  }
}
```

---

### PASSO 5: Testar Webhook (O TESTE REAL)

```bash
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "5511999997777",
            "type": "text",
            "text": {"body": "Teste webhook pos migration"}
          }],
          "contacts": [{
            "profile": {"name": "Usuario Teste Final"}
          }]
        }
      }]
    }]
  }'
```

**Logs esperados** (COMPLETO, sem travar):
```
🚀🚀🚀 [WEBHOOK POST] FUNÇÃO INICIADA! 🚀🚀🚀
[WEBHOOK] ✅ Body parseado com sucesso!
[chatbotFlow] Starting message processing

NODE 1: Filter Status Updates... ✅
NODE 2: Parse Message... ✅
NODE 3: Check/Create Customer...
  [checkOrCreateCustomer] 🔍 INICIANDO UPSERT (via Supabase)
  [checkOrCreateCustomer] 🚀 Executando UPSERT via Supabase...
  [checkOrCreateCustomer] ✅ UPSERT SUCESSO em 250ms  ← DEVE PASSAR!
NODE 4: Download Media... ✅
NODE 5: Normalize Message... ✅
NODE 6: Push to Redis... ✅
NODE 7: Save User Message... ✅
NODE 8: Batch Messages... ✅ (espera 10s)
NODE 9: Get Chat History... ✅
NODE 10: Get RAG Context... ✅
NODE 11: Generate AI Response... ✅
NODE 12: Format Response... ✅
NODE 13: Send WhatsApp Message... ✅

[WEBHOOK] ✅ Processamento concluído com sucesso!
```

**✅ Se NODE 3 passar em ~200-500ms, PROBLEMA RESOLVIDO!**

---

## 🚨 Se Ainda Travar

### Diagnóstico 1: Verificar RLS

```sql
-- Ver se RLS está ativo
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'clientes_whatsapp';

-- Se rowsecurity = true, desabilitar:
ALTER TABLE clientes_whatsapp DISABLE ROW LEVEL SECURITY;
```

### Diagnóstico 2: Ver Queries Ativas

```sql
-- Ver o que está travando
SELECT
  pid,
  usename,
  state,
  query,
  wait_event_type,
  wait_event,
  query_start,
  NOW() - query_start as duration
FROM pg_stat_activity
WHERE datname = 'postgres'
  AND state != 'idle'
  AND query ILIKE '%clientes_whatsapp%'
ORDER BY query_start DESC;
```

### Diagnóstico 3: Matar Queries Travadas

```sql
-- CUIDADO: Só execute se realmente necessário
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'postgres'
  AND state = 'active'
  AND query ILIKE '%clientes_whatsapp%'
  AND query_start < NOW() - INTERVAL '1 minute';
```

---

## 🔄 Reverter Migration (Se Necessário)

Se algo der errado:

```sql
-- 1. Dropar VIEW e triggers
DROP TRIGGER IF EXISTS clientes_whatsapp_view_insert_trigger ON "Clientes WhatsApp";
DROP TRIGGER IF EXISTS clientes_whatsapp_view_update_trigger ON "Clientes WhatsApp";
DROP VIEW IF EXISTS "Clientes WhatsApp";
DROP FUNCTION IF EXISTS clientes_whatsapp_view_insert();
DROP FUNCTION IF EXISTS clientes_whatsapp_view_update();

-- 2. Renomear de volta
ALTER TABLE clientes_whatsapp RENAME TO "Clientes WhatsApp";
ALTER TABLE "Clientes WhatsApp"
RENAME CONSTRAINT clientes_whatsapp_pkey TO "Clientes WhatsApp_pkey";

-- 3. Verificar
SELECT COUNT(*) FROM "Clientes WhatsApp";
```

---

## 📊 Resumo das Mudanças

| Arquivo | Mudança | Status |
|---------|---------|--------|
| `src/app/api/webhook/route.ts` | Adicionado `await` | ✅ FEITO |
| `src/nodes/checkOrCreateCustomer.ts` | Usa `clientes_whatsapp` | ✅ FEITO |
| Banco: `"Clientes WhatsApp"` | Renomeado | ⏳ VOCÊ PRECISA RODAR |
| Banco: VIEW | Criada | ⏳ VOCÊ PRECISA RODAR |

---

## ✅ CHECKLIST FINAL

- [ ] Fazer backup da tabela
- [ ] Executar migration SQL (Passo 2)
- [ ] Ver mensagem "MIGRATION CONCLUÍDA COM SUCESSO"
- [ ] Testar node isolado (Passo 4)
- [ ] Testar webhook completo (Passo 5)
- [ ] Ver logs "UPSERT SUCESSO em XXms"
- [ ] Confirmar que NODE 3 não trava mais

---

## 🎯 RESULTADO ESPERADO

**ANTES**:
```
NODE 3: Check/Create Customer...
  [checkOrCreateCustomer] 🚀 Executando UPSERT via Supabase...
  ⏳ TRAVA AQUI PARA SEMPRE
```

**DEPOIS**:
```
NODE 3: Check/Create Customer...
  [checkOrCreateCustomer] 🚀 Executando UPSERT via Supabase...
  [checkOrCreateCustomer] ✅ UPSERT SUCESSO em 210ms  ✅
NODE 4: Download Media... ✅
... continua normalmente ...
```

---

## 🚀 EXECUTE AGORA!

1. **Abra Supabase SQL Editor**: https://app.supabase.com/project/_/sql
2. **Execute o Passo 1** (backup)
3. **Execute o Passo 2** (migration)
4. **Execute os Passos 4 e 5** (testes)
5. **Me envie os logs** se algo não funcionar

**Tempo estimado**: 5 minutos ⏱️

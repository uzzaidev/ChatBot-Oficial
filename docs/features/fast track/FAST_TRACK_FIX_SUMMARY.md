# 🔧 Fast Track Fix - Resumo Completo

## 🐛 **Problema Identificado**

Clientes que configuraram o Fast Track via Flow Architecture UI tinham:
- ✅ Todas as configs `fast_track:*` (catalog, router_model, threshold, etc)
- ❌ **MAS não tinham** `flow:node_enabled:fast_track_router`

**Resultado:** O node não executava no `chatbotFlow.ts` porque `shouldExecuteNode()` retornava `false`.

---

## ✅ **Correções Aplicadas**

### **1. Front-End Fix ([FastTrackRouterProperties.tsx:324-328](src/components/flow-architecture/properties/FastTrackRouterProperties.tsx#L324-L328))**

**O que mudou:**
```typescript
// ❌ ANTES: Só salvava as configs fast_track:*
await updateNodeConfig(nodeId, updatedConfig)

// ✅ DEPOIS: Auto-habilita o node ao salvar
await toggleNodeEnabled(nodeId, true)  // 🔧 FIX
await updateNodeConfig(nodeId, updatedConfig)
```

**Benefício:**
- Quando o usuário salvar a configuração do Fast Track, o nó será **automaticamente habilitado**
- Não depende mais do toggle funcionar corretamente
- UX melhor: "configurei → salvei → funciona"

---

### **2. Migration para Clientes Existentes**

**Arquivo:** [`supabase/migrations/20251216134414_fix_fast_track_node_enabled.sql`](supabase/migrations/20251216134414_fix_fast_track_node_enabled.sql)

**O que faz:**
```sql
-- Para cada cliente que tem fast_track:enabled = true
-- Criar flow:node_enabled:fast_track_router = true (se não existir)
INSERT INTO bot_configurations (...)
SELECT ...
FROM bot_configurations bc
WHERE bc.config_key = 'fast_track:enabled'
  AND bc.config_value = 'true'::jsonb
  AND NOT EXISTS (...flow:node_enabled:fast_track_router...)
```

**Como aplicar:**
```bash
npx supabase db push
```

**Benefício:**
- Clientes que já configuraram Fast Track terão o node habilitado automaticamente
- Zero configuração manual necessária em produção

---

### **3. SQL para Testar Agora**

Para o seu cliente de teste (`b21b314f-c49a-467d-94b3-a21ed4412227`):

```sql
-- Inserir o Nível 1 que está faltando
INSERT INTO bot_configurations (
  client_id,
  config_key,
  config_value,
  is_default,
  category,
  description
) VALUES (
  'b21b314f-c49a-467d-94b3-a21ed4412227',
  'flow:node_enabled:fast_track_router',
  '{"enabled": true}'::jsonb,
  false,
  'rules',
  'Node enabled state for fast_track_router'
);

-- Corrigir o modelo (GPT-5-nano não existe!)
UPDATE bot_configurations
SET config_value = '"gpt-4o-mini"'::jsonb
WHERE client_id = 'b21b314f-c49a-467d-94b3-a21ed4412227'
  AND config_key = 'fast_track:router_model';
```

---

## 📋 **Checklist de Testes**

### **Passo 1: Execute o SQL acima**
```bash
# No Supabase SQL Editor
# Copie e execute o SQL da seção 3
```

### **Passo 2: Aguarde 1 minuto OU reinicie o servidor**
```bash
# Opção A: Aguardar cache TTL (60 segundos)
# Opção B: Reiniciar Next.js
# Ctrl+C e depois npm run dev
```

### **Passo 3: Teste enviando mensagem FAQ**
Envie: "quais são os serviços?"

**Logs esperados:**
```
[10:29:43] 9. Batch Messages ✅
[10:29:44] 9.5. Fast Track Router ✅ ← DEVE APARECER!
           shouldFastTrack: true
           reason: ai_similarity
           similarity: 0.92
[10:29:45] 10. Get Chat History (skipped: fast_track) ⏭️
[10:29:45] 11. Get RAG Context (skipped: fast_track) ⏭️
[10:29:46] 12. Generate AI Response ✅
```

### **Passo 4: Aplicar migration em produção**
```bash
npx supabase db push
```

---

## 🎯 **Para Futuros Clientes**

Com as correções aplicadas:

1. **Cliente acessa:** `/dashboard/flow-architecture`
2. **Clica no nó:** Fast Track Router
3. **Configura:** Modelo, threshold, catálogo de FAQs
4. **Clica:** "Salvar Configuração"
5. **✅ Funciona imediatamente!** Sem precisar clicar no toggle

---

## 📊 **Verificação em Produção**

Query para ver quantos clientes usam Fast Track:

```sql
SELECT
  c.name as client_name,
  c.slug as client_slug,
  EXISTS(
    SELECT 1 FROM bot_configurations
    WHERE client_id = c.id
      AND config_key = 'fast_track:enabled'
      AND config_value = 'true'::jsonb
  ) as has_fast_track,
  EXISTS(
    SELECT 1 FROM bot_configurations
    WHERE client_id = c.id
      AND config_key = 'flow:node_enabled:fast_track_router'
      AND config_value->>'enabled' = 'true'
  ) as has_node_enabled,
  (
    SELECT jsonb_array_length(config_value)
    FROM bot_configurations
    WHERE client_id = c.id
      AND config_key = 'fast_track:catalog'
  ) as num_faqs
FROM clients c
WHERE EXISTS(
  SELECT 1 FROM bot_configurations
  WHERE client_id = c.id
    AND config_key LIKE 'fast_track:%'
)
ORDER BY c.created_at DESC;
```

---

## 📁 **Arquivos Modificados**

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/components/flow-architecture/properties/FastTrackRouterProperties.tsx` | Fix | Auto-enable node ao salvar config |
| `supabase/migrations/20251216134414_fix_fast_track_node_enabled.sql` | Migration | Habilitar node para clientes existentes |
| `FAST_TRACK_FIX_SUMMARY.md` | Docs | Este documento |

---

## 🚀 **Próximos Passos**

1. ✅ Execute o SQL de teste (seção 3)
2. ✅ Verifique se Fast Track está funcionando
3. ✅ Aplique migration: `npx supabase db push`
4. ✅ Commit das alterações:
   ```bash
   git add .
   git commit -m "fix: auto-enable Fast Track node when saving config + migration"
   git push
   ```
5. ✅ Deploy em produção

---

## 💡 **Lições Aprendidas**

### **Problema de UX:**
- Toggle no painel pai (FlowArchitecturePropertiesPanel) vs configs no painel filho (FastTrackRouterProperties)
- Usuário precisa clicar em 2 lugares diferentes
- Confuso e propenso a erros

### **Solução:**
- Auto-enable quando salvar config (mais intuitivo)
- Migration para corrigir clientes existentes
- Futuro: considerar remover toggle e sempre habilitar quando houver configs

### **Aprendizado:**
- Sempre testar fluxo completo end-to-end
- Verificar se configs estão sendo persistidas no banco
- Usar migrations para correções retroativas

---

## ❓ **FAQ**

### **Q: E se o cliente quiser desabilitar o Fast Track?**
A: Pode clicar no toggle "Status do Node" para desabilitar. Agora o toggle funcionará corretamente porque o node já está habilitado.

### **Q: E se deletar as configs fast_track:*?**
A: O node continuará habilitado (`flow:node_enabled:fast_track_router = true`), mas não fará nada porque as configs estão vazias. Para desabilitar completamente, use o toggle.

### **Q: Preciso recriar todos os nós?**
A: Não! Só o Fast Track tinha esse bug porque o default é `enabled: false` no metadata. Outros nós têm `enabled: true` por padrão.

---

**Fim do Resumo** 🎉

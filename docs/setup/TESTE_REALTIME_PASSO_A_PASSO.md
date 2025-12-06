# 🧪 Teste de Realtime - Passo a Passo

## ✅ Status Atual

- ✅ Broadcast **CONECTANDO** com sucesso (`SUBSCRIBED`)
- ❌ Mensagens **NÃO APARECEM** na conversa aberta
- ⚠️ Dashboard **PISCA** mas não mostra preview

Agora vamos descobrir **ONDE** está o problema!

---

## 🔍 Passo 1: Verificar se Triggers Existem

### Opção A: Via Endpoint (Rápido)

1. Abra no navegador:
```
http://localhost:3000/api/test/realtime-status
```

2. **Resultado esperado:**
```json
{
  "triggers": {
    "status": "✅",
    "found": [...]
  },
  "functions": {
    "status": "✅",
    "found": [...]
  },
  "overallStatus": "✅ Tudo OK!"
}
```

3. **Se ver "❌ Configuração incompleta":**
   - Aplique a migration: `supabase/migrations/20250125_realtime_broadcast_clean.sql`
   - Execute: `supabase db push`
   - Ou copie e cole o SQL no Supabase Dashboard

### Opção B: Via SQL (Manual)

No Supabase Dashboard > SQL Editor, execute:

```sql
-- Verificar triggers
SELECT
  trigger_name,
  event_object_table,
  '✅' as status
FROM information_schema.triggers
WHERE trigger_name IN ('broadcast_message_trigger', 'broadcast_conversation_trigger')
  AND trigger_schema = 'public';
```

**Deve retornar 2 linhas:**
```
broadcast_message_trigger       | n8n_chat_histories
broadcast_conversation_trigger  | clientes_whatsapp
```

---

## 🧪 Passo 2: Testar Broadcast com Mensagem Real

### 2.1 Abrir Conversa com Console

1. Abra a conversa:
```
http://localhost:3000/dashboard/chat?phone=555499250023&client_id=b21b314f-c49a-467d-94b3-a21ed4412227
```

2. Abra o Console (F12)

3. Verifique que aparece:
```
📡 [Realtime] Connecting to broadcast: messages:...
✅ [Realtime] Successfully connected to broadcast!
```

### 2.2 Inserir Mensagem de Teste

Em **OUTRA ABA**, abra:
```
http://localhost:3000/api/test/broadcast?phone=555499250023&client_id=b21b314f-c49a-467d-94b3-a21ed4412227
```

### 2.3 Analisar Logs

Volte para a aba da conversa e procure no console:

#### ✅ **Cenário IDEAL (funciona):**
```
✅ [Realtime] Broadcast received: {...}
📦 [Realtime] Payload structure: {...}
🔍 [Realtime] Parsed - type: INSERT, data: {...}
✅ [Realtime] Message is for current conversation! Processing...
📨 [Realtime] New message created: {...}
📞 [Realtime] Calling onNewMessage callback...
✅ [Realtime] Callback executed!
```
→ **Mensagem DEVE aparecer na tela!**

#### ⚠️ **Cenário 1: Broadcast não chega**
```
(nenhum log de broadcast)
```
→ **Problema: Trigger não está emitindo!**
- Execute Passo 3 abaixo

#### ⚠️ **Cenário 2: Broadcast chega mas session_id diferente**
```
✅ [Realtime] Broadcast received: {...}
⚠️ [Realtime] Message for different session. Expected: 555499250023, Got: 123456789
```
→ **Problema: Telefone incorreto na mensagem**
- Verifique o telefone no teste

#### ⚠️ **Cenário 3: Callback não está registrado**
```
✅ [Realtime] Broadcast received: {...}
...
⚠️ [Realtime] No callback function registered!
```
→ **Problema: Hook não foi integrado corretamente**
- Verifique se `ConversationDetail` tem `useRealtimeMessages`

---

## 🔧 Passo 3: Se Trigger Não Está Emitindo

### 3.1 Verificar se Trigger Existe

```sql
SELECT
  tgname as trigger_name,
  tgenabled as enabled,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'n8n_chat_histories'
  AND tgname LIKE '%broadcast%';
```

**Deve retornar:**
```
broadcast_message_trigger | O | broadcast_message_change
```
- `O` = Enabled (ATIVO)

### 3.2 Testar Trigger Manualmente

Execute este SQL e veja se aparece erro:

```sql
-- Inserir mensagem de teste
INSERT INTO n8n_chat_histories (session_id, message, client_id, created_at)
VALUES (
  '555499250023',
  '{"type": "ai", "content": "Teste manual de trigger"}'::jsonb,
  'b21b314f-c49a-467d-94b3-a21ed4412227'::uuid,
  NOW()
);
```

**Se der erro:**
- Copie a mensagem de erro
- Verifique se a função `broadcast_message_change()` existe:

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'broadcast_message_change';
```

### 3.3 Recriar Triggers (Última Tentativa)

Copie e execute TODO o SQL da migration:
```
supabase/migrations/20250125_realtime_broadcast_clean.sql
```

---

## 📊 Passo 4: Debugar Payload do Broadcast

Se o broadcast está chegando mas a mensagem não aparece, veja o **payload structure** no console.

### Formato Esperado:

```json
{
  "event": "broadcast",
  "payload": {
    "type": "INSERT",
    "new": {
      "id": 123,
      "session_id": "555499250023",
      "message": {
        "type": "ai",
        "content": "Mensagem aqui"
      },
      "client_id": "uuid",
      "created_at": "2025-01-25T..."
    }
  }
}
```

**Verifique:**
- ✅ `payload.type` = `"INSERT"`
- ✅ `payload.new.session_id` = telefone correto
- ✅ `payload.new.message` = objeto JSON (não string)

### Se Payload Está Diferente:

**Problema 1: `payload.new` não existe**
→ Trigger não está usando `realtime.broadcast_changes()` corretamente

**Problema 2: `session_id` é string mas phone é number**
→ Adicione `.toString()` na comparação

**Problema 3: `message` é string, não objeto**
→ Já tratado no código (faz JSON.parse)

---

## 🎯 Checklist de Verificação

Marque o que já verificou:

- [ ] Endpoint `/api/test/realtime-status` retorna `✅ Tudo OK!`
- [ ] Triggers existem no banco (query SQL acima)
- [ ] Console mostra `SUBSCRIBED` ao abrir conversa
- [ ] Teste `/api/test/broadcast` insere mensagem sem erro
- [ ] Console mostra `✅ [Realtime] Broadcast received:` após teste
- [ ] Console mostra `📞 [Realtime] Calling onNewMessage callback...`
- [ ] Console mostra `✅ [Realtime] Callback executed!`
- [ ] Mensagem aparece na tela

---

## 🆘 Possíveis Problemas e Soluções

| Sintoma | Causa Provável | Solução |
|---------|---------------|---------|
| SUBSCRIBED mas nenhum broadcast chega | Trigger não existe ou desabilitado | Aplicar migration novamente |
| Broadcast chega mas session_id diferente | Telefone errado no teste | Usar telefone correto |
| Broadcast chega mas callback não executa | Hook não integrado | Verificar ConversationDetail |
| Callback executa mas nada acontece | handleNewMessage com problema | Verificar console por erros |
| Dashboard pisca mas preview não atualiza | clientes_whatsapp não atualiza | Ver Passo 5 |

---

## 📱 Passo 5: Corrigir Preview no Dashboard

O dashboard "pisca" porque o broadcast chega, mas o preview não atualiza.

**Causa:** A tabela `clientes_whatsapp` não está sendo atualizada com a última mensagem.

**Solução:** Criar um trigger que atualiza `clientes_whatsapp` quando mensagem chega:

```sql
-- TODO: Criar trigger para atualizar última mensagem
-- (Implementar se necessário)
```

---

## 🎬 Resumo dos Endpoints de Teste

| Endpoint | O Que Faz |
|----------|-----------|
| `/api/test/realtime-status` | Verifica se triggers e funções existem |
| `/api/test/broadcast?phone=X&client_id=Y` | Insere mensagem de teste |

---

## 📝 Próximos Passos

1. Execute Passo 1 (verificar triggers)
2. Execute Passo 2 (testar broadcast)
3. Analise os logs do console
4. **COPIE OS LOGS** e me envie se precisar de ajuda
5. Identifique qual cenário se encaixa

**Cole aqui os logs que aparecem no console quando você executa o teste!**

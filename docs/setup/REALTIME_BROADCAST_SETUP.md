# Configuração Realtime com Broadcast (FREE Tier Compatible)

## 📋 Resumo das Mudanças

Implementação de realtime usando **broadcast channels** ao invés de `postgres_changes`, garantindo compatibilidade com FREE tier do Supabase e eliminando loops infinitos de reconexão.

---

## ✅ O Que Foi Feito

### 1. **Atualização dos Hooks** (SEM LOOPS INFINITOS)

#### `src/hooks/useRealtimeMessages.ts`
- ✅ Mudou de `postgres_changes` para `broadcast`
- ✅ Remove retry loops - tenta conectar UMA VEZ
- ✅ Se falhar, aceita o erro e deixa polling como fallback
- ✅ Reconecta APENAS se canal foi fechado + app resume/network change
- ✅ Usa `hasAttemptedRef` para prevenir múltiplas tentativas

**Principais mudanças:**
```typescript
// ANTES (loop infinito)
.on('postgres_changes', { event: 'INSERT', ... })
.subscribe((status) => {
  if (status === 'CLOSED') {
    setTimeout(() => setRetryCount(prev => prev + 1), 100) // LOOP!
  }
})

// DEPOIS (sem loop)
.on('broadcast', { event: '*' })
.subscribe((status) => {
  if (status === 'CLOSED') {
    console.warn('Using polling fallback') // Aceita o erro
  }
})
```

#### `src/hooks/useRealtimeConversations.ts`
- ✅ Mesmas melhorias do useRealtimeMessages
- ✅ Escuta broadcast no canal `conversations:{clientId}`
- ✅ Sem retry loops

### 2. **Integração no ConversationDetail**

- ✅ Adicionado `useRealtimeMessages` hook
- ✅ `handleNewMessage` processa broadcasts em tempo real
- ✅ Combina mensagens: fetched + realtime + optimistic
- ✅ Remove duplicatas por ID

---

## 🗄️ Configuração do Banco de Dados

### Passo 1: Aplicar Migration de Broadcast Triggers

Execute a migration que cria os triggers automáticos:

```bash
# Opção A: Via Supabase CLI
supabase db push

# Opção B: Via SQL Editor no Dashboard
# Copie e execute: supabase/migrations/20250125_realtime_broadcast_clean.sql
```

**O que essa migration faz:**
1. Remove triggers antigos (evita duplicatas)
2. Cria função `broadcast_message_change()` para n8n_chat_histories
3. Cria função `broadcast_conversation_change()` para clientes_whatsapp
4. Cria triggers AFTER INSERT/UPDATE/DELETE que chamam `realtime.broadcast_changes()`

### Passo 2: Verificar Triggers

Execute no SQL Editor:

```sql
-- Verificar se triggers foram criados
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  '✅' as status
FROM information_schema.triggers
WHERE event_object_table IN ('n8n_chat_histories', 'clientes_whatsapp')
  AND trigger_schema = 'public'
  AND trigger_name LIKE 'broadcast%'
ORDER BY event_object_table, trigger_name;
```

**Resultado esperado:**
```
broadcast_message_trigger       | INSERT, UPDATE, DELETE | n8n_chat_histories
broadcast_conversation_trigger  | INSERT, UPDATE, DELETE | clientes_whatsapp
```

### Passo 3: Verificar Funções

```sql
-- Verificar se funções foram criadas
SELECT
  routine_name,
  '✅' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'broadcast%'
ORDER BY routine_name;
```

**Resultado esperado:**
```
broadcast_conversation_change
broadcast_message_change
```

---

## 🧪 Como Testar

### Teste 1: Realtime de Mensagens

1. Abra duas abas/janelas com a mesma conversa
2. Em uma aba, envie uma mensagem via webhook ou manualmente no banco:

```sql
-- Inserir mensagem de teste
INSERT INTO n8n_chat_histories (session_id, message, client_id, created_at)
VALUES (
  '555499567051',  -- Telefone da conversa
  '{"type": "ai", "content": "Teste de broadcast em tempo real!"}'::jsonb,
  'seu-client-id-uuid',
  NOW()
);
```

3. **Resultado esperado:**
   - ✅ Mensagem aparece em TODAS as abas abertas
   - ✅ Console mostra: `✅ [Realtime] Broadcast received:`
   - ✅ SEM loops de reconexão

### Teste 2: Realtime de Conversas (Lista)

1. Abra a lista de conversas (`/conversations`)
2. Atualize o status de uma conversa no banco:

```sql
-- Atualizar conversa de teste
UPDATE clientes_whatsapp
SET status = 'humano'
WHERE telefone = 555499567051
  AND client_id = 'seu-client-id-uuid';
```

3. **Resultado esperado:**
   - ✅ Lista atualiza automaticamente
   - ✅ Console mostra: `✅ [Realtime Conversations] Broadcast received:`
   - ✅ SEM loops de reconexão

### Teste 3: Verificar Logs no Console

Ao abrir uma conversa, você deve ver:

```
📡 [Realtime] Connecting to broadcast: messages:{clientId}:{phone}
📡 [Realtime] Status: SUBSCRIBED
✅ [Realtime] Successfully connected to broadcast!
```

**Se não conectar:**
```
📡 [Realtime] Status: CLOSED
⚠️ [Realtime] Connection CLOSED. Using polling fallback.
```
- Isso é OK! O polling vai funcionar automaticamente
- Verifique se as migrations foram aplicadas

---

## 🔧 Troubleshooting

### Problema: "Connection CLOSED"

**Causa:** Triggers não foram criados ou não estão funcionando

**Solução:**
1. Execute novamente a migration: `20250125_realtime_broadcast_clean.sql`
2. Verifique triggers e funções (comandos SQL acima)
3. Reinicie o app: `npm run dev`

### Problema: "Broadcast received mas mensagem não aparece"

**Causa:** Filtro de `session_id` ou `client_id` incorreto

**Solução:**
1. Verifique console: `⚠️ [Realtime] Message for different session, ignoring`
2. Confirme que `session_id` na mensagem = `phone` na conversa
3. Confirme que `client_id` na mensagem = `clientId` do usuário logado

### Problema: Loop infinito de reconexão

**Causa:** Hooks antigos ainda no código

**Solução:**
1. Verifique que NÃO há `setRetryCount` ou `setTimeout` nos hooks
2. Confirme que `hasAttemptedRef.current` está sendo usado
3. Limpe cache do Next.js: `rm -rf .next && npm run dev`

### Problema: Mensagens duplicadas

**Causa:** Broadcast recebe o mesmo evento múltiplas vezes

**Solução:**
- ✅ Já tratado no código com `exists` check em `handleNewMessage`
- Verifique que não há múltiplas instâncias do hook rodando

---

## 📊 Arquitetura do Sistema

```
┌─────────────────────┐
│  Webhook/API        │
│  Recebe mensagem    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Database           │
│  INSERT INTO        │
│  n8n_chat_histories │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Database Trigger   │
│  broadcast_message_ │
│  change()           │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Supabase Realtime  │
│  realtime.broadcast │
│  _changes()         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Frontend Hook      │
│  useRealtimeMessages│
│  .on('broadcast')   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  ConversationDetail │
│  Atualiza UI        │
└─────────────────────┘
```

---

## 🎯 Vantagens da Nova Implementação

1. ✅ **FREE Tier Compatible** - Não requer replication habilitada
2. ✅ **Sem Loops Infinitos** - Tenta conectar uma vez, se falhar aceita
3. ✅ **Fallback Automático** - Polling funciona se broadcast falhar
4. ✅ **Performance** - Broadcast é mais leve que postgres_changes
5. ✅ **Escalável** - Funciona com múltiplos clientes (multi-tenant)
6. ✅ **Mobile Ready** - Reconecta apenas quando necessário (app resume, network change)

---

## 📝 Checklist de Deploy

Antes de fazer deploy em produção:

- [ ] Aplicar migration `20250125_realtime_broadcast_clean.sql`
- [ ] Verificar triggers criados (SQL query acima)
- [ ] Testar em ambiente local primeiro
- [ ] Confirmar que NÃO há loops no console
- [ ] Testar com múltiplas abas abertas
- [ ] Testar reconexão mobile (pause/resume app)
- [ ] Verificar logs de erro no Supabase Dashboard

---

## 🔗 Arquivos Modificados

1. `src/hooks/useRealtimeMessages.ts` - Hook de mensagens com broadcast
2. `src/hooks/useRealtimeConversations.ts` - Hook de conversas com broadcast
3. `src/components/ConversationDetail.tsx` - Integração do hook
4. `supabase/migrations/20250125_realtime_broadcast_clean.sql` - Migration de triggers

---

## 📚 Referências

- [Supabase Realtime Broadcast](https://supabase.com/docs/guides/realtime/broadcast)
- [Database Triggers](https://supabase.com/docs/guides/database/postgres/triggers)
- [Realtime Free Tier Limits](https://supabase.com/docs/guides/realtime/rate-limits)

---

## 🆘 Suporte

Se encontrar problemas:

1. Verifique logs do console (F12)
2. Verifique Supabase Dashboard > Logs
3. Execute queries de verificação (seção "Configuração do Banco de Dados")
4. Confirme que NÃO há retry loops

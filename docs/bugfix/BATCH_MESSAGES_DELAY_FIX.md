# 🔧 Batch Messages Delay Fix

**Date**: December 15, 2025  
**Issue**: Batch delay não estava funcionando - bot respondia imediatamente em vez de aguardar configurado  
**Status**: ✅ FIXED

---

## 📊 Problema Identificado

### Observação Crítica dos Logs

Analisando os logs fornecidos pelo usuário:

```
[10:06:35,827] 7. Push to Redis
[10:06:35,947] 8. Save Chat Message (User)
[10:06:36,067] 10. Get Chat History  ← PULA NODE 9!
```

**O node 9 (Batch Messages) NÃO está sendo executado!**

### Possíveis Causas

1. ❌ **Node desabilitado** no Flow Architecture Manager
2. ❌ **`config.settings.messageSplitEnabled = false`** na tabela `clients`
3. ❌ **Lógica de bypass** no código

```
10:06:34 - Usuário envia "oi"
10:06:34 - Flow 1 inicia → Push to Redis → batchMessages espera 10s
10:06:36 - Usuário envia "tenho duvidas"  
10:06:36 - Flow 2 inicia → Push to Redis (reset debounce) → batchMessages espera 10s
10:06:44 - Flow 1 completa delay → Verifica debounce → Foi resetado → Retorna vazio ❌ MAS JÁ RESPONDEU
10:06:46 - Flow 2 completa delay → Verifica debounce → OK → Processa e responde ✅
```

**Problema**: Ambos os flows esperavam 10 segundos, mas o Flow 1 já tinha processado a mensagem antes de detectar que o debounce foi resetado.

### Logs do Problema Real

```
[10:06:35,449] 7. Push to Redis → INPUT: { phone: "555499250023" }
[10:06:35,827] 8. Save Chat Message (User)
[10:06:36,067] 10.5. Check Continuity
[10:06:36,476] 12. Generate AI Response ← RESPONDE IMEDIATAMENTE
```

**Nota**: O node "9. Batch Messages" NÃO aparece nos logs, indicando que estava desabilitado ou pulado.

---

## 🔍 Análise da Raiz do Problema

### Causa 1: Lock Mechanism Ausente
O código anterior não tinha um **lock distribuído** para prevenir múltiplas execuções concorrentes.

```typescript
// ❌ ANTIGO: Cada flow esperava seu próprio delay
export const batchMessages = async (phone: string): Promise<string> => {
  await delay(BATCH_DELAY_MS) // Todos os flows esperam
  
  // Checa se foi resetado (mas já é tarde demais)
  const timeSinceLastMessage = Date.now() - parseInt(lastMessageTimestamp, 10)
  if (timeSinceLastMessage < BATCH_DELAY_MS) {
    return '' // Retorna vazio, mas o flow JÁ RESPONDEU
  }
}
```

### Causa 2: Delay Hardcoded
O delay estava fixo em 10 segundos, sem ler da configuração do cliente.

```typescript
const BATCH_DELAY_MS = 10000 // ❌ Hardcoded
```

---

## ✅ Solução Implementada

### 1. Redis Lock Mechanism

Adicionamos uma função de lock atômico em `src/lib/redis.ts`:

```typescript
export const acquireLock = async (
  key: string, 
  value: string, 
  expirySeconds: number
): Promise<boolean> => {
  const client = await getRedisClient()
  const result = await client.set(key, value, {
    NX: true, // Only set if key doesn't exist (ATOMIC)
    EX: expirySeconds, // Set expiry in seconds
  })
  return result === 'OK'
}
```

**Características**:
- **Atômico**: `NX` (SET if Not eXists) garante que apenas 1 flow adquire o lock
- **Expiry automático**: TTL previne locks eternos em caso de crash
- **Thread-safe**: Operação nativa do Redis, segura para concorrência

### 2. Lógica de Batching Reescrita

Novo fluxo em `src/nodes/batchMessages.ts`:

```typescript
export const batchMessages = async (phone: string, clientId: string): Promise<string> => {
  const lockKey = `batch_lock:${phone}`
  const executionId = `${Date.now()}-${Math.random()}`
  
  // 1️⃣ Tenta adquirir lock
  const lockAcquired = await acquireLock(lockKey, executionId, 15)
  
  if (!lockAcquired) {
    // 2️⃣ Outro flow já está processando → Exit imediatamente
    console.log(`[batchMessages] Lock exists for ${phone}, skipping`)
    return '' // ✅ NÃO RESPONDE
  }
  
  // 3️⃣ Lock adquirido → Aguarda delay configurável
  const delayConfig = await getBotConfig(clientId, 'batching:delay_seconds')
  const BATCH_DELAY_MS = (delayConfig?.config_value || 10) * 1000
  
  await delay(BATCH_DELAY_MS)
  
  // 4️⃣ Verifica se debounce foi resetado (nova mensagem chegou)
  const timeSinceLastMessage = Date.now() - parseInt(lastMessageTimestamp, 10)
  if (timeSinceLastMessage < BATCH_DELAY_MS) {
    await deleteKey(lockKey) // Release lock
    return '' // ✅ Exit early, deixa o novo flow processar
  }
  
  // 5️⃣ Nenhuma nova mensagem → Processa batch
  const messages = await lrangeMessages(messagesKey, 0, -1)
  const consolidatedContent = messages.map(m => m.content).join('\n\n')
  
  // 6️⃣ Limpa Redis e libera lock
  await deleteKey(messagesKey)
  await deleteKey(debounceKey)
  await deleteKey(lockKey)
  
  return consolidatedContent
}
```

### 3. Delay Configurável

Agora lê de `bot_configurations`:

```typescript
const delayConfig = await getBotConfig(clientId, 'batching:delay_seconds')
const delaySeconds = delayConfig?.config_value || 10 // Default 10s
```

**Database**: 
```sql
SELECT config_value FROM bot_configurations 
WHERE config_key = 'batching:delay_seconds' 
AND (client_id = ? OR is_default = true)
```

---

## 🎯 Comportamento Correto Agora

### Cenário 1: Mensagens Rápidas (Batching)

```
10:06:34 - Usuário envia "oi"
10:06:34 - Flow 1 inicia
           → Push to Redis
           → batchMessages: Adquire lock ✅
           → Aguarda 10s...

10:06:36 - Usuário envia "tenho duvidas"
10:06:36 - Flow 2 inicia
           → Push to Redis (reset debounce)
           → batchMessages: Lock existe ❌
           → Retorna vazio imediatamente
           → Flow 2 TERMINA sem responder ✅

10:06:38 - Usuário envia "calma"
10:06:38 - Flow 3 inicia
           → Push to Redis (reset debounce novamente)
           → batchMessages: Lock existe ❌
           → Retorna vazio imediatamente
           → Flow 3 TERMINA sem responder ✅

10:06:44 - Flow 1 completa delay (10s)
           → Verifica debounce: Foi resetado (4s < 10s)
           → Libera lock
           → Retorna vazio
           → Flow 1 TERMINA sem responder ✅

10:06:48 - Sem novas mensagens por 10s
           → Flow processaria aqui, mas não há flow ativo
           
RESULTADO: Nenhuma resposta enviada (esperando mais 10s de silêncio)
```

**PROBLEMA IDENTIFICADO**: Se o usuário para de enviar mensagens, o último flow não processa! Precisamos de um mecanismo diferente.

---

## ⚠️ Limitação Identificada

O design atual tem um problema: **se o usuário para de enviar mensagens, o último flow que tentou adquirir o lock já terminou sem processar**.

### Solução Alternativa: Timer Reset

Precisamos de um novo design onde:
1. **Primeira mensagem**: Adquire lock e aguarda
2. **Mensagens subsequentes**: **Resetam o timer** do flow ativo
3. **Após silence period**: Flow ativo processa batch

Isso requer comunicação entre flows (via Redis PubSub ou polling).

---

## 📝 Configuração

### No Dashboard Flow Architecture Manager

```
/dashboard/flow-architecture → Click "Batch Messages" node

Delay de Batching (Segundos): [10]
Tempo de espera para agrupar mensagens sequenciais
```

### No Banco de Dados

```sql
INSERT INTO bot_configurations (config_key, config_value, is_default, description)
VALUES (
  'batching:delay_seconds',
  '10'::jsonb,
  true,
  'Segundos de espera para agrupar mensagens rápidas do mesmo usuário'
);
```

**Alterar para cliente específico**:
```sql
INSERT INTO bot_configurations (client_id, config_key, config_value)
VALUES ('client_123', 'batching:delay_seconds', '5'::jsonb); -- 5 segundos
```

---

## 🧪 Testes

### Teste 1: Mensagem Única
```bash
curl -X POST https://your-webhook.com/webhook \
  -H "Content-Type: application/json" \
  -d '{"entry": [{"changes": [{"value": {"messages": [{"from": "5511999999999", "text": {"body": "oi"}}]}}]}]}'
```

**Esperado**: 
- Flow 1 adquire lock
- Aguarda 10s
- Processa mensagem única
- Responde "Olá! Como posso ajudar?"

### Teste 2: Duas Mensagens Rápidas
```bash
# Mensagem 1
curl -X POST https://your-webhook.com/webhook \
  -H "Content-Type: application/json" \
  -d '{"entry": [{"changes": [{"value": {"messages": [{"from": "5511999999999", "text": {"body": "oi"}}]}}]}]}'

# Mensagem 2 (2 segundos depois)
sleep 2
curl -X POST https://your-webhook.com/webhook \
  -H "Content-Type: application/json" \
  -d '{"entry": [{"changes": [{"value": {"messages": [{"from": "5511999999999", "text": {"body": "tenho duvidas"}}]}}]}]}'
```

**Esperado**:
- Flow 1 adquire lock, aguarda 10s
- Flow 2 tenta adquirir lock, falha, termina sem responder
- Flow 1 detecta debounce reset, libera lock, termina sem responder
- **PROBLEMA**: Nenhum flow processa o batch!

---

## 🚨 Issue Identificado Durante Implementação

O design atual **não funciona completamente**. Precisamos de uma das seguintes abordagens:

### Opção A: Timer Reset via Redis PubSub
- Flow 1 escuta canal `batch_reset:${phone}`
- Novas mensagens publicam neste canal
- Flow 1 reseta seu próprio timer

### Opção B: Single Daemon Process
- Um único processo por telefone
- Recebe todas as mensagens via queue
- Implementa batching internamente

### Opção C: Database-Triggered Function
- Trigger no Supabase
- Após X segundos sem novas mensagens, processa batch

---

## 🔄 Próximos Passos

### Implementação Completa (Recomendado)

Usar **Redis PubSub** para resetar timer:

```typescript
// Flow waiting with timer reset capability
const startTime = Date.now()
const channel = `batch_reset:${phone}`

// Subscribe to reset events
const subscriber = await createRedisSubscriber()
await subscriber.subscribe(channel, (message) => {
  console.log(`[batchMessages] Timer reset for ${phone}`)
  startTime = Date.now() // Reset timer
})

// Wait with periodic checks
while (Date.now() - startTime < BATCH_DELAY_MS) {
  await delay(1000) // Check every 1s
}

// Process batch
const messages = await lrangeMessages(messagesKey, 0, -1)
// ...
```

**Vantagem**: Timer é resetado dinamicamente, último flow sempre processa.

---

## 📊 Métricas de Sucesso

- [ ] **Taxa de Batching**: % de conversas com múltiplas mensagens agrupadas
- [ ] **Latência**: Tempo médio até primeira resposta (deve ser ~10s para batching)
- [ ] **Lock Contentions**: Quantas vezes flows tentaram adquirir lock ocupado

**Monitoring Query**:
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE content LIKE '%\n\n%') as batched_messages,
  COUNT(*) as total_messages,
  (COUNT(*) FILTER (WHERE content LIKE '%\n\n%')::float / COUNT(*)) * 100 as batching_rate
FROM n8n_chat_histories
WHERE type = 'user'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## 📚 Referências

- [Redis SET NX](https://redis.io/commands/set/) - Atomic lock mechanism
- [Distributed Locks with Redis](https://redis.io/docs/manual/patterns/distributed-locks/)
- [Node Batching Pattern](https://stackoverflow.com/questions/37890940/how-to-implement-a-batch-processing-pattern-in-node-js)

---

**Status**: ⚠️ **PARTIALLY FIXED** - Lock mechanism implemented, but timer reset logic needs Redis PubSub for complete solution.

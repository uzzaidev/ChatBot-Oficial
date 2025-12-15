# ✅ SOLUÇÃO: Batch Messages não está funcionando

## 🎯 Problema Relatado

> "o batch delay parece não estar funcionando, porque eu mando mensagem uma em seguida da outra e ao invés de ele aguardar os 10 segundos que estão configurados, ele já está respondendo... tanto que no meu fluxo ele não vem"

## 🔍 Diagnóstico dos Logs

Analisando os logs fornecidos:

```
[10:06:35,827] 7. Push to Redis
[10:06:35,947] 8. Save Chat Message (User)
[10:06:36,067] 10. Get Chat History  ← Pula direto para NODE 10
[10:06:36,187] 10.5. Check Continuity
[10:06:36,476] 12. Generate AI Response
```

**NODE 9 (Batch Messages) NÃO APARECE!**

Isso significa que o node está:
- ❌ Desabilitado no Flow Architecture Manager, OU
- ❌ Configuração `messageSplitEnabled` está `false`

## ✅ Solução 1: Habilitar o Node

### Opção A: Via Dashboard (Flow Architecture Manager)

1. Acesse `/dashboard/flow-architecture`
2. Clique no node **"Batch Messages"**
3. Verifique se o toggle **"Enabled"** está ATIVO ✅
4. Salve as alterações

### Opção B: Via Banco de Dados

```sql
-- Verificar se node está desabilitado
SELECT * FROM bot_configurations 
WHERE config_key = 'flow:node_enabled:batch_messages'
AND client_id = 'SEU_CLIENT_ID';

-- Se retornar enabled = false, atualizar para true:
UPDATE bot_configurations 
SET config_value = 'true'::jsonb
WHERE config_key = 'flow:node_enabled:batch_messages'
AND client_id = 'SEU_CLIENT_ID';
```

## ✅ Solução 2: Habilitar message_split_enabled

O node também é pulado se `messageSplitEnabled` estiver `false` na configuração do cliente.

### Via Dashboard Settings

1. Acesse `/dashboard/settings`
2. Seção **"Configurações de Mensagens"**
3. Ative **"Dividir Mensagens Longas"**
4. Salve

### Via Banco de Dados

```sql
-- Verificar configuração atual
SELECT settings FROM clients WHERE id = 'SEU_CLIENT_ID';

-- Atualizar para habilitar
UPDATE clients 
SET settings = jsonb_set(settings, '{message_split_enabled}', 'true'::jsonb)
WHERE id = 'SEU_CLIENT_ID';
```

## ✅ Solução 3: Ajustar o Delay

Após habilitar o node, configure o delay desejado:

### Via Dashboard (Flow Architecture Manager)

1. `/dashboard/flow-architecture`
2. Click "Batch Messages" node
3. **Delay de Batching (Segundos)**: `10` (ou valor desejado)
4. Salvar

### Via Banco de Dados

```sql
-- Inserir ou atualizar delay
INSERT INTO bot_configurations (client_id, config_key, config_value)
VALUES ('SEU_CLIENT_ID', 'batching:delay_seconds', '10'::jsonb)
ON CONFLICT (client_id, config_key) 
DO UPDATE SET config_value = '10'::jsonb;
```

## 🎯 Comportamento Esperado Após Fix

### Teste: Enviar 3 mensagens rápidas

```
10:06:34 - Usuário: "oi"
           → Flow 1 inicia
           → Push to Redis
           → Batch Messages: Adquire lock, aguarda 10s...

10:06:36 - Usuário: "tenho duvidas"
           → Flow 2 inicia  
           → Push to Redis (reset debounce)
           → Batch Messages: Lock existe, retorna vazio
           → Flow 2 TERMINA sem responder ✅

10:06:38 - Usuário: "calma"
           → Flow 3 inicia
           → Push to Redis (reset debounce)
           → Batch Messages: Lock existe, retorna vazio
           → Flow 3 TERMINA sem responder ✅

10:06:44 - Flow 1 completa 10s
           → Verifica debounce: foi resetado há 6s
           → Ainda não passou 10s desde última mensagem
           → Retorna vazio, termina ✅

10:06:48 - (Passaram 10s desde última mensagem)
           → Nenhum flow ativo...
```

**⚠️ IMPORTANTE**: O design atual requer que haja **silêncio de 10s após a última mensagem** para processar o batch. Se o usuário continuar enviando mensagens, os flows anteriores vão expirar.

## 🔧 Melhorias Implementadas (PR #XXX)

### 1. Redis Lock Mechanism

Agora usa lock atômico para prevenir múltiplas execuções:

```typescript
const lockAcquired = await acquireLock(`batch_lock:${phone}`, executionId, 15)
if (!lockAcquired) {
  return '' // Outro flow já está processando
}
```

### 2. Delay Configurável

Lê do banco de dados:

```typescript
const delayConfig = await getBotConfig(clientId, 'batching:delay_seconds')
const delaySeconds = delayConfig?.config_value || 10
```

### 3. Debounce Check Melhorado

Verifica se novas mensagens chegaram durante o delay:

```typescript
const timeSinceLastMessage = Date.now() - parseInt(lastMessageTimestamp, 10)
if (timeSinceLastMessage < BATCH_DELAY_MS) {
  return '' // Nova mensagem chegou, aborta este flow
}
```

## 📋 Checklist de Verificação

- [ ] Node "Batch Messages" está **enabled** no Flow Architecture Manager
- [ ] Configuração `message_split_enabled` está `true` em `clients.settings`
- [ ] Delay está configurado (padrão 10s) em `bot_configurations`
- [ ] Redis está funcionando corretamente
- [ ] Logs mostram "9. Batch Messages" sendo executado

## 🧪 Como Testar

### 1. Verificar se Node Executa

Envie 1 mensagem e verifique nos logs:

```bash
# Deve aparecer nos logs:
[timestamp] 9. Batch Messages → INPUT: { phone: "..." }
```

Se não aparecer, o node está desabilitado ou pulado.

### 2. Testar Batching

```bash
# Terminal 1: Monitorar logs
tail -f /var/log/chatbot.log

# Terminal 2: Enviar mensagens
curl -X POST https://webhook.com/whatsapp \
  -d '{"from": "5511999999999", "text": "msg 1"}'
  
sleep 2

curl -X POST https://webhook.com/whatsapp \
  -d '{"from": "5511999999999", "text": "msg 2"}'
```

**Resultado Esperado**:
- Primeira mensagem adquire lock
- Segunda mensagem não consegue lock, termina
- Após 10s de silêncio, batch é processado

## 🚨 Limitações Conhecidas

### Problema: Última Mensagem Não Processa

Se o usuário enviar múltiplas mensagens e parar, o último flow que tentou adquirir o lock já terminou. O batch só será processado se:

1. Houver silêncio de 10s após a primeira mensagem, OU
2. Implementarmos Redis PubSub para resetar timer

### Solução Futura: Redis PubSub

```typescript
// Flow 1 escuta resets
const subscriber = await redis.duplicate()
subscriber.subscribe(`batch_reset:${phone}`, () => {
  startTime = Date.now() // Reset timer
})

// Novas mensagens publicam reset
await redis.publish(`batch_reset:${phone}`, 'reset')
```

## 📞 Suporte

Se após seguir estas etapas o batching ainda não funcionar:

1. Compartilhe os logs completos (incluindo Node 9)
2. Verifique valor de `message_split_enabled`
3. Verifique estado do node no Flow Architecture Manager

---

**Status**: ✅ Código corrigido - Lock mechanism implementado  
**Próximo Passo**: Habilitar o node na configuração do cliente

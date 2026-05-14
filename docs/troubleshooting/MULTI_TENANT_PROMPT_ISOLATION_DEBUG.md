# 🔐 DEBUG: Isolamento de Prompts Multi-Tenant

## Problema Relatado

Cliente **SPORTS TRAINING** (`59ed984e-85f4-4784-ae76-2569371296af`) está recebendo respostas com o **prompt de outro cliente**.

**GRAVIDADE**: 🔴 CRÍTICA - Vazamento de dados entre clientes (multi-tenant isolation breach)

---

## Checklist de Diagnóstico

### 1. Verificar Dados no Banco de Dados

Execute o script SQL: `db/check_client_prompts.sql`

```bash
# Abrir SQL Editor no Supabase
https://app.supabase.com/project/_/sql
```

**O que verificar**:

- ✅ Cliente `59ed984e-85f4-4784-ae76-2569371296af` existe na tabela `clients`?
- ✅ Campo `system_prompt` está preenchido corretamente?
- ✅ Prompts dos dois clientes são **diferentes**?
- ❌ Se prompts forem **idênticos** → problema está na criação do cliente

---

### 2. Verificar Logs em Tempo Real

Código atualizado com logs de debug. Execute:

```bash
# 1. Reiniciar servidor de desenvolvimento
npm run dev

# 2. Enviar mensagem de teste via WhatsApp para o cliente SPORTS TRAINING

# 3. Observar logs no terminal
```

**Logs esperados**:

```
🔍 [WEBHOOK/59ed984e-85f4-4784-ae76-2569371296af] CONFIG LOADED FROM DB:
  Client Name: SPORTS TRAINING TREINAMENTO INTELIGENTE
  Client Slug: sports-training-treinamento-inteligente
  System Prompt Preview: [primeiros 150 caracteres do prompt do cliente]
  Prompt Length: XXXX chars

🔍 [generateAIResponse] DEBUG CONFIG:
  Client ID: 59ed984e-85f4-4784-ae76-2569371296af
  Client Name: SPORTS TRAINING TREINAMENTO INTELIGENTE
  Provider: groq
  System Prompt Preview (first 150 chars): [primeiros 150 caracteres]
  System Prompt Length: XXXX chars
  Using DEFAULT_SYSTEM_PROMPT: false
```

**Cenários possíveis**:

#### ❌ Cenário 1: Client ID está ERRADO nos logs

```
Client ID: b21b314f-c49a-467d-94b3-a21ed4412227  ← OUTRO CLIENTE!
```

**Causa**: Webhook está sendo chamado com client_id errado na URL
**Solução**: Verificar URL configurada no Meta Dashboard (deve ser `/api/webhook/59ed984e-85f4-4784-ae76-2569371296af`)

#### ❌ Cenário 2: Prompt está IGUAL ao do outro cliente

```
System Prompt Preview: ## Papel\nVocê é o assistente principal...  ← PROMPT DO LUIS BOFF!
```

**Causa**: Prompt não foi customizado para o cliente SPORTS TRAINING
**Solução**: Atualizar prompt via Settings (`/dashboard/settings`)

#### ❌ Cenário 3: `Using DEFAULT_SYSTEM_PROMPT: true`

```
Using DEFAULT_SYSTEM_PROMPT: true
```

**Causa**: Campo `system_prompt` está NULL no banco
**Solução**: Executar UPDATE no banco para preencher o prompt

---

### 3. Verificar URL do Webhook no Meta Dashboard

**CRITICAL**: Cada cliente DEVE ter seu próprio webhook URL

```
Cliente Default:
https://uzzap.uzzai.com/api/webhook/b21b314f-c49a-467d-94b3-a21ed4412227

Cliente SPORTS TRAINING:
https://uzzap.uzzai.com/api/webhook/59ed984e-85f4-4784-ae76-2569371296af
                                          ↑
                                          DEVE SER DIFERENTE!
```

**Como verificar**:

1. Abrir Meta Developer Console: https://developers.facebook.com/apps/
2. Selecionar App do cliente SPORTS TRAINING
3. WhatsApp → Configuration
4. Verificar "Callback URL"

**Se URL estiver errada**:

```
❌ https://uzzap.uzzai.com/api/webhook/b21b314f-c49a-467d-94b3-a21ed4412227
   (usando client_id do outro cliente!)

✅ https://uzzap.uzzai.com/api/webhook/59ed984e-85f4-4784-ae76-2569371296af
   (client_id correto)
```

---

### 4. Verificar Cache (se aplicável)

O sistema NÃO tem cache de `ClientConfig`, mas verificar:

```typescript
// src/lib/config.ts - NÃO tem cache de getClientConfig
// src/lib/config.ts - Tem cache de getBotConfig (5 minutos TTL)
```

**Para forçar limpeza de cache de bot configs**:

```sql
-- Não é possível limpar via SQL (cache é em memória Node.js)
-- Solução: Reiniciar servidor
```

---

## Soluções Rápidas

### Solução 1: Atualizar Prompt do Cliente SPORTS TRAINING

```sql
-- Executar no Supabase SQL Editor
UPDATE public.clients
SET
  system_prompt = 'SEU_PROMPT_CUSTOMIZADO_AQUI',
  updated_at = NOW()
WHERE id = '59ed984e-85f4-4784-ae76-2569371296af';
```

### Solução 2: Corrigir URL do Webhook

1. Meta Developer Console → WhatsApp → Configuration
2. Atualizar "Callback URL" para:
   ```
   https://uzzap.uzzai.com/api/webhook/59ed984e-85f4-4784-ae76-2569371296af
   ```
3. Salvar e re-verificar webhook

### Solução 3: Verificar Isolamento Total

```sql
-- Garantir que cada cliente tem dados únicos
SELECT
  id,
  name,
  LEFT(system_prompt, 50) as prompt_preview,
  meta_phone_number_id,
  status
FROM public.clients
WHERE status = 'active'
ORDER BY created_at DESC;
```

**Cada cliente DEVE ter**:

- ✅ `id` único (UUID diferente)
- ✅ `system_prompt` diferente (ou pelo menos customizado)
- ✅ `meta_phone_number_id` diferente
- ✅ Webhook URL diferente no Meta Dashboard

---

## Código Responsável pelo Isolamento

### 1. Webhook recebe clientId da URL

```typescript
// src/app/api/webhook/[clientId]/route.ts
export async function POST(
  request: NextRequest,
  { params }: { params: { clientId: string } }  ← Client ID vem da URL!
) {
  const { clientId } = params  ← Extrai do path
  const config = await getClientConfig(clientId)  ← Busca config do cliente
  // ...
  await processChatbotMessage(body, config)  ← Passa config para flow
}
```

### 2. Config é buscado do banco por client_id

```typescript
// src/lib/config.ts
export const getClientConfig = async (clientId: string) => {
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)  ← Filtra por client_id
    .eq('status', 'active')
    .single()

  // ...descriptografa secrets e retorna config
}
```

### 3. Prompt é usado na geração da resposta

```typescript
// src/nodes/generateAIResponse.ts
export const generateAIResponse = async (input: GenerateAIResponseInput) => {
  const { config } = input
  const systemPrompt = config.prompts.systemPrompt  ← Usa prompt do config

  const messages = [
    { role: 'system', content: systemPrompt }  ← Injeta no chat
  ]
  // ...chama Groq/OpenAI
}
```

---

## Garantias de Isolamento

**O sistema garante isolamento se**:

1. ✅ Cada cliente tem webhook URL com `client_id` único
2. ✅ Cada mensagem usa o `config` carregado do banco via `client_id`
3. ✅ Não há cache compartilhado entre clientes
4. ✅ Cada cliente tem `system_prompt` diferente no banco

**Pontos de falha possíveis**:

1. ❌ Webhook configurado com `client_id` errado no Meta Dashboard
2. ❌ Prompt não foi customizado (todos os clientes têm o mesmo prompt)
3. ❌ Erro no código que sobrescreve `config` (não deveria acontecer)

---

## Próximos Passos

1. **Execute o SQL**: `db/check_client_prompts.sql` e verifique os dados
2. **Envie mensagem de teste** com logs habilitados
3. **Compartilhe os logs** completos (especialmente as linhas `🔍 [WEBHOOK/...]` e `🔍 [generateAIResponse]`)
4. **Verifique URL** do webhook no Meta Dashboard

---

## Logs para Compartilhar

Se o problema persistir, compartilhe:

```bash
# 1. Output do SQL
# Resultado de: db/check_client_prompts.sql

# 2. Logs do servidor ao processar mensagem
# Terminal output após enviar mensagem de teste

# 3. URL do webhook configurada no Meta Dashboard
# WhatsApp → Configuration → Callback URL
```

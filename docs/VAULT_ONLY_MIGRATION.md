# Migração para Vault-Only (Sem .env Fallbacks)

## Data: 2025-10-29

## Resumo das Mudanças

Este documento detalha as mudanças implementadas para **remover completamente os fallbacks de .env** e **forçar o uso exclusivo do Supabase Vault** para todas as credenciais (OpenAI, Groq, Meta Access Token, Meta Phone Number ID, etc.).

---

## ⚠️ BREAKING CHANGES

### 1. **Credenciais devem estar configuradas no Vault**

**ANTES**: Sistema usava fallback para .env se credenciais não existissem no Vault
```typescript
const finalOpenaiKey = secrets.openaiApiKey || process.env.OPENAI_API_KEY!
const finalGroqKey = secrets.groqApiKey || process.env.GROQ_API_KEY!
```

**DEPOIS**: Sistema lança erro claro se credenciais não estiverem no Vault
```typescript
const finalOpenaiKey = secrets.openaiApiKey
const finalGroqKey = secrets.groqApiKey

if (!finalOpenaiKey) {
  throw new Error(
    `No OpenAI key configured for client ${clientId}. ` +
    `Please configure in Settings: /dashboard/settings`
  )
}
```

**Ação Necessária**: Configure TODAS as credenciais em `/dashboard/settings`:
- OpenAI API Key
- Groq API Key
- Meta Access Token
- Meta Verify Token
- Meta Phone Number ID

### 2. **Webhook Legacy Depreciado**

**ANTES**: Webhook em `/api/webhook` usava `DEFAULT_CLIENT_ID` do .env
```typescript
const clientId = process.env.DEFAULT_CLIENT_ID
const config = await getClientConfigWithFallback(clientId)
```

**DEPOIS**: Webhook legacy retorna HTTP 410 Gone com instruções de migração
```json
{
  "error": "DEPRECATED_ENDPOINT",
  "message": "This webhook endpoint is deprecated and no longer supported.",
  "new_format": "https://chat.luisfboff.com/api/webhook/{client_id}",
  "instructions": [
    "1. Login to dashboard",
    "2. Go to Settings → Environment Variables",
    "3. Copy the complete Webhook URL with your client_id",
    "4. Update in Meta Dashboard"
  ]
}
```

**Ação Necessária**: Atualizar webhook no Meta Dashboard
1. Acesse https://chat.luisfboff.com/dashboard/settings
2. Copie a Webhook URL completa (ex: `https://chat.luisfboff.com/api/webhook/550e8400-...`)
3. Atualize em https://developers.facebook.com/apps/ → WhatsApp → Webhook Configuration

### 3. **Função `getClientConfigWithFallback()` Depreciada**

**ANTES**: Permitia passar `clientId = null` para usar .env
```typescript
export const getClientConfigWithFallback = async (clientId?: string | null) => {
  if (clientId) {
    return await getClientConfig(clientId)
  }

  // Fallback para .env
  return { /* config from .env */ }
}
```

**DEPOIS**: Lança erro se `clientId` for null
```typescript
export const getClientConfigWithFallback = async (clientId?: string | null) => {
  if (clientId) {
    return await getClientConfig(clientId)
  }

  throw new Error(
    'Legacy .env config is no longer supported. ' +
    'Please update your webhook URL to include client_id'
  )
}
```

**Ação Necessária**: Use `getClientConfig(clientId)` diretamente
```typescript
// ❌ DEPRECATED
const config = await getClientConfigWithFallback(null)

// ✅ CORRETO
const config = await getClientConfig(clientId)
```

---

## Arquivos Modificados

### 1. `src/lib/config.ts`

**Linha 154-184**: Removido fallback e adicionado validação obrigatória
```typescript
// ANTES (linhas 155-156)
const finalOpenaiKey = secrets.openaiApiKey || process.env.OPENAI_API_KEY!
const finalGroqKey = secrets.groqApiKey || process.env.GROQ_API_KEY!

// DEPOIS
const finalOpenaiKey = secrets.openaiApiKey
const finalGroqKey = secrets.groqApiKey

if (!finalOpenaiKey) {
  throw new Error(`No OpenAI key configured for client ${clientId}. Configure in /dashboard/settings`)
}
if (!finalGroqKey) {
  throw new Error(`No Groq key configured for client ${clientId}. Configure in /dashboard/settings`)
}
if (!secrets.metaAccessToken) {
  throw new Error(`No Meta Access Token configured for client ${clientId}. Configure in /dashboard/settings`)
}
if (!client.meta_phone_number_id || client.meta_phone_number_id === 'CONFIGURE_IN_SETTINGS') {
  throw new Error(`No Meta Phone Number ID configured for client ${clientId}. Configure in /dashboard/settings`)
}
```

**Linha 256-290**: Marcado `getClientConfigWithFallback()` como deprecated
```typescript
/**
 * ⚠️ DEPRECATED: Esta função será removida em breve.
 * Não use .env fallback - configure todas as credenciais no Vault via /dashboard/settings
 *
 * @deprecated Use getClientConfig(clientId) diretamente
 */
export const getClientConfigWithFallback = async (clientId?: string | null) => {
  if (clientId) {
    return await getClientConfig(clientId)
  }

  throw new Error('Legacy .env config is no longer supported.')
}
```

### 2. `src/app/api/webhook/route.ts`

**GET Handler (linhas 6-51)**: Retorna HTTP 410 Gone
```typescript
export async function GET(req: NextRequest) {
  console.error('❌ [WEBHOOK GET] DEPRECATED: Este endpoint não é mais suportado')

  return new NextResponse(
    JSON.stringify({
      error: 'DEPRECATED_ENDPOINT',
      message: 'This webhook endpoint is deprecated and no longer supported.',
      new_format: `${getWebhookBaseUrl()}/api/webhook/{client_id}`,
      instructions: [ /* migration steps */ ],
    }),
    { status: 410 }
  )
}
```

**POST Handler (linhas 102-138)**: Retorna HTTP 410 Gone
```typescript
export async function POST(req: NextRequest) {
  console.error('❌ [WEBHOOK] DEPRECATED: Este endpoint não usa mais .env fallback')
  console.error('📋 [WEBHOOK] AÇÃO NECESSÁRIA: Migre para /api/webhook/{client_id}')

  return new NextResponse(
    JSON.stringify({
      error: 'DEPRECATED_ENDPOINT',
      /* same structure as GET */
    }),
    { status: 410 }
  )
}
```

---

## Endpoint Recomendado (Já Implementado)

### `/api/webhook/[clientId]/route.ts`

**Já existe e está funcionando corretamente!**

Este endpoint:
- ✅ Extrai `clientId` da URL automaticamente
- ✅ Busca credenciais do Vault usando `getClientConfig(clientId)`
- ✅ Não depende de .env (exceto `WEBHOOK_BASE_URL`)
- ✅ Valida que cliente está ativo
- ✅ Processa mensagens com config do cliente

**Exemplo de uso**:
```
URL do Webhook: https://chat.luisfboff.com/api/webhook/550e8400-e29b-41d4-a716-446655440000
                                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                                        client_id do usuário
```

---

## Variáveis .env Ainda Necessárias

Algumas variáveis de ambiente ainda são obrigatórias no `.env.local`:

### Obrigatórias (Infraestrutura)
```env
# Webhook Base URL (usado para construir URLs dinâmicas)
WEBHOOK_BASE_URL=https://chat.luisfboff.com

# Supabase (acesso ao banco e Vault)
NEXT_PUBLIC_SUPABASE_URL=https://project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# PostgreSQL (chat history)
POSTGRES_URL_NON_POOLING=postgresql://user:pass@host:5432/db

# Redis (message batching)
REDIS_URL=redis://localhost:6379
```

### NÃO São Mais Usadas (Podem ser removidas)
```env
# ❌ DEPRECATED - Agora vêm do Vault
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...
META_ACCESS_TOKEN=EAA...
META_PHONE_NUMBER_ID=899639703222013
META_VERIFY_TOKEN=my-secret-token

# ❌ DEPRECATED - Webhook dinâmico não usa
DEFAULT_CLIENT_ID=550e8400-...
```

---

## Checklist de Migração

### Para Usuários Existentes

- [ ] 1. Acesse `/dashboard/settings`
- [ ] 2. Configure todas as credenciais no Vault:
  - [ ] OpenAI API Key
  - [ ] Groq API Key
  - [ ] Meta Access Token
  - [ ] Meta Verify Token
  - [ ] Meta Phone Number ID
- [ ] 3. Copie a Webhook URL completa (com `client_id`)
- [ ] 4. Atualize no Meta Dashboard → WhatsApp → Configuration → Webhook
- [ ] 5. Clique em "Verify and Save" no Meta Dashboard
- [ ] 6. Teste enviando mensagem no WhatsApp
- [ ] 7. (Opcional) Remova credenciais antigas do `.env.local`

### Para Novos Usuários

- [ ] 1. Crie conta em `/register` (gera `client_id` automaticamente)
- [ ] 2. Acesse `/dashboard/settings`
- [ ] 3. Configure todas as credenciais (5 campos)
- [ ] 4. Copie a Webhook URL
- [ ] 5. Configure no Meta Dashboard
- [ ] 6. Pronto! ✅

---

## FAQ

### Q: Por que remover os fallbacks de .env?

**A**: Para garantir segurança e multi-tenancy correto:
- **Segurança**: Credenciais no Vault são criptografadas (AES-256)
- **Multi-tenant**: Cada cliente tem suas próprias credenciais isoladas
- **Auditoria**: Mudanças no Vault são rastreáveis
- **Facilidade**: Usuários configuram via UI, sem acesso a servidor

### Q: O que acontece se eu ainda usar `/api/webhook`?

**A**: Webhook retorna HTTP 410 Gone com instruções de migração. Meta marcará o webhook como "failed" e parará de enviar mensagens.

### Q: Posso manter as credenciais no .env?

**A**: Não para credenciais de clientes (OpenAI, Groq, Meta). Apenas credenciais de infraestrutura (Supabase, Redis, PostgreSQL) devem ficar no .env.

### Q: Como funcionam os erros agora?

**A**: Se credencial não estiver configurada no Vault, o sistema lança erro **antes** de processar a mensagem, evitando processamento parcial. Exemplo:

```
Error: No OpenAI key configured for client 550e8400-...
Please configure in Settings: /dashboard/settings
```

### Q: E se eu quiser testar localmente?

**A**: Configure as credenciais no Vault via `/dashboard/settings`. O sistema busca do Supabase, que funciona tanto em dev quanto prod.

---

## Próximos Passos (Futuro)

1. **Remover funções deprecated completamente** (após período de transição)
   - Remover `getClientConfigWithFallback()`
   - Remover `getMetaConfig()`
   - Remover `getMetaVerifyToken()` (usar Vault)

2. **Remover endpoint legacy `/api/webhook`** (após migração completa)
   - Todos os clientes devem usar `/api/webhook/{client_id}`

3. **Adicionar rate limiting por cliente**
   - Baseado em `client.plan` (free, basic, pro)

4. **Auditoria de uso de credenciais**
   - Log quando credenciais são acessadas
   - Alert se credenciais inválidas

---

## Conclusão

✅ **Sistema agora usa Vault-Only para todas as credenciais de clientes**

✅ **Fallbacks de .env foram completamente removidos**

✅ **Webhook dinâmico `/api/webhook/{client_id}` é o padrão**

✅ **Erros claros direcionam usuários para `/dashboard/settings`**

**Resultado**: Sistema mais seguro, multi-tenant correto, e configuração mais fácil para usuários.

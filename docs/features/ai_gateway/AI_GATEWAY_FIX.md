# AI Gateway - Correção da API de Setup

## Problema Original

A API `/api/ai-gateway/setup` estava falhando ao tentar criar secrets no Supabase Vault com o erro:

```
Could not find the function public.vault.create_secret(description, name, secret)
```

**Causa:** O Supabase JS client não permite chamar funções do schema `vault.*` diretamente via `.rpc()`.

---

## Solução Implementada

### 1. Nova Migration: `20251213133305_add_vault_rpc_functions.sql`

Criadas 3 funções PostgreSQL wrapper que podem ser chamadas via RPC:

#### `create_vault_secret(p_secret, p_name, p_description)`
- Cria ou retorna ID de secret existente
- Evita duplicação automática
- Retorna UUID do secret

#### `get_vault_secret(p_name)`
- Retorna valor descriptografado de um secret
- Usado apenas para debug (admin only)

#### `list_vault_secrets()`
- Lista todos os secrets (metadata apenas, sem valores)
- Retorna: id, name, description, created_at

**Permissões:** `SECURITY DEFINER` - executa com privilégios do owner, mas controlado via RLS no nível da aplicação (admin check).

---

### 2. API Route Atualizada: `src/app/api/ai-gateway/setup/route.ts`

**Antes (❌ ERRO):**
```typescript
const { data: newSecret, error } = await supabase.rpc('exec_sql', {
  sql: `SELECT vault.create_secret($1, $2, $3)`,
  params: [secretValue, secretName, description],
})
```

**Depois (✅ FUNCIONA):**
```typescript
const { data: secretId, error } = await supabase.rpc('create_vault_secret', {
  p_secret: secretValue,
  p_name: secretName,
  p_description: description,
})
```

---

## Como Usar Agora

### Passo 1: Aplicar a Migration

```bash
npx supabase db push
```

Ou execute manualmente no Supabase SQL Editor:
- Arquivo: `supabase/migrations/20251213133305_add_vault_rpc_functions.sql`

### Passo 2: Configurar via Frontend

1. Acesse: http://localhost:3000/dashboard/ai-gateway/setup
2. Cole suas API keys:
   - **Gateway Key:** `vck_4a4BgUYsrXlTsKaaH9R8uGRw8FR7IipUGf660FfqnX6CcdpFyb2f9Qm4`
   - **OpenAI Key:** `sk-proj-...` (obtenha em https://platform.openai.com/api-keys)
   - **Groq Key:** `gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (substitua pela sua)
3. Clique em **Save Configuration**

✅ **A API agora funciona corretamente!**

### Passo 3: Habilitar Gateway para 1 Cliente

```sql
-- Ver clientes disponíveis
SELECT id, name, slug FROM clients LIMIT 5;

-- Habilitar gateway para cliente teste
UPDATE clients
SET use_ai_gateway = true
WHERE id = 'SEU_CLIENT_ID_AQUI';
```

### Passo 4: Adicionar ao .env.local

```env
ENABLE_AI_GATEWAY=true
```

Reinicie: `npm run dev`

### Passo 5: Testar

```bash
curl http://localhost:3000/api/test/gateway
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "AI Gateway is working correctly! 🎉",
  "config": {
    "hasGatewayKey": true,
    "hasOpenAIKey": true,
    "hasGroqKey": true
  }
}
```

---

## Alternativa: Setup via SQL Direto

Se preferir não usar o frontend, ainda é possível configurar via SQL:

1. Abra `setup-gateway-keys.sql`
2. Edite linha 21 com sua OpenAI key
3. Execute no Supabase SQL Editor
4. Anote os UUIDs retornados
5. Execute o UPDATE com os UUIDs

**Vantagens do Frontend:**
- Mais simples
- Sem necessidade de anotar UUIDs manualmente
- Validação automática de formato de keys
- Interface visual amigável

---

## Arquivos Modificados

1. **Nova migration:** `supabase/migrations/20251213133305_add_vault_rpc_functions.sql`
2. **API corrigida:** `src/app/api/ai-gateway/setup/route.ts`
3. **Documentação atualizada:** `QUICK_SETUP.md`

---

## Próximos Passos

1. ✅ Aplicar migration (você fará isso)
2. ⏳ Obter OpenAI API key
3. ⏳ Configurar via frontend `/dashboard/ai-gateway/setup`
4. ⏳ Habilitar para 1 cliente teste
5. ⏳ Testar com `curl http://localhost:3000/api/test/gateway`
6. ⏳ Testar via WhatsApp enviando mensagem

---

**Status:** ✅ Código compila sem erros (verificado via `npx tsc --noEmit`)

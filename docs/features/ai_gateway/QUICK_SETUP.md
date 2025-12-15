# AI Gateway - Setup Rápido

## ✅ OPÇÃO 1: Setup via Frontend (Recomendado)

**ATUALIZAÇÃO:** A API de setup foi corrigida! Após aplicar a migration `20251213133305_add_vault_rpc_functions.sql`:

1. Acesse: http://localhost:3000/dashboard/ai-gateway/setup
2. Cole suas API keys:
   - Gateway Key: `vck_4a4BgUYsrXlTsKaaH9R8uGRw8FR7IipUGf660FfqnX6CcdpFyb2f9Qm4` (já preenchida)
   - OpenAI Key: `sk-proj-...` (obtenha em https://platform.openai.com/api-keys)
   - Groq Key: `gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (substitua pela sua)
3. Clique em **Save Configuration**
4. Pule para [Passo 3: Habilitar para 1 Cliente](#passo-3-habilitar-para-1-cliente)

---

## 🔧 OPÇÃO 2: Setup via SQL Direto (Alternativa)

Se preferir configurar manualmente via SQL, siga os passos abaixo.

### Passo 1: Obter OpenAI Key

1. Acesse: https://platform.openai.com/api-keys
2. Crie nova key: **Create new secret key**
3. Copie a key: `sk-proj-...`

---

### Passo 2: Executar SQL no Supabase

1. Acesse: https://app.supabase.com
2. Selecione o projeto **ChatBot-Oficial**
3. Menu lateral → **SQL Editor**
4. Abra o arquivo `setup-gateway-keys.sql`
5. **Edite as linhas:**
   - Linha 16: Cole sua OpenAI key no lugar de `COLE_SUA_OPENAI_KEY_AQUI`
   - Linha 44: Cole o UUID retornado do gateway key
   - Linha 45: Cole o UUID retornado do OpenAI key
   - Linha 46: Cole o UUID retornado do Groq key

6. Execute cada seção separadamente (SELECT vault.create_secret por vez)
7. **ANOTE OS UUIDs** retornados por cada SELECT
8. Execute o UPDATE com os UUIDs anotados

---

## Passo 3: Habilitar para 1 Cliente

No mesmo SQL Editor:

```sql
-- Ver clientes
SELECT id, name, slug FROM clients LIMIT 5;

-- Habilitar gateway para 1 cliente (substitua o ID)
UPDATE clients
SET use_ai_gateway = true
WHERE id = 'SEU_CLIENT_ID_AQUI';
```

---

## Passo 4: Adicionar ao .env.local

```env
ENABLE_AI_GATEWAY=true
```

Reinicie: `npm run dev`

---

## Passo 5: Testar

```bash
curl http://localhost:3000/api/test/gateway
```

Deve retornar:
```json
{
  "success": true,
  "message": "AI Gateway is working correctly! 🎉"
}
```

---

## Troubleshooting

### Erro: "No shared configuration found"
```sql
SELECT * FROM shared_gateway_config;
```

Se vazio, rodar migration novamente.

### Erro: "Failed to decrypt key"
```sql
-- Ver se secrets existem
SELECT id, name FROM vault.secrets WHERE name LIKE 'shared_%';
```

Se vazio, rodar os SELECTs vault.create_secret novamente.

### Erro: "Gateway not enabled"
```sql
-- Verificar flag global
-- No .env.local deve ter: ENABLE_AI_GATEWAY=true

-- Verificar flag do cliente
SELECT use_ai_gateway FROM clients WHERE id = 'SEU_CLIENT_ID';
```

---

**Quer testar via WhatsApp?**

Depois que o teste acima passar, envie mensagem WhatsApp para o número do cliente teste e verifique os logs!

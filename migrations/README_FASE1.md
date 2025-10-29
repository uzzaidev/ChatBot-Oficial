# 🚀 FASE 1: Implementação Multi-Tenant com Vault

Guia passo a passo para executar a migração do sistema single-tenant para multi-tenant com Supabase Vault.

---

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter:

- [x] Acesso ao Supabase Dashboard
- [x] Backup do banco de dados (`pg_dump`)
- [x] Arquivo `.env.local` com todas as variáveis configuradas
- [x] Node.js instalado (para testar TypeScript)

---

## ⚠️ IMPORTANTE: Backup

**FAÇA BACKUP ANTES DE TUDO!**

```bash
# Conecte ao Supabase e faça dump
# (Use as credenciais do Database Settings no Supabase)
pg_dump -h [HOST] -U [USER] -d [DATABASE] > backup_pre_migration.sql
```

---

## 📝 Passo 1: Executar Migration SQL

### 1.1: Abrir SQL Editor no Supabase

1. Acesse https://app.supabase.com
2. Selecione seu projeto
3. Vá em **SQL Editor** no menu lateral

### 1.2: Executar 005_fase1_vault_multi_tenant.sql

1. Abra o arquivo `migrations/005_fase1_vault_multi_tenant.sql`
2. Copie **TODO** o conteúdo
3. Cole no SQL Editor
4. Clique em **Run**

**Resultado Esperado:**
```
✅ Vault is working correctly!
✅ Added client_id to clientes_whatsapp
✅ Added client_id to n8n_chat_histories
✅ Added client_id to documents
✅ MIGRATION 005 COMPLETED SUCCESSFULLY
```

### 1.3: Verificar que migration funcionou

Execute no SQL Editor:

```sql
-- Verificar tabela clients foi criada
SELECT COUNT(*) FROM clients;
-- Deve retornar 0 (tabela vazia)

-- Verificar que client_id foi adicionado
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'clientes_whatsapp'
AND column_name = 'client_id';
-- Deve retornar 1 linha: client_id | uuid | YES

-- Testar funções do Vault
SELECT create_client_secret('test-value-123', 'test-secret');
-- Deve retornar um UUID
```

---

## 📝 Passo 2: Criar Cliente Default

### 2.1: Preparar valores do .env.local

Abra seu `.env.local` e copie os valores de:

```env
META_ACCESS_TOKEN=EAAGXc...  # Copie este valor
META_VERIFY_TOKEN=seu-token   # Copie este valor
META_PHONE_NUMBER_ID=899639703222013
META_DISPLAY_PHONE=555499567051
```

### 2.2: Editar script 006_setup_default_client.sql

1. Abra `migrations/006_setup_default_client.sql`
2. **SUBSTITUA** os valores nas linhas 25-32:

```sql
DECLARE
  -- 👉 SUBSTITUIR: Copie do .env.local
  v_meta_access_token TEXT := 'EAAG...'; -- SEU TOKEN AQUI
  v_meta_verify_token TEXT := 'your-verify-token'; -- SEU TOKEN AQUI
  v_meta_phone_number_id TEXT := '899639703222013'; -- SEU ID AQUI
  v_meta_display_phone TEXT := '555499567051';
  v_notification_email TEXT := 'luisfboff@hotmail.com';
```

### 2.3: Adicionar seu System Prompt

Na linha 38, copie **TODO** o prompt do arquivo `src/nodes/generateAIResponse.ts`:

```sql
  v_system_prompt TEXT := 'Você é um assistente virtual...'; -- COPIE O PROMPT COMPLETO AQUI
```

### 2.4: Executar script

1. Copie **TODO** o conteúdo do arquivo editado
2. Cole no SQL Editor do Supabase
3. Clique em **Run**

**Resultado Esperado:**
```
✅ Valores do .env validados
🔐 Criando secrets no Vault...
  ✅ Meta Access Token: 550e8400-e29b-41d4-a716-446655440000
  ✅ Meta Verify Token: 660e8400-e29b-41d4-a716-446655440001
  ...
👤 Criando cliente default...
  ✅ Cliente criado: 770e8400-e29b-41d4-a716-446655440002
📦 Migrando dados existentes para cliente default...
  ✅ clientes_whatsapp: 15 registros atualizados
  ✅ n8n_chat_histories: 342 registros atualizados
  ✅ documents: 8 registros atualizados
🔒 Tornando client_id obrigatório...
  ✅ client_id agora é obrigatório em todas as tabelas
✅ SETUP CONCLUÍDO COM SUCESSO!
```

### 2.5: GUARDAR o Client ID

**IMPORTANTE**: Anote o UUID do cliente criado. Você vai precisar dele!

```
Client ID: 770e8400-e29b-41d4-a716-446655440002
```

---

## 📝 Passo 3: Verificar Migração

Execute estas queries no SQL Editor para validar:

```sql
-- 1. Verificar cliente foi criado
SELECT id, name, slug, status FROM clients;
-- Deve retornar 1 linha: default-client

-- 2. Verificar secrets foram criados
SELECT COUNT(*) FROM vault.secrets;
-- Deve retornar >= 2 (Meta tokens)

-- 3. Verificar client_id foi populado
SELECT COUNT(*) FROM clientes_whatsapp WHERE client_id IS NOT NULL;
SELECT COUNT(*) FROM n8n_chat_histories WHERE client_id IS NOT NULL;
SELECT COUNT(*) FROM documents WHERE client_id IS NOT NULL;
-- Todos devem retornar o número total de registros

-- 4. Testar descriptografia
SELECT * FROM client_secrets_decrypted;
-- Deve retornar secrets descriptografados (apenas service role consegue ver)
```

---

## 📝 Passo 4: Testar TypeScript Localmente

Antes de fazer deploy, vamos testar localmente:

### 4.1: Verificar compilação

```bash
cd "C:\Users\Luisf\OneDrive\Github\Chatbot v2"
npx tsc --noEmit
```

**Resultado esperado**: Sem erros!

### 4.2: Testar imports

Crie um arquivo de teste temporário:

```typescript
// test-config.ts
import { getClientConfig } from './src/lib/config'

const test = async () => {
  const config = await getClientConfig('SEU-CLIENT-ID-AQUI')
  if (config) {
    console.log('✅ Config carregado:', config.name)
    console.log('✅ Meta Token:', config.apiKeys.metaAccessToken.substring(0, 10) + '...')
  } else {
    console.error('❌ Falha ao carregar config')
  }
}

test()
```

Execute:

```bash
npx ts-node test-config.ts
```

**Resultado esperado**:
```
✅ Config carregado: Cliente Padrão
✅ Meta Token: EAAGXc...
```

---

## 📝 Passo 5: Sistema Continua Funcionando?

### 5.1: Verificar webhook atual

O sistema atual **ainda funciona normalmente** porque:

- Webhook `/api/webhook` existe
- Lê variáveis do `.env.local`
- **Não foi alterado ainda**

### 5.2: Testar manualmente

1. Envie mensagem via WhatsApp para o bot
2. Verifique logs no Vercel ou `npm run dev`
3. Confirme que resposta chega normalmente

✅ Se funcionou, migração foi bem-sucedida!

---

## 📝 Passo 6: Próximos Passos (Fase 2)

Agora que a infra está pronta, próximos passos:

### Fase 2: Adaptar chatbotFlow.ts

- [ ] Modificar `processChatbotMessage()` para aceitar `ClientConfig`
- [ ] Atualizar nodes para receber config dinâmica
- [ ] Criar `/api/webhook/[clientId]/route.ts`
- [ ] Testar com cliente default

---

## 🆘 Troubleshooting

### Erro: "column client_id already exists"

**Solução**: Já executou a migration antes. Pode ignorar ou rodar:

```sql
-- Verificar estado atual
SELECT column_name FROM information_schema.columns
WHERE table_name = 'clientes_whatsapp' AND column_name = 'client_id';
```

### Erro: "Vault test failed: cannot read secret"

**Solução**: Extensão vault não está habilitada. Execute:

```sql
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA vault;
```

### Erro: "Missing required Meta secrets"

**Solução**: Você não substituiu os valores no script 006. Leia as instruções novamente.

### Erro TypeScript: "Property 'rpc' does not exist"

**Solução**: Já foi corrigido com `// @ts-ignore`. Execute `npx tsc --noEmit` novamente.

---

## ✅ Checklist Final

Antes de considerar Fase 1 concluída:

- [ ] Migration 005 executada com sucesso
- [ ] Cliente default criado
- [ ] Client ID anotado em local seguro
- [ ] Dados migrados (client_id populado)
- [ ] TypeScript compila sem erros (`npx tsc --noEmit`)
- [ ] Sistema atual continua funcionando
- [ ] Backup do banco realizado

---

## 📊 Estatísticas Pós-Migração

Execute para ver estatísticas:

```sql
SELECT
  'Clientes' as tabela,
  COUNT(*) as total
FROM clients

UNION ALL

SELECT
  'Secrets no Vault',
  COUNT(*)
FROM vault.secrets

UNION ALL

SELECT
  'Clientes WhatsApp',
  COUNT(*)
FROM clientes_whatsapp

UNION ALL

SELECT
  'Chat Histories',
  COUNT(*)
FROM n8n_chat_histories

UNION ALL

SELECT
  'Documentos RAG',
  COUNT(*)
FROM documents;
```

---

## 🎉 Conclusão

Parabéns! Você completou a **FASE 1** do multi-tenant!

Seu sistema agora:
- ✅ Tem infraestrutura multi-tenant
- ✅ Secrets criptografados no Vault
- ✅ Dados migrados para cliente default
- ✅ TypeScript configurado
- ✅ **Continua funcionando normalmente**

**Próxima etapa**: FASE 2 - Adaptar chatbotFlow para usar `getClientConfig()`

---

**Dúvidas?** Consulte:
- `MULTI_TENANT_MIGRATION.md` - Documentação completa
- `CLAUDE.md` - Instruções do projeto
- GitHub Issues - Reporte problemas

**Data**: 2025-01-28
**Versão**: 1.0

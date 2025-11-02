# 🚨 RESTORE URGENTE - Passo a Passo

## Situação Detectada

As **tabelas do banco foram apagadas completamente**. Precisamos:
1. Recriar a estrutura (tabelas, índices, RLS policies)
2. Restaurar os dados

## ✅ Solução: 3 Passos Simples

### Passo 1: Restaurar Estrutura do Banco

1. **Abra o Supabase SQL Editor**:
   - https://app.supabase.com/project/jhodhxvvhohygijqcxbo/sql

2. **Abra o arquivo de estrutura**:
   - Abra: `db\chatbot_structure_20251030_175352.sql`
   - Selecione TUDO (Ctrl+A)
   - Copie (Ctrl+C)

3. **Cole no SQL Editor**:
   - Cole todo o conteúdo
   - Clique em **"Run"** ou **"Execute"**
   - Aguarde (~30 segundos)

4. **Verifique se funcionou**:
   - Vá em "Table Editor" (menu lateral)
   - Você deve ver as tabelas: `clients`, `conversations`, `messages`, `clientes_whatsapp`

### Passo 2: Restaurar Dados

**Opção A: Via SQL Editor (Recomendado)**

1. **Abra novamente o SQL Editor**
   - https://app.supabase.com/project/jhodhxvvhohygijqcxbo/sql

2. **Abra o arquivo de dados**:
   - Abra: `db\chatbot_data_20251030_175352.sql`
   - Selecione TUDO (Ctrl+A)
   - Copie (Ctrl+C)

3. **Cole e execute**:
   - Cole no SQL Editor
   - Clique em **"Run"**
   - Aguarde (~1-2 minutos dependendo do tamanho)

4. **Verifique**:
   ```sql
   SELECT COUNT(*) FROM clients;
   SELECT COUNT(*) FROM conversations;
   SELECT COUNT(*) FROM messages;
   ```

**Opção B: Via Script Automático**

Se a Opção A funcionar para estrutura, rode novamente:

```powershell
cd "c:\Users\Luisf\OneDrive\Github\Chatbot v2"
node db\restore.js
```

### Passo 3: Restaurar Auth (Usuários)

**⚠️ CUIDADO**: Apenas se você tinha usuários cadastrados

1. **Abra o SQL Editor**

2. **Cole o conteúdo de**:
   - `db\auth_data_20251030_175352.sql`

3. **Execute**

4. **Se der erro**: É normal, o Supabase Auth pode bloquear. Você precisará:
   - Recriar usuários manualmente OU
   - Usar "Reset Password" para cada usuário

## 🔍 Verificação Final

Após restaurar estrutura + dados:

1. **Verifique contagem de registros**:
   ```sql
   SELECT 'clients' as tabela, COUNT(*) as total FROM clients
   UNION ALL
   SELECT 'conversations', COUNT(*) FROM conversations
   UNION ALL
   SELECT 'messages', COUNT(*) FROM messages
   UNION ALL
   SELECT 'clientes_whatsapp', COUNT(*) FROM clientes_whatsapp;
   ```

2. **Teste o Dashboard**:
   ```powershell
   npm run dev
   ```
   - Abra: http://localhost:3000/dashboard
   - Verifique se conversas aparecem

3. **Teste envio de mensagem**:
   - Envie mensagem via WhatsApp
   - Veja se webhook processa

## 📊 Dados Esperados (do backup 30/10/2025)

Você deve ter aproximadamente:
- **3 clients** (Test Client, UFRGS, Luis Fernando Boff)
- **17 clientes_whatsapp** (contatos)
- **0 conversations** (tabela estava vazia no backup)
- **0 messages** (tabela estava vazia no backup)

## ⚠️ Avisos Importantes

1. **Dados após 30/10/2025 17:53** não estão no backup
2. **Messages e Conversations** estavam vazias no backup original
3. Se você tinha mensagens, elas foram criadas DEPOIS do backup
4. Verifique logs do n8n para reconstruir histórico (se necessário)

## 🆘 Se Ainda Não Funcionar

Execute estes comandos SQL para diagnostic:

```sql
-- Ver todas as tabelas
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Ver RLS policies
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public';

-- Ver foreign keys
SELECT
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public';
```

## 📝 Resumo Rápido

```bash
# 1. Estrutura
Supabase SQL Editor → Cole chatbot_structure_20251030_175352.sql → Run

# 2. Dados  
Supabase SQL Editor → Cole chatbot_data_20251030_175352.sql → Run

# 3. Verifique
npm run dev → http://localhost:3000/dashboard
```

**Boa sorte! 🍀**

---

## Arquivos de Backup Disponíveis

- `chatbot_full_20251030_175352.sql` - Estrutura + Dados completos
- `chatbot_structure_20251030_175352.sql` - Apenas estrutura (CREATE TABLE)
- `chatbot_data_20251030_175352.sql` - Apenas dados (INSERT)
- `auth_full_20251030_175352.sql` - Auth completo
- `auth_structure_20251030_175352.sql` - Auth estrutura
- `auth_data_20251030_175352.sql` - Auth dados

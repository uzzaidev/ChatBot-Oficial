# Guia de Recuperação de Dados

## ⚠️ SITUAÇÃO: Dados Perdidos

Este guia ajuda a restaurar os dados a partir dos backups disponíveis.

## Backups Disponíveis

Você tem backups completos de **30 de outubro de 2025**:

### Backup 1: `20251030_175207`
- `chatbot_full_20251030_175207.sql` - Dados completos da aplicação
- `chatbot_structure_20251030_175207.sql` - Apenas estrutura (tabelas)
- `chatbot_data_20251030_175207.sql` - Apenas dados (INSERT statements)

### Backup 2: `20251030_175352` (MAIS RECENTE)
- `chatbot_full_20251030_175352.sql` - Dados completos da aplicação
- `chatbot_structure_20251030_175352.sql` - Apenas estrutura
- `chatbot_data_20251030_175352.sql` - Apenas dados
- `auth_full_20251030_175352.sql` - Usuários do Supabase Auth
- `auth_structure_20251030_175352.sql` - Estrutura do Auth
- `auth_data_20251030_175352.sql` - Dados do Auth

**RECOMENDAÇÃO**: Use o backup `20251030_175352` (mais recente e inclui Auth).

---

## Opção 1: Restore Automático (RECOMENDADO)

### Pré-requisitos

1. **PostgreSQL Client instalado** (necessário para o comando `psql`)
   - Download: https://www.postgresql.org/download/windows/
   - Ou via Chocolatey: `choco install postgresql`

2. **Credenciais do Supabase**
   - Senha do banco de dados (Database password)
   - Encontre em: https://app.supabase.com/project/YOUR_PROJECT/settings/database

### Passo a Passo

1. **Abra PowerShell como Administrador** na pasta `db\`:
   ```powershell
   cd "c:\Users\Luisf\OneDrive\Github\Chatbot v2\db"
   ```

2. **Execute o script de restore**:
   ```powershell
   .\restore-complete.bat 20251030_175352
   ```

3. **Siga as instruções na tela**:
   - Confirme a operação (digite `SIM`)
   - Informe a senha do banco quando solicitado
   - Aguarde o processo (pode levar 1-5 minutos)

4. **Verifique os dados**:
   - Abra o dashboard: http://localhost:3000/dashboard
   - Verifique se conversas e mensagens foram restauradas
   - Teste o envio de mensagens

### O que o script faz:

✅ Cria backup de segurança antes de restaurar  
✅ Limpa schema `public` (remove dados corrompidos)  
✅ Restaura dados do backup  
✅ Restaura usuários do Supabase Auth (se disponível)  
✅ Valida restauração contando registros  

---

## Opção 2: Restore Manual via Supabase Dashboard

### Quando usar:
- Não conseguiu instalar PostgreSQL client
- Prefere usar interface gráfica
- Quer restaurar apenas partes específicas

### Passo a Passo

1. **Acesse o SQL Editor do Supabase**:
   - https://app.supabase.com/project/YOUR_PROJECT/sql

2. **Limpe as tabelas existentes** (se necessário):
   ```sql
   -- CUIDADO: Isto APAGA todos os dados!
   TRUNCATE TABLE messages CASCADE;
   TRUNCATE TABLE conversations CASCADE;
   TRUNCATE TABLE clients CASCADE;
   TRUNCATE TABLE usage_logs CASCADE;
   ```

3. **Abra o arquivo de backup**:
   - Abra `db\chatbot_data_20251030_175352.sql` no editor de texto
   - Copie TODO o conteúdo

4. **Execute no SQL Editor**:
   - Cole o conteúdo no SQL Editor
   - Clique em "Run"
   - Aguarde conclusão (pode levar alguns minutos)

5. **Verifique a restauração**:
   ```sql
   SELECT COUNT(*) FROM clients;
   SELECT COUNT(*) FROM conversations;
   SELECT COUNT(*) FROM messages;
   ```

### Restaurar Usuários do Auth (opcional)

Se você também precisa restaurar usuários:

1. **Abra** `db\auth_data_20251030_175352.sql`

2. **CUIDADO**: Este arquivo contém senhas hasheadas
   - Não compartilhe este arquivo
   - Usuários precisarão resetar senhas após restore

3. **Execute no SQL Editor** (pode dar erro - é normal)
   - O Supabase Auth gerencia este schema
   - Alguns constraints podem falhar

---

## Opção 3: Restore Apenas de Tabelas Específicas

### Se você perdeu apenas ALGUNS dados:

**Exemplo: Restaurar apenas mensagens**

```sql
-- 1. Criar tabela temporária
CREATE TABLE messages_backup AS TABLE messages WITH NO DATA;

-- 2. Abrir chatbot_data_20251030_175352.sql
-- 3. Copiar apenas os INSERT INTO messages
-- 4. Colar e executar

-- 5. Comparar dados
SELECT COUNT(*) FROM messages;  -- Dados atuais
SELECT COUNT(*) FROM messages_backup;  -- Backup

-- 6. Se estiver OK, substituir
TRUNCATE TABLE messages;
INSERT INTO messages SELECT * FROM messages_backup;

-- 7. Limpar
DROP TABLE messages_backup;
```

---

## Verificação Pós-Restore

### Checklist de Validação

Após restaurar, verifique:

- [ ] **Clientes restaurados**
  ```sql
  SELECT id, name, created_at FROM clients ORDER BY created_at;
  ```

- [ ] **Conversas restauradas**
  ```sql
  SELECT COUNT(*) as total, status 
  FROM conversations 
  GROUP BY status;
  ```

- [ ] **Mensagens restauradas**
  ```sql
  SELECT COUNT(*) as total, 
         MIN(created_at) as primeira_mensagem,
         MAX(created_at) as ultima_mensagem
  FROM messages;
  ```

- [ ] **Distribuição por cliente**
  ```sql
  SELECT c.name, 
         COUNT(DISTINCT conv.id) as conversas,
         COUNT(m.id) as mensagens
  FROM clients c
  LEFT JOIN conversations conv ON conv.client_id = c.id
  LEFT JOIN messages m ON m.conversation_id = conv.id
  GROUP BY c.id, c.name;
  ```

- [ ] **Dashboard funciona**
  - Abrir http://localhost:3000/dashboard
  - Ver lista de conversas
  - Abrir uma conversa
  - Ver mensagens carregando

- [ ] **Webhook funciona** (testar enviando mensagem no WhatsApp)

---

## Problemas Comuns

### Erro: "psql: command not found"

**Solução**: Instalar PostgreSQL client

```powershell
# Via Chocolatey
choco install postgresql

# Ou baixar instalador
# https://www.postgresql.org/download/windows/
```

### Erro: "password authentication failed"

**Solução**: Verificar senha do banco

1. Acesse: https://app.supabase.com/project/YOUR_PROJECT/settings/database
2. Vá em "Database password"
3. Se não sabe a senha, clique em "Reset database password"
4. ⚠️ Atualize `.env.local` com nova senha (se necessário)

### Erro: "relation already exists"

**Solução**: Tabela já existe, precisa limpar antes

```sql
-- Opção 1: Drop schema e recriar
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Opção 2: Drop tabelas individuais
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
```

### Erro: "violates foreign key constraint"

**Solução**: Ordem de inserção incorreta

```sql
-- Desabilitar constraints temporariamente
SET session_replication_role = 'replica';

-- Executar INSERTs

-- Re-habilitar constraints
SET session_replication_role = 'origin';
```

### Restore parcial (alguns dados não voltaram)

**Causas possíveis**:
1. Backup estava incompleto
2. Dados foram criados DEPOIS do backup (30/10/2025 após 17:53)
3. Erro durante restore (verificar logs)

**Solução**:
- Verificar timestamp do backup vs timestamp dos dados perdidos
- Verificar logs do psql durante restore
- Considerar usar backup mais antigo se tiver

---

## Dados Perdidos Após 30/10/2025 17:53

**IMPORTANTE**: O backup mais recente é de **30 de outubro de 2025, 17:53**.

Qualquer dado criado DEPOIS desse horário **NÃO** está no backup e **NÃO** pode ser recuperado, a menos que você tenha:

1. **Backup adicional** mais recente (verificar se tem)
2. **Logs de execução** (`execution_logs` table - se não foi apagada)
3. **Logs do n8n** (verificar execuções recentes)
4. **Webhooks logs** do WhatsApp (Meta Business Suite)

### Como recuperar dados mais recentes (se possível):

```sql
-- Verificar se execution_logs foi preservada
SELECT COUNT(*) FROM execution_logs 
WHERE timestamp > '2025-10-30 17:53:00';

-- Se sim, pode reconstruir mensagens parcialmente
SELECT 
  input_data->>'phone' as phone,
  input_data->>'message' as message,
  timestamp
FROM execution_logs
WHERE node_name = 'parseMessage'
  AND timestamp > '2025-10-30 17:53:00'
ORDER BY timestamp;
```

---

## Prevenção Futura

### Configurar Backups Automáticos

**Agendar backup diário** (Task Scheduler do Windows):

1. Abrir Task Scheduler
2. Criar nova tarefa
3. Trigger: Diariamente às 2h AM
4. Action: Executar `C:\...\db\backup-complete.bat`
5. Salvar

### Point-in-Time Recovery (Supabase Pro)

Se tiver plano Pro do Supabase:

1. Ativar Point-in-Time Recovery
2. Settings → Database → Enable PITR
3. Permite restaurar banco para qualquer momento nas últimas 7 dias

### Replicação para outro Supabase

Configurar Supabase secundário (disaster recovery):

```sql
-- Em produção, usar logical replication
-- Ver: https://supabase.com/docs/guides/platform/backups
```

---

## Suporte

Se encontrar problemas, verifique:

1. **Logs do restore**: Salvo em `restore_TIMESTAMP.log`
2. **Backup de segurança**: Criado automaticamente antes do restore
3. **MIGRATION_WORKFLOW.md**: Mais detalhes sobre backups

**Dúvidas?** Verifique a documentação do projeto no `README.md`.

---

## Resumo Rápido

```powershell
# 1. Navegue até a pasta db
cd "c:\Users\Luisf\OneDrive\Github\Chatbot v2\db"

# 2. Execute o restore
.\restore-complete.bat 20251030_175352

# 3. Confirme (digite SIM)

# 4. Informe a senha do banco

# 5. Aguarde e verifique
```

**Boa sorte! 🍀**

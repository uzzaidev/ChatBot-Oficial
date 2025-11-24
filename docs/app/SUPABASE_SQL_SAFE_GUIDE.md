# Guia Seguro para Executar SQL no Supabase

## ⚠️ Por Que Ter Cuidado?

O SQL Editor do Supabase executa comandos diretamente no banco de dados. Comandos mal escritos podem:
- Deletar dados acidentalmente
- Quebrar a estrutura do banco
- Corromper relacionamentos
- Causar problemas difíceis de reverter

---

## ✅ Script Seguro Criado

Criei um script **à prova de falhas** em: `scripts/create-push-tokens-table-SAFE.sql`

### Características de Segurança:

1. **Idempotente**
   - Pode executar múltiplas vezes sem erro
   - Usa `IF NOT EXISTS` e `DROP IF EXISTS`

2. **Não Destrutivo**
   - Não deleta dados existentes
   - Não altera tabelas existentes (só cria se não existir)

3. **Transacional**
   - Usa `BEGIN` e `COMMIT`
   - Se der erro, faz rollback automático

4. **Verificações**
   - Remove policies antigas antes de criar novas
   - Evita conflitos

---

## 📋 Como Executar com Segurança

### Passo 1: Revisar o Script

1. Abra o arquivo: `scripts/create-push-tokens-table-SAFE.sql`
2. Leia todo o código
3. Verifique se faz sentido

### Passo 2: Backup (Recomendado)

**Antes de executar qualquer SQL:**
1. No Supabase Dashboard → **Database** → **Backups**
2. Verificar se há backup recente
3. Se não houver, criar backup manual (se possível)

### Passo 3: Executar no SQL Editor

1. **Acesse Supabase Dashboard:**
   - https://app.supabase.com
   - Selecione seu projeto

2. **SQL Editor:**
   - Clique em **"SQL Editor"** no menu lateral
   - Clique **"New query"**

3. **Copiar Script:**
   - Abra `scripts/create-push-tokens-table-SAFE.sql`
   - Copie **TODO** o conteúdo (Ctrl+A, Ctrl+C)

4. **Colar no SQL Editor:**
   - Cole no editor (Ctrl+V)
   - **Revise novamente** antes de executar

5. **Executar:**
   - Clique **"Run"** ou pressione `Ctrl+Enter`
   - Aguarde resultado

### Passo 4: Verificar Resultado

**Sucesso esperado:**
```
Success. No rows returned
```

**Se aparecer erro:**
- **NÃO** execute novamente sem entender o erro
- Copie a mensagem de erro
- Me envie para eu ajudar

### Passo 5: Verificar Tabela Criada

1. **Table Editor:**
   - Clique em **"Table Editor"** no menu lateral
   - Procure por `push_tokens`
   - Deve aparecer na lista

2. **Verificar Estrutura:**
   - Clique na tabela `push_tokens`
   - Deve mostrar colunas:
     - `id` (UUID)
     - `user_id` (UUID)
     - `token` (TEXT)
     - `platform` (TEXT)
     - `created_at` (TIMESTAMPTZ)
     - `updated_at` (TIMESTAMPTZ)

---

## 🛡️ Boas Práticas

### ✅ FAZER:

1. **Sempre revisar** o SQL antes de executar
2. **Usar scripts com IF NOT EXISTS** (como o nosso)
3. **Testar em ambiente de desenvolvimento** primeiro (se tiver)
4. **Fazer backup** antes de mudanças grandes
5. **Executar comandos um de cada vez** se estiver inseguro

### ❌ NÃO FAZER:

1. **NÃO executar** SQL sem entender o que faz
2. **NÃO usar** comandos `DROP TABLE` sem backup
3. **NÃO deletar** dados sem confirmação
4. **NÃO executar** scripts de terceiros sem revisar
5. **NÃO ignorar** mensagens de erro

---

## 🔍 Verificação Adicional (Opcional)

Se quiser verificar se tudo foi criado corretamente, execute este SQL separadamente:

```sql
-- Verificar estrutura da tabela
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'push_tokens';

-- Verificar policies (RLS)
SELECT 
  policyname, 
  cmd 
FROM pg_policies 
WHERE tablename = 'push_tokens';
```

---

## 🐛 Se Algo Der Erro

### Erro: "relation already exists"
- **Causa:** Tabela já existe
- **Solução:** Normal! O script usa `IF NOT EXISTS`, então não cria novamente
- **Ação:** Pode ignorar ou verificar se a tabela está correta

### Erro: "policy already exists"
- **Causa:** Policy já existe
- **Solução:** O script remove e recria, então não deveria acontecer
- **Ação:** Se acontecer, me avise

### Erro: "permission denied"
- **Causa:** Sem permissão para criar tabela
- **Solução:** Verificar se está logado como admin/owner do projeto
- **Ação:** Verificar permissões no Supabase

---

## 📝 Resumo

1. ✅ Script seguro criado: `create-push-tokens-table-SAFE.sql`
2. ✅ Idempotente (pode executar múltiplas vezes)
3. ✅ Não destrutivo (não deleta nada)
4. ✅ Transacional (rollback em caso de erro)

**Próximo passo:** Executar o script no Supabase SQL Editor.

---

**Dúvidas?** Me avise antes de executar! 😊


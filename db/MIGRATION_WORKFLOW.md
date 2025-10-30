# 🔄 Workflow de Migrations - WhatsApp SaaS Chatbot

## ⚠️ REGRA DE OURO

**SEMPRE que for mudar a estrutura do banco de dados, USE MIGRATIONS!**

Nunca execute SQL direto no Supabase Dashboard para mudanças estruturais em produção.

---

## 📋 Dados do Nosso Banco de Dados

### Configurações Supabase

```bash
# Supabase Project
Project Ref: jhodhxvvhohygijqcxbo
Project URL: https://jhodhxvvhohygijqcxbo.supabase.co
Region: South America (São Paulo) - aws-1-sa-east-1
Database: postgres
Schema Principal: public

# Database Connection
Host (Pooler): aws-1-sa-east-1.pooler.supabase.com
Port (Pooler): 6543
Port (Direct): 5432
User: postgres.jhodhxvvhohygijqcxbo


# Schemas Utilizados
- public (Dados da aplicação)
- auth (Supabase Auth - usuários e autenticação)

# Tabelas Principais (Schema: public)
- clients (Configurações multi-tenant/clientes)
- user_profiles (Perfis de usuários com RBAC)
- user_invites (Convites para novos usuários)
- conversations (Conversas do WhatsApp)
- messages (Mensagens individuais)
- usage_logs (Logs de uso de IA e custos)
- pricing_config (Configuração de preços de modelos)
- execution_logs (Logs de execução do workflow)
- clientes_whatsapp (Tabela legada do n8n)
- n8n_chat_histories (Histórico de chat - usado pelo n8n)
- documents (Vector store para RAG)

# Tabelas do Auth Schema
- auth.users (Usuários Supabase - criados via admin API)
- auth.identities (Identidades de autenticação)
- auth.sessions (Sessões ativas)
- auth.refresh_tokens (Tokens de refresh)
```

---

## 🚀 Como Usar Migrations

### Pré-requisitos

```powershell
# 1. Instalar Supabase CLI (via Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# 2. Verificar instalação
supabase --version

# 3. Fazer login
supabase login

# 4. Linkar ao projeto (fazer apenas 1 vez)
supabase link --project-ref jhodhxvvhohygijqcxbo
```

---

## 📝 Workflow Padrão

### 1️⃣ Criar Nova Migration

```powershell
# Sintaxe: supabase migration new <nome_descritivo>
supabase migration new add_media_url_to_messages
```

Isso cria um arquivo em: `supabase/migrations/TIMESTAMP_add_media_url_to_messages.sql`

### 2️⃣ Editar a Migration

Abra o arquivo gerado e adicione seu SQL:

```sql
-- supabase/migrations/20251030143000_add_media_url_to_messages.sql

-- Adicionar coluna media_url para anexos
ALTER TABLE public.messages 
ADD COLUMN media_url TEXT;

-- Criar índice para performance
CREATE INDEX idx_messages_media_url ON public.messages(media_url) 
WHERE media_url IS NOT NULL;

-- Adicionar comentário
COMMENT ON COLUMN public.messages.media_url IS 'URL do arquivo de mídia (imagem, áudio, vídeo, documento)';
```

### 3️⃣ Testar Localmente (Opcional)

```powershell
# Se tiver Supabase rodando localmente
supabase start
supabase db reset  # Aplica todas as migrations do zero
```

### 4️⃣ Aplicar em Produção

```powershell
# Aplicar todas as migrations pendentes
supabase db push

# Verificar status antes de aplicar
supabase db diff
```

### 5️⃣ Commitar no Git

```powershell
git add supabase/migrations/
git commit -m "feat: add verified column to users table"
git push origin main
```

---

## 🎯 Exemplos Práticos

### Exemplo 1: Adicionar Nova Coluna

```powershell
# 1. Criar migration
supabase migration new add_priority_to_conversations

# 2. Editar arquivo gerado
```

```sql
-- Adicionar coluna priority
ALTER TABLE public.conversations 
ADD COLUMN priority INTEGER DEFAULT 0 CHECK (priority BETWEEN 0 AND 5);

-- Índice para ordenação
CREATE INDEX idx_conversations_priority ON public.conversations(priority DESC);

-- Comentário
COMMENT ON COLUMN public.conversations.priority IS 'Prioridade da conversa (0-5, sendo 5 a mais alta)';
```

```powershell
# 3. Aplicar
supabase db push
```

### Exemplo 2: Criar Nova Tabela

```powershell
# 1. Criar migration
supabase migration new create_quick_replies_table

# 2. Editar arquivo
```

```sql
-- Criar tabela de respostas rápidas
CREATE TABLE public.quick_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    response TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, keyword)
);

-- Índices
CREATE INDEX idx_quick_replies_client_id ON public.quick_replies(client_id);
CREATE INDEX idx_quick_replies_keyword ON public.quick_replies(keyword);
CREATE INDEX idx_quick_replies_is_active ON public.quick_replies(is_active);

-- RLS Policy
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage quick replies"
ON public.quick_replies FOR ALL
USING (auth.role() = 'service_role');

-- Trigger de updated_at
CREATE TRIGGER update_quick_replies_updated_at
    BEFORE UPDATE ON public.quick_replies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentário
COMMENT ON TABLE public.quick_replies IS 'Respostas automáticas rápidas por palavra-chave';
```

```powershell
# 3. Aplicar
supabase db push
```

### Exemplo 3: Modificar Coluna Existente

```powershell
# 1. Criar migration
supabase migration new change_message_content_type

# 2. Editar arquivo
```

```sql
-- Permitir mensagens maiores (para transcrições de áudio longas)
ALTER TABLE public.messages 
ALTER COLUMN content TYPE TEXT;

-- Remover constraint antiga (se existir)
ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_content_check;

-- Adicionar nova constraint
ALTER TABLE public.messages 
ADD CONSTRAINT messages_content_not_empty 
CHECK (LENGTH(content) > 0);
```

```powershell
# 3. Aplicar
supabase db push
```

### Exemplo 4: Adicionar RLS Policy para Multi-Tenant

```powershell
# 1. Criar migration
supabase migration new add_rls_policy_user_profiles

# 2. Editar arquivo
```

```sql
-- Política: Super admin vê todos os perfis
CREATE POLICY "Super admins can view all profiles"
ON public.user_profiles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
        AND up.role = 'admin'
    )
);

-- Política: Client admin vê apenas usuários do seu tenant
CREATE POLICY "Client admins can view own tenant users"
ON public.user_profiles FOR SELECT
USING (
    client_id = (
        SELECT client_id FROM public.user_profiles
        WHERE id = auth.uid()
    )
    AND
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
        AND up.role = 'client_admin'
    )
);

-- Política: Usuários podem ver próprio perfil
CREATE POLICY "Users can view own profile"
ON public.user_profiles FOR SELECT
USING (id = auth.uid());
```

```powershell
# 3. Aplicar
supabase db push
```

---

## 🔄 Como Fazer Rollback (Reverter)

**IMPORTANTE:** Supabase Migrations não tem rollback automático!

### Opção 1: Criar Migration de Reversão

```powershell
# Se aplicou migration que adicionou coluna 'media_url'
supabase migration new remove_media_url_from_messages
```

```sql
-- Reverter a mudança
ALTER TABLE public.messages DROP COLUMN media_url;
DROP INDEX IF EXISTS idx_messages_media_url;
```

```powershell
supabase db push
```

### Opção 2: Restaurar Backup Completo

```powershell
# 1. Executar script de backup completo (recomendado fazer antes de migrations arriscadas)
cd db
.\backup-complete.bat

# 2. Se precisar restaurar, use o psql com as credenciais do Supabase
# Consulte .env.local para obter a connection string
psql "postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres" -f chatbot_full_TIMESTAMP.sql
```

---

## 📦 Comandos Úteis

```powershell
# Listar todas as migrations
supabase migration list

# Baixar schema atual do Supabase (gera migration)
supabase db pull

# Ver diff entre local e remoto
supabase db diff

# Resetar banco local (reaplica todas migrations)
supabase db reset

# Linkar a outro projeto
supabase link --project-ref OUTRO_PROJECT_REF

# Ver status da conexão
supabase status
```

---

## ✅ Checklist de Migration

Antes de aplicar uma migration em produção:

- [ ] Migration tem nome descritivo
- [ ] SQL está correto e testado
- [ ] Índices criados para colunas pesquisadas
- [ ] RLS policies ajustadas (se necessário)
- [ ] Triggers de `updated_at` adicionados (se nova tabela)
- [ ] Comentários explicativos no código SQL
- [ ] Backup recente do banco existe
- [ ] Migration commitada no Git
- [ ] Testada localmente (se possível)

---

## ⚠️ O Que NÃO Fazer

### ❌ Nunca Faça Isso:

1. **Executar SQL direto no Dashboard para mudanças estruturais**
   ```sql
   -- ❌ NÃO fazer direto no SQL Editor do Supabase
   ALTER TABLE public.messages ADD COLUMN media_url TEXT;
   ```

2. **Editar migrations já aplicadas**
   ```powershell
   # ❌ NÃO editar arquivo que já foi aplicado
   # Se errou, crie uma NOVA migration para corrigir
   ```

3. **Deletar arquivos de migration**
   ```powershell
   # ❌ NÃO deletar migrations antigas
   # Elas são o histórico do banco
   ```

4. **Usar migrations para inserir dados de produção**
   ```sql
   -- ❌ NÃO usar migration para dados de clientes reais
   INSERT INTO public.clients (name, verify_token) VALUES ('Cliente Teste', 'abc123');
   
   -- ✅ Use seed separado para dados de desenvolvimento/teste
   -- migrations/seed_data.sql (não aplicar em produção)
   ```

5. **Modificar tabelas legadas do n8n sem coordenação**
   ```sql
   -- ❌ NÃO modificar essas tabelas sem cuidado (n8n depende delas)
   -- - clientes_whatsapp
   -- - n8n_chat_histories
   -- - documents
   ```

---

## 🎯 Quando Usar Cada Ferramenta

| Situação | Ferramenta | Comando |
|----------|-----------|---------|
| Mudar estrutura do banco | **Migration** | `supabase migration new` |
| Backup completo (public + auth) | **pg_dump** | `.\backup-complete.bat` |
| Backup apenas aplicação | **pg_dump** | `.\backup-postgres.bat` |
| Backup apenas auth | **pg_dump** | `.\backup-auth.bat` |
| Testar SQL rápido | **SQL Editor** | Dashboard Supabase |
| Dados de seed/demo | **Seed File** | `migrations/seed_data.sql` |
| Ver schema atual | **Pull** | `supabase db pull` |
| Migrar para outro banco | **Backup + Restore** | `pg_dump` + `psql` |

---

## 📚 Recursos Adicionais

- [Documentação Supabase Migrations](https://supabase.com/docs/guides/cli/managing-environments#database-migrations)
- [Documentação Supabase CLI](https://supabase.com/docs/reference/cli/introduction)
- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)

---

## 🔑 Resumo

```
┌────────────────────────────────────────────────┐
│   MUDANÇA NO BANCO DE DADOS?                   │
│   ↓                                            │
│   1. supabase migration new <nome>            │
│   2. Editar arquivo .sql gerado                │
│   3. supabase db push                          │
│   4. git commit + push                         │
└────────────────────────────────────────────────┘
```

**Nunca pule esse workflow!** Suas futuras entregas e colaboradores agradecem. 🙏

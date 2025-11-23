# Como Corrigir Usuário Sem Profile no Supabase

Guia passo a passo para iniciantes corrigir o erro "Usuário sem perfil configurado".

---

## 📋 O Problema

Quando você cria um usuário no Supabase Dashboard, ele cria apenas o registro em `auth.users`, mas **não cria automaticamente** o `user_profile` que o app precisa.

**Erro no app:** "Usuário sem perfil configurado. Contate o administrador."

---

## ✅ Solução Passo a Passo

### Passo 1: Acessar o Supabase

1. Abra seu navegador (Chrome, Edge, etc.)
2. Acesse: **https://app.supabase.com**
3. Faça login com sua conta
4. Selecione seu projeto (ex: "UzzAi's projects")

---

### Passo 2: Abrir o SQL Editor

1. No menu lateral esquerdo, procure por **"SQL Editor"**
   - Pode estar em uma seção chamada "SQL" ou "Database"
   - Ou procure pelo ícone de banco de dados
2. Clique em **"SQL Editor"**
3. Você verá uma tela com:
   - Painel esquerdo: Lista de queries salvas
   - Painel central: Editor de código SQL (área branca grande)
   - Botão "Run" ou "▶️" no canto superior direito

---

### Passo 3: Criar Nova Query

1. Clique no botão **"New query"** (geralmente no topo)
2. Ou clique na área branca do editor
3. Uma nova aba/query será criada

---

### Passo 4: Verificar se o Client Existe

**Primeiro, vamos verificar se o client padrão existe:**

1. **Copie e cole** este código SQL no editor:

```sql
SELECT id, name, email 
FROM public.clients 
WHERE id = 'b21b314f-c49a-467d-94b3-a21ed4412227';
```

2. Clique no botão **"Run"** (ou pressione `Ctrl + Enter`)
3. **Resultado esperado:**
   - Se aparecer uma linha com `id`, `name`, `email` → ✅ Client existe, pode continuar
   - Se aparecer "0 rows" → ⚠️ Precisa criar o client primeiro (veja Passo Extra abaixo)

---

### Passo 5: Criar o User Profile

**Agora vamos criar o profile para o usuário:**

1. **Copie e cole** este código SQL completo no editor:

```sql
-- Criar user_profile para pedro.pagliarin@uzzai.com.br
INSERT INTO public.user_profiles (
  id,
  client_id,
  email,
  full_name,
  role,
  is_active
)
SELECT 
  u.id,
  'b21b314f-c49a-467d-94b3-a21ed4412227'::UUID,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', 'Pedro Pagliarin'),
  'user',
  true
FROM auth.users u
WHERE u.email = 'pedro.pagliarin@uzzai.com.br'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_profiles p WHERE p.id = u.id
  );
```

2. Clique em **"Run"** (ou `Ctrl + Enter`)
3. **Resultado esperado:**
   - Mensagem: "Success. No rows returned" ou "INSERT 0 1"
   - ✅ Profile criado com sucesso!

---

### Passo 6: Atualizar Metadata do Usuário

**Agora vamos atualizar os metadados do usuário:**

1. **Copie e cole** este código SQL:

```sql
-- Atualizar metadata do usuário com client_id
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object(
  'client_id', 'b21b314f-c49a-467d-94b3-a21ed4412227',
  'full_name', COALESCE(raw_user_meta_data->>'full_name', 'Pedro Pagliarin'),
  'email_verified', true
)
WHERE email = 'pedro.pagliarin@uzzai.com.br';
```

2. Clique em **"Run"**
3. **Resultado esperado:**
   - Mensagem: "UPDATE 1" ou "Success"
   - ✅ Metadata atualizado!

---

### Passo 7: Verificar se Funcionou

**Vamos confirmar que tudo está correto:**

1. **Copie e cole** este código SQL:

```sql
-- Verificar se foi criado corretamente
SELECT 
  u.email,
  u.raw_user_meta_data->>'client_id' as metadata_client_id,
  p.client_id as profile_client_id,
  p.role,
  p.is_active,
  c.name as client_name
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.id = u.id
LEFT JOIN public.clients c ON c.id = p.client_id
WHERE u.email = 'pedro.pagliarin@uzzai.com.br';
```

2. Clique em **"Run"**
3. **Resultado esperado:**
   - Deve aparecer **1 linha** com:
     - `email`: pedro.pagliarin@uzzai.com.br
     - `metadata_client_id`: b21b314f-c49a-467d-94b3-a21ed4412227
     - `profile_client_id`: b21b314f-c49a-467d-94b3-a21ed4412227
     - `role`: user
     - `is_active`: true
     - `client_name`: (nome do cliente)
   - ✅ Tudo correto!

---

### Passo 8: Testar no App

1. Volte para o emulador Android
2. Tente fazer login novamente com:
   - Email: `pedro.pagliarin@uzzai.com.br`
   - Senha: (a senha que você criou)
3. **Resultado esperado:**
   - ✅ Login deve funcionar!
   - ✅ Não deve aparecer mais o erro "Usuário sem perfil configurado"

---

## 🔧 Passo Extra: Se o Client Não Existir

Se no Passo 4 você viu "0 rows", precisa criar o client primeiro:

1. **Copie e cole** este SQL:

```sql
-- Criar client padrão
INSERT INTO public.clients (
  id,
  name,
  email,
  created_at,
  updated_at
)
VALUES (
  'b21b314f-c49a-467d-94b3-a21ed4412227'::UUID,
  'Cliente Padrão',
  'admin@exemplo.com',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;
```

2. Clique em **"Run"**
3. Depois volte ao **Passo 5**

---

## 📸 Onde Encontrar Cada Coisa

### SQL Editor
- **Localização:** Menu lateral → "SQL Editor" ou "Database" → "SQL Editor"
- **Como identificar:** Área branca grande com código, botão "Run" no topo

### Botão Run
- **Localização:** Canto superior direito do SQL Editor
- **Como identificar:** Botão verde com texto "Run" ou ícone ▶️
- **Atalho:** `Ctrl + Enter` (Windows) ou `Cmd + Enter` (Mac)

### Resultado da Query
- **Localização:** Abaixo do editor SQL
- **Como identificar:** Tabela com resultados ou mensagem de sucesso/erro

---

## ⚠️ Problemas Comuns

### Erro: "relation 'public.clients' does not exist"
**Causa:** Tabela `clients` não existe no banco.

**Solução:** Execute as migrations primeiro:
1. Vá em "SQL Editor"
2. Execute `migrations/006_setup_default_client.sql`

---

### Erro: "duplicate key value violates unique constraint"
**Causa:** Profile já existe para esse usuário.

**Solução:** Execute apenas o UPDATE (Passo 6), não precisa do INSERT (Passo 5).

---

### Erro: "permission denied for table user_profiles"
**Causa:** Você não tem permissão (raro).

**Solução:** Verifique se está logado como admin do projeto.

---

## ✅ Checklist Final

Antes de testar no app, verifique:

- [ ] Passo 4 executado: Client existe
- [ ] Passo 5 executado: Profile criado (mensagem de sucesso)
- [ ] Passo 6 executado: Metadata atualizado (UPDATE 1)
- [ ] Passo 7 executado: Verificação mostra dados corretos
- [ ] App mobile rebuildado: `npm run build:mobile && npm run cap:sync`
- [ ] App reinstalado no emulador

---

## 🎯 Resumo Rápido (Para Quando Já Souber)

```sql
-- 1. Verificar client
SELECT id FROM public.clients WHERE id = 'b21b314f-c49a-467d-94b3-a21ed4412227';

-- 2. Criar profile
INSERT INTO public.user_profiles (id, client_id, email, full_name, role, is_active)
SELECT u.id, 'b21b314f-c49a-467d-94b3-a21ed4412227'::UUID, u.email, 'Pedro Pagliarin', 'user', true
FROM auth.users u
WHERE u.email = 'pedro.pagliarin@uzzai.com.br'
  AND NOT EXISTS (SELECT 1 FROM public.user_profiles p WHERE p.id = u.id);

-- 3. Atualizar metadata
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object('client_id', 'b21b314f-c49a-467d-94b3-a21ed4412227', 'full_name', 'Pedro Pagliarin', 'email_verified', true)
WHERE email = 'pedro.pagliarin@uzzai.com.br';
```

---

**Dúvidas?** Se algo não funcionar, me avise qual passo deu erro e qual mensagem apareceu!


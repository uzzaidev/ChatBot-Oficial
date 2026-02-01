# Migration: Create Chat Backgrounds Storage Bucket

## ⚠️ IMPORTANTE: Criar Bucket Manualmente

O bucket de Storage não pode ser criado via SQL. Siga os passos abaixo:

### Passo 1: Criar Bucket no Dashboard

1. Acesse o Supabase Dashboard: https://app.supabase.com
2. Selecione seu projeto
3. No menu lateral, clique em **Storage**
4. Clique em **"Create a new bucket"** ou **"New Bucket"**
5. Preencha:
   - **Name:** `chat-backgrounds`
   - **Public bucket:** ✅ **Marcado** (importante para URLs públicas acessíveis)
   - **File size limit:** `5 MB`
   - **Allowed MIME types:** `image/jpeg, image/png, image/webp`
6. Clique em **"Create bucket"**

### Passo 2: Executar Migration de Policies

Após criar o bucket manualmente, execute a migration:

```bash
supabase/migrations/20260201000002_create_user_chat_themes.sql
```

---

## Estrutura do Bucket

```
chat-backgrounds/
├── user-{user_id_1}/
│   └── background-{timestamp}.jpg
├── user-{user_id_2}/
│   └── background-{timestamp}.png
└── user-{user_id_3}/
    └── background-{timestamp}.webp
```

**Padrão de nomenclatura:**
- Pasta por usuário: `user-{user_id}`
- Arquivo: `background-{timestamp}.{extension}`

---

## Verificação

Execute no SQL Editor para verificar:

```sql
-- Verificar se bucket existe
SELECT * FROM storage.buckets WHERE id = 'chat-backgrounds';

-- Deve retornar:
-- id: chat-backgrounds
-- name: chat-backgrounds
-- public: true
```

---

## Contexto

Este bucket armazena imagens de fundo personalizadas para a área de conversas do chat.
Cada usuário pode fazer upload de sua própria imagem (até 5MB) em formato JPEG, PNG ou WebP.

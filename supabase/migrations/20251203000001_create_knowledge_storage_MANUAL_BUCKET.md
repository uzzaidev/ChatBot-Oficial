# Migration: Create Knowledge Documents Storage Bucket

## ⚠️ IMPORTANTE: Criar Bucket Manualmente

O bucket de Storage não pode ser criado via SQL. Siga os passos abaixo:

### Passo 1: Criar Bucket no Dashboard

1. Acesse o Supabase Dashboard: https://app.supabase.com
2. Selecione seu projeto
3. No menu lateral, clique em **Storage**
4. Clique em **"Create a new bucket"** ou **"New Bucket"**
5. Preencha:
   - **Name:** `knowledge-documents`
   - **Public bucket:** ✅ **Marcado** (importante para URLs públicas do WhatsApp)
   - **File size limit:** `10 MB` (ou conforme necessário)
   - **Allowed MIME types:** `image/*, application/pdf, text/plain` (opcional)
6. Clique em **"Create bucket"**

### Passo 2: Executar Migration de Policies

Após criar o bucket manualmente, execute a migration:

```bash
supabase/migrations/20251203000001_create_knowledge_storage_policies.sql
```

---

## Estrutura do Bucket

```
knowledge-documents/
├── {client_id_1}/
│   ├── catalog/
│   │   └── {timestamp}-{filename}.pdf
│   ├── manual/
│   │   └── {timestamp}-{filename}.pdf
│   ├── image/
│   │   └── {timestamp}-{filename}.png
│   └── general/
│       └── {timestamp}-{filename}.txt
└── {client_id_2}/
    └── ...
```

---

## Verificação

Execute no SQL Editor para verificar:

```sql
-- Verificar se bucket existe
SELECT * FROM storage.buckets WHERE id = 'knowledge-documents';

-- Deve retornar:
-- id: knowledge-documents
-- name: knowledge-documents
-- public: true
```

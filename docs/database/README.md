# 📊 Exportação do Schema do Banco de Dados

Este diretório contém a exportação completa do schema do banco de dados Supabase.

## 🚀 Como Exportar

Execute o script de exportação:

```bash
node scripts/export-database-schema.js
```

### Pré-requisitos

Configure as variáveis de ambiente no `.env.local`:

```env
# Opção 1: POSTGRES_URL (recomendado - compatível com projeto)
POSTGRES_URL=postgresql://postgres.xxx:password@aws-1-sa-east-1.pooler.supabase.com:6543/postgres

# Opção 2: POSTGRES_URL_NON_POOLING (usado em scripts de restore)
POSTGRES_URL_NON_POOLING=postgresql://postgres.xxx:password@aws-1-sa-east-1.pooler.supabase.com:5432/postgres

# Opção 3: Variáveis individuais (compatível com src/lib/postgres.ts)
POSTGRES_HOST=db.jhodhxvvhohygijqcxbo.supabase.co
POSTGRES_PORT=6543
POSTGRES_USER=postgres.jhodhxvvhohygijqcxbo
POSTGRES_PASSWORD=your_password
POSTGRES_DATABASE=postgres
```

**✅ Compatível com:** `src/lib/postgres.ts` e scripts em `db/restore/`

### Onde encontrar a connection string?

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **Settings** → **Database**
4. Em **Connection string**, copie a string de conexão
5. Substitua `[YOUR-PASSWORD]` pela senha do banco

## 📁 Arquivos Gerados

Após executar o script, serão gerados:

- **`schema-export.json`** - Schema completo em formato JSON (máquina-legível)
- **`schema-export.md`** - Documentação Markdown (humano-legível)

## 📋 O que é Exportado

- ✅ Todas as tabelas e suas colunas
- ✅ Tipos de dados e constraints
- ✅ Políticas RLS (Row Level Security)
- ✅ Triggers e suas funções
- ✅ Funções customizadas
- ✅ Constraints e Foreign Keys
- ✅ Índices

## 🔄 Atualizar Exportação

Execute o script sempre que houver mudanças no banco de dados para manter a documentação atualizada.

---

**Última exportação:** Verifique a data no arquivo `schema-export.md`


# 📊 Como Exportar o Schema do Banco de Dados

Este guia mostra como exportar todas as informações do banco de dados Supabase para análise e documentação.

---

## 🎯 Objetivo

Exportar o schema completo do banco de dados incluindo:
- ✅ Todas as tabelas e colunas
- ✅ Políticas RLS
- ✅ Triggers
- ✅ Funções
- ✅ Constraints e Foreign Keys
- ✅ Índices

---

## 📋 Passo a Passo

### 1. Configurar Variáveis de Ambiente

Adicione no arquivo `.env.local` (na raiz do projeto):

```env
# Opção 1: POSTGRES_URL (Pooled) - RECOMENDADO (compatível com projeto)
POSTGRES_URL=postgresql://postgres.xxx:SUA_SENHA@aws-1-sa-east-1.pooler.supabase.com:6543/postgres

# Opção 2: POSTGRES_URL_NON_POOLING (Direct) - usado em scripts de restore
POSTGRES_URL_NON_POOLING=postgresql://postgres.xxx:SUA_SENHA@aws-1-sa-east-1.pooler.supabase.com:5432/postgres

# Opção 3: Variáveis individuais (compatível com src/lib/postgres.ts)
POSTGRES_HOST=db.jhodhxvvhohygijqcxbo.supabase.co
POSTGRES_PORT=6543
POSTGRES_USER=postgres.jhodhxvvhohygijqcxbo
POSTGRES_PASSWORD=SUA_SENHA
POSTGRES_DATABASE=postgres
```

**⚠️ IMPORTANTE:** Este script usa as **mesmas variáveis** que o resto do projeto para manter consistência.

### 2. Onde Encontrar a Connection String?

1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. Vá em **Settings** → **Database**
4. Em **Connection string**, copie a string
5. Substitua `[YOUR-PASSWORD]` pela senha do banco

**Exemplo:**
```
postgresql://postgres.jhodhxvvhohygijqcxbo:SUA_SENHA@aws-1-sa-east-1.pooler.supabase.com:5432/postgres
```

### 3. Executar o Script

```bash
# Opção 1: Usando npm script
npm run db:export

# Opção 2: Direto com node
node scripts/export-database-schema.js
```

### 4. Resultado

O script irá gerar dois arquivos em `docs/database/`:

- **`schema-export.json`** - Dados completos em JSON (para análise programática)
- **`schema-export.md`** - Documentação legível em Markdown

---

## 📁 Estrutura dos Arquivos Gerados

### `schema-export.json`

```json
{
  "exported_at": "2026-01-16T10:30:00.000Z",
  "database_info": {
    "database_name": "postgres",
    "postgres_version": "PostgreSQL 15.x",
    "current_user": "postgres"
  },
  "tables": [
    {
      "schema": "public",
      "name": "clients",
      "columns": [...]
    }
  ],
  "rls_policies": [...],
  "triggers": [...],
  "functions": [...],
  "constraints": [...],
  "indexes": [...]
}
```

### `schema-export.md`

Documentação formatada em Markdown com:
- Lista de todas as tabelas
- Colunas com tipos e constraints
- Políticas RLS por tabela
- Triggers e funções
- Constraints e Foreign Keys
- Índices

---

## 🔍 Como Usar a Exportação

### Para Análise Manual

1. Abra `docs/database/schema-export.md` no seu editor
2. Procure por tabelas específicas
3. Veja colunas, tipos e relacionamentos

### Para Análise Programática

1. Importe `docs/database/schema-export.json` no seu código
2. Analise programaticamente as estruturas
3. Compare com o que precisa ser implementado

### Para Documentação

1. Use o Markdown gerado como referência
2. Atualize quando houver mudanças no banco
3. Compartilhe com a equipe

---

## ⚠️ Troubleshooting

### Erro: "Variáveis de ambiente não configuradas"

**Solução:**
- Verifique se o `.env.local` existe na raiz do projeto
- Confirme que as variáveis estão corretas
- Tente usar `DATABASE_URL` completo

### Erro: "Connection refused" ou timeout

**Solução:**
- Verifique se a connection string está correta
- Confirme que o IP está liberado no Supabase (Settings → Database → Connection Pooling)
- Tente usar a porta 6543 (pooler) ao invés de 5432

### Erro: "password authentication failed"

**Solução:**
- Verifique se a senha está correta
- Use a senha do banco, não a API key
- A senha está em: Supabase Dashboard → Settings → Database → Database password

---

## 🔄 Atualizar Exportação

Execute o script sempre que:
- ✅ Criar novas tabelas
- ✅ Adicionar/modificar colunas
- ✅ Criar novas políticas RLS
- ✅ Adicionar triggers ou funções
- ✅ Fazer qualquer mudança estrutural no banco

**Comando rápido:**
```bash
npm run db:export
```

---

## 📚 Próximos Passos

Após exportar:

1. **Analise o schema** para entender a estrutura atual
2. **Compare com `FALTA_IMPLEMENTAR.md`** para ver o que precisa ser criado
3. **Identifique gaps** entre o que existe e o que é necessário
4. **Planeje migrations** para novas tabelas/colunas

---

**Última atualização:** 2026-01-16


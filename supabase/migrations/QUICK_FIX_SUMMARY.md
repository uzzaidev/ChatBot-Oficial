# Correção Rápida - Nomes das Colunas + Tipos de Dados

## 🐛 Problemas

### Problema 1: Nomes de colunas errados
```
ERROR: column cw.phone does not exist
```

### Problema 2: Tipos de dados incompatíveis
```
ERROR: operator does not exist: text = numeric
HINT: No operator matches the given name and argument types.
```

## ✅ Causas

1. A tabela `clientes_whatsapp` usa nomes de colunas em **português**:
   - ❌ `phone` → ✅ `telefone`
   - ❌ `name` → ✅ `nome`

2. A coluna `telefone` é **NUMERIC**, mas `ul.phone` é **TEXT**:
   - Precisa de cast: `cw.telefone::TEXT`

## 🔧 Correção

### Antes (ERRADO):
```sql
LEFT JOIN clientes_whatsapp cw ON ul.phone = cw.phone
COALESCE(cw.name, 'Sem nome')
```

### Tentativa 1 (ainda ERRADO):
```sql
LEFT JOIN clientes_whatsapp cw ON ul.phone = cw.telefone  -- ❌ Erro de tipo
COALESCE(cw.nome, 'Sem nome')
```

### Depois (CORRETO):
```sql
LEFT JOIN clientes_whatsapp cw ON ul.phone = cw.telefone::TEXT  -- ✅ Com cast
COALESCE(cw.nome, 'Sem nome')
```

## 📋 Arquivos Corrigidos

- ✅ `migrations/011_analytics_usage_tracking.sql`
- ✅ `migrations/FIX_pricing_and_analytics.sql`
- ✅ `RLS_AND_NAMES_FIX.md`

## 🚀 Próximo Passo

Execute novamente no Supabase:
```sql
-- Cole o conteúdo ATUALIZADO de:
migrations/FIX_pricing_and_analytics.sql
```

**Agora deve funcionar sem erros!** ✅

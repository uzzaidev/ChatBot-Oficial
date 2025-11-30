# 🎯 CORREÇÃO APLICADA: Bug Multi-Tenant de Isolamento de Telefone

## O Que Aconteceu

Você identificou **corretamente** o bug! 🎉

O problema **NÃO ERA** nos prompts, mas sim no **histórico de conversa** e **registro de clientes**:

### Problema Real

A tabela `clientes_whatsapp` tinha constraint `UNIQUE(telefone)`, permitindo **apenas um registro por telefone globalmente**. Isso causava:

1. **Cliente A** testa com `+5511999999999`
2. **Cliente B** testa com o **mesmo número**
3. Sistema faz **UPSERT** e **sobrescreve** o registro do Cliente A
4. Cliente A perde:
   - Histórico de chat
   - Status (bot/humano)
   - Nome do usuário
5. Mensagens novas do Cliente A **pegam histórico do Cliente B**

### Por Que os Prompts Pareciam Errados

O código de prompt **estava correto**, mas:
- Cliente B recebia histórico de conversa do Cliente A
- Histórico continha respostas com o estilo do Cliente A
- IA continuava o contexto do outro cliente

**Exemplo**:
```
Cliente A (Luis Boff): "Olá, preciso de consultoria em energia solar"
IA: "Olá! Sou assistente do Luis Fernando Boff, engenheiro..."

[Cliente B começa a usar o mesmo número]
Cliente B (Sports Training): "Preciso de treinos"
IA: [pega histórico do Cliente A] "Continuando sobre energia solar..."
```

---

## Correção Aplicada

### 1. Migration do Banco de Dados

**Arquivo**: `migrations/009_fix_multi_tenant_phone_constraint.sql`

**Mudanças**:
```sql
-- Antes (ERRADO)
UNIQUE (telefone)

-- Depois (CORRETO)
UNIQUE (telefone, client_id)
```

**Efeito**: Agora o mesmo telefone pode existir em **clientes diferentes** (isolado).

### 2. Atualização do Código

**Arquivo**: `src/nodes/checkOrCreateCustomer.ts`

**Mudanças**:
```typescript
// Antes (ERRADO)
onConflict: 'telefone'

// Depois (CORRETO)
onConflict: 'telefone,client_id'
```

**Efeito**: UPSERT agora usa chave composta, mantendo isolamento.

---

## Como Aplicar a Correção

### Passo 1: Executar Migration

```bash
# 1. Abrir Supabase SQL Editor
https://app.supabase.com/project/_/sql

# 2. Copiar e executar o arquivo:
migrations/009_fix_multi_tenant_phone_constraint.sql
```

**Resultado esperado**:
```
✅ Removed old UNIQUE(telefone) constraint
✅ Added new UNIQUE(telefone, client_id) constraint
✅ MIGRATION SUCCESSFUL!
```

### Passo 2: Reiniciar Servidor (se estiver rodando)

```bash
# Parar servidor (Ctrl+C)
# Reiniciar
npm run dev
```

### Passo 3: Testar a Correção

```bash
# Abrir SQL Editor novamente
# Executar:
db/test_multi_tenant_phone_isolation.sql
```

**Resultado esperado**: Todos os 10 testes devem passar ✅

---

## Validação em Produção

### Teste Manual

1. **Cliente A** envia mensagem via WhatsApp com número `+5511AAAA`
2. **Cliente B** envia mensagem via WhatsApp com **mesmo número** `+5511AAAA`
3. Ambos devem ter:
   - ✅ Históricos separados
   - ✅ Prompts corretos (cada um o seu)
   - ✅ Status independentes

### SQL para Verificar

```sql
-- Ver se há telefones compartilhados (agora é permitido!)
SELECT 
  telefone,
  COUNT(DISTINCT client_id) as num_clients,
  STRING_AGG(nome, ', ') as names
FROM clientes_whatsapp
GROUP BY telefone
HAVING COUNT(DISTINCT client_id) > 1;
```

Se retornar resultados, **isso é CORRETO agora**! Significa que o isolamento está funcionando.

---

## O Que Mudou

### Antes da Correção (VULNERÁVEL) ❌

```
Tabela clientes_whatsapp:
┌─────────────────┬──────────┬──────────────┬────────┐
│ telefone        │ nome     │ client_id    │ status │
├─────────────────┼──────────┼──────────────┼────────┤
│ +5511999999999  │ Luis     │ client-a-id  │ bot    │ ← Único registro
└─────────────────┴──────────┴──────────────┴────────┘

Cliente B tenta criar com mesmo telefone:
→ UPSERT detecta conflito em "telefone"
→ SOBRESCREVE registro do Cliente A

┌─────────────────┬──────────┬──────────────┬────────┐
│ telefone        │ nome     │ client_id    │ status │
├─────────────────┼──────────┼──────────────┼────────┤
│ +5511999999999  │ Sports   │ client-b-id  │ bot    │ ← Cliente A perdeu dados!
└─────────────────┴──────────┴──────────────┴────────┘
```

### Depois da Correção (SEGURO) ✅

```
Tabela clientes_whatsapp:
┌─────────────────┬──────────┬──────────────┬────────┐
│ telefone        │ nome     │ client_id    │ status │
├─────────────────┼──────────┼──────────────┼────────┤
│ +5511999999999  │ Luis     │ client-a-id  │ bot    │ ← Cliente A
│ +5511999999999  │ Sports   │ client-b-id  │ bot    │ ← Cliente B (isolado!)
└─────────────────┴──────────┴──────────────┴────────┘

UNIQUE (telefone, client_id) permite:
✅ Mesmo telefone em clientes diferentes (isolado)
❌ Duplicata dentro do mesmo cliente (correto)
```

---

## Arquivos Criados/Modificados

### Criados ✨

1. **`migrations/009_fix_multi_tenant_phone_constraint.sql`**
   - Migration para corrigir constraint do banco

2. **`db/test_multi_tenant_phone_isolation.sql`**
   - Testes automatizados para validar correção

3. **`docs/security/VULN-013-MULTI-TENANT-PHONE-ISOLATION.md`**
   - Documentação completa do bug e correção

### Modificados 🔧

1. **`src/nodes/checkOrCreateCustomer.ts`** (linha 42)
   - Mudou `onConflict: 'telefone'` para `onConflict: 'telefone,client_id'`

---

## Próximos Passos

### Imediato (AGORA) 🔥

1. ✅ Execute a migration: `migrations/009_fix_multi_tenant_phone_constraint.sql`
2. ✅ Reinicie o servidor: `npm run dev`
3. ✅ Execute os testes: `db/test_multi_tenant_phone_isolation.sql`

### Validação (Hoje) ✅

1. Teste com **dois clientes diferentes** usando o **mesmo número**
2. Verifique que:
   - Cada um tem histórico separado
   - Prompts corretos são usados
   - Status são independentes

### Documentação (Esta semana) 📝

1. Adicionar ao CHANGELOG
2. Comunicar clientes afetados (se houver)
3. Revisar outros lugares com mesmo padrão

---

## Perguntas Frequentes

### P: Por que os prompts pareciam estar errados?

**R**: O sistema **carregava o prompt correto** do cliente (via webhook URL), mas **usava o histórico de chat errado** (do outro cliente). A IA continuava a conversa do contexto errado.

### P: Outros dados vazaram entre clientes?

**R**: **NÃO**. As tabelas `clients`, `n8n_chat_histories`, e `documents` **já tinham isolamento correto** (filtram por `client_id`). Apenas `clientes_whatsapp` tinha o bug.

### P: Preciso limpar dados antigos?

**R**: **Depende**. Se houver registros duplicados (mesmo telefone, clientes diferentes), eles serão **preservados** após a migration. Execute o SQL de verificação para conferir.

### P: Isso afeta produção agora?

**R**: **SIM**, se dois clientes testarem com o mesmo número. A correção deve ser aplicada **imediatamente**.

---

## Resumo

✅ **Bug identificado**: Constraint `UNIQUE(telefone)` permitia apenas um registro global
✅ **Correção criada**: Mudança para `UNIQUE(telefone, client_id)`
✅ **Código atualizado**: UPSERT usa chave composta
✅ **Testes criados**: Validação automatizada
✅ **Documentação completa**: VULN-013

**Status**: ⏳ Aguardando aplicação da migration

**Prioridade**: 🔴 CRÍTICA

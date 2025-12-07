# Scripts de Migration e Testes

## 🔄 Migration: Adicionar Valores Padrão

O script `migrate-transfer-blocks.ts` atualiza flows existentes com os novos campos de configuração.

### Como Executar

```bash
# Instalar tsx se não tiver
npm install -g tsx

# Rodar migration
npx tsx scripts/migrate-transfer-blocks.ts
```

### O que a Migration Faz

1. **Busca todos os flows** do banco de dados
2. **Identifica blocos** ai_handoff e human_handoff
3. **Adiciona valores padrão** se não existirem:
   - AI Handoff:
     - `autoRespond`: true
     - `includeFlowContext`: true
     - `contextFormat`: 'summary'
     - `transitionMessage`: '' (vazio)
   - Human Handoff:
     - `notifyAgent`: true
     - `transitionMessage`: 'Um atendente humano vai te responder em breve.'
4. **Atualiza flows** no banco
5. **Mostra relatório** de quantos foram atualizados

### Segurança

- ✅ Não sobrescreve valores existentes
- ✅ Apenas adiciona campos ausentes
- ✅ Pode ser executado múltiplas vezes (idempotente)
- ✅ Mostra preview antes de executar

### Output Esperado

```
🚀 Starting migration: Add default values to transfer blocks

📊 Fetching all interactive flows...
✅ Found 5 flows

📝 Processing flow: Fluxo de Vendas (flow-123)
  🤖 Migrating AI Handoff block: ai-block-1
  💾 Updating flow in database...
  ✅ Flow updated successfully

...

============================================================
📊 MIGRATION SUMMARY
============================================================
Total flows processed: 5
Flows updated: 3
AI Handoff blocks migrated: 2
Human Handoff blocks migrated: 1
============================================================

✅ Migration completed successfully!
```

## 🧪 Testes

### Testes Unitários

```bash
# Rodar testes
npm test

# Rodar apenas testes de FlowExecutor
npm test flowExecutor
```

### Testes de Integração

```bash
# Rodar testes de integração
npm test integration
```

### Testes Manuais

Ver checklist em: `docs/flows/TRANSFER_TESTING_CHECKLIST.md`

## 📋 Ordem Recomendada

1. **Rodar migration** (se tiver flows existentes)
2. **Rodar testes unitários** para validar lógica
3. **Seguir checklist** de testes manuais em staging
4. **Deploy para produção**


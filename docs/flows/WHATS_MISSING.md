# 📋 O QUE FALTA PARA OS FLOWS FUNCIONAREM

**Status Atual**: Sistema 95% implementado. Webhook já integrado com flows.

---

## ✅ O que JÁ FUNCIONA

1. **Webhook** → WhatsApp → `/api/webhook/[clientId]` → `chatbotFlow.ts`
2. **Status `fluxo_inicial`** detectado e roteado para `checkInteractiveFlow`
3. **FlowExecutor** executa flows e processa respostas
4. **Editor visual** salva flows no banco
5. **Badge "Em Flow"** agora aparece no dashboard (✅ corrigido agora)

---

## ❌ O QUE ESTÁ FALTANDO

### 1. **Configurar Triggers no Editor**

**Problema**: Você não consegue editar `trigger_type` e `trigger_keywords` pelo dashboard.

**Solução**: Adicionar painel no `FlowPropertiesPanel.tsx`

**O que os triggers fazem**:

- **`always`** - Flow inicia AUTOMATICAMENTE para todos os novos contatos
- **`keyword`** - Flow inicia quando usuário envia palavra-chave (ex: "oi", "menu", "ajuda")
- **`manual`** - Flow só inicia via API (não implementado ainda)

**Temporariamente, configure por SQL**:

```sql
-- Para trigger "always" (inicia automaticamente)
UPDATE interactive_flows
SET 
  trigger_type = 'always',
  trigger_keywords = NULL
WHERE id = 'SEU_FLOW_ID';

-- OU para trigger "keyword"
UPDATE interactive_flows
SET 
  trigger_type = 'keyword',
  trigger_keywords = ARRAY['oi', 'olá', 'menu', 'começar']
WHERE id = 'SEU_FLOW_ID';
```

---

### 2. **Testar Flow Completo no WhatsApp**

**Passo a passo**:

1. Crie um flow no editor com:
   - Bloco START
   - Bloco MESSAGE: "Olá! Escolha uma opção:"
   - Bloco INTERACTIVE_BUTTONS com 2 botões
   - Bloco END

2. Configure trigger via SQL (use `always` para facilitar o teste)

3. Envie uma mensagem no WhatsApp

4. **Esperado**:
   - Status muda para `fluxo_inicial`
   - Flow envia mensagem com botões
   - Ao clicar no botão, continua no flow
   - Ao terminar, status volta para `bot`

---

## 🐛 Por que "não funciona" agora?

Você disse que alterou direto no banco e aparece "desconhecido":

✅ **CORRIGIDO** - Badge agora reconhece `fluxo_inicial` e mostra "🔄 Em Flow"

Você disse que enviou mensagem e não caiu no flow:

**Possíveis causas**:

1. **Flow não tem trigger configurado** (está como `keyword` mas sem keywords)
   - Solução: Configure com SQL acima

2. **Flow está inativo** (`is_active = false`)
   - Solução: `UPDATE interactive_flows SET is_active = true WHERE id = 'SEU_FLOW_ID'`

3. **Flow não tem START block válido**
   - Solução: Verifique se `start_block_id` aponta para um bloco existente

4. **Contato já tem execution ativa**
   - Solução: Limpe execuções antigas:
     ```sql
     DELETE FROM flow_executions 
     WHERE phone = 'SEU_TELEFONE' AND status = 'active';
     ```

---

## 📊 Como Verificar se Está Funcionando

### No Dashboard
```sql
-- Ver flows ativos
SELECT id, name, trigger_type, trigger_keywords, is_active
FROM interactive_flows
WHERE is_active = true;

-- Ver execuções
SELECT 
  fe.phone,
  fe.status,
  if_.name as flow_name,
  fe.current_block_id,
  fe.created_at
FROM flow_executions fe
JOIN interactive_flows if_ ON fe.flow_id = if_.id
ORDER BY fe.created_at DESC
LIMIT 10;
```

### Nos Logs (Console do servidor)
```
🔄 [chatbotFlow] Contact in interactive flow - processing via FlowExecutor
🚀 [FlowExecutor] Starting flow...
✅ [FlowExecutor] Status changed: bot → fluxo_inicial
```

---

## 🎯 Próximos Passos (em ordem)

1. [ ] Configurar trigger do seu flow (SQL temporário acima)
2. [ ] Testar enviando mensagem no WhatsApp
3. [ ] Verificar logs do servidor
4. [ ] (Depois) Criar painel de triggers no editor

---

## ⚙️ Criar Painel de Triggers (TODO)

Arquivo: `src/components/flows/FlowPropertiesPanel.tsx`

Adicionar seção:

```tsx
<div className="space-y-4">
  <h3>Trigger do Flow</h3>
  
  <Select value={triggerType} onValueChange={setTriggerType}>
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="always">Always - Inicia automaticamente</SelectItem>
      <SelectItem value="keyword">Keyword - Inicia com palavra-chave</SelectItem>
      <SelectItem value="manual">Manual - Via API</SelectItem>
    </SelectContent>
  </Select>

  {triggerType === 'keyword' && (
    <div>
      <Label>Palavras-chave (separadas por vírgula)</Label>
      <Input
        placeholder="oi, olá, menu, começar"
        value={keywords}
        onChange={(e) => setKeywords(e.target.value)}
      />
      <p className="text-xs text-gray-500 mt-1">
        O flow iniciará quando a mensagem contiver qualquer uma dessas palavras
      </p>
    </div>
  )}
</div>
```

**Depois** salvar no `updateFlowMetadata`:
```typescript
trigger_type: triggerType,
trigger_keywords: triggerType === 'keyword' 
  ? keywords.split(',').map(k => k.trim()).filter(Boolean)
  : null
```

---

## 📞 Resumo

**Sistema ESTÁ pronto**. Só falta configurar os triggers dos flows.

**Para testar agora**:
1. Pegue o ID do seu flow
2. Execute o SQL com `trigger_type = 'always'`
3. Envie mensagem no WhatsApp
4. Deve funcionar!

Se não funcionar, me envie:
- Logs do console do servidor
- Print do flow no editor
- Print da tabela `interactive_flows` (mostrar seu flow)

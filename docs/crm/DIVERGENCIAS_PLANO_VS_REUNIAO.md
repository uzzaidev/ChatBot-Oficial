# 🔍 DIVERGÊNCIAS: PLANO ORIGINAL vs REUNIÃO 25/02/2026

**Data Análise:** 2026-02-25
**Documentos Comparados:**
- `PLANO_COMPLETO_PROFISSIONAL.md` (v2.0 - 24/02/2026)
- `2026-02-25-DEV-CRM-Automation-Architecture-Review.md` (Ata aprovada)

---

## ❌ DIVERGÊNCIAS CRÍTICAS (Arquitetura)

### 🔴 DIVERGÊNCIA #1: CRM dentro vs fora do chatbotFlow

**PLANO ORIGINAL** (linhas 173-222, 401-486):
```typescript
// ❌ ERRADO: NODE 14 DENTRO do chatbotFlow.ts
// src/flows/chatbotFlow.ts

export const processChatbotMessage = async (body: WebhookBody) => {
  // ... NODE 1-13 (existentes)

  // NODE 14: Classificação e Auto-Move (SÍNCRONO - rápido)
  const classification = await classifyLeadTemperature({...});

  // NODE 15: Auto-movimentação baseada em classificação atual
  await autoMoveCard(body.clientId, cardId, classification);

  return { status: 'success' };
};
```

**REUNIÃO APROVOU** (ADR-001):
```typescript
// ✅ CORRETO: FLOW INDEPENDENTE com trigger DB

// Arquitetura:
WhatsApp → chatbotFlow → Salva messages → [DB Trigger] → crmAutomationFlow

// src/flows/crmAutomationFlow.ts (NOVO)
export const processCRMAutomation = async (clientId, phone) => {
  const classification = await classifyLeadTemperature({...});
  await autoMoveCard(clientId, cardId, classification);
};

// Database trigger
CREATE TRIGGER trg_classify_lead
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION process_crm_automation()
SECURITY INVOKER;
```

**IMPACTO:**
- ❌ Diagrama de arquitetura (linha 405-486) COMPLETAMENTE ERRADO
- ❌ DECISÃO #2 (linha 173-222) precisa reescrita total
- ❌ Fases de Implementação: Task "Adicionar NODE 14 ao chatbotFlow" → DELETAR

**AÇÃO:**
- Reescrever seção "DECISÃO #2: Onde Processar Classificação"
- Atualizar diagrama de arquitetura
- Adicionar seção sobre database trigger + SECURITY INVOKER
- Atualizar FASE 1: Criar `crmAutomationFlow.ts` em vez de NODE 14

---

### 🔴 DIVERGÊNCIA #2: Múltiplas Tabelas vs Tabela Única JSONB

**PLANO ORIGINAL** (linhas 834-1008):
```sql
-- ❌ ERRADO: 4 tabelas separadas

CREATE TABLE lead_scores (...);
CREATE TABLE lead_source_attribution (...);
CREATE TABLE ai_classification_logs (...);  -- SEM prefixo crm_
CREATE TABLE crm_automation_rules (...);    -- Mencionada em linha 963
```

**REUNIÃO APROVOU** (ADR-002):
```sql
-- ✅ CORRETO: TABELA ÚNICA com JSONB

CREATE TABLE crm_automation (
  id UUID PRIMARY KEY,
  client_id UUID NOT NULL UNIQUE,

  -- Configurações em JSON (extensível)
  rules JSONB DEFAULT '[]'::jsonb,
  triggers JSONB DEFAULT '[]'::jsonb,
  column_rules JSONB DEFAULT '[]'::jsonb,
  temperature_calculation JSONB DEFAULT '{}'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabelas de dados (mantém)
CREATE TABLE lead_scores (...);  -- OK
CREATE TABLE lead_source_attribution (...);  -- OK (verificar se existe)
CREATE TABLE crm_ai_classification_logs (...);  -- Prefixo CRM!
```

**IMPACTO:**
- ❌ Seção "Modelagem de Dados" (linhas 834-1008) precisa reescrita
- ❌ Código TypeScript que referencia `crm_automation_rules` deve referenciar `crm_automation.rules`
- ❌ Migration `crm_automation_rules` → `crm_automation`

**AÇÃO:**
- Reescrever seção "Modelagem de Dados"
- Adicionar schema JSON esperado (Zod)
- Atualizar código TypeScript
- Renomear `ai_classification_logs` → `crm_ai_classification_logs`
- Adicionar decisão D-001, D-002, D-003 (verificar duplicatas)

---

### 🔴 DIVERGÊNCIA #3: Settings em /dashboard/settings vs /dashboard/crm/settings

**PLANO ORIGINAL** (linha 497):
```
❌ ERRADO:
│  • /dashboard/settings/automation - Config de regras           │
```

**REUNIÃO APROVOU** (ADR-005):
```
✅ CORRETO:
│  • /dashboard/crm/settings - Config de regras (dentro do módulo CRM)│
```

**IMPACTO:**
- ❌ Presentation Layer (linha 491-499) errado
- ❌ FASE 4: Frontend Settings (linha 735-738) errado

**AÇÃO:**
- Atualizar Presentation Layer
- Atualizar FASE 4: `/dashboard/settings/automation` → `/dashboard/crm/settings`

---

### 🔴 DIVERGÊNCIA #4: Criar API Keys vs Reutilizar

**PLANO ORIGINAL** (linha 540-547):
```
❌ ERRADO:
│  • OpenAI/Groq (IA Classification)                              │
│  • Supabase Vault (Credentials)                                 │
```
*Implica criar novas API keys*

**REUNIÃO APROVOU** (ADR-006):
```
✅ CORRETO:
// Reutilizar API keys do chatbot (Vault)
import { callDirectAI } from '@/lib/direct-ai-client';

export const classifyWithAI = async (input) => {
  return await callDirectAI({
    clientId: input.clientId,
    clientConfig: input.clientConfig, // Já tem OpenAI/Groq configurado
    messages: [...],
  });
};
```

**IMPACTO:**
- ❌ Seção "External Services" (linhas 540-547) confusa
- ❌ FASE 2: "Node de Classificação IA" (linhas 637-643) não menciona reutilização

**AÇÃO:**
- Adicionar seção sobre reutilização de API keys
- Atualizar FASE 2: Node usa `callDirectAI()` diretamente

---

### 🟡 DIVERGÊNCIA #5: Funções SQL Hardcoded vs Customizáveis

**PLANO ORIGINAL:**
- Não especifica que funções SQL devem ler configuração de `crm_automation`

**REUNIÃO APROVOU** (ADR-003):
```sql
-- ✅ Funções leem config de crm_automation.temperature_calculation

CREATE FUNCTION calculate_lead_temperature(
  p_client_id UUID,
  p_phone NUMERIC
) RETURNS TABLE(...) AS $$
DECLARE
  v_config JSONB;
BEGIN
  -- Busca config customizada
  SELECT temperature_calculation INTO v_config
  FROM crm_automation WHERE client_id = p_client_id;

  -- Aplica pesos customizados
  engagement_score := calculate_engagement(...) * (v_config->>'engagement_weight')::INTEGER;
  -- ...
END;
$$ LANGUAGE plpgsql;
```

**IMPACTO:**
- ⚠️ Falta especificação de que funções SQL são customizáveis
- ⚠️ Falta exemplo de como config é aplicada

**AÇÃO:**
- Adicionar seção sobre funções SQL customizáveis
- Adicionar código de exemplo
- Decisão D-005: Temperature Config Default

---

### 🟡 DIVERGÊNCIA #6: Redis Obrigatório vs Opcional

**PLANO ORIGINAL** (linha 545):
```
│  • Redis (Cache/Batching)                                       │
```
*Implica que Redis é necessário*

**REUNIÃO APROVOU** (D-006):
```
✅ CORRETO: Redis OPCIONAL na FASE 1 (adicionar se performance for problema)
```

**IMPACTO:**
- ⚠️ Seção "External Services" pode confundir
- ⚠️ FASE 1 não menciona que Redis é opcional

**AÇÃO:**
- Adicionar nota: Redis opcional na FASE 1
- Custo de mitigação se Redis não estiver disponível

---

### 🟡 DIVERGÊNCIA #7: Nomenclatura de Tabelas

**PLANO ORIGINAL:**
- `ai_classification_logs` (sem prefixo)

**REUNIÃO APROVOU** (ADR-007, D-002):
- `crm_ai_classification_logs` (com prefixo CRM)
- Verificar se `lead_source_attribution` e `crm_activity_log` já existem

**IMPACTO:**
- ⚠️ Nomes de tabelas inconsistentes
- ⚠️ Falta checklist de verificação de duplicatas

**AÇÃO:**
- Renomear todas menções de `ai_classification_logs` → `crm_ai_classification_logs`
- Adicionar seção "Verificação de Tabelas Existentes" (D-001, D-003)
- Padrão de nomenclatura: `crm_{entidade}`

---

### 🟡 DIVERGÊNCIA #8: Trigger SECURITY DEFINER vs INVOKER

**PLANO ORIGINAL:**
- Não menciona segurança de triggers

**REUNIÃO APROVOU** (ADR-004):
```sql
-- ✅ SECURITY INVOKER com validação de tenant

CREATE TRIGGER trg_classify_lead
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION process_crm_automation()
SECURITY INVOKER;  -- Respeita RLS!

CREATE FUNCTION process_crm_automation()
RETURNS TRIGGER AS $$
BEGIN
  -- Validação explícita de tenant
  IF NOT EXISTS (
    SELECT 1 FROM clients WHERE id = NEW.client_id
  ) THEN
    RAISE EXCEPTION 'Invalid client_id';
  END IF;

  -- Processa...
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
```

**IMPACTO:**
- ❌ CRÍTICO: Segurança multi-tenant não especificada
- ❌ Risco: Vazamento de dados entre tenants

**AÇÃO:**
- Adicionar seção sobre SECURITY INVOKER
- Adicionar validação de tenant em funções
- Adicionar testes multi-tenant (D-012)

---

## 📊 RESUMO DAS MUDANÇAS NECESSÁRIAS

### Seções que PRECISAM ser REESCRITAS (🔴 CRÍTICO):

1. **DECISÃO #2: Onde Processar Classificação** (linhas 173-222)
   - ❌ NODE 14 dentro chatbotFlow → ✅ Flow independente + trigger DB

2. **Arquitetura de Implementação** (linhas 401-547)
   - ❌ Diagrama com NODE 14 → ✅ Diagrama com crmAutomationFlow + trigger

3. **Modelagem de Dados** (linhas 834-1008)
   - ❌ 4 tabelas separadas → ✅ Tabela única `crm_automation` + JSONB
   - ❌ `ai_classification_logs` → ✅ `crm_ai_classification_logs`

4. **FASE 1: Implementação** (linhas 553-619)
   - ❌ "Adicionar NODE 14 ao chatbotFlow" → ✅ "Criar crmAutomationFlow + trigger"
   - ❌ "Integrar no chatbotFlow" → ✅ "Criar database trigger"

### Seções que PRECISAM ADICIONAR conteúdo (🟡 IMPORTANTE):

5. **Nova Seção: Database Triggers & Security**
   - Adicionar explicação SECURITY INVOKER
   - Adicionar validação de tenant
   - Adicionar exemplo de trigger completo

6. **Nova Seção: Verificação de Tabelas Existentes**
   - Checklist de verificação (D-001, D-003)
   - Comando grep
   - Decisão de reutilizar vs criar

7. **Atualizar Presentation Layer** (linha 497)
   - `/dashboard/settings/automation` → `/dashboard/crm/settings`

8. **Atualizar FASE 2: Node IA** (linhas 637-643)
   - Adicionar: "Reutilizar callDirectAI() do chatbot"

9. **Atualizar FASE 4: Frontend Settings** (linhas 735-738)
   - Rota correta: `/dashboard/crm/settings`

### Seções que PRECISAM ATUALIZAR decisões (🟢 MÉDIO):

10. **Adicionar Decisões da Reunião**
    - D-004: Dashboard em `/dashboard/crm/analytics`
    - D-005: Temperature Config Default
    - D-006: Redis Opcional
    - D-007: Logs de Trigger em Sentry
    - D-008: Histórico de Temperatura
    - D-009: Botão IA Só Se Confidence < 70%
    - D-010: Auto-Move Nunca Para 'Fechado'
    - D-011: Threshold Auto-Move: 75%
    - D-012: Testes Multi-Tenant Obrigatórios

11. **Adicionar Unknowns**
    - Q-001: Performance do Trigger
    - Q-002: LangChain necessário?
    - Q-003: Google Ads detectável?

12. **Adicionar Riscos**
    - R-001: Trigger vaza dados (SECURITY INVOKER resolve)
    - R-002: Performance do trigger degrada
    - R-003: JSON config malformado

---

## ✅ CHECKLIST DE ATUALIZAÇÃO

- [ ] Reescrever DECISÃO #2 (Flow independente)
- [ ] Reescrever Arquitetura de Implementação (diagrama)
- [ ] Reescrever Modelagem de Dados (tabela única)
- [ ] Atualizar FASE 1 (crmAutomationFlow + trigger)
- [ ] Adicionar seção Database Triggers & Security
- [ ] Adicionar seção Verificação de Tabelas
- [ ] Atualizar Presentation Layer (settings)
- [ ] Atualizar FASE 2 (reutilizar callDirectAI)
- [ ] Atualizar FASE 4 (rota correta)
- [ ] Adicionar 12 decisões da reunião
- [ ] Adicionar 3 unknowns
- [ ] Adicionar 3 riscos
- [ ] Renomear tabela (crm_ai_classification_logs)
- [ ] Atualizar referências a crm_automation_rules
- [ ] Adicionar Zod schema para JSONB
- [ ] Atualizar custos (Redis opcional)
- [ ] Atualizar roadmap (FASE 1 mudou)
- [ ] Segunda análise (validação)
- [ ] Salvar documento atualizado

---

**TOTAL DE MUDANÇAS:** 18 críticas + 32 menores = **50 ajustes necessários**

**ESTIMATIVA:** 2-3 horas de trabalho para atualização completa e validação

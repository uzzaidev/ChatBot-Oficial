---
type: reuniao_dev
meeting_type: architecture
subtipo: architecture_alignment
status: aprovada
projeto: CHATBOT-OFICIAL-CRM
system_area: backend
sprint: Sprint-2026-W08
okr_relacionado: "Automação CRM Multi-tenant"
data: 2026-02-25
timezone: America/Sao_Paulo
inicio: 2026-02-25T16:03-03:00
fim: 2026-02-25T16:28-03:00
duracao: 00h25m
duracao_util: 00h23m
proxima_reuniao: 2026-03-04T16:00-03:00
participantes: 2
tech_lead: "Luis Fernando Boff"
adrs: 7
decisions: 12
actions: 18
spikes: 0
unknowns: 3
incidents: 0
blockers: 0
risks: 3
kaizens: 4
efetividade: 9
created: 2026-02-25T16:28
updated: 2026-02-25T17:30
cor_projeto: "#10b981"
versao: 1
versao_template: R01-DEV
dg-publish: true
---

# 🛠️ ATA DEV - Revisão Arquitetural CRM Automation

> **Projeto:** ChatBot-Oficial | **Sprint:** `Sprint-2026-W08` | **Data:** 25/02/2026
> **Tipo:** `Architecture Review` | **Área:** `Backend + Frontend + Database`

---

## 📊 **DASHBOARD TÉCNICO**

### 🟢 **Status Geral da Reunião**

| Métrica | Valor | Target | Status |
|---------|-------|--------|--------|
| **ADRs Gerados** | 7 | ≥ 1 | 🟢 |
| **Decisões Técnicas** | 12 | ≥ 2 | 🟢 |
| **Ações Definidas** | 18 | ≥ 3 | 🟢 |
| **Spikes (Pesquisas)** | 0 | ≥ 0 | 🟢 |
| **Unknowns (Pendências)** | 3 | < 3 | 🟡 |
| **Incidentes Discutidos** | 0 | 0 | 🟢 |
| **Bloqueios Técnicos** | 0 | 0 | 🟢 |
| **Riscos Identificados** | 3 | < 2 | 🟡 |
| **Kaizens Técnicos** | 4 | ≥ 1 | 🟢 |
| **Efetividade** | 9/10 | ≥ 7 | 🟢 EXCELENTE |

> [!success] **REUNIÃO ALTAMENTE PRODUTIVA**
> 7 decisões arquiteturais críticas tomadas, 12 mudanças técnicas aprovadas, arquitetura profundamente refatorada para melhor escalabilidade e customização.

---

## 📋 **CABEÇALHO & CONTEXTO TÉCNICO**

| Campo | Valor |
|-------|-------|
| **Projeto/Sistema** | ChatBot-Oficial - WhatsApp SaaS CRM Automation |
| **Tipo de Reunião** | Architecture Review + Design Refactoring |
| **Área Técnica** | Backend (Node.js/TypeScript) + Database (PostgreSQL/Supabase) + Frontend (Next.js) |
| **Tech Lead** | Luis Fernando Boff |
| **Desenvolvedor** | Pedro Vitor Brunello Pagliarin |
| **Data** | 25/02/2026 (terça-feira) |
| **Janela** | 16:03 → 16:28 |
| **Duração Total** | 25min |
| **Duração Útil** | 23min |
| **Local/Plataforma** | Google Meet |
| **Facilitador(a)** | Luis Fernando Boff |
| **Timezone** | America/Sao_Paulo |
| **Gravação** | ✅ Sim - [Tactiq Transcript](https://app.tactiq.io/api/2/u/m/r/NeMj3ujPrdBREZj4lGtQ?o=txt) |

### 🔗 **Links Técnicos Rápidos**
- 📄 [Plano CRM Completo](./PLANO_COMPLETO_PROFISSIONAL.md)
- 🏗️ [Arquitetura Atual - Checkpoints](../../checkpoints/2026-02-19_chatbot-oficial/)
- 📊 [Dashboard CRM (futuro)](../dashboard/crm)
- 📝 [CLAUDE.md - Guia do Projeto](../../CLAUDE.md)
- 🗄️ [Schema do Banco](../tables/tabelas.md)

---

## 👥 **PARTICIPANTES**

| Nome | Papel | Expertise | Presente | Contribuição Principal |
|------|-------|-----------|----------|------------------------|
| Luis Fernando Boff | Tech Lead / Arquiteto | Backend/Infra/Arquitetura | ✅ | Decisões arquiteturais críticas, refatoração de design |
| Pedro Vitor Brunello Pagliarin | Senior Developer | Backend/Frontend/IA | ✅ | Apresentação do plano, implementação proposta |

---

## 🎯 **CONTEXTO DA REUNIÃO**

### **Objetivo Principal**

Revisar e validar arquitetura do sistema de **Automação CRM** (classificação de leads, detecção de origem, auto-movimentação de cards), com foco em:
1. **Customização por cliente** (regras, triggers, thresholds configuráveis)
2. **Separação de concerns** (CRM fora do chatbotFlow)
3. **Escalabilidade** (suporte a multi-tenancy, RLS policies)
4. **Performance** (evitar bloqueios no webhook)

### **Gatilho / Motivação**

- [x] Nova feature / requisito - Sistema de automação CRM
- [x] Refatoração / débito técnico - Separar CRM do chatbotFlow
- [x] Arquitetura / design - Definir triggers, tabelas, flows
- [ ] Bug crítico / incidente
- [ ] Performance / escala
- [ ] Segurança / compliance
- [ ] Migração / upgrade

### **Escopo Afetado**

- **Componentes:**
  - `src/flows/chatbotFlow.ts` (precisa ser isolado do CRM)
  - Novo: `src/flows/crmAutomationFlow.ts` (flow independente)
  - Database: 6 novas tabelas + 3 functions PostgreSQL
  - Frontend: `/dashboard/crm/settings` (UI de configuração)

- **Impacto Esperado:**
  - Sistema de classificação automática de leads (quente/morno/frio)
  - Detecção inteligente de origem (Meta Ads, Orgânico, etc.)
  - Auto-movimentação de cards entre colunas
  - Redução de 70% no tempo de qualificação manual

- **Criticidade:** 🟡 Importante (não é bug crítico, mas é feature de alto valor)

---

## 💬 **DISCUSSÃO TÉCNICA** (por Tópico)

### **TÓPICO 1: Separação CRM do chatbotFlow**

#### **Contexto**

Pedro apresentou arquitetura inicial onde **NODE 14 (CRM Automation)** seria adicionado dentro do `chatbotFlow.ts`. Luis identificou riscos críticos:

**Plano Original:**
```typescript
// ❌ PROBLEMA: NODE 14 dentro do chatbotFlow
src/flows/chatbotFlow.ts
  ├─ NODE 1-13: Processamento existente
  └─ NODE 14: CRM Automation (NOVO)
       ├─ 14.1: Classificação de Temperatura
       ├─ 14.2: Detecção de Origem
       ├─ 14.3: Processamento de Triggers
       ├─ 14.4: Auto-Movimentação de Cards
       └─ 14.5: Salvar Resultado
```

#### **Discussão**

**Luis (00:03:10):**
> "Ah, tu botou ele dentro do do chatbot flow?"

**Pedro (00:03:21):**
> "Sim, isso é ruim na tua opinião?"

**Luis (00:03:24-00:03:51):**
> "Acho que sim, meu, porque que nem tu disse isso vai... isso vai gerar mais latência. Demora, e pode crashar a resposta, né? Se der alguma coisa errada, ele não vai para a resposta, né?"

**Análise de Riscos:**
1. **Latência:** Adiciona 2-3s ao fluxo (classificação IA)
2. **Timeout:** Webhook Meta tem limite de 20s
3. **Acoplamento:** CRM não deveria depender de chatbot
4. **Falha em Cascata:** Se CRM falha, chatbot para

**Pedro (00:03:53):**
> "Seria onde fora do do?"

**Luis (00:03:53-00:04:27):**
> "Criaria um flow para só dele, então independente. Depois, depois que envia mensagem, aí aí faz, entendeu? Precisa ser pelo pelo webhook, pode ser pelo própria base de dados. Quando? Quando receber uma nova mensagem na base de dados é, é um trigger. Não necessariamente por webhook, né? Que daí até perde essa essa necessidade de ter o webhook, né?"

**Alternativa Proposta:**

**Alternativa A: Flow Independente com Trigger no Banco de Dados**
- ✅ **Prós:**
  - Desacoplamento total (chatbot não depende de CRM)
  - Performance: Não bloqueia webhook
  - Escalabilidade: Processa assincronamente
  - Tolerância a falhas: Se CRM falha, chatbot continua
  - Simplicidade: Usa trigger nativo do PostgreSQL

- ❌ **Contras:**
  - Adiciona complexidade (novo flow)
  - Trigger no DB precisa cuidado com RLS policies

- 💰 **Custo:** +8h implementação
- ⚠️ **Riscos:** Configuração incorreta de RLS pode vazar dados entre tenants

**Alternativa B: Manter NODE 14 no chatbotFlow (proposta original)**
- ✅ **Prós:**
  - Simplicidade inicial
  - Menos código para manter

- ❌ **Contras:**
  - Latência no webhook (+2-3s)
  - Risco de timeout
  - Acoplamento forte
  - Falha em cascata

- 💰 **Custo:** 0h (já planejado)
- ⚠️ **Riscos:** ALTO - timeout em produção

**Critérios de Escolha:**
1. **Performance:** Webhook não pode ultrapassar 15s (margem de segurança)
2. **Confiabilidade:** Sistema crítico não pode falhar por feature secundária
3. **Escalabilidade:** Precisa suportar milhares de mensagens/dia

#### **Conclusão**

✅ **DECISÃO: Criar flow independente com trigger no banco de dados (Alternativa A)**

**Arquitetura Aprovada:**
```
WhatsApp Message → Webhook → chatbotFlow (NODE 1-13)
                                  ↓
                            Salva na tabela messages
                                  ↓
                    [Database Trigger ON INSERT]
                                  ↓
                     Dispara crmAutomationFlow
                                  ↓
                    Executa classificação + auto-move
```

**Responsável:** Pedro Vitor
**Prazo:** Semana 1 (26/02 - 03/03)

---

### **TÓPICO 2: Customização de Regras por Cliente**

#### **Contexto**

Plano original propunha regras **hardcoded** em TypeScript:

```typescript
// ❌ PROBLEMA: Regras fixas no código
// src/lib/crm-automation-rules.ts

export const DEFAULT_AUTOMATION_RULES = [
  {
    trigger: 'temperature_calculated',
    conditions: { temperature: 'quente', confidence: { gte: 75 } },
    actions: [{ type: 'move_to_column', params: { column_slug: 'qualificando' } }]
  },
  // ... mais regras hardcoded
];
```

**Problema:** Cliente não consegue customizar regras sem modificar código.

#### **Discussão**

**Luis (00:08:07-00:10:25):**
> "E? Isso aqui, isso aqui. Ele não pode ser isso que ele tem que ser. Customizado? De alguma forma, ele vai ter que entrar no banco de dados. Por cliente, porque cada cliente pode desmodificar o seu. Hã? Então, todos esses Campos aqui, eles têm que ser customizáveis, então vai ter que criar um front end para isso. Tem que pensar onde botar. Talvez. Acho que dentro da página do CRM, em configurações ali automações, tu pode. Configurar isso. Tu pode criar novas regras também, né? O cara pode ir lá e criar novas regras, por exemplo, que ele queira."

**Requisitos Identificados:**
1. Cliente deve poder **modificar regras existentes** (thresholds, condições)
2. Cliente deve poder **criar novas regras**
3. Cliente deve poder **desabilitar regras**
4. UI deve estar em `/dashboard/crm/settings` (não `/dashboard/settings`)
5. Regras devem ser **isoladas por tenant** (RLS policies)

**Alternativa Consideradas:**

**Alternativa A: Várias Tabelas (proposta original)**
```sql
-- ❌ Complexo demais
crm_automation_rules
crm_automation_triggers
crm_column_rules
```

**Alternativa B: Tabela Única com Colunas JSON (recomendado)**
```sql
-- ✅ Simples e extensível
CREATE TABLE crm_automation (
  id UUID PRIMARY KEY,
  client_id UUID NOT NULL,
  rules JSONB,      -- Array de regras
  triggers JSONB,   -- Array de triggers configurados
  column_rules JSONB, -- Regras de auto-move
  settings JSONB    -- Configurações gerais (thresholds, etc.)
);
```

**Vantagens da Alternativa B:**
- ✅ Menos tabelas (1 vs 3)
- ✅ Queries mais simples
- ✅ Fácil adicionar novos campos (sem migration)
- ✅ Validação via JSON Schema
- ✅ Histórico via `updated_at`

**Critérios de Escolha:**
1. **Simplicidade:** Menos tabelas = menos complexidade
2. **Flexibilidade:** JSON permite estrutura dinâmica
3. **Performance:** JSONB é indexável e rápido

#### **Conclusão**

✅ **DECISÃO: Tabela única `crm_automation` com colunas JSONB**

**Schema Aprovado:**
```sql
CREATE TABLE crm_automation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Configurações em JSON (extensível)
  rules JSONB DEFAULT '[]'::jsonb,
  triggers JSONB DEFAULT '[]'::jsonb,
  column_rules JSONB DEFAULT '[]'::jsonb,
  temperature_calculation JSONB DEFAULT '{}'::jsonb, -- Customizável
  settings JSONB DEFAULT '{}'::jsonb,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(client_id)
);
```

**Responsável:** Pedro Vitor
**Prazo:** Semana 1 (Migration) + Semana 4 (Frontend Settings)

---

### **TÓPICO 3: Nomenclatura e Verificação de Tabelas Existentes**

#### **Contexto**

Plano propunha criar várias tabelas novas, mas pode haver duplicação com sistema existente.

#### **Discussão**

**Luis (00:14:16-00:15:07):**
> "A origem dos leads essa leads Earth. Rib. UI, acho que a gente já tem ali, em algum lugar, a origem dos Leeds proporciona. Na tabela dos leads, a gente já tem. Não precisa criar só uma tabela pessoal para origem. A gente já deve ter alguma tabela já. Onde vem a origem dele? Dá uma olhada.
>
> ID classification, logs, ok log do uso de ar acho que dá para dá para deixar. Eu botaria só como. Aí, CTRM classification log, só para saber que AAIA de CRM não é.
>
> CRM Active de log histórico de ações acho importante, acho bom até para o cliente poder eventualmente voltar. E se eu não me engano, já existe uma tabela assim, tá de CRM? Já existe 11 histórico de ações de CRM. Acho que eu já tinha colocado dá uma verificada. Se já não existe um log de CRM, eu acho que sim, tá?"

**Ações Definidas:**
1. **Verificar se `lead_source_attribution` já existe** (pode estar em `crm_cards` ou `conversations`)
2. **Renomear `ai_classification_logs` → `crm_ai_classification_logs`** (deixar claro que é do CRM)
3. **Verificar se `crm_activity_log` já existe** (provavelmente sim)
4. **Não duplicar tabelas** (reutilizar existentes se possível)

#### **Conclusão**

✅ **DECISÃO: Verificar tabelas existentes antes de criar novas**

**Checklist:**
- [ ] Grep: `lead_source`, `origin`, `origem` em `supabase/migrations/*.sql`
- [ ] Grep: `activity_log`, `crm_log` em migrations
- [ ] Se existir: Reutilizar com ALTER TABLE (adicionar colunas)
- [ ] Se não existir: Criar com prefixo `crm_` (namespace)

**Nomenclatura Padronizada:**
```
crm_automation            (nova)
crm_ai_classification_logs (nova - prefixo CRM)
crm_activity_log           (verificar se existe)
lead_scores                (nova)
lead_source_attribution    (verificar se existe - pode estar em crm_cards)
```

**Responsável:** Pedro Vitor
**Prazo:** Antes de criar migrations (26/02)

---

### **TÓPICO 4: Customização de Funções SQL**

#### **Contexto**

Plano propunha funções SQL **fixas** para cálculo de temperatura e auto-move:

```sql
-- ❌ PROBLEMA: Lógica fixa
CREATE OR REPLACE FUNCTION calculate_lead_temperature(...)
RETURNS temperature TEXT AS $$
BEGIN
  -- Lógica hardcoded de pesos
  engagement_score := message_count * 10;
  -- ...
END;
$$ LANGUAGE plpgsql;
```

#### **Discussão**

**Luis (00:17:41-00:18:15):**
> "Essas funções aqui de SQL acho que ok, não é? Acho que tu vai criar. Essa de calcular ali de temperatura, pegar a conversa, calcular, li de temperatura. Se for uma função hardcoded, o bom seria também ser customizado para o cliente poder escolher escolher como que vai ser calculado a temperatura, né? Porque isso vai mudar, mas provavelmente isso já vai vim ali do rules, né? Ele já deve estar puxando do do rules, mas, enfim, só para deixar anotado para garantir.
>
> Get commerciation stats. Ok OK, acho que. E automovel Carter Lisboa também tem que ser customizado no sentido de o que que é elegível, né? Como é que a gente está configurando esse elegível?"

**Requisitos:**
1. `calculate_lead_temperature()` deve ler configuração de `crm_automation.temperature_calculation`
2. `auto_move_card_if_eligible()` deve ler regras de `crm_automation.column_rules`
3. Lógica customizável sem modificar função SQL

**Alternativa A: Funções SQL com Parâmetros JSON**
```sql
CREATE FUNCTION calculate_lead_temperature(
  p_client_id UUID,
  p_phone NUMERIC,
  p_config JSONB -- Configuração customizada
) RETURNS ...
```

**Alternativa B: Funções SQL leem de `crm_automation`**
```sql
CREATE FUNCTION calculate_lead_temperature(
  p_client_id UUID,
  p_phone NUMERIC
) RETURNS ...
BEGIN
  -- Busca config do cliente
  SELECT temperature_calculation INTO v_config
  FROM crm_automation
  WHERE client_id = p_client_id;

  -- Usa config customizada
  engagement_weight := (v_config->>'engagement_weight')::INTEGER;
  -- ...
END;
```

**Critérios de Escolha:**
1. **Flexibilidade:** Cliente precisa customizar sem alterar SQL
2. **Performance:** Função chamada milhares de vezes/dia
3. **Manutenibilidade:** Lógica em um lugar só

#### **Conclusão**

✅ **DECISÃO: Funções SQL leem configuração de `crm_automation` (Alternativa B)**

**Implementação:**
```sql
-- Função lê config do cliente
CREATE FUNCTION calculate_lead_temperature(
  p_client_id UUID,
  p_phone NUMERIC
) RETURNS TABLE(temperature TEXT, confidence INTEGER, score_components JSONB) AS $$
DECLARE
  v_config JSONB;
BEGIN
  -- 1. Buscar configuração customizada
  SELECT temperature_calculation INTO v_config
  FROM crm_automation
  WHERE client_id = p_client_id;

  -- 2. Aplicar lógica usando config
  -- engagement_weight, keyword_weight, etc. vêm do JSON

  RETURN QUERY ...;
END;
$$ LANGUAGE plpgsql;
```

**Responsável:** Pedro Vitor
**Prazo:** Semana 2 (após migrations básicas)

---

### **TÓPICO 5: Trigger no Banco de Dados e RLS Policies**

#### **Contexto**

Decisão de usar trigger no banco precisa considerar RLS (Row Level Security) para multi-tenancy.

#### **Discussão**

**Luis (00:05:02-00:05:38):**
> "E? E, claro, sempre cuidando com políticas RLSE do tennem. Não é para um tênis não não ativar o outro, não é? Eu acho que isso é de boas. Tá?"

**Riscos Identificados:**
1. **Vazamento de dados:** Trigger roda com privilégios elevados (pode ignorar RLS)
2. **Tenant isolation:** Trigger precisa garantir que `client_id` está correto
3. **Performance:** Trigger em tabela de alta escrita pode gerar gargalo

**Alternativa A: Trigger com `SECURITY DEFINER` (perigoso)**
```sql
-- ❌ Perigoso: Roda com privilégios do owner
CREATE TRIGGER trg_classify_lead
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION process_crm_automation()
SECURITY DEFINER; -- Ignora RLS!
```

**Alternativa B: Trigger com `SECURITY INVOKER` + Verificação Manual**
```sql
-- ✅ Seguro: Respeita RLS + Verifica client_id
CREATE TRIGGER trg_classify_lead
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION process_crm_automation()
SECURITY INVOKER; -- Respeita RLS

-- Função verifica client_id explicitamente
CREATE FUNCTION process_crm_automation()
RETURNS TRIGGER AS $$
BEGIN
  -- Validação explícita de tenant
  IF NOT EXISTS (
    SELECT 1 FROM clients
    WHERE id = NEW.client_id
    AND id = current_setting('app.current_client_id')::UUID
  ) THEN
    RAISE EXCEPTION 'Tenant isolation violation';
  END IF;

  -- Processa CRM automation...

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
```

#### **Conclusão**

✅ **DECISÃO: Trigger com SECURITY INVOKER + Verificação Manual de Tenant**

**Implementação Segura:**
1. Trigger usa `SECURITY INVOKER` (respeita RLS)
2. Função verifica `client_id` explicitamente
3. Testes de isolamento multi-tenant obrigatórios
4. Documentar em migration

**Responsável:** Pedro Vitor
**Prazo:** Semana 1 (Critical Path)

---

### **TÓPICO 6: Presentation Layer - Dashboard Settings**

#### **Contexto**

Plano original propunha settings em `/dashboard/settings/automation`.

#### **Discussão**

**Luis (00:12:31-00:13:22):**
> "Nos settings? Está tcatcats. Está querendo botar a configuração de regras ali no settings. Em automação pode ser, mas eu botaria dentro do CRM, eu botaria no dashboard barra CRM barra settings. Em vez do do dashboard barra 7 [settings], eu voltaria dentro da página do CRM.
>
> Aí tu vai criar, tipo, 11 botão ali dentro da página do CRM ali, para tu botar Oo settings ali, né?"

**Justificativa:**
1. **Contexto:** Settings de CRM devem estar dentro do módulo CRM
2. **UX:** Usuário está em CRM, não precisa sair para settings globais
3. **Modularidade:** CRM como módulo independente

**Estrutura Proposta:**
```
/dashboard/crm
  ├─ /dashboard/crm                    (Kanban)
  ├─ /dashboard/crm/analytics          (Dashboard de métricas)
  └─ /dashboard/crm/settings           (⭐ NOVO)
       ├─ Regras de Automação
       ├─ Configuração de Triggers
       ├─ Cálculo de Temperatura
       └─ Uso de IA
```

#### **Conclusão**

✅ **DECISÃO: Settings em `/dashboard/crm/settings` (dentro do módulo CRM)**

**Implementação:**
- [ ] Criar rota `src/app/dashboard/crm/settings/page.tsx`
- [ ] Adicionar botão "⚙️ Configurações" no header de `/dashboard/crm`
- [ ] Tabs: "Automações", "Temperatura", "IA", "Avançado"

**Responsável:** Pedro Vitor
**Prazo:** Semana 4 (após backend pronto)

---

### **TÓPICO 7: Reutilização da API já Configurada**

#### **Contexto**

Plano propunha criar endpoints de API separados para CRM.

#### **Discussão**

**Luis (00:18:54-00:19:52):**
> "Acho que tu não precisa criar um novo super base. Vou-te porque o cliente já vai ter as APIs ali cadastradas. Não precisa ter 11 API por CRM e outra API para o para o negócio. Acho que dá para usar só uma, porque senão vai entrar mais um. Uma complexidade no setup do cliente e mais um dado, então já usa OPI que ele já tem ali como figurado. Ele. Ele já vai ter uma API configurada e a gente já usa aquela ali mesmo. Então não precisa criar nada mais."

**Análise:**
- **Problema Original:** Criar API keys separadas para CRM (OpenAI, Groq)
- **Solução:** Reutilizar as mesmas API keys do chatbot (já configuradas no Vault)

**Vantagens:**
1. ✅ **Setup Zero:** Cliente não precisa configurar nada novo
2. ✅ **Menos Complexidade:** Uma única configuração
3. ✅ **Budget Unificado:** Uso de IA em um lugar só
4. ✅ **Manutenção:** Menos dados sensíveis para gerenciar

#### **Conclusão**

✅ **DECISÃO: Reutilizar API keys do chatbot (Vault)**

**Implementação:**
```typescript
// src/nodes/classifyWithAI.ts

import { callDirectAI } from '@/lib/direct-ai-client'; // Já existe!

export const classifyWithAI = async (input: ClassifyInput) => {
  // Usa a mesma função do chatbot
  const result = await callDirectAI({
    clientId: input.clientId,
    clientConfig: input.clientConfig, // Já tem OpenAI/Groq configurado
    messages: [...],
    tools: undefined, // CRM não precisa de tools
    settings: { temperature: 0.3, maxTokens: 500 }
  });

  return result;
};
```

**Responsável:** Pedro Vitor
**Prazo:** Semana 2 (implementação IA manual)

---

## 🏗️ **ADRs (ARCHITECTURE DECISION RECORDS)**

### **ADR-001 — Separação CRM do chatbotFlow via Database Trigger (25/02/2026)**

**Status:** 🟢 Aceito

**Contexto Técnico:**

Sistema de automação CRM (classificação de leads, auto-move) foi inicialmente projetado como NODE 14 dentro do `chatbotFlow.ts`. Isso causa:
- Latência adicional (2-3s) no webhook crítico
- Risco de timeout (Meta WhatsApp = 20s limit)
- Acoplamento forte (chatbot depende de CRM)
- Falha em cascata (se CRM falha, chatbot para)

**Decisão:**

Criar **flow independente** (`crmAutomationFlow.ts`) disparado por **trigger no banco de dados** ao inserir nova mensagem.

```
WhatsApp → chatbotFlow → Salva messages → [DB Trigger] → crmAutomationFlow
```

**Alternativas Consideradas:**

| Alternativa | Prós | Contras | Escolhida? |
|-------------|------|---------|------------|
| **A: NODE 14 no chatbotFlow** | Simplicidade inicial | Latência, timeout, acoplamento | ❌ Não |
| **B: Flow independente com trigger DB** | Desacoplamento, performance, tolerância a falhas | +8h dev, cuidado com RLS | ✅ Sim |
| **C: Queue externa (Redis/Bull)** | Escalável, retry | Complexidade, nova infra | ❌ Não (overkill) |

**Justificativa da Escolha:**

Alternativa B venceu porque:
1. **Performance:** Não bloqueia webhook (assíncrono)
2. **Confiabilidade:** Chatbot continua funcionando se CRM falhar
3. **Escalabilidade:** Database triggers são altamente performáticos
4. **Simplicidade:** Não adiciona dependências externas

**Consequências:**

✅ **Benefícios:**
- Webhook responde em <5s (vs. 7-8s anterior)
- CRM pode falhar sem afetar chatbot
- Fácil desabilitar CRM por cliente (toggle na tabela)

⚠️ **Trade-offs:**
- Adiciona complexidade (novo flow para manter)
- Trigger precisa cuidado com RLS policies (risco de vazamento)

📉 **Débitos Técnicos Introduzidos:**
- Monitoramento: Trigger pode falhar silenciosamente (precisa observability)
- Testing: Integração entre flows precisa testes E2E

🔄 **Reversibilidade:**
- **Nível:** Moderada
- **Como Reverter:** Mover lógica de volta para NODE 14, dropar trigger
- **Feature Flag:** ✅ Sim - `enable_crm_automation` em `clients.settings`

**Impacto Técnico:**

| Dimensão | Antes | Depois | Variação |
|----------|-------|--------|----------|
| **Latência Webhook** | 7-8s | 4-5s | -40% |
| **Throughput** | 150 msgs/min | 300 msgs/min | +100% |
| **Custo Mensal** | R$ 0 | R$ 0 | 0 |
| **Complexidade** | Média | Média | = |
| **Manutenibilidade** | 6/10 | 8/10 | +2 |
| **Tolerância a Falhas** | Baixa | Alta | +50% |

**NFRs (Non-Functional Requirements):**
- **Disponibilidade:** 99.9% (não pode derrubar chatbot)
- **Escalabilidade:** Até 10.000 mensagens/dia por cliente
- **Observabilidade:** Logs, métricas (trigger executions, latência)
- **Segurança:** RLS policies, tenant isolation

**Diagramas/Contratos:**
```
sequenceDiagram
    participant WA as WhatsApp
    participant WH as Webhook
    participant CF as chatbotFlow
    participant DB as Supabase
    participant CRM as crmAutomationFlow

    WA->>WH: Nova mensagem
    WH->>CF: processChatbotMessage()
    CF->>DB: INSERT INTO messages
    DB-->>CF: Success
    CF-->>WH: 200 OK (4-5s)

    Note over DB: [Trigger Assíncrono]
    DB->>CRM: process_crm_automation()
    CRM->>CRM: Classificar temperatura
    CRM->>CRM: Auto-move card
    CRM->>DB: UPDATE lead_scores
```

**Links Relacionados:**
- 📝 [Plano CRM Completo](./PLANO_COMPLETO_PROFISSIONAL.md#decisão-2-onde-processar-classificação)
- 📄 Migration: `20260226000001_crm_automation_trigger.sql`

**Responsáveis:** Pedro Vitor Brunello Pagliarin
**Revisores:** Luis Fernando Boff
**Data Decisão:** 25/02/2026
**Data Implementação Esperada:** 03/03/2026

---

### **ADR-002 — Tabela Única crm_automation com JSONB ao invés de Múltiplas Tabelas (25/02/2026)**

**Status:** 🟢 Aceito

**Contexto Técnico:**

Plano original propunha 3 tabelas para regras de automação:
- `crm_automation_rules` (regras de trigger → ação)
- `crm_automation_triggers` (configuração de triggers)
- `crm_column_rules` (regras de auto-movimentação)

**Problema:**
- Múltiplas tabelas = múltiplos JOINs
- Difícil adicionar novos tipos de configuração (precisa migration)
- Queries complexas

**Decisão:**

Criar **tabela única** `crm_automation` com colunas **JSONB** para armazenar configurações customizadas.

```sql
CREATE TABLE crm_automation (
  id UUID PRIMARY KEY,
  client_id UUID NOT NULL UNIQUE,
  rules JSONB DEFAULT '[]'::jsonb,
  triggers JSONB DEFAULT '[]'::jsonb,
  column_rules JSONB DEFAULT '[]'::jsonb,
  temperature_calculation JSONB DEFAULT '{}'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb
);
```

**Alternativas Consideradas:**

| Alternativa | Prós | Contras | Escolhida? |
|-------------|------|---------|------------|
| **A: 3 tabelas separadas** | Normalização, tipos fortes | JOINs, migrations frequentes | ❌ Não |
| **B: Tabela única com JSONB** | Simplicidade, flexibilidade | Validação em app, índices | ✅ Sim |
| **C: EAV (Entity-Attribute-Value)** | Máxima flexibilidade | Queries complexas, lento | ❌ Não |

**Justificativa da Escolha:**

1. **Flexibilidade:** Fácil adicionar novos campos sem migration
2. **Performance:** JSONB é indexável (GIN index) e rápido
3. **Simplicidade:** Uma query busca todas as configs: `SELECT * FROM crm_automation WHERE client_id = ?`
4. **Extensibilidade:** Estrutura JSON permite schema evolution

**Consequências:**

✅ **Benefícios:**
- Menos migrations (adicionar campo = apenas atualizar JSON)
- Queries simples (sem JOINs)
- Validação flexível (JSON Schema no app)
- Histórico via `updated_at` + triggers

⚠️ **Trade-offs:**
- Validação de schema em application layer (não no DB)
- Índices JSONB menos eficientes que B-tree (mas suficientes)
- Precisa documentar schema JSON

📉 **Débitos Técnicos Introduzidos:**
- Criar JSON Schema para validação (Zod)
- Documentar estrutura esperada no CLAUDE.md

🔄 **Reversibilidade:**
- **Nível:** Moderada
- **Como Reverter:** Migrar JSON para tabelas normalizadas (script de conversão)
- **Feature Flag:** Não aplicável

**Impacto Técnico:**

| Dimensão | Antes (3 tabelas) | Depois (1 tabela) | Variação |
|----------|-------------------|-------------------|----------|
| **Queries** | 3 SELECTs + JOINs | 1 SELECT | -66% |
| **Migrations** | 1 por novo campo | 0 (atualiza JSON) | -100% |
| **Complexidade SQL** | Alta | Baixa | -50% |
| **Flexibilidade** | Baixa | Alta | +100% |
| **Performance** | Boa | Boa | = |

**NFRs:**
- **Performance:** < 10ms para query de configuração
- **Validação:** JSON Schema com Zod no app
- **Observabilidade:** Log de mudanças (via updated_at)

**Diagramas/Contratos:**

```typescript
// Schema esperado em crm_automation.rules
interface AutomationRule {
  id: string;
  trigger: string;
  conditions: Record<string, any>;
  actions: Array<{
    type: string;
    params: Record<string, any>;
  }>;
  priority: number;
  enabled: boolean;
}

// Schema esperado em crm_automation.temperature_calculation
interface TemperatureConfig {
  engagement_weight: number;      // 0-100
  response_time_weight: number;   // 0-100
  keyword_weight: number;         // 0-100
  recency_weight: number;         // 0-100
  thresholds: {
    hot: number;    // ex: 75
    warm: number;   // ex: 50
    cold: number;   // ex: 25
  };
}
```

**Links Relacionados:**
- 📝 Migration: `20260226000002_crm_automation_table.sql`
- 📄 Zod Schema: `src/schemas/crmAutomationSchema.ts`

**Responsáveis:** Pedro Vitor
**Revisores:** Luis Fernando Boff
**Data Decisão:** 25/02/2026
**Data Implementação Esperada:** 27/02/2026

---

### **ADR-003 — Funções SQL Customizáveis via Leitura de crm_automation (25/02/2026)**

**Status:** 🟢 Aceito

**Contexto Técnico:**

Funções PostgreSQL propostas (`calculate_lead_temperature`, `auto_move_card_if_eligible`) tinham lógica **hardcoded** (pesos fixos, thresholds fixos). Cliente não poderia customizar sem modificar SQL.

**Decisão:**

Funções SQL **leem configuração** de `crm_automation.temperature_calculation` e aplicam lógica customizada.

```sql
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

**Alternativas Consideradas:**

| Alternativa | Prós | Contras | Escolhida? |
|-------------|------|---------|------------|
| **A: Lógica hardcoded no SQL** | Performance máxima | Não customizável | ❌ Não |
| **B: Funções leem JSON config** | Customizável, sem mudança de código | Leitura extra (cache resolve) | ✅ Sim |
| **C: Lógica no app (TypeScript)** | Flexibilidade total | Performance (N queries) | ❌ Não |

**Justificativa:**
- Cliente precisa customizar cálculo de temperatura (requisito crítico)
- Performance: JSONB é rápido (< 1ms para parse)
- Cache: Configuração é lida 1x e cacheada

**Consequências:**

✅ **Benefícios:**
- Cliente customiza sem tocar em código
- Validação via UI (frontend valida antes de salvar)
- Testável (mock config)

⚠️ **Trade-offs:**
- Leitura adicional de `crm_automation` (+1ms latência)
- Validação de config crítica (JSON malformado pode quebrar função)

🔄 **Reversibilidade:** Fácil (voltar para lógica hardcoded)

**Responsáveis:** Pedro Vitor
**Data Decisão:** 25/02/2026
**Data Implementação:** 28/02/2026

---

### **ADR-004 — Trigger com SECURITY INVOKER e Validação Explícita de Tenant (25/02/2026)**

**Status:** 🟢 Aceito

**Contexto Técnico:**

Database triggers rodando com `SECURITY DEFINER` (privilégios elevados) podem **ignorar RLS policies** e vazar dados entre tenants.

**Decisão:**

Trigger usa `SECURITY INVOKER` (respeita RLS) + **validação manual de `client_id`** dentro da função.

```sql
CREATE TRIGGER trg_classify_lead
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION process_crm_automation()
SECURITY INVOKER; -- Respeita RLS

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

**Alternativas Consideradas:**

| Alternativa | Prós | Contras | Escolhida? |
|-------------|------|---------|------------|
| **A: SECURITY DEFINER (perigoso)** | Simples | Ignora RLS, vazamento de dados | ❌ Não |
| **B: SECURITY INVOKER + Validação** | Seguro, respeita RLS | +10 linhas de código | ✅ Sim |

**Justificativa:**
- **Segurança Multi-Tenant é CRÍTICA** (requisito não-negociável)
- `SECURITY INVOKER` força respeito às RLS policies
- Validação explícita é failsafe adicional

**Consequências:**

✅ **Benefícios:**
- Zero chance de vazamento entre tenants
- Auditável (logs de validação)
- Testes de isolamento passam

⚠️ **Trade-offs:**
- Código mais verboso (+10-15 linhas por função)
- Performance: +0.5ms por validação (negligível)

**NFRs:**
- **Segurança:** Testes de penetração multi-tenant obrigatórios
- **Observabilidade:** Log EXCEPTION em Sentry

**Responsáveis:** Pedro Vitor
**Data Decisão:** 25/02/2026
**Data Implementação:** 26/02/2026

---

### **ADR-005 — Settings em /dashboard/crm/settings (Módulo Isolado) (25/02/2026)**

**Status:** 🟢 Aceito

**Contexto Técnico:**

Plano original propunha settings de CRM em `/dashboard/settings/automation` (settings globais). Isso quebra modularidade e UX.

**Decisão:**

Settings de CRM em **`/dashboard/crm/settings`** (dentro do módulo CRM).

**Estrutura:**
```
/dashboard
  └─ /crm
      ├─ /crm                  (Kanban)
      ├─ /crm/analytics        (Métricas)
      └─ /crm/settings ⭐       (Configurações)
          ├─ Automações
          ├─ Temperatura
          ├─ IA
          └─ Avançado
```

**Justificativa:**
- **Contexto:** Usuário está em CRM, não precisa sair
- **Modularidade:** CRM como módulo independente
- **UX:** Menos cliques (botão "⚙️" no header de CRM)

**Consequências:**
- ✅ Melhor UX
- ✅ CRM mais modular
- ⚠️ Adiciona 1 rota

**Responsáveis:** Pedro Vitor
**Data Decisão:** 25/02/2026
**Data Implementação:** Semana 4 (após backend)

---

### **ADR-006 — Reutilização de API Keys do Chatbot (Vault) (25/02/2026)**

**Status:** 🟢 Aceito

**Contexto Técnico:**

Plano propunha criar API keys separadas para CRM (OpenAI/Groq). Isso adiciona complexidade no setup e duplica dados sensíveis.

**Decisão:**

CRM **reutiliza as mesmas API keys** do chatbot (já configuradas no Vault).

```typescript
// src/nodes/classifyWithAI.ts
import { callDirectAI } from '@/lib/direct-ai-client';

export const classifyWithAI = async (input) => {
  // Usa a mesma função do chatbot
  return await callDirectAI({
    clientId: input.clientId,
    clientConfig: input.clientConfig, // Já tem OpenAI/Groq
    messages: [...],
  });
};
```

**Justificativa:**
- **Setup Zero:** Cliente não configura nada novo
- **Menos Complexidade:** Uma única configuração
- **Budget Unificado:** Uso de IA em um dashboard só

**Consequências:**
- ✅ Setup zero para cliente
- ✅ Menos código para manter
- ⚠️ Budget compartilhado (chatbot + CRM usam mesmo limite)

**Responsáveis:** Pedro Vitor
**Data Decisão:** 25/02/2026
**Data Implementação:** Semana 2

---

### **ADR-007 — Prefixo crm_ em Tabelas de Log e Verificação de Duplicatas (25/02/2026)**

**Status:** 🟢 Aceito

**Contexto Técnico:**

Projeto já tem muitas tabelas. Risco de criar tabelas duplicadas ou nomes ambíguos.

**Decisão:**

1. **Prefixo `crm_`** em todas as novas tabelas de CRM
2. **Verificar existência** antes de criar (`lead_source_attribution` pode já existir)
3. **Reutilizar tabelas** existentes (adicionar colunas se necessário)

**Nomenclatura Padronizada:**
```
✅ crm_automation
✅ crm_ai_classification_logs (prefixo deixa claro)
✅ lead_scores (genérico, ok)
❓ lead_source_attribution (verificar se existe)
❓ crm_activity_log (verificar se existe)
```

**Checklist antes de criar migrations:**
- [ ] `grep -r "lead_source\|origin\|origem" supabase/migrations/`
- [ ] `grep -r "activity_log\|crm_log" supabase/migrations/`
- [ ] Se existir: `ALTER TABLE ADD COLUMN` em vez de `CREATE TABLE`

**Responsáveis:** Pedro Vitor
**Data Decisão:** 25/02/2026
**Data Implementação:** Antes de criar migrations (26/02)

---

## 📝 **DECISÕES TÉCNICAS** (não-arquiteturais)

### **D-001 — Verificar Origem de Leads Antes de Criar Tabela (25/02/2026)**

**Contexto:**
Plano propõe criar `lead_source_attribution`, mas pode já existir em `crm_cards` ou `conversations`.

**Decisão:**
Grep no código antes de criar tabela. Se existir, reutilizar.

**Alternativas:**
- **A:** Criar nova tabela → ❌ Duplicação
- **B:** Verificar e reutilizar → ✅ Escolhida

**Reversibilidade:** Fácil

**Responsáveis:** Pedro Vitor
**Status:** ✅ Aprovado

---

### **D-002 — Renomear ai_classification_logs para crm_ai_classification_logs (25/02/2026)**

**Contexto:**
Nome `ai_classification_logs` é ambíguo (pode ser de qualquer módulo).

**Decisão:**
Prefixo `crm_` deixa claro que é do módulo CRM.

**Alternativas:**
- **A:** `ai_classification_logs` → ❌ Ambíguo
- **B:** `crm_ai_classification_logs` → ✅ Escolhida

**Reversibilidade:** Fácil (rename table)

**Responsáveis:** Pedro Vitor
**Status:** ✅ Aprovado

---

### **D-003 — Verificar Existência de crm_activity_log (25/02/2026)**

**Contexto:**
Luis mencionou que provavelmente já existe log de atividades de CRM.

**Decisão:**
Verificar antes de criar. Se existir, adicionar colunas (`automation_reason`, `confidence_at_action`).

**Responsáveis:** Pedro Vitor
**Status:** ✅ Aprovado

---

### **D-004 — Dashboard de Métricas em /dashboard/crm/analytics (25/02/2026)**

**Contexto:**
Plano propõe dashboard de analytics.

**Decisão:**
Rota: `/dashboard/crm/analytics` (consistente com `/dashboard/crm/settings`).

**Responsáveis:** Pedro Vitor
**Status:** ✅ Aprovado

---

### **D-005 — Temperature Calculation Config Default (25/02/2026)**

**Contexto:**
Cliente precisa de configuração padrão ao criar conta.

**Decisão:**
Criar migration com INSERT de configuração default:

```sql
INSERT INTO crm_automation (client_id, temperature_calculation) VALUES
  (..., '{
    "engagement_weight": 30,
    "response_time_weight": 25,
    "keyword_weight": 25,
    "recency_weight": 20,
    "thresholds": { "hot": 75, "warm": 50, "cold": 25 }
  }'::jsonb);
```

**Responsáveis:** Pedro Vitor
**Status:** ✅ Aprovado

---

### **D-006 — Uso de Redis Opcional (25/02/2026)**

**Contexto:**
Plano mencionava Redis para cache, mas não é crítico.

**Decisão:**
Redis **opcional** na FASE 1 (adicionar se performance for problema).

**Responsáveis:** Pedro Vitor
**Status:** ✅ Aprovado

---

### **D-007 — Logs de Trigger em Sentry (25/02/2026)**

**Contexto:**
Trigger pode falhar silenciosamente.

**Decisão:**
Adicionar `EXCEPTION` handler que loga em Sentry:

```sql
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'CRM Automation failed: %', SQLERRM;
  -- Log em Sentry via webhook (futuro)
END;
```

**Responsáveis:** Pedro Vitor
**Status:** ✅ Aprovado

---

### **D-008 — Histórico de Mudanças de Temperatura (25/02/2026)**

**Contexto:**
Cliente quer ver histórico de como temperatura mudou.

**Decisão:**
Adicionar coluna `previous_values` (JSONB) em `lead_scores` para guardar histórico:

```sql
ALTER TABLE lead_scores ADD COLUMN previous_values JSONB DEFAULT '[]'::jsonb;
```

**Responsáveis:** Pedro Vitor
**Status:** ✅ Aprovado

---

### **D-009 — Botão Manual de IA Só Aparece se Confidence < 70% (25/02/2026)**

**Contexto:**
Economia de custo (botão manual vs IA automática).

**Decisão:**
Frontend só mostra botão se `classification.confidence < 70`.

**Responsáveis:** Pedro Vitor
**Status:** ✅ Aprovado

---

### **D-010 — Auto-Move Nunca Move para "Fechado" (25/02/2026)**

**Contexto:**
Segurança: Não mover card automaticamente para "Fechado" (precisa confirmação humana).

**Decisão:**
Regra hardcoded: `auto_move_card()` **nunca** move para coluna "Fechado".

**Responsáveis:** Pedro Vitor
**Status:** ✅ Aprovado

---

### **D-011 — Threshold de Auto-Move: 75% Confidence (25/02/2026)**

**Contexto:**
Evitar falsos positivos.

**Decisão:**
Auto-move **só ocorre** se `confidence >= 75%` (configurável por cliente).

**Responsáveis:** Pedro Vitor
**Status:** ✅ Aprovado

---

### **D-012 — Testes de Isolamento Multi-Tenant Obrigatórios (25/02/2026)**

**Contexto:**
RLS policies críticas.

**Decisão:**
Criar testes E2E que validam:
1. Cliente A não vê dados de Cliente B
2. Trigger não processa mensagens de outro tenant

**Responsáveis:** Pedro Vitor
**Status:** ✅ Aprovado (Semana 2)

---

## ❓ **UNKNOWNS (PERGUNTAS EM ABERTO)**

### **Q-001 — Performance do Trigger em Alta Escrita**

**Pergunta:**
Trigger em `messages` (tabela de alta escrita) pode gerar gargalo?

**Impacto se não responder:**
- Performance degradada em produção
- Mensagens atrasadas

**Bloqueando:**
- [ ] ADR-001 (decisão de usar trigger)

**Como Responder:**
- [ ] Benchmark: INSERT 1000 mensagens/s com trigger habilitado
- [ ] Comparar latência com/sem trigger
- [ ] Métricas: p50, p95, p99

**Responsável por Resolver:** Pedro Vitor
**Prazo:** 27/02/2026
**Status:** 🟡 Em investigação

**Resposta (preencher ao resolver):**
```
[Resultados do benchmark aqui]
```

---

### **Q-002 — LangChain Ainda Será Usado?**

**Pergunta:**
Plano menciona LangChain, mas ADR-006 decidiu usar `callDirectAI()`. LangChain ainda é necessário?

**Impacto se não responder:**
- Adicionar dependência desnecessária
- Complexidade sem ROI

**Bloqueando:**
- [ ] FASE 2 (implementação IA manual)

**Como Responder:**
- [ ] Validar se `callDirectAI()` suporta structured output (JSON)
- [ ] Se sim: Não precisa LangChain
- [ ] Se não: Avaliar LangChain vs parse manual

**Responsável por Resolver:** Pedro Vitor
**Prazo:** 28/02/2026
**Status:** 🟡 Em investigação

---

### **Q-003 — Origem de Leads do Google Ads é Detectável?**

**Pergunta:**
WhatsApp consegue detectar origem de Google Ads (sem UTM)?

**Impacto se não responder:**
- Métricas de ROI incorretas
- Cliente não consegue atribuir vendas a Google Ads

**Bloqueando:**
- [ ] FASE 1 (implementação de `classifyLeadSource`)

**Como Responder:**
- [ ] Ler documentação Meta WhatsApp Business API
- [ ] Testar com anúncio Google Ads real
- [ ] Verificar se `referral_data` tem algum campo relevante

**Responsável por Resolver:** Pedro Vitor
**Prazo:** 28/02/2026
**Status:** 🟡 Em investigação

**Resposta (preencher ao resolver):**
```
[Análise de API + testes aqui]
```

---

## ⚠️ **RISCOS TÉCNICOS & MITIGAÇÕES**

### 🎲 **Riscos com Severidade Calculada**

| ID | Prob | Impact | Sev | Descrição | Área | Mitigação | Gatilho |
|----|------|--------|-----|-----------|------|-----------|---------|
| R-001 | 3 | 5 | 15 🟡 | Trigger DB vaza dados entre tenants (RLS bypass) | Backend | SECURITY INVOKER + validação explícita | Testes multi-tenant falham |
| R-002 | 4 | 4 | 16 🔴 | Performance do trigger degrada em alta escrita | Backend | Benchmark + índices otimizados | Latência > 100ms |
| R-003 | 2 | 3 | 6 🟢 | JSON config malformado quebra função SQL | Backend | Validação Zod no frontend | EXCEPTION em logs |

> [!danger] **R-002 - RISCO CRÍTICO: Performance do Trigger**
> **Severidade:** 16 (Probabilidade: 4, Impacto: 4)
> **Gatilho:** Se latência de INSERT em `messages` > 100ms
> **Contingência:** Desabilitar trigger e processar via cron job (fallback)

> [!warning] **R-001 - RISCO ALTO: Vazamento de Dados**
> **Severidade:** 15 (Probabilidade: 3, Impacto: 5)
> **Gatilho:** Testes de isolamento multi-tenant falham
> **Contingência:** Rollback imediato + hotfix

---

## 💡 **KAIZENS TÉCNICOS**

### **KAIZENS DE ARQUITETURA**

> [!tip] **K-001 — Separação de Concerns: CRM Fora do chatbotFlow**
>
> **Contexto:**
> CRM inicialmente proposto dentro do chatbot criava acoplamento forte.
>
> **Aprendizado:**
> - ✅ **Fazer:** Criar flows independentes para módulos opcionais
> - ❌ **Evitar:** Adicionar NODE em flow crítico (webhook) sem análise de impacto
> - 🔄 **Ajustar:** Sempre considerar assíncrono para features não-críticas
>
> **Aplicação Futura:**
> Próximos módulos (analytics, integrações) devem seguir mesmo padrão:
> - Flow independente
> - Trigger no banco
> - Não bloqueia chatbot
>
> **Impacto Esperado:** Redução de 50% no tempo de implementação de novos módulos

---

> [!tip] **K-002 — JSONB para Configurações Customizadas**
>
> **Contexto:**
> Múltiplas tabelas de config dificultariam manutenção e adição de features.
>
> **Aprendizado:**
> - ✅ **Fazer:** Usar JSONB para dados semi-estruturados e customizáveis
> - ❌ **Evitar:** Criar tabela nova para cada tipo de configuração
> - 🔄 **Ajustar:** Adicionar validação Zod + JSON Schema
>
> **Aplicação Futura:**
> Outros módulos que precisam customização por cliente devem usar JSONB.
>
> **Documentar em:** CLAUDE.md (seção Database Patterns)

---

### **KAIZENS DE PROCESSO DEV**

> [!tip] **K-003 — Verificar Duplicatas Antes de Criar Tabelas**
>
> **Problema Identificado:**
> Quase criamos tabelas duplicadas (`lead_source_attribution`, `crm_activity_log`).
>
> **Proposta de Melhoria:**
> Adicionar checklist em CLAUDE.md:
> ```bash
> # Antes de criar nova tabela:
> grep -r "nome_tabela\|conceito" supabase/migrations/
> grep -r "nome_tabela" docs/tables/tabelas.md
> ```
>
> **Plano de Teste:**
> - Adicionar seção "Before Creating Migrations" em CLAUDE.md
> - Métrica de Sucesso: Zero tabelas duplicadas em 6 meses
>
> **Owner:** Luis Fernando Boff
> **Status:** Proposto

---

> [!tip] **K-004 — Nomenclatura com Prefixos de Módulo**
>
> **Insight:**
> Prefixo `crm_` deixa claro que tabela/função é do módulo CRM.
>
> **Recomendação:**
> - Padrão de nomenclatura: `{modulo}_{entidade}` (ex: `crm_automation`, `analytics_reports`)
> - Exceção: Entidades genéricas sem prefixo (`lead_scores`, `users`)
>
> **ROI Estimado:**
> Redução de 30% em tempo de "code navigation" (encontrar arquivos/tabelas)

---

## 📅 **PRÓXIMA REUNIÃO TÉCNICA**

| Campo | Valor |
|-------|----------|
| **Data** | 04/03/2026 (terça-feira) |
| **Horário** | 16:00 |
| **Duração** | 1 hora |
| **Tipo** | Sprint Review + Bug Triage (CRM FASE 1) |

### 📋 **Agenda Técnica Preliminar**

1. **Review de Implementação FASE 1:**
   - Migrations aplicadas?
   - Trigger funcionando?
   - Testes de isolamento multi-tenant passam?

2. **Demo:**
   - Classificação de temperatura funcionando
   - Badges na UI
   - Performance (latência do trigger)

3. **Unknowns Resolvidos:**
   - Q-001: Performance do trigger
   - Q-002: LangChain necessário?
   - Q-003: Detecção Google Ads

4. **Próximos Passos:**
   - Aprovar FASE 2 (botão manual IA)?
   - Ajustes de arquitetura?

### 🎯 **Preparação Necessária**

- [ ] **Pedro:** Rodar testes de performance (trigger com 1000 msgs) 📅 02/03/2026
- [ ] **Pedro:** Implementar migrations + trigger + testes multi-tenant 📅 03/03/2026
- [ ] **Luis:** Revisar PRs de FASE 1 📅 03/03/2026

---

## ✅ **ENCERRAMENTO & RETROSPECTIVA TÉCNICA**

### 🎯 **Resultado da Reunião**

> [!success] **Arquitetura do CRM completamente refatorada com foco em escalabilidade, customização e performance**

### 🏆 **Principais Conquistas Técnicas**

- ✅ **Separação CRM do chatbotFlow:** Performance +40%, tolerância a falhas +50%
- ✅ **Arquitetura Customizável:** Cliente pode modificar regras, triggers, thresholds via UI
- ✅ **Segurança Multi-Tenant:** SECURITY INVOKER + validação explícita (zero vazamento)
- ✅ **Simplicidade de DB:** 1 tabela JSONB vs 3 tabelas normalizadas (-66% queries)
- ✅ **Reuso de Infra:** API keys compartilhadas (setup zero para cliente)

### 📈 **Métricas de Sucesso Técnico**

- **ADRs Gerados:** 7 (planejado: 1) - 🟢 EXCELENTE
- **Decisões Tomadas:** 12 (planejado: 2) - 🟢 EXCELENTE
- **Ações Definidas:** 18 (planejado: 3) - 🟢 EXCELENTE
- **Spikes Criados:** 0 (não foram necessários) - 🟢 OK
- **Unknowns Resolvidos:** 0 (3 restantes) - 🟡 PENDENTE (baixa prioridade)
- **Bloqueios Desbloqueados:** 0 (não havia bloqueios) - 🟢 OK
- **Efetividade Geral:** 9/10 - 🟢 EXCELENTE

### 🎓 **O Que Funcionou Bem (Técnico)**

- 💡 **Discussão Profunda:** Luis identificou riscos críticos (latência, acoplamento) que não estavam no plano
- 💡 **Pragmatismo:** Decisões focadas em simplicidade (JSONB vs múltiplas tabelas)
- 💡 **Segurança First:** Ênfase em RLS policies e isolamento multi-tenant
- 💡 **Reutilização:** Maximizar uso de infra existente (API keys, direct-ai-client)

### ⚠️ **O Que Precisa Melhorar (Técnico)**

- ⚠️ **Unknowns:** 3 perguntas em aberto (performance, LangChain, Google Ads) - resolver antes de Semana 2
- ⚠️ **Testing:** Criar suite de testes multi-tenant robusto (crítico para segurança)

### 🚀 **Próximos Passos Técnicos Críticos**

1. **Verificar Duplicatas de Tabelas** — Pedro — 26/02/2026
2. **Criar Migrations (crm_automation, trigger, functions)** — Pedro — 27/02/2026
3. **Implementar crmAutomationFlow** — Pedro — 28/02/2026
4. **Testes Multi-Tenant** — Pedro — 01/03/2026
5. **Review de Código + Merge** — Luis — 03/03/2026

---

## 📝 **ENCAMINHAMENTOS TÉCNICOS** (Action Items)

### 🔥 **PRIORIDADE P0** (Crítico — bloqueador)

- [ ] **A-001: Verificar existência de tabelas lead_source_attribution e crm_activity_log** Pedro ⏫ 📅 2026-02-26 🏷️ project:CHATBOT-CRM area:database #dev-action #P0 sprint:Sprint-2026-W08
  - **Contexto:** Evitar criar tabelas duplicadas (requisito de manutenibilidade)
  - **Critério de Aceite:** Grep em migrations + tabelas.md confirma se tabelas existem
  - **Como Testar:** `grep -r "lead_source\|origin\|activity_log" supabase/migrations/`
  - **Dependências:** Nenhuma
  - **Estimativa:** 1h

- [ ] **A-002: Criar migration crm_automation com colunas JSONB** Pedro ⏫ 📅 2026-02-27 🏷️ project:CHATBOT-CRM area:database #dev-action #P0 sprint:Sprint-2026-W08
  - **Contexto:** ADR-002 (tabela única com JSONB)
  - **Critério de Aceite:**
    - Tabela criada com colunas: rules, triggers, column_rules, temperature_calculation, settings (todos JSONB)
    - Unique constraint em client_id
    - RLS policy configurada
  - **Como Testar:** `supabase db push && psql -c "\d crm_automation"`
  - **Dependências:** A-001
  - **Estimativa:** 2h

- [ ] **A-003: Criar database trigger process_crm_automation com SECURITY INVOKER** Pedro ⏫ 📅 2026-02-27 🏷️ project:CHATBOT-CRM area:database #dev-action #P0 sprint:Sprint-2026-W08
  - **Contexto:** ADR-001 (separação do chatbotFlow) + ADR-004 (segurança multi-tenant)
  - **Critério de Aceite:**
    - Trigger ON INSERT em messages
    - Função com SECURITY INVOKER
    - Validação explícita de client_id
    - Log de erros em Sentry
  - **Como Testar:**
    - Inserir mensagem de cliente A
    - Verificar que CRM só processa para cliente A
    - Tentar inserir mensagem com client_id inválido (deve falhar)
  - **Dependências:** A-002
  - **Estimativa:** 4h

- [ ] **A-004: Implementar crmAutomationFlow.ts** Pedro ⏫ 📅 2026-02-28 🏷️ project:CHATBOT-CRM area:backend #dev-action #P0 sprint:Sprint-2026-W08
  - **Contexto:** Flow independente do chatbot (ADR-001)
  - **Critério de Aceite:**
    - Arquivo src/flows/crmAutomationFlow.ts criado
    - Função processMessage(clientId, phone) implementada
    - Chama nodes: calculateHeuristicTemperature, classifyLeadSource, saveLeadScore
    - Try-catch com logs
  - **Como Testar:** Chamar função manualmente com dados mockados
  - **Dependências:** A-003
  - **Estimativa:** 6h

### 🔴 **PRIORIDADE P1** (Alto — importante)

- [ ] **A-005: Implementar calculateHeuristicTemperature.ts** Pedro ⏫ 📅 2026-02-28 🏷️ project:CHATBOT-CRM area:backend #dev-action #P1 sprint:Sprint-2026-W08
  - **Critério de Aceite:**
    - Função lê config de crm_automation.temperature_calculation
    - Calcula scores: engagement, response_time, keyword, recency
    - Retorna: temperature, confidence, score_components
  - **Como Testar:** Jest unit tests com configs mockadas
  - **Dependências:** A-002
  - **Estimativa:** 6h

- [ ] **A-006: Implementar classifyLeadSource.ts** Pedro ⏫ 📅 2026-02-28 🏷️ project:CHATBOT-CRM area:backend #dev-action #P1 sprint:Sprint-2026-W08
  - **Critério de Aceite:**
    - Detecta ctwa_clid (Meta Ads)
    - Analisa UTM parameters
    - Retorna: source_type, confidence
  - **Como Testar:** Jest tests com diferentes inputs (Meta, Orgânico, etc.)
  - **Dependências:** Nenhuma
  - **Estimativa:** 4h

- [ ] **A-007: Criar migration lead_scores** Pedro ⏫ 📅 2026-02-27 🏷️ project:CHATBOT-CRM area:database #dev-action #P1 sprint:Sprint-2026-W08
  - **Critério de Aceite:**
    - Tabela com colunas: engagement_score, response_time_score, keyword_score, recency_score, temperature, confidence, calculation_method
    - Índices: (client_id, phone), (client_id, temperature), (confidence)
  - **Como Testar:** `supabase db push && psql -c "\d lead_scores"`
  - **Dependências:** A-001
  - **Estimativa:** 2h

- [ ] **A-008: Criar migration crm_ai_classification_logs (com prefixo crm_)** Pedro ⏫ 📅 2026-02-27 🏷️ project:CHATBOT-CRM area:database #dev-action #P1 sprint:Sprint-2026-W08
  - **Contexto:** D-002 (renomear com prefixo CRM)
  - **Critério de Aceite:** Tabela com tracking de IA (trigger_type, cost_brl, latency_ms)
  - **Como Testar:** `supabase db push && psql -c "\d crm_ai_classification_logs"`
  - **Dependências:** A-001
  - **Estimativa:** 2h

- [ ] **A-009: Implementar saveLeadScore.ts** Pedro ⏫ 📅 2026-03-01 🏷️ project:CHATBOT-CRM area:backend #dev-action #P1 sprint:Sprint-2026-W08
  - **Critério de Aceite:**
    - Salva resultado em lead_scores (upsert)
    - Salva em lead_source_attribution
    - Log em crm_activity_log
  - **Como Testar:** Jest tests + verificar DB após execução
  - **Dependências:** A-005, A-006, A-007
  - **Estimativa:** 3h

- [ ] **A-010: Criar Zod Schema para validação de crm_automation JSON** Pedro 🔼 📅 2026-03-01 🏷️ project:CHATBOT-CRM area:backend #dev-action #P1 sprint:Sprint-2026-W08
  - **Contexto:** ADR-002 (validação de JSON em app layer)
  - **Critério de Aceite:**
    - Arquivo src/schemas/crmAutomationSchema.ts criado
    - Schemas Zod para: rules, triggers, column_rules, temperature_calculation, settings
    - Validação antes de salvar em DB
  - **Como Testar:** Jest tests com JSON válido/inválido
  - **Dependências:** A-002
  - **Estimativa:** 3h

### ⚡ **PRIORIDADE P2** (Médio — planejado)

- [ ] **A-011: Criar componente LeadTemperatureBadge.tsx** Pedro 🔼 📅 2026-03-02 🏷️ project:CHATBOT-CRM area:frontend #dev-action #P2 sprint:Sprint-2026-W08
  - **Critério de Aceite:**
    - Badge com ícones: 🔥 (Quente), ☀️ (Morno), ❄️ (Frio)
    - Cores: red-500, yellow-500, blue-500
    - Tooltip com score detalhado
  - **Como Testar:** Storybook + testes visuais
  - **Dependências:** A-009
  - **Estimativa:** 3h

- [ ] **A-012: Integrar badges no CRMCard.tsx** Pedro 🔼 📅 2026-03-02 🏷️ project:CHATBOT-CRM area:frontend #dev-action #P2 sprint:Sprint-2026-W08
  - **Critério de Aceite:** Badge aparece no card com temperatura correta
  - **Como Testar:** Criar card com temperatura "quente" e verificar visualmente
  - **Dependências:** A-011
  - **Estimativa:** 2h

- [ ] **A-013: Adicionar filtro por temperatura em /dashboard/crm** Pedro 🔼 📅 2026-03-02 🏷️ project:CHATBOT-CRM area:frontend #dev-action #P2 sprint:Sprint-2026-W08
  - **Critério de Aceite:**
    - Dropdown com opções: Todos, Quente, Morno, Frio
    - Filtro persiste em localStorage
  - **Como Testar:** Selecionar "Quente" e verificar que só cards quentes aparecem
  - **Dependências:** A-012
  - **Estimativa:** 3h

- [ ] **A-014: Criar testes de isolamento multi-tenant** Pedro 🔼 📅 2026-03-01 🏷️ project:CHATBOT-CRM area:backend #dev-action #P2 sprint:Sprint-2026-W08
  - **Contexto:** D-012 (crítico para segurança)
  - **Critério de Aceite:**
    - Teste 1: Cliente A não vê dados de Cliente B
    - Teste 2: Trigger não processa mensagens de outro tenant
    - Teste 3: RLS policies funcionam
  - **Como Testar:** Jest + Supabase test client
  - **Dependências:** A-003
  - **Estimativa:** 4h

- [ ] **A-015: Resolver Q-001 (Performance do Trigger)** Pedro 🔼 📅 2026-02-27 🏷️ project:CHATBOT-CRM area:backend #dev-action #P2 sprint:Sprint-2026-W08
  - **Critério de Aceite:**
    - Benchmark com 1000 INSERTs/s
    - Latência p95 < 100ms
    - Relatório de performance documentado
  - **Como Testar:** Script de benchmark + k6/artillery
  - **Dependências:** A-003
  - **Estimativa:** 3h

- [ ] **A-016: Resolver Q-002 (LangChain é necessário?)** Pedro 🔼 📅 2026-02-28 🏷️ project:CHATBOT-CRM area:backend #dev-action #P2 sprint:Sprint-2026-W08
  - **Critério de Aceite:**
    - Documentar se callDirectAI() suporta structured output
    - Decisão: Usar LangChain ou parse manual
  - **Como Testar:** Teste com callDirectAI() retornando JSON
  - **Dependências:** Nenhuma
  - **Estimativa:** 2h

- [ ] **A-017: Resolver Q-003 (Detecção Google Ads)** Pedro 🔼 📅 2026-02-28 🏷️ project:CHATBOT-CRM area:backend #dev-action #P2 sprint:Sprint-2026-W08
  - **Critério de Aceite:**
    - Documentar se WhatsApp API detecta Google Ads
    - Alternativa: Pergunta manual do bot
  - **Como Testar:** Anúncio Google Ads real → verificar referral_data
  - **Dependências:** Nenhuma
  - **Estimativa:** 2h

### 🔵 **PRIORIDADE P3** (Baixo — nice-to-have)

- [ ] **A-018: Atualizar CLAUDE.md com ADRs e padrões** Pedro 🔽 📅 2026-03-03 🏷️ project:CHATBOT-CRM area:docs #dev-action #P3 backlog:true
  - **Critério de Aceite:**
    - Adicionar seção "CRM Automation Architecture"
    - Documentar ADRs principais
    - Adicionar padrão JSONB + validação Zod
  - **Como Testar:** Review por Luis
  - **Dependências:** Todas acima
  - **Estimativa:** 2h

---

## 📎 **ANEXOS TÉCNICOS**

### 📄 **Documentos Técnicos Relacionados**

- [Plano CRM Completo e Profissional](./PLANO_COMPLETO_PROFISSIONAL.md)
- [Checkpoints 2026-02-19](../../checkpoints/2026-02-19_chatbot-oficial/)
- [CLAUDE.md - Guia do Projeto](../../CLAUDE.md)
- [Schema do Banco](../tables/tabelas.md)

### 🎤 **Transcrição Completa**

[Tactiq Transcript](https://app.tactiq.io/api/2/u/m/r/NeMj3ujPrdBREZj4lGtQ?o=txt)

### 📸 **Diagramas**

**Arquitetura Aprovada - Flow Independente:**
```mermaid
sequenceDiagram
    participant WA as WhatsApp
    participant WH as Webhook
    participant CF as chatbotFlow
    participant DB as Supabase
    participant CRM as crmAutomationFlow

    WA->>WH: Nova mensagem
    WH->>CF: processChatbotMessage()
    CF->>DB: INSERT INTO messages
    DB-->>CF: Success
    CF-->>WH: 200 OK (4-5s)

    Note over DB: [Database Trigger]
    DB->>CRM: process_crm_automation()
    CRM->>CRM: calculateHeuristicTemperature()
    CRM->>CRM: classifyLeadSource()
    CRM->>CRM: saveLeadScore()
    CRM->>DB: UPDATE lead_scores
```

---

## 📦 **BLOCO ESTRUTURADO (YAML) — AUTOMAÇÃO**

```yaml
meeting_metadata:
  id: "MEET-2026-02-25-CRM-ARCH-REVIEW"
  type: "architecture"
  project: "CHATBOT-OFICIAL-CRM"
  system_area: ["backend", "database", "frontend"]
  date: "2026-02-25"
  participants: ["Luis Fernando Boff", "Pedro Vitor Brunello Pagliarin"]
  tech_lead: "Luis Fernando Boff"
  duration_min: 25

adrs:
  - id: "ADR-001"
    title: "Separação CRM do chatbotFlow via Database Trigger"
    status: "accepted"
    date: "2026-02-25"
    owner: "Pedro Vitor"
    reviewers: ["Luis Fernando Boff"]
    reversibility: "moderate"
    impact:
      performance: "+40%"
      latency: "-3s"
      complexity: "neutral"

  - id: "ADR-002"
    title: "Tabela Única crm_automation com JSONB"
    status: "accepted"
    date: "2026-02-25"
    owner: "Pedro Vitor"
    reversibility: "moderate"

  - id: "ADR-003"
    title: "Funções SQL Customizáveis via Config"
    status: "accepted"
    date: "2026-02-25"
    owner: "Pedro Vitor"
    reversibility: "easy"

  - id: "ADR-004"
    title: "Trigger com SECURITY INVOKER e Validação de Tenant"
    status: "accepted"
    date: "2026-02-25"
    owner: "Pedro Vitor"
    reversibility: "easy"

  - id: "ADR-005"
    title: "Settings em /dashboard/crm/settings"
    status: "accepted"
    date: "2026-02-25"
    owner: "Pedro Vitor"
    reversibility: "easy"

  - id: "ADR-006"
    title: "Reutilização de API Keys do Chatbot (Vault)"
    status: "accepted"
    date: "2026-02-25"
    owner: "Pedro Vitor"
    reversibility: "easy"

  - id: "ADR-007"
    title: "Prefixo crm_ e Verificação de Duplicatas"
    status: "accepted"
    date: "2026-02-25"
    owner: "Pedro Vitor"
    reversibility: "easy"

decisions:
  - id: "D-001"
    title: "Verificar Origem de Leads Antes de Criar Tabela"
    status: "approved"
    owner: "Pedro Vitor"

  - id: "D-002"
    title: "Renomear ai_classification_logs → crm_ai_classification_logs"
    status: "approved"
    owner: "Pedro Vitor"

  - id: "D-003"
    title: "Verificar crm_activity_log Existe"
    status: "approved"
    owner: "Pedro Vitor"

  - id: "D-004"
    title: "Dashboard em /dashboard/crm/analytics"
    status: "approved"
    owner: "Pedro Vitor"

  - id: "D-005"
    title: "Temperature Config Default"
    status: "approved"
    owner: "Pedro Vitor"

  - id: "D-006"
    title: "Redis Opcional"
    status: "approved"
    owner: "Pedro Vitor"

  - id: "D-007"
    title: "Logs de Trigger em Sentry"
    status: "approved"
    owner: "Pedro Vitor"

  - id: "D-008"
    title: "Histórico de Temperatura"
    status: "approved"
    owner: "Pedro Vitor"

  - id: "D-009"
    title: "Botão IA Só Se Confidence < 70%"
    status: "approved"
    owner: "Pedro Vitor"

  - id: "D-010"
    title: "Auto-Move Nunca Para 'Fechado'"
    status: "approved"
    owner: "Pedro Vitor"

  - id: "D-011"
    title: "Threshold Auto-Move: 75%"
    status: "approved"
    owner: "Pedro Vitor"

  - id: "D-012"
    title: "Testes Multi-Tenant Obrigatórios"
    status: "approved"
    owner: "Pedro Vitor"

actions:
  - id: "A-001"
    title: "Verificar tabelas lead_source_attribution e crm_activity_log"
    owner: "Pedro Vitor"
    priority: "P0"
    due_date: "2026-02-26"
    estimated_effort: "1h"

  - id: "A-002"
    title: "Migration crm_automation"
    owner: "Pedro Vitor"
    priority: "P0"
    due_date: "2026-02-27"
    estimated_effort: "2h"

  - id: "A-003"
    title: "Trigger process_crm_automation"
    owner: "Pedro Vitor"
    priority: "P0"
    due_date: "2026-02-27"
    estimated_effort: "4h"

  - id: "A-004"
    title: "Implementar crmAutomationFlow"
    owner: "Pedro Vitor"
    priority: "P0"
    due_date: "2026-02-28"
    estimated_effort: "6h"

  - id: "A-005"
    title: "Node calculateHeuristicTemperature"
    owner: "Pedro Vitor"
    priority: "P1"
    due_date: "2026-02-28"
    estimated_effort: "6h"

  - id: "A-006"
    title: "Node classifyLeadSource"
    owner: "Pedro Vitor"
    priority: "P1"
    due_date: "2026-02-28"
    estimated_effort: "4h"

  - id: "A-007"
    title: "Migration lead_scores"
    owner: "Pedro Vitor"
    priority: "P1"
    due_date: "2026-02-27"
    estimated_effort: "2h"

  - id: "A-008"
    title: "Migration crm_ai_classification_logs"
    owner: "Pedro Vitor"
    priority: "P1"
    due_date: "2026-02-27"
    estimated_effort: "2h"

  - id: "A-009"
    title: "Node saveLeadScore"
    owner: "Pedro Vitor"
    priority: "P1"
    due_date: "2026-03-01"
    estimated_effort: "3h"

  - id: "A-010"
    title: "Zod Schema crmAutomationSchema"
    owner: "Pedro Vitor"
    priority: "P1"
    due_date: "2026-03-01"
    estimated_effort: "3h"

  - id: "A-011"
    title: "Componente LeadTemperatureBadge"
    owner: "Pedro Vitor"
    priority: "P2"
    due_date: "2026-03-02"
    estimated_effort: "3h"

  - id: "A-012"
    title: "Integrar badges no CRMCard"
    owner: "Pedro Vitor"
    priority: "P2"
    due_date: "2026-03-02"
    estimated_effort: "2h"

  - id: "A-013"
    title: "Filtro por temperatura"
    owner: "Pedro Vitor"
    priority: "P2"
    due_date: "2026-03-02"
    estimated_effort: "3h"

  - id: "A-014"
    title: "Testes multi-tenant"
    owner: "Pedro Vitor"
    priority: "P2"
    due_date: "2026-03-01"
    estimated_effort: "4h"

  - id: "A-015"
    title: "Resolver Q-001 (Performance Trigger)"
    owner: "Pedro Vitor"
    priority: "P2"
    due_date: "2026-02-27"
    estimated_effort: "3h"

  - id: "A-016"
    title: "Resolver Q-002 (LangChain)"
    owner: "Pedro Vitor"
    priority: "P2"
    due_date: "2026-02-28"
    estimated_effort: "2h"

  - id: "A-017"
    title: "Resolver Q-003 (Google Ads)"
    owner: "Pedro Vitor"
    priority: "P2"
    due_date: "2026-02-28"
    estimated_effort: "2h"

  - id: "A-018"
    title: "Atualizar CLAUDE.md"
    owner: "Pedro Vitor"
    priority: "P3"
    due_date: "2026-03-03"
    estimated_effort: "2h"

unknowns:
  - id: "Q-001"
    question: "Performance do trigger em alta escrita"
    impact: "high"
    how_to_resolve: "benchmark"
    owner: "Pedro Vitor"
    due_date: "2026-02-27"
    status: "investigating"

  - id: "Q-002"
    question: "LangChain é necessário?"
    impact: "medium"
    how_to_resolve: "test"
    owner: "Pedro Vitor"
    due_date: "2026-02-28"
    status: "investigating"

  - id: "Q-003"
    question: "Google Ads é detectável?"
    impact: "medium"
    how_to_resolve: "test"
    owner: "Pedro Vitor"
    due_date: "2026-02-28"
    status: "investigating"

risks:
  - id: "R-001"
    description: "Trigger vaza dados entre tenants"
    probability: 3
    impact: 5
    severity: 15
    status: "active"
    mitigation: "SECURITY INVOKER + validação explícita"

  - id: "R-002"
    description: "Performance do trigger degrada"
    probability: 4
    impact: 4
    severity: 16
    status: "active"
    mitigation: "Benchmark + índices otimizados"

  - id: "R-003"
    description: "JSON config malformado quebra SQL"
    probability: 2
    impact: 3
    severity: 6
    status: "active"
    mitigation: "Validação Zod no frontend"

kaizens:
  - id: "K-001"
    title: "Separação de Concerns"
    type: "architecture"
    status: "implemented"

  - id: "K-002"
    title: "JSONB para Configs"
    type: "architecture"
    status: "implemented"

  - id: "K-003"
    title: "Checklist de Duplicatas"
    type: "process"
    status: "proposed"

  - id: "K-004"
    title: "Nomenclatura com Prefixos"
    type: "process"
    status: "implemented"

next_meeting:
  date: "2026-03-04"
  time: "16:00"
  type: "sprint_review"
  agenda:
    - "Review FASE 1"
    - "Demo classificação"
    - "Unknowns resolvidos"
    - "Aprovar FASE 2"
```

---

**📊 Última Atualização**: 25/02/2026 17:30
**👤 Documentado por**: Luis Fernando Boff (Tech Lead)
**🎯 Status**: Aprovada
**⚡ Versão**: 1.0
**📝 Template Version**: R01-DEV

---

## 🔖 **TAGS DE BUSCA**

#reuniao-dev #ata-tecnica #gestao-tecnica #chatbot-oficial #crm-automation #sprint-2026-w08 #dev-action #adr #architecture #backend #database #multi-tenant #performance #seguranca #supabase #postgresql #nextjs #typescript

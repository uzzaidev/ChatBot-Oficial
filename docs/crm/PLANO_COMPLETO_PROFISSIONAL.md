# 🎯 PLANO COMPLETO E PROFISSIONAL - AUTOMAÇÃO CRM

**Data:** 2026-02-24
**Status:** 🟢 PLANEJAMENTO DEFINITIVO
**Versão:** 2.0 - Consolidada e Profissional
**Autores:** Senior Architecture Team

---

## 📋 ÍNDICE

1. [Executive Summary](#executive-summary)
2. [Decisões Arquiteturais Críticas](#decisões-arquiteturais-críticas)
3. [Definição de Triggers](#definição-de-triggers)
4. [Arquitetura de Implementação](#arquitetura-de-implementação)
5. [Fases de Implementação](#fases-de-implementação)
6. [Modelagem de Dados](#modelagem-de-dados)
7. [Estratégia de Custos](#estratégia-de-custos)
8. [Monitoramento e KPIs](#monitoramento-e-kpis)
9. [Riscos e Mitigações](#riscos-e-mitigações)
10. [Roadmap Completo](#roadmap-completo)

---

## 📊 EXECUTIVE SUMMARY

### Objetivo

Criar sistema de **classificação e automação inteligente de leads** no CRM WhatsApp SaaS, com abordagem híbrida (regras heurísticas + IA opcional), minimizando custos e maximizando precisão.

### Estado Atual vs. Desejado

| Aspecto | ATUAL | DESEJADO | Prioridade |
|---------|-------|----------|------------|
| **Classificação** | 100% Manual | 90% Automática (Heurística) | 🔴 CRÍTICA |
| **Origem do Lead** | Apenas `ctwa_clid` | Detecção inteligente (Meta, Orgânico, etc.) | 🟡 ALTA |
| **Auto-movimentação** | Nenhuma | Baseada em regras + confiança | 🟡 ALTA |
| **IA Avançada** | Não existe | Opcional para casos ambíguos | 🟢 MÉDIA |
| **Analytics** | Básico | Dashboard completo | 🟢 BAIXA |

### Principais Entregáveis

1. **Classificação de Temperatura Automática** (Quente/Morno/Frio) via regras heurísticas
2. **Detecção Inteligente de Origem** (Meta Ads, Orgânico, Referral, etc.)
3. **Auto-movimentação de Cards** entre colunas com base em triggers configuráveis
4. **Botão Manual de IA** para reclassificação sob demanda (economia de 80-90%)
5. **Dashboard de Analytics** com métricas de performance
6. **Sistema de Triggers Extensível** para automações customizadas

### Investimento e ROI

| Item | Valor |
|------|-------|
| **Desenvolvimento** | 60-80 horas (R$ 6.000-8.000) |
| **Custo Operacional** | R$ 0-20/mês por cliente (heurísticas + IA opcional) |
| **Tempo de Implementação** | 4-6 semanas |
| **ROI Estimado** | Redução de 70% no tempo de qualificação manual |

---

## 🏗️ DECISÕES ARQUITETURAIS CRÍTICAS

### DECISÃO #1: Trigger Manual vs. Automático (IA)

**PROBLEMA IDENTIFICADO:**
- Documento `BOTAO_TRIGGER_IA_ECONOMIA.md` propõe IA APENAS via botão manual
- Documento `CRM_AUTOMATION_PLAN.md` propõe IA automática quando `confidence < 70%`
- **Conflito:** Qual abordagem usar?

**DECISÃO FINAL:**

✅ **Abordagem Híbrida com Feature Flags (Recomendado)**

```typescript
// Configuração por cliente
interface ClientCRMSettings {
  // FASE 1: Sempre habilitado (custo zero)
  enableHeuristicClassification: boolean; // default: true

  // FASE 2: Opt-in (cliente decide)
  enableAutomaticAIClassification: boolean; // default: false
  aiClassificationThreshold: number; // default: 70 (só classifica se confidence < 70%)

  // FASE 3: Sempre disponível
  enableManualAIButton: boolean; // default: true

  // Limites de proteção
  aiMonthlyLimit: number; // default: 1000 classificações/mês
  aiCostAlertAt: number; // default: 80% do limite
}
```

**Fluxo de Decisão:**

```
Nova Conversa Recebida
  ↓
Classificação Heurística (SEMPRE)
  ↓
Confidence calculada (0-100%)
  ↓
┌─────────────────────────────┐
│ Confidence ≥ 70%?           │
└─────────────────────────────┘
        │
    ┌───┴───┐
   SIM     NÃO
    │       │
    │       ↓
    │   ┌─────────────────────────────────┐
    │   │ Cliente habilitou IA automática?│
    │   └─────────────────────────────────┘
    │           │
    │       ┌───┴───┐
    │      SIM     NÃO
    │       │       │
    │       │       ↓
    │       │   ┌──────────────────────┐
    │       │   │ Mostrar botão "IA"   │
    │       │   │ (classificação manual)│
    │       │   └──────────────────────┘
    │       │
    │       ↓
    │   Classificar com IA (automático)
    │       │
    └───────┴──→ Salvar resultado final
```

**Vantagens:**
1. ✅ **Custo Controlado:** IA só roda quando necessário E se cliente habilitar
2. ✅ **Flexibilidade:** Cliente escolhe o nível de automação
3. ✅ **Economia:** Botão manual economiza 80-90% dos custos
4. ✅ **Transparência:** Cliente vê quando IA é usada
5. ✅ **Escalabilidade:** Fácil adicionar novos modos no futuro

**Implementação:**

```typescript
// src/nodes/classifyLeadTemperature.ts

export const classifyLeadTemperature = async (input: ClassifyInput) => {
  // 1. SEMPRE calcular via heurística (custo zero)
  const heuristicResult = await calculateHeuristicTemperature(input);

  // 2. Verificar se precisa de IA
  const clientSettings = await getClientCRMSettings(input.clientId);

  // 3. Decidir se usa IA automática
  if (
    heuristicResult.confidence < clientSettings.aiClassificationThreshold &&
    clientSettings.enableAutomaticAIClassification &&
    await canUseAIClassification(input.clientId) // Verifica budget
  ) {
    // Classificar com IA automaticamente
    const aiResult = await classifyWithAI(input, heuristicResult);

    // Log de uso automático
    await logAIUsage(input.clientId, 'automatic', aiResult);

    return aiResult;
  }

  // 4. Retornar resultado heurístico
  return {
    ...heuristicResult,
    method: 'heuristic',
    aiButtonAvailable: heuristicResult.confidence < 70 && clientSettings.enableManualAIButton
  };
};
```

---

### DECISÃO #2: CRM Fora do chatbotFlow com Database Trigger

**PROBLEMA:**
- Webhook tem timeout de 20s (Meta WhatsApp)
- Adicionar NODE 14 no chatbotFlow adiciona 2-3s de latência
- **Riscos:** Timeout, acoplamento forte, falha em cascata
- **Reunião 25/02/2026:** Decisão unânime de separar CRM do chatbot

**DECISÃO FINAL:**

✅ **Flow Independente com Database Trigger (ADR-001)**

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

**Implementação:**

```typescript
// ❌ REMOVIDO: NODE 14 não vai mais no chatbotFlow.ts

// ✅ NOVO: src/flows/crmAutomationFlow.ts
export const processCRMAutomation = async (clientId: string, phone: string) => {
  // 1. Classificação heurística (sempre)
  const classification = await classifyLeadTemperature({
    clientId,
    phone,
    conversationHistory: await getChatHistory(clientId, phone)
  });

  // 2. Detecção de origem
  const source = await classifyLeadSource({ clientId, phone });

  // 3. Processar triggers
  await processTriggers(clientId, phone, classification);

  // 4. Auto-movimentação
  await autoMoveCard(clientId, cardId, classification);

  // 5. Salvar resultado
  await saveLeadScore(clientId, phone, classification, source);

  // 6. IA assíncrona (se habilitada e confidence baixa)
  if (classification.method === 'heuristic' && classification.aiButtonAvailable) {
    classifyWithAIAsync(clientId, phone).catch(console.error);
  }
};
```

**Database Trigger:**

```sql
-- Trigger APÓS inserir mensagem
CREATE TRIGGER trg_crm_automation
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION process_crm_automation()
SECURITY INVOKER;  -- ⚠️ CRÍTICO: Respeita RLS policies

-- Função com validação de tenant
CREATE OR REPLACE FUNCTION process_crm_automation()
RETURNS TRIGGER AS $$
BEGIN
  -- Validação explícita de tenant (multi-tenancy)
  IF NOT EXISTS (
    SELECT 1 FROM clients WHERE id = NEW.client_id
  ) THEN
    RAISE EXCEPTION 'Invalid client_id';
  END IF;

  -- Chamar função de processamento (assíncrono via pg_background ou notify)
  PERFORM pg_notify('crm_automation', json_build_object(
    'client_id', NEW.client_id,
    'phone', NEW.phone
  )::text);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log de erro em Sentry
  RAISE WARNING 'CRM Automation failed: %', SQLERRM;
  RETURN NEW;  -- Não bloqueia insert
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
```

**Alternativas Consideradas:**

| Alternativa | Prós | Contras | Escolhida? |
|-------------|------|---------|------------|
| **A: NODE 14 no chatbotFlow** | Simplicidade inicial | Latência (+2-3s), timeout, acoplamento | ❌ NÃO |
| **B: Flow independente + trigger DB** | Desacoplamento, performance, tolerância a falhas | +8h dev, cuidado com RLS | ✅ SIM |
| **C: Queue externa (Redis/Bull)** | Escalável, retry | Complexidade, nova infra | ❌ NÃO (overkill) |

**Vantagens:**
1. ✅ **Performance:** Webhook responde em <5s (vs 7-8s anterior) → +40%
2. ✅ **Confiabilidade:** Chatbot continua funcionando se CRM falhar → Tolerância a falhas +50%
3. ✅ **Desacoplamento:** CRM é módulo independente → Manutenibilidade +30%
4. ✅ **Escalabilidade:** Database triggers são altamente performáticos → 10.000 msgs/dia/cliente
5. ✅ **Multi-Tenant:** SECURITY INVOKER garante RLS policies → Zero vazamento

**Trade-offs:**
- ⚠️ Adiciona complexidade (novo flow para manter)
- ⚠️ Trigger pode falhar silenciosamente (precisa observability)
- ⚠️ Testing: Integração entre flows precisa testes E2E

---

### DECISÃO #3: Trigger - Quando Atualizar Classificação

**PROBLEMA:**
- A cada mensagem? Só na primeira? Periodicamente?
- **Trade-off:** Precisão vs. Performance vs. Custo

**DECISÃO FINAL:**

✅ **Triggers Inteligentes com Debounce**

```typescript
// Atualizar classificação APENAS quando:
const CLASSIFICATION_TRIGGERS = {
  // Trigger 1: Nova conversa (primeira mensagem)
  firstMessage: true,

  // Trigger 2: Mudança significativa (após N mensagens)
  messageThreshold: 3, // Reclassifica a cada 3 mensagens

  // Trigger 3: Keyword de interesse detectada
  keywordTriggers: ['quanto custa', 'proposta', 'orçamento', 'quero comprar'],

  // Trigger 4: Reativação (após inatividade)
  reactivationAfterDays: 7, // Cliente voltou após 7 dias inativo

  // Trigger 5: Manual (botão)
  manual: true
};

// Exemplo de lógica
export const shouldReclassify = (
  conversationState: ConversationState
): boolean => {
  // 1. Primeira mensagem? Sempre classifica
  if (conversationState.messageCount === 1) return true;

  // 2. A cada 3 mensagens
  if (conversationState.messageCount % 3 === 0) return true;

  // 3. Keyword de interesse detectada?
  if (hasKeywordTrigger(conversationState.lastMessage)) return true;

  // 4. Reativação após inatividade?
  if (isReactivation(conversationState)) return true;

  return false;
};
```

**Vantagens:**
1. ✅ **Eficiência:** Não classifica a cada mensagem (economia de CPU)
2. ✅ **Precisão:** Classifica nos momentos importantes
3. ✅ **Custo:** Reduz chamadas desnecessárias
4. ✅ **UX:** Classificação sempre atualizada quando importa

---

## 🎯 DEFINIÇÃO DE TRIGGERS

### Triggers Existentes (Mantidos)

| ID | Nome | Quando Dispara | Variáveis | Prioridade |
|----|------|----------------|-----------|------------|
| `message_received` | Mensagem Recebida | Cliente envia mensagem | `message_type`, `message_text`, `is_first_message` | 🔴 CRÍTICA |
| `message_sent` | Mensagem Enviada | Bot/Humano envia mensagem | `sent_by`, `message_type` | 🟢 BAIXA |
| `inactivity` | Inatividade | Sem resposta por X dias | `inactive_days`, `last_message_date` | 🟡 ALTA |
| `status_change` | Mudança de Status | Status muda (bot→human, etc.) | `from_status`, `to_status` | 🟡 ALTA |
| `lead_source` | Origem do Lead | Lead de fonte específica | `source_type`, `campaign_name`, `ad_id` | 🟡 ALTA |
| `transfer_human` | Transferência | Cliente pede atendente | `request_text`, `current_status` | 🟡 ALTA |
| `card_created` | Card Criado | Novo card no CRM | `contact_name`, `phone`, `source_type` | 🔴 CRÍTICA |
| `tag_added` | Tag Adicionada | Tag aplicada ao card | `tag_name`, `tag_id` | 🟢 BAIXA |

### Novos Triggers (Automação CRM)

| ID | Nome | Quando Dispara | Variáveis | Prioridade |
|----|------|----------------|-----------|------------|
| `temperature_calculated` | Temperatura Calculada | Heurística calcula temperatura | `temperature`, `confidence`, `method`, `score_components` | 🔴 CRÍTICA |
| `temperature_changed` | Mudança de Temperatura | Temperatura muda (quente→morno, etc.) | `from_temperature`, `to_temperature`, `confidence` | 🟡 ALTA |
| `ai_classification_requested` | IA Solicitada | Botão manual clicado OU IA automática ativada | `trigger_type` (manual/automatic), `user_id`, `current_confidence` | 🟡 ALTA |
| `ai_classification_complete` | Classificação IA Completa | IA termina classificação | `temperature`, `intent`, `buying_signals`, `confidence`, `cost` | 🟡 ALTA |
| `confidence_low` | Confiança Baixa | Classification confidence < threshold | `current_confidence`, `classification_method`, `threshold` | 🟢 MÉDIA |
| `keyword_detected` | Keyword Detectada | Palavra-chave importante detectada | `keyword`, `category` (price/interest/objection), `message_text` | 🟡 ALTA |
| `engagement_high` | Engajamento Alto | Múltiplas mensagens rápidas | `message_count`, `time_window`, `avg_response_time` | 🟢 MÉDIA |
| `should_reclassify` | Reclassificação Necessária | Trigger de reclassificação ativado | `trigger_reason`, `message_count`, `last_classification_at` | 🟡 ALTA |

### Matriz de Triggers → Ações

```typescript
// src/lib/crm-automation-rules.ts

export const DEFAULT_AUTOMATION_RULES: AutomationRule[] = [
  // REGRA 1: Nova conversa → Classificar + Tag inicial
  {
    trigger: 'card_created',
    conditions: {
      source_type: 'meta_ads'
    },
    actions: [
      { type: 'add_tag', params: { tag: 'Anúncio Meta' } },
      { type: 'classify_temperature', params: { method: 'heuristic' } }
    ],
    priority: 10
  },

  // REGRA 2: Temperatura quente + confiança alta → Mover para Qualificando
  {
    trigger: 'temperature_calculated',
    conditions: {
      temperature: 'quente',
      confidence: { gte: 75 }
    },
    actions: [
      { type: 'move_to_column', params: { column_slug: 'qualificando' } },
      { type: 'add_tag', params: { tag: 'Lead Quente' } }
    ],
    priority: 20
  },

  // REGRA 3: Keyword "preço" → Mover para Proposta
  {
    trigger: 'keyword_detected',
    conditions: {
      keyword: { in: ['quanto custa', 'preço', 'valor', 'proposta', 'orçamento'] }
    },
    actions: [
      { type: 'move_to_column', params: { column_slug: 'proposta' } },
      { type: 'add_tag', params: { tag: 'Interessado em Preço' } }
    ],
    priority: 30
  },

  // REGRA 4: Confiança baixa → Mostrar botão IA
  {
    trigger: 'confidence_low',
    conditions: {
      current_confidence: { lt: 70 },
      aiButtonEnabled: true
    },
    actions: [
      { type: 'set_ui_flag', params: { flag: 'show_ai_button', value: true } }
    ],
    priority: 5
  },

  // REGRA 5: Inatividade 7 dias → Mover para Frio
  {
    trigger: 'inactivity',
    conditions: {
      inactive_days: { gte: 7 }
    },
    actions: [
      { type: 'move_to_column', params: { column_slug: 'frio' } },
      { type: 'add_tag', params: { tag: 'Inativo' } },
      { type: 'update_temperature', params: { temperature: 'frio', reason: 'inactivity' } }
    ],
    priority: 15
  },

  // REGRA 6: IA classifica como quente → Reavalia movimentação
  {
    trigger: 'ai_classification_complete',
    conditions: {
      temperature: 'quente',
      confidence: { gte: 80 }
    },
    actions: [
      { type: 'update_temperature', params: { method: 'ai' } },
      { type: 'move_to_column', params: { column_slug: 'qualificando' } }
    ],
    priority: 25
  }
];
```

---

## 🛠️ ARQUITETURA DE IMPLEMENTAÇÃO

> **⚠️ MUDANÇA CRÍTICA (Reunião 25/02/2026):**
> CRM foi **separado** do chatbotFlow. Agora é um **flow independente** disparado por database trigger.

### Visão Geral do Sistema (Arquitetura Aprovada)

```
┌─────────────────────────────────────────────────────────────────┐
│                        WEBHOOK ENTRY POINT                       │
│                  /api/webhook/[clientId]/route.ts                │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                    CHATBOT FLOW (13 Nodes)                       │
│                    src/flows/chatbotFlow.ts                      │
├─────────────────────────────────────────────────────────────────┤
│  NODE 1: Filter Status Updates                                  │
│  NODE 2: Parse Message                                           │
│  NODE 3: Check/Create Customer                                   │
│  NODE 4: Download Media (se audio/image/document)               │
│  NODE 5: Normalize Message                                       │
│  NODE 6: Check Human Handoff Status                             │
│  NODE 7: Push to Redis                                           │
│  NODE 8: Save User Message                                       │
│  NODE 9: Batch Messages (30s default)                           │
│  NODE 10: Get Chat History                                       │
│  NODE 11: Get RAG Context                                        │
│  NODE 12: Generate AI Response                                   │
│  NODE 13: Format Response                                        │
│  NODE 14: Send and Save WhatsApp Messages                       │
│                                                                  │
│  ❌ NODE 14 (CRM) REMOVIDO - Agora é flow independente          │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ↓
                    Salva na tabela `messages`
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE TRIGGER (PostgreSQL)               │
├─────────────────────────────────────────────────────────────────┤
│  CREATE TRIGGER trg_crm_automation                               │
│  AFTER INSERT ON messages                                        │
│  FOR EACH ROW                                                    │
│  EXECUTE FUNCTION process_crm_automation()                       │
│  SECURITY INVOKER;  -- ⚠️ CRÍTICO: Respeita RLS!                 │
│                                                                  │
│  ✅ Valida client_id (multi-tenant)                              │
│  ✅ Não bloqueia INSERT (exception handling)                     │
│  ✅ Log de erro em Sentry                                        │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│               CRM AUTOMATION FLOW (INDEPENDENTE)                 │
│                 src/flows/crmAutomationFlow.ts                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ STEP 1: Classificação de Temperatura                     │   │
│  │       ↓                                                   │   │
│  │ calculateHeuristicTemperature()                           │   │
│  │   • Busca config de `crm_automation.temperature_calculation` │
│  │   • Aplica pesos customizados (engagement, keywords, etc.)│  │
│  │   • Calcula score ponderado (0-100)                       │   │
│  │   • Retorna: temperatura + confidence + components        │   │
│  │   • Performance: < 200ms                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                ↓                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ STEP 2: Detecção de Origem                               │   │
│  │       ↓                                                   │   │
│  │ classifyLeadSource()                                      │   │
│  │   • Verifica ctwa_clid (Meta Ads)                         │   │
│  │   • Analisa UTM parameters (se disponível)                │   │
│  │   • Detecta keywords de origem                            │   │
│  │   • Retorna: source_type + confidence                     │   │
│  │   • Unknown Q-003: Google Ads detectável?                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                ↓                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ STEP 3: Processamento de Triggers                        │   │
│  │       ↓                                                   │   │
│  │ processTriggers()                                         │   │
│  │   • Lê regras de `crm_automation.triggers`                │   │
│  │   • Emite eventos: temperature_calculated, keyword_detected │ │
│  │   • Avalia condições (customizáveis)                      │   │
│  │   • Executa ações configuradas                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                ↓                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ STEP 4: Auto-Movimentação de Cards                       │   │
│  │       ↓                                                   │   │
│  │ autoMoveCard()                                            │   │
│  │   • Lê regras de `crm_automation.column_rules`            │   │
│  │   • Verifica threshold de confiança (≥ 75% default)       │   │
│  │   • Move card se condições satisfeitas                    │   │
│  │   • NUNCA move para "Fechado" automaticamente (D-010)     │   │
│  │   • Log de movimentação (automation_reason, confidence)   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                ↓                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ STEP 5: Salvar Resultado                                 │   │
│  │       ↓                                                   │   │
│  │ saveLeadScore()                                           │   │
│  │   • Persiste em `lead_scores` (upsert)                    │   │
│  │   • Salva origem em `lead_source_attribution`             │   │
│  │   • Log em `crm_activity_log` (verificar se existe D-003) │  │
│  │   • Histórico em `lead_scores.previous_values` (D-008)    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                ↓                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ STEP 6: IA Assíncrona (Opcional)                         │   │
│  │       ↓                                                   │   │
│  │ classifyWithAIAsync()                                     │   │
│  │   • Só roda se confidence < 70% (D-009)                   │   │
│  │   • E se cliente habilitou IA automática (default: false) │   │
│  │   • Usa `callDirectAI()` do chatbot (ADR-006)             │   │
│  │   • Log em `crm_ai_classification_logs` (prefixo crm!)    │   │
│  │   • Reavalia auto-move após IA                            │   │
│  │   • Não bloqueia fluxo principal                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Performance Target:**
- Classificação heurística: < 200ms
- Total STEP 1-5: < 300ms
- IA assíncrona: 2-3s (não bloqueia)
- Webhook total: < 5s (vs 7-8s anterior) → +40%

### Camadas da Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                       │
│                     (UI/Dashboard/Settings)                      │
├─────────────────────────────────────────────────────────────────┤
│  • /dashboard/crm - Kanban com badges de temperatura           │
│  • /dashboard/crm/analytics - Dashboard de métricas (D-004)    │
│  • /dashboard/crm/settings - Config de regras (ADR-005) ⭐      │
│    ├─ Tab: Automações (triggers, regras, thresholds)           │
│    ├─ Tab: Temperatura (pesos customizados)                    │
│    ├─ Tab: IA (botão manual, IA automática, budget)            │
│    └─ Tab: Avançado (logs, debug)                              │
│  • Componente: ReclassifyWithAIButton (só se confidence < 70%) │
│  • Componente: LeadTemperatureBadge (🔥 ☀️ ❄️)                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER                        │
│                        (Business Logic)                          │
├─────────────────────────────────────────────────────────────────┤
│  Nodes (Pure Functions):                                        │
│  • calculateHeuristicTemperature()                              │
│  • classifyLeadSource()                                         │
│  • classifyWithAI()                                             │
│  • autoMoveCard()                                               │
│  • processTriggers()                                            │
│                                                                  │
│  Libs (Utilities):                                              │
│  • crm-automation-rules.ts - Regras de automação                │
│  • crm-column-rules.ts - Regras de coluna                       │
│  • lead-scoring.ts - Cálculo de scores                          │
│  • ai-classification-budget.ts - Controle de budget             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                         DATA ACCESS LAYER                        │
│                    (Supabase Client + Queries)                   │
├─────────────────────────────────────────────────────────────────┤
│  Tables:                                                         │
│  • crm_automation - Config central (JSONB) ⭐ ADR-002           │
│  • lead_scores - Scores de temperatura                          │
│  • lead_source_attribution - Origem dos leads                   │
│  • crm_ai_classification_logs - Log de uso de IA ⭐ ADR-007     │
│  • crm_activity_log - Histórico de ações                        │
│                                                                  │
│  Functions (PostgreSQL - Customizáveis ADR-003):                │
│  • calculate_lead_temperature(client_id, phone)                 │
│    → Lê config de crm_automation.temperature_calculation        │
│  • get_conversation_stats(client_id, phone)                     │
│  • auto_move_card_if_eligible(card_id, new_temperature)         │
│    → Lê config de crm_automation.column_rules                   │
│  • process_crm_automation() - TRIGGER function ⭐ ADR-004       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICES                        │
├─────────────────────────────────────────────────────────────────┤
│  • OpenAI/Groq (IA Classification) - ✅ REUTILIZAR API keys     │
│    do chatbot via callDirectAI() (ADR-006)                      │
│  • Supabase Vault (Credentials) - Já configurado por cliente    │
│  • Redis (Cache/Batching) - ⚠️ Opcional na FASE 1 (D-006)      │
│    Adicionar apenas se performance degradar                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📅 FASES DE IMPLEMENTAÇÃO

### FASE 1: FOUNDATION (Semanas 1-2) - 🔴 CRÍTICA

**Objetivo:** Sistema de classificação heurística funcionando + UI básica

#### Tarefas (Backend)

1. **Criar Migrations** (5h)
   - [ ] `20260224000001_crm_automation.sql` ⭐ NOVO
     - Tabela `crm_automation` (rules, triggers, column_rules, temperature_calculation, settings)
     - Índice: (client_id)
     - RLS policy
   - [ ] `20260224000002_lead_scores.sql`
     - Tabela `lead_scores` (temperatura, confidence, método, componentes)
     - Índices: (client_id, phone), (client_id, temperature), (confidence)
     - RLS policy
   - [ ] `20260224000003_lead_source_attribution.sql` ⚠️ VERIFICAR SE JÁ EXISTE (D-001)
     - `CREATE TABLE IF NOT EXISTS lead_source_attribution`
     - Tabela `lead_source_attribution` (source_type, campaign_data, confidence)
     - RLS policy
   - [ ] `20260224000004_crm_ai_classification_logs.sql` ⭐ PREFIXO CORRETO
     - Tabela `crm_ai_classification_logs` (client_id, phone, método, custo, resultado)
     - Índices: (client_id, created_at), (cost_brl)
     - RLS policy
   - [ ] `20260224000005_crm_activity_log_modifications.sql` ⚠️ VERIFICAR SE JÁ EXISTE (D-003)
     - `ALTER TABLE crm_activity_log ADD COLUMN IF NOT EXISTS automation_reason`
     - `ALTER TABLE crm_activity_log ADD COLUMN IF NOT EXISTS confidence_at_action`
     - `ALTER TABLE crm_activity_log ADD COLUMN IF NOT EXISTS rule_id`
   - [ ] `20260224000006_temperature_calculation_function.sql`
     - Função PostgreSQL `calculate_lead_temperature()` customizável (ADR-003)
     - Lê config de `crm_automation.temperature_calculation`
     - SECURITY INVOKER (respeita RLS)
   - [ ] Aplicar migrations: `supabase db push`

2. **Criar Flow Independente (ADR-001)** ⭐ (8h)
   - [ ] `src/flows/crmAutomationFlow.ts` (NOVO)
     ```typescript
     export const processCRMAutomation = async (clientId: string, phone: string) => {
       // STEP 1: Classificação heurística
       const classification = await classifyLeadTemperature({...});

       // STEP 2: Detecção de origem
       const source = await classifyLeadSource({...});

       // STEP 3: Processar triggers customizados
       await processTriggers(clientId, classification);

       // STEP 4: Auto-movimentação de cards
       await autoMoveCard(clientId, cardId, classification);

       // STEP 5: Salvar resultado
       await saveLeadScore({...});

       // STEP 6: IA assíncrona (opcional, se confidence < 70%)
       if (classification.confidence < 70) {
         await classifyWithAIAsync({...}); // Não bloqueia
       }
     };
     ```
   - [ ] Exportar função para uso em trigger DB

3. **Criar Database Trigger (ADR-001, ADR-004)** ⭐ (4h)
   - [ ] `20260224000007_crm_trigger.sql`
     ```sql
     -- Trigger que dispara após inserção de mensagem
     CREATE TRIGGER trg_crm_automation
     AFTER INSERT ON messages
     FOR EACH ROW
     EXECUTE FUNCTION process_crm_automation()
     SECURITY INVOKER;  -- ⚠️ CRÍTICO: Respeita RLS policies

     -- Função que chama o flow TypeScript
     CREATE OR REPLACE FUNCTION process_crm_automation()
     RETURNS TRIGGER AS $$
     BEGIN
       -- Validação explícita de tenant (multi-tenancy)
       IF NOT EXISTS (
         SELECT 1 FROM clients WHERE id = NEW.client_id
       ) THEN
         RAISE EXCEPTION 'Invalid client_id: %', NEW.client_id;
       END IF;

       -- Chama flow TypeScript via Edge Function
       PERFORM net.http_post(
         url := current_setting('app.settings.crm_automation_webhook_url'),
         body := json_build_object(
           'clientId', NEW.client_id,
           'phone', NEW.phone
         )::text
       );

       RETURN NEW;
     EXCEPTION
       WHEN OTHERS THEN
         -- Log erro em Sentry (D-007)
         RAISE WARNING 'CRM automation failed: %', SQLERRM;
         RETURN NEW; -- Não bloqueia inserção de mensagem
     END;
     $$ LANGUAGE plpgsql SECURITY INVOKER;
     ```
   - [ ] Adicionar env var: `CRM_AUTOMATION_WEBHOOK_URL`
   - [ ] Testar trigger com inserção de mensagem

4. **Implementar Nodes Core** (12h)
   - [ ] `src/lib/crm/classifyLeadTemperature.ts`
     - Busca config de `crm_automation.temperature_calculation`
     - Aplica pesos customizados
     - Lógica de scoring (engagement, response time, keywords, recency)
     - Retorna: `{ temperature, confidence, scoreComponents }`
   - [ ] `src/lib/crm/classifyLeadSource.ts`
     - Detecção de origem (ctwa_clid, UTM, keywords)
     - Retorna: `{ sourceType, sourceDetail, confidence }`
   - [ ] `src/lib/crm/processTriggers.ts`
     - Lê `crm_automation.triggers`
     - Avalia condições (temperature_change, new_message, etc.)
     - Executa ações configuradas
   - [ ] `src/lib/crm/autoMoveCard.ts`
     - Lê `crm_automation.column_rules`
     - Verifica threshold (≥ 75% default)
     - Move card SE condições satisfeitas
     - NUNCA move para "Fechado" (D-010)
     - Log em `crm_activity_log` (automation_reason, confidence)
   - [ ] `src/lib/crm/saveLeadScore.ts`
     - Persiste em `lead_scores` e `lead_source_attribution`
     - Histórico em `lead_scores.previous_values` (D-008)
   - [ ] Testes unitários para cada função

5. **API Route para Trigger Webhook** (3h)
   - [ ] `src/app/api/crm/automation/webhook/route.ts`
     - Endpoint POST que recebe trigger do DB
     - Valida client_id e phone
     - Chama `processCRMAutomation(clientId, phone)`
     - Retorna status 200 (ack)
     - Error handling + Sentry

#### Tarefas (Frontend)

4. **UI - Badges de Temperatura** (6h)
   - [ ] Criar componente `LeadTemperatureBadge.tsx`
     - Ícones: 🔥 (Quente), ☀️ (Morno), ❄️ (Frio)
     - Cores: red-500, yellow-500, blue-500
     - Tooltip com score detalhado
   - [ ] Integrar no `CRMCard.tsx`
   - [ ] Adicionar badge de origem (📱 Meta, 🌐 Orgânico, etc.)

5. **UI - Filtros** (4h)
   - [ ] Adicionar filtro por temperatura em `/dashboard/crm`
   - [ ] Adicionar filtro por origem
   - [ ] Persistir filtros em localStorage

6. **UI - Card Details** (4h)
   - [ ] Adicionar seção "Classificação" no `CardDetailPanel`
   - [ ] Mostrar score components (engagement, keywords, etc.)
   - [ ] Mostrar histórico de mudanças de temperatura

#### Deliverables FASE 1

- ✅ Sistema classifica 100% dos leads automaticamente (heurística)
- ✅ Dashboard mostra temperatura + origem
- ✅ Filtros funcionais
- ✅ Confiança visível
- ✅ Testes com 50 conversas reais

**Tempo Total:** 34 horas
**Custo:** R$ 3.400 (@ R$ 100/h)

---

### FASE 2: BOTÃO MANUAL DE IA (Semana 3) - 🟡 ALTA

**Objetivo:** Economia de 80-90% com classificação IA sob demanda

#### Tarefas (Backend)

1. **API Route para IA Manual** (4h)
   - [ ] `src/app/api/crm/classify-with-ai/route.ts`
     - Endpoint POST para reclassificação
     - Verificar budget disponível
     - Chamar `classifyWithAI()`
     - Salvar resultado
     - Retornar classificação atualizada

2. **Node de Classificação IA (ADR-006)** ⭐ (6h)
   - [ ] `src/lib/crm/classifyWithAI.ts`
     - Formatar prompt para IA
     - ✅ **REUTILIZAR** `callDirectAI()` do chatbot (já configurado)
       ```typescript
       import { callDirectAI } from '@/lib/direct-ai-client'

       const result = await callDirectAI({
         clientId: input.clientId,
         clientConfig: input.clientConfig, // API keys do Vault
         messages: [
           { role: 'system', content: CRM_CLASSIFICATION_PROMPT },
           { role: 'user', content: conversationSummary }
         ]
       })
       ```
     - Parse de resposta JSON
     - Validação de saída (Zod)
     - Log em `crm_ai_classification_logs` (prefixo crm!)
     - Budget tracking via `logDirectAIUsage()` (automático)

3. **Budget Control** (3h)
   - [ ] `src/lib/ai-classification-budget.ts`
     - Função `canUseAIClassification(clientId)`
     - Verificar limite mensal
     - Verificar configuração habilitada
     - Retornar true/false

#### Tarefas (Frontend)

4. **Componente Botão IA** (5h)
   - [ ] `src/components/crm/ReclassifyWithAIButton.tsx`
     - Botão estilizado com ícone Sparkles
     - Loading state
     - Mostrar custo (R$ 0,003)
     - Toast de sucesso/erro
     - Callback para atualizar UI

5. **Integração no Card** (3h)
   - [ ] Adicionar botão no `CardDetailPanel`
   - [ ] Só mostrar se `confidence < 70%`
   - [ ] Atualizar temperatura após classificação
   - [ ] Animação de transição

6. **Settings Page** (4h)
   - [ ] Nova seção "Classificação com IA" em `/dashboard/settings`
   - [ ] Toggle: Habilitar IA manual
   - [ ] Input: Limite mensal
   - [ ] Mostrar uso atual (X/1000)
   - [ ] Mostrar custo do mês

#### Deliverables FASE 2

- ✅ Botão "Reclassificar com IA" funcional
- ✅ Custo controlado (opt-in)
- ✅ Budget enforcement
- ✅ Settings configuráveis
- ✅ Economia de 80-90% vs. IA automática

**Tempo Total:** 25 horas
**Custo:** R$ 2.500

---

### FASE 3: AUTO-MOVIMENTAÇÃO + TRIGGERS (Semana 4) - 🟡 ALTA

**Objetivo:** Cards se movem automaticamente entre colunas

#### Tarefas (Backend)

1. **Sistema de Triggers** (8h)
   - [ ] `src/lib/crm-automation-constants.ts`
     - Adicionar novos triggers: `temperature_calculated`, `keyword_detected`, etc.
   - [ ] `src/lib/crm-trigger-processor.ts`
     - Função `emitTrigger(triggerType, data)`
     - Função `processTriggers(clientId, triggers)`
     - Avaliação de condições
     - Execução de ações

2. **Node de Auto-Move** (6h)
   - [ ] `src/nodes/autoMoveCard.ts`
     - Avalia regras de coluna
     - Verifica threshold de confiança
     - Move card se elegível
     - Log de movimentação (quem, quando, por quê)

3. **Regras de Coluna** (4h)
   - [ ] `src/lib/crm-column-rules.ts`
     - Definir regras default (ver matriz acima)
     - Função `shouldMoveCard(cardId, classification)`
     - Retorna: `{ shouldMove, targetColumn, reason, confidence }`

4. **Migration: Activity Log** (2h)
   - [ ] `20260224000005_crm_activity_log_automations.sql`
     - Nova coluna: `automation_reason`
     - Nova coluna: `confidence_at_move`

#### Tarefas (Frontend)

5. **Indicador de Movimentação** (4h)
   - [ ] Badge "🤖 Auto" nos cards movidos automaticamente
   - [ ] Badge "✋ Manual" nos cards movidos pelo usuário
   - [ ] Tooltip com razão da movimentação

6. **Histórico de Movimentações** (5h)
   - [ ] Seção "Histórico de Score" no `CardDetailPanel`
   - [ ] Timeline de mudanças (temperatura, coluna)
   - [ ] Mostrar razão + confiança em cada mudança

7. **Settings: Regras** (6h)
   - [ ] Nova página `/dashboard/crm/settings` (ADR-005)
   - [ ] Tab "Automações": Listar regras existentes
   - [ ] Editar threshold de confiança (default 75%)
   - [ ] Editar pesos de temperatura (customizável)
   - [ ] Habilitar/desabilitar regras
   - [ ] Testar regras com dados mock

#### Deliverables FASE 3

- ✅ Cards movem automaticamente entre colunas
- ✅ Sistema de triggers extensível
- ✅ Regras configuráveis por cliente
- ✅ Histórico completo de movimentações
- ✅ UI clara de "auto vs manual"

**Tempo Total:** 35 horas
**Custo:** R$ 3.500

---

### FASE 4: ANALYTICS DASHBOARD (Semana 5) - 🟢 MÉDIA

**Objetivo:** Métricas e insights de performance

#### Tarefas (Backend)

1. **Queries de Analytics** (6h)
   - [ ] `src/lib/crm-analytics.ts`
     - Distribuição por temperatura (últimos 30 dias)
     - Distribuição por origem
     - Taxa de conversão por temperatura
     - Tempo médio por coluna
     - Performance de automação (% auto vs manual)
     - Uso de IA (classificações, custo)

2. **API Routes** (4h)
   - [ ] `src/app/api/crm/analytics/overview/route.ts`
   - [ ] `src/app/api/crm/analytics/temperature-distribution/route.ts`
   - [ ] `src/app/api/crm/analytics/source-attribution/route.ts`
   - [ ] `src/app/api/crm/analytics/automation-performance/route.ts`

#### Tarefas (Frontend)

3. **Dashboard Page** (12h)
   - [ ] Nova página `/dashboard/crm/analytics`
   - [ ] Cards de métricas principais (Total Leads, Taxa Quente, Conversão)
   - [ ] Gráfico: Distribuição por temperatura (bar chart)
   - [ ] Gráfico: Origem dos leads (pie chart)
   - [ ] Tabela: Performance de automação
   - [ ] Tabela: Tempo médio por coluna
   - [ ] Seção: Uso de IA (classificações, custo)

4. **Export para CSV** (3h)
   - [ ] Botão "Exportar" no dashboard
   - [ ] Gerar CSV com métricas
   - [ ] Download automático

#### Deliverables FASE 4

- ✅ Dashboard completo de analytics
- ✅ Insights acionáveis
- ✅ Export para CSV
- ✅ Métricas de ROI visíveis

**Tempo Total:** 25 horas
**Custo:** R$ 2.500

---

### FASE 5: IA AUTOMÁTICA (Opcional - Semana 6) - 🟢 BAIXA

**Objetivo:** IA para casos ambíguos (opt-in)

#### Tarefas

1. **Feature Flag + Settings** (4h)
   - [ ] Adicionar toggle "Habilitar IA Automática"
   - [ ] Input: Threshold de confiança (default: 70%)
   - [ ] Salvar em `clients.settings.aiClassificationAuto`

2. **Modificar Node de Classificação** (3h)
   - [ ] Adicionar lógica de decisão automática
   - [ ] Chamar `classifyWithAIAsync()` se habilitado
   - [ ] Log de uso automático

3. **Monitoramento de Custo** (3h)
   - [ ] Alerta quando atingir 80% do limite
   - [ ] Email de notificação
   - [ ] Hard limit: Bloquear IA se exceder budget

#### Deliverables FASE 5

- ✅ IA automática disponível (opt-in)
- ✅ Custo controlado
- ✅ Alertas de budget

**Tempo Total:** 10 horas
**Custo:** R$ 1.000

---

## 🗄️ MODELAGEM DE DADOS

> **⚠️ IMPORTANTE - Verificação de Duplicatas (D-001, D-003)**
>
> Antes de criar tabelas, verificar se já existem no projeto:
> ```bash
> # Verificar tabelas existentes
> grep -r "CREATE TABLE lead_source_attribution" supabase/migrations/
> grep -r "CREATE TABLE crm_activity_log" supabase/migrations/
> grep -r "CREATE TABLE lead_scores" supabase/migrations/
> ```
>
> **Decisão:** Se tabela já existir → REUTILIZAR. Se não existir → CRIAR.

---

### Tabela Principal: `crm_automation` (ADR-002)

**Decisão Arquitetural:** Tabela única com colunas JSONB para configuração extensível.

```sql
-- ✅ TABELA CENTRAL: Configurações CRM por cliente
CREATE TABLE crm_automation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,

  -- Configurações em JSON (extensível sem migrations)
  rules JSONB DEFAULT '[]'::jsonb,                          -- Regras de auto-movimentação
  triggers JSONB DEFAULT '[]'::jsonb,                       -- Eventos que disparam ações
  column_rules JSONB DEFAULT '[]'::jsonb,                   -- Regras por coluna (threshold, destino)
  temperature_calculation JSONB DEFAULT '{}'::jsonb,        -- Pesos customizados de temperatura
  settings JSONB DEFAULT '{}'::jsonb,                       -- Settings gerais (IA auto, budget)

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_crm_automation_client ON crm_automation(client_id);

-- RLS Policy
ALTER TABLE crm_automation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own CRM automation"
ON crm_automation
FOR ALL
USING (
  client_id IN (
    SELECT up.client_id FROM user_profiles up WHERE up.id = auth.uid()
  )
);
```

#### Schema JSONB: `temperature_calculation` (Zod)

```typescript
// src/lib/schemas/crm-automation.ts

import { z } from 'zod'

export const TemperatureCalculationSchema = z.object({
  // Pesos customizados (0-100, soma = 100)
  weights: z.object({
    engagement: z.number().int().min(0).max(100).default(35),
    responseTime: z.number().int().min(0).max(100).default(25),
    keywords: z.number().int().min(0).max(100).default(25),
    recency: z.number().int().min(0).max(100).default(15),
  }),

  // Thresholds de temperatura (0-100)
  thresholds: z.object({
    hot: z.number().int().min(0).max(100).default(70),  // >= 70 = quente
    warm: z.number().int().min(0).max(100).default(40), // >= 40 = morno, < 70
    // < 40 = frio
  }),

  // Keywords customizadas
  customKeywords: z.object({
    positive: z.array(z.string()).default(['comprar', 'interessado', 'preço']),
    negative: z.array(z.string()).default(['não', 'caro', 'depois']),
  }),
})

export const ColumnRuleSchema = z.object({
  columnId: z.string().uuid(),
  threshold: z.number().int().min(0).max(100).default(75),
  autoMove: z.boolean().default(true),
  targetColumn: z.string().uuid().nullable(), // null = não move
})

export const TriggerSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['temperature_change', 'new_message', 'time_based']),
  condition: z.object({
    temperatureFrom: z.string().optional(),
    temperatureTo: z.string().optional(),
    threshold: z.number().int().min(0).max(100).optional(),
  }),
  action: z.enum(['move_card', 'notify', 'tag']),
  actionParams: z.record(z.any()),
  enabled: z.boolean().default(true),
})

export const CRMAutomationSchema = z.object({
  rules: z.array(ColumnRuleSchema),
  triggers: z.array(TriggerSchema),
  column_rules: z.array(ColumnRuleSchema),
  temperature_calculation: TemperatureCalculationSchema,
  settings: z.object({
    aiAutoClassification: z.boolean().default(false),
    aiThreshold: z.number().int().min(0).max(100).default(70),
    budgetLimitBRL: z.number().positive().default(50),
  }),
})

export type CRMAutomation = z.infer<typeof CRMAutomationSchema>
```

---

### Tabela: `lead_scores`

**Status:** ✅ Nova tabela (sem duplicata esperada)

```sql
CREATE TABLE lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES crm_cards(id) ON DELETE CASCADE,
  phone NUMERIC NOT NULL,

  -- Score components (0-100 cada)
  engagement_score INTEGER DEFAULT 50,
  response_time_score INTEGER DEFAULT 50,
  keyword_score INTEGER DEFAULT 50,
  recency_score INTEGER DEFAULT 50,

  -- Calculated temperature
  temperature TEXT NOT NULL CHECK (temperature IN ('quente', 'morno', 'frio')),
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  total_score INTEGER NOT NULL, -- Ponderado

  -- Metadata
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  calculation_method TEXT DEFAULT 'heuristic' CHECK (calculation_method IN ('heuristic', 'ai_manual', 'ai_auto', 'manual')),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(client_id, card_id)
);

-- Índices
CREATE INDEX idx_lead_scores_client_phone ON lead_scores(client_id, phone);
CREATE INDEX idx_lead_scores_temperature ON lead_scores(client_id, temperature);
CREATE INDEX idx_lead_scores_confidence ON lead_scores(confidence);
CREATE INDEX idx_lead_scores_updated ON lead_scores(client_id, updated_at DESC);

-- RLS Policy
ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own lead scores"
ON lead_scores
FOR ALL
USING (
  client_id IN (
    SELECT up.client_id FROM user_profiles up WHERE up.id = auth.uid()
  )
);
```

---

### Tabela: `lead_source_attribution`

**Status:** ⚠️ Verificar se já existe (D-001)

```sql
-- ⚠️ EXECUTAR APENAS SE NÃO EXISTIR

CREATE TABLE IF NOT EXISTS lead_source_attribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES crm_cards(id) ON DELETE CASCADE,
  phone NUMERIC NOT NULL,

  -- Source data
  source_type TEXT NOT NULL CHECK (source_type IN ('meta_ads', 'instagram_organic', 'whatsapp_direct', 'link_utm', 'referral', 'unknown')),
  source_detail TEXT,
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),

  -- Campaign tracking
  campaign_data JSONB, -- { ad_id, campaign_name, ad_name, etc. }
  utm_params JSONB,    -- { utm_source, utm_medium, utm_campaign, etc. }

  -- Referral data
  ctwa_clid TEXT,      -- Meta Click-to-WhatsApp ID
  referral_url TEXT,

  -- Metadata
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  detection_method TEXT DEFAULT 'heuristic',

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(client_id, card_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_source_client_type ON lead_source_attribution(client_id, source_type);
CREATE INDEX IF NOT EXISTS idx_source_phone ON lead_source_attribution(client_id, phone);

-- RLS Policy
ALTER TABLE lead_source_attribution ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own source attribution"
ON lead_source_attribution
FOR ALL
USING (
  client_id IN (
    SELECT up.client_id FROM user_profiles up WHERE up.id = auth.uid()
  )
);
```

---

### Tabela: `crm_ai_classification_logs` (ADR-007)

**Nomenclatura:** Prefixo `crm_` adicionado para consistência.

```sql
-- ✅ NOME CORRETO: crm_ai_classification_logs (com prefixo)
CREATE TABLE crm_ai_classification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  phone NUMERIC NOT NULL,
  card_id UUID REFERENCES crm_cards(id) ON DELETE SET NULL,

  -- Trigger info
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual_button', 'automatic', 'api')),
  triggered_by UUID REFERENCES user_profiles(id), -- NULL se automático

  -- Input
  heuristic_temperature TEXT,
  heuristic_confidence INTEGER,
  conversation_snapshot JSONB, -- Últimas 10 mensagens

  -- Output
  ai_temperature TEXT NOT NULL,
  ai_confidence INTEGER NOT NULL,
  ai_intent TEXT,
  buying_signals JSONB, -- Array de strings
  reasoning TEXT,

  -- Cost tracking
  provider TEXT NOT NULL, -- 'openai' | 'groq'
  model TEXT NOT NULL,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  cost_brl NUMERIC(10,6),

  -- Performance
  latency_ms INTEGER,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_crm_ai_logs_client_month ON crm_ai_classification_logs(client_id, created_at);
CREATE INDEX idx_crm_ai_logs_cost ON crm_ai_classification_logs(client_id, cost_brl, created_at);
CREATE INDEX idx_crm_ai_logs_trigger ON crm_ai_classification_logs(trigger_type, created_at);

-- RLS Policy
ALTER TABLE crm_ai_classification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI classification logs"
ON crm_ai_classification_logs
FOR SELECT
USING (
  client_id IN (
    SELECT up.client_id FROM user_profiles up WHERE up.id = auth.uid()
  )
);
```

---

### Tabela: `crm_activity_log` (Verificar se Existe - D-003)

**Status:** ⚠️ Verificar se já existe no projeto antes de criar.

```sql
-- ⚠️ VERIFICAR SE JÁ EXISTE: grep -r "CREATE TABLE crm_activity_log" supabase/migrations/

-- Se JÁ EXISTIR: Adicionar apenas colunas
ALTER TABLE crm_activity_log ADD COLUMN IF NOT EXISTS automation_reason TEXT;
ALTER TABLE crm_activity_log ADD COLUMN IF NOT EXISTS confidence_at_action INTEGER;
ALTER TABLE crm_activity_log ADD COLUMN IF NOT EXISTS rule_id UUID;  -- Referência genérica (não FK)

-- Se NÃO EXISTIR: Criar tabela completa
CREATE TABLE IF NOT EXISTS crm_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES crm_cards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,

  -- Action details
  action_type TEXT NOT NULL CHECK (action_type IN ('created', 'moved', 'updated', 'deleted', 'auto_moved', 'manual_moved')),
  from_column_id UUID REFERENCES crm_columns(id) ON DELETE SET NULL,
  to_column_id UUID REFERENCES crm_columns(id) ON DELETE SET NULL,

  -- Automation metadata (NEW)
  automation_reason TEXT,          -- Ex: "Temperatura mudou para 'quente' (confidence 85%)"
  confidence_at_action INTEGER,    -- Score de confiança no momento da ação
  rule_id UUID,                    -- ID da regra que disparou (não FK para flexibilidade)

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_crm_activity_client_card ON crm_activity_log(client_id, card_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_activity_type ON crm_activity_log(action_type, created_at DESC);

-- RLS Policy
ALTER TABLE crm_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own CRM activity"
ON crm_activity_log
FOR SELECT
USING (
  client_id IN (
    SELECT up.client_id FROM user_profiles up WHERE up.id = auth.uid()
  )
);
```

### View: Métricas de Performance

```sql
CREATE OR REPLACE VIEW crm_automation_metrics AS
SELECT
  ls.client_id,
  c.name AS client_name,

  -- Distribuição de temperatura
  COUNT(*) FILTER (WHERE ls.temperature = 'quente') AS total_hot,
  COUNT(*) FILTER (WHERE ls.temperature = 'morno') AS total_warm,
  COUNT(*) FILTER (WHERE ls.temperature = 'frio') AS total_cold,

  -- Confiança média
  AVG(ls.confidence)::INTEGER AS avg_confidence,

  -- Métodos de classificação
  COUNT(*) FILTER (WHERE ls.calculation_method = 'heuristic') AS total_heuristic,
  COUNT(*) FILTER (WHERE ls.calculation_method LIKE 'ai_%') AS total_ai,
  COUNT(*) FILTER (WHERE ls.calculation_method = 'manual') AS total_manual,

  -- Uso de IA (últimos 30 dias) - ✅ TABELA RENOMEADA
  (
    SELECT COUNT(*)
    FROM crm_ai_classification_logs acl
    WHERE acl.client_id = ls.client_id
    AND acl.created_at > NOW() - INTERVAL '30 days'
  ) AS ai_classifications_30d,

  -- Custo de IA (últimos 30 dias) - ✅ TABELA RENOMEADA
  (
    SELECT COALESCE(SUM(cost_brl), 0)
    FROM crm_ai_classification_logs acl
    WHERE acl.client_id = ls.client_id
    AND acl.created_at > NOW() - INTERVAL '30 days'
  ) AS ai_cost_30d_brl,

  -- Última atualização
  MAX(ls.updated_at) AS last_updated
FROM lead_scores ls
JOIN clients c ON ls.client_id = c.id
GROUP BY ls.client_id, c.name;
```

---

### Funções SQL Customizáveis (ADR-003)

**Decisão Arquitetural:** Funções leem configuração de `crm_automation.temperature_calculation`.

```sql
-- ✅ Função que aplica pesos customizados do cliente
CREATE OR REPLACE FUNCTION calculate_lead_temperature(
  p_client_id UUID,
  p_phone NUMERIC
) RETURNS TABLE(
  temperature TEXT,
  confidence INTEGER,
  total_score INTEGER,
  engagement_score INTEGER,
  response_time_score INTEGER,
  keyword_score INTEGER,
  recency_score INTEGER
) AS $$
DECLARE
  v_config JSONB;
  v_weights JSONB;
  v_thresholds JSONB;
  v_engagement INTEGER;
  v_response_time INTEGER;
  v_keyword INTEGER;
  v_recency INTEGER;
  v_total INTEGER;
  v_confidence INTEGER;
  v_temperature TEXT;
BEGIN
  -- 1. Busca config customizada do cliente
  SELECT temperature_calculation INTO v_config
  FROM crm_automation WHERE client_id = p_client_id;

  -- 2. Extrai pesos (default se não configurado)
  v_weights := COALESCE(v_config->'weights', '{"engagement": 35, "responseTime": 25, "keywords": 25, "recency": 15}'::jsonb);
  v_thresholds := COALESCE(v_config->'thresholds', '{"hot": 70, "warm": 40}'::jsonb);

  -- 3. Calcula scores individuais (0-100) - LÓGICA HEURÍSTICA
  v_engagement := calculate_engagement_score(p_client_id, p_phone);
  v_response_time := calculate_response_time_score(p_client_id, p_phone);
  v_keyword := calculate_keyword_score(p_client_id, p_phone, v_config->'customKeywords');
  v_recency := calculate_recency_score(p_client_id, p_phone);

  -- 4. Aplica pesos customizados
  v_total := (
    (v_engagement * (v_weights->>'engagement')::INTEGER) +
    (v_response_time * (v_weights->>'responseTime')::INTEGER) +
    (v_keyword * (v_weights->>'keywords')::INTEGER) +
    (v_recency * (v_weights->>'recency')::INTEGER)
  ) / 100;

  -- 5. Determina temperatura usando thresholds customizados
  IF v_total >= (v_thresholds->>'hot')::INTEGER THEN
    v_temperature := 'quente';
    v_confidence := 90;
  ELSIF v_total >= (v_thresholds->>'warm')::INTEGER THEN
    v_temperature := 'morno';
    v_confidence := 75;
  ELSE
    v_temperature := 'frio';
    v_confidence := 80;
  END IF;

  -- 6. Retorna resultado
  RETURN QUERY SELECT v_temperature, v_confidence, v_total, v_engagement, v_response_time, v_keyword, v_recency;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;  -- ⚠️ Respeita RLS
```

**Default Configuration (D-005):**

```typescript
// src/lib/crm/default-config.ts

export const DEFAULT_TEMPERATURE_CONFIG = {
  weights: {
    engagement: 35,      // Mais importante
    responseTime: 25,
    keywords: 25,
    recency: 15,
  },
  thresholds: {
    hot: 70,   // >= 70 = quente
    warm: 40,  // >= 40 = morno, < 70
    // < 40 = frio
  },
  customKeywords: {
    positive: ['comprar', 'interessado', 'preço', 'quando', 'como'],
    negative: ['não', 'caro', 'depois', 'talvez'],
  },
}
```

---

## 💰 ESTRATÉGIA DE CUSTOS

### Modelo de Custo por Cliente

```typescript
// Custo estimado por cliente/mês

interface CostBreakdown {
  // FASE 1: Heurística (GRÁTIS)
  heuristicClassifications: {
    volume: number;     // Ilimitado
    costPerUnit: 0;     // R$ 0
    totalCost: 0;       // R$ 0
  };

  // FASE 2: IA Manual (Sob Demanda)
  manualAIClassifications: {
    volume: number;     // Ex: 50 cliques/mês
    costPerUnit: 0.003; // R$ 0,003/classificação
    totalCost: number;  // Ex: R$ 0,15
  };

  // FASE 5: IA Automática (Opcional)
  automaticAIClassifications: {
    volume: number;     // Ex: 100/mês (apenas confidence < 70%)
    costPerUnit: 0.003; // R$ 0,003/classificação
    totalCost: number;  // Ex: R$ 0,30
  };

  // Database Storage
  databaseStorage: {
    rowsPerMonth: number;  // ~1000 lead_scores
    costPerMB: 0.001;      // Incluído no plano Supabase
    totalCost: 0;          // R$ 0 (dentro do free tier)
  };

  // Total
  totalMonthly: number; // R$ 0,45 (exemplo)
}

// Exemplo: Cliente com 500 conversas/mês
const exampleCostBreakdown: CostBreakdown = {
  heuristicClassifications: {
    volume: 500,
    costPerUnit: 0,
    totalCost: 0
  },
  manualAIClassifications: {
    volume: 50,         // 10% clicam no botão
    costPerUnit: 0.003,
    totalCost: 0.15
  },
  automaticAIClassifications: {
    volume: 0,          // Desabilitado por padrão
    costPerUnit: 0.003,
    totalCost: 0
  },
  databaseStorage: {
    rowsPerMonth: 500,
    costPerMB: 0,
    totalCost: 0
  },
  totalMonthly: 0.15 // R$ 0,15/mês
};
```

### Comparação: Abordagens

| Cenário | Volume/Mês | Custo/Mês | Economia |
|---------|------------|-----------|----------|
| **Só Heurística** | 1000 conversas | R$ 0,00 | 100% |
| **Botão Manual (10% uso)** | 100 cliques IA | R$ 0,30 | 90% |
| **IA Automática (30% ambíguos)** | 300 IA | R$ 0,90 | 70% |
| **IA em 100%** | 1000 IA | R$ 3,00 | 0% |

**Recomendação:** Usar botão manual (FASE 2) para 90% de economia

---

## 📊 MONITORAMENTO E KPIs

### Métricas de Sucesso

#### 1. Performance de Classificação

```sql
-- Query de exemplo
SELECT
  calculation_method,
  AVG(confidence) AS avg_confidence,
  COUNT(*) AS total_classifications,
  AVG(total_score) AS avg_score
FROM lead_scores
WHERE client_id = '...'
AND created_at > NOW() - INTERVAL '30 days'
GROUP BY calculation_method;
```

**KPIs:**
- Confiança média ≥ 75%
- 90%+ classificações via heurística
- < 10% classificações com IA

#### 2. Distribuição de Temperatura

**KPIs:**
- Taxa de leads quentes: 25-40% (ideal)
- Taxa de leads mornos: 40-60%
- Taxa de leads frios: 10-20%

#### 3. Taxa de Conversão por Temperatura

```sql
-- Taxa de conversão: Leads que fecharam / Total de leads
SELECT
  ls.temperature,
  COUNT(DISTINCT ls.card_id) AS total_leads,
  COUNT(DISTINCT CASE WHEN cc.column_slug = 'fechado' THEN ls.card_id END) AS converted_leads,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN cc.column_slug = 'fechado' THEN ls.card_id END) / COUNT(DISTINCT ls.card_id), 2) AS conversion_rate
FROM lead_scores ls
JOIN crm_cards cc ON ls.card_id = cc.id
WHERE ls.client_id = '...'
AND ls.created_at > NOW() - INTERVAL '90 days'
GROUP BY ls.temperature
ORDER BY conversion_rate DESC;
```

**Meta:**
- Quentes: 30-50% conversão
- Mornos: 10-20% conversão
- Frios: 0-5% conversão

#### 4. Uso e Custo de IA

```sql
-- Custo de IA por mês
SELECT
  DATE_TRUNC('month', created_at) AS month,
  COUNT(*) AS total_ai_classifications,
  SUM(cost_brl) AS total_cost_brl,
  AVG(ai_confidence) AS avg_confidence,
  trigger_type
FROM crm_ai_classification_logs
WHERE client_id = '...'
GROUP BY month, trigger_type
ORDER BY month DESC;
```

**KPIs:**
- Custo mensal < R$ 50 (limite seguro)
- Taxa de uso manual vs automático (meta: 80% manual)
- Confiança média IA ≥ 80%

#### 5. Performance de Auto-Movimentação

```sql
-- Taxa de movimentação automática
SELECT
  COUNT(*) FILTER (WHERE automation_reason IS NOT NULL) AS auto_moves,
  COUNT(*) FILTER (WHERE automation_reason IS NULL) AS manual_moves,
  ROUND(100.0 * COUNT(*) FILTER (WHERE automation_reason IS NOT NULL) / COUNT(*), 2) AS auto_move_percentage
FROM crm_activity_log
WHERE client_id = '...'
AND activity_type = 'card_moved'
AND created_at > NOW() - INTERVAL '30 days';
```

**Meta:**
- 60-80% movimentações automáticas
- 0 movimentações erradas (avaliadas por overrides manuais)

---

## ⚠️ RISCOS E MITIGAÇÕES

### RISCO #1: Custo de IA Explosivo

**Cenário Ruim:**
- Cliente ativa IA automática para 100% dos leads
- 1000 conversas/dia × R$ 0,003 = R$ 90/mês apenas em classificação
- 10 clientes = R$ 900/mês

**Probabilidade:** BAIXA (opt-in + limite mensal)
**Impacto:** ALTO (custo recorrente)

**Mitigações:**
1. ✅ **Default: IA automática DESABILITADA** (opt-in)
2. ✅ **Limite mensal hard-coded:** 1000 classificações/cliente
3. ✅ **Alerta:** Email quando atingir 80% do limite
4. ✅ **Hard limit:** Bloquear IA se exceder budget
5. ✅ **Threshold configurável:** Só usa IA se confidence < 70%
6. ✅ **Botão manual como padrão:** 90% economia

**Monitoramento:**
```sql
-- Alert query (rodar diariamente)
SELECT
  client_id,
  COUNT(*) AS ai_usage_this_month,
  (SELECT ai_monthly_limit FROM clients WHERE id = acl.client_id) AS limit,
  ROUND(100.0 * COUNT(*) / (SELECT ai_monthly_limit FROM clients WHERE id = acl.client_id), 1) AS usage_percentage
FROM crm_ai_classification_logs acl
WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY client_id
HAVING COUNT(*) > (SELECT ai_monthly_limit * 0.8 FROM clients WHERE id = acl.client_id);
```

---

### RISCO #2: Classificação Errada (Falso Positivo)

**Cenário Ruim:**
- Lead frio classificado como quente
- Movido automaticamente para "Proposta"
- Vendedor perde tempo

**Probabilidade:** MÉDIA (heurísticas não são perfeitas)
**Impacto:** MÉDIO (perda de tempo)

**Mitigações:**
1. ✅ **Threshold alto:** Auto-move apenas com confidence ≥ 75%
2. ✅ **Não mover para "Fechado" automaticamente:** Sempre manual
3. ✅ **Botão "Override Manual" visível:** Fácil corrigir
4. ✅ **Log completo:** Rastreia razão de cada movimentação
5. ✅ **Feedback loop:** Overrides manuais podem melhorar regras
6. ✅ **Alertas de confiança baixa:** Notifica usuário quando confidence < 70%

**Monitoramento:**
```sql
-- Taxa de overrides manuais (indicador de erro)
SELECT
  DATE_TRUNC('week', cal.created_at) AS week,
  COUNT(DISTINCT cal.card_id) AS total_auto_moves,
  COUNT(DISTINCT CASE WHEN cal2.id IS NOT NULL THEN cal.card_id END) AS manual_overrides,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN cal2.id IS NOT NULL THEN cal.card_id END) / COUNT(DISTINCT cal.card_id), 1) AS override_rate
FROM crm_activity_log cal
LEFT JOIN crm_activity_log cal2 ON
  cal2.card_id = cal.card_id
  AND cal2.created_at > cal.created_at
  AND cal2.created_at < cal.created_at + INTERVAL '1 hour'
  AND cal2.automation_reason IS NULL
WHERE cal.automation_reason IS NOT NULL
AND cal.activity_type = 'card_moved'
GROUP BY week
ORDER BY week DESC;
```

**Meta:** Taxa de override < 5%

---

### RISCO #3: Performance do Webhook

**Cenário Ruim:**
- Adicionar classificação = +3s ao fluxo
- Webhook Meta timeout (20s)
- Mensagens não processadas

**Probabilidade:** BAIXA (heurística é rápida)
**Impacto:** ALTO (mensagens perdidas)

**Mitigações:**
1. ✅ **Heurística otimizada:** Queries SQL indexadas (< 200ms)
2. ✅ **IA sempre assíncrona:** Não bloqueia webhook
3. ✅ **Cache de scores:** TTL 1h (reduz recálculos)
4. ✅ **Fallback gracioso:** Se classificação falhar, continua fluxo normal
5. ✅ **Monitoramento de latência:** Alerta se webhook > 15s

**Performance Target:**
- Heurística: < 200ms
- Total NODE 14: < 300ms
- Webhook total: < 8s (margem de 12s)

---

### RISCO #4: Detecção de Origem Imprecisa

**Cenário Ruim:**
- Google Ads não detectável (sem referral data)
- 100% "Orgânico" quando na verdade são anúncios pagos
- Métricas de ROI incorretas

**Probabilidade:** ALTA (limitação técnica do WhatsApp)
**Impacto:** MÉDIO (métricas imprecisas)

**Mitigações:**
1. ✅ **Documentar limitações:** Deixar claro o que é detectável
2. ✅ **Pergunta do bot:** "Como nos conheceu?" (captura manual)
3. ✅ **Override manual de origem:** Fácil corrigir
4. ✅ **Heurísticas de keyword:** "vi seu anúncio" → provável anúncio
5. ✅ **UTM tracking:** Incentivar clientes a usar UTMs em links
6. ✅ **Integração futura:** Webhook do Google Ads (roadmap)

**Workaround Atual:**
```typescript
// Bot pergunta após primeira mensagem
if (isFirstMessage) {
  const followUpQuestion = "Só para eu te ajudar melhor, como você conheceu a gente? 😊\n\n" +
    "1️⃣ Anúncio no Instagram/Facebook\n" +
    "2️⃣ Busca no Google\n" +
    "3️⃣ Indicação de amigo\n" +
    "4️⃣ Outro";

  // Resposta salva em lead_source_attribution.source_detail
}
```

---

### RISCO #5: Overengineering

**Cenário Ruim:**
- Gastar 8 semanas implementando ML complexo
- Usuário só usa filtros básicos
- ROI negativo

**Probabilidade:** MÉDIA (tentação de adicionar features)
**Impacto:** ALTO (tempo/custo desperdiçado)

**Mitigações:**
1. ✅ **MVP: Apenas heurística (FASE 1):** Validar antes de adicionar IA
2. ✅ **Medir uso antes de FASE 5:** Só implementar IA automática se solicitado
3. ✅ **Feature flags:** Fácil desabilitar features não usadas
4. ✅ **Feedback contínuo:** Perguntar usuário o que realmente precisa
5. ✅ **Princípio 80/20:** Focar em features de alto impacto

**Decisão:** Implementar FASE 1-3 primeiro, avaliar necessidade de FASE 4-5

---

## 🗓️ ROADMAP COMPLETO

### Resumo de Fases

| Fase | Objetivo | Semanas | Horas | Custo | Status |
|------|----------|---------|-------|-------|--------|
| **FASE 1** | Foundation (Heurística + UI) | 1-2 | 34h | R$ 3.400 | 🔴 TODO |
| **FASE 2** | Botão Manual IA | 3 | 25h | R$ 2.500 | 🔴 TODO |
| **FASE 3** | Auto-Move + Triggers | 4 | 35h | R$ 3.500 | 🔴 TODO |
| **FASE 4** | Analytics Dashboard | 5 | 25h | R$ 2.500 | 🔴 TODO |
| **FASE 5** | IA Automática (Opcional) | 6 | 10h | R$ 1.000 | 🟡 OPCIONAL |
| **TOTAL MVP** | FASE 1-4 | 5 semanas | 119h | **R$ 11.900** | - |
| **TOTAL COMPLETO** | FASE 1-5 | 6 semanas | 129h | **R$ 12.900** | - |

### Cronograma Detalhado

```
SEMANA 1 (19-25 Feb)
├─ [Backend] Migrations (4h)
├─ [Backend] Nodes Core (12h)
├─ [Backend] Integração chatbotFlow (4h)
└─ [Testing] Testes unitários (4h)
   Total: 24h

SEMANA 2 (26 Feb - 3 Mar)
├─ [Frontend] Badges de Temperatura (6h)
├─ [Frontend] Filtros (4h)
├─ [Frontend] Card Details (4h)
└─ [Testing] Testes E2E (50 conversas) (4h)
   Total: 18h

SEMANA 3 (4-10 Mar)
├─ [Backend] API IA Manual (4h)
├─ [Backend] Node IA + Budget (9h)
├─ [Frontend] Botão IA (5h)
├─ [Frontend] Integração Card (3h)
├─ [Frontend] Settings IA (4h)
└─ [Testing] Testes IA (2h)
   Total: 27h

SEMANA 4 (11-17 Mar)
├─ [Backend] Triggers System (8h)
├─ [Backend] Auto-Move (6h)
├─ [Backend] Regras de Coluna (4h)
├─ [Frontend] Indicadores (4h)
├─ [Frontend] Histórico (5h)
├─ [Frontend] Settings Regras (6h)
└─ [Testing] Testes Automação (4h)
   Total: 37h

SEMANA 5 (18-24 Mar)
├─ [Backend] Queries Analytics (6h)
├─ [Backend] API Routes Analytics (4h)
├─ [Frontend] Dashboard Analytics (12h)
├─ [Frontend] Export CSV (3h)
└─ [Testing] Validação Métricas (2h)
   Total: 27h

SEMANA 6 (25-31 Mar) - OPCIONAL
├─ [Backend] Feature Flag IA Auto (4h)
├─ [Backend] Modificar Classificação (3h)
├─ [Backend] Monitoramento Custo (3h)
└─ [Testing] Validação IA Auto (2h)
   Total: 12h
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Pré-Implementação

- [ ] **Aprovação de Budget:** R$ 11.900 (MVP) ou R$ 12.900 (Completo)
- [ ] **Definir Métricas de Sucesso:** Confiança ≥ 75%, Taxa Override < 5%
- [ ] **Preparar Dados de Teste:** 100 conversas reais
- [ ] **Criar Branch:** `feature/crm-automation-complete`
- [ ] **Revisar Plano com Stakeholders**

### FASE 1: Foundation

**Backend:**
- [ ] Criar migrations (crm_automation, lead_scores, lead_source_attribution, crm_ai_classification_logs)
- [ ] Verificar duplicatas (D-001, D-003)
- [ ] Aplicar migrations: `supabase db push`
- [ ] Criar `crmAutomationFlow.ts` (flow independente) ⭐
- [ ] Criar database trigger `trg_crm_automation` (SECURITY INVOKER) ⭐
- [ ] Implementar `classifyLeadTemperature()` (customizável)
- [ ] Implementar `classifyLeadSource()`
- [ ] Implementar `processTriggers()`
- [ ] Implementar `autoMoveCard()` (nunca para "Fechado")
- [ ] Implementar `saveLeadScore()`
- [ ] Criar API webhook `/api/crm/automation/webhook`
- [ ] Testes unitários (Jest)
- [ ] Testes multi-tenant (D-012) ⭐
- [ ] Testar com webhook real

**Frontend:**
- [ ] Criar `LeadTemperatureBadge.tsx`
- [ ] Integrar badges no `CRMCard.tsx`
- [ ] Adicionar filtros por temperatura
- [ ] Adicionar filtros por origem
- [ ] Criar seção "Classificação" no `CardDetailPanel`
- [ ] Mostrar score components
- [ ] Criar `/dashboard/crm/settings` ⭐
- [ ] Testes E2E (50 conversas)

**Validação:**
- [ ] Confiança média ≥ 70%
- [ ] Performance heurística < 200ms
- [ ] Performance total STEP 1-5 < 300ms
- [ ] Trigger não degrada inserção de mensagens (< 200ms)
- [ ] Testes multi-tenant passam
- [ ] Zero vazamento de dados entre clientes
- [ ] Zero erros em produção

### FASE 2: Botão Manual IA

**Backend:**
- [ ] Criar API route `/api/crm/classify-with-ai`
- [ ] Implementar `classifyWithAI()` (reutilizar callDirectAI)
- [ ] Implementar `canUseAIClassification()`
- [ ] Verificar migration `crm_ai_classification_logs` já criada na FASE 1

**Frontend:**
- [ ] Criar `ReclassifyWithAIButton.tsx`
- [ ] Integrar botão no `CardDetailPanel`
- [ ] Adicionar seção "IA" em Settings
- [ ] Toggle habilitar IA manual
- [ ] Mostrar uso atual (X/1000)

**Validação:**
- [ ] Botão só aparece se confidence < 70%
- [ ] Budget enforcement funciona
- [ ] Custo < R$ 1/mês (teste com 50 cliques)

### FASE 3: Auto-Move + Triggers

**Backend:**
- [ ] Adicionar triggers em `crm-automation-constants.ts`
- [ ] Implementar `processTriggers()`
- [ ] Implementar `autoMoveCard()`
- [ ] Criar `crm-column-rules.ts`
- [ ] Migration: `crm_activity_log` (automação)

**Frontend:**
- [ ] Badges "🤖 Auto" e "✋ Manual"
- [ ] Seção "Histórico de Score"
- [ ] Página `/dashboard/crm/settings` (ADR-005)
- [ ] Tab "Automações": Listar regras
- [ ] Tab "Temperatura": Editar pesos customizados
- [ ] Editar threshold (default 75%)

**Validação:**
- [ ] 60-80% movimentações automáticas
- [ ] Taxa de override < 5%
- [ ] Zero loops infinitos

### FASE 4: Analytics Dashboard

**Backend:**
- [ ] Implementar queries em `crm-analytics.ts`
- [ ] API routes `/api/crm/analytics/*`
- [ ] View: `crm_automation_metrics`

**Frontend:**
- [ ] Página `/dashboard/crm/analytics`
- [ ] Cards de métricas
- [ ] Gráficos (bar, pie)
- [ ] Tabelas de performance
- [ ] Export CSV

**Validação:**
- [ ] Métricas batem com SQL manual
- [ ] Performance < 3s para carregar dashboard

### FASE 5: IA Automática (Opcional)

**Backend:**
- [ ] Feature flag `enableAutomaticAIClassification`
- [ ] Modificar `classifyLeadTemperature()`
- [ ] Alertas de budget (email)

**Frontend:**
- [ ] Toggle "Habilitar IA Automática"
- [ ] Input threshold de confiança
- [ ] Dashboard: Uso de IA

**Validação:**
- [ ] Custo < R$ 30/mês (teste com 300 classificações)
- [ ] Alertas funcionam

### Pós-Implementação

- [ ] **Code Review:** 2 devs aprovam
- [ ] **QA:** Testar em staging com dados reais
- [ ] **Documentação:** Atualizar CLAUDE.md
- [ ] **Deploy:** Merge para main
- [ ] **Monitoramento:** Configurar alertas (Sentry, Supabase)
- [ ] **Feedback:** Coletar feedback de 5 clientes beta
- [ ] **Iteração:** Ajustar regras baseado em dados reais

---

## 🔒 DATABASE TRIGGERS & SECURITY (ADR-004)

### SECURITY INVOKER: Proteção Multi-Tenant

**PROBLEMA:**
- Triggers com `SECURITY DEFINER` executam com permissões do criador (superadmin)
- Risco: Bypass de RLS policies → vazamento de dados entre tenants

**DECISÃO:**
✅ **SEMPRE usar SECURITY INVOKER em triggers + validação explícita de tenant**

```sql
-- ✅ CORRETO: Trigger respeitando RLS
CREATE TRIGGER trg_crm_automation
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION process_crm_automation()
SECURITY INVOKER;  -- ⚠️ CRÍTICO: Respeita RLS policies do usuário

-- Função com validação explícita
CREATE OR REPLACE FUNCTION process_crm_automation()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Validação explícita de tenant (multi-tenancy)
  IF NOT EXISTS (
    SELECT 1 FROM clients WHERE id = NEW.client_id
  ) THEN
    RAISE EXCEPTION 'Invalid client_id: %', NEW.client_id;
  END IF;

  -- 2. Validação de permissão do usuário (se aplicável)
  -- RLS automaticamente valida se usuário tem acesso ao client_id

  -- 3. Processa automação CRM
  PERFORM net.http_post(
    url := current_setting('app.settings.crm_automation_webhook_url'),
    body := json_build_object(
      'clientId', NEW.client_id,
      'phone', NEW.phone
    )::text
  );

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- 4. Log erro em Sentry (D-007)
    RAISE WARNING 'CRM automation failed for client % phone %: %',
      NEW.client_id, NEW.phone, SQLERRM;
    RETURN NEW; -- Não bloqueia inserção de mensagem
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
```

### Validação de Permissões

```sql
-- Exemplo: Validar se usuário pode acessar client_id
CREATE OR REPLACE FUNCTION validate_client_access(p_client_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verifica se usuário logado tem acesso ao cliente
  RETURN EXISTS (
    SELECT 1
    FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.client_id = p_client_id
  );
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Uso em função de automação
CREATE OR REPLACE FUNCTION some_automation_function(p_client_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Validação no início da função
  IF NOT validate_client_access(p_client_id) THEN
    RAISE EXCEPTION 'Unauthorized access to client %', p_client_id;
  END IF;

  -- Lógica de automação...
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
```

### Performance de Triggers (Q-001 - Unknown)

**Questão:** Trigger síncrono pode degradar performance de inserção de mensagens?

**Mitigação:**
```sql
-- Opção 1: Trigger assíncrono via pg_background (se disponível)
CREATE TRIGGER trg_crm_automation
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION pg_background_launch('process_crm_automation', NEW.client_id, NEW.phone);

-- Opção 2: Webhook HTTP (atual) - falha silenciosa
-- Se webhook falhar, não bloqueia inserção

-- Opção 3: Queue em Redis (futuro)
-- Trigger enfileira job → Worker processa
```

**Monitoramento:**
```sql
-- View: Latência de triggers
CREATE VIEW trigger_performance AS
SELECT
  schemaname,
  tablename,
  tg.tgname AS trigger_name,
  AVG(execution_time_ms) AS avg_latency_ms,
  MAX(execution_time_ms) AS max_latency_ms,
  COUNT(*) AS executions_count
FROM pg_stat_user_triggers pgt
JOIN pg_trigger tg ON pgt.trigger = tg.oid
GROUP BY schemaname, tablename, tg.tgname
ORDER BY avg_latency_ms DESC;
```

### Testes Multi-Tenant (D-012 - Obrigatório)

**REGRA:** TODO teste de CRM deve validar isolamento entre clientes.

```typescript
// test/crm/multi-tenant-isolation.test.ts

describe('CRM Multi-Tenant Isolation', () => {
  it('should NOT leak data between clients', async () => {
    // Setup: 2 clientes diferentes
    const client1 = await createTestClient({ name: 'Cliente 1' })
    const client2 = await createTestClient({ name: 'Cliente 2' })

    // Cliente 1 cria lead
    const lead1 = await createLead({ clientId: client1.id, phone: '5551999999999' })

    // Cliente 2 tenta acessar lead do Cliente 1
    const supabaseClient2 = createClientForUser(client2.ownerId)
    const { data, error } = await supabaseClient2
      .from('lead_scores')
      .select('*')
      .eq('id', lead1.id)

    // Deve falhar (RLS policy)
    expect(data).toBeNull()
    expect(error).toBeTruthy()
  })

  it('trigger should NOT process cross-tenant data', async () => {
    // Validar que trigger não vaza dados entre clients
    // ...
  })
})
```

---

## 📋 VERIFICAÇÃO DE TABELAS EXISTENTES (D-001, D-003)

### Checklist de Verificação

**ANTES de criar qualquer tabela CRM, executar:**

```bash
# 1. Verificar se tabela já existe no projeto
cd supabase/migrations
grep -r "CREATE TABLE lead_source_attribution" .
grep -r "CREATE TABLE crm_activity_log" .
grep -r "CREATE TABLE lead_scores" .
grep -r "CREATE TABLE crm_automation" .

# 2. Verificar schema atual no banco
psql $DATABASE_URL -c "\d+ lead_source_attribution"
psql $DATABASE_URL -c "\d+ crm_activity_log"
```

### Decisões por Tabela

| Tabela | Status | Decisão |
|--------|--------|---------|
| `crm_automation` | ❓ Nova | **CRIAR** - Tabela central com JSONB |
| `lead_scores` | ❓ Nova | **CRIAR** - Scores de temperatura |
| `lead_source_attribution` | ⚠️ Verificar | **Se existe:** REUTILIZAR. **Se não:** CRIAR |
| `crm_ai_classification_logs` | ❓ Nova | **CRIAR** - Log de IA (prefixo `crm_`) |
| `crm_activity_log` | ⚠️ Verificar | **Se existe:** ALTER TABLE (add columns). **Se não:** CRIAR completa |

### Padrão de Nomenclatura (ADR-007, D-002)

**REGRA:** Todas as tabelas CRM devem ter prefixo `crm_`

```
✅ CORRETO:
- crm_automation
- crm_ai_classification_logs
- crm_activity_log

❌ ERRADO:
- ai_classification_logs (falta prefixo)
- automation_rules (falta prefixo)
```

**Exceções permitidas:**
- `lead_scores` (conceito genérico, pode ser usado por outros módulos)
- `lead_source_attribution` (conceito genérico)

---

## 📝 DECISÕES ADICIONAIS DA REUNIÃO

### D-001: Verificação de Duplicatas de Tabelas

**Decisão:** Antes de criar `lead_source_attribution` e `crm_activity_log`, verificar se já existem no projeto.

**Comando:**
```bash
grep -r "CREATE TABLE lead_source_attribution" supabase/migrations/
grep -r "CREATE TABLE crm_activity_log" supabase/migrations/
```

**Ação:**
- Se existir → REUTILIZAR (adicionar colunas se necessário)
- Se não existir → CRIAR

### D-002: Nomenclatura com Prefixo CRM

**Decisão:** Todas as tabelas específicas de CRM devem ter prefixo `crm_`.

**Tabelas afetadas:**
- `ai_classification_logs` → `crm_ai_classification_logs` ✅
- `automation_rules` → `crm_automation` ✅ (tabela única)

### D-003: Verificar crm_activity_log Existente

**Decisão:** Verificar se `crm_activity_log` já existe antes de criar.

**Comando:**
```bash
grep -r "CREATE TABLE crm_activity_log" supabase/migrations/
```

**Ação:**
- Se existir → `ALTER TABLE ADD COLUMN IF NOT EXISTS automation_reason`
- Se não existir → Criar tabela completa

### D-004: Dashboard em /dashboard/crm/analytics

**Decisão:** Analytics CRM em rota separada `/dashboard/crm/analytics`.

**Razão:** Isolamento de features, melhor organização.

### D-005: Temperature Config Default (Pesos)

**Decisão:** Pesos default customizáveis por cliente.

```typescript
export const DEFAULT_TEMPERATURE_CONFIG = {
  weights: {
    engagement: 35,      // Mais importante
    responseTime: 25,
    keywords: 25,
    recency: 15,
  },
  thresholds: {
    hot: 70,   // >= 70 = quente
    warm: 40,  // >= 40 = morno
  },
}
```

**Armazenamento:** `crm_automation.temperature_calculation` (JSONB)

### D-006: Redis Opcional na FASE 1

**Decisão:** Redis NÃO é obrigatório na FASE 1.

**Razão:** Adicionar apenas se performance degradar (trigger lento).

**Mitigação:**
- Monitorar latência de trigger (< 200ms target)
- Se > 500ms → Adicionar Redis queue

### D-007: Logs de Trigger em Sentry

**Decisão:** Erros de trigger logados em Sentry (RAISE WARNING).

**Implementação:**
```sql
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'CRM automation failed: %', SQLERRM;
    RETURN NEW; -- Não bloqueia inserção
END;
```

**Webhook Sentry:** Configurar PostgreSQL warnings → Sentry

### D-008: Histórico de Temperatura

**Decisão:** Salvar histórico de mudanças de temperatura.

**Implementação:**
```sql
ALTER TABLE lead_scores ADD COLUMN previous_values JSONB DEFAULT '[]'::jsonb;

-- Exemplo de histórico
{
  "history": [
    { "temperature": "frio", "confidence": 65, "changed_at": "2026-02-20T10:00:00Z" },
    { "temperature": "morno", "confidence": 72, "changed_at": "2026-02-22T14:30:00Z" },
    { "temperature": "quente", "confidence": 85, "changed_at": "2026-02-25T16:45:00Z" }
  ]
}
```

### D-009: Botão IA Só Se Confidence < 70%

**Decisão:** Botão "Reclassificar com IA" só aparece se `confidence < 70%`.

**Razão:** Economia de custo + UX (não oferecer IA se já confiante).

**Implementação:**
```typescript
{lead.confidence < 70 && (
  <ReclassifyWithAIButton leadId={lead.id} />
)}
```

### D-010: Auto-Move Nunca Para "Fechado"

**Decisão:** Automação NUNCA move card para coluna "Fechado".

**Razão:** Fechamento exige confirmação humana (validação de venda).

**Implementação:**
```typescript
export const autoMoveCard = async (cardId: string, temperature: string) => {
  const targetColumn = getTargetColumnForTemperature(temperature)

  // NEVER auto-move to "Fechado"
  if (targetColumn.name === 'Fechado' || targetColumn.name === 'Closed') {
    return { moved: false, reason: 'Cannot auto-move to closed column' }
  }

  // Move card...
}
```

### D-011: Threshold Auto-Move: 75%

**Decisão:** Threshold de confiança para auto-move é **75%** (default).

**Razão:** Balanceia automação vs. falsos positivos.

**Customizável:** Cliente pode ajustar em `/dashboard/crm/settings`.

### D-012: Testes Multi-Tenant Obrigatórios

**Decisão:** TODO teste de CRM deve validar isolamento entre clientes.

**Obrigatório em:**
- Testes de triggers
- Testes de RLS policies
- Testes de funções SQL

**Ver seção:** "Testes Multi-Tenant" acima.

---

## ❓ UNKNOWNS (Questões Abertas)

### Q-001: Performance do Trigger DB

**Questão:** Trigger AFTER INSERT em `messages` pode degradar performance?

**Contexto:**
- Tabela `messages` recebe 1000+ inserções/dia por cliente
- Trigger síncrono adiciona latência

**Investigar:**
1. Medir latência de inserção antes/depois do trigger
2. Testar com carga de 100 msgs/segundo
3. Comparar trigger HTTP vs. queue Redis

**Decisão Pendente:**
- Se latência < 200ms → Manter trigger HTTP
- Se latência > 500ms → Migrar para Redis queue

### Q-002: LangChain Necessário?

**Questão:** Vale a pena adicionar LangChain para classificação IA?

**Contexto:**
- Sistema atual usa `callDirectAI()` (direto)
- LangChain adiciona abstração + ferramentas

**Prós:**
- Chains complexas (multi-step reasoning)
- Memory management
- Prompt templates

**Contras:**
- Dependência extra
- Overhead de performance
- Complexidade adicional

**Decisão Pendente:** Implementar FASE 1-2 sem LangChain, avaliar necessidade na FASE 5.

### Q-003: Google Ads Detectável?

**Questão:** Conseguimos detectar origem "Google Ads" via WhatsApp?

**Contexto:**
- Meta Ads tem `ctwa_clid` (Click-to-WhatsApp ID)
- Google Ads pode ter UTM params, mas depende de implementação do cliente

**Investigar:**
1. Verificar se Google Ads injeta parâmetros no WhatsApp
2. Testar com campanha real de Google Ads
3. Alternativa: Cliente adiciona UTM manual no link

**Decisão Pendente:** FASE 1 suporta Meta Ads + UTM. Google Ads específico → FASE 2+.

---

## ⚠️ RISCOS E MITIGAÇÕES

### R-001: Trigger Vaza Dados Entre Tenants

**Risco:** Trigger com `SECURITY DEFINER` bypassa RLS policies.

**Impacto:** 🔴 CRÍTICO - Vazamento de dados entre clientes.

**Probabilidade:** 🟡 MÉDIA (se não seguir padrão SECURITY INVOKER).

**Mitigação:**
- ✅ SEMPRE usar `SECURITY INVOKER` em triggers (ADR-004)
- ✅ Validação explícita de `client_id` em funções
- ✅ Testes multi-tenant obrigatórios (D-012)
- ✅ Code review focado em segurança

**Status:** ✅ MITIGADO (ADR-004 implementado)

### R-002: Performance do Trigger Degrada com Escala

**Risco:** Trigger síncrono adiciona latência em tabela de alta frequência.

**Impacto:** 🟡 MÉDIO - UX degrada (mensagens demoram para salvar).

**Probabilidade:** 🟡 MÉDIA (depende de carga).

**Mitigação:**
- ⚠️ Monitorar latência de inserção (target: < 200ms)
- ⚠️ Se > 500ms → Migrar para Redis queue (D-006)
- ⚠️ Trigger falha silenciosa (EXCEPTION não bloqueia)
- ⚠️ Webhook timeout configurável

**Status:** ⚠️ MONITORAR (Q-001 pendente)

### R-003: JSON Config Malformado

**Risco:** Cliente salva JSON inválido em `crm_automation` → Quebra automação.

**Impacto:** 🟡 MÉDIO - Automação para de funcionar para o cliente.

**Probabilidade:** 🟢 BAIXA (validação Zod no frontend).

**Mitigação:**
- ✅ Validação Zod antes de salvar (TypeScript)
- ✅ CHECK constraint no Postgres (JSONB válido)
- ⚠️ Função de migração: `migrate_old_config_to_new()` (se schema mudar)
- ⚠️ Fallback para config default se JSON inválido

**Implementação:**
```typescript
// Validação antes de salvar
export const saveCRMConfig = async (clientId: string, config: unknown) => {
  // Valida com Zod
  const validated = CRMAutomationSchema.parse(config)

  // Salva no banco
  await supabase
    .from('crm_automation')
    .upsert({ client_id: clientId, ...validated })
}
```

**Status:** ✅ MITIGADO (Zod schema implementado)

---

## 📚 REFERÊNCIAS E DOCUMENTOS

### Documentos Base

1. **CRM_AUTOMATION_PLAN.md** - Plano original com análise crítica
2. **BOTAO_TRIGGER_IA_ECONOMIA.md** - Proposta de botão manual (economia)
3. **LANGCHAIN_INTEGRATION_PLAN.md** - Integração LangChain (opcional)
4. **TRIGGERS_EXPLICACAO.md** - Explicação detalhada de triggers
5. **docs/tables/tabelas.md** - Schema do banco de dados
6. **CLAUDE.md** - Guia do projeto

### Arquivos Chave do Projeto

- `src/flows/chatbotFlow.ts` - Orquestrador principal
- `src/lib/config.ts` - Configuração multi-tenant
- `src/lib/direct-ai-client.ts` - Interface de IA
- `src/lib/vault.ts` - Credenciais
- `src/nodes/*` - Funções atômicas

---

## 🎓 CONCLUSÃO E RECOMENDAÇÕES FINAIS

### Decisões Arquiteturais Consolidadas

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| **Trigger Manual vs Auto (IA)** | **Híbrido com Feature Flags** | Flexibilidade + controle de custo |
| **Processamento CRM** | **Flow Independente + Database Trigger (ADR-001)** | Desacoplamento + performance |
| **Arquitetura de Config** | **Tabela Única JSONB (ADR-002)** | Extensibilidade sem migrations |
| **Segurança Multi-Tenant** | **SECURITY INVOKER (ADR-004)** | Respeita RLS policies |
| **Settings Frontend** | **/dashboard/crm/settings (ADR-005)** | Isolamento de features |
| **API Keys** | **Reutilizar Vault do Chatbot (ADR-006)** | Simplicidade + já configurado |
| **Nomenclatura Tabelas** | **Prefixo crm_ (ADR-007)** | Consistência + organização |
| **Quando Reclassificar** | **Triggers Inteligentes (1ª msg, N msgs, keywords)** | Precisão + eficiência |
| **Tecnologia IA** | **Direct AI (callDirectAI) + LangChain (Opcional Q-002)** | Simplicidade + extensibilidade |
| **Default IA** | **Desabilitada (opt-in)** | Economia + transparência |
| **Threshold Auto-Move** | **≥ 75% confiança (D-011)** | Evita falsos positivos |
| **Botão IA Manual** | **Só se confidence < 70% (D-009)** | Economia de custo |
| **Redis** | **Opcional na FASE 1 (D-006)** | Adicionar só se necessário |

### Ordem de Implementação Recomendada

1. **✅ FAZER PRIMEIRO (Semanas 1-4):**
   - FASE 1: Foundation (Heurística)
   - FASE 2: Botão Manual IA
   - FASE 3: Auto-Move + Triggers

2. **⚠️ AVALIAR DEPOIS (Semana 5):**
   - FASE 4: Analytics Dashboard (se usuário solicitar insights)

3. **🚫 NÃO FAZER AGORA (Semana 6+):**
   - FASE 5: IA Automática (apenas se custo manual for problema)
   - Machine Learning próprio (esperar 6-12 meses de dados)

### Métricas de Sucesso (90 dias)

| Métrica | Meta | Como Medir |
|---------|------|------------|
| **Precisão** | Confiança média ≥ 75% | `AVG(confidence) FROM lead_scores` |
| **Automação** | 70% classificações automáticas | `COUNT(method='heuristic') / COUNT(*)` |
| **Custo** | < R$ 20/mês por cliente | `SUM(cost_brl) FROM crm_ai_classification_logs` |
| **UX** | Taxa de override < 5% | `COUNT(manual_overrides) / COUNT(auto_moves)` |
| **Performance Heurística** | < 200ms | Logs de execução |
| **Performance Total** | STEP 1-5 < 300ms | Logs de execução |
| **Performance Trigger** | Não degrada inserção | Monitorar latência de INSERT |
| **Conversão** | Leads quentes convertem 30%+ | `COUNT(closed) / COUNT(hot)` |

### Próximos Passos Imediatos

1. **Revisar e Aprovar Plano:** Apresentar para stakeholders
2. **Aprovar Budget:** R$ 11.900 (MVP) ou R$ 12.900 (Completo)
3. **Preparar Dados de Teste:** 100 conversas reais do cliente
4. **Criar Branch:** `feature/crm-automation-complete`
5. **COMEÇAR FASE 1:** Semana de 19/02/2026

---

**FIM DO PLANO COMPLETO E PROFISSIONAL**

**Última Atualização:** 2026-02-25
**Versão:** 3.0 - Alinhado com Reunião de Revisão Arquitetural
**Status:** Pronto para Implementação

---

## 📋 CHANGELOG

### v3.0 (2026-02-25) - Alinhamento com Reunião Arquitetural

**Mudanças Críticas:**
- ✅ DECISÃO #2 reescrita: CRM como flow independente + database trigger (ADR-001)
- ✅ Arquitetura atualizada: Diagrama com crmAutomationFlow separado
- ✅ Modelagem de dados: Tabela única `crm_automation` com JSONB (ADR-002)
- ✅ FASE 1 reescrita: Criar flow + trigger em vez de NODE 14
- ✅ Adicionados 7 ADRs da reunião
- ✅ Adicionados 12 decisões técnicas (D-001 a D-012)
- ✅ Adicionados 3 unknowns (Q-001 a Q-003)
- ✅ Adicionados 3 riscos (R-001 a R-003)
- ✅ Seção Database Triggers & Security (SECURITY INVOKER)
- ✅ Seção Verificação de Tabelas Existentes
- ✅ Tabela renomeada: ai_classification_logs → crm_ai_classification_logs
- ✅ Presentation Layer corrigido: /dashboard/crm/settings
- ✅ External Services: Reutilização de API keys clarificada

### v2.0 (2026-02-24) - Plano Original

**Features:**
- Sistema de classificação heurística
- Botão manual de IA
- Auto-movimentação de cards
- Analytics dashboard
- IA automática (opcional)

---

**Documento Base:** CRM_AUTOMATION_PLAN.md + Ata de Reunião 2026-02-25
**Autores:** Equipe de Desenvolvimento
**Revisado Por:** Stakeholders (Reunião 25/02/2026)
**Aprovação Necessária:** Product Owner + Tech Lead

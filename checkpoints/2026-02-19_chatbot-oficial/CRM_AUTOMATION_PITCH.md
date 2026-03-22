# CRM Automation - Reunião com Luis (15 min)

**Data:** 2026-02-20
**Objetivo:** Aprovar implementação de automação inteligente do CRM
**Tempo:** 15 minutos

---

## 1. VISÃO GERAL (2 min)

### O que queremos?

**Sistema CRM que classifica leads AUTOMATICAMENTE:**
- 🔥 **Temperatura**: Quente, Morno, Frio (baseado em comportamento)
- 📱 **Origem**: Instagram Ads, Orgânico, Link compartilhado
- 🤖 **Auto-movimentação**: Cards se movem sozinhos entre colunas
- 📊 **Analytics**: Dashboard com insights acionáveis

### Por que agora?

- Hoje: **100% manual** (time perde horas classificando leads)
- CRM existe, mas não é "inteligente"
- Infraestrutura pronta (tabelas, automation rules já existem)
- **Oportunidade:** Adicionar camada de inteligência sem refatorar tudo

---

## 2. PROBLEMA ATUAL (2 min)

### Como é hoje:

```
Cliente fala com bot → Card criado → PARA AÍ
                                      ↓
                              Vendedor precisa:
                              - Ler conversa
                              - Decidir se é quente/frio
                              - Mover manualmente para coluna certa
                              - Descobrir de onde veio

                              ⏱️ Tempo: 2-5 min POR LEAD
```

### Problemas reais:

1. ❌ Vendedor perde tempo com leads frios (não deveria nem olhar)
2. ❌ Leads quentes ficam "esquecidos" na coluna errada
3. ❌ Nenhuma visão de ROI (não sabe quanto Instagram Ads converte)
4. ❌ Sem priorização (tudo parece igual)

### Impacto:

- **50 leads/dia** × **3 min** = **2,5 horas/dia** de trabalho manual
- Leads quentes esperando = **perda de vendas**
- Sem dados = **decisões no escuro**

---

## 3. SOLUÇÃO PROPOSTA (5 min)

### Como vai ficar:

```
Cliente fala com bot → Card criado → BOT CLASSIFICA AUTOMATICAMENTE
                                      ↓
                              🔥 Quente (85%) - Meta Ads
                              Move para: "Qualificando"
                              ↓
                              Vendedor vê:
                              - Badge vermelho (prioridade alta)
                              - "Veio do Instagram Ads"
                              - "Mencionou 'quanto custa' 3x"

                              ⏱️ Tempo: 0 segundos
```

### Sistema de Classificação - HÍBRIDO (Inteligente mas Simples)

#### FASE 1: Regras Heurísticas (SEM IA) ✅ RECOMENDADO

**Como funciona:**
- Analisa comportamento do lead na conversa
- Calcula score baseado em 4 fatores

**Exemplo Real:**

| Fator | Análise | Score |
|-------|---------|-------|
| **Engagement** | 5 mensagens em 10 min | 90/100 |
| **Response Time** | Respondeu em < 2 min | 90/100 |
| **Keywords** | "quanto custa", "quero comprar" | 90/100 |
| **Recency** | Última msg há 5 min | 90/100 |
| **TOTAL** | Média ponderada | **88/100** |
| **CLASSIFICAÇÃO** | ≥70 = QUENTE | 🔥 **QUENTE** |

**Origem:**
- ✅ Meta Ads: Detecta `ctwa_clid` (100% confiável)
- ✅ Orgânico: Sem referral data
- ✅ Link UTM: Se link tem `?utm_source=`
- ⚠️ Google Ads: **NÃO detectável** (limitação do WhatsApp API)
  - Solução: Bot pergunta "Como nos conheceu?"

**Custo:** R$ 0 (zero chamadas de IA)
**Acurácia:** 70-80% (suficiente para início)
**Latência:** +100ms (queries SQL rápidas)

#### FASE 4: IA para Refinamento (OPCIONAL) ⚠️ SÓ SE NECESSÁRIO

**Quando usar:**
- Apenas para casos ambíguos (confidence < 70%)
- Cliente ativa manualmente (opt-in)
- Com limite mensal (ex: 1000 classificações)

**Custo:** R$ 0,003 por classificação
**Exemplo:** 500 leads/mês com IA = R$ 1,50/mês

---

## 4. ROADMAP - O QUE VAMOS FAZER (3 min)

### SPRINT 1 (Semana 1-2) - FOUNDATION 🎯 PRIORIDADE MÁXIMA

**Objetivo:** Sistema classifica automaticamente (sem IA)

**Tasks Técnicas:**
1. ✅ Migration: `lead_scores` table (score components + temperature)
2. ✅ Function SQL: `calculate_lead_temperature()` (lógica de score)
3. ✅ Node: `calculateLeadTemperature.ts` (wrapper)
4. ✅ Node: `classifyLeadSource.ts` (detecção origem)
5. ✅ Integrar em `chatbotFlow.ts` (NODE 14)
6. ✅ UI: Badge de temperatura nos cards CRM
7. ✅ UI: Filtros (🔥 Quentes, ☀️ Mornos, ❄️ Frios)

**Entrega:**
```
┌─────────────────────────────────────────────┐
│  CRM - Leads               [🔥] [☀️] [❄️]  │
├──────────────┬──────────────┬───────────────┤
│ Novo Lead    │ Qualificando │ Proposta      │
├──────────────┼──────────────┼───────────────┤
│ ┌──────────┐ │ ┌──────────┐ │               │
│ │ João     │ │ │ Maria    │ │               │
│ │ 🔥 85%   │ │ │ ☀️ 65%   │ │               │
│ │ 📱 Meta  │ │ │ 🌐 Org.  │ │               │
│ └──────────┘ │ └──────────┘ │               │
└──────────────┴──────────────┴───────────────┘
```

**Tempo:** 24 horas de dev

---

### SPRINT 2 (Semana 3) - AUTO-MOVE 🎯 ALTA PRIORIDADE

**Objetivo:** Cards se movem automaticamente

**Tasks Técnicas:**
1. ✅ Migration: `auto_move_card_function.sql`
2. ✅ Node: `autoMoveCard.ts` (decisão de movimentação)
3. ✅ Lib: `crm-column-rules.ts` (regras por coluna)
4. ✅ UI: Settings page (configurar thresholds)
5. ✅ UI: Indicador "🤖 Auto" nos cards movidos

**Exemplo de Regra:**
```
SE temperatura = QUENTE (≥70%)
E confidence ≥ 75%
E coluna atual = "Novo Lead"
ENTÃO mover para "Qualificando"
```

**Entrega:**
- Card classificado como Quente → Move sozinho para "Qualificando"
- Vendedor vê histórico: "Movido automaticamente - Motivo: Temperatura Quente (85%)"

**Tempo:** 16 horas de dev

---

### SPRINT 3 (Semana 4) - ANALYTICS 🎯 MÉDIA PRIORIDADE

**Objetivo:** Dashboard com insights

**Tasks Técnicas:**
1. ✅ Página: `/dashboard/crm/analytics`
2. ✅ Gráficos: Distribuição por temperatura, origem
3. ✅ Métricas: Taxa conversão, tempo médio por coluna
4. ✅ Relatório: Performance da automação

**Entrega:**
```
📊 CRM ANALYTICS

OVERVIEW (Últimos 30 dias)
├─ Total Leads: 247
├─ Taxa Quente: 32%
└─ Conversão: 18%

DISTRIBUIÇÃO POR TEMPERATURA
🔥 Quentes: 79 (32%)  ████████░░░░░░░░░░░░░░
☀️ Mornos:  123 (50%) ██████████████░░░░░░░░
❄️ Frios:   45 (18%)  ████░░░░░░░░░░░░░░░░░░

ORIGEM DOS LEADS
📱 Meta Ads:     145 (59%)
🌐 Orgânico:      68 (28%)
🔗 Link/UTM:      24 (10%)

🤖 PERFORMANCE AUTOMAÇÃO
├─ Classificações Auto: 237/247 (96%)
├─ Confiança Média: 78%
└─ Overrides Manuais: 10 (4%)
```

**Tempo:** 12 horas de dev

---

### SPRINT 4 (Opcional - Avaliar Depois) - AI REFINEMENT ⚠️

**Objetivo:** IA para casos difíceis

**Quando implementar:**
- ❌ NÃO implementar agora
- ✅ Implementar SE:
  - Acurácia das regras < 70%
  - Cliente pedir explicitamente
  - Tem budget para R$ 30-50/mês extras

**Tempo:** 20 horas de dev

---

## 5. CUSTOS E RISCOS (2 min)

### Investimento Desenvolvimento

| Sprint | Horas | Custo (R$ 100/h) | Entrega |
|--------|-------|------------------|---------|
| Sprint 1 | 24h | R$ 2.400 | Classificação automática |
| Sprint 2 | 16h | R$ 1.600 | Auto-movimentação |
| Sprint 3 | 12h | R$ 1.200 | Analytics dashboard |
| Testing | 8h | R$ 800 | QA + Ajustes |
| **MVP TOTAL** | **60h** | **R$ 6.000** | Sistema completo |

**Opcional (Sprint 4 - IA):** +20h = +R$ 2.000

### Custo Operacional

| Item | Valor |
|------|-------|
| Classificação com Regras | **R$ 0/mês** ✅ |
| IA (opcional, se ativar) | R$ 1,50/mês por 500 leads |
| Database Storage | R$ 0,01/mês (incluído Supabase) |
| **TOTAL** | **R$ 0 - 1,50/mês** |

### Riscos Principais

**🚨 RISCO 1: Classificação Errada**
- Lead frio classificado como quente → Vendedor perde tempo
- **Mitigação:** Threshold alto (75%+), botão "Override Manual"

**🚨 RISCO 2: Google Ads Não Detectável**
- Impossível distinguir Google Ads de orgânico (limitação API)
- **Mitigação:** Bot pergunta "Como nos conheceu?"

**🚨 RISCO 3: Custo IA (se ativar na SPRINT 4)**
- Pode chegar a R$ 45/mês se não controlar
- **Mitigação:** Limite mensal, usar apenas em casos ambíguos

**🚨 RISCO 4: Overengineering**
- Gastar 6 semanas e usuário não usar
- **Mitigação:** MVP em 4 semanas, medir uso real antes de adicionar IA

---

## 6. DECISÃO E PRÓXIMOS PASSOS (1 min)

### O que Recomendar?

**✅ IMPLEMENTAR AGORA (MVP - Sprints 1-3):**
- ROI claro: Economiza 2,5h/dia de trabalho manual
- Custo zero operacional (apenas dev)
- Risco baixo
- Tempo: 4 semanas

**⚠️ AVALIAR DEPOIS (Sprint 4 - IA):**
- Só implementar se acurácia < 70%
- Esperar 2-4 semanas de uso real
- Ter dados para decidir

**❌ NÃO FAZER (Machine Learning próprio):**
- Custo/benefício negativo
- Esperar 6-12 meses de dados

### Próximos Passos (Se Aprovar):

**HOJE:**
- [x] Revisar este plano
- [ ] Aprovar orçamento (R$ 6.000)
- [ ] Definir métrica de sucesso (ex: 75% acurácia)

**AMANHÃ:**
- [ ] Criar branch `feature/crm-automation`
- [ ] Começar Sprint 1 (migrations + functions)

**SEMANA 1-2:**
- [ ] Implementar classificação automática
- [ ] Testar com 100 conversas reais

**SEMANA 3:**
- [ ] Auto-movimentação
- [ ] Monitorar por 1 semana

**SEMANA 4:**
- [ ] Analytics dashboard
- [ ] Entregar MVP

**SEMANA 5 (Decisão):**
- [ ] Medir acurácia
- [ ] Decidir: Adicionar IA ou não?

---

## RESUMO EXECUTIVO - 30 SEGUNDOS

**O QUE:** Sistema que classifica leads automaticamente (quente/morno/frio) e move cards sozinho

**COMO:** Regras baseadas em comportamento (sem IA = custo zero)

**QUANTO:** R$ 6.000 (60 horas dev) + R$ 0/mês operacional

**QUANDO:** 4 semanas (3 sprints)

**POR QUE:** Economiza 2,5h/dia de trabalho manual + prioriza leads quentes + insights de ROI

**RISCO:** Baixo (começamos simples, adicionamos IA só se necessário)

---

**FIM DA APRESENTAÇÃO**

**Documento Completo:** `CRM_AUTOMATION_PLAN.md` (500+ linhas com todos detalhes técnicos)

**Perguntas para o Luis:**
1. Orçamento de R$ 6.000 está ok?
2. 4 semanas de prazo é viável?
3. Alguma preocupação técnica específica?
4. Quer começar com Sprint 1 ou fazer todas 3 juntas?

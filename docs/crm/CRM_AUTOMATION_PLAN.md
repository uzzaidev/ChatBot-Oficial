# CRM AUTOMATION PLAN - Intelligent Lead Classification System

**Data:** 2026-02-19
**Status:** 🔴 PLANEJAMENTO - REVISÃO CRÍTICA NECESSÁRIA
**Viabilidade:** ⚠️ VIÁVEL COM RESSALVAS (ver seção de riscos)

---

## EXECUTIVE SUMMARY - AVALIAÇÃO CRÍTICA

### Estado Atual vs. Estado Desejado

**ATUAL (O que temos):**
- ✅ Infraestrutura CRM completa (9 tabelas, Kanban funcional)
- ✅ Captura de origem básica (Meta Ads via ctwa_clid)
- ✅ Sistema de regras de automação (JSONB flexível)
- ✅ Auto-criação de cards para novos contatos
- ✅ Tracking de atividades e status
- ⚠️ Classificação é 100% MANUAL (nenhuma inteligência)
- ⚠️ Triggers limitados (7 tipos, nenhum baseado em IA)

**DESEJADO (O que o usuário quer):**
- 🎯 Classificação automática de temperatura (quente/morno/frio)
- 🎯 Detecção inteligente de origem (Instagram Ads, Google Ads, orgânico)
- 🎯 Categorização automática em colunas CRM
- 🎯 Sistema que "aprende" e melhora com o tempo
- 🎯 UI/UX para visualização e override manual

### AVALIAÇÃO CRÍTICA - PROBLEMAS REAIS

**🚨 PROBLEMA #1: Custo de Token**
- Cada classificação AI = 1 chamada extra ao GPT-4o
- Estimativa: +500 tokens por conversa (input: mensagens + contexto, output: classificação)
- Custo por classificação: ~R$ 0,003 (conservador)
- **Com 1000 conversas/dia = R$ 3,00/dia = R$ 90/mês APENAS em classificação**
- **RISCO:** Budget explode se não houver controle

**🚨 PROBLEMA #2: Latência do Webhook**
- Webhook Meta tem timeout de 20s
- Adicionar classificação AI = +2-3s ao fluxo
- **RISCO:** Timeout se chatbotFlow já estiver próximo do limite
- **SOLUÇÃO NECESSÁRIA:** Classificação assíncrona (job queue)

**🚨 PROBLEMA #3: Classificação Instagram vs Google**
- Meta WhatsApp só envia `ctwa_clid` (Click-to-WhatsApp)
- Google Ads NÃO envia referral data no WhatsApp
- **REALIDADE:** Impossível distinguir Google Ads de orgânico via webhook
- **SOLUÇÃO PARCIAL:** Usar UTM parameters se cliente compartilhar link com UTM (não confiável)

**🚨 PROBLEMA #4: Cold Start Problem**
- Sistema precisa de DADOS para "aprender"
- Primeiras 100-500 classificações serão imprecisas
- **RISCO:** Usuário perde confiança se começar classificando errado
- **SOLUÇÃO:** Começar com regras heurísticas + IA para refinamento

**🚨 PROBLEMA #5: Overengineering**
- Adicionar ML/AI aumenta complexidade exponencialmente
- **PERGUNTA CRÍTICA:** O usuário REALMENTE precisa de IA ou regras bem feitas resolvem?
- Exemplo: "Se lead menciona 'vi seu anúncio' + tem ctwa_clid = Instagram Ads (quente)"

---

## ARQUITETURA PROPOSTA - ABORDAGEM HÍBRIDA (RECOMENDADA)

### Princípio: "Keep It Simple, Make It Work"

**FASE 1: Regras Inteligentes (Sem IA) - IMPLEMENTAR PRIMEIRO**
- Baseado em padrões detectáveis (keywords, tempo de resposta, engagement)
- Custo: ZERO tokens extras
- Latência: +100ms (queries SQL)
- Acurácia estimada: 70-80% (suficiente para início)

**FASE 2: IA para Refinamento (Opcional) - AVALIAR DEPOIS**
- Apenas para casos ambíguos (confidence < 70%)
- Uso seletivo de IA (não em 100% das conversas)
- Custo controlado: ~R$ 20-30/mês

### Por que Híbrido?

1. **Viabilidade Financeira:** Evita explosão de custos
2. **Performance:** Não adiciona latência crítica ao webhook
3. **Confiabilidade:** Regras são previsíveis, IA pode errar
4. **Iteração:** Começa simples, adiciona IA se necessário

---

## FASE 1: CLASSIFICAÇÃO BASEADA EM REGRAS (RECOMENDADO)

### 1.1 Detecção de Temperatura (Quente/Morno/Frio)

**Regras Heurísticas:**

```typescript
// QUENTE (Score ≥ 70)
- Tempo de resposta < 2 min (engajamento alto)
- Mensagens com palavras-chave: "quanto custa", "quero comprar", "pode enviar proposta"
- Fez pergunta sobre produto/serviço
- Respondeu a mais de 3 mensagens seguidas
- Pediu contato de vendedor

// MORNO (Score 40-69)
- Tempo de resposta 2-10 min
- Perguntou sobre funcionamento/features
- Demonstrou interesse mas sem urgência
- Pediu "mais informações"
- 1-2 mensagens de interação

// FRIO (Score < 40)
- Tempo de resposta > 10 min
- Apenas "oi", "olá" sem follow-up
- Não respondeu após bot enviar informação
- Inativo por 24h+
- Mensagens genéricas ("tudo bem?", "obrigado")
```

**Implementação:**

```sql
-- Nova tabela: lead_scores
CREATE TABLE lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  card_id UUID NOT NULL REFERENCES crm_cards(id),
  phone NUMERIC NOT NULL,

  -- Score components
  engagement_score INTEGER DEFAULT 50, -- 0-100
  response_time_score INTEGER DEFAULT 50,
  keyword_score INTEGER DEFAULT 50,
  recency_score INTEGER DEFAULT 50,

  -- Calculated temperature
  temperature TEXT NOT NULL, -- 'quente' | 'morno' | 'frio'
  confidence INTEGER NOT NULL, -- 0-100

  -- Metadata
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  calculation_method TEXT DEFAULT 'heuristic', -- 'heuristic' | 'ai' | 'manual'

  UNIQUE(client_id, card_id)
);

-- Função de cálculo
CREATE OR REPLACE FUNCTION calculate_lead_temperature(
  p_client_id UUID,
  p_card_id UUID,
  p_phone NUMERIC
) RETURNS TABLE(temperature TEXT, confidence INTEGER) AS $$
DECLARE
  v_engagement_score INTEGER := 50;
  v_response_time_score INTEGER := 50;
  v_keyword_score INTEGER := 50;
  v_recency_score INTEGER := 50;
  v_total_score INTEGER;
  v_temp TEXT;
  v_confidence INTEGER;
BEGIN
  -- Calcular engagement (quantidade de mensagens)
  SELECT CASE
    WHEN COUNT(*) >= 5 THEN 90
    WHEN COUNT(*) >= 3 THEN 70
    WHEN COUNT(*) >= 1 THEN 50
    ELSE 30
  END INTO v_engagement_score
  FROM n8n_chat_histories
  WHERE message->>'phone' = p_phone::TEXT
    AND client_id = p_client_id
    AND created_at > NOW() - INTERVAL '7 days';

  -- Calcular response time (média dos últimos 5 tempos)
  WITH response_times AS (
    SELECT
      EXTRACT(EPOCH FROM (
        LEAD(created_at) OVER (ORDER BY created_at) - created_at
      )) AS seconds_diff
    FROM n8n_chat_histories
    WHERE message->>'phone' = p_phone::TEXT
      AND message->>'type' = 'human'
      AND client_id = p_client_id
      AND created_at > NOW() - INTERVAL '7 days'
    LIMIT 5
  )
  SELECT CASE
    WHEN AVG(seconds_diff) < 120 THEN 90  -- < 2 min
    WHEN AVG(seconds_diff) < 600 THEN 60  -- < 10 min
    ELSE 30
  END INTO v_response_time_score
  FROM response_times
  WHERE seconds_diff IS NOT NULL;

  -- Calcular keyword score (últimas 10 mensagens)
  WITH keyword_analysis AS (
    SELECT message->'content'->>'text' AS text
    FROM n8n_chat_histories
    WHERE message->>'phone' = p_phone::TEXT
      AND message->>'type' = 'human'
      AND client_id = p_client_id
    ORDER BY created_at DESC
    LIMIT 10
  )
  SELECT CASE
    WHEN COUNT(*) FILTER (WHERE text ~* '(quanto|preço|valor|custo|comprar|proposta|orçamento)') >= 2 THEN 90
    WHEN COUNT(*) FILTER (WHERE text ~* '(informação|saber|como funciona|detalhes)') >= 1 THEN 60
    ELSE 40
  END INTO v_keyword_score
  FROM keyword_analysis;

  -- Calcular recency (última mensagem)
  SELECT CASE
    WHEN MAX(created_at) > NOW() - INTERVAL '1 hour' THEN 90
    WHEN MAX(created_at) > NOW() - INTERVAL '24 hours' THEN 70
    WHEN MAX(created_at) > NOW() - INTERVAL '3 days' THEN 50
    ELSE 30
  END INTO v_recency_score
  FROM n8n_chat_histories
  WHERE message->>'phone' = p_phone::TEXT
    AND client_id = p_client_id;

  -- Total score (ponderado)
  v_total_score := (
    v_engagement_score * 0.25 +
    v_response_time_score * 0.30 +
    v_keyword_score * 0.35 +
    v_recency_score * 0.10
  )::INTEGER;

  -- Classificação
  IF v_total_score >= 70 THEN
    v_temp := 'quente';
    v_confidence := LEAST(v_total_score, 95);
  ELSIF v_total_score >= 40 THEN
    v_temp := 'morno';
    v_confidence := 70 + ((v_total_score - 40) / 3)::INTEGER;
  ELSE
    v_temp := 'frio';
    v_confidence := 50 + (v_total_score / 2)::INTEGER;
  END IF;

  RETURN QUERY SELECT v_temp, v_confidence;
END;
$$ LANGUAGE plpgsql;
```

### 1.2 Detecção de Origem (Source Attribution)

**REALIDADE TÉCNICA:**

| Origem | Detectável? | Como? |
|--------|-------------|-------|
| Meta Ads (Instagram/Facebook) | ✅ SIM | `ctwa_clid` presente no webhook |
| Orgânico WhatsApp | ✅ SIM | Nenhum referral data |
| Link Compartilhado (com UTM) | ⚠️ PARCIAL | Se cliente incluir UTM no link |
| Google Ads | ❌ NÃO | Google Ads não integra com WhatsApp Business API |
| Indicação | ⚠️ PARCIAL | Via pergunta do bot "Como nos conheceu?" |

**Implementação Realista:**

```typescript
// src/nodes/classifyLeadSource.ts (NOVO ARQUIVO)

export interface ClassifyLeadSourceInput {
  clientId: string;
  cardId: string;
  phone: string;
  referralData?: {
    source_url?: string;
    source_type?: string;
    source_id?: string;
    ctwa_clid?: string;
  };
  firstMessageContent?: string;
}

export const classifyLeadSource = async (
  input: ClassifyLeadSourceInput
): Promise<{
  sourceType: 'meta_ads' | 'instagram_organic' | 'whatsapp_direct' | 'link_utm' | 'referral' | 'unknown';
  sourceDetail: string;
  confidence: number;
  autoTag?: string;
}> => {
  const { referralData, firstMessageContent } = input;

  // 1. Meta Ads (100% confiável)
  if (referralData?.ctwa_clid) {
    return {
      sourceType: 'meta_ads',
      sourceDetail: `Instagram/Facebook Ad (ctwa: ${referralData.ctwa_clid})`,
      confidence: 100,
      autoTag: 'Anúncio Meta'
    };
  }

  // 2. Link com UTM (se source_url contém UTM)
  if (referralData?.source_url?.includes('utm_source')) {
    const utmSource = new URL(referralData.source_url).searchParams.get('utm_source');
    const utmMedium = new URL(referralData.source_url).searchParams.get('utm_medium');

    return {
      sourceType: 'link_utm',
      sourceDetail: `Link compartilhado (${utmSource}/${utmMedium})`,
      confidence: 90,
      autoTag: `UTM: ${utmSource}`
    };
  }

  // 3. Análise de primeira mensagem (heurística)
  const lowerContent = firstMessageContent?.toLowerCase() || '';

  if (lowerContent.includes('vi seu anúncio') || lowerContent.includes('vi o anuncio')) {
    return {
      sourceType: 'meta_ads',
      sourceDetail: 'Mencionou anúncio (heurística)',
      confidence: 70,
      autoTag: 'Provável Anúncio'
    };
  }

  if (lowerContent.includes('indicação') || lowerContent.includes('meu amigo')) {
    return {
      sourceType: 'referral',
      sourceDetail: 'Mencionou indicação',
      confidence: 75,
      autoTag: 'Indicação'
    };
  }

  if (lowerContent.includes('instagram') && !referralData) {
    return {
      sourceType: 'instagram_organic',
      sourceDetail: 'Mencionou Instagram (orgânico)',
      confidence: 60,
      autoTag: 'Instagram Orgânico'
    };
  }

  // 4. Fallback: WhatsApp direto
  return {
    sourceType: 'whatsapp_direct',
    sourceDetail: 'Contato direto (sem referral)',
    confidence: 50,
    autoTag: 'WhatsApp Direto'
  };
};
```

### 1.3 Auto-Movimentação de Cards

**Regras de Coluna:**

```typescript
// src/lib/crm-column-rules.ts (NOVO ARQUIVO)

export const DEFAULT_COLUMN_RULES = {
  'novo-lead': {
    conditions: [
      { type: 'card_created', autoMove: false }, // Permanece aqui ao criar
      { type: 'no_response_24h', moveTo: 'frio', confidence: 80 }
    ]
  },

  'qualificando': {
    conditions: [
      { type: 'temperature_quente', autoMove: true, confidence: 75 },
      { type: 'asked_about_price', autoMove: true, confidence: 80 },
      { type: 'engagement_high', autoMove: true, confidence: 70 }
    ],
    autoMoveFrom: ['novo-lead']
  },

  'proposta': {
    conditions: [
      { type: 'requested_proposal', autoMove: true, confidence: 90 },
      { type: 'keyword_match', keywords: ['quanto custa', 'proposta', 'orçamento'], confidence: 85 }
    ],
    autoMoveFrom: ['qualificando']
  },

  'fechado': {
    conditions: [
      { type: 'keyword_match', keywords: ['fechado', 'quero comprar', 'vamos fechar'], confidence: 90 }
    ],
    autoMoveFrom: ['proposta'],
    requireManualConfirmation: true // Não move automaticamente para fechado
  },

  'frio': {
    conditions: [
      { type: 'inactivity_days', days: 7, confidence: 90 },
      { type: 'temperature_frio', autoMove: true, confidence: 75 }
    ],
    autoMoveFrom: ['novo-lead', 'qualificando']
  }
};

// Função que decide se deve mover card
export const shouldMoveCard = async (
  clientId: string,
  cardId: string,
  currentColumnSlug: string,
  trigger: {
    type: string;
    data: any;
  }
): Promise<{
  shouldMove: boolean;
  targetColumn?: string;
  reason: string;
  confidence: number;
}> => {
  // Lógica de decisão baseada nas regras acima
  // + dados da conversa atual
  // + temperatura calculada
  // + origem do lead

  // Retorna se deve mover + para qual coluna + confiança
};
```

---

## FASE 2: IA PARA REFINAMENTO (OPCIONAL)

### 2.1 Quando Usar IA?

**Casos de Uso Seletivo:**
- Confidence heurística < 70% (casos ambíguos)
- Lead mencionou algo complexo que regras não capturam
- Cliente ativou "AI Classification" nas configurações (opt-in)
- Primeiras 50 conversas para treinamento (depois usa regras)

### 2.2 Arquitetura AI Classification

```typescript
// src/nodes/classifyLeadWithAI.ts (NOVO ARQUIVO)

export const classifyLeadWithAI = async (
  input: {
    clientId: string;
    phone: string;
    conversationHistory: Array<{role: string, content: string}>;
    heuristicResult?: { temperature: string; confidence: number };
  }
): Promise<{
  temperature: 'quente' | 'morno' | 'frio';
  intent: string;
  buyingSignals: string[];
  confidence: number;
  reasoning: string;
}> => {

  const prompt = `Você é um especialista em qualificação de leads. Analise esta conversa de WhatsApp e classifique o lead.

HISTÓRICO DA CONVERSA:
${input.conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}

${input.heuristicResult ? `ANÁLISE PRÉVIA (regras): ${input.heuristicResult.temperature} (confiança: ${input.heuristicResult.confidence}%)` : ''}

Classifique o lead em:
1. Temperatura: quente (pronto para comprar), morno (interessado mas não urgente), frio (pouco interesse)
2. Intenção principal: o que o lead quer?
3. Sinais de compra: quais frases indicam interesse?
4. Confiança: quão certo você está? (0-100)

Responda APENAS no formato JSON:
{
  "temperature": "quente|morno|frio",
  "intent": "descrição da intenção",
  "buyingSignals": ["sinal1", "sinal2"],
  "confidence": 85,
  "reasoning": "explicação breve"
}`;

  const result = await callDirectAI({
    clientId: input.clientId,
    messages: [{ role: 'user', content: prompt }],
    settings: {
      temperature: 0.3, // Baixa temperatura = mais determinístico
      maxTokens: 500,
      model: 'gpt-4o-mini' // Mais barato
    },
    clientConfig: await getClientConfig(input.clientId)
  });

  const classification = JSON.parse(result.content);

  // Log para análise futura
  await logAIClassification(input.clientId, input.phone, classification);

  return classification;
};
```

### 2.3 Controle de Custo

```typescript
// src/lib/ai-classification-budget.ts (NOVO ARQUIVO)

export const canUseAIClassification = async (clientId: string): Promise<boolean> => {
  const { data: settings } = await supabase
    .from('clients')
    .select('settings')
    .eq('id', clientId)
    .single();

  // Verifica se cliente habilitou IA
  if (!settings?.ai_classification_enabled) {
    return false;
  }

  // Verifica limite mensal de classificações
  const { count } = await supabase
    .from('ai_classification_logs')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .gte('created_at', new Date(new Date().setDate(1))); // Início do mês

  const monthlyLimit = settings?.ai_classification_monthly_limit || 1000;

  return (count || 0) < monthlyLimit;
};
```

---

## ARQUIVOS A SEREM MODIFICADOS/CRIADOS

### NOVOS ARQUIVOS (15)

**Migrations (6):**
1. `supabase/migrations/20260220000000_lead_scores.sql` - Tabela de scores
2. `supabase/migrations/20260220000001_ai_classification_logs.sql` - Log de classificações IA
3. `supabase/migrations/20260220000002_crm_automation_triggers_ai.sql` - Novos triggers AI
4. `supabase/migrations/20260220000003_lead_temperature_function.sql` - Função de cálculo
5. `supabase/migrations/20260220000004_auto_move_card_function.sql` - Auto-movimentação
6. `supabase/migrations/20260220000005_classification_history.sql` - Histórico de mudanças

**Backend Nodes (5):**
7. `src/nodes/classifyLeadSource.ts` - Classificação de origem
8. `src/nodes/calculateLeadTemperature.ts` - Cálculo de temperatura
9. `src/nodes/classifyLeadWithAI.ts` - Classificação via IA (opcional)
10. `src/nodes/autoMoveCard.ts` - Auto-movimentação de cards
11. `src/nodes/updateLeadScore.ts` - Atualização de score

**Libs (3):**
12. `src/lib/crm-column-rules.ts` - Regras de coluna
13. `src/lib/ai-classification-budget.ts` - Controle de orçamento IA
14. `src/lib/lead-scoring.ts` - Funções auxiliares de scoring

**UI Components (1):**
15. `src/app/dashboard/crm/analytics/page.tsx` - Dashboard de analytics

### ARQUIVOS EXISTENTES A MODIFICAR (8)

**Core Flow:**
1. `src/flows/chatbotFlow.ts`
   - **Linha ~222:** Adicionar `calculateLeadTemperature()` após `captureLeadSource`
   - **Linha ~880:** Adicionar `autoMoveCard()` antes de retornar
   - Novo NODE 14: "Classify and Auto-Move Lead"

**CRM Nodes:**
2. `src/nodes/captureLeadSource.ts`
   - **Linha 373:** Adicionar chamada para `classifyLeadSource()` (novo)
   - Retornar sourceType para uso posterior

3. `src/nodes/updateCRMCardStatus.ts`
   - Adicionar update de `lead_scores` ao mover card
   - Log de mudança de temperatura

**Constants:**
4. `src/lib/crm-automation-constants.ts`
   - Adicionar triggers: `temperature_change`, `ai_classification_complete`, `confidence_low`
   - Adicionar actions: `request_ai_classification`, `update_temperature`

**Database Config:**
5. `supabase/migrations/20260131_crm_module.sql`
   - ❌ NÃO MODIFICAR (já aplicada)
   - Criar NOVA migration para adicionar colunas

**Frontend:**
6. `src/app/dashboard/crm/page.tsx`
   - Adicionar badge de temperatura nos cards (🔥 quente, ☀️ morno, ❄️ frio)
   - Adicionar filtro por temperatura
   - Mostrar confidence score

7. `src/components/crm/CRMCard.tsx`
   - Adicionar visualização de score
   - Indicador de classificação automática
   - Botão "Override Manual"

8. `src/app/dashboard/settings/page.tsx`
   - Nova seção: "Automação CRM"
   - Toggle: Habilitar/desabilitar IA
   - Config: Limite mensal de classificações IA
   - Config: Threshold de confidence para auto-move

---

## UI/UX FLOW - JORNADA DO USUÁRIO

### 1. Dashboard CRM (Visualização)

```
┌─────────────────────────────────────────────────────────────┐
│  CRM - Leads                                     [Analytics] │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Filtros: [Todos] [🔥 Quentes] [☀️ Mornos] [❄️ Frios]      │
│           [📱 Instagram Ads] [🌐 Orgânico] [🔗 Link]        │
│                                                               │
├────────────┬────────────┬────────────┬────────────────────┤
│ Novo Lead  │ Qualif.    │ Proposta   │ Fechado            │
├────────────┼────────────┼────────────┼────────────────────┤
│            │            │            │                    │
│ ┌────────┐ │ ┌────────┐ │ ┌────────┐ │ ┌────────┐         │
│ │João    │ │ │Maria   │ │ │Pedro   │ │ │Ana     │         │
│ │🔥 85%  │ │ │☀️ 65%  │ │ │🔥 92%  │ │ │🔥 98%  │         │
│ │📱 Meta │ │ │🌐 Org. │ │ │📱 Meta │ │ │🔗 Link │         │
│ │        │ │ │        │ │ │        │ │ │        │         │
│ │🤖 Auto │ │ │✋ Manual│ │ │🤖 Auto │ │ │✋ Manual│         │
│ └────────┘ │ └────────┘ │ └────────┘ │ └────────┘         │
│            │            │            │                    │
│ ┌────────┐ │            │            │                    │
│ │Carlos  │ │            │            │                    │
│ │❄️ 32%  │ │            │            │                    │
│ │❓ Desc.│ │            │            │                    │
│ │        │ │            │            │                    │
│ │⚠️ Baixa│ │            │            │                    │
│ │confiança│ │           │            │                    │
│ └────────┘ │            │            │                    │
└────────────┴────────────┴────────────┴────────────────────┘
```

**Legenda:**
- 🔥 = Quente (≥70%), ☀️ = Morno (40-69%), ❄️ = Frio (<40%)
- 📱 = Meta Ads, 🌐 = Orgânico, 🔗 = Link, ❓ = Desconhecido
- 🤖 = Movido automaticamente, ✋ = Movido manualmente
- ⚠️ = Confidence baixa (< 70%)

### 2. Card Details (Ao clicar no card)

```
┌─────────────────────────────────────────────────────────┐
│  João Silva                                    [Fechar] │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📊 CLASSIFICAÇÃO AUTOMÁTICA                            │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Temperatura: 🔥 QUENTE (85%)                       │ │
│  │ Origem: 📱 Meta Ads (Instagram)                    │ │
│  │ Confiança: 85% (Alta)                              │ │
│  │ Método: Regras Heurísticas                         │ │
│  │                                                    │ │
│  │ Sinais Detectados:                                 │ │
│  │ ✅ Respondeu em < 2 min (3x)                       │ │
│  │ ✅ Mencionou "quanto custa"                        │ │
│  │ ✅ 5 mensagens em 10 min                           │ │
│  │ ✅ ctwa_clid detectado                             │ │
│  │                                                    │ │
│  │ [🔄 Reclassificar com IA] [✏️ Override Manual]     │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  💬 HISTÓRICO DE CONVERSA                               │
│  [últimas 10 mensagens...]                              │
│                                                          │
│  📈 HISTÓRICO DE SCORE                                  │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 19/02 10:30 - Criado: Morno (50%) - Auto          │ │
│  │ 19/02 10:35 - Movido para Quente (85%) - Auto     │ │
│  │ Motivo: Engagement alto + keyword "quanto custa"  │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 3. Analytics Dashboard (Nova Página)

```
┌─────────────────────────────────────────────────────────────┐
│  CRM Analytics                                   [Exportar] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📊 OVERVIEW (Últimos 30 dias)                              │
│  ┌──────────────┬──────────────┬──────────────┐            │
│  │ Total Leads  │ Taxa Quente  │ Conversão    │            │
│  │     247      │     32%      │    18%       │            │
│  └──────────────┴──────────────┴──────────────┘            │
│                                                              │
│  🎯 DISTRIBUIÇÃO POR TEMPERATURA                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 🔥 Quentes: 79 (32%)  ████████░░░░░░░░░░░░░░░░░░░░░░ │ │
│  │ ☀️ Mornos:  123 (50%) ██████████████░░░░░░░░░░░░░░░░ │ │
│  │ ❄️ Frios:   45 (18%)  ████░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  🌐 ORIGEM DOS LEADS                                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 📱 Meta Ads:        145 (59%)                          │ │
│  │ 🌐 Orgânico:         68 (28%)                          │ │
│  │ 🔗 Link/UTM:         24 (10%)                          │ │
│  │ ❓ Desconhecido:     10 (3%)                           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  🤖 PERFORMANCE DA AUTOMAÇÃO                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Classificações Automáticas: 237/247 (96%)             │ │
│  │ Confiança Média: 78%                                   │ │
│  │ Overrides Manuais: 10 (4%)                             │ │
│  │ Uso de IA: 23 (9%) - R$ 0,07 gastos                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ⏱️ TEMPO MÉDIO POR COLUNA                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Novo Lead → Qualificando: 2.3 dias                    │ │
│  │ Qualificando → Proposta:  5.7 dias                    │ │
│  │ Proposta → Fechado:       8.2 dias                    │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 4. Settings - Automação (Nova Seção)

```
┌─────────────────────────────────────────────────────────────┐
│  Configurações > Automação CRM                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🤖 CLASSIFICAÇÃO AUTOMÁTICA                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ [✓] Habilitar classificação automática de temperatura │ │
│  │ [✓] Auto-movimentar cards entre colunas               │ │
│  │                                                        │ │
│  │ Confiança mínima para auto-mover:                     │ │
│  │ [━━━━━●━━━━] 75%                                       │ │
│  │                                                        │ │
│  │ [ ] Habilitar classificação com IA (BETA)             │ │
│  │     Custo estimado: R$ 0,003/lead                     │ │
│  │     Limite mensal: [1000] classificações              │ │
│  │     Usar IA quando confiança < [70]%                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  🎯 REGRAS DE TEMPERATURA                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 🔥 QUENTE (≥70 pontos):                                │ │
│  │ [✓] Resposta em < 2 min (peso: 30%)                   │ │
│  │ [✓] Keywords compra (peso: 35%)                       │ │
│  │ [✓] Engagement alto (peso: 25%)                       │ │
│  │ [✓] Recência (peso: 10%)                              │ │
│  │                                                        │ │
│  │ ☀️ MORNO (40-69 pontos):                               │ │
│  │ [✓] Resposta em 2-10 min                              │ │
│  │ [✓] Keywords interesse                                │ │
│  │                                                        │ │
│  │ ❄️ FRIO (<40 pontos):                                  │ │
│  │ [✓] Resposta > 10 min                                 │ │
│  │ [✓] Inatividade > 24h                                 │ │
│  │                                                        │ │
│  │ [Editar Keywords] [Restaurar Padrões]                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  📊 REGRAS DE AUTO-MOVIMENTAÇÃO                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Coluna "Qualificando":                                 │ │
│  │ [✓] Mover se temperatura = Quente + confiança ≥75%    │ │
│  │ [✓] Mover se mencionou "preço" ou "quanto custa"      │ │
│  │                                                        │ │
│  │ Coluna "Proposta":                                     │ │
│  │ [✓] Mover se pediu "proposta" ou "orçamento"          │ │
│  │ [ ] Mover se temperatura = Quente + 3+ mensagens      │ │
│  │                                                        │ │
│  │ Coluna "Frio":                                         │ │
│  │ [✓] Mover se inativo por [7] dias                     │ │
│  │ [✓] Mover se temperatura = Frio + confiança ≥80%      │ │
│  │                                                        │ │
│  │ [Adicionar Regra] [Testar Regras]                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  [Salvar Configurações] [Cancelar]                          │
└─────────────────────────────────────────────────────────────┘
```

---

## IMPLEMENTATION PHASES - ROADMAP REALISTA

### PHASE 1: FOUNDATION (Semana 1-2) - PRIORIDADE MÁXIMA

**Goal:** Classificação heurística funcionando + UI básica

**Tasks:**
1. ✅ Criar migrations (lead_scores, classification_logs, functions)
2. ✅ Implementar `calculateLeadTemperature()` (regras heurísticas)
3. ✅ Implementar `classifyLeadSource()` (detecção origem)
4. ✅ Integrar no `chatbotFlow.ts` (NODE 14)
5. ✅ UI: Adicionar badges de temperatura nos cards CRM
6. ✅ UI: Adicionar filtros por temperatura
7. ✅ Testar com 100 conversas reais

**Deliverables:**
- Sistema classifica leads automaticamente (sem IA)
- Dashboard mostra temperatura + origem
- Confiança visível para usuário

**Risk:** Acurácia < 70% → Ajustar pesos das regras

---

### PHASE 2: AUTO-MOVE (Semana 3) - ALTA PRIORIDADE

**Goal:** Cards se movem automaticamente entre colunas

**Tasks:**
1. ✅ Criar migration `auto_move_card_function.sql`
2. ✅ Implementar `autoMoveCard()` node
3. ✅ Criar `crm-column-rules.ts` com regras default
4. ✅ UI: Settings page para configurar regras
5. ✅ UI: Indicador "🤖 Auto" nos cards movidos
6. ✅ Log de movimentações no `crm_activity_log`

**Deliverables:**
- Cards movem automaticamente baseado em regras
- Usuário pode configurar threshold de confiança
- Histórico de movimentações visível

**Risk:** Movimentações erradas → Adicionar botão "Desfazer"

---

### PHASE 3: ANALYTICS (Semana 4) - MÉDIA PRIORIDADE

**Goal:** Dashboard de analytics completo

**Tasks:**
1. ✅ Criar página `/dashboard/crm/analytics`
2. ✅ Gráficos de distribuição (temperatura, origem)
3. ✅ Métricas de performance (taxa conversão, tempo médio)
4. ✅ Relatório de uso de automação
5. ✅ Export para CSV

**Deliverables:**
- Visão executiva do CRM
- Identificação de gargalos
- Insights acionáveis

**Risk:** Performance de queries → Criar materialized views

---

### PHASE 4: AI REFINEMENT (Semana 5-6) - BAIXA PRIORIDADE (OPCIONAL)

**Goal:** IA para casos ambíguos

**Tasks:**
1. ✅ Implementar `classifyLeadWithAI()` com GPT-4o-mini
2. ✅ Criar budget control (`ai-classification-budget.ts`)
3. ✅ UI: Toggle "Habilitar IA" em Settings
4. ✅ UI: Botão "🔄 Reclassificar com IA" em card details
5. ✅ A/B test: Regras vs. IA (acurácia)

**Deliverables:**
- IA classifica apenas casos confidence < 70%
- Custo controlado (< R$ 30/mês)
- Comparação de acurácia

**Risk:** Custo alto → Limitar a 100 classificações/mês inicial

---

### PHASE 5: MACHINE LEARNING (Futuro - Não Recomendado Agora)

**Goal:** Sistema aprende com correções manuais

**Why NOT Now:**
- Precisa de 1000+ exemplos classificados
- Complexidade de deployment (model hosting)
- Custo de infraestrutura (GPU para inferência?)
- Manutenção contínua (retraining pipeline)

**Recomendação:** Esperar 6 meses de dados antes de considerar ML

---

## RISCOS E MITIGAÇÕES

### RISCO #1: Custo de IA Explosivo

**Cenário Ruim:**
- Cliente ativa IA para 100% dos leads
- 500 conversas/dia × R$ 0,003 = R$ 1,50/dia = R$ 45/mês
- 10 clientes = R$ 450/mês APENAS em classificação

**Mitigação:**
- ✅ Default: DESABILITADO (opt-in)
- ✅ Limite mensal de 1000 classificações por cliente
- ✅ Usar IA apenas se confidence < 70%
- ✅ Alertar cliente quando atingir 80% do limite
- ✅ Hard limit: Bloquear IA se exceder budget

### RISCO #2: Classificação Errada (Falso Positivo)

**Cenário Ruim:**
- Lead frio classificado como quente
- Movido para "Proposta" automaticamente
- Vendedor perde tempo com lead ruim

**Mitigação:**
- ✅ Threshold alto para auto-move (75%+ confidence)
- ✅ Não mover para "Fechado" automaticamente (sempre manual)
- ✅ Botão "Override Manual" visível
- ✅ Log de todas movimentações (permite análise)
- ✅ Notificar usuário quando confidence < 70%

### RISCO #3: Performance do Webhook

**Cenário Ruim:**
- Adicionar classificação = +3s ao fluxo
- Webhook Meta timeout (20s)
- Mensagens não processadas

**Mitigação:**
- ✅ Classificação heurística = queries SQL rápidas (< 200ms)
- ✅ IA apenas assíncrona (job queue separado)
- ✅ Cache de scores (TTL 1h)
- ✅ Fallback: Se classificação falhar, continua fluxo normal

### RISCO #4: Detecção de Origem Imprecisa

**Cenário Ruim:**
- Google Ads não detectável (sem referral data)
- Classificação "Orgânico" quando era anúncio
- Métricas de ROI incorretas

**Mitigação:**
- ✅ Adicionar pergunta do bot: "Como nos conheceu?" (capture manual)
- ✅ Permitir override manual de origem
- ✅ Documentar limitações para usuário
- ✅ Usar heurísticas (se menciona "anúncio" = provável anúncio)

### RISCO #5: Overengineering

**Cenário Ruim:**
- Gastamos 6 semanas implementando ML complexo
- Usuário só usa filtros básicos
- ROI negativo (custo desenvolvimento > benefício)

**Mitigação:**
- ✅ MVP: Apenas regras heurísticas (FASE 1)
- ✅ Medir uso antes de adicionar IA (FASE 4)
- ✅ IA apenas se usuário pedir
- ✅ Focar em funcionalidades que usuário usa diariamente

---

## CUSTO TOTAL ESTIMADO

### Desenvolvimento (Horas)

| Fase | Tarefas | Horas Dev | Custo (R$ 100/h) |
|------|---------|-----------|------------------|
| FASE 1 | Foundation (migrations + heuristics + UI) | 24h | R$ 2.400 |
| FASE 2 | Auto-Move (rules + settings) | 16h | R$ 1.600 |
| FASE 3 | Analytics (dashboard) | 12h | R$ 1.200 |
| FASE 4 | AI Refinement (opcional) | 20h | R$ 2.000 |
| Testing | QA + Ajustes | 8h | R$ 800 |
| **TOTAL** | **MVP (Fase 1-3)** | **60h** | **R$ 6.000** |
| **TOTAL** | **Com IA (Fase 1-4)** | **80h** | **R$ 8.000** |

### Operacional (Mensal por Cliente)

| Item | Custo Unitário | Uso Mensal | Total |
|------|----------------|------------|-------|
| Classificação Heurística | R$ 0 | ∞ | R$ 0 |
| IA Classification (opt-in) | R$ 0,003/lead | 500 leads | R$ 1,50 |
| Database Storage | R$ 0,001/MB | 10 MB | R$ 0,01 |
| Queries SQL | Incluído Supabase | - | R$ 0 |
| **TOTAL/mês** | - | - | **R$ 1,51** |

**Conclusão:** Sistema é VIÁVEL financeiramente

---

## RECOMENDAÇÃO FINAL - DECISÃO CRÍTICA

### O QUE IMPLEMENTAR:

**✅ SIM - RECOMENDO FORTEMENTE:**
1. **FASE 1: Classificação Heurística** (Regras + UI)
   - ROI ALTO: Resolve 80% do problema com 0% de custo recorrente
   - Tempo: 2 semanas
   - Risco: Baixo

2. **FASE 2: Auto-Move** (Movimentação automática)
   - ROI ALTO: Economiza horas de trabalho manual
   - Tempo: 1 semana
   - Risco: Médio (mitigado com threshold alto)

3. **FASE 3: Analytics** (Dashboard)
   - ROI MÉDIO: Insights valiosos, mas não crítico
   - Tempo: 1 semana
   - Risco: Baixo

**⚠️ TALVEZ - AVALIAR DEPOIS:**
4. **FASE 4: IA** (GPT-4o para refinamento)
   - ROI INCERTO: Depende de quantos casos confidence < 70%
   - Implementar APENAS se:
     - Usuário reclama de acurácia das regras
     - Tem orçamento para R$ 30-50/mês extras
     - Está disposto a ajustar prompts
   - Tempo: 2 semanas
   - Risco: Alto (custo pode explodir)

**❌ NÃO - NÃO RECOMENDO AGORA:**
5. **Machine Learning Próprio**
   - ROI NEGATIVO: Custo > Benefício neste estágio
   - Esperar 6-12 meses de dados
   - Requer infraestrutura complexa

### PLANO DE AÇÃO RECOMENDADO:

**SPRINT 1 (Semana 1-2):**
- Implementar FASE 1 completa
- Testar com 100 conversas reais
- Ajustar pesos das regras baseado em feedback

**SPRINT 2 (Semana 3):**
- Implementar FASE 2 (Auto-Move)
- Configurar regras conservadoras (threshold 80%)
- Monitorar por 1 semana

**SPRINT 3 (Semana 4):**
- Implementar FASE 3 (Analytics)
- Coletar métricas de acurácia
- Decisão: Vale a pena adicionar IA?

**DEPOIS (Opcional):**
- Se acurácia < 70% → Implementar FASE 4 (IA)
- Se acurácia > 70% → Manter apenas regras

---

## PRÓXIMOS PASSOS - CHECKLIST

**ANTES DE IMPLEMENTAR:**
- [ ] Revisar este plano com stakeholders
- [ ] Validar se orçamento de 60h está aprovado
- [ ] Definir métricas de sucesso (ex: 75% acurácia mínima)
- [ ] Preparar conjunto de 100 conversas reais para teste

**SPRINT 1 - COMEÇAR:**
- [ ] Criar branch `feature/crm-automation`
- [ ] Criar migrations (lead_scores, functions)
- [ ] Implementar nodes (calculateLeadTemperature, classifyLeadSource)
- [ ] Integrar no chatbotFlow.ts
- [ ] Adicionar badges UI nos cards
- [ ] Testar com dados reais
- [ ] Code review + merge

**IMPORTANTE:**
- Começar SIMPLES (regras heurísticas)
- Medir tudo (logs, analytics)
- Iterar baseado em dados reais
- NÃO adicionar IA até validar necessidade

---

**FIM DO PLANO**

**Última Atualização:** 2026-02-19
**Autor:** Senior Developer Assessment
**Status:** Pronto para Revisão e Aprovação

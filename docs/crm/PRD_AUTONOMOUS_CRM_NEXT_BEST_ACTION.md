# PRD — Autonomous CRM + Next Best Action Engine

**Status:** Proposta / não implementado
**Autor original da ideia:** sessão de brainstorm com agente de IA sobre o produto
**Revisão e refinamentos técnicos:** Claude Code, a partir da leitura do código atual
**Depende de:** `crm_cards`, `crm_columns`, `crm_scheduled_actions`, `crm_action_dlq`, `crm-automation-engine.ts`, `extractContactDataFallback.ts`, `direct-ai-client.ts`

---

## 1. Contexto

O UzzApp já tem um CRM funcional (Kanban por `crm_cards`/`crm_columns`), um motor de automação por regras (`crm-automation-engine.ts`) com trigger de inatividade, agendamento de ações (`crm_scheduled_actions`), DLQ e retry, e um extrator de dados via IA (`extractContactDataFallback.ts`) hoje hardcoded para um vertical específico (yoga).

Essa infraestrutura resolve **execução**. O que falta é **decisão**: hoje o CRM depende do vendedor preencher produto, valor, estágio, objeção e próxima ação manualmente. Quando ele não preenche, o CRM mente. E o follow-up é uma régua fixa (inativo N dias → mensagem), igual para todo lead, independente do que ele disse.

## 2. Objetivo

Fazer a conversa ser a fonte primária de verdade do CRM, e transformar "quando/o que fazer com esse lead" de decisão manual do vendedor em uma recomendação (e depois execução) gerada pelo sistema, com o mínimo de invenção de precisão que os dados não sustentam.

## 3. Visão do produto

### 3.1 Autonomous CRM

O CRM se atualiza sozinho a partir da conversa: produto de interesse, estágio comercial, temperatura, objeção, timing de compra, valor potencial e resumo da oportunidade nascem da extração automática, não de preenchimento manual.

**Importante:** a coluna do Kanban (`crm_columns`) continua existindo para organização visual do funil, mas passa a existir uma camada de inteligência mais granular por baixo dela — dois cards na coluna "Negociação" podem ter score 90 e score 31, e isso precisa ficar visível.

### 3.2 Next Best Action Engine

Renomeado a partir da ideia original de "Smart Follow-up". O follow-up é **uma** das ações possíveis, não a única. Dado o estado de um lead, o sistema decide qual é a melhor ação agora — que pode ser esperar, notificar um vendedor, agendar retorno, ou não fazer nada.

## 4. Arquitetura conceitual

```
CONVERSA (WhatsApp)
    ↓
EXTRAÇÃO DE FATOS (IA extrai; não decide nada)
    ↓
LEAD INTELLIGENCE PROFILE (fatos + score calculado em código)
    ↓
NEXT BEST ACTION ENGINE (decide a ação, com base no profile)
    ↓
FOLLOW-UP PLAN (se a ação for follow-up: quando, quantas tentativas, quando parar)
    ↓
POLICY / GUARDRAILS (janela de 24h WhatsApp, orçamento de insistência, nível de autonomia do cliente)
    ↓
CRM AUTOMATION ENGINE (motor já existente: crm_scheduled_actions, DLQ, retry)
    ↓
AÇÃO EXECUTADA
```

Princípio central: **a IA extrai e planeja; código determinístico calcula e executa.** Isso é o que torna o sistema auditável — nenhuma etapa crítica de negócio (mover para "Ganho", disparar mensagem, calcular o score) fica dependente de a IA "decidir certo" na hora.

## 5. Princípios de design (refinamentos sobre a ideia original)

Estes pontos não estavam no brainstorm original ou foram ajustados depois de olhar o código existente:

### 5.1 Fato vs. inferência, sempre rotulado

Todo campo do Lead Intelligence Profile tem uma origem: `fact` (extraído literalmente da conversa) ou `inference` (estimado pela IA/heurística). A UI mostra isso de forma diferente (ex: "Produto: Plano 3x — confirmado pela conversa" vs "Probabilidade: 78% — estimativa do UzzApp"). Sem essa distinção, um erro de inferência é lido pelo vendedor como um erro de fato, e a confiança no produto cai mais rápido do que deveria.

### 5.2 O score é fórmula determinística sobre fatos extraídos — a IA nunca inventa o número direto

A IA (LLM) só extrai fatos estruturados da mensagem (`mencionou_preco: true`, `mencionou_horario: true`, `tempo_resposta_segundos: 240`, `objecao: "decisao_conjunta"`). O cálculo do score é uma função em código puro sobre esses fatos (pesos configuráveis por vertical — ver 5.4). Isso resolve dois problemas do design original:

- O breakdown explicativo ("+20 perguntou preço, +15 perguntou disponibilidade...") fica **garantidamente correto**, porque é aritmética, não uma "explicação" que o LLM gera depois sobre a própria decisão (explicação pós-hoc de LLM não é garantida de refletir o processo real que gerou o número).
- Fica trivial fazer o score evoluir para pesos aprendidos (5.4) sem reescrever a extração.

### 5.3 Precisão de exibição não deve exceder a precisão do sinal

O plano original propõe números como "Probabilidade: 78%" e "Confiança da IA: 94%" desde o primeiro dia. Isso implica um modelo calibrado com histórico de vendas ganhas/perdidas — que o produto não tem ainda. Recomendação:

- **Lead Score (0–100):** mantém-se numérico. Serve para ranquear/priorizar, não para prometer uma probabilidade estatística.
- **Probabilidade de fechamento e confiança da IA:** em v1, exibir como faixa qualitativa (`alta` / `média` / `baixa`), nunca como percentual com duas casas de precisão. Só vira percentual calibrado quando houver volume de resultados reais (ganho/perda) suficiente por vertical (ver 5.4) para validar que o número significa algo.

### 5.4 Aprendizado de pesos por vertical precisa ser cross-tenant, não por cliente

Uma academia sozinha gera dezenas de leads por mês — não há volume para treinar peso nenhum isoladamente. Para o "score por vertical que aprende com resultados reais" (ideia forte do brainstorm) funcionar, os sinais precisam ser agregados entre todos os clientes do mesmo vertical (todas as academias, todas as imobiliárias), de forma anonimizada. Isso é uma decisão de produto e dados que precisa ser explícita e comunicada aos clientes (ninguém deveria descobrir depois que o comportamento dos próprios leads ajuda a treinar um modelo compartilhado com concorrentes) — não é só detalhe técnico, é LGPD e é confiança comercial.

- v1: pesos fixos por vertical, calibrados manualmente (heurística + revisão humana).
- v2+: pesos ajustados com dados agregados por vertical, apenas depois de massa crítica de conversões.

### 5.5 A janela de 24h do WhatsApp é um guardrail de arquitetura, não um detalhe de implementação

A API da Meta só permite mensagem de texto livre dentro de 24h da última mensagem do cliente. Fora disso, só template pré-aprovado (texto fixo, sem geração livre por IA, com custo por envio). Como a maioria dos follow-ups planejados por este sistema ("amanhã 18h", "72h depois", "mês que vem") vai cair fora dessa janela quase sempre, o **Follow-up Plan não pode assumir que vai gerar mensagem livre por IA na hora de executar**. A camada de Policy/Guardrails precisa decidir, no momento da execução: dentro da janela → mensagem livre; fora da janela → template aprovado (com variáveis, não texto solto). Isso precisa estar no desenho desde a Fase 3 (assistido), não ser descoberto na Fase 4/5.

### 5.6 Resumo comercial em prosa é vitrine, nunca fonte de automação

O resumo em texto ("João procura um plano 3x/semana...") é para leitura humana. O Next Best Action Engine deve sempre ler os campos estruturados do Lead Intelligence Profile, nunca reprocessar o resumo em prosa — evita empilhar inferência sobre inferência (uma IA interpretando o texto que outra IA escreveu sobre os fatos).

### 5.7 "Ganho" continua exigindo evento objetivo

Mantém a filosofia já existente no projeto: mover um card para Ganho exige pagamento confirmado, contrato, matrícula ou confirmação humana — nunca "a IA achou que ele comprou". A IA pode mover entre estágios de qualificação (Novo → Qualificado → Negociação), nunca fechar venda sozinha.

### 5.8 Orçamento de insistência (stop conditions)

Todo Follow-up Plan tem um número máximo de tentativas sem resposta (recomendação inicial: 2–3). Depois disso, o lead sai do fluxo ativo e entra em nurturing/reativação (cadência muito mais espaçada, ou pausa total). Isso não é só sobre experiência do lead — insistência excessiva aumenta taxa de bloqueio/denúncia no WhatsApp, o que degrada a *quality rating* do número na Meta e pode limitar o volume de mensagens que a conta consegue enviar. É proteção de infraestrutura, não só de marca.

### 5.9 Autonomia em 3 níveis, por cliente

| Nível | Comportamento |
| --- | --- |
| **Assistido** | UzzApp recomenda ("Follow-up amanhã 18h — Aprovar?"), vendedor decide |
| **Semi-autônomo** | UzzApp agenda automaticamente; vendedor pode cancelar/alterar antes da execução |
| **Autônomo** | UzzApp executa sozinho, dentro de políticas configuradas pelo cliente |

Todo cliente começa em Assistido. A promoção de nível é uma decisão do cliente (ou automática após N execuções aprovadas sem alteração), nunca padrão do sistema.

## 6. Modelo de dados (proposta)

Reaproveita o que já existe (`crm_cards`, `crm_columns`, `crm_scheduled_actions`, `crm_action_dlq`) e adiciona uma tabela de inteligência 1:1 com o card, para não sobrecarregar `crm_cards` com campos voláteis recalculados a cada mensagem:

```sql
-- Perfil de inteligência do lead — 1:1 com crm_cards
CREATE TABLE crm_card_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES crm_cards(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,

  -- FATOS (extraídos literalmente da conversa, origem: 'fact')
  interested_product TEXT,
  desired_schedule TEXT,
  decision_maker TEXT,           -- ex: "cliente + esposa"
  objection_type TEXT,           -- ex: "decisao_conjunta", "preco", "comparando_concorrente"
  budget_signal TEXT,

  -- INFERÊNCIAS (calculadas, origem: 'inference')
  lead_score INTEGER CHECK (lead_score BETWEEN 0 AND 100),
  lead_score_breakdown JSONB,    -- [{ "signal": "perguntou_preco", "points": 20 }, ...]
  temperature TEXT CHECK (temperature IN ('quente', 'morno', 'frio')),
  probability_band TEXT CHECK (probability_band IN ('alta', 'media', 'baixa')), -- ver 5.3
  purchase_timing TEXT,          -- ex: "imediato", "1-2 dias", "mes_que_vem"
  urgency TEXT CHECK (urgency IN ('alta', 'media', 'baixa')),

  -- RESUMO (vitrine, nunca fonte de automação — ver 5.6)
  commercial_summary TEXT,

  -- NEXT BEST ACTION
  next_action TEXT,              -- enum, ver seção 7
  next_action_reason TEXT,
  next_action_scheduled_at TIMESTAMPTZ,

  scoring_version TEXT NOT NULL, -- versão dos pesos/vertical usados (auditoria)
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_card_intelligence_card ON crm_card_intelligence(card_id);
CREATE INDEX idx_crm_card_intelligence_client_temp ON crm_card_intelligence(client_id, temperature);

-- Pesos de scoring por vertical (v1: fixos; v2+: ajustados por agregação cross-tenant, ver 5.4)
CREATE TABLE crm_scoring_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical TEXT NOT NULL,        -- 'academia', 'imobiliaria', 'clinica', 'coworking', 'default'
  signal TEXT NOT NULL,          -- 'perguntou_preco', 'pediu_horario', 'respondeu_rapido', ...
  points INTEGER NOT NULL,
  version TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vertical, signal, version)
);

-- Plano de follow-up — vinculado a uma ação agendada existente
CREATE TABLE crm_followup_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES crm_cards(id) ON DELETE CASCADE,
  scheduled_action_id UUID REFERENCES crm_scheduled_actions(id) ON DELETE SET NULL,

  objective TEXT NOT NULL,           -- ex: "retomar_decisao"
  reason TEXT NOT NULL,
  strategy TEXT NOT NULL CHECK (strategy IN ('baixa_pressao', 'padrao', 'alta_prioridade')),
  max_attempts INTEGER NOT NULL DEFAULT 2,
  attempts_made INTEGER NOT NULL DEFAULT 0,
  interval_after_attempt_hours INTEGER,
  stop_conditions TEXT[] NOT NULL DEFAULT ARRAY['resposta_recebida', 'compra_confirmada', 'pediu_para_nao_contatar'],
  autonomy_level TEXT NOT NULL CHECK (autonomy_level IN ('assistido', 'semi_autonomo', 'autonomo')),

  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'concluido', 'cancelado', 'esgotado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

`extractContactDataFallback.ts` permanece responsável pelos dados cadastrais (nome, CPF, e-mail etc.); o novo pipeline de extração de **metadata comercial** é um nó separado (`extractCommercialMetadata.ts`), com lista de campos parametrizável por vertical em vez de hardcoded — essa generalização é pré-requisito técnico, não algo que já existe hoje.

## 7. Next Best Action — catálogo de ações (v1)

Começar deliberadamente pequeno (o brainstorm original já sugeria isso, e eu concordo):

| Ação | Quando |
| --- | --- |
| `aguardar` | Lead deu prazo próprio (ex: "te confirmo amanhã") |
| `agendar_followup` | Lead esfriando ou prazo dado passou |
| `notificar_vendedor` | Lead muito quente, ou pediu algo que exige humano (proposta formal, condição especial) |
| `transferir_humano` | Lead comparando concorrentes, ou objeção que a IA não deve tentar resolver sozinha |
| `nenhuma_acao` | Sem sinal suficiente para agir |

Novas ações (proposta formal automática, consulta de agenda, etc.) entram em fases posteriores, não na v1.

## 8. Roadmap faseado

1. **CRM Observacional** — extração de fatos + score + temperatura + resumo. **Não envia nada sozinho.** Objetivo: validar se a extração está correta antes de automatizar qualquer ação.
2. **Next Best Action restrito** — as 5 ações da seção 7, modo Assistido apenas (recomenda, vendedor aprova).
3. **Follow-up assistido** — gera o Follow-up Plan e a mensagem sugerida; vendedor aprova antes de enviar. Guardrail da janela de 24h (5.5) já precisa estar implementado aqui.
4. **Semi-autônomo** — UzzApp agenda sozinho; vendedor pode cancelar/alterar antes da execução.
5. **Autônomo** — execução sem aprovação, dentro das políticas configuradas pelo cliente (orçamento de insistência, horário permitido, etc.).

Pesos de scoring aprendidos por vertical (5.4) e loop fechado de aprendizado (estratégia A vs B por taxa de conversão) só entram depois da Fase 3 estar validada com clientes reais — construir essa infraestrutura antes disso é prematuro, mesmo com traces/ground truth/A-B já existindo no projeto.

## 9. Riscos e mitigação

| Risco | Mitigação |
| --- | --- |
| Score/probabilidade erra e usuário perde confiança na feature inteira | Faixas qualitativas em vez de percentual falso-preciso (5.3); breakdown determinístico e auditável (5.2) |
| Follow-up automático vira spam / degrada quality rating do WhatsApp | Orçamento de insistência obrigatório (5.8); stop conditions explícitas |
| Mensagem de follow-up gerada fora da janela de 24h falha silenciosamente | Guardrail de janela como parte do Policy layer, não decisão ad-hoc (5.5) |
| Dados insuficientes por tenant para "aprender" pesos | Agregação cross-tenant por vertical, com decisão explícita de privacidade (5.4) |
| Custo de IA por atualização de metadata a cada mensagem | Rodar extração por batch de conversa (já existe padrão de batching no fluxo principal), não por mensagem individual |
| Inferir dados sensíveis (decisor familiar, situação financeira) e reter indefinidamente | Tratar como dado pessoal sob LGPD, mesmo sendo inferido — mesma política de retenção/exclusão dos campos cadastrais explícitos |

## 10. Métricas de sucesso

- Fase 1: % de fatos extraídos validados como corretos por revisão humana amostral (meta inicial: acordar um limiar com o time antes de avançar para Fase 2).
- Fase 2–3: % de recomendações de Next Best Action aprovadas sem alteração pelo vendedor.
- Fase 4–5: taxa de resposta e conversão dos follow-ups executados pelo sistema vs. régua fixa antiga (inatividade 3/7 dias).

## 11. Fora de escopo nesta versão

- Percentual de probabilidade calibrado estatisticamente (só depois de massa crítica de dados por vertical).
- Geração automática de proposta comercial ou integração com agenda (ficam no catálogo de ações futuro).
- Fechamento automático de venda ("Ganho") por inferência da IA — sempre evento objetivo.
- Pesos de score aprendidos automaticamente (v1 é heurística fixa revisada manualmente).

# Plano de Implementação: Funcionalidades BotConversa

Este documento apresenta uma análise completa das funcionalidades do **BotConversa** (https://botconversa.com.br/) e um plano técnico detalhado para implementação no nosso sistema de chatbot WhatsApp.

---

## 📋 Índice

1. [Resumo Executivo](#1-resumo-executivo)
2. [Comparativo: Estado Atual vs BotConversa](#2-comparativo-estado-atual-vs-botconversa)
3. [Funcionalidades Detalhadas](#3-funcionalidades-detalhadas)
   - 3.1 [Construtor de Fluxos Visual (Drag & Drop)](#31-construtor-de-fluxos-visual-drag--drop)
   - 3.2 [Sistema de Campanhas e Broadcast](#32-sistema-de-campanhas-e-broadcast)
   - 3.3 [Sequências Automatizadas](#33-sequências-automatizadas)
   - 3.4 [Sistema de Etiquetas/Tags](#34-sistema-de-etiquetastags)
   - 3.5 [Segmentação de Audiência](#35-segmentação-de-audiência)
   - 3.6 [Live Chat (Atendimento Humano)](#36-live-chat-atendimento-humano)
   - 3.7 [CRM Integrado](#37-crm-integrado)
   - 3.8 [Dashboard de Métricas e KPIs](#38-dashboard-de-métricas-e-kpis)
   - 3.9 [Gatilhos e Automações](#39-gatilhos-e-automações)
   - 3.10 [Templates e Modelos](#310-templates-e-modelos)
   - 3.11 [QR Codes e Links Diretos](#311-qr-codes-e-links-diretos)
   - 3.12 [API Pública e Webhooks](#312-api-pública-e-webhooks)
   - 3.13 [Respostas Rápidas](#313-respostas-rápidas)
   - 3.14 [Integração com IA (ChatGPT)](#314-integração-com-ia-chatgpt)
4. [Priorização e Roadmap](#4-priorização-e-roadmap)
5. [Estimativas de Desenvolvimento](#5-estimativas-de-desenvolvimento)
6. [Requisitos Técnicos](#6-requisitos-técnicos)
7. [Riscos e Mitigações](#7-riscos-e-mitigações)

---

## 1. Resumo Executivo

O **BotConversa** é uma plataforma SaaS brasileira focada em automação de atendimento e vendas via WhatsApp. Oferece funcionalidades como:

- Construtor visual de fluxos (drag & drop)
- Campanhas em massa (broadcast)
- Sequências automatizadas
- Sistema de etiquetas e segmentação
- Live chat para atendimento humano
- CRM integrado com funil de vendas
- Dashboard de métricas em tempo real
- API pública para integrações

### O que já temos implementado:

| Funcionalidade | Status Atual |
|----------------|--------------|
| Webhook multi-tenant | ✅ Completo |
| Processamento de mensagens (texto, áudio, imagem) | ✅ Completo |
| IA com Groq/OpenAI | ✅ Completo |
| RAG (base de conhecimento) | ✅ Completo |
| Transferência para humano | ✅ Parcial |
| Dashboard de conversas | ✅ Parcial |
| Métricas e analytics | ✅ Básico |
| Notificações real-time | ✅ Completo |
| Autenticação e RBAC | ✅ Completo |

### O que precisamos implementar:

| Funcionalidade | Prioridade |
|----------------|------------|
| Construtor visual de fluxos | 🔴 Alta |
| Sistema de campanhas/broadcast | 🔴 Alta |
| Live chat completo | 🔴 Alta |
| Etiquetas e segmentação | 🟡 Média |
| CRM integrado | 🟡 Média |
| Sequências automatizadas | 🟡 Média |
| Templates de fluxos | 🟢 Baixa |
| QR Codes | 🟢 Baixa |
| API pública | 🟢 Baixa |

---

## 2. Comparativo: Estado Atual vs BotConversa

| Funcionalidade | BotConversa | Nosso Sistema | Gap |
|----------------|-------------|---------------|-----|
| Construtor de fluxos visual | ✅ Drag & Drop completo | ⚠️ Flow Architecture Manager básico | **Implementar editor visual** |
| Campanhas broadcast | ✅ Completo com segmentação | ❌ Não existe | **Implementar do zero** |
| Sequências automatizadas | ✅ Com delays personalizados | ❌ Não existe | **Implementar do zero** |
| Etiquetas/Tags | ✅ Gerenciamento completo | ❌ Apenas status (bot/humano) | **Expandir sistema** |
| Segmentação | ✅ Filtros avançados | ❌ Não existe | **Implementar do zero** |
| Live Chat | ✅ Interface completa | ⚠️ Apenas transferência | **Implementar chat interface** |
| CRM integrado | ✅ Funil de vendas | ❌ Não existe | **Implementar do zero** |
| Dashboard métricas | ✅ Completo em tempo real | ⚠️ Analytics básico | **Expandir métricas** |
| Gatilhos | ✅ Por palavra-chave, evento | ⚠️ Básico | **Expandir sistema** |
| Templates | ✅ Duplicar/compartilhar | ❌ Não existe | **Implementar do zero** |
| QR Codes | ✅ Geração automática | ❌ Não existe | **Implementar do zero** |
| API pública | ✅ Documentada (Swagger) | ❌ Apenas APIs internas | **Expor API pública** |
| Respostas rápidas | ✅ Para atendentes | ❌ Não existe | **Implementar do zero** |
| Integração IA | ✅ ChatGPT | ✅ Groq + OpenAI | **Já implementado** |
| Multi-tenant | ✅ Sim | ✅ Sim | **Já implementado** |
| Transcrição áudio | Não especificado | ✅ Whisper | **Vantagem nossa** |
| Análise de imagens | Não especificado | ✅ GPT-4o Vision | **Vantagem nossa** |
| RAG (Vector Store) | Não especificado | ✅ pgvector | **Vantagem nossa** |

---

## 3. Funcionalidades Detalhadas

### 3.1 Construtor de Fluxos Visual (Drag & Drop)

#### Descrição
Interface visual para criar fluxos de conversa sem programação, usando blocos arrastáveis.

#### O que temos hoje
- Flow Architecture Manager (`/dashboard/flow-architecture`)
- Diagrama Mermaid estático dos 14 nodes
- Configuração de nodes via modal (habilitar/desabilitar)
- Armazenamento em `bot_configurations`

#### O que precisamos implementar

**Frontend:**
```typescript
// Bibliotecas necessárias
// @xyflow/react (editor de fluxos visual)
// zustand (state management)
// shadcn/ui (componentes UI)
```

**Tipos de blocos (nodes):**
```typescript
interface FlowBlock {
  id: string;
  type: 'message' | 'question' | 'condition' | 'action' | 'webhook' | 'ai' | 'delay';
  position: { x: number; y: number };
  data: BlockData;
  connections: string[]; // IDs dos blocos conectados
}

interface BlockData {
  // Para type: 'message'
  messageType?: 'text' | 'image' | 'video' | 'audio' | 'document';
  content?: string;
  mediaUrl?: string;
  
  // Para type: 'question'
  questionText?: string;
  variableName?: string; // Salvar resposta em variável
  buttons?: { label: string; value: string }[];
  
  // Para type: 'condition'
  conditions?: { variable: string; operator: string; value: string; nextBlockId: string }[];
  
  // Para type: 'action'
  actionType?: 'add_tag' | 'remove_tag' | 'set_variable' | 'transfer_human' | 'start_sequence';
  
  // Para type: 'delay'
  delaySeconds?: number;
  
  // Para type: 'ai'
  prompt?: string;
  model?: 'groq' | 'openai';
}
```

**Banco de dados:**
```sql
-- Migration: supabase migration new create_visual_flows

CREATE TABLE public.flow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL, -- 'keyword' | 'qr_code' | 'link' | 'manual' | 'sequence'
  trigger_keywords TEXT[], -- Para trigger_type = 'keyword'
  is_active BOOLEAN DEFAULT true,
  blocks JSONB NOT NULL DEFAULT '[]',
  edges JSONB NOT NULL DEFAULT '[]', -- Conexões entre blocos
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_flow_templates_client ON public.flow_templates(client_id);
CREATE INDEX idx_flow_templates_trigger ON public.flow_templates(trigger_type) WHERE is_active = true;
CREATE INDEX idx_flow_templates_keywords ON public.flow_templates USING GIN(trigger_keywords);
```

**API Routes:**
```typescript
// src/app/api/flows/route.ts
GET /api/flows - Listar fluxos do cliente
POST /api/flows - Criar novo fluxo
PUT /api/flows/[id] - Atualizar fluxo
DELETE /api/flows/[id] - Deletar fluxo
POST /api/flows/[id]/execute - Executar fluxo para um contato
```

**Executor de fluxos:**
```typescript
// src/lib/flowExecutor.ts
export const executeFlow = async (
  flowId: string,
  contactPhone: string,
  context: Record<string, any>
): Promise<void> => {
  // 1. Carregar fluxo do banco
  // 2. Encontrar bloco inicial
  // 3. Executar bloco por bloco seguindo edges
  // 4. Salvar estado do fluxo para o contato (para continuar depois)
  // 5. Lidar com delays (agendar próximo bloco)
}
```

#### Estimativa: 3-4 semanas

---

### 3.2 Sistema de Campanhas e Broadcast

#### Descrição
Enviar mensagens em massa para segmentos de contatos, com agendamento e tracking.

#### O que precisamos implementar

**Banco de dados:**
```sql
-- Migration: supabase migration new create_campaigns

CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'running', 'paused', 'completed', 'failed');

CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status campaign_status DEFAULT 'draft',
  
  -- Conteúdo da mensagem
  message_type TEXT NOT NULL, -- 'text' | 'image' | 'video' | 'document' | 'template'
  message_content TEXT NOT NULL,
  media_url TEXT,
  template_id TEXT, -- Para templates oficiais da Meta
  
  -- Segmentação
  segment_tags TEXT[], -- Filtrar por tags
  segment_query JSONB, -- Query avançada de segmentação
  exclude_tags TEXT[], -- Tags para excluir
  
  -- Agendamento
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Métricas
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_campaigns_client ON public.campaigns(client_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaign_recipients_campaign ON public.campaign_recipients(campaign_id);
CREATE INDEX idx_campaign_recipients_status ON public.campaign_recipients(status);
```

**Dashboard:**
```
/dashboard/campaigns - Lista de campanhas
/dashboard/campaigns/new - Criar campanha
/dashboard/campaigns/[id] - Detalhes e métricas
/dashboard/campaigns/[id]/edit - Editar campanha
```

**Worker para processamento:**
```typescript
// src/lib/campaignWorker.ts
// Usar Vercel Cron ou Supabase Edge Functions

export const processCampaign = async (campaignId: string) => {
  // 1. Buscar campanha
  // 2. Buscar recipientes pendentes (batch de 100)
  // 3. Enviar mensagens via Meta API
  // 4. Atualizar status de cada recipient
  // 5. Atualizar métricas da campanha
  // 6. Respeitar rate limits da Meta (80 msgs/segundo)
}
```

**Rate limiting importante:**
- Meta API: ~80 mensagens/segundo
- Implementar queue com Redis
- Backoff exponencial em caso de erro

#### Estimativa: 2-3 semanas

---

### 3.3 Sequências Automatizadas

#### Descrição
Enviar série de mensagens/fluxos automaticamente com delays configuráveis.

#### O que precisamos implementar

**Banco de dados:**
```sql
-- Migration: supabase migration new create_sequences

CREATE TABLE public.sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Configuração
  steps JSONB NOT NULL DEFAULT '[]',
  /* Estrutura de steps:
  [
    {
      "order": 1,
      "type": "message" | "flow",
      "content": "Olá! Tudo bem?",
      "flow_id": "uuid",
      "delay_minutes": 0
    },
    {
      "order": 2,
      "type": "message",
      "content": "Posso te ajudar com algo?",
      "delay_minutes": 1440  // 24 horas
    }
  ]
  */
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID REFERENCES sequences(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  current_step INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active', -- 'active' | 'completed' | 'paused' | 'cancelled'
  next_step_at TIMESTAMPTZ,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_sequences_client ON public.sequences(client_id);
CREATE INDEX idx_sequence_enrollments_next ON public.sequence_enrollments(next_step_at) 
  WHERE status = 'active';
```

**Cron Job para processar:**
```typescript
// src/app/api/cron/sequences/route.ts
// Executar a cada minuto via Vercel Cron

export async function GET() {
  // 1. Buscar enrollments com next_step_at <= now()
  // 2. Para cada, executar o step atual
  // 3. Atualizar current_step e next_step_at
  // 4. Se último step, marcar como completed
}
```

#### Estimativa: 1-2 semanas

---

### 3.4 Sistema de Etiquetas/Tags

#### Descrição
Organizar contatos com etiquetas para segmentação e automações.

#### O que temos hoje
- Campo `status` em `clientes_whatsapp` (apenas 'bot' | 'humano' | 'transferido')

#### O que precisamos implementar

**Banco de dados:**
```sql
-- Migration: supabase migration new create_tags_system

-- Tabela de tags
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6', -- Cor hex para UI
  description TEXT,
  auto_apply_rules JSONB, -- Regras para aplicação automática
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(client_id, name)
);

-- Relacionamento contato-tags (many-to-many)
CREATE TABLE public.contact_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_phone TEXT NOT NULL,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  applied_at TIMESTAMPTZ DEFAULT now(),
  applied_by TEXT, -- 'manual' | 'automation' | 'flow'
  
  UNIQUE(contact_phone, tag_id, client_id)
);

CREATE INDEX idx_tags_client ON public.tags(client_id);
CREATE INDEX idx_contact_tags_phone ON public.contact_tags(contact_phone);
CREATE INDEX idx_contact_tags_tag ON public.contact_tags(tag_id);
```

**Dashboard:**
```
/dashboard/tags - Gerenciar tags
/dashboard/contacts - Ver contatos com filtro por tags
```

**Integração no fluxo:**
```typescript
// Em chatbotFlow.ts, após processamento
// Adicionar node para aplicar tags automaticamente
// baseado em keywords ou comportamento
```

#### Estimativa: 1 semana

---

### 3.5 Segmentação de Audiência

#### Descrição
Filtrar contatos por critérios múltiplos para campanhas e automações.

#### O que precisamos implementar

**Tipos de segmentos:**
```typescript
interface SegmentCriteria {
  tags?: {
    include?: string[];  // Contatos COM essas tags
    exclude?: string[];  // Contatos SEM essas tags
    logic?: 'AND' | 'OR'; // Lógica entre tags
  };
  
  lastMessageAt?: {
    after?: Date;  // Última mensagem depois de
    before?: Date; // Última mensagem antes de
  };
  
  messageCount?: {
    min?: number;
    max?: number;
  };
  
  status?: ('bot' | 'humano' | 'transferido')[];
  
  customFields?: Record<string, any>; // Campos personalizados
}
```

**Banco de dados:**
```sql
-- Migration: supabase migration new create_segments

CREATE TABLE public.segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  criteria JSONB NOT NULL,
  contact_count INTEGER DEFAULT 0, -- Cache do count
  last_calculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Adicionar campos customizáveis aos contatos
ALTER TABLE public.clientes_whatsapp 
  ADD COLUMN custom_fields JSONB DEFAULT '{}',
  ADD COLUMN last_message_at TIMESTAMPTZ,
  ADD COLUMN message_count INTEGER DEFAULT 0;
```

**Query builder:**
```typescript
// src/lib/segmentBuilder.ts
export const buildSegmentQuery = (criteria: SegmentCriteria): string => {
  // Construir query SQL dinâmica baseada nos critérios
  // Usar prepared statements para segurança
}
```

#### Estimativa: 1-2 semanas

---

### 3.6 Live Chat (Atendimento Humano)

#### Descrição
Interface para atendentes responderem em tempo real.

#### O que temos hoje
- Node `handleHumanHandoff` que transfere para humano
- Email de notificação
- Status 'humano' no contato

#### O que precisamos implementar

**Dashboard de atendimento:**
```
/dashboard/chat - Inbox de conversas em tempo real
```

**Componentes:**
```typescript
// Inbox com lista de conversas pendentes
// Chat view com histórico
// Input para enviar mensagens
// Indicadores de status (typing, online)
// Transferir entre atendentes
// Finalizar atendimento (voltar para bot)
```

**Banco de dados:**
```sql
-- Migration: supabase migration new create_chat_assignments

CREATE TABLE public.chat_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  assigned_to UUID REFERENCES user_profiles(id),
  status TEXT DEFAULT 'open', -- 'open' | 'closed'
  priority TEXT DEFAULT 'normal', -- 'low' | 'normal' | 'high' | 'urgent'
  notes TEXT,
  opened_at TIMESTAMPTZ DEFAULT now(),
  first_response_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  
  UNIQUE(phone, client_id) WHERE status = 'open'
);

CREATE INDEX idx_chat_assignments_agent ON public.chat_assignments(assigned_to) WHERE status = 'open';
```

**Real-time com Supabase:**
```typescript
// Usar Supabase Realtime para notificações
// Quando mensagem chega, notificar atendente
// Quando atendente responde, enviar via Meta API
```

**API para envio:**
```typescript
// src/app/api/chat/send/route.ts
// POST com phone, message
// Enviar via Meta API
// Salvar no histórico
```

#### Estimativa: 2-3 semanas

---

### 3.7 CRM Integrado

#### Descrição
Funil de vendas visual com tracking de leads.

#### O que precisamos implementar

**Banco de dados:**
```sql
-- Migration: supabase migration new create_crm

-- Estágios do funil (customizáveis)
CREATE TABLE public.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  order_index INTEGER NOT NULL,
  is_won BOOLEAN DEFAULT false,
  is_lost BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Deals/Oportunidades
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  phone TEXT NOT NULL, -- Referência ao contato
  title TEXT NOT NULL,
  value DECIMAL(10,2),
  stage_id UUID REFERENCES pipeline_stages(id),
  assigned_to UUID REFERENCES user_profiles(id),
  expected_close_date DATE,
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  won_at TIMESTAMPTZ,
  lost_at TIMESTAMPTZ,
  lost_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Atividades/Timeline
CREATE TABLE public.deal_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'note' | 'call' | 'email' | 'message' | 'stage_change'
  content TEXT,
  metadata JSONB,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_deals_client ON public.deals(client_id);
CREATE INDEX idx_deals_stage ON public.deals(stage_id);
CREATE INDEX idx_deals_phone ON public.deals(phone);
```

**Dashboard:**
```
/dashboard/crm - Visão Kanban do funil
/dashboard/crm/[id] - Detalhes do deal
```

**Integração com chat:**
```typescript
// Quando criar deal, vincular ao contato
// Mostrar deals na conversa
// Atualizar deal baseado em mensagens
```

#### Estimativa: 3-4 semanas

---

### 3.8 Dashboard de Métricas e KPIs

#### Descrição
Métricas em tempo real de atendimento e conversões.

#### O que temos hoje
- Analytics básico (`/dashboard/analytics`)
- Custos de API
- Contagem de mensagens

#### O que precisamos implementar

**Novas métricas:**
```typescript
interface DashboardMetrics {
  // Volume
  totalConversations: number;
  newConversationsToday: number;
  messagesReceived: number;
  messagesSent: number;
  
  // Performance
  averageResponseTime: number; // Em segundos
  firstResponseTime: number;
  resolutionRate: number; // % resolvidos pelo bot
  
  // Atendimento humano
  transfersToHuman: number;
  openHumanChats: number;
  avgHandlingTime: number;
  
  // Engajamento
  activeContacts24h: number;
  returningContacts: number;
  
  // Campanhas
  campaignsSent: number;
  campaignDeliveryRate: number;
  campaignReadRate: number;
  
  // Conversão (se CRM implementado)
  newDeals: number;
  dealsWon: number;
  revenueGenerated: number;
}
```

**Banco de dados:**
```sql
-- Migration: supabase migration new create_metrics_aggregation

-- Tabela para métricas agregadas (evitar calcular sempre)
CREATE TABLE public.daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  metrics JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(client_id, date)
);

-- Criar função para agregar métricas diárias
CREATE OR REPLACE FUNCTION aggregate_daily_metrics(p_client_id UUID, p_date DATE)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_messages', (
      SELECT COUNT(*) FROM messages 
      WHERE client_id = p_client_id 
      AND DATE(created_at) = p_date
    ),
    'total_conversations', (
      SELECT COUNT(DISTINCT phone) FROM messages 
      WHERE client_id = p_client_id 
      AND DATE(created_at) = p_date
    ),
    'transfers_to_human', (
      SELECT COUNT(*) FROM messages 
      WHERE client_id = p_client_id 
      AND DATE(created_at) = p_date
      AND content LIKE '%transferir_atendimento%'
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

**Dashboard expandido:**
```
/dashboard/analytics - Métricas gerais
/dashboard/analytics/conversations - Análise de conversas
/dashboard/analytics/agents - Performance de atendentes
/dashboard/analytics/campaigns - Resultados de campanhas
/dashboard/analytics/reports - Relatórios exportáveis (PDF/Excel)
```

#### Estimativa: 2-3 semanas

---

### 3.9 Gatilhos e Automações

#### Descrição
Executar ações automaticamente baseado em eventos.

#### O que temos hoje
- Gatilho básico por mensagem recebida
- Node de classificação de intent

#### O que precisamos implementar

**Tipos de gatilhos:**
```typescript
interface Trigger {
  id: string;
  type: TriggerType;
  conditions: TriggerCondition[];
  actions: TriggerAction[];
}

type TriggerType = 
  | 'keyword'       // Palavra-chave específica
  | 'first_message' // Primeira mensagem do contato
  | 'inactivity'    // Sem resposta por X minutos
  | 'tag_added'     // Tag adicionada
  | 'tag_removed'   // Tag removida
  | 'time_based'    // Horário específico
  | 'webhook'       // Evento externo

interface TriggerAction {
  type: 'send_message' | 'start_flow' | 'add_tag' | 'remove_tag' 
      | 'assign_agent' | 'start_sequence' | 'call_webhook';
  params: Record<string, any>;
}
```

**Banco de dados:**
```sql
-- Migration: supabase migration new create_automations

CREATE TABLE public.automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL,
  conditions JSONB DEFAULT '[]',
  actions JSONB NOT NULL,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_automations_client ON public.automations(client_id) WHERE is_active = true;
CREATE INDEX idx_automations_trigger ON public.automations(trigger_type) WHERE is_active = true;
```

**Motor de automações:**
```typescript
// src/lib/automationEngine.ts
export const checkAndExecuteAutomations = async (
  event: TriggerEvent,
  clientId: string
) => {
  // 1. Buscar automações ativas do cliente
  // 2. Filtrar por trigger_type correspondente
  // 3. Verificar conditions
  // 4. Executar actions
}
```

#### Estimativa: 2 semanas

---

### 3.10 Templates e Modelos

#### Descrição
Salvar e reutilizar fluxos, mensagens e configurações.

#### O que precisamos implementar

**Banco de dados:**
```sql
-- Migration: supabase migration new create_templates

CREATE TABLE public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT, -- 'greeting' | 'faq' | 'promotion' | 'follow_up'
  content TEXT NOT NULL,
  media_type TEXT, -- 'text' | 'image' | 'video' | 'document'
  media_url TEXT,
  variables TEXT[], -- ['nome', 'produto'] para interpolação
  is_meta_approved BOOLEAN DEFAULT false, -- Para templates oficiais
  meta_template_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Compartilhamento entre clientes (para admins)
CREATE TABLE public.shared_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type TEXT NOT NULL, -- 'flow' | 'message' | 'automation'
  source_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  shared_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Dashboard:**
```
/dashboard/templates - Biblioteca de templates
/dashboard/templates/[id] - Editar template
```

#### Estimativa: 1 semana

---

### 3.11 QR Codes e Links Diretos

#### Descrição
Gerar QR codes e links que iniciam fluxos específicos.

#### O que precisamos implementar

**Banco de dados:**
```sql
-- Migration: supabase migration new create_qr_codes

CREATE TABLE public.entry_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  short_code TEXT UNIQUE, -- Para URL curta
  qr_code_url TEXT, -- URL da imagem do QR
  flow_id UUID REFERENCES flow_templates(id),
  initial_message TEXT, -- Mensagem pré-preenchida
  
  -- Tracking
  scan_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_entry_points_code ON public.entry_points(short_code);
```

**Geração de QR Code:**
```typescript
// Usar biblioteca qrcode ou api-qrcode
import QRCode from 'qrcode';

const generateWhatsAppQR = async (phone: string, message: string) => {
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  return QRCode.toDataURL(url);
};
```

**Dashboard:**
```
/dashboard/entry-points - Gerenciar QR codes e links
```

#### Estimativa: 1 semana

---

### 3.12 API Pública e Webhooks

#### Descrição
Expor API documentada para integrações externas.

#### O que temos hoje
- APIs internas para dashboard
- Webhook de recebimento da Meta

#### O que precisamos implementar

**API pública com autenticação:**
```typescript
// Endpoints públicos (com API key)
POST /api/v1/messages/send - Enviar mensagem
GET /api/v1/contacts - Listar contatos
POST /api/v1/contacts - Criar/atualizar contato
POST /api/v1/tags/apply - Aplicar tag
POST /api/v1/flows/trigger - Disparar fluxo
GET /api/v1/campaigns - Listar campanhas
POST /api/v1/campaigns - Criar campanha

// Webhooks outbound (nosso sistema chama externo)
POST /api/v1/webhooks - Registrar webhook
DELETE /api/v1/webhooks/[id] - Remover webhook
```

**Banco de dados:**
```sql
-- Migration: supabase migration new create_api_keys

CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL, -- SHA256 da key
  key_prefix TEXT NOT NULL, -- Primeiros 8 chars para identificação
  permissions TEXT[] DEFAULT ARRAY['read'],
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES user_profiles(id)
);

CREATE TABLE public.outbound_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL, -- ['message.received', 'message.sent', 'contact.created']
  secret TEXT, -- Para validação HMAC
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Documentação Swagger:**
```typescript
// Usar next-swagger-doc ou similar
// Endpoint: /api/docs
```

#### Estimativa: 2-3 semanas

---

### 3.13 Respostas Rápidas

#### Descrição
Biblioteca de respostas prontas para atendentes.

#### O que precisamos implementar

**Banco de dados:**
```sql
-- Migration: supabase migration new create_quick_replies

CREATE TABLE public.quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  shortcut TEXT NOT NULL, -- /ola, /preco, /horario
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  use_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(client_id, shortcut)
);

CREATE INDEX idx_quick_replies_client ON public.quick_replies(client_id);
CREATE INDEX idx_quick_replies_shortcut ON public.quick_replies(shortcut);
```

**Interface no chat:**
```typescript
// Componente de autocomplete
// Quando atendente digita "/", mostrar lista
// Ao selecionar, substituir pelo conteúdo
```

#### Estimativa: 3-5 dias

---

### 3.14 Integração com IA (ChatGPT)

#### Descrição
IA para respostas automáticas e compreensão de linguagem natural.

#### O que já temos ✅
- Integração com Groq (Llama 3.3 70B)
- Integração com OpenAI (GPT-4o)
- Transcrição de áudio (Whisper)
- Análise de imagens (GPT-4o Vision)
- RAG com pgvector
- Tool calls (transferência, subagentes)

#### Melhorias possíveis
```typescript
// 1. A/B Testing de prompts
// 2. Análise de sentimento
// 3. Detecção automática de idioma
// 4. Sugestões de resposta para atendentes
// 5. Resumo automático de conversas longas
// 6. Fine-tuning de modelos customizados
```

#### Estimativa: Já implementado (melhorias: 1-2 semanas)

---

## 4. Priorização e Roadmap

### Fase 1: Fundação (Mês 1-2)
| Feature | Prioridade | Estimativa | Dependências |
|---------|------------|------------|--------------|
| Sistema de Etiquetas/Tags | 🔴 Alta | 1 semana | - |
| Live Chat (Atendimento Humano) | 🔴 Alta | 2-3 semanas | Etiquetas |
| Respostas Rápidas | 🔴 Alta | 3-5 dias | Live Chat |
| Dashboard de Métricas expandido | 🟡 Média | 2-3 semanas | - |

### Fase 2: Automação (Mês 2-3)
| Feature | Prioridade | Estimativa | Dependências |
|---------|------------|------------|--------------|
| Gatilhos e Automações | 🔴 Alta | 2 semanas | Etiquetas |
| Sistema de Campanhas/Broadcast | 🔴 Alta | 2-3 semanas | Segmentação |
| Segmentação de Audiência | 🟡 Média | 1-2 semanas | Etiquetas |
| Sequências Automatizadas | 🟡 Média | 1-2 semanas | - |

### Fase 3: Fluxos Visuais (Mês 3-4)
| Feature | Prioridade | Estimativa | Dependências |
|---------|------------|------------|--------------|
| Construtor Visual de Fluxos | 🔴 Alta | 3-4 semanas | - |
| Templates e Modelos | 🟢 Baixa | 1 semana | Fluxos Visuais |
| QR Codes e Links | 🟢 Baixa | 1 semana | Fluxos Visuais |

### Fase 4: CRM e Integrações (Mês 4-5)
| Feature | Prioridade | Estimativa | Dependências |
|---------|------------|------------|--------------|
| CRM Integrado | 🟡 Média | 3-4 semanas | Etiquetas, Deals |
| API Pública | 🟢 Baixa | 2-3 semanas | - |

---

## 5. Estimativas de Desenvolvimento

### Resumo Total

| Fase | Features | Estimativa |
|------|----------|------------|
| Fase 1 | Etiquetas, Live Chat, Respostas Rápidas, Métricas | 5-7 semanas |
| Fase 2 | Gatilhos, Campanhas, Segmentação, Sequências | 6-9 semanas |
| Fase 3 | Fluxos Visuais, Templates, QR Codes | 5-6 semanas |
| Fase 4 | CRM, API Pública | 5-7 semanas |
| **Total** | **Todas as funcionalidades** | **21-29 semanas** |

### Considerações

- Estimativas assumem 1 desenvolvedor full-time
- Pode ser paralelizado com mais desenvolvedores
- Testes e QA incluídos nas estimativas
- Documentação não incluída separadamente

---

## 6. Requisitos Técnicos

### Dependências a Adicionar

```json
// package.json
{
  "dependencies": {
    "@xyflow/react": "^12.0.0",       // Editor visual de fluxos
    "qrcode": "^1.5.3",               // Geração de QR codes
    "next-swagger-doc": "^0.4.0",     // Documentação API
    "swagger-ui-react": "^5.0.0",     // UI do Swagger
    "zustand": "^4.5.0",              // State management
    "@tanstack/react-query": "^5.0.0" // Data fetching
  }
}
```

### Infraestrutura Adicional

| Serviço | Uso | Custo Estimado |
|---------|-----|----------------|
| Redis (Upstash) | Queue para campanhas | $10-50/mês |
| Vercel Cron | Jobs agendados | Incluído no Pro |
| Supabase | Banco atual | Atual + ~$25/mês |
| Storage (S3/Supabase) | Mídia e QR codes | $5-20/mês |

### Migrations Necessárias

1. `create_tags_system.sql`
2. `create_chat_assignments.sql`
3. `create_quick_replies.sql`
4. `create_segments.sql`
5. `create_automations.sql`
6. `create_campaigns.sql`
7. `create_sequences.sql`
8. `create_visual_flows.sql`
9. `create_templates.sql`
10. `create_entry_points.sql`
11. `create_crm.sql`
12. `create_api_keys.sql`
13. `create_metrics_aggregation.sql`

---

## 7. Riscos e Mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Rate limits da Meta API | Alto | Alta | Implementar queue com backoff |
| Complexidade do editor visual | Médio | Média | Usar biblioteca madura (reactflow) |
| Performance com muitos contatos | Alto | Média | Paginação, índices, cache |
| Sincronização real-time | Médio | Baixa | Supabase Realtime já funciona |
| Segurança da API pública | Alto | Média | Rate limiting, API keys, HMAC |
| Custo de infraestrutura | Médio | Média | Monitoramento de uso, alertas |

---

## Conclusão

Este plano detalha **14 funcionalidades principais** do BotConversa e como implementá-las no nosso sistema. O projeto já possui uma base sólida com multi-tenant, IA, RAG e processamento de mídia. As novas funcionalidades complementarão o sistema para oferecer uma experiência completa de automação de WhatsApp.

**Próximos passos recomendados:**

1. ✅ Validar priorização com stakeholders
2. ⬜ Criar backlog detalhado no GitHub Issues
3. ⬜ Implementar Fase 1 (Etiquetas + Live Chat)
4. ⬜ Testar com clientes piloto
5. ⬜ Iterar baseado em feedback

---

*Documento criado em: Dezembro 2024*
*Última atualização: Dezembro 2024*
*Autor: Copilot Assistant*

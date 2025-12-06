# Plano de Implementação: Flows Interativos com WhatsApp Business API

Este documento detalha o plano completo para implementar um sistema de **flows interativos** usando mensagens interativas do WhatsApp Business API (listas e botões), com interface **drag-and-drop** para clientes criarem seus próprios fluxos de atendimento.

---

## 📋 Índice

1. [Resumo Executivo](#1-resumo-executivo)
2. [Visão Geral do Sistema](#2-visão-geral-do-sistema)
3. [API WhatsApp Business - Mensagens Interativas](#3-api-whatsapp-business---mensagens-interativas)
4. [Arquitetura Proposta](#4-arquitetura-proposta)
5. [Plano de Implementação em Fases](#5-plano-de-implementação-em-fases)
   - [Fase 0: Pesquisa e Documentação](#fase-0-pesquisa-e-documentação)
   - [Fase 1: POC - Teste de Mensagens Interativas](#fase-1-poc---teste-de-mensagens-interativas)
   - [Fase 2: Estrutura de Dados](#fase-2-estrutura-de-dados)
   - [Fase 3: Executor de Flows](#fase-3-executor-de-flows)
   - [Fase 4: Integração com Pipeline](#fase-4-integração-com-pipeline)
   - [Fase 5: Interface Drag-and-Drop](#fase-5-interface-drag-and-drop)
   - [Fase 6: Testes e Refinamento](#fase-6-testes-e-refinamento)
6. [Stack Tecnológica](#6-stack-tecnológica)
7. [Banco de Dados](#7-banco-de-dados)
8. [Performance e Otimizações](#8-performance-e-otimizações)
9. [Riscos e Mitigações](#9-riscos-e-mitigações)
10. [Próximos Passos](#10-próximos-passos)

---

## 1. Resumo Executivo

### Objetivo
Permitir que **clientes criem fluxos de atendimento visual** usando mensagens interativas do WhatsApp (listas e botões), sem necessidade de programação. O sistema deve ter **alta performance**, **responsividade** e **profissionalismo**.

### Diferencial
- Interface **drag-and-drop fluida** (60 FPS)
- Mensagens **nativas do WhatsApp** (listas e botões)
- **Pré-processamento** antes do agente IA
- Condicionais baseadas nas escolhas do usuário
- Multi-tenant com isolamento completo

### Timeline Estimado
| Fase | Duração | Entregas |
|------|---------|----------|
| Fase 0 | 2-3 dias | Documentação da API, exemplos |
| Fase 1 | 1 semana | POC funcional de envio/recepção |
| Fase 2 | 1 semana | Schema de banco, tipos TypeScript |
| Fase 3 | 2 semanas | Executor de flows completo |
| Fase 4 | 1 semana | Integração com chatbotFlow |
| Fase 5 | 3-4 semanas | Interface drag-and-drop |
| Fase 6 | 1-2 semanas | Testes, polish, docs |
| **Total** | **9-13 semanas** | Sistema completo |

---

## 2. Visão Geral do Sistema

### Fluxo de Funcionamento

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CLIENTE CRIA FLOW (Drag & Drop)                              │
│    - Adiciona blocos (mensagem, lista, botões, condição)        │
│    - Conecta blocos com edges                                    │
│    - Define triggers (palavra-chave, QR code, manual)           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. MENSAGEM CHEGA NO WEBHOOK                                     │
│    - Passa pelo pipeline (14 nodes)                             │
│    - NOVO NODE: checkInteractiveFlow (antes da IA)              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. CHECKINTERACTIVEFLOW NODE                                    │
│    ┌─────────────────────────────────────────────────────────┐  │
│    │ Tem flow ativo para esse contato?                      │  │
│    │ ├─ SIM → Executa próximo bloco do flow                │  │
│    │ └─ NÃO → Verifica trigger (keyword, etc)               │  │
│    │          ├─ Match → Inicia flow                        │  │
│    │          └─ No match → Continua para IA                │  │
│    └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. EXECUTOR DE FLOW                                             │
│    - Busca bloco atual do flow                                  │
│    - Executa ação do bloco:                                     │
│      • Envia mensagem texto                                     │
│      • Envia lista interativa (até 10 opções)                   │
│      • Envia botões (até 3 botões)                              │
│      • Avalia condição                                          │
│      • Executa ação (tag, variável, transferir)                 │
│    - Salva estado para próxima interação                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. USUÁRIO RESPONDE                                             │
│    - Clica em botão OU seleciona item da lista                  │
│    - Webhook recebe resposta estruturada                        │
│    - Flow executor identifica próximo bloco                     │
│    - Repete até fim do flow OU transferir para IA               │
└─────────────────────────────────────────────────────────────────┘
```

### Exemplo Prático

**Flow criado pelo cliente:**
```
┌──────────────────┐
│ BLOCO 1: MENSAGEM│
│ "Olá! Como posso │
│  te ajudar?"     │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│ BLOCO 2: LISTA   │
│ Escolha:         │
│ 1. Suporte       │
│ 2. Vendas        │
│ 3. Financeiro    │
└────────┬─────────┘
         │
    ┌────┴────┬──────────────┐
    ↓         ↓              ↓
┌─────────┐ ┌──────────┐ ┌──────────┐
│ SUPORTE │ │  VENDAS  │ │FINANCEIRO│
│(bloco 3)│ │(bloco 4) │ │(bloco 5) │
└─────────┘ └──────────┘ └──────────┘
```

**Experiência do usuário final:**
1. Usuário envia "Oi"
2. Bot responde: "Olá! Como posso te ajudar?" + lista com 3 opções
3. Usuário clica em "Vendas"
4. Bot executa bloco 4 (pode ser mensagem, transferir para humano, ou IA)

---

## 3. API WhatsApp Business - Mensagens Interativas

### 3.1 Tipos de Mensagens Interativas

A API do WhatsApp Business oferece **3 tipos** de mensagens interativas:

#### A) Reply Buttons (Botões de Resposta)
- **Limite:** Até 3 botões
- **Uso:** Escolhas simples, rápidas
- **Aparência:** Botões nativos do WhatsApp

**Payload de envio:**
```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "5554999999999",
  "type": "interactive",
  "interactive": {
    "type": "button",
    "body": {
      "text": "Como posso ajudar?"
    },
    "action": {
      "buttons": [
        {
          "type": "reply",
          "reply": {
            "id": "btn_suporte",
            "title": "Suporte"
          }
        },
        {
          "type": "reply",
          "reply": {
            "id": "btn_vendas",
            "title": "Vendas"
          }
        },
        {
          "type": "reply",
          "reply": {
            "id": "btn_financeiro",
            "title": "Financeiro"
          }
        }
      ]
    }
  }
}
```

**Payload de resposta (webhook):**
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "5554999999999",
          "type": "interactive",
          "interactive": {
            "type": "button_reply",
            "button_reply": {
              "id": "btn_vendas",
              "title": "Vendas"
            }
          }
        }]
      }
    }]
  }]
}
```

#### B) List Messages (Listas)
- **Limite:** Até 10 seções, cada uma com até 10 itens (total 100 itens)
- **Uso:** Múltiplas opções, menus complexos
- **Aparência:** Lista nativa do WhatsApp (usuário clica e abre menu)

**Payload de envio:**
```json
{
  "messaging_product": "whatsapp",
  "to": "5554999999999",
  "type": "interactive",
  "interactive": {
    "type": "list",
    "header": {
      "type": "text",
      "text": "Departamentos"
    },
    "body": {
      "text": "Selecione o departamento desejado:"
    },
    "footer": {
      "text": "Atendimento 24/7"
    },
    "action": {
      "button": "Ver opções",
      "sections": [
        {
          "title": "Atendimento",
          "rows": [
            {
              "id": "opt_suporte",
              "title": "Suporte Técnico",
              "description": "Problemas técnicos"
            },
            {
              "id": "opt_comercial",
              "title": "Comercial",
              "description": "Vendas e parcerias"
            }
          ]
        },
        {
          "title": "Financeiro",
          "rows": [
            {
              "id": "opt_cobranca",
              "title": "Cobrança",
              "description": "Dúvidas sobre pagamento"
            },
            {
              "id": "opt_nfe",
              "title": "Nota Fiscal",
              "description": "Solicitação de NF-e"
            }
          ]
        }
      ]
    }
  }
}
```

**Payload de resposta (webhook):**
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "5554999999999",
          "type": "interactive",
          "interactive": {
            "type": "list_reply",
            "list_reply": {
              "id": "opt_suporte",
              "title": "Suporte Técnico",
              "description": "Problemas técnicos"
            }
          }
        }]
      }
    }]
  }]
}
```

#### C) CTA URL Buttons (Call-to-Action)
- Botões que abrem URLs (não útil para flows)
- Não retornam dados estruturados
- **Não usaremos** neste projeto

### 3.2 Limitações Importantes

| Tipo | Limite | Observação |
|------|--------|------------|
| Reply Buttons | 3 botões | Texto máximo: 20 caracteres |
| List Sections | 10 seções | - |
| List Rows/Section | 10 itens | Total máximo: 100 itens |
| List Row Title | 24 caracteres | - |
| List Row Description | 72 caracteres | - |
| Body Text | 1024 caracteres | Para ambos os tipos |
| Header Text | 60 caracteres | Apenas lists |
| Footer Text | 60 caracteres | Apenas lists |

### 3.3 Identificação de Respostas

**KEY INSIGHT:** As respostas interativas têm `type: "interactive"` e contêm o `id` que definimos no envio. Isso permite **matching exato** com os blocos do flow.

---

## 4. Arquitetura Proposta

### 4.1 Estrutura de Blocos (Nodes)

```typescript
// src/types/flowTypes.ts

export type FlowBlockType =
  | 'start'           // Início do flow (trigger)
  | 'message'         // Mensagem texto simples
  | 'interactive_list'// Lista interativa (até 10 seções)
  | 'interactive_buttons' // Botões (até 3)
  | 'condition'       // Condição (if/else)
  | 'action'          // Ação (add tag, set variable, etc)
  | 'ai_handoff'      // Transferir para IA
  | 'human_handoff'   // Transferir para humano
  | 'delay'           // Aguardar X segundos
  | 'webhook'         // Chamar webhook externo
  | 'end';            // Fim do flow

export interface FlowBlock {
  id: string;                    // UUID do bloco
  type: FlowBlockType;
  position: { x: number; y: number }; // Posição no canvas
  data: FlowBlockData;
}

export interface FlowBlockData {
  label?: string; // Label exibido no bloco (UI)

  // Para type: 'message'
  messageText?: string;

  // Para type: 'interactive_list'
  listHeader?: string;
  listBody?: string;
  listFooter?: string;
  listButtonText?: string; // Texto do botão "Ver opções"
  listSections?: ListSection[];

  // Para type: 'interactive_buttons'
  buttonsBody?: string;
  buttons?: ReplyButton[];

  // Para type: 'condition'
  conditions?: Condition[];

  // Para type: 'action'
  actionType?: 'add_tag' | 'remove_tag' | 'set_variable' | 'increment_variable';
  actionParams?: Record<string, any>;

  // Para type: 'delay'
  delaySeconds?: number;

  // Para type: 'webhook'
  webhookUrl?: string;
  webhookMethod?: 'GET' | 'POST';
  webhookHeaders?: Record<string, string>;
  webhookBody?: Record<string, any>;
}

export interface ListSection {
  id: string;
  title: string;
  rows: ListRow[];
}

export interface ListRow {
  id: string;           // ID único para matching (ex: "opt_suporte")
  title: string;        // Max 24 chars
  description?: string; // Max 72 chars
  nextBlockId: string;  // Para qual bloco ir quando selecionado
}

export interface ReplyButton {
  id: string;           // ID único para matching (ex: "btn_sim")
  title: string;        // Max 20 chars
  nextBlockId: string;  // Para qual bloco ir quando clicado
}

export interface Condition {
  variable: string;     // Nome da variável (ex: "escolha_anterior")
  operator: '==' | '!=' | '>' | '<' | 'contains' | 'not_contains';
  value: string | number;
  nextBlockId: string;  // Bloco se condição for TRUE
}

export interface FlowEdge {
  id: string;
  source: string;       // ID do bloco de origem
  target: string;       // ID do bloco de destino
  label?: string;       // Label da conexão (ex: "Se Sim")
}

export interface InteractiveFlow {
  id: string;
  clientId: string;
  name: string;
  description?: string;
  isActive: boolean;

  // Triggers (como o flow é ativado)
  triggerType: 'keyword' | 'qr_code' | 'link' | 'manual' | 'always';
  triggerKeywords?: string[]; // ["oi", "olá", "menu"]
  triggerQrCode?: string;     // ID do QR code

  // Flow structure
  blocks: FlowBlock[];
  edges: FlowEdge[];
  startBlockId: string;       // ID do bloco inicial

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
```

### 4.2 Estado de Execução (Runtime)

```typescript
// src/types/flowRuntimeTypes.ts

export interface FlowExecution {
  id: string;
  flowId: string;
  clientId: string;
  phone: string;             // Telefone do contato

  currentBlockId: string;    // Bloco atual
  variables: Record<string, any>; // Variáveis do contexto
  history: FlowStep[];       // Histórico de execução

  status: 'active' | 'completed' | 'paused' | 'transferred_ai' | 'transferred_human';

  startedAt: Date;
  lastStepAt: Date;
  completedAt?: Date;
}

export interface FlowStep {
  blockId: string;
  blockType: FlowBlockType;
  executedAt: Date;
  userResponse?: string;     // Resposta do usuário (se houver)
  nextBlockId?: string;      // Próximo bloco executado
}
```

---

## 5. Plano de Implementação em Fases

### Fase 0: Pesquisa e Documentação
**Duração:** 2-3 dias
**Status:** 🔴 Não iniciado

#### Objetivos
1. Estudar documentação oficial da Meta sobre mensagens interativas
2. Entender todos os campos obrigatórios e opcionais
3. Identificar limitações e edge cases
4. Criar exemplos de payloads

#### Tarefas
- [ ] Ler docs: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages#interactive-messages
- [ ] Ler docs: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components#interactive-message-reply
- [ ] Criar arquivo `docs/features/flow/META_API_INTERACTIVE_MESSAGES.md` com exemplos
- [ ] Testar no Postman ou Insomnia (envio manual)
- [ ] Documentar rate limits e melhores práticas

#### Entregas
- ✅ Documento `META_API_INTERACTIVE_MESSAGES.md` com exemplos
- ✅ Collection Postman/Insomnia com requests prontos
- ✅ Lista de limitações e edge cases

---

### Fase 1: POC - Teste de Mensagens Interativas
**Duração:** 1 semana
**Status:** 🔴 Não iniciado
**Dependências:** Fase 0

#### Objetivos
1. Provar que conseguimos **enviar** listas e botões
2. Provar que conseguimos **receber** respostas estruturadas
3. Validar parsing do webhook
4. Testar todos os cenários

#### Tarefas

**1. Criar endpoint de teste para envio**
```typescript
// src/app/api/test/interactive/send/route.ts

export async function POST(req: NextRequest) {
  const { phone, type } = await req.json();

  if (type === 'buttons') {
    // Enviar botões de teste via Meta API
    const response = await sendInteractiveButtons(phone, {
      body: 'Escolha uma opção:',
      buttons: [
        { id: 'test_btn_1', title: 'Opção 1' },
        { id: 'test_btn_2', title: 'Opção 2' },
        { id: 'test_btn_3', title: 'Opção 3' }
      ]
    });

    return NextResponse.json({ success: true, response });
  }

  if (type === 'list') {
    // Enviar lista de teste via Meta API
    const response = await sendInteractiveList(phone, {
      header: 'Menu de Testes',
      body: 'Selecione uma opção abaixo:',
      buttonText: 'Ver opções',
      sections: [
        {
          title: 'Seção 1',
          rows: [
            { id: 'test_opt_1', title: 'Item 1', description: 'Descrição 1' },
            { id: 'test_opt_2', title: 'Item 2', description: 'Descrição 2' }
          ]
        }
      ]
    });

    return NextResponse.json({ success: true, response });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}
```

**2. Criar funções de envio**
```typescript
// src/lib/whatsapp/interactiveMessages.ts

export interface ReplyButtonsParams {
  body: string;
  buttons: { id: string; title: string }[];
  footer?: string;
}

export interface ListMessageParams {
  header?: string;
  body: string;
  footer?: string;
  buttonText: string;
  sections: {
    title: string;
    rows: { id: string; title: string; description?: string }[];
  }[];
}

export const sendInteractiveButtons = async (
  phone: string,
  params: ReplyButtonsParams
): Promise<any> => {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: params.body },
      action: {
        buttons: params.buttons.map(btn => ({
          type: 'reply',
          reply: { id: btn.id, title: btn.title }
        }))
      }
    }
  };

  if (params.footer) {
    payload.interactive.footer = { text: params.footer };
  }

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${process.env.META_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.META_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to send buttons: ${JSON.stringify(error)}`);
  }

  return response.json();
};

export const sendInteractiveList = async (
  phone: string,
  params: ListMessageParams
): Promise<any> => {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: params.body },
      action: {
        button: params.buttonText,
        sections: params.sections
      }
    }
  };

  if (params.header) {
    payload.interactive.header = { type: 'text', text: params.header };
  }

  if (params.footer) {
    payload.interactive.footer = { text: params.footer };
  }

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${process.env.META_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.META_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to send list: ${JSON.stringify(error)}`);
  }

  return response.json();
};
```

**3. Modificar webhook para detectar respostas interativas**
```typescript
// src/app/api/webhook/[clientId]/route.ts

// Adicionar após parsing de mensagens normais

const parseInteractiveMessage = (message: any) => {
  if (message.type !== 'interactive') return null;

  const { interactive } = message;

  if (interactive.type === 'button_reply') {
    return {
      type: 'button_reply',
      buttonId: interactive.button_reply.id,
      buttonTitle: interactive.button_reply.title
    };
  }

  if (interactive.type === 'list_reply') {
    return {
      type: 'list_reply',
      listItemId: interactive.list_reply.id,
      listItemTitle: interactive.list_reply.title,
      listItemDescription: interactive.list_reply.description
    };
  }

  return null;
};

// No handler do webhook
const message = changes[0]?.value?.messages?.[0];
if (message) {
  const interactiveReply = parseInteractiveMessage(message);

  if (interactiveReply) {
    console.log('📋 Interactive reply received:', interactiveReply);
    // TODO: Processar resposta interativa no flow executor
  }
}
```

**4. Criar dashboard de testes**
```typescript
// src/app/dashboard/test-interactive/page.tsx

'use client';

export default function TestInteractivePage() {
  const [phone, setPhone] = useState('5554999999999');
  const [type, setType] = useState<'buttons' | 'list'>('buttons');

  const handleSend = async () => {
    const response = await fetch('/api/test/interactive/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, type })
    });

    const data = await response.json();
    console.log('Response:', data);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Teste de Mensagens Interativas</h1>

      <div className="space-y-4">
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Telefone"
          className="border p-2 rounded"
        />

        <select
          value={type}
          onChange={(e) => setType(e.target.value as any)}
          className="border p-2 rounded"
        >
          <option value="buttons">Botões</option>
          <option value="list">Lista</option>
        </select>

        <button
          onClick={handleSend}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Enviar Teste
        </button>
      </div>
    </div>
  );
}
```

#### Testes
- [ ] Enviar mensagem com 3 botões
- [ ] Receber resposta de botão no webhook
- [ ] Enviar lista com 2 seções e 4 itens
- [ ] Receber resposta de lista no webhook
- [ ] Testar limites (mais de 3 botões, mais de 10 seções)
- [ ] Testar caracteres especiais nos textos
- [ ] Validar rate limiting

#### Entregas
- ✅ Funções `sendInteractiveButtons` e `sendInteractiveList` funcionando
- ✅ Parser de respostas interativas no webhook
- ✅ Dashboard de testes funcional
- ✅ Documento com resultados dos testes

#### Critérios de Sucesso
- Conseguir enviar botões e listas via API
- Receber respostas estruturadas no webhook
- Parser identificar corretamente o `id` clicado

---

### Fase 2: Estrutura de Dados
**Duração:** 1 semana
**Status:** 🔴 Não iniciado
**Dependências:** Fase 1

#### Objetivos
1. Criar schema de banco de dados para flows
2. Criar tipos TypeScript completos
3. Criar migrations
4. APIs CRUD para flows

#### Tarefas

**1. Migration - Tabelas de flows**
```sql
-- supabase/migrations/YYYYMMDDHHMMSS_create_interactive_flows.sql

-- Tabela principal de flows
CREATE TABLE public.interactive_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,

  -- Triggers
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('keyword', 'qr_code', 'link', 'manual', 'always')),
  trigger_keywords TEXT[], -- Array de keywords
  trigger_qr_code TEXT,

  -- Flow structure (JSONB para flexibilidade)
  blocks JSONB NOT NULL DEFAULT '[]',
  edges JSONB NOT NULL DEFAULT '[]',
  start_block_id TEXT NOT NULL,

  -- Metadata
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Performance indexes
  CONSTRAINT valid_blocks CHECK (jsonb_typeof(blocks) = 'array'),
  CONSTRAINT valid_edges CHECK (jsonb_typeof(edges) = 'array')
);

-- Índices para performance
CREATE INDEX idx_interactive_flows_client ON public.interactive_flows(client_id);
CREATE INDEX idx_interactive_flows_active ON public.interactive_flows(client_id, is_active) WHERE is_active = true;
CREATE INDEX idx_interactive_flows_keywords ON public.interactive_flows USING GIN(trigger_keywords) WHERE trigger_type = 'keyword';

-- Tabela de execuções ativas
CREATE TABLE public.flow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES interactive_flows(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  phone TEXT NOT NULL, -- Telefone do contato (pode não estar em clientes_whatsapp ainda)

  -- Estado de execução
  current_block_id TEXT NOT NULL,
  variables JSONB DEFAULT '{}',
  history JSONB DEFAULT '[]', -- Array de FlowStep

  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'paused', 'transferred_ai', 'transferred_human')),

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT now(),
  last_step_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,

  -- Constraint: apenas 1 execução ativa por contato/cliente
  CONSTRAINT unique_active_execution UNIQUE (client_id, phone, status)
    WHERE status = 'active'
);

-- Índices
CREATE INDEX idx_flow_executions_phone ON public.flow_executions(client_id, phone);
CREATE INDEX idx_flow_executions_active ON public.flow_executions(client_id, status) WHERE status = 'active';
CREATE INDEX idx_flow_executions_flow ON public.flow_executions(flow_id);

-- RLS Policies
ALTER TABLE public.interactive_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can manage their own flows"
  ON public.interactive_flows
  FOR ALL
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Clients can view their own executions"
  ON public.flow_executions
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_interactive_flows_updated_at
  BEFORE UPDATE ON public.interactive_flows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**2. Tipos TypeScript**
```typescript
// src/types/interactiveFlows.ts

export type FlowBlockType =
  | 'start'
  | 'message'
  | 'interactive_list'
  | 'interactive_buttons'
  | 'condition'
  | 'action'
  | 'ai_handoff'
  | 'human_handoff'
  | 'delay'
  | 'webhook'
  | 'end';

export type TriggerType = 'keyword' | 'qr_code' | 'link' | 'manual' | 'always';

export interface InteractiveFlow {
  id: string;
  clientId: string;
  name: string;
  description?: string;
  isActive: boolean;
  triggerType: TriggerType;
  triggerKeywords?: string[];
  triggerQrCode?: string;
  blocks: FlowBlock[];
  edges: FlowEdge[];
  startBlockId: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FlowBlock {
  id: string;
  type: FlowBlockType;
  position: { x: number; y: number };
  data: FlowBlockData;
}

export interface FlowBlockData {
  label?: string;

  // Message
  messageText?: string;

  // Interactive List
  listHeader?: string;
  listBody?: string;
  listFooter?: string;
  listButtonText?: string;
  listSections?: ListSection[];

  // Interactive Buttons
  buttonsBody?: string;
  buttonsFooter?: string;
  buttons?: ReplyButton[];

  // Condition
  conditions?: Condition[];
  defaultNextBlockId?: string; // Se nenhuma condição for verdadeira

  // Action
  actionType?: 'add_tag' | 'remove_tag' | 'set_variable' | 'increment';
  actionParams?: Record<string, any>;

  // Delay
  delaySeconds?: number;

  // Webhook
  webhookUrl?: string;
  webhookMethod?: 'GET' | 'POST';
  webhookHeaders?: Record<string, string>;
  webhookBody?: Record<string, any>;
}

export interface ListSection {
  id: string;
  title: string;
  rows: ListRow[];
}

export interface ListRow {
  id: string;
  title: string;
  description?: string;
  nextBlockId: string;
}

export interface ReplyButton {
  id: string;
  title: string;
  nextBlockId: string;
}

export interface Condition {
  variable: string;
  operator: '==' | '!=' | '>' | '<' | 'contains' | 'not_contains';
  value: string | number;
  nextBlockId: string;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: 'default' | 'conditional';
}

// Runtime types
export interface FlowExecution {
  id: string;
  flowId: string;
  clientId: string;
  phone: string;
  currentBlockId: string;
  variables: Record<string, any>;
  history: FlowStep[];
  status: 'active' | 'completed' | 'paused' | 'transferred_ai' | 'transferred_human';
  startedAt: Date;
  lastStepAt: Date;
  completedAt?: Date;
}

export interface FlowStep {
  blockId: string;
  blockType: FlowBlockType;
  executedAt: Date;
  userResponse?: string;
  interactiveResponseId?: string; // ID do botão/lista clicado
  nextBlockId?: string;
}
```

**3. APIs CRUD**
```typescript
// src/app/api/flows/route.ts

import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/flows - Listar flows do cliente
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('client_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { data: flows, error } = await supabase
      .from('interactive_flows')
      .select('*')
      .eq('client_id', profile.client_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ flows });
  } catch (error: any) {
    console.error('Error fetching flows:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/flows - Criar novo flow
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('client_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const body = await req.json();

    const { data: flow, error } = await supabase
      .from('interactive_flows')
      .insert({
        client_id: profile.client_id,
        name: body.name,
        description: body.description,
        is_active: body.isActive ?? true,
        trigger_type: body.triggerType,
        trigger_keywords: body.triggerKeywords,
        trigger_qr_code: body.triggerQrCode,
        blocks: body.blocks,
        edges: body.edges,
        start_block_id: body.startBlockId,
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ flow }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating flow:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// src/app/api/flows/[flowId]/route.ts

// PUT /api/flows/[flowId] - Atualizar flow
export async function PUT(
  req: NextRequest,
  { params }: { params: { flowId: string } }
) {
  // Similar ao POST, mas com UPDATE
}

// DELETE /api/flows/[flowId] - Deletar flow
export async function DELETE(
  req: NextRequest,
  { params }: { params: { flowId: string } }
) {
  // DELETE com verificação de ownership
}
```

#### Entregas
- ✅ Migration aplicada no banco
- ✅ Tipos TypeScript completos
- ✅ APIs CRUD funcionando
- ✅ RLS policies testadas

---

### Fase 3: Executor de Flows
**Duração:** 2 semanas
**Status:** 🔴 Não iniciado
**Dependências:** Fase 2

#### Objetivos
1. Criar motor de execução de flows
2. Processar cada tipo de bloco
3. Gerenciar estado de execução
4. Tratar condicionais e variáveis

#### Tarefas

**1. Criar executor principal**
```typescript
// src/lib/flows/flowExecutor.ts

import { createServerClient } from '@/lib/supabase/server';
import { FlowExecution, FlowBlock, InteractiveFlow } from '@/types/interactiveFlows';
import { sendInteractiveButtons, sendInteractiveList } from '@/lib/whatsapp/interactiveMessages';

export class FlowExecutor {
  private supabase = createServerClient();

  /**
   * Inicia um novo flow para um contato
   */
  async startFlow(
    flowId: string,
    clientId: string,
    phone: string
  ): Promise<FlowExecution> {
    // 1. Buscar flow
    const { data: flow, error: flowError } = await this.supabase
      .from('interactive_flows')
      .select('*')
      .eq('id', flowId)
      .eq('client_id', clientId)
      .eq('is_active', true)
      .single();

    if (flowError || !flow) {
      throw new Error('Flow not found or inactive');
    }

    const flowData: InteractiveFlow = {
      id: flow.id,
      clientId: flow.client_id,
      name: flow.name,
      description: flow.description,
      isActive: flow.is_active,
      triggerType: flow.trigger_type,
      triggerKeywords: flow.trigger_keywords,
      triggerQrCode: flow.trigger_qr_code,
      blocks: flow.blocks,
      edges: flow.edges,
      startBlockId: flow.start_block_id,
      createdBy: flow.created_by,
      createdAt: new Date(flow.created_at),
      updatedAt: new Date(flow.updated_at)
    };

    // 2. Criar execução
    const { data: execution, error: execError } = await this.supabase
      .from('flow_executions')
      .insert({
        flow_id: flowId,
        client_id: clientId,
        phone: phone,
        current_block_id: flowData.startBlockId,
        variables: {},
        history: [],
        status: 'active'
      })
      .select()
      .single();

    if (execError) {
      throw new Error(`Failed to create execution: ${execError.message}`);
    }

    // 3. Executar primeiro bloco
    await this.executeBlock(execution.id, flowData.startBlockId, flowData);

    return execution;
  }

  /**
   * Continua execução baseado em resposta do usuário
   */
  async continueFlow(
    clientId: string,
    phone: string,
    userResponse: string,
    interactiveResponseId?: string
  ): Promise<void> {
    // 1. Buscar execução ativa
    const { data: execution, error } = await this.supabase
      .from('flow_executions')
      .select('*, interactive_flows(*)')
      .eq('client_id', clientId)
      .eq('phone', phone)
      .eq('status', 'active')
      .single();

    if (error || !execution) {
      throw new Error('No active flow execution found');
    }

    const flow: InteractiveFlow = {
      id: execution.interactive_flows.id,
      clientId: execution.interactive_flows.client_id,
      name: execution.interactive_flows.name,
      description: execution.interactive_flows.description,
      isActive: execution.interactive_flows.is_active,
      triggerType: execution.interactive_flows.trigger_type,
      triggerKeywords: execution.interactive_flows.trigger_keywords,
      blocks: execution.interactive_flows.blocks,
      edges: execution.interactive_flows.edges,
      startBlockId: execution.interactive_flows.start_block_id,
      createdAt: new Date(execution.interactive_flows.created_at),
      updatedAt: new Date(execution.interactive_flows.updated_at)
    };

    // 2. Encontrar bloco atual
    const currentBlock = flow.blocks.find(b => b.id === execution.current_block_id);
    if (!currentBlock) {
      throw new Error('Current block not found');
    }

    // 3. Determinar próximo bloco baseado no tipo e resposta
    const nextBlockId = this.determineNextBlock(
      currentBlock,
      userResponse,
      interactiveResponseId,
      execution.variables
    );

    if (!nextBlockId) {
      // Fim do flow
      await this.completeFlow(execution.id);
      return;
    }

    // 4. Atualizar histórico e variáveis
    const newHistory = [
      ...execution.history,
      {
        blockId: currentBlock.id,
        blockType: currentBlock.type,
        executedAt: new Date(),
        userResponse,
        interactiveResponseId,
        nextBlockId
      }
    ];

    // Salvar resposta em variável (se aplicável)
    const newVariables = { ...execution.variables };
    if (interactiveResponseId) {
      newVariables.last_interactive_response = interactiveResponseId;
    }
    newVariables.last_user_response = userResponse;

    // 5. Atualizar execução
    await this.supabase
      .from('flow_executions')
      .update({
        current_block_id: nextBlockId,
        variables: newVariables,
        history: newHistory,
        last_step_at: new Date().toISOString()
      })
      .eq('id', execution.id);

    // 6. Executar próximo bloco
    await this.executeBlock(execution.id, nextBlockId, flow);
  }

  /**
   * Executa um bloco específico
   */
  private async executeBlock(
    executionId: string,
    blockId: string,
    flow: InteractiveFlow
  ): Promise<void> {
    const block = flow.blocks.find(b => b.id === blockId);
    if (!block) {
      throw new Error(`Block ${blockId} not found`);
    }

    // Buscar execução para pegar phone e variáveis
    const { data: execution } = await this.supabase
      .from('flow_executions')
      .select('*')
      .eq('id', executionId)
      .single();

    if (!execution) {
      throw new Error('Execution not found');
    }

    console.log(`🔄 Executing block ${block.id} (${block.type})`);

    switch (block.type) {
      case 'start':
        // Start não faz nada, apenas passa para próximo
        const startEdge = flow.edges.find(e => e.source === blockId);
        if (startEdge) {
          await this.executeBlock(executionId, startEdge.target, flow);
        }
        break;

      case 'message':
        await this.executeMessageBlock(execution.phone, block);
        // Aguarda resposta do usuário
        break;

      case 'interactive_list':
        await this.executeInteractiveListBlock(execution.phone, block);
        // Aguarda resposta do usuário
        break;

      case 'interactive_buttons':
        await this.executeInteractiveButtonsBlock(execution.phone, block);
        // Aguarda resposta do usuário
        break;

      case 'condition':
        const conditionNextBlockId = this.evaluateConditions(
          block,
          execution.variables
        );
        if (conditionNextBlockId) {
          await this.executeBlock(executionId, conditionNextBlockId, flow);
        }
        break;

      case 'action':
        await this.executeActionBlock(executionId, block, execution.variables);
        // Executar próximo bloco automaticamente
        const actionEdge = flow.edges.find(e => e.source === blockId);
        if (actionEdge) {
          await this.executeBlock(executionId, actionEdge.target, flow);
        }
        break;

      case 'delay':
        await this.executeDelayBlock(executionId, block, flow);
        break;

      case 'ai_handoff':
        await this.transferToAI(executionId);
        break;

      case 'human_handoff':
        await this.transferToHuman(executionId, execution.phone);
        break;

      case 'webhook':
        await this.executeWebhookBlock(block, execution.variables);
        const webhookEdge = flow.edges.find(e => e.source === blockId);
        if (webhookEdge) {
          await this.executeBlock(executionId, webhookEdge.target, flow);
        }
        break;

      case 'end':
        await this.completeFlow(executionId);
        break;
    }
  }

  private async executeMessageBlock(phone: string, block: FlowBlock) {
    // Enviar mensagem texto simples
    // (usar função existente sendWhatsAppMessage)
    console.log(`💬 Sending message to ${phone}: ${block.data.messageText}`);
  }

  private async executeInteractiveListBlock(phone: string, block: FlowBlock) {
    const { listHeader, listBody, listButtonText, listSections, listFooter } = block.data;

    if (!listBody || !listButtonText || !listSections) {
      throw new Error('Invalid list block configuration');
    }

    await sendInteractiveList(phone, {
      header: listHeader,
      body: listBody,
      footer: listFooter,
      buttonText: listButtonText,
      sections: listSections.map(section => ({
        title: section.title,
        rows: section.rows.map(row => ({
          id: row.id,
          title: row.title,
          description: row.description
        }))
      }))
    });

    console.log(`📋 Sent interactive list to ${phone}`);
  }

  private async executeInteractiveButtonsBlock(phone: string, block: FlowBlock) {
    const { buttonsBody, buttons, buttonsFooter } = block.data;

    if (!buttonsBody || !buttons || buttons.length === 0) {
      throw new Error('Invalid buttons block configuration');
    }

    if (buttons.length > 3) {
      throw new Error('Maximum 3 buttons allowed');
    }

    await sendInteractiveButtons(phone, {
      body: buttonsBody,
      footer: buttonsFooter,
      buttons: buttons.map(btn => ({
        id: btn.id,
        title: btn.title
      }))
    });

    console.log(`🔘 Sent interactive buttons to ${phone}`);
  }

  private determineNextBlock(
    currentBlock: FlowBlock,
    userResponse: string,
    interactiveResponseId: string | undefined,
    variables: Record<string, any>
  ): string | null {
    if (currentBlock.type === 'interactive_list') {
      // Encontrar row clicado
      const sections = currentBlock.data.listSections || [];
      for (const section of sections) {
        const row = section.rows.find(r => r.id === interactiveResponseId);
        if (row) {
          return row.nextBlockId;
        }
      }
    }

    if (currentBlock.type === 'interactive_buttons') {
      const buttons = currentBlock.data.buttons || [];
      const button = buttons.find(b => b.id === interactiveResponseId);
      if (button) {
        return button.nextBlockId;
      }
    }

    // Para outros tipos, retornar primeiro edge
    // (será melhorado em fases futuras)
    return null;
  }

  private evaluateConditions(
    block: FlowBlock,
    variables: Record<string, any>
  ): string | null {
    const conditions = block.data.conditions || [];

    for (const condition of conditions) {
      const varValue = variables[condition.variable];
      let match = false;

      switch (condition.operator) {
        case '==':
          match = varValue == condition.value;
          break;
        case '!=':
          match = varValue != condition.value;
          break;
        case '>':
          match = Number(varValue) > Number(condition.value);
          break;
        case '<':
          match = Number(varValue) < Number(condition.value);
          break;
        case 'contains':
          match = String(varValue).includes(String(condition.value));
          break;
        case 'not_contains':
          match = !String(varValue).includes(String(condition.value));
          break;
      }

      if (match) {
        return condition.nextBlockId;
      }
    }

    // Nenhuma condição verdadeira, usar default
    return block.data.defaultNextBlockId || null;
  }

  private async executeActionBlock(
    executionId: string,
    block: FlowBlock,
    variables: Record<string, any>
  ) {
    const { actionType, actionParams } = block.data;

    const newVariables = { ...variables };

    switch (actionType) {
      case 'set_variable':
        newVariables[actionParams?.name] = actionParams?.value;
        break;
      case 'increment':
        newVariables[actionParams?.name] = (newVariables[actionParams?.name] || 0) + 1;
        break;
      // add_tag, remove_tag implementar depois
    }

    await this.supabase
      .from('flow_executions')
      .update({ variables: newVariables })
      .eq('id', executionId);
  }

  private async executeDelayBlock(
    executionId: string,
    block: FlowBlock,
    flow: InteractiveFlow
  ) {
    // Implementar com setTimeout ou job scheduler
    // Por enquanto, apenas registrar
    console.log(`⏳ Delay block: ${block.data.delaySeconds}s`);
  }

  private async executeWebhookBlock(
    block: FlowBlock,
    variables: Record<string, any>
  ) {
    const { webhookUrl, webhookMethod, webhookHeaders, webhookBody } = block.data;

    if (!webhookUrl) return;

    // Fazer request HTTP
    const response = await fetch(webhookUrl, {
      method: webhookMethod || 'POST',
      headers: webhookHeaders || {},
      body: webhookBody ? JSON.stringify(webhookBody) : undefined
    });

    console.log(`🌐 Webhook called: ${webhookUrl} - ${response.status}`);
  }

  private async transferToAI(executionId: string) {
    await this.supabase
      .from('flow_executions')
      .update({
        status: 'transferred_ai',
        completed_at: new Date().toISOString()
      })
      .eq('id', executionId);

    console.log('🤖 Transferred to AI');
  }

  private async transferToHuman(executionId: string, phone: string) {
    await this.supabase
      .from('flow_executions')
      .update({
        status: 'transferred_human',
        completed_at: new Date().toISOString()
      })
      .eq('id', executionId);

    // Atualizar status do contato
    const supabaseAny = this.supabase as any;
    await supabaseAny
      .from('clientes_whatsapp')
      .update({ status: 'humano' })
      .eq('telefone', phone);

    console.log('👤 Transferred to human');
  }

  private async completeFlow(executionId: string) {
    await this.supabase
      .from('flow_executions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', executionId);

    console.log('✅ Flow completed');
  }
}
```

**2. Testes unitários**
```typescript
// src/lib/flows/__tests__/flowExecutor.test.ts

describe('FlowExecutor', () => {
  it('should start a flow and execute first block', async () => {
    // Test implementation
  });

  it('should handle interactive list response', async () => {
    // Test implementation
  });

  it('should evaluate conditions correctly', async () => {
    // Test implementation
  });

  it('should transfer to AI when reaching ai_handoff block', async () => {
    // Test implementation
  });
});
```

#### Entregas
- ✅ FlowExecutor class completa
- ✅ Todos os tipos de blocos implementados
- ✅ Testes unitários passando
- ✅ Documentação do executor

---

### Fase 4: Integração com Pipeline
**Duração:** 1 semana
**Status:** 🔴 Não iniciado
**Dependências:** Fase 3

#### Objetivos
1. Criar novo node `checkInteractiveFlow`
2. Integrar no `chatbotFlow.ts`
3. Priorizar flows sobre IA
4. Testar integração end-to-end

#### Tarefas

**1. Criar node checkInteractiveFlow**
```typescript
// src/nodes/checkInteractiveFlow.ts

import { FlowExecutor } from '@/lib/flows/flowExecutor';
import { createServerClient } from '@/lib/supabase/server';

export interface CheckInteractiveFlowInput {
  clientId: string;
  phone: string;
  content: string;
  isInteractiveReply: boolean;
  interactiveResponseId?: string;
}

export interface CheckInteractiveFlowOutput {
  shouldContinueToAI: boolean;
  flowExecuted: boolean;
  flowName?: string;
}

/**
 * NODE 15: Check Interactive Flow
 *
 * Verifica se existe um flow interativo ativo ou se deve iniciar um.
 * Este node é executado ANTES do agente IA.
 *
 * Lógica:
 * 1. Verifica se existe execução ativa para este contato
 *    - Se SIM: continua o flow
 * 2. Se NÃO, verifica se há trigger match (keyword, etc)
 *    - Se SIM: inicia novo flow
 * 3. Se NENHUM flow aplicável: retorna shouldContinueToAI = true
 */
export const checkInteractiveFlow = async (
  input: CheckInteractiveFlowInput
): Promise<CheckInteractiveFlowOutput> => {
  const { clientId, phone, content, isInteractiveReply, interactiveResponseId } = input;

  console.log(`🔍 [NODE 15] Checking interactive flow for ${phone}`);

  const supabase = createServerClient();
  const executor = new FlowExecutor();

  try {
    // 1. Verificar execução ativa
    const { data: activeExecution } = await supabase
      .from('flow_executions')
      .select('*, interactive_flows(name)')
      .eq('client_id', clientId)
      .eq('phone', phone)
      .eq('status', 'active')
      .maybeSingle();

    if (activeExecution) {
      console.log(`▶️ Continuing active flow: ${activeExecution.interactive_flows.name}`);

      // Continuar flow existente
      await executor.continueFlow(
        clientId,
        phone,
        content,
        interactiveResponseId
      );

      return {
        shouldContinueToAI: false,
        flowExecuted: true,
        flowName: activeExecution.interactive_flows.name
      };
    }

    // 2. Verificar se deve iniciar novo flow

    // 2a. Buscar flows com trigger "always" (sempre ativo)
    const { data: alwaysFlows } = await supabase
      .from('interactive_flows')
      .select('id, name')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .eq('trigger_type', 'always')
      .limit(1);

    if (alwaysFlows && alwaysFlows.length > 0) {
      const flow = alwaysFlows[0];
      console.log(`🚀 Starting "always" flow: ${flow.name}`);

      await executor.startFlow(flow.id, clientId, phone);

      return {
        shouldContinueToAI: false,
        flowExecuted: true,
        flowName: flow.name
      };
    }

    // 2b. Buscar flows com trigger "keyword"
    const contentLower = content.toLowerCase().trim();

    const { data: keywordFlows } = await supabase
      .from('interactive_flows')
      .select('id, name, trigger_keywords')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .eq('trigger_type', 'keyword');

    if (keywordFlows) {
      for (const flow of keywordFlows) {
        const keywords = flow.trigger_keywords || [];
        const hasMatch = keywords.some((keyword: string) =>
          contentLower.includes(keyword.toLowerCase())
        );

        if (hasMatch) {
          console.log(`🚀 Starting flow by keyword: ${flow.name}`);

          await executor.startFlow(flow.id, clientId, phone);

          return {
            shouldContinueToAI: false,
            flowExecuted: true,
            flowName: flow.name
          };
        }
      }
    }

    // 3. Nenhum flow aplicável
    console.log(`➡️ No flow matched, continuing to AI`);

    return {
      shouldContinueToAI: true,
      flowExecuted: false
    };

  } catch (error: any) {
    console.error('❌ Error in checkInteractiveFlow:', error);

    // Em caso de erro, continuar para IA (fail-safe)
    return {
      shouldContinueToAI: true,
      flowExecuted: false
    };
  }
};
```

**2. Atualizar chatbotFlow.ts**
```typescript
// src/flows/chatbotFlow.ts

import { checkInteractiveFlow } from '@/nodes/checkInteractiveFlow';

// ... imports existentes ...

export const processChatbotMessage = async (body: any): Promise<void> => {
  // ... código existente até NODE 9 (Get Chat History) ...

  // ========================================
  // NODE 15: CHECK INTERACTIVE FLOW (NOVO)
  // ========================================
  const flowResult = await checkInteractiveFlow({
    clientId,
    phone: customerPhone,
    content: normalizedMessage.content,
    isInteractiveReply: normalizedMessage.type === 'interactive',
    interactiveResponseId: normalizedMessage.interactiveResponseId
  });

  // Se flow foi executado, parar pipeline (não vai para IA)
  if (flowResult.flowExecuted) {
    console.log(`✅ Flow "${flowResult.flowName}" executed, stopping pipeline`);
    return;
  }

  // Se não tem flow, continuar para IA
  if (!flowResult.shouldContinueToAI) {
    console.log(`⏸️ Flow processing, waiting for next interaction`);
    return;
  }

  console.log(`➡️ No active flow, continuing to AI agent`);

  // ========================================
  // NODE 10: GET RAG CONTEXT (existente)
  // ========================================
  // ... continua pipeline normal ...
};
```

**3. Atualizar parseMessage para detectar interativas**
```typescript
// src/nodes/parseMessage.ts

export interface ParsedMessage {
  type: 'text' | 'audio' | 'image' | 'video' | 'document' | 'interactive';
  content: string;
  mediaUrl?: string;
  mimeType?: string;
  interactiveType?: 'button_reply' | 'list_reply';
  interactiveResponseId?: string;
  interactiveResponseTitle?: string;
}

export const parseMessage = async (input: ParseMessageInput): Promise<ParsedMessage> => {
  const { message } = input;

  // ... código existente ...

  // Adicionar detecção de interactive
  if (message.type === 'interactive') {
    const { interactive } = message;

    if (interactive.type === 'button_reply') {
      return {
        type: 'interactive',
        content: interactive.button_reply.title,
        interactiveType: 'button_reply',
        interactiveResponseId: interactive.button_reply.id,
        interactiveResponseTitle: interactive.button_reply.title
      };
    }

    if (interactive.type === 'list_reply') {
      return {
        type: 'interactive',
        content: interactive.list_reply.title,
        interactiveType: 'list_reply',
        interactiveResponseId: interactive.list_reply.id,
        interactiveResponseTitle: interactive.list_reply.title
      };
    }
  }

  // ... resto do código ...
};
```

**4. Criar endpoint de teste end-to-end**
```typescript
// src/app/api/test/flow-execution/route.ts

export async function POST(req: NextRequest) {
  const { flowId, phone } = await req.json();

  const executor = new FlowExecutor();

  try {
    // Simular início de flow
    const execution = await executor.startFlow(
      flowId,
      'test-client-id',
      phone
    );

    return NextResponse.json({
      success: true,
      executionId: execution.id
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
```

#### Testes de Integração
- [ ] Flow com trigger "always" é iniciado automaticamente
- [ ] Flow com trigger "keyword" é iniciado ao enviar keyword
- [ ] Resposta de botão continua flow corretamente
- [ ] Resposta de lista continua flow corretamente
- [ ] Quando flow termina, próxima mensagem vai para IA
- [ ] Múltiplos contatos podem ter flows ativos simultaneamente
- [ ] Transferência para IA interrompe flow

#### Entregas
- ✅ Node `checkInteractiveFlow` implementado
- ✅ Integração com `chatbotFlow.ts`
- ✅ Parser de mensagens interativas
- ✅ Testes end-to-end passando

---

### Fase 5: Interface Drag-and-Drop
**Duração:** 3-4 semanas
**Status:** 🔴 Não iniciado
**Dependências:** Fase 4

#### Objetivos
1. Interface visual profissional e fluida
2. Performance de 60 FPS
3. Suporte mobile responsivo
4. UX intuitiva

#### Stack Recomendada

```json
{
  "dependencies": {
    "@xyflow/react": "^12.0.0",     // Editor de fluxos (ex-ReactFlow)
    "zustand": "^4.5.0",            // State management leve
    "@dnd-kit/core": "^6.1.0",      // Drag and drop (fallback)
    "@dnd-kit/sortable": "^8.0.0",
    "framer-motion": "^10.18.0",    // Animações fluidas
    "react-hot-toast": "^2.4.1",    // Notificações
    "immer": "^10.0.3"              // Immutability helper
  }
}
```

#### Componentes Principais

**1. FlowEditor (Container)**
```typescript
// src/app/dashboard/flows/[flowId]/edit/page.tsx

'use client';

import { ReactFlowProvider } from '@xyflow/react';
import FlowCanvas from '@/components/flows/FlowCanvas';
import FlowToolbar from '@/components/flows/FlowToolbar';
import FlowSidebar from '@/components/flows/FlowSidebar';
import FlowPropertiesPanel from '@/components/flows/FlowPropertiesPanel';
import { useFlowStore } from '@/stores/flowStore';

export default function FlowEditorPage({ params }: { params: { flowId: string } }) {
  const { flowId } = params;

  return (
    <ReactFlowProvider>
      <div className="h-screen flex flex-col">
        {/* Toolbar superior */}
        <FlowToolbar flowId={flowId} />

        <div className="flex-1 flex">
          {/* Sidebar esquerda - Blocos disponíveis */}
          <FlowSidebar />

          {/* Canvas central */}
          <FlowCanvas flowId={flowId} />

          {/* Painel direito - Propriedades do bloco selecionado */}
          <FlowPropertiesPanel />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
```

**2. FlowCanvas (Editor visual)**
```typescript
// src/components/flows/FlowCanvas.tsx

'use client';

import { useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import MessageBlock from './blocks/MessageBlock';
import InteractiveListBlock from './blocks/InteractiveListBlock';
import InteractiveButtonsBlock from './blocks/InteractiveButtonsBlock';
import ConditionBlock from './blocks/ConditionBlock';
import ActionBlock from './blocks/ActionBlock';
import StartBlock from './blocks/StartBlock';
import EndBlock from './blocks/EndBlock';

import { useFlowStore } from '@/stores/flowStore';

// Mapear tipos de blocos para componentes customizados
const nodeTypes = {
  start: StartBlock,
  message: MessageBlock,
  interactive_list: InteractiveListBlock,
  interactive_buttons: InteractiveButtonsBlock,
  condition: ConditionBlock,
  action: ActionBlock,
  ai_handoff: AIHandoffBlock,
  human_handoff: HumanHandoffBlock,
  delay: DelayBlock,
  webhook: WebhookBlock,
  end: EndBlock
};

export default function FlowCanvas({ flowId }: { flowId: string }) {
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    loadFlow,
    saveFlow,
    selectedNodeId,
    setSelectedNode
  } = useFlowStore();

  const [localNodes, setLocalNodes, onNodesChange] = useNodesState([]);
  const [localEdges, setLocalEdges, onEdgesChange] = useEdgesState([]);

  // Carregar flow ao montar
  useEffect(() => {
    if (flowId !== 'new') {
      loadFlow(flowId);
    }
  }, [flowId, loadFlow]);

  // Sincronizar store com estado local
  useEffect(() => {
    setLocalNodes(nodes);
    setLocalEdges(edges);
  }, [nodes, edges]);

  // Conectar blocos
  const onConnect = useCallback((connection: Connection) => {
    const edge: Edge = {
      ...connection,
      id: `edge-${connection.source}-${connection.target}`,
      type: 'smoothstep',
      animated: true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: '#3B82F6'
      },
      style: { stroke: '#3B82F6', strokeWidth: 2 }
    };

    setEdges(addEdge(edge, localEdges));
  }, [localEdges, setEdges]);

  // Selecionar node ao clicar
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);
  }, [setSelectedNode]);

  // Auto-save a cada 5 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      if (nodes.length > 0) {
        saveFlow();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [nodes, saveFlow]);

  return (
    <div className="flex-1 bg-gray-50">
      <ReactFlow
        nodes={localNodes}
        edges={localEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true
        }}
      >
        <Background color="#aaa" gap={16} />
        <Controls />
        <MiniMap
          nodeStrokeColor={(node) => {
            if (node.id === selectedNodeId) return '#3B82F6';
            return '#ccc';
          }}
          nodeColor={(node) => {
            switch (node.type) {
              case 'start': return '#10B981';
              case 'end': return '#EF4444';
              case 'interactive_list': return '#8B5CF6';
              case 'interactive_buttons': return '#6366F1';
              case 'condition': return '#F59E0B';
              default: return '#6B7280';
            }
          }}
        />
      </ReactFlow>
    </div>
  );
}
```

**3. Zustand Store**
```typescript
// src/stores/flowStore.ts

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Node, Edge } from '@xyflow/react';
import { InteractiveFlow } from '@/types/interactiveFlows';

interface FlowState {
  flowId: string | null;
  flowName: string;
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;

  // Actions
  loadFlow: (flowId: string) => Promise<void>;
  saveFlow: () => Promise<void>;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (type: string, position: { x: number; y: number }) => void;
  updateNode: (nodeId: string, data: any) => void;
  deleteNode: (nodeId: string) => void;
  setSelectedNode: (nodeId: string | null) => void;
}

export const useFlowStore = create<FlowState>()(
  immer((set, get) => ({
    flowId: null,
    flowName: 'Novo Flow',
    nodes: [],
    edges: [],
    selectedNodeId: null,

    loadFlow: async (flowId: string) => {
      const response = await fetch(`/api/flows/${flowId}`);
      const { flow } = await response.json();

      set((state) => {
        state.flowId = flow.id;
        state.flowName = flow.name;
        state.nodes = flow.blocks.map((block: any) => ({
          id: block.id,
          type: block.type,
          position: block.position,
          data: block.data
        }));
        state.edges = flow.edges;
      });
    },

    saveFlow: async () => {
      const { flowId, flowName, nodes, edges } = get();

      if (!flowId || flowId === 'new') return;

      const blocks = nodes.map(node => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data
      }));

      await fetch(`/api/flows/${flowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: flowName,
          blocks,
          edges
        })
      });
    },

    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),

    addNode: (type, position) => {
      const newNode: Node = {
        id: `node-${Date.now()}`,
        type,
        position,
        data: { label: type }
      };

      set((state) => {
        state.nodes.push(newNode);
      });
    },

    updateNode: (nodeId, data) => {
      set((state) => {
        const node = state.nodes.find(n => n.id === nodeId);
        if (node) {
          node.data = { ...node.data, ...data };
        }
      });
    },

    deleteNode: (nodeId) => {
      set((state) => {
        state.nodes = state.nodes.filter(n => n.id !== nodeId);
        state.edges = state.edges.filter(e =>
          e.source !== nodeId && e.target !== nodeId
        );
      });
    },

    setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId })
  }))
);
```

**4. Componente de Bloco Customizado**
```typescript
// src/components/flows/blocks/InteractiveListBlock.tsx

'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { List, Settings } from 'lucide-react';

const InteractiveListBlock = memo(({ data, selected }: NodeProps) => {
  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 bg-white shadow-md
        min-w-[200px] max-w-[300px]
        transition-all duration-200
        ${selected ? 'border-blue-500 shadow-lg' : 'border-purple-300'}
      `}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-purple-500"
      />

      {/* Cabeçalho */}
      <div className="flex items-center gap-2 mb-2">
        <List className="w-5 h-5 text-purple-600" />
        <span className="font-semibold text-sm text-gray-800">
          Lista Interativa
        </span>
      </div>

      {/* Preview do conteúdo */}
      <div className="text-xs text-gray-600 space-y-1">
        {data.listBody && (
          <p className="truncate">{data.listBody}</p>
        )}
        {data.listSections && (
          <p className="text-purple-600 font-medium">
            {data.listSections.length} seções
          </p>
        )}
      </div>

      {/* Output handles (múltiplos, um para cada opção) */}
      {data.listSections?.map((section: any, idx: number) => (
        section.rows.map((row: any, rowIdx: number) => (
          <Handle
            key={row.id}
            type="source"
            position={Position.Bottom}
            id={row.id}
            className="w-3 h-3 !bg-purple-500"
            style={{
              left: `${((idx * section.rows.length + rowIdx + 1) / getTotalRows(data.listSections)) * 100}%`
            }}
          />
        ))
      ))}
    </div>
  );
});

const getTotalRows = (sections: any[]) => {
  return sections?.reduce((acc, section) => acc + section.rows.length, 0) || 1;
};

InteractiveListBlock.displayName = 'InteractiveListBlock';

export default InteractiveListBlock;
```

**5. Sidebar com blocos disponíveis**
```typescript
// src/components/flows/FlowSidebar.tsx

'use client';

import { MessageSquare, List, Square, GitBranch, Zap, Bot, User } from 'lucide-react';

const blockTypes = [
  {
    type: 'message',
    label: 'Mensagem',
    icon: MessageSquare,
    color: 'text-blue-600',
    description: 'Enviar texto simples'
  },
  {
    type: 'interactive_list',
    label: 'Lista',
    icon: List,
    color: 'text-purple-600',
    description: 'Menu com até 10 opções'
  },
  {
    type: 'interactive_buttons',
    label: 'Botões',
    icon: Square,
    color: 'text-indigo-600',
    description: 'Até 3 botões de escolha'
  },
  {
    type: 'condition',
    label: 'Condição',
    icon: GitBranch,
    color: 'text-yellow-600',
    description: 'If/else baseado em variável'
  },
  {
    type: 'action',
    label: 'Ação',
    icon: Zap,
    color: 'text-orange-600',
    description: 'Definir variável, tag, etc'
  },
  {
    type: 'ai_handoff',
    label: 'Transferir IA',
    icon: Bot,
    color: 'text-green-600',
    description: 'Enviar para agente IA'
  },
  {
    type: 'human_handoff',
    label: 'Transferir Humano',
    icon: User,
    color: 'text-red-600',
    description: 'Enviar para atendente'
  }
];

export default function FlowSidebar() {
  const onDragStart = (event: React.DragEvent, blockType: string) => {
    event.dataTransfer.setData('application/reactflow', blockType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
      <h2 className="text-lg font-bold mb-4">Blocos</h2>

      <div className="space-y-2">
        {blockTypes.map((block) => {
          const Icon = block.icon;

          return (
            <div
              key={block.type}
              draggable
              onDragStart={(e) => onDragStart(e, block.type)}
              className="
                p-3 border-2 border-gray-200 rounded-lg
                cursor-grab active:cursor-grabbing
                hover:border-blue-400 hover:shadow-md
                transition-all duration-200
              "
            >
              <div className="flex items-start gap-2">
                <Icon className={`w-5 h-5 ${block.color} flex-shrink-0 mt-0.5`} />
                <div>
                  <p className="font-medium text-sm">{block.label}</p>
                  <p className="text-xs text-gray-500">{block.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
```

**6. Painel de Propriedades**
```typescript
// src/components/flows/FlowPropertiesPanel.tsx

'use client';

import { useFlowStore } from '@/stores/flowStore';
import MessageBlockProperties from './properties/MessageBlockProperties';
import InteractiveListProperties from './properties/InteractiveListProperties';
import InteractiveButtonsProperties from './properties/InteractiveButtonsProperties';
// ... outros imports

export default function FlowPropertiesPanel() {
  const { nodes, selectedNodeId, updateNode } = useFlowStore();

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  if (!selectedNode) {
    return (
      <aside className="w-80 bg-white border-l border-gray-200 p-4">
        <p className="text-gray-500 text-sm">
          Selecione um bloco para editar suas propriedades
        </p>
      </aside>
    );
  }

  const handleUpdate = (data: any) => {
    updateNode(selectedNodeId!, data);
  };

  return (
    <aside className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <h3 className="font-bold mb-4">Propriedades</h3>

      {selectedNode.type === 'message' && (
        <MessageBlockProperties node={selectedNode} onUpdate={handleUpdate} />
      )}

      {selectedNode.type === 'interactive_list' && (
        <InteractiveListProperties node={selectedNode} onUpdate={handleUpdate} />
      )}

      {selectedNode.type === 'interactive_buttons' && (
        <InteractiveButtonsProperties node={selectedNode} onUpdate={handleUpdate} />
      )}

      {/* ... outros tipos ... */}
    </aside>
  );
}
```

#### Performance e Otimizações

**1. Virtualização de Nodes (muitos blocos)**
```typescript
// Usar react-window ou react-virtuoso se necessário
import { FixedSizeList } from 'react-window';
```

**2. Memoização agressiva**
```typescript
// Todos os componentes de bloco devem usar memo()
import { memo } from 'react';

export const MyBlock = memo((props: NodeProps) => {
  // ...
}, (prev, next) => {
  // Custom comparison
  return prev.data === next.data && prev.selected === next.selected;
});
```

**3. Debounce no auto-save**
```typescript
import { useDebouncedCallback } from 'use-debounce';

const debouncedSave = useDebouncedCallback(() => {
  saveFlow();
}, 1000);
```

**4. Canvas otimizado**
```typescript
// Usar snapToGrid para melhor performance
<ReactFlow
  snapToGrid
  snapGrid={[15, 15]}
  defaultEdgeOptions={{
    type: 'smoothstep', // Mais performático que 'bezier'
    animated: false     // Desabilitar animação se muitos edges
  }}
/>
```

#### Entregas
- ✅ Interface drag-and-drop funcional
- ✅ Todos os tipos de blocos com componentes customizados
- ✅ Painel de propriedades dinâmico
- ✅ Auto-save funcionando
- ✅ Performance de 60 FPS
- ✅ Responsivo (desktop + tablet)

---

### Fase 6: Testes e Refinamento
**Duração:** 1-2 semanas
**Status:** 🔴 Não iniciado
**Dependências:** Fase 5

#### Objetivos
1. Testes end-to-end completos
2. Polimento da UX
3. Documentação final
4. Otimizações de performance

#### Tarefas

**1. Testes E2E com Playwright**
```typescript
// tests/e2e/interactive-flows.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Interactive Flows', () => {
  test('should create a simple flow with buttons', async ({ page }) => {
    await page.goto('/dashboard/flows');
    await page.click('text=Criar Flow');

    // Arrastar bloco de botões
    await page.dragAndDrop(
      '[data-block-type="interactive_buttons"]',
      '.react-flow'
    );

    // Configurar botões
    await page.fill('[name="button-1-title"]', 'Sim');
    await page.fill('[name="button-2-title"]', 'Não');

    // Salvar
    await page.click('text=Salvar');

    // Verificar salvou
    await expect(page.locator('text=Flow salvo')).toBeVisible();
  });

  test('should execute flow when keyword is sent', async ({ page }) => {
    // Testar execução real do flow
  });
});
```

**2. Testes de Performance**
```typescript
// Testar com 100+ blocos
// Medir FPS durante drag
// Medir tempo de save/load
```

**3. Polimento UX**
- [ ] Adicionar tooltips explicativos
- [ ] Animações suaves (framer-motion)
- [ ] Loading states
- [ ] Error boundaries
- [ ] Undo/Redo (opcional)
- [ ] Zoom controls
- [ ] Keyboard shortcuts (Ctrl+S para salvar, etc)

**4. Documentação**
```markdown
# docs/features/flow/USER_GUIDE.md

## Como Criar um Flow Interativo

### 1. Acesse o Editor
...

### 2. Adicione Blocos
...

### 3. Conecte os Blocos
...
```

**5. Vídeo tutorial**
- Gravar screencast de 5 minutos mostrando criação de flow

#### Entregas
- ✅ Testes E2E completos
- ✅ Performance validada (60 FPS)
- ✅ Documentação de usuário
- ✅ Vídeo tutorial
- ✅ Sistema pronto para produção

---

## 6. Stack Tecnológica

### Frontend
| Tech | Uso | Versão |
|------|-----|--------|
| @xyflow/react | Editor visual de fluxos | ^12.0.0 |
| Zustand | State management | ^4.5.0 |
| Framer Motion | Animações | ^10.18.0 |
| React Hot Toast | Notificações | ^2.4.1 |
| Immer | Immutability | ^10.0.3 |

### Backend
| Tech | Uso |
|------|-----|
| Next.js 14 | API Routes |
| Supabase | Banco de dados |
| TypeScript | Type safety |

### Infraestrutura
| Serviço | Uso |
|---------|-----|
| Vercel | Hosting |
| Supabase | Database + RLS |
| Meta WhatsApp API | Mensagens interativas |

---

## 7. Banco de Dados

### Tabelas

#### `interactive_flows`
Armazena definição dos flows.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | PK |
| client_id | UUID | FK para clients |
| name | TEXT | Nome do flow |
| description | TEXT | Descrição |
| is_active | BOOLEAN | Flow ativo? |
| trigger_type | TEXT | 'keyword' \| 'qr_code' \| 'link' \| 'manual' \| 'always' |
| trigger_keywords | TEXT[] | Keywords que ativam flow |
| blocks | JSONB | Array de blocos |
| edges | JSONB | Array de conexões |
| start_block_id | TEXT | ID do bloco inicial |
| created_by | UUID | FK para user_profiles |
| created_at | TIMESTAMPTZ | Data criação |
| updated_at | TIMESTAMPTZ | Última atualização |

#### `flow_executions`
Armazena estado de execução em tempo real.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | PK |
| flow_id | UUID | FK para interactive_flows |
| client_id | UUID | FK para clients |
| phone | TEXT | Telefone do contato |
| current_block_id | TEXT | Bloco atual |
| variables | JSONB | Variáveis do contexto |
| history | JSONB | Histórico de passos |
| status | TEXT | 'active' \| 'completed' \| 'transferred_ai' \| 'transferred_human' |
| started_at | TIMESTAMPTZ | Início |
| last_step_at | TIMESTAMPTZ | Último step |
| completed_at | TIMESTAMPTZ | Fim |

### Índices

```sql
-- Performance
CREATE INDEX idx_flows_active ON interactive_flows(client_id, is_active);
CREATE INDEX idx_flows_keywords ON interactive_flows USING GIN(trigger_keywords);
CREATE INDEX idx_executions_active ON flow_executions(client_id, phone, status);
```

### RLS Policies

```sql
-- Clientes só veem seus flows
CREATE POLICY "Clients manage own flows"
  ON interactive_flows
  FOR ALL
  USING (client_id IN (
    SELECT client_id FROM user_profiles WHERE id = auth.uid()
  ));
```

---

## 8. Performance e Otimizações

### Frontend

| Otimização | Técnica | Ganho Esperado |
|------------|---------|----------------|
| Rendering | React.memo() em todos componentes | 30% menos re-renders |
| State | Zustand com Immer (imutabilidade) | State updates rápidos |
| Canvas | SnapToGrid habilitado | 60 FPS consistente |
| Auto-save | Debounce de 1s | Reduz requests |
| Drag | requestAnimationFrame | Drag suave |

### Backend

| Otimização | Técnica | Ganho Esperado |
|------------|---------|----------------|
| Queries | Índices GIN em JSONB | Queries 10x mais rápidas |
| Cache | Zustand store em memória | Não recarrega flow toda mudança |
| Parallelismo | Execução assíncrona de blocos | Reduz latência |

### Database

```sql
-- Particionar flow_executions por status
CREATE INDEX idx_executions_active
  ON flow_executions(client_id, phone)
  WHERE status = 'active';

-- Vacuum automático
ALTER TABLE flow_executions SET (autovacuum_enabled = true);
```

---

## 9. Riscos e Mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| **Limitações da API Meta** | Alto | Média | Validar limites no frontend (3 botões max, etc) |
| **Performance com flows grandes** | Médio | Baixa | Virtualização + lazy loading de blocos |
| **Conflitos de execução** | Alto | Baixa | Constraint UNIQUE em execuções ativas |
| **Perda de dados (falha no save)** | Alto | Baixa | Auto-save + backup em localStorage |
| **Complexidade da UI** | Médio | Média | Tutoriais + templates prontos |
| **Race conditions no executor** | Alto | Média | Locks otimistas + retries |

---

## 10. Próximos Passos

### Imediato (Próxima Sprint)
1. [ ] **Fase 0:** Estudar docs da Meta API (2-3 dias)
2. [ ] **Fase 1:** Criar POC de envio/recepção (1 semana)
3. [ ] Validar com stakeholders

### Curto Prazo (1-2 meses)
1. [ ] **Fase 2:** Estrutura de dados (1 semana)
2. [ ] **Fase 3:** Executor de flows (2 semanas)
3. [ ] **Fase 4:** Integração com pipeline (1 semana)

### Médio Prazo (2-3 meses)
1. [ ] **Fase 5:** Interface drag-and-drop (3-4 semanas)
2. [ ] **Fase 6:** Testes e refinamento (1-2 semanas)

### Longo Prazo (3+ meses)
1. [ ] Templates prontos de flows
2. [ ] Marketplace de flows
3. [ ] Analytics de conversão por flow
4. [ ] A/B testing de flows

---

## Métricas de Sucesso

| Métrica | Meta | Como Medir |
|---------|------|------------|
| **Performance (FPS)** | ≥ 60 FPS durante drag | Chrome DevTools Performance |
| **Tempo de resposta** | ≤ 1s entre blocos | Logs do executor |
| **Taxa de adoção** | 70% dos clientes usam | Analytics |
| **Flows criados** | 5+ flows/cliente | Query no banco |
| **Satisfação (NPS)** | ≥ 8/10 | Survey |

---

## Apêndice

### Recursos Externos

- [WhatsApp Business API - Interactive Messages](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages#interactive-messages)
- [@xyflow/react Docs](https://reactflow.dev/)
- [Zustand Guide](https://zustand-demo.pmnd.rs/)
- [Framer Motion](https://www.framer.com/motion/)

### Referências de Design

- **BotConversa:** https://botconversa.com.br/
- **ManyChat:** https://manychat.com/
- **Typebot:** https://typebot.io/ (open source, ótima referência de UX)

---

**Documento criado:** 2025-12-06
**Autor:** Claude Code + Luis Boff
**Status:** 🔴 Planejamento
**Versão:** 1.0

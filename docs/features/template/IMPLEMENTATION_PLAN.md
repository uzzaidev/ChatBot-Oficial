# WhatsApp Template Messages - Plano de Implementação

## 📋 Sumário Executivo

Este documento detalha o plano completo de implementação do recurso de **Template Messages** do WhatsApp, permitindo que usuários criem, gerenciem, submetam para aprovação da Meta e utilizem templates para iniciar conversas após a janela de 24 horas.

---

## 🎯 Objetivo

Implementar sistema completo de gerenciamento de WhatsApp Message Templates que permita:
1. **Criar templates** diretamente no dashboard
2. **Submeter para aprovação** da Meta via API
3. **Acompanhar status** de aprovação (pending, approved, rejected)
4. **Utilizar templates** na interface de conversas
5. **Enviar templates** para iniciar conversas fora da janela de 24h

---

## 🔍 Pesquisa - WhatsApp Cloud API Templates

### O que são Message Templates?

**Message Templates** são mensagens pré-aprovadas pela Meta que permitem:
- ✅ Iniciar conversas com clientes (outside 24h window)
- ✅ Enviar notificações estruturadas
- ✅ Manter compliance com políticas do WhatsApp
- ❌ **NÃO podem** ser usadas para spam ou marketing não solicitado

### Categorias de Templates

| Categoria | Descrição | Exemplo de Uso |
|-----------|-----------|----------------|
| `UTILITY` | Atualizações de pedidos, confirmações | "Seu pedido #{{1}} foi enviado" |
| `AUTHENTICATION` | Códigos OTP, verificação | "Seu código de verificação é {{1}}" |
| `MARKETING` | Promoções, ofertas (requer opt-in) | "Oferta especial: {{1}}% de desconto" |

### Estrutura de um Template

```json
{
  "name": "order_update",
  "language": "pt_BR",
  "category": "UTILITY",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "Atualização de Pedido"
    },
    {
      "type": "BODY",
      "text": "Olá {{1}}, seu pedido #{{2}} foi enviado e chegará em {{3}}.",
      "example": {
        "body_text": [["João", "12345", "2 dias"]]
      }
    },
    {
      "type": "FOOTER",
      "text": "Obrigado por sua compra!"
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "URL",
          "text": "Rastrear Pedido",
          "url": "https://example.com/track/{{1}}"
        }
      ]
    }
  ]
}
```

### Endpoints da Meta API

#### 1. Criar Template (POST)
```
POST https://graph.facebook.com/v18.0/{WABA_ID}/message_templates
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json
```

#### 2. Listar Templates (GET)
```
GET https://graph.facebook.com/v18.0/{WABA_ID}/message_templates
```

#### 3. Enviar Template Message (POST)
```
POST https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages
{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "type": "template",
  "template": {
    "name": "order_update",
    "language": { "code": "pt_BR" },
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "João" },
          { "type": "text", "text": "12345" },
          { "type": "text", "text": "2 dias" }
        ]
      }
    ]
  }
}
```

### Status de Aprovação

| Status | Descrição | Ação do Usuário |
|--------|-----------|-----------------|
| `PENDING` | Aguardando revisão da Meta | Aguardar (geralmente <24h) |
| `APPROVED` | Aprovado, pronto para uso | Pode enviar mensagens |
| `REJECTED` | Rejeitado (motivo fornecido) | Corrigir e reenviar |
| `PAUSED` | Pausado (qualidade baixa) | Melhorar qualidade |
| `DISABLED` | Desabilitado pela Meta | Contatar suporte |

### Variáveis (Placeholders)

- Formato: `{{1}}`, `{{2}}`, `{{3}}`, etc.
- Limite: até 256 caracteres por variável
- Obrigatório fornecer `example` no BODY se usar variáveis
- Variáveis são substituídas no momento do envio

---

## 🗄️ Banco de Dados - Schema

### Nova Tabela: `message_templates`

```sql
CREATE TABLE public.message_templates (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  
  -- Template Info (Meta)
  meta_template_id TEXT, -- ID retornado pela Meta após criação
  waba_id TEXT NOT NULL, -- WhatsApp Business Account ID
  
  -- Template Content
  name TEXT NOT NULL, -- nome único (lowercase, underscores only)
  category TEXT NOT NULL CHECK (category IN ('UTILITY', 'AUTHENTICATION', 'MARKETING')),
  language TEXT NOT NULL DEFAULT 'pt_BR',
  
  -- Components (JSON)
  components JSONB NOT NULL, -- Array de components (HEADER, BODY, FOOTER, BUTTONS)
  
  -- Status & Approval
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (
    status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'DISABLED')
  ),
  rejection_reason TEXT, -- Motivo da rejeição (se status = REJECTED)
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  UNIQUE(client_id, name, language) -- Mesmo template pode ter múltiplos idiomas
);

-- Index para busca por client
CREATE INDEX idx_templates_client_id ON public.message_templates(client_id);
CREATE INDEX idx_templates_status ON public.message_templates(status);
CREATE INDEX idx_templates_client_status ON public.message_templates(client_id, status);

-- RLS Policies
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários veem apenas templates do próprio client
CREATE POLICY "Users can view own client templates"
  ON public.message_templates
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- Policy: Client admins podem criar templates
CREATE POLICY "Client admins can create templates"
  ON public.message_templates
  FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT client_id FROM public.user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'client_admin')
    )
  );

-- Policy: Client admins podem editar templates
CREATE POLICY "Client admins can update templates"
  ON public.message_templates
  FOR UPDATE
  USING (
    client_id IN (
      SELECT client_id FROM public.user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'client_admin')
    )
  );

-- Policy: Client admins podem deletar templates (apenas DRAFT)
CREATE POLICY "Client admins can delete draft templates"
  ON public.message_templates
  FOR DELETE
  USING (
    status = 'DRAFT' AND
    client_id IN (
      SELECT client_id FROM public.user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'client_admin')
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE public.message_templates IS 'WhatsApp Message Templates (pre-approved messages)';
COMMENT ON COLUMN public.message_templates.meta_template_id IS 'Template ID retornado pela Meta API após criação';
COMMENT ON COLUMN public.message_templates.components IS 'Array de components (HEADER, BODY, FOOTER, BUTTONS) em formato JSON';
COMMENT ON COLUMN public.message_templates.status IS 'Status do template: DRAFT (local), PENDING (aguardando Meta), APPROVED (pronto), REJECTED (negado)';
```

### Exemplo de Registro

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "client_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "meta_template_id": "987654321",
  "waba_id": "123456789012345",
  "name": "order_confirmation",
  "category": "UTILITY",
  "language": "pt_BR",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "Pedido Confirmado ✅"
    },
    {
      "type": "BODY",
      "text": "Olá {{1}}! Seu pedido #{{2}} foi confirmado. Valor: R$ {{3}}. Previsão de entrega: {{4}}.",
      "example": {
        "body_text": [["Maria", "98765", "150,00", "3 dias úteis"]]
      }
    },
    {
      "type": "FOOTER",
      "text": "Obrigado pela preferência!"
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "URL",
          "text": "Ver Detalhes",
          "url": "https://loja.com/pedido/{{1}}"
        },
        {
          "type": "QUICK_REPLY",
          "text": "Falar com Suporte"
        }
      ]
    }
  ],
  "status": "APPROVED",
  "rejection_reason": null,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T12:00:00Z",
  "created_by": "user-uuid"
}
```

---

## 🚀 Arquitetura da Solução

### Componentes a Implementar

```
src/
├── app/
│   ├── api/
│   │   └── templates/
│   │       ├── route.ts                    # GET (list) / POST (create draft)
│   │       ├── [templateId]/
│   │       │   ├── route.ts                # GET (single) / PUT (update) / DELETE
│   │       │   ├── submit/route.ts         # POST (submit to Meta)
│   │       │   └── send/route.ts           # POST (send template message)
│   │       └── sync/route.ts               # POST (sync status from Meta)
│   │
│   └── dashboard/
│       └── templates/
│           ├── page.tsx                     # Template list page
│           ├── new/page.tsx                 # Create new template
│           └── [templateId]/
│               ├── page.tsx                 # View/edit template
│               └── preview/page.tsx         # Preview template
│
├── components/
│   ├── templates/
│   │   ├── TemplateList.tsx                # Lista de templates (tabela)
│   │   ├── TemplateForm.tsx                # Form de criação/edição
│   │   ├── TemplatePreview.tsx             # Preview visual do template
│   │   ├── TemplateStatusBadge.tsx         # Badge de status (colorido)
│   │   ├── ComponentEditor.tsx             # Editor de components (HEADER, BODY, etc)
│   │   ├── VariableInput.tsx               # Input com suporte a {{1}}, {{2}}
│   │   └── TemplateSelectorModal.tsx       # Modal para selecionar template (conversas)
│   │
│   ├── SendMessageForm.tsx (MODIFICADO)    # Adicionar botão "Template"
│   └── MediaUploadButton.tsx (REFERÊNCIA)  # Padrão de dropdown menu
│
├── lib/
│   ├── meta.ts (MODIFICADO)                # Adicionar funções de template
│   │   ├── createTemplate()
│   │   ├── getTemplates()
│   │   ├── sendTemplateMessage()
│   │   └── syncTemplateStatus()
│   │
│   └── types.ts (MODIFICADO)               # Adicionar tipos
│       ├── MessageTemplate
│       ├── TemplateComponent
│       ├── TemplateButton
│       └── TemplateSendPayload
│
└── hooks/
    ├── useTemplates.ts                      # Hook para listar templates
    ├── useTemplateForm.ts                   # Hook para criar/editar
    └── useTemplateSender.ts                 # Hook para enviar templates
```

---

## 🔄 Fluxo de Uso (User Journey)

### 1. Criar Template

```
Dashboard → Templates → Novo Template
↓
Preencher formulário:
  - Nome: order_confirmation
  - Categoria: UTILITY
  - Idioma: pt_BR
  - Componentes:
    * HEADER: "Pedido Confirmado ✅"
    * BODY: "Olá {{1}}, seu pedido #{{2}} foi confirmado!"
    * FOOTER: "Obrigado!"
    * BUTTON: "Ver Detalhes" (URL)
↓
Salvar como DRAFT
```

### 2. Submeter para Aprovação

```
Templates → [template] → "Submeter para Aprovação"
↓
POST /api/templates/[id]/submit
↓
Meta API recebe template
↓
Status muda para PENDING
↓
(Aguardar 1-24h)
↓
Status muda para APPROVED (ou REJECTED)
```

### 3. Enviar Template

```
Conversas → [conversa] → Botão "+" → Template
↓
Modal abre com lista de templates APPROVED
↓
Selecionar template
↓
Preencher variáveis {{1}}, {{2}}...
↓
Enviar
↓
POST /api/templates/[id]/send { phone, parameters }
↓
Mensagem enviada via WhatsApp
↓
Conversa iniciada (outside 24h window) ✅
```

---

## ✅ Checklist de Implementação

### Database & Backend Core
- [ ] Criar migration `add_message_templates.sql`
- [ ] Executar migration no Supabase
- [ ] Adicionar tipos TypeScript em `src/lib/types.ts`
- [ ] Implementar funções Meta API em `src/lib/meta.ts`
  - [ ] `createMetaTemplate()`
  - [ ] `listMetaTemplates()`
  - [ ] `sendTemplateMessage()`

### API Routes
- [ ] `GET/POST /api/templates/route.ts` (list, create)
- [ ] `GET/PUT/DELETE /api/templates/[id]/route.ts` (single CRUD)
- [ ] `POST /api/templates/[id]/submit/route.ts` (submit to Meta)
- [ ] `POST /api/templates/[id]/send/route.ts` (send template message)
- [ ] `POST /api/templates/sync/route.ts` (sync status from Meta)

### Frontend - Components
- [ ] `TemplateList.tsx` (tabela com status badges)
- [ ] `TemplateForm.tsx` (create/edit form)
- [ ] `TemplatePreview.tsx` (preview visual)
- [ ] `TemplateStatusBadge.tsx` (colorido por status)
- [ ] `ComponentEditor.tsx` (editor de HEADER, BODY, etc)
- [ ] `VariableInput.tsx` (input com validação de {{1}})
- [ ] `TemplateSelectorModal.tsx` (modal para conversas)

### Frontend - Pages
- [ ] `app/dashboard/templates/page.tsx` (list)
- [ ] `app/dashboard/templates/new/page.tsx` (create)
- [ ] `app/dashboard/templates/[id]/page.tsx` (view/edit)
- [ ] `app/dashboard/templates/[id]/preview/page.tsx` (preview)

### Hooks
- [ ] `useTemplates.ts` (fetch list)
- [ ] `useTemplateForm.ts` (create/edit logic)
- [ ] `useTemplateSender.ts` (send logic)

### Integration
- [ ] Modificar `SendMessageForm.tsx` (adicionar botão Template)
- [ ] Modificar `MediaUploadButton.tsx` (adicionar item Template)
- [ ] Modificar `DashboardNavigation.tsx` (adicionar link Templates)

### Testing & Validation
- [ ] Testar criação de template (DRAFT)
- [ ] Testar submissão para Meta (PENDING)
- [ ] Testar sync de status (APPROVED/REJECTED)
- [ ] Testar envio de template message
- [ ] Testar variáveis {{1}}, {{2}}
- [ ] Testar buttons (URL, QUICK_REPLY)
- [ ] Testar RLS policies
- [ ] Testar permissões (admin vs user)

### Documentation
- [ ] Atualizar README.md com seção Templates
- [ ] Documentar API endpoints
- [ ] Criar guia de uso para usuários finais
- [ ] Adicionar exemplos de templates comuns

---

## 🚨 Pontos de Atenção

### 1. Aprovação da Meta

- ⏰ **Tempo de aprovação**: 1-24 horas (geralmente <4h para inglês)
- ❌ **Principais motivos de rejeição**:
  - Template muito genérico
  - Variáveis sem contexto claro
  - Conteúdo promocional sem opt-in
  - Violação de políticas do WhatsApp
- ✅ **Dicas para aprovação rápida**:
  - Ser específico e contextual
  - Usar exemplos claros
  - Seguir guidelines da Meta
  - Categoria correta (UTILITY vs MARKETING)

### 2. Limites da API

- 📊 **Rate limits**:
  - 100 templates criados por hora por WABA
  - 80 mensagens de template por segundo por WABA
- 🔢 **Limites de conteúdo**:
  - HEADER: 60 caracteres
  - BODY: 1024 caracteres
  - FOOTER: 60 caracteres
  - Variáveis: 256 caracteres cada

### 3. Variáveis (Placeholders)

- Formato: `{{1}}`, `{{2}}`, etc (índice começa em 1)
- Máximo: 10 variáveis por component
- Obrigatório fornecer `example` no JSON se usar variáveis
- Validar que usuário preencheu todas as variáveis antes de enviar

### 4. Buttons

- **Tipos suportados**:
  - `URL`: Abre link (pode ter variável na URL)
  - `QUICK_REPLY`: Resposta rápida (texto definido)
  - `PHONE_NUMBER`: Inicia chamada
- **Limites**:
  - Máximo 3 buttons por template
  - QUICK_REPLY: máximo 2 por template

### 5. Segurança

- ✅ **NUNCA** armazenar Access Token no frontend
- ✅ **SEMPRE** usar Supabase Vault para API keys
- ✅ Validar permissões (RLS + role check)
- ✅ Sanitizar inputs (nome do template, variáveis)
- ❌ **NÃO** permitir edição de templates APPROVED (criar novo)

### 6. Status Sync

- Meta não envia webhooks de mudança de status
- Implementar sync manual ou cron job:
  - Opção 1: Botão "Sincronizar Status" na UI
  - Opção 2: Vercel Cron Job diário
  - Opção 3: Sync on demand ao listar templates

---

## 📚 Recursos Úteis

### Documentação Oficial

- [Meta WhatsApp Business Platform - Message Templates](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates)
- [Cloud API - Send Template Messages](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates)
- [Template Components Reference](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/components)

### Ferramentas

- [Meta Business Manager - Template Creation](https://business.facebook.com/)
- [Postman Collection - WhatsApp Cloud API](https://www.postman.com/meta/workspace/whatsapp-business-platform)

### Exemplos de Templates

**1. Order Confirmation (UTILITY)**
```json
{
  "name": "order_confirmation",
  "category": "UTILITY",
  "language": "pt_BR",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "Pedido Confirmado ✅"
    },
    {
      "type": "BODY",
      "text": "Olá {{1}}! Seu pedido #{{2}} foi confirmado com sucesso. Valor: R$ {{3}}. Previsão de entrega: {{4}}.",
      "example": {
        "body_text": [["João", "98765", "250,00", "3 dias úteis"]]
      }
    },
    {
      "type": "FOOTER",
      "text": "Obrigado pela preferência!"
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "URL",
          "text": "Rastrear Pedido",
          "url": "https://loja.com/track/{{1}}"
        }
      ]
    }
  ]
}
```

**2. OTP Authentication (AUTHENTICATION)**
```json
{
  "name": "otp_verification",
  "category": "AUTHENTICATION",
  "language": "pt_BR",
  "components": [
    {
      "type": "BODY",
      "text": "Seu código de verificação é: {{1}}. Válido por 10 minutos. Não compartilhe este código.",
      "example": {
        "body_text": [["123456"]]
      }
    }
  ]
}
```

**3. Appointment Reminder (UTILITY)**
```json
{
  "name": "appointment_reminder",
  "category": "UTILITY",
  "language": "pt_BR",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "Lembrete de Consulta 📅"
    },
    {
      "type": "BODY",
      "text": "Olá {{1}}, você tem uma consulta agendada para {{2}} às {{3}} com Dr(a). {{4}}. Local: {{5}}.",
      "example": {
        "body_text": [["Maria", "15/01/2024", "14:00", "Silva", "Clínica Central"]]
      }
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "QUICK_REPLY",
          "text": "Confirmar"
        },
        {
          "type": "QUICK_REPLY",
          "text": "Reagendar"
        }
      ]
    }
  ]
}
```

---

## 🎯 Próximos Passos (Após Implementação)

### Melhorias Futuras (Phase 6)

1. **Template Analytics**
   - Tracking de envios por template
   - Taxa de abertura/resposta
   - Custos por template

2. **Template Builder Visual**
   - Editor WYSIWYG (drag-and-drop)
   - Preview em tempo real
   - Biblioteca de templates prontos

3. **Automações**
   - Envio automático de templates (triggers)
   - Integração com flows interativos
   - Sequências de templates

4. **Multi-idioma**
   - Gerenciar múltiplas versões do mesmo template
   - Auto-detecção de idioma do cliente
   - Fallback inteligente

5. **A/B Testing**
   - Testar variações de templates
   - Métricas de performance
   - Auto-otimização

---

## 📝 Notas Finais

Este plano cobre a implementação completa do recurso de WhatsApp Message Templates, desde o banco de dados até a interface do usuário. A implementação deve ser feita de forma incremental, seguindo as fases descritas.

**Prioridade**: ALTA
**Complexidade**: MÉDIA-ALTA
**Tempo estimado**: 40-60 horas
**Dependências**: Meta WhatsApp Business API, Supabase Vault

**Autor**: Claude (AI Assistant)
**Data**: 2024-12-08
**Versão**: 1.0

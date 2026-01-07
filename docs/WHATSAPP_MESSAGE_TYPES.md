# WhatsApp Business API - Message Types Reference

Documentação completa dos tipos de mensagens suportados pela WhatsApp Business API (Cloud API).

---

## 📱 1. Basic Messages (Já implementadas ✅)

### Text Messages
Mensagens de texto simples com formatação Markdown opcional.

```json
{
  "type": "text",
  "text": {
    "body": "Olá! Como posso ajudar?"
  }
}
```

### Media Messages
- **Images**: PNG, JPG (max 5MB)
- **Videos**: MP4, 3GP (max 16MB)
- **Documents**: PDF, DOCX, etc (max 100MB)
- **Audio**: MP3, OGG, AAC (max 16MB)

```json
{
  "type": "image",
  "image": {
    "link": "https://example.com/image.jpg",
    "caption": "Legenda opcional"
  }
}
```

### Location Messages
Compartilhar localização geográfica.

```json
{
  "type": "location",
  "location": {
    "latitude": -25.4284,
    "longitude": -49.2733,
    "name": "Curitiba",
    "address": "Paraná, Brasil"
  }
}
```

### Contact Messages
Compartilhar informações de contato (vCard).

```json
{
  "type": "contacts",
  "contacts": [
    {
      "name": {
        "formatted_name": "Luis Fernando Boff"
      },
      "phones": [
        { "phone": "+5554999567051" }
      ]
    }
  ]
}
```

---

## 🎯 2. Interactive Messages (JÁ IMPLEMENTADO ✅)

### Reply Buttons

**Características:**
- Até **3 botões** por mensagem
- Usuário clica → Resposta automática enviada
- **Não precisa** de aprovação prévia da Meta
- Ideal para: Confirmações, menus simples, FAQ

**Exemplo de uso:**
```json
{
  "type": "interactive",
  "interactive": {
    "type": "button",
    "header": {
      "type": "text",
      "text": "Orçamento de Energia Solar"
    },
    "body": {
      "text": "Gostaria de receber um orçamento personalizado para sua residência?"
    },
    "footer": {
      "text": "Responda em um clique"
    },
    "action": {
      "buttons": [
        {
          "type": "reply",
          "reply": {
            "id": "btn_yes",
            "title": "Sim, quero!"
          }
        },
        {
          "type": "reply",
          "reply": {
            "id": "btn_no",
            "title": "Não, obrigado"
          }
        },
        {
          "type": "reply",
          "reply": {
            "id": "btn_info",
            "title": "Mais info"
          }
        }
      ]
    }
  }
}
```

**Resposta do usuário:**
```json
{
  "type": "interactive",
  "interactive": {
    "type": "button_reply",
    "button_reply": {
      "id": "btn_yes",
      "title": "Sim, quero!"
    }
  }
}
```

---

### List Messages

**Características:**
- Até **10 opções** em lista expansível
- Pode ter **seções** para categorizar opções
- Header opcional (texto/imagem)
- **Não precisa** de aprovação prévia da Meta
- Ideal para: Catálogos de serviços, menus complexos

**Exemplo de uso:**
```json
{
  "type": "interactive",
  "interactive": {
    "type": "list",
    "header": {
      "type": "text",
      "text": "Nossos Serviços"
    },
    "body": {
      "text": "Escolha o serviço de seu interesse:"
    },
    "footer": {
      "text": "Clique para ver opções"
    },
    "action": {
      "button": "Ver Serviços",
      "sections": [
        {
          "title": "Residencial",
          "rows": [
            {
              "id": "res_solar",
              "title": "Energia Solar",
              "description": "Instalação de painéis fotovoltaicos"
            },
            {
              "id": "res_manut",
              "title": "Manutenção Elétrica",
              "description": "Reparos e upgrades elétricos"
            }
          ]
        },
        {
          "title": "Comercial",
          "rows": [
            {
              "id": "com_solar",
              "title": "Solar Empresarial",
              "description": "Projetos de grande porte"
            }
          ]
        }
      ]
    }
  }
}
```

**Resposta do usuário:**
```json
{
  "type": "interactive",
  "interactive": {
    "type": "list_reply",
    "list_reply": {
      "id": "res_solar",
      "title": "Energia Solar",
      "description": "Instalação de painéis fotovoltaicos"
    }
  }
}
```

---

## 🛍️ 3. Catalog & Product Messages (Carousels)

### Single Product Message

**Características:**
- Mostra **1 produto** do catálogo do Facebook/Meta
- Imagem, nome, descrição, preço
- Botão customizável
- Requer catálogo configurado no Meta Business Manager

**Exemplo de uso:**
```json
{
  "type": "interactive",
  "interactive": {
    "type": "product",
    "body": {
      "text": "Encontrei este produto que pode te interessar:"
    },
    "footer": {
      "text": "Toque para ver detalhes"
    },
    "action": {
      "catalog_id": "YOUR_CATALOG_ID",
      "product_retailer_id": "SKU_123"
    }
  }
}
```

---

### Multi-Product Message (Carousel) ⭐ **Igual à screenshot!**

**Características:**
- Até **30 produtos** em **carousel horizontal** 📱
- Cada card: imagem, título, descrição, preço
- Organização em **seções** (até 10 seções)
- Botões de ação customizáveis
- Requer catálogo configurado

**Exemplo de uso (Apartamentos):**
```json
{
  "type": "interactive",
  "interactive": {
    "type": "product_list",
    "header": {
      "type": "text",
      "text": "Apartamentos Disponíveis"
    },
    "body": {
      "text": "Encontrei estes apartamentos com 2 quartos até R$ 2.400:"
    },
    "footer": {
      "text": "Deslize para ver mais opções"
    },
    "action": {
      "catalog_id": "YOUR_CATALOG_ID",
      "sections": [
        {
          "title": "2 Quartos - Navegantes",
          "product_items": [
            { "product_retailer_id": "apt_navegantes_001" },
            { "product_retailer_id": "apt_navegantes_002" }
          ]
        },
        {
          "title": "2 Quartos - Floresta",
          "product_items": [
            { "product_retailer_id": "apt_floresta_001" }
          ]
        }
      ]
    }
  }
}
```

**Como funciona:**
1. Usuário vê cards horizontais (swipe)
2. Cada card mostra: foto, endereço, m², preço, botões
3. Botões podem ser:
   - "Quero mais detalhes" → Abre URL do imóvel
   - "Conferir disponibilidade" → Envia mensagem de volta

**Configuração necessária:**
- Criar catálogo no Meta Business Manager
- Adicionar produtos (apartamentos) com:
  - `product_retailer_id`: ID único
  - `name`: "Apto. de 3 quartos na Rua..."
  - `description`: Detalhes do imóvel
  - `price`: Valor do aluguel
  - `image_url`: Foto do apartamento
  - `url`: Link externo (opcional)

---

### Catalog Message (Full Catalog)

**Características:**
- Botão que abre **catálogo completo**
- Cliente navega todos os produtos dentro do WhatsApp
- Carrinho de compras integrado
- Ideal para e-commerce

**Exemplo de uso:**
```json
{
  "type": "interactive",
  "interactive": {
    "type": "catalog_message",
    "body": {
      "text": "Confira nosso catálogo completo de produtos!"
    },
    "action": {
      "name": "catalog_message",
      "parameters": {
        "thumbnail_product_retailer_id": "featured_product_001"
      }
    }
  }
}
```

---

## 📋 4. WhatsApp Flows (Formulários Interativos)

**Características:**
- Formulários **multi-tela** dentro do WhatsApp
- Campos: text input, textarea, checkbox, radio, dropdown, date picker
- Navegação condicional entre telas
- **Precisa aprovação** da Meta
- Ideal para: Cadastros, agendamentos, pedidos customizados

**Componentes disponíveis:**
- Text Input
- Text Area (texto longo)
- Checkboxes (múltipla escolha)
- Radio Buttons (escolha única)
- Dropdown (seleção)
- Date Picker (calendário)
- Footer Buttons (ações)

**Casos de uso:**
- Formulário de orçamento multi-etapa
- Agendamento de visita técnica
- Cadastro de cliente
- Pesquisa de satisfação
- Lead qualification

**Exemplo de uso:**
```json
{
  "type": "interactive",
  "interactive": {
    "type": "flow",
    "header": {
      "type": "text",
      "text": "Solicitar Orçamento"
    },
    "body": {
      "text": "Preencha o formulário para receber seu orçamento personalizado:"
    },
    "footer": {
      "text": "Leva menos de 2 minutos"
    },
    "action": {
      "name": "flow",
      "parameters": {
        "flow_message_version": "3",
        "flow_token": "UNIQUE_FLOW_TOKEN",
        "flow_id": "YOUR_FLOW_ID",
        "flow_cta": "Começar",
        "flow_action": "navigate",
        "flow_action_payload": {
          "screen": "FORM_SCREEN"
        }
      }
    }
  }
}
```

**Documentação oficial:**
- [WhatsApp Flows](https://business.whatsapp.com/products/whatsapp-flows)
- [Flows API](https://developers.facebook.com/docs/whatsapp/flows)
- [GitHub Tools](https://github.com/WhatsApp/WhatsApp-Flows-Tools)

---

## 📧 5. Template Messages (Mensagens Aprovadas)

Templates são mensagens **pré-aprovadas** pela Meta. Necessárias para iniciar conversas fora da janela de 24h.

### CTA URL Button Template

**Características:**
- Botão que abre URL externa
- Header com imagem/vídeo/documento opcional
- Até **2 botões**: 1 CTA + 1 Quick Reply

**Exemplo de uso:**
```json
{
  "type": "template",
  "template": {
    "name": "apartamento_disponivel",
    "language": {
      "code": "pt_BR"
    },
    "components": [
      {
        "type": "header",
        "parameters": [
          {
            "type": "image",
            "image": {
              "link": "https://example.com/apt.jpg"
            }
          }
        ]
      },
      {
        "type": "body",
        "parameters": [
          {
            "type": "text",
            "text": "Apartamento 2 quartos"
          },
          {
            "type": "text",
            "text": "R$ 1.952"
          }
        ]
      },
      {
        "type": "button",
        "sub_type": "url",
        "index": "0",
        "parameters": [
          {
            "type": "text",
            "text": "apt_navegantes_001"
          }
        ]
      }
    ]
  }
}
```

### Call Button Template

**Características:**
- Botão para ligar diretamente
- Útil para atendimento humano urgente

---

## 📊 Comparação: O que usar quando?

| Necessidade | Tipo de Mensagem | Aprovação Meta? | Status |
|-------------|------------------|-----------------|--------|
| Confirmação simples (Sim/Não) | Reply Buttons | ❌ Não | ✅ **Implementado** |
| Menu com opções (até 10) | List Messages | ❌ Não | ✅ **Implementado** |
| Mostrar 1 produto | Single Product | ❌ Não (catálogo sim) | ❌ Não implementado |
| Mostrar vários produtos (carousel) | Multi-Product | ❌ Não (catálogo sim) | ❌ Não implementado |
| Catálogo completo de e-commerce | Catalog Message | ❌ Não (catálogo sim) | ❌ Não implementado |
| Formulário multi-etapa | WhatsApp Flows | ✅ Sim | ❌ Não implementado |
| Iniciar conversa (fora 24h) | Template Messages | ✅ Sim | ⚠️ Parcial |

---

## 🚀 Prioridade de Implementação (O que falta)

### ✅ JÁ IMPLEMENTADO
1. **Reply Buttons** - Sistema de botões clicáveis (via Interactive Flows)
2. **List Messages** - Listas expansíveis (via Interactive Flows)
3. **Flow System** - Executor de fluxos interativos completo

**Arquivos:**
- `src/lib/whatsapp/interactiveMessages.ts` - Funções de envio
- `src/lib/flows/flowExecutor.ts` - Executor de fluxos
- Tabelas: `interactive_flows`, `flow_executions`

---

### Alta Prioridade 🔥
1. **Multi-Product Carousel** ⭐ - Igual screenshot (apartamentos, imóveis, produtos)
   - Requer: Criar catálogo no Meta Business Manager
   - API: `interactive.type = "product_list"`
   - Uso: E-commerce, imobiliárias, marketplace

### Média Prioridade 🟡
2. **Single Product** - Produtos individuais (precursor do carousel)
3. **WhatsApp Flows** - Formulários multi-etapa da Meta (aprovação necessária)

### Baixa Prioridade 🟢
4. **Catalog Message** - Catálogo completo de e-commerce
5. **Location Request** - Pedir localização do usuário
6. **Order/Payment Messages** - Pedidos e pagamentos (requer integração)

---

## 📚 Sources (Documentação Oficial)

- [WhatsApp Business Developer Hub](https://business.whatsapp.com/developers/developer-hub)
- [Interactive Messages API - Meta Postman](https://www.postman.com/meta/whatsapp-business-platform/folder/iyy9vwt/sending-interactive-messages)
- [Products & Catalogs - 360Dialog](https://docs.360dialog.com/docs/waba-messaging/products-and-catalogs)
- [Product Carousel Templates - 360Dialog](https://docs.360dialog.com/docs/waba-messaging/template-messaging/product-card-carousel-templates)
- [WhatsApp Flows Official](https://business.whatsapp.com/products/whatsapp-flows)
- [WhatsApp Flows API - Postman](https://www.postman.com/meta/whatsapp-business-platform/collection/y5swede/whatsapp-flows-api)
- [WhatsApp Flows GitHub Tools](https://github.com/WhatsApp/WhatsApp-Flows-Tools)
- [Single & Multi-Product Messages - Gupshup](https://support.gupshup.io/hc/en-us/articles/4413103335705-WhatsApp-Interactive-Single-Multi-Product-Messages)

---

## 🔑 Sobre Flows vs Interactive Lists

### ✅ Sistema Implementado

Vocês JÁ TÊM um **sistema completo de Interactive Flows** que usa Reply Buttons e List Messages nativos do WhatsApp!

#### **Como funciona:**

1. **Flow Executor** (`src/lib/flows/flowExecutor.ts`)
   - Executa fluxos interativos baseados em blocos
   - Gerencia estado (`interactive_flows`, `flow_executions`)
   - Controla transições de status

2. **Interactive Messages Library** (`src/lib/whatsapp/interactiveMessages.ts`)
   - `sendInteractiveButtons()` - Envia botões (até 3)
   - `sendInteractiveList()` - Envia listas (até 10 seções)
   - `parseInteractiveMessage()` - Parse respostas do webhook

3. **Integração no chatbotFlow.ts**
   - Verifica status: `clientes_whatsapp.status = 'fluxo_inicial'`
   - Se em flow → FlowExecutor processa
   - Se bot → Pipeline normal (IA)

#### **Exemplo de uso:**

```typescript
// Enviar botões
await sendInteractiveButtons('5554999999999', {
  body: 'Como posso ajudar?',
  buttons: [
    { id: 'btn_suporte', title: 'Suporte' },
    { id: 'btn_vendas', title: 'Vendas' }
  ]
})

// Receber resposta (webhook)
const response = parseInteractiveMessage(webhookMessage)
// { type: 'button_reply', id: 'btn_suporte', title: 'Suporte' }
```

#### **Vantagens do sistema atual:**
✅ Botões nativos do WhatsApp (UX profissional)
✅ Listas expansíveis visuais
✅ Zero erros de interpretação (IDs exatos)
✅ Flow builder no dashboard
✅ Estado persistido no banco

---

### 🎯 O que FALTA: Product Carousels

A **única coisa que não está implementada** são os **Product Carousels** (Multi-Product Messages) - aqueles cards horizontais de produtos/apartamentos da screenshot.

**Diferença:**
- **Flows atuais**: Botões e listas genéricas ✅
- **Product Carousel**: Cards de produtos do **catálogo do Meta** com imagens, preços, botões ❌

**Para implementar:**
1. Criar catálogo no Meta Business Manager
2. Adicionar função `sendMultiProductMessage()` em `interactiveMessages.ts`
3. Integrar com Flow Executor (novo tipo de bloco: `product_carousel`)

Quer que eu implemente os Product Carousels? 🚀

---

**Criado em:** 2026-01-07
**Última atualização:** 2026-01-07

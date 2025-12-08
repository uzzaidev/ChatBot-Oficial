# WhatsApp Templates - API Reference & Quick Guide

## 📚 Resumo

Este documento fornece exemplos práticos de como usar a Meta WhatsApp Cloud API para gerenciar templates.

---

## 🔑 Autenticação

Todas as requisições requerem:
- **Access Token**: Obtido no Meta Business Manager
- **WABA ID**: WhatsApp Business Account ID
- **Phone Number ID**: ID do número WhatsApp

```bash
# Headers padrão
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json
```

---

## 📋 Endpoints Principais

### 1. Criar Template

**POST** `https://graph.facebook.com/v18.0/{WABA_ID}/message_templates`

#### Request Body

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
      "text": "Olá {{1}}! Seu pedido #{{2}} foi confirmado. Valor: R$ {{3}}. Previsão: {{4}}.",
      "example": {
        "body_text": [["Maria", "12345", "150,00", "3 dias"]]
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
        }
      ]
    }
  ]
}
```

#### Response (Sucesso)

```json
{
  "id": "987654321",
  "status": "PENDING",
  "category": "UTILITY"
}
```

#### cURL Example

```bash
curl -X POST \
  'https://graph.facebook.com/v18.0/123456789012345/message_templates' \
  -H 'Authorization: Bearer EAAG...' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "order_confirmation",
    "category": "UTILITY",
    "language": "pt_BR",
    "components": [...]
  }'
```

---

### 2. Listar Templates

**GET** `https://graph.facebook.com/v18.0/{WABA_ID}/message_templates`

#### Query Parameters

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `fields` | string | Campos a retornar (ex: `name,status,language`) |
| `limit` | integer | Número de resultados (max: 100) |

#### Response

```json
{
  "data": [
    {
      "name": "order_confirmation",
      "id": "987654321",
      "status": "APPROVED",
      "category": "UTILITY",
      "language": "pt_BR",
      "components": [...]
    },
    {
      "name": "otp_verification",
      "id": "987654322",
      "status": "PENDING",
      "category": "AUTHENTICATION",
      "language": "pt_BR"
    }
  ],
  "paging": {
    "cursors": {
      "before": "...",
      "after": "..."
    }
  }
}
```

#### cURL Example

```bash
curl -X GET \
  'https://graph.facebook.com/v18.0/123456789012345/message_templates?fields=name,status,language' \
  -H 'Authorization: Bearer EAAG...'
```

---

### 3. Enviar Template Message

**POST** `https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages`

#### Request Body (Template Simples - Sem Variáveis)

```json
{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "type": "template",
  "template": {
    "name": "hello_world",
    "language": {
      "code": "pt_BR"
    }
  }
}
```

#### Request Body (Template Com Variáveis)

```json
{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "type": "template",
  "template": {
    "name": "order_confirmation",
    "language": {
      "code": "pt_BR"
    },
    "components": [
      {
        "type": "body",
        "parameters": [
          {
            "type": "text",
            "text": "Maria Silva"
          },
          {
            "type": "text",
            "text": "12345"
          },
          {
            "type": "text",
            "text": "150,00"
          },
          {
            "type": "text",
            "text": "3 dias úteis"
          }
        ]
      }
    ]
  }
}
```

#### Request Body (Template Com Button URL Dinâmico)

```json
{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "type": "template",
  "template": {
    "name": "order_confirmation",
    "language": {
      "code": "pt_BR"
    },
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "Maria" },
          { "type": "text", "text": "12345" }
        ]
      },
      {
        "type": "button",
        "sub_type": "url",
        "index": "0",
        "parameters": [
          {
            "type": "text",
            "text": "12345"
          }
        ]
      }
    ]
  }
}
```

#### Response

```json
{
  "messaging_product": "whatsapp",
  "contacts": [
    {
      "input": "5511999999999",
      "wa_id": "5511999999999"
    }
  ],
  "messages": [
    {
      "id": "wamid.HBgNNTUxMTk5OTk5OTk5ORUCABIYFjNFQjBGRjQ4Rjg1QTg4QkE5NDlFNjEA"
    }
  ]
}
```

#### cURL Example

```bash
curl -X POST \
  'https://graph.facebook.com/v18.0/987654321/messages' \
  -H 'Authorization: Bearer EAAG...' \
  -H 'Content-Type: application/json' \
  -d '{
    "messaging_product": "whatsapp",
    "to": "5511999999999",
    "type": "template",
    "template": {
      "name": "order_confirmation",
      "language": { "code": "pt_BR" },
      "components": [...]
    }
  }'
```

---

## 🎨 Estrutura de Components

### HEADER (Cabeçalho)

```json
{
  "type": "HEADER",
  "format": "TEXT", // ou "IMAGE", "VIDEO", "DOCUMENT"
  "text": "Seu Pedido"
}
```

#### HEADER com Imagem

```json
{
  "type": "HEADER",
  "format": "IMAGE",
  "example": {
    "header_handle": [
      "https://example.com/image.jpg"
    ]
  }
}
```

### BODY (Corpo da Mensagem)

```json
{
  "type": "BODY",
  "text": "Olá {{1}}, seu pedido {{2}} foi confirmado.",
  "example": {
    "body_text": [
      ["João Silva", "12345"]
    ]
  }
}
```

**Regras**:
- Variáveis: `{{1}}`, `{{2}}`, ... (índice começa em 1)
- Máximo: 1024 caracteres
- Se usar variáveis, `example` é obrigatório

### FOOTER (Rodapé)

```json
{
  "type": "FOOTER",
  "text": "Obrigado pela preferência!"
}
```

**Regras**:
- Máximo: 60 caracteres
- Não aceita variáveis

### BUTTONS (Botões)

#### URL Button

```json
{
  "type": "BUTTONS",
  "buttons": [
    {
      "type": "URL",
      "text": "Ver Pedido",
      "url": "https://loja.com/pedido/{{1}}"
    }
  ]
}
```

#### Quick Reply Button

```json
{
  "type": "BUTTONS",
  "buttons": [
    {
      "type": "QUICK_REPLY",
      "text": "Confirmar"
    },
    {
      "type": "QUICK_REPLY",
      "text": "Cancelar"
    }
  ]
}
```

#### Phone Number Button

```json
{
  "type": "BUTTONS",
  "buttons": [
    {
      "type": "PHONE_NUMBER",
      "text": "Ligar Agora",
      "phone_number": "+5511999999999"
    }
  ]
}
```

**Regras**:
- Máximo: 3 buttons
- Quick Reply: máximo 2 por template
- URL button: pode ter 1 variável `{{1}}`

---

## 🔄 Status do Template

| Status | Significado | Próxima Ação |
|--------|-------------|--------------|
| `PENDING` | Aguardando aprovação da Meta | Aguardar (1-24h) |
| `APPROVED` | Aprovado e pronto | Pode enviar mensagens |
| `REJECTED` | Rejeitado | Ver `rejection_reason`, corrigir e reenviar |
| `PAUSED` | Pausado (qualidade baixa) | Melhorar qualidade de envio |
| `DISABLED` | Desabilitado pela Meta | Contatar suporte Meta |

---

## 🚨 Erros Comuns

### Erro: Template Not Approved

```json
{
  "error": {
    "message": "(#131030) Template is not approved",
    "type": "OAuthException",
    "code": 131030
  }
}
```

**Solução**: Aguardar aprovação ou verificar status do template.

### Erro: Invalid Parameter Count

```json
{
  "error": {
    "message": "Invalid parameter count",
    "type": "OAuthException",
    "code": 100
  }
}
```

**Solução**: Número de `parameters` não corresponde ao número de variáveis `{{1}}`, `{{2}}` no template.

### Erro: Template Name Already Exists

```json
{
  "error": {
    "message": "Template name already exists",
    "type": "OAuthException",
    "code": 100
  }
}
```

**Solução**: Usar nome único. Nomes são únicos por idioma e WABA.

---

## 📌 Boas Práticas

### 1. Nomenclatura de Templates

✅ **BOM**:
- `order_confirmation`
- `appointment_reminder`
- `otp_verification_v2`

❌ **RUIM**:
- `OrderConfirmation` (uppercase)
- `order-confirmation` (hífen)
- `confirmação de pedido` (espaços, acentos)

**Regra**: Apenas lowercase, números e underscores.

### 2. Exemplos Claros

✅ **BOM**:
```json
"example": {
  "body_text": [["João Silva", "12345", "150,00", "2 dias"]]
}
```

❌ **RUIM**:
```json
"example": {
  "body_text": [["texto1", "texto2", "texto3", "texto4"]]
}
```

**Dica**: Use exemplos realistas para facilitar aprovação.

### 3. Categoria Correta

| Categoria | Quando Usar |
|-----------|-------------|
| `UTILITY` | Confirmações, atualizações de status, notificações transacionais |
| `AUTHENTICATION` | Códigos OTP, verificação de conta |
| `MARKETING` | Promoções, ofertas (requer opt-in explícito do usuário) |

### 4. Textos Concisos

- **HEADER**: máximo 60 caracteres
- **BODY**: máximo 1024 caracteres (idealmente <300 para melhor UX)
- **FOOTER**: máximo 60 caracteres
- **BUTTON TEXT**: máximo 25 caracteres

---

## 🧪 Teste Rápido (Postman/Thunder Client)

### 1. Configurar Ambiente

```json
{
  "waba_id": "123456789012345",
  "phone_number_id": "987654321",
  "access_token": "EAAG..."
}
```

### 2. Criar Template Hello World

```bash
POST https://graph.facebook.com/v18.0/{{waba_id}}/message_templates
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "name": "hello_world_test",
  "category": "UTILITY",
  "language": "pt_BR",
  "components": [
    {
      "type": "BODY",
      "text": "Olá! Esta é uma mensagem de teste."
    }
  ]
}
```

### 3. Aguardar Aprovação

- Tempo médio: 4-12 horas
- Verificar status:

```bash
GET https://graph.facebook.com/v18.0/{{waba_id}}/message_templates
Authorization: Bearer {{access_token}}
```

### 4. Enviar Template

```bash
POST https://graph.facebook.com/v18.0/{{phone_number_id}}/messages
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "messaging_product": "whatsapp",
  "to": "SEU_NUMERO_TESTE",
  "type": "template",
  "template": {
    "name": "hello_world_test",
    "language": { "code": "pt_BR" }
  }
}
```

---

## 📚 Recursos Adicionais

### Documentação Oficial Meta

- [Message Templates Overview](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates)
- [Cloud API - Sending Templates](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates)
- [Template Components](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/components)

### Ferramentas

- [Postman Collection - WhatsApp Cloud API](https://www.postman.com/meta/workspace/whatsapp-business-platform)
- [Meta Business Manager](https://business.facebook.com/)
- [WhatsApp Business API Client Libraries](https://developers.facebook.com/docs/whatsapp/client-libraries)

---

## 🎯 Próximos Passos

1. **Criar primeiro template** de teste (categoria UTILITY)
2. **Submeter para aprovação** via Meta Business Manager ou API
3. **Aguardar aprovação** (verificar email e dashboard)
4. **Testar envio** para seu próprio número
5. **Integrar no sistema** seguindo o IMPLEMENTATION_PLAN.md

---

**Última atualização**: 2024-12-08
**Versão da API**: v18.0

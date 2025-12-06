# Meta WhatsApp Business API - Mensagens Interativas

> **Documentação oficial:** [WhatsApp Cloud API - Interactive Messages](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages#interactive-messages)
> 
> **Webhook Components:** [Interactive Message Reply](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components#interactive-message-reply)

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Reply Buttons (Botões)](#reply-buttons-botões)
3. [List Messages (Listas)](#list-messages-listas)
4. [Limitações da API](#limitações-da-api)
5. [Edge Cases e Melhores Práticas](#edge-cases-e-melhores-práticas)
6. [Rate Limits](#rate-limits)
7. [Tratamento de Caracteres Especiais](#tratamento-de-caracteres-especiais)
8. [Exemplos de Integração](#exemplos-de-integração)

---

## Visão Geral

A API do WhatsApp Business oferece **mensagens interativas nativas** que permitem aos usuários responder através de botões ou listas, sem precisar digitar. Existem 3 tipos principais:

1. **Reply Buttons** - Até 3 botões de resposta rápida
2. **List Messages** - Menus com até 10 seções e 100 itens no total
3. **CTA URL Buttons** - Botões de call-to-action (não coberto neste documento)

**Benefícios:**
- ✅ Interface nativa do WhatsApp (melhor UX)
- ✅ Respostas estruturadas (fácil de processar)
- ✅ Reduz erros de digitação
- ✅ Maior taxa de resposta

---

## Reply Buttons (Botões)

### Características

- **Máximo:** 3 botões por mensagem
- **Título do botão:** Até 20 caracteres
- **Body text:** Até 1024 caracteres
- **Footer text:** Até 60 caracteres (opcional)
- **Header:** Não suportado para botões

### Payload de Envio

**Endpoint:** `POST https://graph.facebook.com/v18.0/{phone_number_id}/messages`

**Headers:**
```json
{
  "Authorization": "Bearer {access_token}",
  "Content-Type": "application/json"
}
```

**Body - Exemplo com 3 botões:**
```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "5554999999999",
  "type": "interactive",
  "interactive": {
    "type": "button",
    "body": {
      "text": "Como posso ajudar você hoje?"
    },
    "footer": {
      "text": "Atendimento 24/7"
    },
    "action": {
      "buttons": [
        {
          "type": "reply",
          "reply": {
            "id": "btn_suporte",
            "title": "Suporte Técnico"
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

**Campos Obrigatórios:**
- ✅ `messaging_product`: sempre "whatsapp"
- ✅ `to`: número do destinatário no formato internacional
- ✅ `type`: "interactive"
- ✅ `interactive.type`: "button"
- ✅ `interactive.body.text`: corpo da mensagem
- ✅ `interactive.action.buttons`: array com 1-3 botões
- ✅ `buttons[].reply.id`: identificador único do botão
- ✅ `buttons[].reply.title`: texto exibido no botão

**Campos Opcionais:**
- ⚪ `interactive.footer.text`: rodapé da mensagem
- ⚪ `recipient_type`: padrão é "individual"

### Resposta de Sucesso (200 OK)

```json
{
  "messaging_product": "whatsapp",
  "contacts": [
    {
      "input": "5554999999999",
      "wa_id": "5554999999999"
    }
  ],
  "messages": [
    {
      "id": "wamid.HBgNNTU1NDk5OTk5OTk5ORUCABIYFjNFQjBDMUQxNzRGRjhBN0Y4RTUyNzMA"
    }
  ]
}
```

### Payload do Webhook (Resposta do Usuário)

Quando o usuário clica em um botão, o webhook recebe:

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "123456789",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "554899998888",
              "phone_number_id": "987654321"
            },
            "contacts": [
              {
                "profile": {
                  "name": "João Silva"
                },
                "wa_id": "5554999999999"
              }
            ],
            "messages": [
              {
                "from": "5554999999999",
                "id": "wamid.HBgNNTU1NDk5OTk5OTk5ORUCABIYIDNFQjBDMUQxNzRGRjhBN0Y4RTUyNzM=",
                "timestamp": "1702308234",
                "type": "interactive",
                "interactive": {
                  "type": "button_reply",
                  "button_reply": {
                    "id": "btn_vendas",
                    "title": "Vendas"
                  }
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

**Campos-chave para processar:**
- ✅ `messages[0].type`: "interactive"
- ✅ `messages[0].interactive.type`: "button_reply"
- ✅ `messages[0].interactive.button_reply.id`: ID do botão clicado ("btn_vendas")
- ✅ `messages[0].interactive.button_reply.title`: Texto do botão ("Vendas")

---

## List Messages (Listas)

### Características

- **Máximo:** 10 seções por lista
- **Máximo por seção:** 10 itens (rows)
- **Total máximo:** 100 itens em toda a lista
- **Row title:** Até 24 caracteres
- **Row description:** Até 72 caracteres (opcional)
- **Section title:** Até 24 caracteres (opcional)
- **Header text:** Até 60 caracteres (opcional)
- **Body text:** Até 1024 caracteres
- **Footer text:** Até 60 caracteres (opcional)
- **Button text:** Até 20 caracteres

### Payload de Envio

**Body - Exemplo com 2 seções e 4 itens:**
```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "5554999999999",
  "type": "interactive",
  "interactive": {
    "type": "list",
    "header": {
      "type": "text",
      "text": "Departamentos Disponíveis"
    },
    "body": {
      "text": "Selecione o departamento que deseja falar:"
    },
    "footer": {
      "text": "Atendimento de segunda a sexta, 8h às 18h"
    },
    "action": {
      "button": "Ver Opções",
      "sections": [
        {
          "title": "Atendimento",
          "rows": [
            {
              "id": "opt_suporte_tecnico",
              "title": "Suporte Técnico",
              "description": "Problemas técnicos e dúvidas sobre o sistema"
            },
            {
              "id": "opt_comercial",
              "title": "Comercial",
              "description": "Vendas, orçamentos e parcerias"
            }
          ]
        },
        {
          "title": "Financeiro",
          "rows": [
            {
              "id": "opt_cobranca",
              "title": "Cobrança",
              "description": "Dúvidas sobre pagamento e faturas"
            },
            {
              "id": "opt_nfe",
              "title": "Nota Fiscal",
              "description": "Solicitação de NF-e e documentos fiscais"
            }
          ]
        }
      ]
    }
  }
}
```

**Campos Obrigatórios:**
- ✅ `messaging_product`: "whatsapp"
- ✅ `to`: número do destinatário
- ✅ `type`: "interactive"
- ✅ `interactive.type`: "list"
- ✅ `interactive.body.text`: corpo da mensagem
- ✅ `interactive.action.button`: texto do botão que abre a lista
- ✅ `interactive.action.sections`: array com 1-10 seções
- ✅ `sections[].rows`: array com 1-10 itens
- ✅ `rows[].id`: identificador único do item
- ✅ `rows[].title`: título do item

**Campos Opcionais:**
- ⚪ `interactive.header`: cabeçalho da mensagem
- ⚪ `interactive.footer.text`: rodapé
- ⚪ `sections[].title`: título da seção
- ⚪ `rows[].description`: descrição do item

### Resposta de Sucesso (200 OK)

```json
{
  "messaging_product": "whatsapp",
  "contacts": [
    {
      "input": "5554999999999",
      "wa_id": "5554999999999"
    }
  ],
  "messages": [
    {
      "id": "wamid.HBgNNTU1NDk5OTk5OTk5ORUCABIYFjNFQjBDMUQxNzRGRjhBN0Y4RTUyNzMA"
    }
  ]
}
```

### Payload do Webhook (Resposta do Usuário)

Quando o usuário seleciona um item da lista:

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "123456789",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "554899998888",
              "phone_number_id": "987654321"
            },
            "contacts": [
              {
                "profile": {
                  "name": "Maria Santos"
                },
                "wa_id": "5554999999999"
              }
            ],
            "messages": [
              {
                "from": "5554999999999",
                "id": "wamid.HBgNNTU1NDk5OTk5OTk5ORUCABIYIDNFQjBDMUQxNzRGRjhBN0Y4RTUyNzM=",
                "timestamp": "1702308456",
                "type": "interactive",
                "interactive": {
                  "type": "list_reply",
                  "list_reply": {
                    "id": "opt_suporte_tecnico",
                    "title": "Suporte Técnico",
                    "description": "Problemas técnicos e dúvidas sobre o sistema"
                  }
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

**Campos-chave para processar:**
- ✅ `messages[0].type`: "interactive"
- ✅ `messages[0].interactive.type`: "list_reply"
- ✅ `messages[0].interactive.list_reply.id`: ID do item selecionado ("opt_suporte_tecnico")
- ✅ `messages[0].interactive.list_reply.title`: Título do item ("Suporte Técnico")
- ✅ `messages[0].interactive.list_reply.description`: Descrição (se fornecida)

---

## Limitações da API

### Limites de Caracteres

| Campo | Tipo | Limite | Observação |
|-------|------|--------|------------|
| **Reply Button - Title** | Botão | 20 caracteres | Texto visível no botão |
| **Reply Button - Body** | Botão | 1024 caracteres | Corpo da mensagem |
| **Reply Button - Footer** | Botão | 60 caracteres | Rodapé (opcional) |
| **List - Header** | Lista | 60 caracteres | Cabeçalho (opcional) |
| **List - Body** | Lista | 1024 caracteres | Corpo da mensagem |
| **List - Footer** | Lista | 60 caracteres | Rodapé (opcional) |
| **List - Button Text** | Lista | 20 caracteres | Texto do botão "Ver opções" |
| **List - Section Title** | Lista | 24 caracteres | Título da seção (opcional) |
| **List - Row Title** | Lista | 24 caracteres | Título do item |
| **List - Row Description** | Lista | 72 caracteres | Descrição do item (opcional) |

### Limites de Quantidade

| Recurso | Mínimo | Máximo | Notas |
|---------|--------|--------|-------|
| **Botões por mensagem** | 1 | 3 | Reply buttons |
| **Seções em lista** | 1 | 10 | Sections |
| **Itens por seção** | 1 | 10 | Rows per section |
| **Itens total na lista** | 1 | 100 | Total rows across all sections |

### Restrições Técnicas

1. **IDs únicos obrigatórios:**
   - Cada botão/item deve ter um `id` único dentro da mensagem
   - IDs são case-sensitive: `"BTN_1"` ≠ `"btn_1"`
   - Recomendado usar padrão consistente (ex: `btn_`, `opt_`)

2. **Tipos de dados:**
   - IDs devem ser strings, não números
   - Timestamps são strings no formato Unix (segundos desde epoch)

3. **Headers em listas:**
   - Somente tipo `"text"` é suportado
   - Não é possível usar imagens/vídeos como header

4. **Botões em listas:**
   - O texto do botão não pode ser vazio
   - É sempre singular (não múltiplos botões)

---

## Edge Cases e Melhores Práticas

### Edge Cases Comuns

#### 1. **Caracteres especiais truncam texto**
```json
// ❌ PROBLEMA: Emojis podem contar como múltiplos caracteres
{
  "title": "✅ Confirmado 👍" // Pode exceder 20 chars
}

// ✅ SOLUÇÃO: Contar bytes UTF-8, não caracteres
{
  "title": "Confirmado ✅"  // 14 caracteres visíveis, mas conferir encoding
}
```

#### 2. **IDs duplicados causam erro**
```json
// ❌ PROBLEMA: IDs iguais
{
  "buttons": [
    { "reply": { "id": "option_1", "title": "Sim" } },
    { "reply": { "id": "option_1", "title": "Não" } }  // Erro!
  ]
}

// ✅ SOLUÇÃO: IDs únicos
{
  "buttons": [
    { "reply": { "id": "option_yes", "title": "Sim" } },
    { "reply": { "id": "option_no", "title": "Não" } }
  ]
}
```

#### 3. **Lista sem itens retorna erro**
```json
// ❌ PROBLEMA: Seção vazia
{
  "sections": [
    {
      "title": "Produtos",
      "rows": []  // Erro: seção vazia
    }
  ]
}

// ✅ SOLUÇÃO: Sempre ter ao menos 1 item
{
  "sections": [
    {
      "title": "Produtos",
      "rows": [
        { "id": "prod_1", "title": "Item 1" }
      ]
    }
  ]
}
```

#### 4. **Footer sem body é ignorado**
```json
// ❌ PROBLEMA: Footer sem body
{
  "interactive": {
    "type": "button",
    "footer": { "text": "Rodapé" },  // Será ignorado
    "action": { "buttons": [...] }
  }
}

// ✅ SOLUÇÃO: Sempre incluir body
{
  "interactive": {
    "type": "button",
    "body": { "text": "Mensagem principal" },
    "footer": { "text": "Rodapé" },
    "action": { "buttons": [...] }
  }
}
```

### Melhores Práticas

#### ✅ Nomenclatura de IDs
```typescript
// Usar padrão consistente e descritivo
const buttonIds = {
  support: 'btn_support',
  sales: 'btn_sales',
  billing: 'btn_billing'
};

const listIds = {
  technicalSupport: 'opt_tech_support',
  commercialInquiry: 'opt_commercial',
  billingQuestion: 'opt_billing'
};
```

#### ✅ Validação de tamanho
```typescript
const validateButtonTitle = (title: string): boolean => {
  // Contar bytes UTF-8, não caracteres
  const encoder = new TextEncoder();
  const byteLength = encoder.encode(title).length;
  return byteLength <= 20;
};

const validateListRowTitle = (title: string): boolean => {
  const encoder = new TextEncoder();
  return encoder.encode(title).length <= 24;
};
```

#### ✅ Tratamento de erros
```typescript
try {
  const response = await sendInteractiveMessage(payload);
  if (!response.ok) {
    const error = await response.json();
    console.error('WhatsApp API Error:', error);
    
    // Erros comuns:
    // - 400: Payload inválido (verificar limites)
    // - 401: Token expirado
    // - 429: Rate limit excedido
    // - 500: Erro interno da Meta
  }
} catch (error) {
  // Fallback: enviar mensagem texto simples
  console.error('Failed to send interactive message:', error);
  await sendTextMessage(phone, fallbackText);
}
```

#### ✅ Acessibilidade
```json
// Usar descrições claras para leitores de tela
{
  "rows": [
    {
      "id": "opt_1",
      "title": "Opção A",
      "description": "Escolha esta opção para funcionalidade X"  // Ajuda usuários
    }
  ]
}
```

---

## Rate Limits

### Limites por Número de Telefone

| Tier | Mensagens/dia | Requisitos |
|------|---------------|------------|
| **Tier 1** | 1.000 | Novo número (padrão) |
| **Tier 2** | 10.000 | Após verificação manual |
| **Tier 3** | 100.000 | Aprovação da Meta |
| **Tier 4** | Ilimitado | Clientes enterprise |

### Limites de Request

- **Máximo:** 80 requests/segundo por número de telefone
- **Burst:** Até 100 requests em 1 segundo (não sustentável)
- **Cooldown:** Se exceder, esperar 60 segundos

### Headers de Rate Limit (Resposta da API)

```http
X-Business-Use-Case-Usage: {"phone_number_id":{"call_count":45,"total_cputime":25,"total_time":300}}
```

**Monitoramento:**
```typescript
const checkRateLimit = (headers: Headers) => {
  const usage = headers.get('X-Business-Use-Case-Usage');
  if (usage) {
    const data = JSON.parse(usage);
    const phoneUsage = Object.values(data)[0] as any;
    
    if (phoneUsage.call_count > 70) {
      console.warn('⚠️ Approaching rate limit:', phoneUsage.call_count);
    }
  }
};
```

### Estratégias de Mitigação

1. **Queue de mensagens:**
```typescript
// Fila com delay entre envios
const messageQueue = new Queue({
  concurrency: 1,
  interval: 1000 / 70  // Max 70 msg/s com margem de segurança
});
```

2. **Retry com backoff exponencial:**
```typescript
const sendWithRetry = async (payload: any, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await sendMessage(payload);
    } catch (error: any) {
      if (error.code === 429) {  // Rate limit
        const delay = Math.pow(2, i) * 1000;  // 1s, 2s, 4s
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
};
```

---

## Tratamento de Caracteres Especiais

### Caracteres Suportados

✅ **Suportados nativamente:**
- Letras acentuadas: á, é, í, ó, ú, à, ã, õ, ç
- Números: 0-9
- Pontuação: . , ! ? - ( ) [ ]
- Espaços e quebras de linha: `\n`
- Emojis: 😀 🎉 ✅ ❌ (verificar contagem de bytes)

❌ **Evitar:**
- HTML tags: `<b>`, `<i>` (não são renderizados)
- Markdown: `**bold**`, `_italic_` (não funciona em interativas)
- Caracteres de controle: `\t`, `\r`

### Encoding

**Sempre usar UTF-8:**
```typescript
const payload = {
  messaging_product: "whatsapp",
  to: phone,
  type: "interactive",
  interactive: {
    type: "button",
    body: {
      text: "Olá! Como posso ajudá-lo? 😊"  // UTF-8 encoding
    },
    action: {
      buttons: [
        {
          type: "reply",
          reply: {
            id: "btn_sim",
            title: "Sim 👍"  // Emoji conta como ~4 bytes
          }
        }
      ]
    }
  }
};

// Enviar como JSON com charset UTF-8
fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json; charset=utf-8'
  },
  body: JSON.stringify(payload)
});
```

### Sanitização

```typescript
const sanitizeText = (text: string): string => {
  return text
    .replace(/<[^>]*>/g, '')  // Remove HTML tags
    .replace(/\r\n/g, '\n')    // Normaliza quebras de linha
    .trim();
};

const truncateToByteLimit = (text: string, maxBytes: number): string => {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  let encoded = encoder.encode(text);
  
  if (encoded.length <= maxBytes) {
    return text;
  }
  
  // Truncar respeitando caracteres UTF-8 completos
  while (encoded.length > maxBytes) {
    text = text.slice(0, -1);
    encoded = encoder.encode(text);
  }
  
  return text + '...';
};
```

---

## Exemplos de Integração

### TypeScript/Node.js

```typescript
import fetch from 'node-fetch';

interface InteractiveButtonsParams {
  phone: string;
  body: string;
  buttons: Array<{
    id: string;
    title: string;
  }>;
  footer?: string;
}

const sendInteractiveButtons = async (
  params: InteractiveButtonsParams
): Promise<any> => {
  const { phone, body, buttons, footer } = params;
  
  // Validações
  if (buttons.length > 3) {
    throw new Error('Máximo de 3 botões permitido');
  }
  
  for (const btn of buttons) {
    if (btn.title.length > 20) {
      throw new Error(`Título do botão muito longo: "${btn.title}"`);
    }
  }
  
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: body },
      ...(footer && { footer: { text: footer } }),
      action: {
        buttons: buttons.map(btn => ({
          type: 'reply',
          reply: {
            id: btn.id,
            title: btn.title
          }
        }))
      }
    }
  };
  
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
    throw new Error(`WhatsApp API Error: ${JSON.stringify(error)}`);
  }
  
  return response.json();
};

// Uso:
await sendInteractiveButtons({
  phone: '5554999999999',
  body: 'Deseja confirmar o pedido?',
  buttons: [
    { id: 'btn_yes', title: 'Sim' },
    { id: 'btn_no', title: 'Não' }
  ],
  footer: 'Pedido #12345'
});
```

### Parser de Webhook

```typescript
interface WebhookMessage {
  from: string;
  type: string;
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
      description?: string;
    };
  };
}

const parseInteractiveResponse = (message: WebhookMessage) => {
  if (message.type !== 'interactive') {
    return null;
  }
  
  const { interactive } = message;
  
  if (interactive?.type === 'button_reply') {
    return {
      type: 'button',
      id: interactive.button_reply!.id,
      title: interactive.button_reply!.title,
      from: message.from
    };
  }
  
  if (interactive?.type === 'list_reply') {
    return {
      type: 'list',
      id: interactive.list_reply!.id,
      title: interactive.list_reply!.title,
      description: interactive.list_reply!.description,
      from: message.from
    };
  }
  
  return null;
};

// Uso no webhook handler:
export const handleWebhook = async (req: Request) => {
  const body = await req.json();
  
  const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  
  if (!message) return;
  
  const interactive = parseInteractiveResponse(message);
  
  if (interactive) {
    console.log(`📱 Resposta interativa:`, interactive);
    
    // Processar resposta no flow executor
    await flowExecutor.continueFlow(
      clientId,
      interactive.from,
      interactive.title,
      interactive.id
    );
  }
};
```

### Exemplo de Lista Completa

```typescript
interface ListMessageParams {
  phone: string;
  header?: string;
  body: string;
  footer?: string;
  buttonText: string;
  sections: Array<{
    title?: string;
    rows: Array<{
      id: string;
      title: string;
      description?: string;
    }>;
  }>;
}

const sendInteractiveList = async (
  params: ListMessageParams
): Promise<any> => {
  const { phone, header, body, footer, buttonText, sections } = params;
  
  // Validações
  if (sections.length > 10) {
    throw new Error('Máximo de 10 seções permitido');
  }
  
  const totalRows = sections.reduce((sum, s) => sum + s.rows.length, 0);
  if (totalRows > 100) {
    throw new Error('Máximo de 100 itens no total');
  }
  
  for (const section of sections) {
    if (section.rows.length > 10) {
      throw new Error('Máximo de 10 itens por seção');
    }
    
    for (const row of section.rows) {
      if (row.title.length > 24) {
        throw new Error(`Título muito longo: "${row.title}"`);
      }
      if (row.description && row.description.length > 72) {
        throw new Error(`Descrição muito longa: "${row.description}"`);
      }
    }
  }
  
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'interactive',
    interactive: {
      type: 'list',
      ...(header && { header: { type: 'text', text: header } }),
      body: { text: body },
      ...(footer && { footer: { text: footer } }),
      action: {
        button: buttonText,
        sections: sections
      }
    }
  };
  
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
    throw new Error(`WhatsApp API Error: ${JSON.stringify(error)}`);
  }
  
  return response.json();
};

// Uso:
await sendInteractiveList({
  phone: '5554999999999',
  header: 'Menu Principal',
  body: 'Escolha uma opção:',
  buttonText: 'Ver Menu',
  sections: [
    {
      title: 'Produtos',
      rows: [
        {
          id: 'prod_1',
          title: 'Produto A',
          description: 'Descrição do produto A'
        },
        {
          id: 'prod_2',
          title: 'Produto B',
          description: 'Descrição do produto B'
        }
      ]
    },
    {
      title: 'Serviços',
      rows: [
        {
          id: 'serv_1',
          title: 'Serviço X'
        },
        {
          id: 'serv_2',
          title: 'Serviço Y'
        }
      ]
    }
  ],
  footer: 'Empresa XPTO'
});
```

---

## Resumo de Validações Críticas

### Checklist de Implementação

Antes de enviar mensagem interativa:

- [ ] **Botões:**
  - [ ] Máximo 3 botões
  - [ ] Cada título ≤ 20 caracteres (bytes UTF-8)
  - [ ] IDs únicos e descritivos
  - [ ] Body não vazio

- [ ] **Listas:**
  - [ ] Máximo 10 seções
  - [ ] Máximo 10 itens por seção
  - [ ] Total ≤ 100 itens
  - [ ] Row titles ≤ 24 caracteres
  - [ ] Row descriptions ≤ 72 caracteres (se usadas)
  - [ ] Button text ≤ 20 caracteres
  - [ ] IDs únicos em toda a lista

- [ ] **Gerais:**
  - [ ] Telefone no formato internacional (5554999999999)
  - [ ] Token de acesso válido
  - [ ] Phone number ID correto
  - [ ] UTF-8 encoding
  - [ ] Rate limit monitorado

### Códigos de Erro Comuns

| Código | Mensagem | Causa | Solução |
|--------|----------|-------|---------|
| **400** | Invalid parameter | Payload mal formatado | Validar JSON, verificar limites |
| **401** | Unauthorized | Token inválido/expirado | Renovar access token |
| **403** | Forbidden | Número não verificado | Verificar número na Meta |
| **429** | Too Many Requests | Rate limit | Implementar queue, retry com backoff |
| **500** | Internal Server Error | Erro Meta | Retry após alguns segundos |
| **131026** | Message undeliverable | Número inválido/bloqueado | Validar número, verificar status |
| **131047** | Re-engagement message | Janela de 24h expirada | Usar template message primeiro |

---

## Recursos Adicionais

### Links Úteis

- 📚 [Documentação Oficial - Interactive Messages](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages#interactive-messages)
- 📚 [Webhook - Interactive Message Reply](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components#interactive-message-reply)
- 🛠️ [API Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages)
- 🔧 [Postman Collection](https://www.postman.com/meta/workspace/whatsapp-business-platform/collection)
- 📊 [Rate Limits](https://developers.facebook.com/docs/whatsapp/api/rate-limits)
- 🐛 [Error Codes](https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes)

### Ferramentas de Teste

1. **Postman/Insomnia:** Testar payloads manualmente
2. **Meta Business Suite:** Enviar mensagens de teste
3. **Webhook.site:** Inspecionar payloads de webhook
4. **JSON Schema Validator:** Validar estrutura de payloads

---

**Documento criado:** 2025-12-06  
**Última atualização:** 2025-12-06  
**Versão:** 1.0  
**Status:** ✅ Completo

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
7. [Custos e Janela de Mensagens](#custos-e-janela-de-mensagens)
8. [Tratamento de Caracteres Especiais](#tratamento-de-caracteres-especiais)
9. [Exemplos de Integração](#exemplos-de-integração)
10. [Testando com Postman](#testando-com-postman)

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

## Custos e Janela de Mensagens

### Modelo de Cobrança do WhatsApp Business API

A Meta cobra pelo uso da API do WhatsApp Business baseado em **conversas**, não por mensagens individuais.

#### Como Funciona a Cobrança

**Conceito de Conversa:**
- Uma **conversa** é uma janela de 24 horas entre sua empresa e um cliente
- Múltiplas mensagens dentro desta janela contam como UMA conversa
- O custo varia por país e tipo de conversa

**Tipos de Conversa:**

| Tipo | Descrição | Quem Inicia | Custo (Brasil - exemplo) |
|------|-----------|-------------|--------------------------|
| **User-Initiated** | Cliente envia mensagem primeiro | Cliente | ~R$ 0,25 por conversa |
| **Business-Initiated** | Empresa inicia (template) | Empresa | ~R$ 0,36 por conversa |
| **Authentication** | Mensagens de OTP/verificação | Empresa | ~R$ 0,37 por conversa |
| **Service** | Atualizações de pedidos, entregas | Empresa | ~R$ 0,18 por conversa |
| **Utility** | Confirmações, lembretes | Empresa | ~R$ 0,18 por conversa |
| **Marketing** | Ofertas, promoções | Empresa | ~R$ 0,53 por conversa |

**💡 Valores são aproximados e variam por país. Consulte:** [Pricing - WhatsApp Business](https://developers.facebook.com/docs/whatsapp/pricing)

### Janela de 24 Horas (Customer Service Window)

#### Regras da Janela

**Quando o cliente inicia a conversa:**
1. ✅ Você tem **24 horas gratuitas** para responder com qualquer mensagem
2. ✅ Pode enviar quantas mensagens quiser (texto, imagens, interativas, etc.)
3. ✅ Cada mensagem do cliente **renova** a janela de 24h
4. ❌ Após 24h sem resposta do cliente, a janela fecha

**Quando a janela fecha:**
- ❌ **NÃO** pode enviar mensagens livres (texto, interativas, etc.)
- ✅ **SOMENTE** pode enviar **Template Messages** (pré-aprovadas pela Meta)
- ✅ Template Messages reabrem uma nova janela de 24h

#### Exemplo Prático

```
Dia 1, 10:00 - Cliente: "Olá, preciso de ajuda"
             → Janela aberta (24h até Dia 2, 10:00)
             
Dia 1, 10:05 - Empresa: "Como posso ajudar?" ✅ (dentro da janela)
Dia 1, 10:10 - Empresa: [Mensagem Interativa com botões] ✅ (dentro da janela)
Dia 1, 15:00 - Empresa: "Mais alguma dúvida?" ✅ (dentro da janela)

Dia 2, 09:50 - Cliente: "Sim, tenho outra pergunta"
             → Janela renovada (24h até Dia 3, 09:50)
             
Dia 2, 10:00 - Empresa: [Lista Interativa] ✅ (janela renovada)

Dia 3, 12:00 - [Janela expirou - sem resposta do cliente]
             → Empresa NÃO pode enviar mensagens livres ❌
             
Dia 3, 12:05 - Empresa tenta enviar: "Tudo bem?" ❌ ERRO 131047
             
Dia 3, 12:10 - Empresa envia Template: "Olá {{1}}, temos uma atualização..." ✅
             → Nova janela de 24h aberta
```

### Iniciando Conversas com Flows Interativos

#### ❌ Cenário 1: Cliente não iniciou conversa (janela fechada)

**Problema:** Você quer enviar um flow interativo, mas o cliente não falou com você nas últimas 24h.

**Solução:**
```typescript
// Passo 1: Enviar Template Message (pré-aprovado) para reabrir janela
const templateResponse = await sendTemplateMessage({
  phone: '5554999999999',
  templateName: 'inicio_atendimento', // Deve estar aprovado na Meta
  language: 'pt_BR',
  components: [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: 'João' } // Nome do cliente
      ]
    }
  ]
});

// Passo 2: Aguardar resposta do cliente (ou imediatamente, dependendo do template)
// A janela agora está aberta por 24h

// Passo 3: Enviar flow interativo
await sendInteractiveButtons({
  phone: '5554999999999',
  body: 'Como posso ajudar você hoje?',
  buttons: [
    { id: 'btn_suporte', title: 'Suporte' },
    { id: 'btn_vendas', title: 'Vendas' }
  ]
});
```

**Custo:**
- 1 conversa "Business-Initiated" (~R$ 0,36)
- Todas as mensagens interativas dentro da janela de 24h são **gratuitas**

#### ✅ Cenário 2: Cliente iniciou conversa (janela aberta)

```typescript
// Cliente enviou: "Olá"
// Janela está aberta automaticamente

// Você pode enviar flow interativo imediatamente
await sendInteractiveList({
  phone: '5554999999999',
  header: 'Menu Principal',
  body: 'Escolha uma opção:',
  buttonText: 'Ver Menu',
  sections: [
    {
      title: 'Atendimento',
      rows: [
        { id: 'opt_suporte', title: 'Suporte Técnico' },
        { id: 'opt_vendas', title: 'Vendas' }
      ]
    }
  ]
});
```

**Custo:**
- 1 conversa "User-Initiated" (~R$ 0,25)
- Todas as mensagens interativas dentro de 24h são **gratuitas**

### Estratégias de Otimização de Custos

#### 1. Aproveitar Conversas Iniciadas pelo Cliente

```typescript
// Máximo de interações dentro da janela de 24h
const checkActiveWindow = async (phone: string): Promise<boolean> => {
  // Verificar se última mensagem do cliente foi há menos de 24h
  const lastMessage = await getLastCustomerMessage(phone);
  const hoursSinceLastMessage = (Date.now() - lastMessage.timestamp) / (1000 * 60 * 60);
  return hoursSinceLastMessage < 24;
};

// Se janela ativa, enviar flow diretamente (grátis)
if (await checkActiveWindow(phone)) {
  await sendInteractiveFlow(phone, flowId);
} else {
  // Se janela fechada, enviar template primeiro (custa 1 conversa)
  await sendTemplateToReopenWindow(phone);
}
```

#### 2. Template Messages Estratégicas

**Criar templates aprovados para diferentes cenários:**

```
Template: inicio_atendimento_urgente
Categoria: UTILITY
Texto: "Olá {{1}}! Detectamos que você precisa de ajuda. Responda SIM para iniciar o atendimento."
Botões: [SIM] [NÃO]
```

Quando cliente clica em "SIM", a janela está aberta e você pode iniciar o flow interativo sem custo adicional.

#### 3. Consolidar Mensagens

```typescript
// ❌ Ruim: Múltiplas mensagens simples (mas ainda grátis dentro da janela)
await sendTextMessage(phone, 'Olá!');
await sendTextMessage(phone, 'Como posso ajudar?');
await sendTextMessage(phone, 'Escolha uma opção:');

// ✅ Melhor: Uma mensagem interativa consolidada
await sendInteractiveButtons({
  phone,
  body: 'Olá! Como posso ajudar você hoje? Escolha uma opção:',
  buttons: [
    { id: 'opt_1', title: 'Suporte' },
    { id: 'opt_2', title: 'Vendas' }
  ]
});
```

**💡 Nota:** Ambas as abordagens são gratuitas dentro da janela, mas a segunda oferece melhor UX.

#### 4. Monitorar Custos em Tempo Real

```typescript
interface ConversationCost {
  phone: string;
  conversationType: 'user_initiated' | 'business_initiated';
  startedAt: Date;
  estimatedCost: number;
  messageCount: number;
}

const trackConversationCost = (conversation: ConversationCost) => {
  // Log para analytics
  console.log(`💰 Conversa ${conversation.conversationType}: R$ ${conversation.estimatedCost}`);
  console.log(`📊 ${conversation.messageCount} mensagens enviadas (sem custo adicional)`);
};
```

### Limites de Conversas Gratuitas

**Tier 1 (novo número):**
- 1.000 conversas gratuitas "Business-Initiated" por mês
- Após isso, cobra-se por conversa

**Conversas "User-Initiated":**
- 1.000 conversas gratuitas por mês (todos os tiers)
- Após isso, cobra-se conforme tabela de preços

### Resumo de Custos

| Cenário | Custo | Quando Ocorre |
|---------|-------|---------------|
| Cliente envia mensagem | **GRÁTIS** (até 1k/mês) | Cliente inicia conversa |
| Responder cliente (24h) | **GRÁTIS** (incluso) | Dentro da janela |
| Enviar flow interativo (24h) | **GRÁTIS** (incluso) | Dentro da janela |
| Reabrir conversa (template) | **~R$ 0,36** | Janela expirada |
| Enviar fora da janela SEM template | **ERRO 131047** | ❌ Não permitido |

**🎯 Dica de Ouro:** Incentive clientes a responderem! Cada resposta renova a janela de 24h gratuitamente.

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

## Testando com Postman

### Configuração Inicial do Postman

#### Passo 1: Obter Credenciais

Antes de testar, você precisa:

1. **Phone Number ID:** ID do seu número de telefone WhatsApp Business
   - Encontre em: Meta Business Suite → WhatsApp → API Setup
   - Exemplo: `123456789012345`

2. **Access Token:** Token de acesso temporário (24h) ou permanente
   - Encontre em: Meta Business Suite → WhatsApp → API Setup → Temporary Access Token
   - Exemplo: `EAABsbCS1iHgBO7ZC9cxxx...`

3. **Número de Teste:** Seu número WhatsApp para receber mensagens
   - Formato internacional: `5554999999999` (sem + ou espaços)

#### Passo 2: Criar Collection no Postman

1. Abra Postman
2. Clique em "New" → "Collection"
3. Nome: "WhatsApp Business API - Interactive Messages"
4. Adicione variáveis de ambiente:

```json
{
  "PHONE_NUMBER_ID": "123456789012345",
  "ACCESS_TOKEN": "EAABsbCS1iHgBO7ZC9cxxx...",
  "TEST_PHONE": "5554999999999"
}
```

### Exemplo 1: Enviar Botões (Reply Buttons)

**Request Configuration:**

```
Method: POST
URL: https://graph.facebook.com/v18.0/{{PHONE_NUMBER_ID}}/messages
```

**Headers:**
```
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "{{TEST_PHONE}}",
  "type": "interactive",
  "interactive": {
    "type": "button",
    "body": {
      "text": "🤖 Bem-vindo ao nosso atendimento! Como podemos ajudar você hoje?"
    },
    "footer": {
      "text": "Responda clicando em uma opção"
    },
    "action": {
      "buttons": [
        {
          "type": "reply",
          "reply": {
            "id": "btn_suporte",
            "title": "💬 Suporte"
          }
        },
        {
          "type": "reply",
          "reply": {
            "id": "btn_vendas",
            "title": "🛒 Vendas"
          }
        },
        {
          "type": "reply",
          "reply": {
            "id": "btn_info",
            "title": "ℹ️ Informações"
          }
        }
      ]
    }
  }
}
```

**Resposta Esperada (200 OK):**
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

**Como testar:**
1. Substitua `{{PHONE_NUMBER_ID}}`, `{{ACCESS_TOKEN}}` e `{{TEST_PHONE}}`
2. Clique em "Send"
3. Verifique seu WhatsApp - você deve receber a mensagem com 3 botões
4. Clique em um botão
5. O webhook da sua aplicação receberá o payload com o ID do botão

### Exemplo 2: Enviar Lista (List Message)

**Request Configuration:**

```
Method: POST
URL: https://graph.facebook.com/v18.0/{{PHONE_NUMBER_ID}}/messages
```

**Headers:**
```
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "{{TEST_PHONE}}",
  "type": "interactive",
  "interactive": {
    "type": "list",
    "header": {
      "type": "text",
      "text": "📋 Central de Atendimento"
    },
    "body": {
      "text": "Selecione o departamento que deseja falar ou o serviço que precisa:"
    },
    "footer": {
      "text": "Atendimento disponível 24/7"
    },
    "action": {
      "button": "Ver Opções",
      "sections": [
        {
          "title": "🏢 Departamentos",
          "rows": [
            {
              "id": "dept_suporte",
              "title": "Suporte Técnico",
              "description": "Problemas técnicos e dúvidas sobre o sistema"
            },
            {
              "id": "dept_vendas",
              "title": "Vendas",
              "description": "Orçamentos, compras e parcerias comerciais"
            },
            {
              "id": "dept_financeiro",
              "title": "Financeiro",
              "description": "Pagamentos, faturas e cobranças"
            }
          ]
        },
        {
          "title": "📞 Serviços Rápidos",
          "rows": [
            {
              "id": "svc_status",
              "title": "Status do Pedido",
              "description": "Acompanhe seu pedido em tempo real"
            },
            {
              "id": "svc_cancelar",
              "title": "Cancelamento",
              "description": "Solicitar cancelamento de pedido ou serviço"
            },
            {
              "id": "svc_trocar",
              "title": "Troca/Devolução",
              "description": "Iniciar processo de troca ou devolução"
            }
          ]
        },
        {
          "title": "❓ Ajuda",
          "rows": [
            {
              "id": "help_faq",
              "title": "FAQ - Perguntas Frequentes"
            },
            {
              "id": "help_tutorial",
              "title": "Tutorial de Uso"
            }
          ]
        }
      ]
    }
  }
}
```

**Resposta Esperada (200 OK):**
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

**Como testar:**
1. Substitua as variáveis
2. Clique em "Send"
3. Verifique seu WhatsApp - você deve ver a mensagem com botão "Ver Opções"
4. Clique no botão - abrirá um menu com 3 seções e 8 opções totais
5. Selecione uma opção
6. O webhook receberá o payload com o ID da opção selecionada

### Exemplo 3: Testar Validação de Limites

**Teste - Mais de 3 Botões (deve falhar):**

```json
{
  "messaging_product": "whatsapp",
  "to": "{{TEST_PHONE}}",
  "type": "interactive",
  "interactive": {
    "type": "button",
    "body": {
      "text": "Escolha uma opção:"
    },
    "action": {
      "buttons": [
        {
          "type": "reply",
          "reply": {
            "id": "btn_1",
            "title": "Opção 1"
          }
        },
        {
          "type": "reply",
          "reply": {
            "id": "btn_2",
            "title": "Opção 2"
          }
        },
        {
          "type": "reply",
          "reply": {
            "id": "btn_3",
            "title": "Opção 3"
          }
        },
        {
          "type": "reply",
          "reply": {
            "id": "btn_4",
            "title": "Opção 4"
          }
        }
      ]
    }
  }
}
```

**Resposta Esperada (400 Bad Request):**
```json
{
  "error": {
    "message": "(#100) Invalid button parameter",
    "type": "OAuthException",
    "code": 100,
    "error_subcode": 2494002,
    "fbtrace_id": "AXXXxxxxxxx"
  }
}
```

**Aprendizado:** A API rejeita mais de 3 botões. Sempre validar antes de enviar!

### Exemplo 4: Verificar Janela de 24h

**Cenário:** Testar envio fora da janela de 24h

1. Aguarde 24h sem interação com o cliente
2. Tente enviar mensagem interativa:

**Resposta Esperada (403 Forbidden):**
```json
{
  "error": {
    "message": "(#131047) Re-engagement message",
    "type": "OAuthException",
    "code": 131047,
    "error_data": {
      "messaging_product": "whatsapp",
      "details": "Message failed to send because more than 24 hours have passed since the customer last replied to this number."
    },
    "error_subcode": 2388001,
    "fbtrace_id": "AXXXxxxxxxx"
  }
}
```

**Solução:** Enviar Template Message primeiro para reabrir janela.

### Collection Postman Pronta para Importar

**JSON para importar no Postman:**

```json
{
  "info": {
    "name": "WhatsApp Business API - Interactive Messages",
    "description": "Collection para testar mensagens interativas do WhatsApp",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "1. Send Reply Buttons",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{ACCESS_TOKEN}}",
            "type": "text"
          },
          {
            "key": "Content-Type",
            "value": "application/json",
            "type": "text"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"messaging_product\": \"whatsapp\",\n  \"recipient_type\": \"individual\",\n  \"to\": \"{{TEST_PHONE}}\",\n  \"type\": \"interactive\",\n  \"interactive\": {\n    \"type\": \"button\",\n    \"body\": {\n      \"text\": \"Como posso ajudar você hoje?\"\n    },\n    \"action\": {\n      \"buttons\": [\n        {\n          \"type\": \"reply\",\n          \"reply\": {\n            \"id\": \"btn_suporte\",\n            \"title\": \"Suporte\"\n          }\n        },\n        {\n          \"type\": \"reply\",\n          \"reply\": {\n            \"id\": \"btn_vendas\",\n            \"title\": \"Vendas\"\n          }\n        }\n      ]\n    }\n  }\n}"
        },
        "url": {
          "raw": "https://graph.facebook.com/v18.0/{{PHONE_NUMBER_ID}}/messages",
          "protocol": "https",
          "host": [
            "graph",
            "facebook",
            "com"
          ],
          "path": [
            "v18.0",
            "{{PHONE_NUMBER_ID}}",
            "messages"
          ]
        }
      }
    },
    {
      "name": "2. Send List Message",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{ACCESS_TOKEN}}",
            "type": "text"
          },
          {
            "key": "Content-Type",
            "value": "application/json",
            "type": "text"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"messaging_product\": \"whatsapp\",\n  \"to\": \"{{TEST_PHONE}}\",\n  \"type\": \"interactive\",\n  \"interactive\": {\n    \"type\": \"list\",\n    \"header\": {\n      \"type\": \"text\",\n      \"text\": \"Menu Principal\"\n    },\n    \"body\": {\n      \"text\": \"Selecione uma opção:\"\n    },\n    \"action\": {\n      \"button\": \"Ver Opções\",\n      \"sections\": [\n        {\n          \"title\": \"Atendimento\",\n          \"rows\": [\n            {\n              \"id\": \"opt_suporte\",\n              \"title\": \"Suporte Técnico\",\n              \"description\": \"Problemas técnicos\"\n            },\n            {\n              \"id\": \"opt_vendas\",\n              \"title\": \"Vendas\",\n              \"description\": \"Orçamentos e compras\"\n            }\n          ]\n        }\n      ]\n    }\n  }\n}"
        },
        "url": {
          "raw": "https://graph.facebook.com/v18.0/{{PHONE_NUMBER_ID}}/messages",
          "protocol": "https",
          "host": [
            "graph",
            "facebook",
            "com"
          ],
          "path": [
            "v18.0",
            "{{PHONE_NUMBER_ID}}",
            "messages"
          ]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "PHONE_NUMBER_ID",
      "value": "SEU_PHONE_NUMBER_ID_AQUI"
    },
    {
      "key": "ACCESS_TOKEN",
      "value": "SEU_ACCESS_TOKEN_AQUI"
    },
    {
      "key": "TEST_PHONE",
      "value": "5554999999999"
    }
  ]
}
```

**Como usar:**
1. Copie o JSON acima
2. No Postman: File → Import → Raw Text → Cole o JSON → Import
3. Edite as variáveis: `PHONE_NUMBER_ID`, `ACCESS_TOKEN`, `TEST_PHONE`
4. Execute os requests na ordem

### Ferramentas Auxiliares para Teste

#### Webhook.site para Inspecionar Respostas

1. Acesse https://webhook.site
2. Copie sua URL única (ex: `https://webhook.site/abc123`)
3. Configure como webhook no Meta Business Suite
4. Envie mensagem interativa e clique nos botões
5. Veja o payload completo no webhook.site

**Exemplo de payload que você verá:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "changes": [
        {
          "value": {
            "messages": [
              {
                "from": "5554999999999",
                "type": "interactive",
                "interactive": {
                  "type": "button_reply",
                  "button_reply": {
                    "id": "btn_suporte",
                    "title": "Suporte"
                  }
                }
              }
            ]
          }
        }
      ]
    }
  ]
}
```

### Troubleshooting Comum no Postman

| Erro | Causa | Solução |
|------|-------|---------|
| **401 Unauthorized** | Token inválido/expirado | Gerar novo token no Meta Business Suite |
| **403 Forbidden** | Janela de 24h expirada | Enviar template message primeiro |
| **400 Invalid parameter** | Payload mal formatado | Validar JSON, verificar limites |
| **100 Invalid button** | Mais de 3 botões | Reduzir para no máximo 3 |
| **131026 Message undeliverable** | Número inválido | Verificar formato do número |
| **Timeout** | Problema de rede | Verificar conectividade |

### Dicas Avançadas

1. **Use Pre-request Script para timestamp:**
```javascript
// Adicionar timestamp em cada request
pm.environment.set("timestamp", new Date().toISOString());
```

2. **Use Tests para validar resposta:**
```javascript
// Validar status 200
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

// Validar message_id retornado
pm.test("Message ID returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.messages[0].id).to.be.a('string');
});
```

3. **Salvar Message ID automaticamente:**
```javascript
// No script "Tests"
if (pm.response.code === 200) {
    var jsonData = pm.response.json();
    pm.environment.set("last_message_id", jsonData.messages[0].id);
    console.log("Message ID saved:", jsonData.messages[0].id);
}
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
**Versão:** 1.1  
**Status:** ✅ Completo

**Changelog:**
- v1.1 (2025-12-06): Adicionado seção "Custos e Janela de Mensagens" e "Testando com Postman"
- v1.0 (2025-12-06): Versão inicial com documentação completa da API

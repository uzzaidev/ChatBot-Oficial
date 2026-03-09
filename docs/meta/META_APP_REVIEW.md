# Meta App Review - Respostas Completas

## UzzApp SaaS Oficial (App ID: 1440028941249650)

**Data:** 9 de março de 2026
**Submissão atual:** Tech Provider · Acesso Avançado
**Permissões nesta submissão:** `whatsapp_business_messaging` · `whatsapp_business_management`

> **Referência Meta:**
>
> - [Become a Tech Provider](https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/get-started-for-tech-providers)
> - [Screen Recordings Guide](https://developers.facebook.com/docs/app-review/submission-guide/screen-recordings/)
> - [Meta WhatsApp OpenAPI Spec](https://github.com/facebook/openapi)

---

## Índice

1. [Configurações Básicas do App](#1-configurações-básicas-do-app)
2. [whatsapp_business_messaging](#2-whatsapp_business_messaging)
3. [whatsapp_business_management](#3-whatsapp_business_management)
4. [OAuth / Embedded Signup](#4-oauth--embedded-signup)
5. [Vídeos Obrigatórios (Tech Provider)](#5-vídeos-obrigatórios-tech-provider)
6. [Instruções para o Analista](#6-instruções-para-o-analista)
7. [Checklist Final](#7-checklist-final)

---

## 1. Configurações Básicas do App

| Campo                    | Valor                                 |
| ------------------------ | ------------------------------------- |
| **Site URL**             | `https://uzzapp.uzzai.com.br`         |
| **Privacy Policy URL**   | `https://uzzapp.uzzai.com.br/privacy` |
| **Terms of Service URL** | `https://uzzapp.uzzai.com.br/terms`   |
| **App Category**         | Business                              |
| **App Domain**           | `uzzapp.uzzai.com.br`                 |
| **App Icon**             | 1024x1024px (upload no painel)        |

---

## 2. whatsapp_business_messaging

### Como esse app usará o whatsapp_business_messaging?

```
UzzApp SaaS is a multi-tenant platform that enables businesses to connect
their own WhatsApp Business accounts and automate customer service using
AI-powered chatbots (GPT-4o, Llama 3.3 70B).

How we use this permission:
- Receive inbound messages from end-customers via webhook
- Send automated AI responses on behalf of connected businesses
- Process media (audio transcription via Whisper, image analysis via GPT-4o Vision,
  document reading) to provide contextual responses
- Manage bidirectional conversations using the business owns WABA credentials

Business model: each business client connects their own WABA via Embedded Signup.
The platform processes messages using the clients own access token — no data is
shared across tenants (full multi-tenant isolation via Supabase Vault + RLS).
```

### Descreva como seu aplicativo usa esta permissão ou recurso

```
1. Business client connects their WABA via Meta Embedded Signup (OAuth)
2. Meta sends webhook events to https://uzzapp.uzzai.com.br/api/webhook/{clientId}
3. Platform identifies the tenant via WABA ID mapped to client_id
4. Inbound message is processed through a 14-node AI pipeline:
   - Media downloaded and transcribed/analyzed if needed
   - Message batched (Redis, 30s window) to consolidate multi-message inputs
   - Chat history retrieved (last 15 messages)
   - Knowledge base searched via pgvector RAG
   - AI response generated (Groq Llama 3.3 70B or OpenAI GPT-4o)
5. Response sent back via POST /messages using the clients own Meta access token
6. Conversation and messages saved to Supabase for dashboard display
7. Business can view all conversations in real time at /dashboard/conversations
```

### Você concorda que está em conformidade com o uso permitido?

✅ **Sim**

O UzzApp usa esta permissão exclusivamente para criar experiências de mensagens **iniciadas pelo cliente final** (customer-initiated) e para **respostas de atendimento ao cliente** (business-initiated dentro da janela de 24h). Não é usado para spam ou mensagens não solicitadas. Informações analíticas são usadas apenas de forma **agregada e anônima** para melhorar a plataforma.

---

## 3. whatsapp_business_management

### Como esse app usará o whatsapp_business_management?

```
UzzApp SaaS uses this permission to programmatically manage the WhatsApp
Business assets of client businesses that have granted us access via Embedded Signup.

How we use this permission:
- Register and manage phone numbers linked to the clients WABA
- Create, submit, and manage message templates for business-initiated notifications
- Configure webhooks automatically after client onboarding
- Read WABA profile details (name, about, business hours) to display in dashboard
- Monitor phone number quality rating and messaging tier limits
- Display WABA analytics (message volume, delivery rates) in the client portal
```

### Descreva como seu aplicativo usa esta permissão ou recurso

```
1. During Embedded Signup, the client grants access to their WABA
2. Platform stores WABA ID, Phone Number ID, and access token in Supabase Vault
3. Webhook is automatically configured (subscribed fields: messages, message_status)
4. From the dashboard (/dashboard/templates), the client can:
   - Create new message templates with variables and buttons
   - Submit templates to Meta for approval
   - View approval status (APPROVED / PENDING / REJECTED)
   - Edit or delete templates
5. Dashboard (/dashboard/settings) reads WABA profile and phone number details:
   - Quality rating (GREEN / YELLOW / RED)
   - Current messaging limit tier
   - Business profile (name, category, description)
6. Analytics displayed in /dashboard/analytics:
   - Total messages sent / received (last 30 days)
   - Delivery and read rates
```

### Você concorda que está em conformidade com o uso permitido?

✅ **Sim**

O UzzApp usa esta permissão exclusivamente para **gerenciar ativos comerciais do WhatsApp** dos clientes que concederam acesso, e para **exibir análises da conta no portal do cliente**. Cada cliente só pode ver e gerenciar seus próprios ativos. Nenhum dado é compartilhado entre clientes.

---

## 4. OAuth / Embedded Signup

O app usa **Facebook Login for Business** com **Embedded Signup** para onboarding dos clientes.

### Permissões solicitadas no OAuth

```javascript
// Embedded Signup - permissões solicitadas ao cliente
{
  scope: [
    'whatsapp_business_messaging',
    'whatsapp_business_management',
    'business_management'
  ],
  extras: {
    feature: 'whatsapp_embedded_signup'
  }
}
```

### Fluxo OAuth (passo a passo)

```
1. Cliente acessa https://uzzapp.uzzai.com.br/onboarding
2. Clica no botão "Conectar WhatsApp Business"
3. Modal do Meta abre (Embedded Signup)
4. Cliente faz login na conta Meta
5. Seleciona ou cria um Business Portfolio
6. Seleciona ou cria um WABA
7. Seleciona número de telefone
8. Aceita as permissões solicitadas
9. Meta retorna: access_token + WABA ID + Phone Number ID
10. UzzApp armazena token no Supabase Vault (criptografado)
11. Dashboard redireciona para /dashboard com status "WhatsApp conectado"
```

### Callback URL

```
https://uzzapp.uzzai.com.br/api/auth/meta/callback
```

---

## 5. Vídeos Obrigatórios (Tech Provider)

> **Requisito oficial Meta Tech Provider:**
>
> "The first video must show a message created and sent from your app and received in the WhatsApp client.
> The second video must show your app being used to create a message template."
>
> Fonte: https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/get-started-for-tech-providers

---

### Vídeo 1 — Mensagem enviada e recebida no WhatsApp

**Permissão demonstrada:** `whatsapp_business_messaging`
**Duração:** ~2–3 minutos
**Arquivo:** `docs/videos/video1-send-message.mp4`

#### Roteiro do screencast

| Tempo     | O que mostrar                                                                         |
| --------- | ------------------------------------------------------------------------------------- |
| 0:00–0:20 | Tela de login (`/login`) — usuário deslogado                                          |
| 0:20–0:45 | Login com email/senha → entra no dashboard                                            |
| 0:45–1:15 | Embedded Signup: clicar "Conectar WhatsApp" → modal Meta → autorizar → WABA conectado |
| 1:15–1:40 | Dashboard mostrando WABA conectado com número de telefone                             |
| 1:40–2:10 | Smartphone ao lado: cliente final envia mensagem "Olá" para o número                  |
| 2:10–2:40 | Bot responde automaticamente no WhatsApp (mostrar smartphone)                         |
| 2:40–3:00 | Dashboard /dashboard/conversations → conversa aparece em tempo real                   |

#### Requisitos técnicos (Meta Screen Recording Guide)

- Resolução mínima **1080p**
- UI em **inglês** ou legendas/anotações em inglês
- **Sem áudio** (revisores não ouvem)
- Cursor do mouse **aumentado** e visível
- **Anotações visuais** (seta/texto) sobre: botão OAuth, mensagem sendo enviada, resposta do bot
- Smartphone visível ao lado ou via espelhamento de tela
- Fluxo de login **completo** (começar da tela deslogada)

---

### Vídeo 2 — Criação de message template

**Permissão demonstrada:** `whatsapp_business_management`
**Duração:** ~2–3 minutos
**Arquivo:** `docs/videos/video2-create-template.mp4`

#### Roteiro do screencast

| Tempo     | O que mostrar                                                                 |
| --------- | ----------------------------------------------------------------------------- |
| 0:00–0:20 | Dashboard logado, ir para `/dashboard/templates`                              |
| 0:20–0:50 | Clicar "Criar Template" → formulário abre                                     |
| 0:50–1:30 | Preencher: nome, categoria (UTILITY), idioma, corpo com variável {{1}}, botão |
| 1:30–1:55 | Pré-visualização do template renderizada no app                               |
| 1:55–2:25 | Clicar "Submeter para aprovação" → status muda para PENDING                   |
| 2:25–2:50 | Lista de templates mostrando o template criado com status visível             |
| 2:50–3:00 | (Opcional) WhatsApp Manager externo confirmando criação                       |

#### Alternativa aceita pela Meta

> "You can capture a screen recording of the WhatsApp Manager being used by you to create a template message,
> instead of your or your partners app."

Se o dashboard de templates ainda não estiver pronto, é possível gravar a criação diretamente no **WhatsApp Manager** (business.facebook.com) como alternativa válida.

---

### Checklist dos vídeos

- [ ] Vídeo 1: login completo visível (tela deslogada → logada)
- [ ] Vídeo 1: fluxo OAuth/Embedded Signup aparece
- [ ] Vídeo 1: mensagem enviada E recebida no WhatsApp (smartphone visível)
- [ ] Vídeo 1: bot responde automaticamente
- [ ] Vídeo 1: conversa aparece no dashboard
- [ ] Vídeo 2: criação de template com campos preenchidos
- [ ] Vídeo 2: template submetido (status PENDING visível)
- [ ] Ambos: resolução 1080p+
- [ ] Ambos: UI em inglês ou legendas adicionadas
- [ ] Ambos: cursor aumentado e visível
- [ ] Ambos: sem áudio

---

## 6. Instruções para o Analista

### Overview do Aplicativo

```
UzzApp SaaS is a multi-tenant AI chatbot platform for WhatsApp Business.

BUSINESS MODEL:
Each business client connects their own WhatsApp Business Account (WABA)
via Embedded Signup. The platform processes messages on behalf of the client
using the clients own Meta access token (stored encrypted in Supabase Vault).
Zero data sharing across tenants (Row Level Security + Vault isolation).

This is NOT a single bot. Each business has its own independent chatbot,
AI configuration, knowledge base (RAG), and Meta credentials.

MAIN USE CASE:
Customer service automation — the bot responds to end-customers who message the
business on WhatsApp, 24/7, using AI (Groq Llama 3.3 70B or OpenAI GPT-4o).
```

---

### ⚠️ IMPORTANTE — Acesso à Conta de Teste

> O UzzApp é uma plataforma **SaaS com aprovação de conta** (por segurança, novos cadastros entram em modo `pending` e precisam de aprovação manual do administrador). Por isso, **NÃO é possível o analista se auto-cadastrar**.
>
> **A conta de teste já estará criada e pré-aprovada** antes da submissão. O analista só precisa fazer login com as credenciais abaixo. Toda a experiência de uso é em **https://uzzapp.uzzai.com.br** — nada na plataforma da Meta.

### Credenciais de Teste (Conta no UzzApp — já pré-configurada)

```
URL:    https://uzzapp.uzzai.com.br/login
Email:  reviewer@meta.com
Senha:  MetaAppReview2026!

Já pré-configurado nesta conta:
- WABA conectado (número: +55 54 9956-7051)
- Chatbot ativo com GPT-4o Mini
- Templates de exemplo já criados
- Conversas de teste visíveis no dashboard
```

> **Nota:** Se as credenciais não funcionarem, entre em contato: luisfboff@gmail.com / +55 54 9956-7051

---

### Como Testar — whatsapp_business_messaging

Tudo acontece em **https://uzzapp.uzzai.com.br**:

```
1. Acesse https://uzzapp.uzzai.com.br/login
2. Login com as credenciais acima
3. Você entra direto no Dashboard (https://uzzapp.uzzai.com.br/dashboard)
4. Confirme que o WABA está conectado (exibido no painel principal)
5. No smartphone: envie "Olá" para +55 54 9956-7051 no WhatsApp
6. Aguarde ~5 segundos → o bot responde automaticamente
7. Acesse https://uzzapp.uzzai.com.br/dashboard/conversations
8. A conversa aparece em tempo real
9. Envie uma segunda mensagem → o bot mantém o contexto (multi-turno)

Resultado esperado: bot responde contextualmente, conversa aparece no dashboard.
```

---

### Como Testar — whatsapp_business_management

Tudo acontece em **https://uzzapp.uzzai.com.br**:

```
1. No dashboard, acesse https://uzzapp.uzzai.com.br/dashboard/templates
2. Clique em "Criar Template" (botão no canto superior direito)
3. Preencha o formulário:
   - Nome: test_review_template
   - Categoria: UTILITY
   - Idioma: Portuguese (BR)
   - Corpo: "Olá {{1}}, seu pedido {{2}} está confirmado!"
4. Clique "Submeter para aprovação"
5. O template aparece na lista com status PENDING
6. Acesse https://uzzapp.uzzai.com.br/dashboard/settings
7. Confirme que o perfil WABA está visível (nome, número, quality rating)

Resultado esperado: template criado com status PENDING, perfil WABA exibido.
```

---

### Prints Obrigatórios — URLs para Screenshot

> **Como tirar:** com o login feito na conta de teste, acessar cada URL abaixo e tirar o print da tela inteira. Resolução recomendada: 1920×1080.

| #   | Descrição                                                          | URL para abrir e printar                                                       |
| --- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| 1   | **Tela de login** (antes de entrar)                                | `https://uzzapp.uzzai.com.br/login`                                            |
| 2   | **Dashboard principal** com WABA conectado                         | `https://uzzapp.uzzai.com.br/dashboard`                                        |
| 3   | **Onboarding / Conectar WhatsApp** (botão Embedded Signup visível) | `https://uzzapp.uzzai.com.br/onboarding`                                       |
| 4   | **Lista de conversas** em tempo real                               | `https://uzzapp.uzzai.com.br/dashboard/conversations`                          |
| 5   | **Conversa aberta** com a resposta do bot                          | `https://uzzapp.uzzai.com.br/dashboard/conversations` (clicar em uma conversa) |
| 6   | **Lista de templates** com status (APPROVED / PENDING)             | `https://uzzapp.uzzai.com.br/dashboard/templates`                              |
| 7   | **Formulário criar template** preenchido                           | `https://uzzapp.uzzai.com.br/dashboard/templates/new`                          |
| 8   | **Configurações / perfil WABA** (quality rating, número)           | `https://uzzapp.uzzai.com.br/dashboard/settings`                               |

#### Onde usar cada print

| Print                      | Usado em                                                             |
| -------------------------- | -------------------------------------------------------------------- |
| Print 1 (login)            | Início do Vídeo 1 — mostra fluxo de login completo                   |
| Print 2 (dashboard + WABA) | `whatsapp_business_messaging` → campo "Descreva o uso"               |
| Print 3 (onboarding)       | `whatsapp_business_messaging` → demonstra o OAuth/Embedded Signup    |
| Print 4 (lista conversas)  | `whatsapp_business_messaging` → demonstra recebimento de mensagens   |
| Print 5 (conversa + bot)   | `whatsapp_business_messaging` → demonstra resposta automática do bot |
| Print 6 (lista templates)  | `whatsapp_business_management` → demonstra gestão de templates       |
| Print 7 (criar template)   | `whatsapp_business_management` → demonstra criação e submissão       |
| Print 8 (settings WABA)    | `whatsapp_business_management` → demonstra leitura de perfil WABA    |

---

### Conformidade com Business Messaging Policy

```
✅ Apenas mensagens iniciadas pelo cliente final (customer-initiated)
✅ Janela de 24h respeitada; templates usados para notificações outside window
✅ Não envia SPAM — bot só responde mensagens recebidas
✅ Sem compartilhamento de dados entre clientes (multi-tenant isolado)
✅ Opt-in: cliente inicia a conversa no WhatsApp
```

### Contato

| Campo             | Dado                                        |
| ----------------- | ------------------------------------------- |
| **Desenvolvedor** | Luis Felipe Boff                            |
| **Email**         | luisfboff@gmail.com                         |
| **WhatsApp**      | +55 54 9956-7051                            |
| **Empresa**       | Uzz.Ai Ltda                                 |
| **Timezone**      | GMT-3 (Brasília) — resposta em até 4h úteis |

---

## 7. Checklist Final

### Configurações do App

- [ ] Privacy Policy URL publicada e acessível
- [ ] Terms of Service URL publicada e acessível
- [ ] App domain configurado
- [ ] App Icon 1024x1024px enviado
- [ ] Business Verification concluída

### Formulários das Permissões

- [ ] `whatsapp_business_messaging` — "Como será usado" preenchido
- [ ] `whatsapp_business_messaging` — "Descreva o uso" preenchido
- [ ] `whatsapp_business_messaging` — Vídeo 1 enviado
- [ ] `whatsapp_business_messaging` — Conformidade marcada
- [ ] `whatsapp_business_management` — "Como será usado" preenchido
- [ ] `whatsapp_business_management` — "Descreva o uso" preenchido
- [ ] `whatsapp_business_management` — Vídeo 2 enviado
- [ ] `whatsapp_business_management` — Conformidade marcada

### Vídeos

- [ ] Vídeo 1 gravado (mensagem enviada + recebida no WhatsApp)
- [ ] Vídeo 2 gravado (criação de template)
- [ ] Ambos em 1080p+
- [ ] UI em inglês ou legendas adicionadas

### Testes Funcionais

- [ ] Bot respondendo mensagens corretamente
- [ ] Webhook recebendo eventos
- [ ] Embedded Signup funcionando
- [ ] Templates sendo criados e submetidos
- [ ] Dashboard exibindo conversas em tempo real

# Meta App Setup Guide - WhatsApp Multi-Tenant Platform

## Visão Geral

Este guia detalha como configurar o Meta App para suportar webhook único multi-tenant com Embedded Signup (OAuth).

**Modelo Arquitetural:**
- ✅ **Um único Meta App** compartilhado por todos os clientes
- ✅ **Embedded Signup** para OAuth (clientes conectam WABAs próprios)
- ✅ **Webhook único** em `/api/webhook`
- ✅ Clientes **possuem seus próprios WABAs** (não "on-behalf-of")

---

## Pré-Requisitos

### 1. Business Verification (OBRIGATÓRIO)

**Status:** Deve estar "Verified" antes de criar app

**Documentos Necessários:**
- Certificado de registro comercial (< 12 meses)
- Licença comercial ou trade license
- Certificado fiscal ou tax ID
- Conta de luz com nome da empresa

**Como Verificar:**

1. Acesse [Meta Business Manager](https://business.facebook.com)
2. Settings → Business Info → Business Verification
3. Upload dos documentos
4. Aguarde 2-5 dias úteis (até 14 dias)

**Verificar Status:**
```bash
curl "https://graph.facebook.com/v18.0/{BUSINESS_ID}?fields=verification_status&access_token={TOKEN}"

# Resposta esperada:
{
  "verification_status": "verified"
}
```

**Fontes:**
- [WhatsApp API Prerequisites](https://www.wati.io/en/blog/whatsapp-api-prerequisites/)
- [Business Verification Guide 2026](https://www.wuseller.com/whatsapp-business-knowledge-hub/whatsapp-business-api-guide-2026-setup-verification/)

### 2. Tech Provider Enrollment (OBRIGATÓRIO até 30/06/2025)

**Requisito:** Todos os ISVs devem se registrar como Tech Providers

**Como se Registrar:**

1. Acesse [WhatsApp Partners](https://business.whatsapp.com/partners/become-a-partner)
2. Clique "Apply as Tech Provider"
3. Preencha formulário:
   - Informações da empresa
   - Descrição da plataforma
   - Estimativa de clientes
   - Arquitetura técnica
4. Aguarde aprovação (5-10 dias úteis)

**Tiers:**
- **Tech Provider** (básico): Plataforma SaaS de WhatsApp
- **Tech Partner**: Min 10 clientes + 2500 conversas/dia
- **Solution Partner**: Pode oferecer crédito aos clientes

**Fonte:** [Tech Provider Program Overview](https://www.twilio.com/docs/whatsapp/isv/tech-provider-program)

---

## Parte 1: Criar Meta App

### Passo 1: Criar Novo App

1. Acesse [Meta Developer Console](https://developers.facebook.com/apps)
2. Clique "Create App"
3. Selecione "Business" como tipo de app
4. Preencha informações:
   - **App Name:** `WhatsApp SaaS Chatbot`
   - **App Contact Email:** seu-email@empresa.com
   - **Business Manager:** Selecione seu business verificado

### Passo 2: Adicionar Produtos (WhatsApp + Ads + Instagram)

**Produtos a Adicionar:**

1. **WhatsApp Business Platform**
   - App Dashboard → Add Product → WhatsApp → Setup
   - Para: Mensagens bidirecionais, chatbot

2. **Marketing API** (Meta Ads)
   - App Dashboard → Add Product → Marketing API → Setup
   - Para: Conversions API, campaign insights, ad management

3. **Instagram Graph API**
   - App Dashboard → Add Product → Instagram → Setup
   - Para: Mensagens DM, comentários, insights

**Por que adicionar todos agora?**
- Meta App Review é único por app (não por produto)
- Solicitar todas as permissões de uma vez evita múltiplas revisões
- Clientes podem escolher quais produtos querem usar (WhatsApp obrigatório, Ads/Instagram opcionais)

### Passo 3: Configurar App Basics

1. Settings → Basic
2. Anote:
   - **App ID:** `123456789012345`
   - **App Secret:** `abc123...` (clique "Show")
3. Adicionar domínios permitidos:
   - **App Domains:** `uzzapp.uzzai.com.br`
   - **Privacy Policy URL:** `https://uzzapp.uzzai.com.br/privacy`
   - **Terms of Service URL:** `https://uzzapp.uzzai.com.br/terms`

---

## Parte 2: Configurar Webhook

### Passo 1: Webhook Configuration

1. WhatsApp → Configuration → Webhook
2. Clique "Edit"
3. Preencha:
   - **Callback URL:** `https://uzzapp.uzzai.com.br/api/webhook`
   - **Verify Token:** `YOUR_PLATFORM_VERIFY_TOKEN` (string aleatória segura)

4. Clique "Verify and Save"

**Importante:** Meta faz GET request para validar:
```http
GET https://uzzapp.uzzai.com.br/api/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=RANDOM_STRING
```

Seu endpoint deve retornar `hub.challenge` se token for válido.

### Passo 2: Subscribe to Webhook Fields

1. Na mesma página, marque:
   - ✅ `messages` - Mensagens recebidas
   - ✅ `message_status` - Status de entrega
   - ✅ `message_reactions` - Reações a mensagens (opcional)

2. Clique "Subscribe"

---

## Parte 3: Configurar Embedded Signup (OAuth)

### Passo 1: Adicionar Facebook Login Product

1. App Dashboard → Add Product
2. Selecione **Facebook Login for Business**
3. Configure:
   - **Valid OAuth Redirect URIs:**
     ```
     https://uzzapp.uzzai.com.br/api/auth/meta/callback
     https://uzzapp.uzzai.com.br/onboarding
     ```
   - **Deauthorize Callback URL:** `https://uzzapp.uzzai.com.br/api/auth/meta/deauth`

### Passo 2: Ativar Embedded Signup

1. WhatsApp → Configuration → Embedded Signup
2. Ativar "Enable Embedded Signup"
3. Configurar permissões:
   - ✅ `whatsapp_business_management` - Gerenciar WABA
   - ✅ `whatsapp_business_messaging` - Enviar mensagens
   - ✅ `business_management` - Acessar Business Manager

---

## Parte 4: Permissões Completas (26 total)

### Lista de Todas as Permissões

#### 1️⃣ WhatsApp Business Platform (3 permissões)

| Permissão | Tipo | Para que serve |
|-----------|------|----------------|
| `whatsapp_business_management` | **Standard** | Gerenciar WABA, telefones, templates, webhooks |
| `whatsapp_business_messaging` | **Standard** | Enviar/receber mensagens, upload mídia |
| `whatsapp_business_manage_events` | **Standard** | Registrar eventos (Lead, Purchase) para Conversions API |

#### 2️⃣ Meta Ads / Marketing API (6 permissões)

| Permissão | Tipo | Para que serve |
|-----------|------|----------------|
| `ads_management` | **Advanced** ⚠️ | Criar/gerenciar campanhas, budgets, creative |
| `ads_read` | **Standard** | Ler dados de campanhas, insights, performance |
| `catalog_management` | **Standard** | Criar/gerenciar product catalogs (e-commerce) |
| `pages_manage_ads` | **Standard** | Gerenciar anúncios associados à Página |
| `pages_read_engagement` | **Standard** | Ler posts, fotos, vídeos, eventos da Página |
| `pages_show_list` | **Standard** | Listar Páginas que usuário gerencia |

#### 3️⃣ Threads API (10 permissões)

| Permissão | Tipo | Para que serve |
|-----------|------|----------------|
| `threads_basic` | **Standard** | Exibir posts do Threads do usuário |
| `threads_content_publish` | **Standard** | Publicar conteúdo no Threads |
| `threads_delete` | **Standard** | Deletar posts do Threads |
| `threads_keyword_search` | **Standard** | Buscar conteúdo por keyword |
| `threads_location_tagging` | **Standard** | Buscar locais e tag em posts |
| `threads_manage_insights` | **Standard** | Acessar insights do perfil Threads |
| `threads_manage_mentions` | **Standard** | Gerenciar menções ao usuário |
| `threads_manage_replies` | **Standard** | Criar, ocultar, controlar respostas |
| `threads_profile_discovery` | **Standard** | Acessar perfis públicos Threads |
| `threads_read_replies` | **Standard** | Ler respostas a threads do usuário |

#### 4️⃣ Instagram Graph API (3 permissões)

| Permissão | Tipo | Para que serve |
|-----------|------|----------------|
| `instagram_basic` | **Standard** | Info básica conta Instagram |
| `instagram_manage_messages` | **Standard** | Responder DMs |
| `instagram_manage_comments` | **Standard** | Responder comentários |

#### 5️⃣ Permissões Compartilhadas (4 permissões)

| Permissão | Tipo | Para que serve |
|-----------|------|----------------|
| `business_management` | **Standard** | Acessar Business Manager API |
| `email` | **Standard** | Ler email do usuário (para cadastro) |
| `public_profile` | **Standard** | Ler campos públicos do perfil |
| `manage_app_solution` | **Standard** | Gerenciar apps que o usuário administra |

**Total:** 26 permissões | **Advanced:** 1 (ads_management) | **Standard:** 25

---

## Parte 5: App Review (Para Permissões Advanced)

### Quando Submeter

**NECESSÁRIO para:**
- ✅ `ads_management` (Meta Ads)

### Como Submeter

1. App Dashboard → App Review → Permissions and Features
2. Para cada permissão **Advanced**, clique "Request"
3. Preencha questionário com use cases
4. Upload screenshots/video (2-3 min)
5. Aguarde **3-10 dias úteis**

**Ver detalhes completos em:** `docs/meta/META_APP_REVIEW.md`

---

## Checklist de Configuração

### Pré-Requisitos
- [ ] Business Manager criado
- [ ] Business Verification completa
- [ ] Tech Provider enrollment submetido

### Meta App
- [ ] App criado
- [ ] WhatsApp/Ads/Instagram products adicionados
- [ ] App ID e Secret anotados
- [ ] Domínios configurados

### Webhook
- [ ] Callback URL: `/api/webhook`
- [ ] Verify token configurado
- [ ] Teste GET passou ✅

### Embedded Signup
- [ ] Facebook Login adicionado
- [ ] Redirect URIs configurados
- [ ] Embedded Signup ativado
- [ ] Config ID anotado

### Environment Variables
- [ ] `META_PLATFORM_APP_ID`
- [ ] `META_PLATFORM_APP_SECRET`
- [ ] `META_PLATFORM_VERIFY_TOKEN`
- [ ] `META_PLATFORM_SYSTEM_USER_TOKEN`
- [ ] `META_EMBEDDED_SIGNUP_CONFIG_ID`

---

**Última Atualização:** 13 de fevereiro de 2026
**Versão:** 1.0

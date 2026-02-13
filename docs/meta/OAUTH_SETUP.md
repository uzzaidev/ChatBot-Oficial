# Meta OAuth Setup - Implementação Completa ✅

**Data:** 2026-02-13
**Status:** Código implementado, aguardando configuração de variáveis de ambiente

---

## 📋 O Que Foi Implementado

### 1. **Arquivos Criados** (5 novos arquivos)

#### ✅ `src/lib/meta-oauth.ts`
- Helper functions para OAuth flow
- `getMetaOAuthURL()` - Gera URL de redirecionamento
- `exchangeCodeForToken()` - Troca code por access token
- `fetchWABADetails()` - Busca dados do WABA na Meta Graph API
- `generateOAuthState()` - CSRF protection

#### ✅ `src/app/api/auth/meta/init/route.ts`
- Entry point do OAuth flow
- Gera state token (CSRF protection)
- Armazena em cookie seguro
- Redireciona para Meta OAuth

#### ✅ `src/app/api/auth/meta/callback/route.ts`
- Recebe callback da Meta após autorização
- Valida state (CSRF)
- Troca code por token
- Busca detalhes do WABA
- Cria client automaticamente com status `pending_setup`
- Armazena secrets no Vault
- Redireciona para onboarding

#### ✅ `src/app/api/auth/meta/deauth/route.ts`
- Endpoint de desautorização (Meta chama quando usuário revoga permissões)
- Valida signed_request
- Retorna confirmation URL

#### ✅ `src/components/ConnectWhatsAppButton.tsx`
- Componente React para iniciar OAuth
- Botão "Conectar WhatsApp Business"
- Loading state

---

## 🔑 Variáveis de Ambiente Necessárias

### **Comandos Doppler:**

```bash
# 1. Configuration ID (já temos)
doppler secrets set META_EMBEDDED_SIGNUP_CONFIG_ID="1247304987342255"

# 2. App ID (pegar em Meta Dashboard → Settings → Basic)
doppler secrets set META_PLATFORM_APP_ID="SUA_APP_ID_AQUI"

# 3. App Secret (pegar em Meta Dashboard → Settings → Basic → Show)
doppler secrets set META_PLATFORM_APP_SECRET="SUA_APP_SECRET_AQUI"

# 4. Verify Token (já configurado no webhook)
doppler secrets set META_PLATFORM_VERIFY_TOKEN="SEU_VERIFY_TOKEN"

# 5. URL base (confirmar)
doppler secrets set NEXT_PUBLIC_URL="https://uzzap.uzzai.com.br"
```

### **Onde Pegar:**

| Variável | Onde Encontrar |
|----------|----------------|
| `META_PLATFORM_APP_ID` | Meta Dashboard → Your App → Settings → Basic → **App ID** |
| `META_PLATFORM_APP_SECRET` | Meta Dashboard → Your App → Settings → Basic → **App Secret** (clique "Show") |
| `META_EMBEDDED_SIGNUP_CONFIG_ID` | ✅ Já temos: `1247304987342255` |
| `META_PLATFORM_VERIFY_TOKEN` | ✅ Mesmo token usado no webhook |
| `NEXT_PUBLIC_URL` | ✅ Já configurado: `https://uzzap.uzzai.com.br` |

---

## 🎯 Próximos Passos

### **1. Configurar Variáveis (5 min)**
- Executar comandos Doppler acima
- Deploy automático do Vercel após Doppler sync

### **2. Adicionar Domínio no Meta App (2 min)**
- Meta Dashboard → Settings → Basic
- **App Domains:** adicionar `uzzap.uzzai.com.br`

### **3. Testar OAuth Flow End-to-End (10 min)**

**Fluxo de Teste:**
```
1. Acessar https://uzzap.uzzai.com.br/onboarding
2. Clicar botão "Conectar WhatsApp Business"
3. Redireciona para Meta OAuth
4. Autorizar com conta Meta de teste
5. Callback cria client automaticamente
6. Redireciona para /onboarding?step=ai-config
7. Configurar chave OpenAI
8. Status muda para trial
9. Enviar mensagem WhatsApp → bot responde ✅
```

### **4. Adicionar Botão em Página de Onboarding (15 min)**

Exemplo de uso:
```typescript
import { ConnectWhatsAppButton } from '@/components/ConnectWhatsAppButton'

export default function OnboardingPage() {
  return (
    <div>
      <h1>Conecte seu WhatsApp Business</h1>
      <ConnectWhatsAppButton />
    </div>
  )
}
```

### **5. Criar Usuário de Teste no Meta App (5 min)**
- Meta Dashboard → Roles → Test Users
- Add Test User: `luisfboff@gmail.com`

### **6. Submeter App Review (Opcional - para produção)**
- Apenas quando quiser sair de Development Mode
- Ver guia completo em: `C:\Users\Luisf\.claude\plans\META_APP_REVIEW_RESPOSTAS.md`

---

## 🔄 Como Funciona o OAuth Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. Usuário clica "Conectar WhatsApp"                    │
│    Component: <ConnectWhatsAppButton />                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 2. GET /api/auth/meta/init                              │
│    - Gera state (CSRF token)                            │
│    - Armazena em cookie                                 │
│    - Redirect para Meta OAuth                           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Meta OAuth (usuário autoriza)                        │
│    - Usuário faz login no Facebook                      │
│    - Seleciona WABA para compartilhar                   │
│    - Autoriza permissões                                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 4. GET /api/auth/meta/callback?code=...&state=...       │
│    - Valida state (CSRF)                                │
│    - Troca code por access token                        │
│    - Busca WABA details (wabaId, phoneNumberId, phone)  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Auto-Provisioning                                    │
│    - Checa se WABA já existe (unique constraint)        │
│    - Cria secrets no Vault:                             │
│      * meta_access_token (real)                         │
│      * openai_api_key (placeholder)                     │
│      * groq_api_key (placeholder)                       │
│    - Insere client na tabela clients:                   │
│      * status: pending_setup                            │
│      * auto_provisioned: true                           │
│      * webhook_routing_mode: waba                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 6. Redirect para Onboarding                             │
│    URL: /onboarding?step=ai-config&client_id=...        │
│    - Usuário configura chaves OpenAI/Groq              │
│    - Status muda para trial                             │
│    - Bot ativo! 🎉                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 🔐 Segurança Implementada

### ✅ CSRF Protection
- State token gerado com `crypto.getRandomValues()`
- Armazenado em HTTP-only cookie
- Validado no callback

### ✅ HTTPS Only
- Cookies com `secure: true` em produção
- SameSite: lax

### ✅ HMAC Validation (Deauth)
- Signed request validado com App Secret
- Timing-safe comparison

### ✅ Unique Constraint
- `meta_waba_id` único no banco (prevent duplicate WABAs)

---

## 📊 Configuração do Embedded Signup

### **Configuration ID:** `1247304987342255`

### **Produtos Selecionados:**
- ✅ WhatsApp Cloud API
- ✅ API de Mensagens de Marketing para o WhatsApp
- ✅ Click to WhatsApp Ads (CTWA)
- ✅ Click to Direct Ads (CTD)
- ✅ Click to Messenger Ads (CTM)
- ✅ Conversions API for Business Messaging (Messenger)
- ✅ Conversions API for Business Messaging (Instagram)
- ✅ Conversions API for Business Messaging (WhatsApp)

### **Permissões:**
```
ads_management
ads_read
business_management
catalog_management
instagram_manage_events
page_events
pages_manage_ads
pages_read_engagement
pages_show_list
whatsapp_business_manage_events
whatsapp_business_management
whatsapp_business_messaging
```

### **Redirect URIs Configurados:**
- `https://uzzap.uzzai.com.br/api/auth/meta/callback`
- `https://uzzap.uzzai.com.br/onboarding`
- `https://uzzap.uzzai.com.br/api/auth/meta/deauth`

---

## 🐛 Troubleshooting

### Erro: "Missing META_PLATFORM_APP_ID"
**Solução:** Configurar variáveis de ambiente no Doppler (ver comandos acima)

### Erro: "Invalid state (CSRF protection)"
**Causa:** Cookie expirou (10 min) ou não foi armazenado
**Solução:** Tentar novamente o OAuth flow

### Erro: "WABA already connected"
**Causa:** WABA já foi conectado por outro cliente
**Solução:** Cada WABA só pode ser conectado uma vez (unique constraint)

### Erro: "No business account found"
**Causa:** Usuário não tem Business Manager
**Solução:** Criar Business Manager em business.facebook.com

### Erro: "No WABA found"
**Causa:** Usuário não tem WhatsApp Business Account
**Solução:** Criar WABA em business.facebook.com

---

## 📚 Referências

- **Plano de Migração:** `C:\Users\Luisf\.claude\plans\tranquil-zooming-stallman.md`
- **Meta App Setup:** `C:\Users\Luisf\.claude\plans\META_APP_SETUP.md`
- **App Review Respostas:** `C:\Users\Luisf\.claude\plans\META_APP_REVIEW_RESPOSTAS.md`
- **Meta Embedded Signup Docs:** https://developers.facebook.com/docs/whatsapp/embedded-signup
- **Migration SQL:** `supabase/migrations/20260131_add_meta_ads_integration.sql`

---

## ✅ Status Atual

| Item | Status |
|------|--------|
| Código OAuth | ✅ Implementado |
| Endpoints API | ✅ Criados (init, callback, deauth) |
| Helper Library | ✅ Criado (meta-oauth.ts) |
| UI Component | ✅ Criado (ConnectWhatsAppButton) |
| Embedded Signup Config | ✅ Configurado (ID: 1247304987342255) |
| Webhook Validation | ✅ Validado (green checkmark) |
| Variáveis de Ambiente | ⏳ Pendente (executar comandos Doppler) |
| Teste End-to-End | ⏳ Pendente (após vars configuradas) |
| App Review | ⏳ Opcional (apenas para sair de Dev Mode) |

---

**Próximo passo:** Executar comandos Doppler e testar OAuth flow! 🚀

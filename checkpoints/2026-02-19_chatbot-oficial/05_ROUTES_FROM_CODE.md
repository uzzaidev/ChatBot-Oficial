# 05_ROUTES_FROM_CODE - Inventário de Rotas (App Router)

**Data:** 2026-02-19
**Fonte:** src/app/**/page.tsx + layouts
**Total de Pages:** 38 arquivos page.tsx encontrados
**Total de Layouts:** 4 arquivos layout.tsx encontrados

---

## Estrutura de Layouts (Hierarquia)

```
src/app/layout.tsx (Root)
├── src/app/(auth)/layout.tsx (Auth group)
├── src/app/dashboard/layout.tsx (Dashboard)
│   └── src/app/dashboard/conversations/layout.tsx (Conversations specific)
```

### Root Layout
**Arquivo:** `src/app/layout.tsx`
**Tipo:** Server Component (default)
**Providers:**
- ThemeProvider (dark/light theme)
- DeepLinkingProvider (Capacitor deep links)
- PushNotificationsProvider (Capacitor push)
- NotificationManager
- Toaster (toast notifications)

**Fontes:**
- Poppins (--font-poppins)
- Inter (--font-inter)
- Exo 2 (--font-exo2)
- Fira Code (--font-fira-code)

**Metadata:**
- Title: "UzzApp - WhatsApp Dashboard"
- Icons: /favcon.ico
- Manifest: /manifest.json

**Viewport:** Mobile-optimized (no user scaling, viewport-fit: cover)

---

## Catálogo de Rotas por Módulo

### 🏠 Landing & Auth

| Rota | Arquivo | Tipo | Descrição | Layout |
|------|---------|------|-----------|--------|
| `/` | `src/app/page.tsx` | Server | Landing page (Hero, Highlights, Plans, Security, CTA) | Root |
| `/login` | `src/app/(auth)/login/page.tsx` | ? | Login page | Root → Auth |
| `/register` | `src/app/(auth)/register/page.tsx` | ? | Registration page | Root → Auth |
| `/privacy` | `src/app/privacy/page.tsx` | ? | Privacy policy | Root |
| `/terms` | `src/app/terms/page.tsx` | ? | Terms of service | Root |
| `/dpa` | `src/app/dpa/page.tsx` | ? | Data Processing Agreement | Root |
| `/onboarding` | `src/app/onboarding/page.tsx` | ? | Onboarding wizard | Root |

**Evidência Landing:** `src/app/page.tsx:7-23` - Static landing page com componentes Hero, Highlights, Plans, Security, FinalCTA.

---

### 📊 Dashboard Principal

| Rota | Arquivo | Tipo | Descrição | Layout |
|------|---------|------|-----------|--------|
| `/dashboard` | `src/app/dashboard/page.tsx` | ? | Dashboard home | Root → Dashboard |
| `/dashboard/analytics` | `src/app/dashboard/analytics/page.tsx` | ? | Analytics overview | Root → Dashboard |
| `/dashboard/analytics-comparison` | `src/app/dashboard/analytics-comparison/page.tsx` | ? | Comparative analytics | Root → Dashboard |
| `/dashboard/openai-analytics` | `src/app/dashboard/openai-analytics/page.tsx` | ? | OpenAI usage analytics | Root → Dashboard |

**⚠️ VERIFICAR:** Dashboard layout - auth guard? client enforcement? Zustand state?

---

### 💬 Conversas & Chat

| Rota | Arquivo | Tipo | Descrição | Layout |
|------|---------|------|-----------|--------|
| `/dashboard/conversations` | `src/app/dashboard/conversations/page.tsx` | ? | Conversations list | Root → Dashboard → Conversations |
| `/dashboard/chat` | `src/app/dashboard/chat/page.tsx` | ? | Chat interface | Root → Dashboard |
| `/dashboard/contacts` | `src/app/dashboard/contacts/page.tsx` | ? | Contacts management | Root → Dashboard |

**Layout Especial:** `src/app/dashboard/conversations/layout.tsx` - Layout específico para conversas.

---

### 🧠 AI & Knowledge

| Rota | Arquivo | Tipo | Descrição | Layout |
|------|---------|------|-----------|--------|
| `/dashboard/knowledge` | `src/app/dashboard/knowledge/page.tsx` | ? | RAG knowledge base (PDF/TXT upload) | Root → Dashboard |
| `/dashboard/agents` | `src/app/dashboard/agents/page.tsx` | ? | AI agents management | Root → Dashboard |
| `/dashboard/ai-gateway` | `src/app/dashboard/ai-gateway/page.tsx` | ? | AI Gateway overview | Root → Dashboard |
| `/dashboard/ai-gateway/models` | `src/app/dashboard/ai-gateway/models/page.tsx` | ? | AI models registry | Root → Dashboard |
| `/dashboard/ai-gateway/budget` | `src/app/dashboard/ai-gateway/budget/page.tsx` | ? | Budget management | Root → Dashboard |
| `/dashboard/ai-gateway/cache` | `src/app/dashboard/ai-gateway/cache/page.tsx` | ? | AI cache management | Root → Dashboard |
| `/dashboard/ai-gateway/setup` | `src/app/dashboard/ai-gateway/setup/page.tsx` | ? | AI Gateway setup | Root → Dashboard |
| `/dashboard/ai-gateway/test` | `src/app/dashboard/ai-gateway/test/page.tsx` | ? | AI Gateway testing | Root → Dashboard |
| `/dashboard/ai-gateway/validation` | `src/app/dashboard/ai-gateway/validation/page.tsx` | ? | AI Gateway validation | Root → Dashboard |

**⚠️ CRITICAL:** AI Gateway pages existem, mas CLAUDE.md diz que AI Gateway foi deprecated em favor do Direct AI Client.
**DIVERGÊNCIA CONFIRMADA:** Código tem rotas de AI Gateway, mas documentação diz deprecated.

---

### 🔄 Flows & Architecture

| Rota | Arquivo | Tipo | Descrição | Layout |
|------|---------|------|-----------|--------|
| `/dashboard/flows` | `src/app/dashboard/flows/page.tsx` | ? | Flows list | Root → Dashboard |
| `/dashboard/flows/[flowId]/edit` | `src/app/dashboard/flows/[flowId]/edit/page.tsx` | ? | Flow editor (dynamic route) | Root → Dashboard |
| `/dashboard/flow-architecture` | `src/app/dashboard/flow-architecture/page.tsx` | ? | Flow Architecture Manager (Mermaid visual config) | Root → Dashboard |

**Evidência Flow Architecture:** CLAUDE.md menciona `/dashboard/flow-architecture` como "Flow Visual Manager" com Mermaid diagram.

---

### 📝 Templates & Messages

| Rota | Arquivo | Tipo | Descrição | Layout |
|------|---------|------|-----------|--------|
| `/dashboard/templates` | `src/app/dashboard/templates/page.tsx` | ? | Message templates list | Root → Dashboard |
| `/dashboard/templates/new` | `src/app/dashboard/templates/new/page.tsx` | ? | Create new template | Root → Dashboard |
| `/dashboard/templates/test` | `src/app/dashboard/templates/test/page.tsx` | ? | Test templates | Root → Dashboard |

---

### ⚙️ Settings & Configuration

| Rota | Arquivo | Tipo | Descrição | Layout |
|------|---------|------|-----------|--------|
| `/dashboard/settings` | `src/app/dashboard/settings/page.tsx` | ? | General settings | Root → Dashboard |
| `/dashboard/settings/tts` | `src/app/dashboard/settings/tts/page.tsx` | ? | Text-to-Speech settings | Root → Dashboard |

---

### 👥 Admin & Backend

| Rota | Arquivo | Tipo | Descrição | Layout |
|------|---------|------|-----------|--------|
| `/dashboard/admin/budget-plans` | `src/app/dashboard/admin/budget-plans/page.tsx` | ? | Budget plans management (admin) | Root → Dashboard |
| `/dashboard/backend` | `src/app/dashboard/backend/page.tsx` | ? | Backend management | Root → Dashboard |

**⚠️ VERIFICAR:** Role-based access control (RBAC) para rotas admin?

---

### 📈 Meta Ads & CRM

| Rota | Arquivo | Tipo | Descrição | Layout |
|------|---------|------|-----------|--------|
| `/dashboard/meta-ads` | `src/app/dashboard/meta-ads/page.tsx` | ? | Meta Ads integration | Root → Dashboard |
| `/dashboard/crm` | `src/app/dashboard/crm/page.tsx` | ? | CRM module | Root → Dashboard |

**Evidência:** Migrations `20260131_add_meta_ads_integration.sql`, `20260131_crm_module.sql` confirmam esses módulos.

---

### 🧪 Testing & Debug

| Rota | Arquivo | Tipo | Descrição | Layout |
|------|---------|------|-----------|--------|
| `/test-table` | `src/app/test-table/page.tsx` | ? | Test table rendering | Root |
| `/test-oauth` | `src/app/test-oauth/page.tsx` | ? | OAuth testing | Root |
| `/components-showcase` | `src/app/components-showcase/page.tsx` | ? | UI components showcase | Root |
| `/dashboard/test-interactive` | `src/app/dashboard/test-interactive/page.tsx` | ? | Interactive testing | Root → Dashboard |

---

## Análise de Padrões

### Route Groups
```
(auth)/ - Authentication routes (login, register)
```
**Evidência:** `src/app/(auth)/layout.tsx` exists.

### Dynamic Routes
```
flows/[flowId]/edit - Flow editor with dynamic ID
```
**Pattern:** `[paramName]` para parâmetros dinâmicos.

### Nested Layouts
```
dashboard/conversations/ - Tem layout específico além do dashboard layout
```

---

## Server vs Client Components

**Análise pendente:** Precisa ler cada arquivo para identificar `"use client"` directive.

**Padrão esperado:**
- Pages sem interatividade → Server Component
- Pages com forms/state/interactions → Client Component

---

## Auth Guards & Middleware

**⚠️ NÃO ENCONTRADO no scan inicial:**
- Middleware.ts na raiz
- Auth guards em layouts

**AÇÃO NECESSÁRIA:**
1. Verificar `src/middleware.ts` ou `middleware.ts` na raiz
2. Ler dashboard layouts para identificar auth checks
3. Verificar Supabase SSR auth pattern

---

## Client Enforcement (Multi-Tenancy)

**CRÍTICO:** Todas rotas de dashboard devem filtrar por client_id.

**VERIFICAR em cada page:**
- Como client_id é obtido? (cookie? URL? context?)
- RLS policies no Supabase garantem isolamento?

---

## State Management

**Evidências de Zustand:**
- package.json:99 - `"zustand": "^5.0.9"`

**VERIFICAR:**
- Stores em `src/stores/` ou `src/lib/stores/`
- Quais states são globais?
- Client-only state vs server state

---

## Perguntas em Aberto

1. ❓ Quais rotas requerem auth? (verificar middleware/guards)
2. ❓ Como client_id é propagado nas rotas de dashboard?
3. ❓ AI Gateway pages estão ativas ou deprecated? (divergência com CLAUDE.md)
4. ❓ RBAC implementado? Quais rotas são admin-only?
5. ❓ Server vs Client components - qual é a distribuição?
6. ❓ Conversation layout específico - o que adiciona?
7. ❓ Onboarding wizard - é obrigatório para novos users?
8. ❓ DPA page - quando é mostrado?

---

## Próximos Passos (Validação)

- [ ] Ler dashboard layouts (auth guards, client context)
- [ ] Grep por "use client" em todos pages
- [ ] Verificar middleware.ts
- [ ] Ler auth pages (login/register flow)
- [ ] Verificar AI Gateway pages (ativas ou deprecated?)
- [ ] Mapear navigation (Sidebar component, links principais)
- [ ] Identificar RBAC patterns
- [ ] Verificar conversation layout específico

---

## Divergências Identificadas

### 🔴 DIVERGÊNCIA #1: AI Gateway
**CLAUDE.md diz:** "AI Gateway deprecated, use Direct AI Client"
**Código mostra:** 7 rotas de AI Gateway em `/dashboard/ai-gateway/*`
**Status:** CONFLITO - Precisa verificar se rotas estão ativas ou legado não removido.

---

## Evidências Citadas

- `src/app/page.tsx:7-23` - Landing page structure
- `src/app/layout.tsx:1-92` - Root layout with providers
- Migrations confirmam módulos: CRM, Meta Ads, Agents

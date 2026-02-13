# App Review Checklist - Material Necessário

**Status:** Preparando submissão
**Data:** 13 de fevereiro de 2026 (atualizado com auditoria real do código)

---

## 🎯 RESUMO EXECUTIVO

### ✅ SOLICITAR AGORA (temos código + screenshots possíveis)

| #   | Permissão                         | Tipo     | Screenshots?                                                        |
| --- | --------------------------------- | -------- | ------------------------------------------------------------------- |
| 1   | `whatsapp_business_messaging`     | Standard | ✅ Dashboard conversas, chat detail, ConnectWhatsAppButton, webhook |
| 2   | `whatsapp_business_management`    | Standard | ✅ Templates (list/sync/submit/delete), Settings                    |
| 3   | `whatsapp_business_manage_events` | Standard | ✅ CAPI implementada (419 linhas), tab CAPI Events no Meta Ads      |
| 4   | `ads_read`                        | Standard | ✅ Meta Ads dashboard 7 tabs (read/analytics)                       |
| 5   | `pages_show_list`                 | Standard | ✅ OAuth flow implementado                                          |
| 6   | `pages_read_engagement`           | Standard | ✅ OAuth flow implementado                                          |
| 7   | `business_management`             | Standard | ✅ OAuth callback (196 linhas)                                      |
| 8   | `email`                           | Standard | ✅ Login/Register pages                                             |
| 9   | `public_profile`                  | Standard | ✅ Login/Register pages                                             |
| 10  | `manage_app_solution`             | Standard | ✅ OAuth flow                                                       |

### ⛔ NÃO SOLICITAR AGORA (sem código/screenshots)

| #     | Permissão                   | Tipo            | Motivo                                                                                                                        |
| ----- | --------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 11    | `ads_management`            | **Advanced** ⚠️ | Não temos wizard "Criar Campanha CTWA" — dashboard é read/analytics only. Screencast exigido pelo review não pode ser gravado |
| 12    | `pages_manage_ads`          | Standard        | Depende de ads_management funcional                                                                                           |
| 13    | `catalog_management`        | Standard        | Zero código implementado                                                                                                      |
| 14    | `instagram_basic`           | Standard        | Zero código Instagram no projeto                                                                                              |
| 15    | `instagram_manage_messages` | Standard        | Zero código Instagram no projeto                                                                                              |
| 16    | `instagram_manage_comments` | Standard        | Zero código Instagram no projeto                                                                                              |
| 17-26 | Threads (10 permissões)     | Standard        | Zero código Threads no projeto                                                                                                |

---

## 📋 Detalhamento por Permissão

### 1️⃣ WhatsApp Business Platform

#### ✅ **whatsapp_business_messaging** (Standard - Não requer review) — SOLICITAR

**Screenshots Possíveis (temos UI pronta):**

- [x] ✅ Dashboard mostrando conversas WhatsApp (`/dashboard/conversations` — `ConversationsIndexClient`)
- [x] ✅ Chat detail com message bubbles (`/dashboard/chat?phone=...` — `ConversationPageClient`)
- [x] ✅ Botão "Conectar WhatsApp" (`ConnectWhatsAppButton.tsx`)
- [x] ✅ Página test-oauth com fluxo Embedded Signup (`/test-oauth`)
- [x] ✅ Pipeline de processamento backend (`src/flows/chatbotFlow.ts` — 1646 linhas, 14 nodes)
- [x] ✅ Webhook funcionando (`/api/webhook/[clientId]/route.ts` — 474 linhas, HMAC validation)
- [ ] ⏳ Bot respondendo no WhatsApp (precisa OAuth funcionar para demo real)
- [ ] ⏳ Página de onboarding final (callback redireciona para `/onboarding` mas **página NÃO EXISTE**)

**Vídeo (2-3 min):**

- [x] ✅ [0:00-0:30] Login no dashboard (página implementada: `/login` — 319 linhas)
- [ ] ⏳ [0:30-1:00] Clicar "Conectar WhatsApp" → OAuth Meta (código pronto, OAuth bloqueado pela Meta)
- [ ] ⏳ [1:00-1:30] Autorizar WABA (bloqueado)
- [x] ✅ [1:30-2:00] Configurar chatbot — prompt, modelo (`/dashboard/settings` — 1442 linhas)
- [ ] ⏳ [2:00-2:30] Cliente final enviando mensagem (precisa OAuth funcionar)
- [ ] ⏳ [2:30-3:00] Bot respondendo (precisa OAuth funcionar)
- [x] ✅ [3:00-3:30] Visualizar conversa no dashboard (UI pronta)

**Status:** ✅ **CÓDIGO 100% IMPLEMENTADO** — Screenshots da UI possíveis agora, demo end-to-end aguarda OAuth

**Código implementado:**

- ✅ OAuth completo: `/api/auth/meta/init`, `/callback`, `/deauth` (3 routes)
- ✅ `meta-oauth.ts` (181 linhas): `getMetaOAuthURL()`, `exchangeCodeForToken()`, `fetchWABADetails()`
- ✅ `ConnectWhatsAppButton.tsx`: Componente funcional
- ✅ Webhook per-client: `/api/webhook/[clientId]/route.ts` (474 linhas) — HMAC, dedup, multi-tenant
- ✅ `chatbotFlow.ts` (1646 linhas): Pipeline completo de 14 nodes
- ✅ 38 processing nodes em `src/nodes/` (transcription, image analysis, RAG, TTS, etc.)
- ✅ Dashboard: conversations list + chat detail com realtime
- ✅ Contacts page: `/dashboard/contacts`

**O que falta (bloqueado):**

- ⏳ OAuth funcionando (erro genérico da Meta — aguardando resolução)
- ❌ Página `/onboarding` (referenciada no callback mas **NÃO implementada**)
- ⏳ Screenshots de demo end-to-end (após OAuth funcionar)
- ⏳ Vídeo demonstrativo (após OAuth funcionar)

---

#### ✅ **whatsapp_business_management** (Standard - Não requer review) — SOLICITAR

**Screenshots Possíveis:**

- [x] ✅ Templates de mensagem — list, sync, submit, delete (`/dashboard/templates` — 193 linhas)
- [x] ✅ Configurações de cliente — OpenAI keys, modelo, system prompt (`/dashboard/settings` — 1442 linhas)
- [x] ✅ Vault de credenciais no Settings
- [ ] ⏳ Dashboard mostrando WABAs conectados (após OAuth funcionar)

**Status:** ✅ **IMPLEMENTADO** — Templates + Settings prontos para screenshot

**Código implementado:**

- ✅ Templates page: list, sync da Meta API, submit para aprovação, delete
- ✅ Settings page: profile, vault secrets, bot config, TTS
- ✅ Webhook configuração automática no OAuth callback

**O que falta:**

- ⏳ Interface para gerenciar múltiplos phone numbers (melhoraria review)
- ⏳ Dashboard mostrando health status/quality rating do WABA

---

#### ✅ **whatsapp_business_manage_events** (Standard - Não requer review) — SOLICITAR

**Screenshots Possíveis:**

- [x] ✅ Tab "CAPI Events" no Meta Ads dashboard mostrando eventos enviados
- [x] ✅ Configuração de Dataset ID na tab "Config" do Meta Ads
- [x] ✅ CRM Kanban board onde mover card dispara evento de conversão (`/dashboard/crm` — 523 linhas)

**Status:** ✅ **IMPLEMENTADO** (corrigido — antes marcado incorretamente como "0%")

**Código implementado:**

- ✅ `src/nodes/sendConversionEvent.ts` (419 linhas) — Implementação COMPLETA:
  - Envia eventos `Lead`, `QualifiedLead`, `Purchase` para Meta Conversions API
  - Usa `ctwa_clid` para atribuição de anúncio Click-to-WhatsApp
  - Envia `custom_data` (value, currency) para ROI tracking
  - Loga eventos na tabela `conversion_events_log`
  - Suporta deduplicação de eventos
- ✅ `src/nodes/captureLeadSource.ts` — Captura `ctwa_clid` do webhook
- ✅ `src/nodes/updateCRMCardStatus.ts` — Auto-atualiza CRM e dispara CAPI
- ✅ Tab "CAPI Events" no Meta Ads dashboard — tabela com histórico de eventos
- ✅ Tab "Config" com campo para Dataset ID

**O que falta:**

- ⏳ Demo real de evento sendo enviado (precisa campanha CTWA ativa)

---

### 2️⃣ Meta Ads / Marketing API

#### ⛔ **ads_management** (Advanced - ⚠️ REQUER REVIEW) — NÃO SOLICITAR AGORA

> **⚠️ MOTIVO:** Esta é a única permissão **Advanced** que exige review formal com screencast obrigatório. O screencast deve mostrar **criação de campanha CTWA end-to-end**. Nosso dashboard Meta Ads é **read/analytics only** — não temos wizard "Criar Campanha". Sem isso, o review será **rejeitado**.

**O que temos:**

- ✅ Dashboard Meta Ads completo (`/dashboard/meta-ads` — 1032 linhas, 7 tabs)
- ✅ Leitura de campanhas existentes (insights, spend, impressions, clicks)
- ✅ Tab "CAPI Events" com histórico de conversões
- ✅ Tab "Lead Ads" para formulários capturados
- ✅ Tab "Audiences" para sync de audiências customizadas
- ✅ Tab "Alerts" para monitoramento de budget
- ✅ Tab "Config" para configuração de Ad Account, Access Token, Dataset ID
- ✅ Componentes: `MetaAdsTrendCharts`, `MetaAdsBreakdownTable`, `MetaAdsBudgetAlerts`, `MetaAdsAudienceSync`, `MetaAdsLeadAds`

**O que falta para solicitar:**

- ❌ **CRÍTICO:** Wizard "Criar Campanha CTWA" (formulário: objetivo, orçamento, público, creative, CTA)
- ❌ **CRÍTICO:** Pausar/retomar campanha via API no dashboard
- ❌ **CRÍTICO:** Screencast end-to-end de criação de campanha

**Quando solicitar:** Após implementar wizard de criação de campanha (~8-12 horas de dev)

---

#### ✅ **ads_read** (Standard - Não requer review) — SOLICITAR

**Screenshots Possíveis:**

- [x] ✅ Dashboard Meta Ads — tab "Overview" com métricas (spend, impressions, clicks, CTR)
- [x] ✅ Tab "Campaigns" com lista de campanhas e insights
- [x] ✅ Gráficos de tendência (`MetaAdsTrendCharts`)
- [x] ✅ Breakdown table (`MetaAdsBreakdownTable`)
- [x] ✅ Analytics de custos

**Status:** ✅ **IMPLEMENTADO** — Dashboard rico, read-only, 7 tabs funcionais

---

#### ⛔ **pages_manage_ads** (Standard) — NÃO SOLICITAR AGORA

> **⚠️ MOTIVO:** Depende de `ads_management` funcional (criação de ads associados a Pages). Sem o wizard de campanha, não conseguimos demonstrar esta permissão.

---

#### ✅ **pages_show_list** (Standard) — SOLICITAR

**Screenshots:** OAuth flow que lista Pages do usuário durante Embedded Signup.
**Código:** `meta-oauth.ts` → `getMetaOAuthURL()` solicita `pages_show_list` no scope.

---

#### ✅ **pages_read_engagement** (Standard) — SOLICITAR

**Screenshots:** OAuth flow + referências no Meta Ads dashboard.
**Código:** Implementado como dependência de `ads_read`.

---

#### ⛔ **catalog_management** (Standard) — NÃO SOLICITAR AGORA

> **⚠️ MOTIVO:** Zero código implementado. Não existe:
>
> - Nenhuma página `/dashboard/product-catalog`
> - Nenhum componente de upload de produtos
> - Nenhuma integração com Product Catalog API
> - Nenhum envio de product messages no chat

**Quando solicitar:** Após implementar funcionalidade de catálogo (~12-16 horas de dev)

---

### 3️⃣ Instagram Graph API

#### ⛔ **instagram_basic**, **instagram_manage_messages**, **instagram_manage_comments** — NÃO SOLICITAR AGORA

> **⚠️ MOTIVO:** Zero código Instagram em todo o projeto. Não existe:
>
> - Nenhuma página Instagram no dashboard
> - Nenhum webhook handler para Instagram
> - Nenhum parser de mensagens Instagram
> - Nenhum componente de DM ou comentários
> - A única menção é um texto descritivo "Facebook/Instagram" no `MetaAdsLeadAds.tsx`

**O que seria necessário implementar:**

- Webhook handler para Instagram Messaging API
- Parser de mensagens Instagram → formato unificado
- Componentes de DM no dashboard de conversas (multi-canal)
- Bot respondendo DMs e comentários
- **Estimativa:** 12-16 horas de dev

**Quando solicitar:** Após implementar integração Instagram completa

---

### 4️⃣ Threads API (10 permissões)

#### ⛔ **threads_basic**, **threads_content_publish**, **threads_manage_replies**, etc. — NÃO SOLICITAR AGORA

> **⚠️ MOTIVO:** Zero código Threads em todo o projeto. Nenhuma referência a Threads em `src/`.

**Quando solicitar:** Após implementar integração Threads completa (~8-12 horas de dev)

---

### 5️⃣ Permissões Compartilhadas

#### ✅ **business_management** (Standard) — SOLICITAR

**Screenshots:** OAuth callback que acessa Business Manager para listar WABAs.
**Código:** `src/app/api/auth/meta/callback/route.ts` (196 linhas) — exchanges code, fetches WABA details, creates client.

---

#### ✅ **email** (Standard) — SOLICITAR

**Screenshots:** Login page (`/login` — 319 linhas), Register page (`/register` — 298 linhas).
**Código:** Supabase Auth com email/password.

---

#### ✅ **public_profile** (Standard) — SOLICITAR

**Screenshots:** Header do dashboard com nome do usuário.
**Código:** OAuth flow obtém nome + foto do perfil.

---

#### ✅ **manage_app_solution** (Standard) — SOLICITAR

**Screenshots:** OAuth flow durante setup.
**Código:** Referenciado nas permissões do OAuth scope.

---

## 📸 Screenshots que PODEMOS Fazer Agora

### ✅ Prontos para Screenshot (20+ telas)

1. **Landing Page & Auth**

   - `/` — Landing page com Hero, Highlights, Plans, Security, CTA ✅
   - `/login` — Login com email/password + auth biométrica (319 linhas) ✅
   - `/register` — Registro com auto-provisioning de client (298 linhas) ✅

2. **Dashboard Principal**

   - `/dashboard` — Tela inicial com metric cards (`DashboardClient`) ✅
   - `/dashboard/conversations` — Lista de conversas com busca (`ConversationsIndexClient`) ✅
   - `/dashboard/chat?phone=...` — Chat detail com message bubbles e realtime ✅
   - `/dashboard/contacts` — Gerenciamento de contatos ✅

3. **CRM Kanban**

   - `/dashboard/crm` — Board completo com drag-drop (523 linhas + 17 componentes) ✅
   - Cards, colunas customizáveis, tags, timeline, notas ✅
   - Analytics do pipeline ✅

4. **Meta Ads Dashboard**

   - `/dashboard/meta-ads` — 7 tabs (1032 linhas) ✅
   - Overview: spend, impressions, clicks, leads, conversions, ROI ✅
   - Campaigns: lista com insights ✅
   - CAPI Events: histórico de eventos de conversão ✅
   - Lead Ads: formulários capturados ✅
   - Audiences: sync com Custom Audiences ✅
   - Alerts: monitoramento de budget ✅
   - Config: Ad Account ID, Access Token, Dataset ID ✅

5. **Knowledge Base (RAG)**

   - `/dashboard/knowledge` — Upload de documentos (drag-drop PDF/TXT/MD) ✅
   - Lista de documentos + chunks viewer ✅

6. **Agents**

   - `/dashboard/agents` — Multi-agent setup, A/B test, scheduler (495 linhas) ✅

7. **Flows**

   - `/dashboard/flows` — Lista, criar, editar, deletar flows (239 linhas) ✅

8. **Templates WhatsApp**

   - `/dashboard/templates` — List, sync, submit, delete (193 linhas) ✅

9. **Analytics (3 páginas)**

   - `/dashboard/analytics` — Unified analytics ✅
   - `/dashboard/analytics-comparison` — OpenAI usage + cost charts (919 linhas) ✅
   - `/dashboard/openai-analytics` — Recharts bar/line/pie (456 linhas) ✅

10. **Settings**

    - `/dashboard/settings` — Profile, vault secrets, bot config (1442 linhas) ✅
    - `/dashboard/settings/tts` — Text-to-speech config (527 linhas) ✅

11. **AI Gateway**

    - `/dashboard/ai-gateway` — Hub com 6 sub-seções ✅
    - Setup, cache, models, analytics, budget, test, validation ✅

12. **Admin**

    - `/dashboard/admin/budget-plans` — Budget limits per client (474 linhas) ✅

13. **Conectar WhatsApp**

    - `/test-oauth` — ConnectWhatsAppButton com explicação step-by-step ✅

14. **Páginas Legais**

    - `/privacy` — Privacy Policy completa, branded Uzz.AI (273 linhas) ✅
    - `/terms` — Terms of Service completo (266 linhas) ✅

15. **Outros**
    - `/dashboard/flow-architecture` — ReactFlow visual editor ✅
    - `/dashboard/backend` — Terminal-style execution log (707 linhas) ✅
    - `/dashboard/test-interactive` — Test WhatsApp buttons/lists (297 linhas) ✅

### ⏳ Precisam ser criados/melhorados

1. **Página `/onboarding`** — Callback OAuth redireciona para ela, mas **NÃO EXISTE**
2. **Página `/dpa`** — Referenciada no META_APP_REVIEW.md mas **NÃO EXISTE**

### ❌ Não Podemos Fazer (bloqueados ou sem código)

1. **OAuth Flow Completo no WhatsApp real** — ⏳ Bloqueado pelo erro genérico da Meta
2. **Demo de bot respondendo em tempo real** — ⏳ Precisa OAuth funcionar
3. **Criação de campanha CTWA** — ❌ Wizard não implementado
4. **Instagram (DMs, comentários, dashboard)** — ❌ Zero código
5. **Threads (publicação, menções, analytics)** — ❌ Zero código
6. **Product Catalog** — ❌ Zero código
7. **Pasta `docs/screenshots/`** — ❌ Não existe (precisa criar e popular)
8. **Pasta `docs/videos/`** — ❌ Não existe (precisa criar e gravar)

---

## 🎯 Prioridade de Desenvolvimento para App Review

### 🔴 CRÍTICO (bloqueia submissão)

1. **Resolver OAuth com Meta** ⭐⭐⭐

   - Sem isso, nenhum screenshot de flow funcional end-to-end
   - **Status:** Aguardando Meta resolver erro genérico
   - **Ação:** Continuar follow-up com suporte Meta

2. **Criar pasta `docs/screenshots/` e tirar prints** ⭐⭐⭐
   - 20+ telas prontas para screenshot (ver lista acima)
   - **Tempo estimado:** 2-3 horas
   - **Ação:** Navegar cada tela, tirar print, nomear conforme META_APP_REVIEW.md

### 🟡 IMPORTANTE (melhora chances de aprovação)

3. **Criar página `/onboarding`** ⭐⭐

   - OAuth callback redireciona para `/onboarding?step=ai-config&client_id=...`
   - Página não existe — precisa criar multi-step wizard
   - **Tempo estimado:** 4-6 horas

4. **Criar página `/dpa`** ⭐

   - Data Processing Agreement referenciado no META_APP_REVIEW.md
   - **Tempo estimado:** 2-3 horas

5. **Gravar vídeos demonstrativos** ⭐⭐
   - Screen recording do dashboard (mesmo sem OAuth real)
   - **Tempo estimado:** 3-4 horas (após screenshots)

### 🟢 FUTURO (para solicitar permissões adicionais)

6. **Wizard "Criar Campanha CTWA"** — Para solicitar `ads_management` (8-12h)
7. **Integração Instagram** — Para solicitar instagram\_\* (12-16h)
8. **Integração Threads** — Para solicitar threads\_\* (8-12h)
9. **Product Catalog** — Para solicitar `catalog_management` (12-16h)

---

## 📊 Status Geral (Corrigido)

| Categoria                 | Status  | Pronto p/ Review?               | Recomendação                        |
| ------------------------- | ------- | ------------------------------- | ----------------------------------- |
| WhatsApp Messaging        | ✅ 90%  | ⏳ Aguardando OAuth             | ✅ SOLICITAR                        |
| WhatsApp Management       | ✅ 80%  | ✅ Templates + Settings prontos | ✅ SOLICITAR                        |
| WhatsApp Events (CAPI)    | ✅ 90%  | ✅ Implementado (419 linhas)    | ✅ SOLICITAR                        |
| Meta Ads Dashboard (read) | ✅ 95%  | ✅ 7 tabs completas             | ✅ SOLICITAR (`ads_read`)           |
| Meta Ads Creation (write) | 🔴 10%  | ❌ Sem wizard de campanha       | ⛔ NÃO SOLICITAR (`ads_management`) |
| Pages (show/read)         | ✅ 80%  | ✅ OAuth flow                   | ✅ SOLICITAR                        |
| Pages (manage ads)        | 🔴 10%  | ❌ Depende de ads_management    | ⛔ NÃO SOLICITAR                    |
| Business Management       | ✅ 80%  | ✅ OAuth callback               | ✅ SOLICITAR                        |
| Email / Public Profile    | ✅ 100% | ✅ Login/Register               | ✅ SOLICITAR                        |
| Catalog Management        | 🔴 0%   | ❌ Zero código                  | ⛔ NÃO SOLICITAR                    |
| Instagram (3 permissões)  | 🔴 0%   | ❌ Zero código                  | ⛔ NÃO SOLICITAR                    |
| Threads (10 permissões)   | 🔴 0%   | ❌ Zero código                  | ⛔ NÃO SOLICITAR                    |
| Privacy Policy            | ✅ 100% | ✅ `/privacy` (273 linhas)      | ✅ PRONTO                           |
| Terms of Service          | ✅ 100% | ✅ `/terms` (266 linhas)        | ✅ PRONTO                           |
| DPA                       | 🔴 0%   | ❌ Página não existe            | 🟡 CRIAR                            |
| CRM                       | ✅ 95%  | ✅ Kanban completo              | ✅ PRONTO (suporta CAPI)            |

**Conclusão:**

- ✅ **Pode solicitar 10 permissões Standard AGORA** (WhatsApp 3, ads_read, pages 2, business, email, public_profile, manage_app_solution)
- ⛔ **NÃO solicitar 16 permissões** até implementar features (ads_management, pages_manage_ads, catalog, Instagram 3, Threads 10)
- ⏳ **OAuth precisa funcionar** para screenshots end-to-end do WhatsApp

---

## 🎬 Próximos Passos (Ordem de Prioridade)

1. ⏳ **Aguardar OAuth funcionar** (bloqueado pela Meta)
2. 📸 **Tirar screenshots das 20+ telas prontas** (2-3 horas, pode fazer agora)
3. 🟡 **Criar página `/onboarding`** (referenciada no callback OAuth)
4. 🟡 **Criar página `/dpa`** (Data Processing Agreement)
5. 📹 **Gravar vídeos demonstrativos** (após OAuth funcionar)
6. ✅ **Submeter 10 permissões Standard** (quando screenshots + OAuth prontos)
7. 🟢 **Implementar wizard de campanha CTWA** (para futuro `ads_management`)
8. 🟢 **Implementar Instagram/Threads** (para futuras permissões)

---

## ⚠️ Correções vs. Versão Anterior

| Item                         | Antes (incorreto)                   | Agora (correto)                                                              |
| ---------------------------- | ----------------------------------- | ---------------------------------------------------------------------------- |
| Conversions API              | "🔴 0% NÃO IMPLEMENTADO"            | ✅ 90% — `sendConversionEvent.ts` (419 linhas)                               |
| Privacy/Terms                | "🔴 0%"                             | ✅ 100% — `/privacy` (273 linhas) + `/terms` (266 linhas)                    |
| WhatsApp Messaging           | "⚠️ CÓDIGO PRONTO MAS NÃO TESTÁVEL" | ✅ 90% — UI completa, pipeline 14 nodes, 38 processing nodes                 |
| whatsapp_business_management | "❌ Sem templates"                  | ✅ Templates page implementada (list/sync/submit/delete)                     |
| CRM                          | Não mencionado                      | ✅ 95% — Kanban board com 17 componentes, 523 linhas                         |
| Meta Ads Dashboard           | "40% parcial"                       | ✅ 95% — 1032 linhas, 7 tabs, 5 componentes dedicados                        |
| Onboarding page              | "existe /test-oauth"                | ⚠️ `/onboarding` NÃO EXISTE (callback redireciona mas página não foi criada) |
| DPA page                     | Não mencionado                      | ❌ Não existe (referenciada no META_APP_REVIEW.md)                           |
| Instagram/Threads            | "Arquitetura multi-canal suporta"   | ❌ Zero código — nenhuma linha em todo o `src/`                              |

---

**Última Atualização:** 13 de fevereiro de 2026
**Status OAuth:** ⏳ Aguardando Meta resolver erro genérico
**Auditoria:** Baseada em análise completa do código-fonte (grep + file reads)

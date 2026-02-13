# App Review Checklist - Material Necessário

**Status:** Preparando submissão
**Data:** 13 de fevereiro de 2026

---

## 📋 Materiais Necessários por Permissão

### 1️⃣ WhatsApp Business Platform

#### **whatsapp_business_messaging** (Standard - Não requer review)

**Screenshots Necessários:**
- [ ] ❌ Dashboard mostrando conversas WhatsApp
- [ ] ❌ Cliente enviando mensagem no WhatsApp
- [ ] ❌ Bot respondendo automaticamente
- [ ] ❌ Histórico de conversas no dashboard
- [ ] ⏳ Página de onboarding (existe `/test-oauth` mas não é final)

**Vídeo (2-3 min):**
- [ ] ❌ [0:00-0:30] Login no dashboard
- [ ] ⏳ [0:30-1:00] Clicar "Conectar WhatsApp" → OAuth Meta (temos código, mas OAuth ainda não funciona)
- [ ] ❌ [1:00-1:30] Autorizar WABA
- [ ] ❌ [1:30-2:00] Configurar chatbot (prompt, modelo)
- [ ] ❌ [2:00-2:30] Cliente final enviando mensagem
- [ ] ❌ [2:30-3:00] Bot respondendo
- [ ] ❌ [3:00-3:30] Visualizar conversa no dashboard

**Status:** ⚠️ **CÓDIGO PRONTO, MAS NÃO TESTÁVEL** (OAuth bloqueado)

**O que temos:**
- ✅ Código OAuth implementado (`/api/auth/meta/*`)
- ✅ Botão "Conectar WhatsApp" (`ConnectWhatsAppButton.tsx`)
- ✅ Webhook funcionando (`/api/webhook`)
- ✅ Pipeline de processamento (14 nodes)
- ✅ Dashboard de conversas (`/dashboard/conversations`)

**O que falta:**
- ❌ OAuth funcionando (bloqueado pela Meta)
- ❌ Página de onboarding final (só temos `/test-oauth` temporário)
- ❌ Screenshots finais
- ❌ Vídeo demonstrativo

---

#### **whatsapp_business_management** (Standard - Não requer review)

**Screenshots Necessários:**
- [ ] ❌ Dashboard mostrando WABAs conectados
- [ ] ❌ Lista de números de telefone
- [ ] ❌ Templates de mensagem (se tiver)
- [ ] ❌ Configurações de webhook

**Status:** ⚠️ **FUNCIONALIDADE PARCIAL**

**O que temos:**
- ✅ Listagem de clients (`/dashboard/admin/clients`)
- ✅ Configuração de cliente (OpenAI keys, etc.)
- ⏳ Webhook configurado (mas webhook único ainda não ativo em prod)

**O que falta:**
- ❌ Interface para gerenciar múltiplos phone numbers
- ❌ Interface para gerenciar templates
- ❌ Dashboard mostrando health status do WABA

---

#### **whatsapp_business_manage_events** (Standard - Não requer review)

**Screenshots Necessários:**
- [ ] ❌ Dashboard mostrando eventos enviados (Lead, Purchase)
- [ ] ❌ Integração com Conversions API
- [ ] ❌ Log de eventos

**Status:** ❌ **NÃO IMPLEMENTADO**

**O que temos:**
- ✅ Infraestrutura de tracking (`gateway_usage_logs`)
- ✅ Sistema de analytics (`/dashboard/analytics`)

**O que falta:**
- ❌ Integração com Conversions API (enviar eventos para Meta)
- ❌ Tracking de eventos de conversão (Lead, Purchase)
- ❌ Dashboard mostrando eventos enviados
- ❌ Código completo de Conversions API

---

### 2️⃣ Meta Ads / Marketing API

#### **ads_management** (Advanced - ⚠️ REQUER REVIEW)

**Screenshots Necessários:**
- [ ] ✅ Dashboard Meta Ads (TEMOS: `/dashboard/meta-ads`)
- [ ] ✅ Integração OpenAI tracking (TEMOS: código implementado)
- [ ] ⏳ Criação de campanha (temos interface parcial)
- [ ] ❌ Conversions API enviando eventos
- [ ] ❌ Relatórios de performance

**Status:** 🟡 **IMPLEMENTADO PARCIALMENTE**

**O que temos:**
- ✅ Dashboard Meta Ads completo (`/dashboard/meta-ads`)
- ✅ Billing sync (`/api/admin/meta-ads/billing/sync`)
- ✅ Usage tracking (`openai_usage_cache` table)
- ✅ Analytics de custos

**O que falta:**
- ❌ **CRÍTICO:** Conversions API implementada (enviar eventos Lead/Purchase)
- ❌ Interface para criar campanhas (temos parcial)
- ❌ Click-to-WhatsApp ads funcionando end-to-end

**Prioridade:** 🔴 **ALTA** - Única permissão Advanced que EXIGE review

---

#### **ads_read**, **catalog_management**, etc. (Standard - Não requer review)

**Screenshots Necessários:**
- [ ] ⏳ Dashboard lendo dados de campanhas (temos parcial)
- [ ] ❌ Catálogo de produtos (não implementado)
- [ ] ❌ Insights de anúncios

**Status:** 🟡 **IMPLEMENTADO PARCIALMENTE**

**O que temos:**
- ✅ Leitura de billing data
- ✅ Dashboard básico de analytics

**O que falta:**
- ❌ Product catalog management
- ❌ Insights detalhados de campanhas

---

### 3️⃣ Instagram Graph API

#### **instagram_manage_messages**, **instagram_manage_comments** (Standard)

**Screenshots Necessários:**
- [ ] ❌ Bot respondendo DMs do Instagram
- [ ] ❌ Bot respondendo comentários
- [ ] ❌ Dashboard mostrando conversas Instagram

**Status:** ❌ **NÃO IMPLEMENTADO**

**O que temos:**
- ✅ Arquitetura multi-canal (suporta adicionar)
- ✅ Sistema de conversas genérico

**O que falta:**
- ❌ Webhook Instagram configurado
- ❌ Parser de mensagens Instagram
- ❌ Resposta automática Instagram
- ❌ Dashboard Instagram

**Prioridade:** 🟡 **MÉDIA** - Standard (não bloqueia review), mas seria bom ter

---

### 4️⃣ Threads API (10 permissões - Todas Standard)

**Screenshots Necessários:**
- [ ] ❌ Bot no Threads respondendo menções
- [ ] ❌ Publicação automática
- [ ] ❌ Analytics de Threads

**Status:** ❌ **NÃO IMPLEMENTADO**

**Prioridade:** 🟢 **BAIXA** - Standard e não essencial agora

---

## 📸 Screenshots que PODEMOS Fazer Agora

### ✅ Prontos para Screenshot

1. **Dashboard Principal**
   - `/dashboard` - Tela inicial ✅
   - `/dashboard/conversations` - Lista de conversas ✅
   - `/dashboard/admin/clients` - Gerenciamento de clientes ✅

2. **Meta Ads Dashboard**
   - `/dashboard/meta-ads` - Dashboard completo ✅
   - `/dashboard/meta-ads/usage` - Usage tracking ✅
   - Analytics de custos ✅

3. **Analytics**
   - `/dashboard/analytics` - Métricas gerais ✅
   - Gráficos de uso ✅

4. **Configurações**
   - Settings de cliente ✅
   - AI configuration ✅

5. **Knowledge Base (RAG)**
   - `/dashboard/knowledge` - Upload de documentos ✅
   - Sistema de embeddings ✅

### ⏳ Parcialmente Prontos (precisam melhorias visuais)

1. **Onboarding OAuth**
   - `/test-oauth` - Existe mas é temporário
   - Precisa criar página final de onboarding

2. **Flow Architecture**
   - `/dashboard/flow-architecture` - Diagrama do pipeline ✅
   - Mas não é necessário para review

### ❌ Não Podemos Fazer Ainda (bloqueados)

1. **OAuth Flow Completo**
   - ❌ Bloqueado pelo erro da Meta
   - ❌ Não conseguimos mostrar seleção de WABA
   - ❌ Não conseguimos criar client via OAuth

2. **Conversas WhatsApp Reais**
   - ❌ Precisa OAuth funcionando primeiro
   - ❌ Precisa WABA conectado

3. **Conversions API**
   - ❌ Código não implementado
   - ❌ Eventos não estão sendo enviados

4. **Instagram/Threads**
   - ❌ Nada implementado

---

## 🎯 Prioridade de Desenvolvimento para App Review

### 🔴 **CRÍTICO (Bloqueia Review de ads_management)**

1. **Conversions API** ⭐⭐⭐
   - Implementar envio de eventos (Lead, Purchase, AddToCart)
   - Integrar com pipeline de mensagens
   - Dashboard mostrando eventos enviados
   - **Tempo estimado:** 8-12 horas

2. **OAuth Funcionando** ⭐⭐⭐
   - Resolver bloqueio da Meta
   - Testar end-to-end
   - **Tempo estimado:** Aguardando Meta

3. **Screenshots/Vídeo WhatsApp** ⭐⭐⭐
   - Gravar OAuth flow
   - Mostrar bot respondendo
   - Dashboard de conversas
   - **Tempo estimado:** 2-3 horas (após OAuth funcionar)

### 🟡 **IMPORTANTE (Melhora chances de aprovação)**

4. **Página de Onboarding Final**
   - Substituir `/test-oauth` por onboarding real
   - Multi-step wizard
   - **Tempo estimado:** 4-6 horas

5. **Dashboard WABA Management**
   - Mostrar phone numbers
   - Health status
   - **Tempo estimado:** 3-4 horas

6. **Privacy Policy & Terms**
   - Criar páginas públicas
   - `/privacy` e `/terms`
   - **Tempo estimado:** 2-3 horas

### 🟢 **OPCIONAL (Não bloqueia review)**

7. **Instagram Integration**
   - DMs e comentários
   - **Tempo estimado:** 12-16 horas

8. **Threads Integration**
   - Publicação e menções
   - **Tempo estimado:** 8-12 horas

---

## 📊 Status Geral

| Categoria | Status | Pronto para Review? |
|-----------|--------|---------------------|
| WhatsApp Messaging | 🟡 70% | ⏳ Aguardando OAuth |
| WhatsApp Management | 🟡 60% | ⏳ Aguardando OAuth |
| WhatsApp Events (Conversions API) | 🔴 0% | ❌ **BLOQUEIA ADS_MANAGEMENT** |
| Meta Ads Dashboard | ✅ 90% | ✅ Sim |
| Meta Ads Creation | 🟡 40% | ⏳ Parcial |
| Instagram | 🔴 0% | ✅ Não bloqueia (Standard) |
| Threads | 🔴 0% | ✅ Não bloqueia (Standard) |
| Privacy/Terms | 🔴 0% | ⚠️ Necessário para review |

**Conclusão:**
- ✅ **Pode submeter permissões Standard** (WhatsApp, Pages, etc.) - Não requerem review
- ❌ **NÃO pode submeter ads_management ainda** - Falta Conversions API
- ⏳ **OAuth precisa funcionar** para fazer screenshots

---

## 🎬 Próximos Passos (Ordem de Prioridade)

1. ⏳ **Aguardar OAuth funcionar** (bloqueado pela Meta)
2. 🔴 **Implementar Conversions API** (CRÍTICO para ads_management)
3. 🟡 **Criar Privacy Policy e Terms** (necessário)
4. 🟡 **Finalizar página de onboarding**
5. ⏳ **Fazer screenshots após OAuth funcionar**
6. ⏳ **Gravar vídeo demonstrativo** (após OAuth)
7. 🟢 **Submeter App Review** (quando tudo estiver pronto)

---

**Última Atualização:** 13 de fevereiro de 2026
**Status OAuth:** ⏳ Aguardando Meta resolver erro genérico

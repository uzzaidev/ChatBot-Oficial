# 📋 App Review Checklist Completo - Meta Platform

**Status:** Preparando submissão  
**Data:** 13 de fevereiro de 2026  
**App ID:** 1440028941249650  
**Última Atualização:** Baseado em diretrizes oficiais Meta + auditoria completa do código

---

## 📑 Índice

1. [Resumo Executivo](#-resumo-executivo)
2. [Diretrizes de Screencasts (Meta Oficial)](#-diretrizes-de-screencasts-meta-oficial)
3. [Checklist por Permissão com Roteiros](#-checklist-por-permissão-com-roteiros)
4. [Screenshots Disponíveis](#-screenshots-disponíveis)
5. [Prioridade de Desenvolvimento](#-prioridade-de-desenvolvimento)
6. [Status Geral](#-status-geral)

---

## 🎯 RESUMO EXECUTIVO

### ✅ SOLICITAR AGORA (10 permissões Standard)

| # | Permissão | Tipo | Screenshots? | Screencast? |
|---|-----------|------|--------------|-------------|
| 1 | `whatsapp_business_messaging` | Standard | ✅ UI pronta | ⏳ Aguarda OAuth |
| 2 | `whatsapp_business_management` | Standard | ✅ Templates + Settings | ✅ Pode gravar |
| 3 | `whatsapp_business_manage_events` | Standard | ✅ CAPI Events tab | ⏳ Aguarda campanha |
| 4 | `ads_read` | Standard | ✅ Meta Ads dashboard | ✅ Pode gravar |
| 5 | `pages_show_list` | Standard | ✅ OAuth flow | ⏳ Aguarda OAuth |
| 6 | `pages_read_engagement` | Standard | ✅ OAuth flow | ⏳ Aguarda OAuth |
| 7 | `business_management` | Standard | ✅ OAuth callback | ⏳ Aguarda OAuth |
| 8 | `email` | Standard | ✅ Login/Register | ✅ Pode gravar |
| 9 | `public_profile` | Standard | ✅ Login/Register | ✅ Pode gravar |
| 10 | `manage_app_solution` | Standard | ✅ OAuth flow | ⏳ Aguarda OAuth |

### ⛔ NÃO SOLICITAR AGORA (16 permissões)

| # | Permissão | Tipo | Motivo |
|---|-----------|------|--------|
| 11 | `ads_management` | **Advanced** ⚠️ | Sem wizard "Criar Campanha" |
| 12 | `pages_manage_ads` | Standard | Depende de ads_management |
| 13 | `catalog_management` | Standard | Zero código |
| 14-16 | Instagram (3) | Standard | Zero código |
| 17-26 | Threads (10) | Standard | Zero código |

---

## 🎬 DIRETRIZES DE SCREENCASTS (META OFICIAL)

### 📹 Requisitos Obrigatórios

#### 1. **Mostrar Fluxo de Login Completo**

**O que capturar:**
- [ ] **Sair de todas as contas de teste** antes de começar
- [ ] **Capturar TODO o fluxo:** desde logout até login completo
- [ ] Se usuários podem criar conta sem Login do Facebook → capturar esse fluxo também
- [ ] **Fornecer credenciais de teste** se necessário para revisores

**Exemplo de fluxo:**
```
[0:00-0:10] Usuário desconectado (logout completo)
[0:10-0:30] Acessar página de login (/login)
[0:30-0:50] Preencher email + senha
[0:50-1:00] Clicar "Entrar"
[1:00-1:10] Dashboard carregado (usuário logado)
```

**Screenshots necessários:**
1. Tela de logout/desconectado
2. Tela de login com campos vazios
3. Tela de login com campos preenchidos
4. Dashboard após login bem-sucedido

---

#### 2. **Mostrar Concessão de Permissão**

**O que capturar:**
- [ ] Botão de login/connect (ex: "Conectar WhatsApp Business")
- [ ] Redirecionamento para Meta OAuth
- [ ] Tela de autorização da Meta mostrando permissões
- [ ] Usuário concedendo permissões (clicar "Continuar")
- [ ] Callback retornando para o app
- [ ] App usando a permissão concedida

**Exemplo para WhatsApp:**
```
[0:00-0:15] Dashboard → Clicar "Conectar WhatsApp Business"
[0:15-0:30] Redirecionamento para Meta OAuth
[0:30-0:45] Tela Meta: "Continue as [Nome]?"
[0:45-1:00] Tela Meta: "What Pages do you want to use with UzzApp?"
[1:00-1:15] Selecionar Página → Clicar "Next"
[1:15-1:30] Tela Meta: Permissões solicitadas (whatsapp_business_messaging, etc.)
[1:30-1:45] Clicar "Continuar" → Autorizar
[1:45-2:00] Callback retornando para /onboarding
[2:00-2:15] Dashboard mostrando "WhatsApp conectado ✅"
```

**Screenshots necessários:**
1. Botão "Conectar WhatsApp" no dashboard
2. Tela OAuth da Meta (seleção de Página)
3. Tela OAuth da Meta (permissões)
4. Dashboard após conexão bem-sucedida

---

#### 3. **Mostrar Uso de Dados (Funcionalidade)**

**O que capturar:**
- [ ] Usuário acessando funcionalidade que requer a permissão
- [ ] App usando os dados obtidos com a permissão
- [ ] Resultado visível da funcionalidade

**Exemplo para WhatsApp Messaging:**
```
[0:00-0:15] Dashboard → Abrir conversa
[0:15-0:30] Cliente final enviando mensagem no WhatsApp (smartphone)
[0:30-0:45] Webhook recebendo mensagem (logs ou indicador visual)
[0:45-1:00] Bot processando mensagem (indicador de "digitando...")
[1:00-1:15] Bot respondendo automaticamente
[1:15-1:30] Resposta aparecendo no dashboard em tempo real
[1:30-1:45] Histórico de conversa completo no dashboard
```

**Screenshots necessários:**
1. Mensagem do cliente no WhatsApp (smartphone)
2. Dashboard mostrando mensagem recebida
3. Bot respondendo (indicador visual)
4. Resposta do bot no WhatsApp (smartphone)
5. Dashboard com conversa completa

---

### 🎨 Diretrizes Técnicas de Gravação

#### **Resolução e Qualidade**
- [ ] **Resolução mínima:** 1080p (1920x1080) ou superior
- [ ] **Largura máxima:** 1440px (ajustar resolução do monitor antes de gravar)
- [ ] **Formato:** MP4 (H.264)
- [ ] **Duração:** 30 segundos a 2 minutos por permissão
- [ ] **Áudio:** DESATIVADO (revisores não precisam de áudio)

#### **Software Recomendado**
- [ ] **Opção 1 (Pago):** Camtasia, Snagit (ferramentas de anotação, zoom, edição)
- [ ] **Opção 2 (Gratuito):** QuickTime (Mac), OBS Studio (Windows/Mac/Linux)
- [ ] **Editor:** iMovie (Mac), DaVinci Resolve (gratuito, todos OS)

#### **Configurações de Gravação**
- [ ] **Tela cheia:** Gravar app em tela cheia ou apenas a janela
- [ ] **Cursor:** Aumentar tamanho do cursor (configurações do sistema ou software)
- [ ] **Navegação:** Usar mouse (não teclado) sempre que possível
- [ ] **Scroll:** Rolar mais devagar que o normal (revisores precisam ler)
- [ ] **Pausas:** Permitir que revisores pausem e leiam textos

#### **Anotações (Annotations)**

**Quando usar:**
- [ ] Destacar quando app está usando permissão específica
- [ ] Explicar botões/elementos não óbvios
- [ ] Indicar onde dados estão sendo acessados

**Exemplo de anotação:**
```
[Anotação: "Using 'whatsapp_business_messaging' permission"]
→ Aparece quando bot envia resposta via WhatsApp API
```

**Ferramentas:**
- Camtasia: Callouts, arrows, text boxes
- iMovie: Titles, text overlays
- OBS: Text sources, browser sources

#### **Zoom e Destaques**

**Quando usar:**
- [ ] Seções difíceis de ver (texto pequeno, botões pequenos)
- [ ] Mostrar detalhes importantes (IDs, tokens, configurações)
- [ ] Destacar elementos específicos da UI

**Como fazer:**
- Software de gravação: Zoom tool durante gravação
- Editor de vídeo: Crop + scale após gravação

---

### 🌐 Diretrizes de Idioma e Acessibilidade

#### **Idioma da Interface**
- [ ] **Preferência:** Interface do app em **inglês** (se possível)
- [ ] Se app não estiver em inglês:
  - [ ] Adicionar legendas explicativas
  - [ ] Adicionar tooltips/text overlays
  - [ ] Explicar significado de botões não óbvios

#### **Legendas e Explicações**
- [ ] **Formato:** Arquivo .srt (subtitles) ou overlays no vídeo
- [ ] **Conteúdo:**
  - Explicar o que está acontecendo na tela
  - Traduzir textos em português
  - Explicar botões/elementos da UI

**Exemplo de legenda:**
```
[0:15-0:30] "User clicks 'Connect WhatsApp Business' button"
[0:30-0:45] "Meta OAuth screen appears, requesting page selection"
[0:45-1:00] "User selects 'My Business Page' and clicks 'Next'"
```

---

### 📝 Checklist de Qualidade do Screencast

Antes de submeter, verificar:

- [ ] **Resolução:** 1080p ou superior?
- [ ] **Duração:** Entre 30s e 2min?
- [ ] **Áudio:** Desativado?
- [ ] **Cursor:** Visível e grande o suficiente?
- [ ] **Navegação:** Usando mouse (não teclado)?
- [ ] **Scroll:** Devagar o suficiente para ler?
- [ ] **Anotações:** Destacando uso de permissão?
- [ ] **Zoom:** Elementos importantes visíveis?
- [ ] **Idioma:** Inglês ou com legendas?
- [ ] **Fluxo completo:** Login → Autorização → Uso?
- [ ] **Texto legível:** Revisores podem pausar e ler?

---

## 📋 CHECKLIST POR PERMISSÃO COM ROTEIROS

### 1️⃣ WhatsApp Business Platform

#### ✅ `whatsapp_business_messaging` (Standard)

**Screenshots Necessários:**
- [ ] Screenshot 1: Dashboard de conversas (`/dashboard/conversations`)
- [ ] Screenshot 2: Chat detail com mensagens (`/dashboard/chat?phone=...`)
- [ ] Screenshot 3: Botão "Conectar WhatsApp" (`/test-oauth` ou Settings)
- [ ] Screenshot 4: Bot respondendo no WhatsApp (smartphone)

**Screencast Roteiro (2-3 minutos):**

```
PARTE 1: FLUXO DE LOGIN (0:00-0:30)
[0:00-0:10] Logout completo (sair de todas as contas)
[0:10-0:20] Acessar /login
[0:20-0:30] Preencher email + senha → Clicar "Entrar"
[0:30-0:40] Dashboard carregado (usuário logado)

PARTE 2: CONECTAR WHATSAPP (0:40-1:30)
[0:40-0:50] Dashboard → Clicar "Conectar WhatsApp Business"
[0:50-1:00] Redirecionamento para Meta OAuth
[1:00-1:10] Tela Meta: "Continue as [Nome]?"
[1:10-1:20] Tela Meta: Seleção de Página → Selecionar Página
[1:20-1:30] Tela Meta: Permissões (whatsapp_business_messaging destacado)
[1:30-1:40] Clicar "Continuar" → Autorizar
[1:40-1:50] Callback retornando → Dashboard mostra "WhatsApp conectado ✅"

PARTE 3: CONFIGURAR CHATBOT (1:50-2:10)
[1:50-2:00] Dashboard → Settings → Bot Configuration
[2:00-2:10] Configurar system prompt, modelo IA (GPT-4o Mini)

PARTE 4: USO DA PERMISSÃO (2:10-3:00)
[2:10-2:20] Abrir WhatsApp no smartphone
[2:20-2:30] Enviar mensagem: "Olá, preciso de ajuda"
[2:30-2:40] [ANOTAÇÃO: "Webhook recebendo mensagem via whatsapp_business_messaging"]
[2:40-2:50] Dashboard → Conversas → Nova mensagem aparece
[2:50-3:00] Bot processando (indicador "digitando...")
[3:00-3:10] Bot responde automaticamente no WhatsApp
[3:10-3:20] Resposta aparece no dashboard em tempo real
[3:20-3:30] Histórico completo da conversa no dashboard
```

**Anotações Necessárias:**
- [ ] Anotação quando webhook recebe mensagem: "Using 'whatsapp_business_messaging' permission"
- [ ] Anotação quando bot envia resposta: "Sending message via WhatsApp Business API"
- [ ] Anotação no dashboard: "Real-time conversation sync"

**Arquivo:** `docs/videos/whatsapp-business-messaging.mp4`

---

#### ✅ `whatsapp_business_management` (Standard)

**Screenshots Necessários:**
- [ ] Screenshot 1: Página de Templates (`/dashboard/templates`)
- [ ] Screenshot 2: Lista de templates sincronizados
- [ ] Screenshot 3: Criar novo template (formulário)
- [ ] Screenshot 4: Submeter template para aprovação Meta
- [ ] Screenshot 5: Settings com configurações de WABA

**Screencast Roteiro (1-2 minutos):**

```
PARTE 1: GERENCIAR TEMPLATES (0:00-1:00)
[0:00-0:10] Dashboard → Templates
[0:10-0:20] [ANOTAÇÃO: "Using 'whatsapp_business_management' to list templates"]
[0:20-0:30] Clicar "Sync Templates" → Templates sincronizados da Meta
[0:30-0:40] Clicar "Create Template"
[0:40-0:50] Preencher formulário: Nome, categoria, conteúdo
[0:50-1:00] Clicar "Submit for Approval" → Template enviado para Meta

PARTE 2: CONFIGURAR WABA (1:00-1:30)
[1:00-1:10] Dashboard → Settings → Meta Configuration
[1:10-1:20] Visualizar WABA ID, Phone Number ID
[1:20-1:30] [ANOTAÇÃO: "WABA details retrieved via whatsapp_business_management"]
```

**Anotações Necessárias:**
- [ ] Anotação ao sincronizar templates: "Fetching templates via WhatsApp Business Management API"
- [ ] Anotação ao submeter template: "Submitting template for Meta approval"
- [ ] Anotação nas configurações: "WABA details from Business Management API"

**Arquivo:** `docs/videos/whatsapp-business-management.mp4`

---

#### ✅ `whatsapp_business_manage_events` (Standard)

**Screenshots Necessários:**
- [ ] Screenshot 1: Tab "CAPI Events" no Meta Ads dashboard
- [ ] Screenshot 2: Configuração de Dataset ID (tab "Config")
- [ ] Screenshot 3: CRM Kanban board
- [ ] Screenshot 4: Mover card para coluna "Fechado"
- [ ] Screenshot 5: Evento "Purchase" aparecendo no log

**Screencast Roteiro (2 minutos):**

```
PARTE 1: CONFIGURAR CONVERSIONS API (0:00-0:30)
[0:00-0:10] Dashboard → Meta Ads → Tab "Config"
[0:10-0:20] Preencher "Meta Dataset ID" → Salvar
[0:20-0:30] [ANOTAÇÃO: "Dataset ID configured for Conversions API"]

PARTE 2: CAPTURAR LEAD DE ANÚNCIO (0:30-1:00)
[0:30-0:40] Abrir smartphone → Clicar em anúncio CTWA no Facebook
[0:40-0:50] WhatsApp abre automaticamente
[0:50-1:00] Enviar mensagem: "Olá, vi seu anúncio"
[1:00-1:10] [ANOTAÇÃO: "ctwa_clid captured from webhook referral object"]

PARTE 3: LEAD NO CRM (1:00-1:20)
[1:00-1:10] Dashboard → CRM → Novo card criado automaticamente
[1:10-1:20] Card mostra source="Meta Ad" e ctwa_clid

PARTE 4: ENVIAR EVENTO DE CONVERSÃO (1:20-2:00)
[1:20-1:30] CRM → Arrastar card para coluna "Fechado"
[1:30-1:40] [ANOTAÇÃO: "Using 'whatsapp_business_manage_events' to send Purchase event"]
[1:40-1:50] Meta Ads → Tab "CAPI Events" → Evento "Purchase" aparece
[1:50-2:00] Mostrar detalhes do evento: event_id, ctwa_clid, custom_data
```

**Anotações Necessárias:**
- [ ] Anotação ao mover card: "Triggering Conversions API event via whatsapp_business_manage_events"
- [ ] Anotação no log: "Event sent to Meta Conversions API with ctwa_clid for attribution"
- [ ] Anotação no evento: "Purchase event with value and currency for ROI tracking"

**Arquivo:** `docs/videos/whatsapp-business-manage-events.mp4`

---

### 2️⃣ Meta Ads / Marketing API

#### ✅ `ads_read` (Standard)

**Screenshots Necessários:**
- [ ] Screenshot 1: Meta Ads dashboard - Tab "Overview" com métricas
- [ ] Screenshot 2: Tab "Campaigns" com lista de campanhas
- [ ] Screenshot 3: Gráficos de tendência (spend, impressions, clicks)
- [ ] Screenshot 4: Breakdown table (por dia, idade, gênero)
- [ ] Screenshot 5: Tab "Config" com Ad Account ID

**Screencast Roteiro (1-2 minutos):**

```
PARTE 1: CONECTAR AD ACCOUNT (0:00-0:30)
[0:00-0:10] Dashboard → Meta Ads → Tab "Config"
[0:10-0:20] Clicar "Connect Ad Account" → OAuth Meta
[0:20-0:30] Autorizar acesso ao Ad Account

PARTE 2: LER CAMPANHAS (0:30-1:00)
[0:30-0:40] Meta Ads → Tab "Campaigns"
[0:40-0:50] [ANOTAÇÃO: "Using 'ads_read' permission to fetch campaigns"]
[0:50-1:00] Lista de campanhas carregada (nome, status, spend)

PARTE 3: INSIGHTS E MÉTRICAS (1:00-1:30)
[1:00-1:10] Tab "Overview" → Métricas agregadas (spend, impressions, clicks, CTR)
[1:10-1:20] Tab "Campaigns" → Clicar em campanha → Detalhes
[1:20-1:30] Gráficos de tendência (últimos 30 dias)
[1:30-1:40] Breakdown table (por público, placement)
```

**Anotações Necessárias:**
- [ ] Anotação ao carregar campanhas: "Fetching campaigns via Marketing API (ads_read)"
- [ ] Anotação nos insights: "Campaign insights retrieved with ads_read permission"
- [ ] Anotação nos gráficos: "Performance data from Meta Ads Insights API"

**Arquivo:** `docs/videos/ads-read.mp4`

---

#### ⛔ `ads_management` (Advanced) — NÃO SOLICITAR AGORA

**Motivo:** Requer wizard "Criar Campanha CTWA" que não está implementado.

**O que seria necessário:**
- [ ] Wizard completo de criação de campanha
- [ ] Formulário: objetivo, orçamento, público, creative
- [ ] Publicar campanha via Marketing API
- [ ] Pausar/retomar campanha
- [ ] Screencast end-to-end de criação

**Quando implementar:** Após criar wizard (~8-12 horas de dev)

---

### 3️⃣ Permissões Compartilhadas

#### ✅ `business_management` (Standard)

**Screenshots Necessários:**
- [ ] Screenshot 1: OAuth callback processando
- [ ] Screenshot 2: Lista de WABAs do Business Manager
- [ ] Screenshot 3: Seleção de WABA para conectar

**Screencast Roteiro (1 minuto):**

```
[0:00-0:15] Dashboard → Clicar "Conectar WhatsApp"
[0:15-0:30] OAuth Meta → Tela de autorização
[0:30-0:45] [ANOTAÇÃO: "Using 'business_management' to access Business Manager"]
[0:45-1:00] Callback processando → Listando WABAs disponíveis
[1:00-1:10] Selecionar WABA → Conectar
```

**Arquivo:** `docs/videos/business-management.mp4`

---

#### ✅ `email` (Standard)

**Screenshots Necessários:**
- [ ] Screenshot 1: Página de login (`/login`)
- [ ] Screenshot 2: Página de registro (`/register`)
- [ ] Screenshot 3: Campo de email preenchido

**Screencast Roteiro (30 segundos):**

```
[0:00-0:10] Acessar /login
[0:10-0:20] Preencher email + senha
[0:20-0:30] [ANOTAÇÃO: "Using 'email' permission for user authentication"]
[0:30-0:40] Clicar "Entrar" → Dashboard carregado
```

**Arquivo:** `docs/videos/email.mp4`

---

#### ✅ `public_profile` (Standard)

**Screenshots Necessários:**
- [ ] Screenshot 1: Header do dashboard com nome do usuário
- [ ] Screenshot 2: Avatar/foto de perfil no header

**Screencast Roteiro (30 segundos):**

```
[0:00-0:10] Dashboard → Header mostra nome do usuário
[0:10-0:20] [ANOTAÇÃO: "Using 'public_profile' to display user name"]
[0:20-0:30] Avatar do usuário no header
```

**Arquivo:** `docs/videos/public-profile.mp4`

---

## 📸 SCREENSHOTS DISPONÍVEIS

### ✅ Prontos para Screenshot (20+ telas)

#### **Landing & Auth**
- [ ] `/` — Landing page
- [ ] `/login` — Login page (319 linhas)
- [ ] `/register` — Register page (298 linhas)

#### **Dashboard Principal**
- [ ] `/dashboard` — Dashboard inicial
- [ ] `/dashboard/conversations` — Lista de conversas
- [ ] `/dashboard/chat?phone=...` — Chat detail
- [ ] `/dashboard/contacts` — Gerenciamento de contatos

#### **CRM**
- [ ] `/dashboard/crm` — Kanban board completo

#### **Meta Ads**
- [ ] `/dashboard/meta-ads` — 7 tabs completas

#### **Knowledge Base**
- [ ] `/dashboard/knowledge` — Upload de documentos

#### **Agents**
- [ ] `/dashboard/agents` — Multi-agent setup

#### **Templates**
- [ ] `/dashboard/templates` — Lista e gerenciamento

#### **Settings**
- [ ] `/dashboard/settings` — Configurações completas

#### **Outros**
- [ ] `/dashboard/analytics` — Analytics unificado
- [ ] `/privacy` — Privacy Policy
- [ ] `/terms` — Terms of Service

---

## 🎯 PRIORIDADE DE DESENVOLVIMENTO

### 🔴 CRÍTICO (bloqueia submissão)

1. **Resolver OAuth com Meta** ⭐⭐⭐
   - Sem isso, não há screencast end-to-end
   - Status: Aguardando Meta resolver erro

2. **Criar pasta `docs/screenshots/` e tirar prints** ⭐⭐⭐
   - 20+ telas prontas
   - Tempo: 2-3 horas
   - Ação: Navegar cada tela, tirar print, nomear

3. **Gravar screencasts básicos (sem OAuth)** ⭐⭐⭐
   - Login/Register (email, public_profile)
   - Templates (whatsapp_business_management)
   - Meta Ads dashboard (ads_read)
   - Tempo: 4-6 horas

### 🟡 IMPORTANTE (melhora aprovação)

4. **Criar página `/onboarding`** ⭐⭐
   - OAuth callback redireciona para ela
   - Tempo: 4-6 horas

5. **Criar página `/dpa`** ⭐
   - Data Processing Agreement
   - Tempo: 2-3 horas

6. **Gravar screencasts completos (após OAuth)** ⭐⭐
   - WhatsApp completo
   - Conversions API
   - Tempo: 3-4 horas

### 🟢 FUTURO

7. **Wizard "Criar Campanha CTWA"** (para ads_management)
8. **Integração Instagram** (para instagram_*)
9. **Integração Threads** (para threads_*)

---

## 📊 STATUS GERAL

| Categoria | Status | Screenshots | Screencast | Pronto? |
|-----------|--------|-------------|------------|---------|
| WhatsApp Messaging | ✅ 90% | ✅ UI pronta | ⏳ Aguarda OAuth | ⏳ |
| WhatsApp Management | ✅ 80% | ✅ Templates | ✅ Pode gravar | ✅ |
| WhatsApp Events (CAPI) | ✅ 90% | ✅ CAPI Events | ⏳ Aguarda campanha | ⏳ |
| Meta Ads (read) | ✅ 95% | ✅ Dashboard | ✅ Pode gravar | ✅ |
| Meta Ads (write) | 🔴 10% | ❌ Sem wizard | ❌ | ❌ |
| Pages (show/read) | ✅ 80% | ✅ OAuth | ⏳ Aguarda OAuth | ⏳ |
| Business Management | ✅ 80% | ✅ OAuth | ⏳ Aguarda OAuth | ⏳ |
| Email / Public Profile | ✅ 100% | ✅ Login | ✅ Pode gravar | ✅ |
| Privacy / Terms | ✅ 100% | ✅ Páginas | ✅ Pode gravar | ✅ |

---

## 📝 CHECKLIST FINAL ANTES DE SUBMETER

### Configurações Básicas
- [ ] Plataformas adicionadas (Website ✅)
- [ ] Privacy Policy URL publicada (`/privacy`)
- [ ] Terms of Service URL publicada (`/terms`)
- [ ] App Domain configurado
- [ ] App Icon upload

### Screenshots (8 obrigatórios)
- [ ] Screenshot 1: Embedded Signup (WhatsApp)
- [ ] Screenshot 2: Dashboard de Conversas
- [ ] Screenshot 3: Bot Respondendo no WhatsApp
- [ ] Screenshot 4: Templates de Mensagem
- [ ] Screenshot 5: CAPI Events Dashboard
- [ ] Screenshot 6: Meta Ads Dashboard
- [ ] Screenshot 7: Login/Register
- [ ] Screenshot 8: Settings/Vault

### Screencasts (4 obrigatórios)
- [ ] Vídeo 1: WhatsApp Complete Flow (3min)
- [ ] Vídeo 2: WhatsApp Management (1-2min)
- [ ] Vídeo 3: Conversions API (2min)
- [ ] Vídeo 4: Meta Ads Read (1-2min)

### Qualidade dos Screencasts
- [ ] Resolução: 1080p ou superior
- [ ] Duração: 30s-2min cada
- [ ] Áudio: Desativado
- [ ] Anotações: Destacando uso de permissão
- [ ] Idioma: Inglês ou com legendas
- [ ] Fluxo completo: Login → Autorização → Uso

### Questionários de Permissões
- [ ] WhatsApp (3 permissões) — Preenchidos
- [ ] Meta Ads (ads_read) — Preenchido
- [ ] Pages (2 permissões) — Preenchidos
- [ ] Compartilhadas (4 permissões) — Preenchidos

### Questões de Privacidade
- [ ] Operadores de dados listados
- [ ] Controlador de dados definido
- [ ] Solicitações de autoridades públicas

---

## 🎬 ROTEIRO DE GRAVAÇÃO (PASSO A PASSO)

### Preparação (30 minutos)

1. **Configurar Ambiente:**
   - [ ] Ajustar resolução do monitor para 1440px de largura
   - [ ] Aumentar tamanho do cursor (Configurações do Sistema)
   - [ ] Fechar apps desnecessários
   - [ ] Limpar cache do navegador
   - [ ] Preparar contas de teste

2. **Configurar Software:**
   - [ ] Abrir software de gravação (OBS/QuickTime/Camtasia)
   - [ ] Configurar área de gravação (tela cheia ou janela)
   - [ ] Desativar áudio
   - [ ] Testar gravação (5 segundos de teste)

3. **Preparar App:**
   - [ ] Fazer logout de todas as contas
   - [ ] Limpar localStorage/sessionStorage
   - [ ] Abrir app em modo anônimo/privado (se necessário)

---

### Gravação de Cada Screencast

#### **Template de Roteiro:**

```
1. PREPARAÇÃO (10s)
   - Pausar gravação
   - Abrir app em estado inicial
   - Iniciar gravação

2. FLUXO DE LOGIN (30s)
   - Mostrar tela de logout/desconectado
   - Acessar /login
   - Preencher credenciais (devagar)
   - Clicar "Entrar"
   - Aguardar dashboard carregar

3. CONCESSÃO DE PERMISSÃO (30s-1min)
   - Navegar até botão de conexão
   - Clicar botão
   - Mostrar tela OAuth da Meta
   - Destacar permissões solicitadas (anotação)
   - Clicar "Continuar"
   - Aguardar callback

4. USO DA PERMISSÃO (1-2min)
   - Navegar até funcionalidade
   - Destacar uso da permissão (anotação)
   - Mostrar resultado
   - Verificar dados sendo usados

5. FINALIZAÇÃO (10s)
   - Mostrar resultado final
   - Pausar gravação
```

---

### Pós-Produção (30 minutos por vídeo)

1. **Edição Básica:**
   - [ ] Cortar início/fim desnecessários
   - [ ] Adicionar anotações destacando permissões
   - [ ] Aplicar zoom em seções importantes
   - [ ] Adicionar legendas (se necessário)

2. **Exportação:**
   - [ ] Formato: MP4 (H.264)
   - [ ] Resolução: 1080p mínimo
   - [ ] Nomear arquivo: `[permission-name].mp4`
   - [ ] Salvar em `docs/videos/`

3. **Validação:**
   - [ ] Assistir vídeo completo
   - [ ] Verificar se fluxo está claro
   - [ ] Verificar se anotações estão visíveis
   - [ ] Verificar se texto está legível (pausar e ler)

---

## 📁 ESTRUTURA DE ARQUIVOS

```
docs/
├── screenshots/
│   ├── 01-embedded-signup-whatsapp.png
│   ├── 02-dashboard-conversations.png
│   ├── 03-whatsapp-bot-response.png
│   ├── 04-templates-management.png
│   ├── 05-conversions-api-dashboard.png
│   ├── 06-meta-ads-overview.png
│   ├── 07-login-page.png
│   └── 08-settings-vault.png
├── videos/
│   ├── whatsapp-business-messaging.mp4
│   ├── whatsapp-business-management.mp4
│   ├── whatsapp-business-manage-events.mp4
│   ├── ads-read.mp4
│   ├── business-management.mp4
│   ├── email.mp4
│   └── public-profile.mp4
└── APP_REVIEW_CHECKLIST_COMPLETE.md (este arquivo)
```

---

## 🚀 PRÓXIMOS PASSOS IMEDIATOS

### Esta Semana

1. **HOJE:**
   - [ ] Criar pasta `docs/screenshots/`
   - [ ] Criar pasta `docs/videos/`
   - [ ] Tirar screenshots das 8 telas principais
   - [ ] Gravar screencast de Login/Register (email, public_profile)

2. **AMANHÃ:**
   - [ ] Gravar screencast de Templates (whatsapp_business_management)
   - [ ] Gravar screencast de Meta Ads Dashboard (ads_read)
   - [ ] Editar e exportar vídeos

3. **DEPOIS:**
   - [ ] Aguardar OAuth funcionar
   - [ ] Gravar screencasts completos (WhatsApp, CAPI)
   - [ ] Revisar todos os materiais
   - [ ] Submeter App Review

---

**Última Atualização:** 13 de fevereiro de 2026  
**Versão:** 2.0 (com diretrizes completas de screencasts)


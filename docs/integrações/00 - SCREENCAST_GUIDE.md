# 🎬 Guia Completo de Screencasts para Meta App Review

**Baseado em:** Diretrizes oficiais Meta Platform  
**Data:** 13 de fevereiro de 2026  
**Versão:** 1.0

---

## 📋 Índice

1. [Requisitos Obrigatórios](#-requisitos-obrigatórios)
2. [Diretrizes Técnicas](#-diretrizes-técnicas)
3. [Roteiros por Permissão](#-roteiros-por-permissão)
4. [Checklist de Qualidade](#-checklist-de-qualidade)
5. [Exemplos Visuais](#-exemplos-visuais)

---

## ✅ REQUISITOS OBRIGATÓRIOS

### 1. Mostrar Fluxo de Login Completo

**Meta exige:**
> "Nossos revisores precisam ver como um usuário entra no app. Capture todo o fluxo, desde a saída até a entrada."

**Checklist:**
- [ ] **Sair de todas as contas de teste** antes de começar
- [ ] Mostrar tela de logout/desconectado
- [ ] Mostrar página de login
- [ ] Preencher credenciais (devagar, visível)
- [ ] Clicar "Entrar"
- [ ] Mostrar dashboard após login

**Duração:** 30-40 segundos

**Exemplo de sequência:**
```
[0:00-0:10] Logout completo (sair de todas as contas)
[0:10-0:20] Acessar /login (URL visível)
[0:20-0:30] Preencher email (digitando devagar)
[0:30-0:40] Preencher senha (cursor visível)
[0:40-0:50] Clicar "Entrar" (mouse, não teclado)
[0:50-1:00] Dashboard carregando → Carregado
```

---

### 2. Mostrar Concessão de Permissão

**Meta exige:**
> "Para cada gravação, mostre como o usuário utilizará um botão de login de empresa e como ele concederá ao app a permissão que você está demonstrando."

**Checklist:**
- [ ] Mostrar botão de conexão no app
- [ ] Clicar no botão
- [ ] Mostrar redirecionamento para Meta OAuth
- [ ] Mostrar tela de seleção de Página (se aplicável)
- [ ] Mostrar tela de permissões solicitadas
- [ ] Destacar permissão específica (anotação)
- [ ] Clicar "Continuar" / "Autorizar"
- [ ] Mostrar callback retornando para o app
- [ ] Mostrar confirmação de conexão

**Duração:** 1-2 minutos

**Exemplo para WhatsApp:**
```
[0:00-0:15] Dashboard → Botão "Conectar WhatsApp Business" (destacar com anotação)
[0:15-0:30] Redirecionamento para Meta OAuth (URL visível)
[0:30-0:45] Tela Meta: "Continue as [Nome]?" (mostrar nome do usuário)
[0:45-1:00] Tela Meta: "What Pages do you want to use with UzzApp?"
[1:00-1:15] Selecionar Página (usar mouse, destacar seleção)
[1:15-1:30] Tela Meta: Lista de permissões
[1:30-1:45] [ANOTAÇÃO: "whatsapp_business_messaging permission highlighted"]
[1:45-2:00] Clicar "Continuar" → Autorizar
[2:00-2:15] Callback retornando para /onboarding
[2:15-2:30] Dashboard mostra "WhatsApp conectado ✅"
```

---

### 3. Mostrar Uso de Dados (Funcionalidade)

**Meta exige:**
> "Mostre uma pessoa usando o app para acessar dados que exijam a permissão ou o recurso em questão, bem como o que o app faz com essas informações."

**Checklist:**
- [ ] Navegar até funcionalidade que usa a permissão
- [ ] Destacar quando permissão está sendo usada (anotação)
- [ ] Mostrar dados sendo acessados/usados
- [ ] Mostrar resultado da funcionalidade
- [ ] Verificar que dados estão corretos

**Duração:** 1-2 minutos

**Exemplo para WhatsApp Messaging:**
```
[0:00-0:15] Dashboard → Abrir conversa
[0:15-0:30] [CORTE PARA SMARTPHONE] Abrir WhatsApp
[0:30-0:45] Enviar mensagem: "Olá, preciso de ajuda"
[0:45-1:00] [VOLTAR PARA DASHBOARD] Mensagem aparece em tempo real
[1:00-1:15] [ANOTAÇÃO: "Using 'whatsapp_business_messaging' to receive message"]
[1:15-1:30] Bot processando (indicador "digitando...")
[1:30-1:45] Bot responde automaticamente
[1:45-2:00] [ANOTAÇÃO: "Sending response via WhatsApp Business API"]
[2:00-2:15] Resposta aparece no dashboard
[2:15-2:30] [CORTE PARA SMARTPHONE] Resposta aparece no WhatsApp
```

---

## 🎨 DIRETRIZES TÉCNICAS

### Resolução e Qualidade

| Requisito | Especificação |
|-----------|---------------|
| **Resolução mínima** | 1080p (1920x1080) |
| **Largura máxima** | 1440px (ajustar monitor antes) |
| **Formato** | MP4 (H.264) |
| **Duração** | 30 segundos a 2 minutos |
| **Áudio** | DESATIVADO |

### Software Recomendado

#### **Opção 1: Software Pago (Recomendado)**
- **Camtasia** (Windows/Mac)
  - ✅ Anotações (callouts, arrows)
  - ✅ Zoom tool
  - ✅ Edição básica
  - ✅ Versão trial gratuita (30 dias)

- **Snagit** (Windows/Mac)
  - ✅ Anotações
  - ✅ Zoom
  - ✅ Versão trial gratuita

#### **Opção 2: Software Gratuito**
- **OBS Studio** (Windows/Mac/Linux)
  - ✅ Gravação de tela
  - ❌ Sem anotações (adicionar depois)
  - ❌ Sem zoom (adicionar depois)

- **QuickTime** (Mac)
  - ✅ Gravação de tela nativa
  - ❌ Sem anotações
  - ❌ Sem zoom

#### **Opção 3: Editor de Vídeo (Pós-Produção)**
- **iMovie** (Mac) - Gratuito
- **DaVinci Resolve** (Todos OS) - Gratuito
- **Windows Video Editor** (Windows) - Gratuito

---

### Configurações de Gravação

#### **Antes de Gravar:**

1. **Monitor:**
   - [ ] Ajustar resolução para largura máxima 1440px
   - [ ] Usar tela cheia ou gravar apenas janela do app

2. **Cursor:**
   - [ ] Aumentar tamanho do cursor (Configurações do Sistema)
   - [ ] Ou usar software de gravação para destacar cursor

3. **Navegação:**
   - [ ] Usar mouse (não teclado) sempre que possível
   - [ ] Rolar devagar (revisores precisam ler)
   - [ ] Pausar em textos importantes

4. **App:**
   - [ ] Fazer logout completo
   - [ ] Limpar cache
   - [ ] Fechar apps desnecessários

---

### Anotações (Annotations)

**Quando usar:**
- Destacar quando app está usando permissão específica
- Explicar botões/elementos não óbvios
- Indicar onde dados estão sendo acessados
- Traduzir textos em português

**Exemplos de anotações:**

1. **Callout (Balão de texto):**
   ```
   "Using 'whatsapp_business_messaging' permission"
   → Aparece quando webhook recebe mensagem
   ```

2. **Arrow (Seta):**
   ```
   → Aponta para botão "Conectar WhatsApp"
   → Aponta para campo "Dataset ID"
   ```

3. **Highlight (Destaque):**
   ```
   [Caixa colorida] ao redor de permissão na tela OAuth
   [Caixa colorida] ao redor de evento no log
   ```

**Como adicionar:**
- **Camtasia:** Tools → Callouts, Arrows, Highlights
- **iMovie:** Titles → Text overlays
- **OBS:** Sources → Text, Image

---

### Zoom e Destaques

**Quando usar:**
- Texto pequeno difícil de ler
- Botões pequenos
- IDs, tokens, configurações importantes
- Elementos específicos da UI

**Como fazer:**

1. **Durante gravação (Camtasia):**
   - Usar Zoom tool
   - Aplicar zoom em seções específicas

2. **Pós-produção (Editor):**
   - Crop + Scale
   - Aplicar zoom em timeline

**Exemplo:**
```
[0:30-0:45] Zoom no campo "Dataset ID" (aumentar 150%)
[0:45-1:00] Zoom no botão "Submit" (aumentar 200%)
```

---

### Idioma e Legendas

#### **Idioma da Interface**

**Preferência:** Inglês

**Se app não estiver em inglês:**
- [ ] Adicionar legendas em inglês
- [ ] Adicionar tooltips/text overlays
- [ ] Explicar significado de botões

#### **Formato de Legendas**

**Opção 1: Arquivo .srt (Subtitles)**
```
1
00:00:15,000 --> 00:00:30,000
User clicks "Conectar WhatsApp Business" button

2
00:00:30,000 --> 00:00:45,000
Meta OAuth screen appears, requesting page selection
```

**Opção 2: Overlays no Vídeo**
- Adicionar texto diretamente no vídeo
- Usar editor de vídeo (iMovie, DaVinci Resolve)

---

## 📋 ROTEIROS POR PERMISSÃO

### `whatsapp_business_messaging`

**Duração:** 2-3 minutos  
**Arquivo:** `whatsapp-business-messaging.mp4`

```
[0:00-0:30] FLUXO DE LOGIN
- Logout completo
- Acessar /login
- Preencher email + senha
- Clicar "Entrar"
- Dashboard carregado

[0:30-1:30] CONECTAR WHATSAPP
- Dashboard → Clicar "Conectar WhatsApp Business"
- [ANOTAÇÃO: "Button to initiate OAuth flow"]
- Redirecionamento para Meta OAuth
- Tela Meta: "Continue as [Nome]?"
- Tela Meta: Seleção de Página
- Selecionar Página → Clicar "Next"
- Tela Meta: Permissões
- [ANOTAÇÃO: "whatsapp_business_messaging permission highlighted"]
- Clicar "Continuar" → Autorizar
- Callback retornando
- Dashboard: "WhatsApp conectado ✅"

[1:30-2:00] CONFIGURAR CHATBOT
- Dashboard → Settings → Bot Configuration
- Configurar system prompt
- Selecionar modelo (GPT-4o Mini)
- Salvar configurações

[2:00-3:00] USO DA PERMISSÃO
- [CORTE PARA SMARTPHONE] Abrir WhatsApp
- Enviar mensagem: "Olá, preciso de ajuda"
- [VOLTAR PARA DASHBOARD] Mensagem aparece
- [ANOTAÇÃO: "Message received via whatsapp_business_messaging webhook"]
- Bot processando (indicador "digitando...")
- Bot responde automaticamente
- [ANOTAÇÃO: "Response sent via WhatsApp Business API"]
- [CORTE PARA SMARTPHONE] Resposta aparece no WhatsApp
- [VOLTAR PARA DASHBOARD] Conversa completa no histórico
```

**Anotações necessárias:**
- [ ] Anotação no botão "Conectar WhatsApp"
- [ ] Anotação destacando permissão na tela OAuth
- [ ] Anotação quando webhook recebe mensagem
- [ ] Anotação quando bot envia resposta

---

### `whatsapp_business_management`

**Duração:** 1-2 minutos  
**Arquivo:** `whatsapp-business-management.mp4`

```
[0:00-0:30] NAVEGAR PARA TEMPLATES
- Dashboard → Templates
- [ANOTAÇÃO: "Templates page uses whatsapp_business_management"]

[0:30-1:00] SINCRONIZAR TEMPLATES
- Clicar "Sync Templates"
- [ANOTAÇÃO: "Fetching templates via WhatsApp Business Management API"]
- Templates carregados da Meta
- Mostrar lista de templates

[1:00-1:30] CRIAR TEMPLATE
- Clicar "Create Template"
- Preencher formulário:
  - Nome: "welcome_message"
  - Categoria: "UTILITY"
  - Conteúdo: "Olá! Como posso ajudar?"
- Clicar "Submit for Approval"
- [ANOTAÇÃO: "Submitting template via Management API"]
- Template enviado → Status "PENDING"
```

**Anotações necessárias:**
- [ ] Anotação ao sincronizar templates
- [ ] Anotação ao submeter template

---

### `whatsapp_business_manage_events` (Conversions API)

**Duração:** 2 minutos  
**Arquivo:** `whatsapp-business-manage-events.mp4`

```
[0:00-0:30] CONFIGURAR DATASET ID
- Dashboard → Meta Ads → Tab "Config"
- Preencher "Meta Dataset ID"
- [ANOTAÇÃO: "Dataset ID for Conversions API"]
- Salvar configurações

[0:30-1:00] CAPTURAR LEAD DE ANÚNCIO
- [CORTE PARA SMARTPHONE] Abrir Facebook
- Clicar em anúncio CTWA
- WhatsApp abre automaticamente
- Enviar mensagem: "Olá, vi seu anúncio"
- [ANOTAÇÃO: "ctwa_clid captured from webhook referral"]

[1:00-1:20] LEAD NO CRM
- [VOLTAR PARA DASHBOARD] CRM → Novo card criado
- Card mostra source="Meta Ad"
- Mostrar ctwa_clid no card

[1:20-2:00] ENVIAR EVENTO DE CONVERSÃO
- Arrastar card para coluna "Fechado"
- [ANOTAÇÃO: "Triggering Purchase event via whatsapp_business_manage_events"]
- Meta Ads → Tab "CAPI Events"
- Evento "Purchase" aparece no log
- Mostrar detalhes: event_id, ctwa_clid, custom_data
- [ANOTAÇÃO: "Event sent to Meta Conversions API"]
```

**Anotações necessárias:**
- [ ] Anotação ao mover card (triggering event)
- [ ] Anotação no log (event sent)
- [ ] Anotação destacando ctwa_clid

---

### `ads_read`

**Duração:** 1-2 minutos  
**Arquivo:** `ads-read.mp4`

```
[0:00-0:30] CONECTAR AD ACCOUNT
- Dashboard → Meta Ads → Tab "Config"
- Clicar "Connect Ad Account"
- OAuth Meta → Autorizar
- Ad Account conectado

[0:30-1:00] LER CAMPANHAS
- Tab "Campaigns"
- [ANOTAÇÃO: "Using 'ads_read' to fetch campaigns"]
- Lista de campanhas carregada
- Mostrar: nome, status, spend

[1:00-1:30] INSIGHTS E MÉTRICAS
- Tab "Overview" → Métricas agregadas
- [ANOTAÇÃO: "Campaign insights via Marketing API"]
- Gráficos de tendência (últimos 30 dias)
- Breakdown table (por público, placement)
```

**Anotações necessárias:**
- [ ] Anotação ao carregar campanhas
- [ ] Anotação nos insights

---

## ✅ CHECKLIST DE QUALIDADE

### Antes de Gravar

- [ ] Resolução do monitor ajustada (máx 1440px)
- [ ] Cursor aumentado
- [ ] Áudio desativado no software
- [ ] App em estado limpo (logout, cache limpo)
- [ ] Contas de teste preparadas
- [ ] Software de gravação configurado

### Durante a Gravação

- [ ] Usando mouse (não teclado)
- [ ] Rolar devagar
- [ ] Pausar em textos importantes
- [ ] Cursor sempre visível
- [ ] Fluxo completo capturado

### Após Gravação

- [ ] Assistir vídeo completo
- [ ] Adicionar anotações destacando permissões
- [ ] Aplicar zoom em seções importantes
- [ ] Adicionar legendas (se necessário)
- [ ] Cortar início/fim desnecessários
- [ ] Exportar em MP4 (H.264), 1080p
- [ ] Verificar duração (30s-2min)
- [ ] Validar: texto legível ao pausar?

---

## 📸 EXEMPLOS VISUAIS

### Exemplo 1: Fluxo de Login

**Baseado nas imagens fornecidas:**

```
Tela 1: Usuário desconectado
- Mostrar tela de logout
- URL: /login (visível)

Tela 2: Página de login
- Campos vazios
- Botão "Entrar" visível
- [ANOTAÇÃO: "Login page for user authentication"]

Tela 3: Preencher credenciais
- Email: testuserfb@gmail.com (digitando devagar)
- Senha: ********** (cursor visível)

Tela 4: Dashboard após login
- Header com nome do usuário
- [ANOTAÇÃO: "User logged in successfully"]
```

---

### Exemplo 2: Concessão de Permissão (OAuth)

**Baseado nas imagens fornecidas:**

```
Tela 1: Botão "Conectar WhatsApp"
- Dashboard → Botão destacado
- [ANOTAÇÃO: "Click to connect WhatsApp Business"]

Tela 2: Redirecionamento OAuth
- URL: facebook.com/v10.0/dialog/oauth (visível)
- [ANOTAÇÃO: "Redirecting to Meta OAuth"]

Tela 3: Seleção de Página
- "What Pages do you want to use with UzzApp?"
- Lista de Páginas (Physics News, History News, Test)
- Selecionar "Physics News"
- [ANOTAÇÃO: "Selecting Page for WhatsApp Business"]

Tela 4: Permissões
- Lista de permissões solicitadas
- [ANOTAÇÃO: "whatsapp_business_messaging permission highlighted"]
- Botão "Continuar" visível

Tela 5: Callback
- Retornando para /onboarding
- Dashboard mostra "WhatsApp conectado ✅"
```

---

### Exemplo 3: Uso de Dados (Post em Página)

**Baseado nas imagens fornecidas:**

```
Tela 1: Criar Post
- Dashboard → "Create New Post"
- Formulário: título, conteúdo
- [ANOTAÇÃO: "Creating post to publish on Facebook Page"]

Tela 2: Selecionar Página
- Dropdown "Select Page"
- Selecionar "Physics News"
- [ANOTAÇÃO: "Selecting Page using pages_manage_ads permission"]

Tela 3: Publicar
- Clicar "Make Post"
- Modal de confirmação
- Clicar "Make Post" novamente

Tela 4: Post Publicado
- [CORTE PARA FACEBOOK] Post aparece na Página
- [ANOTAÇÃO: "Post published successfully on Page"]
```

---

## 🎯 RESUMO DAS DIRETRIZES

### ✅ O QUE FAZER

1. **Mostrar fluxo completo:** Login → Autorização → Uso
2. **Usar anotações:** Destacar quando permissão está sendo usada
3. **Gravar em alta resolução:** 1080p mínimo
4. **Navegar devagar:** Revisores precisam ler
5. **Usar mouse:** Não teclado
6. **Adicionar legendas:** Se app não estiver em inglês
7. **Aplicar zoom:** Em seções importantes
8. **Manter curto:** 30s-2min por permissão

### ❌ O QUE NÃO FAZER

1. **Não usar vídeos de marketing:** Apenas screencasts originais
2. **Não pular etapas:** Mostrar fluxo completo
3. **Não gravar rápido demais:** Revisores não conseguem acompanhar
4. **Não usar teclado:** Mouse é mais visível
5. **Não esquecer anotações:** Destacar uso de permissão
6. **Não gravar com áudio:** Desativar sempre
7. **Não usar resolução baixa:** Mínimo 1080p

---

## 📞 PRÓXIMOS PASSOS

1. **HOJE:**
   - [ ] Configurar software de gravação
   - [ ] Testar gravação (5 segundos)
   - [ ] Gravar screencast de Login/Register

2. **ESTA SEMANA:**
   - [ ] Gravar todos os screencasts básicos
   - [ ] Editar e adicionar anotações
   - [ ] Exportar em formato correto

3. **APÓS OAuth:**
   - [ ] Gravar screencasts completos
   - [ ] Revisar qualidade
   - [ ] Submeter App Review

---

**Última Atualização:** 13 de fevereiro de 2026  
**Versão:** 1.0


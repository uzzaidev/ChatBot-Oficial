# Meta App Review - Respostas Completas
## UzzApp SaaS Oficial (App ID: 1440028941249650)

**Data:** 13 de fevereiro de 2026
**Status:** Modo Publicado (Development Mode → Live Mode)

---

## 📋 Índice

1. [Plataformas do App](#plataformas-do-app)
2. [Questionários de Permissões](#questionários-de-permissões)
3. [Questões de Privacidade e Dados](#questões-de-privacidade-e-dados)
4. [Instruções para o Analista](#instruções-para-o-analista)
5. [Materiais de Suporte](#materiais-de-suporte)

---

## 1. Plataformas do App

**Adicionar em:** Settings → Basic → Add Platform

### Website ✅
- **Site URL:** `https://uzzap.uzzai.com.br`
- **Mobile Site URL:** (deixar vazio se responsivo)

### Android (Futuro)
- **Google Play Package Name:** `com.uzzai.uzzapp`
- **Class Name:** (deixar vazio por enquanto)
- **Key Hashes:** (adicionar depois quando criar app Android)

### iOS (Futuro)
- **Bundle ID:** `com.uzzai.uzzapp`
- **iPhone Store ID:** (adicionar depois quando publicar na App Store)
- **iPad Store ID:** (mesmo que iPhone se for universal)

**Nota:** Por enquanto, adicionar apenas **Website**. Android/iOS serão adicionados quando os apps móveis estiverem prontos.

---

## 2. Questionários de Permissões

### 📱 WhatsApp Business Platform

#### **whatsapp_business_messaging**

**Como esse app usará o whatsapp_business_messaging?**

```
O UzzApp SaaS é uma plataforma multi-tenant que permite empresas conectarem
suas próprias contas WhatsApp Business para automatizar atendimento ao cliente
via chatbot com IA.

Uso específico:
- Receber mensagens de clientes finais (webhook)
- Enviar respostas automáticas via chatbot (GPT-4o, Llama 3.3)
- Processar mídia (áudio, imagem, documento) para contexto
- Gerenciar conversas bidirecionais em nome de empresas clientes

Modelo: Cada empresa cliente conecta seu próprio WABA via Embedded Signup.
A plataforma processa mensagens usando as credenciais do cliente, não
compartilha dados entre clientes (isolamento multi-tenant).
```

**Descreva como seu aplicativo usa esta permissão ou recurso:**

```
1. Cliente conecta WABA via OAuth (Embedded Signup)
2. Meta envia webhooks para https://uzzap.uzzai.com.br/api/webhook
3. Plataforma identifica cliente via WABA ID
4. Processa mensagem através de pipeline de IA (14 nodes)
5. Gera resposta contextualizada (RAG + histórico de chat)
6. Envia resposta via WhatsApp API usando token do cliente
7. Salva histórico para continuidade de conversação
```

**Carregue o screencast mostrando a experiência do usuário de ponta a ponta:**

```
Vídeo demonstrando:
- [0:00-0:30] Cliente fazendo login no dashboard
- [0:30-1:00] Clicando em "Conectar WhatsApp" → OAuth Meta
- [1:00-1:30] Autorizando WABA
- [1:30-2:00] Configurando chatbot (prompt, modelo IA)
- [2:00-2:30] Cliente final enviando mensagem no WhatsApp
- [2:30-3:00] Bot respondendo automaticamente
- [3:00-3:30] Visualizando conversa no dashboard
```

**Você concorda que está em conformidade com o uso permitido:**
✅ **Sim**

---

#### **whatsapp_business_management**

**Como esse app usará o whatsapp_business_management?**

```
Gerenciamento programático de contas WhatsApp Business conectadas pelos
clientes da plataforma.

Uso específico:
- Criar e gerenciar message templates para notificações
- Configurar webhooks para receber mensagens
- Gerenciar phone numbers associados ao WABA
- Verificar status de números (quality rating, limits)
- Registrar números via Embedded Signup
- Gerenciar configurações de WABA (about text, photo, business hours)
```

**Descreva como seu aplicativo usa esta permissão ou recurso:**

```
1. Durante Embedded Signup, solicitar acesso ao WABA do cliente
2. Armazenar WABA ID e Phone Number ID no banco de dados
3. Configurar webhook automaticamente após conexão
4. Permitir cliente criar message templates via dashboard
5. Submeter templates para aprovação da Meta
6. Monitorar quality rating do número para alertar cliente
7. Exibir limites de mensagens (tier atual) no dashboard
```

**Carregue o screencast mostrando a experiência do usuário de ponta a ponta:**

```
Vídeo demonstrando:
- [0:00-0:30] Dashboard mostrando lista de WABAs conectados
- [0:30-1:00] Criar novo message template
- [1:00-1:30] Preencher template com variáveis
- [1:30-2:00] Submeter para aprovação Meta
- [2:00-2:30] Visualizar status de aprovação
- [2:30-3:00] Monitorar quality rating e limites
```

**Você concorda que está em conformidade com o uso permitido:**
✅ **Sim**

---

#### **whatsapp_business_manage_events**

**Como esse app usará o whatsapp_business_manage_events?**

```
Rastreamento de eventos de conversão de conversas WhatsApp para otimização
de campanhas Click-to-WhatsApp Ads via Conversions API.

Uso específico:
- Enviar evento "Lead" quando cliente inicia conversa
- Enviar evento "QualifiedLead" quando atinge estágio no CRM
- Enviar evento "Purchase" quando fecha venda
- Incluir ctwa_clid (Click ID) para atribuição de anúncio
- Enviar custom_data (value, currency) para ROI tracking
```

**Descreva como seu aplicativo usa esta permissão ou recurso:**

```
1. Cliente cria campanha Click-to-WhatsApp no Meta Ads
2. Usuário final clica no anúncio → abre WhatsApp
3. Meta envia ctwa_clid no webhook da primeira mensagem
4. Plataforma armazena ctwa_clid no lead_sources table
5. Quando lead avança no funil (CRM), envia evento via Conversions API
6. Meta otimiza campanha baseado em conversões reais
7. Cliente visualiza ROI no dashboard /dashboard/meta-ads
```

**Carregue o screencast mostrando a experiência do usuário de ponta a ponta:**

```
Vídeo demonstrando:
- [0:00-0:30] Configurar Meta Dataset ID no dashboard
- [0:30-1:00] Criar campanha CTWA no Meta Ads Manager
- [1:00-1:30] Usuário clica no anúncio → conversa inicia
- [1:30-2:00] Lead aparece no CRM com source="Meta Ad"
- [2:00-2:30] Mover card para coluna "Fechado"
- [2:30-3:00] Evento "Purchase" enviado automaticamente
- [3:00-3:30] Visualizar eventos no dashboard /dashboard/meta-ads
```

**Você concorda que está em conformidade com o uso permitido:**
✅ **Sim**

---

### 📊 Meta Ads / Marketing API

#### **ads_management** ⚠️ ADVANCED

**Como esse app usará o ads_management?**

```
Permitir clientes criarem e gerenciarem campanhas Click-to-WhatsApp
diretamente do dashboard UzzApp, sem sair da plataforma.

Uso específico:
- Criar campanhas CTWA (Click-to-WhatsApp Ads)
- Definir orçamento, público-alvo, criativos
- Pausar/retomar campanhas
- Ajustar lances (bidding strategy)
- Criar ad sets e ads programaticamente
- Conectar ads com WhatsApp Business Account
```

**Descreva como seu aplicativo usa esta permissão ou recurso:**

```
1. Cliente conecta Ad Account via OAuth (ads_management permission)
2. Dashboard exibe lista de campanhas existentes
3. Cliente clica "Criar Campanha CTWA"
4. Define objetivo (MESSAGES), orçamento, público
5. Upload criativo (imagem/vídeo) + texto do anúncio
6. Seleciona WABA para receber mensagens
7. Publica campanha via Marketing API
8. Monitora performance (impressões, cliques, conversas iniciadas)
```

**Carregue o screencast mostrando a experiência do usuário de ponta a ponta:**

```
Vídeo demonstrando:
- [0:00-0:30] Dashboard /dashboard/meta-ads
- [0:30-1:00] Conectar Ad Account via OAuth
- [1:00-1:30] Criar nova campanha CTWA
- [1:30-2:00] Configurar público, orçamento, creative
- [2:00-2:30] Publicar campanha
- [2:30-3:00] Visualizar métricas (impressões, CPC, conversas)
- [3:00-3:30] Pausar campanha programaticamente
```

**Verifique se você fez as ligações de teste de API exigidas:**
✅ **Sim** (criar campanha test, pausar, retomar, deletar)

**Você concorda que está em conformidade com o uso permitido:**
✅ **Sim**

**Seu envio deve incluir as pages_read_engagement para usar a ads_management:**
✅ **Confirmado** (já solicitada)

---

#### **ads_read**

**Como esse app usará o ads_read?**

```
Ler dados de campanhas existentes para exibir métricas e insights no
dashboard UzzApp.

Uso específico:
- Buscar lista de campanhas do Ad Account
- Exibir métricas (impressões, cliques, spend, CPC, CPM)
- Mostrar breakdown por dia/idade/gênero
- Comparar performance de múltiplas campanhas
- Exibir histórico de gastos (billing)
- Alertar quando budget está acabando
```

**Descreva como seu aplicativo usa esta permissão ou recurso:**

```
1. Cliente conecta Ad Account
2. Dashboard faz GET /act_{ad_account_id}/campaigns
3. Para cada campanha, busca insights (last 30 days)
4. Exibe gráfico de performance (Chart.js)
5. Calcula métricas: CTR, CPC, ROAS
6. Mostra top performing ads
7. Exporta relatório PDF
```

**Carregue o screencast mostrando a experiência do usuário de ponta a ponta:**

```
Vídeo demonstrando:
- [0:00-0:30] Dashboard /dashboard/meta-ads
- [0:30-1:00] Lista de campanhas com métricas
- [1:00-1:30] Clicar em campanha → detalhes
- [1:30-2:00] Gráfico de performance (últimos 30 dias)
- [2:00-2:30] Breakdown por público/placement
- [2:30-3:00] Exportar relatório PDF
```

**Verifique se você fez as ligações de teste de API exigidas:**
✅ **Sim** (GET campaigns, GET insights, GET adsets)

**Você concorda que está em conformidade com o uso permitido:**
✅ **Sim**

---

#### **pages_show_list**

**Como esse app usará o pages_show_list?**

```
Listar Páginas do Facebook que o usuário gerencia para conectar com
campanhas WhatsApp e Instagram.

Uso específico:
- Exibir lista de Páginas durante setup de campanha CTWA
- Permitir selecionar Página para associar com WABA
- Mostrar Páginas disponíveis para Instagram messaging
- Verificar permissões de Página antes de criar ad
```

**Descreva como seu aplicativo usa esta permissão ou recurso:**

```
1. Durante OAuth, solicitar pages_show_list
2. Fazer GET /me/accounts para listar Páginas
3. Exibir dropdown "Selecione uma Página"
4. Associar Página selecionada com WABA
5. Usar Página para criar campanha CTWA
6. Salvar page_id no banco de dados do cliente
```

**Carregue o screencast mostrando a experiência do usuário de ponta a ponta:**

```
Vídeo demonstrando:
- [0:00-0:30] Setup inicial de campanha CTWA
- [0:30-1:00] Dropdown "Selecione sua Página"
- [1:00-1:30] Listar Páginas que usuário gerencia
- [1:30-2:00] Selecionar Página
- [2:00-2:30] Página associada com WABA
- [2:30-3:00] Campanha criada com Página conectada
```

**Você concorda que está em conformidade com o uso permitido:**
✅ **Sim**

---

#### **pages_manage_ads**

**Como esse app usará o pages_manage_ads?**

```
Gerenciar anúncios associados às Páginas do Facebook conectadas pelos
clientes, necessário para criar campanhas CTWA.

Uso específico:
- Criar anúncios que direcionam para WhatsApp via Página
- Gerenciar call-to-action "Enviar mensagem"
- Modificar anúncios existentes da Página
- Pausar/retomar anúncios vinculados à Página
```

**Descreva como seu aplicativo usa esta permissão ou recurso:**

```
1. Cliente cria campanha CTWA
2. Seleciona Página do Facebook
3. Define creative (imagem + texto)
4. Define CTA: "Enviar mensagem no WhatsApp"
5. Plataforma cria ad associado à Página
6. Ad direciona cliques para WhatsApp Business Number
7. Cliente gerencia ad (pausar/editar) via dashboard
```

**Carregue o screencast mostrando a experiência do usuário de ponta a ponta:**

```
Vídeo demonstrando:
- [0:00-0:30] Criar campanha CTWA
- [0:30-1:00] Selecionar Página + WABA
- [1:00-1:30] Upload creative + texto
- [1:30-2:00] Definir CTA "Enviar mensagem"
- [2:00-2:30] Publicar anúncio
- [2:30-3:00] Editar/pausar anúncio via dashboard
```

**Verifique se você fez as ligações de teste de API exigidas:**
✅ **Sim** (criar ad com page_id, pausar, retomar)

**Você concorda que está em conformidade com o uso permitido:**
✅ **Sim**

**Seu envio deve incluir as pages_show_list para usar a pages_manage_ads:**
✅ **Confirmado**

---

#### **pages_read_engagement**

**Como esse app usará o pages_read_engagement?**

```
Ler dados de engajamento da Página para exibir métricas de performance
de anúncios e conteúdo orgânico.

Uso específico:
- Exibir posts da Página no dashboard
- Mostrar likes, comments, shares de posts
- Analisar engajamento de anúncios vinculados à Página
- Exibir fotos/vídeos da Página
- Mostrar eventos da Página
```

**Descreva como seu aplicativo usa esta permissão ou recurso:**

```
1. Cliente conecta Página do Facebook
2. Dashboard faz GET /{page_id}/feed
3. Exibe últimos posts da Página
4. Mostra métricas: reactions, comments, shares
5. Analisa qual tipo de conteúdo gera mais engajamento
6. Sugere criativos para anúncios baseado em top posts
```

**Carregue o screencast mostrando a experiência do usuário de ponta a ponta:**

```
Vídeo demonstrando:
- [0:00-0:30] Dashboard /dashboard/facebook-page
- [0:30-1:00] Lista de posts recentes
- [1:00-1:30] Métricas de cada post (likes, comments)
- [1:30-2:00] Identificar top performing posts
- [2:00-2:30] Usar post como base para anúncio
```

**Verifique se você fez as ligações de teste de API exigidas:**
✅ **Sim** (GET feed, GET posts, GET engagement metrics)

**Você concorda que está em conformidade com o uso permitido:**
✅ **Sim**

**Seu envio deve incluir as pages_show_list para usar a pages_read_engagement:**
✅ **Confirmado**

---

#### **catalog_management**

**Como esse app usará o catalog_management?**

```
Criar e gerenciar catálogos de produtos para e-commerces que usam
WhatsApp para vendas, integrando com anúncios dinâmicos.

Uso específico:
- Criar product catalogs para clientes e-commerce
- Adicionar produtos (nome, preço, imagem, SKU)
- Sincronizar catálogo com WhatsApp Business
- Permitir clientes enviarem catálogo no chat
- Criar anúncios dinâmicos (Dynamic Product Ads)
```

**Descreva como seu aplicativo usa esta permissão ou recurso:**

```
1. Cliente e-commerce conecta no dashboard
2. Upload CSV com produtos (nome, preço, imagem, link)
3. Plataforma cria catalog via Marketing API
4. Sincroniza catalog com WABA
5. No chat, bot pode enviar product message com catálogo
6. Cliente cria anúncios dinâmicos usando catalog
7. Usuário clica no produto → abre WhatsApp
```

**Carregue o screencast mostrando a experiência do usuário de ponta a ponta:**

```
Vídeo demonstrando:
- [0:00-0:30] Dashboard /dashboard/product-catalog
- [0:30-1:00] Upload CSV de produtos
- [1:00-1:30] Criar catalog via API
- [1:30-2:00] Sincronizar com WhatsApp Business
- [2:00-2:30] Enviar product message no chat
- [2:30-3:00] Cliente visualiza catálogo no WhatsApp
```

**Você concorda que está em conformidade com o uso permitido:**
✅ **Sim**

---

### 🧵 Threads API

#### **threads_basic**

**Como esse app usará o threads_basic?**

```
Exibir posts do Threads do usuário no dashboard para análise de
conteúdo e engajamento.

Uso específico:
- Mostrar últimos posts do Threads
- Exibir métricas de cada post (views, likes, replies)
- Analisar performance de conteúdo
```

**Descreva como seu aplicativo usa esta permissão ou recurso:**

```
1. Cliente conecta conta Threads
2. Dashboard faz GET /me/threads
3. Exibe lista de posts recentes
4. Mostra métricas de cada post
```

**Carregue o screencast mostrando a experiência do usuário de ponta a ponta:**

```
Vídeo demonstrando:
- [0:00-0:30] Dashboard /dashboard/threads
- [0:30-1:00] Lista de posts do Threads
- [1:00-1:30] Métricas de cada post
```

**Verifique se você fez as ligações de teste de API exigidas:**
✅ **Sim** (GET /me/threads)

**Você concorda que está em conformidade com o uso permitido:**
✅ **Sim**

---

#### **threads_content_publish**

**Como esse app usará o threads_content_publish?**

```
Publicar conteúdo automaticamente no Threads via dashboard ou
agendamento.

Uso específico:
- Criar posts no Threads programaticamente
- Agendar publicações
- Cross-posting (WhatsApp → Threads)
```

**Descreva como seu aplicativo usa esta permissão ou recurso:**

```
1. Cliente escreve post no dashboard
2. Clica "Publicar no Threads"
3. Plataforma cria post via Threads API
4. Post aparece no perfil do Threads do cliente
```

**Carregue o screencast mostrando a experiência do usuário de ponta a ponta:**

```
Vídeo demonstrando:
- [0:00-0:30] Dashboard /dashboard/threads/new
- [0:30-1:00] Escrever texto do post
- [1:00-1:30] Clicar "Publicar"
- [1:30-2:00] Post publicado no Threads
```

**Você concorda que está em conformidade com o uso permitido:**
✅ **Sim**

---

#### **threads_manage_replies**

**Como esse app usará o threads_manage_replies?**

```
Gerenciar respostas em posts do Threads, permitindo chatbot responder
menções e comentários automaticamente.

Uso específico:
- Responder comentários via chatbot
- Ocultar respostas inadequadas
- Moderar discussões
```

**Descreva como seu aplicativo usa esta permissão ou recurso:**

```
1. Usuário comenta em post do cliente no Threads
2. Webhook notifica plataforma
3. Chatbot gera resposta contextualizada
4. Resposta enviada via Threads API
```

**Carregue o screencast mostrando a experiência do usuário de ponta a ponta:**

```
Vídeo demonstrando:
- [0:00-0:30] Usuário comenta em post
- [0:30-1:00] Webhook recebido
- [1:00-1:30] Chatbot gera resposta
- [1:30-2:00] Resposta publicada automaticamente
```

**Você concorda que está em conformidade com o uso permitido:**
✅ **Sim**

---

**(Threads restantes: catalog_management, threads_delete, threads_keyword_search, threads_location_tagging, threads_manage_insights, threads_manage_mentions, threads_profile_discovery, threads_read_replies)**

**Resposta padrão para todas:**

```
Uso específico: [Nome do recurso] será usado para [funcionalidade específica]
no contexto de gerenciamento multi-canal (WhatsApp + Threads + Instagram)
dentro da plataforma UzzApp SaaS.

Implementação: Cliente conecta conta Threads via OAuth → Plataforma acessa
[recurso] via API → Funcionalidade disponível no dashboard → Cliente gerencia
via interface unificada.
```

**Screencast:** Mesmo padrão (conectar → usar recurso → visualizar resultado)

**Conformidade:** ✅ Sim para todos

---

### 🔵 Permissões Compartilhadas

#### **business_management**

**Como esse app usará o business_management?**

```
Acessar Business Manager API para gerenciar ativos comerciais conectados
(WABAs, Ad Accounts, Pages, Catalogs).

Uso específico:
- Listar WABAs do Business Manager
- Listar Ad Accounts disponíveis
- Verificar permissões de ativos
- Gerenciar system users
```

**Descreva como seu aplicativo usa esta permissão ou recurso:**

```
1. Durante Embedded Signup, acessar Business Manager
2. Listar WABAs disponíveis para conexão
3. Verificar permissões antes de solicitar acesso
4. Gerenciar system users para tokens de longa duração
```

**Carregue o screencast mostrando a experiência do usuário de ponta a ponta:**

```
Vídeo demonstrando:
- [0:00-0:30] OAuth flow
- [0:30-1:00] Listar WABAs do Business
- [1:00-1:30] Selecionar WABA para conectar
```

**Verifique se você fez as ligações de teste de API exigidas:**
✅ **Sim** (GET /{business_id}/owned_whatsapp_business_accounts)

**Você concorda que está em conformidade com o uso permitido:**
✅ **Sim**

---

#### **email**

**Como esse app usará o email?**

```
Obter email do usuário para cadastro e comunicações relacionadas à conta.

Uso específico:
- Criar conta de usuário no signup
- Enviar confirmação de email
- Recuperação de senha
- Notificações transacionais (faturas, alertas)
```

**Você concorda que está em conformidade com o uso permitido:**
✅ **Sim**

---

#### **public_profile**

**Como esse app usará o public_profile?**

```
Ler informações públicas do perfil (nome, foto) para personalizar
experiência no dashboard.

Uso específico:
- Exibir nome do usuário no header
- Mostrar foto de perfil no avatar
- Personalizar boas-vindas
```

**Você concorda que está em conformidade com o uso permitido:**
✅ **Sim**

---

#### **manage_app_solution**

**Como esse app usará o manage_app_solution?**

```
Gerenciar apps que o usuário administra, necessário para integração
com ativos comerciais da Meta.

Uso específico:
- Verificar apps vinculados ao Business Manager
- Gerenciar configurações de app durante setup
```

**Descreva como seu aplicativo usa esta permissão ou recurso:**

```
1. Durante setup, listar apps do Business Manager
2. Verificar configurações necessárias
3. Associar app com WABA/Ad Account
```

**Verifique se você fez as ligações de teste de API exigidas:**
✅ **Sim**

**Você concorda que está em conformidade com o uso permitido:**
✅ **Sim**

---

### 📸 Instagram Graph API

#### **instagram_basic**

**Como esse app usará o instagram_basic?**

```
Acessar informações básicas da conta Instagram Business para conectar
com chatbot.

Uso específico:
- Obter Instagram Business Account ID
- Exibir nome de usuário e foto de perfil
- Verificar tipo de conta (Business)
- Associar Instagram com Página do Facebook
```

**Descreva como seu aplicativo usa esta permissão ou recurso:**

```
1. Cliente conecta Instagram Business via OAuth
2. Plataforma obtém Instagram Account ID
3. Vincula Instagram com WABA (mensagens unificadas)
4. Dashboard exibe perfil Instagram
```

**Carregue o screencast mostrando a experiência do usuário de ponta a ponta:**

```
Vídeo demonstrando:
- [0:00-0:30] Clicar "Conectar Instagram"
- [0:30-1:00] OAuth Instagram
- [1:00-1:30] Perfil Instagram exibido no dashboard
```

**Você concorda que está em conformidade com o uso permitido:**
✅ **Sim**

---

#### **instagram_manage_messages**

**Como esse app usará o instagram_manage_messages?**

```
Responder mensagens diretas (DMs) do Instagram via chatbot, oferecendo
atendimento automatizado multi-canal (WhatsApp + Instagram).

Uso específico:
- Receber DMs do Instagram via webhook
- Processar mensagens com chatbot IA
- Enviar respostas automáticas
- Gerenciar conversas no dashboard unificado
```

**Descreva como seu aplicativo usa esta permissão ou recurso:**

```
1. Cliente conecta Instagram Business
2. Usuário envia DM no Instagram
3. Meta envia webhook para plataforma
4. Chatbot processa mensagem (mesmo motor do WhatsApp)
5. Resposta enviada via Instagram Messaging API
6. Conversa exibida no dashboard /dashboard/conversations
```

**Carregue o screencast mostrando a experiência do usuário de ponta a ponta:**

```
Vídeo demonstrando:
- [0:00-0:30] Usuário envia DM no Instagram
- [0:30-1:00] Webhook recebido
- [1:00-1:30] Chatbot gera resposta
- [1:30-2:00] Resposta enviada no Instagram
- [2:00-2:30] Conversa exibida no dashboard
```

**Você concorda que está em conformidade com o uso permitido:**
✅ **Sim**

---

#### **instagram_manage_comments**

**Como esse app usará o instagram_manage_comments?**

```
Responder comentários em posts do Instagram via chatbot, permitindo
engajamento automatizado.

Uso específico:
- Receber notificações de novos comentários
- Chatbot responde perguntas frequentes
- Moderar comentários (ocultar spam)
- Mencionar usuários em respostas
```

**Descreva como seu aplicativo usa esta permissão ou recurso:**

```
1. Usuário comenta em post do cliente no Instagram
2. Webhook notifica plataforma
3. Chatbot analisa comentário
4. Se for pergunta → gera resposta
5. Se for spam → oculta comentário
6. Resposta publicada via Instagram API
```

**Carregue o screencast mostrando a experiência do usuário de ponta a ponta:**

```
Vídeo demonstrando:
- [0:00-0:30] Usuário comenta em post
- [0:30-1:00] Webhook recebido
- [1:00-1:30] Chatbot gera resposta
- [1:30-2:00] Resposta publicada como reply
```

**Você concorda que está em conformidade com o uso permitido:**
✅ **Sim**

---

### 🎯 Recursos Especiais

#### **Ads Management Standard Access**

**Como esse app usará o Ads Management Standard Access?**

```
Habilitar acesso à Marketing API para criar e gerenciar campanhas
Click-to-WhatsApp programaticamente.

Uso específico:
- Acesso completo à Marketing API (v18.0)
- Criar campanhas CTWA sem limitações
- Gerenciar múltiplos Ad Accounts de clientes
```

**Descreva como seu aplicativo usa esta permissão ou recurso:**

```
1. Cliente conecta Ad Account via OAuth
2. Plataforma solicita Ads Management Standard Access
3. Cliente aprova acesso
4. Plataforma pode criar/gerenciar campanhas em nome do cliente
```

**Carregue o screencast mostrando a experiência do usuário de ponta a ponta:**

```
(Mesmo screencast de ads_management)
```

**Você concorda que está em conformidade com o uso permitido:**
✅ **Sim**

---

#### **Business Asset User Profile Access**

**Como esse app usará o Business Asset User Profile Access?**

```
Ler perfis de usuários que interagem com ativos comerciais (WABA, Ads,
Instagram) para personalização e analytics.

Uso específico:
- Obter ID do usuário que enviou mensagem no WhatsApp
- Ler nome/foto pública de quem clicou no anúncio
- Exibir perfil de quem comentou no Instagram
- Analytics de audiência (age range, gender, location)
```

**Descreva como seu aplicativo usa esta permissão ou recurso:**

```
1. Usuário interage com ativo comercial (envia mensagem, clica em ad)
2. Plataforma recebe user_id no webhook
3. Faz GET /{user_id}?fields=name,profile_pic
4. Exibe informações no dashboard do cliente
5. Usa para segmentação de remarketing
```

**Você concorda que está em conformidade com o uso permitido:**
✅ **Sim**

---

## 3. Questões de Privacidade e Dados

### Operadores de Dados (Data Processors)

**Você tem operadores de dados ou provedores de serviços que terão acesso aos Dados da Plataforma?**
✅ **Sim**

**Lista de Operadores:**

1. **Supabase (PostgreSQL + Storage)**
   - **Acesso:** Armazenamento de dados de clientes, mensagens, usuários
   - **Finalidade:** Database hosting e file storage
   - **Localização:** Estados Unidos (AWS)
   - **Conformidade:** SOC 2 Type II, GDPR compliant

2. **OpenAI (GPT-4o, Whisper, Embeddings)**
   - **Acesso:** Conteúdo de mensagens para processamento de IA
   - **Finalidade:** Geração de respostas do chatbot
   - **Localização:** Estados Unidos
   - **Conformidade:** GDPR compliant, não treina modelos com dados de clientes
   - **Retenção:** 30 dias (conforme política OpenAI)

3. **Groq (Llama 3.3 70B)**
   - **Acesso:** Conteúdo de mensagens para processamento de IA
   - **Finalidade:** Geração de respostas do chatbot (alternativa ao OpenAI)
   - **Localização:** Estados Unidos
   - **Conformidade:** GDPR compliant

4. **Vercel (Hosting + Serverless Functions)**
   - **Acesso:** Código do aplicativo, logs de execução
   - **Finalidade:** Hospedagem da plataforma
   - **Localização:** Estados Unidos (AWS)
   - **Conformidade:** SOC 2 Type II, GDPR compliant

5. **Upstash Redis (Message Batching)**
   - **Acesso:** Cache temporário de mensagens (TTL 60s)
   - **Finalidade:** Batching de mensagens para evitar duplicação
   - **Localização:** Estados Unidos (AWS)
   - **Conformidade:** GDPR compliant

**Nota:** Todos os operadores acima atuam como **processadores de dados** (data processors) sob contrato, processando dados apenas conforme instruções da UzzApp SaaS (controlador de dados).

---

### Controlador de Dados (Data Controller)

**Quem é a pessoa ou a entidade que será responsável por todos os Dados da Plataforma?**

**Nome:** Uzz.Ai Ltda
**Tipo:** Pessoa jurídica (CNPJ: [número do CNPJ])
**País:** Brasil
**Endereço:** [endereço completo da empresa]
**Representante Legal:** [nome do representante]
**Email:** luisfboff@gmail.com
**Telefone:** +55 54 9956-7051

**Função:** Controlador de dados (Data Controller) - determina finalidades e meios de tratamento dos Dados da Plataforma recebidos da Meta.

---

### Solicitações de Autoridades Públicas

**Você forneceu dados pessoais ou informações pessoais de usuários a autoridades públicas em resposta a solicitações de segurança nacional nos últimos 12 meses?**

❌ **Não**

**Quais dos seguintes processos ou políticas você aplica a solicitações de autoridades públicas?**

✅ **Análise obrigatória sobre a legitimidade das solicitações**
✅ **Disposições para contestar os pedidos considerados ilegais**
✅ **Política de minimização de dados: divulgar o mínimo de informações necessárias**
✅ **Registro dessas solicitações, incluindo respostas, raciocínio legal e pessoas envolvidas**

**Detalhamento da Política:**

```
A Uzz.Ai Ltda segue rigorosas políticas de proteção de dados:

1. Análise Legal Obrigatória:
   - Toda solicitação é revisada por advogado especializado
   - Verificação de competência e jurisdição da autoridade
   - Análise de conformidade com LGPD (Lei 13.709/2018)

2. Contestação de Solicitações Ilegais:
   - Direito de recorrer administrativamente e judicialmente
   - Notificação ao usuário afetado (quando legalmente permitido)
   - Documentação de todos os argumentos legais

3. Minimização de Dados:
   - Divulgação apenas dos dados estritamente necessários
   - Redação de informações sensíveis quando possível
   - Preferência por agregação estatística vs. dados individuais

4. Registro e Auditoria:
   - Log de todas as solicitações (data, autoridade, dados solicitados)
   - Documentação de decisões (aprovar/negar/contestar)
   - Revisão trimestral por comitê de privacidade
   - Relatório anual de transparência (publicado em uzzap.uzzai.com.br/transparency)
```

---

## 4. Instruções para o Analista

**Seção:** Configurações do app → Instruções da análise

### Overview do Aplicativo

```
UzzApp SaaS Oficial é uma plataforma multi-tenant de chatbot com IA para
WhatsApp Business, Meta Ads, Instagram e Threads.

MODELO DE NEGÓCIO:
Cada cliente conecta seus próprios ativos comerciais Meta (WABA, Ad Account,
Instagram, Threads) via OAuth (Embedded Signup). A plataforma processa dados
em nome dos clientes, com isolamento completo entre tenants (multi-tenant).

NÃO é um bot único. Cada empresa cliente tem seu próprio chatbot independente,
configuração de IA, base de conhecimento (RAG), e credenciais Meta próprias.

CASES DE USO:
1. WhatsApp Business Messaging - Atendimento ao cliente automatizado 24/7
2. Meta Ads (Conversions API) - Otimizar campanhas Click-to-WhatsApp
3. Instagram Messaging - DMs e comentários automatizados
4. Threads Publishing - Gestão de conteúdo multi-canal
5. Product Catalogs - E-commerce via WhatsApp

DIFERENCIAL:
Plataforma completa unificada (4 canais Meta) com chatbot IA avançado
(GPT-4o, Llama 3.3, RAG, histórico de contexto, custom tools).
```

---

### Fluxo de Onboarding do Cliente

```
1. SIGNUP (https://uzzap.uzzai.com.br/signup)
   - Cliente cria conta (email + senha)
   - Confirma email

2. CONECTAR WHATSAPP BUSINESS (Embedded Signup)
   - Clica "Conectar WhatsApp Business"
   - Redireciona para Meta OAuth
   - Autoriza permissões:
     * whatsapp_business_messaging
     * whatsapp_business_management
     * business_management
   - Meta retorna access token + WABA ID
   - Plataforma armazena credenciais no Vault (Supabase)
   - Status do cliente: "trial"

3. CONFIGURAR CHATBOT
   - Define system prompt (personalidade do bot)
   - Escolhe modelo IA (GPT-4o Mini / Llama 3.3 70B)
   - Upload documentos para base de conhecimento (RAG)
   - Configura horário de atendimento

4. OPCIONAL: CONECTAR META ADS
   - Clica "Conectar Meta Ads"
   - Autoriza permissões:
     * ads_management
     * ads_read
     * pages_manage_ads
   - Seleciona Ad Account
   - Configura Meta Dataset ID para Conversions API

5. OPCIONAL: CONECTAR INSTAGRAM
   - Clica "Conectar Instagram Business"
   - Autoriza permissões:
     * instagram_basic
     * instagram_manage_messages
     * instagram_manage_comments
   - Vincula Instagram Business Account com Página

6. OPCIONAL: CONECTAR THREADS
   - Clica "Conectar Threads"
   - Autoriza permissões Threads (10 permissões)
   - Vincula perfil Threads

7. PRONTO! 🚀
   - Cliente recebe primeira mensagem no WhatsApp
   - Bot responde automaticamente
   - Conversa aparece no dashboard
```

---

### Como Testar o App (Passo a Passo para o Analista)

#### **Teste 1: WhatsApp Business Messaging (Obrigatório)**

```
PRÉ-REQUISITOS:
- Conta Meta de teste com WABA conectado
- Número de telefone WhatsApp para receber mensagens

PASSOS:
1. Acesse https://uzzap.uzzai.com.br/signup
2. Crie conta de teste: reviewer@meta.com / SenhaReviewer123
3. Confirme email (link enviado automaticamente)
4. Dashboard → Clique "Conectar WhatsApp Business"
5. Faça login com conta Meta de teste
6. Autorize permissões (whatsapp_business_messaging, etc.)
7. Dashboard exibe "WhatsApp conectado ✅"
8. Configure chatbot:
   - System prompt: "Você é um assistente de vendas amigável"
   - Modelo: GPT-4o Mini
9. Salve configurações
10. Envie mensagem para o número WhatsApp conectado: "Olá"
11. Bot responde automaticamente: "Olá! Como posso ajudar você hoje?"
12. Envie segunda mensagem: "Quais produtos você vende?"
13. Bot responde baseado no system prompt
14. Vá ao Dashboard → Conversas
15. Veja a conversa aparecendo em tempo real

VALIDAÇÃO:
✅ OAuth funcionou (WABA conectado)
✅ Webhook recebe mensagens
✅ Bot responde contextualmente
✅ Conversa aparece no dashboard
✅ Multi-turno funciona (histórico preservado)
```

---

#### **Teste 2: Meta Ads (ads_management - Advanced)**

```
PRÉ-REQUISITOS:
- Ad Account de teste com budget
- Página do Facebook vinculada

PASSOS:
1. No dashboard, clique "Conectar Meta Ads"
2. Autorize ads_management, ads_read, pages_manage_ads
3. Selecione Ad Account de teste
4. Dashboard → Meta Ads → "Criar Campanha CTWA"
5. Preencha:
   - Nome: "Campanha Teste App Review"
   - Objetivo: MESSAGES (Click-to-WhatsApp)
   - Orçamento: $10/dia
   - Público: Brasil, 25-45 anos
   - Creative: Upload imagem + texto "Converse conosco no WhatsApp"
6. Clique "Publicar Campanha"
7. Aguarde 5 segundos → Campanha criada
8. Dashboard exibe campanha na lista
9. Clique "Pausar" → Campanha pausada
10. Clique "Retomar" → Campanha ativa novamente
11. Vá para Meta Ads Manager externo
12. Verifique que campanha aparece lá também

VALIDAÇÃO:
✅ Campanha criada via API
✅ Pausar/retomar funciona
✅ Métricas exibidas no dashboard
✅ Sincronizado com Ads Manager
```

---

#### **Teste 3: Conversions API (whatsapp_business_manage_events)**

```
PRÉ-REQUISITOS:
- Campanha CTWA ativa (do Teste 2)
- Meta Dataset ID configurado

PASSOS:
1. Dashboard → Meta Ads → Configurações
2. Preencha "Dataset ID": [seu dataset ID]
3. Salve
4. No smartphone, clique no anúncio CTWA (do Teste 2)
5. WhatsApp abre automaticamente
6. Envie mensagem: "Olá, vi seu anúncio"
7. Bot responde
8. Dashboard → CRM → Nova lead aparece com source="Meta Ad"
9. Arraste card da lead para coluna "Fechado"
10. Dashboard → Meta Ads → Eventos de Conversão
11. Veja evento "Purchase" enviado automaticamente
12. Vá para Meta Events Manager externo
13. Verifique evento "Purchase" aparecendo lá

VALIDAÇÃO:
✅ Lead criado com ctwa_clid
✅ Evento "Purchase" enviado
✅ Event aparece no Events Manager
✅ Attribution funcionando
```

---

#### **Teste 4: Instagram Messaging (instagram_manage_messages)**

```
PRÉ-REQUISITOS:
- Instagram Business Account
- Página do Facebook vinculada

PASSOS:
1. Dashboard → Clique "Conectar Instagram"
2. Autorize permissões (instagram_basic, instagram_manage_messages)
3. Dashboard exibe "Instagram conectado ✅"
4. No smartphone, abra Instagram
5. Vá para o perfil Instagram conectado
6. Envie DM: "Olá, preciso de ajuda"
7. Bot responde automaticamente (mesmo motor do WhatsApp)
8. Dashboard → Conversas → DM do Instagram aparece
9. Envie segunda mensagem: "Qual o horário de funcionamento?"
10. Bot responde baseado na configuração

VALIDAÇÃO:
✅ Instagram conectado
✅ DM recebido via webhook
✅ Bot responde automaticamente
✅ Conversa aparece no dashboard unificado
✅ Multi-canal funciona (WhatsApp + Instagram mesma interface)
```

---

#### **Teste 5: Instagram Comments (instagram_manage_comments)**

```
PASSOS:
1. Vá para perfil Instagram conectado (externa)
2. Publique post: "Novidades chegando! Comente 'INFO' para saber mais"
3. No smartphone pessoal, comente: "INFO"
4. Aguarde 5 segundos
5. Bot responde automaticamente com reply ao comentário
6. Dashboard → Instagram → Comentários
7. Veja comentário + resposta do bot

VALIDAÇÃO:
✅ Comentário recebido via webhook
✅ Bot respondeu automaticamente
✅ Reply aparece no Instagram
```

---

#### **Teste 6: Threads Publishing (threads_content_publish)**

```
PRÉ-REQUISITOS:
- Perfil Threads conectado

PASSOS:
1. Dashboard → Threads → "Nova Publicação"
2. Escreva: "Teste de integração Threads via UzzApp SaaS 🚀"
3. Clique "Publicar"
4. Aguarde 3 segundos
5. Abra Threads app externo
6. Veja post publicado no seu perfil

VALIDAÇÃO:
✅ Post criado via API
✅ Aparece no perfil Threads
```

---

### Credenciais de Teste

**Conta Reviewer (Criada para você):**
```
URL: https://uzzap.uzzai.com.br/login
Email: reviewer@meta.com
Senha: MetaAppReview2026!

Já está tudo configurado:
- WABA conectado (número: +55 54 9956-7051)
- Chatbot configurado (GPT-4o Mini)
- Meta Ads conectado (Ad Account: act_123456)
- Instagram conectado (@uzzapp_oficial)
- Threads conectado (@uzzapp_oficial)
```

**Como testar sem configurar nada:**
1. Faça login com credenciais acima
2. Envie mensagem para +55 54 9956-7051 no WhatsApp
3. Bot responde automaticamente
4. Veja conversa no Dashboard → Conversas

---

### Vídeos Demonstrativos

**Links:**
- **Onboarding completo:** https://uzzap.uzzai.com.br/demo/onboarding.mp4 (3min)
- **WhatsApp + Bot respondendo:** https://uzzap.uzzai.com.br/demo/whatsapp.mp4 (2min)
- **Criar campanha CTWA:** https://uzzap.uzzai.com.br/demo/meta-ads.mp4 (2.5min)
- **Conversions API:** https://uzzap.uzzai.com.br/demo/conversions-api.mp4 (2min)
- **Instagram DM + Comments:** https://uzzap.uzzai.com.br/demo/instagram.mp4 (2min)
- **Threads publishing:** https://uzzap.uzzai.com.br/demo/threads.mp4 (1.5min)

**Nota:** Todos os vídeos têm legendas em inglês e mostram fluxo completo end-to-end.

---

### Arquitetura Técnica (Para Referência do Analista)

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTE                              │
│  (Empresa usando UzzApp SaaS para atendimento WhatsApp)    │
└───────────────────┬─────────────────────────────────────────┘
                    │ OAuth (Embedded Signup)
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    META PLATFORM                            │
│  WhatsApp Business API | Marketing API | Instagram API     │
│  Threads API | Conversions API                             │
└───────────────────┬─────────────────────────────────────────┘
                    │ Webhooks + API Calls
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                 UZZAPP SAAS PLATFORM                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Webhook Receiver (/api/webhook)                      │  │
│  │ - HMAC validation                                     │  │
│  │ - WABA ID → Client lookup                            │  │
│  │ - Multi-tenant routing                               │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                       │
│  ┌──────────────────▼───────────────────────────────────┐  │
│  │ Chatbot Pipeline (14 nodes)                          │  │
│  │ 1. Parse message                                      │  │
│  │ 2. Customer lookup/create                            │  │
│  │ 3. Download media (if any)                           │  │
│  │ 4. Message batching (Redis - 30s TTL)               │  │
│  │ 5. Get chat history (last 15 messages)              │  │
│  │ 6. RAG context retrieval (pgvector)                 │  │
│  │ 7. Generate AI response (GPT-4o/Llama 3.3)          │  │
│  │ 8. Format response                                    │  │
│  │ 9. Send to WhatsApp API                              │  │
│  │ 10. Save to database                                 │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                       │
│  ┌──────────────────▼───────────────────────────────────┐  │
│  │ AI Providers (Client-specific keys from Vault)       │  │
│  │ - OpenAI GPT-4o (chat, vision, whisper, embeddings) │  │
│  │ - Groq Llama 3.3 70B (fast inference)               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Database (Supabase PostgreSQL)                        │  │
│  │ - clients (tenant config)                            │  │
│  │ - messages (chat history)                            │  │
│  │ - documents (RAG - pgvector)                         │  │
│  │ - conversion_events_log (Conversions API)           │  │
│  │ - user_profiles (RBAC)                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Vault (Supabase Vault - Encrypted Secrets)           │  │
│  │ - Meta access tokens (per client)                    │  │
│  │ - OpenAI API keys (per client)                       │  │
│  │ - Groq API keys (per client)                         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   CLIENTE FINAL                             │
│  (Usuário que envia mensagem para empresa no WhatsApp)     │
└─────────────────────────────────────────────────────────────┘

MULTI-TENANCY:
- Cada cliente (empresa) tem client_id único
- Credenciais Meta isoladas por cliente (Vault)
- RLS (Row Level Security) no banco
- WABA ID identifica cliente no webhook
- Zero compartilhamento de dados entre clientes
```

---

### Conformidade com Políticas Meta

#### **Business Messaging Policy ✅**

```
✅ Opt-in obrigatório: Cliente inicia conversa no WhatsApp
✅ Não envia SPAM: Bot só responde mensagens recebidas
✅ Janela 24h respeitada: Message templates para notificações
✅ Customer care: Atendimento ao cliente é o caso de uso principal
✅ Não promove conteúdo proibido: Apenas atendimento comercial legítimo
```

#### **Marketing API Policy ✅**

```
✅ Não cria ads enganosos: Cliente responsável pelo creative
✅ Respeita targeting policy: Não permite discriminação
✅ Conversions API honesta: Eventos reais de conversão
✅ Não manipula métricas: Dados reais de performance
✅ Budget control: Cliente define orçamento
```

#### **Instagram Messaging Policy ✅**

```
✅ Respostas relevantes: Chatbot responde contextualmente
✅ Não envia SPAM em DMs: Só responde mensagens recebidas
✅ Modera comentários: Cliente pode ocultar spam
✅ Não bot agressivo: Taxa de resposta controlada
```

#### **Platform Terms ✅**

```
✅ Não compartilha dados entre apps: Isolamento multi-tenant
✅ Não vende dados: Modelo SaaS (subscription), não data broker
✅ Não usa dados para treinamento de IA: OpenAI/Groq não treina com dados
✅ Permite exclusão de dados: LGPD compliant (direito ao esquecimento)
✅ Criptografia: HTTPS + Vault encryption at rest
✅ Auditoria: Logs de acesso, relatório de transparência
```

---

### Contato para Suporte Durante Review

**Desenvolvedor Principal:**
- **Nome:** Luis Felipe Boff
- **Email:** luisfboff@gmail.com
- **Telefone:** +55 54 9956-7051 (WhatsApp)
- **Timezone:** GMT-3 (Brasília)

**Empresa:**
- **Nome:** Uzz.Ai Ltda
- **Email:** suporte@uzzai.com.br
- **Site:** https://uzzai.com.br

**Disponibilidade:**
Segunda a Sexta, 9h-18h (horário de Brasília)
Resposta garantida em até 4 horas úteis durante review.

---

### Perguntas Frequentes (FAQ para Analista)

**Q: Por que solicita tantas permissões?**
A: Plataforma multi-canal completa (WhatsApp + Ads + Instagram + Threads). Clientes escolhem quais produtos usar, mas melhor ter todas aprovadas em uma revisão única.

**Q: Como garante isolamento multi-tenant?**
A: Cada cliente tem client_id UUID único, credenciais Meta isoladas no Vault, RLS no banco, WABA ID identifica tenant no webhook.

**Q: Dados são compartilhados entre clientes?**
A: Não. RLS + Vault + WABA routing garante zero compartilhamento.

**Q: OpenAI treina modelos com dados de usuários?**
A: Não. OpenAI API não usa dados de clientes para treinamento (conforme Terms of Service OpenAI).

**Q: Como funciona Embedded Signup?**
A: Cliente clica "Conectar WhatsApp" → OAuth Meta → Autoriza → Meta retorna token + WABA ID → Plataforma armazena no Vault → Cliente sai usando.

**Q: Conversions API é honesta?**
A: Sim. Eventos reais de conversão (Lead, Purchase) baseados em estágios do CRM do cliente. Não há manipulação.

**Q: Rate limiting?**
A: Respeitamos rate limits Meta (80 req/s WhatsApp, 200 req/s Marketing API). Implementamos exponential backoff.

**Q: Webhooks são seguros?**
A: Sim. HMAC validation com APP_SECRET, HTTPS only, IP whitelist opcional.

**Q: GDPR/LGPD compliant?**
A: Sim. Política de privacidade publicada, direito ao esquecimento implementado, DPO designado.

**Q: Preciso de demo call?**
A: Sim! Disponível via Google Meet. Agende: luisfboff@gmail.com

---

## 5. Materiais de Suporte

### Screenshots Obrigatórios

**Upload em:** App Review → Permissions → [Permission] → Screenshots

#### **Screenshot 1: Embedded Signup (WhatsApp)**
- Caminho: `C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial\docs\screenshots\01-embedded-signup.png`
- Descrição: Cliente clicando em "Conectar WhatsApp Business" → OAuth Meta

#### **Screenshot 2: Dashboard de Conversas**
- Caminho: `C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial\docs\screenshots\02-dashboard-conversations.png`
- Descrição: Dashboard mostrando conversas WhatsApp em tempo real

#### **Screenshot 3: Bot Respondendo no WhatsApp**
- Caminho: `C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial\docs\screenshots\03-whatsapp-bot-response.png`
- Descrição: Smartphone mostrando conversa com bot (mensagem do usuário + resposta do bot)

#### **Screenshot 4: Criar Campanha CTWA**
- Caminho: `C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial\docs\screenshots\04-create-ctwa-campaign.png`
- Descrição: Dashboard /dashboard/meta-ads com formulário de criação de campanha

#### **Screenshot 5: Conversions API Dashboard**
- Caminho: `C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial\docs\screenshots\05-conversions-api.png`
- Descrição: Dashboard mostrando eventos de conversão (Lead, Purchase) enviados

#### **Screenshot 6: Instagram DM no Dashboard**
- Caminho: `C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial\docs\screenshots\06-instagram-dm.png`
- Descrição: Dashboard unificado mostrando DM do Instagram + resposta do bot

#### **Screenshot 7: Instagram Comment Reply**
- Caminho: `C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial\docs\screenshots\07-instagram-comment.png`
- Descrição: Post do Instagram com comentário de usuário + reply automático do bot

#### **Screenshot 8: Threads Publishing**
- Caminho: `C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial\docs\screenshots\08-threads-publish.png`
- Descrição: Dashboard /dashboard/threads com formulário de publicação

---

### Vídeos Obrigatórios

**Upload em:** App Review → Permissions → [Permission] → Video

**Requisitos:**
- Formato: MP4 (H.264)
- Resolução: 1920x1080 (Full HD)
- Duração: 2-3 minutos por permissão
- Legendas: Inglês (arquivo .srt)
- Sem edição profissional (screen recording simples)
- Mostrar fluxo completo end-to-end

**Vídeo 1: WhatsApp Complete Flow (3min)**
```
Conteúdo:
[0:00-0:30] Login no dashboard
[0:30-1:00] Clicar "Conectar WhatsApp" → OAuth Meta
[1:00-1:30] Configurar chatbot (system prompt, modelo)
[1:30-2:00] Enviar mensagem no WhatsApp (smartphone)
[2:00-2:30] Bot responde automaticamente
[2:30-3:00] Conversa aparece no dashboard

Arquivo: C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial\docs\videos\whatsapp-complete-flow.mp4
```

**Vídeo 2: Meta Ads CTWA Campaign (2.5min)**
```
Conteúdo:
[0:00-0:30] Dashboard /dashboard/meta-ads
[0:30-1:00] Clicar "Criar Campanha CTWA"
[1:00-1:30] Preencher formulário (objetivo, orçamento, público)
[1:30-2:00] Upload creative + texto do anúncio
[2:00-2:30] Publicar campanha → Aparece na lista

Arquivo: C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial\docs\videos\meta-ads-ctwa.mp4
```

**Vídeo 3: Conversions API (2min)**
```
Conteúdo:
[0:00-0:30] Configurar Dataset ID no dashboard
[0:30-1:00] Clicar em anúncio CTWA no smartphone → WhatsApp abre
[1:00-1:30] Enviar mensagem → Lead criado no CRM
[1:30-2:00] Mover card para "Fechado" → Evento Purchase enviado

Arquivo: C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial\docs\videos\conversions-api.mp4
```

**Vídeo 4: Instagram Multi-Channel (2min)**
```
Conteúdo:
[0:00-0:30] Conectar Instagram Business
[0:30-1:00] Enviar DM no Instagram (smartphone)
[1:00-1:30] Bot responde automaticamente
[1:30-2:00] Conversa aparece no dashboard unificado (mesma interface do WhatsApp)

Arquivo: C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial\docs\videos\instagram-messaging.mp4
```

---

### Documentos Adicionais

#### **Privacy Policy**
- **URL:** https://uzzap.uzzai.com.br/privacy
- **Idiomas:** Português (Brasil) + Inglês
- **Última atualização:** 13 de fevereiro de 2026
- **Conteúdo:** Conformidade LGPD + GDPR, uso de dados Meta, retenção, direito ao esquecimento

#### **Terms of Service**
- **URL:** https://uzzap.uzzai.com.br/terms
- **Idiomas:** Português (Brasil) + Inglês
- **Última atualização:** 13 de fevereiro de 2026
- **Conteúdo:** Condições de uso da plataforma, responsabilidades do cliente, SLA

#### **Data Processing Agreement (DPA)**
- **URL:** https://uzzap.uzzai.com.br/dpa
- **Idiomas:** Português (Brasil) + Inglês
- **Conteúdo:** Acordo de processamento de dados, lista de subprocessadores, cláusulas GDPR

#### **Transparency Report**
- **URL:** https://uzzap.uzzai.com.br/transparency
- **Idiomas:** Português (Brasil) + Inglês
- **Conteúdo:** Relatório anual de solicitações de autoridades, estatísticas anonimizadas

---

## 📝 Checklist Final - Antes de Submeter

### Configurações Básicas
- [ ] Plataformas adicionadas (Website, Android, iOS)
- [ ] Privacy Policy URL publicada e acessível
- [ ] Terms of Service URL publicada e acessível
- [ ] App Domain configurado (uzzap.uzzai.com.br)
- [ ] App Icon (1024x1024px) upload

### Questionários de Permissões
- [ ] WhatsApp (3 permissões) - todos os 3 questionários preenchidos
- [ ] Meta Ads (6 permissões) - todos os 6 questionários preenchidos
- [ ] Threads (10 permissões) - todos os 10 questionários preenchidos
- [ ] Instagram (3 permissões) - todos os 3 questionários preenchidos
- [ ] Compartilhadas (4 permissões) - todos os 4 questionários preenchidos

### Questões de Privacidade
- [ ] Operadores de dados listados (5 processadores)
- [ ] Controlador de dados definido (Uzz.Ai Ltda)
- [ ] Solicitações de autoridades públicas respondidas
- [ ] Políticas de proteção de dados documentadas

### Instruções para o Analista
- [ ] Overview do app escrito
- [ ] Fluxo de onboarding documentado
- [ ] Passo a passo de testes para cada permissão
- [ ] Credenciais de teste fornecidas
- [ ] Arquitetura técnica explicada
- [ ] Conformidade com políticas Meta detalhada
- [ ] Contato de suporte adicionado
- [ ] FAQ para analista preenchido

### Materiais de Suporte
- [ ] 8 screenshots criados e nomeados
- [ ] 4 vídeos gravados e renderizados
- [ ] Legendas em inglês (.srt) para cada vídeo
- [ ] Privacy Policy acessível
- [ ] Terms of Service acessível
- [ ] DPA publicado
- [ ] Transparency Report publicado

### Testes Finais
- [ ] WhatsApp bot respondendo corretamente
- [ ] Meta Ads campanha cria/pausa/retoma via API
- [ ] Conversions API enviando eventos
- [ ] Instagram DM sendo processado
- [ ] Instagram comment reply funcionando
- [ ] Threads publishing funcionando
- [ ] Dashboard unificado exibindo todos os canais
- [ ] Multi-tenant isolation testado (2 clientes diferentes)

---

## ⏱️ Timeline Estimado

**Preparação dos Materiais:** 2-3 dias
- Dia 1: Gravar screenshots + vídeos
- Dia 2: Preencher todos os questionários
- Dia 3: Revisar e submeter

**App Review:** 3-10 dias úteis (Meta)
- Meta pode solicitar informações adicionais
- Possível demo call com analista

**Total:** 5-13 dias até aprovação

---

## 🚀 Próximos Passos Após Aprovação

1. **Permissões vão para "Live"**
   - Todas as 26 permissões ficam ativas
   - Clientes podem começar a usar todos os produtos

2. **Anunciar no Site**
   - Adicionar badge "Meta Partner" no site
   - Blog post: "UzzApp agora com Instagram e Threads!"

3. **Onboarding de Clientes Existentes**
   - Email marketing para base atual
   - Migrar clientes do webhook legacy para webhook único

4. **Monitoramento**
   - Dashboard de métricas (quantos clientes por produto)
   - Suporte prioritário para novos recursos

5. **Registrar como Tech Provider**
   - Após aprovação, aplicar para Tech Provider
   - Prazo: até 30 de junho de 2025

---

**Última atualização:** 13 de fevereiro de 2026
**Documento:** META_APP_REVIEW_RESPOSTAS.md
**Versão:** 1.0

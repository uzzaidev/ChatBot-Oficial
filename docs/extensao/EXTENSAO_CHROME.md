# UzzApp — Extensão Chrome para WhatsApp Web

> Documento de planejamento, arquitetura e implementação da extensão Chrome CRM para WhatsApp Web.

**Data:** Fevereiro 2026  
**Status:** Planejamento  
**Prioridade:** Alta (impacto comercial significativo)

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Por que uma Extensão Chrome](#2-por-que-uma-extensão-chrome)
3. [Análise de Mercado — Como os Concorrentes Fazem](#3-análise-de-mercado--como-os-concorrentes-fazem)
4. [Modelo de Negócio Híbrido](#4-modelo-de-negócio-híbrido)
5. [Arquitetura Técnica](#5-arquitetura-técnica)
6. [Importação de Contatos e Histórico](#6-importação-de-contatos-e-histórico)
7. [Implementação por Fases](#7-implementação-por-fases)
8. [Código de Referência](#8-código-de-referência)
9. [Publicação na Chrome Web Store](#9-publicação-na-chrome-web-store)
10. [Riscos e Mitigações](#10-riscos-e-mitigações)
11. [FAQ](#11-faq)

---

## 1. Visão Geral

### O que é

Uma extensão Chrome que adiciona um **painel CRM lateral** dentro do WhatsApp Web (`web.whatsapp.com`), permitindo:

- CRM integrado (tags, funil, notas, score)
- Sugestões de resposta com IA
- Importação automática de contatos e histórico
- Respostas rápidas e templates
- Agendamento de mensagens
- Métricas e dashboard embutido

### O que NÃO é

- Não é um bot automático headless
- Não substitui a WhatsApp Business API (complementa)
- Não envia mensagens sem a presença do usuário
- Não viola termos do WhatsApp (é uma extensão de browser, como AdBlock ou Grammarly)

### Visão do produto final

```
┌────────────────────────────────────────────────────────────────────┐
│ 🌐 web.whatsapp.com                                    [UzzApp 📥]│
├────────────────────────────┬───────────────────┬───────────────────┤
│                            │                   │                   │
│  Lista de conversas        │  Chat aberto      │  SIDEBAR UZZAPP   │
│  (WhatsApp normal)         │  (WhatsApp normal)│                   │
│                            │                   │  👤 João Silva     │
│  🔍 Pesquisar...           │  João Silva       │  📱 +55 54 9999.. │
│                            │  ───────────────  │  🏷️ Cliente VIP   │
│  📥 IMPORTAR CONTATOS      │  Olá, tudo bem?   │  📊 Score: 85     │
│  ────────────────          │                   │                   │
│  João Silva          14:30 │  Tudo sim! Queria │  ── Histórico ──  │
│  Maria Souza         13:15 │  saber sobre o    │  Comprou em Jan   │
│  Pedro Costa         12:00 │  produto X...     │  Pediu orçamento  │
│  Ana Lima            11:45 │                   │  Follow-up pendente│
│  Carlos Pereira      10:30 │  [💡 IA sugere:]  │                   │
│  Fernanda Santos     09:20 │  "O produto X     │  ── Ações ──      │
│  ...                       │   custa R$199..." │  [📤 Enviar p/ CRM]│
│                            │  [Enviar] [Editar]│  [🤖 Pedir IA]    │
│                            │                   │  [📅 Agendar msg]  │
│                            │                   │  [🏷️ Add etiqueta] │
└────────────────────────────┴───────────────────┴───────────────────┘
```

---

## 2. Por que uma Extensão Chrome

### Comparação: Extensão vs Só API Oficial vs Bot Headless

| Aspecto                  | Extensão Chrome (proposta) | Só API oficial (atual)           | Bot headless (Baileys) |
| ------------------------ | -------------------------- | -------------------------------- | ---------------------- |
| **Setup pro cliente**    | Instala extensão → pronto  | Cria app Meta, configura webhook | Escaneia QR, instável  |
| **Troca de número**      | Não precisa                | Precisa dedicar número           | Não precisa            |
| **Risco de ban**         | Quase zero                 | Zero                             | Alto                   |
| **Barreira de entrada**  | Baixíssima                 | Alta                             | Média                  |
| **Bot 24/7 automático**  | Não (precisa humano)       | Sim                              | Sim                    |
| **Custo Meta**           | R$0                        | R$0.25-0.80/conversa             | R$0                    |
| **Confiabilidade**       | 99%+ (é o WA Web real)     | 99.9%+                           | 85-95%                 |
| **Aprovação necessária** | Google ($5)                | Meta Business                    | Nenhuma                |
| **Multi-atendente**      | Limitado (1 sessão)        | Ilimitado                        | Limitado               |

### Impacto comercial

- **Reduz barreira de entrada para zero**: Instala extensão → usa
- **Não exige conhecimento técnico do cliente**: Sem app Meta, sem webhooks
- **O cliente não perde contatos**: Usa o número que já tem
- **Upsell natural**: Começa na extensão, migra pra API quando cresce
- **Competitivo**: Mesmo modelo do ChatCenter, Cooby, WA Web Plus

---

## 3. Análise de Mercado — Como os Concorrentes Fazem

### ChatCenter (chatcenter.com.br)

- **Planos baratos (Grátis/Basic/Premium)**: Usam WhatsApp Web (não-oficial)
- **Plano Cloud (R$279,90/mês)**: WhatsApp Business API (oficial)
- **20.000+ usuários**
- **Funcionalidades**: CRM, chatbot, funil de vendas, múltiplos atendentes, API/webhooks

### Concorrentes na Chrome Web Store

| Extensão    | Downloads | Funcionalidades           |
| ----------- | --------- | ------------------------- |
| WA Web Plus | 2M+       | CRM, labels, templates    |
| Cooby CRM   | 100K+     | CRM lateral, pipeline     |
| WAToolkit   | 500K+     | Automação, templates      |
| Blueticks   | 1M+       | Agendamento, rastreamento |

### O que todos têm em comum

- Extensão Chrome sobre WhatsApp Web
- Leem o DOM da página
- Adicionam UI extra (sidebar, botões)
- Comunicam com backend próprio
- **Nenhum** tem aprovação do WhatsApp/Meta
- **Todos** estão aprovados na Chrome Web Store

### Como funcionam tecnicamente

#### Método 1: Bibliotecas de automação (servidor)

Usam `whatsapp-web.js` ou `Baileys` rodando em Node.js no servidor:

```
Servidor (Node.js)
  ├── Baileys / whatsapp-web.js
  │   ↕ WebSocket com servidores WhatsApp
  ├── Event System (message received, sent, etc.)
  ├── Webhook Dispatcher
  ├── CRM / Database
  └── IA (GPT, etc.)
```

- Risco ALTO de ban
- Usado nos planos baratos do ChatCenter

#### Método 2: Extensão Chrome com Content Script (overlay)

```
Chrome + WhatsApp Web (web.whatsapp.com)
  ├── Content Script (injeta JS na página)
  │   ├── MutationObserver (detecta mudanças no DOM)
  │   ├── Lê conversas e mensagens
  │   ├── Injeta painel CRM
  │   └── Botões de ação
  ├── Background Script (Service Worker)
  │   ├── Comunica com backend
  │   ├── Dispara webhooks
  │   └── Chama API de IA
  └── Sidebar (React app)
```

- Risco BAIXO — o WhatsApp Web funciona normalmente, a extensão só adiciona UI
- **Este é o método que vamos usar**

#### Espectro de risco

| Nível         | O que faz                                | Risco      | Exemplo                  |
| ------------- | ---------------------------------------- | ---------- | ------------------------ |
| 🟢 Baixo      | Só adiciona UI (sidebar, tags, notas)    | Quase zero | CRM lateral              |
| 🟡 Médio      | Lê mensagens do DOM + salva no banco     | Baixo      | Histórico, métricas      |
| 🟠 Alto       | Respostas rápidas (clica enviar via DOM) | Médio      | Templates com 1 clique   |
| 🔴 Muito alto | Bot automático headless (Baileys)        | Alto       | Auto-resposta sem humano |

**Nossa extensão opera níveis 🟢 e 🟡, com funcionalidades opcionais de 🟠.**

---

## 4. Modelo de Negócio Híbrido

### Estratégia de dois níveis (igual ChatCenter)

```
┌─────────────────────────────────────────────────────────┐
│                     PLANOS UZZAPP                        │
│                                                           │
│  ┌─────────────────────┐  ┌─────────────────────────┐   │
│  │  EXTENSÃO CHROME     │  │  API OFICIAL (CLOUD)     │   │
│  │  (Starter/Pro)       │  │  (Enterprise)             │   │
│  │                       │  │                           │   │
│  │  • CRM lateral        │  │  • Tudo da extensão      │   │
│  │  • Tags e funil       │  │  • Bot 24/7 automático   │   │
│  │  • IA (sugestões)     │  │  • Webhooks oficiais     │   │
│  │  • Templates          │  │  • Multi-atendente       │   │
│  │  • Importação         │  │  • Templates aprovados   │   │
│  │  • Métricas           │  │  • Alta escalabilidade   │   │
│  │                       │  │  • SLA garantido         │   │
│  │  Precisa: WA Web      │  │  Precisa: App Meta       │   │
│  │  aberto no browser    │  │  Funciona standalone     │   │
│  │                       │  │                           │   │
│  │  R$ 49-149/mês        │  │  R$ 249-499/mês          │   │
│  └─────────────────────┘  └─────────────────────────┘   │
│                                                           │
│  O cliente começa pela extensão e migra quando crescer   │
└─────────────────────────────────────────────────────────┘
```

### Fluxo de onboarding ideal

```
1. Cliente instala extensão Chrome (grátis ou trial)
2. Abre WhatsApp Web (já logado)
3. Extensão aparece → "Importar contatos para UzzApp"
4. 1 clique → importa contatos + histórico
5. CRM lateral funcionando em 5 minutos
6. Quando precisar bot 24/7 → migra pra plano API oficial
```

---

## 5. Arquitetura Técnica

### Estrutura de arquivos da extensão

```
uzzapp-chrome-extension/
├── manifest.json                 # Manifest V3 (config da extensão)
├── content-scripts/
│   ├── whatsapp-detector.js      # Detecta se está no WA Web
│   ├── dom-scanner.js            # Escaneia conversas e mensagens
│   ├── dom-interactor.js         # Clica, scrolla, navega
│   └── inject-ui.js              # Injeta sidebar/botões no WA Web
├── background/
│   └── service-worker.js         # Coordena tudo, comunica com backend
├── sidebar/                      # App React (mesma stack do dashboard)
│   ├── index.html
│   ├── App.tsx
│   ├── ImportPanel.tsx           # Tela de importação
│   ├── CRMPanel.tsx              # CRM lateral
│   ├── AIPanel.tsx               # Sugestões de IA
│   ├── SettingsPanel.tsx         # Configurações
│   └── components/               # Reutiliza do projeto principal
├── popup/
│   ├── popup.html                # Popup ao clicar no ícone
│   └── popup.js                  # Login, status, configs rápidas
├── styles/
│   └── sidebar.css               # Estilos da sidebar
├── utils/
│   ├── api.js                    # Comunicação com backend UzzApp
│   ├── storage.js                # chrome.storage (cache local)
│   └── selectors.js              # Seletores DOM do WA Web (CENTRALIZADOS)
└── icons/
    ├── uzzapp-16.png
    ├── uzzapp-48.png
    └── uzzapp-128.png
```

### manifest.json

```json
{
  "manifest_version": 3,
  "name": "UzzApp - CRM para WhatsApp",
  "version": "1.0.0",
  "description": "CRM, IA e automação direto no WhatsApp Web",
  "permissions": ["storage", "activeTab", "sidePanel"],
  "host_permissions": ["https://web.whatsapp.com/*"],
  "content_scripts": [
    {
      "matches": ["https://web.whatsapp.com/*"],
      "js": [
        "content-scripts/whatsapp-detector.js",
        "content-scripts/dom-scanner.js",
        "content-scripts/dom-interactor.js",
        "content-scripts/inject-ui.js"
      ],
      "css": ["styles/sidebar.css"],
      "run_at": "document_idle"
    }
  ],
  "background": {
    "service_worker": "background/service-worker.js"
  },
  "side_panel": {
    "default_path": "sidebar/index.html"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/uzzapp-16.png",
      "48": "icons/uzzapp-48.png",
      "128": "icons/uzzapp-128.png"
    }
  },
  "icons": {
    "16": "icons/uzzapp-16.png",
    "48": "icons/uzzapp-48.png",
    "128": "icons/uzzapp-128.png"
  }
}
```

### Diagrama de comunicação

```
┌─────────────────────────────────────────────────────────┐
│  Chrome Browser                                          │
│                                                           │
│  ┌─────────────────┐     ┌──────────────────────┐       │
│  │ Content Script   │────▶│ Background Worker     │       │
│  │ (no WA Web)      │◀────│ (service-worker.js)   │       │
│  │                   │     │                        │       │
│  │ • Lê DOM          │     │ • Coordena operações   │       │
│  │ • Injeta UI       │     │ • Cache local          │       │
│  │ • Detecta eventos │     │ • Queue de envio       │       │
│  └─────────────────┘     └──────────┬───────────┘       │
│                                      │                    │
│  ┌─────────────────┐                │ HTTPS              │
│  │ Sidebar (React)  │                │                    │
│  │                   │                │                    │
│  │ • CRM Panel       │                │                    │
│  │ • Import Panel    │                │                    │
│  │ • Métricas        │                │                    │
│  └─────────────────┘                │                    │
└──────────────────────────────────────┼────────────────────┘
                                       │
                                       ▼
                          ┌─────────────────────────┐
                          │  Backend UzzApp          │
                          │  (app.uzzapp.com)        │
                          │                           │
                          │  • Supabase (banco)       │
                          │  • API de IA              │
                          │  • CRM endpoints          │
                          │  • Importação endpoints   │
                          └─────────────────────────┘
```

### Seletores DOM centralizados

**CRÍTICO:** O WhatsApp Web pode mudar classes CSS a qualquer momento. Centralizar seletores facilita manutenção:

```javascript
// utils/selectors.js
// ATUALIZAR AQUI quando WhatsApp Web mudar o DOM
export const SELECTORS = {
  // Lista de conversas
  chatList: '[data-testid="chat-list"]',
  chatCell: '[data-testid="cell-frame-container"]',
  chatTitle: '[data-testid="cell-frame-title"]',
  chatLastMsg: '[data-testid="last-msg-status"]',
  chatTime: '[data-testid="cell-frame-primary-detail"]',
  chatUnread: '[data-testid="icon-unread-count"]',
  chatAvatar: 'img[data-testid="user-avatar"]',

  // Conversa aberta
  conversationHeader: '[data-testid="conversation-header"]',
  conversationPanel: '[data-testid="conversation-panel-messages"]',
  msgContainer: '[data-testid="msg-container"]',
  msgMeta: '[data-testid="msg-meta"]',
  selectableText: ".selectable-text",

  // Input e envio
  composeBox: '[data-testid="conversation-compose-box-input"]',
  sendButton: '[data-testid="send"]',

  // Info do contato
  contactInfoSubtitle: '[data-testid="contact-info-subtitle"]',
  drawerRight: '[data-testid="drawer-right"]',
  drawerClose: '[data-testid="btn-closer-drawer"]',

  // Mídia
  imageThumb: '[data-testid="image-thumb"]',
  audioPlayer: '[data-testid="audio-player"]',
  videoContent: '[data-testid="video-content"]',
  documentThumb: '[data-testid="document-thumb"]',

  // Grupos
  groupIcon: '[data-testid="default-group"]',

  // Status
  encryptionNotice: '[data-testid="encryption-notice"]',
};
```

### Utilitário de espera de elementos

```javascript
// utils/dom-helpers.js
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout waiting for: ${selector}`));
    }, timeout);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

---

## 6. Importação de Contatos e Histórico

### Visão geral do fluxo de importação

```
┌──────────────────────────────────────────────────────────────┐
│  FASE 1: Escaneia lista de conversas (sidebar do WA Web)     │
│  → Scrolla a lista inteira de chats                           │
│  → Extrai: nome, foto, última msg, horário                   │
│  → Resultado: "347 conversas encontradas"                    │
├──────────────────────────────────────────────────────────────┤
│  FASE 2: Cliente escolhe o que importar                      │
│  ☑ Todas (347)                                                │
│  ☑ Só com mensagens nos últimos 30 dias (89)                 │
│  ☐ Só contatos salvos (não grupos)                            │
│  ☐ Selecionar manualmente                                     │
├──────────────────────────────────────────────────────────────┤
│  FASE 3: Abre cada conversa e extrai dados                   │
│  → Clica na conversa programaticamente                        │
│  → Lê o número de telefone (perfil do contato)               │
│  → Scrolla pra cima pra carregar histórico                   │
│  → Extrai todas as mensagens visíveis                        │
│  → Progresso: [████████░░] 67/89 conversas                   │
├──────────────────────────────────────────────────────────────┤
│  FASE 4: Envia em lotes pro backend                          │
│  → POST /api/import/contacts                                  │
│  → POST /api/import/messages                                  │
│  → Progresso: "Enviando lote 3/7..."                         │
├──────────────────────────────────────────────────────────────┤
│  ✅ PRONTO!                                                   │
│  89 contatos importados | 12.847 mensagens importadas        │
└──────────────────────────────────────────────────────────────┘
```

### Métodos alternativos de importação de contatos

| Método                       | Facilidade pro cliente   | Implementação | Pega só WA?       | Automático |
| ---------------------------- | ------------------------ | ------------- | ----------------- | ---------- |
| **Extensão Chrome (WA Web)** | ⭐⭐⭐⭐ (1 clique)      | 2-3 dias      | Sim               | Sim        |
| **Google Contacts API**      | ⭐⭐⭐⭐⭐ (1 clique)    | 1 dia         | Não (toda agenda) | Sim        |
| **Upload .vcf/.csv**         | ⭐⭐⭐ (manual)          | Meio dia      | Não               | Não        |
| **Labels WA Business**       | ⭐⭐ (manual)            | 1 dia         | Sim (por label)   | Não        |
| **Exportar chat (.txt)**     | ⭐⭐ (manual, 1 por vez) | 1 dia         | Sim               | Não        |
| **Backup Google Drive**      | ⭐ (complexo)            | 1 semana      | Sim               | Não        |

**Recomendação:** Implementar ExtensãoChrome + Google Contacts API + Upload arquivo.

### FASE 1 — Escanear lista de conversas

```javascript
// content-scripts/dom-scanner.js

async function scanAllConversations() {
  const chatList = document.querySelector(SELECTORS.chatList);
  const conversations = new Map();

  let previousCount = 0;
  let scrollAttempts = 0;

  while (scrollAttempts < 100) {
    const chatCells = chatList.querySelectorAll(SELECTORS.chatCell);

    chatCells.forEach((cell) => {
      const name = cell
        .querySelector(SELECTORS.chatTitle)
        ?.querySelector("span")?.textContent;
      const lastMsg = cell.querySelector(SELECTORS.chatLastMsg)?.textContent;
      const time = cell.querySelector(SELECTORS.chatTime)?.textContent;
      const unread = cell.querySelector(SELECTORS.chatUnread)?.textContent;
      const avatar = cell.querySelector(SELECTORS.chatAvatar)?.src;
      const isGroup = !!cell.querySelector(SELECTORS.groupIcon);

      if (name && !conversations.has(name)) {
        conversations.set(name, {
          name,
          lastMessage: lastMsg,
          lastMessageTime: time,
          unreadCount: parseInt(unread) || 0,
          avatarUrl: avatar,
          isGroup,
          element: cell,
        });
      }
    });

    if (conversations.size === previousCount) {
      scrollAttempts++;
      if (scrollAttempts > 5) break;
    } else {
      scrollAttempts = 0;
    }
    previousCount = conversations.size;

    chatList.scrollTop += 500;
    await sleep(300);

    updateProgress(`Escaneando... ${conversations.size} conversas encontradas`);
  }

  return Array.from(conversations.values());
}
```

### FASE 3 — Extrair dados de cada conversa

```javascript
async function extractConversationData(conversation, options) {
  // 1. CLICAR NA CONVERSA
  conversation.element.click();
  await sleep(800);

  // 2. PEGAR O NÚMERO DE TELEFONE
  const header = document.querySelector(SELECTORS.conversationHeader);
  const nameInHeader = header.querySelector('span[dir="auto"]');
  nameInHeader.click();
  await sleep(600);

  const phoneElement = document.querySelector(
    `${SELECTORS.drawerRight} ${SELECTORS.contactInfoSubtitle}`,
  );
  const phone = phoneElement?.textContent?.replace(/\D/g, "") || null;

  const photoElement = document.querySelector(
    `${SELECTORS.drawerRight} ${SELECTORS.chatAvatar}`,
  );
  const photoUrl = photoElement?.src;

  document.querySelector(SELECTORS.drawerClose)?.click();
  await sleep(300);

  // 3. EXTRAIR MENSAGENS
  const messages = [];
  const messageContainer = document.querySelector(SELECTORS.conversationPanel);

  const maxScroll =
    options.historyDays === 7
      ? 20
      : options.historyDays === 30
      ? 60
      : options.historyDays === 90
      ? 150
      : 500;

  let scrollAttempts = 0;
  while (scrollAttempts < maxScroll) {
    messageContainer.scrollTop = 0;
    await sleep(400);

    const encryptionNotice = document.querySelector(SELECTORS.encryptionNotice);
    if (encryptionNotice) break;

    scrollAttempts++;
    updateProgress(`Carregando histórico... (scroll ${scrollAttempts})`);
  }

  const msgElements = document.querySelectorAll(SELECTORS.msgContainer);

  for (const msgEl of msgElements) {
    const msg = extractSingleMessage(msgEl);
    if (msg) messages.push(msg);
  }

  return {
    contact: {
      name: conversation.name,
      phone,
      photoUrl,
      isGroup: conversation.isGroup,
    },
    messages,
    metadata: {
      totalMessages: messages.length,
      firstMessage: messages[0]?.timestamp,
      lastMessage: messages[messages.length - 1]?.timestamp,
    },
  };
}

function extractSingleMessage(msgEl) {
  const isFromMe = msgEl.closest(".message-out") !== null;

  const textEl = msgEl.querySelector(SELECTORS.selectableText);
  const text = textEl?.innerText;

  const timeEl = msgEl.querySelector(SELECTORS.msgMeta);
  const time = timeEl?.textContent;

  let type = "text";
  let mediaUrl = null;

  if (msgEl.querySelector(SELECTORS.imageThumb)) {
    type = "image";
    mediaUrl = msgEl.querySelector('img[src*="blob:"]')?.src;
  } else if (msgEl.querySelector(SELECTORS.audioPlayer)) {
    type = "audio";
  } else if (msgEl.querySelector(SELECTORS.videoContent)) {
    type = "video";
  } else if (msgEl.querySelector(SELECTORS.documentThumb)) {
    type = "document";
  }

  const reactions = Array.from(
    msgEl.querySelectorAll('[data-testid="reaction"] span'),
  ).map((r) => r.textContent);

  const quotedEl = msgEl.querySelector('[data-testid="quoted-message"]');
  const quotedText = quotedEl?.querySelector(
    SELECTORS.selectableText,
  )?.innerText;

  return {
    text,
    type,
    mediaUrl,
    isFromMe,
    timestamp: time,
    reactions: reactions.length ? reactions : undefined,
    quotedMessage: quotedText || undefined,
  };
}
```

### FASE 4 — Enviar pro backend

```javascript
async function sendToBackend(conversationsData, clientId, userToken) {
  const BATCH_SIZE = 10;
  const batches = chunk(conversationsData, BATCH_SIZE);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    updateProgress(`Enviando lote ${i + 1}/${batches.length}...`);

    // Contatos
    const contacts = batch.map((c) => c.contact);
    await fetch("https://app.uzzapp.com/api/import/contacts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ clientId, contacts }),
    });

    // Mensagens (por conversa)
    for (const conv of batch) {
      if (conv.messages.length === 0) continue;

      await fetch("https://app.uzzapp.com/api/import/messages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId,
          phone: conv.contact.phone,
          contactName: conv.contact.name,
          messages: conv.messages,
        }),
      });
    }

    await sleep(500); // Rate limiting
  }

  return { success: true, totalContacts: conversationsData.length };
}

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
```

### Tempo estimado de importação

| Cenário | Conversas | Tempo estimado |
| ------- | --------- | -------------- |
| Pequeno | ~50       | 2-3 minutos    |
| Médio   | ~200      | 8-12 minutos   |
| Grande  | ~500      | 20-30 minutos  |
| Enorme  | ~1000+    | 40-60 minutos  |

### Sobre backups do WhatsApp

O WhatsApp Business faz backup para Google Drive (Android) ou iCloud (iOS). Os backups são **criptografados (E2E)** e a chave fica nos servidores do WhatsApp, não no Google Drive.

**Por isso a extensão Chrome é a melhor forma de importar:** ela lê diretamente o que está na tela do WA Web, sem precisar lidar com criptografia de backup.

| Método de backup             | Acessível?                   | Prático?                       |
| ---------------------------- | ---------------------------- | ------------------------------ |
| Google Drive (backup E2E)    | Precisa da chave do WhatsApp | Não                            |
| Google Drive (sem E2E)       | Acessível via API            | Raro (maioria tem E2E ativado) |
| Celular com ROOT             | Sim                          | Não (cliente não fará root)    |
| Google Takeout               | Sim (manual)                 | Lento e confuso                |
| **Extensão Chrome (WA Web)** | **Sim, direto**              | **Sim, 1 clique**              |

---

## 7. Implementação por Fases

### Fase 1 — MVP (Semana 1-2)

**Objetivo:** Extensão funcional com sidebar CRM básica

| Feature                             | Estimativa  | Prioridade |
| ----------------------------------- | ----------- | ---------- |
| Manifest V3 + estrutura base        | 1 dia       | P0         |
| Content script detecta WA Web       | 0.5 dia     | P0         |
| Sidebar estática (branding + login) | 1 dia       | P0         |
| Lê nome/contato da conversa aberta  | 1 dia       | P0         |
| Mostra info do contato na sidebar   | 1 dia       | P0         |
| Auth com backend (Supabase)         | 1 dia       | P0         |
| Tags e notas por contato            | 2 dias      | P0         |
| **Total Fase 1**                    | **~7 dias** |            |

### Fase 2 — Importação (Semana 2-3)

| Feature                               | Estimativa  | Prioridade |
| ------------------------------------- | ----------- | ---------- |
| Scan da lista de conversas            | 1 dia       | P0         |
| Extração de telefone (perfil)         | 1 dia       | P0         |
| Extração de histórico de mensagens    | 2 dias      | P0         |
| UI de seleção/filtro de conversas     | 1 dia       | P1         |
| Envio em lotes pro backend            | 1 dia       | P0         |
| API endpoints de importação (backend) | 1 dia       | P0         |
| Barra de progresso                    | 0.5 dia     | P1         |
| **Total Fase 2**                      | **~7 dias** |            |

### Fase 3 — IA + Templates (Semana 3-4)

| Feature                                   | Estimativa   | Prioridade |
| ----------------------------------------- | ------------ | ---------- |
| Sugestão de resposta com IA               | 2 dias       | P1         |
| Respostas rápidas (templates)             | 2 dias       | P1         |
| Funil de vendas (etapas na sidebar)       | 2 dias       | P1         |
| Agendamento de mensagens                  | 3 dias       | P2         |
| Métricas inline (total msgs, tempo resp.) | 1 dia        | P2         |
| **Total Fase 3**                          | **~10 dias** |            |

### Fase 4 — Polimento + Publicação (Semana 4-5)

| Feature                                | Estimativa  | Prioridade |
| -------------------------------------- | ----------- | ---------- |
| Testes de edge cases                   | 2 dias      | P0         |
| Política de privacidade                | 0.5 dia     | P0         |
| Screenshots e materiais                | 0.5 dia     | P0         |
| Publicação Chrome Web Store            | 1 dia       | P0         |
| Google Contacts API (importação extra) | 1 dia       | P1         |
| Upload .vcf/.csv                       | 0.5 dia     | P2         |
| **Total Fase 4**                       | **~5 dias** |            |

### Timeline total: ~4-5 semanas para lançamento

---

## 8. Código de Referência

### Extensão mínima (3 arquivos, 25 linhas)

```json
// manifest.json
{
  "manifest_version": 3,
  "name": "UzzApp",
  "version": "1.0",
  "content_scripts": [
    {
      "matches": ["https://web.whatsapp.com/*"],
      "js": ["content.js"],
      "css": ["styles.css"]
    }
  ]
}
```

```javascript
// content.js
const sidebar = document.createElement("div");
sidebar.id = "uzzapp-sidebar";
sidebar.innerHTML = "<h2>UzzApp CRM</h2><p>Funcionando!</p>";
document.body.appendChild(sidebar);
```

```css
/* styles.css */
#uzzapp-sidebar {
  position: fixed;
  right: 0;
  top: 0;
  width: 300px;
  height: 100vh;
  background: white;
  z-index: 99999;
  padding: 16px;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
}
```

### Detectar nova mensagem (MutationObserver)

```javascript
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.classList?.contains("message-in")) {
        const text = node.querySelector(".selectable-text")?.innerText;
        const contact = getCurrentContact();

        chrome.runtime.sendMessage({
          type: "NEW_MESSAGE",
          data: { text, contact, timestamp: Date.now() },
        });
      }
    });
  });
});

observer.observe(document.querySelector("#main .copyable-area"), {
  childList: true,
  subtree: true,
});
```

### Enviar mensagem via DOM

```javascript
function sendMessage(text) {
  const input = document.querySelector(SELECTORS.composeBox);

  // Foca no input
  input.focus();

  // Insere texto (simula digitação)
  document.execCommand("insertText", false, text);

  // Dispara evento de input
  input.dispatchEvent(new InputEvent("input", { bubbles: true }));

  // Espera o botão de enviar aparecer e clica
  setTimeout(() => {
    const sendBtn = document.querySelector(SELECTORS.sendButton);
    if (sendBtn) sendBtn.click();
  }, 100);
}
```

### Sidebar React com Plasmo

```typescript
// Com framework Plasmo (recomendado)
import type { PlasmoCSConfig } from "plasmo";

export const config: PlasmoCSConfig = {
  matches: ["https://web.whatsapp.com/*"],
};

export default function UzzAppSidebar() {
  const [contact, setContact] = useState(null);
  const [tags, setTags] = useState([]);

  useEffect(() => {
    // Observa mudança de conversa ativa
    const observer = new MutationObserver(() => {
      const header = document.querySelector(
        '[data-testid="conversation-header"]',
      );
      const name = header?.querySelector("span")?.textContent;
      if (name) setContact({ name });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      style={{ width: 300, height: "100vh", background: "white", padding: 16 }}
    >
      <h2>UzzApp CRM</h2>
      {contact && (
        <>
          <h3>{contact.name}</h3>
          <TagManager tags={tags} onUpdate={setTags} />
          <NotesPanel contact={contact} />
          <FunnelStage contact={contact} />
          <AIAssistant contact={contact} />
        </>
      )}
    </div>
  );
}
```

---

## 9. Publicação na Chrome Web Store

### Requisitos

| Item                          | Detalhes                                   | Custo               |
| ----------------------------- | ------------------------------------------ | ------------------- |
| Conta de desenvolvedor Google | Cadastro único                             | **$5** (taxa única) |
| Política de privacidade       | Página HTML/URL explicando coleta de dados | Grátis              |
| Screenshots                   | Mín. 1 screenshot (1280x800 ou 640x400)    | Grátis              |
| Ícone                         | 128x128 PNG                                | Grátis              |
| Descrição                     | 2-3 parágrafos sobre o que faz             | Grátis              |

### Processo

1. Acessar [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Pagar taxa de $5 (uma vez)
3. Subir .zip da extensão
4. Preencher informações (nome, descrição, screenshots)
5. Indicar URL da política de privacidade
6. Submeter para revisão
7. **Aprovação em 1-3 dias úteis**

### Aprovações necessárias

| Quem                | Precisa? | Observação                     |
| ------------------- | -------- | ------------------------------ |
| **Google**          | **Sim**  | 1-3 dias, $5                   |
| WhatsApp / Meta     | **Não**  | Extensão é software de browser |
| Governo / regulador | **Não**  | —                              |
| Apple               | **Não**  | Só se fizer pra Safari         |

### O que o Google verifica

- ✅ Não tem malware
- ✅ Faz o que a descrição diz
- ✅ Tem política de privacidade
- ✅ Não coleta dados sem avisar
- ✅ Permissões justificadas

### O que o Google NÃO verifica

- Se tem "autorização" do site alvo (nenhuma extensão tem — AdBlock, Grammarly, etc.)
- Se modifica a interface de outro site (é literalmente pra isso que content scripts existem)

### Modelo de política de privacidade

```
Política de Privacidade — UzzApp

A extensão UzzApp lê dados de conversas do WhatsApp Web com sua
permissão explícita para funcionamento do CRM integrado.

Dados coletados:
- Nome de contatos e conversas
- Números de telefone
- Conteúdo de mensagens (quando o usuário autoriza importação)
- Métricas de uso da extensão

Armazenamento:
- Dados são enviados para servidores seguros (Supabase/PostgreSQL)
- Criptografia em trânsito (HTTPS) e em repouso
- Acesso restrito ao proprietário da conta

Não fazemos:
- Venda de dados a terceiros
- Coleta sem consentimento explícito
- Monitoramento em background (extensão só funciona com WA Web aberto)

Contato: privacidade@uzzapp.com
```

---

## 10. Riscos e Mitigações

### Risco 1: WhatsApp Web muda o DOM

|                   |                                                           |
| ----------------- | --------------------------------------------------------- |
| **Probabilidade** | Alta (acontece 2-3x por ano)                              |
| **Impacto**       | Extensão para de funcionar parcialmente                   |
| **Mitigação**     | Seletores centralizados em `selectors.js` — update rápido |
| **Tempo de fix**  | 1-4 horas                                                 |

### Risco 2: Google remove da Chrome Web Store

|                   |                                                                |
| ----------------- | -------------------------------------------------------------- |
| **Probabilidade** | Muito baixa (dezenas de extensões WA existem há anos)          |
| **Impacto**       | Alto (perde canal de distribuição)                             |
| **Mitigação**     | Distribuição alternativa (download direto, modo desenvolvedor) |
| **Plano B**       | Publicar no Firefox Add-ons e Edge Add-ons também              |

### Risco 3: WhatsApp bloqueia extensões

|                   |                                                         |
| ----------------- | ------------------------------------------------------- |
| **Probabilidade** | Muito baixa (quebraria milhões de extensões)            |
| **Impacto**       | Alto                                                    |
| **Mitigação**     | Modelo híbrido — clientes podem migrar pra API oficial  |
| **Contexto**      | O WA Web nunca bloqueou extensões, apenas bots headless |

### Risco 4: Performance do WA Web

|                   |                                                               |
| ----------------- | ------------------------------------------------------------- |
| **Probabilidade** | Baixa                                                         |
| **Impacto**       | Médio (UX degradada)                                          |
| **Mitigação**     | Sidebar leve, operações de scan sob demanda (não automáticas) |

---

## 11. FAQ

### É oficial / autorizado pelo WhatsApp?

Não, assim como nenhuma extensão Chrome é "autorizada" pelo site que modifica. AdBlock não é autorizado pelo YouTube, Grammarly não é autorizado pelo Gmail. É uma extensão de browser — software do usuário rodando no computador dele.

### Pode levar a banimento do número?

**Risco extremamente baixo.** A extensão lê o que está na tela e adiciona UI. O WhatsApp vê uma sessão normal do WA Web. Não é um bot headless enviando mensagens em massa.

### Funciona com WhatsApp pessoal ou só Business?

**Funciona com os dois.** O WhatsApp Web é o mesmo para pessoal e Business.

### Funciona no celular?

Não nativamente. Extensões Chrome são para desktop. Mas o CRM pode ser acessado via nosso dashboard web (app.uzzapp.com) de qualquer dispositivo.

### E se o WhatsApp Web ficar offline?

A extensão só funciona com WA Web aberto. Para bot 24/7, o cliente precisa do plano API oficial.

### Quanto custa manter?

- Infraestrutura: Zero adicional (usa mesmo backend)
- Manutenção: ~2-4h por atualização do DOM do WA Web (2-3x por ano)
- Chrome Web Store: $5 (taxa única)

### Reutilizamos código do projeto atual?

Sim:

- Supabase (banco, auth, realtime)
- Componentes React (CRM, conversas, métricas)
- Hooks (useConversations, useMessages)
- Types TypeScript
- Lógica de IA (como sugestão)
- API endpoints

---

## Ferramentas de desenvolvimento recomendadas

| Ferramenta          | Pra quê                                      | URL                   |
| ------------------- | -------------------------------------------- | --------------------- |
| **Plasmo**          | Framework para extensões Chrome (React + TS) | plasmo.com            |
| **WXT**             | Alternativa ao Plasmo (mais leve)            | wxt.dev               |
| **CRXJS**           | Plugin Vite para extensões (hot reload)      | crxjs.dev             |
| **Chrome DevTools** | Debug da extensão                            | `chrome://extensions` |

### Setup de desenvolvimento

```bash
# Com Plasmo (recomendado)
npm create plasmo -- --with-react --with-typescript
cd uzzapp-chrome-extension
npm install
npm run dev   # Hot reload no Chrome

# OU com WXT
npx wxt@latest init uzzapp-extension --template react
cd uzzapp-extension
npm install
npm run dev
```

---

## Conclusão

A extensão Chrome é **a feature de maior impacto comercial com menor esforço técnico** que podemos implementar:

- **3-4 semanas** de desenvolvimento
- **$5** de custo de publicação
- **Zero barreira de entrada** pro cliente
- **Reutiliza** toda nossa infra existente
- **Compete** diretamente com ChatCenter, Cooby, etc.
- **Upsell natural** para plano API oficial

O modelo híbrido (extensão + API) é a mesma estratégia usada pelos líderes do mercado e permite capturar clientes de todos os tamanhos.

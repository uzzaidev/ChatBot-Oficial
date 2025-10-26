# Plano de Arquitetura SaaS WhatsApp – Resumão (n8n → Next.js)

> **Objetivo**: Consolidar todo o plano para construir um SaaS de mensageria/IA no WhatsApp, iniciando com o **n8n** como backend, evoluindo para **frontend Next.js** (dashboard) e, por fim, migrando gradualmente toda a lógica para **Next.js (API Routes)** com stack TS + Supabase + Redis + OpenAI.

---

## Sumário
1. **Fase 0 – Contexto & Premissas**
2. **Fase 1 – Backend 100% no n8n**
3. **Fase 2 – Frontend Next.js (Dashboard) + n8n**
4. **Fase 3 – Migração para Next.js (Full Code)**
5. **Arquitetura Multi-Cliente (Webhook por cliente)**
6. **RAG & Base de Conhecimento (onde mora a “inteligência”)**
7. **Custos, Métricas e Billing (OpenAI + Meta)**
8. **Atendimento Híbrido (Bot → Humano) no mesmo número**
9. **Concorrência e Escalabilidade**
10. **Estrutura de Pastas Next.js**
11. **Modelagem de Dados (Supabase)**
12. **Variáveis de Ambiente vs Config por Cliente**
13. **Roteamento de Webhook: um por cliente vs global**
14. **Roadmap de Entrega e Checklist**

---

## 1) Fase 0 – Contexto & Premissas
- Objetivo: construir um **mini‑SaaS** similar ao n8n/ManyChat, com **webhooks** da Meta (WhatsApp Cloud API), **IA (OpenAI)**, **Supabase** e **dashboard**.
- Linguagem/stack-alvo: **Next.js 14 (App Router) + TypeScript**, hospedado na **Vercel**.
- Banco: **Supabase (Postgres)**. Cache/filas: **Redis (Upstash)** quando necessário.
- IA via **OpenAI API**. RAG opcional com embeddings no **Supabase Vector**.
- **Multi‑tenant**: um código de fluxo compartilhado; **config por cliente** (tokens, preferências, modelos etc.).

---

## 2) Fase 1 – Backend 100% no n8n
**Estado atual**: o n8n recebe webhook da Meta, processa IA, envia respostas e grava no banco (idealmente Supabase).

### Fluxo
```
WhatsApp → Webhook (n8n) → Nós (OpenAI, regras, etc.) → Envio pela Meta API → (opcional) grava em Supabase
```

### Boas práticas
- Persistir **todas as mensagens** (entrada/saída) no Supabase.
- Padronizar estrutura de payloads para facilitar o consumo pelo futuro frontend.
- Isolar variáveis sensíveis no n8n (credenciais por cliente).

---

## 3) Fase 2 – Frontend Next.js (Dashboard) + n8n
**Objetivo**: criar o **painel web** para visualizar conversas/uso e **acionar** o backend n8n (sem reescrever a automação).

### Conexão Front ↔ n8n (3 opções)
1. **Webhook HTTP direto**: Next envia `POST` para webhooks do n8n (ex.: `send_message`).
2. **Leitura direta do banco**: Next lê do Supabase as tabelas que o n8n preenche.
3. **Endpoints de dados no n8n**: criar rotas REST no n8n (GET `/messages`, etc.).

> Recomendada: **Leitura direta no Supabase** + **envio de comandos via webhooks n8n**.

### Funcionalidades do Dashboard (MVP)
- Lista de conversas (com filtro por cliente, status, período).
- Detalhe da conversa (histórico em timeline). Realtime via **Supabase Realtime**.
- Indicadores: total de mensagens, falhas, consumo estimado.
- Ações: enviar mensagem manual (Next → webhook n8n), transferir para humano (setar `status`).

### Fluxograma Fase 2
```
Usuário → WhatsApp → Webhook (n8n)
                           ↓
                     Supabase (mensagens, status)
                           ↓
                  Next.js Dashboard (consulta)
                           ↓
          (ações) Next → Webhook n8n → Envio pela Meta
```

---

## 4) Fase 3 – Migração para Next.js (Full Code)
**Objetivo**: mover nós críticos do n8n para **código TypeScript** (API Routes) mantendo a mesma experiência.

### Arquitetura alvo
- **API Routes** do Next.js para:
  - **/api/webhook/[clientId]** → recebe eventos da Meta.
  - **/api/messages** → enviar/consultar mensagens.
  - **/api/usage** → registrar e consultar consumo.
- **Flows**: um ou mais arquivos que orquestram **nodes** reutilizáveis (funções puras TS).
- **Nodes**: módulos atômicos (webhookHandler, parseMessage, openaiGenerate, saveToSupabase, sendToMeta...).
- **Config por cliente** carregada no início de cada request (nunca global).

### Execução típica (Full Code)
```
/api/webhook/[clientId]
  → getClientConfig(clientId)
  → chatbotFlow(req, config)
      1) webhookHandler
      2) parseMessage
      3) (opcional) detectIntent/enrichWithContext (RAG)
      4) openaiGenerate
      5) saveToSupabase
      6) sendToMeta
  → resposta 200 { received: true }
```

### Deploy
- Hospedar na **Vercel**. Evitar tarefas longas em API Route (usar filas/workers quando necessário).
- Para alto volume: **Upstash Queue / Supabase Functions / Cloudflare Workers** processando assíncrono.

---

## 5) Arquitetura Multi‑Cliente (Webhook por cliente)

### Rota dinâmica recomendada
```
/app/api/webhook/[clientId]/route.ts
```
- Cada cliente possui **URL única**;
- GET: validação do webhook (hub.verify_token) com token do cliente;
- POST: processamento do evento com **config** específica.

### Alternativa
- **Webhook único** (`/api/webhook`) + roteamento por `app_id/phone_number_id` do payload.
- Útil para centenas de clientes; maior complexidade de roteamento/segurança.

> **Recomendação para agora**: **um webhook por cliente** (mais simples, seguro e debuggável).

---

## 6) RAG & Base de Conhecimento
- O **conhecimento** mora no **banco** (Supabase/Pinecone/Redis Vector), não no código.
- Pipeline RAG (simples em TS):
  1. Gera **embeddings** da pergunta;
  2. Busca top‑K trechos no **vector store**;
  3. Monta **contexto** e chama a LLM;
  4. Responde e registra no histórico.
- Ingestão/atualização pode rodar por job (cron) ou endpoint de admin.

---

## 7) Custos, Métricas e Billing
- **OpenAI**: usar `usage.total_tokens` das respostas para registrar consumo por cliente.
- **Meta (WhatsApp)**: custo por **janela de conversa (24h)**; registrar mensagens enviadas e estimativa/relatório por cliente.
- Tabela **`usage_logs`** com `client_id`, `source`, `tokens_used`, `messages_sent`, `cost_usd`, `created_at`.
- Dashboard: KPIs + gráficos por período e por cliente; planos/limites/alertas.

---

## 8) Atendimento Híbrido (Bot → Humano) no mesmo número
- Alternar status da conversa: `status = "bot" | "waiting" | "human"`.
- Quando **humano assume**, as mensagens saem **via API** com o mesmo número (cobrança igual), enviadas pelo painel.
- Permitir “devolver ao bot”.

Fluxo:
```
Webhook → IA decide (ou atendente clica) → status = human
Dashboard envia POST → API Meta → Usuário
```

---

## 9) Concorrência e Escalabilidade
- **Serverless**: cada request é isolada; múltiplos clientes podem disparar o mesmo fluxo simultaneamente.
- **Banco**: Postgres/Supabase lida com múltiplos inserts em paralelo (use `client_id` em todas as tabelas).
- **Não usar estado global**; passar `config` por request.
- Para picos: enfileirar processamento; usar workers.

---

## 10) Estrutura de Pastas (Next.js 14 + TS)
```bash
src/
  app/
    api/
      webhook/
        [clientId]/
          route.ts            # GET (verificação) / POST (eventos)
      usage/route.ts          # registrar/consultar consumo
      messages/route.ts       # enviar/listar mensagens
      clients/route.ts        # CRUD de clientes
    dashboard/
      page.tsx                # visão geral
      [clientId]/page.tsx     # visão por cliente
      components/             # cards, tabelas, gráficos
    layout.tsx
    page.tsx                  # landing/login

  flows/
    chatbotFlow.ts            # fluxo principal (orquestra nodes)
    onboardingFlow.ts
    supportFlow.ts
    index.ts                  # registry de fluxos

  nodes/                      # funções puras reutilizáveis
    webhookHandler.ts
    parseMessage.ts
    openaiGenerate.ts
    saveToSupabase.ts
    sendToMeta.ts
    detectIntent.ts
    enrichWithContext.ts

  lib/
    clients.ts                # getClientConfig(clientId)
    supabase.ts               # cliente supabase
    redis.ts                  # conexão redis
    openai.ts                 # sdk openai
    meta.ts                   # helpers meta graph

  types/
    client.ts
    flow.ts
    message.ts
    usage.ts

  utils/
    logger.ts
    billing.ts
    errors.ts
    constants.ts
```

---

## 11) Modelagem de Dados (Supabase)

### `clients`
- `id (uuid)`
- `name (text)`
- `verify_token (text)` – validação da Meta
- `meta_access_token (text)`
- `phone_number_id (text)`
- `openai_api_key (text)` – opcional (chave por cliente)
- `created_at (timestamptz)`

### `messages`
- `id (uuid)`
- `client_id (uuid)` → FK `clients.id`
- `phone (text)`
- `name (text)`
- `content (text)`
- `type (text)` – `text|audio|image|...`
- `direction (text)` – `incoming|outgoing`
- `status (text)` – `sent|failed|queued`
- `timestamp (timestamptz)`

### `conversations`
- `id (uuid)`
- `client_id (uuid)`
- `phone (text)`
- `status (text)` – `bot|waiting|human`
- `assigned_to (text)` – atendente atual
- `last_message (text)`
- `last_update (timestamptz)`

### `usage_logs`
- `id (uuid)`
- `client_id (uuid)`
- `source (text)` – `openai|meta`
- `tokens_used (int)`
- `messages_sent (int)`
- `cost_usd (numeric)`
- `created_at (timestamptz)`

Índices recomendados: `messages(client_id, phone, timestamp)`, `usage_logs(client_id, created_at)`.

---

## 12) Variáveis de Ambiente vs Config por Cliente
- **Não** usar `.env` para tokens por cliente (escala ruim). Use `.env` apenas para credenciais **globais** (ex.: URL do Supabase).
- Guardar **tokens por cliente** no banco (criptografados quando possível) e carregá-los por `clientId` a cada request.
- Função utilitária:
```ts
// lib/clients.ts
export async function getClientConfig(clientId: string) {
  // busca tokens e preferências do cliente no Supabase
  return {
    META_ACCESS_TOKEN,
    OPENAI_API_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL!,
    SUPABASE_KEY: process.env.SUPABASE_KEY!
  };
}
```

---

## 13) Roteamento de Webhook: um por cliente vs global

### Webhook por cliente (recomendado agora)
- Rota: `/api/webhook/[clientId]`.
- **Prós**: isolamento, segurança, logs simples, debug fácil.
- **Contras**: precisa configurar 1 URL por cliente na Meta.

### Webhook único
- Rota: `/api/webhook` + mapear `app_id/phone_number_id` → `client_id`.
- **Prós**: 1 configuração na Meta para todos.
- **Contras**: roteamento mais complexo, debug mais difícil.

---

## 14) Roadmap de Entrega e Checklist

### Fase 1 – (já)
- [ ] Consolidar fluxos no n8n.
- [ ] Garantir gravação de mensagens no Supabase.
- [ ] Criar tabela `clients` e separar dados por `client_id`.

### Fase 2 – Dashboard Next.js
- [ ] App Next.js (Vercel) + Auth (Supabase Auth).
- [ ] Páginas: `/dashboard`, `/dashboard/[clientId]`.
- [ ] Listagem de conversas (realtime) e detalhe de conversa.
- [ ] Envio manual: Next → webhook n8n.
- [ ] Métricas iniciais (contadores, falhas, últimas mensagens).

### Fase 3 – Migração gradual para código
- [ ] Criar `/api/webhook/[clientId]` (GET/POST) em Next.
- [ ] Implementar **nodes** (TS) e **flows** (orquestrador).
- [ ] Substituir nós do n8n por chamadas TS (por etapas).
- [ ] Implementar **usage logs** (OpenAI/Meta) + dashboard de custos.
- [ ] Introduzir **fila/worker** para picos (se necessário).

---

## Anexos – Snippets úteis

### Validação do Webhook (GET)
```ts
export async function GET(req: Request, { params }: { params: { clientId: string } }) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const cfg = await getClientConfig(params.clientId);
  if (mode === 'subscribe' && token === cfg.VERIFY_TOKEN) return new Response(challenge, { status: 200 });
  return new Response('Forbidden', { status: 403 });
}
```

### Recebimento de mensagens (POST)
```ts
export async function POST(req: Request, { params }: { params: { clientId: string } }) {
  const cfg = await getClientConfig(params.clientId);
  const data = await req.json();
  // parse + persist + (IA opcional) + resposta
  return Response.json({ received: true });
}
```

### Envio via Meta Graph
```ts
await fetch(`https://graph.facebook.com/v20.0/${cfg.phone_number_id}/messages`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${cfg.META_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, text: { body: content } })
});
```

---

### Conclusão
- **Sim**, é totalmente viável começar com **n8n** como backend e **Next.js** como dashboard, e **migrar aos poucos** para um backend 100% em código.
- **Ponto‑chave**: manter **multi‑tenant** com `client_id`, **webhook por cliente** (nesse momento) e **config por cliente carregada por request**.
- Com essa base, é simples escalar para mais clientes, adicionar RAG, métricas e atendimento humano no mesmo número.


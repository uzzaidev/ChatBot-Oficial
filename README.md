# WhatsApp AI Chatbot - Next.js Full-Stack Application

Sistema de chatbot de WhatsApp com IA, migrando de n8n para Next.js com arquitetura serverless.

## 📌 Status do Projeto

**✅ PRODUÇÃO ATIVA** - Sistema funcionando em https://chat.luisfboff.com

**Fase Atual: Next.js Full-Stack (Migração completa)**

- ✅ Webhook Meta WhatsApp totalmente funcional
- ✅ Processamento completo de mensagens (texto, áudio, imagem)
- ✅ Sistema de batching Redis (evita respostas duplicadas)
- ✅ Integração com Groq (Llama 3.3 70B) para respostas
- ✅ RAG com Supabase Vector Store
- ✅ Transcrição de áudio (OpenAI Whisper)
- ✅ Análise de imagem (GPT-4o Vision)
- ✅ Histórico de conversas persistido
- ✅ Suporte a tool calls (sub-agentes, transferência humana)
- ✅ Dashboard com notificações em tempo real
- ⚠️ Dashboard ainda em desenvolvimento (melhorias contínuas)

---

## 🏗️ Arquitetura

### Stack Tecnológico

- **Framework**: Next.js 14 (App Router) - TypeScript
- **Deploy**: Vercel (Serverless Functions)
- **Banco de Dados**: Supabase PostgreSQL (via `@supabase/supabase-js`)
- **Cache/Queue**: Redis (Upstash)
- **IA/LLM**:
  - Groq (Llama 3.3 70B Versatile) - Chat
  - OpenAI (Whisper) - Transcrição de áudio
  - OpenAI (GPT-4o) - Análise de imagem
  - OpenAI (text-embedding-3-small) - Embeddings para RAG
- **Estilo**: Tailwind CSS + shadcn/ui
- **WhatsApp API**: Meta WhatsApp Business Cloud API

### Estrutura de Diretórios

```
src/
├── app/
│   ├── api/
│   │   ├── webhook/route.ts          # ⚡ WEBHOOK PRINCIPAL (recebe msgs da Meta)
│   │   ├── conversations/route.ts     # API conversas (dashboard)
│   │   ├── messages/[phone]/route.ts  # API mensagens por telefone
│   │   └── debug/                     # Endpoints de debug
│   └── dashboard/                     # UI Dashboard (em desenvolvimento)
│
├── flows/
│   └── chatbotFlow.ts                 # 🔥 ORQUESTRAÇÃO PRINCIPAL (12 nodes)
│
├── nodes/                             # 🧩 Funções atômicas (12 nodes)
│   ├── filterStatusUpdates.ts         # [1] Filtra status updates
│   ├── parseMessage.ts                # [2] Parse payload Meta
│   ├── checkOrCreateCustomer.ts       # [3] Upsert cliente
│   ├── downloadMetaMedia.ts           # [4a] Download mídia da Meta
│   ├── transcribeAudio.ts             # [4b] Whisper transcrição
│   ├── analyzeImage.ts                # [4c] GPT-4o visão
│   ├── normalizeMessage.ts            # [5] Normaliza para formato comum
│   ├── pushToRedis.ts                 # [6] Push para fila Redis
│   ├── batchMessages.ts               # [7] Batch msgs (10s delay)
│   ├── getChatHistory.ts              # [8] Busca histórico PostgreSQL
│   ├── getRAGContext.ts               # [9] Vector search Supabase
│   ├── generateAIResponse.ts          # [10] Groq Llama 3.3 70B
│   ├── formatResponse.ts              # [11] Split em msgs WhatsApp
│   ├── sendWhatsAppMessage.ts         # [12] Envia via Meta API
│   ├── saveChatMessage.ts             # Salva msg no histórico
│   └── handleHumanHandoff.ts          # Transferência para humano
│
└── lib/
    ├── config.ts                      # Configurações centralizadas
    ├── supabase.ts                    # Supabase client (service role)
    ├── postgres.ts                    # PostgreSQL pool (direct)
    ├── redis.ts                       # Redis client (Upstash)
    ├── openai.ts                      # OpenAI client
    └── types.ts                       # TypeScript types
```

---

## 📊 Estrutura do Banco de Dados

**⚠️ IMPORTANTE**: Este projeto compartilha o banco de dados com outro aplicativo (sistema de poker).

**Antes de trabalhar com dados, SEMPRE consulte**: [`docs/tables/tabelas.md`](docs/tables/tabelas.md)

Este arquivo contém:
- ✅ Estrutura completa de todas as tabelas (nomes exatos de colunas, tipos de dados)
- ✅ Políticas RLS ativas
- ✅ Triggers configurados
- ✅ Comandos SQL para consultar estrutura do banco

**Tabelas principais do chatbot**:
- `clientes_whatsapp` - Clientes WhatsApp (⚠️ colunas em português: `telefone`, `nome`)
- `clients` - Configuração multi-tenant
- `user_profiles` - Perfis de usuários (contém `client_id`)
- `conversations` - Estado das conversas
- `messages` - Histórico de mensagens
- `usage_logs` - Tracking de uso de APIs
- `pricing_config` - Configuração de preços personalizados
- `n8n_chat_histories` - Histórico de chat (formato n8n)
- `documents` - Base de conhecimento RAG (vector store)

---

## 🚀 Instalação e Configuração

### 1. Pré-requisitos

- Node.js 18+ instalado
- Conta Supabase (PostgreSQL + Vector Store)
- Conta Redis (Upstash recomendado)
- Conta OpenAI com créditos
- Conta Groq com API key
- Meta WhatsApp Business App configurado

### 2. Clonar e Instalar Dependências

```bash
git clone <repo-url>
cd chatbot-v2
npm install
```

### 3. Configurar Variáveis de Ambiente

Copie `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

**Preencha todas as variáveis:**

```env
# =====================================================
# WEBHOOK (SEMPRE PRODUÇÃO)
# =====================================================
WEBHOOK_BASE_URL=https://chat.luisfboff.com
META_VERIFY_TOKEN=seu_token_verificacao_meta

# =====================================================
# SUPABASE
# =====================================================
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# =====================================================
# POSTGRESQL (Direct Connection)
# =====================================================
POSTGRES_URL_NON_POOLING=postgresql://postgres.xxx:senha@aws-0-sa-east-1.pooler.supabase.com:5432/postgres

# =====================================================
# EXTERNAL SERVICES
# =====================================================
REDIS_URL=redis://default:senha@region.upstash.io:6379
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...
META_ACCESS_TOKEN=EAA...
META_PHONE_NUMBER_ID=899639703222013
GMAIL_USER=seu@email.com
GMAIL_PASSWORD=senha_app_gmail
```

**📖 Guia completo**: Consulte [CONFIGURAR_ENV.md](./CONFIGURAR_ENV.md)

### 4. Configurar Banco de Dados

Execute as migrations no Supabase SQL Editor:

```bash
# 1. Acesse: https://app.supabase.com/project/_/sql
# 2. Execute cada migration em ordem:
migrations/001_initial_schema.sql
migrations/002_add_indexes.sql
migrations/003_performance_indexes.sql
migrations/004_rename_clientes_table.sql  # Renomeia "Clientes WhatsApp" → clientes_whatsapp
```

**Tabelas principais:**
- `clientes_whatsapp` - Clientes (telefone, nome, status)
- `n8n_chat_histories` - Histórico de mensagens (JSON format)
- `documents` - Vector store para RAG

### 5. Configurar Webhook da Meta

No Meta Developer Dashboard:

1. Acesse: https://developers.facebook.com/apps
2. WhatsApp → Configuration → Edit
3. **Callback URL**: `https://chat.luisfboff.com/api/webhook`
4. **Verify Token**: O mesmo valor de `META_VERIFY_TOKEN` no `.env.local`
5. **Subscribe to**: `messages`

### 6. Executar em Desenvolvimento

```bash
npm run dev
```

**⚠️ IMPORTANTE**: O webhook SEMPRE aponta para produção, mesmo em dev. Para testar localmente:
- Código roda em `localhost:3000`
- Webhook da Meta chama produção (Vercel)
- Faça deploy para testar fluxo completo

---

## 📊 Como Funciona (Fluxo de Processamento)

Quando uma mensagem chega no WhatsApp:

```
[1] Meta envia POST para /api/webhook
     ↓
[2] Webhook chama processChatbotMessage(payload)
     ↓
[3] chatbotFlow.ts executa 12 nodes em sequência:

     NODE 1: filterStatusUpdates     → Remove status updates (delivered, read)
     NODE 2: parseMessage             → Extrai phone, name, type, content
     NODE 3: checkOrCreateCustomer    → Upsert na tabela clientes_whatsapp
     NODE 4: downloadMetaMedia        → Download + transcreve/analisa (se áudio/imagem)
     NODE 5: normalizeMessage         → Normaliza formato
     NODE 6: pushToRedis              → Push para fila Redis
     NODE 7: batchMessages            → Aguarda 10s, agrupa mensagens
     NODE 8: getChatHistory           → Busca últimas 15 msgs do histórico
     NODE 9: getRAGContext            → Vector search no conhecimento
     NODE 10: generateAIResponse      → Groq Llama 3.3 70B gera resposta
     NODE 11: formatResponse          → Remove tool calls, split em msgs
     NODE 12: sendWhatsAppMessage     → Envia via Meta API
```

**Consulte [WORKFLOW-LOGIC.md](./WORKFLOW-LOGIC.md)** para detalhes de cada node.

---

## 📱 Dashboard com Notificações Real-time

O dashboard Next.js agora possui **notificações visuais em tempo real** quando novas mensagens chegam, mesmo em conversas que não estão abertas no momento.

### Recursos do Dashboard

✅ **Visualização de Conversas**: Lista todas as conversas WhatsApp  
✅ **Histórico de Mensagens**: Veja todas as mensagens trocadas  
✅ **Notificações Real-time**: Indicadores visuais quando mensagens chegam  
✅ **Interface Responsiva**: Funciona em desktop e mobile  
✅ **Busca e Filtros**: Encontre conversas rapidamente  

### Notificações Real-time

Quando uma mensagem chega em uma conversa **que não está aberta**:

🔵 **Fundo azul claro** na lista de conversas  
**Texto em negrito** (nome e prévia)  
**Indicador de bolinha** (`•`) no lado direito  
✨ **Animação pulse** por 2 segundos  
🧹 **Auto-limpa** ao abrir a conversa  

#### Como Funciona

1. Cliente B envia mensagem no WhatsApp
2. Sistema processa via webhook → n8n → database
3. Supabase Realtime detecta nova mensagem
4. Dashboard atualiza instantaneamente
5. Indicador visual aparece para Cliente B
6. Ao clicar, indicador desaparece

#### Configuração Necessária

Para as notificações funcionarem, você precisa:

1. **Supabase Realtime habilitado**:
   - Acesse: Database → Replication
   - Habilite para tabela `n8n_chat_histories`
   - Aguarde 1-2 minutos

2. **Variáveis de ambiente** (já configuradas):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

#### Documentação Completa

- **[docs/REALTIME_NOTIFICATIONS.md](./docs/REALTIME_NOTIFICATIONS.md)** - Arquitetura técnica
- **[docs/VISUAL_GUIDE_REALTIME.md](./docs/VISUAL_GUIDE_REALTIME.md)** - Guia visual com exemplos
- **[IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md)** - Sumário completo

---

## 🔧 Decisões Técnicas Importantes

### 1. Migração de `pg` para Supabase Client

**Problema**: NODE 3 (`checkOrCreateCustomer`) ficava travando em produção (serverless).

**Causa**: Conexões TCP diretas via `pg` library não funcionam bem em ambientes serverless.

**Solução**: Migrado para `@supabase/supabase-js`:
- Usa connection pooling (Supavisor)
- Otimizado para serverless
- Retry automático

**Arquivo**: `src/nodes/checkOrCreateCustomer.ts:78`

### 2. Webhook deve `await` processamento completo

**Problema**: Webhook retornava 200 ANTES de processar mensagem (fire-and-forget).

**Causa**: Serverless functions terminam processo imediatamente após retornar resposta.

**Solução**: Adicionado `await processChatbotMessage(body)` no webhook.

**Arquivo**: `src/app/api/webhook/route.ts:107`

### 3. Tabela sem espaço no nome

**Problema**: TypeScript não conseguia inferir tipos de `"Clientes WhatsApp"` (com espaço).

**Solução**: Criada migration 004 que:
- Renomeia para `clientes_whatsapp`
- Cria VIEW `"Clientes WhatsApp"` para compatibilidade com n8n
- INSTEAD OF trigger para INSERT na VIEW

**Arquivo**: `migrations/004_rename_clientes_table.sql`

### 4. Remoção de tool calls nas mensagens

**Problema**: Mensagens incluíam `<function=subagente_diagnostico>{...}</function>` para o usuário.

**Solução**: Adicionado `removeToolCalls()` em `formatResponse()` usando regex.

**Arquivo**: `src/nodes/formatResponse.ts:7-10`

### 5. Coluna `type` não existe em `n8n_chat_histories`

**Problema**: Código tentava inserir `type` como coluna separada.

**Realidade**: `type` é campo DENTRO do JSON da coluna `message`.

**Formato correto**:
```json
{
  "type": "human",
  "content": "Mensagem do usuário",
  "additional_kwargs": {}
}
```

**Arquivos**:
- `src/nodes/saveChatMessage.ts:23-27`
- `src/nodes/getChatHistory.ts:12-18`

---

## 🧪 Testing

### Testar Webhook Localmente

```bash
# Simular payload da Meta
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d @test-payload.json
```

### Testar Nodes Individualmente

Cada node tem endpoint de teste:

```bash
# Testar NODE 3 (checkOrCreateCustomer)
curl http://localhost:3000/api/test/nodes/check-customer

# Testar NODE 10 (AI Response)
curl http://localhost:3000/api/test/nodes/ai-response
```

### Debug em Produção

```bash
# Ver configuração
curl https://chat.luisfboff.com/api/debug/config

# Ver logs
curl https://chat.luisfboff.com/api/debug/logs
```

---

## 🚀 Deploy (Vercel)

### 1. Conectar Repositório

```bash
vercel
```

### 2. Configurar Variáveis de Ambiente

No Vercel Dashboard → Settings → Environment Variables:
- Adicione TODAS as variáveis do `.env.local`
- Marque: Production, Preview, Development

### 3. Deploy

```bash
git add .
git commit -m "feat: Sua mensagem"
git push origin main
```

Vercel faz deploy automático.

---

## 📁 Arquivos de Documentação

- **README.md** (este arquivo) - Overview geral
- **CLAUDE.md** - Instruções para Claude Code (AI assistant)
- **ARCHITECTURE.md** - Detalhes técnicos da arquitetura
- **WORKFLOW-LOGIC.md** - Mapeamento exato do fluxo de processamento
- **CONFIGURAR_ENV.md** - Guia de configuração de variáveis
- **TROUBLESHOOTING.md** - Solução de problemas comuns
- **MIGRACAO_URGENTE.md** - Guia de migração da tabela clientes
- **IMPLEMENTATION_COMPLETE.md** - Sumário de implementação (notificações real-time)
- **docs/REALTIME_NOTIFICATIONS.md** - Documentação técnica de notificações
- **docs/VISUAL_GUIDE_REALTIME.md** - Guia visual de notificações

---

## 🐛 Troubleshooting

### "NODE 3 freezing" / Query nunca retorna

**Causa**: Uso de `pg` library em serverless + webhook não await.

**Solução**: Já corrigido (migrado para Supabase client + await no webhook).

### "column 'type' does not exist"

**Causa**: Tentativa de inserir `type` como coluna separada.

**Solução**: Já corrigido (`type` agora fica dentro do JSON da coluna `message`).

### "Token verification failed"

**Causa**: `META_VERIFY_TOKEN` não configurado ou diferente do Meta Dashboard.

**Solução**:
1. Verifique `.env.local` tem `META_VERIFY_TOKEN`
2. Valor DEVE ser IGUAL ao configurado no Meta Dashboard
3. Reinicie `npm run dev`

### Build Error: "No overload matches this call"

**Causa**: TypeScript não reconhece tabela `clientes_whatsapp`.

**Solução**: Já corrigido (casting `as any` em `checkOrCreateCustomer.ts:34`).

### Mensagens com `<function=...>`

**Causa**: Tool calls não estavam sendo removidos.

**Solução**: Já corrigido (`removeToolCalls()` em `formatResponse.ts`).

---

## 🎯 Próximos Passos

- [x] Dashboard funcional (visualizar conversas em tempo real)
- [x] Notificações em tempo real de novas mensagens
- [ ] Autenticação (NextAuth.js)
- [ ] Multi-tenant UI (seletor de clientes)
- [ ] Dashboard de custos (OpenAI + Groq + Meta)
- [ ] Configuração de webhooks via UI
- [ ] Migração completa de n8n → Next.js (100%)

---

## 📝 Licença

Proprietário - Luis Fernando Boff

---

## 💬 Suporte

- **Email**: luisfboff@hotmail.com
- **Issues**: Crie uma issue neste repositório
- **Documentação**: Consulte arquivos `.md` na raiz do projeto

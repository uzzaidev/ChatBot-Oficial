# WhatsApp AI Chatbot - Next.js Full-Stack Application

Sistema de chatbot de WhatsApp com IA, migrando de n8n para Next.js com arquitetura serverless.

## 📌 Status do Projeto

**✅ PRODUÇÃO ATIVA** - Sistema funcionando em https://chat.luisfboff.com

**Fase Atual: Phase 4 - Produção Multi-Tenant Completa** 🎉

**Core Features**:
- ✅ Webhook Meta WhatsApp multi-tenant (`/api/webhook/[clientId]`)
- ✅ Processamento completo de mensagens (texto, áudio, imagem, documento)
- ✅ Sistema de batching Redis (evita respostas duplicadas)
- ✅ Integração com Groq (Llama 3.3 70B) e OpenAI (GPT-4o)
- ✅ RAG com Supabase Vector Store (pgvector)
- ✅ Transcrição de áudio (OpenAI Whisper)
- ✅ Análise de imagem (GPT-4o Vision)
- ✅ Histórico de conversas persistido
- ✅ Suporte a tool calls (sub-agentes, transferência humana)

**Security & Multi-Tenant**:
- ✅ **Supabase Vault**: API keys criptografadas (zero secrets em código)
- ✅ **Autenticação**: Supabase Auth + middleware de proteção
- ✅ **RBAC**: Roles (admin, client_admin, user) com permissões granulares
- ✅ **Multi-tenant**: Isolamento completo por `client_id`
- ✅ **Admin Panel**: Gerenciamento de clientes, usuários e convites

**Dashboard**:
- ✅ Dashboard com notificações em tempo real
- ✅ Settings page (configuração Vault por cliente)
- ✅ Analytics (métricas e custos)
- ✅ Conversations (histórico completo)
- ✅ Auto-seleção de cliente baseado no usuário logado

---

## 🏗️ Arquitetura

### Stack Tecnológico

- **Framework**: Next.js 14 (App Router) - TypeScript
- **Deploy**: Vercel (Serverless Functions)
- **Banco de Dados**: Supabase PostgreSQL (via `@supabase/supabase-js`)
- **Secrets Management**: Supabase Vault (API keys criptografadas)
- **Cache/Queue**: Redis (Upstash)
- **IA/LLM**:
  - Groq (Llama 3.3 70B Versatile) - Chat principal
  - OpenAI (GPT-4o) - Alternativa para chat + análise de imagem
  - OpenAI (Whisper) - Transcrição de áudio
  - OpenAI (text-embedding-3-small) - Embeddings para RAG
- **Estilo**: Tailwind CSS + shadcn/ui
- **WhatsApp API**: Meta WhatsApp Business Cloud API
- **Arquitetura**: Multi-tenant com isolamento por `client_id`

### Estrutura de Diretórios

```
src/
├── app/
│   ├── api/
│   │   ├── webhook/
│   │   │   ├── [clientId]/route.ts   # ⚡ WEBHOOK MULTI-TENANT (principal)
│   │   │   └── route.ts               # ⚠️ DEPRECATED (retorna 410 Gone)
│   │   ├── conversations/route.ts     # API conversas (dashboard)
│   │   ├── messages/[phone]/route.ts  # API mensagens por telefone
│   │   └── debug/                     # Endpoints de debug
│   └── dashboard/
│       ├── page.tsx                   # Dashboard principal
│       ├── settings/                  # ⚙️ Configuração Vault (API keys)
│       └── conversations/             # Visualizar conversas
│
├── flows/
│   └── chatbotFlow.ts                 # 🔥 ORQUESTRAÇÃO PRINCIPAL (13 nodes)
│
├── nodes/                             # 🧩 Funções atômicas (13 nodes)
│   ├── filterStatusUpdates.ts         # [1] Filtra status updates
│   ├── parseMessage.ts                # [2] Parse payload Meta
│   ├── checkOrCreateCustomer.ts       # [3] Upsert cliente
│   ├── downloadMetaMedia.ts           # [4] Download mídia da Meta
│   ├── normalizeMessage.ts            # [5] Normaliza (áudio→texto, img→texto)
│   ├── pushToRedis.ts                 # [6] Push para fila Redis
│   ├── saveChatMessage.ts             # [7] Salva msg no histórico
│   ├── batchMessages.ts               # [8] Batch msgs (10s delay)
│   ├── getChatHistory.ts              # [9] Busca histórico PostgreSQL
│   ├── getRAGContext.ts               # [10] Vector search Supabase
│   ├── generateAIResponse.ts          # [11] Groq/OpenAI gera resposta
│   ├── formatResponse.ts              # [12] Split em msgs WhatsApp
│   ├── sendWhatsAppMessage.ts         # [13] Envia via Meta API
│   └── handleHumanHandoff.ts          # Tool: Transferência para humano
│
└── lib/
    ├── config.ts                      # Multi-tenant config (Vault)
    ├── vault.ts                       # Supabase Vault helpers
    ├── supabase.ts                    # Supabase client factory
    ├── redis.ts                       # Redis client (Upstash)
    ├── groq.ts                        # Groq SDK
    ├── openai.ts                      # OpenAI SDK
    ├── meta.ts                        # WhatsApp Business API
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

### 🔄 Migrations & Backup

**REGRA DE OURO**: Sempre use migrations para mudanças estruturais no banco de dados!

#### Workflow de Migrations

```powershell
# 1. Criar nova migration
supabase migration new add_nova_coluna

# 2. Editar arquivo gerado em supabase/migrations/
# Adicione seu SQL (ALTER TABLE, CREATE INDEX, etc)

# 3. Aplicar em produção
supabase db push

# 4. Commitar no Git
git add supabase/migrations/
git commit -m "feat: add nova coluna"
```

#### Backup do Banco de Dados

```powershell
# Backup completo (public + auth schemas)
cd db
.\backup-complete.bat

# Backup apenas dados da aplicação
.\backup-postgres.bat

# Backup apenas usuários Supabase Auth
.\backup-auth.bat
```

**Arquivos gerados**:
- `chatbot_full_TIMESTAMP.sql` - Estrutura + dados (public schema)
- `chatbot_structure_TIMESTAMP.sql` - Apenas DDL
- `chatbot_data_TIMESTAMP.sql` - Apenas dados
- `auth_full_TIMESTAMP.sql` - Usuários Supabase (⚠️ contém senhas hasheadas)

**⚠️ Segurança**: Backups SQL são automaticamente ignorados pelo Git (`.gitignore`)

**📖 Documentação completa**: [`db/MIGRATION_WORKFLOW.md`](db/MIGRATION_WORKFLOW.md)

**Outras tabelas**:
- `messages` - Histórico de mensagens
- `usage_logs` - Tracking de uso de APIs
- `pricing_config` - Configuração de preços personalizados
- `n8n_chat_histories` - Histórico de chat (formato n8n)
- `documents` - Base de conhecimento RAG (vector store)

---

## 🚀 Instalação e Configuração

### 1. Pré-requisitos

- Node.js 18+ instalado
- Conta Supabase (PostgreSQL + Vector Store + Vault)
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

### 3. Configurar Banco de Dados

Execute as migrations no Supabase:

```bash
# Via CLI (recomendado)
supabase db push

# Ou manualmente no SQL Editor:
# https://app.supabase.com/project/_/sql
# Execute cada arquivo em supabase/migrations/ em ordem
```

### 4. Configurar Secrets (Supabase Vault)

**NOVO em Phase 3**: API keys não vão mais em `.env.local`!

**Configuração via Dashboard**:
1. Acesse: `https://chat.luisfboff.com/dashboard/settings`
2. Configure para cada cliente:
   - Meta Access Token
   - Meta Verify Token
   - Meta Phone Number ID
   - OpenAI API Key
   - Groq API Key
   - Redis URL

**Secrets são criptografados no Supabase Vault** (pgsodium)

**Para desenvolvimento local** (opcional):

Crie `.env.local` com APENAS variáveis públicas:

```env
# Supabase (públicas)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Service role para server-side

# PostgreSQL (direct connection para chat history)
DATABASE_URL=postgresql://postgres.xxx:senha@aws-0-sa-east-1.pooler.supabase.com:5432/postgres

# Webhook base URL (pode ser localhost em dev)
WEBHOOK_BASE_URL=https://chat.luisfboff.com
```

**⚠️ IMPORTANTE**: API keys de terceiros (OpenAI, Groq, Meta, Redis) NÃO vão em `.env.local`. Use o dashboard `/settings`.

**📖 Guia completo**: Consulte [CONFIGURAR_ENV.md](./CONFIGURAR_ENV.md)

### 5. Criar Primeiro Usuário Admin

**Via API** (development):

```bash
# Registrar usuário admin
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "sua-senha-segura",
    "fullName": "Admin User",
    "clientId": "UUID-do-cliente-em-clients-table"
  }'
```

**Via Supabase Dashboard** (production):

1. Acesse: Authentication → Users → Add User
2. Após criar usuário, execute SQL:

```sql
-- Criar profile com role admin
INSERT INTO public.user_profiles (id, client_id, email, full_name, role, is_active)
VALUES (
  'UUID-do-usuario-auth',
  'UUID-do-cliente',
  'admin@example.com',
  'Admin User',
  'admin',
  true
);
```

**Login**: Acesse `https://chat.luisfboff.com/login`

### 6. Configurar Webhook da Meta (Multi-Tenant)

**NOVO**: Cada cliente tem seu próprio webhook URL!

No Meta Developer Dashboard:

1. Acesse: https://developers.facebook.com/apps
2. WhatsApp → Configuration → Edit
3. **Callback URL**: `https://chat.luisfboff.com/api/webhook/{CLIENT_ID}`
   - Substitua `{CLIENT_ID}` pelo UUID do cliente em `clients` table
   - Exemplo: `https://chat.luisfboff.com/api/webhook/550e8400-e29b-41d4-a716-446655440000`
4. **Verify Token**: Configure no Dashboard Settings (criptografado no Vault)
5. **Subscribe to**: `messages`

**⚠️ DEPRECATED**: `/api/webhook` (sem clientId) retorna 410 Gone

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
[1] Meta envia POST para /api/webhook/{clientId}
     ↓
[2] Webhook valida clientId, carrega config do Vault
     ↓
[3] Webhook chama processChatbotMessage(payload, config)
     ↓
[4] chatbotFlow.ts executa 13 nodes em sequência:

     NODE 1: filterStatusUpdates      → Remove status updates (delivered, read)
     NODE 2: parseMessage              → Extrai phone, name, type, content
     NODE 3: checkOrCreateCustomer     → Upsert na tabela clientes_whatsapp
     NODE 4: downloadMetaMedia         → Download mídia (se áudio/imagem/doc)
     NODE 5: normalizeMessage          → Transcreve áudio / analisa imagem
     NODE 6: pushToRedis               → Push para fila Redis
     NODE 7: saveChatMessage           → Salva mensagem no histórico
     NODE 8: batchMessages             → Aguarda 10s, agrupa mensagens
     NODE 9: getChatHistory            → Busca últimas 15 msgs (PostgreSQL)
     NODE 10: getRAGContext            → Vector search (pgvector)
     NODE 11: generateAIResponse       → Groq/OpenAI gera resposta
     NODE 12: formatResponse           → Remove tool calls, split em msgs
     NODE 13: sendWhatsAppMessage      → Envia via Meta API
```

**Recursos avançados**:
- **Batching Redis**: Agrupa msgs enviadas em <10s (evita respostas duplicadas)
- **RAG Context**: Injeta conhecimento via vector search
- **Tool Calls**: Suporte a sub-agentes e transferência humana
- **Multi-message Split**: Respostas longas divididas em msgs naturais

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

## 🔐 Autenticação & RBAC

**Sistema de Autenticação Completo** (Phase 4):

### Autenticação (Supabase Auth)

✅ **Login/Registro**: Páginas em `/login` e `/register`
✅ **Session Management**: Refresh automático de tokens
✅ **Middleware Protection**: Rotas protegidas automaticamente
✅ **Logout**: Limpeza completa de cookies e session

**Rotas protegidas**:
- `/dashboard/*` - Requer autenticação
- `/admin/*` - Requer autenticação + role admin

### RBAC (Role-Based Access Control)

**Roles disponíveis**:
- **`admin`**: Acesso total (super admin)
- **`client_admin`**: Admin de um cliente específico
- **`user`**: Usuário padrão (acesso limitado)

**Tabela de Permissões**:

| Funcionalidade | admin | client_admin | user |
|----------------|-------|--------------|------|
| Ver conversas próprias | ✅ | ✅ | ✅ |
| Ver analytics próprias | ✅ | ✅ | ✅ |
| Configurar Vault (próprio client) | ✅ | ✅ | ❌ |
| Gerenciar usuários (próprio client) | ✅ | ✅ | ❌ |
| Criar convites | ✅ | ✅ | ❌ |
| Ver todos os clientes | ✅ | ❌ | ❌ |
| Criar novos clientes | ✅ | ❌ | ❌ |
| Gerenciar qualquer usuário | ✅ | ❌ | ❌ |

**RLS Policies**:
- Todas as queries filtram por `client_id` automaticamente
- Usuários só veem dados do próprio cliente
- Admins (`admin` role) podem ver todos os clientes

### Admin Panel

**Endpoints disponíveis**:
- `GET /api/admin/clients` - Listar todos os clientes
- `POST /api/admin/clients` - Criar novo cliente
- `GET /api/admin/users` - Listar usuários do cliente
- `POST /api/admin/users` - Criar novo usuário
- `GET /api/admin/invites` - Listar convites
- `POST /api/admin/invites` - Criar convite

**UI Admin** (planejado para Phase 5):
- Dashboard `/admin` com interface visual
- Gerenciamento visual de clientes
- Gerenciamento visual de usuários

---

## 🔐 Supabase Vault - Secrets Management

**Arquitetura de Segurança**:

Em vez de armazenar API keys em `.env` ou hardcoded, este projeto usa **Supabase Vault** (pgsodium) para criptografar secrets no banco de dados.

### Como Funciona

1. **Configuração via Dashboard**: `/dashboard/settings`
2. **Secrets criptografados**: Armazenados em `vault.secrets` (pgsodium)
3. **Descriptografia automática**: Apenas service role pode descriptografar
4. **Isolamento por cliente**: Cada `client_id` tem suas próprias keys

### Estrutura de Secrets

Cada cliente (`clients` table) tem:
```typescript
{
  metaAccessToken: string      // Criptografado no Vault
  metaVerifyToken: string       // Criptografado no Vault
  metaPhoneNumberId: string
  openaiApiKey: string          // Criptografado no Vault
  groqApiKey: string            // Criptografado no Vault
  redisUrl: string              // Criptografado no Vault
}
```

### Vantagens

✅ **Zero secrets em código**: Não precisa commitar `.env`
✅ **Multi-tenant nativo**: Cada cliente tem suas keys
✅ **Auditável**: Logs de acesso a secrets
✅ **Rotação fácil**: Atualizar via UI, sem redeploy
✅ **Seguro**: Criptografia pgsodium (industry-standard)

**Consulte**: `src/lib/vault.ts` e `src/lib/config.ts`

---

## 🎯 Status de Implementação

**✅ FASE 4 CONCLUÍDA** - Sistema Multi-Tenant SaaS Completo:

**Core Chatbot**:
- [x] Webhook multi-tenant (`/api/webhook/[clientId]`)
- [x] Processamento de mensagens (texto, áudio, imagem, documento)
- [x] Batching Redis (evita respostas duplicadas)
- [x] RAG com vector search (pgvector)
- [x] Tool calls (sub-agentes, transferência humana)
- [x] Multi-message splitting (respostas naturais)

**Security & Multi-Tenant**:
- [x] Supabase Vault (secrets criptografadas)
- [x] Autenticação (Supabase Auth)
- [x] RBAC (roles: admin, client_admin, user)
- [x] Middleware de proteção de rotas
- [x] Isolamento por client_id
- [x] Admin Panel (gerenciar clientes/usuários/convites)

**Dashboard**:
- [x] Notificações em tempo real (Supabase Realtime)
- [x] Métricas e analytics
- [x] Settings (configuração Vault)
- [x] Conversations (histórico completo)
- [x] Auto-seleção de cliente (user_profiles)

---

## 🚀 Próximos Passos (Phase 5 - Melhorias)

**Performance & Escalabilidade**:
- [ ] Queue system para processamento assíncrono (Upstash/Vercel Queue)
- [ ] Cache de respostas frequentes (Redis)
- [ ] Otimização de queries (índices compostos)
- [ ] CDN para assets estáticos

**Features Avançadas**:
- [ ] API pública com rate limiting
- [ ] Webhooks customizáveis (clientes recebem eventos)
- [ ] Templates de mensagens personalizáveis
- [ ] Agendamento de mensagens
- [ ] Relatórios automatizados (PDF/Excel)
- [ ] Integração com CRM (Pipedrive, HubSpot)

**UX Improvements**:
- [ ] Mobile app (React Native)
- [ ] Tema dark mode
- [ ] Busca avançada (filtros, tags)
- [ ] Exportação de conversas
- [ ] Notas internas (anotações em conversas)

**AI Enhancements**:
- [ ] Fine-tuning de modelos personalizados
- [ ] A/B testing de prompts
- [ ] Análise de sentimento
- [ ] Sugestões automáticas de respostas
- [ ] Detecção de idioma automática

---

## 📝 Licença

Proprietário - Luis Fernando Boff

---

## 💬 Suporte

- **Email**: luisfboff@hotmail.com
- **Issues**: Crie uma issue neste repositório
- **Documentação**: Consulte arquivos `.md` na raiz do projeto

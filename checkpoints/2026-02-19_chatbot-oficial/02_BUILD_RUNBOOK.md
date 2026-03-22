# 02_BUILD_RUNBOOK - Como Rodar o Projeto

**Data:** 2026-02-19
**Fonte:** package.json, next.config.js, capacitor.config.ts
**Evidência:** Scripts disponíveis confirmados

---

## Pré-requisitos

### Ambiente
- Node.js (versão: ❓ **VERIFICAR** `.nvmrc` ou `engines` no package.json)
- npm ou pnpm
- Git

### Serviços Externos
- Supabase project (PostgreSQL + Vault + Storage)
- Redis instance (opcional - graceful degradation se indisponível)
- Meta WhatsApp Business API (access token, phone number ID, verify token)
- OpenAI API key (Whisper, GPT-4o Vision, Embeddings, TTS)
- Groq API key (Llama 3.3 70B)
- Gmail App Password (human handoff notifications)

### Ferramentas Opcionais
- Doppler CLI (secrets management - verificar se em uso)
- Capacitor CLI (para builds mobile)

---

## Setup Inicial

### 1. Clone e Instale

```bash
git clone <repo-url>
cd ChatBot-Oficial
npm install
```

**Evidência:** `package.json:5` - Script `dev` usa Next.js direto.

---

### 2. Configure Environment Variables

**⚠️ ATENÇÃO:** Arquivo `.env.example` NÃO ENCONTRADO na raiz.

**Variáveis esperadas (baseado em CLAUDE.md):**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Meta WhatsApp
META_ACCESS_TOKEN=EAAG...
META_PHONE_NUMBER_ID=899639703222013
META_VERIFY_TOKEN=<your-custom-token>

# AI Providers (⚠️ VERIFICAR se vão no Vault ou .env)
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...

# Redis
REDIS_URL=redis://localhost:6379
# OU Upstash
UPSTASH_REDIS_URL=...
UPSTASH_REDIS_TOKEN=...

# PostgreSQL (se precisar acesso direto - ⚠️ NÃO USAR pg em serverless!)
DATABASE_URL=postgresql://...

# Gmail (human handoff)
GMAIL_USER=<email@gmail.com>
GMAIL_APP_PASSWORD=<app-password>

# Webhooks
WEBHOOK_BASE_URL=https://chat.luisfboff.com  # SEMPRE produção, mesmo em dev!

# Build flags
NODE_ENV=development
CAPACITOR_BUILD=false  # true para mobile build
```

**AÇÃO:** Criar `.env.local` baseado nas variáveis acima.

**⚠️ CRITICAL (CLAUDE.md):**
- `WEBHOOK_BASE_URL` deve SEMPRE apontar para produção (Meta não consegue acessar localhost).
- Não use `pg` library em serverless (usar Supabase client).

---

### 3. Apply Database Migrations

**Localização:** `supabase/migrations/` (100+ arquivos de migration)

```bash
# Se Supabase CLI instalado
supabase db push

# OU execute migrations manualmente via Supabase Dashboard
```

**⚠️ IMPORTANTE:** CLAUDE.md enfatiza: SEMPRE usar migrations, NUNCA DDL manual no dashboard.

**Evidência:** CLAUDE.md - "Database Migrations" section.

---

### 4. Configure Vault Secrets (Per-Client)

**CRÍTICO:** Cliente-specific API keys devem ir no Vault, NÃO em .env.

**Estrutura esperada (por client_id):**
```
vault.secrets:
- openai_api_key
- groq_api_key
```

**Verificar:** `src/lib/vault.ts` - Como inserir/atualizar secrets.

**Evidência:** CLAUDE.md - "Direct AI Client (Vault credentials per client)".

---

## Scripts Disponíveis

### Development

```bash
npm run dev
```
**O que faz:** Inicia Next.js dev server com Webpack (não Turbopack).
**Porta:** 3000 (default)
**URL:** http://localhost:3000
**Watch ignore:** db/, docs/, supabase/, capacitor/, *.md (next.config.js:38-48)

**Evidência:** `package.json:6`, `next.config.js:36-52`.

---

### Build (Production Web)

```bash
npm run build
```
**O que faz:** `next build` (SSR/SSG/ISR support).
**Output:** `.next/` directory.
**Deploy target:** Vercel (serverless).

**Evidência:** `package.json:7`, `next.config.js:5` - `output: undefined` (não static export).

---

### Build (Mobile - Capacitor)

```bash
npm run build:mobile
```
**O que faz:** Executa `node scripts/build-mobile.js`.
**Verificar:** Script existe? O que faz exatamente?

**Alternativas (Doppler-based):**
```bash
npm run build:mobile:old  # dev config
npm run build:mobile:stg  # staging config
npm run build:mobile:prd  # production config
```
**Evidência:** `package.json:9-11` - Usa Doppler + `CAPACITOR_BUILD=true`.

**Output:** `out/` directory (static export).
**Config:** `capacitor.config.ts:6` - `webDir: 'out'`.

---

### Capacitor Sync & Open

```bash
npm run cap:sync          # Sync web assets to native projects
npm run cap:open:android  # Open Android Studio
npm run cap:open:ios      # Open Xcode
```

**Evidência:** `package.json:17-19`.

---

### Linting & Testing

```bash
npm run lint             # ESLint
npm run test             # Jest
npm run test:watch       # Jest watch mode
npm run test:coverage    # Jest with coverage
```

**Evidência:** `package.json:13-16`.

---

### Database Export

```bash
npm run db:export
```
**O que faz:** `node scripts/export-database-schema.js`.
**Verificar:** Script existe? Formato de saída?

**Evidência:** `package.json:20`.

---

## Fluxo de Desenvolvimento Típico

### 1. Primeiro Acesso

```bash
# 1. Instalar dependências
npm install

# 2. Configurar .env.local (copiar de .env.example se existir)
cp .env.example .env.local  # OU criar manualmente

# 3. Aplicar migrations
supabase db push  # OU executar via dashboard

# 4. Popular Vault com API keys (por client)
# Usar Supabase Dashboard ou RPC functions

# 5. Iniciar dev server
npm run dev

# 6. Acessar http://localhost:3000
```

---

### 2. Development Loop

```bash
# Terminal 1: Dev server
npm run dev

# Terminal 2: Watch tests (opcional)
npm run test:watch

# Terminal 3: Redis (se rodando local)
redis-server
```

**⚠️ Redis opcional:** Sistema faz graceful degradation se Redis estiver down.

**Evidência:** CLAUDE.md - "Redis connection failed → flow continues gracefully".

---

### 3. Criar Nova Migration

```bash
# Via Supabase CLI
supabase migration new add_feature_name

# Editar arquivo gerado em supabase/migrations/
# Aplicar
supabase db push

# Commit
git add supabase/migrations/
git commit -m "feat: add feature_name"
```

**Evidência:** CLAUDE.md - "Database Migrations" workflow.

---

### 4. Build & Deploy (Web)

```bash
# Build
npm run build

# Test build locally
npm run start  # Serve production build

# Deploy
git push origin main  # Vercel auto-deploy (se configurado)
```

---

### 5. Build Mobile

```bash
# 1. Build web assets (static export)
npm run build:mobile

# 2. Sync to native projects
npm run cap:sync

# 3. Open native IDE
npm run cap:open:android  # ou :ios

# 4. Build/Run via Android Studio ou Xcode
```

**Evidência:** `capacitor.config.ts` - appId: `com.chatbot.app`, appName: `ChatBot Oficial`.

---

## Troubleshooting

### Error: Missing NEXT_PUBLIC_SUPABASE_URL

**Causa:** `.env.local` não criado ou variáveis faltando.
**Fix:** Criar `.env.local` com todas variáveis necessárias.
**Restart:** Reiniciar dev server após mudar .env.

**Evidência:** CLAUDE.md - "Common Issues" table.

---

### Error: NODE 3 freezing

**Causa:** Usando `pg` library em serverless.
**Fix:** Usar SOMENTE Supabase client (`@supabase/supabase-js`).
**Arquivo afetado:** `src/nodes/checkOrCreateCustomer.ts:78` (histórico).

**Evidência:** CLAUDE.md - Critical #1.

---

### Error: Table name error (space in name)

**Causa:** Tabela antiga `"Clientes WhatsApp"` (com espaço).
**Fix:** Usar `clientes_whatsapp` (migration 004 renomeou).
**View legado:** VIEW criada para compatibilidade.

**Evidência:** CLAUDE.md - Critical #3, `supabase/migrations/004_rename_clientes_table.sql`.

---

### Error: Column 'type' not found in n8n_chat_histories

**Causa:** `type` está DENTRO do JSONB `message`, não é coluna.
**Fix:** Remover `type` da lista de colunas, acessar via `message->>'type'`.

**Evidência:** CLAUDE.md - Critical #4.

---

### Redis connection failed

**Esperado:** Sistema continua funcionando (sem batching).
**Impacto:** Messages processados imediatamente (não batcheados).
**Fix opcional:** Iniciar Redis local ou usar Upstash.

**Evidência:** CLAUDE.md - "Common Issues".

---

### Build fails (Google Fonts network error)

**Causa:** Ambiente sandboxed sem acesso à rede.
**Fix:** Esperado em alguns ambientes, não afeta produção.

**Evidência:** CLAUDE.md - "Common Issues".

---

## Backup & Recovery

### Backup Database

```bash
cd db
.\backup-complete.bat  # Windows script
```

**Verificar:** Script existe em `db/` directory?

**Evidência:** CLAUDE.md - "Backup before risky migrations".

---

### Restore from Backup

**Procedimento:** ❓ NÃO DOCUMENTADO - precisa investigar.

---

## Environment-Specific Notes

### Development
- `NODE_ENV=development`
- CORS: permitido de qualquer origem (next.config.js:67)
- Hot reload: ignorado db/, docs/, supabase/, *.md

### Staging
- Doppler config: `stg`
- Deploy: verificar se há ambiente staging configurado

### Production
- `NODE_ENV=production`
- CORS: webhook routes somente de `https://graph.facebook.com`
- Security headers: X-Frame-Options, CSP, etc.

**Evidência:** `next.config.js:57-125` - headers configurados.

---

## Perguntas em Aberto

1. ❓ Node.js version requirement? (verificar .nvmrc)
2. ❓ `.env.example` existe? Onde está?
3. ❓ `scripts/build-mobile.js` - o que faz exatamente?
4. ❓ `scripts/export-database-schema.js` - formato de saída?
5. ❓ Doppler está em uso ativo ou apenas scripts legados?
6. ❓ Como popular Vault inicialmente? Admin interface?
7. ❓ Backup/restore procedure completo?
8. ❓ CI/CD configurado? GitHub Actions?

---

## Próximos Passos (Validação)

- [ ] Verificar `.nvmrc` ou `package.json.engines`
- [ ] Encontrar ou criar `.env.example`
- [ ] Ler `scripts/build-mobile.js`
- [ ] Ler `scripts/export-database-schema.js`
- [ ] Verificar `db/backup-complete.bat`
- [ ] Testar build local (web e mobile)
- [ ] Documentar Vault population workflow
- [ ] Verificar CI/CD config

# Build & Run Runbook

**Projeto:** ChatBot-Oficial (UzzApp WhatsApp SaaS)
**Data:** 2026-03-15
**Branch:** stripe
**Commit:** 65e6482

---

## Quick Start

### Pré-requisitos

```bash
# Node.js 18+ (recomendado 20+)
node --version

# npm ou pnpm
npm --version  # ou pnpm --version

# Git
git --version
```

### Ambiente de Desenvolvimento

#### 1. Clone e Instalação

```bash
# Clone o repositório
git clone <repo-url>
cd ChatBot-Oficial

# Instalar dependências
npm install
# ou
pnpm install
```

#### 2. Configuração de Ambiente

**CRITICAL:** Crie arquivo `.env.local` com as seguintes variáveis:

```env
# Supabase (OBRIGATÓRIO)
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Meta WhatsApp (OBRIGATÓRIO para webhooks)
META_ACCESS_TOKEN=EAAG...
META_PHONE_NUMBER_ID=899639703222013
META_VERIFY_TOKEN=seu-token-secreto
META_APP_SECRET=<secret>
META_BUSINESS_ACCOUNT_ID=<id>

# OpenAI (OBRIGATÓRIO para AI)
OPENAI_API_KEY=sk-...

# Groq (OPCIONAL - alternativa AI)
GROQ_API_KEY=gsk_...

# Redis (OPCIONAL - para batching)
REDIS_URL=redis://localhost:6379

# PostgreSQL Direct (NÃO USE EM SERVERLESS)
DATABASE_URL=postgresql://...

# Gmail (OPCIONAL - para handoff humano)
GMAIL_USER=seu-email@gmail.com
GMAIL_APP_PASSWORD=app-password

# Stripe (OPCIONAL - para pagamentos)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...
STRIPE_PLATFORM_WEBHOOK_SECRET=whsec_...

# Webhooks (SEMPRE PRODUÇÃO)
WEBHOOK_BASE_URL=https://chat.luisfboff.com
```

**⚠️ IMPORTANTE:** `WEBHOOK_BASE_URL` deve SEMPRE apontar para produção (Meta não consegue acessar localhost).

#### 3. Aplicar Migrations

```bash
# Conectar ao Supabase
npx supabase login

# Link ao projeto
npx supabase link --project-ref <project-id>

# Aplicar todas as migrations
npx supabase db push

# Verificar status
npx supabase db diff
```

#### 4. Executar Desenvolvimento

```bash
# Modo desenvolvimento (porta 3000)
npm run dev

# Alternativa com webpack explícito
npm run dev -- --webpack
```

**Endpoints disponíveis:**
- Dashboard: http://localhost:3000/dashboard
- Login: http://localhost:3000/login
- API Health: http://localhost:3000/api/analytics

---

## Build para Produção

### Web (Vercel)

```bash
# Build production
npm run build

# Test production build localmente
npm run start
```

### Mobile (Capacitor)

#### Android

```bash
# Build web para mobile
npm run build:mobile

# Sync com Capacitor
npx cap sync android

# Abrir no Android Studio
npx cap open android

# Build direto (opcional)
cd android && ./gradlew assembleRelease
```

**Versão atual Android:** 2.0.0-internal.8 (versionCode 8)

#### iOS

```bash
# Build web para mobile
npm run build:mobile

# Sync com Capacitor
npx cap sync ios

# Abrir no Xcode
npx cap open ios

# Build/Archive no Xcode
```

**Versão atual iOS:** Pendente implementação (docs em docs/ios/)

**⚠️ IMPORTANTE:** iOS deployment target deve ser 17.4+ (Apple requirement desde 28/04/2026).

---

## Scripts Disponíveis

| Script | Comando | Descrição |
|--------|---------|-----------|
| **dev** | `npm run dev` | Desenvolvimento local (porta 3000) |
| **build** | `npm run build` | Build produção web |
| **build:mobile** | `npm run build:mobile` | Build estático para Capacitor |
| **build:mobile:old** | `npm run build:mobile:old` | Build mobile com Doppler (dev) |
| **build:mobile:stg** | `npm run build:mobile:stg` | Build mobile staging |
| **build:mobile:prd** | `npm run build:mobile:prd` | Build mobile production |
| **start** | `npm run start` | Rodar build de produção |
| **lint** | `npm run lint` | ESLint |
| **test** | `npm run test` | Jest tests |
| **test:watch** | `npm run test:watch` | Jest em modo watch |
| **test:coverage** | `npm run test:coverage` | Coverage report |
| **cap:sync** | `npx cap sync` | Sync com Capacitor (Android + iOS) |
| **cap:open:android** | `npx cap open android` | Abrir Android Studio |
| **cap:open:ios** | `npx cap open ios` | Abrir Xcode |
| **db:export** | `npm run db:export` | Exportar schema do Supabase |

---

## Troubleshooting

### Build Failures

#### Erro: "Cannot find module '@/lib/supabase'"
**Causa:** TypeScript paths não resolvidos
**Fix:**
```bash
# Limpar cache
rm -rf .next
npm install
npm run dev
```

#### Erro: "NEXT_PUBLIC_SUPABASE_URL is not defined"
**Causa:** `.env.local` não criado ou não carregado
**Fix:**
```bash
# Criar .env.local baseado em .env.example (se existir)
# Ou criar manualmente com as variáveis necessárias
# REINICIAR o servidor dev após criar
```

#### Erro: FFmpeg webpack warnings
**Causa:** FFmpeg não é bundleable
**Status:** Esperado. Build continua funcionando.
**Fix:** Ignorar warnings ou configurar externals (já configurado em next.config.js)

### Runtime Errors

#### Erro: "pg: Connection timeout" (NODE 3)
**Causa:** Usando `pg` library em serverless
**Fix:** SEMPRE usar Supabase client, NUNCA `pg` diretamente.
**Arquivo:** `src/lib/postgres.ts` (⚠️ não usar em API routes)

#### Erro: "Webhook signature verification failed"
**Causa:** `META_APP_SECRET` incorreto ou request adulterado
**Fix:**
1. Verificar `META_APP_SECRET` no .env.local
2. Verificar Meta Dashboard → App Settings → Basic → App Secret
3. Logs em `src/app/api/webhook/received/route.ts`

#### Erro: "Redis connection refused"
**Causa:** Redis não está rodando (opcional)
**Fix:** Flow continua sem batching. Para habilitar batching:
```bash
# Instalar Redis localmente
# Windows: https://github.com/microsoftarchive/redis/releases
# Mac: brew install redis && brew services start redis
# Linux: sudo apt install redis-server && sudo systemctl start redis
```

### Database Issues

#### Migrations failing
```bash
# Resetar database local (⚠️ DESTRUTIVO)
npx supabase db reset

# Aplicar novamente
npx supabase db push
```

#### RLS Policy errors (403)
**Causa:** User sem perfil ou fora do client correto
**Fix:**
1. Verificar `user_profiles` table
2. Verificar `client_id` na sessão
3. Logs em `src/middleware.ts` (se existir)

---

## Ambientes

### Development
- **URL:** http://localhost:3000
- **Supabase:** Project dev
- **Redis:** Local
- **Webhooks:** ⚠️ Produção (Meta não acessa localhost)

### Staging (via Doppler)
- **Build:** `npm run build:mobile:stg`
- **Config:** Doppler config stg
- **Supabase:** Project staging

### Production
- **URL:** https://uzzapp.uzzai.com.br
- **Deploy:** Vercel (auto-deploy branch main)
- **Supabase:** Project production
- **Redis:** Upstash
- **Webhooks:** /api/webhook/received

---

## CI/CD

### Vercel (Web)
**Trigger:** Push to branch
**Build Command:** `npm run build`
**Output:** `.next/`
**Env Vars:** Configuradas no Vercel Dashboard

### Google Play (Android)
**Manual:** Build via Android Studio → Upload .aab
**Automated:** Não configurado

### App Store (iOS)
**Status:** Pendente primeira submissão
**Docs:** docs/ios/IOS_IMPLEMENTATION_GUIDE.md

---

## Performance Optimization

### Next.js Build

```bash
# Analisar bundle size
ANALYZE=true npm run build
```

### Webpack Watch Optimization

Já configurado em `next.config.js`:
- Ignora: node_modules, .git, .next, db, docs, supabase
- AggregateTimeout: 300ms
- Poll: false (usa eventos do sistema)

### Image Optimization

**Mobile:** Images desotimizadas (`unoptimized: true`)
**Web:** Otimização Next.js padrão
**Remote Patterns:** Supabase Storage, Facebook Graph API

---

## Security Notes

### CORS

**API Routes:** Permitem todos origins (`*`)
**Webhooks:** Somente Meta (`graph.facebook.com`)
**Security Headers:** Configurados para todas as rotas

### Authentication

**Provider:** Supabase Auth
**Strategy:** SSR com cookies
**RLS:** Multi-tenant isolation por `client_id`

### Secrets Management

**Vault:** Supabase Vault para API keys de clientes
**Env Vars:** `.env.local` (não commitado)
**Doppler:** Para ambientes staging/prod mobile

---

## Monitoring

### Logs
- **Console:** `npm run dev` output
- **Supabase:** Dashboard → Logs
- **Vercel:** Dashboard → Logs
- **Custom:** `src/lib/logger.ts` (com sanitização)

### Metrics
- **Dashboard:** /dashboard/analytics
- **API:** /api/analytics
- **OpenAI Usage:** /dashboard/openai-analytics
- **Gateway Usage:** /dashboard/ai-gateway

---

## Database Backup

```bash
# Backup completo
cd db
./backup-complete.bat  # Windows
# ou
./backup-complete.sh   # Linux/Mac
```

**Output:** `db/backups/YYYY-MM-DD/`

---

## Support

### Internal Docs
- **Architecture:** docs/architecture/
- **Stripe:** docs/stripe/
- **iOS:** docs/ios/
- **Database:** docs/tables/tabelas.md

### External
- **Next.js:** https://nextjs.org/docs
- **Supabase:** https://supabase.com/docs
- **Capacitor:** https://capacitorjs.com/docs
- **Stripe:** https://stripe.com/docs

---

*Última atualização: 2026-03-15*
*Versão: 1.0*

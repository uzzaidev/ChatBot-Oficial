# BUILD RUNBOOK - ChatBot-Oficial

**Gerado em:** 2026-02-16
**Commit:** 65e6482dd1089c24bcc477681b8e3339a27e3afd
**Branch:** stripe

## Objetivo

Este documento contém TODOS os passos necessários para:
1. Configurar ambiente de desenvolvimento local
2. Executar a aplicação em modo dev
3. Build para produção (web)
4. Build para mobile (iOS/Android)
5. Deploy

---

## Pré-requisitos

### Software Necessário

```bash
# Node.js (versão recomendada: 18.x ou superior)
node --version  # Deve retornar v18.x ou superior

# npm (vem com Node.js)
npm --version

# Git
git --version

# Opcional (para mobile)
# - Xcode (macOS para iOS)
# - Android Studio (para Android)
```

### Contas/Serviços Externos

- **Supabase:** Projeto configurado em https://app.supabase.com
- **Meta WhatsApp Business API:** App configurado em https://developers.facebook.com
- **OpenAI:** API Key de https://platform.openai.com
- **Groq:** API Key de https://console.groq.com
- **Stripe:** Conta Connect configurada (opcional, para pagamentos)
- **Redis/Upstash:** Para message batching (recomendado)

---

## 1. Setup Inicial (Primeira Vez)

### 1.1 Clonar Repositório

```bash
git clone <repository-url>
cd ChatBot-Oficial
```

### 1.2 Instalar Dependências

```bash
npm install
```

**Evidência:** `package.json:5` - script `"dev": "next dev --webpack"`

**Dependências principais instaladas:**
- Next.js 16
- React 18.3.1
- Supabase 2.78.0
- Stripe 20.4.1
- Capacitor 7.4.4 (mobile)
- shadcn/ui components
- Groq SDK, OpenAI SDK, Anthropic SDK, Google AI SDK

### 1.3 Configurar Variáveis de Ambiente

**Arquivo:** `.env.mobile.example` (evidência lida)

**Copiar exemplo:**
```bash
cp .env.mobile.example .env.local
```

**Variáveis OBRIGATÓRIAS para dev:**

```env
# SUPABASE (CRÍTICO)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# AI PROVIDERS (pelo menos 1)
NEXT_PUBLIC_OPENAI_API_KEY=sk-...
NEXT_PUBLIC_GROQ_API_KEY=gsk_...

# WHATSAPP META API
META_ACCESS_TOKEN=EAAG...
META_PHONE_NUMBER_ID=899639703222013
META_VERIFY_TOKEN=seu-token-secreto
WEBHOOK_BASE_URL=https://seudominio.com

# REDIS (recomendado)
REDIS_URL=redis://localhost:6379

# STRIPE (opcional)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# APP CONFIG
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ENV=development
```

**Evidência:** `.env.mobile.example:1-91` (arquivo completo lido)

### 1.4 Aplicar Migrations do Banco

**Migrations encontradas em:** `./supabase/migrations/`

**Lista de migrations (evidência):**
- 002_execution_logs.sql
- 003_performance_indexes.sql
- 004_rename_clientes_table.sql
- 005_add_client_id_to_n8n_tables.sql
- 005_fase1_vault_multi_tenant.sql
- 007_add_wamid_to_chat_histories.sql
- 007_auth_setup.sql
- 008_create_first_user.sql
- 008_phase4_admin_roles.sql
- 009_fix_multi_tenant_phone_constraint.sql
- 010_fix_orphaned_users.sql
- 011_analytics_usage_tracking.sql
- 012_pricing_config.sql
- 013_fix_clientes_whatsapp_pkey.sql
- 20250125_check_realtime_status.sql
- 20250125_enable_realtime_replication.sql
- 20250125_fix_realtime_free_tier.sql
- 20250125_realtime_broadcast_clean.sql
- 20250125_realtime_broadcast_triggers.sql
- 20250125_realtime_broadcast_v2.sql

**Aplicar:**

```bash
# Se usando Supabase CLI
supabase db push

# OU executar manualmente no Supabase Dashboard
# SQL Editor > copiar conteúdo de cada migration em ordem
```

**Evidência de workflow:** `db/MIGRATION_WORKFLOW.md` (arquivo existe)

### 1.5 Configurar Supabase Vault (Credenciais Multi-tenant)

**Requisito:** Sistema usa Vault para armazenar API keys por cliente

**Evidência:** `src/lib/vault.ts` (deve existir baseado em CLAUDE.md)

**Passos:**
1. Acessar Supabase Dashboard > Vault
2. Criar secrets para cada cliente:
   - `client_{uuid}_openai_api_key`
   - `client_{uuid}_groq_api_key`
   - `client_{uuid}_meta_access_token`

---

## 2. Desenvolvimento Local

### 2.1 Iniciar Servidor Dev

```bash
npm run dev
```

**Output esperado:**
```
▲ Next.js 16.x.x
- Local:        http://localhost:3000
- Ready in Xms
```

**Evidência:** `package.json:6` - script `"dev": "next dev --webpack"`

**Nota:** O projeto usa webpack mode explicitamente (não Turbopack) devido a configurações de FFmpeg externalization.

**Evidência:** `next.config.js:25-33` (webpack config com externals para fluent-ffmpeg)

### 2.2 Acessar Dashboard

Abrir: http://localhost:3000/dashboard

**Primeira vez:**
- Redirecionará para login: http://localhost:3000/login
- Criar conta ou usar credenciais existentes

**Evidência:** `src/app/(auth)/login/page.tsx` (página existe)

### 2.3 Verificar Conexões

**Teste rápido:**
```bash
curl http://localhost:3000/api/test/supabase-connection
```

**Evidência:** `src/app/api/test/supabase-connection/route.ts` (endpoint existe)

---

## 3. Build para Produção (Web)

### 3.1 Build Padrão

```bash
npm run build
```

**Evidência:** `package.json:7` - script `"build": "next build"`

**Output esperado:**
```
Route (app)                              Size     First Load JS
┌ ○ /                                   XXX kB         XXX kB
├ ○ /dashboard                          XXX kB         XXX kB
...
○  (Static)  prerendered as static content
λ  (Server)  server-rendered on demand
```

### 3.2 Testar Build Localmente

```bash
npm run start
```

**Evidência:** `package.json:12` - script `"start": "next start"`

Acessar: http://localhost:3000

### 3.3 Análise de Build

**Verificações:**
- Total bundle size < 500 KB (First Load JS)
- No warnings de `Image Optimization` (remote patterns configurados)
- No errors de missing env vars

**Evidência de image config:** `next.config.js:6-20` (remotePatterns para Supabase + Facebook)

---

## 4. Build para Mobile (iOS/Android)

### 4.1 Pré-requisitos Mobile

```bash
# Verificar Capacitor instalado
npx cap --version  # Deve retornar 8.x (Capacitor CLI)

# Para iOS: Xcode instalado (macOS only)
# Para Android: Android Studio instalado
```

**Evidência:** `package.json:30` - `"@capacitor/cli": "^8.0.1"`

### 4.2 Configurar ENV para Mobile

**Criar arquivo separado:**
```bash
cp .env.mobile.example .env.mobile
```

**CRÍTICO:** Usar apenas variáveis `NEXT_PUBLIC_*` pois mobile usa static export

**Evidência:** `next.config.js:2-5`
```javascript
const isMobileBuild = process.env.CAPACITOR_BUILD === 'true'
const nextConfig = {
  output: isMobileBuild ? 'export' : undefined,
```

### 4.3 Build Mobile

**Opção 1 - Script automatizado:**
```bash
npm run build:mobile
```

**Evidência:** `package.json:8` - script `"build:mobile": "node scripts/build-mobile.js"`

**Opção 2 - Manual (com Doppler):**
```bash
# Dev
npm run build:mobile:old

# Staging
npm run build:mobile:stg

# Produção
npm run build:mobile:prd
```

**Evidência:** `package.json:9-11` (scripts com Doppler)

### 4.4 Sync com Capacitor

```bash
npm run cap:sync
```

**Evidência:** `package.json:17` - script `"cap:sync": "npx cap sync"`

**O que faz:**
- Copia build (out/) para android/app/src/main/assets/
- Copia build para ios/App/public/
- Atualiza plugins nativos

### 4.5 Abrir em IDE Nativa

**Android:**
```bash
npm run cap:open:android
```

**iOS:**
```bash
npm run cap:open:ios
```

**Evidência:** `package.json:18-19`

**Então:**
- Android Studio: Build > Build Bundle(s) / APK(s)
- Xcode: Product > Archive

---

## 5. Testes

### 5.1 Executar Testes

```bash
# Rodar todos os testes
npm run test

# Watch mode (dev)
npm run test:watch

# Com coverage
npm run test:coverage
```

**Evidência:** `package.json:14-16`

**Framework:** Jest 30.2.0 com ts-jest

**Evidência:** `package.json:122` - `"jest": "^30.2.0"`

### 5.2 Lint

```bash
npm run lint
```

**Evidência:** `package.json:13` - script `"lint": "eslint ."`

**ESLint:** v9.23.0

**Evidência:** `package.json:120`

---

## 6. Deploy

### 6.1 Vercel (Recomendado para Web)

**Automático via Git:**
1. Conectar repositório ao Vercel
2. Configurar env vars no dashboard
3. Push para branch main → deploy automático

**Variáveis de ambiente no Vercel:**
- Copiar TODAS de .env.local
- Marcar NEXT_PUBLIC_* como "Exposed to Browser"

### 6.2 Webhook Configuration

**Após deploy:**

1. Obter URL de produção (ex: https://uzzapp.uzzai.com.br)
2. Configurar webhook no Meta Dashboard:
   - URL: `https://uzzapp.uzzai.com.br/api/webhook/received`
   - Verify Token: Valor de `META_VERIFY_TOKEN`
   - Subscribe to: messages, message_status

**Evidência:** `src/app/api/webhook/received/route.ts` (endpoint principal)

### 6.3 Mobile Deploy

**Android:**
- Build APK/AAB no Android Studio
- Upload para Google Play Console

**iOS:**
- Archive no Xcode
- Upload via Transporter para App Store Connect

---

## 7. Manutenção e Debugging

### 7.1 Logs

**Development:**
- Console do navegador (React DevTools)
- Terminal onde `npm run dev` está rodando

**Production:**
- Vercel Dashboard > Logs
- Supabase Dashboard > Logs

### 7.2 Database Exports

```bash
npm run db:export
```

**Evidência:** `package.json:20` - script `"db:export": "node scripts/export-database-schema.js"`

### 7.3 Endpoints de Debug

**Úteis em dev:**
- `/api/test/supabase-connection` - Testa conexão Supabase
- `/api/test/vault-config` - Verifica Vault credentials
- `/api/test/realtime-status` - Status Realtime
- `/api/debug/config` - Configuração do cliente ativo

**Evidência:** `src/app/api/test/**/route.ts` (múltiplos endpoints encontrados)

### 7.4 Problemas Comuns

| Problema | Causa | Solução |
|----------|-------|---------|
| Build fails (Google Fonts) | Network restrictions | Normal em ambientes sandboxed, ignorar |
| Webhook não recebe mensagens | Wrong verify token | Verificar `META_VERIFY_TOKEN` |
| Mobile build falha | CAPACITOR_BUILD não set | Usar scripts build:mobile |
| Env vars undefined no mobile | Não usa NEXT_PUBLIC_ | Prefixar com NEXT_PUBLIC_ |
| FFmpeg errors | Bundled incorretly | Webpack externals config OK |

**Evidência:** `next.config.js:25-33` (externals config)

---

## 8. Scripts Disponíveis (Resumo)

| Script | Comando | Descrição |
|--------|---------|-----------|
| dev | `npm run dev` | Dev server (localhost:3000) |
| build | `npm run build` | Build produção web |
| build:mobile | `npm run build:mobile` | Build mobile (script automatizado) |
| start | `npm run start` | Start production server |
| lint | `npm run lint` | ESLint check |
| test | `npm run test` | Run Jest tests |
| test:watch | `npm run test:watch` | Jest watch mode |
| test:coverage | `npm run test:coverage` | Jest coverage report |
| cap:sync | `npm run cap:sync` | Sync Capacitor |
| cap:open:android | `npm run cap:open:android` | Open Android Studio |
| cap:open:ios | `npm run cap:open:ios` | Open Xcode |
| db:export | `npm run db:export` | Export DB schema |

**Evidência completa:** `package.json:5-21`

---

## 9. Checklist de Deploy

**Antes de deploy para produção:**

- [ ] Todas as migrations aplicadas
- [ ] Env vars configuradas (incluindo secrets)
- [ ] Vault configurado com credentials de clientes
- [ ] Webhook URL atualizada no Meta Dashboard
- [ ] Stripe webhook endpoints configurados (se usando pagamentos)
- [ ] Build roda sem errors (`npm run build`)
- [ ] Testes passam (`npm run test`)
- [ ] Lint passa (`npm run lint`)
- [ ] Security headers configurados (já OK no next.config.js)

**Evidência de security headers:** `next.config.js:57-125` (CORS, X-Frame-Options, CSP, etc.)

---

## 10. Observações Técnicas

### Next.js 16 Specifics

**Evidência:** `next.config.js:21-22`
```javascript
// Next.js 16: serverComponentsExternalPackages moved to serverExternalPackages
serverExternalPackages: ['pdf-parse', 'fluent-ffmpeg', '@ffmpeg-installer/ffmpeg'],
```

### Webpack vs Turbopack

Projeto usa **Webpack** explicitamente (não Turbopack default do Next 16)

**Razão:** Necessário para externalizar FFmpeg e otimizações de watch

**Evidência:** `next.config.js:24-55` (webpack config extenso)

### Static Export para Mobile

**Mobile build gera static HTML/JS:**
- No server-side features (API routes não funcionam)
- Todas as chamadas API vão para `NEXT_PUBLIC_API_URL` (produção)
- Imagens unoptimized

**Evidência:** `next.config.js:5-7`

---

**FIM DO BUILD RUNBOOK**

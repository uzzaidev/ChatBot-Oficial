# Environment Variables - Mobile

Guia completo para configurar environment variables em builds mobile Capacitor.

## 📋 Table of Contents

- [O Problema](#o-problema)
- [Soluções Disponíveis](#soluções-disponíveis)
- [Opção 1: Doppler (RECOMENDADO - Implementado)](#opção-1-doppler-recomendado---implementado)
- [Opção 2: Build-Time Injection com dotenv-cli (Alternativa)](#opção-2-build-time-injection-com-dotenv-cli-alternativa)
- [Opção 3: Hardcode em capacitor.config.ts](#opção-3-hardcode-em-capacitorconfigts)
- [Opção 4: Plugin @capacitor/preferences](#opção-4-plugin-capacitorpreferences)
- [Variáveis Necessárias](#variáveis-necessárias)
- [Boas Práticas](#boas-práticas)
- [Verificação](#verificação)
- [Troubleshooting](#troubleshooting)
- [Exemplo Completo](#exemplo-completo)

---

## O Problema

### Por Que Mobile É Diferente?

**Web (Next.js com servidor):**
```bash
# .env.local é lido em runtime pelo servidor Node.js
npm run dev
# Variáveis disponíveis via process.env.VARIAVEL
```

**Mobile (Build estático):**
```bash
# Build gera arquivos HTML/JS/CSS estáticos em out/
npm run build:mobile
# NÃO HÁ SERVIDOR para ler .env.local em runtime!
```

### Resultado

```typescript
// Código rodando no mobile
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
// Output: undefined ❌ (se não configurado corretamente)
```

**CRÍTICO**: Sem environment variables, o app não consegue conectar ao Supabase, APIs, etc.

---

## Soluções Disponíveis

| Solução | Complexidade | Segurança | Status |
|---------|--------------|-----------|--------|
| **Opção 1: Doppler** | Média | ⭐⭐⭐ | ✅ Implementado (RECOMENDADO) |
| **Opção 2: dotenv-cli** | Média | ⭐⭐⭐ | ⚠️ Alternativa/Fallback |
| **Opção 3: Hardcode em config** | Baixa | ⭐ | ⚠️ Apenas não-secretas |
| **Opção 4: Plugin Preferences** | Alta | ⭐⭐ | 🔄 Para runtime dinâmico |

---

## Opção 1: Doppler (RECOMENDADO - Implementado)

**Status**: ✅ Implementado e Ativo

[Doppler](https://www.doppler.com/) é a plataforma de gerenciamento de secrets **atualmente utilizada** no projeto para:
- Centralizar environment variables (dev, staging, production)
- Rotacionar secrets automaticamente
- Sincronizar variáveis entre equipe
- Eliminar arquivos `.env` locais

### Scripts Atuais (package.json)

O projeto **já usa Doppler** nos scripts de build:

```json
{
  "scripts": {
    "build:mobile": "doppler run --config dev -- cross-env CAPACITOR_BUILD=true next build",
    "build:mobile:stg": "doppler run --config stg -- cross-env CAPACITOR_BUILD=true next build",
    "build:mobile:prd": "doppler run --config prd -- cross-env CAPACITOR_BUILD=true next build"
  }
}
```

### Como Usar

**Build desenvolvimento:**
```bash
npm run build:mobile
```

**Build staging:**
```bash
npm run build:mobile:stg
```

**Build produção:**
```bash
npm run build:mobile:prd
```

### Setup Doppler (Primeira Vez)

1. **Instalar Doppler CLI:**
   ```bash
   # Windows (PowerShell como Admin)
   iwr https://cli.doppler.com/install.ps1 | iex

   # macOS/Linux
   brew install dopplerhq/cli/doppler
   ```

2. **Autenticar:**
   ```bash
   doppler login
   ```

3. **Configurar projeto:**
   ```bash
   cd C:\Users\pedro\OneDrive\Área de Trabalho\ChatBot-Oficial\ChatBot-Oficial
   doppler setup
   # Selecionar projeto: chatbot-oficial
   # Configs disponíveis: dev, stg, prd
   ```

4. **Verificar variáveis:**
   ```bash
   doppler secrets
   # Deve mostrar todas as variáveis (NEXT_PUBLIC_SUPABASE_URL, etc.)
   ```

### Vantagens

- ✅ Variáveis centralizadas (sem arquivos `.env` locais)
- ✅ Rotação automática de secrets
- ✅ Sincronização entre equipe
- ✅ Suporte a múltiplos ambientes (dev, stg, prd)
- ✅ Integração CI/CD fácil

### Desvantagens

- ⚠️ Requer conta Doppler (gratuita para projetos pequenos)
- ⚠️ Requer CLI instalado localmente

---

## Opção 2: Build-Time Injection com dotenv-cli (Alternativa)

**Quando usar:** Se você **não tem acesso ao Doppler** (ex: desenvolvedor externo, testes locais).

Injetar variáveis durante o build Next.js usando `dotenv-cli`.

### Como Funciona

1. Criar `.env.mobile` com variáveis
2. `dotenv-cli` carrega `.env.mobile` antes do build
3. Next.js injeta `NEXT_PUBLIC_*` no código JavaScript compilado
4. App mobile lê variáveis de `process.env`

---

### Passo 1: Criar .env.mobile

Na raiz do projeto:

```env
# .env.mobile

# Supabase (OBRIGATÓRIO)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI (OBRIGATÓRIO para AI)
NEXT_PUBLIC_OPENAI_API_KEY=sk-...

# Groq (OBRIGATÓRIO para AI)
NEXT_PUBLIC_GROQ_API_KEY=gsk_...

# WhatsApp Meta (OPCIONAL - backend serverless usa versão não-pública)
NEXT_PUBLIC_META_PHONE_NUMBER_ID=899639703222013

# App Config (OPCIONAL)
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_API_BASE_URL=https://chat.luisfboff.com
```

**IMPORTANTE:**
- Use `NEXT_PUBLIC_*` prefix (Next.js requirement)
- Nunca commitar `.env.mobile` com secrets reais (add ao `.gitignore`)

---

### Passo 2: Instalar dotenv-cli

```bash
npm install --save-dev dotenv-cli
```

**Verificação:**
```bash
npx dotenv --version
# Esperado: dotenv-cli@x.x.x
```

---

### Passo 3: Modificar package.json

```json
{
  "scripts": {
    "build:mobile": "cross-env CAPACITOR_BUILD=true dotenv -e .env.mobile next build",
    "cap:sync": "npx cap sync",
    "cap:open:android": "npx cap open android"
  }
}
```

**O que mudou:**
- `dotenv -e .env.mobile` carrega variáveis ANTES de `next build`
- Variáveis ficam disponíveis durante compilation

---

### Passo 4: Rebuild

```bash
npm run build:mobile
npm run cap:sync
```

**Verificação no código:**
```typescript
// src/app/page.tsx
'use client'

export default function Home() {
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  // Deve mostrar a URL real

  return <div>Environment vars configuradas!</div>
}
```

---

### Passo 5: Testar no Mobile

1. Abra Android Studio: `npm run cap:open:android`
2. Run app (`Shift + F10`)
3. Abra Chrome DevTools: `chrome://inspect`
4. Verifique console: URL do Supabase deve aparecer

**Checklist:**
- [ ] `.env.mobile` criado com variáveis corretas
- [ ] `dotenv-cli` instalado
- [ ] `package.json` modificado
- [ ] Build executado sem erros
- [ ] Variáveis visíveis no console do app

---

### Vantagens

- ✅ Variáveis injetadas em build-time (seguro)
- ✅ Funciona exatamente como web
- ✅ Suporta diferentes `.env` (dev, staging, prod)
- ✅ Sem código nativo extra

### Desvantagens

- ⚠️ Requer rebuild ao mudar variáveis
- ⚠️ Variáveis hardcoded no JS bundle (visíveis se decompilado)

---

## Opção 3: Hardcode em capacitor.config.ts

Para variáveis **não-secretas** (ex: `APP_NAME`, `APP_VERSION`).

### Exemplo

```typescript
// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.chatbot.app',
  appName: 'ChatBot Oficial',
  webDir: 'out',
  plugins: {
    // Configurações de plugins podem acessar via CapacitorConfig
  },
  // Adicionar configs customizadas
  android: {
    buildOptions: {
      // Variáveis podem ser passadas aqui
    }
  }
}

export default config
```

**Acesso no código:**
```typescript
import { Capacitor } from '@capacitor/core'

const config = Capacitor.getConfig()
console.log(config.appId) // 'com.chatbot.app'
```

**Limitação**: Não suporta `NEXT_PUBLIC_*` diretamente (apenas configs Capacitor).

### Quando usar:
- App ID, nome, versão
- URLs públicas (não-secretas)
- Feature flags

### NÃO use para:
- ❌ API keys secretas
- ❌ Tokens de autenticação
- ❌ Credenciais de banco de dados

---

## Opção 4: Plugin @capacitor/preferences

Armazenar variáveis em runtime usando storage nativo.

### Instalação

```bash
npm install @capacitor/preferences
npx cap sync
```

---

### Configurar no App Startup

```typescript
// src/lib/config.ts
'use client'

import { Preferences } from '@capacitor/preferences'
import { Capacitor } from '@capacitor/core'

export const initializeConfig = async () => {
  if (!Capacitor.isNativePlatform()) return

  // Salvar variáveis no primeiro startup
  await Preferences.set({
    key: 'SUPABASE_URL',
    value: 'https://your-project.supabase.co'
  })

  await Preferences.set({
    key: 'SUPABASE_ANON_KEY',
    value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
}

export const getConfig = async (key: string): Promise<string | null> => {
  if (!Capacitor.isNativePlatform()) {
    return process.env[`NEXT_PUBLIC_${key}`] || null
  }

  const { value } = await Preferences.get({ key })
  return value
}
```

---

### Uso no Código

```typescript
// src/lib/supabase/client.ts
'use client'

import { createClient } from '@supabase/supabase-js'
import { getConfig } from '@/lib/config'
import { useState, useEffect } from 'react'

export const useSupabaseClient = () => {
  const [client, setClient] = useState<any>(null)

  useEffect(() => {
    const initClient = async () => {
      const url = await getConfig('SUPABASE_URL')
      const key = await getConfig('SUPABASE_ANON_KEY')

      if (url && key) {
        setClient(createClient(url, key))
      }
    }
    initClient()
  }, [])

  return client
}
```

---

### Vantagens

- ✅ Variáveis podem ser atualizadas em runtime (sem rebuild)
- ✅ Armazenamento seguro nativo
- ✅ Suporta diferentes configs por usuário

### Desvantagens

- ⚠️ Código assíncrono complexo
- ⚠️ Precisa gerenciar estado (hooks/context)
- ⚠️ Variáveis devem ser setadas na primeira execução

### Quando usar:
- Configurações por usuário (multi-tenant)
- Features que mudam frequentemente
- A/B testing

---

## Variáveis Necessárias

### Checklist Completo

#### Essenciais (App quebra sem elas)

- [ ] `NEXT_PUBLIC_SUPABASE_URL` - URL do projeto Supabase
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Chave anônima Supabase

#### AI Features (Chatbot não funciona sem)

- [ ] `NEXT_PUBLIC_OPENAI_API_KEY` - OpenAI (Whisper, Embeddings, Vision)
- [ ] `NEXT_PUBLIC_GROQ_API_KEY` - Groq (Llama 3.3 70B)

#### WhatsApp (Backend usa, mobile pode acessar info)

- [ ] `NEXT_PUBLIC_META_PHONE_NUMBER_ID` - ID do número WhatsApp

#### Opcionais

- [ ] `NEXT_PUBLIC_APP_ENV` - Ambiente (development, staging, production)
- [ ] `NEXT_PUBLIC_API_BASE_URL` - URL base do backend
- [ ] `NEXT_PUBLIC_SENTRY_DSN` - Sentry error tracking (se usar)
- [ ] `NEXT_PUBLIC_FIREBASE_CONFIG` - Firebase (push notifications)

---

### Onde Obter Credenciais

**Supabase:**
1. Acesse: [https://app.supabase.com/project/YOUR_PROJECT/settings/api](https://app.supabase.com/project/YOUR_PROJECT/settings/api)
2. Copie "Project URL" → `NEXT_PUBLIC_SUPABASE_URL`
3. Copie "anon public" → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**OpenAI:**
1. Acesse: [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Crie nova API key → `NEXT_PUBLIC_OPENAI_API_KEY`

**Groq:**
1. Acesse: [https://console.groq.com/keys](https://console.groq.com/keys)
2. Crie nova API key → `NEXT_PUBLIC_GROQ_API_KEY`

---

### Alternativa: `.env.mobile` (Fallback Local)

Se você **não tem acesso ao Doppler** (ex: desenvolvedor externo, testes locais), pode usar `.env.mobile`:

**1. Criar arquivo:**
```bash
cp .env.mobile.example .env.mobile
# Editar .env.mobile com valores reais
```

**2. Modificar script temporariamente:**
```json
"build:mobile": "dotenv -e .env.mobile -- cross-env CAPACITOR_BUILD=true next build"
```

**3. Instalar dotenv-cli:**
```bash
npm install --save-dev dotenv-cli
```

**⚠️ IMPORTANTE:** Não commitar `.env.mobile` (já está no `.gitignore`).

**Quando usar `.env.mobile`:**
- ✅ Testes locais rápidos
- ✅ Desenvolvimento offline
- ✅ Desenvolvedor sem acesso Doppler

**Quando usar Doppler:**
- ✅ Build CI/CD (GitHub Actions, Vercel)
- ✅ Deploy produção
- ✅ Equipe com múltiplos devs

---

## Boas Práticas

### DO ✅

```env
# Use NEXT_PUBLIC_ prefix (Next.js requirement)
NEXT_PUBLIC_SUPABASE_URL=https://...

# Use diferentes arquivos para diferentes ambientes
.env.mobile.dev
.env.mobile.staging
.env.mobile.prod

# Adicione .env.mobile ao .gitignore
echo ".env.mobile" >> .gitignore
echo ".env.mobile.*" >> .gitignore

# Documente variáveis em .env.example
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

### DON'T ❌

```env
# ❌ Não commitar secrets reais no git
git add .env.mobile  # NUNCA!

# ❌ Não usar variáveis sem NEXT_PUBLIC_ (não funcionam no cliente)
SUPABASE_URL=https://...  # Não será injetada!

# ❌ Não hardcode secrets no código
const apiKey = 'sk-hardcoded-key'  # NUNCA!

# ❌ Não expor service_role_key no mobile (apenas backend)
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=...  # PERIGO!
```

---

### Segurança

**Variáveis no Mobile São Públicas:**
- JavaScript bundle pode ser decompilado
- Qualquer pessoa pode inspecionar o código
- **NUNCA** inclua:
  - `SUPABASE_SERVICE_ROLE_KEY` (bypass RLS)
  - Passwords de admin
  - Private API keys

**Use apenas variáveis "públicas":**
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` (RLS protege dados)
- ✅ API keys com rate limiting
- ✅ URLs públicas

**Backend protege secrets:**
- Secrets sensíveis ficam no Vercel (backend)
- Mobile chama APIs backend autenticadas
- Backend usa `SUPABASE_SERVICE_ROLE_KEY` internamente

---

## Verificação

### Validar em Código

Adicione validação no app startup:

```typescript
// src/app/layout.tsx
'use client'

import { useEffect } from 'react'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    validateEnvVars()
  }, [])

  return <html>{children}</html>
}

const validateEnvVars = () => {
  const required = {
    'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'NEXT_PUBLIC_OPENAI_API_KEY': process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    'NEXT_PUBLIC_GROQ_API_KEY': process.env.NEXT_PUBLIC_GROQ_API_KEY
  }

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    const message = `❌ Missing environment variables:\n${missing.join('\n')}`
    console.error(message)
    alert(message)
    throw new Error(message)
  }

  console.log('✅ All environment variables configured')
}
```

**Resultado:**
- Build falha se vars faltando (evita deploy quebrado)
- Alert no app se vars undefined

---

### Testar no Mobile

1. Build com variáveis:
```bash
npm run build:mobile
npm run cap:sync
npm run cap:open:android
```

2. Abra Chrome DevTools (`chrome://inspect`)

3. No console, verifique:
```javascript
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
// Esperado: https://your-project.supabase.co

console.log(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20))
// Esperado: eyJhbGciOiJIUzI1NiIsInR...
```

**Checklist:**
- [ ] Variáveis não retornam `undefined`
- [ ] App conecta ao Supabase sem erros
- [ ] Sem alerts de "Missing environment variables"

---

## Troubleshooting

| Problema | Causa | Solução |
|----------|-------|---------|
| `process.env.VAR` retorna `undefined` | Variável sem `NEXT_PUBLIC_` prefix | Renomear para `NEXT_PUBLIC_VAR` |
| Variáveis não atualizam | Cache de build | Delete `out/`, rebuild: `npm run build:mobile` |
| `dotenv-cli` não funciona | Não instalado ou script errado | Verificar `package.json` e reinstalar `dotenv-cli` |
| Erro "Cannot read .env.mobile" | Arquivo não existe ou caminho errado | Criar `.env.mobile` na raiz do projeto |
| Build falha ao carregar .env | Syntax error no arquivo | Verificar formato: `KEY=value` (sem espaços) |
| App funciona na web, não no mobile | `.env.local` não usado no build mobile | Usar `.env.mobile` com `dotenv -e .env.mobile` |
| Variáveis vazias após build | Arquivo `.env.mobile` vazio | Preencher variáveis, rebuild |

---

## Exemplo Completo

### Estrutura de Arquivos

```
ChatBot-Oficial/
├── .env.example            # Template (commitar no git)
├── .env.local              # Web dev (não commitar)
├── .env.mobile             # Mobile build (não commitar)
├── .gitignore              # .env.mobile adicionado
├── capacitor.config.ts
├── next.config.js
└── package.json            # Scripts modificados
```

---

### .env.example (Template)

```env
# .env.example (commitar no git como documentação)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# AI
NEXT_PUBLIC_OPENAI_API_KEY=sk-...
NEXT_PUBLIC_GROQ_API_KEY=gsk_...

# WhatsApp
NEXT_PUBLIC_META_PHONE_NUMBER_ID=899639703222013

# App
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

---

### .env.mobile (Valores Reais)

```env
# .env.mobile (NÃO commitar)

NEXT_PUBLIC_SUPABASE_URL=https://abcdefghij.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWoiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYyMzg5MDAwMCwiZXhwIjoxOTM5NDY2MDAwfQ.SIGNATURE
NEXT_PUBLIC_OPENAI_API_KEY=sk-proj-REAL_KEY_HERE
NEXT_PUBLIC_GROQ_API_KEY=gsk_REAL_KEY_HERE
NEXT_PUBLIC_META_PHONE_NUMBER_ID=899639703222013
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_API_BASE_URL=https://chat.luisfboff.com
```

---

### .gitignore

```gitignore
# Environment variables
.env
.env.local
.env.mobile
.env.mobile.*
.env*.local
```

---

### package.json

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "build:mobile": "cross-env CAPACITOR_BUILD=true dotenv -e .env.mobile next build",
    "cap:sync": "npx cap sync",
    "cap:open:android": "npx cap open android"
  },
  "devDependencies": {
    "dotenv-cli": "^7.3.0",
    "cross-env": "^7.0.3"
  }
}
```

---

### Workflow Completo

```bash
# 1. Criar .env.mobile com valores reais
code .env.mobile

# 2. Build com variáveis injetadas
npm run build:mobile

# 3. Sync com Android
npm run cap:sync

# 4. Abrir Android Studio
npm run cap:open:android

# 5. Rodar app (Shift + F10 no Android Studio)

# 6. Verificar em chrome://inspect
# Console deve mostrar variáveis corretas
```

---

**Path do Projeto**: `C:\Users\pedro\OneDrive\Área de Trabalho\ChatBot-Oficial\ChatBot-Oficial`

**CRÍTICO**: Sem environment variables, o app mobile não funciona. Siga este guia antes de testar!

# 📱 PLANO DE PUBLICAÇÃO - GOOGLE PLAY STORE
# ChatBot Oficial Mobile App

**Data de Criação:** 2026-02-20
**Status da Conta Google Play:** ✅ APROVADA
**Prontidão do App:** ⚠️ 70% PRONTO (requer correções críticas)

---

## 📊 ÍNDICE

1. [Resumo Executivo](#resumo-executivo)
2. [Análise do Estado Atual](#análise-do-estado-atual)
3. [Problemas Críticos Encontrados](#problemas-críticos-encontrados)
4. [Plano de Correção (OBRIGATÓRIO)](#plano-de-correção-obrigatório)
5. [Checklist Pré-Publicação](#checklist-pré-publicação)
6. [Processo de Build & Deploy](#processo-de-build--deploy)
7. [Materiais para Google Play Store](#materiais-para-google-play-store)
8. [Cronograma Estimado](#cronograma-estimado)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 RESUMO EXECUTIVO

### Estado Atual do Projeto

**O que funciona:**
- ✅ Infraestrutura mobile 95% configurada
- ✅ Capacitor 7.4.4 instalado e configurado
- ✅ Firebase integrado (Push Notifications)
- ✅ Build system (next.config.js, scripts)
- ✅ Helper `apiFetch()` implementado
- ✅ Autenticação mobile (Bearer token)
- ✅ CRM feature (100% mobile-compatible)
- ✅ Agents feature (100% mobile-compatible)

**O que NÃO funciona (CRÍTICO):**
- ❌ **Onboarding** (feature nova) - usa `fetch()` direto
- ❌ **Interactive Flows** (feature nova) - usa `fetch()` direto
- ❌ **Meta Ads Dashboard** - usa `fetch()` direto
- ❌ **15+ páginas** com chamadas `fetch()` incompatíveis com mobile

### Divergência Crítica Identificada

**PROBLEMA:** Features desenvolvidas APÓS a implementação inicial do mobile (Onboarding, Interactive Flows, Meta Ads) **NÃO seguiram o padrão mobile** de usar `apiFetch()`.

**IMPACTO:** Se publicar o app agora, **essas features não funcionarão** no mobile.

**SOLUÇÃO:** Substituir todas as chamadas `fetch('/api/...')` por `apiFetch('/api/...')` (tempo estimado: 4-6 horas).

---

## 🔍 ANÁLISE DO ESTADO ATUAL

### Compatibilidade de Features (Web vs Mobile)

| Feature | Status Web | Status Mobile | Observações |
|---------|-----------|---------------|-------------|
| **Landing Page** | ✅ Funciona | ✅ Funciona | Server Component estático |
| **Login/Register** | ✅ Funciona | ⚠️ Parcial | Login OK, Register usa `fetch()` ❌ |
| **Onboarding** | ✅ Funciona | ❌ Quebrado | 3x `fetch()` direto (linhas 119, 234, 372) |
| **Dashboard Home** | ✅ Funciona | ✅ Funciona | Client Component |
| **Conversas** | ✅ Funciona | ✅ Funciona | Usa `apiFetch()` via hooks |
| **Chat** | ✅ Funciona | ✅ Funciona | Usa `apiFetch()` via hooks |
| **Contatos** | ✅ Funciona | ✅ Funciona | Usa `apiFetch()` via hooks |
| **CRM** | ✅ Funciona | ✅ Funciona | Usa `apiFetch()` corretamente |
| **Agents** | ✅ Funciona | ✅ Funciona | Usa `apiFetch()` corretamente |
| **Interactive Flows** | ✅ Funciona | ❌ Quebrado | 3x `fetch()` direto (linhas 41, 75, 93) |
| **Meta Ads** | ✅ Funciona | ❌ Quebrado | 2x `fetch()` direto |
| **Knowledge Base** | ✅ Funciona | ✅ Funciona | Usa `apiFetch()` via componentes |
| **Templates** | ✅ Funciona | ✅ Funciona | Usa `apiFetch()` via hooks |
| **Analytics** | ✅ Funciona | ✅ Funciona | Client Component |
| **AI Gateway** | ✅ Funciona | ❌ Quebrado | 6 páginas com `fetch()` direto |
| **Settings** | ✅ Funciona | ⚠️ Parcial | Settings OK, TTS usa `fetch()` ❌ |
| **Backend/Audit** | ✅ Funciona | ✅ Funciona | Usa `apiFetch()` via hooks |

**Resumo:**
- ✅ **Funcionando:** 12 features (70%)
- ⚠️ **Parcialmente:** 2 features (12%)
- ❌ **Quebrado:** 3 features (18%)

### Análise de Páginas

**Total de Páginas:** 40

**Client Components:** 23 (57.5%) ✅
- Podem funcionar em static export

**Server Components (Estáticos):** 4 (10%) ✅
- `/` (Landing)
- `/privacy`
- `/terms`
- `/dpa`

**Páginas Usando `apiFetch()`:** 14 (60.8% dos Client Components) ✅

**Páginas Usando `fetch()` Direto:** 15+ (39.2%) ❌
- **CRÍTICO:** Não funcionarão no mobile

### Chamadas de API Incompatíveis

**Total de Chamadas `fetch()` Diretas:** 30+ instâncias

**Arquivos Afetados (Features Novas):**
```
src/app/onboarding/page.tsx                    - 3 chamadas ❌
src/app/dashboard/flows/page.tsx               - 3 chamadas ❌
src/app/dashboard/meta-ads/page.tsx            - 2 chamadas ❌
```

**Arquivos Afetados (Features Antigas):**
```
src/app/(auth)/register/page.tsx               - 1 chamada ❌
src/app/dashboard/settings/tts/page.tsx        - 4 chamadas ❌
src/app/dashboard/test-interactive/page.tsx    - 1 chamada ❌
src/app/dashboard/admin/budget-plans/page.tsx  - 3 chamadas ❌
src/app/dashboard/ai-gateway/test/page.tsx     - 1 chamada ❌
src/app/dashboard/ai-gateway/setup/page.tsx    - 6 chamadas ❌
src/app/dashboard/ai-gateway/models/page.tsx   - 4 chamadas ❌
src/app/dashboard/ai-gateway/cache/page.tsx    - 3 chamadas ❌
src/app/dashboard/ai-gateway/budget/page.tsx   - 1+ chamadas ❌
```

---

## ⚠️ PROBLEMAS CRÍTICOS ENCONTRADOS

### 🔴 PROBLEMA #1: Features Novas Não São Mobile-Compatible

**Features Afetadas:**
1. **Onboarding Wizard** (`/onboarding`)
2. **Interactive Flows** (`/dashboard/flows`)
3. **Meta Ads Dashboard** (`/dashboard/meta-ads`)

**Root Cause:**
Desenvolvedor não usou o helper `apiFetch()` ao criar essas features.

**Código Problemático:**
```typescript
// ❌ ERRADO - Não funciona no mobile
const response = await fetch('/api/onboarding/get-client')

// ✅ CORRETO - Funciona em web e mobile
import { apiFetch } from '@/lib/api'
const response = await apiFetch('/api/onboarding/get-client')
```

**Por que quebra no mobile?**
- Mobile é static export (sem servidor)
- `/api/*` routes não existem no app compilado
- Precisa chamar servidor remoto (https://uzzapp.uzzai.com.br)
- Precisa incluir Bearer token no header

**Como `apiFetch()` resolve:**
```typescript
// src/lib/api.ts
export async function apiFetch(endpoint: string, options?: RequestInit) {
  const isMobile = Capacitor.isNativePlatform()

  if (isMobile) {
    // Mobile: chama servidor remoto
    const baseUrl = process.env.NEXT_PUBLIC_API_URL
    const session = await supabase.auth.getSession()
    headers["Authorization"] = `Bearer ${session.access_token}`
    url = `${baseUrl}${endpoint}`
  } else {
    // Web: chama API local
    url = endpoint
  }

  return fetch(url, options)
}
```

### 🔴 PROBLEMA #2: Inconsistência no Padrão de Código

**Problema:**
- Algumas features usam `apiFetch()` corretamente (CRM, Agents)
- Outras features usam `fetch()` direto (Onboarding, Flows)

**Causa:**
- Falta de enforcement (sem ESLint rule)
- Falta de código review focado em mobile
- Falta de documentação visível no código

**Impacto:**
- Desenvolvedor novo ou apressado não sabe do padrão
- Features quebram silenciosamente no mobile
- Descoberta tardia (só ao testar no mobile)

### 🔴 PROBLEMA #3: Nenhum Teste Mobile-Specific

**Problema:**
- Nenhum teste automatizado para mobile
- Nenhum CI/CD que valide build mobile
- Descoberta manual de problemas

**Sugestão:**
```bash
# Pre-commit hook
git diff --cached | grep "fetch('/api" && echo "ERRO: Use apiFetch()" && exit 1
```

---

## 🔧 PLANO DE CORREÇÃO (OBRIGATÓRIO)

### Fase 1: Corrigir Features Críticas (PRIORIDADE MÁXIMA)

**Tempo Estimado:** 2-3 horas

#### 1.1. Corrigir Onboarding (`src/app/onboarding/page.tsx`)

**Linha 119:**
```typescript
// ❌ ANTES
const clientResponse = await fetch(
  `/api/onboarding/get-client?client_id=${clientId}`
)

// ✅ DEPOIS
import { apiFetch } from '@/lib/api'
const clientResponse = await apiFetch(
  `/api/onboarding/get-client?client_id=${clientId}`
)
```

**Linha 234 e 372:**
```typescript
// ❌ ANTES
const response = await fetch('/api/onboarding/configure-ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
})

// ✅ DEPOIS
import { apiFetch } from '@/lib/api'
const response = await apiFetch('/api/onboarding/configure-ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
})
```

#### 1.2. Corrigir Interactive Flows (`src/app/dashboard/flows/page.tsx`)

**Linha 41:**
```typescript
// ❌ ANTES
const response = await fetch('/api/flows')

// ✅ DEPOIS
import { apiFetch } from '@/lib/api'
const response = await apiFetch('/api/flows')
```

**Linha 75:**
```typescript
// ❌ ANTES
const response = await fetch(`/api/flows/${flowId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(flowData)
})

// ✅ DEPOIS
import { apiFetch } from '@/lib/api'
const response = await apiFetch(`/api/flows/${flowId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(flowData)
})
```

**Linha 93:**
```typescript
// ❌ ANTES
const response = await fetch(`/api/flows/${flowId}`, {
  method: 'DELETE'
})

// ✅ DEPOIS
import { apiFetch } from '@/lib/api'
const response = await apiFetch(`/api/flows/${flowId}`, {
  method: 'DELETE'
})
```

#### 1.3. Corrigir Meta Ads (`src/app/dashboard/meta-ads/page.tsx`)

**Encontrar e substituir todas as chamadas `fetch()` por `apiFetch()`**

### Fase 2: Corrigir Features Secundárias (PRIORIDADE MÉDIA)

**Tempo Estimado:** 2-3 horas

#### 2.1. Corrigir Register (`src/app/(auth)/register/page.tsx`)
- 1 chamada `fetch()` → `apiFetch()`

#### 2.2. Corrigir Settings TTS (`src/app/dashboard/settings/tts/page.tsx`)
- 4 chamadas `fetch()` → `apiFetch()`

#### 2.3. Corrigir AI Gateway (6 arquivos)
- `src/app/dashboard/ai-gateway/test/page.tsx` (1 chamada)
- `src/app/dashboard/ai-gateway/setup/page.tsx` (6 chamadas)
- `src/app/dashboard/ai-gateway/models/page.tsx` (4 chamadas)
- `src/app/dashboard/ai-gateway/cache/page.tsx` (3 chamadas)
- `src/app/dashboard/ai-gateway/budget/page.tsx` (1+ chamadas)

#### 2.4. Corrigir Admin (`src/app/dashboard/admin/budget-plans/page.tsx`)
- 3 chamadas `fetch()` → `apiFetch()`

### Fase 3: Validação e Testes

**Tempo Estimado:** 2-3 horas

#### 3.1. Busca Automatizada
```bash
# Verificar se ainda existe fetch('/api
grep -r "fetch('/api" src/app --include="*.tsx" --include="*.ts" --exclude-dir=api
```

**Resultado esperado:** Nenhuma ocorrência (exceto dentro de `src/app/api/`)

#### 3.2. Build de Teste
```bash
# Build mobile
npm run build:mobile

# Verificar se out/ foi gerado
ls out/

# Sync com Android
npx cap sync android
```

#### 3.3. Teste em Emulador

**Fluxo de Teste:**
1. Abrir app no emulador
2. Fazer login
3. **Testar Onboarding** (se aplicável)
4. **Testar CRM** (deve funcionar ✅)
5. **Testar Agents** (deve funcionar ✅)
6. **Testar Interactive Flows** (deve funcionar após fix ✅)
7. Testar conversas/chat
8. Testar upload de documentos
9. Testar analytics

### Fase 4: Enforcement (Prevenir Regressão)

**Tempo Estimado:** 1 hora

#### 4.1. Adicionar Pre-commit Hook

**Criar `.husky/pre-commit`:**
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Verificar uso de fetch('/api
FILES=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.(ts|tsx)$' | grep -v 'src/app/api/')

if [ -n "$FILES" ]; then
  for FILE in $FILES; do
    if git diff --cached "$FILE" | grep -q "fetch('/api"; then
      echo "❌ ERRO: Encontrado fetch('/api') em $FILE"
      echo "Use apiFetch() de @/lib/api para compatibilidade mobile"
      exit 1
    fi
  done
fi
```

#### 4.2. Adicionar Comentário no Código

**No topo de `src/lib/api.ts`:**
```typescript
/**
 * ⚠️ MOBILE COMPATIBILITY RULE ⚠️
 *
 * SEMPRE use apiFetch() para chamar API routes (/api/*).
 * NUNCA use fetch() direto.
 *
 * Por quê?
 * - Web: API routes funcionam localmente
 * - Mobile: App é static export, precisa chamar servidor remoto
 *
 * ❌ ERRADO:
 * const response = await fetch('/api/conversations')
 *
 * ✅ CORRETO:
 * import { apiFetch } from '@/lib/api'
 * const response = await apiFetch('/api/conversations')
 *
 * Ver: docs/setup/CRITICAL_MOBILE_API_PATTERN.md
 */
export async function apiFetch(endpoint: string, options?: RequestInit): Promise<Response>
```

#### 4.3. Adicionar ao README Principal

**Adicionar seção:**
```markdown
## 📱 Desenvolvimento Mobile

**REGRA CRÍTICA:** Ao chamar API routes (`/api/*`), SEMPRE use `apiFetch()`:

\`\`\`typescript
// ❌ ERRADO
const response = await fetch('/api/...')

// ✅ CORRETO
import { apiFetch } from '@/lib/api'
const response = await apiFetch('/api/...')
\`\`\`

Ver: [CRITICAL_MOBILE_API_PATTERN.md](docs/setup/CRITICAL_MOBILE_API_PATTERN.md)
```

---

## ✅ CHECKLIST PRÉ-PUBLICAÇÃO

### Código & Build

- [ ] **Todas as chamadas `fetch('/api')` substituídas por `apiFetch()`**
  - [ ] Onboarding (3 instâncias)
  - [ ] Interactive Flows (3 instâncias)
  - [ ] Meta Ads (2+ instâncias)
  - [ ] Register (1 instância)
  - [ ] Settings TTS (4 instâncias)
  - [ ] AI Gateway (15+ instâncias)
  - [ ] Admin Budget Plans (3 instâncias)

- [ ] **Busca automatizada retorna zero resultados:**
  ```bash
  grep -r "fetch('/api" src/app --include="*.tsx" --include="*.ts" --exclude-dir=api
  ```

- [ ] **Build mobile completo com sucesso:**
  ```bash
  npm run build:mobile
  ```

- [ ] **Pasta `out/` gerada corretamente:**
  ```bash
  ls out/ | head -20
  ```

- [ ] **Capacitor sync sem erros:**
  ```bash
  npx cap sync android
  ```

### Testes Funcionais (Emulador/Device)

- [ ] **Login funciona** (com e sem biometria)
- [ ] **Onboarding funciona** (se aplicável)
- [ ] **Dashboard carrega corretamente**
- [ ] **Conversas listam e abrem**
- [ ] **Chat envia/recebe mensagens**
- [ ] **CRM carrega cards e permite criação**
- [ ] **Agents listam e podem ser ativados**
- [ ] **Interactive Flows listam e podem ser editados**
- [ ] **Knowledge base permite upload**
- [ ] **Analytics carregam gráficos**
- [ ] **Settings salvam configurações**

### Build Android

- [ ] **Keystore gerado:**
  ```bash
  ls android/app/release.keystore
  ```

- [ ] **`release.properties` criado e configurado:**
  ```bash
  cat android/release.properties
  ```

- [ ] **`versionCode` e `versionName` atualizados:**
  ```gradle
  // android/app/build.gradle
  versionCode 1
  versionName "1.0.0"
  ```

- [ ] **Build AAB com sucesso:**
  ```bash
  cd android
  ./gradlew bundleRelease
  ```

- [ ] **AAB gerado:**
  ```bash
  ls app/build/outputs/bundle/release/app-release.aab
  ```

- [ ] **AAB assinado corretamente:**
  ```bash
  jarsigner -verify -verbose -certs app/build/outputs/bundle/release/app-release.aab
  ```

### Materiais Google Play Store

- [ ] **Ícone 512x512 PNG** (32-bit com alpha)
- [ ] **Banner 1024x500 PNG/JPEG**
- [ ] **Screenshots (mínimo 2, recomendado 8)**
  - Resolução: 16:9 ou 9:16
  - Tamanho mínimo: 320px (lado menor)
  - Formato: PNG ou JPEG

- [ ] **Descrição curta** (até 80 caracteres)
  ```
  Exemplo: "Chatbot WhatsApp com IA para atendimento automatizado"
  ```

- [ ] **Descrição completa** (até 4000 caracteres)
  - Explicar funcionalidades
  - Benefícios
  - Como usar
  - Diferenciais

- [ ] **Política de Privacidade** acessível em:
  ```
  https://uzzapp.uzzai.com.br/privacy
  ```

- [ ] **Termos de Serviço** acessíveis em:
  ```
  https://uzzapp.uzzai.com.br/terms
  ```

### Google Play Console

- [ ] **App criado no Console**
- [ ] **Informações básicas preenchidas:**
  - Nome do app
  - Descrição curta
  - Descrição completa
  - Categoria
  - Tags

- [ ] **Questionário de classificação de conteúdo completo**
- [ ] **Público-alvo definido**
- [ ] **Países/regiões selecionados**
- [ ] **Preço definido (Grátis)**
- [ ] **Dados de contato do desenvolvedor**

---

## 🚀 PROCESSO DE BUILD & DEPLOY

### Passo 1: Correções de Código (VS Code)

```bash
# 1. Criar branch para correções
git checkout -b fix/mobile-compatibility

# 2. Aplicar todas as correções (Fase 1 e 2)
# Editar arquivos substituindo fetch() por apiFetch()

# 3. Verificar se ainda existe fetch('/api
grep -r "fetch('/api" src/app --include="*.tsx" --include="*.ts" --exclude-dir=api

# 4. Commit
git add .
git commit -m "fix: substituir fetch() por apiFetch() para mobile compatibility"

# 5. Merge para main
git checkout main
git merge fix/mobile-compatibility
```

### Passo 2: Build Mobile (VS Code)

```bash
# 1. Garantir que está na branch main atualizada
git pull origin main

# 2. Build mobile de produção
npm run build:mobile

# Ou manualmente se preferir:
# CAPACITOR_BUILD=true NEXT_PUBLIC_API_URL=https://uzzapp.uzzai.com.br next build

# 3. Verificar se out/ foi gerado
ls out/

# 4. Sincronizar com Capacitor
npx cap sync android

# 5. Verificar que assets foram copiados
ls android/app/src/main/assets/public/ | head -10
```

### Passo 3: Configurar Keystore (Android Studio)

**⚠️ FAZER APENAS UMA VEZ**

```bash
# 1. Navegar para pasta android/app
cd android/app

# 2. Gerar keystore
keytool -genkey -v -keystore release.keystore -alias chatbot -keyalg RSA -keysize 2048 -validity 10000

# Preencher informações:
# - Password: [CRIAR E GUARDAR COM SEGURANÇA]
# - Nome e sobrenome: Seu nome
# - Unidade organizacional: Uzz.AI
# - Organização: Uzz.AI
# - Cidade: Sua cidade
# - Estado: Seu estado
# - Código do país: BR

# 3. Voltar para android/
cd ..

# 4. Criar release.properties
cat > release.properties << EOF
storeFile=app/release.keystore
storePassword=SUA_SENHA_AQUI
keyAlias=chatbot
keyPassword=SUA_SENHA_AQUI
EOF

# ⚠️ IMPORTANTE: Fazer backup do keystore e senha!
# Sem isso, não conseguirá atualizar o app futuramente
```

### Passo 4: Atualizar Versão (Android Studio)

**Editar `android/app/build.gradle`:**

```gradle
defaultConfig {
    applicationId "com.chatbot.app"
    minSdkVersion rootProject.ext.minSdkVersion
    targetSdkVersion rootProject.ext.targetSdkVersion
    versionCode 1        // Incrementar a cada release: 1, 2, 3...
    versionName "1.0.0"  // Versão visível: "1.0.0", "1.0.1", "1.1.0"...
    // ...
}
```

**Regra de versionamento:**
- `versionCode`: Inteiro incremental (Google Play usa para ordenar)
- `versionName`: Semver (Major.Minor.Patch)

### Passo 5: Build AAB (Android Studio)

```bash
# 1. Navegar para pasta android/
cd android

# 2. Build release (AAB)
./gradlew bundleRelease

# 3. Verificar se AAB foi gerado
ls -lh app/build/outputs/bundle/release/app-release.aab

# Saída esperada:
# -rw-r--r-- 1 user user 8.5M Feb 20 14:30 app-release.aab

# 4. Verificar assinatura
jarsigner -verify -verbose -certs app/build/outputs/bundle/release/app-release.aab | grep "Signed by"

# Saída esperada:
# Signed by "CN=Seu Nome, OU=Uzz.AI, ..."
```

**Se houver erro de assinatura:**
```bash
# Verificar se release.properties existe
cat release.properties

# Verificar se keystore existe
ls app/release.keystore

# Rebuild
./gradlew clean
./gradlew bundleRelease
```

### Passo 6: Testar no Emulador/Device (Opcional mas Recomendado)

```bash
# 1. Abrir Android Studio
npx cap open android

# 2. No Android Studio:
# - Selecionar device/emulador
# - Clicar em "Run" (botão verde)

# 3. App abrirá no device
# Testar todas as funcionalidades principais

# Ou instalar APK manualmente:
./gradlew assembleRelease
adb install app/build/outputs/apk/release/app-release.apk
```

### Passo 7: Upload para Google Play Console

#### 7.1. Acessar Console

```
https://play.google.com/console
```

#### 7.2. Criar App (se ainda não criou)

1. Clique em "Criar app"
2. Preencha:
   - **Nome:** ChatBot Oficial
   - **Idioma padrão:** Português (Brasil)
   - **Tipo:** App
   - **Grátis ou pago:** Grátis
3. Aceite políticas e crie

#### 7.3. Preencher Informações Obrigatórias

**Ficha da Loja:**
1. Navegue para "Ficha da loja principal"
2. Preencha:
   - Descrição curta (80 caracteres)
   - Descrição completa (4000 caracteres)
   - Upload ícone 512x512
   - Upload screenshots (mínimo 2)
   - Upload banner 1024x500 (se disponível)

**Classificação de Conteúdo:**
1. Navegue para "Classificação de conteúdo"
2. Preencha questionário
3. Categoria: Negócios/Produtividade
4. Público: Todos os públicos
5. Enviar para análise

**Política de Privacidade:**
1. Navegue para "Política de privacidade"
2. Adicionar URL: `https://uzzapp.uzzai.com.br/privacy`

**Público-alvo e conteúdo:**
1. Público-alvo: Adultos (18+) ou Todos
2. Países: Brasil (para começar)

#### 7.4. Criar Release de Produção

1. Navegue para "Lançamentos" > "Produção"
2. Clique em "Criar novo lançamento"
3. **Gestão de assinatura do app:**
   - Recomendado: "Google Play App Signing"
   - Fazer upload da chave de assinatura (keystore)
4. Upload AAB:
   - Arraste `app-release.aab` ou clique para selecionar
   - Aguardar processamento (2-5 minutos)
5. Preencher "Notas de versão":
   ```
   Primeira versão do ChatBot Oficial!

   Funcionalidades:
   - Atendimento automatizado via WhatsApp
   - CRM integrado
   - Agentes de IA configuráveis
   - Fluxos interativos
   - Base de conhecimento
   - Analytics e métricas
   ```
6. Revisar e clicar em "Revisar lançamento"
7. Se tudo estiver OK, clicar em "Iniciar lançamento para produção"

#### 7.5. Aguardar Revisão

**Tempo de Revisão:**
- Mínimo: 1-2 dias
- Médio: 3-5 dias
- Máximo: 7 dias

**O que o Google revisa:**
- Segurança (malware, vírus)
- Conteúdo (não viola políticas)
- Funcionalidade (app não quebra)
- Metadados (descrição condiz com app)

**Status:**
- Você receberá email quando aprovado/rejeitado
- Pode acompanhar em "Lançamentos" > "Produção"

---

## 📸 MATERIAIS PARA GOOGLE PLAY STORE

### 1. Ícone do App (OBRIGATÓRIO)

**Especificações:**
- Tamanho: **512 x 512 pixels**
- Formato: **PNG** (32-bit com canal alpha)
- Máximo: 1 MB
- Sem transparência ou cantos arredondados (Google adiciona)

**Onde está o ícone atual:**
```
android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png (192x192)
```

**AÇÃO NECESSÁRIA:**
- Criar versão 512x512 do ícone
- Ou usar ferramenta: https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html

### 2. Banner Promocional (Opcional mas Recomendado)

**Especificações:**
- Tamanho: **1024 x 500 pixels**
- Formato: PNG ou JPEG
- Máximo: 1 MB

**Sugestão de conteúdo:**
- Logo do app
- Tagline: "Atendimento WhatsApp Automatizado com IA"
- Screenshot do dashboard
- Cores da marca

### 3. Screenshots (OBRIGATÓRIO - Mínimo 2)

**Especificações:**
- **Telefone:**
  - Aspecto: 16:9 ou 9:16
  - Lado menor: mínimo 320px
  - Lado maior: máximo 3840px
  - Formato: PNG ou JPEG
  - Máximo: 8 MB cada

**Quantas screenshots:**
- Mínimo: 2
- Recomendado: 4-8
- Máximo: 8

**Sugestões de telas para screenshot:**
1. **Login** (com logo e campos)
2. **Dashboard** (visão geral com gráficos)
3. **Conversas** (lista de conversas ativas)
4. **Chat** (conversação com cliente)
5. **CRM** (cards de clientes)
6. **Agents** (lista de agentes configurados)
7. **Analytics** (gráficos e métricas)
8. **Settings** (tela de configurações)

**Como tirar screenshots:**
```bash
# 1. Abrir app no emulador
npx cap open android

# 2. No Android Studio, clicar em "Camera" (canto direito)
# Ou usar botão de screenshot do emulador

# 3. Salvar em:
docs/mobile/screenshots/
```

**Dica:** Use dispositivo/emulador com resolução comum (1080x1920 ou 1440x2560)

### 4. Descrição Curta (OBRIGATÓRIO)

**Limite:** 80 caracteres

**Sugestões:**
```
Opção 1: "Chatbot WhatsApp com IA para atendimento automatizado e CRM integrado"
Opção 2: "Automatize atendimento WhatsApp com IA, CRM e fluxos inteligentes"
Opção 3: "Atendimento WhatsApp automatizado com IA e gestão de clientes"
```

### 5. Descrição Completa (OBRIGATÓRIO)

**Limite:** 4000 caracteres

**Estrutura Sugerida:**

```markdown
# ChatBot Oficial - Atendimento WhatsApp Automatizado com IA

Transforme seu atendimento no WhatsApp com inteligência artificial e automação completa.

## 🤖 O que é o ChatBot Oficial?

ChatBot Oficial é a solução completa para automatizar seu atendimento no WhatsApp Business usando inteligência artificial avançada. Com nosso app, você gerencia conversas, clientes e métricas em um só lugar.

## ✨ Principais Funcionalidades

### Atendimento Automatizado
- Respostas inteligentes com IA (GPT-4, Groq Llama)
- Transferência para atendente humano quando necessário
- Suporte a áudio, imagem e documentos
- Contexto de conversação completo

### CRM Integrado
- Gestão completa de clientes
- Tags e categorização
- Histórico de interações
- Funil de vendas

### Agentes Personalizados
- Crie agentes com personalidades diferentes
- Configure respostas específicas
- Múltiplos agentes por cliente
- Ativação/desativação rápida

### Fluxos Interativos
- Crie fluxos de atendimento visuais
- Botões e menus interativos
- Condições e ramificações
- Templates prontos

### Base de Conhecimento
- Upload de documentos (PDF, TXT)
- Busca semântica com IA
- Respostas baseadas nos seus documentos
- Atualização em tempo real

### Analytics e Métricas
- Dashboard completo
- Métricas de atendimento
- Análise de conversas
- Relatórios exportáveis

## 🎯 Para quem é?

- **Empresas** que atendem via WhatsApp
- **E-commerce** com suporte ativo
- **Agências** que gerenciam múltiplos clientes
- **Profissionais** que querem escalar atendimento

## 🔐 Segurança e Privacidade

- Autenticação biométrica (impressão digital/Face ID)
- Dados criptografados
- Conformidade LGPD
- Política de privacidade completa

## 🚀 Como Começar?

1. Faça login com sua conta
2. Configure seu primeiro agente
3. Conecte seu WhatsApp Business
4. Comece a automatizar!

## 📞 Suporte

Dúvidas? Acesse: https://uzzapp.uzzai.com.br
Email: suporte@uzzai.com.br

---

Desenvolvido com ❤️ pela equipe Uzz.AI
```

### 6. Categoria e Tags

**Categoria Principal:** Negócios

**Subcategoria:** Produtividade / Comunicação

**Tags sugeridas:**
- WhatsApp
- Chatbot
- IA
- Atendimento
- CRM
- Automação
- Inteligência Artificial
- Suporte ao Cliente

---

## ⏱️ CRONOGRAMA ESTIMADO

### Fase 1: Correção de Código (1 dia útil)

| Tarefa | Tempo | Responsável |
|--------|-------|-------------|
| Corrigir Onboarding | 30 min | Dev |
| Corrigir Interactive Flows | 30 min | Dev |
| Corrigir Meta Ads | 30 min | Dev |
| Corrigir Register | 15 min | Dev |
| Corrigir Settings TTS | 30 min | Dev |
| Corrigir AI Gateway (6 páginas) | 2 horas | Dev |
| Corrigir Admin | 30 min | Dev |
| Validação (grep + build teste) | 1 hora | Dev |
| **Total Fase 1** | **6 horas** | |

### Fase 2: Build e Configuração (2-3 horas)

| Tarefa | Tempo | Responsável |
|--------|-------|-------------|
| Gerar keystore (primeira vez) | 10 min | Dev |
| Criar release.properties | 5 min | Dev |
| Atualizar versionCode/Name | 5 min | Dev |
| Build mobile (npm run build:mobile) | 5 min | Automático |
| Sync Capacitor | 2 min | Automático |
| Build AAB (gradlew bundleRelease) | 10 min | Automático |
| Teste no emulador | 1 hora | QA/Dev |
| Ajustes se necessário | 30 min | Dev |
| **Total Fase 2** | **2-3 horas** | |

### Fase 3: Materiais da Loja (2-4 horas)

| Tarefa | Tempo | Responsável |
|--------|-------|-------------|
| Criar ícone 512x512 | 30 min | Designer |
| Criar banner 1024x500 | 1 hora | Designer |
| Tirar screenshots (8 telas) | 1 hora | QA/Marketing |
| Escrever descrição curta | 15 min | Marketing |
| Escrever descrição completa | 1 hora | Marketing |
| Revisar textos | 30 min | Marketing |
| **Total Fase 3** | **4-5 horas** | |

### Fase 4: Google Play Console (1-2 horas)

| Tarefa | Tempo | Responsável |
|--------|-------|-------------|
| Criar app no Console | 10 min | Dev/Admin |
| Preencher informações básicas | 20 min | Marketing/Dev |
| Upload materiais (ícone, screenshots, banner) | 15 min | Dev |
| Configurar política de privacidade | 5 min | Dev |
| Preencher questionário de conteúdo | 20 min | Dev/Legal |
| Configurar países/preço | 5 min | Dev/Admin |
| Upload AAB e criar release | 15 min | Dev |
| Revisar e submeter | 10 min | Dev/Admin |
| **Total Fase 4** | **1-2 horas** | |

### Fase 5: Revisão Google (1-7 dias)

| Etapa | Tempo | Ação |
|-------|-------|------|
| Processamento inicial | 1-2 horas | Aguardar |
| Análise de segurança | 1-2 dias | Aguardar |
| Revisão de conteúdo | 1-3 dias | Aguardar |
| Revisão de funcionalidade | 1-2 dias | Aguardar |
| **Total Fase 5** | **1-7 dias** | Aguardar email do Google |

### Cronograma Consolidado

**Trabalho Ativo:** 1-2 dias úteis (13-17 horas)
**Aguardando Google:** 1-7 dias
**Total até publicação:** 2-9 dias

---

## 🔧 TROUBLESHOOTING

### Problema 1: Build mobile falha com erro

**Erro:**
```
Error: Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
```

**Solução:**
```bash
# Limpar cache
rm -rf .next out node_modules/.cache

# Reinstalar dependências
npm install

# Rebuild
npm run build:mobile
```

---

### Problema 2: apiFetch() não está definido no mobile

**Erro no console do app:**
```
ReferenceError: apiFetch is not defined
```

**Causa:** Importação incorreta

**Solução:**
```typescript
// ✅ CORRETO
import { apiFetch } from '@/lib/api'

// ❌ ERRADO
import apiFetch from '@/lib/api'
```

---

### Problema 3: App quebra ao chamar API

**Erro:**
```
TypeError: Failed to fetch
Network request failed
```

**Causa:** Ainda existe `fetch()` direto ao invés de `apiFetch()`

**Solução:**
```bash
# Encontrar todas as chamadas fetch('/api
grep -rn "fetch('/api" src/app --include="*.tsx" --include="*.ts" --exclude-dir=api

# Substituir por apiFetch()
```

---

### Problema 4: Keystore não encontrado

**Erro:**
```
Execution failed for task ':app:bundleRelease'.
> Keystore file not found
```

**Solução:**
```bash
# Verificar se release.properties existe
cat android/release.properties

# Verificar se keystore existe no caminho correto
ls android/app/release.keystore

# Se não existe, gerar novamente:
cd android/app
keytool -genkey -v -keystore release.keystore -alias chatbot -keyalg RSA -keysize 2048 -validity 10000
```

---

### Problema 5: AAB não assina corretamente

**Erro:**
```
jarsigner: unable to sign jar: java.util.zip.ZipException: invalid entry compressed size
```

**Solução:**
```bash
# Rebuild limpo
cd android
./gradlew clean
./gradlew bundleRelease
```

---

### Problema 6: Google Play rejeita AAB

**Motivos comuns:**
1. **versionCode não incrementado**
   - Solução: Aumentar versionCode no build.gradle

2. **App já existe com mesmo package name**
   - Solução: Mudar applicationId no build.gradle

3. **Violação de política (conteúdo proibido)**
   - Solução: Revisar política do Google Play

4. **Falta de permissões declaradas**
   - Solução: Declarar todas as permissões no AndroidManifest.xml

---

### Problema 7: Features não funcionam no mobile

**Sintoma:** Feature funciona na web, mas quebra no mobile

**Checklist de Debug:**
```bash
# 1. Verificar se página usa apiFetch()
grep "apiFetch" src/app/[feature]/page.tsx

# 2. Se não usa, verificar se tem fetch('/api
grep "fetch('/api" src/app/[feature]/page.tsx

# 3. Se encontrar, substituir por apiFetch()

# 4. Rebuild e retest
npm run build:mobile
npx cap sync android
```

---

### Problema 8: Emulador não conecta ao backend

**Erro:**
```
Network request failed: ERR_CONNECTION_REFUSED
```

**Causa:** Mobile tentando acessar localhost

**Solução:**
Verificar `NEXT_PUBLIC_API_URL`:
```bash
# Deve apontar para produção, não localhost
echo $NEXT_PUBLIC_API_URL
# Esperado: https://uzzapp.uzzai.com.br

# Se não está definido, definir no build:
NEXT_PUBLIC_API_URL=https://uzzapp.uzzai.com.br npm run build:mobile
```

---

## 📞 CONTATOS E RECURSOS

### Documentação do Projeto

- **Arquitetura Mobile vs Web:** `docs/app/ARQUITETURA_DESENVOLVIMENTO_WEB_VS_MOBILE.md`
- **Padrão API Mobile:** `docs/setup/CRITICAL_MOBILE_API_PATTERN.md`
- **Setup Completo:** `docs/setup/MOBILE_MERGE_SUMMARY.md`

### Documentação Externa

- **Capacitor:** https://capacitorjs.com/docs
- **Android Studio:** https://developer.android.com/studio
- **Google Play Console:** https://play.google.com/console/developers
- **Políticas do Google Play:** https://play.google.com/about/developer-content-policy/

### Suporte

- **Google Play Developer Support:** https://support.google.com/googleplay/android-developer
- **Stack Overflow:** https://stackoverflow.com/questions/tagged/capacitor

---

## ✅ CONCLUSÃO

### Resumo do Plano

1. **Situação Atual:** App 70% pronto, com 3 features críticas quebradas no mobile
2. **Correções Necessárias:** Substituir 30+ chamadas `fetch()` por `apiFetch()`
3. **Tempo Estimado:** 1-2 dias de trabalho ativo
4. **Publicação:** 2-9 dias até app estar live

### Próximos Passos Imediatos

**Hoje:**
1. [ ] Começar Fase 1: Corrigir Onboarding, Flows, Meta Ads
2. [ ] Validar correções com build de teste

**Amanhã:**
1. [ ] Finalizar Fase 1: Corrigir demais páginas
2. [ ] Iniciar Fase 2: Build AAB

**Próxima Semana:**
1. [ ] Fase 3: Criar materiais da loja
2. [ ] Fase 4: Submeter para Google Play
3. [ ] Fase 5: Aguardar aprovação

### Expectativa de Timeline

- **Correções:** 20/02 - 21/02 (2 dias)
- **Build & Materiais:** 22/02 - 23/02 (2 dias)
- **Submissão:** 24/02 (1 dia)
- **Revisão Google:** 25/02 - 03/03 (1-7 dias)
- **App Live:** ~27/02 - 03/03 ✅

**Parabéns pela aprovação da conta! Agora é executar este plano e seu app estará publicado em breve.** 🚀

---

**Documento criado em:** 2026-02-20
**Última atualização:** 2026-02-20
**Versão:** 1.0
**Autor:** Claude AI (análise baseada em código real do projeto)

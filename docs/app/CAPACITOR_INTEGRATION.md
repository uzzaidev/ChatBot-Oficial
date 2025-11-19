# Capacitor Integration Guide - Mobile App (iOS & Android)

## Índice

1. [Visão Geral](#visão-geral)
2. [Estratégia de Integração](#estratégia-de-integração)
3. [Pré-requisitos](#pré-requisitos)
4. [Instalação e Configuração](#instalação-e-configuração)
5. [Estrutura do Projeto](#estrutura-do-projeto)
6. [Mudanças Necessárias](#mudanças-necessárias)
7. [APIs Nativas Disponíveis](#apis-nativas-disponíveis)
8. [Build e Deploy](#build-e-deploy)
9. [Limitações e Workarounds](#limitações-e-workarounds)
10. [Troubleshooting](#troubleshooting)

---

## Visão Geral

Este documento descreve como transformar o dashboard Next.js atual em um aplicativo mobile nativo usando **Capacitor**.

### O que é Capacitor?

Capacitor é uma plataforma cross-platform que permite executar aplicações web em iOS e Android. Diferente do Electron (desktop), o Capacitor:

- ✅ Converte sua aplicação Next.js em app nativo
- ✅ Fornece acesso a APIs nativas (câmera, notificações, biometria, etc.)
- ✅ Mantém 100% do código web existente
- ✅ Não requer reescrever em React Native ou Flutter
- ✅ Permite desenvolvimento paralelo (web + mobile)

### Por que Capacitor para este projeto?

**Vantagens**:
- Reaproveita todo o código existente (React, TypeScript, Tailwind)
- Dashboard já é responsivo e funcional
- Componentes shadcn/ui funcionam nativamente
- Acesso a notificações push nativas
- Biometria para autenticação
- Melhor UX em mobile (offline mode, gestos nativos)

**Desvantagens**:
- Requer build estático do Next.js (sem SSR/Server Components)
- Algumas APIs serverless precisam migrar para backend externo
- Aumenta complexidade de deploy (3 plataformas: web, iOS, Android)

---

## Estratégia de Integração

### Opção 1: **Paralela e Modular** (Recomendado ✅)

Trabalhe em uma branch separada sem quebrar o projeto web:

```bash
git checkout -b feature/mobile-app
```

**Workflow**:
1. Instalar Capacitor no projeto existente
2. Configurar build estático (`output: 'export'`)
3. Criar wrapper de APIs (detectar plataforma: web vs. mobile)
4. Desenvolver e testar em paralelo
5. Merge quando pronto (ou manter separado indefinidamente)

**Estrutura**:
```
project/
├── src/                    # Código compartilhado (web + mobile)
├── capacitor.config.ts     # Config Capacitor (mobile only)
├── android/                # Projeto Android nativo
├── ios/                    # Projeto iOS nativo
├── next.config.js          # Config Next.js (detecta target: web | mobile)
└── package.json            # Scripts para web e mobile
```

**Vantagens**:
- ✅ Não quebra o projeto web existente
- ✅ Deploy independente (web continua em Vercel)
- ✅ Permite testar mobile sem afetar produção
- ✅ Código compartilhado (componentes, hooks, utils)

### Opção 2: **Migração Completa**

Substituir o projeto web por versão mobile-first:

**Vantagens**:
- Código único (sem duplicação)
- Decisões de arquitetura simplificadas

**Desvantagens**:
- ❌ Perde recursos do Next.js (SSR, ISR, Server Actions)
- ❌ Precisa refatorar APIs serverless
- ❌ Mais arriscado (pode quebrar produção)

**Recomendação**: Use Opção 1 (Paralela e Modular).

---

## Estratégia de Desenvolvimento Paralelo - Como Funciona na Prática

### ❓ Pergunta Crítica: Posso desenvolver web e mobile ao mesmo tempo?

**Resposta Curta**: ✅ **SIM, pode e DEVE trabalhar em paralelo**.

### 🔄 Como Funciona o Compartilhamento de Código

#### O que é 100% Compartilhado (mesmo código, mesma pasta)

```
src/
├── components/        ✅ 100% compartilhado
│   ├── ui/           ✅ shadcn/ui (funciona em ambos)
│   ├── ConversationList.tsx  ✅ Mesma lista
│   ├── MessageBubble.tsx     ✅ Mesma bolha
│   └── MetricsDashboard.tsx  ✅ Mesmos gráficos
├── hooks/            ✅ 100% compartilhado
│   ├── useConversations.ts
│   ├── useMessages.ts
│   └── use-toast.ts
├── lib/              ⚠️ 95% compartilhado (pequenas adaptações)
│   ├── utils.ts      ✅ Totalmente compartilhado
│   ├── types.ts      ✅ Totalmente compartilhado
│   ├── supabase.ts   ⚠️ Detecta plataforma (web vs mobile)
│   └── config.ts     ✅ Totalmente compartilhado
└── app/              ⚠️ Requer 'use client' (mas código é o mesmo)
    └── dashboard/
        └── page.tsx  ⚠️ Adiciona 'use client', resto igual
```

**O que isso significa**:
- ✅ **Nodes** (`src/nodes/`) - 100% compartilhados (backend continua igual)
- ✅ **Components** - Mesmo código funciona em web e mobile
- ✅ **Hooks** - Zero mudanças necessárias
- ✅ **Utils** - Totalmente compartilhados
- ⚠️ **Páginas** - Mesmo código, mas adiciona `'use client'` no topo

#### O que NÃO é Compartilhado (arquivos exclusivos)

```
Projeto/
├── capacitor.config.ts    🆕 Só no branch mobile
├── android/               🆕 Só no branch mobile
├── ios/                   🆕 Só no branch mobile
├── out/                   🆕 Build estático (mobile only)
└── next.config.js         ⚠️ Detecta target (web ou mobile)
```

### 🔀 Workflow de Desenvolvimento Paralelo

#### Cenário 1: Você Melhora um Node no main (Web)

**No branch main**:
```bash
# Você melhora src/nodes/generateAIResponse.ts
git add src/nodes/generateAIResponse.ts
git commit -m "feat: improve AI prompt for better context"
git push origin main
```

**No branch mobile**:
```bash
# Merge mudanças do main
git checkout feature/mobile-app
git merge main
# ✅ Mudança no node vem automaticamente!
# Zero conflitos (node é compartilhado)
npm run build:mobile  # Testa
```

**Resultado**: ✅ Node melhorado funciona em AMBOS (web e mobile).

#### Cenário 2: Você Adiciona um Componente no main (Web)

**No branch main**:
```bash
# Adiciona novo componente
src/components/NewFeature.tsx

git add src/components/NewFeature.tsx
git commit -m "feat: add new feature component"
git push origin main
```

**No branch mobile**:
```bash
git merge main
# ✅ Componente vem automaticamente
# Funciona em mobile SEM mudanças
```

**Resultado**: ✅ Novo componente funciona em AMBOS.

#### Cenário 3: Você Muda uma Página (Server → Client Component)

**Problema Potencial**: Se você mudar `src/app/dashboard/page.tsx` no branch mobile (adicionar `'use client'`), e também mudar no branch main (melhorar lógica), vai dar conflito no merge?

**Resposta**: ⚠️ **Sim, vai dar conflito, MAS é fácil de resolver**.

**Estratégia**:

**1. Isolar mudanças de "Server → Client" em commits separados**:

```bash
# Branch mobile - Primeiro commit: apenas adiciona 'use client'
git commit -m "chore: convert dashboard to client component"

# Branch mobile - Segundo commit: novas features
git commit -m "feat: add mobile-specific features"
```

**2. Quando fizer merge, resolver conflitos é trivial**:

```typescript
// Conflito no merge:
<<<<<<< HEAD (main - web)
// src/app/dashboard/page.tsx
export default async function Dashboard() {
  const { data } = await supabase.from('conversations').select('*')
  return <ConversationList data={data} />
}
=======
// src/app/dashboard/page.tsx (mobile)
'use client'
export default function Dashboard() {
  const [conversations, setConversations] = useState([])
  useEffect(() => { fetchConversations() }, [])
  return <ConversationList conversations={conversations} />
}
>>>>>>> feature/mobile-app
```

**Resolução**: Manter versão client-side (mobile) e adicionar melhorias do main:

```typescript
'use client'
export default function Dashboard() {
  const [conversations, setConversations] = useState([])

  useEffect(() => {
    fetchConversations() // Lógica melhorada do main
  }, [])

  return <ConversationList conversations={conversations} />
}
```

### 🎯 Estratégias de Desenvolvimento (3 Opções)

#### Opção A: Desenvolvimento Totalmente Paralelo ✅ RECOMENDADO

**Como funciona**:
1. Continua desenvolvendo no `main` (web) normalmente
2. Trabalha no `feature/mobile-app` em paralelo
3. Faz merge do `main` para `feature/mobile-app` regularmente (a cada 1-2 dias)
4. Quando mobile estiver pronto, faz merge de volta para `main`

**Vantagens**:
- ✅ Não para desenvolvimento web
- ✅ Web continua em produção (Vercel)
- ✅ Pode testar mobile sem afetar web
- ✅ Melhorias no main chegam no mobile automaticamente

**Desvantagens**:
- ⚠️ Precisa fazer merge regularmente (evita conflitos grandes)
- ⚠️ Alguns conflitos em páginas (fácil de resolver)

**Workflow**:
```bash
# 1. Trabalha no main (web)
git checkout main
# ... faz mudanças ...
git commit -m "feat: improve nodes"
git push origin main

# 2. Trabalha no mobile
git checkout feature/mobile-app
# ... adapta para mobile ...
git commit -m "feat: add push notifications"

# 3. Merge main → mobile (a cada 1-2 dias)
git merge main
# Resolve conflitos (se houver)
git push origin feature/mobile-app

# 4. Quando mobile estiver pronto
git checkout main
git merge feature/mobile-app  # Merge de volta
```

**Frequência de merge recomendada**: 🔄 **A cada 1-2 dias** (evita divergência grande)

#### Opção B: Feature Flags (Mesma Branch) 🎛️ AVANÇADO

**Como funciona**: Uma única branch, código detecta se está rodando em web ou mobile.

**Implementação**:

```typescript
// src/lib/platform.ts
import { Capacitor } from '@capacitor/core'

export const isMobile = () => Capacitor.isNativePlatform()
export const isWeb = () => !Capacitor.isNativePlatform()
```

```typescript
// src/app/dashboard/page.tsx
'use client'
export default function Dashboard() {
  const [data, setData] = useState([])

  useEffect(() => {
    // Funciona em web e mobile
    fetchData().then(setData)
  }, [])

  return (
    <>
      {isMobile() && <MobilePushButton />}
      <ConversationList data={data} />
    </>
  )
}
```

```javascript
// next.config.js
const isMobileBuild = process.env.CAPACITOR === 'true'

module.exports = {
  ...(isMobileBuild && {
    output: 'export',
    images: { unoptimized: true },
  }),
}
```

**Build**:
```bash
# Web build
npm run build
npm run deploy  # Vercel

# Mobile build
CAPACITOR=true npm run build
npx cap sync
```

**Vantagens**:
- ✅ Zero conflitos (mesma branch)
- ✅ Código compartilhado 100%
- ✅ Mudanças aplicam-se a ambos automaticamente

**Desvantagens**:
- ⚠️ Mais complexo (precisa gerenciar feature flags)
- ⚠️ Pode ter código específico de plataforma espalhado
- ⚠️ Build web pode quebrar se esquecer de testar

**Recomendação**: ⚠️ Só use se tiver experiência com feature flags.

#### Opção C: Foca em Mobile Primeiro, Web Depois ⏸️ NÃO RECOMENDADO

**Como funciona**:
1. Para desenvolvimento web (freeze)
2. Foca 100% em mobile (2-3 semanas)
3. Quando mobile estiver pronto, volta ao web

**Vantagens**:
- ✅ Sem conflitos
- ✅ Foco total em mobile

**Desvantagens**:
- ❌ Web fica congelada (sem melhorias por semanas)
- ❌ Urgências no web precisam esperar
- ❌ Perde velocidade de desenvolvimento

**Recomendação**: ❌ Não use (perde flexibilidade).

### 🛠️ Melhor Estratégia para Seu Caso (Recomendação Final)

**Baseado no seu projeto (Dashboard Chatbot WhatsApp)**:

#### ✅ Use Opção A (Desenvolvimento Paralelo com Merge Regular)

**Por quê?**
1. ✅ **90% do código é compartilhado** (nodes, components, hooks)
2. ✅ **Backend não muda** (APIs continuam iguais)
3. ✅ **Melhorias em nodes beneficiam ambos** (web e mobile)
4. ✅ **Conflitos são raros** (apenas em algumas páginas)
5. ✅ **Web continua em produção** (não para negócio)

**Workflow Prático**:

```bash
# Dia 1-2: Setup mobile
git checkout -b feature/mobile-app
# Instala Capacitor, configura build estático
git commit -m "chore: setup Capacitor"

# Dia 3-5: Converte páginas para client components
# Adiciona 'use client' em dashboard pages
git commit -m "chore: convert pages to client components"

# ⚠️ IMPORTANTE: Merge main → mobile A CADA 1-2 DIAS
git merge main
# Resolve conflitos (poucos)
git push

# Dia 6-8: Adiciona features mobile (push, biometria)
git commit -m "feat: add push notifications"

# Merge main → mobile novamente
git merge main

# Dia 9-10: Testa em dispositivos, corrige bugs
git commit -m "fix: mobile layout issues"

# Final: Merge de volta para main (quando pronto)
git checkout main
git merge feature/mobile-app
# Agora main tem web + mobile
```

### 📋 Checklist de Desenvolvimento Paralelo

#### Antes de Começar
- [ ] Criar branch `feature/mobile-app`
- [ ] Documentar quais arquivos vão mudar (lista abaixo)
- [ ] Configurar CI/CD para testar ambos (web e mobile)

#### Durante Desenvolvimento
- [ ] **A cada 1-2 dias**: `git merge main` → `feature/mobile-app`
- [ ] Testar web após cada merge (garantir que não quebrou)
- [ ] Testar mobile após cada merge
- [ ] Commits pequenos e atômicos (facilita merge)

#### Arquivos que Vão Ter Conflitos (prepare-se)
- ⚠️ `src/app/**/page.tsx` - Adiciona `'use client'`
- ⚠️ `next.config.js` - Adiciona lógica de export estático
- ⚠️ `src/lib/supabase.ts` - Adiciona Capacitor Storage
- ⚠️ `package.json` - Adiciona scripts e deps do Capacitor

#### Arquivos que NÃO Vão Ter Conflitos (tranquilo)
- ✅ `src/nodes/**` - Backend (compartilhado)
- ✅ `src/components/**` - UI (compartilhado)
- ✅ `src/hooks/**` - Lógica (compartilhado)
- ✅ `src/lib/utils.ts`, `types.ts` - Helpers (compartilhado)

### 🚨 Erros Comuns e Como Evitar

#### Erro 1: Esquecer de Fazer Merge Regular

**Problema**: Branches divergem muito (100+ commits), merge vira pesadelo.

**Solução**: ⏰ **Agende merge a cada 1-2 dias** (adicione no calendário).

```bash
# Crie um script
# scripts/sync-mobile.sh
git checkout feature/mobile-app
git fetch origin main
git merge origin/main
npm run build:mobile
npm test
git push
```

#### Erro 2: Testar Só no Final

**Problema**: Descobre que algo quebrou semanas atrás.

**Solução**: 🧪 **Teste AMBOS após cada merge**.

```bash
# Após merge
npm run build        # Testa web
npm run build:mobile # Testa mobile
npm run lint
npm run test
```

#### Erro 3: Commits Misturados (Web + Mobile no Mesmo Commit)

**Problema**: Difícil fazer cherry-pick ou reverter.

**Solução**: 📝 **Separe commits por contexto**.

```bash
# ❌ Ruim
git commit -m "feat: improve AI and add mobile push"

# ✅ Bom
git commit -m "feat: improve AI prompt for better context"  # Vai para ambos
git commit -m "feat(mobile): add push notifications"       # Só mobile
```

### 🎯 Resumo Executivo

**Você perguntou**:
> "Se eu mexer nos nodes no main e trabalhar no mobile em paralelo, vai dar conflito no merge?"

**Resposta**:
1. ✅ **Nodes NO main → Zero conflitos** (backend é compartilhado)
2. ✅ **Components no main → Zero conflitos** (UI é compartilhada)
3. ⚠️ **Páginas (app/) → Conflitos pequenos** (fácil de resolver)
4. ✅ **APIs serverless → Zero mudanças** (continuam no Vercel)

**Você pode**:
- ✅ Melhorar nodes no main → Mobile usa automaticamente
- ✅ Adicionar componentes no main → Mobile usa automaticamente
- ✅ Desenvolver features web no main → Merge depois para mobile
- ✅ Desenvolver features mobile → Merge depois para main

**O que compartilha (código ÚNICO)**:
```
src/nodes/          ← Backend (100% compartilhado)
src/components/     ← UI (100% compartilhado)
src/hooks/          ← Lógica (100% compartilhado)
src/lib/utils.ts    ← Helpers (100% compartilhado)
```

**O que precisa adaptar (PEQUENAS mudanças)**:
```
src/app/**/page.tsx     ← Adiciona 'use client' (1 linha)
src/lib/supabase.ts     ← Detecta plataforma (10 linhas)
next.config.js          ← Detecta target (5 linhas)
```

**Recomendação Final**:
✅ **Trabalhe em PARALELO** (Opção A)
🔄 **Merge main → mobile a cada 1-2 dias**
🧪 **Teste ambos após cada merge**
📝 **Commits separados por contexto**

**Resultado**: Você desenvolve mais rápido, web continua em produção, e mobile fica pronto em 2-3 semanas.

---

## 👥 Trabalho em Equipe: Dev Web + Dev Mobile (Cenário Real)

### 🎯 Cenário: Você no Web, Outro Dev no Mobile

**Situação**:
- **Você (Dev 1)**: Continua melhorando web app (main branch) - nodes, chatflow, features
- **Dev Mobile (Dev 2)**: Trabalha na adaptação para iOS/Android (feature/mobile-app branch)

**Pergunta Crítica**:
> "Se eu mexer no chatflow, vai atrapalhar o dev mobile? Ele vai trabalhar em arquivos NOVOS ou MODIFICAR arquivos existentes?"

### 📂 Separação Clara de Responsabilidades

#### Arquivos 100% NOVOS (Dev Mobile cria, você nunca toca)

```
projeto/
├── capacitor.config.ts          🆕 Criado pelo Dev Mobile
├── android/                     🆕 Criado pelo Dev Mobile
│   └── app/
│       └── src/main/
│           └── AndroidManifest.xml
├── ios/                         🆕 Criado pelo Dev Mobile
│   └── App/
│       └── App/
│           └── Info.plist
├── out/                         🆕 Build artifact (gerado)
└── scripts/sync-mobile.sh       🆕 Script auxiliar
```

**✅ Esses arquivos: ZERO risco de conflito** (você não mexe, ele cria do zero)

#### Arquivos QUE PRECISAM SER MODIFICADOS (Dev Mobile modifica, você também)

```
projeto/
├── package.json                 ⚠️ CONFLITO PROVÁVEL
│   # Dev Mobile: adiciona @capacitor/*, scripts mobile
│   # Você: adiciona outras deps, muda scripts
│
├── next.config.js               ⚠️ CONFLITO PROVÁVEL
│   # Dev Mobile: adiciona output: 'export', images: unoptimized
│   # Você: pode mexer em outras configs
│
├── src/lib/supabase.ts          ⚠️ CONFLITO PROVÁVEL
│   # Dev Mobile: adiciona Capacitor Storage
│   # Você: pode melhorar lógica de auth
│
├── src/app/**/page.tsx          ⚠️ CONFLITO PROVÁVEL (crítico!)
│   # Dev Mobile: adiciona 'use client'
│   # Você: adiciona features, melhora lógica
│
├── .env.example                 ⚠️ CONFLITO POSSÍVEL
│   # Dev Mobile: adiciona vars mobile
│   # Você: adiciona outras vars
```

**⚠️ Esses arquivos: ALTO risco de conflito** (ambos vão mexer)

#### Arquivos QUE VOCÊ MEXE (Dev Mobile NÃO toca)

```
projeto/
├── src/nodes/**                 ✅ Você trabalha livremente
│   # Chatflow, AI logic, backend processing
│
├── src/components/**            ⚠️ Cuidado médio
│   # Você: adiciona novos components
│   # Dev Mobile: pode adaptar existentes (raro)
│
├── src/hooks/**                 ✅ Você trabalha livremente
│   # Business logic, data fetching
│
├── src/lib/config.ts            ✅ Você trabalha livremente
│   # Configurações de backend
│
├── src/app/api/**               ✅ Você trabalha livremente
│   # Backend APIs (não mudam para mobile)
│
├── supabase/migrations/**       ✅ Você trabalha livremente
│   # Database schema
```

**✅ Esses arquivos: Você tem liberdade total** (Dev Mobile não toca)

### 🎯 Estratégia: Sprint Inicial de Adaptação

#### Fase 1: Setup e Modificações de Arquivos Existentes (Dev Mobile) - 3-5 dias

**Objetivo**: Dev Mobile faz TODAS as modificações em arquivos existentes ANTES de vocês trabalharem em paralelo.

**O que Dev Mobile faz**:

```bash
# Dia 1: Setup
git checkout -b feature/mobile-app
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init
npx cap add ios
npx cap add android

# Commit: Arquivos NOVOS (zero conflito)
git add capacitor.config.ts android/ ios/
git commit -m "chore: setup Capacitor infrastructure"
git push origin feature/mobile-app
```

```bash
# Dia 2-3: Modificações em arquivos existentes
# ⚠️ PERÍODO CRÍTICO - Você para de mexer nesses arquivos por 2-3 dias

# 1. next.config.js
git add next.config.js
git commit -m "chore: configure static export for mobile"

# 2. package.json
git add package.json
git commit -m "chore: add Capacitor dependencies and mobile scripts"

# 3. src/lib/supabase.ts
git add src/lib/supabase.ts
git commit -m "chore: add Capacitor Storage for mobile auth"

# 4. src/app/**/page.tsx (TODAS as páginas de uma vez)
git add src/app/
git commit -m "chore: convert all pages to client components"
git push origin feature/mobile-app
```

**Durante esses 3-5 dias**:
- ✅ **Você pode**: Mexer em nodes, components, hooks, APIs, migrations
- ⚠️ **Você NÃO deve**: Mexer em `src/app/**/page.tsx`, `next.config.js`, `package.json`, `src/lib/supabase.ts`

#### Fase 2: Merge das Modificações para Main (Checkpoint) - 1 dia

**Objetivo**: Trazer as adaptações mobile para main ANTES de continuar.

```bash
# Dev Mobile:
git checkout feature/mobile-app
git push origin feature/mobile-app

# Criar Pull Request: feature/mobile-app → main
# Título: "chore: prepare codebase for mobile support (infrastructure only)"

# Você (Dev Web):
# Revisa PR, aprova, merge
git checkout main
git pull origin main

# ✅ Agora main tem:
# - Capacitor instalado
# - Páginas convertidas para client components
# - Static export configurado (mas não ativo por padrão)
# - Web continua funcionando normalmente
```

**Importante**: Nesse ponto, você testa web para garantir que nada quebrou.

```bash
npm run build   # Deve funcionar (web ainda é SSR)
npm run dev     # Deve funcionar normal
```

#### Fase 3: Desenvolvimento Paralelo Total (Ambos devs) - 2-3 semanas

**Agora sim**: Vocês trabalham em arquivos SEPARADOS.

**Você (Dev Web) - `main` branch**:
```
src/nodes/                  ✅ Liberdade total
src/components/             ✅ Adiciona novos (não modifica existentes)
src/hooks/                  ✅ Liberdade total
src/app/api/**              ✅ Liberdade total
supabase/migrations/        ✅ Liberdade total
src/lib/config.ts           ✅ Liberdade total
```

**Dev Mobile - `feature/mobile-app` branch**:
```
android/                    ✅ Liberdade total
ios/                        ✅ Liberdade total
capacitor.config.ts         ✅ Liberdade total
src/app/**/page.tsx         ⚠️ Só features mobile (biometria, etc)
src/lib/notifications.ts    🆕 Arquivo novo (push)
src/lib/platform.ts         🆕 Arquivo novo (detecção)
```

**Merge Regular**: Dev Mobile faz `git merge main` a cada 2 dias.

```bash
# Dev Mobile (a cada 2 dias):
git checkout feature/mobile-app
git merge main
# ✅ Conflitos: ZERO ou mínimos (vocês trabalham em arquivos diferentes)
npm run build:mobile
npm test
git push origin feature/mobile-app
```

### 📋 Checklist Prático para Vocês

#### Antes de Começar (Planejamento)

- [ ] **Vocês dois**: Leem este documento juntos
- [ ] **Vocês dois**: Definem "Fase 1" (3-5 dias onde você evita certos arquivos)
- [ ] **Dev Mobile**: Cria branch `feature/mobile-app`
- [ ] **Dev Mobile**: Faz todas as adaptações em arquivos existentes
- [ ] **Você**: Trabalha apenas em nodes, components novos, APIs, migrations

#### Durante Fase 1 (3-5 dias)

**Dev Mobile (foco total em setup)**:
- [ ] Instalar Capacitor
- [ ] Configurar Android/iOS
- [ ] Modificar `next.config.js`
- [ ] Modificar `package.json`
- [ ] Modificar `src/lib/supabase.ts`
- [ ] Converter TODAS as páginas para client components
- [ ] Testar build estático

**Você (evita conflitos)**:
- [ ] ✅ Melhora nodes (src/nodes/*)
- [ ] ✅ Adiciona novos components (src/components/NovosComponents.tsx)
- [ ] ✅ Melhora APIs (src/app/api/**)
- [ ] ✅ Cria migrations (supabase/migrations/)
- [ ] ❌ NÃO mexe em src/app/**/page.tsx
- [ ] ❌ NÃO mexe em next.config.js
- [ ] ❌ NÃO mexe em src/lib/supabase.ts

#### Checkpoint (Dia 5-6)

- [ ] **Dev Mobile**: Abre Pull Request com todas as adaptações
- [ ] **Você**: Revisa PR
- [ ] **Ambos**: Testam web (garantir que não quebrou)
- [ ] **Você**: Faz merge do PR para main
- [ ] **Dev Mobile**: Atualiza branch mobile (`git merge main`)

#### Durante Fase 2 (2-3 semanas)

**Dev Mobile**:
- [ ] Desenvolve features mobile (push, biometria, deep links)
- [ ] Testa em simuladores e dispositivos
- [ ] **A cada 2 dias**: `git merge main`
- [ ] Resolve conflitos (se houver)

**Você**:
- [ ] Continua desenvolvimento web normal
- [ ] **Cuidado**: Se adicionar novas páginas, avisar Dev Mobile
- [ ] **Cuidado**: Se mexer em components existentes que mobile usa, avisar

### 🚨 Pontos de Atenção (Comunicação entre Devs)

#### Situação 1: Você Quer Adicionar Nova Página

**Problema**: Dev Mobile já converteu todas as páginas para client. Se você adicionar nova página, ela será SSR por padrão.

**Solução**:

```bash
# Você (main):
# Cria nova página JÁ como client component
# src/app/nova-feature/page.tsx

'use client'  # ⬅️ Adiciona isso desde o início
export default function NovaFeature() {
  // ...
}

git commit -m "feat: add nova feature (client component for mobile compat)"
```

**Avisa Dev Mobile**: "Adicionei nova página em `/nova-feature`, já criei como client component"

#### Situação 2: Você Quer Modificar Component Existente

**Problema**: Dev Mobile pode estar usando esse component em tela mobile.

**Solução**:

```bash
# Você (main):
# Antes de modificar:
# 1. Avisa no Slack/Discord: "Vou mexer em ConversationList.tsx"
# 2. Dev Mobile confirma: "OK, não estou mexendo nisso agora"
# 3. Você faz mudança
# 4. Dev Mobile faz merge assim que você commitar

git commit -m "feat: improve ConversationList with new filter"
# Avisa: "ConversationList atualizado, pode fazer merge"
```

#### Situação 3: Dev Mobile Quer Adicionar Feature Mobile em Página

**Problema**: Vocês dois podem estar mexendo na mesma página.

**Solução**:

```bash
# Dev Mobile:
# Antes de modificar página:
# Avisa: "Vou adicionar botão de biometria em login page"
# Você confirma: "OK, não vou mexer em login por 2 dias"

# Dev Mobile faz mudança:
git add src/app/(auth)/login/page.tsx
git commit -m "feat(mobile): add biometric login button"
```

### 📊 Exemplo Real de Timeline

#### Semana 1 (Fase 1: Setup)

**Segunda-feira**:
- Dev Mobile: Instala Capacitor, cria `android/` e `ios/`
- Você: Melhora node `generateAIResponse.ts`

**Terça-feira**:
- Dev Mobile: Modifica `next.config.js`, `package.json`
- Você: Adiciona novo component `AdvancedMetrics.tsx`

**Quarta-feira**:
- Dev Mobile: Modifica `src/lib/supabase.ts`
- Você: Cria migration para nova tabela `analytics`

**Quinta-feira**:
- Dev Mobile: Converte TODAS as páginas para client components (10-15 arquivos)
- Você: Adiciona novo API endpoint `/api/analytics`

**Sexta-feira** (Checkpoint):
- Dev Mobile: Abre PR
- Você: Revisa e aprova
- Ambos: Merge para main, testam web

#### Semana 2 (Fase 2: Paralelo - Parte 1)

**Segunda-feira**:
- Dev Mobile: Merge main → mobile (pega suas melhorias da semana 1)
- Dev Mobile: Adiciona push notifications
- Você: Melhora chatflow (batch timing)

**Quarta-feira**:
- Dev Mobile: Adiciona biometria para login
- Você: Adiciona filtros avançados no dashboard

**Sexta-feira**:
- Dev Mobile: Merge main → mobile (pega filtros avançados automaticamente)
- Você: Adiciona export de relatórios

#### Semana 3 (Fase 2: Paralelo - Parte 2)

**Segunda-feira**:
- Dev Mobile: Testa em iPhone físico, encontra bugs
- Você: Otimiza queries do PostgreSQL

**Quarta-feira**:
- Dev Mobile: Merge main → mobile (pega otimizações de query)
- Dev Mobile: Corrige bugs mobile
- Você: Adiciona novos gráficos em Analytics

**Sexta-feira**:
- Dev Mobile: Testa build final
- Você: Code review do PR mobile

#### Semana 4 (Merge Final)

**Segunda-feira**:
- Dev Mobile: Merge main → mobile (última sincronização)
- Dev Mobile: Build final para iOS/Android
- Você: Testa web para garantir estabilidade

**Quarta-feira**:
- Dev Mobile: Abre PR final (feature/mobile-app → main)
- Você: Revisa PR
- Ambos: Merge para main

**Resultado**: main agora suporta web + iOS + Android

### 🎯 Regras de Ouro para Trabalho em Equipe

#### 1. Comunicação Proativa

```
# Antes de mexer em arquivo crítico:
Dev: "Vou mexer em X por 2 horas"
Outro Dev: "OK, vou evitar"

# Depois de commit importante:
Dev: "Commitei mudança em X, pode fazer merge quando quiser"
```

#### 2. Commits Atômicos e Descritivos

```bash
# ✅ Bom (fácil de entender no merge)
git commit -m "feat: add push notifications to dashboard"
git commit -m "chore: convert login page to client component"

# ❌ Ruim (confuso no merge)
git commit -m "updates"
git commit -m "fix stuff"
```

#### 3. Merge Regular (Dev Mobile)

```bash
# Dev Mobile: A cada 2 dias (não deixe acumular)
git merge main
npm run build:mobile
npm test
git push
```

#### 4. Code Review Rápido

```bash
# Quando Dev Mobile abre PR:
# Você tem 4 horas para revisar (não deixe travado)
# Se está OK, aprova e merge
# Se tem dúvida, comenta no PR
```

### 📈 Resultado Esperado

**Conflitos totais**: 0-5 (ao longo de 3-4 semanas)
**Tempo perdido em merges**: ~30 minutos total
**Velocidade**: Ambos trabalham 100% do tempo (sem esperar um pelo outro)

**Por quê funciona**:
1. ✅ Sprint inicial isola todas as modificações arriscadas
2. ✅ Depois, vocês trabalham em arquivos diferentes
3. ✅ Comunicação evita conflitos nos raros casos de overlap
4. ✅ Merges regulares evitam divergência grande

### 📋 Resumo Ultra Prático

**Você perguntou**:
> "Se eu mexer no chatflow, vai atrapalhar o dev mobile?"

**Respostas**:

1. **Chatflow (nodes)**: ✅ **ZERO impacto**. Dev Mobile nunca toca nisso.

2. **Components novos**: ✅ **ZERO impacto**. Vocês trabalham em arquivos diferentes.

3. **Páginas existentes**: ⚠️ **Impacto APENAS na Fase 1** (3-5 dias). Depois disso, zero impacto.

4. **APIs backend**: ✅ **ZERO impacto**. Dev Mobile nunca toca nisso.

**Estratégia**:
1. **Fase 1 (5 dias)**: Dev Mobile faz TODAS as modificações em arquivos existentes. Você evita esses arquivos.
2. **Checkpoint (1 dia)**: Merge para main. Testam juntos.
3. **Fase 2 (2-3 semanas)**: Trabalho 100% paralelo. Vocês mexem em arquivos diferentes. Zero conflitos.

**Resultado**: Desenvolvimento 2x mais rápido que se fosse sequencial, com zero stress de conflitos.

---

## 🔄 Como Dev Mobile Puxa Suas Atualizações (Sync Main → Mobile)

### ✅ SIM, Ele Pode e DEVE Puxar Suas Mudanças!

**Conceito**: Dev Mobile trabalha no branch `feature/mobile-app`, mas regularmente "puxa" suas mudanças do `main` para o branch dele.

**Frequência Recomendada**: 🔄 **A cada 2 dias** (ou diariamente se vocês fizerem muitos commits)

### 📋 Comandos Exatos que Dev Mobile Usa

#### Cenário 1: Sync Básico (Sem Conflitos)

**Situação**: Você commitou melhorias no main. Dev Mobile quer pegar essas mudanças.

```bash
# Dev Mobile executa:
git checkout feature/mobile-app           # Garante que está no branch mobile
git fetch origin                          # Baixa últimas mudanças do remoto
git merge origin/main                     # Merge main → mobile

# ✅ Mensagem esperada:
# "Fast-forward" ou "Merge made by recursive strategy"
# Updating abc123..def456
# src/nodes/generateAIResponse.ts | 10 ++++-
# src/components/NewChart.tsx | 50 ++++++++++++++++++
# 2 files changed, 60 insertions(+)

git push origin feature/mobile-app        # Envia pro remoto
```

**Resultado**: Branch mobile agora tem suas melhorias!

#### Cenário 2: Sync com Conflitos (Raro)

**Situação**: Vocês dois mexeram no mesmo arquivo (ex: `src/app/dashboard/page.tsx`)

```bash
# Dev Mobile executa:
git checkout feature/mobile-app
git fetch origin
git merge origin/main

# ⚠️ Mensagem de conflito:
# CONFLICT (content): Merge conflict in src/app/dashboard/page.tsx
# Automatic merge failed; fix conflicts and then commit the result.

# Dev Mobile abre o arquivo e vê:
```

```typescript
// src/app/dashboard/page.tsx

'use client'
import { useState, useEffect } from 'react'

export default function Dashboard() {
<<<<<<< HEAD (feature/mobile-app - versão do Dev Mobile)
  const [conversations, setConversations] = useState([])

  useEffect(() => {
    fetchConversations().then(setConversations)
  }, [])

  return <ConversationList conversations={conversations} />
=======
  const [conversations, setConversations] = useState([])
  const [filters, setFilters] = useState({ status: 'all' }) // ← Você adicionou isso no main

  useEffect(() => {
    fetchConversationsWithFilters(filters).then(setConversations) // ← Você melhorou isso
  }, [filters])

  return (
    <>
      <FilterBar filters={filters} onChange={setFilters} /> {/* ← Você adicionou */}
      <ConversationList conversations={conversations} />
    </>
  )
>>>>>>> origin/main (versão do main - suas mudanças)
}
```

**Dev Mobile resolve** (mantém 'use client' + suas melhorias):

```typescript
// src/app/dashboard/page.tsx

'use client'
import { useState, useEffect } from 'react'

export default function Dashboard() {
  const [conversations, setConversations] = useState([])
  const [filters, setFilters] = useState({ status: 'all' }) // ✅ Mantém sua melhoria

  useEffect(() => {
    fetchConversationsWithFilters(filters).then(setConversations) // ✅ Usa sua lógica melhorada
  }, [filters])

  return (
    <>
      <FilterBar filters={filters} onChange={setFilters} /> {/* ✅ Mantém seu componente */}
      <ConversationList conversations={conversations} />
    </>
  )
}
```

```bash
# Dev Mobile finaliza o merge:
git add src/app/dashboard/page.tsx
git commit -m "chore: merge main - integrate new filters from web"
git push origin feature/mobile-app
```

**Tempo para resolver**: 2-5 minutos (conflitos são simples)

### 📊 Exemplo Real de Timeline (Com Syncs)

#### Segunda-feira

**10:00 - Você (main)**:
```bash
# Melhora node de IA
git add src/nodes/generateAIResponse.ts
git commit -m "feat: improve AI context window"
git push origin main
```

**15:00 - Dev Mobile (mobile) - SYNC**:
```bash
git checkout feature/mobile-app
git merge origin/main
# ✅ Fast-forward (zero conflitos)
# Pega sua melhoria no node automaticamente
git push origin feature/mobile-app
```

**Resultado**: Mobile agora usa node melhorado!

#### Terça-feira

**09:00 - Você (main)**:
```bash
# Adiciona novo component
git add src/components/ConversationAnalytics.tsx
git commit -m "feat: add conversation analytics component"
git push origin main
```

**14:00 - Dev Mobile (mobile)** - **NÃO FAZ SYNC** (esperando mais mudanças)

#### Quarta-feira

**10:00 - Você (main)**:
```bash
# Adiciona API de analytics
git add src/app/api/analytics/route.ts
git commit -m "feat: add analytics API endpoint"
git push origin main
```

**16:00 - Dev Mobile (mobile) - SYNC (pega 2 dias de mudanças)**:
```bash
git checkout feature/mobile-app
git merge origin/main
# ✅ Pega component + API de analytics
# 2 dias de melhorias em 1 merge
git push origin feature/mobile-app
```

**Resultado**: Mobile tem component + API sem fazer nada!

### 🎯 Estratégias de Sync

#### Opção 1: Sync Agendado (Recomendado)

**Dev Mobile cria rotina**:
```bash
# Toda segunda, quarta, sexta às 16:00
git checkout feature/mobile-app
git fetch origin
git merge origin/main
npm run build:mobile  # Testa se não quebrou
npm test
git push origin feature/mobile-app
```

**Vantagens**:
- ✅ Previsível (você sabe quando vai acontecer)
- ✅ Evita acúmulo de divergências
- ✅ Conflitos pequenos (2 dias de mudanças por vez)

#### Opção 2: Sync Sob Demanda

**Dev Mobile faz sync quando você avisa**:

```
# Slack/Discord:
Você: "Commitei melhorias nos nodes, pode fazer sync quando quiser"
Dev Mobile: "OK, vou fazer agora"

# Dev Mobile executa:
git merge origin/main
```

**Vantagens**:
- ✅ Flexível
- ✅ Dev Mobile escolhe melhor momento

**Desvantagens**:
- ⚠️ Pode esquecer de fazer sync (acumula divergências)

#### Opção 3: Sync Automático (CI/CD - Avançado)

**GitHub Actions faz merge automaticamente**:

```yaml
# .github/workflows/auto-sync-mobile.yml
name: Auto Sync Main to Mobile

on:
  push:
    branches: [main]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          ref: feature/mobile-app
          fetch-depth: 0

      - name: Merge main to mobile
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git merge origin/main --no-edit
          git push origin feature/mobile-app
```

**Vantagens**:
- ✅ Automático (zero esforço)
- ✅ Sempre sincronizado

**Desvantagens**:
- ⚠️ Se tiver conflito, CI falha (precisa resolver manualmente)
- ⚠️ Mais complexo de configurar

**Recomendação**: Use Opção 1 (Sync Agendado) para simplicidade.

### 🛠️ Script Auxiliar para Dev Mobile

**Criar arquivo `scripts/sync-mobile.sh`**:

```bash
#!/bin/bash

# Script para Dev Mobile sincronizar branch mobile com main

echo "🔄 Sincronizando feature/mobile-app com main..."

# Garante que está no branch correto
git checkout feature/mobile-app

# Salva trabalho em andamento (se houver)
git stash

# Baixa últimas mudanças
git fetch origin

# Merge main → mobile
echo "📥 Fazendo merge de origin/main..."
git merge origin/main

# Se houver conflitos, para aqui
if [ $? -ne 0 ]; then
  echo "❌ Conflitos detectados! Resolva manualmente e rode:"
  echo "   git add ."
  echo "   git commit -m 'chore: merge main'"
  echo "   ./scripts/sync-mobile.sh"
  exit 1
fi

# Restaura trabalho em andamento
git stash pop 2>/dev/null

# Testa build
echo "🏗️ Testando build mobile..."
npm run build:mobile

if [ $? -ne 0 ]; then
  echo "❌ Build falhou! Verifique erros acima."
  exit 1
fi

# Envia para remoto
echo "📤 Enviando para origin/feature/mobile-app..."
git push origin feature/mobile-app

echo "✅ Sync completo!"
echo "📊 Mudanças sincronizadas:"
git log --oneline origin/main ^HEAD~5 | head -n 5
```

**Dev Mobile usa assim**:

```bash
# A cada 2 dias:
chmod +x scripts/sync-mobile.sh
./scripts/sync-mobile.sh

# ✅ Script faz tudo automaticamente
# ✅ Testa build antes de enviar
# ✅ Mostra quais mudanças foram sincronizadas
```

### 📋 Checklist de Sync para Dev Mobile

#### Antes do Sync

- [ ] Commita trabalho em andamento (`git commit` ou `git stash`)
- [ ] Anota quais arquivos está modificando (evita surpresas)
- [ ] Avisa você: "Vou fazer sync, vai demorar 10min"

#### Durante o Sync

- [ ] `git fetch origin` (baixa mudanças)
- [ ] `git merge origin/main` (faz merge)
- [ ] Se conflitos: resolve manualmente (2-5 minutos)
- [ ] `npm run build:mobile` (testa se não quebrou)
- [ ] `npm test` (se tiver testes)

#### Depois do Sync

- [ ] `git push origin feature/mobile-app` (envia)
- [ ] Testa app no simulador (garantir que funciona)
- [ ] Avisa você: "Sync completo, peguei suas últimas 5 mudanças"

### 🚨 Situações Especiais

#### Situação 1: Você Faz Mudança Quebrada (Bug)

**Problema**: Você commitou bug no main, Dev Mobile faz sync e quebra mobile.

**Solução**:

```bash
# Você (main) - corrige rápido:
git add src/nodes/generateAIResponse.ts
git commit -m "fix: correct AI node bug"
git push origin main

# Avisa imediatamente:
"⚠️ Commitei bug, já corrigi. Pode fazer sync novamente"

# Dev Mobile:
git merge origin/main  # Pega correção
npm run build:mobile   # Agora funciona
```

#### Situação 2: Dev Mobile Não Fez Sync por 1 Semana

**Problema**: Branches divergiram muito (50+ commits), merge complexo.

**Solução**:

```bash
# Dev Mobile (estratégia de merge em etapas):

# 1. Fazer backup do trabalho
git checkout feature/mobile-app
git branch backup-mobile-work  # Cria backup

# 2. Merge em etapas (por data)
git merge origin/main~20  # Merge commits de 4 dias atrás
git merge origin/main~10  # Merge commits de 2 dias atrás
git merge origin/main     # Merge commits atuais

# 3. Resolve conflitos em cada etapa
# 4. Testa após cada etapa
```

**Prevenção**: ⏰ Nunca deixe mais de 3 dias sem sync!

#### Situação 3: Você Adiciona Dependência Nova

**Problema**: Você adiciona dependência no `package.json`, Dev Mobile faz sync mas não instala.

**Solução**:

```bash
# Você (main):
npm install nova-dependencia
git add package.json package-lock.json
git commit -m "feat: add nova-dependencia"
git push origin main

# Avisa no Slack:
"📦 Adicionei nova dependência, rode npm install após sync"

# Dev Mobile (após sync):
git merge origin/main
npm install  # ⬅️ IMPORTANTE!
npm run build:mobile
```

### 🎯 Resumo Executivo

**Você perguntou**:
> "Ele consegue ir puxando minhas atualizações do main para o branch dele?"

**Resposta**: ✅ **SIM! Isso é FUNDAMENTAL.**

**Como funciona**:
1. **Você commita no main**: `git push origin main`
2. **Dev Mobile puxa** (a cada 2 dias): `git merge origin/main`
3. **Resultado**: Branch mobile tem suas mudanças automaticamente

**Vantagens**:
- ✅ Dev Mobile sempre tem versão atualizada
- ✅ Suas melhorias em nodes/components chegam automaticamente
- ✅ Evita divergência grande entre branches
- ✅ Conflitos são pequenos e fáceis de resolver

**Comandos que Dev Mobile usa**:
```bash
# A cada 2 dias (10 minutos de trabalho):
git checkout feature/mobile-app
git fetch origin
git merge origin/main
npm run build:mobile
git push origin feature/mobile-app
```

**Frequência recomendada**: 🔄 **A cada 2 dias** (ou diariamente se muito ativo)

**Tempo de sync**: ⏱️ **5-10 minutos** (se sem conflitos)

**Conflitos esperados**: **0-2 por sync** (fáceis de resolver)

---

## Impactos da Mudança: SSR → Static Export (Client-Side)

### Análise Crítica de Performance e UX

Esta seção analisa **objetivamente** os impactos de migrar de Server-Side Rendering (SSR) para Static Export (client-side rendering) exigido pelo Capacitor.

### ⚡ Performance

#### Impactos Negativos

| Métrica | SSR (Atual) | Static Export (Capacitor) | Diferença |
|---------|-------------|---------------------------|-----------|
| **Time to First Byte (TTFB)** | ~50-200ms | ~10-50ms | ✅ **Melhor** (sem servidor) |
| **First Contentful Paint (FCP)** | ~300-800ms | ~800-1500ms | ❌ **Pior** (JS precisa carregar) |
| **Largest Contentful Paint (LCP)** | ~500-1200ms | ~1200-2500ms | ❌ **Pior** (dados carregam depois) |
| **Time to Interactive (TTI)** | ~1000-2000ms | ~1500-3000ms | ❌ **Pior** (hidratação + fetch) |
| **Cumulative Layout Shift (CLS)** | ~0.05-0.15 | ~0.10-0.30 | ⚠️ **Pior** (conteúdo carrega depois) |

**Resumo**:
- ❌ **Piora inicial**: FCP, LCP e TTI aumentam 40-80%
- ✅ **Melhora subsequente**: Navegação entre páginas é instantânea (SPA)
- ⚠️ **Depende de rede**: Performance é mais dependente da qualidade da conexão

#### Impactos Positivos

- ✅ **Navegação mais rápida**: Após carregamento inicial, mudanças de página são instantâneas (SPA)
- ✅ **Menor latência**: TTFB reduzido (sem processamento de servidor)
- ✅ **Caching agressivo**: Todo app pode ser cacheado no dispositivo
- ✅ **Offline-first**: Service Workers permitem funcionar sem internet (com dados cacheados)

#### Exemplo Visual (Timeline de Carregamento)

**SSR (Atual)**:
```
0ms ──────────────────────> 1200ms
│      HTML renderizado      │
│    (dados já incluídos)    │
└─────────────────────────────┘
         FCP: 300ms
         LCP: 500ms
         TTI: 1000ms
```

**Static Export (Capacitor)**:
```
0ms ──────────────────────────────────────────> 2500ms
│  HTML skeleton  │  JS load  │  Fetch data  │  Render  │
│      (vazio)    │           │              │          │
└─────────────────────────────────────────────────────────┘
    FCP: 800ms        (1500ms de fetch)         LCP: 2000ms
                                                 TTI: 2500ms
```

### 🎨 UX/UI

#### O que **NÃO** muda

✅ **Componentes visuais**: shadcn/ui, Tailwind, Radix UI funcionam identicamente
✅ **Charts**: Recharts funciona normalmente (renderiza no client)
✅ **Tables**: Sorting, filtering, pagination funcionam normalmente
✅ **Forms**: Validação, submissão, feedback funcionam normalmente
✅ **Animações**: Tailwind animations, Framer Motion funcionam normalmente
✅ **Responsividade**: Layout responsivo mantém-se igual

#### O que **Piora**

❌ **Loading States obrigatórios**: Todas as páginas precisam de skeletons/spinners
❌ **Flash of Empty Content (FOEC)**: Usuário vê página vazia antes de carregar dados
❌ **Scroll position**: Pode ser perdida ao recarregar (precisa implementar manualmente)
❌ **SEO**: Não aplicável a apps mobile, mas perde rankings do Google se usar mesmo código na web

#### Exemplo de Degradação de UX

**Antes (SSR)**:
```typescript
// src/app/dashboard/page.tsx
export default async function Dashboard() {
  const { data } = await supabase.from('conversations').select('*')
  return <ConversationList conversations={data} /> // Renderiza imediatamente
}
```

**Usuário vê**: Página completa com dados em ~500ms

---

**Depois (Static Export)**:
```typescript
'use client'
export default function Dashboard() {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchConversations() // Demora 500-1500ms
  }, [])

  if (loading) return <DashboardSkeleton /> // Usuário vê skeleton primeiro
  return <ConversationList conversations={conversations} />
}
```

**Usuário vê**:
1. Skeleton vazio (800ms)
2. Depois dados aparecem (mais 500-1500ms)
3. **Total**: 1300-2300ms vs. 500ms (SSR)

### 📊 Impactos em Features Específicas

#### Charts (Recharts)

**Status**: ✅ **Funciona normalmente**

- Recharts já renderiza no client (não usa SSR)
- Nenhuma mudança necessária
- Performance idêntica

**Exemplo**:
```typescript
// ✅ Funciona em SSR e Static Export
<LineChart data={data}>
  <Line dataKey="value" />
</LineChart>
```

#### Tables (TanStack Table / Custom)

**Status**: ✅ **Funciona normalmente**

- Sorting, filtering, pagination são client-side
- Nenhuma mudança necessária
- Performance pode **melhorar** (sem round-trips ao servidor)

**Impacto**:
- ⚠️ Dados grandes (1000+ rows) demoram mais para carregar inicialmente
- ✅ Mas sorting/filtering são instantâneos (sem backend)

#### Realtime (Supabase Realtime)

**Status**: ✅ **Funciona normalmente**

- Supabase Realtime é WebSocket (client-side)
- Nenhuma mudança necessária
- Funciona igual em web e mobile

#### Autenticação (Supabase Auth)

**Status**: ⚠️ **Requer adaptação**

**Problema**: Middleware (`middleware.ts`) não funciona em static export

**Solução**: Auth guard no client-side

```typescript
// src/components/AuthGuard.tsx
'use client'
export const AuthGuard = ({ children }) => {
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
      }
    }
    checkAuth()
  }, [])

  if (!user) return <LoadingScreen />
  return children
}
```

**Impacto UX**:
- ❌ **Flash of unauthenticated content**: Usuário pode ver tela de login por ~100-300ms antes de redirecionar
- ⚠️ **Menos seguro**: Client pode manipular JS e burlar guard (precisa validar no backend também)

#### File Upload

**Status**: ✅ **Funciona normalmente**

- Upload para Supabase Storage funciona no client
- Capacitor permite acesso a câmera/galeria (melhora UX)

#### Push Notifications

**Status**: ✅ **Melhora significativamente**

- SSR: Apenas web push (limitado)
- Capacitor: Push nativo (iOS/Android)
- **Impacto**: UX muito melhor em mobile

### 📉 Comparação de Velocidade (Cenários Reais)

#### Cenário 1: Dashboard Principal

| Ação | SSR | Static Export | Diferença |
|------|-----|---------------|-----------|
| **Primeira visita** | 800ms | 1800ms | ❌ **+125%** |
| **Segunda visita** (cached) | 600ms | 400ms | ✅ **-33%** |
| **Navegar para Conversas** | 700ms | 100ms | ✅ **-86%** |
| **Voltar para Dashboard** | 700ms | 50ms | ✅ **-93%** |

**Conclusão**: Pior na primeira visita, muito melhor em navegação subsequente.

#### Cenário 2: Abrir Conversa Individual

| Ação | SSR | Static Export | Diferença |
|------|-----|---------------|-----------|
| **Carregar mensagens** | 500ms | 1200ms | ❌ **+140%** |
| **Scroll infinito (mais msgs)** | 300ms | 300ms | ✅ **Igual** |
| **Enviar mensagem** | 400ms | 400ms | ✅ **Igual** |
| **Receber msg (realtime)** | Instantâneo | Instantâneo | ✅ **Igual** |

**Conclusão**: Carregamento inicial pior, interações são iguais.

#### Cenário 3: Analytics/Charts

| Ação | SSR | Static Export | Diferença |
|------|-----|---------------|-----------|
| **Carregar dashboard analytics** | 1200ms | 2000ms | ❌ **+67%** |
| **Trocar período (7d → 30d)** | 800ms | 800ms | ✅ **Igual** |
| **Hover em chart** | Instantâneo | Instantâneo | ✅ **Igual** |

**Conclusão**: Carregamento inicial pior, interações são iguais.

### 🔋 Impacto em Bateria e Recursos (Mobile)

#### Consumo de Bateria

| Aspecto | SSR (Web Mobile) | Static Export (Capacitor) |
|---------|------------------|---------------------------|
| **Rendering inicial** | Baixo (HTML pronto) | Alto (JS pesado) |
| **Navegação** | Alto (novas requests) | Baixo (SPA cached) |
| **Background** | Alto (web fica ativa) | Baixo (app suspende) |
| **Realtime** | Alto (polling) | Médio (WebSocket otimizado) |

**Conclusão**: ✅ Capacitor é mais eficiente em sessões longas.

#### Uso de Memória

- ❌ **Static Export usa +30-50% de RAM**: Todo o app fica em memória (SPA)
- ⚠️ **Pode causar crashes em dispositivos antigos** (< 2GB RAM)

### 🎯 Recomendações de Mitigação

#### 1. Implementar Loading States Elegantes

```typescript
// src/components/ConversationListSkeleton.tsx
export const ConversationListSkeleton = () => (
  <div className="space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center space-x-4 animate-pulse">
        <div className="h-12 w-12 rounded-full bg-gray-300" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 bg-gray-300 rounded" />
          <div className="h-3 w-1/2 bg-gray-200 rounded" />
        </div>
      </div>
    ))}
  </div>
)
```

#### 2. Usar React Query para Caching Agressivo

```bash
npm install @tanstack/react-query
```

```typescript
// src/app/dashboard/page.tsx
import { useQuery } from '@tanstack/react-query'

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    cacheTime: 30 * 60 * 1000, // Mantém em memória por 30min
  })

  if (isLoading) return <ConversationListSkeleton />
  return <ConversationList conversations={data} />
}
```

**Impacto**:
- ✅ Segunda visita carrega instantaneamente (cache)
- ✅ Reduz requests ao backend em 80%

#### 3. Implementar Progressive Web App (PWA)

```typescript
// next.config.js (com next-pwa)
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
})

module.exports = withPWA({ /* ... */ })
```

**Impacto**:
- ✅ App funciona offline
- ✅ Assets cacheados (reduz carregamento em 70%)

#### 4. Code Splitting Agressivo

```typescript
// src/app/dashboard/page.tsx
import dynamic from 'next/dynamic'

const AnalyticsChart = dynamic(() => import('@/components/AnalyticsChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false, // Não tenta SSR
})
```

**Impacto**:
- ✅ Reduz bundle inicial em 40-60%
- ✅ FCP melhora em 30-50%

#### 5. Prefetch Inteligente

```typescript
// src/components/ConversationList.tsx
import { useQueryClient } from '@tanstack/react-query'

export const ConversationItem = ({ phone }) => {
  const queryClient = useQueryClient()

  const handleMouseEnter = () => {
    // Prefetch messages antes de clicar
    queryClient.prefetchQuery(['messages', phone], () => fetchMessages(phone))
  }

  return (
    <Link href={`/conversations/${phone}`} onMouseEnter={handleMouseEnter}>
      {/* ... */}
    </Link>
  )
}
```

**Impacto**:
- ✅ Conversas carregam instantaneamente ao clicar
- ✅ Percepção de performance melhora drasticamente

### 📊 Resultado Final com Mitigações

| Métrica | SSR | Static (sem otimizações) | Static (com otimizações) |
|---------|-----|--------------------------|--------------------------|
| **FCP** | 300ms | 800ms | **500ms** ✅ |
| **LCP** | 500ms | 2000ms | **900ms** ⚠️ |
| **TTI** | 1000ms | 3000ms | **1500ms** ⚠️ |
| **Navegação subsequente** | 700ms | 100ms | **50ms** ✅✅ |
| **Uso de bateria** | Alto | Médio | **Baixo** ✅ |
| **Offline** | ❌ | ❌ | **✅** ✅✅ |

### 🎯 Conclusão: Vale a Pena?

**Para este projeto específico (Dashboard Chatbot WhatsApp)**:

✅ **SIM, vale a pena** porque:
1. ✅ **Dashboard é usado por poucos usuários simultâneos** (não precisa escalar como site público)
2. ✅ **Usuários fazem sessões longas** (carregamento inicial amortiza ao longo do tempo)
3. ✅ **Mobile UX melhora drasticamente** (push nativo, biometria, offline)
4. ✅ **Realtime é crítico** (funciona igual em ambos)
5. ✅ **Dados não são públicos** (SEO não importa)

❌ **NÃO valeria a pena se**:
- Site de conteúdo público (blog, e-commerce)
- SEO é crítico para o negócio
- Usuários fazem visitas curtas (< 1 minuto)
- Performance inicial é requisito crítico

### 📋 Checklist de Decisão

Use este checklist para decidir se deve migrar:

- [ ] **Usuários fazem sessões > 5 minutos?** → SIM = +1 ponto
- [ ] **Mobile é plataforma principal?** → SIM = +2 pontos
- [ ] **Push notifications são importantes?** → SIM = +2 pontos
- [ ] **SEO é crítico?** → NÃO = +1 ponto (SIM = -3 pontos)
- [ ] **Orçamento para manter 2 versões (web + mobile)?** → SIM = +1 ponto
- [ ] **Equipe confortável com React/Client-side?** → SIM = +1 ponto
- [ ] **Dados são principalmente realtime?** → SIM = +1 ponto

**Pontuação**:
- **7-10 pontos**: Migre sem medo ✅
- **4-6 pontos**: Migre com otimizações ⚠️
- **0-3 pontos**: Considere manter SSR ou usar React Native ❌

**Para este projeto**: **9/10 pontos** → ✅ **Migração altamente recomendada**

---

## Pré-requisitos

### Ferramentas Necessárias

**Para iOS**:
- macOS (obrigatório para build iOS)
- Xcode 14+ (Download na App Store)
- CocoaPods (`sudo gem install cocoapods`)
- Apple Developer Account ($99/ano para publicar)

**Para Android**:
- Android Studio (https://developer.android.com/studio)
- Java JDK 17+ (`java -version`)
- Android SDK 33+ (configurado via Android Studio)

**Para ambos**:
- Node.js 18+ (já instalado)
- npm ou yarn
- Git

### Verificar Ambiente

```bash
# Node.js
node -v  # v18+

# Java (Android)
java -version  # 17+

# Android SDK
echo $ANDROID_HOME  # /Users/user/Library/Android/sdk (macOS)

# CocoaPods (iOS)
pod --version  # 1.12+
```

---

## Instalação e Configuração

### 1. Instalar Capacitor

```bash
cd C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial

# Instalar Capacitor Core + CLI
npm install @capacitor/core @capacitor/cli

# Inicializar Capacitor
npx cap init

# Durante o prompt:
# App name: WhatsApp Chatbot
# App ID: com.luisfboff.chatbot (reverse domain notation)
# Web directory: out (Next.js static export)
```

### 2. Adicionar Plataformas

```bash
# Adicionar iOS (somente em macOS)
npm install @capacitor/ios
npx cap add ios

# Adicionar Android
npm install @capacitor/android
npx cap add android
```

### 3. Configurar Next.js para Export Estático

Editar `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Detect build target
  ...(process.env.CAPACITOR === 'true' && {
    output: 'export',
    images: {
      unoptimized: true, // Capacitor não suporta next/image otimizado
    },
    trailingSlash: true, // iOS requer trailing slashes
  }),
}

module.exports = nextConfig
```

### 4. Configurar Capacitor

Editar `capacitor.config.ts`:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.luisfboff.chatbot',
  appName: 'WhatsApp Chatbot',
  webDir: 'out',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https', // Previne CORS issues
    iosScheme: 'https',
    hostname: 'app.localhost', // Domain local
    cleartext: false, // Força HTTPS
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#000000',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
```

### 5. Adicionar Scripts no package.json

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "build:mobile": "CAPACITOR=true next build && npx cap sync",
    "ios": "npm run build:mobile && npx cap open ios",
    "android": "npm run build:mobile && npx cap open android",
    "sync": "npx cap sync"
  }
}
```

---

## Estrutura do Projeto

### Diretórios Gerados

```
ChatBot-Oficial/
├── android/                  # Projeto Android nativo (gerado)
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml
│   │   │   └── res/          # Ícones, splash screens
│   │   └── build.gradle
│   └── gradle/
├── ios/                      # Projeto iOS nativo (gerado)
│   ├── App/
│   │   ├── App/
│   │   │   ├── Info.plist
│   │   │   └── Assets.xcassets  # Ícones, splash screens
│   │   └── App.xcodeproj
│   └── Pods/
├── out/                      # Build estático Next.js (gerado em build)
│   ├── index.html
│   ├── _next/
│   └── dashboard/
├── capacitor.config.ts       # Config Capacitor
└── src/                      # Código compartilhado (existente)
```

### Código Compartilhado

**Reutilizáveis sem mudanças**:
- ✅ Componentes React (`src/components/`)
- ✅ Hooks customizados (`src/hooks/`)
- ✅ Utils e helpers (`src/lib/utils.ts`)
- ✅ Tipos TypeScript (`src/lib/types.ts`)
- ✅ Tailwind CSS e estilos
- ✅ shadcn/ui components

**Requerem adaptação**:
- ⚠️ API Routes (`src/app/api/`) - Precisam migrar para backend externo
- ⚠️ Server Components - Converter para Client Components
- ⚠️ Server Actions - Substituir por API calls
- ⚠️ Middleware (`middleware.ts`) - Lógica precisa mover para client

---

## Mudanças Necessárias

### 1. Migrar API Routes para Backend Externo

**Problema**: Next.js API Routes (`/api/*`) requerem servidor Node.js. Capacitor executa apenas frontend estático.

**Solução**: Manter APIs no Vercel, fazer requests HTTP do app mobile.

**Antes** (Server Component):
```typescript
// src/app/dashboard/page.tsx
export default async function Dashboard() {
  const supabase = createServerClient() // Server-side
  const { data } = await supabase.from('conversations').select('*')
  return <ConversationList data={data} />
}
```

**Depois** (Client Component):
```typescript
'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'

export default function Dashboard() {
  const [conversations, setConversations] = useState([])
  const supabase = createBrowserClient() // Client-side

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from('conversations').select('*')
      setConversations(data || [])
    }
    fetchData()
  }, [])

  return <ConversationList data={conversations} />
}
```

**Alternativa**: Manter APIs serverless no Vercel e fazer fetch:

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://chat.luisfboff.com'

const response = await fetch(`${API_BASE_URL}/api/conversations`)
const data = await response.json()
```

### 2. Converter Server Components para Client Components

Adicionar `'use client'` no topo de todos os arquivos que usam:
- `useState`, `useEffect`, `useContext`
- Event handlers (`onClick`, `onChange`)
- Browser APIs (`localStorage`, `navigator`)

**Lista de páginas que precisam converter**:
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/conversations/page.tsx`
- `src/app/dashboard/conversations/[phone]/page.tsx`
- `src/app/dashboard/analytics/page.tsx`
- `src/app/dashboard/flow-architecture/page.tsx`
- `src/app/admin/page.tsx`
- `src/app/admin/users/page.tsx`
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/register/page.tsx`

### 3. Adaptar Autenticação (Supabase)

**Problema**: Middleware (`middleware.ts`) não funciona em Capacitor.

**Solução**: Usar Supabase Auth no client-side com Capacitor Storage.

**Instalar plugin de storage**:
```bash
npm install @capacitor/preferences
```

**Configurar Supabase client**:

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import { Preferences } from '@capacitor/preferences'
import { Capacitor } from '@capacitor/core'

const isNative = Capacitor.isNativePlatform()

export const createBrowserClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: isNative
          ? {
              getItem: async (key) => {
                const { value } = await Preferences.get({ key })
                return value
              },
              setItem: async (key, value) => {
                await Preferences.set({ key, value })
              },
              removeItem: async (key) => {
                await Preferences.remove({ key })
              },
            }
          : undefined, // Web usa localStorage padrão
        persistSession: true,
        autoRefreshToken: true,
      },
    }
  )
}
```

### 4. Adaptar Navegação

**Problema**: Next.js `<Link>` e `useRouter` funcionam, mas podem ter comportamento estranho em mobile.

**Solução**: Criar wrapper que detecta plataforma:

```typescript
// src/lib/navigation.ts
import { Capacitor } from '@capacitor/core'
import { useRouter as useNextRouter } from 'next/navigation'

export const useRouter = () => {
  const router = useNextRouter()
  const isNative = Capacitor.isNativePlatform()

  return {
    push: (path: string) => {
      if (isNative) {
        // Adiciona slight delay para animação nativa
        setTimeout(() => router.push(path), 100)
      } else {
        router.push(path)
      }
    },
    back: () => router.back(),
    refresh: () => router.refresh(),
  }
}
```

### 5. Adaptar Assets Estáticos

**Problema**: Caminhos relativos podem quebrar em Capacitor.

**Solução**: Usar variável de ambiente para base URL:

```typescript
// src/lib/constants.ts
import { Capacitor } from '@capacitor/core'

export const ASSET_BASE_URL = Capacitor.isNativePlatform()
  ? '' // Capacitor serve de /assets
  : process.env.NEXT_PUBLIC_BASE_URL || ''

// Uso:
<img src={`${ASSET_BASE_URL}/logo.png`} alt="Logo" />
```

### 6. Adaptar Redis e Webhooks

**Problema**: Redis e webhooks do WhatsApp requerem servidor backend.

**Solução**: Manter backend no Vercel (não muda). App mobile apenas consome APIs.

**Arquitetura**:
```
Mobile App (Capacitor) ──HTTP──> Vercel (Next.js API Routes) ──> Supabase/Redis
                                        ↑
                                        │
                              Meta Webhooks
```

**Não é necessário mudar**: O backend continua funcionando normalmente. App mobile é apenas um novo cliente.

---

## APIs Nativas Disponíveis

### Plugins Recomendados

**Essenciais**:
```bash
npm install @capacitor/app           # App lifecycle, deep links
npm install @capacitor/browser       # In-app browser
npm install @capacitor/network       # Detectar conectividade
npm install @capacitor/preferences   # Key-value storage (localStorage alternativo)
npm install @capacitor/splash-screen # Splash screen customizável
npm install @capacitor/status-bar    # Customizar status bar
npm install @capacitor/keyboard      # Controle do teclado virtual
```

**Funcionalidades Avançadas**:
```bash
npm install @capacitor/push-notifications  # Push notifications nativas
npm install @capacitor/local-notifications # Notificações locais
npm install @capacitor/camera              # Câmera e galeria
npm install @capacitor/filesystem          # Leitura/escrita de arquivos
npm install @capacitor/share               # Share nativo
npm install @capacitor/haptics             # Vibração tátil
npm install @capacitor/biometric           # Face ID / Touch ID
```

### Exemplo: Push Notifications

```typescript
// src/lib/notifications.ts
import { PushNotifications } from '@capacitor/push-notifications'
import { Capacitor } from '@capacitor/core'

export const registerPushNotifications = async () => {
  if (!Capacitor.isNativePlatform()) return

  // Solicitar permissão
  const permission = await PushNotifications.requestPermissions()
  if (permission.receive !== 'granted') {
    throw new Error('Push notification permission denied')
  }

  // Registrar listeners
  await PushNotifications.addListener('registration', (token) => {
    console.log('Push token:', token.value)
    // Enviar token para backend
    fetch(`${API_URL}/api/devices`, {
      method: 'POST',
      body: JSON.stringify({ token: token.value }),
    })
  })

  await PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received:', notification)
  })

  await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    console.log('Push action:', notification)
    // Navegar para conversa
    router.push(`/dashboard/conversations/${notification.data.phone}`)
  })

  // Registrar
  await PushNotifications.register()
}
```

**Uso no app**:
```typescript
// src/app/layout.tsx
'use client'
import { useEffect } from 'react'
import { registerPushNotifications } from '@/lib/notifications'

export default function RootLayout({ children }) {
  useEffect(() => {
    registerPushNotifications()
  }, [])

  return <html>{children}</html>
}
```

### Exemplo: Detectar Conectividade

```typescript
// src/hooks/useNetworkStatus.ts
import { useState, useEffect } from 'react'
import { Network } from '@capacitor/network'

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const checkStatus = async () => {
      const status = await Network.getStatus()
      setIsOnline(status.connected)
    }

    checkStatus()

    const listener = Network.addListener('networkStatusChange', (status) => {
      setIsOnline(status.connected)
    })

    return () => {
      listener.remove()
    }
  }, [])

  return isOnline
}

// Uso:
const isOnline = useNetworkStatus()
if (!isOnline) {
  return <OfflineBanner />
}
```

### Exemplo: Biometria para Login

```typescript
// src/lib/biometric.ts
import { NativeBiometric } from 'capacitor-native-biometric'

export const loginWithBiometric = async () => {
  // Verificar disponibilidade
  const result = await NativeBiometric.isAvailable()
  if (!result.isAvailable) {
    throw new Error('Biometric not available')
  }

  // Autenticar
  await NativeBiometric.verifyIdentity({
    reason: 'Autenticar no WhatsApp Chatbot',
    title: 'Login',
    subtitle: 'Use sua digital ou Face ID',
    description: '',
  })

  // Buscar credenciais salvas
  const credentials = await NativeBiometric.getCredentials({
    server: 'chatbot.luisfboff.com',
  })

  return credentials // { username, password }
}
```

---

## Build e Deploy

### Build Local (Desenvolvimento)

**iOS**:
```bash
# Build Next.js + Sync com iOS
npm run build:mobile

# Abrir no Xcode
npm run ios

# No Xcode:
# 1. Selecionar dispositivo (simulador ou físico)
# 2. Clicar "Play" (▶️)
```

**Android**:
```bash
# Build Next.js + Sync com Android
npm run build:mobile

# Abrir no Android Studio
npm run android

# No Android Studio:
# 1. Selecionar dispositivo (emulador ou físico)
# 2. Clicar "Run" (▶️)
```

### Build para Produção

**iOS (App Store)**:

1. **Configurar assinatura**:
   - Abrir `ios/App/App.xcodeproj` no Xcode
   - Selecionar projeto → Signing & Capabilities
   - Team: Selecionar Apple Developer Account
   - Bundle Identifier: `com.luisfboff.chatbot`

2. **Criar ícone e splash screen**:
   - Gerar assets: https://capacitorjs.com/docs/guides/splash-screens-and-icons
   - Colocar em `ios/App/App/Assets.xcassets/`

3. **Build**:
   ```bash
   npm run build:mobile
   cd ios/App
   xcodebuild -workspace App.xcworkspace -scheme App -configuration Release -archivePath App.xcarchive archive
   ```

4. **Upload para App Store Connect**:
   - Xcode → Window → Organizer
   - Selecionar archive → Distribute App
   - Seguir wizard (App Store Connect)

**Android (Google Play)**:

1. **Configurar assinatura**:
   ```bash
   # Gerar keystore
   keytool -genkey -v -keystore release-key.keystore -alias chatbot -keyalg RSA -keysize 2048 -validity 10000
   ```

   Editar `android/app/build.gradle`:
   ```gradle
   android {
     ...
     signingConfigs {
       release {
         storeFile file('../../release-key.keystore')
         storePassword 'your_password'
         keyAlias 'chatbot'
         keyPassword 'your_password'
       }
     }
     buildTypes {
       release {
         signingConfig signingConfigs.release
         minifyEnabled false
       }
     }
   }
   ```

2. **Build APK/AAB**:
   ```bash
   npm run build:mobile
   cd android
   ./gradlew assembleRelease  # Gera APK
   ./gradlew bundleRelease    # Gera AAB (recomendado para Play Store)
   ```

3. **Upload para Google Play Console**:
   - https://play.google.com/console
   - Criar app → Upload AAB
   - Preencher metadados, screenshots
   - Enviar para revisão

### CI/CD (GitHub Actions)

Criar `.github/workflows/mobile-build.yml`:

```yaml
name: Build Mobile Apps

on:
  push:
    branches: [main, feature/mobile-app]

jobs:
  build-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build:mobile
      - uses: maxim-lobanov/setup-xcode@v1
        with:
          xcode-version: latest-stable
      - run: |
          cd ios/App
          xcodebuild -workspace App.xcworkspace -scheme App -configuration Release -archivePath App.xcarchive archive

  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - uses: actions/setup-java@v3
        with:
          distribution: 'zulu'
          java-version: '17'
      - run: npm ci
      - run: npm run build:mobile
      - run: |
          cd android
          ./gradlew bundleRelease
      - uses: actions/upload-artifact@v3
        with:
          name: android-bundle
          path: android/app/build/outputs/bundle/release/app-release.aab
```

---

## Limitações e Workarounds

### 1. Server-Side Rendering (SSR)

**Limitação**: Capacitor não suporta SSR. Apenas export estático (`output: 'export'`).

**Impacto**:
- ❌ Não pode usar `getServerSideProps`, `getStaticProps`
- ❌ Server Components não funcionam (precisam converter para Client)
- ❌ Server Actions não funcionam

**Workaround**:
- Use Client Components + fetch de APIs
- Mantenha backend no Vercel (API Routes continuam funcionando)
- Use Supabase Realtime para dados em tempo real

### 2. API Routes

**Limitação**: API Routes (`/api/*`) não são empacotadas no build estático.

**Impacto**:
- ❌ `fetch('/api/conversations')` retorna 404 no app mobile

**Workaround**:
- Configure `API_BASE_URL` apontando para Vercel:
  ```typescript
  const API_URL = 'https://chat.luisfboff.com'
  fetch(`${API_URL}/api/conversations`)
  ```

### 3. Imagens Otimizadas

**Limitação**: `next/image` com otimização automática não funciona em export estático.

**Impacto**:
- ⚠️ Imagens não são otimizadas automaticamente

**Workaround**:
- Configurar `images: { unoptimized: true }` no `next.config.js`
- Usar `<img>` nativo ou otimizar imagens manualmente (tinypng, squoosh)

### 4. Deep Links

**Limitação**: URLs como `chatbot://dashboard/conversations/123` requerem configuração nativa.

**Workaround**:

**iOS** (`ios/App/App/Info.plist`):
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>chatbot</string>
    </array>
  </dict>
</array>
```

**Android** (`android/app/src/main/AndroidManifest.xml`):
```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="chatbot" />
</intent-filter>
```

**Código**:
```typescript
import { App } from '@capacitor/app'

App.addListener('appUrlOpen', (event) => {
  const url = event.url
  const path = url.replace('chatbot://', '')
  router.push(`/${path}`)
})
```

### 5. CORS

**Limitação**: Requests do app mobile podem ser bloqueados por CORS.

**Workaround**:
- Configure `androidScheme: 'https'` no `capacitor.config.ts`
- Adicione headers CORS no backend (Vercel):
  ```typescript
  // src/app/api/*/route.ts
  export async function GET(request: Request) {
    const response = NextResponse.json({ data })
    response.headers.set('Access-Control-Allow-Origin', '*')
    return response
  }
  ```

### 6. Ambiente de Desenvolvimento

**Limitação**: Live reload não funciona por padrão.

**Workaround**: Usar servidor de desenvolvimento remoto:

```typescript
// capacitor.config.ts
const config: CapacitorConfig = {
  server: {
    url: 'http://192.168.1.100:3000', // IP local do dev server
    cleartext: true, // Permite HTTP em desenvolvimento
  },
}
```

**Workflow**:
1. `npm run dev` (inicia servidor local)
2. Descobrir IP local: `ipconfig` (Windows) ou `ifconfig` (macOS/Linux)
3. Atualizar `capacitor.config.ts` com IP
4. `npx cap sync`
5. Abrir app no simulador/dispositivo
6. Mudanças no código refletem automaticamente

---

## Troubleshooting

### Erro: "Could not find or load main class org.gradle.wrapper.GradleWrapperMain"

**Solução**:
```bash
cd android
./gradlew wrapper --gradle-version 8.0
```

### Erro: "No bundle URL present" (iOS)

**Causa**: Build do Next.js não foi sincronizado.

**Solução**:
```bash
npm run build:mobile
npx cap sync ios
```

### Erro: "cleartext traffic not permitted" (Android)

**Causa**: Android bloqueia HTTP por padrão.

**Solução**: Adicionar em `android/app/src/main/AndroidManifest.xml`:
```xml
<application
  android:usesCleartextTraffic="true">
```

### Erro: "Failed to fetch" em fetch()

**Causa**: CORS ou URL incorreta.

**Solução**:
- Verificar `API_BASE_URL` está correto
- Testar URL no Postman/Insomnia
- Adicionar headers CORS no backend

### Erro: "Module not found" ao abrir no Xcode/Android Studio

**Causa**: Dependências nativas não instaladas.

**Solução**:
```bash
# iOS
cd ios/App
pod install

# Android
cd android
./gradlew clean build
```

---

## Próximos Passos

### Fase 1: Setup Inicial (1-2 dias)
- [ ] Criar branch `feature/mobile-app`
- [ ] Instalar Capacitor e plataformas (iOS, Android)
- [ ] Configurar `next.config.js` para export estático
- [ ] Testar build básico (`npm run build:mobile`)
- [ ] Abrir no simulador iOS e Android

### Fase 2: Adaptações de Código (3-5 dias)
- [ ] Converter Server Components para Client Components
- [ ] Migrar autenticação para client-side com Capacitor Storage
- [ ] Criar wrapper de navegação (`useRouter`)
- [ ] Configurar variáveis de ambiente (`API_BASE_URL`)
- [ ] Testar fluxo completo (login → dashboard → conversas)

### Fase 3: APIs Nativas (2-3 dias)
- [ ] Implementar push notifications
- [ ] Adicionar biometria para login
- [ ] Configurar deep links
- [ ] Adicionar indicador de conectividade
- [ ] Configurar splash screen e ícones

### Fase 4: Polimento (2-3 dias)
- [ ] Otimizar performance (lazy loading, code splitting)
- [ ] Adicionar animações nativas
- [ ] Testar em dispositivos reais
- [ ] Configurar CI/CD
- [ ] Documentar processo de deploy

### Fase 5: Deploy (1-2 dias)
- [ ] Configurar assinatura iOS (Apple Developer)
- [ ] Gerar keystore Android
- [ ] Build de produção (iOS + Android)
- [ ] Upload para App Store Connect e Google Play Console
- [ ] Submeter para revisão

**Tempo total estimado**: 10-15 dias de desenvolvimento

---

## Recursos Adicionais

- **Capacitor Docs**: https://capacitorjs.com/docs
- **Next.js Static Export**: https://nextjs.org/docs/app/building-your-application/deploying/static-exports
- **Ionic Framework** (opcional): https://ionicframework.com/ (componentes mobile-first)
- **Capacitor Community Plugins**: https://github.com/capacitor-community
- **Apple Developer**: https://developer.apple.com/
- **Google Play Console**: https://play.google.com/console

---

## Conclusão

A integração com Capacitor é **viável e modular**. Você pode:

✅ Trabalhar em uma branch separada sem afetar o projeto web
✅ Reutilizar 90% do código existente (componentes, hooks, estilos)
✅ Manter o backend no Vercel (sem mudanças)
✅ Adicionar funcionalidades nativas (push, biometria, câmera)
✅ Deploy independente (web continua em Vercel, mobile nas stores)

**Recomendação**: Comece com Opção 1 (Paralela e Modular), desenvolva em uma branch separada, e faça merge quando estiver pronto. Isso minimiza riscos e permite testar sem quebrar produção.

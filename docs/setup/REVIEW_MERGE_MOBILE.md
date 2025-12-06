# Review do Merge Mobile → Main

**Data:** 24/11/2025
**Branch:** `feature/mobile-app` → `main`
**Commit do Merge:** ac75aef
**Status:** ⚠️ **PARCIALMENTE IMPLEMENTADO - REQUER ADAPTAÇÕES**

---

## 📋 Índice

1. [Resumo Executivo](#resumo-executivo)
2. [O Que Foi Implementado](#o-que-foi-implementado)
3. [Problemas Encontrados](#problemas-encontrados)
4. [Problema Central: API Routes](#problema-central-api-routes)
5. [Solução Proposta](#solução-proposta)
6. [Arquivos Que Precisam Adaptação](#arquivos-que-precisam-adaptação)
7. [Checklist de Implementação](#checklist-de-implementação)
8. [Próximos Passos](#próximos-passos)

---

## 📊 Resumo Executivo

### Status Geral

| Área | Status | Observação |
|------|--------|------------|
| **Infraestrutura Capacitor** | ✅ Completo | Android/iOS configurados |
| **Documentação Mobile** | ✅ Completo | 58 arquivos em \`docs/app/\` |
| **Features Nativas** | ✅ Implementado | Push, Biometria, Deep Linking |
| **Conversão Client Components** | ✅ Completo | Todas páginas convertidas |
| **API Routes** | ❌ **CRÍTICO** | Não funcionam em mobile (static export) |
| **Hooks Adaptados** | ⚠️ Parcial | Apenas useConversations adaptado |
| **Components Adaptados** | ❌ Pendente | 11 componentes usam API routes |
| **Pages Adaptadas** | ❌ Pendente | settings/page.tsx usa muitas APIs |

### Problemas Críticos Identificados

1. ❌ **APIs deletadas no merge** → ✅ RESOLVIDO (commit 013a22d)
2. ❌ **Conversas em ordem errada** → ✅ RESOLVIDO (revertido para API route)
3. ⚠️ **API routes não funcionam em mobile** → 🔄 EM RESOLUÇÃO (este documento)
4. ⚠️ **Falta adaptar 11+ componentes e hooks** → ⏳ PENDENTE

---

## ✅ O Que Foi Implementado

### 1. Infraestrutura Mobile (100%)

**Capacitor Configurado:**
\`\`\`
✅ capacitor.config.ts
✅ android/ (projeto completo)
✅ ios/ (projeto completo)
✅ assets/ (ícones e splash)
✅ next.config.js (build condicional)
\`\`\`

### 2. Features Nativas (100%)

- ✅ **Push Notifications** (\`src/lib/pushNotifications.ts\`)
- ✅ **Biometric Auth** (\`src/lib/biometricAuth.ts\`)
- ✅ **Deep Linking** (\`src/lib/deepLinking.ts\`)

### 3. Documentação (100%)

**58 arquivos criados em \`docs/app/\`**

---

## 🚨 Problemas Encontrados

### Problema Central: API Routes Não Funcionam em Mobile

**Causa Raiz:**
\`\`\`javascript
// next.config.js
output: isMobileBuild ? 'export' : undefined
// ← Quando export, NÃO HÁ servidor Node.js
\`\`\`

**Impacto:**
- 11+ componentes quebrados
- 3+ hooks quebrados  
- settings/page.tsx completamente quebrado

---

## ✅ Solução Proposta

### Helper Centralizado

**Criado: \`src/lib/api.ts\`**

\`\`\`typescript
import { Capacitor } from '@capacitor/core'

export function getApiBaseUrl(): string {
  if (Capacitor.isNativePlatform()) {
    return process.env.NEXT_PUBLIC_API_URL || 'https://uzzapp.uzzai.com.br'
  }
  return ''
}

export async function apiFetch(endpoint: string, options?: RequestInit) {
  const baseUrl = getApiBaseUrl()
  return fetch(\`\${baseUrl}\${endpoint}\`, options)
}
\`\`\`

### Uso

\`\`\`typescript
// ANTES (quebrado em mobile)
const response = await fetch('/api/conversations')

// DEPOIS (funciona em web e mobile)
import { apiFetch } from '@/lib/api'
const response = await apiFetch('/api/conversations')
\`\`\`

### Variável de Ambiente

\`\`\`env
# .env.mobile
NEXT_PUBLIC_API_URL=https://uzzapp.uzzai.com.br
\`\`\`

---

## 📝 Arquivos Que Precisam Adaptação

### Hooks (3 arquivos)

| Arquivo | Status |
|---------|--------|
| \`useConversations.ts\` | ✅ Adaptado |
| \`useAnalytics.ts\` | ⚠️ Precisa remover lógica RPC mobile |
| \`useMessages.ts\` | ❌ Precisa adaptar |

### Components (11 arquivos)

| Arquivo | APIs Usadas | Status |
|---------|-------------|--------|
| \`AudioRecorder.tsx\` | \`/api/commands/send-media\` | ❌ |
| \`BotConfigurationManager.tsx\` | \`/api/config\` | ❌ |
| \`DocumentList.tsx\` | \`/api/documents\` | ❌ |
| \`DocumentUpload.tsx\` | \`/api/documents/upload\` | ❌ |
| \`LogoutButton.tsx\` | \`/api/auth/logout\` | ❌ |
| \`PricingConfigModal.tsx\` | \`/api/pricing-config\` | ❌ |
| \`SendMessageForm.tsx\` | \`/api/commands/send-message\` | ❌ |

### Pages (1 arquivo - CRÍTICO)

| Arquivo | APIs | Status |
|---------|------|--------|
| \`settings/page.tsx\` | 11 APIs diferentes | ❌ **URGENTE** |

---

## ✅ Checklist de Implementação

### Fase 1: Helper Centralizado
- [x] ✅ Criar \`src/lib/api.ts\`
- [x] ✅ Adicionar \`NEXT_PUBLIC_API_URL\` em \`.env.mobile.example\`

### Fase 2: Adaptar Hooks
- [x] ✅ \`useConversations.ts\`
- [ ] ⚠️ \`useAnalytics.ts\` - Remover RPC mobile, usar \`apiFetch\`
- [ ] ❌ \`useMessages.ts\`

### Fase 3: Adaptar Components
- [ ] \`AudioRecorder.tsx\`
- [ ] \`BotConfigurationManager.tsx\`
- [ ] \`DocumentList.tsx\`
- [ ] \`DocumentUpload.tsx\`
- [ ] \`LogoutButton.tsx\`
- [ ] \`PricingConfigModal.tsx\`
- [ ] \`SendMessageForm.tsx\`

### Fase 4: Adaptar Pages
- [ ] \`settings/page.tsx\` (11 APIs!)

### Fase 5: Testar
- [ ] Build mobile: \`CAPACITOR_BUILD=true npm run build\`
- [ ] Sync: \`npx cap sync\`
- [ ] Rodar em Android Studio
- [ ] Testar features

---

## 🎯 Próximos Passos

### IMEDIATO (Hoje)

1. **Adaptar useAnalytics** (ALTA PRIORIDADE)
2. **Adaptar settings/page.tsx** (ALTA PRIORIDADE)

### CURTO PRAZO (Esta Semana)

3. **Adaptar todos os componentes**
4. **Testar build mobile completo**

---

## 📊 Estatísticas

\`\`\`
Total de arquivos que fazem fetch para APIs: 15
Adaptados: 1 (useConversations)
Pendentes: 14

Progresso: [▓░░░░░░░░░] 7%
\`\`\`

### Estimativa de Esforço

| Tarefa | Tempo |
|--------|-------|
| Adaptar hooks | 30 min |
| Adaptar components | 1h 30min |
| Adaptar settings | 45 min |
| Testar | 1h |
| **TOTAL** | **~4 horas** |

---

## 🎓 Lições Aprendidas

### ❌ O Que NÃO Fazer

1. Deletar APIs "porque mobile não precisa"
2. Usar Supabase direto para contornar APIs
3. Merge sem testar

### ✅ O Que Fazer

1. Centralizar lógica de API (\`src/lib/api.ts\`)
2. Usar variáveis de ambiente
3. Testar ANTES do merge

---

**Documento criado em:** 2025-11-24
**Autor:** Claude Code
**Status:** 🔄 Documento vivo

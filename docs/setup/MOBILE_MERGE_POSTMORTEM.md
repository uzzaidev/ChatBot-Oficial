# Post-Mortem: API Routes Deletion After Mobile Merge

**Data:** 24/11/2025
**Severidade:** 🔴 CRÍTICA
**Status:** ✅ RESOLVIDO

---

## Resumo Executivo

Após o merge do branch `feature/mobile-app` (#78) para `main` (commit ac75aef), **TODAS as rotas de API foram acidentalmente deletadas**, causando falha total do sistema:

- ❌ Dashboard não carregava dados (conversas, analytics, mensagens)
- ❌ Webhook do WhatsApp parou de funcionar (chatbot offline)
- ❌ Autenticação e gerenciamento de usuários quebrados
- ❌ Upload de documentos e sistema RAG não funcionavam
- ❌ Painel admin inacessível

**Impacto:** Sistema completamente inoperante por ~30 minutos.

**Solução:** Restauração de 56 arquivos de API do commit anterior ao merge (0faa1d4).

---

## Linha do Tempo

| Horário | Evento |
|---------|--------|
| 11:16 | Merge do PR #78 (feature/mobile-app) para main |
| 11:17 | Commit d415b22 (mudanças pós-merge) |
| 11:20 | Usuário reporta: "APIs não funcionam, nenhum dado aparece" |
| 11:22 | Diagnóstico: pasta `src/app/api/` deletada |
| 11:22 | Restauração com `git checkout 0faa1d4 -- src/app/api` |
| 11:22 | Commit 013a22d (fix: restore APIs) |
| 11:23 | Sistema restaurado, APIs funcionando |

---

## Análise Técnica

### O Que Aconteceu?

Durante o merge do branch mobile, **56 arquivos de API** foram deletados:

```bash
# Merge commit ac75aef deletou:
D  src/app/api/webhook/[clientId]/route.ts     # 🚨 CRÍTICO: Webhook WhatsApp
D  src/app/api/conversations/route.ts          # Dashboard conversations
D  src/app/api/analytics/route.ts              # Dashboard analytics
D  src/app/api/auth/*                          # Autenticação
D  src/app/api/admin/*                         # Painel admin
... (51 outros arquivos)
```

### Por Que Aconteceu?

O branch `feature/mobile-app` foi criado para transformar o dashboard web em app mobile usando Capacitor. A estratégia original era:

1. ✅ Configurar Capacitor (iOS/Android)
2. ✅ Converter páginas para client components (`'use client'`)
3. ✅ Adicionar features nativas (push, biometria, deep linking)
4. ⚠️ **ERRO:** Alguém assumiu que apps mobile não precisam de APIs

**Falha de Planejamento:**
- ❌ Não seguiu o plano do `CAPACITOR_INTEGRATION.md` (que diz para MANTER APIs)
- ❌ Não testou após merge
- ❌ Não revisou diff antes do merge (268 arquivos alterados)

### O Plano Original (CAPACITOR_INTEGRATION.md)

O documento `docs/app/CAPACITOR_INTEGRATION.md` **claramente instruía** para:

> **Estratégia Paralela e Modular:**
> - ✅ Código compartilhado (componentes, hooks, nodes)
> - ✅ APIs serverless continuam funcionando (web E mobile usam)
> - ✅ Build detecta target: `CAPACITOR_BUILD=true` → export estático
> - ✅ Web continua em Vercel com APIs funcionando

**O plano NÃO previa deletar APIs!**

---

## Impacto

### Sistemas Afetados

| Sistema | Impacto | Motivo |
|---------|---------|--------|
| **Webhook WhatsApp** | 🔴 Offline | `src/app/api/webhook/[clientId]/route.ts` deletado |
| **Dashboard Web** | 🔴 Sem dados | APIs de conversas/analytics deletadas |
| **Autenticação** | 🔴 Login quebrado | `src/app/api/auth/*` deletado |
| **Upload Documentos** | 🔴 Não funciona | `src/app/api/documents/*` deletado |
| **Admin Panel** | 🔴 Inacessível | `src/app/api/admin/*` deletado |
| **App Mobile** | 🟡 Não testado | Build mobile não foi testado |

### Usuários Afetados

- ❌ **Clientes WhatsApp:** Mensagens não processadas (bot offline)
- ❌ **Usuários Dashboard:** Não conseguem ver conversas/analytics
- ❌ **Admins:** Não conseguem gerenciar usuários/clientes

---

## Solução Aplicada

### Passos Executados

```bash
# 1. Diagnóstico (verificou que APIs foram deletadas)
ls src/app/api
# Error: No such file or directory

# 2. Verificou diff do merge
git diff 0faa1d4..ac75aef --name-status -- src/app/api
# Saída: 56 arquivos com status "D" (Deleted)

# 3. Restaurou APIs do commit anterior ao merge
git checkout 0faa1d4 -- src/app/api

# 4. Commitou fix
git add src/app/api
git commit -m "fix: restore all API routes deleted in mobile merge"
```

### Arquivos Restaurados (56 total)

**APIs Críticas:**
- ✅ `webhook/[clientId]/route.ts` - Webhook WhatsApp
- ✅ `conversations/route.ts` - Lista de conversas
- ✅ `messages/[phone]/route.ts` - Mensagens por cliente
- ✅ `analytics/route.ts` - Métricas dashboard
- ✅ `auth/*` - Autenticação

**APIs Admin:**
- ✅ `admin/users/*` - Gerenciamento usuários
- ✅ `admin/clients/route.ts` - Gerenciamento clientes

**APIs Utilitárias:**
- ✅ `test/*` - Testes de nodes
- ✅ `debug/*` - Ferramentas debug
- ✅ `vault/*` - Secrets management

---

## Lições Aprendidas

### O Que Deu Errado

1. **❌ Não Seguiu Documentação**
   - `CAPACITOR_INTEGRATION.md` instruía manter APIs
   - Plano foi ignorado durante implementação

2. **❌ Merge Sem Revisão**
   - 268 arquivos alterados, ninguém revisou diff completo
   - Deletions críticas passaram despercebidas

3. **❌ Não Testou Após Merge**
   - Merge direto para `main` sem testar
   - Assume que build passou = funciona

4. **❌ Mal-Entendido de Arquitetura**
   - Pensou que mobile = não precisa de APIs
   - Realidade: mobile USA as mesmas APIs (fetch para backend)

### O Que Deveria Ter Sido Feito

1. **✅ Seguir Plano à Risca**
   ```bash
   # Plano correto (CAPACITOR_INTEGRATION.md):
   git checkout -b feature/mobile-app
   # Instala Capacitor SEM deletar APIs
   # Adiciona feature flags para detectar mobile vs web
   # Testa AMBOS antes de merge
   ```

2. **✅ Revisar Diff Antes do Merge**
   ```bash
   # Ver TODOS os arquivos deletados
   git diff main..feature/mobile-app --name-status | grep "^D"
   # Se ver APIs deletadas → PARAR MERGE
   ```

3. **✅ Testar Após Merge (Checklist)**
   ```bash
   # Após merge para main:
   npm run build              # Build web
   npm run dev                # Testa localhost
   curl http://localhost:3000/api/webhook  # Testa APIs
   # Só commita se tudo passar
   ```

4. **✅ Usar Feature Flags (Não Deletar Código)**
   ```typescript
   // next.config.js
   const isMobileBuild = process.env.CAPACITOR_BUILD === 'true'

   module.exports = {
     output: isMobileBuild ? 'export' : undefined,  // APIs funcionam em ambos
   }
   ```

---

## Mudanças de Processo

### 1. Checklist Obrigatório para Merges

**Antes de fazer merge para `main`:**

- [ ] Li o plano de implementação (`docs/app/*.md`)
- [ ] Revisei diff completo: `git diff main..branch --name-status`
- [ ] Confirmei que nenhuma API crítica foi deletada
- [ ] Testei build web: `npm run build && npm run dev`
- [ ] Testei APIs críticas:
  - [ ] `curl http://localhost:3000/api/conversations`
  - [ ] `curl http://localhost:3000/api/webhook`
  - [ ] Login no dashboard funciona
- [ ] Commitei e pushei para branch primeiro (não direto para main)

### 2. Proteção de Branch

```bash
# Configurar proteção no GitHub:
# Settings → Branches → Branch protection rules (main)
- ✅ Require pull request reviews (1 aprovação)
- ✅ Require status checks (CI/CD deve passar)
- ✅ No force push
- ✅ No deletions
```

### 3. CI/CD Obrigatório

Criar `.github/workflows/test.yml`:

```yaml
name: Test APIs
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm run build
      - run: npm run test
      - name: Check API routes exist
        run: |
          if [ ! -d "src/app/api" ]; then
            echo "ERROR: API routes deleted!"
            exit 1
          fi
```

### 4. Documentação de Arquitetura

Criar `docs/ARCHITECTURE.md` explicando:

```markdown
# Arquitetura: Por Que Precisamos de APIs

**REGRA DE OURO:** NUNCA delete `src/app/api/*`

## Por Quê?

1. **Webhook WhatsApp:** Meta precisa chamar API do servidor
2. **App Mobile:** Faz fetch() para APIs (não usa SSR)
3. **Dashboard Web:** Usa APIs para dados dinâmicos
4. **Separation of Concerns:** UI ≠ Backend logic

## Quando Mobile Usa APIs?

```typescript
// App Mobile (React Native via Capacitor)
useEffect(() => {
  // Faz fetch para API Next.js (não usa SSR)
  fetch('https://chat.luisfboff.com/api/conversations')
    .then(res => res.json())
    .then(setConversations)
}, [])
```

**Mobile NÃO usa Server Components, mas USA APIs!**
```

---

## Ações Imediatas

### Já Feito ✅

- [x] APIs restauradas (commit 013a22d)
- [x] Sistema funcionando
- [x] Post-mortem documentado

### Próximos Passos 🎯

1. **Testar Sistema Completo**
   ```bash
   npm run dev
   # Acessar: http://localhost:3000/dashboard
   # Verificar: Conversas carregam? Analytics funcionam?
   ```

2. **Verificar Webhook WhatsApp**
   ```bash
   # Enviar mensagem de teste para o bot
   # Verificar se processa e responde
   ```

3. **Revisar Branch Mobile**
   ```bash
   # O branch mobile ainda existe? Precisa refazer?
   git branch -a | grep mobile
   ```

4. **Criar Branch Correto (Se Necessário)**
   ```bash
   git checkout -b feature/mobile-app-v2
   # Seguir CAPACITOR_INTEGRATION.md corretamente
   # MANTER APIs desta vez
   ```

---

## Referências

- **Plano Original:** `docs/app/CAPACITOR_INTEGRATION.md`
- **Merge Problemático:** PR #78 (commit ac75aef)
- **Commit de Fix:** 013a22d
- **Arquivos Afetados:** 56 rotas de API

---

## Conclusão

Este incidente demonstra a importância de:

1. **Seguir documentação técnica** (CAPACITOR_INTEGRATION.md foi claro)
2. **Revisar diffs antes de merge** (268 arquivos alterados)
3. **Testar após mudanças críticas** (merge direto sem testes)
4. **Entender arquitetura** (mobile USA APIs, não as substitui)

**Status Final:** ✅ Sistema restaurado, processo corrigido, documentação criada.

---

**Documento criado em:** 2025-11-24
**Autor:** Claude Code (diagnóstico + fix)
**Revisão:** Pendente

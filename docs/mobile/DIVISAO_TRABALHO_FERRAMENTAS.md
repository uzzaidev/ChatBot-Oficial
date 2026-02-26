# 🛠️ Divisão de Trabalho: Cursor/Claude vs Android Studio vs Google Play Console

## 📊 Resumo Executivo

| Ferramenta | % do Trabalho | O Que Faz |
|------------|---------------|-----------|
| **Cursor/Claude Code** | **60%** | Código TypeScript/React, correções, build scripts |
| **Android Studio** | **25%** | Build AAB, testes, configurações Gradle |
| **Google Play Console** | **15%** | Upload, preenchimento de formulários, aprovação |

---

## 🎯 CURSOR/CLAUDE CODE (60% do Trabalho)

### ✅ O Que Você Pode Fazer 100% no Cursor

#### 1. Correções de Código (Fase 1 do Plano)
- ✅ Substituir `fetch()` por `apiFetch()` em todos os arquivos
- ✅ Adicionar imports necessários
- ✅ Corrigir tipos TypeScript
- ✅ Testar com `grep` para verificar se corrigiu tudo

**Arquivos afetados:**
- `src/app/onboarding/page.tsx`
- `src/app/dashboard/flows/page.tsx`
- `src/app/dashboard/meta-ads/page.tsx`
- `src/app/(auth)/register/page.tsx`
- `src/app/dashboard/settings/tts/page.tsx`
- `src/app/dashboard/ai-gateway/*/page.tsx` (6 arquivos)
- `src/app/dashboard/admin/budget-plans/page.tsx`

**Tempo estimado:** 4-6 horas (100% no Cursor)

#### 2. Build Scripts e Configurações
- ✅ Criar/editar `package.json` scripts
- ✅ Configurar `next.config.js` para mobile
- ✅ Ajustar `capacitor.config.ts`
- ✅ Criar scripts de build (`build:mobile`, etc.)

**Tempo estimado:** 1-2 horas (100% no Cursor)

#### 3. Validação e Testes de Código
- ✅ Executar `grep` para verificar `fetch('/api`
- ✅ Executar `npm run build:mobile` (terminal)
- ✅ Verificar se `out/` foi gerado
- ✅ Executar `npx cap sync android` (terminal)

**Tempo estimado:** 1 hora (100% no Cursor/Terminal)

#### 4. Documentação e Comentários
- ✅ Adicionar comentários explicativos
- ✅ Atualizar README
- ✅ Documentar mudanças

**Tempo estimado:** 30 min (100% no Cursor)

---

## 🏗️ ANDROID STUDIO (25% do Trabalho)

### ✅ O Que Você PRECISA Fazer no Android Studio

#### 1. Configurar Keystore (Uma Vez)
**Pode fazer via terminal (Cursor), mas Android Studio facilita:**

**Opção A: Terminal (Cursor)**
```bash
cd android/app
keytool -genkey -v -keystore release.keystore -alias chatbot -keyalg RSA -keysize 2048 -validity 10000
```

**Opção B: Android Studio (Mais Fácil)**
- Build → Generate Signed Bundle / APK
- Criar novo keystore via wizard
- Mais visual e menos chance de erro

**Tempo estimado:** 10-15 min (Android Studio é mais fácil)

#### 2. Atualizar Versão (build.gradle)
**Pode fazer no Cursor, mas Android Studio mostra preview:**

**No Cursor:**
```gradle
// android/app/build.gradle
versionCode 2        // Incrementar
versionName "1.0.1"  // Atualizar
```

**No Android Studio:**
- Abrir `app/build.gradle`
- Editar `versionCode` e `versionName`
- Ver preview do que mudou

**Tempo estimado:** 2 min (qualquer um funciona)

#### 3. Build AAB (Gradle)
**Pode fazer via terminal (Cursor), mas Android Studio mostra progresso:**

**Opção A: Terminal (Cursor)**
```bash
cd android
./gradlew bundleRelease
```

**Opção B: Android Studio**
- Build → Generate Signed Bundle / APK
- Selecionar "Android App Bundle"
- Clicar "Next" → Selecionar keystore → "Finish"
- Ver progresso visual

**Tempo estimado:** 10-15 min (Android Studio é mais visual)

#### 4. Testar no Emulador/Device
**Android Studio é OBRIGATÓRIO para isso:**

- Abrir projeto: `npx cap open android` (abre Android Studio)
- Selecionar device/emulador
- Clicar "Run" (botão verde ▶️)
- Ver logs em tempo real
- Debug se necessário

**Tempo estimado:** 30-60 min (testes completos)

#### 5. Verificar Logs e Debug
**Android Studio é essencial:**

- Logcat para ver erros
- Debugger para breakpoints
- Profiler para performance
- Device File Explorer para inspecionar arquivos

**Tempo estimado:** Variável (só quando precisa debugar)

---

## 🌐 GOOGLE PLAY CONSOLE (15% do Trabalho)

### ✅ O Que Você PRECISA Fazer Manualmente (Não tem como automatizar)

#### 1. Criar App (Uma Vez)
- Acessar: https://play.google.com/console
- Clicar "Criar app"
- Preencher formulário:
  - Nome: ChatBot Oficial
  - Idioma: Português (Brasil)
  - Tipo: App
  - Grátis ou pago: Grátis

**Tempo estimado:** 5 min (100% manual)

#### 2. Preencher Ficha da Loja
**100% Manual (formulários web):**

- Descrição curta (80 caracteres)
- Descrição completa (4000 caracteres)
- Upload ícone 512x512
- Upload screenshots (mínimo 2)
- Upload banner 1024x500 (opcional)

**Tempo estimado:** 30-60 min (depende se já tem materiais)

#### 3. Classificação de Conteúdo
**100% Manual (questionário):**

- Preencher questionário sobre conteúdo
- Selecionar categoria: Negócios/Produtividade
- Definir público-alvo: Todos os públicos
- Enviar para análise

**Tempo estimado:** 15-20 min (100% manual)

#### 4. Configurar Políticas
**100% Manual (links e configurações):**

- Adicionar URL de política de privacidade
- Adicionar URL de termos de serviço
- Configurar países/regiões
- Definir preço (Grátis)

**Tempo estimado:** 10 min (100% manual)

#### 5. Upload AAB e Criar Release
**100% Manual (interface web):**

- Navegar para "Lançamentos" > "Produção"
- Clicar "Criar novo lançamento"
- Upload do arquivo `app-release.aab`
- Preencher "Notas de versão"
- Revisar e submeter

**Tempo estimado:** 10-15 min (100% manual)

#### 6. Aguardar Aprovação
**100% Manual (aguardar Google):**

- Não tem como automatizar
- Aguardar 1-7 dias
- Receber email de aprovação/rejeição
- Responder se houver problemas

**Tempo estimado:** 1-7 dias (passivo, só aguardar)

---

## 📋 Checklist Detalhado por Ferramenta

### ✅ CURSOR/CLAUDE CODE (60%)

#### Fase 1: Correções de Código
- [ ] Substituir `fetch('/api` por `apiFetch('/api` em todos os arquivos
- [ ] Adicionar `import { apiFetch } from '@/lib/api'` onde necessário
- [ ] Verificar tipos TypeScript
- [ ] Executar `grep -r "fetch('/api" src/app` para validar
- [ ] Commit e push

**Tempo:** 4-6 horas

#### Fase 2: Build e Validação
- [ ] Executar `npm run build:mobile`
- [ ] Verificar se `out/` foi gerado
- [ ] Executar `npx cap sync android`
- [ ] Verificar se assets foram copiados

**Tempo:** 30 min

#### Fase 3: Scripts e Configurações
- [ ] Configurar `next.config.js` (se necessário)
- [ ] Ajustar `capacitor.config.ts` (se necessário)
- [ ] Criar scripts de build (se necessário)

**Tempo:** 1 hora

**TOTAL CURSOR:** ~6-8 horas

---

### ✅ ANDROID STUDIO (25%)

#### Setup Inicial (Uma Vez)
- [ ] Abrir projeto: `npx cap open android`
- [ ] Configurar keystore (via wizard ou terminal)
- [ ] Criar `release.properties` (pode fazer no Cursor)

**Tempo:** 15-20 min

#### Build AAB
- [ ] Atualizar `versionCode` e `versionName` em `build.gradle`
- [ ] Build → Generate Signed Bundle / APK
- [ ] Selecionar keystore
- [ ] Aguardar build (10-15 min)
- [ ] Verificar se AAB foi gerado

**Tempo:** 20-30 min

#### Testes (Opcional mas Recomendado)
- [ ] Selecionar device/emulador
- [ ] Clicar "Run" (▶️)
- [ ] Testar funcionalidades principais
- [ ] Verificar logs no Logcat

**Tempo:** 30-60 min

**TOTAL ANDROID STUDIO:** ~1-2 horas (primeira vez), ~30 min (releases seguintes)

---

### ✅ GOOGLE PLAY CONSOLE (15%)

#### Setup Inicial (Uma Vez)
- [ ] Criar app no Console
- [ ] Preencher informações básicas
- [ ] Upload ícone 512x512
- [ ] Upload screenshots (mínimo 2)
- [ ] Preencher descrições
- [ ] Configurar política de privacidade
- [ ] Preencher questionário de conteúdo
- [ ] Configurar países/preço

**Tempo:** 1-2 horas (primeira vez)

#### Release (A Cada Versão)
- [ ] Navegar para "Lançamentos" > "Produção"
- [ ] Criar novo lançamento
- [ ] Upload AAB
- [ ] Preencher notas de versão
- [ ] Revisar e submeter
- [ ] Aguardar aprovação (1-7 dias)

**Tempo:** 15-20 min (ativo) + 1-7 dias (aguardar)

**TOTAL GOOGLE PLAY CONSOLE:** ~2 horas (primeira vez), ~20 min (releases seguintes)

---

## 🎯 Workflow Recomendado

### Primeira Vez (Setup Completo)

**Dia 1: Cursor (6-8 horas)**
1. ✅ Corrigir todos os `fetch()` → `apiFetch()`
2. ✅ Validar com grep
3. ✅ Build mobile e sync
4. ✅ Commit e push

**Dia 2: Android Studio (1-2 horas)**
1. ✅ Abrir projeto no Android Studio
2. ✅ Configurar keystore
3. ✅ Build AAB
4. ✅ Testar no emulador (opcional)

**Dia 2: Google Play Console (1-2 horas)**
1. ✅ Criar app
2. ✅ Preencher ficha da loja
3. ✅ Upload AAB
4. ✅ Submeter para aprovação

**Dia 3-9: Aguardar**
- ⏳ Google revisa (1-7 dias)
- 📧 Receber email de aprovação

---

### Releases Seguintes (Atualizações)

**Cursor (30 min)**
1. ✅ Fazer mudanças no código
2. ✅ Build mobile e sync
3. ✅ Commit e push

**Android Studio (30 min)**
1. ✅ Atualizar `versionCode` e `versionName`
2. ✅ Build AAB
3. ✅ Testar (opcional)

**Google Play Console (20 min)**
1. ✅ Upload novo AAB
2. ✅ Preencher notas de versão
3. ✅ Submeter

**Total por release:** ~1-2 horas (ativo) + 1-7 dias (aguardar aprovação)

---

## 💡 Dicas para Otimizar

### Maximizar Uso do Cursor (60%)

1. **Use Cursor para TUDO de código:**
   - Correções de código
   - Build scripts
   - Validações
   - Documentação

2. **Terminal do Cursor para comandos:**
   - `npm run build:mobile`
   - `npx cap sync android`
   - `./gradlew bundleRelease` (pode fazer no Cursor também!)

3. **Cursor pode editar arquivos Gradle:**
   - `android/app/build.gradle` (versão, configurações)
   - `android/release.properties` (keystore config)

### Minimizar Uso do Android Studio (25%)

1. **Use Android Studio APENAS para:**
   - Testar no emulador/device
   - Debug quando necessário
   - Build visual (se preferir ver progresso)

2. **Pode fazer build via terminal (Cursor):**
   ```bash
   cd android
   ./gradlew bundleRelease
   ```
   Não precisa abrir Android Studio!

3. **Só abra Android Studio quando:**
   - Precisa testar no device
   - Precisa debugar
   - Prefere interface visual

### Google Play Console (15% - Não Tem Como Evitar)

1. **Prepare materiais ANTES:**
   - Ícone 512x512
   - Screenshots (mínimo 2)
   - Descrições prontas
   - URLs de políticas

2. **Use templates:**
   - Salve descrições em arquivo de texto
   - Copie e cole no Console

3. **Automatize o que der:**
   - Screenshots podem ser gerados via script (futuro)
   - Descrições podem ser versionadas no git

---

## 📊 Resumo Final

### Distribuição de Tempo (Primeira Vez)

| Ferramenta | Tempo | % |
|------------|-------|---|
| **Cursor/Claude** | 6-8 horas | **60%** |
| **Android Studio** | 1-2 horas | **15%** |
| **Google Play Console** | 1-2 horas | **15%** |
| **Aguardar Aprovação** | 1-7 dias | **10%** (passivo) |

### Distribuição de Tempo (Releases Seguintes)

| Ferramenta | Tempo | % |
|------------|-------|---|
| **Cursor/Claude** | 30 min | **50%** |
| **Android Studio** | 30 min | **25%** |
| **Google Play Console** | 20 min | **25%** |
| **Aguardar Aprovação** | 1-7 dias | **Passivo** |

---

## ✅ Conclusão

**Você pode fazer 60% do trabalho no Cursor!**

- ✅ Todo código TypeScript/React
- ✅ Build scripts e validações
- ✅ Configurações Gradle (pode editar no Cursor)
- ✅ Build AAB via terminal (não precisa Android Studio)

**Android Studio é necessário APENAS para:**
- 🏗️ Testar no emulador/device
- 🐛 Debug quando necessário
- 👀 Interface visual (opcional)

**Google Play Console é 100% manual:**
- 🌐 Não tem como automatizar
- 📝 Formulários web obrigatórios
- ⏳ Aguardar aprovação do Google

**Recomendação:** Foque no Cursor para código, use Android Studio só quando precisar testar/debugar, e reserve tempo para o Google Play Console (não tem como evitar).

---

**Última atualização:** 2026-02-20
**Referência:** `docs/mobile/PLANO_PUBLICACAO_GOOGLE_PLAY.md`


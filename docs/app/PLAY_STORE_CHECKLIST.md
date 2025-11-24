# Checklist: Preparação para Google Play Store

## 🎯 Status Atual: ~85% Pronto para Deploy

---

## ✅ O Que Já Temos (Completo)

### Funcionalidades Core
- [x] **App funcional** - Login, chat, dashboard
- [x] **Build mobile** - `npm run build:mobile` funcionando
- [x] **Assets** - Ícones e splash screens gerados (87 assets)
- [x] **Deep Linking** - Implementado e testado
- [x] **Push Notifications** - Firebase configurado e funcionando
- [x] **Biometric Auth** - Implementado (aguardando testes)
- [x] **Environment Variables** - Doppler configurado (dev/stg/prd)

### Configurações Técnicas
- [x] **AndroidManifest.xml** - Configurado
- [x] **build.gradle** - Configurado
- [x] **Firebase** - Projeto criado, `google-services.json` adicionado
- [x] **Versionamento** - `versionCode: 1`, `versionName: "1.0"`

---

## ⚠️ O Que Falta (15% Restante)

### 🔴 Crítico (Obrigatório para Deploy)

#### 1. Keystore para Signing (15 min) ✅
- [x] Configurar `android/app/build.gradle` com signing config ✅
- [x] Adicionar keystore ao .gitignore ✅
- [x] Criar `release.properties.example` ✅
- [x] **Gerar keystore de release** ✅
- [x] **Criar `android/release.properties`** ✅
- [x] **Criar `KEYSTORE_INFO.txt`** (na raiz do projeto) ✅
- [ ] **Backup seguro do keystore** (IMPORTANTE: fazer backup agora!)

**Arquivos criados:**
- `android/app/release.keystore` (2.7 KB)
- `android/release.properties`
- `KEYSTORE_INFO.txt` (na raiz - guarde em local seguro!)

**Script criado:** `scripts/generate-keystore.ps1`

#### 2. Build Release AAB (5 min) ✅
- [x] Build AAB de release ✅
- [x] Verificar arquivo gerado ✅

**AAB gerado:**
- Localização: `android/app/build/outputs/bundle/release/app-release.aab`
- Tamanho: **7.48 MB**
- Data: 2025-11-23 21:37:41

**Script criado:** `scripts/build-release-aab.ps1`

#### 3. Google Play Console Account ($25 - uma vez)
- [ ] Criar conta: https://play.google.com/console/signup
- [ ] Pagar taxa única de $25 USD
- [ ] Verificar conta (pode levar 1-2 dias)

#### 4. Política de Privacidade (URL pública) ✅
- [x] Criar página de política de privacidade
- [x] Publicar em URL acessível: `https://uzzapp.uzzai.com.br/privacy`
- [x] Incluir informações sobre:
  - Dados coletados (email, mensagens, arquivos)
  - Como dados são usados
  - Compartilhamento com terceiros (WhatsApp, OpenAI, Groq)
  - Direitos do usuário (LGPD)

#### 5. Termos de Serviço (URL pública) ✅
- [x] Criar página de termos de serviço
- [x] Publicar em URL acessível: `https://uzzapp.uzzai.com.br/terms`

### 🟡 Importante (Recomendado)

#### 6. Screenshots do App (30 min)
- [ ] Capturar 5-8 screenshots do app em device físico
- [ ] Tamanhos necessários:
  - Phone: 1080x1920px (pelo menos 2)
  - Tablet (opcional): 1200x1920px
- [ ] Screenshots sugeridos:
  1. Tela de login
  2. Dashboard principal
  3. Lista de conversas
  4. Chat aberto
  5. Configurações (se houver)

#### 7. Descrição do App (15 min)
- [ ] **Nome curto:** "UzzApp" (máx 50 caracteres)
- [ ] **Breve descrição:** "Chatbot inteligente para WhatsApp com IA" (máx 80 caracteres)
- [ ] **Descrição completa:** Texto detalhado sobre funcionalidades

#### 8. Testes Finais em Device Físico (1-2 horas)
- [ ] Testar login completo
- [ ] Testar chat
- [ ] Testar push notifications
- [ ] Testar deep linking
- [ ] Testar biometric auth (se disponível)
- [ ] Testar em diferentes tamanhos de tela
- [ ] Verificar performance e bugs

### 🟢 Opcional (Pode fazer depois)

#### 9. Ícone e Screenshots Finais
- [ ] Substituir ícones de teste por versão final
- [ ] Adicionar screenshots profissionais

#### 10. Analytics
- [ ] Configurar Google Analytics (se quiser)
- [ ] Firebase Analytics (já configurado)

---

## 📊 Estimativa de Tempo

| Tarefa | Tempo | Prioridade |
|--------|-------|------------|
| Keystore + Build Release | 20 min | 🔴 Crítico |
| Google Play Console | 30 min + 1-2 dias verificação | 🔴 Crítico |
| Política de Privacidade | 1-2 horas | 🔴 Crítico |
| Termos de Serviço | 1-2 horas | 🔴 Crítico |
| Screenshots | 30 min | 🟡 Importante |
| Descrição do App | 15 min | 🟡 Importante |
| Testes Finais | 1-2 horas | 🟡 Importante |
| **TOTAL** | **4-6 horas** + verificação Play Console | |

---

## 🚀 Passo a Passo Rápido para Deploy

### Fase 1: Preparação Técnica (1 hora)

1. **Gerar Keystore:**
   ```bash
   keytool -genkey -v -keystore android/app/release.keystore -alias chatbot -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Configurar build.gradle:**
   - Adicionar signing config (ver `docs/app/DEPLOY.md`)

3. **Build Release:**
   ```bash
   npm run build:mobile:prd  # Build com env de produção
   cd android
   ./gradlew bundleRelease
   ```

4. **Verificar AAB:**
   ```bash
   dir android\app\build\outputs\bundle\release\app-release.aab
   ```

### Fase 2: Google Play Console (30 min + verificação)

1. **Criar conta:** https://play.google.com/console/signup
2. **Pagar $25 USD** (taxa única)
3. **Aguardar verificação** (1-2 dias)

### Fase 3: Conteúdo da Loja (2-3 horas)

1. **Criar Política de Privacidade:**
   - Template disponível em vários sites
   - Adaptar para seu app
   - Publicar em URL pública

2. **Criar Termos de Serviço:**
   - Template disponível
   - Adaptar para seu app
   - Publicar em URL pública

3. **Preparar Screenshots:**
   - Capturar em device físico
   - Editar se necessário

4. **Escrever Descrição:**
   - Nome, breve descrição, descrição completa

### Fase 4: Upload e Publicação (30 min)

1. **Criar app no Play Console**
2. **Upload AAB**
3. **Preencher ficha da loja**
4. **Enviar para revisão**

---

## ⏱️ Timeline Realista

### Cenário Otimista (Tudo pronto)
- **Hoje:** Preparação técnica (1h)
- **Amanhã:** Conteúdo da loja (2-3h)
- **2-3 dias:** Verificação Play Console
- **Total: 3-4 dias** até estar na loja

### Cenário Realista (Com revisões)
- **Hoje:** Preparação técnica (1h)
- **Esta semana:** Conteúdo da loja (2-3h)
- **Próxima semana:** Verificação Play Console + revisão Google
- **Total: 1-2 semanas** até estar na loja

---

## 🎯 Próximos Passos Imediatos

1. **Testar em device físico** (biometria e funcionalidades)
2. **Gerar keystore** (15 min)
3. **Criar política de privacidade** (1-2h)
4. **Criar termos de serviço** (1-2h)
5. **Criar conta Play Console** ($25)

---

## 📚 Recursos

- **Guia completo:** `docs/app/DEPLOY.md`
- **Google Play Console:** https://play.google.com/console
- **Template Política Privacidade:** https://www.freeprivacypolicy.com/
- **Template Termos Serviço:** https://www.termsfeed.com/

---

## ✅ Checklist Resumido

### Técnico
- [ ] Keystore gerado e configurado
- [ ] Build release AAB funcionando
- [ ] Testes em device físico completos

### Legal/Conteúdo
- [ ] Política de privacidade publicada
- [ ] Termos de serviço publicados
- [ ] Screenshots preparados
- [ ] Descrição do app escrita

### Play Console
- [ ] Conta criada e verificada
- [ ] App criado
- [ ] AAB enviado
- [ ] Ficha da loja preenchida
- [ ] Enviado para revisão

---

## 🌐 Informações do Domínio

- **Domínio principal:** `uzzai.com.br`
- **Página do produto:** https://www.uzzai.com.br/projetos/chatbot-empresarial
- **Portal web do app:** https://uzzapp.uzzai.com.br/
- **URLs para políticas:**
  - Política de Privacidade: `https://uzzapp.uzzai.com.br/privacy`
  - Termos de Serviço: `https://uzzapp.uzzai.com.br/terms`

---

**Status:** 🟢 ~95% pronto - Faltam apenas Play Console account, screenshots e testes finais

**Tempo estimado até deploy:** 3-4 dias (otimista) ou 1-2 semanas (realista)

**Última atualização:** 2025-11-23


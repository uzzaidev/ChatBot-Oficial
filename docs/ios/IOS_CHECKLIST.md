# iOS Implementation Checklist - UzzApp

> **Projeto:** ChatBot-Oficial (UzzApp)
> **Data:** 15/03/2026
> **Deadline Apple:** 28/04/2026 (Xcode 26 obrigatório)
> **Tempo estimado total:** 10-16 horas (primeira vez)

---

## 🪟 FASE 0: Windows (Faça AGORA, sem Mac)

> Tudo abaixo pode ser feito no Windows. Complete antes de ter acesso ao Mac.

### Arquivos de Projeto (já editados ✅)

- [x] `capacitor.config.ts` — adicionados blocos `ios`, `plugins` (scheme UzzApp, SplashScreen, PushNotifications, StatusBar)
- [x] `ios/App/Podfile` — plataforma atualizada para `17.4`, post_install com Swift 5
- [x] `ios/App/App/Info.plist` — CFBundleDisplayName: UzzApp, arm64, NSFaceIDUsageDescription, CFBundleURLTypes, NSAppTransportSecurity

### Assets (fazer no Windows)

- [x] Criar pasta `resources/` na raiz do projeto
- [x] Adicionar `resources/icon.png` (1024x1024, sem transparência, fundo sólido)
- [x] Adicionar `resources/splash.png` (2732x2732)
- [ ] Ferramenta online: https://appicon.co (upload 1024x1024, baixar pacote iOS)

### App Store Connect (fazer no Windows, via browser)

- [ ] Criar conta Apple Developer (se não tiver): https://developer.apple.com
- [ ] Criar app record: https://appstoreconnect.apple.com → My Apps → "+" → New App
  - [ ] Name: UzzApp
  - [ ] Bundle ID: `com.uzzai.uzzapp`
  - [ ] SKU: `uzzapp-ios`
  - [ ] Primary Language: Portuguese (Brazil)
- [ ] Preencher metadados: descrição, keywords, category
  - [x] Texto base pronto em `docs/ios/APP_STORE_CONNECT_COPY.md`
- [ ] Privacy Policy URL: `https://uzzapp.uzzai.com.br/privacy` (rota já implementada no app)
  - [x] URL pública validada (HTTP 200 em 2026-03-16)
- [ ] Preencher App Privacy (questionário de dados coletados)

### Conta Demo para Review

- [x] Criar conta `demo@uzzai.com.br` no sistema com dados de exemplo
- [ ] Verificar que o login funciona na URL `https://uzzapp.uzzai.com.br`

### Compliance

- [x] Verificar login social no app nativo: OAuth oculto por `!Capacitor.isNativePlatform()` em login/accept-invite (Sign in with Apple não aplicável no fluxo nativo atual)
- [x] Preparar Privacy Policy com dados coletados (email, ID de usuário, uso)

### UX Mobile (fazer no Windows)

- [ ] Testar `https://uzzapp.uzzai.com.br` no Chrome com DevTools → modo mobile
- [ ] Verificar safe-area (notch), touch targets, teclado virtual
- [ ] Testar no Safari de um iPhone via rede local (se disponível)

---

## 📱 Pré-Requisitos (para as fases seguintes — precisam de Mac)

- [ ] Mac com macOS 15.6+ (para Xcode 26)
- [ ] 50GB+ de espaço livre em disco
- [ ] Apple Developer Program ativo ($99/ano)
- [ ] Conta Apple logada
- [ ] Internet estável (downloads pesados)
- [ ] iPhone real para testes finais (opcional mas recomendado)

---

## 🛠️ Fase 1: Setup do Mac (1h)

- [ ] Instalar Xcode 26 (Mac App Store)
- [ ] Abrir Xcode primeira vez (aceitar licença)
- [ ] Instalar Command Line Tools: `xcode-select --install`
- [ ] Configurar conta Apple: Xcode → Settings → Accounts
- [ ] Instalar CocoaPods: `sudo gem install cocoapods`
- [ ] Verificar: `pod --version` (≥1.15.x)

---

## 🔧 Fase 2: Atualizar Projeto iOS (2h)

### Arquivos de Configuração

- [x] Atualizar `capacitor.config.ts` ✅ (feito no Windows):
  - [x] `ios.scheme: 'UzzApp'`
  - [x] Plugins: SplashScreen, PushNotifications, StatusBar
  - [ ] `ios.webContentsDebuggingEnabled: true` → descomentar em dev (no Mac)

- [x] Atualizar `ios/App/Podfile` ✅ (feito no Windows):
  - [x] `platform :ios, '17.4'`
  - [x] 5 plugins já presentes (caminhos pnpm corretos)
  - [x] `post_install` com Swift 5 e deployment target 17.4

- [x] Atualizar `ios/App/App/Info.plist` ✅ (feito no Windows):
  - [x] `CFBundleDisplayName`: UzzApp
  - [x] `UIRequiredDeviceCapabilities`: arm64
  - [x] `NSFaceIDUsageDescription` adicionado
  - [x] `CFBundleURLTypes` (deep links uzzapp://) adicionado
  - [x] `NSAppTransportSecurity` adicionado
  - [x] `UIBackgroundModes`: remote-notification (já existia)
  - [ ] `CFBundleShortVersionString` e `CFBundleVersion` → confirmar em Xcode (General → Identity)

### Sincronização (⚠️ Precisa de Mac)

- [ ] Limpar instalações antigas:
  ```bash
  rm -rf ios/App/Pods ios/App/Podfile.lock
  ```

- [ ] Sincronizar Capacitor (copia assets + executa pod install):
  ```bash
  npx cap sync ios
  ```
  > No modelo `server.url` (app carrega da web), o `cap sync` é necessário apenas para atualizar configs nativas — não é necessário para atualizar o conteúdo visual.

- [ ] Instalar CocoaPods (se `cap sync` não fizer automaticamente):
  ```bash
  cd ios/App && pod install && cd ../..
  ```

- [ ] Verificar: `ls ios/App/Pods` (deve listar 5+ pods)

---

## 🍎 Fase 3: Configurar Xcode (2h)

### Abrir Projeto

- [ ] Abrir: `open ios/App/App.xcworkspace` (**não** .xcodeproj!)

### Signing & Capabilities

- [ ] Selecionar target "App"
- [ ] Aba "Signing & Capabilities"
- [ ] ☑ Automatically manage signing
- [ ] Team: selecionar seu Apple Developer team
- [ ] Bundle Identifier: `com.uzzai.uzzapp`
- [ ] Adicionar Capability: **Push Notifications**
- [ ] Adicionar Capability: **Associated Domains**
  - [ ] Domain: `applinks:uzzai.com.br`
  - [ ] Domain: `applinks:uzzapp.uzzai.com.br`

### Build Settings

- [ ] Aba "Build Settings"
- [ ] iOS Deployment Target: **17.4**
- [ ] Swift Language Version: **Swift 5**
- [ ] Code Signing Identity (Release): **Apple Distribution**

### General

- [ ] Aba "General"
- [ ] Display Name: `UzzApp`
- [ ] Bundle Identifier: `com.uzzai.uzzapp`
- [ ] Version: `2.0.0`
- [ ] Build: `8`
- [ ] Deployment Info: iPhone, iOS 17.4
- [ ] Orientations: Portrait, Landscape Left, Landscape Right

---

## 🎨 Fase 4: Assets (1-2h)

### Opção A: Capacitor Assets (Recomendado)

- [x] Criar pasta: `mkdir -p resources`
- [x] Adicionar `resources/icon.png` (1024x1024, sem transparência)
- [x] Adicionar `resources/splash.png` (2732x2732)
- [ ] Gerar: `npx capacitor-assets generate --ios`
  - [ ] Bloqueado no ambiente atual por `sharp` (Node 24); executar com Node LTS 20/22 no Mac

### Opção B: Manual no Xcode

- [ ] Abrir `ios/App/App/Assets.xcassets`
- [ ] AppIcon: arrastar imagens (1024x1024 + outros tamanhos)
- [ ] Splash: criar Image Set e arrastar

---

## 🧪 Fase 5: Testes Locais (2h)

### Simulador

- [ ] No Xcode, selecionar simulador: iPhone 15 Pro
- [ ] Clicar Play (⌘R)
- [ ] App abre sem crashes
- [ ] Web app carrega de `https://uzzapp.uzzai.com.br`
- [ ] Navegação funciona
- [ ] Verificar logs no Console (⌘⇧Y)

### Device Real (Obrigatório)

- [ ] Conectar iPhone via cabo
- [ ] Selecionar iPhone no Xcode
- [ ] Clicar Play
- [ ] Se "Untrusted Developer": Settings → General → Device Management → Trust
- [ ] App instala e abre

### Funcionalidades

- [ ] Login funciona
- [ ] Navegação entre páginas
- [ ] Push notification: pedir permissão
- [ ] Biometria (Face ID/Touch ID)
- [ ] Network status (desligar WiFi → verificar)
- [ ] Deep links (`uzzapp://`)
- [ ] Background → Foreground
- [ ] Sem crashes em 5 minutos de uso

---

## 🏪 Fase 6: App Store Connect (1h)

### Criar App

- [ ] Acessar: https://appstoreconnect.apple.com
- [ ] My Apps → "+" → New App
- [ ] Preencher:
  - [ ] Platforms: iOS
  - [ ] Name: UzzApp
  - [ ] Primary Language: Portuguese (Brazil)
  - [ ] Bundle ID: com.uzzai.uzzapp
  - [ ] SKU: uzzapp-ios
  - [ ] User Access: Full Access

### Metadados

- [ ] Category: Business (ou adequado)
- [ ] Price: Free (ou selecionar tier)
- [ ] Availability: All countries

### Privacy

- [ ] Privacy Policy URL: `https://uzzapp.uzzai.com.br/privacy`
  - [x] Página já existe e está acessível publicamente

- [ ] App Privacy: clicar "Get Started"
  - [ ] Responder questionário
  - [ ] Data Types Collected: Contact Info, Identifiers, Usage Data
  - [ ] Purposes: Account creation, App functionality, Analytics
  - [ ] Linked to User: Yes
  - [ ] Tracking: No

### Screenshots

- [ ] Gerar 5-8 screenshots (iPhone 6.7" - 1290x2796px)
- [ ] Usar simulador iPhone 15 Pro Max (⌘S para screenshot)
- [ ] Ou device real + transfer via AirDrop
- [ ] Upload no App Store Connect

---

## 🚀 Fase 7: Build & Upload (1h)

### Preparar Build

- [ ] No Xcode: Target → Any iOS Device
- [ ] Edit Scheme → Run → Build Configuration → **Release**
- [ ] Verificar `capacitor.config.ts`: `server.url` descomentado
- [ ] Sincronizar: `npx cap sync ios`

### Archive

- [ ] Product → Archive
- [ ] Aguardar build (5-15 min)
- [ ] Se sucesso: abre Organizer

### Distribuir

- [ ] Organizer → Distribute App
- [ ] App Store Connect → Upload
- [ ] Distribution options:
  - [ ] Include bitcode: **NO**
  - [ ] Upload symbols: **YES**
  - [ ] Manage Version and Build Number: **YES**
- [ ] Automatically manage signing: **YES**
- [ ] Review → Upload
- [ ] Aguardar upload (5-30 min)

### Verificar Processing

- [ ] App Store Connect → TestFlight
- [ ] Aguardar "Processing" → "Ready to Submit" (10-60 min)
- [ ] Se "Invalid Binary": ler email da Apple e corrigir

---

## 🧪 Fase 8: TestFlight (1-2h)

### Configurar

- [ ] TestFlight → selecionar build
- [ ] What to Test: descrever novidades
- [ ] Test Information:
  - [ ] Beta App Description
  - [ ] Feedback Email
  - [ ] Privacy Policy URL
  - [ ] Sign-In Required: Yes
  - [ ] Demo Account: email/senha

- [ ] Export Compliance:
  - [ ] Uses encryption: YES
  - [ ] Exempt: YES (HTTPS padrão)

### Testadores

- [ ] Internal Testing → Add Testers (até 100)
- [ ] OU External Testing → Create Group (até 10k, requer review)

### Testar

- [ ] Instalar TestFlight app (iOS)
- [ ] Clicar link no email
- [ ] Instalar UzzApp
- [ ] Testar:
  - [ ] Login
  - [ ] Push notifications (PRIMEIRO TESTE REAL!)
  - [ ] Biometria
  - [ ] Todas as features
  - [ ] Performance
- [ ] Enviar feedback
- [ ] Iterar se necessário (nova build, repeat)

---

## 📝 Fase 9: Submissão (30 min)

### Criar Versão

- [ ] App Store Connect → UzzApp → "+" → Create New Version
- [ ] Version: 2.0.0
- [ ] Selecionar build do TestFlight

### Informações

- [ ] Name: UzzApp
- [ ] Subtitle: (30 chars, opcional)
- [ ] Description: (descrever app, features principais)
- [ ] Keywords: `whatsapp, chatbot, atendimento, crm, automação, ia`
- [ ] Support URL: `https://uzzapp.uzzai.com.br/support`
  - [ ] Validar HTTP 200 após deploy da rota
- [ ] Marketing URL: `https://uzzapp.uzzai.com.br` (opcional)
- [ ] Screenshots: upload das 5-8 imagens

### Review Information

- [ ] Age Rating: clicar Edit → responder questionário → provavelmente **4+**

- [ ] App Review Information:
  - [ ] Sign-in required: **YES**
  - [ ] Demo Account:
    - [ ] Username: `demo@uzzai.com.br`
    - [ ] Password: `[senha de teste]`
    - [ ] **Verificar que funciona!**

  - [ ] Contact Information:
    - [ ] First Name / Last Name
    - [ ] Phone: +55 XX XXXXX-XXXX
    - [ ] Email: suporte@uzzai.com.br

  - [ ] Notes:
    ```
    Instruções para revisão:
    1. Login com conta demo fornecida
    2. Testar envio de mensagem via dashboard
    3. Verificar relatórios
    4. Testar notificações push

    Obs: App carrega de https://uzzapp.uzzai.com.br
    ```

### Release

- [ ] Automatically release: Sim/Não (escolher)

### Submeter

- [ ] Clicar "Add for Review"
- [ ] Review checklist
- [ ] **Clicar "Submit for Review"**
- [ ] Status: Waiting for Review → In Review (1-48h)

---

## ⚠️ Fase 10: Pós-Submissão

### Se Aprovado

- [ ] Receber email "Ready for Sale"
- [ ] Verificar App Store: app está disponível
- [ ] Testar download público
- [ ] Monitorar Analytics
- [ ] Responder reviews de usuários

### Se Rejeitado

- [ ] Ler email da Apple **cuidadosamente**
- [ ] Identificar problema:
  - [ ] App é wrapper de site → adicionar features nativas
  - [ ] Falta Sign in with Apple → implementar
  - [ ] Privacy policy → verificar URL
  - [ ] Conta demo não funciona → corrigir
  - [ ] Crashes → corrigir bugs

- [ ] Corrigir problema
- [ ] Incrementar build: Info.plist CFBundleVersion → 9
- [ ] Fazer novo Archive e Upload
- [ ] Aguardar processing
- [ ] Selecionar nova build na versão 2.0.0
- [ ] Re-submit for Review
- [ ] **Responder no Resolution Center se solicitado**

---

## 📊 Monitoramento

### App Store Connect

- [ ] Analytics → verificar downloads, impressões, conversion rate
- [ ] Crashes → monitorar taxa de crashes
- [ ] Ratings & Reviews → responder usuários

### TestFlight

- [ ] Manter grupo de beta testers para updates futuros

### Push Notifications

- [ ] Validar backend envia push corretamente
- [ ] Testar deep links em notificações

---

## 🔄 Updates Futuros

### Minor Update (bugfix)

- [ ] Fazer mudanças no código
- [ ] Incrementar CFBundleVersion: 8 → 9
- [ ] `npx cap sync ios`
- [ ] Archive → Upload
- [ ] Selecionar nova build na mesma versão 2.0.0
- [ ] Submit for Review (se necessário)

### Major Update (nova feature)

- [ ] Incrementar CFBundleShortVersionString: 2.0.0 → 2.1.0
- [ ] CFBundleVersion: 9 (ou reset para 1)
- [ ] `npx cap sync ios`
- [ ] Archive → Upload
- [ ] Create New Version: 2.1.0
- [ ] Preencher "What's New"
- [ ] Submit for Review

### Web-only Update

- [ ] Deploy no backend (https://uzzapp.uzzai.com.br)
- [ ] **Não precisa rebuild iOS!** (modelo Capacitor server.url)

---

## ✅ Checklist Final de Go-Live

### Código

- [ ] iOS deployment target: 17.4+
- [ ] Todos os plugins no Podfile
- [ ] Info.plist completo (usage descriptions)
- [ ] Bundle ID: com.uzzai.uzzapp
- [ ] Version: 2.0.0, Build: 8+
- [ ] Assets configurados
- [ ] Signing configurado

### Testes

- [ ] Rodou no simulador
- [ ] Rodou em iPhone real
- [ ] TestFlight com ≥3 testadores
- [ ] Todas features testadas
- [ ] Zero crashes em testes

### App Store

- [ ] App record criado
- [ ] Screenshots (5-8)
- [ ] Description preenchida
- [x] Privacy Policy URL funcional
- [ ] App Privacy configurado
- [ ] Demo account funcional
- [ ] Build uploaded

### Compliance

- [ ] Não é só wrapper (tem features nativas)
- [x] Sign in with Apple (se usa login social) — não aplicável no app nativo atual (sem botões sociais)
- [ ] Export Compliance configurado
- [ ] Age Rating correto

### Final

- [ ] Submitted for Review
- [ ] Email de confirmação recebido
- [ ] Aguardando (1-3 dias úteis)

---

## ⏱️ Timeline Real

### Primeira Implementação (Setup completo)

| Fase | Tempo | Bloqueante |
|------|-------|------------|
| 1. Setup Mac | 1h | SIM |
| 2. Atualizar projeto | 2h | SIM |
| 3. Configurar Xcode | 2h | SIM |
| 4. Assets | 1-2h | SIM |
| 5. Testes | 2h | SIM |
| 6. App Store Connect | 1h | SIM |
| 7. Build & Upload | 1h | SIM |
| 8. TestFlight | 1-2h | Não |
| 9. Submissão | 30min | SIM |
| **Total hands-on** | **10-12h** | - |
| **Apple Review** | **1-3 dias** | **SIM** |
| **Total até loja** | **3-5 dias** | - |

### Updates Futuros

| Tipo | Tempo | Review |
|------|-------|--------|
| Web-only | 0h | Não |
| Bugfix (build only) | 1h | Opcional |
| Minor (2.0→2.1) | 2h | Sim |
| Major com native features | 4-6h | Sim |

---

## 🚨 Red Flags (Rejeição Garantida)

- [ ] ❌ App é só um site (sem features nativas)
- [ ] ❌ Falta Sign in with Apple (se tem login social)
- [ ] ❌ Privacy Policy URL quebrada/vazia
- [ ] ❌ Conta demo não funciona
- [ ] ❌ App crasha ao abrir
- [ ] ❌ Sem usage descriptions no Info.plist
- [ ] ❌ Bundle ID incorreto
- [ ] ❌ Ícones faltando/quebrados
- [ ] ❌ Build com Xcode < 26 (após 28/04/2026)
- [ ] ❌ iOS deployment target < 17.4 (após 28/04/2026)

---

## 📞 Recursos de Ajuda

### Documentação

- Guia técnico completo: `docs/ios/IOS_IMPLEMENTATION_GUIDE.md`
- Apple Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Capacitor iOS: https://capacitorjs.com/docs/ios

### Ferramentas

- Xcode: Mac App Store
- TestFlight: iOS App Store (testadores)
- App Icon Generator: https://appicon.co
- Screenshot Frames: https://www.screely.com

### Suporte

- Stack Overflow: tag [ios] [capacitor]
- Capacitor Discord: https://discord.gg/UPYYRhtyzp
- Apple Developer Forums: https://developer.apple.com/forums/

---

## 📅 Deadline Apple (CRÍTICO)

### 28 de Abril de 2026

**A partir desta data, apps novos e updates DEVEM usar:**

- ✅ Xcode 26 ou superior
- ✅ iOS 18 SDK (incluído no Xcode 26)
- ✅ macOS 15.6+ (para rodar Xcode 26)
- ✅ Deployment target ≥ iOS 17.4

**Se você configurar AGORA (março 2026):**
- Configure para iOS 17.4
- Use Xcode 26 (se disponível)
- Estará preparado para a exigência de abril

**Se deixar para última hora:**
- Terá que refazer configurações
- Pode precisar atualizar macOS
- Risco de não conseguir submeter

---

## ✨ Dicas Pro

### Performance

- [ ] Testar em iPhone antigo (iOS 17.4 mínimo)
- [ ] Monitorar uso de memória no Instruments
- [ ] Verificar tamanho do app (< 200MB recomendado)

### UX

- [ ] Suportar Dark Mode (se web app suportar)
- [ ] Splash screen com logo (brand consistency)
- [ ] Status bar style matching app theme

### Marketing

- [ ] Screenshots com texto explicativo (Figma/Sketch)
- [ ] Video preview (15-30s, opcional mas recomendado)
- [ ] Localization (EN, PT, ES se aplicável)

### Monetização

- [ ] Se cobrar: usar In-App Purchase (não link externo)
- [ ] Se tiver versão free + paid: configurar corretamente
- [ ] Se tiver assinatura: testar fluxo completo no iOS

---

*Checklist criado: 15/03/2026*
*Versão: 1.0*
*Próxima revisão: após primeiro go-live*

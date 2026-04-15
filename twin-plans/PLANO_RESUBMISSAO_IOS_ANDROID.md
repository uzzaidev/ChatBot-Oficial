# Plano: ResubmissÃ£o iOS + SubmissÃ£o Android

**Data:** 10/04/2026
**Deadline Apple (Xcode 26 obrigatÃ³rio):** 28/04/2026
**UrgÃªncia:** Alta â€” iOS rejeitado, Android pendente

## Status de execucao (10/04/2026)

- [x] A1 aplicado: Info.plist com permissoes de camera/galeria/microfone
- [x] A2 aplicado: CapacitorCookies + CapacitorHttp em capacitor.config.ts
- [x] A3 aplicado: botao explicito "Voltar" em Contatos e Caixa de Entrada
- [x] A4 aplicado: @capacitor/camera instalado e sincronizado (ios + android)
- [x] Android A3 aplicado: permissao android.permission.CAMERA no AndroidManifest.xml
- [x] Android sync executado: npx cap sync android
- [x] Android build release gerado no Windows: android/app/build/outputs/bundle/release/app-release.aab
- [ ] Mac necessario: archive/upload iOS build 3 no Xcode

---

## Contexto

O app UzzApp (iOS 1.0, build 2) foi rejeitado pela Apple em 24/03/2026.
Submission ID: `bb847e34-58ce-4059-b568-ba7bf835e5bf`
Device de review: iPad Air 11-inch (M3), iPadOS 26.3.1

O Android estÃ¡ ~95% pronto mas nunca foi submetido ao Play Store.

---

## Problemas iOS â€” AnÃ¡lise da RejeiÃ§Ã£o

### [P1] Guideline 2.1(a) â€” Crash em "Base de Conhecimento"
**ReproduÃ§Ã£o Apple:**
1. Abrir app
2. Navegar para "Base de Conhecimento"
3. Tocar "Selecionar arquivo"
4. Escolher "Take Photo"
5. **App crasha**

**Causa provÃ¡vel:** Falta da permissÃ£o `NSCameraUsageDescription` no `Info.plist`,
ou o handler de cÃ¢mera nÃ£o trata o contexto de `UIImagePickerController` no iOS nativo.
Em WebView, `<input type="file" capture="camera">` depende de permissÃ£o nativa.

**Fix:**
- Adicionar `NSCameraUsageDescription` ao `Info.plist`
- Verificar se o Capacitor Camera plugin estÃ¡ instalado e configurado no Podfile
- Testar "Take Photo" no simulador iPad antes de resubmeter

---

### [P2] Guideline 2.1(a) â€” SessÃ£o nÃ£o persiste entre relanÃ§amentos
**Sintoma Apple:** "Every time we relaunched the app it requested to insert credentials"

**Causa provÃ¡vel:** O cookie/token de sessÃ£o do Supabase nÃ£o estÃ¡ sendo persistido entre
sessÃµes no WebView nativo do Capacitor. O `localStorage` do WKWebView pode ser limpo
em contexto de novo processo.

**Fix:**
- Verificar `capacitor.config.ts`: confirmar que `ios.scheme` estÃ¡ definido (afeta o
  escopo de armazenamento do WKWebView)
- Adicionar `CapacitorCookies` e `CapacitorHttp` no `capacitor.config.ts` para
  persistÃªncia nativa de cookies
- Testar: fechar app completamente (swipe up) â†’ reabrir â†’ deve estar logado

---

### [P3] Guideline 2.1(a) â€” Sem botÃ£o "Voltar" em menus internos
**Sintoma Apple:** "Contatos, Caixa de Entrada" â€” no return button or option

**Causa provÃ¡vel:** No iPad com Capacitor WebView, o gesto de swipe-back nÃ£o estÃ¡
habilitado e a interface web nÃ£o exibe botÃ£o de voltar nessas pÃ¡ginas.

**Fix (web-only, sem rebuild nativo):**
- Garantir que todas as pÃ¡ginas do app web tÃªm botÃ£o de voltar visÃ­vel no mobile
- Ou habilitar `allowsBackForwardNavigationGestures` via plugin Capacitor
- Verificar rotas: `/contatos`, `/inbox` â€” adicionar header com back button se ausente

---

### [P4] Guideline 4.2 â€” Funcionalidade mÃ­nima (wrapper de site)
**SÃ­ntese Apple:** "not sufficiently different from a web browsing experience"

**Fix:** Demonstrar/ativar features nativas jÃ¡ implementadas:
- Push Notifications (Firebase)
- Biometric Auth (Face ID / Touch ID)
- Deep Linking (`uzzapp://`)
- Camera (se corrigido)

**AÃ§Ã£o principal:** Responder no Resolution Center da Apple explicando as features
nativas, com screenshots. NÃ£o Ã© necessÃ¡rio reescrever o app â€” apenas demonstrar.

---

### [P5] Guideline 2.1(b) â€” Perguntas sobre modelo de negÃ³cio
**Apple precisa de respostas sobre conteÃºdo pago antes de concluir a review.**

**Respostas a preparar:**

1. **Quem usa o conteÃºdo pago?** â†’ Empresas (B2B) que contratam o SaaS para atendimento
   ao cliente via WhatsApp. UsuÃ¡rios finais sÃ£o colaboradores e gestores da empresa.

2. **Onde os usuÃ¡rios compram?** â†’ Fora do app, via site/contrato direto
   (https://uzzai.com.br). O app Ã© uma ferramenta de gestÃ£o, nÃ£o uma loja.

3. **Que conteÃºdo jÃ¡ comprado pode ser acessado?** â†’ Funcionalidades do plano
   contratado: nÃºmero de conversas, agentes de IA, integraÃ§Ãµes.

4. **O que Ã© desbloqueado sem In-App Purchase?** â†’ Todas as features sÃ£o baseadas em
   plano corporativo prÃ©-pago via fatura. NÃ£o hÃ¡ compras dentro do app.

5. **ServiÃ§os enterprise sÃ£o para uso individual, familiar ou consumidor?** â†’
   Enterprise B2B â€” vendidos para empresas, nÃ£o para usuÃ¡rios individuais ou famÃ­lias.

---

## Plano de AÃ§Ã£o iOS

### Fase A â€” CorreÃ§Ãµes de CÃ³digo (pode fazer no Windows)

#### A1. Info.plist â€” Adicionar permissÃµes de cÃ¢mera
**Arquivo:** `ios/App/App/Info.plist`
**Adicionar:**
```xml
<key>NSCameraUsageDescription</key>
<string>UzzApp precisa acessar a cÃ¢mera para enviar fotos na base de conhecimento.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>UzzApp precisa acessar sua galeria para selecionar arquivos.</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>UzzApp precisa salvar arquivos na sua galeria.</string>
<key>NSMicrophoneUsageDescription</key>
<string>UzzApp precisa acessar o microfone para gravaÃ§Ã£o de Ã¡udio.</string>
```

#### A2. capacitor.config.ts â€” PersistÃªncia de sessÃ£o e cookies
**Arquivo:** `capacitor.config.ts`
**Verificar/adicionar:**
```typescript
plugins: {
  CapacitorCookies: {
    enabled: true,
  },
  CapacitorHttp: {
    enabled: true,
  },
}
```

#### A3. Interface web â€” BotÃµes de voltar
**PÃ¡ginas a verificar:**
- `/contatos` (Contacts)
- `/inbox` (Caixa de Entrada)
- Todas as pÃ¡ginas acessadas via menu lateral no iPad

**AÃ§Ã£o:** Adicionar header com botÃ£o de voltar em cada pÃ¡gina que nÃ£o tem,
ou garantir que o layout mobile inclui navegaÃ§Ã£o visÃ­vel no iPad (viewport largo).

#### A4. Crash de cÃ¢mera â€” Verificar Capacitor Camera Plugin
**Verificar se `@capacitor/camera` estÃ¡ no `package.json`**
Se nÃ£o estiver:
```bash
npm install @capacitor/camera
```
**Verificar `ios/App/Podfile`** â€” deve incluir `CapacitorCamera`

---

### Fase B â€” Resposta Ã  Apple (Resolution Center)

**Onde:** App Store Connect â†’ UzzApp â†’ Messages â†’ Reply

**Template de resposta (em inglÃªs, adaptar):**

```
Hello Apple Review Team,

Thank you for the detailed feedback. We have addressed all the issues:

1. CRASH FIX (2.1a): We added NSCameraUsageDescription and fixed the camera 
   handler. The crash on "Take Photo" is resolved in build 3.

2. SESSION PERSISTENCE (2.1a): We fixed session storage using CapacitorCookies 
   to persist auth tokens between app launches.

3. NAVIGATION (2.1a): All main screens (Contatos, Caixa de Entrada) now include 
   a visible back/close button.

4. NATIVE FEATURES (4.2): UzzApp includes the following native capabilities:
   - Push Notifications via Firebase (implemented and active)
   - Biometric Authentication (Face ID / Touch ID)
   - Deep Linking (uzzapp://)
   - Camera / Photo Library access
   These are not available in a web browser.

5. BUSINESS MODEL (2.1b):
   - Users: Business owners and their teams (B2B enterprise)
   - Purchase location: Outside the app, via direct contract at uzzai.com.br
   - Content unlocked: CRM features, AI chatbot configurations, analytics
   - Payment model: B2B subscription invoice â€” no in-app purchases
   - Enterprise use: Sold to businesses, not individual consumers or families

We have uploaded build 3 with all fixes. Please let us know if you need 
anything else.

Best regards,
UzzApp Team
```

---

### Fase C â€” Build e Re-upload (Precisa de Mac)

- [ ] Incrementar `CFBundleVersion` de 2 para **3** no `Info.plist`
- [ ] `CFBundleShortVersionString` mantÃ©m **1.0**
- [ ] `npx cap sync ios`
- [ ] Xcode â†’ Product â†’ Archive â†’ Distribute â†’ App Store Connect
- [ ] Aguardar processing (~30 min)
- [ ] App Store Connect â†’ selecionar build 3 na versÃ£o 1.0
- [ ] Responder Apple no Resolution Center (Fase B)
- [ ] Submit for Review

---

## Plano de AÃ§Ã£o Android

### Status atual: ~95% pronto

**O que falta:**
- [ ] Conta Google Play Console criada e verificada ($25 â€” se ainda nÃ£o tiver)
- [ ] Screenshots (5-8, 1080x1920px)
- [ ] DescriÃ§Ã£o do app preenchida
- [ ] Testes finais em device fÃ­sico
- [ ] Upload do AAB

### Android A1 â€” Verificar AAB de release
O AAB foi gerado em 2025-11-23. Rebuildar com versÃ£o atualizada:
```bash
npm run build:mobile:prd
cd android
./gradlew bundleRelease
```
**Arquivo:** `android/app/build/outputs/bundle/release/app-release.aab`

### Android A2 â€” Atualizar versÃ£o
**Arquivo:** `android/app/build.gradle`
- `versionCode`: incrementar para **2**
- `versionName`: "**1.0.0**"

### Android A3 â€” Verificar mesmos bugs do iOS
Antes de subir ao Play Store, testar:
- [ ] Login persiste entre relanÃ§amentos
- [ ] BotÃ£o de voltar em Contatos e Caixa de Entrada
- [ ] "Base de Conhecimento" â†’ "Selecionar arquivo" â†’ cÃ¢mera nÃ£o crasha
  - `android/app/src/main/AndroidManifest.xml` deve ter permissÃ£o de cÃ¢mera
  - `<uses-permission android:name="android.permission.CAMERA" />`

### Android A4 â€” SubmissÃ£o Play Store

1. **Criar app:** Play Console â†’ Criar app â†’ UzzApp
2. **Internal testing:** Upload AAB â†’ Internal Test
3. **Testar via Internal Test Track** com 3+ testers
4. **Preencher ficha:**
   - Nome: UzzApp
   - DescriÃ§Ã£o curta: "Plataforma SaaS para gestÃ£o de atendimento via WhatsApp com IA"
   - DescriÃ§Ã£o completa: (ver `docs/app/GOOGLE_PLAY_STORE_GUIA.md`)
   - Categoria: NegÃ³cios
   - ClassificaÃ§Ã£o etÃ¡ria: preencher questionÃ¡rio
5. **Privacy Policy:** `https://uzzapp.uzzai.com.br/privacy`
6. **Screenshots:** 5-8 imagens (capturar do device ou emulador)
7. **Publicar no canal Production**

---

## Checklist Consolidado

### iOS â€” ResubmissÃ£o

- [ ] **A1** `Info.plist`: adicionar NSCameraUsageDescription e demais usage descriptions
- [ ] **A2** `capacitor.config.ts`: ativar CapacitorCookies e CapacitorHttp
- [ ] **A3** Interface web: botÃµes de voltar em Contatos e Caixa de Entrada (iPad)
- [ ] **A4** Verificar `@capacitor/camera` instalado e no Podfile
- [ ] **C1** Incrementar CFBundleVersion â†’ 3
- [ ] **C2** `npx cap sync ios` no Mac
- [ ] **C3** Archive â†’ Upload â†’ build 3 disponÃ­vel no App Store Connect
- [ ] **B1** Responder Apple no Resolution Center com business model + confirmaÃ§Ã£o dos fixes
- [ ] **C4** Selecionar build 3 na versÃ£o 1.0 e resubmeter

### Android â€” SubmissÃ£o inicial

- [ ] Verificar/criar conta Play Console
- [ ] Corrigir permissÃ£o de cÃ¢mera no AndroidManifest.xml
- [ ] Testar sessÃ£o persistente entre relanÃ§amentos
- [ ] Testar botÃµes de voltar (mesmos bugs do iOS)
- [ ] Rebuildar AAB com versionCode 2
- [ ] Upload para Internal Testing
- [ ] Testar com testers internos
- [ ] Preencher ficha completa
- [ ] Submeter para Production

---

## Ordem Recomendada de ExecuÃ§Ã£o

| Ordem | Tarefa | Onde | UrgÃªncia |
|-------|--------|------|----------|
| 1 | Responder Apple (business model) | Browser | Hoje |
| 2 | A1: Info.plist cÃ¢mera | Windows/VSCode | Hoje |
| 3 | A2: capacitor.config.ts | Windows/VSCode | Hoje |
| 4 | A3: BotÃµes de voltar na web | Windows/VSCode | Hoje |
| 5 | A4: Verificar @capacitor/camera | Windows/bash | Hoje |
| 6 | Android: AndroidManifest cÃ¢mera | Windows/VSCode | Hoje |
| 7 | Android: Testar session persist | Device/Emulador | Esta semana |
| 8 | Mac: cap sync + Archive + Upload | Mac | Esta semana |
| 9 | iOS: Selecionar build 3 + resubmit | Browser | Esta semana |
| 10 | Android: Rebuildar AAB + Play Store | Mac/Windows | Esta semana |

---

## ReferÃªncias

- RejeiÃ§Ã£o original: App Store Connect â†’ UzzApp â†’ Messages (24/03/2026)
- Checklist iOS existente: `docs/ios/IOS_CHECKLIST.md`
- Checklist Android existente: `docs/app/PLAY_STORE_CHECKLIST.md`
- Info.plist: `ios/App/App/Info.plist`
- capacitor.config: `capacitor.config.ts`
- Podfile: `ios/App/Podfile`
- AndroidManifest: `android/app/src/main/AndroidManifest.xml`



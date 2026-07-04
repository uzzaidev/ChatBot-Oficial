# Guia Universal: Criar App iOS + Android a partir de um Web App

> **Propósito deste documento**
> Este é um **guia reutilizável e agnóstico** para transformar **qualquer** aplicação web (Next.js, React, Vue, etc.) em apps nativos para **Apple App Store** e **Google Play Store** usando **Capacitor**.
>
> Foi extraído da implementação real do **UzzApp** (WhatsApp SaaS Chatbot), que já está em produção. Use a implementação do UzzApp como **referência concreta** e os placeholders (`com.suaempresa.seuapp`, etc.) como pontos de customização.
>
> **Para agentes/desenvolvedores:** leia este README inteiro primeiro. Ele explica a estratégia arquitetural — a decisão mais importante de todas. Depois siga os documentos numerados na ordem.

---

## Índice de Documentos

| # | Documento | Quando usar |
|---|-----------|-------------|
| 📖 | **[README.md](./README.md)** (este) | Sempre primeiro — estratégia e visão geral |
| 1 | **[01-CAPACITOR-SETUP.md](./01-CAPACITOR-SETUP.md)** | Do zero até ter projetos `android/` e `ios/` gerados |
| 2 | **[02-ANDROID-PLAYSTORE.md](./02-ANDROID-PLAYSTORE.md)** | Build de release, keystore, AAB e publicação na Play Store |
| 3 | **[03-IOS-APPSTORE.md](./03-IOS-APPSTORE.md)** | Xcode, certificados, IPA e publicação na App Store (requer macOS) |
| 4 | **[04-NATIVE-FEATURES.md](./04-NATIVE-FEATURES.md)** | Push, biometria, deep linking, splash/status bar (código reutilizável) |
| 5 | **[05-LAUNCH-CHECKLISTS.md](./05-LAUNCH-CHECKLISTS.md)** | Checklists e assets obrigatórios antes de submeter |

---

## 1. A decisão arquitetural mais importante

Capacitor empacota um **WebView nativo** que carrega o seu app web. Existem **duas estratégias** de como o WebView obtém o conteúdo, e você precisa escolher **antes de qualquer coisa**:

### Estratégia A — Bundle estático (offline-first / "padrão Capacitor")

O build do web app é **exportado como arquivos estáticos** (HTML/JS/CSS) e **embutido dentro do binário** do app. O WebView carrega esses arquivos do disco local.

```
capacitor.config.ts → webDir: 'out'   (sem server.url)
```

- ✅ Funciona offline
- ✅ Aprovação mais previsível nas lojas (conteúdo está no binário)
- ❌ Cada mudança de conteúdo exige **novo build + nova submissão à loja**
- ❌ Exige que o framework suporte **static export** (ex.: `output: 'export'` no Next.js)

### Estratégia B — Remote URL (hybrid / "live web app") ← **a usada pelo UzzApp**

O WebView aponta para a **URL de produção do site** já hospedado. O app é essencialmente um wrapper nativo em volta do site ao vivo.

```ts
// capacitor.config.ts
server: {
  url: 'https://app.suaempresa.com',
  cleartext: false,
}
```

- ✅ Atualizações de conteúdo são **instantâneas** (deploy do site = app atualizado, sem re-submissão)
- ✅ Não exige static export — funciona com SSR, API routes, etc.
- ✅ Os plugins nativos (push, biometria, câmera) **ainda funcionam** dentro do WebView
- ⚠️ Exige **conexão de internet** para abrir (sem offline real)
- ⚠️ As lojas (especialmente a Apple) podem **rejeitar** apps que são "apenas um site empacotado" sem valor nativo agregado. **Mitigação:** adicionar features nativas reais (push notifications, biometria, deep linking, câmera) — exatamente o que o UzzApp faz.

> **Regra prática:** Se seu produto é um SaaS que muda toda semana e você não quer re-submeter à loja a cada deploy → **Estratégia B**. Se precisa funcionar offline ou é um app de conteúdo fechado → **Estratégia A**.
>
> O UzzApp mantém **as duas configuradas ao mesmo tempo**: `webDir: 'out'` (bundle de fallback) **e** `server.url` (carrega o site ao vivo). Na prática o `server.url` vence — o bundle existe como rede de segurança e para satisfazer o requisito do Capacitor.

---

## 2. Stack de referência (UzzApp)

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Web framework | Next.js (App Router) | 16 |
| Runtime nativo | Capacitor Core | 7.4.4 |
| CLI | `@capacitor/cli` | 8.0.1 |
| Android | `@capacitor/android` | 7.4.4 |
| iOS | `@capacitor/ios` | 7.4.4 |
| Push | `@capacitor/push-notifications` + Firebase FCM / APNs | 7.0.3 |
| Biometria | `@aparajita/capacitor-biometric-auth` | 9.1.2 |
| Câmera | `@capacitor/camera` | 7.0.5 |
| Rede | `@capacitor/network` | 7.0.2 |
| App lifecycle / deep links | `@capacitor/app` | 7.1.0 |
| Status bar | `@capacitor/status-bar` | 7.0.5 |
| Assets (ícones/splash) | `@capacitor/assets` (devDep) | 3.0.5 |

**Identidade do app de referência:**
- App ID (bundle): `com.uzzai.uzzapp`
- Nome: `UzzApp`
- Android: `minSdk 23`, `compile/target SDK 35`
- iOS: deployment target `17.4`

---

## 3. Inventário de arquivos — o que é necessário para criar os apps

Esta é a resposta direta à pergunta "quais arquivos são necessários". Divididos por origem.

### 3.1. Arquivos que **você** cria/edita (versionados no git)

| Arquivo | Plataforma | Papel |
|---------|-----------|-------|
| `capacitor.config.ts` | Ambas | **Coração da config**: appId, appName, webDir, server.url, plugins |
| `package.json` (scripts + deps) | Ambas | Dependências Capacitor e scripts de build |
| `next.config.js` (ou equivalente) | Ambas | Habilita static export quando `CAPACITOR_BUILD=true` |

### 3.2. Projeto nativo **Android** (`android/`)

| Arquivo | Papel |
|---------|-------|
| `android/app/build.gradle` | applicationId, versionCode/versionName, signing configs, deps (Firebase) |
| `android/variables.gradle` | minSdk/compileSdk/targetSdk e versões de libs |
| `android/app/src/main/AndroidManifest.xml` | Permissões, deep links (intent-filters), FileProvider |
| `android/app/src/main/res/values/strings.xml` | Nome do app, package, custom URL scheme |
| `android/app/google-services.json` | Config do Firebase (push notifications) — **não commitar publicamente** |
| `android/release.properties` | Caminho/senha do keystore — **NUNCA commitar** (.gitignore) |
| `android/app/release.keystore` | Chave de assinatura — **NUNCA commitar, backup eterno** |
| `android/app/src/main/res/mipmap-*/` | Ícones do launcher (gerados pelo `@capacitor/assets`) |

### 3.3. Projeto nativo **iOS** (`ios/`)  — requer **macOS + Xcode**

| Arquivo | Papel |
|---------|-------|
| `ios/App/App/Info.plist` | Display name, URL schemes, ATS, **descrições de uso de permissões** (obrigatório pela Apple) |
| `ios/App/Podfile` | Plataforma mínima (iOS 17.4), pods dos plugins Capacitor |
| `ios/App/App.xcodeproj/project.pbxproj` | Bundle ID, MARKETING_VERSION, build number, **DEVELOPMENT_TEAM**, signing |
| `ios/App/App/Assets.xcassets/AppIcon.appiconset/` | Ícones (gerados pelo `@capacitor/assets`) |
| `ios/App/App/Assets.xcassets/Splash.imageset/` | Splash screen |
| `GoogleService-Info.plist` (se usar Firebase no iOS) | Config Firebase iOS |

### 3.4. Gerados automaticamente (não editar à mão)

- `android/app/src/main/assets/public/` — cópia do build web (`npx cap sync`)
- `ios/App/App/public/` — idem para iOS
- `android/app/src/main/assets/capacitor.config.json` e `capacitor.plugins.json`
- `ios/App/Podfile.lock`

---

## 4. Pipeline de build (visão geral)

```bash
# 1. Build do web app em modo export estático
CAPACITOR_BUILD=true next build        # gera a pasta out/

# 2. Copiar build + atualizar plugins nativos
npx cap sync                            # out/ → android/ e ios/, atualiza pods/gradle

# 3. Abrir IDE nativa para buildar o binário
npx cap open android                    # Android Studio → AAB/APK
npx cap open ios                        # Xcode (somente macOS) → IPA
```

> No UzzApp esses passos estão nos scripts `build:mobile`, `cap:sync`, `cap:open:android`, `cap:open:ios` do `package.json`. Veja **[01-CAPACITOR-SETUP.md](./01-CAPACITOR-SETUP.md)** para o detalhe de cada um.
>
> ⚠️ **Nota da implementação atual:** alguns scripts referenciados no `package.json` (ex.: `scripts/build-mobile.js`, `scripts/ios-*.mjs`) **não existem mais** no repositório. O comando equivalente garantido é `cross-env CAPACITOR_BUILD=true next build`. Trate os scripts ausentes como atalhos opcionais, não como dependências.

---

## 5. Pré-requisitos por plataforma

| | Android | iOS |
|---|---------|-----|
| **SO de build** | Windows, macOS ou Linux | **Apenas macOS** |
| **IDE** | Android Studio | Xcode |
| **Conta de loja** | Google Play Console — **US$ 25** (taxa única) | Apple Developer Program — **US$ 99/ano** |
| **Assinatura** | Keystore (você gera e guarda para sempre) | Certificados + Provisioning Profiles (gerenciados pela Apple/Xcode) |
| **Identidade jurídica** | Individual ou Organização (Organização pode exigir D-U-N-S) | Individual ou Organização (Organização **exige D-U-N-S**) |
| **Push backend** | Firebase Cloud Messaging (FCM) | Apple Push Notification service (APNs) |

---

## 6. Ordem recomendada de execução

```
1. Decidir Estratégia A ou B (seção 1)           ← bloqueia tudo
2. 01-CAPACITOR-SETUP.md  → projetos nativos prontos
3. 04-NATIVE-FEATURES.md  → adicionar push/biometria/deep link (valor nativo)
4. 02-ANDROID-PLAYSTORE.md → primeiro release (mais rápido/barato de testar)
5. 03-IOS-APPSTORE.md      → release iOS (precisa de Mac + conta paga)
6. 05-LAUNCH-CHECKLISTS.md → revisão final antes de submeter
```

> **Dica:** comece pela Play Store. É mais barata, o ciclo de revisão é mais rápido e não exige macOS — ideal para validar todo o pipeline antes de encarar a complexidade do iOS.

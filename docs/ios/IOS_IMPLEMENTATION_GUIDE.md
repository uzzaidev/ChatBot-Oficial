# iOS Implementation Guide - UzzApp (Capacitor)

> **Data:** 15/03/2026
> **Projeto:** ChatBot-Oficial (UzzApp)
> **Stack:** Next.js 14 + Capacitor CLI 8.0.1 / Core 7.4.4 + iOS 17.4+
> **Deadline Crítico:** 28/04/2026 (Xcode 26 obrigatório)
> **Status Atual:** Configuração iOS concluída no Windows — aguardando Mac para build

---

## 🪟 O Que Pode Ser Feito no Windows (Sem Mac)

> Estas etapas foram concluídas. Não é necessário refazer no Mac.

### Arquivos Editados no Windows ✅

| Arquivo | O que foi alterado |
|---------|-------------------|
| `capacitor.config.ts` | Adicionados blocos `ios` (scheme) e `plugins` (SplashScreen, Push, StatusBar) |
| `ios/App/Podfile` | `platform :ios, '14.0'` → `'17.4'`; post_install com Swift 5 |
| `ios/App/App/Info.plist` | Display name UzzApp, arm64, NSFaceIDUsageDescription, CFBundleURLTypes, NSAppTransportSecurity |

### O Que Ainda Falta Fazer no Windows

- [x] Criar `resources/icon.png` (1024x1024, sem transparência)
- [x] Criar `resources/splash.png` (2732x2732)
- [x] Preparar texto de App Store em `docs/ios/APP_STORE_CONNECT_COPY.md`
- [x] Criar Support URL em `https://uzzapp.uzzai.com.br/support` (rota adicionada no app; falta deploy para ficar pública)
- [ ] Criar app record no App Store Connect (via browser)
- [x] Criar Privacy Policy em `https://uzzapp.uzzai.com.br/privacy` (rota criada no app)
- [x] Criar conta demo `demo@uzzai.com.br` com dados de exemplo
- [ ] Testar UX mobile em `https://uzzapp.uzzai.com.br` (Chrome DevTools mobile)

### O Que É Bloqueado (Precisa de Mac)

- `npx cap sync ios` (executa `pod install` no final)
- `pod install`
- Abrir Xcode (`App.xcworkspace`)
- Signing & Capabilities
- Build no simulador / device
- Archive e upload para App Store Connect
- TestFlight e submissão

---

## 📋 Sumário Executivo

### O Que Você Tem Agora

✅ **Android funcional:** versionCode 8, versionName 2.0.0-internal.8
✅ **Estrutura iOS criada:** `ios/App/` com Xcode project
✅ **Capacitor configurado:** CLI 8.0.1, Core 7.4.4, appId `com.uzzai.uzzapp`
✅ **5 plugins instalados** (caminhos pnpm no Podfile)
✅ **capacitor.config.ts** com bloco `ios` e `plugins`
✅ **Podfile** com plataforma 17.4 e Swift 5
✅ **Info.plist** com NSFaceIDUsageDescription, CFBundleURLTypes, NSAppTransportSecurity

### O Que Ainda Está Faltando (Bloqueante — Precisa de Mac)

⚠️ **Assets iOS ainda exigem validação final no Mac/Xcode:** arquivos base já preparados no Windows
⚠️ **Bundle ID não confirmado no Xcode** (precisa validar em General → Identity)
⚠️ **Signing & Provisioning:** não configurado
⚠️ **App Store Connect:** app record não criado (pode ser feito no Windows via browser)

### Tempo Estimado até App Store

**Setup completo:** 6-8 horas (primeira vez)
**Testes + ajustes:** 4-6 horas
**Revisão Apple:** 24-48h (se aprovado na primeira)

**Total:** ~3-5 dias até disponível na loja

---

## ⚠️ Requisitos Críticos (28/04/2026)

**A partir de 28 de abril de 2026, a Apple exigirá:**

- ✅ Xcode 26 ou superior
- ✅ iOS 18 SDK (incluído no Xcode 26)
- ✅ macOS 15.6 ou superior (para rodar Xcode 26)
- ✅ Deployment target mínimo: iOS 17.4

**Preparação recomendada:**
- Se você configurar AGORA (março 2026), já configure para iOS 17.4+
- Isso te deixa preparado para a exigência de abril sem refazer

---

## 📐 Arquitetura do Projeto

### Como Funciona o Capacitor

```
┌─────────────────────────────────────────────────┐
│  Next.js App (Web)                              │
│  - Roda em https://uzzapp.uzzai.com.br         │
│  - Build estático: npm run build → out/        │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Capacitor (Bridge)                             │
│  - Encapsula web app em container nativo       │
│  - Fornece APIs nativas (push, biometric, etc) │
│  - capacitor.config.ts                          │
└─────────────────────────────────────────────────┘
         ↙                              ↘
┌──────────────────────┐      ┌──────────────────────┐
│  Android Native      │      │  iOS Native          │
│  - Java/Kotlin       │      │  - Swift/Obj-C       │
│  - android/          │      │  - ios/              │
│  - ✅ Funcional      │      │  - ⚠️ Incompleto     │
└──────────────────────┘      └──────────────────────┘
```

**Modelo de deployment atual:**
- `server.url: 'https://uzzapp.uzzai.com.br'`
- **Sem build local** - app carrega web de produção
- **Vantagem:** atualizações sem rebuild
- **Desvantagem:** Apple pode questionar se é "app de verdade"

### Plugins Capacitor Instalados

| Plugin | Versão | Android | iOS | Precisa Configurar iOS |
|--------|--------|---------|-----|------------------------|
| @capacitor/app | 7.1.0 | ✅ | ⚠️ | Sim (deep links) |
| @capacitor/network | 7.0.2 | ✅ | ⚠️ | Sim (Podfile) |
| @capacitor/push-notifications | 7.0.3 | ✅ | ⚠️ | Sim (capabilities + Podfile) |
| @capacitor/status-bar | 7.0.5 | ✅ | ⚠️ | Sim (Podfile) |
| @aparajita/capacitor-biometric-auth | 9.1.2 | ✅ | ⚠️ | Sim (FaceID permission) |

---

## 🛠️ Fase 1: Setup do Mac (1 hora)

### Passo 1.1: Verificar Sistema

```bash
# 1. Verificar versão do macOS
sw_vers
# Precisa: macOS 15.6+ (para Xcode 26)

# 2. Verificar espaço em disco
df -h
# Precisa: mínimo 50GB livres (Xcode é pesado)

# 3. Verificar se Xcode já está instalado
xcodebuild -version
# Se não estiver: continua para Passo 1.2
# Se estiver: verificar se é versão 26+
```

### Passo 1.2: Instalar Xcode 26

1. **Abrir Mac App Store**
2. **Buscar:** "Xcode"
3. **Clicar:** Obter/Instalar (download ~15GB, demora 1-2h)
4. **Aguardar instalação completa**

5. **Primeira abertura:**
```bash
# Abrir Xcode pela primeira vez
open -a Xcode

# Aceitar licença
sudo xcodebuild -license accept

# Instalar componentes adicionais
# (Xcode vai pedir - clicar "Install")
```

6. **Instalar Command Line Tools:**
```bash
xcode-select --install
# Clicar "Install" na janela que abrir
```

### Passo 1.3: Configurar Conta Apple no Xcode

1. **Xcode → Settings (⌘,)**
2. **Aba "Accounts"**
3. **Clicar "+" → Add Apple ID**
4. **Login com sua conta Apple Developer**
5. **Verificar:** Team deve aparecer

### Passo 1.4: Instalar CocoaPods

```bash
# 1. Verificar se Ruby está instalado (vem no macOS)
ruby -v

# 2. Instalar CocoaPods
sudo gem install cocoapods

# 3. Verificar instalação
pod --version
# Esperado: 1.15.x ou superior
```

---

## 🔧 Fase 2: Atualizar Projeto iOS Local (2 horas)

### Passo 2.1: Atualizar capacitor.config.ts

> ✅ **Já feito no Windows.** Estado atual do arquivo:

**Arquivo:** `capacitor.config.ts`

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.uzzai.uzzapp',
  appName: 'UzzApp',
  webDir: 'out',
  server: {
    url: 'https://uzzapp.uzzai.com.br',
    cleartext: false,
  },

  ios: {
    // Deployment target (17.4+) é configurado no Podfile e Xcode
    scheme: 'UzzApp',
    contentInset: 'automatic',
    // webContentsDebuggingEnabled: true, // Descomentar apenas em dev
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#000000',
    },
  },
};

export default config;
```

**Nota:** `minVersion` não existe no tipo `CapacitorConfig`. O deployment target iOS é definido no Podfile (`platform :ios, '17.4'`) e confirmado em Xcode (Build Settings → iOS Deployment Target).

### Passo 2.2: Atualizar Podfile

> ✅ **Já feito no Windows.** Estado atual do arquivo:

**Arquivo:** `ios/App/Podfile`

> ⚠️ **Importante:** Este projeto usa **pnpm**. Os paths dos pods apontam para `node_modules/.pnpm/...` — **não alterar** para paths simples de npm, isso quebraria a resolução dos pacotes.

```ruby
require_relative '../../node_modules/.pnpm/@capacitor+ios@7.4.4_@capacitor+core@7.4.4/node_modules/@capacitor/ios/scripts/pods_helpers'

platform :ios, '17.4'
use_frameworks!

install! 'cocoapods', :disable_input_output_paths => true

def capacitor_pods
  pod 'Capacitor', :path => '../../node_modules/.pnpm/@capacitor+ios@7.4.4_@capacitor+core@7.4.4/node_modules/@capacitor/ios'
  pod 'CapacitorCordova', :path => '../../node_modules/.pnpm/@capacitor+ios@7.4.4_@capacitor+core@7.4.4/node_modules/@capacitor/ios'
  pod 'AparajitaCapacitorBiometricAuth', :path => '../../node_modules/.pnpm/@aparajita+capacitor-biometric-auth@9.1.2/node_modules/@aparajita/capacitor-biometric-auth'
  pod 'CapacitorApp', :path => '../../node_modules/.pnpm/@capacitor+app@7.1.0_@capacitor+core@7.4.4/node_modules/@capacitor/app'
  pod 'CapacitorNetwork', :path => '../../node_modules/.pnpm/@capacitor+network@7.0.2_@capacitor+core@7.4.4/node_modules/@capacitor/network'
  pod 'CapacitorPushNotifications', :path => '../../node_modules/.pnpm/@capacitor+push-notifications@7.0.3_@capacitor+core@7.4.4/node_modules/@capacitor/push-notifications'
  pod 'CapacitorStatusBar', :path => '../../node_modules/.pnpm/@capacitor+status-bar@7.0.5_@capacitor+core@7.4.4/node_modules/@capacitor/status-bar'
end

target 'App' do
  capacitor_pods
end

post_install do |installer|
  assertDeploymentTarget(installer)

  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['SWIFT_VERSION'] = '5.0'
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '17.4'
    end
  end
end
```

### Passo 2.3: Atualizar Info.plist

> ✅ **Já feito no Windows.** As chaves críticas foram adicionadas.
> `CFBundleShortVersionString` e `CFBundleVersion` usam variáveis Xcode (`$(MARKETING_VERSION)` / `$(CURRENT_PROJECT_VERSION)`) — confirmar valores em **Xcode → General → Identity** quando tiver Mac.

**Arquivo:** `ios/App/App/Info.plist` — estado atual:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<!-- Bundle Configuration -->
	<key>CFBundleDevelopmentRegion</key>
	<string>en</string>
	<key>CFBundleDisplayName</key>
	<string>UzzApp</string>
	<key>CFBundleExecutable</key>
	<string>$(EXECUTABLE_NAME)</string>
	<key>CFBundleIdentifier</key>
	<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>$(PRODUCT_NAME)</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
	<key>CFBundleShortVersionString</key>
	<string>$(MARKETING_VERSION)</string>
	<key>CFBundleVersion</key>
	<string>$(CURRENT_PROJECT_VERSION)</string>
	<!-- Versão e build são gerenciados pelo Xcode (General → Identity), não hardcoded aqui -->

	<!-- iOS Requirements -->
	<key>LSRequiresIPhoneOS</key>
	<true/>
	<key>UIRequiredDeviceCapabilities</key>
	<array>
		<string>arm64</string>
	</array>

	<!-- Launch & UI -->
	<key>UILaunchStoryboardName</key>
	<string>LaunchScreen</string>
	<key>UIMainStoryboardFile</key>
	<string>Main</string>

	<!-- Orientations -->
	<key>UISupportedInterfaceOrientations</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
		<string>UIInterfaceOrientationLandscapeLeft</string>
		<string>UIInterfaceOrientationLandscapeRight</string>
	</array>
	<key>UISupportedInterfaceOrientations~ipad</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
		<string>UIInterfaceOrientationPortraitUpsideDown</string>
		<string>UIInterfaceOrientationLandscapeLeft</string>
		<string>UIInterfaceOrientationLandscapeRight</string>
	</array>

	<!-- Status Bar -->
	<key>UIViewControllerBasedStatusBarAppearance</key>
	<true/>
	<key>UIStatusBarStyle</key>
	<string>UIStatusBarStyleLightContent</string>

	<!-- ============================================ -->
	<!-- PERMISSIONS (Usage Descriptions)            -->
	<!-- CRÍTICO: Apple rejeita sem essas strings    -->
	<!-- ============================================ -->

	<!-- Face ID / Touch ID (Biometric Auth) -->
	<key>NSFaceIDUsageDescription</key>
	<string>UzzApp usa Face ID para autenticação segura e rápida.</string>

	<!-- Push Notifications (já configurado via Capabilities) -->
	<!-- Não precisa de NSUserNotificationsUsageDescription -->

	<!-- Rede (Network plugin) -->
	<!-- iOS não exige permission para network monitoring -->

	<!-- Deep Links / Universal Links -->
	<key>CFBundleURLTypes</key>
	<array>
		<dict>
			<key>CFBundleURLName</key>
			<string>com.uzzai.uzzapp</string>
			<key>CFBundleURLSchemes</key>
			<array>
				<string>uzzapp</string>
			</array>
		</dict>
	</array>

	<!-- App Transport Security -->
	<key>NSAppTransportSecurity</key>
	<dict>
		<!-- Permitir HTTPS para domínio específico -->
		<key>NSExceptionDomains</key>
		<dict>
			<key>uzzai.com.br</key>
			<dict>
				<key>NSIncludesSubdomains</key>
				<true/>
				<key>NSTemporaryExceptionAllowsInsecureHTTPLoads</key>
				<false/>
			</dict>
		</dict>
	</dict>

	<!-- Background Modes (se usar push) -->
	<key>UIBackgroundModes</key>
	<array>
		<string>remote-notification</string>
	</array>
</dict>
</plist>
```

**Notas importantes:**
- `CFBundleShortVersionString`: versão visível (2.0.0 = mesmo do Android)
- `CFBundleVersion`: build number (8 = mesmo do Android)
- `NSFaceIDUsageDescription`: **obrigatório** para biometric-auth
- `CFBundleURLSchemes`: deep links (ex: `uzzapp://open`)

### Passo 2.4: Sincronizar Capacitor

```bash
# No diretório raiz do projeto
cd /caminho/para/ChatBot-Oficial

# 1. Limpar instalações antigas
rm -rf ios/App/Pods
rm -rf ios/App/Podfile.lock

# 2. Sincronizar Capacitor (copia web app + atualiza config)
npx cap sync ios

# 3. Instalar CocoaPods
cd ios/App
pod install
cd ../..

# 4. Verificar se funcionou
ls ios/App/Pods
# Deve listar: Capacitor, CapacitorApp, CapacitorNetwork, etc.
```

**Erros comuns:**
- `Unable to find a specification for Capacitor`: rodar `pod repo update`
- `[!] CocoaPods could not find compatible versions`: atualizar CocoaPods
- `incompatible minimum version`: verificar Podfile (iOS 17.4)

---

## 🍎 Fase 3: Configurar Xcode Project (2 horas)

### Passo 3.1: Abrir Projeto no Xcode

```bash
# Abrir workspace (NÃO o .xcodeproj!)
open ios/App/App.xcworkspace
```

**⚠️ IMPORTANTE:** Sempre abrir `App.xcworkspace`, nunca `App.xcodeproj`!
O workspace inclui os Pods.

### Passo 3.2: Configurar Bundle ID & Signing

1. **No Xcode, clicar no projeto "App" (topo da sidebar)**
2. **Selecionar target "App"**
3. **Aba "Signing & Capabilities"**

#### 3.2.1: Automatic Signing (Recomendado)

```
☑ Automatically manage signing
Team: Selecionar seu time (Apple Developer account)
Bundle Identifier: com.uzzai.uzzapp
```

**Xcode vai:**
- Criar provisioning profile automaticamente
- Registrar App ID se não existir
- Baixar certificados

#### 3.2.2: Manual Signing (Avançado)

Se automatic falhar:

1. **Portal Apple:** https://developer.apple.com/account
2. **Criar App ID:**
   - Identifiers → App IDs → Create
   - Description: UzzApp
   - Bundle ID: `com.uzzai.uzzapp` (Explicit)
   - Capabilities: Push Notifications (se usar)

3. **Criar Provisioning Profile:**
   - Profiles → Create
   - Tipo: App Store
   - App ID: com.uzzai.uzzapp
   - Certificado: Escolher seu Distribution Certificate
   - Baixar `.mobileprovision`

4. **No Xcode:**
   - ☐ Desmarcar "Automatically manage signing"
   - Provisioning Profile: Importar manualmente

### Passo 3.3: Configurar Capabilities

**Ainda em "Signing & Capabilities", clicar "+ Capability":**

#### Capability 1: Push Notifications

```
+ Capability → Push Notifications
```

Isso adiciona automaticamente:
- `aps-environment` no entitlement
- Push capability no App ID

#### Capability 2: Associated Domains (Deep Links)

```
+ Capability → Associated Domains
Domains:
  applinks:uzzai.com.br
  applinks:uzzapp.uzzai.com.br
```

**Nota:** Universal Links requerem arquivo `.well-known/apple-app-site-association` no servidor.

### Passo 3.4: Configurar Build Settings

1. **No Xcode, clicar no projeto "App"**
2. **Aba "Build Settings"**
3. **Buscar:** "Deployment Target"
4. **iOS Deployment Target:** 17.4

5. **Buscar:** "Swift Language Version"
6. **Swift Language Version:** Swift 5

7. **Buscar:** "Code Signing"
8. **Code Signing Identity (Release):** Apple Distribution
9. **Code Signing Style:** Automatic

### Passo 3.5: Configurar Versão

1. **Aba "General"**
2. **Identity:**
   - Display Name: `UzzApp`
   - Bundle Identifier: `com.uzzai.uzzapp`
   - Version: `2.0.0` (mesma do Android)
   - Build: `8` (mesmo do Android)

3. **Deployment Info:**
   - iPhone
   - iPad (se quiser suportar)
   - iOS 17.4 (ou superior)
   - Orientations: Portrait, Landscape Left, Landscape Right

---

## 🎨 Fase 4: Assets & Recursos (1-2 horas)

### Passo 4.1: Gerar Ícones e Splash Screens

#### Opção A: Capacitor Assets (Recomendado)

```bash
# 1. Criar arquivo de recursos
# Criar: resources/ na raiz do projeto
mkdir -p resources

# 2. Adicionar:
# - resources/icon.png (1024x1024, sem transparência)
# - resources/splash.png (2732x2732, pode ter transparência)

# 3. Gerar assets
npx capacitor-assets generate --iconBackgroundColor '#ffffff' --ios
```

> Observacao: no ambiente atual Windows com Node 24, a geracao automatica falhou por dependencia nativa do `sharp`.
> Se ocorrer novamente, execute com Node LTS 20/22 (preferencialmente no Mac do fluxo iOS) ou use a opcao manual no Xcode.

**Onde encontrar os assets:**
- Ícone Android: pode reaproveitar `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png`
- Redimensionar para 1024x1024 (Figma, Photoshop, online)

#### Opção B: Manual (Xcode)

1. **No Xcode:**
   - Abrir `ios/App/App/Assets.xcassets`
   - Clicar em `AppIcon`
   - Arrastar imagens (vários tamanhos)

**Tamanhos necessários (iOS 18):**
- 1024x1024 (App Store)
- 180x180, 120x120, 87x87, 80x80, 60x60, 58x58, 40x40, 29x29, 20x20

2. **Splash Screen:**
   - Clicar em `Splash` (ou criar novo Image Set)
   - Arrastar imagens @1x, @2x, @3x

### Passo 4.2: Configurar Launch Screen

**Arquivo:** `ios/App/App/Base.lproj/LaunchScreen.storyboard`

Se quiser personalizar:
1. Abrir no Xcode
2. Adicionar logo/texto
3. Configurar constraints (Auto Layout)

**Dica:** Para simplicidade, manter padrão branco ou usar Splash asset.

---

## 🧪 Fase 5: Testes Locais (2 horas)

### Passo 5.1: Rodar no Simulador

1. **No Xcode:**
   - Selecionar simulador: `iPhone 15 Pro` (ou qualquer iOS 17.4+)
   - Clicar "Play" (⌘R)

2. **Aguardar build e launch**

3. **Validar:**
   - App abre
   - Carrega web app de `https://uzzapp.uzzai.com.br`
   - Navegação funciona
   - Push notifications (pedir permissão)
   - Biometria (se tiver Face ID configurado no simulador)

**Erros comuns:**
- **Build Failed:** verificar Podfile, Bundle ID, Signing
- **App crashes ao abrir:** verificar logs no Xcode (Console)
- **Web não carrega:** verificar `capacitor.config.ts` (server.url)

### Passo 5.2: Rodar em iPhone Real

**Por quê é obrigatório:**
- Push notifications reais (simulador não recebe)
- Biometria real (Face ID/Touch ID)
- Performance real
- Testar deep links reais

**Como fazer:**

1. **Conectar iPhone no Mac via cabo**
2. **No Xcode:**
   - Selecionar seu iPhone (em vez do simulador)
   - Clicar "Play"

3. **Primeira vez:**
   - iPhone vai pedir "Confiar neste computador"
   - Aceitar

4. **Erro "Untrusted Developer":**
   - iPhone → Settings → General → VPN & Device Management
   - Clicar no seu perfil de desenvolvedor
   - Clicar "Trust"

5. **App deve instalar e rodar**

### Passo 5.3: Testar Funcionalidades Críticas

**Checklist de testes:**

- [ ] App abre sem crashes
- [ ] Login funciona (web app carrega)
- [ ] Navegação entre páginas
- [ ] Push notification (pedir permissão → enviar teste)
- [ ] Biometria (Face ID/Touch ID)
- [ ] Network status (desligar WiFi → verificar)
- [ ] Deep links (`uzzapp://...`)
- [ ] Orientação (portrait/landscape)
- [ ] Background → Foreground (app retoma)

**Como testar push (local):**

Precisa de backend configurado para enviar push. Se ainda não tiver:
- Usar Firebase Console ou OneSignal para teste
- Verificar se token é gerado e enviado ao backend

---

## 🏪 Fase 6: App Store Connect (1 hora)

### Passo 6.1: Criar App Record

1. **Acessar:** https://appstoreconnect.apple.com
2. **Login** com Apple Developer account
3. **My Apps → "+" → New App**

4. **Preencher:**
   - **Platforms:** iOS
   - **Name:** UzzApp
   - **Primary Language:** Portuguese (Brazil)
   - **Bundle ID:** com.uzzai.uzzapp
   - **SKU:** uzzapp-ios (qualquer string única)
   - **User Access:** Full Access

5. **Clicar "Create"**

### Passo 6.2: Preencher Metadados

#### App Information

- **Name:** UzzApp
- **Subtitle:** (opcional, 30 caracteres)
- **Category:**
  - Primary: Business (ou adequado ao seu app)
  - Secondary: (opcional)

#### Pricing & Availability

- **Price:** Free (ou selecionar tier)
- **Availability:** All countries (ou selecionar)

#### App Privacy

**CRÍTICO - Apple rejeita sem isso:**

1. **Privacy Policy URL:**
   ```
   https://uzzapp.uzzai.com.br/privacy
   ```
   (já publicada e validada com HTTP 200 em 2026-03-16)

2. **Data Collection:**
   - Clicar "Get Started"
   - Responder perguntas:
     - Coleta dados? Sim/Não
     - Quais tipos? (contato, identificadores, etc.)
     - Para quê? (funcionalidade, analytics, ads, etc.)
     - Dados linkados ao usuário? Sim/Não
     - Dados usados para tracking? Sim/Não

**Exemplo para app de chatbot:**
```
Data Types Collected:
- Contact Info (email, phone) → Account creation
- Identifiers (User ID) → App functionality
- Usage Data → Analytics

Linked to User: Yes
Tracking: No
```

### Passo 6.3: Preparar Screenshots

**Tamanhos obrigatórios (iPhone):**
- 6.7" (iPhone 15 Pro Max): 1290x2796 pixels
- 6.5" (iPhone 14 Plus): 1284x2778 pixels

**Como gerar:**

**Opção A: Simulador + Xcode**
```bash
# 1. Rodar app no simulador iPhone 15 Pro Max
# 2. Navegar para tela desejada
# 3. ⌘S (salvar screenshot)
# 4. Arquivos salvos em ~/Desktop
```

**Opção B: Device real**
- Tirar screenshots no iPhone
- Transferir para Mac via AirDrop

**Mínimo necessário:** 3 screenshots
**Recomendado:** 5-8 screenshots mostrando features principais

**Dica:** Usar Figma/Sketch para criar frames bonitos com texto explicativo.

---

## 🚀 Fase 7: Build de Produção & Upload (1 hora)

### Passo 7.1: Preparar Build de Release

1. **No Xcode:**
   - Target: Any iOS Device (Generic iOS Device)
   - Scheme: Selecionar "App"
   - Edit Scheme → Run → Build Configuration → **Release**

2. **Verificar capacitor.config.ts:**
```typescript
// Descomentar para produção:
server: {
  url: 'https://uzzapp.uzzai.com.br',
  cleartext: false,
},
```

3. **Sincronizar:**
```bash
npx cap sync ios
```

### Passo 7.2: Archive

1. **No Xcode:**
   - Product → Archive
   - Aguardar build (pode demorar 5-15 min)

2. **Erros comuns:**
   - **Code signing error:** verificar Team e Provisioning Profile
   - **Missing entitlements:** adicionar Capabilities necessárias
   - **Build failed:** verificar logs no Issue Navigator

3. **Se sucesso:**
   - Abre janela "Organizer" com archives

### Passo 7.3: Distribuir para App Store

1. **Na janela Organizer:**
   - Selecionar archive mais recente
   - Clicar "Distribute App"

2. **Escolher método:**
   - ☑ App Store Connect
   - Next

3. **Distribution options:**
   - ☑ Upload
   - ☑ Include bitcode: **NO** (obsoleto no iOS 18)
   - ☑ Upload symbols: **YES** (para crash reports)
   - ☑ Manage Version and Build Number: **YES**
   - Next

4. **Re-sign:**
   - Automatically manage signing: **YES**
   - Next

5. **Review:**
   - Verificar Bundle ID, Version, Build
   - Upload

6. **Aguardar upload (5-30 min dependendo do tamanho)**

### Passo 7.4: Verificar Processing no App Store Connect

1. **App Store Connect → My Apps → UzzApp**
2. **Aba "TestFlight"**
3. **Aguardar "Processing" → "Ready to Submit"**
   - Pode demorar 10-60 minutos
   - Apple valida binário automaticamente

4. **Se "Invalid Binary":**
   - Verificar email da Apple explicando motivo
   - Corrigir e fazer novo Archive

---

## 🧪 Fase 8: TestFlight (1-2 horas)

### Passo 8.1: Configurar TestFlight

1. **App Store Connect → TestFlight**
2. **Build aparece em "iOS Builds"**
3. **Preencher:**
   - **What to Test:** descrever novidades desta build
   - **Test Information:**
     - Beta App Description
     - Feedback Email
     - Marketing URL (opcional)
     - Privacy Policy URL
     - Sign-In Required: Yes/No
     - Demo Account (se sim): fornecer email/senha

4. **Export Compliance:**
   - Does your app use encryption? **YES** (HTTPS conta)
   - Is it exempt? **YES** (se usar apenas HTTPS padrão)

### Passo 8.2: Adicionar Testadores

**Testadores Internos (até 100):**
1. **TestFlight → Internal Testing**
2. **Default Group → Adicionar testadores**
3. **Email de cada testador**
4. **Save**

**Testadores Externos (até 10.000):**
1. **TestFlight → External Testing**
2. **Create Group**
3. **Add Testers**
4. **Submit for Review** (Apple revisa grupo externo)

### Passo 8.3: Testar via TestFlight

1. **Testadores recebem email**
2. **Instalar TestFlight app (App Store)**
3. **Clicar link no email**
4. **Instalar UzzApp**
5. **Testar funcionalidades**
6. **Enviar feedback** (TestFlight tem botão nativo)

**O que testar:**
- [ ] Login/autenticação
- [ ] Push notifications (primeiro teste real!)
- [ ] Biometria (Face ID/Touch ID)
- [ ] Todas as features principais
- [ ] Performance
- [ ] Crashes/bugs

---

## 📝 Fase 9: Submissão para Review (30 min)

### Passo 9.1: Preparar Versão para Review

1. **App Store Connect → UzzApp**
2. **"+" → Create New Version**
3. **Version:** 2.0.0
4. **Selecionar Build do TestFlight**

### Passo 9.2: Preencher Informações da Versão

#### App Store Information

- **Name:** UzzApp
- **Subtitle:** (30 caracteres, opcional)
- **Promotional Text:** (170 caracteres, editável sem nova review)

#### Description

Texto pronto para copiar/colar:
- `docs/ios/APP_STORE_CONNECT_COPY.md`

```
[Descrever app em português]

UzzApp é a plataforma de atendimento inteligente via WhatsApp para empresas.

Principais funcionalidades:
• Chatbot AI para WhatsApp Business
• Dashboard de gerenciamento
• Relatórios e analytics
• Integrações com CRM
• Atendimento humano escalável

[Expandir conforme necessário]
```

#### Keywords

```
whatsapp, chatbot, atendimento, crm, automação, ia, business
```

(max 100 caracteres, separados por vírgula)

#### Support URL

```
https://uzzapp.uzzai.com.br/support
```

#### Marketing URL (opcional)

```
https://uzzapp.uzzai.com.br
```

#### Screenshots

- Upload das 5-8 screenshots preparadas
- Ordem: da mais importante para menos

### Passo 9.3: Rating & Review Information

**Age Rating:**
- Clicar "Edit"
- Responder questionário da Apple
- Provavelmente: **4+** (sem conteúdo restrito)

**App Review Information:**

- **Sign-in required:** YES
- **Demo Account:**
  - Username: `demo@uzzai.com.br`
  - Password: `[senha de teste]`
  - **CRÍTICO:** Conta deve funcionar e ter dados de exemplo

- **Contact Information:**
  - First Name: [seu nome]
  - Last Name: [seu sobrenome]
  - Phone: +55 XX XXXXX-XXXX
  - Email: suporte@uzzai.com.br

- **Notes:**
```
Instruções para revisão:
1. Fazer login com a conta demo fornecida
2. Testar envio de mensagem via dashboard
3. Verificar relatórios
4. Testar notificações push (se possível)

Observações:
- App carrega conteúdo web de https://uzzapp.uzzai.com.br
- Requer conexão com internet ativa
```

### Passo 9.4: Version Release

- **Automatically release this version:** Sim/Não
  - **Sim:** app vai para loja assim que aprovado
  - **Não:** você controla quando liberar após aprovação

### Passo 9.5: Submeter para Review

1. **Verificar tudo está preenchido**
2. **Clicar "Add for Review"**
3. **Review checklist da Apple**
4. **Clicar "Submit for Review"**

**Status vai mudar:**
- `Waiting for Review` (pode demorar 1-48h)
- `In Review` (revisão em andamento)
- `Pending Developer Release` (se escolheu controle manual)
- **ou** `Ready for Sale` (se automático e aprovado)

---

## ⚠️ Fase 10: Lidando com Rejeições

### Motivos Comuns de Rejeição

#### 1. App é Apenas um Wrapper de Site

**Guideline:** 4.2 - Minimum Functionality

**Apple diz:**
> Your app provides a limited user experience as it is not sufficiently different from a mobile browsing experience.

**Como evitar:**
- Adicionar funcionalidades nativas:
  - Push notifications
  - Biometria para login rápido
  - Modo offline (cache de dados)
  - Deep links
  - Native UI para funções críticas (não só WebView)

**Se receber:**
- **Resposta no Resolution Center:**
  ```
  Our app provides native iOS features beyond web browsing:
  1. Push notifications for real-time alerts
  2. Face ID/Touch ID for secure authentication
  3. Offline mode with local data caching
  4. iOS-native navigation and UI elements
  5. Deep linking for app-to-app communication

  We have updated the build to enhance these native features.
  Please find attached screenshots demonstrating the native functionality.
  ```

#### 2. Falta Sign in with Apple

**Guideline:** 4.8 - Sign in with Apple

**Apple diz:**
> Apps that use a third-party or social login service to set up or authenticate must also offer Sign in with Apple.

**Como evitar:**
- Se seu app tem login Google/Facebook/outro → adicionar Sign in with Apple
- Se usa apenas email/senha → OK, não precisa

**Implementação rápida:**
```bash
npm install @awesome-cordova-plugins/sign-in-with-apple
npx cap sync
```

#### 3. Falta Privacy Policy

**Como evitar:**
- URL funcional em App Information
- Texto claro sobre coleta de dados
- Matching com App Privacy no App Store Connect

#### 4. Informações de Teste Insuficientes

**Como evitar:**
- Conta demo funcional
- Notas detalhadas sobre como testar
- Dados de exemplo no backend

#### 5. Crashes ou Bugs

**Como evitar:**
- Testar extensivamente no TestFlight
- Enviar símbolos de debug (Xcode faz automaticamente)
- Verificar logs de crash no App Store Connect

### Processo de Re-submissão

1. **Ler email da Apple cuidadosamente**
2. **Corrigir problema**
3. **Incrementar build number:**
   - Info.plist: `CFBundleVersion` → 9
   - Xcode General: Build → 9
4. **Fazer novo Archive e Upload**
5. **Aguardar processing**
6. **Selecionar nova build na versão 2.0.0**
7. **Clicar "Submit for Review" novamente**

---

## 🔄 Fase 11: Atualizações Futuras

### Fluxo de Update (após app aprovado)

1. **Fazer mudanças no código**
2. **Incrementar version OU build:**
   - **Major update:** 2.0.0 → 2.1.0 (novas features)
   - **Minor update:** 2.0.0 → 2.0.1 (bugfixes)
   - **Build:** 8 → 9 (mesmo version, nova build)

3. **Sincronizar:**
```bash
npx cap sync ios
```

4. **Xcode → Product → Archive**
5. **Upload to App Store Connect**
6. **Aguardar processing**
7. **Create new version (se version mudou) ou selecionar build (se só build mudou)**
8. **Submit for Review**

### Updates que NÃO Precisam de Review

- Mudanças no backend (server-side)
- Mudanças no web app (já que app carrega de `uzzapp.uzzai.com.br`)
- Correções de texto/imagens na web

**Vantagem do modelo Capacitor + server.url:**
- Maior parte dos updates não precisa rebuild
- Só rebuilda para:
  - Novos plugins nativos
  - Mudanças de permissões
  - Mudanças de UI nativa

---

## 📊 Monitoramento Pós-Lançamento

### App Store Connect Analytics

**Acessar:** App Store Connect → Analytics

**Métricas importantes:**
- **App Units:** downloads
- **Impressions:** visualizações na App Store
- **Conversion Rate:** impressões → downloads
- **Crashes:** taxa de crashes por sessão
- **Ratings & Reviews:** feedback de usuários

### Crash Reports

**Acessar:** App Store Connect → TestFlight ou App Store → Crashes

**Como ler:**
- Stack trace mostra onde crashou
- Se símbolos foram enviados, mostra código Swift/Obj-C
- Se não foram enviados, mostra apenas endereços de memória

**Corrigir crashes:**
1. Identificar causa no stack trace
2. Reproduzir localmente
3. Corrigir código
4. Testar extensivamente
5. Fazer novo upload

### Push Notification Testing

**Ferramentas:**
- Firebase Console (se usar Firebase)
- OneSignal (se usar OneSignal)
- Pusher (para testes ad-hoc)

**Validar:**
- Token é recebido no backend
- Notificação aparece no iPhone
- Clicar abre o app
- Deep link funciona (se aplicável)

---

## 🚨 Troubleshooting

### Problema: Pod install falha

**Erro:**
```
[!] Unable to find a specification for Capacitor
```

**Solução:**
```bash
pod repo update
pod install
```

---

### Problema: Build falha com signing error

**Erro:**
```
No valid code signing identity found
```

**Solução:**
1. Xcode → Settings → Accounts → Download Manual Profiles
2. Verificar Team selecionado
3. Ativar "Automatically manage signing"

---

### Problema: App crashes ao abrir no device

**Erro:** App abre e fecha imediatamente

**Solução:**
1. Xcode → Window → Devices and Simulators
2. Selecionar seu iPhone
3. Ver console logs
4. Procurar por erro (geralmente missing framework ou bundle ID)

---

### Problema: Push notifications não funciona

**Checklist:**
- [ ] Capability "Push Notifications" adicionada no Xcode
- [ ] App ID tem push habilitado (Apple Developer Portal)
- [ ] Certificado APNs configurado no backend
- [ ] Token sendo enviado ao backend após app pedir permissão
- [ ] Testando em device real (simulador não recebe push)

---

### Problema: Biometria não funciona

**Erro:**
```
LAError Code=7 "Face ID is not available."
```

**Solução:**
- Verificar `NSFaceIDUsageDescription` no Info.plist
- Testar em iPhone real com Face ID ativo
- Simulador: Features → Face ID → Enrolled

---

### Problema: TestFlight diz "Could not install"

**Erro:** App não instala no TestFlight

**Solução:**
- Verificar iOS do testador (mínimo: 17.4)
- Verificar se build foi approved no TestFlight
- Verificar se testador aceitou convite

---

### Problema: Upload para App Store Connect falha

**Erro:**
```
ITMS-90xxx: Invalid binary
```

**Solução:**
- Ler email da Apple detalhando erro
- Comum:
  - Missing required icon sizes
  - Invalid bundle ID
  - Missing export compliance
  - Build com Xcode version antiga

---

## 📅 Timeline Sugerido

### Semana 1 (15-21 março 2026)

**Dias 1-2:** Setup do Mac
- Instalar Xcode 26
- Configurar Apple Developer account
- Instalar CocoaPods

**Dias 3-4:** Configurar projeto iOS
- Atualizar Podfile
- Atualizar Info.plist
- Sincronizar Capacitor
- Gerar assets

**Dia 5:** Primeiro build no Xcode
- Rodar no simulador
- Corrigir erros de build
- Rodar em device real

**Dias 6-7:** Testes intensivos
- Testar todas as funcionalidades
- Corrigir bugs encontrados

### Semana 2 (22-28 março 2026)

**Dia 1:** App Store Connect setup
- Criar app record
- Preencher metadados
- Preparar screenshots

**Dia 2:** TestFlight
- Upload primeira build
- Adicionar testadores
- Aguardar feedback

**Dias 3-5:** Iteração
- Corrigir bugs reportados
- Fazer novos uploads
- Testar novamente

**Dia 6:** Submissão
- Preencher todas as informações
- Submit for Review

**Dia 7:** Buffer para imprevistos

### Semana 3-4 (29 março - 11 abril 2026)

- Aguardar review (1-3 dias úteis)
- Responder rejeições (se houver)
- Re-submeter
- **Meta:** Aprovado até 11 abril

### 28 abril 2026

**Deadline Apple:** Xcode 26 obrigatório

Se você já configurou para iOS 17.4+ e está usando Xcode 26, está safe.

---

## ✅ Checklist Final de Go-Live

### Desenvolvimento

- [ ] Xcode 26 instalado
- [ ] Projeto iOS sincronizado (`npx cap sync ios`)
- [ ] Podfile com todos os plugins
- [ ] Info.plist com usage descriptions
- [ ] iOS deployment target 17.4
- [ ] Bundle ID configurado: `com.uzzai.uzzapp`
- [ ] Version: 2.0.0
- [ ] Build: 8 (ou superior)
- [ ] Assets (ícones + splash) configurados

### Testes

- [ ] App roda no simulador sem crashes
- [ ] App roda em iPhone real sem crashes
- [ ] Login funciona
- [ ] Push notifications funciona
- [ ] Biometria funciona (Face ID/Touch ID)
- [ ] Deep links funcionam
- [ ] Testado por pelo menos 3 pessoas no TestFlight

### App Store Connect

- [ ] App record criado
- [ ] Bundle ID correto
- [ ] Screenshots (mínimo 3, recomendado 5-8)
- [ ] Description preenchida
- [ ] Keywords configuradas
- [x] Privacy Policy URL funcional
- [ ] App Privacy preenchido
- [ ] Support URL funcional
- [ ] Demo account criada e funcional
- [ ] Contact information preenchida
- [ ] Build uploaded e "Ready to Submit"

### Compliance

- [ ] Export Compliance configurado (TestFlight)
- [ ] Age Rating adequado
- [ ] Não viola guidelines Apple:
  - [ ] Não é só wrapper de site (tem features nativas)
  - [x] Sign in with Apple (se usa login social) - não aplicável no app nativo atual (OAuth social oculto com `!Capacitor.isNativePlatform()`)
  - [ ] Privacy policy clara
  - [ ] Não coleta dados sem permissão

### Final

- [ ] Submitted for Review
- [ ] Aguardando aprovação
- [ ] Plano de resposta se rejeitado
- [ ] Comunicação com time sobre timeline

---

## 🎓 Recursos Adicionais

### Documentação Oficial

- **Apple Developer:** https://developer.apple.com
- **App Store Connect:** https://appstoreconnect.apple.com
- **Capacitor iOS:** https://capacitorjs.com/docs/ios
- **App Store Guidelines:** https://developer.apple.com/app-store/review/guidelines/

### Ferramentas Úteis

- **Xcode:** Mac App Store
- **CocoaPods:** https://cocoapods.org
- **TestFlight:** iOS App Store (para testadores)
- **App Icon Generator:** https://appicon.co
- **Screenshot Frames:** https://www.screely.com

### Comunidades

- **Stack Overflow:** [ios] tag
- **Capacitor Discord:** https://discord.gg/UPYYRhtyzp
- **Apple Developer Forums:** https://developer.apple.com/forums/

---

## 📞 Suporte

### Se Encontrar Problemas

1. **Verificar logs no Xcode:** Window → Devices → View Device Logs
2. **Verificar Issues:** Xcode → Report Navigator (⌘9)
3. **Pesquisar erro:** Google/Stack Overflow
4. **Capacitor Discord:** canal #ios
5. **Apple Developer Forums:** postar com detalhes

---

*Última atualização: 15/03/2026*
*Versão: 1.0*
*Preparado para Xcode 26 e iOS 17.4+ (deadline 28/04/2026)*

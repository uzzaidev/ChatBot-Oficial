# 03 — iOS & Apple App Store

> Do projeto `ios/` gerado até o app publicado na App Store.
>
> 🍎 **Não precisa de Mac físico.** O UzzApp publica via **GitHub Actions
> (runner `macos-26`, Xcode 26.5) + fastlane match** — build, assinatura e
> upload ao TestFlight rodam inteiramente em CI, sem abrir o Xcode. Estratégia
> comprovada no projeto irmão Convoca e replicada aqui.
> Guia completo: **[docs/playbooks/ios-ci-sem-mac/README.md](../playbooks/ios-ci-sem-mac/README.md)**.
> (Um Mac/Xcode ainda é uma alternativa válida se você já tiver um disponível —
> mas não é mais um requisito.)

---

## Parte A — Configuração nativa do projeto iOS

### A.1. `Info.plist` — display name, permissões, URL schemes

A Apple **rejeita** apps que acessam câmera, microfone, fotos, Face ID, etc. **sem uma descrição de uso** (`NS*UsageDescription`). Cada permissão usada precisa de uma string explicando o porquê, em linguagem para o usuário.

```xml
<!-- ios/App/App/Info.plist (trechos essenciais) -->
<dict>
    <key>CFBundleDisplayName</key>
    <string>NomeDoApp</string>

    <!-- Deep link via custom scheme: seuapp:// -->
    <key>CFBundleURLTypes</key>
    <array>
        <dict>
            <key>CFBundleURLName</key>
            <string>com.suaempresa.seuapp</string>
            <key>CFBundleURLSchemes</key>
            <array><string>seuapp</string></array>
        </dict>
    </array>

    <!-- App Transport Security: força HTTPS. Exceções por domínio se necessário -->
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSExceptionDomains</key>
        <dict>
            <key>suaempresa.com</key>
            <dict>
                <key>NSIncludesSubdomains</key><true/>
                <key>NSTemporaryExceptionAllowsInsecureHTTPLoads</key><false/>
            </dict>
        </dict>
    </dict>

    <!-- Descrições de uso (OBRIGATÓRIAS para cada permissão usada) -->
    <key>NSFaceIDUsageDescription</key>
    <string>Usamos Face ID para login seguro e rápido.</string>
    <key>NSCameraUsageDescription</key>
    <string>Precisamos da câmera para tirar fotos no app.</string>
    <key>NSPhotoLibraryUsageDescription</key>
    <string>Precisamos acessar sua galeria para selecionar arquivos.</string>
    <key>NSPhotoLibraryAddUsageDescription</key>
    <string>Precisamos salvar arquivos na sua galeria.</string>
    <key>NSMicrophoneUsageDescription</key>
    <string>Precisamos do microfone para gravar áudios.</string>

    <!-- Push em background -->
    <key>UIBackgroundModes</key>
    <array><string>remote-notification</string></array>

    <key>UILaunchStoryboardName</key><string>LaunchScreen</string>
    <key>UISupportedInterfaceOrientations</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
        <string>UIInterfaceOrientationLandscapeLeft</string>
        <string>UIInterfaceOrientationLandscapeRight</string>
    </array>
</dict>
```

> ⚠️ **Causa nº 1 de rejeição automática:** usar uma capability (câmera, fotos, Face ID...) sem a `NS*UsageDescription` correspondente. Revise isso antes de submeter.

### A.2. `Podfile` — plataforma e pods dos plugins

```ruby
require_relative '../../node_modules/@capacitor/ios/scripts/pods_helpers'

platform :ios, '17.4'      # deployment target mínimo
use_frameworks!

install! 'cocoapods', :disable_input_output_paths => true

def capacitor_pods
  pod 'Capacitor',        :path => '../../node_modules/@capacitor/ios'
  pod 'CapacitorCordova', :path => '../../node_modules/@capacitor/ios'
  # um pod por plugin instalado:
  pod 'CapacitorApp',               :path => '../../node_modules/@capacitor/app'
  pod 'CapacitorCamera',            :path => '../../node_modules/@capacitor/camera'
  pod 'CapacitorNetwork',           :path => '../../node_modules/@capacitor/network'
  pod 'CapacitorPushNotifications', :path => '../../node_modules/@capacitor/push-notifications'
  pod 'CapacitorStatusBar',         :path => '../../node_modules/@capacitor/status-bar'
  pod 'AparajitaCapacitorBiometricAuth', :path => '../../node_modules/@aparajita/capacitor-biometric-auth'
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

Após editar o Podfile ou instalar plugins:
```bash
cd ios/App && pod install
# ou simplesmente: npx cap sync ios
```

### A.3. Build settings (`project.pbxproj` / aba Signing & Capabilities no Xcode)

| Setting | Valor de referência | Significado |
|---------|---------------------|-------------|
| `PRODUCT_BUNDLE_IDENTIFIER` | `com.suaempresa.seuapp` | = appId. Imutável após publicar. |
| `MARKETING_VERSION` | `1.0` | Versão visível (= `CFBundleShortVersionString`). |
| `CURRENT_PROJECT_VERSION` | `1` | Build number — **incremente a cada upload** ao App Store Connect. |
| `IPHONEOS_DEPLOYMENT_TARGET` | `17.4` | iOS mínimo suportado. |
| `DEVELOPMENT_TEAM` | `2YRXNXGL8K` (ex.) | Seu Team ID do Apple Developer. |
| `CODE_SIGN_STYLE` | `Automatic` | Deixe o Xcode gerenciar certificados/profiles. |

> A maioria desses campos é editada visualmente no Xcode: selecione o target **App** → aba **Signing & Capabilities**.

---

## Parte B — Conta e assinatura (Apple)

### B.1. Apple Developer Program
- [developer.apple.com/programs](https://developer.apple.com/programs/) — **US$ 99/ano** (renovação anual obrigatória).
- **Organização** exige **número D-U-N-S** (a Apple verifica a empresa). **Individual** não exige.

### B.2. Certificados e Provisioning Profiles
Com `CODE_SIGN_STYLE = Automatic` e o seu Apple ID logado no Xcode (**Xcode → Settings → Accounts**), o Xcode cria e gerencia automaticamente:
- **Distribution Certificate** (assina o app).
- **Provisioning Profile** de distribuição (vincula app + certificado + capabilities).

Você raramente precisa fazer isso à mão. Para builds em CI, aí sim gere manualmente no [Apple Developer portal](https://developer.apple.com/account/resources).

### B.3. Push (APNs)
- No Xcode: target **App** → **Signing & Capabilities** → **+ Capability** → **Push Notifications**.
- Se usar Firebase no iOS: registre o app iOS no Firebase, baixe `GoogleService-Info.plist`, arraste para o projeto no Xcode, e suba a **APNs Authentication Key (.p8)** no Firebase Console. Detalhes em **[04-NATIVE-FEATURES.md](./04-NATIVE-FEATURES.md)**.

---

## Parte C — Gerar e enviar o build

```bash
# 1. Build web + sync
npm run build:mobile
npm run cap:sync

# 2. Abrir no Xcode
npm run cap:open:ios
```

No Xcode:
1. Selecione o destino **Any iOS Device (arm64)** (não um simulador).
2. Incremente o **build number** (`CURRENT_PROJECT_VERSION`).
3. **Product → Archive**.
4. Na janela **Organizer**, selecione o archive → **Distribute App** → **App Store Connect** → **Upload**.
5. O Xcode valida, assina e envia para o App Store Connect (alguns minutos para processar).

> Alternativa por linha de comando (CI): `xcodebuild archive` + `xcodebuild -exportArchive` com um `ExportOptions.plist`, depois `xcrun altool`/`notarytool` ou Transporter.

---

## Parte D — App Store Connect (publicação)

1. Acesse [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **My Apps → +**.
2. **Bundle ID:** selecione o `com.suaempresa.seuapp` registrado.
3. Preencha a página da versão:
   - **Nome** (até 30 chars), **Subtítulo** (até 30).
   - **Descrição**, **palavras-chave**, **URL de suporte**, **URL de marketing**.
   - **Política de Privacidade (URL)** — obrigatória.
   - **Screenshots** (ver requisitos em [05-LAUNCH-CHECKLISTS.md](./05-LAUNCH-CHECKLISTS.md)).
   - **App Privacy** ("Privacy Nutrition Labels") — declare os dados coletados. Obrigatório.
4. Selecione o **build** que você enviou pelo Xcode.
5. **Age rating** (questionário).
6. **Submit for Review**.

### Tempo de revisão
- Tipicamente **24–48h** (manual, feita por humanos da Apple — mais rigorosa que a Google).

---

## ⚠️ Riscos de rejeição específicos do iOS (Estratégia B / remote URL)

A Apple aplica a **App Store Review Guideline 4.2 ("Minimum Functionality")**: apps que são "apenas um site empacotado" podem ser **rejeitados**. Para apps que carregam um site ao vivo no WebView, **demonstre valor nativo**:

- ✅ Push notifications nativas (APNs).
- ✅ Face ID / Touch ID (biometria).
- ✅ Câmera / galeria nativas.
- ✅ Deep linking / Universal Links.
- ✅ Funcionalidade que aproveita o device (offline cache, haptics, etc.).

> O UzzApp passa porque entrega push + biometria + deep links + câmera nativos — não é "só um WebView". Garanta o mesmo no seu app antes de submeter.

Outras causas comuns de rejeição:
- Faltando `NS*UsageDescription` (ver Parte A.1).
- Login obrigatório sem conta de teste fornecida → **forneça credenciais demo** em "App Review Information".
- Links de pagamento externos contornando o In-App Purchase (se vender conteúdo digital).

---

## Atualizações futuras (checklist rápido)

- [ ] Incrementar `CURRENT_PROJECT_VERSION` (build) e, se for release público, `MARKETING_VERSION`
- [ ] `npm run build:mobile && npm run cap:sync`
- [ ] Xcode → Archive → Distribute → Upload
- [ ] App Store Connect → nova versão → selecionar build → Submit for Review

---

## Troubleshooting

| Problema | Causa | Solução |
|----------|-------|---------|
| `pod install` falha | CocoaPods desatualizado | `sudo gem install cocoapods` |
| "No signing certificate" | Apple ID não logado / sem Team | Xcode → Settings → Accounts; selecione o Team no target |
| Archive não aparece como app | Destino é simulador | Selecione "Any iOS Device (arm64)" |
| Rejeição 4.2 | App parece só um site | Adicione/realce features nativas (push, biometria, câmera) |
| Rejeição: permissão sem descrição | Falta `NS*UsageDescription` | Adicione a string no Info.plist |
| Push não chega | APNs key não configurada | Suba a `.p8` no Firebase + capability Push no Xcode |

➡️ Próximo: **[04-NATIVE-FEATURES.md](./04-NATIVE-FEATURES.md)**

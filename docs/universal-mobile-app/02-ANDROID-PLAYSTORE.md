# 02 — Android & Google Play Store

> Do projeto `android/` gerado até o app publicado na Play Store. Funciona em Windows/macOS/Linux.

---

## Parte A — Configuração nativa do projeto Android

### A.1. Identidade e versão (`android/app/build.gradle`)

```gradle
android {
    namespace "com.suaempresa.seuapp"
    compileSdk rootProject.ext.compileSdkVersion
    defaultConfig {
        applicationId "com.suaempresa.seuapp"   // imutável após publicar!
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 8                            // INTEIRO — incremente a cada upload
        versionName "2.0.0"                       // string visível ao usuário
    }
}
```

| Campo | Regra |
|-------|-------|
| `applicationId` | **Nunca muda** depois do 1º upload. É a identidade do app na loja. |
| `versionCode` | Inteiro **estritamente crescente**. A Play recusa upload com code ≤ anterior. |
| `versionName` | Livre (semver recomendado). É só cosmético. |

### A.2. SDK levels (`android/variables.gradle`)

```gradle
ext {
    minSdkVersion = 23          // Android 6.0 — piso de compatibilidade
    compileSdkVersion = 35      // Android 15
    targetSdkVersion = 35       // Google exige targetSdk recente p/ novos apps
    // ...versões de libs androidx
}
```

> ⚠️ A Google Play **exige `targetSdk` recente** (geralmente o nível do ano anterior) para aceitar novos apps e updates. Mantenha atualizado ou o upload é rejeitado.

### A.3. Permissões e deep links (`AndroidManifest.xml`)

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <application android:icon="@mipmap/ic_launcher" android:label="@string/app_name" ...>
    <activity android:name=".MainActivity" android:launchMode="singleTask" android:exported="true">
      <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
      </intent-filter>

      <!-- Deep link via custom scheme: seuapp://... -->
      <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="seuapp" />
      </intent-filter>

      <!-- App Links via HTTPS: abre o app ao tocar num link do seu domínio -->
      <!-- autoVerify=true exige assetlinks.json hospedado (ver 04-NATIVE-FEATURES) -->
      <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="https" android:host="app.suaempresa.com" />
      </intent-filter>
    </activity>
  </application>

  <!-- Permissões — declare apenas as que realmente usa -->
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.CAMERA" />
  <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />          <!-- Android 13+ -->
  <uses-permission android:name="android.permission.USE_BIOMETRIC" />
  <uses-permission android:name="android.permission.USE_FINGERPRINT" android:maxSdkVersion="28" />
</manifest>
```

### A.4. Nome e scheme (`res/values/strings.xml`)

```xml
<resources>
    <string name="app_name">NomeDoApp</string>
    <string name="title_activity_main">NomeDoApp</string>
    <string name="package_name">com.suaempresa.seuapp</string>
    <string name="custom_url_scheme">com.suaempresa.seuapp</string>
</resources>
```

---

## Parte B — Assinatura (Keystore)

> 🔴 **O keystore é PERMANENTE.** Se você perdê-lo ou esquecer a senha, **nunca mais conseguirá atualizar o app** na Play Store. Faça backup em múltiplos lugares seguros no instante em que gerá-lo.

### B.1. Gerar o keystore

```bash
keytool -genkey -v \
  -keystore android/app/release.keystore \
  -alias seuapp \
  -keyalg RSA -keysize 2048 -validity 10000
```

Ele pergunta nome, organização, cidade, estado, país (`BR`) e uma **senha** (anote!).

### B.2. Configurar credenciais (`android/release.properties`)

```properties
storeFile=app/release.keystore
storePassword=SUA_SENHA
keyAlias=seuapp
keyPassword=SUA_SENHA
```

### B.3. `build.gradle` lê esse arquivo (padrão seguro do UzzApp)

```gradle
def keystorePropertiesFile = rootProject.file("release.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'] ?: 'release.keystore')
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias'] ?: 'seuapp'
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }
    buildTypes {
        release {
            if (keystorePropertiesFile.exists()) {
                signingConfig signingConfigs.release
            }
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### B.4. `.gitignore` — **OBRIGATÓRIO**

```gitignore
# Android signing — NUNCA commitar
*.keystore
release.properties
android/app/google-services.json   # contém chaves do Firebase
```

> **Play App Signing:** ao publicar, a Google oferece gerenciar a chave final por você ("Play App Signing"). Recomendado — você só precisa guardar a **upload key** (seu keystore), e a Google guarda a chave de assinatura final. Mesmo assim, **nunca perca seu upload keystore.**

---

## Parte C — Gerar o artefato de release (AAB)

A Play Store exige **AAB** (Android App Bundle), não APK.

```bash
# 1. Build web mobile
npm run build:mobile

# 2. Sync para o projeto nativo
npm run cap:sync

# 3. Gerar o AAB assinado
cd android
./gradlew bundleRelease          # Windows: .\gradlew bundleRelease
```

Artefato gerado em:
```
android/app/build/outputs/bundle/release/app-release.aab
```

> Para testar localmente um APK em vez do AAB: `./gradlew assembleRelease` → `app/build/outputs/apk/release/`.

---

## Parte D — Push Notifications (Firebase)

Resumo aqui; detalhes de código em **[04-NATIVE-FEATURES.md](./04-NATIVE-FEATURES.md)**.

1. Criar projeto no [Firebase Console](https://console.firebase.google.com).
2. Registrar app Android com o **mesmo `applicationId`**.
3. Baixar `google-services.json` → colocar em `android/app/`.
4. Em `android/app/build.gradle`:
   ```gradle
   dependencies {
       implementation platform('com.google.firebase:firebase-bom:34.6.0')
       implementation 'com.google.firebase:firebase-messaging'   // sem versão (BoM gerencia)
   }
   // no fim do arquivo, aplicar o plugin se google-services.json existir:
   apply plugin: 'com.google.gms.google-services'
   ```
5. O `applicationId` no `google-services.json` **precisa bater** com o do app, senão o plugin é ignorado e o push não funciona.

---

## Parte E — Publicar na Google Play Console

### E.1. Criar conta de desenvolvedor
- [play.google.com/console](https://play.google.com/console) — taxa **única de US$ 25**.
- **Individual**: mais rápido, sem D-U-N-S, mas nome de pessoa física aparece.
- **Organização**: pode exigir **número D-U-N-S** (gratuito, 1–5 dias úteis para obter em [dnb.com](https://www.dnb.com/duns-number.html)).

### E.2. Criar o app
- "Criar app" → nome, idioma padrão, tipo (App), gratuito/pago, declarações.

### E.3. Preencher a ficha da loja ("Store listing")
- **Nome** (até 30 chars), **descrição curta** (até 80 chars), **descrição completa** (até 4000 chars).
- **URL de Política de Privacidade** (obrigatória) e Termos de Serviço.
- Categoria, e-mail de suporte, site.

### E.4. Assets obrigatórios (ver checklist em [05-LAUNCH-CHECKLISTS.md](./05-LAUNCH-CHECKLISTS.md))
- **Ícone:** 512×512 PNG (32-bit, com alpha).
- **Feature graphic:** 1024×500.
- **Screenshots de phone:** mínimo **2**, máximo 8, proporção ~9:16 (ex.: 1080×1920).

### E.5. Upload e release
1. **Produção → Criar nova versão** (ou comece por **Teste interno** — recomendado).
2. Upload do `app-release.aab`.
3. Preencher notas da versão.
4. **Revisar** → **Iniciar publicação**.

### E.6. Classificação de conteúdo e Data Safety
- Responder o **questionário de classificação de conteúdo**.
- Preencher a seção **"Segurança dos dados" (Data Safety)** — quais dados o app coleta e como. Obrigatório; o app é bloqueado sem isso.

### E.7. Tempo de revisão
- Primeira publicação: **1–3 dias úteis** (às vezes mais para contas novas).
- Updates: geralmente mais rápido.

---

## Atualizações futuras (checklist rápido)

- [ ] Incrementar `versionCode` (e `versionName`) no `build.gradle`
- [ ] `npm run build:mobile && npm run cap:sync`
- [ ] `cd android && ./gradlew bundleRelease`
- [ ] Upload do novo AAB → nova versão → revisar → publicar
- [ ] **Mesmo keystore de sempre** (senão a Play rejeita)

---

## Troubleshooting

| Problema | Causa | Solução |
|----------|-------|---------|
| `keytool não reconhecido` | Java não no PATH | Use o caminho completo do JDK: `"C:\Program Files\Java\jdk-XX\bin\keytool.exe"` |
| Upload rejeitado: "versionCode já existe" | Esqueceu de incrementar | Aumente `versionCode` |
| Upload rejeitado: "assinado com chave errada" | Keystore diferente | Use sempre o keystore original |
| Push não funciona | `applicationId` ≠ `google-services.json` | Reconfigure o app no Firebase com o ID correto |
| Gradle sync falha | SDK/target ausente | Instale o SDK no Android Studio SDK Manager |
| "App não otimizado" warning | minify desligado | Opcional: ativar `minifyEnabled true` + regras ProGuard |

➡️ Próximo: **[03-IOS-APPSTORE.md](./03-IOS-APPSTORE.md)**

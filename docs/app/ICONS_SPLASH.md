# Icons & Splash Screens

Guia completo para configurar ícones de app e splash screens em Android e iOS.

## 📋 Table of Contents

- [Overview](#overview)
- [Preparar Assets](#preparar-assets)
- [Gerar Assets Automaticamente](#gerar-assets-automaticamente)
- [Especificações Android](#especificações-android)
- [Especificações iOS](#especificações-ios)
- [Configuração Manual](#configuração-manual)
- [Adaptive Icons (Android)](#adaptive-icons-android)
- [Verificação](#verificação)
- [Troubleshooting](#troubleshooting)

---

## Overview

### O Que É Necessário

**App Icon:**
- Ícone exibido no launcher/home screen
- Múltiplas resoluções (ldpi, mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
- Formato: PNG com transparência (ou sem para iOS)

**Splash Screen:**
- Tela de loading ao iniciar o app
- Múltiplas resoluções e orientações
- Formato: PNG

### Ferramentas Disponíveis

1. **@capacitor/assets** (RECOMENDADO) - Geração automática
2. **Manual** - Criar cada tamanho individualmente
3. **Online generators** - [appicon.co](https://appicon.co/), [apetools.webprofusion.com](https://apetools.webprofusion.com/)

---

## Preparar Assets

### Source Files

Crie 2 arquivos na raiz do projeto:

```
ChatBot-Oficial/
├── icon.png          # 1024x1024 px (app icon)
└── splash.png        # 2732x2732 px (splash screen)
```

---

### Icon.png (App Icon)

**Especificações:**
- **Tamanho**: 1024x1024 px
- **Formato**: PNG
- **Transparência**: Permitida (Android), não recomendada (iOS)
- **Margens**: 10% padding (conteúdo em 820x820 px central)
- **Conteúdo**: Logo/ícone do app

**Exemplo (Design):**
```
┌─────────────────────────┐
│    (102px padding)      │
│  ┌─────────────────┐   │
│  │                 │   │  1024x1024
│  │   Logo 820x820  │   │
│  │                 │   │
│  └─────────────────┘   │
│    (102px padding)      │
└─────────────────────────┘
```

**Dicas:**
- Use cores sólidas (sem gradientes complexos)
- Evite texto pequeno (fica ilegível em tamanhos menores)
- Teste em fundo claro e escuro
- Considere adaptive icon (Android) - background + foreground separados

---

### Splash.png (Splash Screen)

**Especificações:**
- **Tamanho**: 2732x2732 px (comporta iPad Pro)
- **Formato**: PNG
- **Fundo**: Cor sólida (match com brand)
- **Logo**: Centralizado, ~50% do tamanho (1366x1366 px)

**Exemplo (Design):**
```
┌─────────────────────────┐
│                         │
│    (background color)   │
│         ┌─────┐         │  2732x2732
│         │Logo │         │
│         └─────┘         │
│                         │
└─────────────────────────┘
```

**Dicas:**
- Fundo deve combinar com tema do app
- Logo centralizado (safe area)
- Evite texto (exceto tagline simples)
- Simples é melhor (carrega rápido)

---

## Gerar Assets Automaticamente

### Usando @capacitor/assets (RECOMENDADO)

#### 1. Instalar

```bash
npm install -g @capacitor/assets
```

**Verificação:**
```bash
npx @capacitor/assets --version
```

---

#### 2. Preparar Source Files

```bash
# Criar arquivos source na raiz
# icon.png (1024x1024)
# splash.png (2732x2732)

# Verificar arquivos existem
dir icon.png, splash.png
```

---

#### 3. Gerar Assets

```bash
# Gerar para Android e iOS
npx @capacitor/assets generate

# Ou especificar plataforma
npx @capacitor/assets generate --android
npx @capacitor/assets generate --ios

# Com cor de fundo customizada
npx @capacitor/assets generate --iconBackgroundColor '#FFFFFF'

# Com splash background color
npx @capacitor/assets generate --splashBackgroundColor '#1E40AF'
```

**O que acontece:**
- Icons gerados em `android/app/src/main/res/mipmap-*/ic_launcher.png`
- Splash screens gerados em `android/app/src/main/res/drawable-*/splash.png`
- (iOS) Assets gerados em `ios/App/App/Assets.xcassets/`

**Tempo**: 10-30 segundos

---

#### 4. Sync com Capacitor

```bash
npx cap sync
```

---

#### 5. Rebuild e Testar

```bash
npm run build:mobile
npm run cap:sync
npm run cap:open:android
```

No emulador/device:
- Verificar ícone no launcher
- Abrir app → Verificar splash screen

**Checklist:**
- [ ] Ícone aparece no launcher
- [ ] Ícone está nítido (não pixelado)
- [ ] Splash screen aparece ao abrir app
- [ ] Splash tem cor de fundo correta

---

## Especificações Android

### App Icons (Launcher)

**Densidades:**

| Densidade | Tamanho | Pasta |
|-----------|---------|-------|
| ldpi | 36x36 px | `mipmap-ldpi/` |
| mdpi | 48x48 px | `mipmap-mdpi/` |
| hdpi | 72x72 px | `mipmap-hdpi/` |
| xhdpi | 96x96 px | `mipmap-xhdpi/` |
| xxhdpi | 144x144 px | `mipmap-xxhdpi/` |
| xxxhdpi | 192x192 px | `mipmap-xxxhdpi/` |

**Localização:**
```
android/app/src/main/res/
├── mipmap-ldpi/ic_launcher.png
├── mipmap-mdpi/ic_launcher.png
├── mipmap-hdpi/ic_launcher.png
├── mipmap-xhdpi/ic_launcher.png
├── mipmap-xxhdpi/ic_launcher.png
└── mipmap-xxxhdpi/ic_launcher.png
```

---

### Splash Screens

**Densidades:**

| Densidade | Portrait | Landscape |
|-----------|----------|-----------|
| ldpi | 200x320 px | 320x200 px |
| mdpi | 320x480 px | 480x320 px |
| hdpi | 480x800 px | 800x480 px |
| xhdpi | 720x1280 px | 1280x720 px |
| xxhdpi | 960x1600 px | 1600x960 px |
| xxxhdpi | 1280x1920 px | 1920x1280 px |

**Localização:**
```
android/app/src/main/res/
├── drawable-land-ldpi/splash.png
├── drawable-land-mdpi/splash.png
├── drawable-land-hdpi/splash.png
├── drawable-land-xhdpi/splash.png
├── drawable-land-xxhdpi/splash.png
├── drawable-land-xxxhdpi/splash.png
├── drawable-port-ldpi/splash.png
├── drawable-port-mdpi/splash.png
├── drawable-port-hdpi/splash.png
├── drawable-port-xhdpi/splash.png
├── drawable-port-xxhdpi/splash.png
└── drawable-port-xxxhdpi/splash.png
```

---

### Configuração (AndroidManifest.xml)

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<application
    android:icon="@mipmap/ic_launcher"
    android:roundIcon="@mipmap/ic_launcher_round"
    android:theme="@style/AppTheme">

    <activity
        android:name=".MainActivity"
        android:theme="@style/AppTheme.NoActionBarLaunch">

        <!-- Splash screen -->
        <meta-data
            android:name="android.app.splash_screen_drawable"
            android:resource="@drawable/splash" />
    </activity>
</application>
```

---

## Especificações iOS

### App Icons

**Tamanhos (iOS):**

| Uso | Tamanho | Escala |
|-----|---------|--------|
| iPhone Notification | 20x20 pt | 2x, 3x |
| iPhone Settings | 29x29 pt | 2x, 3x |
| iPhone Spotlight | 40x40 pt | 2x, 3x |
| iPhone App | 60x60 pt | 2x, 3x |
| iPad Notification | 20x20 pt | 1x, 2x |
| iPad Settings | 29x29 pt | 1x, 2x |
| iPad Spotlight | 40x40 pt | 1x, 2x |
| iPad App | 76x76 pt | 1x, 2x |
| iPad Pro App | 83.5x83.5 pt | 2x |
| App Store | 1024x1024 pt | 1x |

**Pixels (exemplos):**
- 20pt @2x = 40x40 px
- 60pt @3x = 180x180 px
- 1024pt @1x = 1024x1024 px

**Localização:**
```
ios/App/App/Assets.xcassets/AppIcon.appiconset/
├── Icon-20@2x.png (40x40)
├── Icon-20@3x.png (60x60)
├── Icon-29@2x.png (58x58)
├── Icon-29@3x.png (87x87)
├── Icon-40@2x.png (80x80)
├── Icon-40@3x.png (120x120)
├── Icon-60@2x.png (120x120)
├── Icon-60@3x.png (180x180)
├── Icon-76@1x.png (76x76)
├── Icon-76@2x.png (152x152)
├── Icon-83.5@2x.png (167x167)
└── Icon-1024.png (1024x1024)
```

---

### Splash Screens (iOS)

iOS usa LaunchScreen.storyboard (não PNG estático).

**Configuração:**
```
ios/App/App/Base.lproj/LaunchScreen.storyboard
```

**@capacitor/assets** gera automaticamente.

---

## Configuração Manual

Se não usar `@capacitor/assets`, crie manualmente:

### Android

1. **Criar ícones**:
   - Use Photoshop/Figma/GIMP
   - Exportar em cada tamanho (36px, 48px, 72px, 96px, 144px, 192px)
   - Salvar em `android/app/src/main/res/mipmap-*/ic_launcher.png`

2. **Criar splash screens**:
   - Exportar em cada tamanho e orientação
   - Salvar em `android/app/src/main/res/drawable-*/splash.png`

3. **Sync**:
```bash
npx cap sync android
```

---

### iOS (macOS)

1. **Abrir Xcode**:
```bash
npx cap open ios
```

2. **Assets.xcassets**:
   - Xcode → Navigator → Assets.xcassets → AppIcon
   - Arraste cada ícone para o slot correspondente

3. **LaunchScreen.storyboard**:
   - Editar no Interface Builder (Xcode)
   - Adicionar logo, background color

---

## Adaptive Icons (Android)

### O Que São Adaptive Icons?

Android 8.0+ suporta ícones adaptativos:
- **Foreground**: Logo (PNG transparente)
- **Background**: Cor sólida ou gradiente

**Vantagens:**
- Sistema pode aplicar formas diferentes (círculo, squircle, etc.)
- Animações (ex: pull to app drawer)

---

### Criar Adaptive Icons

#### Estrutura de Arquivos

```
android/app/src/main/res/
├── mipmap-anydpi-v26/
│   └── ic_launcher.xml
├── drawable/
│   ├── ic_launcher_background.xml  (ou PNG)
│   └── ic_launcher_foreground.xml  (ou PNG)
└── values/
    └── ic_launcher_background.xml  (cor)
```

---

#### ic_launcher.xml

```xml
<!-- android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml -->
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>
```

---

#### Background (Cor Sólida)

```xml
<!-- android/app/src/main/res/drawable/ic_launcher_background.xml -->
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#1E40AF"/>  <!-- Azul -->
</shape>
```

---

#### Foreground (PNG)

```
android/app/src/main/res/
└── drawable-xxxhdpi/ic_launcher_foreground.png (432x432)
```

---

### Gerar Adaptive Icons com @capacitor/assets

```bash
npx @capacitor/assets generate --iconBackgroundColor '#1E40AF'
```

Gera automaticamente adaptive icons.

---

## Verificação

### Checklist Completo

**Android:**
- [ ] Ícone aparece no launcher
- [ ] Ícone está nítido em diferentes densidades
- [ ] Adaptive icon funciona (Android 8.0+)
- [ ] Splash screen aparece ao abrir app
- [ ] Splash não está distorcido/pixelado
- [ ] Splash background color correto

**iOS (se aplicável):**
- [ ] Ícone aparece no home screen
- [ ] Ícone está nítido em diferentes tamanhos
- [ ] Splash screen (LaunchScreen) aparece
- [ ] Assets.xcassets tem todos os tamanhos

---

### Testar em Devices

```bash
# Rebuild
npm run build:mobile
npm run cap:sync

# Android
npm run cap:open:android
# Run em emulador/device

# Verificar:
# 1. Desinstalar app antigo (se existir)
# 2. Reinstalar
# 3. Ícone atualizado no launcher
# 4. Splash screen aparece ao abrir
```

---

### Verificar Arquivos Gerados

```bash
# Android - Icons
dir android\app\src\main\res\mipmap-*\ic_launcher.png

# Android - Splash
dir android\app\src\main\res\drawable-*\splash.png

# iOS - Icons (macOS)
ls ios/App/App/Assets.xcassets/AppIcon.appiconset/
```

---

## Troubleshooting

### ❌ Ícone Não Atualiza

**Problema:** App instalado tem ícone antigo.

**Causa:** Cache do launcher.

**Solução:**

```bash
# 1. Desinstalar app completamente
adb uninstall com.chatbot.app

# 2. Limpar cache do launcher (device)
# Settings → Apps → Launcher → Storage → Clear Cache

# 3. Reinstalar
cd android
.\gradlew installDebug

# 4. Reiniciar device (se ainda não atualizar)
adb reboot
```

---

### ❌ Ícone Pixelado/Borrado

**Causa:** Resolução baixa ou upscaling.

**Solução:**
- Criar icon.png em 1024x1024 (alta resolução)
- Regenerar assets: `npx @capacitor/assets generate`
- Verificar que arquivos gerados estão corretos (dir mipmap-*)

---

### ❌ Splash Screen Não Aparece

**Causa:** Configuração faltando em AndroidManifest.xml.

**Solução:**

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<activity android:name=".MainActivity">
    <meta-data
        android:name="android.app.splash_screen_drawable"
        android:resource="@drawable/splash" />
</activity>
```

Sync: `npx cap sync`

---

### ❌ Splash Screen Distorcido

**Causa:** Aspect ratio incorreto.

**Solução:**
- Use splash.png 2732x2732 (quadrado)
- Logo centralizado com padding
- @capacitor/assets gera orientações corretas automaticamente

---

### ❌ "Resource not found: @drawable/splash"

**Causa:** Arquivos splash não gerados.

**Solução:**

```bash
# Verificar se splash.png existe na raiz
dir splash.png

# Regenerar
npx @capacitor/assets generate

# Verificar arquivos gerados
dir android\app\src\main\res\drawable-*\splash.png

# Sync
npx cap sync
```

---

### ❌ iOS Adaptive Icons Não Funcionam

**Nota:** iOS NÃO suporta adaptive icons (conceito Android-only).

iOS usa ícones estáticos em múltiplos tamanhos.

---

## Recursos Externos

**Ferramentas:**
- [App Icon Generator](https://appicon.co/) - Gerar todos os tamanhos de ícone
- [Ape Tools](https://apetools.webprofusion.com/) - Icon + splash generator
- [Figma](https://www.figma.com/) - Design de ícones
- [Capacitor Assets Docs](https://github.com/ionic-team/capacitor-assets)

**Guidelines:**
- [Android Icon Design](https://developer.android.com/guide/practices/ui_guidelines/icon_design_launcher)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/app-icons)

---

## Exemplo Completo

### Workflow Completo

```bash
# 1. Criar source files (design)
# icon.png (1024x1024)
# splash.png (2732x2732)
# Salvar na raiz do projeto

# 2. Instalar @capacitor/assets
npm install -g @capacitor/assets

# 3. Gerar assets
npx @capacitor/assets generate --iconBackgroundColor '#1E40AF' --splashBackgroundColor '#1E40AF'

# 4. Verificar arquivos gerados
dir android\app\src\main\res\mipmap-*\
dir android\app\src\main\res\drawable-*\

# 5. Sync
npx cap sync

# 6. Rebuild e testar
npm run build:mobile
npm run cap:sync
npm run cap:open:android

# 7. No Android Studio
# Desinstalar app antigo: adb uninstall com.chatbot.app
# Run (Shift + F10)

# 8. Verificar no device
# - Ícone atualizado no launcher
# - Splash screen aparece ao abrir
```

**Tempo total:** 15-30 minutos

---

**Path do Projeto**: `C:\Users\pedro\OneDrive\Área de Trabalho\ChatBot-Oficial\ChatBot-Oficial`

**Próximo Passo**: Após configurar assets, seguir para [DEPLOY.md](./DEPLOY.md) para publicação nas lojas.

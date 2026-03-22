# iOS Xcode Setup — Registro Técnico Completo

> **Data:** 2026-03-22
> **Escopo:** Reparação completa da infraestrutura iOS do projeto Capacitor em `ios/App`
> **Resultado:** Build passou, app rodou no simulador iOS

---

## Índice

1. [Contexto](#1-contexto)
2. [Problemas Encontrados (em ordem)](#2-problemas-encontrados-em-ordem)
3. [Modificações Realizadas](#3-modificações-realizadas)
4. [Divergências Conhecidas](#4-divergências-conhecidas)
5. [Passos Manuais no Xcode](#5-passos-manuais-no-xcode)
6. [Estado Final dos Arquivos](#6-estado-final-dos-arquivos)
7. [Pendências e Observações](#7-pendências-e-observações)
8. [Guia de Manutenção](#8-guia-de-manutenção)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Contexto

O projeto iOS é um app híbrido Capacitor que carrega o front-end web de `https://uzzapp.uzzai.com.br`. O workspace Xcode em `ios/App` estava com múltiplos problemas de infraestrutura que impediam qualquer build:

- Workspace vazia
- Pods ausentes
- Deployment target incompatível
- Signing não configurado
- Arquivos referenciados no `.pbxproj` mas inexistentes no filesystem

O trabalho usou Xcode MCP para build/diagnóstico e shell local para correções que o Xcode não conseguia materializar.

---

## 2. Problemas Encontrados (em ordem)

| # | Problema | Causa Raiz | Impacto |
|---|---------|------------|---------|
| 1 | Workspace sem projetos visíveis | `contents.xcworkspacedata` vazio/incompleto | Xcode não abria nada |
| 2 | Ausência de `Pods/` e `Podfile.lock` | `pod install` nunca executado neste ambiente | Build falhava no link |
| 3 | `pod` não instalado | Ambiente sem CocoaPods | Impossível resolver deps |
| 4 | Deployment target incompatível | App em 14.0, Pods em 17.4 | Build falhava na compilação |
| 5 | Falta de Development Team | Signing não configurado | Build falhava no codesign |
| 6 | Bundle identifier indisponível | `com.chatbot.app` sem provisionamento | Build falhava no codesign |
| 7 | Signing para device físico | Tentativa de assinar para device sem device registrado | Build falhava |
| 8 | Arquivos faltando no target | `capacitor.config.json`, `config.xml`, `public/` removidos mas ainda referenciados no `.pbxproj` | `lstat: No such file or directory` |
| 9 | Branding inconsistente | Nomes e IDs divergentes entre arquivos | Confusão de identidade |

---

## 3. Modificações Realizadas

### 3.1. Workspace

**Arquivo:** `ios/App/App.xcworkspace/contents.xcworkspacedata`

Restaurado para referenciar ambos os projetos:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Workspace version = "1.0">
   <FileRef location = "group:App.xcodeproj"></FileRef>
   <FileRef location = "group:Pods/Pods.xcodeproj"></FileRef>
</Workspace>
```

**Por que:** Sem isso, o Xcode abria a workspace vazia.

---

### 3.2. Scheme Compartilhado

**Arquivo:** `ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme`

Criado/garantido para que o Xcode enxergasse o scheme `App`. Configurações:

| Ação | Build Config | Detalhes |
|------|-------------|---------|
| Build | All targets | Parallelized, implicit deps |
| Test | Debug | LLDB debugger |
| Launch | Debug | LLDB, location simulation |
| Profile | Release | Instruments |
| Analyze | Debug | Static analysis |
| Archive | Release | Distribution |

**Por que:** Sem um scheme compartilhado, o Xcode não sabia como buildar.

---

### 3.3. Podfile

**Arquivo:** `ios/App/Podfile`

Ajustado para usar caminhos locais dentro de `ios/App/node_modules/.pnpm`:

```ruby
platform :ios, '17.4'
use_frameworks!

# Pods instalados:
# - Capacitor 7.6.0
# - CapacitorCordova 7.6.0
# - AparajitaCapacitorBiometricAuth 9.1.2
# - CapacitorApp 7.1.2
# - CapacitorNetwork 7.0.4
# - CapacitorPushNotifications 7.0.6
# - CapacitorStatusBar 7.0.5

post_install do |installer|
  # Força SWIFT_VERSION = 5.0
  # Força IPHONEOS_DEPLOYMENT_TARGET = 17.4
end
```

**Por que:** O Podfile original apontava para caminhos de `node_modules/.pnpm` que não existiam no ambiente desta sessão. Foi necessário adaptar os paths para o contexto local.

**Atenção:** Se `cap sync` for executado no futuro, ele pode sobrescrever o Podfile. Ver [seção 8](#8-guia-de-manutenção).

---

### 3.4. Deployment Target do Projeto

**Arquivo:** `ios/App/App.xcodeproj/project.pbxproj`

Todas as ocorrências de `IPHONEOS_DEPLOYMENT_TARGET = 14.0` foram alteradas para `17.4`.

Configurações confirmadas no `.pbxproj`:

| Setting | Valor |
|---------|-------|
| `IPHONEOS_DEPLOYMENT_TARGET` | `17.4` |
| `PRODUCT_BUNDLE_IDENTIFIER` | `com.chatbot.app` |
| `MARKETING_VERSION` | `1.0` |
| `CURRENT_PROJECT_VERSION` | `1` |
| `SWIFT_VERSION` | `5.0` |
| `TARGETED_DEVICE_FAMILY` | `1,2` (iPhone + iPad) |
| `CODE_SIGN_STYLE` | `Automatic` |
| `DEVELOPMENT_TEAM` | `2YRXNXGL8K` |

---

### 3.5. Arquivos Restaurados

Estes arquivos foram recriados porque o target iOS os referenciava no `project.pbxproj`, mas não existiam no filesystem:

#### `ios/App/App/capacitor.config.json`

```json
{
  "appId": "com.chatbot.app",
  "appName": "ChatBot",
  "webDir": "out",
  "server": {
    "url": "https://uzzapp.uzzai.com.br",
    "cleartext": false
  },
  "ios": {
    "scheme": "ChatBot",
    "contentInset": "automatic"
  },
  "plugins": {
    "SplashScreen": { "launchShowDuration": 2000, "backgroundColor": "#ffffff", "showSpinner": false },
    "PushNotifications": { "presentationOptions": ["badge", "sound", "alert"] },
    "StatusBar": { "style": "LIGHT", "backgroundColor": "#000000" }
  }
}
```

#### `ios/App/App/config.xml`

```xml
<?xml version='1.0' encoding='utf-8'?>
<widget version="1.0.0" xmlns="http://www.w3.org/ns/widgets" xmlns:cdv="http://cordova.apache.org/ns/1.0">
    <name>ChatBot</name>
    <content src="index.html" />
    <access origin="*" />
</widget>
```

#### `ios/App/App/public/index.html`

HTML mínimo de fallback com `<title>ChatBot</title>`. O conteúdo real é carregado da URL remota.

---

### 3.6. Branding/Config (Info.plist e relacionados)

**Arquivo:** `ios/App/App/Info.plist`

| Chave | Antes | Depois |
|-------|-------|--------|
| `CFBundleDisplayName` | (não definido / UzzApp) | `ChatBot` |
| `CFBundleURLName` | (não definido) | `com.chatbot.app` |
| `NSFaceIDUsageDescription` | (genérico) | `ChatBot usa Face ID para autenticacao segura e rapida.` |

**Mantidos de propósito** (compatibilidade):

| Chave | Valor Mantido | Razão |
|-------|--------------|-------|
| `CFBundleURLSchemes` | `uzzapp` | Deep links existentes continuam funcionando |
| ATS Exception Domain | `uzzai.com.br` | Domínio do servidor remoto |

---

## 4. Divergências Conhecidas

Existe uma divergência intencional entre o `capacitor.config.ts` da raiz e os arquivos do iOS:

| Campo | Raiz (`capacitor.config.ts`) | iOS (`ios/App/App/capacitor.config.json`) |
|-------|------|-----|
| `appId` | `com.uzzai.uzzapp` | `com.chatbot.app` |
| `appName` | `UzzApp` | `ChatBot` |
| `ios.scheme` | `UzzApp` | `ChatBot` |

**Por que:** O `capacitor.config.ts` da raiz não foi alterado nesta sessão porque estava fora da área editável. O iOS recebeu branding `ChatBot` / `com.chatbot.app` para funcionar no Xcode.

**Ação necessária:** Decidir qual identidade é a definitiva e alinhar ambos os arquivos. Ver [seção 7](#7-pendências-e-observações).

---

## 5. Passos Manuais no Xcode

Estes passos dependem de interação direta no Xcode e não podem ser automatizados por CLI:

1. **Abrir `App.xcworkspace`** (não o `.xcodeproj`)
2. **Selecionar o scheme** `App` no seletor de schemes
3. **Escolher simulador iOS** (não "Any iOS Device")
4. **Em TARGETS > App > Signing & Capabilities:**
   - Ativar "Automatically manage signing"
   - Selecionar o Team (`2YRXNXGL8K`)
   - Confirmar Bundle Identifier `com.chatbot.app`
5. **Build & Run** (⌘R)

---

## 6. Estado Final dos Arquivos

### Estrutura de diretório

```
ios/App/
├── App/
│   ├── AppDelegate.swift          # Lifecycle + push + deep links
│   ├── Info.plist                 # Branding ChatBot, Face ID, push, ATS
│   ├── capacitor.config.json      # [RESTAURADO] com.chatbot.app
│   ├── config.xml                 # [RESTAURADO] ChatBot
│   ├── public/
│   │   └── index.html             # [RESTAURADO] fallback HTML
│   ├── Base.lproj/
│   │   ├── Main.storyboard        # CAPBridgeViewController
│   │   └── LaunchScreen.storyboard # Splash image
│   └── Assets.xcassets/
│       ├── AppIcon.appiconset/    # 1024x1024
│       └── Splash.imageset/       # Light + Dark, 1x/2x/3x
├── App.xcodeproj/
│   ├── project.pbxproj            # [MODIFICADO] target 17.4, com.chatbot.app
│   └── xcshareddata/xcschemes/
│       └── App.xcscheme           # [CRIADO] scheme compartilhado
├── App.xcworkspace/
│   └── contents.xcworkspacedata   # [RESTAURADO] App + Pods
├── Podfile                        # [MODIFICADO] paths locais, iOS 17.4
├── Podfile.lock                   # [GERADO] por pod install
├── Pods/                          # [GERADO] por pod install
└── node_modules/                  # [CRIADO] deps locais para Podfile
```

### Pods Instalados

| Pod | Versão | Função |
|-----|--------|--------|
| Capacitor | 7.6.0 | Core framework |
| CapacitorCordova | 7.6.0 | Camada de compatibilidade Cordova |
| AparajitaCapacitorBiometricAuth | 9.1.2 | Face ID / Touch ID |
| CapacitorApp | 7.1.2 | Lifecycle do app |
| CapacitorNetwork | 7.0.4 | Status de rede |
| CapacitorPushNotifications | 7.0.6 | Push notifications |
| CapacitorStatusBar | 7.0.5 | Controle da status bar |

---

## 7. Pendências e Observações

### Pendências Críticas

| # | Item | Impacto | Ação |
|---|------|---------|------|
| 1 | **Alinhar `capacitor.config.ts` (raiz) com iOS** | `cap sync` vai sobrescrever `capacitor.config.json` do iOS com valores da raiz (`com.uzzai.uzzapp` / `UzzApp`) | Decidir identidade definitiva e atualizar a raiz |
| 2 | **`CFBundleURLSchemes` ainda é `uzzapp`** | Deep links usam scheme antigo | Manter se URL scheme publicado, ou migrar se novo app |
| 3 | **URL remota aponta para `uzzapp.uzzai.com.br`** | Server URL no Capacitor config | Manter enquanto o domínio for esse |

### Observações

- O CocoaPods foi instalado localmente em `/tmp` via RubyGems durante esta sessão. Para manutenção futura, instalar globalmente: `sudo gem install cocoapods`
- O Podfile usa caminhos `node_modules/.pnpm` dentro de `ios/App`. Se o `pnpm` reorganizar as deps, os paths podem quebrar.
- O `Podfile.lock` registra checksum `7ce82722f533546ec28ba4522129613f4809fc6e` — preservar para builds reproduzíveis.

---

## 8. Guia de Manutenção

### Após `cap sync`

O comando `npx cap sync` sobrescreve:
- `ios/App/App/capacitor.config.json` (a partir de `capacitor.config.ts` da raiz)
- `ios/App/Podfile` (a partir dos plugins instalados)

**Protocolo:**
1. Antes de `cap sync`, verificar se `capacitor.config.ts` da raiz tem os valores corretos
2. Após `cap sync`, verificar se o Podfile mantém `platform :ios, '17.4'`
3. Executar `cd ios/App && pod install`
4. Verificar se o `project.pbxproj` mantém `IPHONEOS_DEPLOYMENT_TARGET = 17.4`

### Adicionando um novo plugin Capacitor

```bash
# 1. Instalar na raiz
npm install @capacitor/new-plugin

# 2. Sincronizar
npx cap sync ios

# 3. Instalar pods
cd ios/App && pod install

# 4. Abrir workspace no Xcode e buildar
open App.xcworkspace
```

### Atualizando o deployment target

Se precisar mudar o iOS mínimo (ex: de 17.4 para 18.0):

1. Alterar em `ios/App/Podfile`: `platform :ios, '18.0'`
2. Alterar no `post_install` do Podfile: `config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '18.0'`
3. Alterar no `project.pbxproj`: todas as ocorrências de `IPHONEOS_DEPLOYMENT_TARGET`
4. Executar `pod install`
5. Build no Xcode para verificar

### Mudando o bundle identifier

Se precisar mudar de `com.chatbot.app` para outro:

1. Alterar no `project.pbxproj`: `PRODUCT_BUNDLE_IDENTIFIER`
2. Alterar no `capacitor.config.json` (iOS): `appId`
3. Alterar no `capacitor.config.ts` (raiz): `appId`
4. Alterar no `Info.plist`: `CFBundleURLName`
5. No Xcode: TARGETS > App > Signing — verificar se o novo ID é válido para o team

### Mudando a URL do servidor

Se o domínio mudar de `uzzapp.uzzai.com.br`:

1. Alterar `capacitor.config.ts` (raiz): `server.url`
2. Alterar `capacitor.config.json` (iOS): `server.url`
3. Alterar `Info.plist`: `NSAppTransportSecurity > NSExceptionDomains`
4. Se HTTPS, nenhuma config extra. Se HTTP, adicionar `NSTemporaryExceptionAllowsInsecureHTTPLoads = true` (não recomendado)

---

## 9. Troubleshooting

### Workspace abre vazia

**Causa:** `contents.xcworkspacedata` corrompido ou vazio.

**Fix:** Restaurar o conteúdo XML com referências a `App.xcodeproj` e `Pods/Pods.xcodeproj`.

### "No such module 'Capacitor'"

**Causa:** Pods não instalados ou workspace não usada.

**Fix:**
```bash
cd ios/App && pod install
# Abrir App.xcworkspace (NÃO App.xcodeproj)
```

### "lstat ... No such file or directory"

**Causa:** Arquivo referenciado no `project.pbxproj` não existe no filesystem.

**Fix:** Criar o arquivo faltante ou remover a referência do `.pbxproj`. Os três mais comuns:
- `App/capacitor.config.json`
- `App/config.xml`
- `App/public/`

### Deployment target mismatch

**Causa:** App e Pods com targets diferentes.

**Fix:** Alinhar o `IPHONEOS_DEPLOYMENT_TARGET` no `project.pbxproj`, no `Podfile`, e no `post_install` do Podfile.

### Signing falha para "Any iOS Device"

**Causa:** Precisa de provisioning profile real para device físico.

**Fix:** Selecionar um simulador no seletor de destino do Xcode, ou registrar o device no Apple Developer Portal.

### Build falha após `cap sync`

**Causa:** `cap sync` sobrescreveu Podfile ou capacitor.config.json com valores da raiz.

**Fix:** Verificar se os valores foram sobrescritos. Reaplicar as correções documentadas neste arquivo. Executar `pod install`.

---

## Referência Rápida

```
# Abrir projeto iOS
open ios/App/App.xcworkspace

# Instalar pods
cd ios/App && pod install

# Sync Capacitor (CUIDADO: sobrescreve Podfile e config)
npx cap sync ios

# Build via CLI (requer xcodebuild)
cd ios/App && xcodebuild -workspace App.xcworkspace -scheme App -sdk iphonesimulator build

# Limpar build
cd ios/App && xcodebuild -workspace App.xcworkspace -scheme App clean
```

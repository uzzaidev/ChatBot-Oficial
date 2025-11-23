# Mobile Testing Guide

Guia completo para testar o app em emuladores Android/iOS e devices físicos.

## 📋 Table of Contents

- [Android Emulador (AVD)](#android-emulador-avd)
- [Android Device Físico](#android-device-físico)
- [iOS Simulador (macOS)](#ios-simulador-macos)
- [iOS Device Físico (macOS)](#ios-device-físico-macos)
- [Checklist Completo de Testes](#checklist-completo-de-testes)
- [Ferramentas de Debug](#ferramentas-de-debug)
- [Performance Testing](#performance-testing)
- [Troubleshooting](#troubleshooting)

---

## Android Emulador (AVD)

### Criar Android Virtual Device

#### Via Android Studio (Recomendado)

1. Abra Android Studio
2. **Tools** → **Device Manager**
3. Clique **Create Device**
4. Selecione hardware:
   - **Category**: Phone
   - **Device**: Pixel 5 (ou Pixel 6/7)
   - Clique **Next**

5. Selecione system image:
   - **Release Name**: **Tiramisu** (API 33) ou **UpsideDownCake** (API 34)
   - **ABI**: x86_64 (mais rápido)
   - Clique **Download** se necessário (2-3 GB)
   - Clique **Next**

6. Configurações do AVD:
   - **AVD Name**: `Pixel_5_API_33`
   - **Startup orientation**: Portrait
   - **Graphics**: Hardware - GLES 2.0
   - **RAM**: 2048 MB (ou mais se possível)
   - Clique **Show Advanced Settings**:
     - **Internal Storage**: 2048 MB
     - **SD Card**: 512 MB
   - Clique **Finish**

**Verificação:**
- [ ] AVD criado e listado no Device Manager
- [ ] Clique ▶️ (Play) para iniciar emulador
- [ ] Emulador abre mostrando Android (1-2min primeira vez)

---

#### Via Linha de Comando (Alternativa)

```bash
# Listar system images disponíveis
sdkmanager --list | findstr "system-images"

# Instalar system image (API 33 x86_64)
sdkmanager "system-images;android-33;google_apis;x86_64"

# Aceitar licenças
sdkmanager --licenses

# Criar AVD
avdmanager create avd ^
  -n Pixel_5_API_33 ^
  -k "system-images;android-33;google_apis;x86_64" ^
  -d "pixel_5"

# Listar AVDs criados
avdmanager list avd
```

**Verificação:**
```bash
# Iniciar emulador via CLI
emulator -avd Pixel_5_API_33

# Listar devices conectados
adb devices
# Esperado: emulator-5554   device
```

---

### Rodar App no Emulador

#### Via Android Studio

1. Certifique-se que emulador está rodando (Device Manager → ▶️)
2. Abra projeto: `npm run cap:open:android`
3. Aguarde Gradle sync
4. Selecione emulador no dropdown superior
5. Clique ▶️ **Run 'app'** (ou `Shift + F10`)

**Tempo de build**: 30-90s (primeira vez)

**Verificação:**
- [ ] App instala no emulador
- [ ] App abre sem crashes
- [ ] Interface renderiza corretamente

---

#### Via Linha de Comando

```bash
# Build e deploy
cd android
.\gradlew installDebug

# Verificar app instalado
adb shell pm list packages | findstr chatbot

# Iniciar app manualmente
adb shell am start -n com.chatbot.app/.MainActivity
```

---

### Otimizar Performance do Emulador

**Se emulador estiver lento:**

1. **Habilitar Virtualization no BIOS**:
   - Reinicie PC → Entre no BIOS (F2/Del)
   - Procure "Intel VT-x" ou "AMD-V"
   - Habilite → Salve e reinicie

2. **Usar x86_64 (não ARM)**:
   - System images x86_64 são 10x mais rápidos no Windows

3. **Habilitar Hardware Graphics**:
   - Device Manager → Edit AVD
   - **Graphics**: Hardware - GLES 2.0

4. **Aumentar RAM**:
   - Edit AVD → Show Advanced Settings
   - **RAM**: 4096 MB (se PC tiver 16GB+ RAM)

5. **Fechar apps pesados**:
   - Chrome, VS Code, etc. consomem RAM

**Verificação de Performance:**
- [ ] Emulador inicia em < 30s
- [ ] Animações fluidas
- [ ] Sem lag ao navegar no app

---

## Android Device Físico

### Pré-requisitos

- [ ] Cabo USB
- [ ] Device Android (API 22+, Android 5.1+)
- [ ] Developer Options habilitado no device

---

### Habilitar Developer Options

1. No device Android:
   - **Settings** → **About phone**
   - Toque em **Build number** 7 vezes
   - Mensagem: "You are now a developer!"

2. Volte para Settings:
   - **Settings** → **System** → **Developer options**
   - Habilite **USB debugging**

3. Conecte device via USB:
   - Pop-up no device: "Allow USB debugging?"
   - Marque "Always allow from this computer"
   - Clique **OK**

**Verificação:**
```bash
# Listar devices conectados
adb devices

# Esperado:
# List of devices attached
# 1234567890ABCDEF   device
```

**Troubleshooting:**
- Device não aparece → Reinstalar drivers USB (Google USB Driver)
- "unauthorized" → Aceitar prompt no device
- "offline" → `adb kill-server && adb start-server`

---

### Deploy no Device Físico

#### Via Android Studio

1. Conecte device via USB
2. Abra Android Studio: `npm run cap:open:android`
3. Device aparece no dropdown superior
4. Clique ▶️ **Run 'app'**
5. App instala e abre automaticamente

**Verificação:**
- [ ] App instalado (ícone visível no launcher)
- [ ] App funciona sem USB (standalone)

---

#### Via Linha de Comando

```bash
# Build e instalar
cd android
.\gradlew installDebug

# Verificar instalação
adb shell pm list packages | findstr chatbot

# Abrir app
adb shell am start -n com.chatbot.app/.MainActivity

# Logs em tempo real
adb logcat | findstr "Capacitor"
```

---

### Testar Features Específicas

**Câmera:**
```typescript
// Device físico tem câmera real
import { Camera } from '@capacitor/camera'

const photo = await Camera.getPhoto({
  quality: 90,
  allowEditing: false,
  resultType: 'uri'
})
console.log('Photo:', photo.webPath)
```

**Geolocalização:**
```typescript
import { Geolocation } from '@capacitor/geolocation'

const position = await Geolocation.getCurrentPosition()
console.log('Lat:', position.coords.latitude)
console.log('Lng:', position.coords.longitude)
```

**Vibração:**
```typescript
import { Haptics, ImpactStyle } from '@capacitor/haptics'

await Haptics.impact({ style: ImpactStyle.Medium })
```

**Checklist:**
- [ ] Câmera abre e tira foto
- [ ] GPS retorna coordenadas reais
- [ ] Vibração funciona
- [ ] Notificações aparecem (se implementadas)

---

## iOS Simulador (macOS)

**IMPORTANTE**: iOS requer macOS. Não funciona no Windows.

### Pré-requisitos (macOS)

- [ ] macOS 12.0+ (Monterey ou superior)
- [ ] Xcode 14.0+ ([Mac App Store](https://apps.apple.com/app/xcode/id497799835))
- [ ] CocoaPods instalado: `sudo gem install cocoapods`
- [ ] Xcode Command Line Tools: `xcode-select --install`

---

### Criar iOS Simulador

1. Abra Xcode
2. **Window** → **Devices and Simulators**
3. Aba **Simulators**
4. Clique **+** (Adicionar)
5. Configurações:
   - **Simulator Name**: iPhone 14 Pro
   - **Device Type**: iPhone 14 Pro
   - **OS Version**: iOS 16.0 (ou mais recente)
   - Clique **Create**

**Verificação:**
```bash
# Listar simuladores disponíveis
xcrun simctl list devices | grep iPhone

# Iniciar simulador
open -a Simulator
```

---

### Build e Run no Simulador

```bash
# Sync Capacitor para iOS
npx cap sync ios

# Abrir projeto no Xcode
npx cap open ios
```

No Xcode:
1. Selecione simulador no dropdown superior (ex: iPhone 14 Pro)
2. Clique ▶️ **Run** (ou `Cmd + R`)
3. Aguarde build (2-5min primeira vez)
4. Simulador abre com app instalado

**Verificação:**
- [ ] Projeto abre no Xcode sem erros
- [ ] CocoaPods instalou dependências (`pod install`)
- [ ] Simulador inicia e mostra app

---

### Troubleshooting iOS

| Problema | Solução |
|----------|---------|
| CocoaPods não encontrado | `sudo gem install cocoapods` |
| "Command PhaseScriptExecution failed" | Xcode → Product → Clean Build Folder |
| Simulador não inicia | Preferences → Reset Content and Settings |
| Erro de assinatura | Xcode → Signing & Capabilities → Team (selecionar conta) |

---

## iOS Device Físico (macOS)

### Pré-requisitos

- [ ] macOS com Xcode
- [ ] iPhone/iPad (iOS 13.0+)
- [ ] Cabo USB-C ou Lightning
- [ ] Apple Developer Account (grátis para testing)

---

### Configurar Device

1. Conecte iPhone via USB
2. No iPhone: "Trust This Computer?" → **Trust**
3. Xcode reconhece device automaticamente

**Verificação:**
```bash
# Listar devices conectados
xcrun xctrace list devices
```

---

### Deploy no Device

1. Abra Xcode: `npx cap open ios`
2. Selecione seu device no dropdown
3. **Signing & Capabilities**:
   - **Team**: Selecione sua conta Apple
   - **Bundle Identifier**: `com.chatbot.app` (único)
4. Clique ▶️ **Run**

**Primeira vez:**
- iPhone mostra: "Untrusted Developer"
- Settings → General → Device Management
- Confiar no desenvolvedor

**Verificação:**
- [ ] App instalado no iPhone
- [ ] App abre sem crashes
- [ ] Features funcionam (câmera, notificações)

---

## Checklist Completo de Testes

### Funcionalidade Básica

- [ ] **App inicia** sem crashes
- [ ] **Login/Autenticação** funciona (Supabase)
- [ ] **Dashboard** carrega dados
- [ ] **Navegação** entre telas funciona
- [ ] **Logout** funciona e limpa sessão

---

### Conectividade

- [ ] **Online**: App funciona com internet
- [ ] **Offline**: App mostra mensagem de erro apropriada
- [ ] **Conexão lenta**: Loading states aparecem
- [ ] **Reconexão**: App recupera ao voltar online

---

### UI/UX

- [ ] **Orientação**: Portrait funciona (landscape opcional)
- [ ] **Telas pequenas**: Funciona em 5" (iPhone SE)
- [ ] **Telas grandes**: Funciona em 6.7" (iPhone 14 Pro Max)
- [ ] **Dark mode**: UI adapta (se implementado)
- [ ] **Safe areas**: Conteúdo não fica atrás de notch/barra de status
- [ ] **Keyboard**: Não sobrepõe inputs
- [ ] **Touch targets**: Botões têm 44x44pt mínimo

---

### Performance

- [ ] **Startup time**: < 3 segundos
- [ ] **Navegação**: Transições suaves (60fps)
- [ ] **Scroll**: Listas longas não travam
- [ ] **Memória**: Sem memory leaks (monitor via DevTools)
- [ ] **Battery**: Não drena bateria rapidamente

---

### Segurança

- [ ] **HTTPS**: Todas requisições usam HTTPS
- [ ] **Tokens**: Não aparecem em logs
- [ ] **Sensitive data**: Não é cacheado
- [ ] **RLS**: Supabase Row Level Security ativo
- [ ] **Environment vars**: Não expõem service_role_key

---

### Edge Cases

- [ ] **Sem dados**: Tela vazia mostra mensagem
- [ ] **Erro de rede**: Retry ou mensagem clara
- [ ] **Token expirado**: Redirect para login
- [ ] **Permissões negadas**: Mensagem explicativa
- [ ] **Background/Foreground**: App resume corretamente

---

## Ferramentas de Debug

### Chrome DevTools (Android)

```bash
# 1. Conectar device/emulador
adb devices

# 2. Abrir Chrome
chrome://inspect

# 3. Localizar app na lista
# 4. Clicar "Inspect"
```

**Features:**
- **Console**: Logs, erros, warnings
- **Network**: Requisições HTTP, timing
- **Elements**: Inspecionar DOM
- **Sources**: Debug JavaScript (breakpoints)
- **Performance**: Profiling

---

### Safari Web Inspector (iOS - macOS)

1. No Mac: Safari → **Preferences** → **Advanced**
   - Marque "Show Develop menu"
2. No iPhone: Settings → Safari → Advanced
   - Habilite "Web Inspector"
3. Conecte iPhone via USB
4. Safari → **Develop** → **[Seu iPhone]** → **[App Name]**

---

### Logcat (Android)

```bash
# Todos os logs
adb logcat

# Apenas Capacitor
adb logcat | findstr "Capacitor"

# Apenas erros
adb logcat *:E

# Salvar em arquivo
adb logcat > logs.txt

# Limpar logs
adb logcat -c
```

**Tags úteis:**
- `Capacitor`: Logs do Capacitor
- `WebView`: Logs do WebView (JavaScript)
- `chromium`: Erros JavaScript

---

### Xcode Console (iOS)

No Xcode, durante run:
- Aba inferior: **Debug area**
- Console mostra logs nativos + JavaScript
- Filtrar por "Capacitor"

---

### React DevTools

```bash
# Instalar extensão Chrome
# Funciona via chrome://inspect automaticamente
```

**Features:**
- Inspecionar component tree
- Ver props/state
- Modificar state em runtime

---

## Performance Testing

### Lighthouse (Capacitor build)

```bash
# Build para produção
npm run build:mobile

# Servir localmente para testing
npx serve out

# Abrir Chrome DevTools → Lighthouse
# Run audit (Performance, Accessibility)
```

**Metas:**
- Performance: > 90
- Accessibility: > 90
- Best Practices: > 90

---

### Metrics no Device

#### Android (adb)

```bash
# CPU usage
adb shell top -m 5

# Memory usage
adb shell dumpsys meminfo com.chatbot.app

# Battery stats
adb shell dumpsys battery
```

#### iOS (Xcode)

Xcode → Debug Navigator:
- CPU usage
- Memory usage
- Disk I/O
- Network activity

---

### Stress Testing

**Testar com:**
- [ ] Conexão 3G lenta (Chrome DevTools → Network → Slow 3G)
- [ ] 100+ mensagens no chat (scroll performance)
- [ ] Background/foreground rápido (10x)
- [ ] Airplane mode (offline handling)
- [ ] Baixa bateria (< 20%)

---

## Troubleshooting

### Android

| Problema | Causa | Solução |
|----------|-------|---------|
| Emulador não inicia | Virtualization desabilitada | Habilitar VT-x/AMD-V no BIOS |
| Device não detectado | USB debugging desabilitado | Habilitar em Developer Options |
| App crasha ao abrir | Env vars faltando | Verificar [ENV_VARS.md](./ENV_VARS.md) |
| Mudanças não aparecem | Cache de build | Rebuild: `npm run build:mobile && npm run cap:sync` |
| Gradle sync falha | Deps desatualizadas | Android Studio → File → Invalidate Caches |
| "INSTALL_FAILED_UPDATE_INCOMPATIBLE" | Assinatura diferente | Desinstalar app antigo: `adb uninstall com.chatbot.app` |
| Logcat vazio | Nível de log baixo | `adb logcat *:V` (verbose) |

---

### iOS

| Problema | Causa | Solução |
|----------|-------|---------|
| CocoaPods falha | Versão desatualizada | `sudo gem install cocoapods` |
| Simulador trava | RAM insuficiente | Fechar apps, reiniciar simulador |
| "Untrusted Developer" | Assinatura não confiada | Settings → General → Device Management |
| "No provisioning profile" | Sem conta Apple | Xcode → Preferences → Accounts → Add |
| Build falha | Derivados corrompidos | Xcode → Product → Clean Build Folder |

---

### Geral

| Problema | Solução |
|----------|---------|
| "White screen of death" | Verificar console (env vars? JS error?) |
| API calls falham | Verificar CORS, HTTPS, network logs |
| Slow performance | Profiling (DevTools → Performance) |
| Memory leak | Desmontar listeners em `useEffect` cleanup |

---

## Próximos Passos

- **Customizar assets**: [ICONS_SPLASH.md](./ICONS_SPLASH.md)
- **Deploy para produção**: [DEPLOY.md](./DEPLOY.md)
- **Push notifications**: [PUSH_NOTIFICATIONS.md](./PUSH_NOTIFICATIONS.md)
- **Problemas conhecidos**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

**Path do Projeto**: `C:\Users\pedro\OneDrive\Área de Trabalho\ChatBot-Oficial\ChatBot-Oficial`

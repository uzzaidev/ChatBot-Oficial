# Mobile Troubleshooting

Problemas conhecidos, causas e soluções testadas para desenvolvimento mobile Capacitor.

## 📋 Table of Contents

- [Build Errors](#build-errors)
- [Environment Variables](#environment-variables)
- [Android Studio Issues](#android-studio-issues)
- [Emulador/Device Problems](#emuladordevice-problems)
- [Runtime Crashes](#runtime-crashes)
- [Performance Issues](#performance-issues)
- [Capacitor Plugins](#capacitor-plugins)
- [iOS Specific (macOS)](#ios-specific-macos)
- [Network & API](#network--api)
- [Quick Reference Table](#quick-reference-table)

---

## Build Errors

### ❌ Build Next.js Falha

**Erro:**
```
Error: Page "app/dashboard/analytics/page.tsx" uses getServerSideProps which is not supported in static export
```

**Causa:** Página usa Server Components ou `getServerSideProps` (incompatível com static export).

**Solução:**
```typescript
// Adicione 'use client' no topo do arquivo
'use client'

// Converta getServerSideProps para useEffect + fetch
export default function AnalyticsPage() {
  const [data, setData] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch('/api/analytics')
      setData(await response.json())
    }
    fetchData()
  }, [])

  return <div>{/* Render data */}</div>
}
```

**Verificação:**
- [ ] Todas as páginas têm `'use client'` no topo
- [ ] Nenhum uso de `getServerSideProps`, `getStaticProps` com `revalidate`
- [ ] Build completa sem erros: `npm run build:mobile`

---

### ❌ "ENOSPC: System limit for number of file watchers reached"

**Erro (Linux/WSL):**
```
Error: ENOSPC: System limit for number of file watchers reached
```

**Causa:** Limite de file watchers do sistema atingido.

**Solução (Linux/WSL):**
```bash
# Aumentar limite
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

**Solução (Windows - geralmente não afeta):**
- Windows não tem esse problema normalmente
- Se aparecer, restart do sistema geralmente resolve

---

### ❌ Build Trava/Demora Muito

**Sintomas:**
- Build fica em "Creating an optimized production build..." por > 5min
- CPU 100% no Task Manager

**Causas:**
1. Memória RAM insuficiente
2. Disco cheio
3. Antivírus bloqueando arquivos

**Soluções:**

```bash
# 1. Aumentar memória do Node.js
$env:NODE_OPTIONS="--max-old-space-size=4096"
npm run build:mobile

# 2. Liberar espaço em disco (mínimo 5GB livre)
# Verificar espaço:
Get-PSDrive C | Select-Object Free

# 3. Temporariamente desabilitar antivírus para pasta node_modules
# (adicionar exceção no Windows Defender)

# 4. Limpar cache do Next.js
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force out
npm run build:mobile
```

**Verificação:**
- [ ] RAM disponível > 4GB
- [ ] Disco livre > 5GB
- [ ] Build completa em < 2min

---

## Environment Variables

### ❌ process.env.VAR Retorna undefined

**Erro no console:**
```javascript
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
// undefined
```

**Causas:**

1. **Variável sem `NEXT_PUBLIC_` prefix**

```env
# ❌ Errado (não funciona no cliente)
SUPABASE_URL=https://...

# ✅ Correto
NEXT_PUBLIC_SUPABASE_URL=https://...
```

2. **Arquivo `.env.mobile` não usado no build**

```json
// package.json - Verificar script
{
  "scripts": {
    // ❌ Errado
    "build:mobile": "cross-env CAPACITOR_BUILD=true next build",

    // ✅ Correto
    "build:mobile": "cross-env CAPACITOR_BUILD=true dotenv -e .env.mobile next build"
  }
}
```

3. **Arquivo `.env.mobile` não existe**

```bash
# Criar arquivo
New-Item -Path .env.mobile -ItemType File

# Ou no editor
code .env.mobile
```

**Solução Completa:**
Ver [ENV_VARS.md](./ENV_VARS.md) para guia detalhado.

**Verificação:**
- [ ] Variáveis têm `NEXT_PUBLIC_` prefix
- [ ] `.env.mobile` existe e está preenchido
- [ ] `dotenv-cli` instalado: `npm install --save-dev dotenv-cli`
- [ ] Rebuild: `npm run build:mobile`

---

### ❌ Variáveis Não Atualizam

**Sintomas:**
- Mudou `.env.mobile` mas app mostra valores antigos

**Causa:** Cache de build Next.js.

**Solução:**
```bash
# Limpar build cache
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force out

# Rebuild completo
npm run build:mobile
npm run cap:sync
```

**Verificação:**
- [ ] Pasta `out/` deletada e recriada
- [ ] Valores corretos aparecem no console do app

---

## Android Studio Issues

### ❌ Gradle Sync Falha

**Erro:**
```
Gradle sync failed: Connection timed out
```

**Causas:**
1. Internet lenta
2. Firewall bloqueando downloads
3. Cache corrompido

**Soluções:**

```bash
# 1. Invalidar caches (Android Studio)
# File → Invalidate Caches → Invalidate and Restart

# 2. Limpar Gradle cache (terminal)
cd android
.\gradlew clean
.\gradlew --stop

# 3. Deletar cache Gradle (força redownload)
Remove-Item -Recurse -Force $env:USERPROFILE\.gradle\caches

# 4. Sync novamente
# Android Studio → File → Sync Project with Gradle Files
```

**Configurar proxy (se necessário):**
```properties
# android/gradle.properties
systemProp.http.proxyHost=proxy.company.com
systemProp.http.proxyPort=8080
systemProp.https.proxyHost=proxy.company.com
systemProp.https.proxyPort=8080
```

**Verificação:**
- [ ] Gradle sync completa sem erros
- [ ] Dependências baixadas
- [ ] Barra inferior mostra "Gradle sync finished"

---

### ❌ "SDK location not found"

**Erro:**
```
SDK location not found. Define location with sdk.dir in the local.properties file or with an ANDROID_HOME environment variable.
```

**Causa:** `ANDROID_HOME` não configurado.

**Solução (Windows):**

```powershell
# 1. Configurar variável de ambiente permanente
[System.Environment]::SetEnvironmentVariable('ANDROID_HOME', "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk", 'User')

# 2. Adicionar ao Path
$currentPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
$newPath = "$currentPath;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator"
[System.Environment]::SetEnvironmentVariable('Path', $newPath, 'User')

# 3. Reiniciar terminal e verificar
echo $env:ANDROID_HOME
adb --version
```

**OU criar `local.properties` manualmente:**

```properties
# android/local.properties
sdk.dir=C:\\Users\\YourUser\\AppData\\Local\\Android\\Sdk
```

**Verificação:**
- [ ] `echo $env:ANDROID_HOME` retorna caminho do SDK
- [ ] `adb --version` funciona
- [ ] Gradle sync completa

---

### ❌ "Plugin with id 'com.android.application' not found"

**Erro:**
```
Plugin with id 'com.android.application' not found
```

**Causa:** Versão do Gradle incompatível.

**Solução:**

```bash
# android/build.gradle (root)
buildscript {
  dependencies {
    classpath 'com.android.tools.build:gradle:8.1.0'  // Versão atualizada
  }
}

# android/gradle/wrapper/gradle-wrapper.properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.0-all.zip
```

Sync projeto novamente.

---

## Emulador/Device Problems

### ❌ Emulador Não Inicia

**Erro:**
```
Emulator: Process finished with exit code 1
```

**Causas:**

1. **Virtualization desabilitada no BIOS**

**Solução:**
- Reinicie PC → Entre no BIOS (F2/Del durante boot)
- Procure "Intel VT-x" ou "AMD-V" ou "SVM Mode"
- Habilite → Salve (F10) → Reinicie

**Verificação (Windows):**
```powershell
# Task Manager → Performance → CPU
# Deve mostrar "Virtualization: Enabled"
```

2. **Conflito com Hyper-V (Windows)**

**Solução:**
```powershell
# Desabilitar Hyper-V (requer admin)
bcdedit /set hypervisorlaunchtype off
# Reinicie PC
```

3. **HAXM não instalado**

**Solução:**
- SDK Manager → SDK Tools
- Marque "Intel x86 Emulator Accelerator (HAXM)"
- Apply

---

### ❌ Device Físico Não Detectado (Android)

**Sintomas:**
```bash
adb devices
# List of devices attached
# (vazio)
```

**Soluções:**

1. **USB Debugging não habilitado**
- Device → Settings → About phone
- Toque "Build number" 7x → Developer mode ativo
- Settings → Developer options → USB debugging (ON)

2. **Driver USB não instalado**
```bash
# Baixar Google USB Driver
# SDK Manager → SDK Tools → Google USB Driver
```

3. **Cabo USB ruim ou porta USB 3.0**
- Teste outro cabo
- Use porta USB 2.0 (mais estável)

4. **ADB server travado**
```bash
adb kill-server
adb start-server
adb devices
```

5. **Modo de conexão USB errado**
- No device, arraste notificação USB
- Selecione "File Transfer" ou "PTP" (não "Charge only")

**Verificação:**
- [ ] `adb devices` lista device
- [ ] Status: `device` (não `unauthorized` ou `offline`)

---

### ❌ Emulador Muito Lento

**Sintomas:**
- Leva > 5min para iniciar
- Animações travadas
- Lag ao navegar

**Soluções:**

1. **Usar x86_64 (não ARM)**
```bash
# System image deve ser x86_64
sdkmanager "system-images;android-33;google_apis;x86_64"
```

2. **Hardware Graphics**
- Device Manager → Edit AVD
- Graphics: Hardware - GLES 2.0

3. **Reduzir RAM do emulador**
- Edit AVD → Advanced
- RAM: 2048 MB (não mais que metade da RAM do PC)

4. **Fechar apps pesados**
- Chrome, Docker, VS Code consomem muita RAM

5. **Habilitar Cold Boot Off**
- AVD → Boot option: Quick Boot
- Salva estado ao fechar (startup mais rápido)

**Verificação:**
- [ ] Emulador inicia em < 1min
- [ ] Animações fluidas (60fps)

---

## Runtime Crashes

### ❌ App Crasha ao Abrir (White Screen)

**Sintomas:**
- App abre, tela branca, fecha sozinho

**Debugar:**
```bash
# Android
adb logcat | findstr "chromium\|Capacitor"

# Ou Chrome DevTools
chrome://inspect → Inspect → Console
```

**Causas Comuns:**

1. **Environment variables faltando**
```typescript
// Validação mostra erro
throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
```

**Solução:** Ver [ENV_VARS.md](./ENV_VARS.md)

2. **JavaScript error no startup**
```javascript
// Console
Uncaught ReferenceError: supabase is not defined
```

**Solução:** Verificar imports, inicialização de libs

3. **Plugins Capacitor sem permissões**
```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.INTERNET" />
```

**Solução:** Adicionar permissões necessárias

**Verificação:**
- [ ] Console mostra erro específico
- [ ] Environment vars configuradas
- [ ] Permissões adicionadas

---

### ❌ App Funciona na Web, Crasha no Mobile

**Causa:** Código usa APIs browser não disponíveis no mobile.

**Exemplo:**
```typescript
// ❌ Não funciona no mobile
window.scrollTo(0, 0)  // Pode não existir em WebView

// ✅ Funciona
if (typeof window !== 'undefined' && window.scrollTo) {
  window.scrollTo(0, 0)
}
```

**Solução:**
- Detectar plataforma: `Capacitor.isNativePlatform()`
- Usar plugins Capacitor para features nativas
- Testar sempre no mobile após web

---

### ❌ "Network Error" / API Calls Falham

**Sintomas:**
```
Error: Network request failed
```

**Causas:**

1. **HTTP em vez de HTTPS**
```typescript
// ❌ Bloqueado no mobile
fetch('http://api.example.com/data')

// ✅ Permitido
fetch('https://api.example.com/data')
```

**Solução:** Use apenas HTTPS em produção

2. **CORS**
```
Access-Control-Allow-Origin header missing
```

**Solução:** Backend deve incluir headers CORS

3. **Cleartext traffic bloqueado (Android)**

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<application
  android:usesCleartextTraffic="true">  <!-- Apenas DEV! -->
</application>
```

**IMPORTANTE:** Remover `usesCleartextTraffic` em produção!

---

## Performance Issues

### ❌ App Lento/Travando

**Diagnóstico:**
```bash
# Chrome DevTools
chrome://inspect → Inspect → Performance

# Gravar profile por 5-10s durante uso
# Analisar:
# - Scripting time (JavaScript)
# - Rendering time
# - Memory usage
```

**Otimizações:**

1. **Listas longas** (chat com 100+ mensagens)
```typescript
// ❌ Renderiza tudo
{messages.map(msg => <Message key={msg.id} {...msg} />)}

// ✅ Virtualização (react-window)
import { FixedSizeList } from 'react-window'

<FixedSizeList
  height={600}
  itemCount={messages.length}
  itemSize={80}
>
  {({ index, style }) => (
    <div style={style}>
      <Message {...messages[index]} />
    </div>
  )}
</FixedSizeList>
```

2. **Imagens não otimizadas**
```typescript
// ✅ Lazy loading
<img loading="lazy" src="..." alt="..." />

// ✅ Compressão (use WebP)
// ✅ Redimensionar (não carregar 4K para thumbnail)
```

3. **Re-renders desnecessários**
```typescript
// ✅ Memoização
const MemoizedComponent = React.memo(MyComponent)

// ✅ useMemo para computações pesadas
const expensiveValue = useMemo(() => computeExpensiveValue(data), [data])
```

---

### ❌ Memory Leak

**Sintomas:**
- App fica lento após uso prolongado
- Crash após 10-15min

**Causas:**
```typescript
// ❌ Listener não removido
useEffect(() => {
  window.addEventListener('resize', handleResize)
  // Esqueceu cleanup!
}, [])

// ✅ Com cleanup
useEffect(() => {
  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)
}, [])
```

**Debugar:**
- Chrome DevTools → Memory → Take Heap Snapshot
- Comparar antes/depois de usar feature
- Procurar "Detached DOM nodes"

---

## Capacitor Plugins

### ❌ Plugin Não Funciona

**Erro:**
```
Camera plugin is not implemented on web
```

**Causa:** Plugin requer implementação nativa.

**Solução:**
```typescript
import { Capacitor } from '@capacitor/core'

if (Capacitor.isNativePlatform()) {
  // Usar plugin nativo
  const photo = await Camera.getPhoto(...)
} else {
  // Fallback web
  alert('Câmera disponível apenas no app mobile')
}
```

---

### ❌ "Permission Denied"

**Erro:**
```
Camera permission denied
```

**Causa:** Permissão não declarada no manifest.

**Solução (Android):**
```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

**Solução (iOS):**
```xml
<!-- ios/App/App/Info.plist -->
<key>NSCameraUsageDescription</key>
<string>We need camera access to take photos</string>
```

Rebuild após adicionar permissões:
```bash
npx cap sync
```

---

## iOS Specific (macOS)

### ❌ CocoaPods Install Falha

**Erro:**
```
[!] Unable to find a specification for dependency
```

**Solução:**
```bash
cd ios/App
pod repo update
pod install --repo-update
```

---

### ❌ "Command PhaseScriptExecution failed"

**Erro durante build Xcode:**
```
Command PhaseScriptExecution failed with a nonzero exit code
```

**Solução:**
```bash
# Xcode
Product → Clean Build Folder (Cmd + Shift + K)
Product → Build (Cmd + B)
```

---

### ❌ Signing Error

**Erro:**
```
Signing for "App" requires a development team
```

**Solução:**
1. Xcode → Signing & Capabilities
2. Team: Selecionar sua conta Apple
3. Bundle Identifier: Alterar para único (ex: `com.yourname.chatbot`)

---

## Network & API

### ❌ Supabase "Failed to fetch"

**Erro:**
```
Error: Failed to fetch
```

**Debugar:**
```typescript
// Adicionar logging
const supabase = createClient(url, key)

// Testar conexão
const { data, error } = await supabase.from('test').select('*').limit(1)
console.log('Supabase test:', { data, error })
```

**Causas:**
1. **Environment vars erradas** → Ver [ENV_VARS.md](./ENV_VARS.md)
2. **RLS bloqueando** → Verificar policies no Supabase Dashboard
3. **Internet offline** → Verificar conectividade

---

### ❌ CORS Error

**Erro:**
```
Access to fetch at 'https://api.example.com' has been blocked by CORS policy
```

**Causa:** Backend não retorna headers CORS.

**Solução (Backend):**
```typescript
// Next.js API route
export async function GET(request: Request) {
  return NextResponse.json({ data: '...' }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}
```

---

## Quick Reference Table

| Problema | Comando/Ação Rápida |
|----------|---------------------|
| Build Next.js falha | `Remove-Item -Recurse .next, out; npm run build:mobile` |
| Gradle sync falha | Android Studio → File → Invalidate Caches |
| Env vars undefined | Verificar [ENV_VARS.md](./ENV_VARS.md), rebuild |
| Device não detectado | `adb kill-server && adb start-server` |
| Emulador lento | Usar x86_64, Graphics: Hardware |
| App crasha | `adb logcat \| findstr Capacitor` ou `chrome://inspect` |
| Mudanças não aparecem | `npm run build:mobile && npm run cap:sync` |
| ANDROID_HOME não configurado | `[System.Environment]::SetEnvironmentVariable('ANDROID_HOME', 'C:\Users\...\Sdk', 'User')` |
| Plugin não funciona | Adicionar permissões no AndroidManifest.xml, `npx cap sync` |
| Memory leak | Adicionar cleanup em `useEffect(() => { return () => cleanup() })` |

---

## Precisa de Mais Ajuda?

1. **Problemas de setup**: [SETUP.md](./SETUP.md)
2. **Environment variables**: [ENV_VARS.md](./ENV_VARS.md)
3. **Testing**: [TESTING.md](./TESTING.md)
4. **Development workflow**: [DEVELOPMENT.md](./DEVELOPMENT.md)

**Logs sempre ajudam:**
```bash
# Android
adb logcat > logs.txt

# Anexar logs.txt quando reportar issues
```

---

**Path do Projeto**: `C:\Users\pedro\OneDrive\Área de Trabalho\ChatBot-Oficial\ChatBot-Oficial`

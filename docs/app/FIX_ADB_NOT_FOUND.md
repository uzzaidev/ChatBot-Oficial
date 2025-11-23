# Como Resolver: "adb não é reconhecido"

## ⚠️ Problema

O comando `adb` não está no PATH do Windows, então o PowerShell não encontra o executável.

---

## ✅ Solução 1: Encontrar Caminho do ADB (Rápido)

O `adb` geralmente está instalado com o Android Studio. Vamos encontrar:

### Passo 1: Localizar Android SDK

O Android SDK geralmente está em um destes locais:

```
C:\Users\pedro\AppData\Local\Android\Sdk\platform-tools\adb.exe
C:\Program Files\Android\Android Studio\platform-tools\adb.exe
C:\Android\Sdk\platform-tools\adb.exe
```

### Passo 2: Verificar se Existe

No PowerShell, teste:

```powershell
# Tentar caminho mais comum
Test-Path "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"

# Se retornar True, usar este caminho
```

---

## ✅ Solução 2: Usar Caminho Completo (Imediato)

Se você souber onde está o Android SDK, use o caminho completo:

```powershell
# Substitua pelo caminho correto do seu sistema
& "C:\Users\pedro\AppData\Local\Android\Sdk\platform-tools\adb.exe" shell am start -a android.intent.action.VIEW -d "chatbot://chat/123" com.chatbot.app
```

---

## ✅ Solução 3: Adicionar ao PATH (Permanente)

### Passo 1: Encontrar Caminho do ADB

```powershell
# Verificar caminho comum
$adbPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools"
if (Test-Path "$adbPath\adb.exe") {
    Write-Host "ADB encontrado em: $adbPath"
} else {
    Write-Host "ADB não encontrado. Procure manualmente em:"
    Write-Host "  - $env:LOCALAPPDATA\Android\Sdk\platform-tools"
    Write-Host "  - C:\Program Files\Android\Android Studio\platform-tools"
}
```

### Passo 2: Adicionar ao PATH (Temporário - Esta Sessão)

```powershell
# Adicionar ao PATH apenas nesta sessão do PowerShell
$env:Path += ";$env:LOCALAPPDATA\Android\Sdk\platform-tools"

# Testar
adb version
```

### Passo 3: Adicionar ao PATH (Permanente)

```powershell
# Adicionar permanentemente ao PATH do usuário
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
$adbPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools"
if ($currentPath -notlike "*$adbPath*") {
    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$adbPath", "User")
    Write-Host "ADB adicionado ao PATH. Feche e reabra o PowerShell."
} else {
    Write-Host "ADB já está no PATH."
}
```

**Importante:** Feche e reabra o PowerShell após adicionar ao PATH.

---

## ✅ Solução 4: Usar Android Studio (Mais Fácil)

Se você já tem o Android Studio aberto:

1. **No Android Studio:**
   - Tools → Device Manager
   - Iniciar emulador (se não estiver rodando)

2. **Testar Deep Link via Android Studio:**
   - Run app normalmente
   - Deep linking será testado quando app estiver rodando

3. **Ou usar Terminal do Android Studio:**
   - View → Tool Windows → Terminal
   - O terminal do Android Studio já tem `adb` no PATH

---

## ✅ Solução 5: Script Automático (Recomendado)

Criar um script que encontra o `adb` automaticamente:

```powershell
# Salvar como: scripts\test-deep-link-ps.ps1

# Tentar encontrar adb em locais comuns
$adbPaths = @(
    "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe",
    "$env:ProgramFiles\Android\Android Studio\platform-tools\adb.exe",
    "C:\Android\Sdk\platform-tools\adb.exe"
)

$adb = $null
foreach ($path in $adbPaths) {
    if (Test-Path $path) {
        $adb = $path
        break
    }
}

if (-not $adb) {
    Write-Host "ERRO: adb não encontrado!"
    Write-Host "Por favor, encontre o caminho do Android SDK e adicione ao PATH"
    exit 1
}

# Usar adb encontrado
$url = "chatbot://chat/123"
& $adb shell am start -a android.intent.action.VIEW -d $url com.chatbot.app
```

---

## 🧪 Teste Rápido

Depois de resolver, teste:

```powershell
# Verificar se adb funciona
adb devices

# Deve mostrar:
# List of devices attached
# emulator-5554    device
```

---

## 💡 Dica: Usar Android Studio Terminal

**A forma mais fácil:** Use o terminal integrado do Android Studio:

1. Android Studio → View → Tool Windows → Terminal
2. O terminal já tem `adb` configurado
3. Executar comandos normalmente

---

## 📝 Próximos Passos

Após resolver o problema do `adb`:

1. Testar deep linking
2. Continuar para Push Notifications
3. Ou voltar para Assets

---

**Path do Projeto**: `C:\Users\pedro\OneDrive\Área de Trabalho\ChatBot-Oficial\ChatBot-Oficial`


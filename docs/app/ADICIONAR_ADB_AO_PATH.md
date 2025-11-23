# Como Adicionar ADB ao PATH (Solução Permanente)

## ✅ Solução Rápida (Esta Sessão)

Execute no PowerShell (já feito nesta sessão):

```powershell
$env:Path += ";$env:LOCALAPPDATA\Android\Sdk\platform-tools"
```

**Funciona apenas nesta sessão do PowerShell.** Feche e reabra, precisa executar novamente.

---

## ✅ Solução Permanente (Recomendado)

### Método 1: Via PowerShell (Automático)

Execute no PowerShell **como Administrador**:

```powershell
# Adicionar permanentemente ao PATH do usuário
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
$adbPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools"

if ($currentPath -notlike "*$adbPath*") {
    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$adbPath", "User")
    Write-Host "✅ ADB adicionado ao PATH permanentemente!" -ForegroundColor Green
    Write-Host "⚠️ Feche e reabra o PowerShell para aplicar." -ForegroundColor Yellow
} else {
    Write-Host "✅ ADB já está no PATH." -ForegroundColor Green
}
```

**Importante:** Feche e reabra o PowerShell após executar.

### Método 2: Via Interface Gráfica (Manual)

1. Pressione `Win + R`
2. Digite: `sysdm.cpl` → Enter
3. Aba **Advanced** → **Environment Variables**
4. Em **User variables**, edite **Path**
5. Clique **New** e adicione:
   ```
   C:\Users\pedro\AppData\Local\Android\Sdk\platform-tools
   ```
6. Clique **OK** em todas as janelas
7. **Feche e reabra** o PowerShell

---

## 🧪 Verificar se Funcionou

Após fechar e reabrir o PowerShell:

```powershell
# Verificar versão
adb --version

# Deve mostrar:
# Android Debug Bridge version 1.0.41
```

---

## 💡 Alternativa: Usar Script PowerShell

Use o script que criamos - ele encontra o `adb` automaticamente:

```powershell
# Testar deep link (script encontra adb automaticamente)
.\scripts\test-deep-link-ps.ps1 -Type chat -Param 123
```

---

## 📝 Próximos Passos

Após adicionar ao PATH:

1. ✅ Testar deep linking
2. 🔔 Continuar para Push Notifications
3. 🎨 Ou voltar para Assets

---

**Path do Projeto**: `C:\Users\pedro\OneDrive\Área de Trabalho\ChatBot-Oficial\ChatBot-Oficial`


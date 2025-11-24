# 📱 Como Ver Logs do Android para Debug

## 🎯 Método 1: Android Studio (Mais Fácil)

1. Abra Android Studio
2. Com o app rodando no emulador/device
3. Aba inferior: **"Logcat"**
4. Filtre por: `com.chatbot.app`
5. Clique em "Base de Conhecimento" no app
6. Veja os logs aparecerem em tempo real

## 🎯 Método 2: Terminal (ADB)

### Passo 1: Conectar Device
```powershell
# Verificar devices conectados
adb devices

# Se não aparecer, conecte device ou inicie emulador
```

### Passo 2: Ver Logs do App
```powershell
# Limpar logs antigos
adb logcat -c

# Ver apenas logs do app
adb logcat | Select-String "com.chatbot.app"
```

### Passo 3: Ver Logs de Erro
```powershell
# Ver apenas erros
adb logcat *:E | Select-String "com.chatbot.app"
```

### Passo 4: Ver Logs de Autenticação
```powershell
# Ver logs relacionados a auth
adb logcat | Select-String "auth|Auth|session|logout|middleware|profile"
```

## 🎯 Método 3: Script Automático

```powershell
# Usar o script criado
powershell -ExecutionPolicy Bypass -File scripts/debug-android-logs.ps1

# Escolher opção 4 (Limpar e monitorar em tempo real)
# Depois clicar em "Base de Conhecimento" no app
```

## 🔍 O que Procurar nos Logs

Quando clicar em "Base de Conhecimento", procure por:

1. **Erros de rota:**
   - `404` ou `Not Found`
   - `/dashboard/knowledge`

2. **Erros de autenticação:**
   - `SIGNED_OUT`
   - `TOKEN_REFRESHED`
   - `Profile não encontrado`
   - `middleware`

3. **Erros de API:**
   - `401 Unauthorized`
   - `403 Forbidden`
   - `500 Internal Server Error`

4. **Erros de JavaScript:**
   - `Error:`
   - `TypeError:`
   - `Cannot read property`

## 💡 Dica

**Melhor método:** Use Android Studio Logcat (Método 1) - é mais visual e fácil de filtrar.


# Como Testar Biometric Auth em Android (Sem Deploy em Produção)

## 🎯 Objetivo

Testar autenticação biométrica (FaceID/TouchID) em um device Android físico **sem precisar fazer deploy em produção**.

---

## ⚠️ Importante

**Biometria NÃO funciona em emulador!** É necessário testar em um **device físico** com sensor biométrico (impressão digital ou face unlock).

---

## 📋 Pré-requisitos

1. **Device Android físico** com:
   - Sensor biométrico configurado (impressão digital ou face unlock)
   - Modo desenvolvedor habilitado
   - Depuração USB habilitada

2. **Cabo USB** para conectar device ao computador

3. **Android Studio** instalado (já temos)

---

## 🚀 Opção 1: Testar via Android Studio (Recomendado)

### Passo 1: Conectar Device

1. **Conecte o device Android ao computador via USB**
2. **No device:** Aceite a permissão "Permitir depuração USB" (se aparecer)
3. **Verificar conexão:**
   ```bash
   adb devices
   ```
   
   **Resultado esperado:**
   ```
   List of devices attached
   ABC123XYZ    device
   ```
   
   Se aparecer `unauthorized`, aceite a permissão no device.

### Passo 2: Build e Instalar

1. **Build do app mobile:**
   ```bash
   npm run build:mobile
   ```

2. **Sync com Capacitor:**
   ```bash
   npx cap sync android
   ```

3. **Abrir Android Studio:**
   ```bash
   npm run cap:open:android
   ```

4. **No Android Studio:**
   - Selecione seu device no dropdown (topo da tela)
   - Clique no botão **Run** (▶️) ou pressione `Shift + F10`
   - O app será instalado e aberto automaticamente no device

### Passo 3: Testar Biometria

1. **Abrir o app no device**
2. **Fazer primeiro login** (email/senha)
3. **Após login bem-sucedido:**
   - Deve aparecer prompt: "Deseja habilitar login com biometria?"
   - Clicar em **"Sim, habilitar"**
4. **Fechar o app completamente**
5. **Abrir o app novamente:**
   - Deve aparecer botão **"Entrar com Biometria"**
   - Clicar no botão
   - Deve solicitar autenticação biométrica
   - Após autenticar, deve entrar no dashboard

---

## 🚀 Opção 2: Gerar APK de Debug e Instalar Manualmente

### Passo 1: Gerar APK

1. **No Android Studio:**
   - Menu: `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
   - Ou via terminal (dentro do diretório `android`):
     ```bash
     cd android
     ./gradlew assembleDebug
     ```

2. **Localizar APK gerado:**
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```

### Passo 2: Instalar no Device

**Método 1: Via ADB (Recomendado)**
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

**Método 2: Transferir Manualmente**
1. Copiar APK para o device (via USB, email, etc.)
2. No device: Abrir arquivo APK
3. Permitir instalação de fontes desconhecidas (se necessário)
4. Instalar

### Passo 3: Testar

Seguir os mesmos passos da Opção 1 (Passo 3).

---

## 🧪 Cenários de Teste

### ✅ Cenário 1: Primeiro Login (Habilitar Biometria)

1. **Abrir app pela primeira vez**
2. **Fazer login** com email/senha
3. **Após login bem-sucedido:**
   - [ ] Prompt aparece: "Deseja habilitar login com biometria?"
   - [ ] Clicar "Sim, habilitar"
   - [ ] Email é salvo automaticamente
4. **Fechar app completamente**
5. **Abrir app novamente:**
   - [ ] Botão "Entrar com Biometria" aparece
   - [ ] Clicar no botão
   - [ ] Autenticação biométrica é solicitada
   - [ ] Após autenticar, entra no dashboard

### ✅ Cenário 2: Login com Biometria Habilitada

1. **Abrir app** (biometria já habilitada)
2. **Clicar "Entrar com Biometria"**
3. **Autenticar com biometria:**
   - [ ] Autenticação bem-sucedida
   - [ ] Sessão restaurada
   - [ ] Redireciona para dashboard

### ✅ Cenário 3: Biometria Cancelada

1. **Abrir app**
2. **Clicar "Entrar com Biometria"**
3. **Cancelar autenticação biométrica:**
   - [ ] Erro amigável aparece: "Autenticação cancelada"
   - [ ] Formulário de login manual ainda disponível
   - [ ] Pode fazer login normalmente

### ✅ Cenário 4: Sessão Expirada

1. **Abrir app** (sessão expirada)
2. **Verificar:**
   - [ ] Botão de biometria **NÃO** aparece (sessão inválida)
   - [ ] Apenas formulário de login aparece
   - [ ] Login manual funciona normalmente

### ✅ Cenário 5: Biometria Não Disponível

1. **Device sem biometria configurada:**
   - [ ] Botão de biometria **NÃO** aparece
   - [ ] Apenas formulário de login aparece
   - [ ] Login manual funciona normalmente

---

## 🔧 Troubleshooting

### ❌ Device não aparece no `adb devices`

**Solução:**
1. Verificar se cabo USB está conectado
2. Verificar se modo desenvolvedor está habilitado
3. Verificar se depuração USB está habilitada
4. Tentar outro cabo USB
5. Reiniciar ADB:
   ```bash
   adb kill-server
   adb start-server
   adb devices
   ```

### ❌ App não instala no device

**Solução:**
1. Desinstalar versão antiga:
   ```bash
   adb uninstall com.chatbot.app
   ```
2. Tentar instalar novamente

### ❌ Biometria não aparece no app

**Verificar:**
1. Device tem biometria configurada? (Settings → Security → Biometric)
2. App está rodando em device físico (não emulador)?
3. Biometria foi habilitada após primeiro login?

**Debug:**
```bash
# Ver logs do app
adb logcat | grep -i "biometric\|BiometricAuth"
```

### ❌ Erro "Sessão expirada" mesmo após biometria

**Causa:** Sessão do Supabase expirou.

**Solução:**
1. Fazer login manual novamente
2. Habilitar biometria novamente
3. Testar novamente

---

## 📱 Verificar Biometria no Device

### Android

1. **Settings** → **Security** → **Biometric**
2. Verificar se biometria está configurada
3. Se não estiver, configurar:
   - Impressão digital
   - Face unlock (se disponível)

---

## 🎯 Checklist de Testes

- [ ] Device físico conectado via USB
- [ ] Device aparece em `adb devices`
- [ ] App instalado no device
- [ ] Primeiro login funciona
- [ ] Prompt de habilitar biometria aparece
- [ ] Biometria habilitada com sucesso
- [ ] Botão "Entrar com Biometria" aparece
- [ ] Autenticação biométrica funciona
- [ ] Sessão restaurada após biometria
- [ ] Redireciona para dashboard
- [ ] Cancelamento de biometria mostra erro amigável
- [ ] Fallback para login manual funciona
- [ ] Sessão expirada não mostra botão de biometria

---

## 📚 Recursos Adicionais

- **ADB Commands:** https://developer.android.com/tools/adb
- **Android Studio Debug:** https://developer.android.com/studio/debug
- **Plugin Documentation:** https://github.com/aparajita/capacitor-biometric-auth

---

## ✅ Próximos Passos Após Testes

1. Se tudo funcionar: ✅ Pronto para produção
2. Se houver problemas: Reportar e corrigir
3. Documentar resultados dos testes

---

**Status:** 🟡 Aguardando testes em device físico

**Última atualização:** 2025-11-23


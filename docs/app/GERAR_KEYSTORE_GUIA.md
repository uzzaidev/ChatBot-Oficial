# Guia: Gerar Keystore para Play Store

## ⚠️ IMPORTANTE

**O keystore é PERMANENTE!** Se você perder o keystore ou esquecer a senha, **NÃO poderá atualizar o app na Play Store**. Faça backup seguro!

---

## 📋 Passo 1: Gerar Keystore

Execute o comando abaixo no terminal (na raiz do projeto):

```bash
keytool -genkey -v -keystore android/app/release.keystore -alias chatbot -keyalg RSA -keysize 2048 -validity 10000
```

### Informações que você precisará fornecer:

1. **Password do keystore:** (ANOTE EM LUGAR SEGURO!)
   - Escolha uma senha forte
   - Você precisará dela toda vez que fizer build de release
   - **NÃO ESQUEÇA!**

2. **Re-enter password:** (mesma senha)

3. **What is your first and last name?**
   - Exemplo: `Uzz.AI` ou `UzzApp`

4. **What is the name of your organizational unit?**
   - Exemplo: `Development` ou `Technology`

5. **What is the name of your organization?**
   - Exemplo: `Uzz.AI` ou `UzzAi`

6. **What is the name of your City or Locality?**
   - Exemplo: `Caxias do Sul` ou `Porto Alegre`

7. **What is the name of your State or Province?**
   - Exemplo: `Rio Grande do Sul` ou `RS`

8. **What is the two-letter country code?**
   - Digite: `BR`

9. **Is CN=... correct?**
   - Digite: `yes`

### Resultado Esperado

```
Generating 2,048 bit RSA key pair and self-signed certificate (SHA256withRSA) with a validity of 10,000 days
    for: CN=UzzApp, OU=Development, O=Uzz.AI, L=Caxias do Sul, ST=RS, C=BR
[Storing android/app/release.keystore]
```

Arquivo criado: `android/app/release.keystore`

---

## 📋 Passo 2: Fazer Backup do Keystore

**CRÍTICO:** Faça backup imediatamente!

```bash
# Windows PowerShell
Copy-Item android\app\release.keystore C:\Backup\uzzapp-release.keystore

# Ou salvar em:
# - Google Drive (criptografado)
# - Dropbox (criptografado)
# - Pendrive seguro
# - Gerenciador de senhas (1Password, LastPass, etc)
```

**Guarde também:**
- Senha do keystore
- Alias: `chatbot`
- Localização do arquivo

---

## 📋 Passo 3: Configurar build.gradle

O `build.gradle` já está configurado para usar `release.properties` (mais seguro).

Você só precisa criar o arquivo `android/release.properties`:

```properties
storeFile=app/release.keystore
storePassword=SUA_SENHA_AQUI
keyAlias=chatbot
keyPassword=SUA_SENHA_AQUI
```

**⚠️ IMPORTANTE:** Este arquivo **NÃO** será commitado no git (já está no .gitignore).

---

## 📋 Passo 4: Verificar .gitignore

Certifique-se de que o `.gitignore` inclui:

```
# Android Keystore
*.keystore
release.properties
```

---

## ✅ Próximos Passos

Após gerar o keystore e criar `release.properties`:

1. **Testar build release:**
   ```bash
   npm run build:mobile:prd
   cd android
   ./gradlew bundleRelease
   ```

2. **Verificar AAB gerado:**
   ```bash
   dir android\app\build\outputs\bundle\release\app-release.aab
   ```

3. **Fazer backup do keystore** (se ainda não fez)

---

## 🆘 Troubleshooting

### Erro: "keytool não é reconhecido"

**Solução:** O `keytool` vem com o Java JDK. Se não estiver no PATH:

1. Encontrar localização do Java:
   ```bash
   where java
   ```

2. Usar caminho completo:
   ```bash
   "C:\Program Files\Java\jdk-XX\bin\keytool.exe" -genkey ...
   ```

### Erro: "Keystore was tampered with, or password was incorrect"

**Causa:** Senha incorreta.

**Solução:** Verificar senha ou gerar novo keystore (se ainda não publicou na Play Store).

---

**Status:** Aguardando geração do keystore pelo usuário

**Última atualização:** 2025-11-23


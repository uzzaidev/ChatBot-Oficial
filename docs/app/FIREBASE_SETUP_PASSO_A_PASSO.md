# Firebase Setup - Passo a Passo Detalhado

Guia visual e detalhado para configurar Firebase para Push Notifications.

---

## 📋 Pré-requisitos

- ✅ Conta Google (Gmail)
- ✅ Acesso à internet
- ✅ 15-30 minutos

---

## 🚀 Passo 1: Criar Projeto Firebase

### 1.1 Acessar Firebase Console

1. Abra seu navegador
2. Acesse: **https://console.firebase.google.com/**
3. Faça login com sua conta Google (se necessário)

### 1.2 Criar Novo Projeto

1. **Clique no botão:** `Add project` ou `Criar um projeto`
   
2. **Nome do Projeto:**
   - Digite: `UzzApp` (ou `Uzz.Ai` - nome da empresa)
   - Clique `Continue` / `Continuar`

3. **Google Analytics:**
   - ⚠️ **IMPORTANTE:** Para Push Notifications, Analytics é **opcional**
   - Você pode desabilitar (não é necessário)
   - Se quiser habilitar, pode deixar marcado
   - Clique `Continue` / `Continuar`

4. **Aguardar Criação:**
   - Firebase vai criar o projeto (1-2 minutos)
   - Quando aparecer "Your project is ready", clique `Continue` / `Continuar`

---

## 📱 Passo 2: Adicionar App Android

### 2.1 Acessar Tela de Adicionar App

1. No Firebase Console, você verá uma tela com ícones:
   - **Web** (</>)
   - **Android** (🤖)
   - **iOS** (🍎)
   - **Unity** (🎮)

2. **Clique no ícone Android** (🤖)

### 2.2 Configurar App Android

1. **Android package name:**
   - ⚠️ **CRÍTICO:** Digite exatamente: `com.chatbot.app`
   - **NÃO** adicione espaços ou caracteres extras
   - Este nome DEVE ser igual ao `applicationId` no `android/app/build.gradle`

2. **App nickname (optional):**
   - Digite: `UzzApp Android` (opcional, pode deixar vazio)

3. **Debug signing certificate SHA-1:**
   - ⚠️ **Deixe vazio por enquanto**
   - Não é necessário para Push Notifications básico
   - Pode adicionar depois se precisar

4. **Clique:** `Register app` / `Registrar app`

---

## 📥 Passo 3: Baixar google-services.json

### 3.1 Baixar Arquivo

1. Após registrar o app, Firebase vai mostrar uma tela com:
   - Instruções para baixar `google-services.json`
   - Um botão: `Download google-services.json`

2. **Clique no botão:** `Download google-services.json`

3. O arquivo será baixado para sua pasta **Downloads**

### 3.2 Mover Arquivo para o Projeto

**Opção 1: Via PowerShell (Recomendado)**

1. Abra PowerShell no diretório do projeto
2. Execute:
   ```powershell
   # Verificar se arquivo foi baixado
   Test-Path ~/Downloads/google-services.json
   # Deve retornar: True
   
   # Mover arquivo para android/app/
   Move-Item ~/Downloads/google-services.json android/app/
   
   # Verificar se arquivo está no lugar certo
   Test-Path android/app/google-services.json
   # Deve retornar: True
   ```

**Opção 2: Manual (Arrastar e Soltar)**

1. Abra o Windows Explorer
2. Vá para: `C:\Users\pedro\Downloads`
3. Localize: `google-services.json`
4. Arraste e solte em: `C:\Users\pedro\OneDrive\Área de Trabalho\ChatBot-Oficial\ChatBot-Oficial\android\app\`

### 3.3 Verificar Arquivo

```powershell
# No PowerShell, no diretório do projeto
Get-Item android/app/google-services.json
# Deve mostrar informações do arquivo
```

---

## ✅ Verificação Final

Após completar os passos acima, você deve ter:

- ✅ Projeto Firebase criado
- ✅ App Android registrado (package: `com.chatbot.app`)
- ✅ Arquivo `google-services.json` em `android/app/`

---

## 🐛 Troubleshooting

### ❌ Erro: "Package name already exists"

**Causa:** Já existe um app com esse package name no Firebase.

**Solução:**
- Use um package name diferente (ex: `com.chatbot.app.dev`)
- OU delete o app existente no Firebase Console

---

### ❌ Arquivo não encontrado em Downloads

**Causa:** Arquivo foi baixado em outro local.

**Solução:**
1. Verificar pasta Downloads padrão do navegador
2. Procurar por `google-services.json` no Windows Explorer
3. Verificar configurações de download do navegador

---

### ❌ Não consigo encontrar o botão "Add project"

**Causa:** Você já está em um projeto existente.

**Solução:**
1. Clique no nome do projeto no topo esquerdo
2. Selecione "Add project" / "Criar um projeto"

---

## 📝 Próximo Passo

Após completar a configuração do Firebase:

1. ✅ Verificar se `google-services.json` está em `android/app/`
2. 🔄 Continuar para: **Passo 2 - Criar Tabela no Supabase**

---

**Dúvidas?** Me avise e eu te ajudo! 😊


# Phase 3.2: Deep Linking - Quick Start

Guia prático para implementar deep linking (App Links e Custom URL Scheme) no app mobile.

## 🎯 Objetivo

Permitir abrir o app mobile diretamente de URLs, sem passar pelo browser.

**Exemplos:**
- `chatbot://chat/123` → Abre chat específico
- `https://chat.luisfboff.com/chat/123` → Abre chat específico (App Link)

## ⏱️ Tempo Estimado

**30-60 minutos** (código já implementado, apenas configurar)

---

## ✅ O Que Já Foi Implementado

1. ✅ **Código TypeScript** (`src/lib/deepLinking.ts`)
   - Listeners de deep links
   - Processamento de URLs
   - Navegação automática

2. ✅ **Provider React** (`src/components/DeepLinkingProvider.tsx`)
   - Inicialização automática no app startup

3. ✅ **Integração no Layout** (`src/app/layout.tsx`)
   - Provider já adicionado

4. ✅ **AndroidManifest.xml**
   - Intent-filters para Custom URL Scheme (`chatbot://`)
   - Intent-filters para App Links (`https://chat.luisfboff.com`)

---

## 📋 Checklist de Configuração

### Passo 1: Verificar Código (Já Feito ✅)

O código já está implementado. Verificar:

- [x] `src/lib/deepLinking.ts` existe
- [x] `src/components/DeepLinkingProvider.tsx` existe
- [x] `src/app/layout.tsx` usa `DeepLinkingProvider`
- [x] `android/app/src/main/AndroidManifest.xml` tem intent-filters

### Passo 2: Sync e Rebuild

```bash
# Sync com Capacitor
npx cap sync android

# Rebuild
npm run build:mobile
npm run cap:sync
npm run cap:open:android
```

### Passo 3: Testar Custom URL Scheme (Desenvolvimento)

**Teste mais simples** - não requer configuração de servidor:

```bash
# Via adb (device/emulador conectado)
adb shell am start -a android.intent.action.VIEW -d "chatbot://chat/123" com.chatbot.app
```

**O que deve acontecer:**
- App abre (se não estiver rodando)
- Console mostra: `[Deep Linking] App opened with URL: chatbot://chat/123`
- App navega para `/dashboard/chat/123`

**Verificar no console:**
```bash
# Abrir Chrome DevTools
chrome://inspect

# Procurar logs:
# [Deep Linking] Inicializando listeners...
# [Deep Linking] App opened with URL: chatbot://chat/123
# [Deep Linking] Navegando para chat: 123
```

### Passo 4: Testar App Links (Opcional - Requer Servidor)

**App Links** (`https://chat.luisfboff.com/chat/123`) requer:

1. **Arquivo `assetlinks.json` no servidor:**
   ```
   https://chat.luisfboff.com/.well-known/assetlinks.json
   ```

2. **SHA256 fingerprint do keystore:**
   ```bash
   # Debug keystore (desenvolvimento)
   keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
   
   # Copiar SHA256 fingerprint
   ```

3. **Criar `assetlinks.json`:**
   ```json
   [
     {
       "relation": ["delegate_permission/common.handle_all_urls"],
       "target": {
         "namespace": "android_app",
         "package_name": "com.chatbot.app",
         "sha256_cert_fingerprints": [
           "SEU_SHA256_AQUI"
         ]
       }
     }
   ]
   ```

4. **Upload para servidor:**
   - Colocar em `/.well-known/assetlinks.json`
   - HTTPS obrigatório
   - Content-Type: `application/json`

5. **Adicionar `android:autoVerify="true"` no AndroidManifest:**
   ```xml
   <intent-filter android:autoVerify="true">
   ```

**Nota:** App Links é mais complexo e requer servidor. Para desenvolvimento, use Custom URL Scheme.

---

## 🧪 Testes Disponíveis

### Teste 1: Custom URL Scheme (Chat)

```bash
adb shell am start -a android.intent.action.VIEW -d "chatbot://chat/123" com.chatbot.app
```

**Esperado:**
- App abre
- Navega para `/dashboard/chat/123`

### Teste 2: Custom URL Scheme (Home)

```bash
adb shell am start -a android.intent.action.VIEW -d "chatbot://dashboard" com.chatbot.app
```

**Esperado:**
- App abre
- Navega para `/dashboard`

### Teste 3: App Link (Se configurado)

```bash
adb shell am start -a android.intent.action.VIEW -d "https://chat.luisfboff.com/chat/123" com.chatbot.app
```

**Esperado:**
- App abre (se `assetlinks.json` configurado)
- Navega para `/dashboard/chat/123`

---

## 🔧 Rotas Suportadas

O código processa as seguintes rotas:

| URL | Rota Interna | Descrição |
|-----|--------------|-----------|
| `chatbot://chat/123` | `/dashboard/chat/123` | Abre chat específico |
| `chatbot://dashboard` | `/dashboard` | Abre dashboard |
| `https://chat.luisfboff.com/chat/123` | `/dashboard/chat/123` | App Link (requer config) |
| `https://chat.luisfboff.com/invite/abc` | `/invite/abc` | Convite (se implementado) |

---

## 🐛 Troubleshooting

### ❌ Deep Link Não Funciona

**Sintomas:** App não abre ou não navega.

**Soluções:**

1. **Verificar logs:**
   ```bash
   # Chrome DevTools
   chrome://inspect
   # Procurar logs: [Deep Linking]
   ```

2. **Verificar intent-filter:**
   ```bash
   adb shell dumpsys package com.chatbot.app | findstr -i "filter"
   # Deve mostrar intent-filters configurados
   ```

3. **Reinstalar app:**
   ```bash
   adb uninstall com.chatbot.app
   # Rebuild e reinstalar
   ```

### ❌ App Abre Mas Não Navega

**Causa:** Listener não está registrado ou URL não está sendo processada.

**Solução:**
- Verificar console: deve mostrar `[Deep Linking] Inicializando listeners...`
- Verificar URL: deve estar no formato correto
- Verificar rotas: devem existir no app

### ❌ App Link Mostra Dialog "Abrir com..."

**Causa:** `assetlinks.json` não configurado ou `android:autoVerify` não está no intent-filter.

**Solução:**
- Adicionar `android:autoVerify="true"` no intent-filter
- Configurar `assetlinks.json` no servidor
- Verificar SHA256 fingerprint correto

---

## 📝 Próximos Passos

Após testar deep linking:

1. ✅ Marcar como completo no `plan.md`
2. 🔔 Continuar para **Phase 3.3: Push Notifications**
3. 🎨 Ou voltar para **Phase 3.1: Melhorar Assets** (se precisar de imagens)

---

## 📚 Documentação Completa

Para detalhes avançados, ver:
- [DEEP_LINKING.md](./DEEP_LINKING.md) - Guia completo com iOS, troubleshooting, etc.

---

**Status:** Código implementado ✅ | Configuração pendente ⏳

**Path do Projeto**: `C:\Users\pedro\OneDrive\Área de Trabalho\ChatBot-Oficial\ChatBot-Oficial`


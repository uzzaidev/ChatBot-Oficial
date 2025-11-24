# Phase 3: Guia de Testes Rápido

Guia prático para testar as features implementadas na Phase 3.

## 🧪 Teste 1: Deep Linking (5 minutos)

### Pré-requisitos

- [ ] App buildado e instalado no device/emulador
- [ ] Device/emulador conectado via USB (ou emulador rodando)
- [ ] Chrome DevTools aberto (`chrome://inspect`)

### Passo 1: Verificar App Instalado

```bash
# Verificar se app está instalado
adb shell pm list packages | findstr chatbot

# Deve mostrar: package:com.chatbot.app
```

### Passo 2: Testar Deep Link (Método 1 - Script)

```bash
# Testar abrir chat específico
scripts\test-deep-link.bat chat 123

# Testar abrir dashboard
scripts\test-deep-link.bat dashboard
```

### Passo 3: Testar Deep Link (Método 2 - Manual)

```bash
# Abrir chat específico
adb shell am start -a android.intent.action.VIEW -d "chatbot://chat/123" com.chatbot.app

# Abrir dashboard
adb shell am start -a android.intent.action.VIEW -d "chatbot://dashboard" com.chatbot.app
```

### Passo 4: Verificar Logs

1. Abrir Chrome DevTools: `chrome://inspect`
2. Localizar app na lista
3. Clicar **Inspect**
4. Ir para aba **Console**
5. Procurar logs:
   ```
   [Deep Linking] Inicializando listeners...
   [Deep Linking] App opened with URL: chatbot://chat/123
   [Deep Linking] Navegando para chat: 123
   ```

### ✅ Checklist de Validação

- [ ] App abre quando deep link é enviado
- [ ] Console mostra logs de deep linking
- [ ] App navega para rota correta
- [ ] URL é processada corretamente

### ❌ Troubleshooting

**App não abre:**
- Verificar se app está instalado: `adb shell pm list packages | findstr chatbot`
- Verificar intent-filter: `adb shell dumpsys package com.chatbot.app | findstr -i "filter"`

**App abre mas não navega:**
- Verificar console: deve mostrar `[Deep Linking] Inicializando listeners...`
- Verificar se rota existe no app
- Verificar logs de erro no console

---

## 🎨 Teste 2: Assets (Aguardando Imagens)

**Status:** ⏳ Aguardando `icon.png` e `splash.png` do usuário

Quando tiver as imagens:

1. Colocar na raiz: `icon.png` (1024x1024) e `splash.png` (2732x2732)
2. Gerar assets: `npx @capacitor/assets generate`
3. Rebuild: `npm run build:mobile && npm run cap:sync`
4. Testar no device

Ver: [PHASE3_ASSETS_QUICKSTART.md](./PHASE3_ASSETS_QUICKSTART.md)

---

## 🔔 Teste 3: Push Notifications (Próximo)

**Status:** ⏳ Pendente - Requer Firebase setup

Quando implementar:

1. Configurar Firebase
2. Instalar plugin: `npm install @capacitor/push-notifications`
3. Configurar permissões
4. Testar no device físico

Ver: [PUSH_NOTIFICATIONS.md](./PUSH_NOTIFICATIONS.md)

---

## 📊 Resumo de Status

| Feature | Status | Tempo | Próximo Passo |
|---------|--------|-------|---------------|
| Deep Linking | ✅ Implementado | 5 min | Testar com `adb` |
| Assets | ⏳ Aguardando | 15-30 min | Obter imagens |
| Push Notifications | ⏳ Pendente | 2-4 horas | Firebase setup |

---

**Path do Projeto**: `C:\Users\pedro\OneDrive\Área de Trabalho\ChatBot-Oficial\ChatBot-Oficial`


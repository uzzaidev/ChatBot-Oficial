# Como Enviar Notificação de Teste no Firebase

Guia passo a passo para enviar uma notificação push de teste.

---

## 📍 Passo 1: Acessar Cloud Messaging

### No Firebase Console:

1. **No menu lateral esquerdo**, procure por:
   - **"Executar"** (Execute) - categoria de produtos
   - Clique para expandir (seta para baixo)

2. **Dentro de "Executar"**, você verá:
   - **Cloud Messaging** ← **CLIQUE AQUI**
   - (Pode aparecer como "FCM" ou "Cloud Messaging")

**Caminho visual:**
```
Firebase Console
  └─ Executar (Execute)
     └─ Cloud Messaging ← CLIQUE AQUI
```

---

## 📤 Passo 2: Enviar Notificação de Teste

### Opção 1: Send test message (Mais fácil)

1. **Na página do Cloud Messaging**, procure por:
   - Botão **"Send test message"** / **"Enviar mensagem de teste"**
   - Ou **"Send your first message"** / **"Enviar sua primeira mensagem"**

2. **Se não encontrar**, procure por:
   - Aba **"Send test message"** no topo
   - Ou card com título **"Test your notification"**

### Opção 2: New notification (Alternativa)

1. Clique em **"New notification"** / **"Nova notificação"**
2. Preencha os campos:
   - **Notification title**: `Teste Push`
   - **Notification text**: `Esta é uma notificação de teste`
3. Clique em **"Send test message"** (não em "Send" ainda)

---

## 🔑 Passo 3: Copiar Token do Supabase

1. **No Supabase Dashboard:**
   - Table Editor → `push_tokens`
   - Copie o valor da coluna **`token`**
   - Exemplo: `ca8tSH2CS7ufYnF4uXY97v:APA91bGYIPa...`

2. **No Firebase:**
   - Cole o token no campo **"FCM registration token"**
   - Ou **"Add an FCM registration token"**

---

## ✅ Passo 4: Enviar e Testar

1. **Preencher campos:**
   - **FCM registration token**: (token do Supabase)
   - **Notification title**: `Teste Push`
   - **Notification text**: `Esta é uma notificação de teste`

2. **Clicar em "Test"** / **"Testar"**

3. **No device/emulador:**
   - Notificação deve aparecer
   - Se app estiver aberto: aparece no topo
   - Se app estiver fechado: aparece na barra de notificações

---

## 🐛 Se Não Encontrar Cloud Messaging

### Alternativa 1: Buscar no Menu

1. No topo do Firebase Console, há uma **barra de busca**
2. Digite: **"Cloud Messaging"** ou **"FCM"**
3. Clique no resultado

### Alternativa 2: Via URL Direta

1. URL direta (ajuste o PROJECT_ID):
   ```
   https://console.firebase.google.com/project/SEU_PROJECT_ID/notification
   ```

2. Ou:
   ```
   https://console.firebase.google.com/project/SEU_PROJECT_ID/messaging
   ```

---

## 📱 Teste Completo

### Cenário 1: App Aberto
1. App deve estar rodando
2. Enviar notificação
3. Deve aparecer no topo da tela

### Cenário 2: App Fechado
1. **Fechar app completamente** (swipe up no Android)
2. Enviar notificação
3. Deve aparecer na barra de notificações
4. Clicar na notificação → App abre

---

## ✅ Verificação de Sucesso

**Se funcionou, você verá:**
- ✅ Notificação aparece no device
- ✅ Console mostra: `[Push Notifications] Notificação recebida`
- ✅ Clicar na notificação abre o app

**Se não funcionou:**
- Verificar se token está correto
- Verificar se app tem permissão de notificações
- Verificar console do app (logs de erro)

---

**Dúvidas?** Me avise! 😊


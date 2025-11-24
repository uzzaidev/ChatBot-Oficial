# Como Enviar Notificação de Teste - Métodos Alternativos

A interface do Firebase Console mudou. Aqui estão métodos alternativos para enviar notificações de teste.

---

## 🔧 Método 1: Via Firebase CLI (Mais Confiável)

### Instalar Firebase CLI

```bash
npm install -g firebase-tools
```

### Login no Firebase

```bash
firebase login
```

### Enviar Notificação de Teste

```bash
# Substitua PROJECT_ID e TOKEN
firebase messaging:send \
  --project SEU_PROJECT_ID \
  --token "SEU_TOKEN_DO_SUPABASE" \
  --notification-title "Teste Push" \
  --notification-body "Esta é uma notificação de teste"
```

---

## 🔧 Método 2: Via cURL (HTTP API)

### Obter Server Key do Firebase

1. Firebase Console → **Project Settings** (⚙️)
2. Aba **"Cloud Messaging"**
3. Seção **"Cloud Messaging API (Legacy)"**
4. Copiar **"Server key"**

### Enviar via cURL

```bash
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=SUA_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "SEU_TOKEN_DO_SUPABASE",
    "notification": {
      "title": "Teste Push",
      "body": "Esta é uma notificação de teste"
    }
  }'
```

---

## 🔧 Método 3: Via Postman ou Insomnia

### Configurar Request

**URL:**
```
POST https://fcm.googleapis.com/fcm/send
```

**Headers:**
```
Authorization: key=SUA_SERVER_KEY
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "to": "SEU_TOKEN_DO_SUPABASE",
  "notification": {
    "title": "Teste Push",
    "body": "Esta é uma notificação de teste"
  }
}
```

---

## 🔧 Método 4: Criar Campanha no Firebase (Interface Nova)

1. **Na página de Messaging**, clique em:
   - **"Crie sua primeira campanha"** (botão azul)
   - Ou **"New notification"**

2. **Preencher:**
   - **Notification title**: `Teste Push`
   - **Notification text**: `Esta é uma notificação de teste`

3. **Target:**
   - Selecionar **"Test message"** ou **"Single device"**
   - Colar o token do Supabase

4. **Enviar**

---

## 📋 Passo a Passo Simplificado (Recomendado)

### 1. Obter Server Key

1. Firebase Console → **⚙️ Project Settings**
2. Aba **"Cloud Messaging"**
3. Seção **"Cloud Messaging API (Legacy)"**
4. Copiar **"Server key"**

### 2. Copiar Token do Supabase

1. Supabase → Table Editor → `push_tokens`
2. Copiar valor da coluna `token`

### 3. Usar Script PowerShell

Criar arquivo `test-push.ps1`:

```powershell
$serverKey = "SUA_SERVER_KEY_AQUI"
$token = "SEU_TOKEN_DO_SUPABASE_AQUI"

$body = @{
    to = $token
    notification = @{
        title = "Teste Push"
        body = "Esta é uma notificação de teste"
    }
} | ConvertTo-Json

$headers = @{
    "Authorization" = "key=$serverKey"
    "Content-Type" = "application/json"
}

Invoke-RestMethod -Uri "https://fcm.googleapis.com/fcm/send" -Method Post -Headers $headers -Body $body
```

### 4. Executar

```powershell
.\test-push.ps1
```

---

## ✅ Verificação

**Se funcionou:**
- ✅ Notificação aparece no device
- ✅ Console mostra: `[Push Notifications] Notificação recebida`

**Se não funcionou:**
- Verificar se Server Key está correto
- Verificar se token está correto
- Verificar se app tem permissão de notificações

---

**Qual método você prefere usar?** Recomendo o Método 2 (cURL) ou Método 4 (Interface do Firebase).


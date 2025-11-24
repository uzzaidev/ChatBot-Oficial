# Firebase Cloud Messaging - API V1 (Guia Completo)

A API Legacy foi descontinuada. Vamos usar a API V1 (recomendada).

---

## 📋 Passo 1: Obter Service Account Key

### 1.1 Acessar Service Accounts

1. **No Firebase Console:**
   - ⚙️ **Project Settings** → Aba **"Cloud Messaging"**
   - Na seção **"API Firebase Cloud Messaging (V1)"**
   - Clique em **"Gerenciar contas de serviço"** / **"Manage service accounts"**

2. **Ou acesse diretamente:**
   - ⚙️ **Project Settings** → Aba **"Service Accounts"**
   - Clique em **"Service Accounts"**

### 1.2 Criar/Obter Service Account

1. **Se já existe uma conta:**
   - Clique na conta existente
   - Vá para aba **"Keys"**
   - Clique **"Add Key"** → **"Create new key"**
   - Escolha **JSON**
   - Baixe o arquivo (salve como `firebase-service-account.json`)

2. **Se não existe:**
   - Clique **"Create Service Account"**
   - Nome: `firebase-messaging`
   - Role: **"Firebase Cloud Messaging Admin"**
   - Criar e baixar JSON

---

## 📋 Passo 2: Instalar Dependências (Node.js)

```bash
npm install firebase-admin
```

---

## 📋 Passo 3: Criar Script de Teste

Criar arquivo `scripts/test-push-v1.js`:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Token do Supabase
const token = 'SEU_TOKEN_DO_SUPABASE_AQUI';

// Enviar notificação
const message = {
  notification: {
    title: 'Teste Push',
    body: 'Esta é uma notificação de teste do UzzApp'
  },
  data: {
    type: 'test',
    chat_id: 'test-123'
  },
  token: token
};

admin.messaging().send(message)
  .then((response) => {
    console.log('✅ Sucesso! Notificação enviada:', response);
  })
  .catch((error) => {
    console.error('❌ Erro:', error);
  });
```

---

## 🔧 Método Alternativo: Usar Interface do Firebase

### Opção 1: Criar Campanha de Teste

1. **Firebase Console → Messaging**
2. Clique **"Crie sua primeira campanha"** / **"New notification"**
3. Preencha:
   - **Notification title**: `Teste Push`
   - **Notification text**: `Esta é uma notificação de teste`
4. **Target**:
   - Selecionar **"Test message"** ou **"Single device"**
   - Colar token do Supabase
5. **Enviar**

### Opção 2: Usar Postman/Insomnia com API V1

**URL:**
```
POST https://fcm.googleapis.com/v1/projects/SEU_PROJECT_ID/messages:send
```

**Headers:**
```
Authorization: Bearer SEU_ACCESS_TOKEN
Content-Type: application/json
```

**Body:**
```json
{
  "message": {
    "token": "SEU_TOKEN_DO_SUPABASE",
    "notification": {
      "title": "Teste Push",
      "body": "Esta é uma notificação de teste"
    }
  }
}
```

---

## ✅ Método Mais Simples (Recomendado)

**Para teste rápido, use a interface do Firebase:**

1. Firebase Console → **Messaging**
2. **"Crie sua primeira campanha"**
3. Preencher título e texto
4. **Target** → **"Test message"**
5. Colar token do Supabase
6. **Enviar**

---

**Qual método você prefere?** Recomendo começar pela interface do Firebase (mais simples).


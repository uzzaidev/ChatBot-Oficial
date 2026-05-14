# 🔑 Como Obter Credenciais da Meta WhatsApp Business API

## 📍 Onde Encontrar

1. Acessar: **https://developers.facebook.com/apps/**
2. Selecionar seu aplicativo WhatsApp Business
3. No menu lateral: **WhatsApp** → **Configuração**

---

## 1️⃣ **META_ACCESS_TOKEN** (Access Token)

### Onde encontrar:

```
WhatsApp → Configuração → Token de Acesso
```

### Tipos de Token:

#### **A) Token Temporário (Teste)** ⏱️

- Válido por **24 horas**
- Localização: Seção "Token de Acesso Temporário"
- Copiar o token que aparece

**⚠️ IMPORTANTE:** Use apenas para testes! Expira em 24h.

#### **B) Token Permanente (Produção)** ✅

Para gerar um token permanente:

1. Ir para: **WhatsApp** → **Configuração**
2. Seção "Token de Acesso"
3. Clicar em **"Gerar Token"** ou **"System User Token"**
4. Selecionar:
   - **Usuário do Sistema:** Criar um novo ou usar existente
   - **Permissões:**
     - ✅ `whatsapp_business_management`
     - ✅ `whatsapp_business_messaging`
5. Clicar em **Gerar Token**
6. **COPIAR O TOKEN IMEDIATAMENTE** (não aparece novamente!)

**Formato:**

```
EAABzXYZ...muito_longo...123
```

**Onde colar:**

```env
META_ACCESS_TOKEN=EAABzXYZ...seu_token_aqui...123
```

---

## 2️⃣ **META_PHONE_NUMBER_ID** (ID do Número de Telefone)

### Onde encontrar:

```
WhatsApp → Configuração → Seção "Número de telefone"
```

### Passo a passo:

1. Na seção **"Número de telefone"**
2. Você verá uma tabela com seu número (ex: `+55 54 99999-9999`)
3. Ao lado do número, há um **ID** numérico
4. Copiar esse ID

**Formato:**

```
899639703222013
```

_(Número longo, geralmente 15 dígitos)_

**Onde colar:**

```env
META_PHONE_NUMBER_ID=899639703222013
```

---

## 3️⃣ **META_BUSINESS_ACCOUNT_ID** (WhatsApp Business Account ID)

### Onde encontrar:

```
WhatsApp → Configuração → Cabeçalho da página
```

### Passo a passo:

1. Na página de **Configuração** do WhatsApp
2. No topo, você verá:
   ```
   Conta do WhatsApp Business
   ID: 123456789012345
   ```
3. Copiar esse número

**OU**

```
WhatsApp → Configuração → Seção "Conta do WhatsApp Business"
```

**Formato:**

```
123456789012345
```

_(Número longo, geralmente 15 dígitos)_

**Onde colar:**

```env
META_BUSINESS_ACCOUNT_ID=123456789012345
```

---

## 4️⃣ **META_VERIFY_TOKEN** (Token de Verificação do Webhook)

### ⚠️ IMPORTANTE: **VOCÊ ESCOLHE ESTE TOKEN!**

Este **NÃO** vem da Meta. Você inventa uma string aleatória segura.

### Como criar:

**Opção 1: String Aleatória**

```
whatsapp_webhook_prod_2024_abc123xyz
```

**Opção 2: Gerar Online**

- Acessar: https://randomkeygen.com/
- Usar uma das chaves geradas (ex: CodeIgniter Encryption Keys)

**Opção 3: Terminal**

```bash
openssl rand -hex 32
# Resultado: a1b2c3d4e5f6...
```

**Onde colar:**

```env
META_VERIFY_TOKEN=whatsapp_webhook_prod_2024_abc123xyz
```

**E TAMBÉM configurar no painel da Meta** (mesmo valor!):

```
WhatsApp → Configuração → Webhook → Token de Verificação
```

---

## 📋 Resumo das 4 Credenciais

| Variável                     | De Onde Vem   | Onde Encontrar                    | Exemplo            |
| ---------------------------- | ------------- | --------------------------------- | ------------------ |
| **META_ACCESS_TOKEN**        | Meta (gerar)  | Configuração → Token de Acesso    | `EAABzXYZ...`      |
| **META_PHONE_NUMBER_ID**     | Meta (copiar) | Configuração → Número de telefone | `899639703222013`  |
| **META_BUSINESS_ACCOUNT_ID** | Meta (copiar) | Configuração → ID da conta        | `123456789012345`  |
| **META_VERIFY_TOKEN**        | **Você cria** | **Você inventa**                  | `webhook_2024_xyz` |

---

## 🎯 Passo a Passo Completo

### **1. Abrir Painel da Meta**

```
https://developers.facebook.com/apps/
```

### **2. Selecionar App WhatsApp Business**

- Clicar no nome do seu app
- Menu lateral: **WhatsApp** → **Configuração**

### **3. Copiar Credenciais**

**a) Copiar Phone Number ID:**

```
Seção: "Número de telefone"
Tabela → Coluna "ID" → Copiar número
```

**b) Copiar Business Account ID:**

```
Topo da página → "Conta do WhatsApp Business" → ID
```

**c) Gerar Access Token:**

```
Seção: "Token de Acesso"
Clicar em "Gerar Token" → Selecionar System User
Permissões: whatsapp_business_management + whatsapp_business_messaging
Copiar token IMEDIATAMENTE (não aparece novamente!)
```

**d) Criar Verify Token:**

```
Inventar string aleatória: whatsapp_prod_2024_xyz123
```

### **4. Colar no `.env.local`**

```env
META_ACCESS_TOKEN=EAABzXYZ...seu_token_permanente...123
META_PHONE_NUMBER_ID=899639703222013
META_BUSINESS_ACCOUNT_ID=123456789012345
META_VERIFY_TOKEN=whatsapp_prod_2024_xyz123
```

### **5. Configurar Webhook**

```
WhatsApp → Configuração → Webhook
Callback URL: https://uzzap.uzzai.com/api/webhook
Token de Verificação: whatsapp_prod_2024_xyz123 (MESMO do .env!)
```

---

## ⚠️ Segurança

### **NÃO COMPARTILHAR:**

- ❌ `META_ACCESS_TOKEN` (dá acesso total à conta)
- ❌ `META_VERIFY_TOKEN` (valida webhooks)

### **PODE COMPARTILHAR:**

- ✅ `META_PHONE_NUMBER_ID` (apenas identifica número)
- ✅ `META_BUSINESS_ACCOUNT_ID` (apenas identifica conta)

### **Token Permanente vs Temporário:**

| Tipo           | Duração      | Uso           |
| -------------- | ------------ | ------------- |
| **Temporário** | 24 horas     | Testes locais |
| **Permanente** | Não expira\* | Produção      |

\*Sistema User Tokens não expiram, mas podem ser revogados.

---

## 🔄 Renovar Token (se expirar)

Se seu token expirar ou for revogado:

1. **WhatsApp** → **Configuração**
2. **Token de Acesso** → **Gerar Token**
3. Selecionar **System User** existente ou criar novo
4. Selecionar permissões
5. Copiar novo token
6. Atualizar `.env.local` e Vercel

---

## 🧪 Testar Credenciais

### **Teste 1: Verificar Token**

```bash
curl -X GET "https://graph.facebook.com/v18.0/me?access_token=SEU_TOKEN_AQUI"
```

**Resposta esperada:**

```json
{
  "id": "123456789012345"
}
```

### **Teste 2: Verificar Phone Number ID**

```bash
curl -X GET "https://graph.facebook.com/v18.0/899639703222013?access_token=SEU_TOKEN_AQUI"
```

**Resposta esperada:**

```json
{
  "verified_name": "Seu Nome",
  "display_phone_number": "+55 54 99999-9999",
  "id": "899639703222013"
}
```

---

## 📚 Referências

- [Meta WhatsApp Cloud API - Getting Started](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
- [System User Tokens](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-access/system-user-tokens)
- [WhatsApp Business Management API](https://developers.facebook.com/docs/whatsapp/business-management-api)

---

## ✅ Checklist

- [ ] META_ACCESS_TOKEN obtido (permanente, não temporário)
- [ ] META_PHONE_NUMBER_ID copiado
- [ ] META_BUSINESS_ACCOUNT_ID copiado
- [ ] META_VERIFY_TOKEN criado (string aleatória)
- [ ] Todas as variáveis coladas no `.env.local`
- [ ] Token testado com curl (retorna ID)
- [ ] Webhook configurado no painel Meta
- [ ] Mesmo VERIFY_TOKEN usado no painel e .env
